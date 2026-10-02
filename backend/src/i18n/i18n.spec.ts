import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ErrorCode } from '../common/errors/error-code.js';

const i18nDir = fileURLToPath(new URL('.', import.meta.url));

type Translations = { [key: string]: string | Translations };

const load = (lang: string, file: string): Translations =>
  JSON.parse(readFileSync(`${i18nDir}${lang}/${file}`, 'utf8'));

// Every leaf key as a dotted path, e.g. "verifyEmail.subject".
const keysOf = (translations: Translations, prefix = ''): string[] =>
  Object.entries(translations).flatMap(([key, value]) =>
    typeof value === 'string'
      ? [prefix + key]
      : keysOf(value, `${prefix}${key}.`),
  );

describe('translation files', () => {
  const files = readdirSync(`${i18nDir}en`);

  it.each(files)('%s has the same keys in English and Spanish', (file) => {
    expect(keysOf(load('es', file)).sort()).toEqual(
      keysOf(load('en', file)).sort(),
    );
  });

  it('errors.json has a message for every error code', () => {
    // These two never reach a translation lookup: validation errors are
    // translated per field, and HTTP_ERROR keeps the framework message.
    const untranslated: string[] = [
      ErrorCode.VALIDATION_FAILED,
      ErrorCode.HTTP_ERROR,
    ];
    const expected = Object.values(ErrorCode)
      .filter((code) => !untranslated.includes(code))
      .sort();

    expect(Object.keys(load('en', 'errors.json')).sort()).toEqual(expected);
  });
});
