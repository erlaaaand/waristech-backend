import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class GenerateMagicLinkDto {
  @IsNotEmpty()
  @IsEmail()
  email: string = '';

  @IsNotEmpty()
  @IsString()
  entityId: string = ''; // ID of the inheritance or asset context
}
