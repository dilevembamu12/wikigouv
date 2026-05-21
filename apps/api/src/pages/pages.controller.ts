import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { Op } from 'sequelize';
import { CurrentUser } from '@/auth/current-user.decorator';
import { AuthenticatedRequestUser } from '@/auth/auth.types';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { Permission } from '@/auth/permissions.enum';
import { RequirePermissions } from '@/auth/permissions.decorator';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { AuditService } from '@/audit/audit.service';
import { SequelizeService } from '@/database/sequelize.service';

type CreatePageDto = {
  title: string;
  slug: string;
  content: string;
  status?: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
};

type UpdatePageDto = {
  status?: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
};

@Controller('pages')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PagesController {
  constructor(
    private readonly db: SequelizeService,
    private readonly audit: AuditService
  ) {}

  @Get()
  @RequirePermissions(Permission.PAGE_READ)
  async list(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string
  ) {
    const page = Math.max(1, Number(pageRaw ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '10') || 10));
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (q) {
      (where as Record<PropertyKey, unknown>)[Op.or] = [
        { title: { [Op.like]: `%${q}%` } },
        { slug: { [Op.like]: `%${q}%` } }
      ];
    }

    const { rows, count } = await this.db.models.Page.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
    return { items: rows, page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) };
  }

  @Post()
  @RequirePermissions(Permission.PAGE_CREATE)
  async create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() payload: CreatePageDto,
    @Req() req: Request
  ) {
    const created = await this.db.models.Page.create({
      id: randomUUID(),
      title: String(payload.title ?? '').slice(0, 200),
      slug: String(payload.slug ?? '').slice(0, 220),
      content: String(payload.content ?? ''),
      status: String(payload.status ?? 'PUBLISHED').slice(0, 20),
      createdById: user.sub
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'PAGE_CREATE',
      entityType: 'Page',
      entityId: String(created.get('id')),
      ...this.audit.fromRequest(req)
    });
    return created;
  }

  @Patch(':id')
  @RequirePermissions(Permission.PAGE_ARCHIVE)
  async updateStatus(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() payload: UpdatePageDto,
    @Req() req: Request
  ) {
    const row = await this.db.models.Page.findByPk(id);
    if (!row) return { ok: false, message: 'Page not found' };
    const status = payload.status ?? 'ARCHIVED';
    await row.update({ status });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'PAGE_UPDATE',
      entityType: 'Page',
      entityId: id,
      metadata: { status },
      ...this.audit.fromRequest(req)
    });
    return row;
  }
}
