// Load environment variables FIRST — before any NestJS module initialization.
// This ensures JWT_SECRET, DATABASE_URL etc. are in process.env when the
// JwtModule / ConfigService are instantiated during the DI bootstrap phase.
import * as dotenv from 'dotenv';
dotenv.config();                          // apps/api/.env (if present)
dotenv.config({ path: '../../.env', override: false }); // monorepo root .env

// Sentry must load after env; keep require (CJS) so it runs after the dotenv calls above.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- ordering vs. static imports
require('./instrument');

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, LoggerService } from '@nestjs/common';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/http-exception.filter';
import { JsonLinesLogger } from './common/logging/json-lines.logger';

const useJsonLogs = process.env.LOG_FORMAT === 'json';

// ---------------------------------------------------------------------------
// Process-level fatal error handlers
// These must be registered before any async code to catch failures during
// module initialisation and subsequent request processing.
// ---------------------------------------------------------------------------

const startupLogger: LoggerService = useJsonLogs
  ? new JsonLinesLogger('Bootstrap')
  : new Logger('Bootstrap');

process.on('unhandledRejection', (reason: unknown) => {
  startupLogger.error(
    `Unhandled Promise Rejection: ${reason instanceof Error ? reason.stack : String(reason)}`,
  );
  // Do not exit here — let NestJS / the OS supervisor decide.  Logging is the
  // primary goal; a supervised restart will follow if needed.
});

process.on('uncaughtException', (error: Error) => {
  startupLogger.error(`Uncaught Exception: ${error.stack ?? error.message}`);
  // Allow a brief window for any pending I/O or log flushes before exiting.
  // Exit with a non-zero code so the container / process manager restarts.
  setImmediate(() => process.exit(1));
});

/**
 * Log a human-readable summary of which optional integrations are active.
 * This runs immediately after the NestJS application boots so that operators
 * can confirm the deployment environment at a glance rather than discovering
 * misconfigurations hours later when a feature is first exercised.
 */
function logStartupSummary(logger: LoggerService): void {
  const env = process.env;
  const isProd = env.NODE_ENV === 'production';

  const check = (label: string, active: boolean, detail?: string): string => {
    const status = active ? '✓' : isProd ? '✗ (NOT CONFIGURED)' : '- (not configured)';
    return `  ${label.padEnd(20)} ${status}${detail ? `  [${detail}]` : ''}`;
  };

  const emailProvider =
    env.SENDGRID_API_KEY ? 'SendGrid'
    : env.AWS_SES_REGION ? `AWS SES (${env.AWS_SES_REGION})`
    : 'mock (logs only)';

  const lines = [
    '',
    '┌─ Embr API startup environment summary ─────────────────────────────┐',
    check('Database', !!env.DATABASE_URL),
    check('Redis', !!(env.REDIS_URL || env.REDIS_HOST)),
    check('JWT auth', !!(env.JWT_SECRET && env.JWT_REFRESH_SECRET)),
    check('Email', !!(env.SENDGRID_API_KEY || env.AWS_SES_REGION), emailProvider),
    check('Google OAuth', !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)),
    check('Stripe payments', !!env.STRIPE_SECRET_KEY),
    check('S3 uploads', !!(env.AWS_ACCESS_KEY_ID && env.AWS_S3_BUCKET)),
    check('Mux video', !!(env.MUX_TOKEN_ID && env.MUX_TOKEN_SECRET)),
    check('Sentry', !!env.SENTRY_DSN),
    check('App URL', !!env.APP_URL, env.APP_URL || 'http://localhost:3004'), // pragma: allowlist secret
    check('Frontend URL', !!env.FRONTEND_URL, env.FRONTEND_URL || 'http://localhost:3004'), // pragma: allowlist secret
    '└────────────────────────────────────────────────────────────────────┘',
    '',
  ];

  lines.forEach((line) => logger.log(line));

  // In production, escalate missing critical-path integrations to warnings.
  if (isProd) {
    if (!env.SENDGRID_API_KEY && !env.AWS_SES_REGION) {
      logger.warn(
        'No email provider configured (SENDGRID_API_KEY or AWS_SES_REGION). ' +
          'Transactional emails (verification, password reset) will not be delivered.',
      );
    }
    if (!env.SENTRY_DSN) {
      logger.warn(
        'SENTRY_DSN is not set — unhandled errors will not be reported to Sentry.',
      );
    }
    if (!env.STRIPE_SECRET_KEY) {
      logger.warn(
        'STRIPE_SECRET_KEY is not set — payment and payout features will be unavailable.',
      );
    }
  }
}

