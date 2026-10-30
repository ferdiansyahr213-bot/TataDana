/**
 * Pure utility functions for user display name and ID sanitization.
 * Free of client-side React hooks so it can be safely used on both server and client.
 */

/**
 * Sanitizes and safely formats user display name.
 * Fallback to email prefix or valid default (never dummy names of another person).
 */
export function sanitizeUserDisplayName(fullName?: string | null, email?: string | null): string {
  const trimmed = fullName?.trim() || '';
  
  // Reject dummy placeholder names
  if (
    trimmed &&
    trimmed !== 'Vina Al Fitriansyah' &&
    trimmed !== 'Pengguna TataDana' &&
    trimmed !== 'Budi Santoso' &&
    trimmed !== 'Test Pending User'
  ) {
    return trimmed;
  }
  
  // Safe fallback to email prefix or email
  if (email && email.includes('@')) {
    const prefix = email.split('@')[0];
    if (prefix) {
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return email;
  }

  return 'Pengguna';
}

/**
 * Sanitizes user ID, rejecting dummy hardcoded values.
 */
export function sanitizeUserId(userId?: string | null, email?: string | null): string {
  const trimmed = userId?.trim() || '';
  if (
    trimmed && 
    trimmed !== 'usr_demo_123' && 
    trimmed !== 'usr_demo_456' && 
    trimmed !== 'usr_admin_999'
  ) {
    return trimmed;
  }
  if (email && email.trim()) {
    return email.trim();
  }
  return '';
}
