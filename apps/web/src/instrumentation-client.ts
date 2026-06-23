type RouterTransitionStart = typeof import('@sentry/nextjs').captureRouterTransitionStart;

const SENTRY_ENABLED =
  process.env.NODE_ENV === 'production' &&
  Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

if (SENTRY_ENABLED) {
  void import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      enabled: true,
      environment: process.env.NODE_ENV ?? 'production',
      tracesSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      replaysSessionSampleRate: 0.05,
      integrations: [Sentry.replayIntegration()],
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Network request failed',
        'Failed to fetch',
        'ChunkLoadError',
      ],
    });
  });
}

export function onRouterTransitionStart(...args: Parameters<RouterTransitionStart>) {
  if (!SENTRY_ENABLED) return;
  void import('@sentry/nextjs').then(({ captureRouterTransitionStart }) => {
    captureRouterTransitionStart(...args);
  });
}
