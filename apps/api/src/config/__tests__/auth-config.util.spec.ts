import { assertAuthConfigSafe } from '../auth-config.util';

describe('assertAuthConfigSafe', () => {
  const silentLogger = { error: jest.fn(), warn: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('production + AUTH_ENABLED=false → fatal error', () => {
    it('calls exitFn(1) and logs an error when AUTH_ENABLED=false in production', () => {
      const exitFn = jest.fn() as unknown as (code: number) => never;

      assertAuthConfigSafe(
        { NODE_ENV: 'production', AUTH_ENABLED: 'false' },
        silentLogger,
        exitFn,
      );

      expect(silentLogger.error).toHaveBeenCalledTimes(1);
      expect((silentLogger.error as jest.Mock).mock.calls[0][0]).toMatch(/critical security misconfiguration/i);
      expect(exitFn).toHaveBeenCalledWith(1);
    });

    it('does NOT exit when AUTH_ENABLED=true in production', () => {
      const exitFn = jest.fn() as unknown as (code: number) => never;

      assertAuthConfigSafe(
        { NODE_ENV: 'production', AUTH_ENABLED: 'true' },
        silentLogger,
        exitFn,
      );

      expect(exitFn).not.toHaveBeenCalled();
      expect(silentLogger.error).not.toHaveBeenCalled();
    });

    it('does NOT exit when AUTH_ENABLED is unset (defaults to enabled) in production', () => {
      const exitFn = jest.fn() as unknown as (code: number) => never;

      assertAuthConfigSafe({ NODE_ENV: 'production' }, silentLogger, exitFn);

      expect(exitFn).not.toHaveBeenCalled();
    });
  });

  describe('development + AUTH_ENABLED=false', () => {
    it('emits a warning but does NOT exit', () => {
      const exitFn = jest.fn() as unknown as (code: number) => never;

      assertAuthConfigSafe(
        { NODE_ENV: 'development', AUTH_ENABLED: 'false' },
        silentLogger,
        exitFn,
      );

      expect(exitFn).not.toHaveBeenCalled();
      expect(silentLogger.warn).toHaveBeenCalledTimes(1);
      expect((silentLogger.warn as jest.Mock).mock.calls[0][0]).toMatch(/JWT validation is DISABLED/i);
    });

    it('warns about bypass header when AUTH_ALLOW_LOCAL_BYPASS=true', () => {
      const exitFn = jest.fn() as unknown as (code: number) => never;
      const secret = 'a'.repeat(32);

      assertAuthConfigSafe(
        {
          NODE_ENV: 'development',
          AUTH_ENABLED: 'false',
          AUTH_ALLOW_LOCAL_BYPASS: 'true',
          AUTH_BYPASS_SECRET: secret,
        },
        silentLogger,
        exitFn,
      );

      expect(exitFn).not.toHaveBeenCalled();
      expect((silentLogger.warn as jest.Mock).mock.calls[0][0]).toMatch(/X-Dev-Bypass-Secret/i);
    });

    it('calls exitFn(1) when AUTH_ALLOW_LOCAL_BYPASS=true but secret is too short', () => {
      const exitFn = jest.fn() as unknown as (code: number) => never;

      assertAuthConfigSafe(
        {
          NODE_ENV: 'development',
          AUTH_ENABLED: 'false',
          AUTH_ALLOW_LOCAL_BYPASS: 'true',
          AUTH_BYPASS_SECRET: 'short',
        },
        silentLogger,
        exitFn,
      );

      expect(exitFn).toHaveBeenCalledWith(1);
      expect(silentLogger.error).toHaveBeenCalledTimes(1);
      expect((silentLogger.error as jest.Mock).mock.calls[0][0]).toMatch(/at least 32 characters/i);
    });

    it('does NOT exit when AUTH_ALLOW_LOCAL_BYPASS=true with a valid secret', () => {
      const exitFn = jest.fn() as unknown as (code: number) => never;

      assertAuthConfigSafe(
        {
          NODE_ENV: 'development',
          AUTH_ENABLED: 'false',
          AUTH_ALLOW_LOCAL_BYPASS: 'true',
          AUTH_BYPASS_SECRET: 'a_sufficiently_long_bypass_secret_value_here',
        },
        silentLogger,
        exitFn,
      );

      expect(exitFn).not.toHaveBeenCalled();
    });
  });

  describe('normal operation', () => {
    it('does nothing when AUTH_ENABLED is unset (defaults to enabled) in development', () => {
      const exitFn = jest.fn() as unknown as (code: number) => never;

      assertAuthConfigSafe({ NODE_ENV: 'development' }, silentLogger, exitFn);

      expect(exitFn).not.toHaveBeenCalled();
      expect(silentLogger.error).not.toHaveBeenCalled();
      expect(silentLogger.warn).not.toHaveBeenCalled();
    });
  });
});
