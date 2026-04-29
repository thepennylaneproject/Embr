import * as Joi from 'joi';

/**
 * Joi schema for API environment variables.
 *
 * Rules:
 *  - Variables marked `.required()` will cause the application to refuse to start.
 *  - Variables marked `.optional()` allow the app to start, but the dependent feature
 *    will be degraded or unavailable (logged at startup by logStartupSummary in main.ts).
 *  - `allowUnknown: true` lets pass-through vars (e.g. DIRECT_URL used only by Prisma CLI)
 *    exist without causing validation errors.
 */
export const envValidationSchema = Joi.object({
  // ─── Runtime ────────────────────────────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3003),

  // ─── URLs ───────────────────────────────────────────────────────────────────
  // APP_URL is used in outgoing email links (password-reset, verify-email, welcome).
  // In production a wrong value will produce broken links; require it explicitly.
  APP_URL: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().uri().required(),
      otherwise: Joi.string().optional().allow(''),
    })
    .default('http://localhost:3004'), // pragma: allowlist secret

  // FRONTEND_URL is used by Stripe Connect OAuth redirect and Google OAuth callback.
  FRONTEND_URL: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().uri().required(),
      otherwise: Joi.string().optional().allow(''),
    })
    .default('http://localhost:3004'), // pragma: allowlist secret

  // ─── Database ───────────────────────────────────────────────────────────────
  DATABASE_URL: Joi.string().uri().required(),
  // DIRECT_URL is only used by the Prisma CLI for migrations (bypasses PgBouncer).
  DIRECT_URL: Joi.string().uri().optional(),

  // ─── Redis ──────────────────────────────────────────────────────────────────
  REDIS_URL: Joi.string().optional().allow(''),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().integer().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
  // TTLs consumed directly by RedisService (seconds)
  REDIS_TTL_SOCKET: Joi.number().integer().min(1).default(3600),
  REDIS_TTL_TYPING: Joi.number().integer().min(1).default(300),

  // ─── Auth bypass control ────────────────────────────────────────────────────
  // AUTH_ENABLED must be true in production.  Setting it to false in production
  // (or any internet-reachable environment) is a critical misconfiguration:
  // every request would share the same logical identity or receive no identity
  // at all, defeating all access-control and audit-log guarantees.
  //
  // For local-only developer stacks that genuinely need auth disabled, also set
  // AUTH_ALLOW_LOCAL_BYPASS=true together with a non-default value for
  // AUTH_BYPASS_SECRET.  The API validates the X-Dev-Bypass-Secret header on
  // every request in that mode to prevent accidental internet exposure.
  AUTH_ENABLED: Joi.boolean()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.boolean().valid(true).required().messages({
        'any.only': 'AUTH_ENABLED must be true in production. Disabling authentication in a production environment is a critical security misconfiguration.',
        'any.required': 'AUTH_ENABLED must be explicitly set to true in production.',
      }),
      otherwise: Joi.boolean().default(true),
    }),
  AUTH_ALLOW_LOCAL_BYPASS: Joi.boolean().default(false),
  AUTH_BYPASS_SECRET: Joi.string()
    .when('AUTH_ALLOW_LOCAL_BYPASS', {
      is: true,
      then: Joi.string().min(32).required().messages({
        'string.min': 'AUTH_BYPASS_SECRET must be at least 32 characters when AUTH_ALLOW_LOCAL_BYPASS is enabled.',
        'any.required': 'AUTH_BYPASS_SECRET is required when AUTH_ALLOW_LOCAL_BYPASS is enabled.',
      }),
      otherwise: Joi.string().optional().allow(''),
    }),

  // ─── JWT ────────────────────────────────────────────────────────────────────
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  // ─── Google OAuth ────────────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID: Joi.string().optional().allow(''),
  GOOGLE_CLIENT_SECRET: Joi.string().optional().allow(''),
  GOOGLE_CALLBACK_URL: Joi.string().uri().optional().allow(''),

  // ─── Cookies ────────────────────────────────────────────────────────────────
  COOKIE_SECURE: Joi.boolean().default(false),

  // ─── CORS ───────────────────────────────────────────────────────────────────
  ALLOWED_ORIGINS: Joi.string().default(
    'http://localhost:3000,http://localhost:3004', // pragma: allowlist secret
  ),

  // ─── Email ──────────────────────────────────────────────────────────────────
  EMAIL_FROM: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().email().required(),
      otherwise: Joi.string().optional().allow(''),
    })
    .default('noreply@dev.local'),
  EMAIL_FROM_NAME: Joi.string().default('Embr'),

  // Exactly one of SENDGRID_API_KEY or AWS_SES_REGION should be set in production
  // to avoid falling back to the mock provider that only logs emails.
  SENDGRID_API_KEY: Joi.string().optional().allow(''),
  AWS_SES_REGION: Joi.string().optional().allow(''),

  // SMTP settings (used when neither SendGrid nor SES is configured)
  SMTP_HOST: Joi.string().default('localhost'),
  SMTP_PORT: Joi.number().integer().default(1025),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().optional().allow(''),
  SMTP_PASSWORD: Joi.string().optional().allow(''),

  // ─── AWS / S3 ───────────────────────────────────────────────────────────────
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: Joi.string().optional().allow(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional().allow(''),
  AWS_S3_BUCKET: Joi.string().optional().allow(''),
  AWS_S3_URL: Joi.string().optional().allow(''),
  AWS_CLOUDFRONT_DOMAIN: Joi.string().optional().allow(''),

  // ─── Mux (video processing) ─────────────────────────────────────────────────
  MUX_TOKEN_ID: Joi.string().optional().allow(''),
  MUX_TOKEN_SECRET: Joi.string().optional().allow(''),
  MUX_WEBHOOK_SECRET: Joi.string().optional().allow(''),

  // ─── Stripe ─────────────────────────────────────────────────────────────────
  STRIPE_SECRET_KEY: Joi.string().optional().allow(''),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional().allow(''),
  PLATFORM_FEE_PERCENTAGE: Joi.number().min(0).max(100).default(10),

  // ─── Messaging rate limits ──────────────────────────────────────────────────
  // These are read directly from process.env by messaging-rate-limits.ts.
  // Declaring them here gives them type-checked defaults and surfaces typos.
  MESSAGING_RATE_LIMIT_ENABLED: Joi.boolean().default(true),
  MESSAGING_RATE_LIMIT_MAX: Joi.number().integer().min(1).default(60),
  MESSAGING_RATE_LIMIT_WINDOW: Joi.number().integer().min(100).default(60000),
  MESSAGING_RATE_LIMIT_BURST: Joi.number().integer().min(1).default(5),
  MESSAGING_RATE_LIMIT_REDIS: Joi.string().valid('true', 'false').optional(),

  // ─── In-memory cache fallback (when Redis errors or is absent) ─────────────
  CACHE_IN_MEMORY_MAX_KEYS: Joi.number().integer().min(1).max(1000000).optional(),

  // ─── Observability ──────────────────────────────────────────────────────────
  SENTRY_DSN: Joi.string().uri().optional().allow(''),
  // Sample rate for Sentry performance traces (0–1) when SENTRY_DSN is set.
  SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).optional(),
  // `json` = one JSON object per line on stdout; anything else = Nest default logger.
  LOG_FORMAT: Joi.string().valid('json', 'pretty').optional(),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'log', 'debug', 'verbose')
    .default('debug'),
}).options({ allowUnknown: true });
