/**
 * Authorization header extraction utility
 *
 * HTTP/1.1 headers are case-insensitive per RFC 7230 §3.2, but some reverse
 * proxies and gateways forward the `Authorization` header without lowercasing
 * it. Node.js lowercases incoming HTTP headers automatically, but Socket.io
 * handshake headers may arrive via non-standard paths. This helper handles
 * both `authorization` (lowercased) and `Authorization` (preserved-case)
 * to guarantee consistent token extraction regardless of transport.
 */

/**
 * Extract the raw Authorization header value from an HTTP headers object,
 * normalising across both lowercase and PascalCase variants.
 */
export function getAuthorizationHeader(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const value = headers['authorization'] ?? headers['Authorization'];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Extract a Bearer token from an HTTP headers object.
 * Returns the raw token string without the "Bearer " prefix, or `undefined`
 * if the header is absent or does not start with "Bearer ".
 */
export function extractBearerToken(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const authHeader = getAuthorizationHeader(headers);
  if (!authHeader?.startsWith('Bearer ')) return undefined;
  return authHeader.slice(7);
}
