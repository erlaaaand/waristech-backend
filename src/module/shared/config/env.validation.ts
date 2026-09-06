// src/config/env.validation.ts
import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  // ── Application ─────────────────────────────────────────────
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsUrl(
    { require_tld: false },
    { message: 'APP_BASE_URL harus berupa URL yang valid' },
  )
  @IsNotEmpty({ message: 'APP_BASE_URL wajib diisi' })
  APP_BASE_URL: string = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  // URL frontend (bukan backend) — dipakai membangun link yang diklik
  // pengguna dari email (undangan Ahli Waris, magic link Saksi). Beda dari
  // APP_BASE_URL (URL backend sendiri, dipakai membangun URL file upload).
  @IsUrl(
    { require_tld: false },
    { message: 'APP_FRONTEND_URL harus berupa URL yang valid' },
  )
  @IsOptional()
  APP_FRONTEND_URL: string = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  COOKIE_DOMAIN?: string;

  // ── Database (MySQL) ─────────────────────────────────────────
  @IsString()
  @IsNotEmpty({ message: 'DB_HOST wajib diisi' })
  DB_HOST: string = 'localhost';

  @IsNumber()
  @Min(1)
  @Max(65535)
  DB_PORT: number = 3306;

  @IsString()
  @IsNotEmpty({ message: 'DB_USERNAME wajib diisi' })
  DB_USERNAME: string = 'root';

  @IsString()
  @IsOptional()
  DB_PASSWORD: string = '';

  @IsString()
  @IsNotEmpty({ message: 'DB_DATABASE wajib diisi' })
  DB_DATABASE: string = 'waristech_db';

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  DB_CONNECTION_LIMIT: number = 10;

  // ── JWT ──────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty({ message: 'JWT_SECRET wajib diisi' })
  @MinLength(32, {
    message: 'JWT_SECRET minimal 32 karakter untuk keamanan HS256',
  })
  JWT_SECRET: string = 'your_super_secret_jwt_key_min_32_chars_here!!';

  @IsString()
  @IsNotEmpty({ message: 'JWT_EXPIRES_IN wajib diisi' })
  JWT_EXPIRES_IN: string = '7d';

  @IsString()
  @IsNotEmpty({ message: 'JWT_ISSUER wajib diisi' })
  JWT_ISSUER: string = 'waristech-backend';

  @IsString()
  @IsNotEmpty({ message: 'JWT_AUDIENCE wajib diisi' })
  JWT_AUDIENCE: string = 'waristech-client';

  // ── Storage ──────────────────────────────────────────────────
  @IsString()
  @IsOptional()
  STORAGE_PROVIDER: string = 'local';

  @IsString()
  @IsOptional()
  STORAGE_LOCAL_DIR: string = 'public/uploads'; // Disesuaikan agar bisa disajikan

  // ── Email / SMTP (Gmail Testing) ─────────────────────────────
  @IsString()
  @IsNotEmpty({ message: 'EMAIL_HOST wajib diisi' })
  EMAIL_HOST: string = 'smtp.gmail.com';

  @IsNumber()
  @IsNotEmpty({ message: 'EMAIL_PORT wajib diisi' })
  EMAIL_PORT: number = 587;

  @IsBoolean()
  @IsOptional()
  EMAIL_SECURE: boolean = false;

  @IsString()
  @IsNotEmpty({ message: 'EMAIL_USER wajib diisi' })
  EMAIL_USER: string = 'your_email';

  @IsString()
  @IsNotEmpty({ message: 'EMAIL_PASS wajib diisi' })
  EMAIL_PASS: string = 'your_email_password';

  @IsString()
  @IsOptional()
  EMAIL_FROM_NAME: string = 'WarisTech';

  // ── Throttler ────────────────────────────────────────────────
  @IsNumber()
  @Min(1000)
  @IsOptional()
  THROTTLE_TTL_DEFAULT: number = 60_000;

  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT_DEFAULT: number = 100;

  @IsNumber()
  @Min(1000)
  @IsOptional()
  THROTTLE_TTL_STRICT: number = 60_000;

  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT_STRICT: number = 10;

  @IsNumber()
  @Min(1000)
  @IsOptional()
  THROTTLE_TTL_DASHBOARD: number = 60_000;

  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT_DASHBOARD: number = 500;

  // ── Redis ──────────────────────────────────────────────────
  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  // ── MongoDB (Audit Trail & Compliance Logs) ────────────────
  @IsString()
  @IsOptional()
  MONGODB_URI: string = 'mongodb://localhost:27017/waristech_audit';

  @IsBoolean()
  @IsOptional()
  AUDIT_LOG_ENABLED: boolean = true;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const processedConfig: Record<string, unknown> = { ...config };

  // 1. Auto-map Railway MySQL variables if DB_* are missing or unresolved
  if (
    !processedConfig.DB_HOST ||
    (typeof processedConfig.DB_HOST === 'string' &&
      processedConfig.DB_HOST.includes('${{'))
  ) {
    processedConfig.DB_HOST =
      process.env.MYSQLHOST ||
      process.env.MYSQL_HOST ||
      process.env.DB_HOST ||
      '127.0.0.1';
  }
  if (
    !processedConfig.DB_PORT ||
    (typeof processedConfig.DB_PORT === 'string' &&
      processedConfig.DB_PORT.includes('${{'))
  ) {
    processedConfig.DB_PORT =
      process.env.MYSQLPORT ||
      process.env.MYSQL_PORT ||
      process.env.DB_PORT ||
      3306;
  }
  if (
    !processedConfig.DB_USERNAME ||
    (typeof processedConfig.DB_USERNAME === 'string' &&
      processedConfig.DB_USERNAME.includes('${{'))
  ) {
    processedConfig.DB_USERNAME =
      process.env.MYSQLUSER ||
      process.env.MYSQL_USER ||
      process.env.DB_USERNAME ||
      'root';
  }
  if (
    !processedConfig.DB_PASSWORD ||
    (typeof processedConfig.DB_PASSWORD === 'string' &&
      processedConfig.DB_PASSWORD.includes('${{'))
  ) {
    processedConfig.DB_PASSWORD =
      process.env.MYSQLPASSWORD ||
      process.env.MYSQL_PASSWORD ||
      process.env.DB_PASSWORD ||
      '';
  }
  if (
    !processedConfig.DB_DATABASE ||
    (typeof processedConfig.DB_DATABASE === 'string' &&
      processedConfig.DB_DATABASE.includes('${{'))
  ) {
    processedConfig.DB_DATABASE =
      process.env.MYSQLDATABASE ||
      process.env.MYSQL_DATABASE ||
      process.env.DB_DATABASE ||
      'railway';
  }

  // 2. Auto-map Railway Redis variables
  if (
    !processedConfig.REDIS_HOST ||
    (typeof processedConfig.REDIS_HOST === 'string' &&
      processedConfig.REDIS_HOST.includes('${{'))
  ) {
    processedConfig.REDIS_HOST =
      process.env.REDISHOST || process.env.REDIS_HOST || '127.0.0.1';
  }
  if (
    !processedConfig.REDIS_PORT ||
    (typeof processedConfig.REDIS_PORT === 'string' &&
      processedConfig.REDIS_PORT.includes('${{'))
  ) {
    processedConfig.REDIS_PORT =
      process.env.REDISPORT || process.env.REDIS_PORT || 6379;
  }
  if (
    !processedConfig.REDIS_PASSWORD ||
    (typeof processedConfig.REDIS_PASSWORD === 'string' &&
      processedConfig.REDIS_PASSWORD.includes('${{'))
  ) {
    processedConfig.REDIS_PASSWORD =
      process.env.REDISPASSWORD || process.env.REDIS_PASSWORD || '';
  }

  // 3. Auto-map Railway MongoDB variables
  if (
    !processedConfig.MONGODB_URI ||
    (typeof processedConfig.MONGODB_URI === 'string' &&
      processedConfig.MONGODB_URI.includes('${{'))
  ) {
    processedConfig.MONGODB_URI =
      process.env.MONGO_URL ||
      process.env.MONGODB_URI ||
      'mongodb://127.0.0.1:27017/waristech_audit';
  }

  // 4. Safe URL validation & Railway Public Domain Fallback
  const railwayDomain =
    process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL;
  const isValidUrl = (url?: unknown) => {
    if (typeof url !== 'string' || !url || url.includes('${{')) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  if (!isValidUrl(processedConfig.APP_BASE_URL)) {
    processedConfig.APP_BASE_URL = railwayDomain
      ? `https://${railwayDomain}`
      : 'http://localhost:3000';
  }
  if (!isValidUrl(processedConfig.APP_FRONTEND_URL)) {
    processedConfig.APP_FRONTEND_URL = railwayDomain
      ? `https://${railwayDomain}`
      : 'http://localhost:3000';
  }
  if (
    !processedConfig.CORS_ORIGINS ||
    (typeof processedConfig.CORS_ORIGINS === 'string' &&
      processedConfig.CORS_ORIGINS.includes('${{'))
  ) {
    processedConfig.CORS_ORIGINS = '*';
  }

  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    processedConfig,
    {
      enableImplicitConversion: true,
    },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((err) => Object.values(err.constraints ?? {}).join(', '))
      .join('\n');

    throw new Error(`❌ Environment validation failed:\n${messages}`);
  }

  return validatedConfig;
}
