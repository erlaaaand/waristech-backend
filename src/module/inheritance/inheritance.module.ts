import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// UserModule aman di-import di sini: ia tidak meng-import modul lain,
// sehingga tidak menimbulkan circular dependency.
import { UserModule } from '../identity/users/user.module';

import { InvitationTypeOrmEntity } from './infrastructures/entities/invitation.typeorm-entity';
import { FamilyMemberTypeOrmEntity } from './infrastructures/entities/family-member.typeorm-entity';
import { WitnessTypeOrmEntity } from './infrastructures/entities/witness.typeorm-entity';
import { DeathVerificationTypeOrmEntity } from './infrastructures/entities/death-verification.typeorm-entity';

// Repositories
import { InvitationRepository } from './infrastructures/repositories/invitation.repository';
import { FamilyMemberRepository } from './infrastructures/repositories/family-member.repository';
import { WitnessRepository } from './infrastructures/repositories/witness.repository';
import { DeathVerificationRepository } from './infrastructures/repositories/death-verification.repository';
import { INVITATION_REPOSITORY_TOKEN } from './domains/repositories/invitation.repository.interface';
import { FAMILY_MEMBER_REPOSITORY_TOKEN } from './domains/repositories/family-member.repository.interface';
import { IWitnessRepository } from './domains/repositories/witness.repository.interface';
import { DEATH_VERIFICATION_REPOSITORY_TOKEN } from './domains/repositories/death-verification.repository.interface';

// Domain Services
import { InvitationCodeService } from './domains/services/invitation-code.service';
import { InheritanceRegistrationService } from './domains/services/inheritance-registration.service';

// Use Cases
import { GenerateInvitationUseCase } from './applications/use-cases/generate-invitation.use-case';
import { ValidateInvitationUseCase } from './applications/use-cases/validate-invitation.use-case';
import { GetMyInvitationsUseCase } from './applications/use-cases/get-my-invitations.use-case';
import { GetFamilyMembersUseCase } from './applications/use-cases/get-family-members.use-case';
import { GetPendingFamilyMembersNotarisUseCase } from './applications/use-cases/get-pending-family-members-notaris.use-case';
import { GetMyFamilyMembershipUseCase } from './applications/use-cases/get-my-family-membership.use-case';
import { ConfirmFamilyMemberUseCase } from './applications/use-cases/confirm-family-member.use-case';
import { VerifyFamilyMemberUseCase } from './applications/use-cases/verify-family-member.use-case';
import { SubmitWitnessDecisionUseCase } from './applications/use-cases/submit-witness-decision.use-case';
import { RegisterWitnessUseCase } from './applications/use-cases/register-witness.use-case';
import { GetMyWitnessesUseCase } from './applications/use-cases/get-my-witnesses.use-case';
import { SubmitDeathCertificateUseCase } from './applications/use-cases/submit-death-certificate.use-case';
import { VerifyDeathCertificateUseCase } from './applications/use-cases/verify-death-certificate.use-case';
import { GetPendingDeathCertificatesNotarisUseCase } from './applications/use-cases/get-pending-death-certificates-notaris.use-case';

// Interface
import { InheritanceController } from './interface/http/inheritance.controller';

import { InheritanceOrchestrator } from './applications/orchestrator/inheritance.orchestrator';

const USE_CASES = [
  GenerateInvitationUseCase,
  ValidateInvitationUseCase,
  GetMyInvitationsUseCase,
  GetFamilyMembersUseCase,
  GetPendingFamilyMembersNotarisUseCase,
  GetMyFamilyMembershipUseCase,
  ConfirmFamilyMemberUseCase,
  VerifyFamilyMemberUseCase,
  SubmitWitnessDecisionUseCase,
  RegisterWitnessUseCase,
  GetMyWitnessesUseCase,
  SubmitDeathCertificateUseCase,
  VerifyDeathCertificateUseCase,
  GetPendingDeathCertificatesNotarisUseCase,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvitationTypeOrmEntity,
      FamilyMemberTypeOrmEntity,
      WitnessTypeOrmEntity,
      DeathVerificationTypeOrmEntity,
    ]),
    UserModule,
  ],
  controllers: [InheritanceController],
  providers: [
    // ── Repositories (Dependency Inversion) ────────────────────────
    {
      provide: INVITATION_REPOSITORY_TOKEN,
      useClass: InvitationRepository,
    },
    {
      provide: FAMILY_MEMBER_REPOSITORY_TOKEN,
      useClass: FamilyMemberRepository,
    },
    {
      provide: IWitnessRepository,
      useClass: WitnessRepository,
    },
    {
      provide: DEATH_VERIFICATION_REPOSITORY_TOKEN,
      useClass: DeathVerificationRepository,
    },

    // ── Domain Services ────────────────────────────────────────────
    InvitationCodeService,
    InheritanceRegistrationService,

    // ── Application Layer ──────────────────────────────────────────
    ...USE_CASES,
    InheritanceOrchestrator,
  ],
  exports: [
    ValidateInvitationUseCase,
    InheritanceRegistrationService,
    INVITATION_REPOSITORY_TOKEN,
    FAMILY_MEMBER_REPOSITORY_TOKEN,
    IWitnessRepository,
  ],
})
export class InheritanceModule {}
