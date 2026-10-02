import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { MailService } from './mail.service.js';

describe('MailService', () => {
  const i18n = {
    translate: (key: string, { args }: { args?: Record<string, string> }) =>
      args?.newEmail ? `${key} ${args.newEmail}` : key,
  } as unknown as I18nService;
  const fetchMock = vi.fn();

  const createService = (env: Record<string, string | undefined>) =>
    new MailService(
      { get: (key: string) => env[key] } as unknown as ConfigService as never,
      i18n,
    );
  const configured = {
    BREVO_API_KEY: 'test-key',
    MAIL_FROM_EMAIL: 'sender@example.com',
    MAIL_FROM_NAME: 'Internship Portal',
  };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the email through the Brevo API', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const link = 'https://portal.example/verify-email?token=abc';

    const sent = await createService(configured).sendVerificationEmail(
      'ana@alumnos.dev',
      link,
    );

    expect(sent).toBe(true);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(request.headers['api-key']).toBe('test-key');
    const body = JSON.parse(request.body);
    expect(body.sender).toEqual({
      name: 'Internship Portal',
      email: 'sender@example.com',
    });
    expect(body.to).toEqual([{ email: 'ana@alumnos.dev' }]);
    expect(body.subject).toBe('mail.verifyEmail.subject');
    expect(body.htmlContent).toContain(`href="${link}"`);
    expect(body.textContent).toContain(link);
  });

  it('escapes interpolated values in the HTML body', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    await createService(configured).sendEmailChangeNotice(
      'ana@alumnos.dev',
      '<b>x</b>@alumnos.dev',
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.htmlContent).toContain('&lt;b&gt;x&lt;/b&gt;@alumnos.dev');
    expect(body.htmlContent).not.toContain('<b>x</b>');
  });

  it('reports a failure instead of throwing when Brevo rejects the email', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('unauthorized'),
    });
    expect(
      await createService(configured).sendPasswordChangedNotice('a@b.dev'),
    ).toBe(false);

    fetchMock.mockRejectedValue(new Error('network down'));
    expect(
      await createService(configured).sendPasswordChangedNotice('a@b.dev'),
    ).toBe(false);
  });

  it('logs the email instead of sending it when no API key is configured', async () => {
    const sent = await createService({
      MAIL_FROM_NAME: 'Internship Portal',
    }).sendVerificationEmail('ana@alumnos.dev', 'https://portal.example/x');

    expect(sent).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
