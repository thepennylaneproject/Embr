import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
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
    origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').filter(Boolean),
    credentials: true,
  });
  
  const port = process.env.PORT ? Number(process.env.PORT) : 3003;
  await app.listen(port);
  
  console.log(`🚀 Embr API running on http://localhost:${port}/api`);
}

bootstrap();


