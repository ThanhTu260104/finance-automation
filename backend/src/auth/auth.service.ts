import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { randomInt } from 'crypto';
import { appEnv } from '../config/app-env';
import { AccountEmailService } from '../users/account-email.service';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountEmail: AccountEmailService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        department: true,
        departmentMemberships: {
          include: { department: true },
        },
        role: true,
      },
    });

    if (!user?.isActive || !user.passwordHash) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const { passwordHash: _, departmentMemberships, ...safe } = user;
    const departments = departmentMemberships
      .map((membership) => membership.department)
      .filter(Boolean);
    return {
      ...safe,
      departments:
        departments.length > 0
          ? departments
          : user.department
            ? [user.department]
            : [],
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.isActive) return { ok: true };
    const recent = await this.prisma.passwordResetCode.findFirst({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    if (recent) throw new HttpException('Vui lòng chờ 60 giây trước khi yêu cầu mã mới', HttpStatus.TOO_MANY_REQUESTS);
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const record = await this.prisma.passwordResetCode.create({
      data: {
        userId: user.id,
        codeHash: await bcrypt.hash(code, appEnv.bcryptSaltRounds),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });
    const delivery = await this.accountEmail.sendPasswordResetCode({
      email: user.email, fullName: user.fullName, code,
    });
    if (!delivery.sent) {
      await this.prisma.passwordResetCode.delete({ where: { id: record.id } });
      throw new BadRequestException(delivery.error);
    }
    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.isActive) throw new BadRequestException('Mã xác thực không hợp lệ hoặc đã hết hạn');
    const record = await this.prisma.passwordResetCode.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record || !(await bcrypt.compare(dto.code, record.codeHash))) {
      if (record) await this.prisma.passwordResetCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('Mã xác thực không hợp lệ hoặc đã hết hạn');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(dto.newPassword, appEnv.bcryptSaltRounds) },
      }),
      this.prisma.passwordResetCode.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.passwordResetCode.updateMany({
        where: { userId: user.id, id: { not: record.id }, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }
}
