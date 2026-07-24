import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.department.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({ data: dto });
  }

  update(id: string, dto: Partial<CreateDepartmentDto> & { isActive?: boolean }) {
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { users: true, userDepartments: true, proposals: true } } },
    });
    if (!department) throw new NotFoundException('Không tìm thấy dự án');
    const references = department._count.users + department._count.userDepartments + department._count.proposals;
    if (references > 0) {
      throw new BadRequestException('Dự án đã phát sinh nhân viên hoặc đề xuất. Hãy khóa để giữ lịch sử.');
    }
    await this.prisma.department.delete({ where: { id } });
    return { ok: true };
  }
}
