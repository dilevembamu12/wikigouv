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

type CreateForumTopicDto = {
  title: string;
  content: string;
  status?: 'ACTIVE' | 'MODERATED' | 'ARCHIVED';
};

@Controller('forums/topics')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ForumsController {
  constructor(
    private readonly db: SequelizeService,
    private readonly audit: AuditService
  ) {}

  @Get()
  @RequirePermissions(Permission.FORUM_READ)
  async list(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string
  ) {
    const page = Math.max(1, Number(pageRaw ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '10') || 10));
    const where: WhereOptions = {};

    if (status) where.status = status;
    if (q) where.title = { [Op.like]: `%${q}%` };

    const { rows, count } = await this.db.models.ForumTopic.findAndCountAll({
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
  @RequirePermissions(Permission.FORUM_CREATE)
  async create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() payload: CreateForumTopicDto,
    @Req() req: Request
  ) {
    const created = await this.db.models.ForumTopic.create({
      id: randomUUID(),
      title: String(payload.title ?? '').slice(0, 200),
      content: String(payload.content ?? ''),
      status: String(payload.status ?? 'ACTIVE').slice(0, 20),
      createdById: user.sub
    });

    await this.audit.log({
      actorUserId: user.sub,
      action: 'FORUM_TOPIC_CREATE',
      entityType: 'ForumTopic',
      entityId: String(created.get('id')),
      ...this.audit.fromRequest(req)
    });

    return created;
  }
}

