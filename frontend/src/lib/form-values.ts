// Forms keep every value as a string ('' = empty), while the API uses null
// for an empty optional field. These convert between the two.

export const toFormText = (value: string | number | null): string =>
  value === null ? '' : String(value)

export const toNullableText = (value: string): string | null => {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}
