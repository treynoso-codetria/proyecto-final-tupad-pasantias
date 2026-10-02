import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({ example: 'ana.gomez@alumnos.dev' })
  email: string;

  @ApiProperty({
    description:
      'Whether the verification email could be sent. When false, the client ' +
      'should offer POST /auth/resend-verification.',
  })
  verificationEmailSent: boolean;
}
