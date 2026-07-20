import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  create(dto: { name: string }) {
    return this.prisma.department.create({ data: { name: dto.name } });
  }

  update(id: string, dto: { name?: string; isActive?: boolean }) {
    return this.prisma.department.update({ where: { id }, data: dto });
  }
}
