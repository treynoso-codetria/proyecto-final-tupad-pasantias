import { createTestApp } from './support/test-app.js';

describe('Students (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;
  let studentToken: string;
  let studentProfileId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    const student = await ctx.createVerifiedStudent('profile');
    studentProfileId = student.studentProfile!.id;
    studentToken = await ctx.login(student.email);
  });

  afterAll(async () => {
    await ctx.close();
  });

  const asUser = (token: string) => ({
    get: (path: string) =>
      ctx.http().get(path).set('Authorization', `Bearer ${token}`),
    patch: (path: string, body: object) =>
      ctx.http().patch(path).set('Authorization', `Bearer ${token}`).send(body),
  });

  describe('GET /api/students/me', () => {
    it('returns the profile of the authenticated student, with the account email', async () => {
      const response = await asUser(studentToken)
        .get('/api/students/me')
        .expect(200);

      expect(response.body).toMatchObject({
        id: studentProfileId,
        email: ctx.email('profile'),
        firstName: 'profile',
        lastName: 'Test',
        phone: null,
        birthDate: null,
        studyYear: null,
      });
    });

    it('requires authentication and the student role', async () => {
      await ctx.http().get('/api/students/me').expect(401);

      const employer = await ctx.createVerifiedEmployer('not-a-student', '31');
      const response = await asUser(await ctx.login(employer.email))
        .get('/api/students/me')
        .expect(403);
      expect(response.body.code).toBe('FORBIDDEN');
    });
  });

  describe('PATCH /api/students/me', () => {
    it('updates the fields sent and leaves the rest untouched', async () => {
      const response = await asUser(studentToken)
        .patch('/api/students/me', {
          firstName: '  Ana María ',
          phone: '+54 261 555-0101',
          birthDate: '2003-05-14',
          studyYear: 2,
          province: 'Mendoza',
          city: 'Godoy Cruz',
          bio: 'Me interesa el desarrollo frontend.',
          portfolioUrl: 'https://github.com/ana',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        firstName: 'Ana María',
        lastName: 'Test',
        career: 'TUP',
        phone: '+54 261 555-0101',
        birthDate: '2003-05-14',
        studyYear: 2,
        province: 'Mendoza',
        city: 'Godoy Cruz',
        bio: 'Me interesa el desarrollo frontend.',
        portfolioUrl: 'https://github.com/ana',
      });

      // The name shown across the app comes from the profile.
      const me = await asUser(studentToken).get('/api/auth/me').expect(200);
      expect(me.body.studentProfile.firstName).toBe('Ana María');
    });

    it('clears nullable fields with null or an empty string', async () => {
      const response = await asUser(studentToken)
        .patch('/api/students/me', {
          phone: null,
          birthDate: null,
          studyYear: null,
          city: '   ',
          portfolioUrl: '',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        phone: null,
        birthDate: null,
        studyYear: null,
        city: null,
        portfolioUrl: null,
        // Not sent: unchanged.
        province: 'Mendoza',
        bio: 'Me interesa el desarrollo frontend.',
      });
    });

    it('rejects invalid values, with translated messages', async () => {
      const response = await asUser(studentToken)
        .patch('/api/students/me', {
          firstName: '',
          lastName: null,
          phone: 'call me',
          birthDate: '2999-01-01',
          studyYear: 0,
          province: 'Atlantis',
          portfolioUrl: 'github.com/ana',
        })
        .set('Accept-Language', 'es')
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'firstName es obligatorio',
          'phone debe ser un teléfono (dígitos, espacios, +, - y paréntesis)',
          'birthDate no puede ser una fecha futura',
          'studyYear debe ser como mínimo 1',
          'province tiene un valor no permitido',
          'portfolioUrl debe ser una URL válida',
        ]),
      );
      expect(
        response.body.message.some((message: string) =>
          message.startsWith('lastName'),
        ),
      ).toBe(true);
    });

    it('does not let the client change fields that are not part of the profile form', async () => {
      await asUser(studentToken)
        .patch('/api/students/me', { cvUrl: 'https://evil.example/cv.pdf' })
        .expect(400);
      await asUser(studentToken)
        .patch('/api/students/me', { userId: 'someone-else' })
        .expect(400);
    });
  });

  describe('GET /api/students/:id', () => {
    let companyWithApplicationToken: string;
    let otherCompanyToken: string;

    beforeAll(async () => {
      const category = await ctx.createCategory('students');
      const employer = await ctx.createVerifiedEmployer('applied-to', '32');
      const otherEmployer = await ctx.createVerifiedEmployer('stranger', '33');

      // The student applied to an offer of the first company only.
      await ctx.prisma.jobOffer.create({
        data: {
          companyId: employer.company!.id,
          categoryId: category.id,
          title: 'Pasante',
          description: 'Descripción',
          type: 'INTERNSHIP',
          modality: 'REMOTE',
          workload: 'PART_TIME',
          applications: { create: { studentId: studentProfileId } },
        },
      });

      companyWithApplicationToken = await ctx.login(employer.email);
      otherCompanyToken = await ctx.login(otherEmployer.email);

      await asUser(studentToken)
        .patch('/api/students/me', { birthDate: '2003-05-14' })
        .expect(200);
    });

    it('lets a company see the profile of a student who applied to its offers, without the date of birth', async () => {
      const response = await asUser(companyWithApplicationToken)
        .get(`/api/students/${studentProfileId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: studentProfileId,
        email: ctx.email('profile'),
        firstName: 'Ana María',
        career: 'TUP',
      });
      expect(response.body).not.toHaveProperty('birthDate');
    });

    it('does not let a company the student never applied to see the profile', async () => {
      const response = await asUser(otherCompanyToken)
        .get(`/api/students/${studentProfileId}`)
        .expect(403);

      expect(response.body.code).toBe('FORBIDDEN');
    });

    it('does not let students read the profiles of other students', async () => {
      const other = await ctx.createVerifiedStudent('curious');

      await asUser(await ctx.login(other.email))
        .get(`/api/students/${studentProfileId}`)
        .expect(403);
    });

    it('returns 404 for an unknown id and 400 for a malformed one', async () => {
      await asUser(companyWithApplicationToken)
        .get('/api/students/00000000-0000-4000-8000-000000000000')
        .expect(404);
      await asUser(companyWithApplicationToken)
        .get('/api/students/not-a-uuid')
        .expect(400);
    });
  });
});
