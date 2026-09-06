import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TransformInterceptor } from './module/shared/common/interceptors/transform.interceptor';
import { TimeoutInterceptor } from './module/shared/common/interceptors/timeout.interceptor';
import {
  ThrottlerModule,
  type ThrottlerModuleOptions,
} from '@nestjs/throttler';
import { ResilientThrottlerGuard } from './module/shared/common/guards/resilient-throttler.guard';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { Redis } from 'ioredis';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { MongooseModule } from '@nestjs/mongoose';

// Import Validasi Environment
import { validate } from './module/shared/config/env.validation';

// Import Modul Fitur
import { AuthModule } from './module/identity/auth/auth.module';
import { UserModule } from './module/identity/users/user.module';
import { StorageModule } from './module/shared/storage/storage.module';
import { MailModule } from './module/shared/mail/mail.module';
import { NotificationsModule } from './module/shared/notifications/notifications.module';
import { AuditModule } from './module/shared/audit/audit.module';
import { AuditInterceptor } from './module/shared/audit/interceptors/audit.interceptor';
import { GlobalExceptionFilter } from './module/shared/common/filters/global-exception.filter';
import { LoggingMiddleware } from './module/shared/common/middlewares/logging.middleware';
import { InheritanceModule } from './module/inheritance/inheritance.module';
import { AssetModule } from './module/assets/asset.module';
import { CalculationModule } from './module/calculation/calculation.module';
import { ProofOfLifeModule } from './module/proof-of-life/proof-of-life.module';
import { ComplianceModule } from './module/shared/compliance/compliance.module';

@Module({
  imports: [
    // 1. Konfigurasi Environment (Global)
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env'
          : '.env.development.local',
    }),

    // 2. Konfigurasi Database (TypeORM - MySQL)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        return {
          type: 'mysql',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE'),
          autoLoadEntities: true,
          // SEMENTARA DIUBAH KE TRUE UNTUK SINKRONISASI SCHEMA DI RAILWAY (PRODUCTION)
          // AKAN DIKEMBALIKAN KE FALSE SETELAH DEPLOYMENT SELESAI
          synchronize: true,
          extra: {
            connectionLimit: configService.get<number>('DB_CONNECTION_LIMIT'),
          },
        };
      },
    }),

    // 3. Konfigurasi MongoDB (Audit Trail & Compliance Logs)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/waristech_audit',
        );
        return {
          uri,
          serverSelectionTimeoutMS: 5000,
        };
      },
    }),

    // 4. Konfigurasi Rate Limiting (Throttler / Anti-DoS via Redis)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ThrottlerModuleOptions => {
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD', '');
        const redis: Redis = new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword || undefined,
          lazyConnect: true,
        });

        return {
          storage: new ThrottlerStorageRedisService(redis),
          throttlers: [
            {
              name: 'default',
              ttl: configService.get<number>('THROTTLE_TTL_DEFAULT', 60000),
              limit: configService.get<number>('THROTTLE_LIMIT_DEFAULT', 1000),
            },
            {
              name: 'strict',
              ttl: configService.get<number>('THROTTLE_TTL_STRICT', 60000),
              limit: configService.get<number>('THROTTLE_LIMIT_STRICT', 50),
            },
            {
              name: 'dashboard',
              ttl: configService.get<number>('THROTTLE_TTL_DASHBOARD', 60000),
              limit: configService.get<number>('THROTTLE_LIMIT_DASHBOARD', 500),
            },
          ],
        };
      },
    }),

    // 5. Konfigurasi Caching Global via Redis
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD', '');
        const auth = redisPassword
          ? `:${encodeURIComponent(redisPassword)}@`
          : '';
        return {
          stores: [new KeyvRedis(`redis://${auth}${redisHost}:${redisPort}`)],
          ttl: 60000,
        };
      },
    }),

    // 6. Konfigurasi Event Emitter (Global)
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),

    // 7. Daftarkan Modul Fitur & Shared Aplikasi
    AuditModule,
    AuthModule,
    UserModule,
    StorageModule,
    MailModule,
    NotificationsModule,
    InheritanceModule,
    AssetModule,
    CalculationModule,
    ProofOfLifeModule,
    ComplianceModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ResilientThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
