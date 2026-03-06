// Load environment variables FIRST — before any NestJS module initialization.
// This ensures JWT_SECRET, DATABASE_URL etc. are in process.env when the
// JwtModule / ConfigService are instantiated during the DI bootstrap phase.
import * as dotenv from 'dotenv';
dotenv.config();                          // apps/api/.env (if present)
dotenv.config({ path: '../../.env', override: false }); // monorepo root .env

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/http-exception.filter';

// ---------------------------------------------------------------------------
// Process-level fatal error handlers
// These must be registered before any async code to catch failures during
// module initialisation and subsequent request processing.
// ---------------------------------------------------------------------------

const startupLogger = new Logger('Bootstrap');

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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middleware
  app.use(helmet());
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
  app.enableCors({
    origin: (
      process.env.ALLOWED_ORIGINS ||
      'http://localhost:3000,http://localhost:3001,http://localhost:3004'
    )
      .split(',')
      .filter(Boolean),
    credentials: true,
  });
  
  const port = process.env.PORT ? Number(process.env.PORT) : 3003;
  const server = await app.listen(port);

  startupLogger.log(`🚀 Embr API running on http://localhost:${port}/api`);

  if (process.env.NODE_ENV === 'production' && !process.env.SENTRY_DSN) {
    startupLogger.warn(
      'SENTRY_DSN is not set — unhandled errors will not be reported to an external sink. ' +
        'Set SENTRY_DSN in your production environment variables.',
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

