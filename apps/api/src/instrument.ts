import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN && process.env.NODE_ENV === 'production',
  environment: process.env.NODE_ENV ?? 'development',
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
  ignoreErrors: [
    'UnauthorizedException',
    'ForbiddenException',
    'BadRequestException',
    'NotFoundException',
  ],
});
