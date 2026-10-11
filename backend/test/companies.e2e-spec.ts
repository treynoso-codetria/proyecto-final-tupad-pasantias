import { createTestApp } from './support/test-app.js';

describe('Companies (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;
  let employerToken: string;
  let companyId: string;
  let otherCompanyCuit: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    const employer = await ctx.createVerifiedEmployer('company', '30');
    companyId = employer.company!.id;
    employerToken = await ctx.login(employer.email);
    otherCompanyCuit = (await ctx.createVerifiedEmployer('rival', '33'))
      .company!.cuit;
  });

  afterAll(async () => {
    await ctx.close();
  });

  const asEmployer = {
    get: (path: string) =>
      ctx.http().get(path).set('Authorization', `Bearer ${employerToken}`),
    patch: (path: string, body: object) =>
      ctx
        .http()
        .patch(path)
        .set('Authorization', `Bearer ${employerToken}`)
        .send(body),
  };

  describe('GET /api/companies/me', () => {
    it('returns the company of the authenticated employer, with the account email', async () => {
      const response = await asEmployer.get('/api/companies/me').expect(200);

      expect(response.body).toMatchObject({
        id: companyId,
        email: ctx.email('company'),
        name: 'company S.A.',
        industry: null,
        website: null,
      });
      expect(response.body.cuit).toMatch(/^30-\d{8}-0$/);
    });

    it('requires authentication and the employer role', async () => {
      await ctx.http().get('/api/companies/me').expect(401);

      const student = await ctx.createVerifiedStudent('not-an-employer');
      const studentToken = await ctx.login(student.email);
      await ctx
        .http()
        .get('/api/companies/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  describe('PATCH /api/companies/me', () => {
    it('updates the fields sent and leaves the rest untouched', async () => {
      const response = await asEmployer
        .patch('/api/companies/me', {
          name: ' TechSur S.A. ',
          industry: 'Software',
          description: 'Consultora de desarrollo de software a medida.',
          website: 'https://techsur.example.com',
          phone: '+54 261 555-0100',
          province: 'Mendoza',
          city: 'Mendoza',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        name: 'TechSur S.A.',
        industry: 'Software',
        website: 'https://techsur.example.com',
        phone: '+54 261 555-0100',
        province: 'Mendoza',
      });
      expect(response.body.cuit).toMatch(/^30-\d{8}-0$/);

      // The name shown across the app comes from the company.
      const me = await asEmployer.get('/api/auth/me').expect(200);
      expect(me.body.company.name).toBe('TechSur S.A.');
    });

    it('clears nullable fields with null or an empty string', async () => {
      const response = await asEmployer
        .patch('/api/companies/me', { phone: null, website: '' })
        .expect(200);

      expect(response.body).toMatchObject({
        phone: null,
        website: null,
        industry: 'Software',
      });
    });

    it('accepts its own CUIT and rejects the CUIT of another company', async () => {
      const own = (await asEmployer.get('/api/companies/me')).body.cuit;
      await asEmployer.patch('/api/companies/me', { cuit: own }).expect(200);

      const response = await asEmployer
        .patch('/api/companies/me', { cuit: otherCompanyCuit })
        .expect(409);
      expect(response.body.code).toBe('CUIT_TAKEN');
    });

    it('rejects invalid values', async () => {
      const response = await asEmployer
        .patch('/api/companies/me', {
          name: '',
          cuit: '30712345678',
          website: 'not a url',
          province: 'Atlantis',
          logoUrl: 'https://evil.example/logo.png',
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'name is required',
          'cuit must have the format XX-XXXXXXXX-X',
          'website must be a valid URL',
          'province has a value that is not allowed',
          'logoUrl is not an allowed field',
        ]),
      );
    });
  });

  describe('GET /api/companies/:id (public page)', () => {
    beforeAll(async () => {
      const category = await ctx.createCategory('companies');
      const day = 24 * 60 * 60 * 1000;
      const base = {
        companyId,
        categoryId: category.id,
        description: 'Descripción',
        type: 'INTERNSHIP',
        modality: 'REMOTE',
        workload: 'PART_TIME',
      } as const;

      await ctx.prisma.jobOffer.createMany({
        data: [
          { ...base, title: 'Open, no deadline' },
          {
            ...base,
            title: 'Open, future deadline',
            deadline: new Date(Date.now() + 10 * day),
          },
          {
            ...base,
            title: 'Open, deadline passed',
            deadline: new Date(Date.now() - 10 * day),
          },
          { ...base, title: 'Closed', status: 'CLOSED' },
          { ...base, title: 'Removed by an admin', status: 'REMOVED' },
        ],
      });
    });

    it('is public and lists only the offers that can still be applied to', async () => {
      const response = await ctx
        .http()
        .get(`/api/companies/${companyId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: companyId,
        name: 'TechSur S.A.',
        industry: 'Software',
        province: 'Mendoza',
      });
      expect(
        response.body.openOffers.map((offer: { title: string }) => offer.title),
      ).toEqual(
        expect.arrayContaining(['Open, no deadline', 'Open, future deadline']),
      );
      expect(response.body.openOffers).toHaveLength(2);
      expect(response.body.openOffers[0]).toMatchObject({
        type: 'INTERNSHIP',
        modality: 'REMOTE',
        workload: 'PART_TIME',
      });
    });

    it('does not expose private data of the company', async () => {
      const response = await ctx
        .http()
        .get(`/api/companies/${companyId}`)
        .expect(200);

      for (const field of ['email', 'cuit', 'phone', 'userId']) {
        expect(response.body).not.toHaveProperty(field);
      }
    });

    it('returns 404 for an unknown company, and for one whose account is deactivated', async () => {
      await ctx
        .http()
        .get('/api/companies/00000000-0000-4000-8000-000000000000')
        .expect(404);

      const banned = await ctx.createVerifiedEmployer('banned', '34');
      await ctx.prisma.user.update({
        where: { id: banned.id },
        data: { isActive: false },
      });
      await ctx.http().get(`/api/companies/${banned.company!.id}`).expect(404);
    });
  });
});
