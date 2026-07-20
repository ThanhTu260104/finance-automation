import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import {
  deriveLegacyRoleFlags,
  normalizeRolePermissions,
} from './role-permissions';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Không tìm thấy vai trò');
    return role;
  }

  async create(dto: CreateRoleDto) {
    const exists = await this.prisma.role.findUnique({
      where: { code: dto.code },
    });
    if (exists) throw new BadRequestException('Mã vai trò đã tồn tại');

    const permissions = normalizeRolePermissions(dto.permissions);
    const legacyFlags = deriveLegacyRoleFlags(permissions);

    return this.prisma.role.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        permissions,
        canCreateProposal:
          dto.canCreateProposal ?? legacyFlags.canCreateProposal,
        canApprove: dto.canApprove ?? legacyFlags.canApprove,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    await this.findOne(id);

    if (dto.isActive === false) {
      const inUse = await this.prisma.user.count({ where: { roleId: id } });
      if (inUse > 0) {
        throw new BadRequestException(
          'Không thể ẩn vai trò đang được gán cho nhân viên',
        );
      }
    }

    const permissions =
      dto.permissions !== undefined
        ? normalizeRolePermissions(dto.permissions)
        : undefined;
    const legacyFlags =
      permissions !== undefined ? deriveLegacyRoleFlags(permissions) : undefined;

    return this.prisma.role.update({
      where: { id },
      data: {
        ...dto,
        ...(permissions !== undefined ? { permissions } : {}),
        ...(legacyFlags
          ? {
              canCreateProposal:
                dto.canCreateProposal ?? legacyFlags.canCreateProposal,
              canApprove: dto.canApprove ?? legacyFlags.canApprove,
            }
          : {}),
      },
    });
  }
}
