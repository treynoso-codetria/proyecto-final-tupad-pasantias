import { createTestApp } from './support/test-app.js';

describe('Auth (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;

  let student: Record<string, string>;
  let employer: Record<string, string>;
  let cuit: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    student = {
      email: ctx.email('student'),
      password: ctx.password,
      firstName: 'Ana',
      lastName: 'Gómez',
      career: 'Tecnicatura Universitaria en Programación',
      institution: 'UTN',
    };
    // CUIT is unique in the database, so derive one from the run id.
    cuit = `30-${parseInt(ctx.runId, 16).toString().padStart(8, '0').slice(-8)}-9`;
    employer = {
      email: ctx.email('employer'),
      password: ctx.password,
      companyName: 'E2E Company',
      cuit,
    };
  });

  afterAll(async () => {
    await ctx.close();
  });

  describe('student registration and email verification', () => {
    it('creates the account unverified and emails a verification link', async () => {
      const response = await ctx
        .http()
        .post('/api/auth/register/student')
        .send({ ...student, email: `  ${student.email.toUpperCase()} ` })
        .expect(201);

      // No access token: registering does not log the user in.
      expect(response.body).toEqual({
        email: student.email,
        verificationEmailSent: true,
      });

      const stored = await ctx.prisma.user.findUniqueOrThrow({
        where: { email: student.email },
        include: { studentProfile: true },
      });
      expect(stored.passwordHash).not.toBe(ctx.password);
      expect(stored.emailVerifiedAt).toBeNull();
      expect(stored.studentProfile?.firstName).toBe('Ana');

      const [email] = ctx.mail.emailsTo(student.email, 'verification');
      expect('url' in email && email.url).toMatch(
        /^http:\/\/localhost:5173\/verify-email\?token=/,
      );
    });

    it('cannot log in before verifying the email', async () => {
      const response = await ctx
        .http()
        .post('/api/auth/login')
        .send({ email: student.email, password: ctx.password })
        .expect(403);

      expect(response.body.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('sends the link again on request, without revealing unknown emails', async () => {
      await ctx
        .http()
        .post('/api/auth/resend-verification')
        .send({ email: student.email })
        .expect(204);
      expect(ctx.mail.emailsTo(student.email, 'verification')).toHaveLength(2);

      const unknown = ctx.email('nobody');
      await ctx
        .http()
        .post('/api/auth/resend-verification')
        .send({ email: unknown })
        .expect(204);
      expect(ctx.mail.emailsTo(unknown, 'verification')).toHaveLength(0);
    });

    it('rejects an invalid verification token', async () => {
      const response = await ctx
        .http()
        .post('/api/auth/verify-email')
        .send({ token: 'not-a-valid-token' })
        .expect(400);

      expect(response.body.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });

    it('verifies the email with the link and logs the user in', async () => {
      const response = await ctx
        .http()
        .post('/api/auth/verify-email')
        .send({ token: ctx.mail.tokenFor(student.email, 'verification') })
        .expect(200);

      expect(response.body.user).toEqual({
        id: expect.any(String),
        email: student.email,
        role: 'STUDENT',
      });
      await ctx
        .http()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${response.body.accessToken}`)
        .expect(200);

      const stored = await ctx.prisma.user.findUniqueOrThrow({
        where: { email: student.email },
      });
      expect(stored.emailVerifiedAt).toBeInstanceOf(Date);
    });

    it('does not log in again with a link that was already used', async () => {
      const response = await ctx
        .http()
        .post('/api/auth/verify-email')
        .send({ token: ctx.mail.tokenFor(student.email, 'verification') })
        .expect(409);

      expect(response.body.code).toBe('EMAIL_ALREADY_VERIFIED');
    });

    it('does not accept an email-link token as an access token, or the reverse', async () => {
      const linkToken = ctx.mail.tokenFor(student.email, 'verification');
      await ctx
        .http()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${linkToken}`)
        .expect(401);

      const accessToken = await ctx.login(student.email);
      await ctx
        .http()
        .post('/api/auth/verify-email')
        .send({ token: accessToken })
        .expect(400);
    });

    it('returns 409 when the email is already registered', async () => {
      await ctx
        .http()
        .post('/api/auth/register/student')
        .send(student)
        .expect(409);
    });

    it('returns 400 on invalid or unknown fields', async () => {
      await ctx
        .http()
        .post('/api/auth/register/student')
        .send({ ...student, email: 'not-an-email', password: 'short' })
        .expect(400);
      await ctx
        .http()
        .post('/api/auth/register/student')
        .send({ ...student, email: ctx.email('other'), role: 'ADMIN' })
        .expect(400);
    });
  });

  describe('employer registration', () => {
    it('creates the account and its company, and verifies it by email', async () => {
      await ctx
        .http()
        .post('/api/auth/register/employer')
        .send(employer)
        .expect(201);

      const company = await ctx.prisma.company.findUniqueOrThrow({
        where: { cuit },
      });
      expect(company.name).toBe('E2E Company');

      const response = await ctx
        .http()
        .post('/api/auth/verify-email')
        .send({ token: ctx.mail.tokenFor(employer.email, 'verification') })
        .expect(200);
      expect(response.body.user.role).toBe('EMPLOYER');
    });

    it('returns 409 when the CUIT is already registered', async () => {
      const response = await ctx
        .http()
        .post('/api/auth/register/employer')
        .send({ ...employer, email: ctx.email('employer2') })
        .expect(409);

      expect(response.body.code).toBe('CUIT_TAKEN');
    });

    it('returns 400 when the CUIT is malformed', async () => {
      await ctx
        .http()
        .post('/api/auth/register/employer')
        .send({
          ...employer,
          email: ctx.email('employer3'),
          cuit: '30712345678',
        })
        .expect(400);
    });
  });

  describe('when the email provider is down', () => {
    afterEach(() => {
      ctx.mail.failing = false;
    });

    it('still registers the account, reporting that the email was not sent', async () => {
      ctx.mail.failing = true;

      const response = await ctx
        .http()
        .post('/api/auth/register/student')
        .send({ ...student, email: ctx.email('unlucky') })
        .expect(201);

      expect(response.body.verificationEmailSent).toBe(false);
    });

    it('fails a resend request with 503, and succeeds once the provider is back', async () => {
      ctx.mail.failing = true;
      const response = await ctx
        .http()
        .post('/api/auth/resend-verification')
        .send({ email: ctx.email('unlucky') })
        .expect(503);
      expect(response.body.code).toBe('MAIL_DELIVERY_FAILED');

      ctx.mail.failing = false;
      await ctx
        .http()
        .post('/api/auth/resend-verification')
        .send({ email: ctx.email('unlucky') })
        .expect(204);
      expect(
        ctx.mail.emailsTo(ctx.email('unlucky'), 'verification'),
      ).toHaveLength(1);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns a token for valid credentials', async () => {
      const response = await ctx
        .http()
        .post('/api/auth/login')
        .send({ email: student.email, password: ctx.password })
        .expect(200);

      expect(response.body.accessToken).toEqual(expect.any(String));
    });

    it('returns 401 for a wrong password or an unknown email', async () => {
      await ctx
        .http()
        .post('/api/auth/login')
        .send({ email: student.email, password: 'wrong-password' })
        .expect(401);
      await ctx
        .http()
        .post('/api/auth/login')
        .send({ email: ctx.email('nobody'), password: ctx.password })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 without a token or with an invalid one', async () => {
      await ctx.http().get('/api/auth/me').expect(401);
      await ctx
        .http()
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);
    });

    it('returns the authenticated user without the password hash', async () => {
      const accessToken = await ctx.login(employer.email);

      const response = await ctx
        .http()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
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
    let wrongLogin: { email: string; password: string };

    beforeAll(() => {
      wrongLogin = { email: student.email, password: 'wrong-password' };
    });

    it('returns a stable code and an English message by default', async () => {
      const response = await ctx
        .http()
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
      const response = await ctx
        .http()
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
      const response = await ctx
        .http()
        .post('/api/auth/login')
        .set('Accept-Language', 'fr')
        .send(wrongLogin)
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('translates validation errors, including decorator arguments', async () => {
      const invalid = { ...employer, password: 'short', cuit: '123' };

      const english = await ctx
        .http()
        .post('/api/auth/register/employer')
        .send(invalid)
        .expect(400);
      expect(english.body.code).toBe('VALIDATION_FAILED');
      expect(english.body.message.sort()).toEqual([
        'cuit must have the format XX-XXXXXXXX-X',
        'password must have at least 8 characters',
      ]);

      const spanish = await ctx
        .http()
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
      const response = await ctx
        .http()
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
      const accessToken = await ctx.login(student.email);
      await ctx.prisma.user.update({
        where: { email: student.email },
        data: { isActive: false },
      });

      await ctx
        .http()
        .post('/api/auth/login')
        .send({ email: student.email, password: ctx.password })
        .expect(403);
      await ctx
        .http()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });
});
