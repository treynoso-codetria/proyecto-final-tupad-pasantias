import { ApiProperty } from '@nestjs/swagger';

export class EmailChangedResponseDto {
  @ApiProperty({ example: 'ana.nueva@alumnos.dev' })
  email: string;
}
