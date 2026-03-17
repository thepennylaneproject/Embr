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
    return 'Unable to connect. Please check your connection and try again.';
  }

  // HTTP status-specific actionable messages
  const status: number | undefined = error?.response?.status;
  if (status) {
    if (status === 400) return 'Please check your input and try again.';
    if (status === 401) return 'Your session has expired. Please sign in again.';
    if (status === 403) return "You don't have permission to do this.";
    if (status === 404) return "The item you're looking for couldn't be found.";
    if (status === 409) return 'A conflict occurred. Please refresh and try again.';
    if (status === 422) return 'The information provided is invalid. Please check your input.';
    if (status === 429) return 'Too many attempts. Please wait a moment and try again.';
    if (status >= 500) return 'A server error occurred. Please try again in a moment.';
  }

  return fallback;
}
