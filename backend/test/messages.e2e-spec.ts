import { createTestApp } from './support/test-app.js';

type Message = {
  id: string;
  body: string;
  mine: boolean;
  readAt: string | null;
};

describe('Messages (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;
  let employerToken: string;
  let employerUserId: string;
  let otherEmployerToken: string;
  let studentToken: string;
  let studentUserId: string;
  let studentProfileId: string;
  let otherStudentToken: string;
  let adminToken: string;
  let companyId: string;
  let categoryId: string;
  let applicationId: string;

  const as = (token: string) => ({
    get: (path: string) =>
      ctx.http().get(path).set('Authorization', `Bearer ${token}`),
    post: (path: string, body: object = {}) =>
      ctx.http().post(path).set('Authorization', `Bearer ${token}`).send(body),
  });

  // An open offer of the employer and an application of the student to it.
  async function apply(
    title: string,
    token = studentToken,
    coverLetter?: string,
  ): Promise<string> {
    const offer = await as(employerToken)
      .post('/api/offers', {
        title: `${title} ${ctx.runId}`,
        description: 'Descripción',
        type: 'INTERNSHIP',
        modality: 'REMOTE',
        workload: 'PART_TIME',
        categoryId,
      })
      .expect(201);
    const application = await as(token)
      .post(`/api/offers/${offer.body.id}/applications`, { coverLetter })
      .expect(201);
    return application.body.id;
  }

  const send = (token: string, id: string, body: string) =>
    as(token).post(`/api/conversations/${id}/messages`, { body });

  const messageNotices = (userId: string) =>
    ctx.prisma.notification.findMany({
      where: { userId, type: 'NEW_MESSAGE' },
      orderBy: { createdAt: 'asc' },
    });

  beforeAll(async () => {
    ctx = await createTestApp();
    const employer = await ctx.createVerifiedEmployer('msg-company', '71');
    employerUserId = employer.id;
    companyId = employer.company!.id;
    employerToken = await ctx.login(employer.email);
    otherEmployerToken = await ctx.login(
      (await ctx.createVerifiedEmployer('msg-other', '72')).email,
    );
    const student = await ctx.createVerifiedStudent('msg-student');
    studentUserId = student.id;
    studentProfileId = student.studentProfile!.id;
    studentToken = await ctx.login(student.email);
    otherStudentToken = await ctx.login(
      (await ctx.createVerifiedStudent('msg-outsider')).email,
    );
    adminToken = await ctx.login((await ctx.createAdmin('msg-admin')).email);
    categoryId = (await ctx.createCategory('messages')).id;
    applicationId = await apply('Chat', studentToken, 'Hola, me interesa.');
  });

  afterAll(async () => {
    await ctx.close();
  });

  describe('a conversation', () => {
    it('starts empty, opened by the cover letter, for both participants', async () => {
      const asCompany = await as(employerToken)
        .get(`/api/conversations/${applicationId}`)
        .expect(200);

      expect(asCompany.body).toMatchObject({
        applicationId,
        applicationStatus: 'PENDING',
        offer: { title: `Chat ${ctx.runId}` },
        counterpart: {
          name: 'msg-student Test',
          studentId: studentProfileId,
          companyId: null,
          logoUrl: null,
        },
        canSend: true,
        unreadCount: 0,
        coverLetter: 'Hola, me interesa.',
        messages: [],
      });

      const asStudent = await as(studentToken)
        .get(`/api/conversations/${applicationId}`)
        .expect(200);
      expect(asStudent.body.counterpart).toMatchObject({
        name: 'msg-company S.A.',
        companyId,
        studentId: null,
      });
    });

    it('is private to the student of the application and the company of the offer', async () => {
      for (const token of [otherEmployerToken, otherStudentToken]) {
        await as(token).get(`/api/conversations/${applicationId}`).expect(403);
        await send(token, applicationId, 'Hola').expect(403);
        await as(token)
          .post(`/api/conversations/${applicationId}/read`)
          .expect(403);
      }
      await as(adminToken).get('/api/conversations').expect(403);
      await ctx.http().get('/api/conversations').expect(401);
      await as(studentToken)
        .get('/api/conversations/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('delivers messages in order, marking whose each one is', async () => {
      const first = await send(
        employerToken,
        applicationId,
        '  ¿Podés el jueves?  ',
      ).expect(201);
      expect(first.body).toMatchObject({
        body: '¿Podés el jueves?',
        mine: true,
        readAt: null,
      });
      await send(studentToken, applicationId, 'Sí, a las 15.').expect(201);

      const thread = await as(studentToken)
        .get(`/api/conversations/${applicationId}`)
        .expect(200);
      expect(
        (thread.body.messages as Message[]).map(({ body, mine }) => ({
          body,
          mine,
        })),
      ).toEqual([
        { body: '¿Podés el jueves?', mine: false },
        { body: 'Sí, a las 15.', mine: true },
      ]);
      expect(thread.body.unreadCount).toBe(1);
    });

    it('validates the message', async () => {
      const blank = await send(studentToken, applicationId, '   ').expect(400);
      expect(blank.body.code).toBe('VALIDATION_FAILED');
      await send(studentToken, applicationId, 'x'.repeat(2001)).expect(400);
    });
  });

  describe('unread messages', () => {
    let id: string;

    beforeAll(async () => {
      id = await apply('Unread');
    });

    it('notifies the recipient once per conversation until they read it', async () => {
      const before = (await messageNotices(studentUserId)).length;
      await send(employerToken, id, 'Uno').expect(201);
      await send(employerToken, id, 'Dos').expect(201);

      const notices = await messageNotices(studentUserId);
      expect(notices).toHaveLength(before + 1);
      expect(notices.at(-1)).toMatchObject({
        link: `/messages/${id}`,
        readAt: null,
        data: { applicationId: id, senderName: 'msg-company S.A.' },
      });

      const translated = await as(studentToken)
        .get('/api/notifications')
        .set('Accept-Language', 'es')
        .expect(200);
      expect(translated.body.items[0]).toMatchObject({
        title: 'Nuevo mensaje de msg-company S.A.',
        body: `Sobre "Unread ${ctx.runId}".`,
      });
    });

    it('counts them per conversation and in total', async () => {
      const total = await as(studentToken)
        .get('/api/conversations/unread-count')
        .expect(200);
      // "Dos" and "Uno" here, plus "¿Podés el jueves?" in the first chat.
      expect(total.body).toEqual({ count: 3 });

      const inbox = await as(studentToken)
        .get('/api/conversations')
        .expect(200);
      const conversation = inbox.body.items.find(
        (item: { applicationId: string }) => item.applicationId === id,
      );
      expect(conversation).toMatchObject({
        unreadCount: 2,
        lastMessage: { body: 'Dos', mine: false },
      });
    });

    it('marks the conversation and its notification as read', async () => {
      await as(studentToken).post(`/api/conversations/${id}/read`).expect(204);

      const thread = await as(studentToken)
        .get(`/api/conversations/${id}`)
        .expect(200);
      expect(thread.body.unreadCount).toBe(0);
      expect(
        (thread.body.messages as Message[]).every((m) => m.readAt !== null),
      ).toBe(true);
      expect(
        (await messageNotices(studentUserId)).at(-1)?.readAt,
      ).not.toBeNull();

      // The sender sees that it was read.
      const sent = await as(employerToken)
        .get(`/api/conversations/${id}`)
        .expect(200);
      expect((sent.body.messages as Message[])[0].readAt).not.toBeNull();

      const total = await as(studentToken)
        .get('/api/conversations/unread-count')
        .expect(200);
      expect(total.body.count).toBe(1);

      // A new message after reading notifies again.
      await send(employerToken, id, 'Tres').expect(201);
      const unreadHere = (await messageNotices(studentUserId)).filter(
        (n) =>
          n.readAt === null &&
          (n.data as { applicationId: string }).applicationId === id,
      );
      expect(unreadHere).toHaveLength(1);
    });

    it('notifies the company of the student messages too', async () => {
      await send(studentToken, id, 'Gracias').expect(201);
      const notices = await messageNotices(employerUserId);
      expect(notices.at(-1)).toMatchObject({
        link: `/messages/${id}`,
        data: { senderName: 'msg-student Test' },
      });
    });
  });

  describe('the inbox', () => {
    it('lists the conversations with messages, the most recent first', async () => {
      const silent = await apply('Silent');
      const recent = await apply('Recent');
      await send(studentToken, recent, 'Último').expect(201);

      const inbox = await as(studentToken)
        .get('/api/conversations')
        .expect(200);
      const ids = inbox.body.items.map(
        (item: { applicationId: string }) => item.applicationId,
      );
      expect(ids[0]).toBe(recent);
      expect(ids).not.toContain(silent);
      expect(inbox.body).toMatchObject({ total: 3, page: 1, totalPages: 1 });
      expect(inbox.body.items[0].lastMessage).toMatchObject({
        body: 'Último',
        mine: true,
      });

      const firstPage = await as(studentToken)
        .get('/api/conversations?limit=2')
        .expect(200);
      const secondPage = await as(studentToken)
        .get('/api/conversations?limit=2&page=2')
        .expect(200);
      expect(firstPage.body.items).toHaveLength(2);
      expect(secondPage.body.items).toHaveLength(1);
      expect(firstPage.body.totalPages).toBe(2);

      // The company sees the same conversations, named after the student.
      const companyInbox = await as(employerToken)
        .get('/api/conversations')
        .expect(200);
      expect(companyInbox.body.items[0]).toMatchObject({
        applicationId: recent,
        counterpart: { name: 'msg-student Test' },
      });
      // Other companies see none of them.
      const otherInbox = await as(otherEmployerToken)
        .get('/api/conversations')
        .expect(200);
      expect(otherInbox.body.total).toBe(0);
    });
  });

  describe('a closed conversation', () => {
    it('stays readable but takes no messages once the application is withdrawn', async () => {
      const id = await apply('Withdrawn');
      await send(employerToken, id, 'Hola').expect(201);
      await as(studentToken)
        .post(`/api/applications/${id}/withdraw`)
        .expect(200);

      const thread = await as(employerToken)
        .get(`/api/conversations/${id}`)
        .expect(200);
      expect(thread.body).toMatchObject({
        applicationStatus: 'WITHDRAWN',
        canSend: false,
      });
      expect(thread.body.messages).toHaveLength(1);

      const closed = await send(studentToken, id, 'Perdón')
        .set('Accept-Language', 'es')
        .expect(409);
      expect(closed.body.code).toBe('CONVERSATION_CLOSED');
      await send(employerToken, id, '¿Seguro?').expect(409);
    });

    it('takes no messages once the offer was removed', async () => {
      const id = await apply('Removed');
      const { offerId } = await ctx.prisma.application.findUniqueOrThrow({
        where: { id },
      });
      await ctx.prisma.jobOffer.update({
        where: { id: offerId },
        data: { status: 'REMOVED', removedAt: new Date() },
      });

      await send(studentToken, id, 'Hola').expect(409);
    });
  });
});
