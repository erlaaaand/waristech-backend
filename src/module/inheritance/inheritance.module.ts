import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InvitationTypeOrmEntity } from './infrastructures/entities/invitation.typeorm-entity';
import { FamilyMemberTypeOrmEntity } from './infrastructures/entities/family-member.typeorm-entity';
import { WitnessTypeOrmEntity } from './infrastructures/entities/witness.typeorm-entity';

// Repositories
import { InvitationRepository } from './infrastructures/repositories/invitation.repository';
import { FamilyMemberRepository } from './infrastructures/repositories/family-member.repository';
import { WitnessRepository } from './infrastructures/repositories/witness.repository';
import { INVITATION_REPOSITORY_TOKEN } from './domains/repositories/invitation.repository.interface';
import { FAMILY_MEMBER_REPOSITORY_TOKEN } from './domains/repositories/family-member.repository.interface';
import { IWitnessRepository } from './infrastructures/repositories/witness.repository.interface';

// Domain Services
import { InvitationCodeService } from './domains/services/invitation-code.service';
import { InheritanceRegistrationService } from './domains/services/inheritance-registration.service';

// Use Cases
import { GenerateInvitationUseCase } from './applications/use-cases/generate-invitation.use-case';
import { ValidateInvitationUseCase } from './applications/use-cases/validate-invitation.use-case';
import { GetMyInvitationsUseCase } from './applications/use-cases/get-my-invitations.use-case';
import { GetFamilyMembersUseCase } from './applications/use-cases/get-family-members.use-case';
import { ConfirmFamilyMemberUseCase } from './applications/use-cases/confirm-family-member.use-case';
import { VerifyFamilyMemberUseCase } from './applications/use-cases/verify-family-member.use-case';
import { SubmitWitnessDecisionUseCase } from './applications/use-cases/submit-witness-decision.use-case';

// Interface
import { InheritanceController } from './interface/http/inheritance.controller';

import { InheritanceOrchestrator } from './applications/orchestrator/inheritance.orchestrator';

const USE_CASES = [
  GenerateInvitationUseCase,
  ValidateInvitationUseCase,
  GetMyInvitationsUseCase,
  GetFamilyMembersUseCase,
  ConfirmFamilyMemberUseCase,
  VerifyFamilyMemberUseCase,
  SubmitWitnessDecisionUseCase,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvitationTypeOrmEntity,
      FamilyMemberTypeOrmEntity,
      WitnessTypeOrmEntity,
    ]),
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
