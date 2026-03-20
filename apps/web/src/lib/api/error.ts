import { copy } from '@/lib/copy';

const defaultApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api';

export function getApiErrorMessage(error: any, fallback: string): string {
  // Use API-provided message first
  const responseMessage = error?.response?.data?.message;
  if (responseMessage) {
    return Array.isArray(responseMessage) ? responseMessage[0] : responseMessage;
  }

  // Network / connectivity errors
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error' || !error?.response) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`API unavailable at ${defaultApiUrl}`, error);
    }
    return copy.errors.networkError;
  }

  // HTTP status-specific actionable messages sourced from copy.ts
  const status: number | undefined = error?.response?.status;
  if (status) {
    if (status === 400) return copy.errors.badRequest;
    if (status === 401) return copy.errors.sessionExpired;
    if (status === 403) return copy.errors.unauthorized;
    if (status === 404) return copy.errors.notFound;
    if (status === 409) return copy.errors.conflictError;
    if (status === 422) return copy.errors.validationFailed;
    if (status === 429) return copy.errors.tooManyAttempts;
    if (status >= 500) return copy.errors.serverError;
  }

  return fallback;
}
