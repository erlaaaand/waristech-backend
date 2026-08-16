import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data: UserResponseDto[] = [];

  @ApiProperty({ example: 42 })
  total: number = 0;

  @ApiProperty({ example: 1 })
  page: number = 1;

  @ApiProperty({ example: 10 })
  limit: number = 10;

  @ApiProperty({ example: 5 })
  totalPages: number = 0;
}
