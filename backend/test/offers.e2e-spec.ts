import { createTestApp } from './support/test-app.js';

type OfferBody = Record<string, unknown>;
type Summary = { id: string; title: string };

const DAY = 24 * 60 * 60 * 1000;
const isoDate = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

describe('Offers (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;
  let employerToken: string;
  let otherEmployerToken: string;
  let studentToken: string;
  let adminToken: string;
  let categoryId: string;
  let otherCategoryId: string;
  let categorySlug: string;
  let inactiveCategoryId: string;
  let tagIds: { react: string; node: string; sql: string };
  let tagSlugs: { react: string; node: string; sql: string };
  let companyId: string;

  // Every offer created here has the run id in its title, so searching for it
  // isolates them from other data in the database.
  let marker: string;
  const title = (name: string) => `${name} ${marker}`;

  const base = (): OfferBody => ({
    title: title('Base'),
    description: 'Descripción de la oferta',
    type: 'INTERNSHIP',
    modality: 'REMOTE',
    workload: 'PART_TIME',
    categoryId,
  });

  const as = (token: string) => ({
    get: (path: string) =>
      ctx.http().get(path).set('Authorization', `Bearer ${token}`),
    post: (path: string, body?: object) =>
      ctx.http().post(path).set('Authorization', `Bearer ${token}`).send(body),
    patch: (path: string, body: object) =>
      ctx.http().patch(path).set('Authorization', `Bearer ${token}`).send(body),
  });
  const publish = async (body: OfferBody, token = employerToken) =>
    (await as(token).post('/api/offers', body).expect(201)).body;

  beforeAll(async () => {
    ctx = await createTestApp();
    marker = `zq${ctx.runId}`;

    const employer = await ctx.createVerifiedEmployer('publisher', '41');
    companyId = employer.company!.id;
    employerToken = await ctx.login(employer.email);
    const other = await ctx.createVerifiedEmployer('competitor', '42');
    otherEmployerToken = await ctx.login(other.email);
    studentToken = await ctx.login(
      (await ctx.createVerifiedStudent('seeker')).email,
    );
    adminToken = await ctx.login((await ctx.createAdmin('moderator')).email);

    const category = await ctx.createCategory('software');
    categoryId = category.id;
    categorySlug = category.slug;
    otherCategoryId = (await ctx.createCategory('data')).id;
    inactiveCategoryId = (await ctx.createCategory('retired', false)).id;
    const [react, node, sql] = await Promise.all(
      ['react', 'node', 'sql'].map((name) => ctx.createTag(name)),
    );
    tagIds = { react: react.id, node: node.id, sql: sql.id };
    tagSlugs = { react: react.slug, node: node.slug, sql: sql.slug };
  });

  afterAll(async () => {
    await ctx.close();
  });

  describe('catalog', () => {
    it('lists the active categories and the tags, publicly', async () => {
      const categories = await ctx.http().get('/api/categories').expect(200);
      const ids = categories.body.map((item: { id: string }) => item.id);
      expect(ids).toContain(categoryId);
      expect(ids).not.toContain(inactiveCategoryId);

      const tags = await ctx.http().get('/api/tags').expect(200);
      expect(tags.body).toEqual(
        expect.arrayContaining([
          {
            id: tagIds.react,
            name: `react ${ctx.runId}`,
            slug: tagSlugs.react,
          },
        ]),
      );
    });
  });

  describe('POST /api/offers', () => {
    it('requires an employer', async () => {
      await ctx.http().post('/api/offers').send(base()).expect(401);
      await as(studentToken).post('/api/offers', base()).expect(403);
    });

    it('publishes an offer with its category and tags', async () => {
      const offer = await publish({
        ...base(),
        title: `  ${title('Frontend')}  `,
        requirements: 'React',
        modality: 'HYBRID',
        province: 'Mendoza',
        city: 'Godoy Cruz',
        salaryMin: 900000,
        salaryMax: 1200000.5,
        vacancies: 2,
        deadline: isoDate(30),
        tagIds: [tagIds.react, tagIds.node],
      });

      expect(offer).toMatchObject({
        title: title('Frontend'),
        status: 'OPEN',
        modality: 'HYBRID',
        province: 'Mendoza',
        salaryMin: 900000,
        salaryMax: 1200000.5,
        vacancies: 2,
        deadline: isoDate(30),
        isAcceptingApplications: true,
        removalReason: null,
        company: { id: companyId, name: 'publisher S.A.' },
        category: { id: categoryId, slug: categorySlug },
      });
      expect(offer.tags.map((tag: { id: string }) => tag.id).sort()).toEqual(
        [tagIds.react, tagIds.node].sort(),
      );
    });

    it('defaults to one vacancy and accepts a remote offer without location', async () => {
      const offer = await publish(base());

      expect(offer).toMatchObject({
        vacancies: 1,
        province: null,
        deadline: null,
        salaryMin: null,
        tags: [],
      });
    });

    it.each([
      [
        'an on-site offer without a province',
        (): OfferBody => ({ modality: 'ON_SITE' }),
        'OFFER_LOCATION_REQUIRED',
      ],
      [
        'a minimum salary above the maximum',
        (): OfferBody => ({ salaryMin: 2, salaryMax: 1 }),
        'SALARY_RANGE_INVALID',
      ],
      [
        'an inactive category',
        (): OfferBody => ({ categoryId: inactiveCategoryId }),
        'CATEGORY_NOT_AVAILABLE',
      ],
      [
        'an unknown tag',
        (): OfferBody => ({
          tagIds: ['00000000-0000-4000-8000-000000000000'],
        }),
        'TAG_NOT_FOUND',
      ],
    ])('rejects %s', async (_case, override, code) => {
      const response = await as(employerToken)
        .post('/api/offers', { ...base(), ...override() })
        .expect(400);
      expect(response.body.code).toBe(code);
    });

    it('rejects invalid fields with translated messages', async () => {
      const response = await as(employerToken)
        .post('/api/offers', {
          ...base(),
          title: '',
          type: 'VOLUNTEERING',
          deadline: isoDate(-1),
          salaryMin: 10.555,
          vacancies: 0,
          tagIds: [tagIds.react, tagIds.react],
          status: 'CLOSED',
        })
        .set('Accept-Language', 'es')
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'title es obligatorio',
          'type tiene un valor no permitido',
          'deadline no puede ser anterior a hoy',
          'salaryMin debe ser un número',
          'vacancies debe ser como mínimo 1',
          'tagIds no puede tener valores repetidos',
          'status no es un campo permitido',
        ]),
      );
    });
  });

  describe('PATCH /api/offers/:id and POST /api/offers/:id/close', () => {
    let offerId: string;

    beforeAll(async () => {
      offerId = (
        await publish({
          ...base(),
          title: title('Editable'),
          salaryMin: 100,
          salaryMax: 200,
          tagIds: [tagIds.react],
        })
      ).id;
    });

    it('changes only the fields sent, and replaces the tags', async () => {
      const response = await as(employerToken)
        .patch(`/api/offers/${offerId}`, {
          title: title('Edited'),
          salaryMax: null,
          categoryId: otherCategoryId,
          tagIds: [tagIds.sql],
        })
        .expect(200);

      expect(response.body).toMatchObject({
        title: title('Edited'),
        salaryMin: 100,
        salaryMax: null,
        modality: 'REMOTE',
        category: { id: otherCategoryId },
        tags: [{ id: tagIds.sql }],
      });
    });

    it('checks multi-field rules against the stored offer', async () => {
      const location = await as(employerToken)
        .patch(`/api/offers/${offerId}`, { modality: 'ON_SITE' })
        .expect(400);
      expect(location.body.code).toBe('OFFER_LOCATION_REQUIRED');

      await as(employerToken)
        .patch(`/api/offers/${offerId}`, { salaryMax: 150 })
        .expect(200);
      const salary = await as(employerToken)
        .patch(`/api/offers/${offerId}`, { salaryMin: 151 })
        .expect(400);
      expect(salary.body.code).toBe('SALARY_RANGE_INVALID');
    });

    it('rejects nulling a required field', async () => {
      await as(employerToken)
        .patch(`/api/offers/${offerId}`, { title: null })
        .expect(400);
    });

    it('only lets the company that published it change it', async () => {
      await as(otherEmployerToken)
        .patch(`/api/offers/${offerId}`, { title: 'Hijacked' })
        .expect(403);
      await as(otherEmployerToken)
        .post(`/api/offers/${offerId}/close`)
        .expect(403);
      await as(employerToken)
        .patch('/api/offers/00000000-0000-4000-8000-000000000000', {
          title: 'x',
        })
        .expect(404);
    });

    it('closes the offer, which can then no longer be changed', async () => {
      const closed = await as(employerToken)
        .post(`/api/offers/${offerId}/close`)
        .expect(200);
      expect(closed.body).toMatchObject({
        status: 'CLOSED',
        isAcceptingApplications: false,
      });
      expect(closed.body.closedAt).toEqual(expect.any(String));

      const edit = await as(employerToken)
        .patch(`/api/offers/${offerId}`, { title: 'Too late' })
        .expect(409);
      expect(edit.body.code).toBe('OFFER_NOT_OPEN');
      await as(employerToken).post(`/api/offers/${offerId}/close`).expect(409);
    });
  });

  describe('GET /api/offers (public search)', () => {
    const ids: Record<string, string> = {};
    // A marker of its own, so the offers published by the tests above (whose
    // titles contain `marker`) do not show up in these results.
    let searchMarker: string;
    const search = (params: string) => {
      const query = new URLSearchParams({ q: searchMarker, limit: '50' });
      for (const [key, value] of new URLSearchParams(params)) {
        if (key === 'tags') {
          query.append(key, value);
        } else {
          query.set(key, value);
        }
      }
      return ctx.http().get(`/api/offers?${query}`).expect(200);
    };
    const titlesOf = (response: { body: { items: Summary[] } }) =>
      response.body.items.map((offer) => offer.title.split(' ')[0]).sort();

    beforeAll(async () => {
      searchMarker = `zx${ctx.runId}`;
      const create = async (
        name: string,
        body: OfferBody,
        token = employerToken,
      ) => {
        ids[name] = (
          await publish(
            { ...base(), ...body, title: `${name} ${searchMarker}` },
            token,
          )
        ).id;
      };
      await create('Alpha', {
        tagIds: [tagIds.react],
        deadline: isoDate(5),
        description: 'Trabajo con REACT',
      });
      await create('Bravo', {
        type: 'JOB',
        modality: 'ON_SITE',
        workload: 'FULL_TIME',
        province: 'Mendoza',
        categoryId: otherCategoryId,
        tagIds: [tagIds.node, tagIds.sql],
        deadline: isoDate(20),
      });
      await create('Charlie', { modality: 'HYBRID', province: 'Córdoba' });
      // Never listed: closed, removed, expired, and from a deactivated company.
      await create('Closed', {});
      await as(employerToken).post(`/api/offers/${ids.Closed}/close`);
      await create('Removed', {});
      await ctx.prisma.jobOffer.update({
        where: { id: ids.Removed },
        data: { status: 'REMOVED', removalReason: 'Spam' },
      });
      await create('Expired', {});
      await ctx.prisma.jobOffer.update({
        where: { id: ids.Expired },
        data: { deadline: new Date(isoDate(-1)) },
      });
      const banned = await ctx.createVerifiedEmployer('banned', '43');
      await create('Banned', {}, await ctx.login(banned.email));
      await ctx.prisma.user.update({
        where: { id: banned.id },
        data: { isActive: false },
      });
    });

    it('is public and lists only offers that accept applications', async () => {
      const response = await search('');

      expect(titlesOf(response)).toEqual(['Alpha', 'Bravo', 'Charlie']);
      expect(response.body).toMatchObject({
        total: 3,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
      // A summary has no description; the detail does.
      expect(response.body.items[0]).not.toHaveProperty('description');
    });

    it('searches the title and the description, ignoring case', async () => {
      const byTitle = await search(`q=ALPHA ${searchMarker.toUpperCase()}`);
      expect(titlesOf(byTitle)).toEqual(['Alpha']);

      // Alpha's description is "Trabajo con REACT".
      const byDescription = await ctx
        .http()
        .get('/api/offers?q=trabajo con react&limit=50')
        .expect(200);
      const found = byDescription.body.items.map((offer: Summary) => offer.id);
      expect(found).toContain(ids.Alpha);
      expect(found).not.toContain(ids.Bravo);
    });

    it.each([
      ['type=JOB', ['Bravo']],
      ['modality=HYBRID', ['Charlie']],
      ['workload=FULL_TIME', ['Bravo']],
      ['province=Mendoza', ['Bravo']],
      ['modality=REMOTE&workload=PART_TIME', ['Alpha']],
    ])('filters by %s', async (params, expected) => {
      expect(titlesOf(await search(params))).toEqual(expected);
    });

    it('filters by category slug and by tags (any of them)', async () => {
      expect(titlesOf(await search(`category=${categorySlug}`))).toEqual([
        'Alpha',
        'Charlie',
      ]);
      expect(
        titlesOf(await search(`tags=${tagSlugs.react}&tags=${tagSlugs.sql}`)),
      ).toEqual(['Alpha', 'Bravo']);
      expect(
        titlesOf(await search(`tags=${tagSlugs.node},${tagSlugs.sql}`)),
      ).toEqual(['Bravo']);
    });

    it('paginates and sorts', async () => {
      const newest = await search('limit=2&page=1');
      expect(newest.body).toMatchObject({ total: 3, limit: 2, totalPages: 2 });
      // Most recently published first.
      expect(newest.body.items.map((offer: Summary) => offer.id)).toEqual([
        ids.Charlie,
        ids.Bravo,
      ]);
      const second = await search('limit=2&page=2');
      expect(second.body.items.map((offer: Summary) => offer.id)).toEqual([
        ids.Alpha,
      ]);

      // Closing soonest first; offers without a deadline last.
      const byDeadline = await search('sort=deadline');
      expect(byDeadline.body.items.map((offer: Summary) => offer.id)).toEqual([
        ids.Alpha,
        ids.Bravo,
        ids.Charlie,
      ]);
    });

    it('rejects invalid filters', async () => {
      await ctx.http().get('/api/offers?type=VOLUNTEERING').expect(400);
      await ctx.http().get('/api/offers?limit=500').expect(400);
      await ctx.http().get('/api/offers?province=Atlantis').expect(400);
      await ctx.http().get('/api/offers?color=blue').expect(400);
    });

    describe('GET /api/offers/:id', () => {
      it('shows an open offer to anyone, with its company', async () => {
        const response = await ctx
          .http()
          .get(`/api/offers/${ids.Bravo}`)
          .expect(200);

        expect(response.body).toMatchObject({
          title: `Bravo ${searchMarker}`,
          description: 'Descripción de la oferta',
          isAcceptingApplications: true,
          company: { id: companyId, name: 'publisher S.A.' },
        });
      });

      it('shows closed and expired offers, marked as not accepting applications', async () => {
        for (const name of ['Closed', 'Expired']) {
          const response = await ctx
            .http()
            .get(`/api/offers/${ids[name]}`)
            .expect(200);
          expect(response.body.isAcceptingApplications).toBe(false);
        }
      });

      it('hides a removed offer except from its company and administrators', async () => {
        await ctx.http().get(`/api/offers/${ids.Removed}`).expect(404);
        await as(otherEmployerToken)
          .get(`/api/offers/${ids.Removed}`)
          .expect(404);

        const owner = await as(employerToken)
          .get(`/api/offers/${ids.Removed}`)
          .expect(200);
        expect(owner.body).toMatchObject({
          status: 'REMOVED',
          removalReason: 'Spam',
        });
        await as(adminToken).get(`/api/offers/${ids.Removed}`).expect(200);
      });

      it('accepts any id PostgreSQL accepts, like the fixed ids of the seed', async () => {
        // Not an RFC 9562 UUID (version and variant digits are 0).
        await ctx
          .http()
          .get('/api/offers/50000000-0000-0000-0000-0000000000ff')
          .expect(404);
        await ctx.http().get('/api/offers/not-an-id').expect(400);

        const response = await as(employerToken)
          .post('/api/offers', {
            ...base(),
            tagIds: ['20000000-0000-0000-0000-0000000000ff'],
          })
          .expect(400);
        expect(response.body.code).toBe('TAG_NOT_FOUND');
      });

      it('hides the offers of a deactivated company', async () => {
        await ctx.http().get(`/api/offers/${ids.Banned}`).expect(404);
      });

      it('treats an invalid token on this public route as anonymous', async () => {
        await ctx
          .http()
          .get(`/api/offers/${ids.Bravo}`)
          .set('Authorization', 'Bearer not-a-jwt')
          .expect(200);
        await ctx
          .http()
          .get(`/api/offers/${ids.Removed}`)
          .set('Authorization', 'Bearer not-a-jwt')
          .expect(404);
      });
    });

    describe('GET /api/offers/mine', () => {
      beforeAll(async () => {
        // Applications to Alpha: two count as applicants, one is pending.
        const statuses = ['PENDING', 'ACCEPTED', 'WITHDRAWN'] as const;
        for (const [index, status] of statuses.entries()) {
          const student = await ctx.createVerifiedStudent(`applicant${index}`);
          await ctx.prisma.application.create({
            data: {
              offerId: ids.Alpha,
              studentId: student.studentProfile!.id,
              status,
            },
          });
        }
      });

      it("lists the employer's offers in every status, with applicant counts", async () => {
        const response = await as(employerToken)
          .get('/api/offers/mine')
          .expect(200);
        const mine = response.body.filter((offer: Summary) =>
          offer.title.endsWith(searchMarker),
        );
        const byName = Object.fromEntries(
          mine.map((offer: Summary) => [offer.title.split(' ')[0], offer]),
        );

        expect(Object.keys(byName)).toEqual(
          expect.arrayContaining(['Alpha', 'Closed', 'Removed', 'Expired']),
        );
        expect(byName.Banned).toBeUndefined();
        expect(byName.Alpha).toMatchObject({
          applicationsCount: 2,
          pendingApplicationsCount: 1,
        });
        expect(byName.Removed).toMatchObject({
          status: 'REMOVED',
          removalReason: 'Spam',
          applicationsCount: 0,
        });
      });

      it('filters by status, and is only for employers', async () => {
        const closed = await as(employerToken)
          .get('/api/offers/mine?status=CLOSED')
          .expect(200);
        expect(
          closed.body.every(
            (offer: { status: string }) => offer.status === 'CLOSED',
          ),
        ).toBe(true);

        await as(studentToken).get('/api/offers/mine').expect(403);
      });
    });
  });
});
