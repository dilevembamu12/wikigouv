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

type CreateNotificationDto = {
  title: string;
  message: string;
  audience?: string;
};

type UpdateNotificationDto = {
  status?: 'SENT' | 'ARCHIVED';
};

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class NotificationsController {
  constructor(
    private readonly db: SequelizeService,
    private readonly audit: AuditService
  ) {}

  @Get()
  @RequirePermissions(Permission.NOTIFICATION_READ)
  async list(
    @Query('status') status?: string,
    @Query('audience') audience?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string
  ) {
    const page = Math.max(1, Number(pageRaw ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '10') || 10));
    const where: WhereOptions = {};

    if (status) where.status = status;
    if (audience) where.audience = audience;

    const { rows, count } = await this.db.models.Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    return {
      items: rows,
      page,
      pageSize,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize))
    };
  }

  @Post()
  @RequirePermissions(Permission.NOTIFICATION_SEND)
  async create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() payload: CreateNotificationDto,
    @Req() req: Request
  ) {
    const created = await this.db.models.Notification.create({
      id: randomUUID(),
      title: String(payload.title ?? '').slice(0, 200),
      message: String(payload.message ?? ''),
      audience: String(payload.audience ?? 'ALL').slice(0, 64),
      status: 'SENT',
      createdById: user.sub
    });

    await this.audit.log({
      actorUserId: user.sub,
      action: 'NOTIFICATION_SEND',
      entityType: 'Notification',
      entityId: String(created.get('id')),
      metadata: { audience: created.get('audience') },
      ...this.audit.fromRequest(req)
    });

    return created;
  }

  @Patch(':id')
  @RequirePermissions(Permission.NOTIFICATION_ARCHIVE)
  async update(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() payload: UpdateNotificationDto,
    @Req() req: Request
  ) {
    const row = await this.db.models.Notification.findByPk(id);
    if (!row) {
      return { ok: false, message: 'Notification not found' };
    }
    const nextStatus = payload.status === 'ARCHIVED' ? 'ARCHIVED' : 'SENT';
    await row.update({ status: nextStatus });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'NOTIFICATION_UPDATE',
      entityType: 'Notification',
      entityId: id,
      metadata: { status: nextStatus },
      ...this.audit.fromRequest(req)
    });
    return row;
  }
}
