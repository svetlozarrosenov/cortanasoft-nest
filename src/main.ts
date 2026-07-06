import { config } from 'dotenv';
import { existsSync } from 'fs';

// Load .env.local first (if exists), then .env as fallback
// Must run before any module imports that read process.env
if (existsSync('.env.local')) {
  config({ path: '.env.local', override: true });
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const isProduction = process.env.NODE_ENV === 'production';

  // Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.).
  // CSP is left off because this is a JSON/file API, not an HTML app, and a
  // strict CSP adds no protection here. CORP is 'cross-origin' so served
  // assets (e.g. company logos) can still be embedded on the public site.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(cookieParser());

  // Trust proxy headers (X-Forwarded-For) so rate limiting uses real client IPs
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL,
      ].filter(Boolean);

      // Allow requests with no origin (native mobile apps, Postman, etc.).
      // Browsers always send an Origin on cross-origin requests, so this only
      // matches non-browser clients and is not a CSRF vector.
      if (!origin) {
        return callback(null, true);
      }

      // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) only in
      // development. In production this would let any page served from a private
      // IP (guest wifi, compromised IoT, DNS-rebinding) make credentialed calls.
      const isLocalNetwork =
        !isProduction &&
        /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)\d+\.\d+:\d+$/.test(
          origin,
        );

      if (allowedOrigins.includes(origin) || isLocalNetwork) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Global exception filter - logs all errors
  app.useGlobalFilters(new AllExceptionsFilter());

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  // Listen on all network interfaces (0.0.0.0) for local network access
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Server running on http://0.0.0.0:${port}`);
}
bootstrap();
