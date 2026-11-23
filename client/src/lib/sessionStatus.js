/**
 * Codes meaning the cached session is no longer usable on the server.
 * Sessions are in-memory, so a backend restart (or expiry) invalidates any
 * token the browser still holds. The client must drop it and start over.
 */
export const SESSION_INVALID_CODES = new Set([
  'SESSION_NOT_FOUND',
  'SESSION_EXPIRED',
  'SESSION_TOKEN_MISMATCH',
]);

export function isSessionInvalidCode(code) {
  return SESSION_INVALID_CODES.has(code);
}
