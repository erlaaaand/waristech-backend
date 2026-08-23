import { Injectable } from '@nestjs/common';
import {
  ICalculationStrategy,
  CalculationFamilyMemberInput,
} from './calculation-strategy.interface';
import { ShareDetailDomain } from '../entities/calculation.entity';

interface ParsedMember extends CalculationFamilyMemberInput {
  role:
    | 'SUAMI'
    | 'ISTRI'
    | 'AYAH'
    | 'IBU'
    | 'ANAK_LAKI'
    | 'ANAK_PEREMPUAN'
    | 'LAINNYA';
}

@Injectable()
export class FaraidhStrategy implements ICalculationStrategy {
  calculate(
    baseUnit: number,
    familyMembers: CalculationFamilyMemberInput[],
  ): ShareDetailDomain[] {
    if (familyMembers.length === 0) return [];

    // 1. Parsing peran (role) dari deskripsi untuk menentukan ashabul furudh
    const parsedMembers: ParsedMember[] = familyMembers.map((m) => {
      const desc = m.relationshipDescription.toLowerCase();
      let role: ParsedMember['role'] = 'LAINNYA';

      if (desc.includes('suami')) role = 'SUAMI';
      else if (desc.includes('istri')) role = 'ISTRI';
      else if (desc.includes('ayah') || desc.includes('bapak')) role = 'AYAH';
      else if (desc.includes('ibu') || desc.includes('mama')) role = 'IBU';
      else if (
        desc.includes('anak') &&
        (desc.includes('laki') || desc.includes('pria'))
      )
        role = 'ANAK_LAKI';
      else if (
        desc.includes('anak') &&
        (desc.includes('perempuan') || desc.includes('wanita'))
      )
        role = 'ANAK_PEREMPUAN';
      else if (desc.includes('anak')) role = 'ANAK_LAKI'; // Default fallback jika gender anak tidak jelas

      return { ...m, role };
    });

    const hasAnak = parsedMembers.some(
      (m) => m.role === 'ANAK_LAKI' || m.role === 'ANAK_PEREMPUAN',
    );
    const hasAnakLaki = parsedMembers.some((m) => m.role === 'ANAK_LAKI');
    const anakPerempuanCount = parsedMembers.filter(
      (m) => m.role === 'ANAK_PEREMPUAN',
    ).length;

    let remainingAsset = baseUnit;
    const shares: ShareDetailDomain[] = [];
    const asabahMembers: ParsedMember[] = [];

    // 2. Hitung Ashabul Furudh (Yang bagiannya sudah pasti di Al-Quran)
    for (const member of parsedMembers) {
      let portion = 0;
      let ratioStr = '';

      switch (member.role) {
        case 'SUAMI':
          portion = hasAnak ? 1 / 4 : 1 / 2;
          ratioStr = hasAnak ? '1/4 (Ada Anak)' : '1/2 (Tanpa Anak)';
          break;
        case 'ISTRI':
          // Jika istri lebih dari 1, bagian 1/8 atau 1/4 dibagi rata ke semua istri.
          // Di sini diasumsikan porsi tunggal per entitas istri untuk penyederhanaan kompetisi.
          portion = hasAnak ? 1 / 8 : 1 / 4;
          ratioStr = hasAnak ? '1/8 (Ada Anak)' : '1/4 (Tanpa Anak)';
          break;
        case 'AYAH':
          portion = 1 / 6;
          ratioStr = '1/6';
          if (!hasAnakLaki) asabahMembers.push(member); // Ayah juga bisa jadi asabah jika tidak ada anak laki
          break;
        case 'IBU':
          portion = hasAnak ? 1 / 6 : 1 / 3; // Mengabaikan aturan Umariyatain untuk kompleksitas dasar
          ratioStr = hasAnak ? '1/6 (Ada Anak)' : '1/3 (Tanpa Anak)';
          break;
        case 'ANAK_PEREMPUAN':
          if (!hasAnakLaki) {
            if (anakPerempuanCount === 1) {
              portion = 1 / 2;
              ratioStr = '1/2 (Anak Perempuan Tunggal)';
            } else {
              portion = 2 / 3 / anakPerempuanCount;
              ratioStr = `2/3 dibagi ${anakPerempuanCount}`;
            }
          } else {
            // Jika ada anak laki, anak perempuan menjadi Asabah Bil Ghair (Rasio Laki 2 : Pr 1)
            asabahMembers.push(member);
            continue;
          }
          break;
        case 'ANAK_LAKI':
          // Anak Laki-Laki selalu Asabah (Mengambil sisa harta)
          asabahMembers.push(member);
          continue;
        default:
          // Keluarga jauh (Dhawul Arham) terhijab jika ada ahli waris utama
          asabahMembers.push(member);
          continue;
      }

      if (portion > 0) {
        const amount = baseUnit * portion;
        remainingAsset -= amount;
        shares.push(
          new ShareDetailDomain(
            member.ahliWarisId,
            member.relationshipDescription,
            `Faraidh Ashabul Furudh (${ratioStr})`,
            amount,
          ),
        );
      }
    }

    // 3. Hitung Asabah (Penerima Sisa Harta)
    if (remainingAsset > 0 && asabahMembers.length > 0) {
      // Hitung total poin Asabah (Anak Laki = 2 poin, Anak Pr = 1 poin, Lainnya dibagi rata sisa)
      let totalAsabahPoints = 0;

      const asabahWithPoints = asabahMembers.map((m) => {
        let points = 1;
        if (m.role === 'ANAK_LAKI') points = 2;
        else if (m.role === 'ANAK_PEREMPUAN') points = 1;
        totalAsabahPoints += points;
        return { ...m, points };
      });

      // Jika hanya ada ahli waris jauh (Lainnya), mereka mewarisi sisa secara merata
      const pointValue = remainingAsset / totalAsabahPoints;

      for (const member of asabahWithPoints) {
        const amount = pointValue * member.points;
        const ratioStr =
          member.points === 2
            ? 'Asabah (2 Porsi Laki-laki)'
            : member.points === 1 && hasAnakLaki
              ? 'Asabah (1 Porsi Perempuan)'
              : 'Asabah Sisa Harta';

        shares.push(
          new ShareDetailDomain(
            member.ahliWarisId,
            member.relationshipDescription,
            ratioStr,
            amount,
          ),
        );
      }
    } else if (remainingAsset > 0 && asabahMembers.length === 0) {
      // Rad (Pengembalian sisa harta ke Ashabul Furudh selain suami/istri).
      // Untuk MVP, sisa harta akan dibiarkan/dialokasikan ke Baitul Mal (State)
    }

    return shares;
  }
}
