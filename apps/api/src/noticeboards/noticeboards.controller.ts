import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { WhereOptions } from 'sequelize';
import { CurrentUser } from '@/auth/current-user.decorator';
import { AuthenticatedRequestUser } from '@/auth/auth.types';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { Permission } from '@/auth/permissions.enum';
import { RequirePermissions } from '@/auth/permissions.decorator';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { AuditService } from '@/audit/audit.service';
import { SequelizeService } from '@/database/sequelize.service';

type CreateNoticeboardDto = {
  title: string;
  message: string;
  audience?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
};

type UpdateNoticeboardDto = {
  status?: 'ACTIVE' | 'ARCHIVED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
};

@Controller('noticeboards')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class NoticeboardsController {
  constructor(
    private readonly db: SequelizeService,
    private readonly audit: AuditService
  ) {}

  @Get()
  @RequirePermissions(Permission.NOTICEBOARD_READ)
  async list(
    @Query('status') status?: string,
    @Query('audience') audience?: string,
    @Query('priority') priority?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string
  ) {
    const page = Math.max(1, Number(pageRaw ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '10') || 10));
    const where: WhereOptions = {};
    if (status) where.status = status;
    if (audience) where.audience = audience;
    if (priority) where.priority = priority;

    const { rows, count } = await this.db.models.Noticeboard.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
    return { items: rows, page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) };
  }

  @Post()
  @RequirePermissions(Permission.NOTICEBOARD_SEND)
  async create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() payload: CreateNoticeboardDto,
    @Req() req: Request
  ) {
    const created = await this.db.models.Noticeboard.create({
      id: randomUUID(),
      title: String(payload.title ?? '').slice(0, 220),
      message: String(payload.message ?? ''),
      audience: String(payload.audience ?? 'ALL').slice(0, 64),
      priority: String(payload.priority ?? 'MEDIUM').slice(0, 20),
      status: 'ACTIVE',
      createdById: user.sub
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'NOTICEBOARD_SEND',
      entityType: 'Noticeboard',
      entityId: String(created.get('id')),
      metadata: { audience: created.get('audience'), priority: created.get('priority') },
      ...this.audit.fromRequest(req)
    });
    return created;
  }

  @Patch(':id')
  @RequirePermissions(Permission.NOTICEBOARD_ARCHIVE)
  async update(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() payload: UpdateNoticeboardDto,
    @Req() req: Request
  ) {
    const row = await this.db.models.Noticeboard.findByPk(id);
    if (!row) return { ok: false, message: 'Noticeboard not found' };

    const updatePayload: Record<string, string> = {};
    if (payload.status) updatePayload.status = payload.status;
    if (payload.priority) updatePayload.priority = payload.priority;
    if (!updatePayload.status && !updatePayload.priority) updatePayload.status = 'ARCHIVED';

    await row.update(updatePayload);
    await this.audit.log({
      actorUserId: user.sub,
      action: 'NOTICEBOARD_UPDATE',
      entityType: 'Noticeboard',
      entityId: id,
      metadata: updatePayload,
      ...this.audit.fromRequest(req)
    });
    return row;
  }
}
