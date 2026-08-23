import { Injectable } from '@nestjs/common';
import { GenerateInvitationDto } from '../dto/generate-invitation.dto';
import {
  FamilyMemberResponseDto,
  InvitationResponseDto,
} from '../dto/inheritance-response.dto';
import { GenerateInvitationUseCase } from '../use-cases/generate-invitation.use-case';
import { GetMyInvitationsUseCase } from '../use-cases/get-my-invitations.use-case';
import { GetFamilyMembersUseCase } from '../use-cases/get-family-members.use-case';
import { ConfirmFamilyMemberUseCase } from '../use-cases/confirm-family-member.use-case';
import { VerifyFamilyMemberUseCase } from '../use-cases/verify-family-member.use-case';
import { SubmitWitnessDecisionUseCase } from '../use-cases/submit-witness-decision.use-case';
import { SubmitWitnessDecisionDto } from '../dto/submit-witness-decision.dto';

@Injectable()
export class InheritanceOrchestrator {
  constructor(
    private readonly generateInvitation: GenerateInvitationUseCase,
    private readonly getMyInvitations: GetMyInvitationsUseCase,
    private readonly getFamilyMembers: GetFamilyMembersUseCase,
    private readonly confirmFamilyMember: ConfirmFamilyMemberUseCase,
    private readonly verifyFamilyMember: VerifyFamilyMemberUseCase,
    private readonly submitWitnessDecision: SubmitWitnessDecisionUseCase,
  ) {}

  generateInvitationCode(
    pewarisId: string,
    dto: GenerateInvitationDto,
  ): Promise<InvitationResponseDto> {
    return this.generateInvitation.execute(pewarisId, dto);
  }

  listInvitations(pewarisId: string): Promise<InvitationResponseDto[]> {
    return this.getMyInvitations.execute(pewarisId);
  }

  listFamilyMembers(pewarisId: string): Promise<FamilyMemberResponseDto[]> {
    return this.getFamilyMembers.execute(pewarisId);
  }

  confirmMember(
    familyMemberId: string,
    pewarisId: string,
  ): Promise<FamilyMemberResponseDto> {
    return this.confirmFamilyMember.execute(familyMemberId, pewarisId);
  }

  verifyMember(
    familyMemberId: string,
    notarisId: string,
  ): Promise<FamilyMemberResponseDto> {
    return this.verifyFamilyMember.verify(familyMemberId, notarisId);
  }

  rejectMember(
    familyMemberId: string,
    notarisId: string,
  ): Promise<FamilyMemberResponseDto> {
    return this.verifyFamilyMember.reject(familyMemberId, notarisId);
  }

  submitDecision(
    dto: SubmitWitnessDecisionDto,
    guestUserId: string,
  ): Promise<{ message: string }> {
    return this.submitWitnessDecision.execute(dto, guestUserId);
  }
}
