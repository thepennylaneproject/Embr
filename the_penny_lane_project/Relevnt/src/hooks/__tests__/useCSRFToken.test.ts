/**
 * useCSRFToken.test.ts
 *
 * Tests required by PLP-9:
 *   1. Unit: malformed/non-JWT token does not throw an unhandled exception.
 *   2. Unit: valid token still fetches, stores, and returns the CSRF token.
 *   3. Integration: mutation call with server-side auth failure (401) returns
 *      a controlled error, not an unhandled throw.
 *
 * Additional coverage:
 *   4. Unit: `decodeJwtPayload` correctly handles edge-case inputs.
 *   5. Unit: cached CSRF token is reused when the JWT has not yet expired.
 *   6. Unit: network failure during CSRF fetch produces a normalised error.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  decodeJwtPayload,
  syncCSRFTokenWithServer,
  mutationRequest,
  clearCsrfTokenCache,
} from '../useCSRFToken';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Encodes an object as base64url (the JWT payload encoding).
 * Uses standard base64 then replaces characters to produce base64url.
 */
function base64url(obj: Record<string, unknown>): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Builds a syntactically valid (but unsigned) JWT string with the given payload.
 */
function makeJwt(payload: Record<string, unknown>): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const body = base64url(payload);
  return `${header}.${body}.fake-signature`;
}

/** Future timestamp (seconds) — token will not be expired. */
function futureExp(offsetMs = 3_600_000): number {
  return Math.floor((Date.now() + offsetMs) / 1000);
}

/** Past timestamp (seconds) — token is expired. */
function pastExp(offsetMs = 3_600_000): number {
  return Math.floor((Date.now() - offsetMs) / 1000);
}

/**
 * Stubs global.localStorage with a Supabase-style session entry.
 * Pass `null` for accessToken to simulate no session.
 */
function stubLocalStorage(accessToken: string | null): void {
  const store: Record<string, string> = {};

  if (accessToken !== null) {
    store['sb-test-project-auth-token'] = JSON.stringify({
      access_token: accessToken,
    });
  }

  const keys = Object.keys(store);
  vi.stubGlobal('localStorage', {
    length: keys.length,
    key: (i: number) => keys[i] ?? null,
    getItem: (k: string) => store[k] ?? null,
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });
}

/** Stubs global.fetch to return the given CSRF token payload. */
function stubFetchCsrfSuccess(token = 'csrf-token-abc', expiresAt?: number): void {
  const exp = expiresAt ?? Date.now() + 120_000;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token, expiresAt: exp }),
    }),
  );
}

/** Stubs global.fetch to simulate a server error. */
function stubFetchError(status: number): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: async () => ({ message: 'error' }),
    }),
  );
}

/** Stubs global.fetch to simulate a network-level failure. */
function stubFetchNetworkError(): void {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));
}

// ---------------------------------------------------------------------------
// Reset state between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  clearCsrfTokenCache();
  vi.restoreAllMocks();
});

// ===========================================================================
// 1. decodeJwtPayload — unit tests (PLP-9 guard)
// ===========================================================================

describe('decodeJwtPayload', () => {
  it('returns null for an empty string without throwing', () => {
    expect(() => decodeJwtPayload('')).not.toThrow();
    expect(decodeJwtPayload('')).toBeNull();
  });

  it('returns null for a non-JWT string without throwing', () => {
    expect(() => decodeJwtPayload('not-a-jwt')).not.toThrow();
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
  });

  it('returns null for a JWT with only two parts (malformed)', () => {
    expect(decodeJwtPayload('header.payload')).toBeNull();
  });

  it('returns null for a JWT with invalid base64 payload without throwing', () => {
    // Third segment is present but payload is garbage
    expect(() => decodeJwtPayload('header.!!!invalid_base64!!!.sig')).not.toThrow();
    expect(decodeJwtPayload('header.!!!invalid_base64!!!.sig')).toBeNull();
  });

  it('returns null when the payload base64 decodes but is not JSON', () => {
    const notJson = btoa('this is not json');
    const token = `header.${notJson}.sig`;
    expect(() => decodeJwtPayload(token)).not.toThrow();
    expect(decodeJwtPayload(token)).toBeNull();
  });

  it('correctly decodes a well-formed JWT payload', () => {
    const exp = futureExp();
    const jwt = makeJwt({ sub: 'user-123', exp });
    const payload = decodeJwtPayload(jwt);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('user-123');
    expect(payload?.exp).toBe(exp);
  });

  it('handles JWTs with standard base64url characters (- and _)', () => {
    // Build a payload whose base64url encoding contains - and _
    // by constructing a known value.
    const exp = futureExp();
    const jwt = makeJwt({ sub: 'u', role: 'admin', exp });
    const payload = decodeJwtPayload(jwt);
    expect(payload).not.toBeNull();
    expect(payload?.exp).toBe(exp);
  });
});

// ===========================================================================
// 2. syncCSRFTokenWithServer — unit tests
// ===========================================================================

