const defaultApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api';

export function getApiErrorMessage(error: any, fallback: string) {
  const responseMessage = error?.response?.data?.message;
  if (responseMessage) {
    return responseMessage;
  }

  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error' || !error?.response) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`API unavailable at ${defaultApiUrl}`, error);
    }
    return 'Unable to connect. Please check your connection and try again.';
  }

  return fallback;
}
