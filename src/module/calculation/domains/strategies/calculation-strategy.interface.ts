import { ShareDetailDomain } from '../entities/calculation.entity';

// Mendefinisikan input minimum yang dibutuhkan mesin kalkulasi dari modul lain
export interface CalculationFamilyMemberInput {
  ahliWarisId: string;
  relationshipDescription: string;
}

export interface CustomaryRatioInput {
  ahliWarisId: string;
  ratioPercentage: number;
}

export interface CalculationOptions {
  customaryRatios?: CustomaryRatioInput[];
}

export const CALCULATION_STRATEGY_FACTORY_TOKEN = Symbol(
  'CALCULATION_STRATEGY_FACTORY_TOKEN',
);

export interface ICalculationStrategy {
  /**
   * Menghitung pembagian warisan berdasarkan algoritma spesifik hukumnya.
   * @param baseUnit Nilai dasar unit persentase (selalu 100).
   * @param familyMembers Daftar anggota keluarga (Ahli Waris) yang sudah dikonfirmasi.
   * @param options Pengaturan tambahan spesifik tiap metode hukum.
   * @returns Daftar rincian porsi pembagian (ShareDetailDomain).
   */
  calculate(
    baseUnit: number,
    familyMembers: CalculationFamilyMemberInput[],
    options?: CalculationOptions,
  ): ShareDetailDomain[];
}
