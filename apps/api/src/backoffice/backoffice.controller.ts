import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { Op } from 'sequelize';
import { CurrentUser } from '@/auth/current-user.decorator';
import { AuthenticatedRequestUser } from '@/auth/auth.types';
import { Permission } from '@/auth/permissions.enum';
import { RequirePermissions } from '@/auth/permissions.decorator';
import { rolePermissions } from '@/auth/rbac.map';
import { AppRole } from '@/auth/roles.enum';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { AuditService } from '@/audit/audit.service';
import { SequelizeService } from '@/database/sequelize.service';

@Controller('backoffice')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class BackofficeController {
  constructor(
    private readonly db: SequelizeService,
    private readonly audit: AuditService
  ) {}

  @Get('roles')
  @RequirePermissions(Permission.USER_MANAGE)
  roles() {
    return Object.values(AppRole).map((role) => ({ role, permissions: rolePermissions[role] ?? [] }));
  }

  @Get('students')
  @RequirePermissions(Permission.COURSE_READ)
  async students(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('department') department?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string
  ) {
    const page = Math.max(1, Number(pageRaw ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '10') || 10));
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (department) where.department = department;
    if (q) {
      (where as Record<PropertyKey, unknown>)[Op.or] = [
        { fullName: { [Op.like]: `%${q}%` } },
        { email: { [Op.like]: `%${q}%` } }
      ];
    }
    const { rows, count } = await this.db.models.UserProfile.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
    return { items: rows, page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) };
  }

  @Get('quizzes')
  @RequirePermissions(Permission.COURSE_READ)
  async quizzes(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string
  ) {
    const page = Math.max(1, Number(pageRaw ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '10') || 10));
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (q) where.title = { [Op.like]: `%${q}%` };
    const { rows, count } = await this.db.models.Quiz.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
    return { items: rows, page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) };
  }

  @Post('quizzes')
  @RequirePermissions(Permission.QUIZ_CREATE)
  async createQuiz(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() payload: { title: string; passingScore?: number; status?: string; courseId?: string | null },
    @Req() req: Request
  ) {
    const created = await this.db.models.Quiz.create({
      id: randomUUID(),
      title: String(payload.title ?? '').slice(0, 200),
      passingScore: Number(payload.passingScore ?? 70),
      status: String(payload.status ?? 'DRAFT').slice(0, 20),
      courseId: payload.courseId ?? null
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'QUIZ_CREATE_BACKOFFICE',
      entityType: 'Quiz',
      entityId: String(created.get('id')),
      ...this.audit.fromRequest(req)
    });
    return created;
  }

  @Get('report-reasons')
  @RequirePermissions(Permission.AUDIT_LOG_VIEW)
  async reportReasons(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string
  ) {
    const page = Math.max(1, Number(pageRaw ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '10') || 10));
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (q) where.label = { [Op.like]: `%${q}%` };
    const { rows, count } = await this.db.models.ReportReason.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
    return { items: rows, page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) };
  }

  @Post('report-reasons')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  async createReportReason(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() payload: { label: string; status?: string },
    @Req() req: Request
  ) {
    const created = await this.db.models.ReportReason.create({
      id: randomUUID(),
      label: String(payload.label ?? '').slice(0, 200),
      status: String(payload.status ?? 'ACTIVE').slice(0, 20),
      createdById: user.sub
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'REPORT_REASON_CREATE',
      entityType: 'ReportReason',
      entityId: String(created.get('id')),
      ...this.audit.fromRequest(req)
    });
    return created;
  }

  @Patch('report-reasons/:id')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  async updateReportReason(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() payload: { status?: string },
    @Req() req: Request
  ) {
    const row = await this.db.models.ReportReason.findByPk(id);
    if (!row) return { ok: false, message: 'Report reason not found' };
    await row.update({ status: String(payload.status ?? 'ARCHIVED').slice(0, 20) });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'REPORT_REASON_UPDATE',
      entityType: 'ReportReason',
      entityId: id,
      metadata: payload,
      ...this.audit.fromRequest(req)
    });
    return row;
  }

  @Get('settings/:scope')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  async getSettings(@Param('scope') scope: string) {
    const row = await this.db.models.AppSetting.findOne({ where: { settingKey: `settings.${scope}` } });
    if (!row) return {};
    const value = row.get('settingValue');
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    return value;
  }

  @Patch('settings/:scope')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  async updateSettings(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('scope') scope: string,
    @Body() payload: Record<string, unknown>,
    @Req() req: Request
  ) {
    const key = `settings.${scope}`;
    const existing = await this.db.models.AppSetting.findOne({ where: { settingKey: key } });
    if (existing) {
      await existing.update({ settingValue: payload });
    } else {
      await this.db.models.AppSetting.create({ id: randomUUID(), settingKey: key, settingValue: payload });
    }
    await this.audit.log({
      actorUserId: user.sub,
      action: 'SETTINGS_UPDATE',
      entityType: 'AppSetting',
      entityId: key,
      metadata: payload,
      ...this.audit.fromRequest(req)
    });
    return { ok: true };
  }

  @Get('activity/summary')
  @RequirePermissions(Permission.DASHBOARD_VIEW)
  async activitySummary() {
    const [courses, enrollments, attempts, certificates, supports, forums] = await Promise.all([
      this.db.models.Course.count(),
      this.db.models.Enrollment.count(),
      this.db.models.QuizAttempt.count(),
      this.db.models.Certificate.count(),
      this.db.models.SupportTicket.count(),
      this.db.models.ForumTopic.count()
    ]);
    return { courses, enrollments, attempts, certificates, supports, forums };
  }
}
