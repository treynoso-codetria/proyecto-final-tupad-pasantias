import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  ValidationError,
} from '@nestjs/common';
import { getMetadataStorage } from 'class-validator';
import type { Response } from 'express';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { ErrorCode, isErrorCode } from '../errors/error-code.js';
import { ValidationException } from '../errors/validation.exception.js';

const STATUS_CODES: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
};

// Gives every error response the same shape, { statusCode, code, message },
// with `message` translated to the language of the request (Accept-Language
// header, English by default). Translations live in src/i18n/<lang>/*.json.
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly i18n: I18nService) {}

  catch(exception: HttpException, host: ArgumentsHost): void {
    const lang = I18nContext.current(host)?.lang;
    const statusCode = exception.getStatus();

    let code: ErrorCode;
    let message: string | string[];
    if (exception instanceof ValidationException) {
      code = ErrorCode.VALIDATION_FAILED;
      message = this.translateValidationErrors(exception.errors, lang);
    } else {
      // Services throw exceptions whose message is an ErrorCode. Exceptions
      // raised by the framework (guards, unknown routes) get a generic code.
      code = isErrorCode(exception.message)
        ? exception.message
        : (STATUS_CODES[statusCode] ?? ErrorCode.HTTP_ERROR);
      message = this.translate(`errors.${code}`, exception.message, lang);
    }

    host
      .switchToHttp()
      .getResponse<Response>()
      .status(statusCode)
      .json({ statusCode, code, message });
  }

  private translateValidationErrors(
    errors: ValidationError[],
    lang: string | undefined,
    parentPath = '',
  ): string[] {
    return errors.flatMap((error) => {
      const property = parentPath + error.property;
      const messages = Object.entries(error.constraints ?? {}).map(
        ([constraint, defaultMessage]) => {
          // A decorator can pick its own message with
          // `{ context: { i18nKey: 'cuitFormat' } }`; otherwise the key is
          // the name of the constraint (isEmail, minLength, ...).
          const key: string =
            error.contexts?.[constraint]?.i18nKey ?? constraint;
          return this.translate(`validation.${key}`, defaultMessage, lang, {
            property,
            constraints: findConstraintArgs(error, constraint),
          });
        },
      );
      const childMessages = this.translateValidationErrors(
        error.children ?? [],
        lang,
        `${property}.`,
      );
      return [...messages, ...childMessages];
    });
  }

  // Falls back to the original (English) text when a key has no translation.
  private translate(
    key: string,
    fallback: string,
    lang: string | undefined,
    args?: Record<string, unknown>,
  ): string {
    const translated: string = this.i18n.translate(key, { lang, args });
    return translated === key ? fallback : translated;
  }
}

// Arguments the decorator was declared with, e.g. [8] for @MinLength(8), so
// that translations can use them as {constraints.0}. A ValidationError only
// carries the already-formatted English message, hence the metadata lookup.
function findConstraintArgs(
  error: ValidationError,
  constraint: string,
): unknown[] {
  if (!error.target) {
    return [];
  }
  const metadata = getMetadataStorage()
    .getTargetValidationMetadatas(error.target.constructor, '', false, false)
    .find(
      (item) =>
        item.propertyName === error.property &&
        (item.name ?? item.type) === constraint,
    );
  return metadata?.constraints ?? [];
}
