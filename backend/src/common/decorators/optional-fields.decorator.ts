import { Transform } from 'class-transformer';
import { ValidateIf } from 'class-validator';

// For PATCH bodies. A field of the database that cannot be null may be
// omitted (it is left unchanged) but, unlike with @IsOptional(), `null` is
// validated and therefore rejected.
export const IfDefined = () =>
  ValidateIf((_object, value: unknown) => value !== undefined);

// For nullable text fields, combined with @IsOptional(): trims the value and
// turns an empty string into null, so clearing a field in a form stores NULL
// instead of ''.
export const EmptyToNull = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });

// Phone numbers are free-form (country and area codes vary), limited to the
// characters a phone number can have.
export const PHONE_PATTERN = /^[0-9+()\-\s]{6,30}$/;
