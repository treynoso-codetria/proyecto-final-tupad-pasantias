import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createTestApp } from './support/test-app.js';

// Minimal files of each kind: only their first bytes matter to the API.
const PDF = Buffer.from('%PDF-1.7\n% test CV\n%%EOF\n');
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('test logo'),
]);
const JPG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.from('test'),
]);
const MB = 1024 * 1024;

// Path and query of a link, to request it from the test server.
const pathOf = (url: string) => {
  const { pathname, search } = new URL(url);
  return pathname + search;
};

describe('Files (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;
  let studentToken: string;
  let studentProfileId: string;
  let employerToken: string;
  let companyId: string;
  let categoryId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    const student = await ctx.createVerifiedStudent('files-student');
    studentProfileId = student.studentProfile!.id;
    studentToken = await ctx.login(student.email);
    const employer = await ctx.createVerifiedEmployer('files-employer', '40');
    companyId = employer.company!.id;
    employerToken = await ctx.login(employer.email);
    categoryId = (await ctx.createCategory('files')).id;
  });

  afterAll(async () => {
    await ctx.close();
  });

  const upload = (
    path: string,
    token: string,
    file: Buffer,
    filename: string,
  ) =>
    ctx
      .http()
      .put(path)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', file, filename);

  // The storage key behind a link: "<folder>/<owner>/<uuid>.<kind>".
  const keyOf = (url: string) => new URL(url).searchParams.get('key') as string;
  const stored = (key: string) => existsSync(join(ctx.storageDir, key));

  async function openOffer(title: string): Promise<string> {
    const response = await ctx
      .http()
      .post('/api/offers')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        title,
        description: 'An offer to test the CVs of the applicants.',
        type: 'INTERNSHIP',
        modality: 'REMOTE',
        workload: 'PART_TIME',
        categoryId,
      })
      .expect(201);
    return response.body.id;
  }

  describe('CV', () => {
    it('uploads a PDF and returns a temporary link to it, with its original name', async () => {
      const response = await upload(
        '/api/students/me/cv',
        studentToken,
        PDF,
        'Currículum Pérez.pdf',
      ).expect(200);

      expect(response.body.cvFileName).toBe('Currículum Pérez.pdf');
      expect(response.body.cvUrl).toMatch(
        /^http:\/\/localhost:3000\/api\/files\?/,
      );
      expect(keyOf(response.body.cvUrl)).toMatch(
        new RegExp(`^cvs/${studentProfileId}/[0-9a-f-]{36}\\.pdf$`),
      );

      const file = await ctx
        .http()
        .get(pathOf(response.body.cvUrl))
        .expect(200);
      expect(file.headers['content-type']).toBe('application/pdf');
      expect(file.headers['content-disposition']).toContain(
        "filename*=UTF-8''Curr%C3%ADculum%20P%C3%A9rez.pdf",
      );
      expect(Buffer.from(file.body as Buffer).equals(PDF)).toBe(true);

      // The profile returns the same link.
      const profile = await ctx
        .http()
        .get('/api/students/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      expect(profile.body.cvUrl).toBe(response.body.cvUrl);
    });

    it('rejects a link whose signature or expiry was changed', async () => {
      const profile = await ctx
        .http()
        .get('/api/students/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      const url = new URL(profile.body.cvUrl);

      const tampered = new URL(url);
      tampered.searchParams.set('signature', 'x'.repeat(43));
      await ctx.http().get(pathOf(tampered.href)).expect(404);

      const extended = new URL(url);
      extended.searchParams.set(
        'expires',
        String(Number(url.searchParams.get('expires')) + 3600),
      );
      await ctx.http().get(pathOf(extended.href)).expect(404);

      const otherFile = new URL(url);
      otherFile.searchParams.set('key', '../../etc/passwd');
      await ctx.http().get(pathOf(otherFile.href)).expect(404);
    });

    it('decides the type by the content of the file, not by its name', async () => {
      const notAPdf = await upload(
        '/api/students/me/cv',
        studentToken,
        Buffer.from('just text'),
        'cv.pdf',
      ).expect(415);
      expect(notAPdf.body.code).toBe('FILE_TYPE_NOT_ALLOWED');

      await upload('/api/students/me/cv', studentToken, PNG, 'cv.png').expect(
        415,
      );
    });

    it('rejects a missing file and a file larger than 5 MB', async () => {
      const missing = await ctx
        .http()
        .put('/api/students/me/cv')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);
      expect(missing.body.code).toBe('FILE_REQUIRED');

      const big = Buffer.concat([PDF, Buffer.alloc(5 * MB)]);
      const tooLarge = await upload(
        '/api/students/me/cv',
        studentToken,
        big,
        'cv.pdf',
      )
        .set('Accept-Language', 'es')
        .expect(413);
      expect(tooLarge.body).toMatchObject({
        code: 'FILE_TOO_LARGE',
        message: 'El archivo es demasiado grande',
      });
    });

    it('is only for students', async () => {
      await upload('/api/students/me/cv', employerToken, PDF, 'cv.pdf').expect(
        403,
      );
      await ctx.http().put('/api/students/me/cv').expect(401);
    });

    it('deletes the replaced CV, unless an application still uses it', async () => {
      // A CV nobody applied with is deleted when replaced.
      const first = await upload(
        '/api/students/me/cv',
        studentToken,
        PDF,
        'first.pdf',
      ).expect(200);
      const firstKey = keyOf(first.body.cvUrl);
      const second = await upload(
        '/api/students/me/cv',
        studentToken,
        PDF,
        'second.pdf',
      ).expect(200);
      const secondKey = keyOf(second.body.cvUrl);
      expect(stored(firstKey)).toBe(false);
      expect(stored(secondKey)).toBe(true);

      // The student applies with the second CV, then replaces and deletes it.
      const offerId = await openOffer('CV offer');
      await ctx
        .http()
        .post(`/api/offers/${offerId}/applications`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({})
        .expect(201);
      await upload(
        '/api/students/me/cv',
        studentToken,
        PDF,
        'third.pdf',
      ).expect(200);
      const deleted = await ctx
        .http()
        .delete('/api/students/me/cv')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      expect(deleted.body).toMatchObject({ cvUrl: null, cvFileName: null });

      // The company still gets the CV the student applied with.
      expect(stored(secondKey)).toBe(true);
      const applicants = await ctx
        .http()
        .get(`/api/offers/${offerId}/applications`)
        .set('Authorization', `Bearer ${employerToken}`)
        .expect(200);
      const cvUrl: string = applicants.body[0].cvUrl;
      expect(keyOf(cvUrl)).toBe(secondKey);
      const file = await ctx.http().get(pathOf(cvUrl)).expect(200);
      expect(file.headers['content-disposition']).toContain(
        'filename="CV files-student Test.pdf"',
      );
    });
  });

  describe('Logo', () => {
    it('uploads an image and returns a stable link that redirects to it', async () => {
      const response = await upload(
        '/api/companies/me/logo',
        employerToken,
        PNG,
        'logo.png',
      ).expect(200);

      // On the API's public URL (PUBLIC_API_URL), whatever it is here.
      const logoUrl: string = response.body.logoUrl;
      expect(pathOf(logoUrl)).toMatch(
        new RegExp(`^/api/companies/${companyId}/logo\\?v=[0-9a-f]{8}$`),
      );

      // Public: no session needed.
      const redirect = await ctx.http().get(pathOf(logoUrl)).expect(302);
      expect(redirect.headers['cache-control']).toBe('public, max-age=600');
      const image = await ctx
        .http()
        .get(pathOf(redirect.headers.location as string))
        .expect(200);
      expect(image.headers['content-type']).toBe('image/png');

      // The public page of the company and its offers show the same link.
      const page = await ctx
        .http()
        .get(`/api/companies/${companyId}`)
        .expect(200);
      expect(page.body.logoUrl).toBe(logoUrl);
      const offerId = await openOffer('Logo offer');
      const offer = await ctx.http().get(`/api/offers/${offerId}`).expect(200);
      expect(offer.body.company.logoUrl).toBe(logoUrl);
    });

    it('replaces the logo, deleting the previous file and changing the link', async () => {
      const before = await ctx
        .http()
        .get('/api/companies/me')
        .set('Authorization', `Bearer ${employerToken}`)
        .expect(200);
      const redirect = await ctx
        .http()
        .get(pathOf(before.body.logoUrl))
        .expect(302);
      const previousKey = keyOf(redirect.headers.location as string);

      const after = await upload(
        '/api/companies/me/logo',
        employerToken,
        JPG,
        'logo.jpg',
      ).expect(200);

      expect(after.body.logoUrl).not.toBe(before.body.logoUrl);
      expect(stored(previousKey)).toBe(false);
    });

    it('rejects a PDF and an image larger than 2 MB', async () => {
      const pdf = await upload(
        '/api/companies/me/logo',
        employerToken,
        PDF,
        'logo.png',
      ).expect(415);
      expect(pdf.body.code).toBe('FILE_TYPE_NOT_ALLOWED');

      const big = Buffer.concat([PNG, Buffer.alloc(2 * MB)]);
      const tooLarge = await upload(
        '/api/companies/me/logo',
        employerToken,
        big,
        'logo.png',
      ).expect(413);
      expect(tooLarge.body.code).toBe('FILE_TOO_LARGE');
    });

    it('is only for employers', async () => {
      await upload(
        '/api/companies/me/logo',
        studentToken,
        PNG,
        'logo.png',
      ).expect(403);
    });

    it('deletes the logo', async () => {
      const response = await ctx
        .http()
        .delete('/api/companies/me/logo')
        .set('Authorization', `Bearer ${employerToken}`)
        .expect(200);

      expect(response.body.logoUrl).toBeNull();
      await ctx.http().get(`/api/companies/${companyId}/logo`).expect(404);
    });
  });
});
