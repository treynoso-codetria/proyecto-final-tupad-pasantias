import { createTestApp } from './support/test-app.js';

type Item = {
  id: string;
  title: string;
  body: string | null;
  readAt: string | null;
};

describe('Notifications (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;
  let employerToken: string;
  let studentToken: string;
  let studentUserId: string;
  let offerId: string;
  let applicationId: string;

  const as = (token: string) => ({
    get: (path: string) =>
      ctx.http().get(path).set('Authorization', `Bearer ${token}`),
    post: (path: string, body: object = {}) =>
      ctx.http().post(path).set('Authorization', `Bearer ${token}`).send(body),
    patch: (path: string, body: object = {}) =>
      ctx.http().patch(path).set('Authorization', `Bearer ${token}`).send(body),
  });

  beforeAll(async () => {
    ctx = await createTestApp();
    const employer = await ctx.createVerifiedEmployer('notifier', '71');
    employerToken = await ctx.login(employer.email);
    const student = await ctx.createVerifiedStudent('notified');
    studentUserId = student.id;
    studentToken = await ctx.login(student.email);
    const category = await ctx.createCategory('notifications');

    offerId = (
      await as(employerToken)
        .post('/api/offers', {
          title: 'Pasante QA',
          description: 'Descripción',
          type: 'INTERNSHIP',
          modality: 'REMOTE',
          workload: 'PART_TIME',
          categoryId: category.id,
        })
        .expect(201)
    ).body.id;
    applicationId = (
      await as(studentToken)
        .post(`/api/offers/${offerId}/applications`)
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('requires authentication', async () => {
    await ctx.http().get('/api/notifications').expect(401);
    await ctx.http().get('/api/notifications/unread-count').expect(401);
  });

  it('shows a notification in the language of the request', async () => {
    const english = await as(employerToken)
      .get('/api/notifications')
      .expect(200);
    expect(english.body.items[0]).toMatchObject({
      type: 'APPLICATION_RECEIVED',
      title: 'New application for "Pasante QA"',
      body: 'notified Test applied to your offer.',
      link: `/employer/offers/${offerId}/applications`,
      readAt: null,
    });

    const spanish = await as(employerToken)
      .get('/api/notifications')
      .set('Accept-Language', 'es')
      .expect(200);
    expect(spanish.body.items[0]).toMatchObject({
      title: 'Nueva postulación a "Pasante QA"',
      body: 'notified Test se postuló a tu oferta.',
    });
  });

  it('chooses the text of an answer by its outcome', async () => {
    await as(employerToken)
      .patch(`/api/applications/${applicationId}/status`, {
        status: 'REJECTED',
      })
      .expect(200);

    const response = await as(studentToken)
      .get('/api/notifications')
      .set('Accept-Language', 'es')
      .expect(200);
    expect(response.body.items[0]).toMatchObject({
      type: 'APPLICATION_STATUS_CHANGED',
      title: 'Tu postulación no fue seleccionada',
      body: 'notifier S.A. no seleccionó tu postulación a "Pasante QA".',
    });
  });

  it('falls back to the stored text when there is no data to build it', async () => {
    await ctx.prisma.notification.create({
      data: {
        userId: studentUserId,
        type: 'ACCOUNT_STATUS_CHANGED',
        title: 'Stored title',
        body: 'Stored body',
      },
    });

    const response = await as(studentToken)
      .get('/api/notifications')
      .set('Accept-Language', 'es')
      .expect(200);
    expect(response.body.items[0]).toMatchObject({
      title: 'Stored title',
      body: 'Stored body',
    });
  });

  describe('reading', () => {
    let ids: string[];

    beforeAll(async () => {
      // Five more, so the student has seven unread notifications.
      for (let index = 0; index < 5; index += 1) {
        await ctx.prisma.notification.create({
          data: {
            userId: studentUserId,
            type: 'NEW_MESSAGE',
            title: `Message ${index}`,
          },
        });
      }
      const response = await as(studentToken)
        .get('/api/notifications?limit=50')
        .expect(200);
      ids = response.body.items.map((item: Item) => item.id);
    });

    it('counts the unread notifications', async () => {
      const response = await as(studentToken)
        .get('/api/notifications/unread-count')
        .expect(200);
      expect(response.body).toEqual({ count: 7 });
    });

    it('paginates, newest first', async () => {
      const response = await as(studentToken)
        .get('/api/notifications?limit=3&page=2')
        .expect(200);
      expect(response.body).toMatchObject({
        total: 7,
        unreadCount: 7,
        page: 2,
        limit: 3,
        totalPages: 3,
      });
      expect(response.body.items.map((item: Item) => item.title)).toEqual([
        'Message 1',
        'Message 0',
        'Stored title',
      ]);
    });

    it('marks one notification as read, and only the owner can', async () => {
      await as(employerToken)
        .patch(`/api/notifications/${ids[0]}/read`)
        .expect(404);
      await as(studentToken)
        .patch(`/api/notifications/${ids[0]}/read`)
        .expect(204);
      // Marking it again is harmless.
      await as(studentToken)
        .patch(`/api/notifications/${ids[0]}/read`)
        .expect(204);

      const unread = await as(studentToken)
        .get('/api/notifications?unread=true&limit=50')
        .expect(200);
      expect(unread.body.total).toBe(6);
      expect(unread.body.items.map((item: Item) => item.id)).not.toContain(
        ids[0],
      );
    });

    it('marks every notification as read', async () => {
      await as(studentToken).post('/api/notifications/read-all').expect(204);

      const count = await as(studentToken)
        .get('/api/notifications/unread-count')
        .expect(200);
      expect(count.body.count).toBe(0);
      const all = await as(studentToken).get('/api/notifications').expect(200);
      expect(all.body.items.every((item: Item) => item.readAt !== null)).toBe(
        true,
      );
    });

    it('rejects invalid queries and ids', async () => {
      await as(studentToken).get('/api/notifications?limit=500').expect(400);
      await as(studentToken).get('/api/notifications?unread=maybe').expect(400);
      await as(studentToken)
        .patch('/api/notifications/not-an-id/read')
        .expect(400);
      await as(studentToken)
        .patch('/api/notifications/00000000-0000-4000-8000-000000000000/read')
        .expect(404);
    });
  });
});