describe('syncCSRFTokenWithServer', () => {
  it('fetches CSRF token from server when no JWT is in localStorage', async () => {
    stubLocalStorage(null);
    stubFetchCsrfSuccess('tok-1');

    const result = await syncCSRFTokenWithServer();

    expect(result.csrfToken).toBe('tok-1');
    expect(typeof result.expiresAt).toBe('number');
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
  });

  it('does NOT throw when localStorage contains a malformed JWT (PLP-9)', async () => {
    stubLocalStorage('not.a.jwt');
    stubFetchCsrfSuccess('tok-2');

    await expect(syncCSRFTokenWithServer()).resolves.toMatchObject({
      csrfToken: 'tok-2',
    });
    // fetch must still be called — graceful fall-through, not a crash
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
  });

  it('does NOT throw when the JWT payload is invalid base64 (PLP-9)', async () => {
    // Two-segment "JWT" with garbage second part
    stubLocalStorage('hdr.!!!bad_base64!!!.sig');
    stubFetchCsrfSuccess('tok-3');

    await expect(syncCSRFTokenWithServer()).resolves.toMatchObject({
      csrfToken: 'tok-3',
    });
  });

  it('does NOT throw when the JWT payload is valid base64 but not JSON (PLP-9)', async () => {
    const notJson = btoa('this is not json');
    stubLocalStorage(`hdr.${notJson}.sig`);
    stubFetchCsrfSuccess('tok-4');

    await expect(syncCSRFTokenWithServer()).resolves.toMatchObject({
      csrfToken: 'tok-4',
    });
  });

  it('stores the fetched CSRF token in the module cache', async () => {
    stubLocalStorage(null);
    stubFetchCsrfSuccess('tok-cached', Date.now() + 120_000);

    await syncCSRFTokenWithServer();
    // Second call should NOT hit fetch again
    await syncCSRFTokenWithServer();

    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
  });

  it('reuses cached CSRF token when valid JWT has not expired', async () => {
    const jwt = makeJwt({ exp: futureExp(3_600_000) });
    stubLocalStorage(jwt);
    stubFetchCsrfSuccess('tok-reuse', Date.now() + 120_000);

    const first = await syncCSRFTokenWithServer();
    const second = await syncCSRFTokenWithServer();

    expect(first.csrfToken).toBe('tok-reuse');
    expect(second.csrfToken).toBe('tok-reuse');
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
  });

  it('re-fetches CSRF token after cache is cleared', async () => {
    stubLocalStorage(null);
    stubFetchCsrfSuccess('tok-fresh', Date.now() + 120_000);

    await syncCSRFTokenWithServer();
    clearCsrfTokenCache();
    await syncCSRFTokenWithServer();

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('throws AUTH_REQUIRED when server returns 401', async () => {
    stubLocalStorage(null);
    stubFetchError(401);

    await expect(syncCSRFTokenWithServer()).rejects.toThrow('AUTH_REQUIRED');
  });

  it('throws a normalised error when server returns a non-401 error', async () => {
    stubLocalStorage(null);
    stubFetchError(500);

    await expect(syncCSRFTokenWithServer()).rejects.toThrow(
      /CSRF sync failed — server returned 500/,
    );
  });

  it('throws a normalised error on network failure', async () => {
    stubLocalStorage(null);
    stubFetchNetworkError();

    await expect(syncCSRFTokenWithServer()).rejects.toThrow(
      /CSRF sync failed — network error/,
    );
  });
});

// ===========================================================================
// 3. mutationRequest — integration tests (PLP-9)
// ===========================================================================

describe('mutationRequest', () => {
  it('attaches X-CSRF-Token header on a successful mutation', async () => {
    stubLocalStorage(null);
    // First fetch: CSRF endpoint. Second fetch: the actual mutation.
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ token: 'csrf-xyz', expiresAt: Date.now() + 60_000 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        }),
    );

    const response = await mutationRequest('/api/applications/1/withdraw', {
      method: 'DELETE',
    });

    expect(response.ok).toBe(true);

    const calls = vi.mocked(fetch).mock.calls;
    // Second call is the actual mutation
    const mutationHeaders = calls[1][1]?.headers as Record<string, string>;
    expect(mutationHeaders['X-CSRF-Token']).toBe('csrf-xyz');
    expect((calls[1][1] as RequestInit).method).toBe('DELETE');
    expect((calls[1][1] as RequestInit).credentials).toBe('include');
  });

  it('propagates AUTH_REQUIRED when CSRF sync returns 401 (controlled failure)', async () => {
    stubLocalStorage(makeJwt({ exp: pastExp() }));
    stubFetchError(401);

    await expect(
      mutationRequest('/api/applications', { method: 'POST', body: JSON.stringify({}) }),
    ).rejects.toThrow('AUTH_REQUIRED');
  });

  it('propagates AUTH_REQUIRED for malformed JWT + server 401 (controlled failure)', async () => {
    // Even with a completely broken token, the error must be controlled, not an
    // unhandled throw from the JWT decode step (this is the PLP-9 regression test).
    stubLocalStorage('completely.broken.token!!!');
    stubFetchError(401);

    await expect(
      mutationRequest('/api/applications', { method: 'POST' }),
    ).rejects.toThrow('AUTH_REQUIRED');
  });

  it('defaults to POST method when none is specified', async () => {
    stubLocalStorage(null);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ token: 'tok', expiresAt: Date.now() + 60_000 }),
        })
        .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({}) }),
    );

    await mutationRequest('/api/applications');
    const mutationCall = vi.mocked(fetch).mock.calls[1];
    expect((mutationCall[1] as RequestInit).method).toBe('POST');
  });
});
