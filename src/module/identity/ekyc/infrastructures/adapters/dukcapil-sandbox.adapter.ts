import { Injectable, Logger } from '@nestjs/common';
import type { IEkycProvider } from '../../domains/providers/ekyc.provider.interface';
import { EkycResult } from '../../domains/value-objects/ekyc-result.vo';
import { EkycValidationException } from '../../domains/exceptions/ekyc.exception';

@Injectable()
export class DukcapilSandboxAdapter implements IEkycProvider {
  private readonly logger = new Logger(DukcapilSandboxAdapter.name);

  async verifyNik(nik: string): Promise<EkycResult> {
    this.logger.log(`[SANDBOX] Memvalidasi NIK: ${nik}`);

    // Simulasi delay jaringan API
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Validasi matematis tanggal lahir di NIK (Digit ke 7-12)
    const tglStr = nik.substring(6, 8);
    const blnStr = nik.substring(8, 10);
    const thnStr = nik.substring(10, 12);

    let tgl = parseInt(tglStr, 10);
    const bln = parseInt(blnStr, 10);
    const thn = parseInt(thnStr, 10);

    let jenisKelamin: 'Laki-laki' | 'Perempuan' = 'Laki-laki';

    // Algoritma Dukcapil: KTP Wanita tanggal lahirnya ditambah 40
    if (tgl > 40) {
      jenisKelamin = 'Perempuan';
      tgl -= 40;
    }

    if (tgl < 1 || tgl > 31 || bln < 1 || bln > 12) {
      throw new EkycValidationException(
        'Format tanggal lahir pada NIK tidak valid secara algoritmik.',
      );
    }

    const fullYear = thn > 30 ? 1900 + thn : 2000 + thn;

    return new EkycResult(
      true,
      nik,
      'NIK tervalidasi secara matematis (Mode Sandbox).',
      {
        provinsi: 'Provinsi Kode ' + nik.substring(0, 2),
        tanggalLahir: `${fullYear}-${bln.toString().padStart(2, '0')}-${tgl
          .toString()
          .padStart(2, '0')}`,
        jenisKelamin,
      },
    );
  }
}
