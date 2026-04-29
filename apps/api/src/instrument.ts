/**
 * Sentry bootstrap — loaded via `require('./instrument')` from main.ts immediately
 * after dotenv so SENTRY_DSN is available before Nest bootstraps.
 */
import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN?.trim();
const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1);
const sample = Number.isFinite(tracesSampleRate) ? Math.min(1, Math.max(0, tracesSampleRate)) : 0.1;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: dsn ? sample : 0,
});
