// Two-letter USPS codes for all US states + DC. Used to validate US shipping
// addresses (estado field) and to anchor per-state logic (tax, alcohol shipping).
export const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const;

export type UsStateCode = (typeof US_STATE_CODES)[number];

// US ZIP: 5 digits, optionally followed by -4 (ZIP+4).
export const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;

export function isUsStateCode(value: string | null | undefined): boolean {
  return !!value && (US_STATE_CODES as readonly string[]).includes(value.toUpperCase());
}
