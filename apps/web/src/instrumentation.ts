type CaptureRequestError = typeof import('@sentry/nextjs').captureRequestError;

export async function register() {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
}

export async function onRequestError(...args: Parameters<CaptureRequestError>) {
  if (process.env.NODE_ENV !== 'production') return;
  const { captureRequestError } = await import('@sentry/nextjs');
  return captureRequestError(...args);
}
