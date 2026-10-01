import { ApiProperty } from '@nestjs/swagger';
import { ErrorCode } from '../errors/error-code.js';

// Body of every error response. See HttpExceptionFilter.
export class ErrorResponseDto {
  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty({
    enum: Object.values(ErrorCode),
    enumName: 'ErrorCode',
    description: 'Stable identifier of the error; does not depend on language',
  })
  code: ErrorCode;

  @ApiProperty({
    description:
      'Message in the language of the Accept-Language header (en or es). ' +
      'A list with one entry per invalid field when code is VALIDATION_FAILED.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Email is already registered',
  })
  message: string | string[];
}
