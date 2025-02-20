import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: "your-sentry-dsn",
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV
}); 