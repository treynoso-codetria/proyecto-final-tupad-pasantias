import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ErrorCode } from '../../common/errors/error-code.js';
import { EnvironmentVariables } from '../../config/env.validation.js';

export type EmailTokenPurpose = 'verify-email' | 'change-email';

export interface EmailTokenPayload {
  sub: string;
  purpose: EmailTokenPurpose;
  // The account's email when the link was created. A link stops working once
  // the account's email is different (e.g. after a completed email change).
  email: string;
  // Only for 'change-email': the address being confirmed.
  newEmail?: string;
}

const EXPIRES_IN: Record<EmailTokenPurpose, '24h' | '1h'> = {
  'verify-email': '24h',
  'change-email': '1h',
};

const FRONTEND_PATH: Record<EmailTokenPurpose, string> = {
  'verify-email': '/verify-email',
  'change-email': '/confirm-email-change',
};

// Creates and reads the links sent by email. Each link carries a signed,
// expiring token, so nothing has to be stored in the database. These tokens
// are signed with a key derived from JWT_SECRET that is different from the
// one used for access tokens: neither kind is accepted in place of the other.
@Injectable()
export class EmailLinkService {
  private readonly secret: string;
  private readonly frontendUrl: string;

  constructor(
    config: ConfigService<EnvironmentVariables, true>,
    private readonly jwtService: JwtService,
  ) {
    this.secret = `${config.get('JWT_SECRET', { infer: true })}:email-link`;
    this.frontendUrl = config
      .get('FRONTEND_URL', { infer: true })
      .replace(/\/+$/, '');
  }

  createVerifyEmailLink(user: { id: string; email: string }): Promise<string> {
    return this.createLink({
      sub: user.id,
      purpose: 'verify-email',
      email: user.email,
    });
  }

  createChangeEmailLink(
    user: { id: string; email: string },
    newEmail: string,
  ): Promise<string> {
    return this.createLink({
      sub: user.id,
      purpose: 'change-email',
      email: user.email,
      newEmail,
    });
  }

  async readToken(
    token: string,
    purpose: EmailTokenPurpose,
  ): Promise<EmailTokenPayload> {
    let payload: EmailTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<EmailTokenPayload>(token, {
        secret: this.secret,
        algorithms: ['HS256'],
      });
    } catch {
      throw new BadRequestException(ErrorCode.INVALID_OR_EXPIRED_TOKEN);
    }
    if (payload.purpose !== purpose) {
      throw new BadRequestException(ErrorCode.INVALID_OR_EXPIRED_TOKEN);
    }
    return payload;
  }

  private async createLink(payload: EmailTokenPayload): Promise<string> {
    const token = await this.jwtService.signAsync(payload, {
      secret: this.secret,
      algorithm: 'HS256',
      expiresIn: EXPIRES_IN[payload.purpose],
    });
    const path = FRONTEND_PATH[payload.purpose];
    return `${this.frontendUrl}${path}?token=${encodeURIComponent(token)}`;
  }
}
