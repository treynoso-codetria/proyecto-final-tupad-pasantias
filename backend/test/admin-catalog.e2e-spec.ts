import { createTestApp } from './support/test-app.js';

describe('Admin catalog (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;
  let adminToken: string;
  let employerToken: string;
  // Names end with the run id, so their slugs end with `-<runId>` and the
  // test app deletes them when closing.
  let suffix: string;

  const as = (token: string) => ({
    get: (path: string) =>
      ctx.http().get(path).set('Authorization', `Bearer ${token}`),
    post: (path: string, body: object) =>
      ctx.http().post(path).set('Authorization', `Bearer ${token}`).send(body),
    patch: (path: string, body: object) =>
      ctx.http().patch(path).set('Authorization', `Bearer ${token}`).send(body),
    delete: (path: string) =>
      ctx.http().delete(path).set('Authorization', `Bearer ${token}`),
  });

  beforeAll(async () => {
    ctx = await createTestApp();
    suffix = ctx.runId;
    adminToken = await ctx.login(
      (await ctx.createAdmin('catalog-admin')).email,
    );
    employerToken = await ctx.login(
      (await ctx.createVerifiedEmployer('catalog-employer', '51')).email,
    );
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('is reserved to administrators', async () => {
    await ctx.http().get('/api/admin/categories').expect(401);
    await as(employerToken).get('/api/admin/categories').expect(403);
    await as(employerToken)
      .post('/api/admin/tags', { name: `Hack ${suffix}` })
      .expect(403);
  });

  describe('categories', () => {
    let categoryId: string;

    it('creates a category with a slug derived from its name', async () => {
      const response = await as(adminToken)
        .post('/api/admin/categories', { name: `  Diseño Gráfico ${suffix} ` })
        .expect(201);

      categoryId = response.body.id;
      expect(response.body).toMatchObject({
        name: `Diseño Gráfico ${suffix}`,
        slug: `diseno-grafico-${suffix}`,
        isActive: true,
        offersCount: 0,
      });

      const publicList = await ctx.http().get('/api/categories').expect(200);
      expect(publicList.body.map((item: { id: string }) => item.id)).toContain(
        categoryId,
      );
    });

    it('rejects a name equivalent to an existing one, and a name without letters', async () => {
      const duplicate = await as(adminToken)
        .post('/api/admin/categories', { name: `DISEÑO grafico ${suffix}` })
        .expect(409);
      expect(duplicate.body.code).toBe('CATEGORY_NAME_TAKEN');

      const symbols = await as(adminToken)
        .post('/api/admin/categories', { name: '¿¡!?' })
        .expect(400);
      expect(symbols.body.code).toBe('CATALOG_NAME_INVALID');

      await as(adminToken)
        .post('/api/admin/categories', { name: '' })
        .expect(400);
    });

    it('renames a category, which also changes its slug', async () => {
      const response = await as(adminToken)
        .patch(`/api/admin/categories/${categoryId}`, {
          name: `Diseño ${suffix}`,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        name: `Diseño ${suffix}`,
        slug: `diseno-${suffix}`,
      });
    });

    it('deactivates a category: hidden from the public list and from new offers, kept by existing ones', async () => {
      const offer = await as(employerToken)
        .post('/api/offers', {
          title: `Offer ${suffix}`,
          description: 'Descripción',
          type: 'JOB',
          modality: 'REMOTE',
          workload: 'FULL_TIME',
          categoryId,
        })
        .expect(201);

      const deactivated = await as(adminToken)
        .patch(`/api/admin/categories/${categoryId}`, { isActive: false })
        .expect(200);
      expect(deactivated.body).toMatchObject({
        isActive: false,
        offersCount: 1,
      });

      const publicList = await ctx.http().get('/api/categories').expect(200);
      expect(
        publicList.body.map((item: { id: string }) => item.id),
      ).not.toContain(categoryId);

      const newOffer = await as(employerToken)
        .post('/api/offers', {
          title: `Another ${suffix}`,
          description: 'Descripción',
          type: 'JOB',
          modality: 'REMOTE',
          workload: 'FULL_TIME',
          categoryId,
        })
        .expect(400);
      expect(newOffer.body.code).toBe('CATEGORY_NOT_AVAILABLE');

      const existing = await ctx
        .http()
        .get(`/api/offers/${offer.body.id}`)
        .expect(200);
      expect(existing.body.category.id).toBe(categoryId);

      // The admin list still has it, inactive.
      const adminList = await as(adminToken)
        .get('/api/admin/categories')
        .expect(200);
      expect(
        adminList.body.find((item: { id: string }) => item.id === categoryId),
      ).toMatchObject({ isActive: false });

      await as(adminToken)
        .patch(`/api/admin/categories/${categoryId}`, { isActive: true })
        .expect(200);
    });

    it('rejects nulling the name, and unknown ids', async () => {
      await as(adminToken)
        .patch(`/api/admin/categories/${categoryId}`, { name: null })
        .expect(400);
      await as(adminToken)
        .patch('/api/admin/categories/00000000-0000-4000-8000-000000000000', {
          isActive: false,
        })
        .expect(404);
    });
  });

  describe('tags', () => {
    let tagId: string;
    let offerId: string;

    it('creates tags whose names differ only in symbols', async () => {
      const cpp = await as(adminToken)
        .post('/api/admin/tags', { name: `C++ ${suffix}` })
        .expect(201);
      const csharp = await as(adminToken)
        .post('/api/admin/tags', { name: `C# ${suffix}` })
        .expect(201);

      expect(cpp.body.slug).toBe(`c-plus-plus-${suffix}`);
      expect(csharp.body.slug).toBe(`c-sharp-${suffix}`);
      tagId = cpp.body.id;

      const duplicate = await as(adminToken)
        .post('/api/admin/tags', { name: `c++ ${suffix}` })
        .expect(409);
      expect(duplicate.body.code).toBe('TAG_NAME_TAKEN');
    });

    it('renames a tag', async () => {
      const response = await as(adminToken)
        .patch(`/api/admin/tags/${tagId}`, { name: `Cpp ${suffix}` })
        .expect(200);

      expect(response.body).toMatchObject({
        name: `Cpp ${suffix}`,
        slug: `cpp-${suffix}`,
      });
    });

    it('counts the offers that use a tag, and deleting it removes it from them', async () => {
      const category = await ctx.createCategory('tagged');
      const offer = await as(employerToken)
        .post('/api/offers', {
          title: `Tagged ${suffix}`,
          description: 'Descripción',
          type: 'JOB',
          modality: 'REMOTE',
          workload: 'FULL_TIME',
          categoryId: category.id,
          tagIds: [tagId],
        })
        .expect(201);
      offerId = offer.body.id;

      const list = await as(adminToken).get('/api/admin/tags').expect(200);
      expect(
        list.body.find((item: { id: string }) => item.id === tagId),
      ).toMatchObject({ offersCount: 1 });

      await as(adminToken).delete(`/api/admin/tags/${tagId}`).expect(204);
      await as(adminToken).delete(`/api/admin/tags/${tagId}`).expect(404);

      const afterDelete = await ctx
        .http()
        .get(`/api/offers/${offerId}`)
        .expect(200);
      expect(afterDelete.body.tags).toEqual([]);
    });
  });
});
