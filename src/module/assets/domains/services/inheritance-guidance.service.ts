import { Injectable } from '@nestjs/common';
import { AssetType } from '../enums/asset.enum';

export interface InheritanceGuidance {
  /** Ringkasan jalur resmi yang harus ditempuh ahli waris. */
  summary: string;
  /** Dokumen yang perlu disiapkan sebelum mendatangi lembaga terkait. */
  requiredDocuments: string[];
  /** Langkah teknis berurutan. */
  steps: string[];
  /** Dasar hukum / catatan penting. */
  legalBasis: string[];
}

const COMMON_DOCUMENTS = [
  'Akta Kematian Pewaris (asli + fotokopi) dari Dukcapil',
  'Surat Keterangan Waris (SKW) / Penetapan Ahli Waris dari Pengadilan',
  'Kartu Keluarga dan KTP seluruh ahli waris',
  'KTP Pewaris (almarhum)',
  'Surat Kuasa dari ahli waris lain bila diwakilkan',
];

/**
 * Menyediakan panduan dokumen & langkah teknis untuk aset yang kredensialnya
 * TIDAK dititipkan ke sistem (custodyType = GUIDANCE).
 *
 * Ini memenuhi bagian proposal: "Untuk aset yang credential-nya tidak bisa
 * disimpan (misalnya rekening bank resmi), sistem menyediakan panduan dokumen
 * dan langkah teknis yang perlu disiapkan ahli waris untuk proses resmi di
 * institusi terkait."
 */
@Injectable()
export class InheritanceGuidanceService {
  getGuidance(type: AssetType, platform: string): InheritanceGuidance {
    switch (type) {
      case AssetType.REKENING_BANK:
        return {
          summary:
            `Saldo rekening ${platform} dicairkan melalui prosedur resmi bank, bukan dengan ` +
            'kredensial internet banking almarhum. Menggunakan kredensial almarhum setelah ' +
            'kematian melanggar syarat & ketentuan bank dan dapat membatalkan klaim.',
          requiredDocuments: [
            ...COMMON_DOCUMENTS,
            'Buku tabungan / bilyet deposito asli',
            'Formulir klaim ahli waris (disediakan bank)',
          ],
          steps: [
            `Laporkan kematian nasabah ke kantor cabang ${platform} tempat rekening dibuka agar rekening diblokir sementara.`,
            'Ajukan permohonan keterangan saldo sebagai ahli waris sah — hak ini dijamin UU Perbankan Pasal 44A ayat (2).',
            'Lengkapi dan serahkan berkas dokumen di atas ke bagian layanan nasabah.',
            'Tunggu verifikasi internal bank (umumnya 7–30 hari kerja).',
            'Pencairan dilakukan ke rekening ahli waris sesuai porsi pada Surat Keterangan Waris.',
          ],
          legalBasis: [
            'UU No. 10 Tahun 1998 tentang Perbankan, Pasal 44A ayat (2) — hak ahli waris atas keterangan simpanan nasabah yang meninggal dunia.',
            'KUHPerdata Pasal 833 — ahli waris demi hukum memperoleh hak atas harta peninggalan.',
          ],
        };

      case AssetType.ASURANSI_JIWA:
        return {
          summary:
            `Manfaat polis ${platform} dibayarkan kepada penerima manfaat (beneficiary) yang ` +
            'tercantum dalam polis melalui proses klaim resmi, bukan melalui akses akun.',
          requiredDocuments: [
            ...COMMON_DOCUMENTS,
            'Polis asuransi asli',
            'Surat keterangan sebab kematian dari rumah sakit/dokter',
            'Formulir pengajuan klaim dari perusahaan asuransi',
          ],
          steps: [
            `Hubungi ${platform} untuk melaporkan meninggalnya tertanggung, maksimal sesuai batas waktu klaim pada polis (umumnya 30–90 hari).`,
            'Minta formulir klaim manfaat meninggal dunia.',
            'Lengkapi berkas dan ajukan klaim ke kantor cabang atau kanal resmi penanggung.',
            'Ikuti proses investigasi klaim bila diminta penanggung.',
            'Manfaat dibayarkan langsung kepada penerima manfaat yang tercantum di polis.',
          ],
          legalBasis: [
            'Manfaat asuransi jiwa dibayarkan kepada penerima manfaat yang ditunjuk dalam polis dan pada dasarnya tidak masuk boedel waris kecuali penerima manfaat adalah ahli waris.',
          ],
        };

      default:
        return {
          summary:
            `Aset ini dicatat tanpa penitipan kredensial. Ahli waris perlu menempuh prosedur ` +
            `resmi pada ${platform} untuk memperoleh haknya.`,
          requiredDocuments: COMMON_DOCUMENTS,
          steps: [
            `Hubungi layanan resmi ${platform} dan tanyakan prosedur pewarisan/klaim ahli waris.`,
            'Siapkan dokumen kewarisan di atas.',
            'Ajukan permohonan resmi beserta bukti kematian dan bukti kewarisan.',
            'Simpan seluruh bukti korespondensi sebagai lampiran audit trail.',
          ],
          legalBasis: [
            'KUHPerdata Pasal 499, 503, dan 833 — aset bernilai ekonomi merupakan bagian dari harta warisan.',
          ],
        };
    }
  }
}
