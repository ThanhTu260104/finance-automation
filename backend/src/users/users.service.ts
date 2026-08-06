import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { appEnv } from '../config/app-env';
import { PrismaService } from '../prisma/prisma.service';
import { deriveLegacyRoleFlags } from '../roles/role-permissions';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AccountEmailService } from './account-email.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const userInclude = {
  department: true,
  departmentMemberships: {
    include: { department: true },
  },
  role: true,
} as const;

const AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountEmail: AccountEmailService,
  ) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: userInclude,
      orderBy: { fullName: 'asc' },
    });
    return users.map((user) => this.sanitize(user));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });
    if (!user) throw new NotFoundException('Không tìm thấy nhân viên');
    return this.sanitize(user);
  }

  private async resolveRole(roleId?: string) {
    if (roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: roleId } });
      if (!role?.isActive) {
        throw new BadRequestException('Vai trò không hợp lệ');
      }
      return role;
    }

    const employeeRole = await this.prisma.role.findUnique({
      where: { code: 'EMPLOYEE' },
    });
    if (!employeeRole) {
      throw new BadRequestException('Chưa cấu hình vai trò mặc định');
    }
    return employeeRole;
  }

  private uniqueIds(ids: Array<string | null | undefined>) {
    return Array.from(new Set(ids.filter(Boolean) as string[]));
  }

  private async resolveDepartmentIds(
    departmentIds?: string[],
    departmentId?: string,
  ) {
    const ids = this.uniqueIds(
      departmentIds !== undefined ? departmentIds : [departmentId],
    );
    if (ids.length === 0) return [];

    const found = await this.prisma.department.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException('Dự án không hợp lệ');
    }
    return ids;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new BadRequestException('Email đã tồn tại');

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, appEnv.bcryptSaltRounds)
      : null;
    const role = await this.resolveRole(dto.roleId);
    const legacyFlags = deriveLegacyRoleFlags(role.permissions);
    const departmentIds = await this.resolveDepartmentIds(
      dto.departmentIds,
      dto.departmentId,
    );

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone?.trim() || null,
        passwordHash,
        roleId: role.id,
        departmentId: departmentIds[0] ?? null,
        ...(departmentIds.length
          ? {
              departmentMemberships: {
                create: departmentIds.map((departmentId) => ({
                  departmentId,
                })),
              },
            }
          : {}),
        canCreateProposal: legacyFlags.canCreateProposal,
        canApprove: legacyFlags.canApprove,
        isActive: dto.isActive ?? true,
      },
      include: userInclude,
    });
    if (!dto.sendWelcomeEmail) return this.sanitize(user);

    const delivery = await this.accountEmail.sendWelcomeEmail({
      email: user.email,
      fullName: user.fullName,
      password: dto.password,
    });
    return {
      ...this.sanitize(user),
      welcomeEmailSent: delivery.sent,
      ...(!delivery.sent ? { welcomeEmailError: delivery.error } : {}),
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.findOne(id);
    const data: Record<string, unknown> = { ...dto };
    delete data.canCreateProposal;
    delete data.canApprove;
    delete data.departmentIds;
    delete data.departmentId;
    delete data.sendWelcomeEmail;
    delete data.isActive;
    if (dto.phone !== undefined) {
      data.phone = dto.phone.trim() || null;
    }
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(
        dto.password,
        appEnv.bcryptSaltRounds,
      );
      delete data.password;
    }
    const role = await this.resolveRole(dto.roleId ?? existing.roleId);
    const legacyFlags = deriveLegacyRoleFlags(role.permissions);
    data.roleId = role.id;
    data.canCreateProposal = legacyFlags.canCreateProposal;
    data.canApprove = legacyFlags.canApprove;
    if (dto.departmentIds !== undefined || dto.departmentId !== undefined) {
      const departmentIds = await this.resolveDepartmentIds(
        dto.departmentIds,
        dto.departmentId,
      );
      data.departmentId = departmentIds[0] ?? null;
      data.departmentMemberships = {
        deleteMany: {},
        ...(departmentIds.length
          ? {
              create: departmentIds.map((departmentId) => ({
                departmentId,
              })),
            }
          : {}),
      };
    }
    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: userInclude,
    });
    return this.sanitize(user);
  }

  async uploadAvatar(id: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Chưa chọn ảnh đại diện');
    if (!AVATAR_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP');
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new BadRequestException('Ảnh đại diện tối đa 3 MB');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy nhân viên');

    if (!existsSync(appEnv.avatarUploadDir)) {
      mkdirSync(appEnv.avatarUploadDir, { recursive: true });
    }

    const extension =
      file.mimetype === 'image/png'
        ? '.png'
        : file.mimetype === 'image/webp'
          ? '.webp'
          : '.jpg';
    const storedName = `${randomUUID()}${extension}`;
    writeFileSync(join(appEnv.avatarUploadDir, storedName), file.buffer);

    const avatarUrl = `${appEnv.uploadUrlPrefix}avatars/${storedName}`;
    const updated = await this.prisma.user.update({
      where: { id },
      data: { avatarUrl },
      include: userInclude,
    });

    if (user.avatarUrl?.startsWith(`${appEnv.uploadUrlPrefix}avatars/`)) {
      const oldName = user.avatarUrl.split('/').pop();
      if (oldName) {
        const oldPath = join(appEnv.avatarUploadDir, oldName);
        if (existsSync(oldPath)) unlinkSync(oldPath);
      }
    }

    return this.sanitize(updated);
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    if (!id) throw new BadRequestException('Chưa xác định tài khoản đăng nhập');
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy tài khoản');

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim() || null,
      },
      include: userInclude,
    });
    return this.sanitize(user);
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user?.isActive || !user.passwordHash) {
      throw new BadRequestException('Tài khoản không thể đổi mật khẩu');
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Mật khẩu hiện tại không đúng');
    if (await bcrypt.compare(dto.newPassword, user.passwordHash)) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(
          dto.newPassword,
          appEnv.bcryptSaltRounds,
        ),
      },
    });
    return { ok: true };
  }

  async setStatus(id: string, currentUserId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });
    if (!user) throw new NotFoundException('Không tìm thấy nhân viên');
    if (!isActive && id === currentUserId) {
      throw new BadRequestException('Không thể tự khóa tài khoản đang sử dụng');
    }
    if (!isActive && user.role.code === 'ADMIN') {
      await this.assertAnotherActiveAdmin(id);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      include: userInclude,
    });
    return this.sanitize(updated);
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('Không thể tự xóa tài khoản đang sử dụng');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        role: { select: { code: true } },
        _count: {
          select: {
            proposalsCreated: true,
            workflowSteps: true,
            approvalActions: true,
            participants: true,
            workflowParticipants: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Không tìm thấy nhân viên');
    if (user.role.code === 'ADMIN') {
      await this.assertAnotherActiveAdmin(id);
    }

    const businessReferences = Object.values(user._count).reduce(
      (sum, count) => sum + count,
      0,
    );
    if (businessReferences > 0) {
      throw new BadRequestException(
        `Tài khoản "${user.fullName}" đã phát sinh dữ liệu. Hãy khóa tài khoản để giữ lịch sử.`,
      );
    }

    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  private async assertAnotherActiveAdmin(excludedUserId: string) {
    const activeAdminCount = await this.prisma.user.count({
      where: {
        id: { not: excludedUserId },
        isActive: true,
        role: { code: 'ADMIN' },
      },
    });
    if (activeAdminCount === 0) {
      throw new BadRequestException(
        'Phải giữ lại ít nhất một tài khoản quản trị đang hoạt động',
      );
    }
  }

  private sanitize<
    T extends {
      passwordHash?: string | null;
      department?: { id: string; name: string } | null;
      departmentMemberships?: Array<{
        department?: { id: string; name: string } | null;
      }>;
    },
  >(user: T) {
    const { passwordHash: _, departmentMemberships, ...rest } = user;
    const departments =
      departmentMemberships
        ?.map((membership) => membership.department)
        .filter((department): department is { id: string; name: string } =>
          Boolean(department),
        ) ?? [];
    return {
      ...rest,
      departments:
        departments.length > 0
          ? departments
          : rest.department
            ? [rest.department]
            : [],
    };
  }
}
