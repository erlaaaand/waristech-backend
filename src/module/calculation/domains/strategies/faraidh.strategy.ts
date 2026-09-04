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

interface FardShare {
  member: ParsedMember;
  portion: number; // Fraksi dari total harta (0-1), sebelum penyesuaian Aul/Radd.
  ratioStr: string;
}

// Toleransi pembulatan floating-point saat membandingkan total porsi dengan 1 (100%).
const EPSILON = 1e-9;

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
    const istriMembers = parsedMembers.filter((m) => m.role === 'ISTRI');
    const hasSuami = parsedMembers.some((m) => m.role === 'SUAMI');
    const hasAyah = parsedMembers.some((m) => m.role === 'AYAH');

    // Umariyatain/Gharrawain: pasangan (suami/istri) + Ayah + Ibu, TANPA anak.
    // Bagian Ibu menjadi 1/3 dari SISA harta setelah bagian pasangan diambil,
    // bukan 1/3 dari total harta seperti kasus umum.
    const isUmariyatain =
      !hasAnak && hasAyah && (hasSuami || istriMembers.length > 0);

    const fardShares: FardShare[] = [];
    const asabahMembers: ParsedMember[] = [];

    // 2. Kumpulkan Ashabul Furudh (bagian pasti) sebagai FRAKSI dulu (belum
    // dikonversi ke nominal) — supaya total-nya bisa diperiksa & disesuaikan
    // (Aul) sebelum benar-benar dibagikan.
    for (const member of parsedMembers) {
      switch (member.role) {
        case 'SUAMI': {
          const portion = hasAnak ? 1 / 4 : 1 / 2;
          fardShares.push({
            member,
            portion,
            ratioStr: hasAnak ? '1/4 (Ada Anak)' : '1/2 (Tanpa Anak)',
          });
          break;
        }
        case 'ISTRI': {
          // Bagian 1/8 (ada anak) atau 1/4 (tanpa anak) adalah bagian GABUNGAN
          // seluruh istri, dibagi rata ke tiap istri — bukan porsi penuh per istri.
          const pooled = hasAnak ? 1 / 8 : 1 / 4;
          const portion = pooled / istriMembers.length;
          fardShares.push({
            member,
            portion,
            ratioStr:
              istriMembers.length > 1
                ? `${hasAnak ? '1/8' : '1/4'} dibagi rata ${istriMembers.length} istri`
                : hasAnak
                  ? '1/8 (Ada Anak)'
                  : '1/4 (Tanpa Anak)',
          });
          break;
        }
        case 'AYAH': {
          if (!hasAnak) {
            // Tanpa anak sama sekali: Ayah murni Asabah (mengambil sisa harta),
            // tidak punya jatah pasti terpisah.
            asabahMembers.push(member);
            break;
          }
          fardShares.push({ member, portion: 1 / 6, ratioStr: '1/6' });
          // Ada anak perempuan tapi tidak ada anak laki: selain 1/6 di atas,
          // Ayah JUGA menjadi Asabah Ma'al Ghair atas sisa harta.
          if (!hasAnakLaki) asabahMembers.push(member);
          break;
        }
        case 'IBU': {
          let portion: number;
          let ratioStr: string;
          if (isUmariyatain) {
            const spousePortion = hasSuami ? 1 / 2 : 1 / 4;
            portion = (1 - spousePortion) / 3;
            ratioStr = '1/3 dari sisa setelah bagian pasangan (Umariyatain)';
          } else {
            portion = hasAnak ? 1 / 6 : 1 / 3;
            ratioStr = hasAnak ? '1/6 (Ada Anak)' : '1/3 (Tanpa Anak)';
          }
          fardShares.push({ member, portion, ratioStr });
          break;
        }
        case 'ANAK_PEREMPUAN': {
          if (!hasAnakLaki) {
            if (anakPerempuanCount === 1) {
              fardShares.push({
                member,
                portion: 1 / 2,
                ratioStr: '1/2 (Anak Perempuan Tunggal)',
              });
            } else {
              fardShares.push({
                member,
                portion: 2 / 3 / anakPerempuanCount,
                ratioStr: `2/3 dibagi ${anakPerempuanCount}`,
              });
            }
          } else {
            // Ada anak laki-laki: anak perempuan jadi Asabah Bil Ghair (Laki:Pr = 2:1)
            asabahMembers.push(member);
          }
          break;
        }
        case 'ANAK_LAKI':
          // Anak Laki-Laki selalu Asabah (mengambil sisa harta)
          asabahMembers.push(member);
          break;
        default:
          // Keluarga jauh (Dhawul Arham) — hanya relevan bila tidak ada
          // ahli waris utama; disederhanakan sebagai penerima sisa harta.
          asabahMembers.push(member);
          break;
      }
    }

    // 3. Aul: bila total bagian pasti MELEBIHI 100% (mis. banyak istri + banyak
    // anak perempuan + orang tua, tanpa anak laki yang menyerap kelebihan),
    // seluruh bagian pasti dikurangi proporsional agar totalnya tepat 100%.
    const totalFardPortion = fardShares.reduce((sum, f) => sum + f.portion, 0);
    const isAul = totalFardPortion > 1 + EPSILON;
    const aulFactor = isAul ? 1 / totalFardPortion : 1;

    const shares: ShareDetailDomain[] = fardShares.map(
      (f) =>
        new ShareDetailDomain(
          f.member.ahliWarisId,
          f.member.relationshipDescription,
          isAul
            ? `Faraidh Ashabul Furudh (${f.ratioStr}) [Disesuaikan Aul]`
            : `Faraidh Ashabul Furudh (${f.ratioStr})`,
          baseUnit * f.portion * aulFactor,
        ),
    );

    // Saat Aul terjadi, seluruh harta sudah habis terbagi proporsional —
    // tidak ada sisa untuk Asabah/Radd.
    const remainingAsset = isAul ? 0 : baseUnit * (1 - totalFardPortion);

    // 4. Asabah (penerima sisa harta), hanya relevan bila TIDAK sedang Aul.
    if (remainingAsset > EPSILON && asabahMembers.length > 0) {
      let totalAsabahPoints = 0;
      const asabahWithPoints = asabahMembers.map((m) => {
        const points = m.role === 'ANAK_LAKI' ? 2 : 1;
        totalAsabahPoints += points;
        return { ...m, points };
      });

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
    } else if (remainingAsset > EPSILON && asabahMembers.length === 0) {
      // 5. Radd: tidak ada Asabah — sisa harta dikembalikan secara proporsional
      // ke Ashabul Furudh SELAIN pasangan (suami/istri tidak ikut Radd menurut
      // jumhur ulama). Bila SATU-SATUNYA ahli waris yang ada adalah pasangan
      // (tidak ada kerabat darah lain), sisa diberikan penuh kepadanya —
      // penyederhanaan agar tidak ada bagian harta yang "hilang" tak terbagi.
      const nonSpouseFard = fardShares.filter(
        (f) => f.member.role !== 'SUAMI' && f.member.role !== 'ISTRI',
      );
      const raddPool = nonSpouseFard.length > 0 ? nonSpouseFard : fardShares;
      const raddPoolPortionTotal = raddPool.reduce(
        (sum, f) => sum + f.portion,
        0,
      );

      for (const f of raddPool) {
        const raddShare =
          raddPoolPortionTotal > 0
            ? (remainingAsset * f.portion) / raddPoolPortionTotal
            : remainingAsset / raddPool.length;

        const existingIndex = shares.findIndex(
          (s) => s.ahliWarisId === f.member.ahliWarisId,
        );
        shares[existingIndex] = new ShareDetailDomain(
          f.member.ahliWarisId,
          f.member.relationshipDescription,
          `${shares[existingIndex].ratio} + Radd`,
          shares[existingIndex].calculatedPercentage + raddShare,
        );
      }
    }

    return shares;
  }
}
