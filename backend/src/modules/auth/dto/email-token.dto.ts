import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

// Body of the endpoints that complete an action started by an emailed link.
export class EmailTokenDto {
  @ApiProperty({ description: 'The `token` query parameter of the link' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
