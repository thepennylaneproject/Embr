const defaultApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api';

export function getApiErrorMessage(error: any, fallback: string) {
  const responseMessage = error?.response?.data?.message;
  if (responseMessage) {
    return responseMessage;
  }

  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error' || !error?.response) {
    return `API unavailable at ${defaultApiUrl}. Start the API server and try again.`;
  }

  return fallback;
}
