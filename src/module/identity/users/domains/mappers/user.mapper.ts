// src/users/domains/mappers/user.mapper.ts
import { Injectable } from '@nestjs/common';
import { UserResponseDto } from '../../applications/dto/user-response.dto';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserMapper {
  toResponseDto(entity: UserEntity): UserResponseDto {
    return {
      id: entity.id,
      email: entity.email,
      fullName: entity.fullName,
      avatarUrl: entity.avatarUrl,
      phoneNumber: entity.phoneNumber,
      role: entity.role,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  toResponseDtoList(entities: UserEntity[]): UserResponseDto[] {
    return entities.map((e) => this.toResponseDto(e));
  }
}
