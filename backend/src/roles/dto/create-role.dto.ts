import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsBoolean,
  IsIn,
  IsInt,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { ROLE_PERMISSIONS } from '../role-permissions';

export class CreateRoleDto {
  @ApiProperty({ example: 'MANAGER' })
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'Mã vai trò phải viết hoa, chỉ gồm chữ, số và dấu gạch dưới',
  })
  code: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['dashboard.view', 'proposal.view', 'proposal.create'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsIn(ROLE_PERMISSIONS, { each: true })
  permissions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canCreateProposal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canApprove?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
