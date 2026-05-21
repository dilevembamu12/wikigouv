import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { Op, WhereOptions } from 'sequelize';
import { CurrentUser } from '@/auth/current-user.decorator';
import { AuthenticatedRequestUser } from '@/auth/auth.types';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { Permission } from '@/auth/permissions.enum';
import { RequirePermissions } from '@/auth/permissions.decorator';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { AuditService } from '@/audit/audit.service';
import { SequelizeService } from '@/database/sequelize.service';

@Controller('tags')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class TagsController {
  constructor(
    private readonly db: SequelizeService,
    private readonly audit: AuditService
  ) {}

  @Get()
  @RequirePermissions(Permission.TAG_READ)
  async list(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string
  ) {
    const page = Math.max(1, Number(pageRaw ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '10') || 10));
    const where: WhereOptions = {};
    if (status) where.status = status;
    if (q) where.name = { [Op.like]: `%${q}%` };
    const { rows, count } = await this.db.models.Tag.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
    return { items: rows, page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) };
  }

  @Post()
  @RequirePermissions(Permission.TAG_CREATE)
  async create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() payload: { name: string; status?: string },
    @Req() req: Request
  ) {
    const created = await this.db.models.Tag.create({
      id: randomUUID(),
      name: String(payload.name ?? '').slice(0, 120),
      status: String(payload.status ?? 'ACTIVE').slice(0, 20)
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'TAG_CREATE',
      entityType: 'Tag',
      entityId: String(created.get('id')),
      ...this.audit.fromRequest(req)
    });
    return created;
  }
}

