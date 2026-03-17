/**
 * useCSRFToken.ts
 *
 * Manages CSRF token lifecycle for mutation requests.
 *
 * Before each mutation (POST/PUT/PATCH/DELETE), call `syncCSRFTokenWithServer()`
 * to obtain a valid CSRF token. The token is cached until the JWT expires
 * (with a 30-second safety skew), at which point a fresh token is fetched.
 *
 * Fix (PLP-9): JWT payload decode is wrapped in try/catch so that malformed,
 * expired, or non-JWT token strings do not throw synchronously. Instead they
 * return null and fall through to the server-sync path gracefully.
 */

// Access Vite's env safely without relying on DOM or vite/client types.
const API_BASE: string =
  (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? '/api';

/** Safety margin: refresh CSRF token this many ms before it actually expires. */
const CSRF_EXPIRY_SKEW_MS = 30_000;

export interface CsrfSyncResult {
  csrfToken: string;
  expiresAt: number;
}

interface JwtPayload {
  exp?: number;
  iat?: number;
  sub?: string;
  [key: string]: unknown;
}

/**
 * Safely decodes the payload section of a JWT string.
 *
 * Returns `null` instead of throwing when the token is malformed, empty,
 * not a three-part JWT, not valid base64url, or not valid JSON. Callers
 * should treat a null result as "token unknown — treat as expired".
 *
 * PLP-9: This guard (try/catch) is the core fix. Without it, a call like
 *   `JSON.parse(atob(token.split('.')[1]))`
 * throws synchronously on any malformed input, bypassing graceful refresh.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Normalise base64url → standard base64 before calling atob.
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    // Covers: atob decode errors, JSON parse errors, and any other edge cases.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Module-level CSRF cache (single shared instance per page load)
// ---------------------------------------------------------------------------

let _cachedCsrfToken: string | null = null;
let _csrfExpiresAt: number | null = null;

/**
 * Invalidates the cached CSRF token, forcing a fresh fetch on the next
 * mutation. Call this after logout or a successful token refresh.
 */
export function clearCsrfTokenCache(): void {
  _cachedCsrfToken = null;
  _csrfExpiresAt = null;
}

// ---------------------------------------------------------------------------
// Supabase session helper
// ---------------------------------------------------------------------------

/**
 * Reads the current Supabase access token from localStorage.
 * Supabase v2 stores sessions under keys matching `sb-*-auth-token`.
 * Returns null when localStorage is unavailable or no session exists.
 */
function readAccessToken(): string | null {
  // Access localStorage via globalThis to avoid requiring DOM lib in tsconfig.
  const storage = (globalThis as unknown as { localStorage?: { length: number; key(i: number): string | null; getItem(k: string): string | null } }).localStorage;
  try {
    if (!storage) return null;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = storage.getItem(key);
        if (!raw) continue;
        const session = JSON.parse(raw) as { access_token?: string } | null;
        if (session?.access_token) return session.access_token;
      }
    }
  } catch {
    // localStorage unavailable: SSR, private browsing quota exceeded, etc.
  }
  return null;
}

// ---------------------------------------------------------------------------
// Core: sync CSRF token with server
// ---------------------------------------------------------------------------

/**
 * Returns a valid CSRF token, fetching from the server only when necessary.
 *
 * Strategy:
 *  1. Read the JWT from Supabase localStorage and decode its expiry — safely.
 *  2. If the cached CSRF token is still valid (both the CSRF and JWT have not
 *     yet reached their expiry minus the skew buffer), return the cached token.
 *  3. Otherwise, call GET /api/auth/csrf to obtain a fresh token.
 *
 * @throws {Error} with a normalised message on network or server errors.
 *                 Auth failures throw with message 'AUTH_REQUIRED'.
 */
export async function syncCSRFTokenWithServer(): Promise<CsrfSyncResult> {
  const now = Date.now();
  let jwtExpiresAt: number | null = null;

  const accessToken = readAccessToken();
  if (accessToken) {
    // PLP-9 fix: decode is guarded — a malformed or non-JWT token yields null
    // rather than throwing synchronously and bypassing the refresh flow.
    const payload = decodeJwtPayload(accessToken);
    if (payload?.exp != null) {
      jwtExpiresAt = payload.exp * 1000;
    }
  }

  // Return the cached CSRF token if it (and the JWT) are still comfortably valid.
  if (
    _cachedCsrfToken !== null &&
    _csrfExpiresAt !== null &&
    now < _csrfExpiresAt - CSRF_EXPIRY_SKEW_MS &&
    (jwtExpiresAt === null || now < jwtExpiresAt - CSRF_EXPIRY_SKEW_MS)
  ) {
    return { csrfToken: _cachedCsrfToken, expiresAt: _csrfExpiresAt };
  }

  // Fetch a fresh CSRF token from the server.
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  } catch (networkError) {
    throw new Error(
      `CSRF sync failed — network error: ${networkError instanceof Error ? networkError.message : 'unknown'}`,
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('AUTH_REQUIRED');
    }
    throw new Error(`CSRF sync failed — server returned ${response.status}`);
  }

  const data = (await response.json()) as { token: string; expiresAt?: number };
  const csrfToken = data.token;
  const expiresAt = data.expiresAt ?? now + 60_000;

  _cachedCsrfToken = csrfToken;
  _csrfExpiresAt = expiresAt;

  return { csrfToken, expiresAt };
}

// ---------------------------------------------------------------------------
// Mutation request helper
// ---------------------------------------------------------------------------

export interface MutationOptions extends Omit<RequestInit, 'credentials'> {
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

/**
 * Performs a mutation request (POST/PUT/PATCH/DELETE) with automatic CSRF
 * protection. Fetches and attaches the CSRF token in `X-CSRF-Token` before
 * sending. On AUTH_REQUIRED the error propagates to the caller unchanged so
 * the application can redirect to login.
 *
 * @param url     Full or relative URL to request.
 * @param options RequestInit-compatible options; method defaults to POST.
 */
export async function mutationRequest(
  url: string,
  options: MutationOptions = {},
): Promise<Response> {
  const { csrfToken } = await syncCSRFTokenWithServer();

  const { method = 'POST', headers = {}, ...rest } = options;

  return fetch(url, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      'X-CSRF-Token': csrfToken,
    },
    ...rest,
  });
}
