import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailLinkService } from './email-link.service.js';

describe('EmailLinkService', () => {
  const secret = 'unit-test-secret-with-more-than-32-characters';
  const config = {
    get: (key: string) =>
      ({ JWT_SECRET: secret, FRONTEND_URL: 'https://portal.example/' })[key],
  } as unknown as ConfigService;
  const jwtService = new JwtService({ secret });
  const service = new EmailLinkService(config as never, jwtService);
  const user = { id: 'user-1', email: 'ana@alumnos.dev' };

  const tokenOf = (link: string) =>
    new URL(link).searchParams.get('token') as string;

  it('creates a frontend link whose token can be read back', async () => {
    const link = await service.createVerifyEmailLink(user);

    expect(link.startsWith('https://portal.example/verify-email?token=')).toBe(
      true,
    );
    expect(
      await service.readToken(tokenOf(link), 'verify-email'),
    ).toMatchObject({
      sub: 'user-1',
      purpose: 'verify-email',
      email: 'ana@alumnos.dev',
    });
  });

  it('carries the new address in an email-change link', async () => {
    const link = await service.createChangeEmailLink(user, 'new@alumnos.dev');

    expect(new URL(link).pathname).toBe('/confirm-email-change');
    expect(
      await service.readToken(tokenOf(link), 'change-email'),
    ).toMatchObject({ newEmail: 'new@alumnos.dev' });
  });

  it('rejects a token used for a different purpose', async () => {
    const link = await service.createVerifyEmailLink(user);

    await expect(
      service.readToken(tokenOf(link), 'change-email'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an access token, and is not readable as one', async () => {
    // Access tokens are signed with JWT_SECRET itself.
    const accessToken = await jwtService.signAsync({ sub: 'user-1' });
    await expect(
      service.readToken(accessToken, 'verify-email'),
    ).rejects.toThrow(BadRequestException);

    const emailToken = tokenOf(await service.createVerifyEmailLink(user));
    await expect(jwtService.verifyAsync(emailToken)).rejects.toThrow();
  });

  it('rejects a tampered or malformed token', async () => {
    await expect(
      service.readToken('not-a-token', 'verify-email'),
    ).rejects.toThrow(BadRequestException);
  });
});
