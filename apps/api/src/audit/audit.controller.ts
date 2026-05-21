import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Op } from 'sequelize';
import { SequelizeService } from '@/database/sequelize.service';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { RequirePermissions } from '@/auth/permissions.decorator';
import { Permission } from '@/auth/permissions.enum';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly db: SequelizeService) {}

  private buildWhere(query: ListAuditLogsQueryDto): Record<string | symbol, unknown> {
    const where: Record<string | symbol, unknown> = {};
    if (query.action) where.action = query.action;
    if (query.entityType) where.entityType = query.entityType;
    if (query.actorUserId) where.actorUserId = query.actorUserId;

    if (query.dateFrom || query.dateTo) {
      const from = query.dateFrom ? new Date(query.dateFrom) : null;
      const to = query.dateTo ? new Date(query.dateTo) : null;
      if (from && to) where.createdAt = { [Op.between]: [from, to] };
      else if (from) where.createdAt = { [Op.gte]: from };
      else if (to) where.createdAt = { [Op.lte]: to };
    }

    if (query.q?.trim()) {
      where[Op.or] = [
        { action: { [Op.like]: `%${query.q.trim()}%` } },
        { entityType: { [Op.like]: `%${query.q.trim()}%` } },
        { entityId: { [Op.like]: `%${query.q.trim()}%` } },
        { ipAddress: { [Op.like]: `%${query.q.trim()}%` } }
      ];
    }
    return where;
  }

  @Get()
  @RequirePermissions(Permission.AUDIT_LOG_VIEW)
  async list(@Query() query: ListAuditLogsQueryDto): Promise<unknown> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const offset = (page - 1) * pageSize;

    const where = this.buildWhere(query);

    const { rows, count } = await this.db.models.AuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset
    });

    return {
      items: rows,
      page,
      pageSize,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize))
    };
  }

  @Get('export.csv')
  @RequirePermissions(Permission.AUDIT_LOG_VIEW)
  async exportCsv(@Query() query: ListAuditLogsQueryDto, @Res() res: Response): Promise<void> {
    const where = this.buildWhere(query);
    const rows = await this.db.models.AuditLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 5000
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.write('createdAt,actorUserId,action,entityType,entityId,ipAddress,userAgent\n');
    for (const row of rows) {
      const csvLine = [
        row.get('createdAt'),
        row.get('actorUserId') ?? '',
        row.get('action') ?? '',
        row.get('entityType') ?? '',
        row.get('entityId') ?? '',
        row.get('ipAddress') ?? '',
        row.get('userAgent') ?? ''
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',');
      res.write(`${csvLine}\n`);
    }
    res.end();
  }
}
