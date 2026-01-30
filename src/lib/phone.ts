import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Normalize user input to E.164 (+<countrycode><number>)
 * Returns null if invalid or missing country code.
 */
export function normalizeToE164(input: string): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  // We require a country code (leading +). If you want to accept national formats,
  // you must also collect a country selection and pass it to libphonenumber-js.
  if (!raw.startsWith("+")) return null;

  const phone = parsePhoneNumberFromString(raw);
  if (!phone) return null;
  if (!phone.isValid()) return null;
  return phone.number; // E.164
}

export function isValidE164(input: string): boolean {
  return normalizeToE164(input) !== null;
}
