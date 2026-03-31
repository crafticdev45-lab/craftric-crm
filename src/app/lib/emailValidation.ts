/** Shown when save is blocked due to invalid email format. */
export const INVALID_EMAIL_MESSAGE = 'Enter a valid email address.';

/** Pragmatic format check: local-part @ domain with at least one dot in the host. */
export function isValidEmailFormat(email: string): boolean {
  const s = email.trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