async function bootstrap() {
  // Fail fast on critical auth misconfigurations before binding the HTTP server.
  // The implementation lives in auth-config.util.ts so it can be unit-tested.
  const { assertAuthConfigSafe } = await import('./config/auth-config.util');
  assertAuthConfigSafe(
    process.env,
    { error: (m) => startupLogger.error(m), warn: (m) => startupLogger.warn(m) },
    (code) => process.exit(code),
  );

  const app = await NestFactory.create(AppModule, {
    bufferLogs: useJsonLogs,
    logger: useJsonLogs ? new JsonLinesLogger() : undefined,
  });

  // Security middleware - relaxed for local development
  if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
  } else {
    // Development: disable CSP to allow localhost cross-port requests
    app.use(helmet({ contentSecurityPolicy: false }));
  }
  app.use(cookieParser());

  // Global prefix for all routes
  app.setGlobalPrefix('api');
  
  // Global validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error on extra properties
      transform: true,           // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert query params to proper types
      },
    }),
  );
  
  // Global exception filter for consistent error responses
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  // CORS configuration
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  if (process.env.NODE_ENV === 'production' && !allowedOrigins) {
    throw new Error('ALLOWED_ORIGINS must be explicitly set in production');
  }
  const origins = (allowedOrigins || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .filter(Boolean);
  // Include web URL from environment if configured
  const webUrl = process.env.WEB_URL || process.env.FRONTEND_URL || '';
  if (webUrl && !origins.includes(webUrl)) origins.push(webUrl);
  // In development, allow all common localhost dev-server ports (3000-3010)
  if (process.env.NODE_ENV !== 'production') {
    for (let port = 3000; port <= 3010; port++) {
      const o = `http://localhost:${port}`;
      if (!origins.includes(o)) origins.push(o);
    }
  }
  app.enableCors({
    origin: origins,
    credentials: true,
  });
  
  const port = process.env.PORT ? Number(process.env.PORT) : 3003;
  const server = await app.listen(port);

  startupLogger.log(`🚀 Embr API running on http://localhost:${port}/api`);

  logStartupSummary(startupLogger);

  // Warn developers explicitly when cookie security is disabled so the
  // setting is never silently absent.  Production startup is already guarded
  // by the Joi schema in env.validation.ts (COOKIE_SECURE=true is required).
  if (process.env.NODE_ENV !== 'production' && process.env.COOKIE_SECURE !== 'true') {
    startupLogger.warn(
      'COOKIE_SECURE is not enabled — auth cookies will be transmitted over HTTP. ' +
        'This is acceptable for local development. ' +
        'Set COOKIE_SECURE=true for any environment that terminates TLS.',
    );
  }

  // Graceful shutdown handling for containerized deployments
  process.on('SIGTERM', async () => {
    startupLogger.log('SIGTERM received, starting graceful shutdown...');
    await app.close();
    server.close(() => {
      startupLogger.log('Server closed. Exiting process.');
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    startupLogger.log('SIGINT received, starting graceful shutdown...');
    await app.close();
    server.close(() => {
      startupLogger.log('Server closed. Exiting process.');
      process.exit(0);
    });
  });
}

bootstrap();

