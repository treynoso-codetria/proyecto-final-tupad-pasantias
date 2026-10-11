import { createTestApp } from './support/test-app.js';

type Applicant = { id: string; status: string; student: { id: string } };

describe('Applications (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;
  let employerToken: string;
  let employerUserId: string;
  let otherEmployerToken: string;
  let studentToken: string;
  let studentUserId: string;
  let studentProfileId: string;
  let otherStudentToken: string;
  let categoryId: string;
  let offerId: string;

  const as = (token: string) => ({
    get: (path: string) =>
      ctx.http().get(path).set('Authorization', `Bearer ${token}`),
    post: (path: string, body: object = {}) =>
      ctx.http().post(path).set('Authorization', `Bearer ${token}`).send(body),
    patch: (path: string, body: object) =>
      ctx.http().patch(path).set('Authorization', `Bearer ${token}`).send(body),
  });

  const publish = async (overrides: object = {}) =>
    (
      await as(employerToken)
        .post('/api/offers', {
          title: `Offer ${ctx.runId}`,
          description: 'Descripción',
          type: 'INTERNSHIP',
          modality: 'REMOTE',
          workload: 'PART_TIME',
          categoryId,
          ...overrides,
        })
        .expect(201)
    ).body.id as string;

  const notificationsOf = (userId: string) =>
    ctx.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

  beforeAll(async () => {
    ctx = await createTestApp();
    const employer = await ctx.createVerifiedEmployer('hiring', '61');
    employerUserId = employer.id;
    employerToken = await ctx.login(employer.email);
    otherEmployerToken = await ctx.login(
      (await ctx.createVerifiedEmployer('nosy', '62')).email,
    );
    const student = await ctx.createVerifiedStudent('applicant');
    studentUserId = student.id;
    studentProfileId = student.studentProfile!.id;
    studentToken = await ctx.login(student.email);
    otherStudentToken = await ctx.login(
      (await ctx.createVerifiedStudent('second')).email,
    );
    categoryId = (await ctx.createCategory('applications')).id;
    offerId = await publish();
  });

  afterAll(async () => {
    await ctx.close();
  });

  describe('applying', () => {
    it('is only for students', async () => {
      await ctx.http().post(`/api/offers/${offerId}/applications`).expect(401);
      await as(employerToken)
        .post(`/api/offers/${offerId}/applications`)
        .expect(403);
    });

    it('creates a pending application and notifies the company', async () => {
      const response = await as(studentToken)
        .post(`/api/offers/${offerId}/applications`, {
          coverLetter: 'Me interesa mucho.',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        offerId,
        status: 'PENDING',
        coverLetter: 'Me interesa mucho.',
        cvUrl: null,
        reviewedAt: null,
      });

      const [notification] = await notificationsOf(employerUserId);
      expect(notification).toMatchObject({
        type: 'APPLICATION_RECEIVED',
        link: `/employer/offers/${offerId}/applications`,
        readAt: null,
      });
      expect(notification.body).toContain('applicant Test');
    });

    it('shows the student their application in the offer detail', async () => {
      const detail = await as(studentToken)
        .get(`/api/offers/${offerId}`)
        .expect(200);
      expect(detail.body.myApplication).toMatchObject({ status: 'PENDING' });

      const anonymous = await ctx
        .http()
        .get(`/api/offers/${offerId}`)
        .expect(200);
      expect(anonymous.body.myApplication).toBeNull();
    });

    it('rejects a second application to the same offer', async () => {
      const response = await as(studentToken)
        .post(`/api/offers/${offerId}/applications`)
        .expect(409);
      expect(response.body.code).toBe('ALREADY_APPLIED');
    });

    it('rejects offers that do not accept applications', async () => {
      const closed = await publish();
      await as(employerToken).post(`/api/offers/${closed}/close`).expect(200);
      const closedResponse = await as(studentToken)
        .post(`/api/offers/${closed}/applications`)
        .expect(409);
      expect(closedResponse.body.code).toBe('OFFER_NOT_ACCEPTING_APPLICATIONS');

      const expired = await publish();
      await ctx.prisma.jobOffer.update({
        where: { id: expired },
        data: { deadline: new Date('2020-01-01') },
      });
      await as(studentToken)
        .post(`/api/offers/${expired}/applications`)
        .expect(409);

      const removed = await publish();
      await ctx.prisma.jobOffer.update({
        where: { id: removed },
        data: { status: 'REMOVED' },
      });
      await as(studentToken)
        .post(`/api/offers/${removed}/applications`)
        .expect(404);
      await as(studentToken)
        .post('/api/offers/00000000-0000-4000-8000-000000000000/applications')
        .expect(404);
    });

    it('validates the cover letter', async () => {
      await as(otherStudentToken)
        .post(`/api/offers/${offerId}/applications`, {
          coverLetter: 'x'.repeat(2001),
        })
        .expect(400);
    });
  });

  describe("the company's side", () => {
    let applicationId: string;

    beforeAll(async () => {
      await as(otherStudentToken)
        .post(`/api/offers/${offerId}/applications`)
        .expect(201);
      const applicants = await as(employerToken)
        .get(`/api/offers/${offerId}/applications`)
        .expect(200);
      applicationId = applicants.body.find(
        (item: Applicant) => item.student.id === studentProfileId,
      ).id;
    });

    it('lists the applicants of its offer, oldest first, with their contact data', async () => {
      const response = await as(employerToken)
        .get(`/api/offers/${offerId}/applications`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        status: 'PENDING',
        coverLetter: 'Me interesa mucho.',
        student: {
          id: studentProfileId,
          firstName: 'applicant',
          email: ctx.email('applicant'),
          career: 'TUP',
        },
      });
    });

    it('is not available to other companies nor to students', async () => {
      await as(otherEmployerToken)
        .get(`/api/offers/${offerId}/applications`)
        .expect(403);
      await as(studentToken)
        .get(`/api/offers/${offerId}/applications`)
        .expect(403);
      await as(otherEmployerToken)
        .patch(`/api/applications/${applicationId}/status`, {
          status: 'ACCEPTED',
        })
        .expect(403);
    });

    it('accepts an application, which notifies the student', async () => {
      const response = await as(employerToken)
        .patch(`/api/applications/${applicationId}/status`, {
          status: 'ACCEPTED',
        })
        .expect(200);

      expect(response.body.status).toBe('ACCEPTED');
      expect(response.body.reviewedAt).toEqual(expect.any(String));
      const notifications = await notificationsOf(studentUserId);
      expect(notifications.at(-1)).toMatchObject({
        type: 'APPLICATION_STATUS_CHANGED',
        title: 'Your application was accepted',
        link: '/student/applications',
      });
    });

    it('can change its answer; repeating the same answer notifies nobody', async () => {
      await as(employerToken)
        .patch(`/api/applications/${applicationId}/status`, {
          status: 'REJECTED',
        })
        .expect(200);
      const before = (await notificationsOf(studentUserId)).length;

      await as(employerToken)
        .patch(`/api/applications/${applicationId}/status`, {
          status: 'REJECTED',
        })
        .expect(200);
      expect(await notificationsOf(studentUserId)).toHaveLength(before);
    });

    it('filters applicants by status', async () => {
      const rejected = await as(employerToken)
        .get(`/api/offers/${offerId}/applications?status=REJECTED`)
        .expect(200);
      expect(rejected.body.map((item: Applicant) => item.id)).toEqual([
        applicationId,
      ]);

      await as(employerToken)
        .get(`/api/offers/${offerId}/applications?status=WITHDRAWN`)
        .expect(400);
    });

    it('only accepts ACCEPTED or REJECTED as an answer', async () => {
      for (const status of ['PENDING', 'WITHDRAWN', 'MAYBE']) {
        await as(employerToken)
          .patch(`/api/applications/${applicationId}/status`, { status })
          .expect(400);
      }
    });

    it('lets the company read the profile of its applicant', async () => {
      await as(employerToken)
        .get(`/api/students/${studentProfileId}`)
        .expect(200);
    });
  });

  describe("the student's side", () => {
    it("lists the student's applications with their offer", async () => {
      const response = await as(studentToken)
        .get('/api/applications/mine')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        offerId,
        status: 'REJECTED',
        offer: {
          id: offerId,
          title: `Offer ${ctx.runId}`,
          status: 'OPEN',
          company: { name: 'hiring S.A.' },
        },
      });

      const pending = await as(studentToken)
        .get('/api/applications/mine?status=PENDING')
        .expect(200);
      expect(pending.body).toEqual([]);
    });

    it("only withdraws pending applications, and only the student's own", async () => {
      const [answered] = (
        await as(studentToken).get('/api/applications/mine').expect(200)
      ).body;
      const notPending = await as(studentToken)
        .post(`/api/applications/${answered.id}/withdraw`)
        .expect(409);
      expect(notPending.body.code).toBe('APPLICATION_NOT_PENDING');

      const [othersPending] = (
        await as(otherStudentToken).get('/api/applications/mine').expect(200)
      ).body;
      await as(studentToken)
        .post(`/api/applications/${othersPending.id}/withdraw`)
        .expect(403);
    });

    it('withdraws a pending application, which hides it from the company, and can apply again', async () => {
      const secondOffer = await publish();
      const applied = await as(studentToken)
        .post(`/api/offers/${secondOffer}/applications`)
        .expect(201);

      const withdrawn = await as(studentToken)
        .post(`/api/applications/${applied.body.id}/withdraw`)
        .expect(200);
      expect(withdrawn.body.status).toBe('WITHDRAWN');

      const applicants = await as(employerToken)
        .get(`/api/offers/${secondOffer}/applications`)
        .expect(200);
      expect(applicants.body).toEqual([]);

      const mine = await as(employerToken).get('/api/offers/mine').expect(200);
      expect(
        mine.body.find((offer: { id: string }) => offer.id === secondOffer),
      ).toMatchObject({ applicationsCount: 0 });

      const again = await as(studentToken)
        .post(`/api/offers/${secondOffer}/applications`, {
          coverLetter: 'Lo pensé mejor.',
        })
        .expect(201);
      expect(again.body).toMatchObject({
        // The same application, reopened.
        id: applied.body.id,
        status: 'PENDING',
        coverLetter: 'Lo pensé mejor.',
      });
    });

    it('hides the student profile from a company once the only application to it was withdrawn', async () => {
      const company = await ctx.createVerifiedEmployer('dropped', '63');
      const companyToken = await ctx.login(company.email);
      const offer = (
        await as(companyToken)
          .post('/api/offers', {
            title: `Dropped ${ctx.runId}`,
            description: 'Descripción',
            type: 'JOB',
            modality: 'REMOTE',
            workload: 'FULL_TIME',
            categoryId,
          })
          .expect(201)
      ).body.id;
      const application = await as(studentToken)
        .post(`/api/offers/${offer}/applications`)
        .expect(201);
      await as(companyToken)
        .get(`/api/students/${studentProfileId}`)
        .expect(200);

      await as(studentToken)
        .post(`/api/applications/${application.body.id}/withdraw`)
        .expect(200);
      await as(companyToken)
        .get(`/api/students/${studentProfileId}`)
        .expect(403);
    });
  });
});
