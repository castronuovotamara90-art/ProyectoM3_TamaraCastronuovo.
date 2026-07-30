export function isRateLimitError(error) {
  return Boolean(error?.status === 429 || error?.message?.toLowerCase?.().includes('rate limit'));
}

export function getHttpStatus(error) {
  if (typeof error?.status === 'number') return error.status;
  return 500;
}
