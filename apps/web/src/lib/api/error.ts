import { copy } from '@/lib/copy';

const defaultApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api';

/** True when the message already tells the user what to do next (avoid duplicating defaultRecoveryHint). */
function messageImpliesRecoveryInstruction(text: string): boolean {
  const t = text.trim();
  if (t.length > 280) return true;
  return /double-check|try again|refresh|sign in|go back|check your|wait( a moment)?|correct (the )?|contact support|forgot password|different email|use search|use the menu|go home|highlighted fields|permission|navigate|connection|unable to connect|please (check|try|correct|refresh|wait)/i.test(
    t
  );
}

function finalizeErrorMessage(raw: string): string {
  const msg = raw.trim();
  if (messageImpliesRecoveryInstruction(msg)) return msg;
  const hint = copy.errors.defaultRecoveryHint;
  if (msg.endsWith(hint)) return msg;
  return `${msg} ${hint}`;
}

export function getApiErrorMessage(error: any, fallback: string): string {
  // Use API-provided message first
  const responseMessage = error?.response?.data?.message;
  if (responseMessage) {
    const raw = Array.isArray(responseMessage) ? responseMessage[0] : responseMessage;
    return finalizeErrorMessage(String(raw));
  }

  // Network / connectivity errors
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error' || !error?.response) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`API unavailable at ${defaultApiUrl}`, error);
    }
    return finalizeErrorMessage(copy.errors.networkError);
  }

  // HTTP status-specific actionable messages sourced from copy.ts
  const status: number | undefined = error?.response?.status;
  if (status) {
    if (status === 400) return finalizeErrorMessage(copy.errors.badRequest);
    if (status === 401) return finalizeErrorMessage(copy.errors.sessionExpired);
    if (status === 403) return finalizeErrorMessage(copy.errors.unauthorized);
    if (status === 404) return finalizeErrorMessage(copy.errors.notFound);
    if (status === 409) return finalizeErrorMessage(copy.errors.conflictError);
    if (status === 422) return finalizeErrorMessage(copy.errors.validationFailed);
    if (status === 429) return finalizeErrorMessage(copy.errors.tooManyAttempts);
    if (status >= 500) return finalizeErrorMessage(copy.errors.serverError);
  }

  return finalizeErrorMessage(fallback);
}
