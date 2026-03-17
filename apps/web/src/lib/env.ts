/**
 * Environment variable validation for the Next.js web app.
 *
 * `NEXT_PUBLIC_` variables are inlined at **build time**. If they are absent
 * during `next build` or `next dev`, they will be `undefined` at runtime and
 * cause silent failures (broken API calls, missing WebSocket connections, etc.).
 *
 * This module is imported at two points:
 *  1. `next.config.js`  — runs on every server start and every build.
 *  2. `pages/_app.tsx`  — runs on the first server-side render so the error
 *     surfaces immediately in the server log rather than on the first user
 *     request that exercises the missing variable.
 *
 * The validation deliberately does NOT throw in the browser; client-side code
 * only warns so that the page can still render partially.
 */

interface EnvSpec {
  /** Environment variable name */
  name: string;
  /** Whether absence should be a hard error (throws) vs. a warning */
  required: boolean;
  /** Human-readable description of what this var is used for */
  description: string;
  /** Optional validator — returns false when the value is present but invalid */
  validate?: (value: string) => boolean;
  /** Message appended to the error when `validate` returns false */
  validationHint?: string;
}

const ENV_SPECS: EnvSpec[] = [
  {
    name: 'NEXT_PUBLIC_API_URL',
    required: true,
    description: 'Base URL for the Embr API (e.g. http://localhost:3003/api)', // pragma: allowlist secret
    validate: (v) => /^https?:\/\/.+/.test(v),
    validationHint: 'must be a full HTTP(S) URL',
  },
  {
    name: 'NEXT_PUBLIC_WS_URL',
    required: true,
    description: 'WebSocket server URL for real-time messaging (e.g. http://localhost:3003)', // pragma: allowlist secret
    validate: (v) => /^(https?|wss?):\/\/.+/.test(v),
    validationHint: 'must be a full HTTP(S) or WS(S) URL',
  },
  {
    name: 'NEXT_PUBLIC_WEB_URL',
    required: false,
    description: 'Public URL of this web app — used for canonical links and OAuth redirects',
  },
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    required: false,
    description: 'Stripe publishable key — required for checkout and payment UIs',
    validate: (v) => v.startsWith('pk_'),
    validationHint: 'must start with "pk_"',
  },
  {
    name: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    required: false,
    description: 'Google OAuth client ID — required for "Sign in with Google"',
  },
];

type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[]; warnings: string[] };

/** Run all specs and collect errors / warnings without side-effects. */
export function checkEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const spec of ENV_SPECS) {
    const value = process.env[spec.name];

    if (!value || value.trim() === '') {
      if (spec.required) {
        errors.push(`  ${spec.name} — ${spec.description}`);
      } else {
        warnings.push(`  ${spec.name} — ${spec.description}`);
      }
      continue;
    }

    if (spec.validate && !spec.validate(value)) {
      errors.push(`  ${spec.name} — invalid value ("${value}"): ${spec.validationHint}`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  return { ok: true };
}

/**
 * Validate environment variables and throw a descriptive error if any
 * required variable is missing or invalid.
 *
 * Safe to call from both Node.js (server / build) and browser contexts.
 * In the browser, errors are degraded to `console.error` to avoid breaking
 * pages for end-users while still surfacing the misconfiguration.
 */
export function validateEnv(): void {
  const result = checkEnv();

  // Always surface warnings regardless of the execution environment.
  if (!result.ok && result.warnings.length > 0) {
    console.warn(
      '[Embr] Optional environment variables are not set — some features will be unavailable:\n' +
        result.warnings.join('\n'),
    );
  } else if (result.ok) {
    // checkEnv returns { ok: true } so there are no separate warnings to surface;
    // we already know errors is empty.  Re-run to collect warnings for logging.
    const warnings = ENV_SPECS
      .filter((s) => !s.required && !process.env[s.name])
      .map((s) => `  ${s.name} — ${s.description}`);

    if (warnings.length > 0) {
      console.warn(
        '[Embr] Optional environment variables are not set — some features will be unavailable:\n' +
          warnings.join('\n'),
      );
    }
  }

  if (!result.ok) {
    const message =
      '[Embr] Missing or invalid required environment variables:\n' +
      result.errors.join('\n') +
      '\n\nCopy apps/web/.env.example to apps/web/.env.local and fill in the values.';

    if (typeof window !== 'undefined') {
      // Browser — log but do not crash the page.
      console.error(message);
    } else {
      // Node.js (build or SSR server) — fail fast.
      throw new Error(message);
    }
  }
}
