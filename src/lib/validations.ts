/**
 * Comprehensive Validation Utilities for TheNestGuru CRM
 */

/**
 * Validates that a phone/mobile string is exactly 10 digits.
 * Strips whitespace, dashes, plus signs and checks for 10 digits.
 */
export function isValid10DigitPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10;
}

/**
 * Sanitizes input to digits only, capped at 10 digits.
 */
export function sanitizeTo10Digits(input: string): string {
  return input.replace(/\D/g, '').slice(0, 10);
}

/**
 * Validates proper email format using RFC 5322 compatible regex.
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  if (trimmed.length === 0) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

/**
 * Validates that a name contains strictly alphabets and spaces only.
 * Disallows numeric digits and special characters.
 */
export function isValidName(name: string | null | undefined): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;
  return /^[a-zA-Z\s]+$/.test(trimmed);
}

/**
 * Sanitizes input to alphabets and spaces only.
 * Removes all numbers, special characters, and symbols in real time.
 */
export function sanitizeToAlphabetsOnly(input: string): string {
  if (!input) return '';
  return input.replace(/[^a-zA-Z\s]/g, '');
}
