import { Transform } from 'class-transformer';

// Emails are stored and compared trimmed and in lowercase.
export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
