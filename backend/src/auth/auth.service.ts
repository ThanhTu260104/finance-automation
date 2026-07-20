import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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
}
