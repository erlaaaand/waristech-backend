import { Injectable } from '@nestjs/common';
import { GenerateInvitationDto } from '../dto/generate-invitation.dto';
import {
  FamilyMemberResponseDto,
  InvitationResponseDto,
  WitnessResponseDto,
  DeathVerificationResponseDto,
  MyFamilyMembershipResponseDto,
} from '../dto/inheritance-response.dto';
import { GenerateInvitationUseCase } from '../use-cases/generate-invitation.use-case';
import { GetMyInvitationsUseCase } from '../use-cases/get-my-invitations.use-case';
import { GetFamilyMembersUseCase } from '../use-cases/get-family-members.use-case';
import { GetMyFamilyMembershipUseCase } from '../use-cases/get-my-family-membership.use-case';
import { ConfirmFamilyMemberUseCase } from '../use-cases/confirm-family-member.use-case';
import { VerifyFamilyMemberUseCase } from '../use-cases/verify-family-member.use-case';
import { SubmitWitnessDecisionUseCase } from '../use-cases/submit-witness-decision.use-case';
import { SubmitWitnessDecisionDto } from '../dto/submit-witness-decision.dto';
import { RegisterWitnessUseCase } from '../use-cases/register-witness.use-case';
import { RegisterWitnessDto } from '../dto/register-witness.dto';
import { GetMyWitnessesUseCase } from '../use-cases/get-my-witnesses.use-case';
import { SubmitDeathCertificateUseCase } from '../use-cases/submit-death-certificate.use-case';
import { SubmitDeathCertificateDto } from '../dto/submit-death-certificate.dto';
import { VerifyDeathCertificateUseCase } from '../use-cases/verify-death-certificate.use-case';
import { GetPendingDeathCertificatesNotarisUseCase } from '../use-cases/get-pending-death-certificates-notaris.use-case';

@Injectable()
export class InheritanceOrchestrator {
  constructor(
    private readonly generateInvitation: GenerateInvitationUseCase,
    private readonly getMyInvitations: GetMyInvitationsUseCase,
    private readonly getFamilyMembers: GetFamilyMembersUseCase,
    private readonly getMyFamilyMembershipUc: GetMyFamilyMembershipUseCase,
    private readonly confirmFamilyMember: ConfirmFamilyMemberUseCase,
    private readonly verifyFamilyMember: VerifyFamilyMemberUseCase,
    private readonly submitWitnessDecision: SubmitWitnessDecisionUseCase,
    private readonly registerWitnessUc: RegisterWitnessUseCase,
    private readonly getMyWitnessesUc: GetMyWitnessesUseCase,
    private readonly submitDeathCertificateUc: SubmitDeathCertificateUseCase,
    private readonly verifyDeathCertificateUc: VerifyDeathCertificateUseCase,
    private readonly getPendingDeathCertificatesUc: GetPendingDeathCertificatesNotarisUseCase,
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

  getMyFamilyMembership(
    ahliWarisId: string,
  ): Promise<MyFamilyMembershipResponseDto[]> {
    return this.getMyFamilyMembershipUc.execute(ahliWarisId);
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

  registerWitnessForPewaris(
    pewarisId: string,
    dto: RegisterWitnessDto,
  ): Promise<WitnessResponseDto> {
    return this.registerWitnessUc.execute(pewarisId, dto);
  }

  listWitnesses(pewarisId: string): Promise<WitnessResponseDto[]> {
    return this.getMyWitnessesUc.execute(pewarisId);
  }

  submitDeathCertificate(
    submittedByUserId: string,
    dto: SubmitDeathCertificateDto,
  ): Promise<DeathVerificationResponseDto> {
    return this.submitDeathCertificateUc.execute(submittedByUserId, dto);
  }

  listPendingDeathCertificates(): Promise<DeathVerificationResponseDto[]> {
    return this.getPendingDeathCertificatesUc.execute();
  }

  verifyDeathCertificate(
    id: string,
    notarisId: string,
  ): Promise<DeathVerificationResponseDto> {
    return this.verifyDeathCertificateUc.execute(id, notarisId);
  }
}
