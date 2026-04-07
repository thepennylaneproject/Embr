/**
 * Auth-enabled safety assertions.
 *
 * Extracted from main.ts so these rules can be unit-tested independently.
 */

export interface AuthConfigEnv extends Record<string, string | undefined> {
  NODE_ENV?: string;
  AUTH_ENABLED?: string;
  AUTH_ALLOW_LOCAL_BYPASS?: string;
  AUTH_BYPASS_SECRET?: string;
}

export interface AuthConfigLogger {
  error: (message: string) => void;
  warn: (message: string) => void;
}

/**
 * Validates the auth configuration and throws or exits on critical violations.
 *
 * @param env   - environment variable map (defaults to process.env)
 * @param logger - logger interface (defaults to console-backed wrapper)
 * @param exitFn - called with exit code 1 on fatal errors (defaults to process.exit)
 *
 * Isolation of `exitFn` lets unit tests assert fatal paths without actually
 * killing the test process.
 */
export function assertAuthConfigSafe(
  env: AuthConfigEnv = process.env,
  logger: AuthConfigLogger = { error: console.error, warn: console.warn },
  exitFn: (code: number) => never = (code) => process.exit(code),
): void {
  const isProd = env.NODE_ENV === 'production';
  const authEnabled = env.AUTH_ENABLED !== 'false';
  const allowLocalBypass = env.AUTH_ALLOW_LOCAL_BYPASS === 'true';
  const bypassSecret = env.AUTH_BYPASS_SECRET ?? '';

  if (!authEnabled && isProd) {
    logger.error(
      'FATAL: AUTH_ENABLED=false in a production environment. ' +
        'Disabling authentication while the service is internet-reachable is a critical security misconfiguration. ' +
        'Set AUTH_ENABLED=true or restrict network access before starting the server.',
    );
    exitFn(1);
    return; // unreachable — satisfies TypeScript control-flow analysis in tests
  }

  if (!authEnabled && allowLocalBypass && bypassSecret.length < 32) {
    logger.error(
      'FATAL: AUTH_ALLOW_LOCAL_BYPASS=true requires AUTH_BYPASS_SECRET to be at least 32 characters. ' +
        'A short or default secret provides no meaningful protection.',
    );
    exitFn(1);
    return;
  }

  if (!authEnabled && !isProd) {
    logger.warn(
      'AUTH_ENABLED=false — JWT validation is DISABLED. ' +
        'This configuration must only be used in a local-only development stack that is NOT reachable from the internet. ' +
        (allowLocalBypass
          ? 'Requests must supply the X-Dev-Bypass-Secret header to be accepted.'
          : 'Set AUTH_ALLOW_LOCAL_BYPASS=true and AUTH_BYPASS_SECRET to restrict access by header.'),
    );
  }
}
