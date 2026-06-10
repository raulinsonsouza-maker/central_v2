/**
 * Phone/email matching utilities for associating CRM leads to Meta Leads.
 *
 * Phone normalization: strips non-digits, removes Brazilian country code (55),
 * and uses the last 8 significant digits for fuzzy comparison to handle
 * formatting differences (area code presence/absence, spaces, dashes).
 */

export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  let normalized = digits;
  if (normalized.startsWith("55") && normalized.length > 10) {
    normalized = normalized.slice(2);
  }
  return normalized.slice(-8);
}

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  return e.length > 3 ? e : null;
}

export function phoneKey(phone: string | null | undefined): string | null {
  return normalizePhone(phone);
}

export function emailKey(email: string | null | undefined): string | null {
  return normalizeEmail(email);
}
