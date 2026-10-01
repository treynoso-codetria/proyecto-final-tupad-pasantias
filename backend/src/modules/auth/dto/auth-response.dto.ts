import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/enums.js';

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'ana.gomez@alumnos.dev' })
  email: string;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role: UserRole;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT to send as `Authorization: Bearer <token>`',
  })
  accessToken: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
