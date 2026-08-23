import { Injectable } from '@nestjs/common';
import { GenerateMagicLinkDto } from '../dto/generate-magic-link.dto';
import { MessageResponseDto } from '../dto/message-response.dto';
import { randomBytes } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { IWitnessRepository } from '../../../../inheritance/infrastructures/repositories/witness.repository.interface';

@Injectable()
export class GenerateMagicLinkUseCase {
  constructor(
    private readonly witnessRepo: IWitnessRepository,
    // private readonly mailService: IMailService,
  ) {}

  async execute(dto: GenerateMagicLinkDto): Promise<MessageResponseDto> {
    const witness = await this.witnessRepo.findById(dto.entityId);
    if (!witness) {
      throw new NotFoundException('Witness not found');
    }

    if (witness.email !== dto.email) {
      throw new NotFoundException('Data Saksi atau email tidak sesuai');
    }

    // Generate a secure token
    const token = randomBytes(32).toString('hex');

    // Set token and expiration (e.g., 24 hours)
    witness.magicLinkToken = token;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    witness.tokenExpiresAt = expiresAt;

    await this.witnessRepo.save(witness);

    // In a real scenario, you would send an email or SMS containing the link with this token.
    // e.g., await this.mailService.sendMagicLink(witness.email, token);

    return {
      message: 'Magic link has been generated and sent successfully',
    };
  }
}
