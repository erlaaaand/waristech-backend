import { Injectable, Logger } from '@nestjs/common';
import type {
  IForensicValidator,
  ForensicValidationResult,
} from '../../applications/services/forensic-validator.interface';

/**
 * Mock implementation of the Forensic Validator.
 * In production, this would call a Python ML microservice via HTTP.
 */
@Injectable()
export class MockForensicValidatorService implements IForensicValidator {
  private readonly logger = new Logger(MockForensicValidatorService.name);

  async validateStatement(
    pdfUrl: string,
    dateRange: { from: Date; to: Date },
    pdfPassword?: string,
  ): Promise<ForensicValidationResult> {
    this.logger.log(
      `[MOCK] Validating PDF: ${pdfUrl}, range: ${dateRange.from.toISOString()} - ${dateRange.to.toISOString()}${pdfPassword ? ', password provided' : ''}`,
    );

    // Simulate async validation delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      isValid: true,
      notes:
        'Validasi mock berhasil. Sertifikat digital PDF terverifikasi. Tidak ditemukan anomali transfer.',
    };
  }
}
