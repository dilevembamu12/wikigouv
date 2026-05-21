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

type CreateSupportTicketDto = {
  subject: string;
  message: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
};

type UpdateSupportTicketDto = {
  status?: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  assignedToId?: string | null;
};

@Controller('supports')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SupportsController {
  constructor(
    private readonly db: SequelizeService,
    private readonly audit: AuditService
  ) {}

  @Get()
  @RequirePermissions(Permission.SUPPORT_READ)
  async list(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string
  ) {
    const page = Math.max(1, Number(pageRaw ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '10') || 10));
    const where: WhereOptions = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedToId) where.assignedToId = assignedToId;

    const { rows, count } = await this.db.models.SupportTicket.findAndCountAll({
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

  @Get('agents')
  @RequirePermissions(Permission.SUPPORT_READ)
  async agents() {
    const rows = await this.db.models.UserProfile.findAll({
      where: { status: 'ACTIVE' },
      order: [['fullName', 'ASC']]
    });
    return rows.map((row) => ({
      keycloakUserId: String(row.get('keycloakUserId')),
      fullName: String(row.get('fullName')),
      email: String(row.get('email')),
      department: (row.get('department') as string | null) ?? null
    }));
  }

  @Post()
  @RequirePermissions(Permission.SUPPORT_CREATE)
  async create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() payload: CreateSupportTicketDto,
    @Req() req: Request
  ) {
    const created = await this.db.models.SupportTicket.create({
      id: randomUUID(),
      subject: String(payload.subject ?? '').slice(0, 200),
      message: String(payload.message ?? ''),
      status: 'OPEN',
      priority: String(payload.priority ?? 'MEDIUM').slice(0, 20),
      openedById: user.sub
    });

    await this.audit.log({
      actorUserId: user.sub,
      action: 'SUPPORT_CREATE',
      entityType: 'SupportTicket',
      entityId: String(created.get('id')),
      metadata: { priority: created.get('priority') },
      ...this.audit.fromRequest(req)
    });

    return created;
  }

  @Patch(':id')
  @RequirePermissions(Permission.SUPPORT_UPDATE)
  async update(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() payload: UpdateSupportTicketDto,
    @Req() req: Request
  ) {
    const row = await this.db.models.SupportTicket.findByPk(id);
    if (!row) {
      return { ok: false, message: 'Support ticket not found' };
    }

    const updatePayload: Record<string, string | null> = {};
    if (payload.status) updatePayload.status = payload.status;
    if (payload.priority) updatePayload.priority = payload.priority;
    if (payload.assignedToId !== undefined) updatePayload.assignedToId = payload.assignedToId;

    await row.update(updatePayload);
    await this.audit.log({
      actorUserId: user.sub,
      action: 'SUPPORT_UPDATE',
      entityType: 'SupportTicket',
      entityId: id,
      metadata: updatePayload,
      ...this.audit.fromRequest(req)
    });

    return row;
  }
}
