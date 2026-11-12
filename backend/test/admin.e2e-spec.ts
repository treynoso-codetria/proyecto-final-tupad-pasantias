import { createTestApp } from './support/test-app.js';

describe('Admin moderation (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;
  let adminId: string;
  let adminToken: string;
  let employer: Awaited<ReturnType<typeof ctx.createVerifiedEmployer>>;
  let employerToken: string;
  let student: Awaited<ReturnType<typeof ctx.createVerifiedStudent>>;
  let studentToken: string;
  let categoryId: string;

  const as = (token: string) => ({
    get: (path: string) =>
      ctx.http().get(path).set('Authorization', `Bearer ${token}`),
    post: (path: string, body: object = {}) =>
      ctx.http().post(path).set('Authorization', `Bearer ${token}`).send(body),
    patch: (path: string, body: object) =>
      ctx.http().patch(path).set('Authorization', `Bearer ${token}`).send(body),
  });

  const publish = async (title: string) =>
    (
      await as(employerToken)
        .post('/api/offers', {
          title: `${title} ${ctx.runId}`,
          description: 'Descripción',
          type: 'INTERNSHIP',
          modality: 'REMOTE',
          workload: 'PART_TIME',
          categoryId,
        })
        .expect(201)
    ).body.id as string;

  const lastNotification = (userId: string) =>
    ctx.prisma.notification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

  beforeAll(async () => {
    ctx = await createTestApp();
    const admin = await ctx.createAdmin('moderator');
    adminId = admin.id;
    adminToken = await ctx.login(admin.email);
    employer = await ctx.createVerifiedEmployer('moderated', '71');
    employerToken = await ctx.login(employer.email);
    student = await ctx.createVerifiedStudent('watched');
    studentToken = await ctx.login(student.email);
    categoryId = (await ctx.createCategory('moderation')).id;
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('is reserved to administrators', async () => {
    await ctx.http().get('/api/admin/stats').expect(401);
    await as(employerToken).get('/api/admin/stats').expect(403);
    await as(studentToken).get('/api/admin/users').expect(403);
    await as(employerToken)
      .patch(`/api/admin/users/${student.id}/status`, { isActive: false })
      .expect(403);
  });

  it('returns the dashboard metrics', async () => {
    const response = await as(adminToken).get('/api/admin/stats').expect(200);
    expect(response.body).toMatchObject({
      students: { total: expect.any(Number), active: expect.any(Number) },
      companies: { total: expect.any(Number), active: expect.any(Number) },
      offers: {
        open: expect.any(Number),
        closed: expect.any(Number),
        removed: expect.any(Number),
      },
      applications: {
        total: expect.any(Number),
        pending: expect.any(Number),
      },
    });
    expect(response.body.students.total).toBeGreaterThanOrEqual(1);
  });

  describe('accounts', () => {
    it('lists students and employers, searchable by name, without admins', async () => {
      const all = await as(adminToken)
        .get(`/api/admin/users?q=${ctx.runId}&limit=50`)
        .expect(200);
      const emails = all.body.items.map((u: { email: string }) => u.email);
      expect(emails).toEqual(
        expect.arrayContaining([student.email, employer.email]),
      );
      expect(emails).not.toContain(ctx.email('moderator'));

      const byName = await as(adminToken)
        .get('/api/admin/users')
        .query({ q: `watched test`, role: 'STUDENT' })
        .expect(200);
      expect(
        byName.body.items.find((u: { id: string }) => u.id === student.id),
      ).toMatchObject({
        name: 'watched Test',
        role: 'STUDENT',
        studentId: student.studentProfile!.id,
        companyId: null,
        isActive: true,
        emailVerified: true,
      });

      const byCompany = await as(adminToken)
        .get('/api/admin/users')
        .query({ q: 'moderated S.A.', role: 'EMPLOYER' })
        .expect(200);
      expect(byCompany.body.items[0]).toMatchObject({
        id: employer.id,
        companyId: employer.company!.id,
      });

      await as(adminToken).get('/api/admin/users?role=ADMIN').expect(400);
    });

    it('requires a reason to deactivate an account', async () => {
      const response = await as(adminToken)
        .patch(`/api/admin/users/${student.id}/status`, { isActive: false })
        .expect(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      await as(adminToken)
        .patch(`/api/admin/users/${student.id}/status`, {
          isActive: false,
          reason: '   ',
        })
        .expect(400);
    });

    it('deactivates an account: logs it, notifies and emails the user, and blocks them', async () => {
      const response = await as(adminToken)
        .patch(`/api/admin/users/${student.id}/status`, {
          isActive: false,
          reason: 'Datos falsos',
        })
        .expect(200);
      expect(response.body).toMatchObject({ id: student.id, isActive: false });

      // The token in use stops working, and so does logging in.
      await as(studentToken).get('/api/auth/me').expect(401);
      const login = await ctx
        .http()
        .post('/api/auth/login')
        .send({ email: student.email, password: ctx.password })
        .expect(403);
      expect(login.body.code).toBe('ACCOUNT_DEACTIVATED');

      expect(await lastNotification(student.id)).toMatchObject({
        type: 'ACCOUNT_STATUS_CHANGED',
        data: { status: 'DEACTIVATED', reason: 'Datos falsos' },
        link: '/account',
      });
      expect(ctx.mail.emailsTo(student.email, 'account-status')).toEqual([
        expect.objectContaining({ isActive: false, reason: 'Datos falsos' }),
      ]);
      expect(
        await ctx.prisma.adminAction.findFirst({
          where: { targetUserId: student.id },
        }),
      ).toMatchObject({
        adminId,
        action: 'USER_DEACTIVATED',
        reason: 'Datos falsos',
      });

      const conflict = await as(adminToken)
        .patch(`/api/admin/users/${student.id}/status`, {
          isActive: false,
          reason: 'Otra vez',
        })
        .expect(409);
      expect(conflict.body.code).toBe('ACCOUNT_STATUS_UNCHANGED');
    });

    it('filters by status', async () => {
      const inactive = await as(adminToken)
        .get(`/api/admin/users?status=inactive&q=${ctx.runId}`)
        .expect(200);
      expect(inactive.body.items.map((u: { id: string }) => u.id)).toEqual([
        student.id,
      ]);
    });

    it('reactivates an account without a reason', async () => {
      await as(adminToken)
        .patch(`/api/admin/users/${student.id}/status`, { isActive: true })
        .expect(200);
      studentToken = await ctx.login(student.email);
      await as(studentToken).get('/api/auth/me').expect(200);
      expect(await lastNotification(student.id)).toMatchObject({
        type: 'ACCOUNT_STATUS_CHANGED',
        data: { status: 'ACTIVATED' },
      });
    });

    it('hides the offers of a deactivated company until it is reactivated', async () => {
      const offerId = await publish('Hidden while inactive');
      await as(adminToken)
        .patch(`/api/admin/users/${employer.id}/status`, {
          isActive: false,
          reason: 'Empresa inexistente',
        })
        .expect(200);
      await ctx.http().get(`/api/offers/${offerId}`).expect(404);
      await ctx
        .http()
        .get(`/api/companies/${employer.company!.id}`)
        .expect(404);

      await as(adminToken)
        .patch(`/api/admin/users/${employer.id}/status`, { isActive: true })
        .expect(200);
      employerToken = await ctx.login(employer.email);
      await ctx.http().get(`/api/offers/${offerId}`).expect(200);
    });

    it('does not manage administrators nor unknown accounts', async () => {
      const response = await as(adminToken)
        .patch(`/api/admin/users/${adminId}/status`, {
          isActive: false,
          reason: 'x',
        })
        .expect(400);
      expect(response.body.code).toBe('ADMIN_ACCOUNT_NOT_MANAGEABLE');
      await as(adminToken)
        .patch('/api/admin/users/00000000-0000-0000-0000-000000000000/status', {
          isActive: false,
          reason: 'x',
        })
        .expect(404);
    });
  });

  describe('offers', () => {
    let offerId: string;

    beforeAll(async () => {
      offerId = await publish('Sospechosa');
      await as(studentToken)
        .post(`/api/offers/${offerId}/applications`, {})
        .expect(201);
    });

    it('lists offers in any status, searchable by title or company', async () => {
      const response = await as(adminToken)
        .get('/api/admin/offers')
        .query({ q: `Sospechosa ${ctx.runId}` })
        .expect(200);
      expect(response.body.items).toEqual([
        expect.objectContaining({
          id: offerId,
          status: 'OPEN',
          applicationsCount: 1,
          company: {
            id: employer.company!.id,
            name: 'moderated S.A.',
            isActive: true,
          },
        }),
      ]);

      const byCompany = await as(adminToken)
        .get('/api/admin/offers')
        .query({ q: 'moderated S.A.', status: 'OPEN' })
        .expect(200);
      expect(byCompany.body.total).toBeGreaterThanOrEqual(1);
    });

    it('removes an offer with a reason, notifying its company', async () => {
      await as(adminToken)
        .post(`/api/admin/offers/${offerId}/remove`, {})
        .expect(400);

      const response = await as(adminToken)
        .post(`/api/admin/offers/${offerId}/remove`, { reason: 'Engañosa' })
        .expect(200);
      expect(response.body).toMatchObject({
        status: 'REMOVED',
        removalReason: 'Engañosa',
        removedAt: expect.any(String),
      });

      // Hidden from the public, visible to its company with the reason.
      await ctx.http().get(`/api/offers/${offerId}`).expect(404);
      const own = await as(employerToken)
        .get(`/api/offers/${offerId}`)
        .expect(200);
      expect(own.body).toMatchObject({
        status: 'REMOVED',
        removalReason: 'Engañosa',
      });
      await as(employerToken)
        .patch(`/api/offers/${offerId}`, { title: 'Otra' })
        .expect(409);

      expect(await lastNotification(employer.id)).toMatchObject({
        type: 'OFFER_REMOVED',
        data: { offerId, status: 'REMOVED', reason: 'Engañosa' },
        link: `/offers/${offerId}`,
      });

      const again = await as(adminToken)
        .post(`/api/admin/offers/${offerId}/remove`, { reason: 'Otra vez' })
        .expect(409);
      expect(again.body.code).toBe('OFFER_ALREADY_REMOVED');
    });

    it('shows the notification in the reader language', async () => {
      const response = await as(employerToken)
        .get('/api/notifications')
        .set('Accept-Language', 'es')
        .expect(200);
      expect(response.body.items[0]).toMatchObject({
        type: 'OFFER_REMOVED',
        title: `Tu oferta "Sospechosa ${ctx.runId}" fue dada de baja`,
        body: 'Un administrador la dio de baja del portal. Motivo: Engañosa',
      });
    });

    it('restores a removed offer to the status it had', async () => {
      const response = await as(adminToken)
        .post(`/api/admin/offers/${offerId}/restore`)
        .expect(200);
      expect(response.body).toMatchObject({
        status: 'OPEN',
        removalReason: null,
        removedAt: null,
      });
      await ctx.http().get(`/api/offers/${offerId}`).expect(200);
      expect(await lastNotification(employer.id)).toMatchObject({
        type: 'OFFER_REMOVED',
        data: { status: 'RESTORED' },
      });

      const notRemoved = await as(adminToken)
        .post(`/api/admin/offers/${offerId}/restore`)
        .expect(409);
      expect(notRemoved.body.code).toBe('OFFER_NOT_REMOVED');

      // A closed offer goes back to closed.
      await as(employerToken).post(`/api/offers/${offerId}/close`).expect(200);
      await as(adminToken)
        .post(`/api/admin/offers/${offerId}/remove`, { reason: 'Spam' })
        .expect(200);
      const restored = await as(adminToken)
        .post(`/api/admin/offers/${offerId}/restore`)
        .expect(200);
      expect(restored.body.status).toBe('CLOSED');
    });

    it('records every action in the moderation log', async () => {
      const response = await as(adminToken)
        .get('/api/admin/actions?limit=50')
        .expect(200);
      const mine = response.body.items.filter(
        (item: { admin: { id: string } }) => item.admin.id === adminId,
      );
      expect(mine.map((item: { action: string }) => item.action)).toEqual([
        'OFFER_RESTORED',
        'OFFER_REMOVED',
        'OFFER_RESTORED',
        'OFFER_REMOVED',
        'USER_ACTIVATED',
        'USER_DEACTIVATED',
        'USER_ACTIVATED',
        'USER_DEACTIVATED',
      ]);
      expect(mine[1]).toMatchObject({
        reason: 'Spam',
        targetOffer: { id: offerId, title: `Sospechosa ${ctx.runId}` },
        targetUser: null,
      });
      expect(mine.at(-1)).toMatchObject({
        targetUser: { id: student.id, name: 'watched Test' },
        targetOffer: null,
      });
    });
  });
});
