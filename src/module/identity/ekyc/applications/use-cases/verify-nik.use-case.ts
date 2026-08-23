import { Inject, Injectable } from '@nestjs/common';
import {
  EKYC_PROVIDER_TOKEN,
  type IEkycProvider,
} from '../../domains/providers/ekyc.provider.interface';
import { EkycResult } from '../../domains/value-objects/ekyc-result.vo';
import { EkycValidationException } from '../../domains/exceptions/ekyc.exception';

@Injectable()
export class VerifyNikUseCase {
  constructor(
    @Inject(EKYC_PROVIDER_TOKEN)
    private readonly ekycProvider: IEkycProvider,
  ) {}

  async execute(nik: string): Promise<EkycResult> {
    if (!nik || nik.trim().length !== 16) {
      throw new EkycValidationException('Panjang NIK harus persis 16 digit.');
    }

    const cleanNik = nik.trim();

    // Validasi pure digit
    if (!/^\d{16}$/.test(cleanNik)) {
      throw new EkycValidationException('NIK hanya boleh berisi angka.');
    }

    return this.ekycProvider.verifyNik(cleanNik);
  }
}
