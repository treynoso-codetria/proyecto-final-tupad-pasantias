import { createTestApp } from './support/test-app.js';

describe('Users (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  describe('PATCH /api/users/me/password', () => {
    const newPassword = 'NewPassword456!';
    let email: string;
    let accessToken: string;

    beforeAll(async () => {
      email = (await ctx.createVerifiedStudent('password')).email;
      accessToken = await ctx.login(email);
    });

    const changePassword = (body: object, token = accessToken) =>
      ctx
        .http()
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send(body);

    it('requires authentication', async () => {
      await ctx
        .http()
        .patch('/api/users/me/password')
        .send({ currentPassword: ctx.password, newPassword })
        .expect(401);
    });

    it('rejects a wrong current password', async () => {
      const response = await changePassword({
        currentPassword: 'wrong-password',
        newPassword,
      }).expect(400);

      expect(response.body.code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('rejects a new password that is too short or equal to the current one', async () => {
      const tooShort = await changePassword({
        currentPassword: ctx.password,
        newPassword: 'short',
      }).expect(400);
      expect(tooShort.body.code).toBe('VALIDATION_FAILED');

      const unchanged = await changePassword({
        currentPassword: ctx.password,
        newPassword: ctx.password,
      }).expect(400);
      expect(unchanged.body.code).toBe('NEW_PASSWORD_SAME_AS_CURRENT');
    });

    it('changes the password: the old one stops working and the user is notified', async () => {
      await changePassword({
        currentPassword: ctx.password,
        newPassword,
      }).expect(204);

      await ctx
        .http()
        .post('/api/auth/login')
        .send({ email, password: ctx.password })
        .expect(401);
      await ctx.login(email, newPassword);
      expect(ctx.mail.emailsTo(email, 'password-changed')).toHaveLength(1);
    });
  });

  describe('email change', () => {
    let currentEmail: string;
    let newEmail: string;
    let takenEmail: string;
    let accessToken: string;

    beforeAll(async () => {
      currentEmail = (await ctx.createVerifiedStudent('mover')).email;
      takenEmail = (await ctx.createVerifiedStudent('taken')).email;
      newEmail = ctx.email('moved');
      accessToken = await ctx.login(currentEmail);
    });

    const requestChange = (body: object) =>
      ctx
        .http()
        .post('/api/users/me/email-change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(body);

    it('requires authentication', async () => {
      await ctx
        .http()
        .post('/api/users/me/email-change')
        .send({ newEmail, currentPassword: ctx.password })
        .expect(401);
    });

    it('rejects a wrong password, the current email and a registered email', async () => {
      const wrongPassword = await requestChange({
        newEmail,
        currentPassword: 'wrong-password',
      }).expect(400);
      expect(wrongPassword.body.code).toBe('INVALID_CURRENT_PASSWORD');

      const unchanged = await requestChange({
        newEmail: currentEmail,
        currentPassword: ctx.password,
      }).expect(400);
      expect(unchanged.body.code).toBe('EMAIL_UNCHANGED');

      const taken = await requestChange({
        newEmail: takenEmail,
        currentPassword: ctx.password,
      }).expect(409);
      expect(taken.body.code).toBe('EMAIL_TAKEN');

      expect(ctx.mail.emailsTo(newEmail, 'email-change-confirmation')).toEqual(
        [],
      );
    });

    it('emails a confirmation link to the new address and keeps the current email until confirmed', async () => {
      await requestChange({
        newEmail: `  ${newEmail.toUpperCase()}`,
        currentPassword: ctx.password,
      }).expect(204);

      expect(
        ctx.mail.emailsTo(newEmail, 'email-change-confirmation'),
      ).toHaveLength(1);
      expect(ctx.mail.emailsTo(currentEmail, 'email-change-notice')).toEqual([
        { type: 'email-change-notice', to: currentEmail, newEmail },
      ]);

      // Nothing changed yet: the current email still logs in.
      await ctx.login(currentEmail);
    });

    it('rejects an invalid confirmation token, and a verification token', async () => {
      await ctx
        .http()
        .post('/api/users/email-change/confirm')
        .send({ token: 'not-a-valid-token' })
        .expect(400);

      await ctx
        .http()
        .post('/api/auth/verify-email')
        .send({
          token: ctx.mail.tokenFor(newEmail, 'email-change-confirmation'),
        })
        .expect(400);
    });

    it('applies the change when the link is confirmed, without needing a session', async () => {
      const response = await ctx
        .http()
        .post('/api/users/email-change/confirm')
        .send({
          token: ctx.mail.tokenFor(newEmail, 'email-change-confirmation'),
        })
        .expect(200);
      expect(response.body).toEqual({ email: newEmail });

      // The new email logs in; the old one no longer exists.
      await ctx.login(newEmail);
      await ctx
        .http()
        .post('/api/auth/login')
        .send({ email: currentEmail, password: ctx.password })
        .expect(401);

      // A session opened before the change keeps working.
      const me = await ctx
        .http()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(me.body.email).toBe(newEmail);
    });

    it('rejects the confirmation link once it was used', async () => {
      const response = await ctx
        .http()
        .post('/api/users/email-change/confirm')
        .send({
          token: ctx.mail.tokenFor(newEmail, 'email-change-confirmation'),
        })
        .expect(400);

      expect(response.body.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });
  });
});
