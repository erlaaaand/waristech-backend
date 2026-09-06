import { ApiProperty } from '@nestjs/swagger';
import { InvitationStatus } from '../../domains/entities/invitation.entity';
import {
  FamilyMemberStatus,
  RelationshipType,
} from '../../domains/entities/family-member.entity';
import { WitnessStatus } from '../../domains/enums/witness.enum';

export class InvitationResponseDto {
  @ApiProperty() id: string = '';
  @ApiProperty() code: string = '';
  @ApiProperty({
    description:
      'Link siap-bagi yang langsung membuka layar registrasi Ahli Waris ' +
      'dengan kode terisi otomatis.',
  })
  invitationLink: string = '';
  @ApiProperty() pewarisId: string = '';
  @ApiProperty({ enum: InvitationStatus }) status: InvitationStatus =
    InvitationStatus.PENDING;
  @ApiProperty() expiresAt: Date = new Date();
  @ApiProperty({ nullable: true }) usedByAhliWarisId: string | null = null;
  @ApiProperty() createdAt: Date = new Date();
}

export class FamilyMemberResponseDto {
  @ApiProperty() id: string = '';
  @ApiProperty() pewarisId: string = '';
  @ApiProperty() ahliWarisId: string = '';
  @ApiProperty({
    description: 'Nama lengkap akun Ahli Waris terkait.',
    nullable: true,
  })
  ahliWarisName: string | null = null;
  @ApiProperty({ enum: RelationshipType }) relationshipType: RelationshipType =
    RelationshipType.NASAB;
  @ApiProperty() relationshipDescription: string = '';
  @ApiProperty({ enum: FamilyMemberStatus }) status: FamilyMemberStatus =
    FamilyMemberStatus.PENDING_CONFIRMATION;
  @ApiProperty({ nullable: true }) supportingDocumentUrl: string | null = null;
  @ApiProperty({ nullable: true }) verifiedByNotarisId: string | null = null;
  @ApiProperty({ nullable: true }) verifiedAt: Date | null = null;
  @ApiProperty() createdAt: Date = new Date();
}

export class MyFamilyMembershipResponseDto extends FamilyMemberResponseDto {
  @ApiProperty({
    description: 'Nama lengkap Pewaris yang mengundang Anda.',
    nullable: true,
  })
  pewarisName: string | null = null;
}

export class WitnessResponseDto {
  @ApiProperty() id: string = '';
  @ApiProperty() pewarisId: string = '';
  @ApiProperty() name: string = '';
  @ApiProperty() email: string = '';
  @ApiProperty() phone: string = '';
  @ApiProperty({ enum: WitnessStatus }) status: WitnessStatus =
    WitnessStatus.PENDING;
  @ApiProperty() createdAt: Date = new Date();
}

export class DeathVerificationResponseDto {
  @ApiProperty() id: string = '';
  @ApiProperty() pewarisId: string = '';
  @ApiProperty() documentUrl: string = '';
  @ApiProperty({ nullable: true }) verifiedByNotarisId: string | null = null;
  @ApiProperty({ nullable: true }) verifiedAt: Date | null = null;
  @ApiProperty() createdAt: Date = new Date();
}
