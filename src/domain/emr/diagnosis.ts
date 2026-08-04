const ICD10_LOOSE_PATTERN = /^[A-Z][0-9]{2}(\.[A-Z0-9]{1,4})?$/i;

/**
 * Loose ICD-10 / ICD-10-CM format check: a letter followed by two digits,
 * with an optional decimal suffix of 1-4 alphanumeric characters (FR-046).
 * Codes are optional; this only validates the format when a code is present.
 */
export function isValidIcd10Format(code: string): boolean {
  return ICD10_LOOSE_PATTERN.test(code.trim());
}
