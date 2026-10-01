import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Runs against the database in DATABASE_URL. Every account created here uses
// a domain unique to this run and is deleted in afterAll.
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = randomUUID().slice(0, 8);
  const emailDomain = `e2e-${runId}.test`;
  const password = 'Password123!';
  const student = {
    email: `student@${emailDomain}`,
    password,
    firstName: 'Ana',
    lastName: 'Gómez',
    career: 'Tecnicatura Universitaria en Programación',
    institution: 'UTN',
  };
  // CUIT is unique in the database, so derive one from the run id.
  const cuit = `30-${parseInt(runId, 16).toString().padStart(8, '0').slice(-8)}-9`;
  const employer = {
    email: `employer@${emailDomain}`,
    password,
    companyName: 'E2E Company',
    cuit,
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { endsWith: `@${emailDomain}` } },
    });
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  describe('POST /api/auth/register/student', () => {
    it('creates the account and its profile, and returns a token', async () => {
      const response = await http()
        .post('/api/auth/register/student')
        .send({ ...student, email: `  Student@${emailDomain.toUpperCase()} ` })
        .expect(201);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.user).toEqual({
        id: expect.any(String),
        email: student.email,
        role: 'STUDENT',
      });

      const stored = await prisma.user.findUniqueOrThrow({
        where: { email: student.email },
        include: { studentProfile: true },
      });
      expect(stored.passwordHash).not.toBe(password);
      expect(stored.studentProfile?.firstName).toBe('Ana');
    });

    it('returns 409 when the email is already registered', async () => {
      await http().post('/api/auth/register/student').send(student).expect(409);
    });

    it('returns 400 on invalid or unknown fields', async () => {
      await http()
        .post('/api/auth/register/student')
        .send({ ...student, email: 'not-an-email', password: 'short' })
        .expect(400);
      await http()
        .post('/api/auth/register/student')
        .send({ ...student, email: `other@${emailDomain}`, role: 'ADMIN' })
        .expect(400);
    });
  });

  describe('POST /api/auth/register/employer', () => {
    it('creates the account and its company', async () => {
      const response = await http()
        .post('/api/auth/register/employer')
        .send(employer)
        .expect(201);

      expect(response.body.user.role).toBe('EMPLOYER');
      const company = await prisma.company.findUniqueOrThrow({
        where: { cuit },
      });
      expect(company.name).toBe('E2E Company');
    });

    it('returns 409 when the CUIT is already registered', async () => {
      await http()
        .post('/api/auth/register/employer')
        .send({ ...employer, email: `employer2@${emailDomain}` })
        .expect(409);
    });

    it('returns 400 when the CUIT is malformed', async () => {
      await http()
        .post('/api/auth/register/employer')
        .send({
          ...employer,
          email: `employer3@${emailDomain}`,
          cuit: '30712345678',
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns a token for valid credentials', async () => {
      const response = await http()
        .post('/api/auth/login')
        .send({ email: student.email, password })
        .expect(200);

      expect(response.body.accessToken).toEqual(expect.any(String));
      const stored = await prisma.user.findUniqueOrThrow({
        where: { email: student.email },
      });
      expect(stored.lastLoginAt).toBeInstanceOf(Date);
    });

    it('returns 401 for a wrong password or an unknown email', async () => {
      await http()
        .post('/api/auth/login')
        .send({ email: student.email, password: 'wrong-password' })
        .expect(401);
      await http()
        .post('/api/auth/login')
        .send({ email: `nobody@${emailDomain}`, password })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 without a token or with an invalid one', async () => {
      await http().get('/api/auth/me').expect(401);
      await http()
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);
    });

    it('returns the authenticated user without the password hash', async () => {
      const login = await http()
        .post('/api/auth/login')
        .send({ email: employer.email, password })
        .expect(200);

      const response = await http()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        email: employer.email,
        role: 'EMPLOYER',
        studentProfile: null,
        company: { name: 'E2E Company' },
      });
      expect(response.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('error responses (i18n)', () => {
    const wrongLogin = { email: student.email, password: 'wrong-password' };

    it('returns a stable code and an English message by default', async () => {
      const response = await http()
        .post('/api/auth/login')
        .send(wrongLogin)
        .expect(401);

      expect(response.body).toEqual({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    });

    it('translates the message with Accept-Language: es', async () => {
      const response = await http()
        .post('/api/auth/login')
        .set('Accept-Language', 'es-AR,es;q=0.9,en;q=0.8')
        .send(wrongLogin)
        .expect(401);

      expect(response.body.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.message).toBe(
        'El email o la contraseña no son correctos',
      );
    });

    it('falls back to English for an unsupported language', async () => {
      const response = await http()
        .post('/api/auth/login')
        .set('Accept-Language', 'fr')
        .send(wrongLogin)
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('translates validation errors, including decorator arguments', async () => {
      const invalid = { ...employer, password: 'short', cuit: '123' };

      const english = await http()
        .post('/api/auth/register/employer')
        .send(invalid)
        .expect(400);
      expect(english.body.code).toBe('VALIDATION_FAILED');
      expect(english.body.message.sort()).toEqual([
        'cuit must have the format XX-XXXXXXXX-X',
        'password must have at least 8 characters',
      ]);

      const spanish = await http()
        .post('/api/auth/register/employer')
        .set('Accept-Language', 'es')
        .send(invalid)
        .expect(400);
      expect(spanish.body.message.sort()).toEqual([
        'cuit debe tener el formato XX-XXXXXXXX-X',
        'password debe tener al menos 8 caracteres',
      ]);
    });

    it('translates errors raised by the guards', async () => {
      const response = await http()
        .get('/api/auth/me')
        .set('Accept-Language', 'es')
        .expect(401);

      expect(response.body).toEqual({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Se requiere autenticación',
      });
    });
  });

  describe('deactivated account', () => {
    it('cannot log in, and its existing token stops working', async () => {
      const login = await http()
        .post('/api/auth/login')
        .send({ email: student.email, password })
        .expect(200);
      await prisma.user.update({
        where: { email: student.email },
        data: { isActive: false },
      });

      await http()
        .post('/api/auth/login')
        .send({ email: student.email, password })
        .expect(403);
      await http()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(401);
    });
  });
});
