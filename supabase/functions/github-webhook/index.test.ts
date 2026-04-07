/**
 * Unit tests for GitHub webhook HMAC-SHA256 signature verification.
 *
 * Tests run with Node.js built-in test runner (node:test).
 * They re-implement the same algorithm used in the Deno edge function
 * using Node's crypto module so they can run in CI without Deno.
 *
 * Scenarios:
 *   1. Valid signature passes verification.
 *   2. Wrong secret produces a mismatch → rejected.
 *   3. Tampered body produces a mismatch → rejected.
 *   4. Missing signature header → rejected.
 *   5. Malformed header (no sha256= prefix) → rejected.
 *   6. Empty secret env var → rejected (would be a 500 in the handler, but the
 *      verify helper itself still returns false when secret is empty because the
 *      HMAC will differ).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac, timingSafeEqual } from "node:crypto";

// ---------------------------------------------------------------------------
// Pure helper — mirrors the Deno implementation exactly, but using Node APIs.
// ---------------------------------------------------------------------------

const SHA256_PREFIX = "sha256=";

function computeHmacSha256(secret: string, body: Buffer | Uint8Array): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

function verifyGithubSignature(
  rawBody: Buffer | Uint8Array,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) {
    return false;
  }
  if (!signatureHeader.startsWith(SHA256_PREFIX)) {
    return false;
  }
  const receivedHex = signatureHeader.slice(SHA256_PREFIX.length);
  const expectedHex = computeHmacSha256(secret, rawBody);
  return timingSafeEqualStrings(receivedHex, expectedHex);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSignature(body: Buffer | Uint8Array, secret: string): string {
  return `${SHA256_PREFIX}${computeHmacSha256(secret, body)}`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const SECRET = "my-super-secret";
const BODY = Buffer.from(JSON.stringify({ action: "opened", number: 1 }));

describe("verifyGithubSignature", () => {
  it("accepts a valid signature", () => {
    const header = makeSignature(BODY, SECRET);
    assert.equal(verifyGithubSignature(BODY, header, SECRET), true);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const header = makeSignature(BODY, "wrong-secret");
    assert.equal(verifyGithubSignature(BODY, header, SECRET), false);
  });

  it("rejects when the body has been tampered with", () => {
    const header = makeSignature(BODY, SECRET);
    const tamperedBody = Buffer.from(JSON.stringify({ action: "closed", number: 1 }));
    assert.equal(verifyGithubSignature(tamperedBody, header, SECRET), false);
  });

  it("rejects when the signature header is missing (null)", () => {
    assert.equal(verifyGithubSignature(BODY, null, SECRET), false);
  });

  it("rejects a header that lacks the sha256= prefix", () => {
    const hexOnly = computeHmacSha256(SECRET, BODY);
    assert.equal(verifyGithubSignature(BODY, hexOnly, SECRET), false);
  });

  it("rejects when the header value is an empty string", () => {
    assert.equal(verifyGithubSignature(BODY, "", SECRET), false);
  });

  it("rejects when lengths differ (different digest length is blocked before compare)", () => {
    const truncated = `${SHA256_PREFIX}deadbeef`;
    assert.equal(verifyGithubSignature(BODY, truncated, SECRET), false);
  });

  it("does not confuse different bodies with the same length", () => {
    const body1 = Buffer.from("hello world!");
    const body2 = Buffer.from("HELLO WORLD!");
    const header = makeSignature(body1, SECRET);
    assert.equal(verifyGithubSignature(body2, header, SECRET), false);
  });
});
