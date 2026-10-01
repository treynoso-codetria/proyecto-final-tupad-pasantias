import { BadRequestException, ValidationError } from '@nestjs/common';
import { ErrorCode } from './error-code.js';

// Thrown by the global ValidationPipe. It keeps the raw class-validator errors
// so that HttpExceptionFilter can translate them to the request language.
export class ValidationException extends BadRequestException {
  constructor(readonly errors: ValidationError[]) {
    super(ErrorCode.VALIDATION_FAILED);
  }
}
