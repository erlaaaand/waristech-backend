import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { RelationshipType } from '../../domains/entities/family-member.entity';

export class GenerateInvitationDto {
  @ApiProperty({
    description: 'Tipe hubungan kekerabatan Ahli Waris yang diundang.',
    enum: RelationshipType,
    example: RelationshipType.NASAB,
  })
  @IsEnum(RelationshipType)
  @IsNotEmpty()
  relationshipType: RelationshipType = RelationshipType.NASAB;

  @ApiProperty({
    description:
      'Deskripsi hubungan (misal: "Anak kandung", "Cucu dari pihak Ibu").',
    example: 'Anak kandung pertama',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  relationshipDescription: string = '';

  @ApiProperty({
    description:
      'URL dokumen pendukung (wajib untuk RelationshipType.NON_NASAB).',
    example: 'https://storage.waristech.id/docs/surat-wasiat.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  supportingDocumentUrl?: string;
}
