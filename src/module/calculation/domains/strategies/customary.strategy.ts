import { Injectable } from '@nestjs/common';
import {
  ICalculationStrategy,
  CalculationFamilyMemberInput,
  CalculationOptions,
} from './calculation-strategy.interface';
import { ShareDetailDomain } from '../entities/calculation.entity';
import { CalculationException } from '../exceptions/calculation.exception';
import { distributeEqualShares } from '../utils/equal-share.util';

@Injectable()
export class CustomaryStrategy implements ICalculationStrategy {
  calculate(
    baseUnit: number,
    familyMembers: CalculationFamilyMemberInput[],
    options?: CalculationOptions,
  ): ShareDetailDomain[] {
    if (familyMembers.length === 0) return [];

    const shares: ShareDetailDomain[] = [];

    // Jika user mengkustomisasi persentase
    if (options?.customaryRatios && options.customaryRatios.length > 0) {
      // Validasi total persentase
      const totalPercentage = options.customaryRatios.reduce(
        (sum, item) => sum + item.ratioPercentage,
        0,
      );
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new CalculationException(
          'Total persentase pembagian hukum adat (Customary) harus tepat 100%.',
        );
      }

      // Validasi kecocokan 1:1 antara daftar ahli waris aktif dan daftar rasio
      // yang dikirim — mencegah ahli waris yang tidak tercantum di
      // `customaryRatios` diam-diam mendapat 0%, atau rasio "hantu" untuk
      // ahliWarisId yang bukan ahli waris aktif membuat total tampak 100%
      // padahal alokasi riilnya tidak.
      const memberIds = new Set(familyMembers.map((m) => m.ahliWarisId));
      const ratioIds = new Set(
        options.customaryRatios.map((r) => r.ahliWarisId),
      );
      const missingFromRatios = familyMembers.filter(
        (m) => !ratioIds.has(m.ahliWarisId),
      );
      const staleRatios = options.customaryRatios.filter(
        (r) => !memberIds.has(r.ahliWarisId),
      );
      if (missingFromRatios.length > 0 || staleRatios.length > 0) {
        throw new CalculationException(
          'Daftar rasio Customary tidak cocok dengan daftar ahli waris aktif — ' +
            'pastikan setiap ahli waris memiliki tepat satu rasio dan tidak ada rasio untuk ahli waris yang tidak terdaftar.',
        );
      }

      for (const member of familyMembers) {
        const ratioInput = options.customaryRatios.find(
          (r) => r.ahliWarisId === member.ahliWarisId,
        );
        // ratioInput dijamin ada setelah validasi kecocokan di atas.
        const percentage = ratioInput!.ratioPercentage;
        const amount = (baseUnit * percentage) / 100;

        shares.push(
          new ShareDetailDomain(
            member.ahliWarisId,
            member.relationshipDescription,
            `Musyawarah Mufakat (${percentage}%)`,
            amount,
          ),
        );
      }
      return shares;
    }

    // Default: Bagi rata sebagai usulan musyawarah
    const equalShares = distributeEqualShares(baseUnit, familyMembers.length);
    familyMembers.forEach((member, index) => {
      shares.push(
        new ShareDetailDomain(
          member.ahliWarisId,
          member.relationshipDescription,
          'Musyawarah Mufakat (Dibagi Rata)',
          equalShares[index],
        ),
      );
    });

    return shares;
  }
}
