import { ApiProperty } from '@nestjs/swagger';
import { AssetResponseDto } from './asset-response.dto';
import type { InheritanceGuidance } from '../../domains/services/inheritance-guidance.service';

/**
 * Response pembuatan aset.
 *
 * Untuk custodyType VAULT: ini SATU-SATUNYA kesempatan klien menerima bagian
 * kunci Eksekutor & Notaris — keduanya tidak pernah disimpan server dan tidak
 * dapat diminta ulang lewat endpoint mana pun.
 *
 * Untuk custodyType GUIDANCE: tidak ada bagian kunci sama sekali; yang diberikan
 * adalah panduan dokumen & langkah resmi bagi ahli waris.
 */
export class CreateAssetResponseDto {
  @ApiProperty({ type: AssetResponseDto })
  asset!: AssetResponseDto;

  @ApiProperty({
    nullable: true,
    description:
      'Bagian kunci untuk Eksekutor (hanya untuk custodyType VAULT). WAJIB disimpan aman ' +
      'di perangkat Pewaris dan diteruskan ke Ahli Waris yang ditunjuk sebagai Eksekutor. ' +
      'Hilang = bagian ini tidak dapat dipulihkan.',
  })
  executorShare!: string | null;

  @ApiProperty({
    nullable: true,
    description:
      'Bagian kunci untuk Notaris (hanya untuk custodyType VAULT). Enkripsi nilai ini dengan ' +
      'public key Notaris (GET /users/notaris/:id/public-key) lalu titipkan via ' +
      'POST /assets/:id/notaris-share. Server tidak pernah menyimpan nilai mentahnya.',
  })
  notarisShare!: string | null;

  @ApiProperty({
    nullable: true,
    description:
      'Panduan dokumen & langkah resmi (hanya untuk custodyType GUIDANCE). ' +
      'Dapat diambil ulang kapan saja via GET /assets/:id/guidance.',
  })
  guidance!: InheritanceGuidance | null;

  @ApiProperty()
  warning!: string;
}
