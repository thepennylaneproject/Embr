import * as Joi from 'joi';

/**
 * Joi schema for required environment variables.
 * The application will refuse to start if any of these are missing or invalid.
 * Optional variables use .optional() so they do not block startup.
 */
export const envValidationSchema = Joi.object({
  // Runtime
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3003),

  // Database
  DATABASE_URL: Joi.string().uri().required(),
  DIRECT_URL: Joi.string().uri().optional(),

  // Redis
  REDIS_URL: Joi.string().optional(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().integer().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  // JWT — required; application cannot issue tokens without these
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  // Google OAuth (optional — OAuth routes simply won't work without them)
  GOOGLE_CLIENT_ID: Joi.string().optional().allow(''),
  GOOGLE_CLIENT_SECRET: Joi.string().optional().allow(''),
  GOOGLE_CALLBACK_URL: Joi.string().uri().optional(),

  // Cookie security — must be true in production to prevent cookie hijacking over HTTP.
  // In development/test, defaults to false so local HTTP servers work without certs.
  COOKIE_SECURE: Joi.boolean()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.boolean().valid(true).required().messages({
        'any.only':
          'COOKIE_SECURE must be set to "true" in production to prevent auth-cookie transmission over HTTP.',
        'any.required':
          'COOKIE_SECURE is required in production. Set COOKIE_SECURE=true in your environment.',
      }),
      otherwise: Joi.boolean().default(false),
    }),

  // AWS (optional — S3/SES features degrade gracefully without these)
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: Joi.string().optional().allow(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional().allow(''),
  AWS_S3_BUCKET: Joi.string().optional().allow(''),
  AWS_S3_URL: Joi.string().uri().optional().allow(''),

  // Mux (optional)
  MUX_TOKEN_ID: Joi.string().optional().allow(''),
  MUX_TOKEN_SECRET: Joi.string().optional().allow(''),
  MUX_WEBHOOK_SECRET: Joi.string().optional().allow(''),

  // Stripe (optional)
  STRIPE_SECRET_KEY: Joi.string().optional().allow(''),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional().allow(''),
  PLATFORM_FEE_PERCENTAGE: Joi.number().min(0).max(100).default(10),

  // Email
  SMTP_HOST: Joi.string().default('localhost'),
  SMTP_PORT: Joi.number().integer().default(1025),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().optional().allow(''),
  SMTP_PASSWORD: Joi.string().optional().allow(''),
  EMAIL_FROM: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().email().required(),
      otherwise: Joi.string().optional().allow(''),
    })
    .default('noreply@dev.local'),

  // CORS
  ALLOWED_ORIGINS: Joi.string().default(
    'http://localhost:3000,http://localhost:3004',
  ),

  // Observability (optional)
  SENTRY_DSN: Joi.string().uri().optional().allow(''),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'log', 'debug', 'verbose')
    .default('debug'),
}).options({ allowUnknown: true });
