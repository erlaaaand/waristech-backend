import { Module } from '@nestjs/common';
import { VerifyNikUseCase } from './applications/use-cases/verify-nik.use-case';
import { DukcapilSandboxAdapter } from './infrastructures/adapters/dukcapil-sandbox.adapter';
import { EKYC_PROVIDER_TOKEN } from './domains/providers/ekyc.provider.interface';

@Module({
  providers: [
    VerifyNikUseCase,
    {
      provide: EKYC_PROVIDER_TOKEN,
      useClass: DukcapilSandboxAdapter, // Dependency Injection Binding
    },
  ],
  exports: [VerifyNikUseCase],
})
export class EkycModule {}
