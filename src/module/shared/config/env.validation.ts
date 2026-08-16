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
  DB_DATABASE: string = 'hanifa_elektronik_db';

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
  JWT_ISSUER: string = 'hanifa-elektronik-backend';

  @IsString()
  @IsNotEmpty({ message: 'JWT_AUDIENCE wajib diisi' })
  JWT_AUDIENCE: string = 'hanifa-elektronik-client';

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
  EMAIL_FROM_NAME: string = 'Hanifa Elektronik';

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
  MONGODB_URI: string = 'mongodb://localhost:27017/hanifa_elektronik_audit';

  @IsBoolean()
  @IsOptional()
  AUDIT_LOG_ENABLED: boolean = true;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true, // Akan otomatis mengubah 'false' (string) dari .env menjadi boolean false
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((err) => Object.values(err.constraints ?? {}).join(', '))
      .join('\n');

    throw new Error(`❌ Environment validation failed:\n${messages}`);
  }

  if (
    validatedConfig.NODE_ENV === Environment.Production &&
    (!validatedConfig.CORS_ORIGINS ||
      validatedConfig.CORS_ORIGINS.trim().length === 0)
  ) {
    throw new Error(
      '❌ Environment validation failed:\n' +
        'CORS_ORIGINS wajib diisi saat NODE_ENV=production.',
    );
  }

  return validatedConfig;
}
