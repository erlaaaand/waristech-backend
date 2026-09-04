import { ConfigService } from '@nestjs/config';

/**
 * Bangun link undangan Ahli Waris yang siap dibagikan Pewaris (WhatsApp/email
 * manual — sistem tidak mengirim email otomatis untuk undangan keluarga,
 * berbeda dari alur magic-link Saksi). Membuka link ini mengarahkan langsung
 * ke layar registrasi Ahli Waris dengan kode SUDAH TERISI otomatis.
 */
export function buildInvitationLink(
  configService: ConfigService,
  code: string,
): string {
  const baseUrl =
    configService.get<string>('APP_FRONTEND_URL') || 'http://localhost:3000';
  return `${baseUrl}/register/ahli-waris?kode=${encodeURIComponent(code)}`;
}
