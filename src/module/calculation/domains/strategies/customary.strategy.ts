import { Injectable } from '@nestjs/common';
import {
  ICalculationStrategy,
  CalculationFamilyMemberInput,
  CalculationOptions,
} from './calculation-strategy.interface';
import { ShareDetailDomain } from '../entities/calculation.entity';
import { CalculationException } from '../exceptions/calculation.exception';

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

      for (const member of familyMembers) {
        const ratioInput = options.customaryRatios.find(
          (r) => r.ahliWarisId === member.ahliWarisId,
        );
        const percentage = ratioInput ? ratioInput.ratioPercentage : 0;
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
    const equalShare = baseUnit / familyMembers.length;
    for (const member of familyMembers) {
      shares.push(
        new ShareDetailDomain(
          member.ahliWarisId,
          member.relationshipDescription,
          'Musyawarah Mufakat (Dibagi Rata)',
          equalShare,
        ),
      );
    }

    return shares;
  }
}
