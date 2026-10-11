import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { OfferStatus } from '../../../generated/prisma/enums.js';

export class MyOffersQueryDto {
  @ApiPropertyOptional({
    enum: OfferStatus,
    enumName: 'OfferStatus',
    description: 'Only offers in this status; all of them when omitted',
  })
  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;
}
