import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProposalGroup } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateProposalTypeDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ProposalGroup })
  @IsEnum(ProposalGroup)
  group: ProposalGroup;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  sortOrder?: number;
}
