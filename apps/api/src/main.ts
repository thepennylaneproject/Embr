// Load environment variables FIRST — before any NestJS module initialization.
// This ensures JWT_SECRET, DATABASE_URL etc. are in process.env when the
// JwtModule / ConfigService are instantiated during the DI bootstrap phase.
import * as dotenv from 'dotenv';
dotenv.config();                          // apps/api/.env (if present)
dotenv.config({ path: '../../.env', override: false }); // monorepo root .env

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/http-exception.filter';

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
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  if (process.env.NODE_ENV === 'production' && !allowedOrigins) {
    throw new Error('ALLOWED_ORIGINS must be explicitly set in production');
  }
  const origins = (allowedOrigins || 'http://localhost:3000,http://localhost:3001,http://localhost:3004')
    .split(',')
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true,
  });
  
  const port = process.env.PORT ? Number(process.env.PORT) : 3003;
  const server = await app.listen(port);

  console.log(`🚀 Embr API running on http://localhost:${port}/api`);

  // Graceful shutdown handling for containerized deployments
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, starting graceful shutdown...');
    await app.close();
    server.close(() => {
      console.log('Server closed. Exiting process.');
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, starting graceful shutdown...');
    await app.close();
    server.close(() => {
      console.log('Server closed. Exiting process.');
      process.exit(0);
    });
  });
}

bootstrap();

