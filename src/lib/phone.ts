import { parsePhoneNumberFromString, isValidPhoneNumber } from "libphonenumber-js";

/**
 * Normalize user input to E.164 (+<countrycode><number>)
 * Accepts phone numbers from ANY country.
 * Returns null if invalid or missing country code.
 */
export function normalizeToE164(input: string): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  // Handle various input formats
  let phoneInput = raw;
  
  // If number starts with 00, convert to +
  if (phoneInput.startsWith("00")) {
    phoneInput = "+" + phoneInput.slice(2);
  }
  
  // If no + prefix, add it (assume user forgot)
  if (!phoneInput.startsWith("+")) {
    phoneInput = "+" + phoneInput;
  }

  try {
    const phone = parsePhoneNumberFromString(phoneInput);
    if (!phone) return null;
    if (!phone.isValid()) return null;
    return phone.number; // E.164 format
  } catch {
    return null;
  }
}

/**
 * Check if a phone number is valid E.164 format.
 * Accepts phone numbers from ANY country worldwide.
 */
export function isValidE164(input: string): boolean {
  const raw = (input ?? "").trim();
  if (!raw) return false;

  let phoneInput = raw;
  
  // Handle various input formats
  if (phoneInput.startsWith("00")) {
    phoneInput = "+" + phoneInput.slice(2);
  }
  
  if (!phoneInput.startsWith("+")) {
    phoneInput = "+" + phoneInput;
  }

  try {
    return isValidPhoneNumber(phoneInput);
  } catch {
    return false;
  }
}

/**
 * Get country code from a phone number.
 * Returns the ISO 3166-1 alpha-2 code (e.g., 'US', 'KE', 'GB', 'NG')
 */
export function getCountryFromPhone(input: string): string | null {
  const normalized = normalizeToE164(input);
  if (!normalized) return null;

  try {
    const phone = parsePhoneNumberFromString(normalized);
    return phone?.country || null;
  } catch {
    return null;
  }
}

/**
 * Format phone number for display with country flag emoji
 */
export function formatPhoneForDisplay(input: string): string {
  const phone = parsePhoneNumberFromString(normalizeToE164(input) || input);
  if (!phone) return input;
  
  return phone.formatInternational();
}
