import { Injectable } from '@nestjs/common';
import {
  ICalculationStrategy,
  CalculationFamilyMemberInput,
} from './calculation-strategy.interface';
import { ShareDetailDomain } from '../entities/calculation.entity';
import { distributeEqualShares } from '../utils/equal-share.util';

@Injectable()
export class CivilStrategy implements ICalculationStrategy {
  calculate(
    baseUnit: number,
    familyMembers: CalculationFamilyMemberInput[],
  ): ShareDetailDomain[] {
    if (familyMembers.length === 0) return [];

    const shares: ShareDetailDomain[] = [];

    // KUHPerdata membagi ahli waris ke dalam 4 Golongan.
    // Jika Golongan I (Pasangan & Anak) ada, maka golongan lain tertutup (hijab).
    // Karena kita tidak memiliki flag eksplisit, kita akan mendeteksi dari relationshipDescription.

    let hasGolongan1 = false;
    const golongan1Members: CalculationFamilyMemberInput[] = [];
    const otherMembers: CalculationFamilyMemberInput[] = [];

    const gol1Keywords = ['istri', 'suami', 'anak', 'pasangan'];

    for (const member of familyMembers) {
      const desc = member.relationshipDescription.toLowerCase();
      const isGol1 = gol1Keywords.some((kw) => desc.includes(kw));

      if (isGol1) {
        hasGolongan1 = true;
        golongan1Members.push(member);
      } else {
        otherMembers.push(member);
      }
    }

    // Berdasarkan KUHPerdata Pasal 852: Anak-anak atau keturunannya, beserta suami/istri
    // yang hidup terlama mewarisi bagian yang sama besarnya.
    if (hasGolongan1) {
      const equalShares = distributeEqualShares(
        baseUnit,
        golongan1Members.length,
      );
      golongan1Members.forEach((member, index) => {
        shares.push(
          new ShareDetailDomain(
            member.ahliWarisId,
            member.relationshipDescription,
            `KUHPerdata Gol. I (1/${golongan1Members.length})`,
            equalShares[index],
          ),
        );
      });

      // Anggota selain Golongan 1 terhijab (tidak dapat bagian)
      for (const member of otherMembers) {
        shares.push(
          new ShareDetailDomain(
            member.ahliWarisId,
            member.relationshipDescription,
            'Terhijab oleh Golongan I',
            0,
          ),
        );
      }
    } else {
      // Jika tidak ada Golongan I, seluruh harta jatuh ke Golongan II / sisa ahli waris
      // Dibagi rata sebagai simulasi default KUHPerdata untuk golongan lainnya
      const equalShares = distributeEqualShares(baseUnit, otherMembers.length);
      otherMembers.forEach((member, index) => {
        shares.push(
          new ShareDetailDomain(
            member.ahliWarisId,
            member.relationshipDescription,
            `KUHPerdata Golongan Lanjut (1/${otherMembers.length})`,
            equalShares[index],
          ),
        );
      });
    }

    return shares;
  }
}
