import {
  Injectable,
  Logger,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  IForensicValidator,
  ForensicValidationResult,
} from '../../applications/services/forensic-validator.interface';

/**
 * Interface untuk memetakan respons JSON dari WT-AI FastAPI
 */
interface AiForensicResponse {
  is_valid: boolean;
  message: string;
  visual_validation?: Record<string, unknown> | null;
  text_validation?: Record<string, unknown> | null;
}

/**
 * Real implementation of the Forensic Validator.
 * Calls the Python WT-AI microservice via HTTP.
 */
@Injectable()
export class AiForensicValidatorService
  implements IForensicValidator, OnModuleInit
{
  private readonly logger = new Logger(AiForensicValidatorService.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const aiBaseUrl = this.config.get<string>('WT_AI_BASE_URL');
    if (!aiBaseUrl) {
      this.logger.warn('⚠️ WT_AI_BASE_URL tidak dikonfigurasi di .env!');
      return;
    }

    try {
      this.logger.log(
        `⏳ Mengecek koneksi ke layanan AI Python (${aiBaseUrl})...`,
      );
      const response = await fetch(`${aiBaseUrl}/health`);
      if (response.ok) {
        const data = (await response.json()) as { service?: string };
        this.logger.log(
          `✅ Terhubung ke Layanan AI: ${data.service || 'WT-AI'}`,
        );
      } else {
        this.logger.warn(
          `⚠️ Layanan AI Python memberikan status: ${response.status}`,
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(
        `❌ Gagal terhubung ke Layanan AI Python! Pastikan FastAPI (wt-ai) sedang berjalan. Error: ${errorMessage}`,
      );
    }
  }

  async validateStatement(
    pdfUrl: string,
    dateRange: { from: Date; to: Date },
    pdfPassword?: string,
  ): Promise<ForensicValidationResult> {
    const aiBaseUrl = this.config.get<string>('WT_AI_BASE_URL');
    if (!aiBaseUrl) {
      this.logger.warn(
        'WT_AI_BASE_URL is not defined! Make sure it is configured in .env',
      );
      throw new InternalServerErrorException(
        'AI Forensic Engine URL is not configured.',
      );
    }

    try {
      this.logger.log(
        `[AI-Forensic] Downloading PDF from: ${pdfUrl}... (Expected Range: ${dateRange.from.toISOString()} - ${dateRange.to.toISOString()}) ${pdfPassword ? '[Password Protected]' : ''}`,
      );
      // 1. Download file PDF dari Storage (Supabase/S3/Local)
      const downloadResponse = await fetch(pdfUrl);
      if (!downloadResponse.ok) {
        throw new Error(
          `Failed to download PDF from storage: ${downloadResponse.statusText}`,
        );
      }

      const buffer = await downloadResponse.arrayBuffer();
      const blob = new Blob([buffer], { type: 'application/pdf' });

      // 2. Siapkan form-data untuk dikirim ke WT-AI
      const formData = new FormData();
      formData.append('file', blob, 'statement.pdf');

      this.logger.log(
        `[AI-Forensic] Sending to AI Engine for zero-shot validation...`,
      );
      // 3. Kirim ke WT-AI Endpoint
      const aiResponse = await fetch(
        `${aiBaseUrl}/api/v1/forensics/validate-statement`,
        {
          method: 'POST',
          body: formData,
        },
      );

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`AI Service HTTP ${aiResponse.status}: ${errorText}`);
      }

      // 4. Parsing JSON Response (Sesuai dengan kontrak ForensicResponse dari Pydantic)
      const data = (await aiResponse.json()) as AiForensicResponse;

      return {
        isValid: data.is_valid,
        notes:
          data.message ||
          (data.is_valid
            ? 'Validasi e-Statement berhasil.'
            : 'Dokumen tidak memenuhi kriteria keaslian.'),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `[AI-Forensic] Error during validation: ${errorMessage}`,
        errorStack,
      );
      return {
        isValid: false,
        notes: `Validasi gagal terhubung atau terjadi kesalahan sistem AI: ${errorMessage}`,
      };
    }
  }
}
