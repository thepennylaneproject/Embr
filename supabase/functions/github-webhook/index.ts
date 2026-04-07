import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SIGNATURE_HEADER = "x-hub-signature-256";
const SHA256_PREFIX = "sha256=";

/**
 * Timing-safe comparison of two Uint8Arrays to prevent timing attacks.
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.byteLength; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Compute HMAC-SHA256 of the raw body using the provided secret.
 * Returns the hex-encoded digest.
 */
async function computeHmacSha256(secret: string, body: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", keyMaterial, body);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify that the x-hub-signature-256 header matches HMAC-SHA256 of the raw
 * body signed with GITHUB_WEBHOOK_SECRET.
 *
 * Returns true when the signature is valid; false otherwise (including when
 * the header is missing or malformed).
 */
export async function verifyGithubSignature(
  rawBody: Uint8Array,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) {
    return false;
  }

  if (!signatureHeader.startsWith(SHA256_PREFIX)) {
    return false;
  }

  const receivedHex = signatureHeader.slice(SHA256_PREFIX.length);
  const expectedHex = await computeHmacSha256(secret, rawBody);

  const encoder = new TextEncoder();
  const receivedBytes = encoder.encode(receivedHex);
  const expectedBytes = encoder.encode(expectedHex);

  return timingSafeEqual(receivedBytes, expectedBytes);
}

serve(async (req: Request) => {
  const secret = Deno.env.get("GITHUB_WEBHOOK_SECRET") ?? "";

  if (!secret) {
    console.error("GITHUB_WEBHOOK_SECRET is not configured");
    return new Response("Internal server error", { status: 500 });
  }

  // Read the raw body before any parsing so the bytes are intact for HMAC.
  const rawBody = new Uint8Array(await req.arrayBuffer());

  const signatureHeader = req.headers.get(SIGNATURE_HEADER);

  const valid = await verifyGithubSignature(rawBody, signatureHeader, secret);
  if (!valid) {
    return new Response("Forbidden", { status: 403 });
  }

  let payload: unknown;
  try {
    const decoder = new TextDecoder();
    payload = JSON.parse(decoder.decode(rawBody));
  } catch {
    return new Response("Bad request: invalid JSON", { status: 400 });
  }

  const event = req.headers.get("x-github-event") ?? "unknown";
  console.log(`Received GitHub webhook event: ${event}`);

  // TODO: dispatch on event type as needed.
  return new Response(JSON.stringify({ received: true, event }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
