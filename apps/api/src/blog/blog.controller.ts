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

@Controller('blog')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class BlogController {
  constructor(
    private readonly db: SequelizeService,
    private readonly audit: AuditService
  ) {}

  @Get('categories')
  @RequirePermissions(Permission.CATEGORY_READ)
  async listCategories(
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
    const { rows, count } = await this.db.models.BlogCategory.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
    return { items: rows, page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) };
  }

  @Post('categories')
  @RequirePermissions(Permission.CATEGORY_CREATE)
  async createCategory(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() payload: { name: string; status?: string },
    @Req() req: Request
  ) {
    const created = await this.db.models.BlogCategory.create({
      id: randomUUID(),
      name: String(payload.name ?? '').slice(0, 120),
      status: String(payload.status ?? 'ACTIVE').slice(0, 20)
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'BLOG_CATEGORY_CREATE',
      entityType: 'BlogCategory',
      entityId: String(created.get('id')),
      ...this.audit.fromRequest(req)
    });
    return created;
  }

  @Get('posts')
  @RequirePermissions(Permission.BLOG_READ)
  async listPosts(
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('q') q?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string
  ) {
    const page = Math.max(1, Number(pageRaw ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '10') || 10));
    const where: WhereOptions = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (q) where.title = { [Op.like]: `%${q}%` };

    const { rows, count } = await this.db.models.Blog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize
    });
    return { items: rows, page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) };
  }

  @Post('posts')
  @RequirePermissions(Permission.BLOG_CREATE)
  async createPost(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() payload: { title: string; content: string; status?: string; categoryId?: string | null },
    @Req() req: Request
  ) {
    const created = await this.db.models.Blog.create({
      id: randomUUID(),
      title: String(payload.title ?? '').slice(0, 200),
      content: String(payload.content ?? ''),
      status: String(payload.status ?? 'PUBLISHED').slice(0, 20),
      categoryId: payload.categoryId ?? null,
      createdById: user.sub
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'BLOG_POST_CREATE',
      entityType: 'Blog',
      entityId: String(created.get('id')),
      ...this.audit.fromRequest(req)
    });
    return created;
  }
}

