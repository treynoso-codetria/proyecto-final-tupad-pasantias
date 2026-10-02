import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { EnvironmentVariables } from '../config/env.validation.js';
import {
  EmailContent,
  renderEmailHtml,
  renderEmailText,
} from './mail-template.js';

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';
const SEND_TIMEOUT_MS = 10_000;

type Template =
  | 'verifyEmail'
  | 'confirmEmailChange'
  | 'emailChangeNotice'
  | 'passwordChanged';

// Sends the account emails through Brevo's HTTPS API (the free Render plan
// blocks outbound SMTP). Texts are in src/i18n/<lang>/mail.json and follow
// the language of the request that triggers the email.
//
// Every method resolves to whether the email was handed over for delivery;
// failures are logged, never thrown, so each caller decides if a failed
// email is an error for the user or not.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey?: string;
  private readonly sender: { name: string; email?: string };

  constructor(
    config: ConfigService<EnvironmentVariables, true>,
    private readonly i18n: I18nService,
  ) {
    this.apiKey = config.get('BREVO_API_KEY', { infer: true });
    this.sender = {
      name: config.get('MAIL_FROM_NAME', { infer: true }),
      email: config.get('MAIL_FROM_EMAIL', { infer: true }),
    };
  }

  sendVerificationEmail(to: string, url: string): Promise<boolean> {
    return this.send(to, 'verifyEmail', { url });
  }

  sendEmailChangeConfirmation(to: string, url: string): Promise<boolean> {
    return this.send(to, 'confirmEmailChange', { url });
  }

  // Sent to the current address when a change to `newEmail` is requested.
  sendEmailChangeNotice(to: string, newEmail: string): Promise<boolean> {
    return this.send(to, 'emailChangeNotice', { args: { newEmail } });
  }

  sendPasswordChangedNotice(to: string): Promise<boolean> {
    return this.send(to, 'passwordChanged', {});
  }

  private async send(
    to: string,
    template: Template,
    { url, args }: { url?: string; args?: Record<string, string> },
  ): Promise<boolean> {
    const lang = I18nContext.current()?.lang;
    const t = (key: string): string =>
      this.i18n.translate(`mail.${key}`, { lang, args });

    const subject = t(`${template}.subject`);
    const content: EmailContent = {
      heading: t(`${template}.heading`),
      body: t(`${template}.body`),
      button: url ? { label: t(`${template}.button`), url } : undefined,
      linkFallback: t('linkFallback'),
      footer: t('footer'),
    };
    const text = renderEmailText(content);

    // Development without a Brevo account: the email (and its link) is
    // written to the server log so the flows can still be completed.
    if (!this.apiKey) {
      this.logger.warn(
        `BREVO_API_KEY is not set, email not sent.\nTo: ${to}\nSubject: ${subject}\n\n${text}`,
      );
      return true;
    }

    try {
      const response = await fetch(BREVO_SEND_URL, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: this.sender,
          to: [{ email: to }],
          subject,
          htmlContent: renderEmailHtml(content),
          textContent: text,
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(
          `Brevo responded ${response.status}: ${await response.text()}`,
        );
      }
      return true;
    } catch (error) {
      this.logger.error(
        `Could not send "${template}" email to ${to}: ${String(error)}`,
      );
      return false;
    }
  }
}
