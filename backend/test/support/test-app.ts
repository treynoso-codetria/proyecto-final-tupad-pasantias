import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { hashPassword } from '../../src/common/security/password.js';
import { UserRole } from '../../src/generated/prisma/enums.js';
import { MailService } from '../../src/mail/mail.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

type SentEmail =
  | {
      type: 'verification' | 'email-change-confirmation';
      to: string;
      url: string;
    }
  | { type: 'email-change-notice'; to: string; newEmail: string }
  | { type: 'password-changed'; to: string };

// Stands in for MailService: records the emails instead of sending them, so
// the tests can follow the links a real user would receive.
export class FakeMailService implements Pick<
  MailService,
  | 'sendVerificationEmail'
  | 'sendEmailChangeConfirmation'
  | 'sendEmailChangeNotice'
  | 'sendPasswordChangedNotice'
> {
  sent: SentEmail[] = [];
  // Set to true to simulate the mail provider being down.
  failing = false;

  sendVerificationEmail(to: string, url: string) {
    return this.record({ type: 'verification', to, url });
  }

  sendEmailChangeConfirmation(to: string, url: string) {
    return this.record({ type: 'email-change-confirmation', to, url });
  }

  sendEmailChangeNotice(to: string, newEmail: string) {
    return this.record({ type: 'email-change-notice', to, newEmail });
  }

  sendPasswordChangedNotice(to: string) {
    return this.record({ type: 'password-changed', to });
  }

  emailsTo(to: string, type: SentEmail['type']): SentEmail[] {
    return this.sent.filter((email) => email.to === to && email.type === type);
  }

  // Token of the most recent link of that type sent to the address.
  tokenFor(
    to: string,
    type: 'verification' | 'email-change-confirmation',
  ): string {
    const email = this.emailsTo(to, type).at(-1);
    if (!email || !('url' in email)) {
      throw new Error(`No ${type} email was sent to ${to}`);
    }
    return new URL(email.url).searchParams.get('token') as string;
  }

  private record(email: SentEmail): Promise<boolean> {
    if (this.failing) {
      return Promise.resolve(false);
    }
    this.sent.push(email);
    return Promise.resolve(true);
  }
}

// Runs against the database in DATABASE_URL. Every account created through
// this helper or with an email from `email()` uses a domain unique to the
// run, and is deleted by `close()`.
export async function createTestApp() {
  const mail = new FakeMailService();
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mail)
    .compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  const prisma = app.get(PrismaService);

  const runId = randomUUID().slice(0, 8);
  const emailDomain = `e2e-${runId}.test`;
  const password = 'Password123!';
  const email = (name: string) => `${name}@${emailDomain}`;

  return {
    app,
    prisma,
    mail,
    runId,
    password,
    email,
    http: () => request(app.getHttpServer()),

    // Creates an already verified account directly in the database.
    async createVerifiedStudent(name: string) {
      return prisma.user.create({
        data: {
          email: email(name),
          passwordHash: await hashPassword(password),
          role: UserRole.STUDENT,
          emailVerifiedAt: new Date(),
          studentProfile: {
            create: {
              firstName: name,
              lastName: 'Test',
              career: 'TUP',
              institution: 'UTN',
            },
          },
        },
      });
    },

    async login(userEmail: string, userPassword = password): Promise<string> {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: userEmail, password: userPassword })
        .expect(200);
      return response.body.accessToken;
    },

    async close() {
      await prisma.user.deleteMany({
        where: { email: { endsWith: `@${emailDomain}` } },
      });
      await app.close();
    },
  };
}
