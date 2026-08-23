import { ApiProperty } from '@nestjs/swagger';
import { InvitationStatus } from '../../domains/entities/invitation.entity';
import {
  FamilyMemberStatus,
  RelationshipType,
} from '../../domains/entities/family-member.entity';

export class InvitationResponseDto {
  @ApiProperty() id: string = '';
  @ApiProperty() code: string = '';
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
