/**
 * Phone Number Privacy & Anti-Spoil Masking Utility
 *
 * Enforces lead data protection:
 * - Super Admins (owners) can view full, raw client phone numbers.
 * - Regular Admins, Agents, and Viewers see masked phone numbers
 *   (e.g., "+91 98765 •••••") so company leads cannot be taken or spoiled.
 */

/**
 * Masks a phone number for non-privileged users.
 *
 * @param phone Raw phone string (e.g., "+919876543210", "+1 (555) 019-2831")
 * @param canViewRaw True if current user is Super Admin
 * @returns Clean unmasked phone or privacy-masked string
 */
export function maskPhoneNumber(
  phone: string | null | undefined,
  canViewRaw: boolean = false
): string {
  if (!phone) return "No phone";
  if (canViewRaw) return phone;

  const trimmed = phone.trim();
  if (trimmed.length <= 5) {
    return "••••••";
  }

  // Preserve leading country code if present (+91, +1, etc.)
  const hasPlus = trimmed.startsWith("+");
  const rawDigits = trimmed.replace(/\D/g, "");

  if (rawDigits.length >= 10) {
    // Show first 4-5 digits, mask the rest with bullets
    const prefixLen = hasPlus ? 5 : 4;
    const prefix = trimmed.slice(0, prefixLen);
    return `${prefix} •••••`;
  }

  // Fallback for short internal numbers
  const splitPoint = Math.floor(trimmed.length / 2);
  return `${trimmed.slice(0, splitPoint)}••••`;
}

/**
 * Returns contact display name or masked phone fallback.
 */
export function formatContactIdentifier(
  name: string | null | undefined,
  phone: string | null | undefined,
  canViewRaw: boolean = false
): string {
  if (name && name.trim().length > 0) {
    return name.trim();
  }
  return maskPhoneNumber(phone, canViewRaw);
}
