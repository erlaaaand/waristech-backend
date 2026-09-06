import { Inject, Injectable } from '@nestjs/common';
import {
  FAMILY_MEMBER_REPOSITORY_TOKEN,
  type IFamilyMemberRepository,
} from '../../domains/repositories/family-member.repository.interface';
import { FamilyMemberNotFoundException } from '../../domains/exceptions/inheritance.exception';
import { FamilyMemberResponseDto } from '../dto/inheritance-response.dto';

@Injectable()
export class VerifyFamilyMemberUseCase {
  constructor(
    @Inject(FAMILY_MEMBER_REPOSITORY_TOKEN)
    private readonly familyMemberRepo: IFamilyMemberRepository,
  ) {}

  async verify(
    familyMemberId: string,
    notarisId: string,
  ): Promise<FamilyMemberResponseDto> {
    const member = await this.familyMemberRepo.findById(familyMemberId);

    if (!member) {
      throw new FamilyMemberNotFoundException();
    }

    const updated = await this.familyMemberRepo.verify(
      familyMemberId,
      notarisId,
    );

    return this.toResponse(updated);
  }

  async reject(
    familyMemberId: string,
    notarisId: string,
  ): Promise<FamilyMemberResponseDto> {
    const member = await this.familyMemberRepo.findById(familyMemberId);

    if (!member) {
      throw new FamilyMemberNotFoundException();
    }

    const updated = await this.familyMemberRepo.reject(
      familyMemberId,
      notarisId,
    );

    return this.toResponse(updated);
  }

  private toResponse(
    m: InstanceType<
      typeof import('../../domains/entities/family-member.entity').FamilyMemberDomain
    >,
  ): FamilyMemberResponseDto {
    return {
      id: m.id,
      pewarisId: m.pewarisId,
      ahliWarisId: m.ahliWarisId,
      ahliWarisName: null,
      relationshipType: m.relationshipType,
      relationshipDescription: m.relationshipDescription,
      status: m.status,
      supportingDocumentUrl: m.supportingDocumentUrl,
      verifiedByNotarisId: m.verifiedByNotarisId,
      verifiedAt: m.verifiedAt,
      createdAt: m.createdAt,
    };
  }
}
