// src/main.ts
import dns from 'node:dns';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';

import { doubleCsrf } from 'csrf-csrf';
import type { Request, Response, NextFunction, Application } from 'express';

import { AppModule } from './app.module';

dns.setDefaultResultOrder('ipv4first');

// Type Guard Helper untuk menangkap Error CSRF
interface CsrfError extends Error {
  code: string;
}

function isCsrfError(error: unknown): error is CsrfError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as Record<string, unknown>).code === 'EBADCSRFTOKEN'
  );
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProd = nodeEnv === 'production';

  const requiredSecrets = ['JWT_SECRET', 'COOKIE_SECRET', 'CSRF_SECRET'];

  for (const key of requiredSecrets) {
    const value = configService.get<string>(key);
    if (!value || value.length < 32) {
      logger.error(
        `❌ Env "${key}" belum di-set atau terlalu pendek (min 32 karakter)`,
      );
      process.exit(1);
    }
  }

  // 1. Trust proxy
  if (isProd) {
    app.set('trust proxy', 1);
  }

  // 2. CORS (WAJIB di atas rute lainnya agar Preflight OPTIONS sukses)
  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((o) => o.trim());
  // `flutter run -d chrome/edge` memakai port acak setiap kali dijalankan
  // (kecuali --web-port dipatok manual), dan pengujian via LAN IP (mis. HP
  // fisik atau Edge yang mengakses lewat 192.168.x.x) memakai host berbeda
  // pula. Di development, izinkan origin localhost/127.0.0.1/LAN privat di
  // PORT MANAPUN agar tidak perlu mengejar konfigurasi setiap kali dijalankan
  // ulang. Di production tetap ketat memakai daftar CORS_ORIGINS saja.
  const devOriginAllowed =
    /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/;

  app.enableCors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (seperti dari curl atau mobile app native)
      if (!origin) {
        return callback(null, true);
      }

      // Di production, cek apakah origin ada di daftar ATAU daftar memiliki '*'
      // Di development, izinkan juga pola localhost/LAN
      if (
        corsOrigins.includes('*') ||
        corsOrigins.includes(origin) ||
        (!isProd && devOriginAllowed.test(origin))
      ) {
        callback(null, true); // Merefleksikan origin agar credentials:true berfungsi di browser
      } else {
        callback(
          new Error(
            `CORS: origin "${origin}" tidak diizinkan oleh kebijakan server.`,
          ),
          false,
        );
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Content-Type, Accept, Authorization, X-CSRF-Token, x-client',
  });

  // 3. Global Prefix
  app.setGlobalPrefix('api/v1');

  // 4. Helmet & Compression
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:'],
              connectSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          }
        : false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(compression());

  // 5. Cookie Parser (WAJIB sebelum middleware CSRF)
  app.use(cookieParser(configService.get<string>('COOKIE_SECRET')));

  // 6. Setup CSRF Protection (Double Submit Cookie)
  const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
    getSecret: () =>
      configService.get<string>('CSRF_SECRET') ??
      'default_secret_fallback_value',
    cookieName: 'x-csrf-token',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      domain: isProd
        ? configService.get<string>('COOKIE_DOMAIN') || undefined
        : undefined,
    },
    getCsrfTokenFromRequest: (req: Request) => {
      const token = req.headers['x-csrf-token'];
      return typeof token === 'string' ? token : '';
    },
    getSessionIdentifier: (req: Request) => {
      // Menggunakan token akses sebagai pengenal sesi (stateless)
      const accessToken = req.cookies?.['accessToken'] as unknown;
      return typeof accessToken === 'string' ? accessToken : 'anonymous';
    },
  });

  // Ambil instance Express asli dan deklarasikan tipenya sebagai Application
  const expressApp = app.getHttpAdapter().getInstance() as Application;

  // Daftarkan endpoint CSRF
  expressApp.get('/api/v1/csrf-token', (req: Request, res: Response) => {
    const token = generateCsrfToken(req, res);
    res.json({ csrfToken: token });
  });

  // Terapkan middleware CSRF untuk semua rute NestJS
  // (Otomatis BYPASS jika request menggunakan Authorization: Bearer <token> atau header x-client: mobile untuk Mobile App)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const isMobileClient = req.headers['x-client'] === 'mobile';

    if ((authHeader && authHeader.startsWith('Bearer ')) || isMobileClient) {
      return next();
    }

    doubleCsrfProtection(req, res, next);
  });

  // 7. CSRF Error Handler
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (isCsrfError(err)) {
      res.status(403).json({
        statusCode: 403,
        message:
          'Token CSRF tidak valid atau kedaluwarsa. Silakan refresh halaman.',
        error: 'Forbidden',
      });
    } else {
      // Jika error lain, biarkan filter exception NestJS yang menangani
      next(err);
    }
  });

  // 8. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 9. Swagger Config
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('WarisTech API')
      .setDescription('Dokumentasi REST API WarisTech')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Masukkan token JWT (Access Token) Anda di sini',
          in: 'header',
        },
        'JWT',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // 10. Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Aplikasi berjalan di mode: ${nodeEnv.toUpperCase()}`);
  logger.log(`🚀 Server berjalan di: http://localhost:${port}/api/v1`);
  if (!isProd) {
    logger.log(
      `📚 Dokumentasi Swagger tersedia di: http://localhost:${port}/api/docs`,
    );
  }
}

process.on('unhandledRejection', (reason: unknown) => {
  const logger = new Logger('UnhandledRejection');
  logger.error(
    'Unhandled Promise Rejection',
    reason instanceof Error ? reason.stack : String(reason),
  );
});

bootstrap().catch((error: unknown) => {
  // Kegagalan fatal saat startup (mis. MySQL/MongoDB/Redis tidak terjangkau)
  // sebelumnya hanya tertangkap oleh `unhandledRejection` di atas yang CUMA
  // log tanpa menghentikan proses — dari luar terlihat seperti hang diam-diam
  // setelah serangkaian log retry, bukan kegagalan yang jelas. Di sini proses
  // benar-benar dihentikan dengan pesan tegas & exit code bukan-nol.
  const logger = new Logger('Bootstrap');
  logger.error(
    '❌ Aplikasi GAGAL START. Periksa apakah MySQL, MongoDB, dan Redis sudah ' +
      'berjalan dan dapat dijangkau sesuai konfigurasi .env.',
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
