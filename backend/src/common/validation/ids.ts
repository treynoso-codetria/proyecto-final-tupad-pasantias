import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { Matches, ValidationOptions } from 'class-validator';

// Syntax of the ids of every table: any value PostgreSQL accepts as a UUID.
// Stricter checks (ParseUUIDPipe, @IsUUID) require an RFC 9562 version and
// variant, and would reject valid rows such as the fixed ids of the seed
// (e.g. 10000000-0000-0000-0000-000000000001). Checking the syntax is still
// needed: a malformed id would make the database query fail.
export const ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// For route parameters: @Param('id', ParseIdPipe).
@Injectable()
export class ParseIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!ID_PATTERN.test(value)) {
      throw new BadRequestException();
    }
    return value;
  }
}

// For DTO fields, in place of @IsUUID(). Use { each: true } for arrays.
export const IsId = (options?: ValidationOptions) =>
  Matches(ID_PATTERN, { ...options, context: { i18nKey: 'isUuid' } });
