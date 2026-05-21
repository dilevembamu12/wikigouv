import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
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
import { AdminService } from './admin.service';
import { AdminListQueryDto } from './dto/admin-list-query.dto';
import { CreateCourseExtraDto } from './dto/create-course-extra.dto';
import { UpdateCourseExtraDto } from './dto/update-course-extra.dto';

type RowLike = { get: (key: string) => unknown };

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly db: SequelizeService,
    private readonly audit: AuditService
  ) {}

  private slugify(input: string): string {
    const normalized = input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized || `course-${Date.now()}`;
  }

  private normalizePage(query: AdminListQueryDto) {
    const page = Math.max(1, Number(query.page ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? '10') || 10));
    const offset = (page - 1) * pageSize;
    return { page, pageSize, offset };
  }

  private async ensureUniqueCourseSlug(base: string): Promise<string> {
    const normalizedBase = this.slugify(base).slice(0, 180);
    let candidate = normalizedBase || `course-${Date.now()}`;
    let seq = 2;
    // Keep querying until we find a free slug
    // (small loop, indexed unique column)
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.db.models.Course.findOne({
        where: { slug: candidate },
        attributes: ['id']
      });
      if (!existing) return candidate;
      const suffix = `-${seq}`;
      candidate = `${normalizedBase.slice(0, Math.max(1, 200 - suffix.length))}${suffix}`;
      seq += 1;
    }
  }

  private async ensureUniqueCourseSlugExcept(courseId: string, base: string): Promise<string> {
    const normalizedBase = this.slugify(base).slice(0, 180);
    let candidate = normalizedBase || `course-${Date.now()}`;
    let seq = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.db.models.Course.findOne({
        where: { slug: candidate },
        attributes: ['id']
      });
      if (!existing || String(existing.get('id')) === courseId) return candidate;
      const suffix = `-${seq}`;
      candidate = `${normalizedBase.slice(0, Math.max(1, 200 - suffix.length))}${suffix}`;
      seq += 1;
    }
  }

  private async getAppJson<T>(key: string, fallback: T): Promise<T> {
    const row = await this.db.models.AppSetting.findOne({ where: { key } });
    if (!row) return fallback;
    const raw = String(row.get('value') ?? '').trim();
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private async setAppJson(key: string, value: unknown) {
    const raw = JSON.stringify(value);
    const row = await this.db.models.AppSetting.findOne({ where: { key } });
    if (row) {
      await row.update({ value: raw });
      return;
    }
    await this.db.models.AppSetting.create({ id: randomUUID(), key, value: raw });
  }

  @Get('dashboard/summary')
  @RequirePermissions(Permission.DASHBOARD_VIEW)
  dashboardSummary() {
    return this.adminService.dashboardSummary();
  }

  @Get('education/courses')
  @RequirePermissions(Permission.COURSE_READ)
  educationCourses(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('Course', query, { searchColumns: ['title', 'description'] });
  }

  @Get('education/categories')
  @RequirePermissions(Permission.CATEGORY_READ)
  async educationCategories(@Query() query: AdminListQueryDto) {
    const { page, pageSize, offset } = this.normalizePage(query);
    const q = String(query.q ?? '').trim();
    const status = String(query.status ?? '').trim().toUpperCase();

    const where: Record<string, unknown> = { parentId: null };
    if (q) where.title = { [Op.like]: `%${q}%` };
    if (status) where.status = status;

    const result = await this.db.models.Category.findAndCountAll({
      where,
      order: [['order', 'ASC'], ['createdAt', 'DESC']],
      offset,
      limit: pageSize
    });

    const categoryIds = result.rows.map((row) => String(row.get('id')));
    const subCountsRaw = await this.db.models.Category.findAll({
      attributes: ['parentId', [this.db.sequelize.fn('COUNT', this.db.sequelize.col('id')), 'count']],
      where: { parentId: { [Op.in]: categoryIds } },
      group: ['parentId'],
      raw: true
    });
    const subCounts = subCountsRaw as unknown as Array<{ parentId: string; count: number }>;
    const subCountMap = new Map(subCounts.map((row) => [String(row.parentId), Number(row.count)]));

    const allCategoryIdsRaw = await this.db.models.Category.findAll({
      attributes: ['id', 'parentId'],
      where: {
        [Op.or]: [{ id: { [Op.in]: categoryIds } }, { parentId: { [Op.in]: categoryIds } }]
      },
      raw: true
    });
    const allCategoryIds = allCategoryIdsRaw as unknown as Array<{ id: string; parentId?: string }>;
    const relationMap = new Map<string, string[]>();
    categoryIds.forEach((id) => relationMap.set(id, [id]));
    allCategoryIds.forEach((row: { id: string; parentId?: string }) => {
      if (row.parentId && relationMap.has(String(row.parentId))) {
        relationMap.get(String(row.parentId))?.push(String(row.id));
      }
    });

    const extrasRaw = await this.db.models.CourseExtra.findAll({
      attributes: ['type', 'payload'],
      where: { type: { [Op.in]: ['chapter', 'text_lesson', 'file', 'interactive_file'] } },
      raw: true
    });
    const extras = extrasRaw as unknown as Array<{
      type: string;
      payload?: { category_id?: string; teacher_id?: string; instructor_id?: string; user_id?: string };
    }>;

    const items = result.rows.map((row) => {
      const id = String(row.get('id'));
      const categoryScope = relationMap.get(id) ?? [id];
      const coursesSet = new Set<string>();
      const instructorsSet = new Set<string>();

      extras.forEach((extra: { type: string; payload?: { category_id?: string; teacher_id?: string; instructor_id?: string; user_id?: string } }) => {
        const p = extra.payload ?? {};
        const cId = String(p.category_id ?? '');
        if (cId && categoryScope.includes(cId)) {
          const pseudoCourseId = `${extra.type}:${cId}`;
          coursesSet.add(pseudoCourseId);
          const instructor = String(p.teacher_id ?? p.instructor_id ?? p.user_id ?? '');
          if (instructor) instructorsSet.add(instructor);
        }
      });

      return {
        id,
        parentId: row.get('parentId'),
        title: row.get('title'),
        slug: row.get('slug'),
        icon: row.get('icon'),
        order: row.get('order'),
        status: row.get('status'),
        createdAt: row.get('createdAt'),
        subCategoryCount: subCountMap.get(id) ?? 0,
        coursesCount: coursesSet.size,
        instructorsCount: instructorsSet.size
      };
    });

    return {
      items,
      page,
      pageSize,
      total: result.count,
      totalPages: Math.max(1, Math.ceil(result.count / pageSize))
    };
  }

  @Get('education/categories/search')
  @RequirePermissions(Permission.CATEGORY_READ)
  async searchCategories(@Query('term') term?: string) {
    const q = String(term ?? '').trim();
    const where = q ? { title: { [Op.like]: `%${q}%` } } : {};
    const rows = await this.db.models.Category.findAll({
      where,
      order: [['title', 'ASC']],
      limit: 30
    });
    return rows.map((row) => ({ id: row.get('id'), title: row.get('title') }));
  }

  @Get('education/instructors')
  @RequirePermissions(Permission.COURSE_READ)
  async educationInstructors(@Query() query: AdminListQueryDto) {
    const { page, pageSize, offset } = this.normalizePage(query);
    const q = String(query.q ?? '').trim();
    const where: Record<string, unknown> = {};
    if (q) {
      where[Op.or as unknown as string] = [
        { fullName: { [Op.like]: `%${q}%` } },
        { email: { [Op.like]: `%${q}%` } },
        { jobTitle: { [Op.like]: `%${q}%` } }
      ];
    }

    const rows = await this.db.models.UserProfile.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize
    });

    const mapped = rows.rows
      .map((row) => ({
        id: row.get('id'),
        keycloakUserId: row.get('keycloakUserId'),
        fullName: row.get('fullName'),
        email: row.get('email'),
        jobTitle: row.get('jobTitle'),
        department: row.get('department'),
        status: row.get('status')
      }));

    let items = mapped.filter((user) => {
        const haystack = `${user.fullName ?? ''} ${user.email ?? ''} ${user.jobTitle ?? ''}`.toLowerCase();
        const dep = String(user.department ?? '').toLowerCase();
        const status = String(user.status ?? '').toUpperCase();
        return (
          status === 'INSTRUCTOR' ||
          status === 'PENDING_INSTRUCTOR' ||
          dep.includes('formation') ||
          haystack.includes('formateur') ||
          haystack.includes('trainer') ||
          haystack.includes('instructor')
        );
      });

    // Fallback: if no semantic match, expose active profiles so course creation is not blocked.
    if (!items.length) {
      items = mapped.filter((user) => String(user.status ?? '').toUpperCase() === 'ACTIVE');
    }

    return {
      items,
      page,
      pageSize,
      total: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / pageSize))
    };
  }

  @Get('education/categories/:id')
  @RequirePermissions(Permission.CATEGORY_READ)
  async getCategory(@Param('id') id: string) {
    const category = await this.db.models.Category.findByPk(id);
    if (!category) return { ok: false, message: 'Category not found' };
    const subCategories = await this.db.models.Category.findAll({
      where: { parentId: id },
      order: [['order', 'ASC']]
    });
    return { category, subCategories };
  }

  @Post('education/categories')
  @RequirePermissions(Permission.CATEGORY_CREATE)
  async createEducationCategory(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body()
    body: {
      title?: string;
      slug?: string;
      icon?: string;
      order?: number;
      status?: string;
      sub_categories?: Array<{ id?: string; title?: string; slug?: string; icon?: string }>;
    },
    @Req() req: Request
  ) {
    const title = String(body.title ?? '').trim();
    if (!title) return { ok: false, message: 'title is required' };
    const slug = body.slug ? this.slugify(String(body.slug)) : this.slugify(title);

    const category = await this.db.models.Category.create({
      id: randomUUID(),
      title,
      slug,
      icon: String(body.icon ?? '') || null,
      order: body.order ?? null,
      status: String(body.status ?? 'ACTIVE').toUpperCase()
    });

    const subs = Array.isArray(body.sub_categories) ? body.sub_categories : [];
    let order = 1;
    for (const sub of subs) {
      const subTitle = String(sub.title ?? '').trim();
      if (!subTitle) continue;
      await this.db.models.Category.create({
        id: randomUUID(),
        parentId: String(category.get('id')),
        title: subTitle,
        slug: sub.slug ? this.slugify(sub.slug) : this.slugify(subTitle),
        icon: String(sub.icon ?? '') || null,
        order,
        status: 'ACTIVE'
      });
      order += 1;
    }

    await this.audit.log({
      actorUserId: user.sub,
      action: 'CATEGORY_CREATE',
      entityType: 'Category',
      entityId: String(category.get('id')),
      metadata: { title, subCategories: subs.length },
      ...this.audit.fromRequest(req)
    });

    return category;
  }

  @Patch('education/categories/:id')
  @RequirePermissions(Permission.CATEGORY_CREATE)
  async updateEducationCategory(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      slug?: string;
      icon?: string;
      order?: number;
      status?: string;
      sub_categories?: Array<{ id?: string; title?: string; slug?: string; icon?: string }>;
    },
    @Req() req: Request
  ) {
    const category = await this.db.models.Category.findByPk(id);
    if (!category) return { ok: false, message: 'Category not found' };

    const nextTitle = body.title !== undefined ? String(body.title).trim() : String(category.get('title'));
    const nextSlug = body.slug !== undefined && body.slug
      ? this.slugify(String(body.slug))
      : body.title !== undefined
        ? this.slugify(nextTitle)
        : String(category.get('slug'));

    await category.update({
      title: nextTitle,
      slug: nextSlug,
      icon: body.icon !== undefined ? (String(body.icon) || null) : category.get('icon'),
      order: body.order !== undefined ? body.order : category.get('order'),
      status: body.status !== undefined ? String(body.status).toUpperCase() : category.get('status')
    });

    if (Array.isArray(body.sub_categories)) {
      const keepIds: string[] = [];
      let sortOrder = 1;
      for (const sub of body.sub_categories) {
        const subTitle = String(sub.title ?? '').trim();
        if (!subTitle) continue;
        const existingId = String(sub.id ?? '').trim();
        if (existingId) {
          const existing = await this.db.models.Category.findOne({ where: { id: existingId, parentId: id } });
          if (existing) {
            await existing.update({
              title: subTitle,
              slug: sub.slug ? this.slugify(sub.slug) : this.slugify(subTitle),
              icon: String(sub.icon ?? '') || null,
              order: sortOrder
            });
            keepIds.push(existingId);
          }
        } else {
          const created = await this.db.models.Category.create({
            id: randomUUID(),
            parentId: id,
            title: subTitle,
            slug: sub.slug ? this.slugify(sub.slug) : this.slugify(subTitle),
            icon: String(sub.icon ?? '') || null,
            order: sortOrder,
            status: 'ACTIVE'
          });
          keepIds.push(String(created.get('id')));
        }
        sortOrder += 1;
      }
      await this.db.models.Category.destroy({ where: { parentId: id, id: { [Op.notIn]: keepIds.length ? keepIds : ['__none__'] } } });
    }

    await this.audit.log({
      actorUserId: user.sub,
      action: 'CATEGORY_CREATE',
      entityType: 'Category',
      entityId: id,
      metadata: body as unknown as Record<string, unknown>,
      ...this.audit.fromRequest(req)
    });

    return category;
  }

  @Post('education/categories/:id/delete')
  @RequirePermissions(Permission.CATEGORY_CREATE)
  async deleteEducationCategory(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Req() req: Request
  ) {
    const category = await this.db.models.Category.findByPk(id);
    if (!category) return { ok: false, message: 'Category not found' };
    await this.db.models.TrendCategory.destroy({ where: { categoryId: id } });
    await this.db.models.Category.destroy({ where: { parentId: id } });
    await category.destroy();

    await this.audit.log({
      actorUserId: user.sub,
      action: 'CATEGORY_CREATE',
      entityType: 'Category',
      entityId: id,
      metadata: { deleted: true },
      ...this.audit.fromRequest(req)
    });

    return { ok: true };
  }

  @Get('education/categories/trends')
  @RequirePermissions(Permission.CATEGORY_READ)
  async listTrendCategories(@Query() query: AdminListQueryDto) {
    const { page, pageSize, offset } = this.normalizePage(query);
    const rows = await this.db.models.TrendCategory.findAndCountAll({
      include: [{ model: this.db.models.Category, as: 'category' }],
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize
    });
    return {
      items: rows.rows,
      page,
      pageSize,
      total: rows.count,
      totalPages: Math.max(1, Math.ceil(rows.count / pageSize))
    };
  }

  @Get('education/categories/trends/:id')
  @RequirePermissions(Permission.CATEGORY_READ)
  async getTrendCategory(@Param('id') id: string) {
    const trend = await this.db.models.TrendCategory.findByPk(id);
    if (!trend) return { ok: false, message: 'Trend not found' };
    return trend;
  }

  @Post('education/categories/trends')
  @RequirePermissions(Permission.CATEGORY_CREATE)
  async createTrendCategory(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: { category_id?: string; icon?: string; color?: string },
    @Req() req: Request
  ) {
    const categoryId = String(body.category_id ?? '').trim();
    if (!categoryId) return { ok: false, message: 'category_id is required' };
    const exists = await this.db.models.Category.findByPk(categoryId);
    if (!exists) return { ok: false, message: 'category not found' };
    const icon = String(body.icon ?? '').trim();
    const color = String(body.color ?? '').trim();
    if (!icon || !color) return { ok: false, message: 'icon and color are required' };

    const trend = await this.db.models.TrendCategory.create({
      id: randomUUID(),
      categoryId,
      icon,
      color
    });

    await this.audit.log({
      actorUserId: user.sub,
      action: 'CATEGORY_CREATE',
      entityType: 'TrendCategory',
      entityId: String(trend.get('id')),
      metadata: { categoryId, color },
      ...this.audit.fromRequest(req)
    });
    return trend;
  }

  @Patch('education/categories/trends/:id')
  @RequirePermissions(Permission.CATEGORY_CREATE)
  async updateTrendCategory(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: { category_id?: string; icon?: string; color?: string },
    @Req() req: Request
  ) {
    const trend = await this.db.models.TrendCategory.findByPk(id);
    if (!trend) return { ok: false, message: 'Trend not found' };
    const nextCategoryId = body.category_id !== undefined ? String(body.category_id) : String(trend.get('categoryId'));
    if (body.category_id !== undefined) {
      const exists = await this.db.models.Category.findByPk(nextCategoryId);
      if (!exists) return { ok: false, message: 'category not found' };
    }
    await trend.update({
      categoryId: nextCategoryId,
      icon: body.icon !== undefined ? String(body.icon) : trend.get('icon'),
      color: body.color !== undefined ? String(body.color) : trend.get('color')
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'CATEGORY_CREATE',
      entityType: 'TrendCategory',
      entityId: id,
      metadata: body as unknown as Record<string, unknown>,
      ...this.audit.fromRequest(req)
    });
    return trend;
  }

  @Post('education/categories/trends/:id/delete')
  @RequirePermissions(Permission.CATEGORY_CREATE)
  async deleteTrendCategory(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Req() req: Request
  ) {
    const trend = await this.db.models.TrendCategory.findByPk(id);
    if (!trend) return { ok: false, message: 'Trend not found' };
    await trend.destroy();
    await this.audit.log({
      actorUserId: user.sub,
      action: 'CATEGORY_CREATE',
      entityType: 'TrendCategory',
      entityId: id,
      metadata: { deleted: true },
      ...this.audit.fromRequest(req)
    });
    return { ok: true };
  }

  @Get('education/courses/export.csv')
  @RequirePermissions(Permission.COURSE_READ)
  async exportCourses(@Query() query: AdminListQueryDto, @Res() res: Response) {
    const list = await this.adminService.listModel('Course', { ...query, page: '1', pageSize: '1000' }, {
      searchColumns: ['title', 'description']
    });
    this.sendCsv(
      res,
      'courses.csv',
      ['id', 'title', 'status', 'createdById', 'createdAt'],
      list.items.map((row: RowLike) => [
        row.get('id'),
        row.get('title'),
        row.get('status'),
        row.get('createdById'),
        row.get('createdAt')
      ])
    );
  }

  @Post('education/courses')
  @RequirePermissions(Permission.COURSE_CREATE)
  async createCourse(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: { title?: string; description?: string; status?: string; slug?: string; metadata?: Record<string, unknown> },
    @Req() req: Request
  ) {
    const title = String(body.title ?? 'Nouveau cours').slice(0, 200);
    const slugBase = String(body.slug ?? '').trim() || title;
    const slug = await this.ensureUniqueCourseSlug(slugBase);
    const created = await this.db.models.Course.create({
      id: randomUUID(),
      title,
      slug,
      description: String(body.description ?? ''),
      status: String(body.status ?? 'DRAFT').slice(0, 20),
      metadata: body.metadata ?? null,
      createdById: user.sub
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'COURSE_CREATE',
      entityType: 'Course',
      entityId: String(created.get('id')),
      metadata: { title: created.get('title') as string },
      ...this.audit.fromRequest(req)
    });
    return created;
  }

  @Patch('education/courses/:id')
  @RequirePermissions(Permission.COURSE_UPDATE)
  async updateCourse(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; status?: string; slug?: string; metadata?: Record<string, unknown> },
    @Req() req: Request
  ) {
    const row = await this.db.models.Course.findByPk(id);
    if (!row) return { ok: false, message: 'Course not found' };
    const nextSlug =
      body.slug !== undefined
        ? await this.ensureUniqueCourseSlugExcept(id, String(body.slug))
        : String(row.get('slug'));

    await row.update({
      ...(body.title !== undefined ? { title: String(body.title).slice(0, 200) } : {}),
      ...(body.slug !== undefined ? { slug: nextSlug } : {}),
      ...(body.description !== undefined ? { description: String(body.description) } : {}),
      ...(body.status !== undefined ? { status: String(body.status).slice(0, 20) } : {}),
      ...(body.metadata !== undefined ? { metadata: body.metadata } : {})
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'COURSE_UPDATE',
      entityType: 'Course',
      entityId: id,
      metadata: body,
      ...this.audit.fromRequest(req)
    });
    return row;
  }

  @Get('education/courses/:id')
  @RequirePermissions(Permission.COURSE_READ)
  async getCourseById(@Param('id') id: string) {
    const row = await this.db.models.Course.findByPk(id);
    if (!row) return { ok: false, message: 'Course not found' };
    return { ok: true, item: row };
  }

  @Get('education/courses/:id/extras')
  @RequirePermissions(Permission.COURSE_READ)
  async listCourseExtras(@Param('id') id: string, @Query('type') type?: string) {
    const where: Record<string, unknown> = { courseId: id };
    if (type) where.type = type;
    const rows = await this.db.models.CourseExtra.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['id', 'ASC']]
    });
    return { items: rows };
  }

  @Post('education/courses/:id/extras')
  @RequirePermissions(Permission.COURSE_UPDATE)
  async createCourseExtra(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: CreateCourseExtraDto,
    @Req() req: Request
  ) {
    const created = await this.db.models.CourseExtra.create({
      id: randomUUID(),
      courseId: id,
      type: String(body.type).slice(0, 80),
      title: String(body.title).slice(0, 255),
      status: String(body.status ?? 'ACTIVE').slice(0, 20),
      sortOrder: Number(body.order ?? 0),
      payload: body.payload ?? {}
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'COURSE_UPDATE',
      entityType: 'CourseExtra',
      entityId: String(created.get('id')),
      metadata: { courseId: id, type: body.type },
      ...this.audit.fromRequest(req)
    });
    return created;
  }

  @Patch('education/courses/:id/extras/:extraId')
  @RequirePermissions(Permission.COURSE_UPDATE)
  async updateCourseExtra(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Param('extraId') extraId: string,
    @Body() body: UpdateCourseExtraDto,
    @Req() req: Request
  ) {
    const row = await this.db.models.CourseExtra.findOne({ where: { id: extraId, courseId: id } });
    if (!row) return { ok: false, message: 'Course extra not found' };
    await row.update({
      ...(body.title !== undefined ? { title: String(body.title).slice(0, 255) } : {}),
      ...(body.status !== undefined ? { status: String(body.status).slice(0, 20) } : {}),
      ...(body.order !== undefined ? { sortOrder: Number(body.order) } : {}),
      ...(body.payload !== undefined ? { payload: body.payload } : {})
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'COURSE_UPDATE',
      entityType: 'CourseExtra',
      entityId: extraId,
      metadata: body as unknown as Record<string, unknown>,
      ...this.audit.fromRequest(req)
    });
    return row;
  }

  @Post('education/courses/:id/extras/:extraId/delete')
  @RequirePermissions(Permission.COURSE_UPDATE)
  async deleteCourseExtra(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Param('extraId') extraId: string,
    @Req() req: Request
  ) {
    const row = await this.db.models.CourseExtra.findOne({ where: { id: extraId, courseId: id } });
    if (!row) return { ok: false, message: 'Course extra not found' };
    await row.destroy();
    await this.audit.log({
      actorUserId: user.sub,
      action: 'COURSE_UPDATE',
      entityType: 'CourseExtra',
      entityId: extraId,
      metadata: { deleted: true },
      ...this.audit.fromRequest(req)
    });
    return { ok: true };
  }

  @Get('education/courses/:id/quizzes')
  @RequirePermissions(Permission.COURSE_READ)
  async listCourseQuizzes(@Param('id') id: string) {
    const rows = await this.db.models.Quiz.findAll({
      where: { courseId: id },
      order: [['createdAt', 'DESC']]
    });
    return { items: rows };
  }

  @Post('education/courses/:id/quizzes')
  @RequirePermissions(Permission.QUIZ_CREATE)
  async createCourseQuiz(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: { title?: string; passingScore?: number; status?: string; payload?: Record<string, unknown> },
    @Req() req: Request
  ) {
    const created = await this.db.models.Quiz.create({
      id: randomUUID(),
      courseId: id,
      title: String(body.title ?? 'New Quiz').slice(0, 200),
      passingScore: Number(body.passingScore ?? 70),
      status: String(body.status ?? 'DRAFT').slice(0, 20)
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'QUIZ_CREATE',
      entityType: 'Quiz',
      entityId: String(created.get('id')),
      metadata: { courseId: id, payload: body.payload ?? {} },
      ...this.audit.fromRequest(req)
    });
    return created;
  }

  @Patch('education/courses/:id/quizzes/:quizId')
  @RequirePermissions(Permission.QUIZ_CREATE)
  async updateCourseQuiz(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Param('quizId') quizId: string,
    @Body() body: { title?: string; passingScore?: number; status?: string; payload?: Record<string, unknown> },
    @Req() req: Request
  ) {
    const row = await this.db.models.Quiz.findOne({ where: { id: quizId, courseId: id } });
    if (!row) return { ok: false, message: 'Quiz not found' };
    await row.update({
      ...(body.title !== undefined ? { title: String(body.title).slice(0, 200) } : {}),
      ...(body.passingScore !== undefined ? { passingScore: Number(body.passingScore) } : {}),
      ...(body.status !== undefined ? { status: String(body.status).slice(0, 20) } : {})
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'QUIZ_CREATE',
      entityType: 'Quiz',
      entityId: quizId,
      metadata: { updated: true, payload: body.payload ?? {} },
      ...this.audit.fromRequest(req)
    });
    return row;
  }

  @Get('education/course-comments')
  @RequirePermissions(Permission.COURSE_READ)
  async listCourseComments(@Query() query: AdminListQueryDto) {
    const { page, pageSize, offset } = this.normalizePage(query);
    const q = String(query.q ?? '').trim();
    const status = String(query.status ?? '').trim().toUpperCase();
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (q) {
      where[Op.or as unknown as string] = [
        { authorName: { [Op.like]: `%${q}%` } },
        { authorEmail: { [Op.like]: `%${q}%` } },
        { message: { [Op.like]: `%${q}%` } }
      ];
    }

    const rows = await this.db.models.CourseComment.findAndCountAll({
      where,
      include: [{ model: this.db.models.Course, as: 'course', attributes: ['id', 'title', 'slug'] }],
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize
    });

    const items = rows.rows.map((row) => {
      const plain = row.get({ plain: true }) as Record<string, unknown>;
      const course = (plain.course ?? {}) as Record<string, unknown>;
      return {
        id: plain.id,
        courseId: plain.courseId,
        courseTitle: String(course.title ?? '-'),
        courseSlug: String(course.slug ?? '-'),
        authorName: plain.authorName,
        authorEmail: plain.authorEmail,
        message: plain.message,
        status: plain.status,
        createdAt: plain.createdAt
      };
    });

    return { items, page, pageSize, total: rows.count, totalPages: Math.max(1, Math.ceil(rows.count / pageSize)) };
  }

  @Post('education/course-comments')
  @RequirePermissions(Permission.COURSE_UPDATE)
  async createCourseComment(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: { courseId?: string; authorName?: string; authorEmail?: string; message?: string; status?: string },
    @Req() req: Request
  ) {
    const courseId = String(body.courseId ?? '').trim();
    const message = String(body.message ?? '').trim();
    if (!courseId || !message) return { ok: false, message: 'courseId and message are required' };
    const course = await this.db.models.Course.findByPk(courseId);
    if (!course) return { ok: false, message: 'Course not found' };
    const created = await this.db.models.CourseComment.create({
      id: randomUUID(),
      courseId,
      authorName: String(body.authorName ?? 'Admin'),
      authorEmail: String(body.authorEmail ?? ''),
      message,
      status: String(body.status ?? 'PUBLISHED').toUpperCase()
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'COURSE_UPDATE',
      entityType: 'CourseComment',
      entityId: String(created.get('id')),
      metadata: { courseId },
      ...this.audit.fromRequest(req)
    });
    return created;
  }

  @Patch('education/course-comments/:id')
  @RequirePermissions(Permission.COURSE_UPDATE)
  async updateCourseComment(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: { status?: string; message?: string; authorName?: string; authorEmail?: string },
    @Req() req: Request
  ) {
    const row = await this.db.models.CourseComment.findByPk(id);
    if (!row) return { ok: false, message: 'Comment not found' };
    await row.update({
      ...(body.status !== undefined ? { status: String(body.status).toUpperCase() } : {}),
      ...(body.message !== undefined ? { message: String(body.message) } : {}),
      ...(body.authorName !== undefined ? { authorName: String(body.authorName) } : {}),
      ...(body.authorEmail !== undefined ? { authorEmail: String(body.authorEmail) } : {})
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'COURSE_UPDATE',
      entityType: 'CourseComment',
      entityId: id,
      metadata: body as Record<string, unknown>,
      ...this.audit.fromRequest(req)
    });
    return row;
  }

  @Post('education/course-comments/:id/delete')
  @RequirePermissions(Permission.COURSE_UPDATE)
  async deleteCourseComment(@CurrentUser() user: AuthenticatedRequestUser, @Param('id') id: string, @Req() req: Request) {
    const row = await this.db.models.CourseComment.findByPk(id);
    if (!row) return { ok: false, message: 'Comment not found' };
    await row.destroy();
    await this.audit.log({
      actorUserId: user.sub,
      action: 'COURSE_UPDATE',
      entityType: 'CourseComment',
      entityId: id,
      metadata: { deleted: true },
      ...this.audit.fromRequest(req)
    });
    return { ok: true };
  }

  @Get('education/course-reviews')
  @RequirePermissions(Permission.COURSE_READ)
  async listCourseReviews(@Query() query: AdminListQueryDto) {
    const { page, pageSize, offset } = this.normalizePage(query);
    const q = String(query.q ?? '').trim();
    const status = String(query.status ?? '').trim().toUpperCase();
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (q) {
      where[Op.or as unknown as string] = [
        { authorName: { [Op.like]: `%${q}%` } },
        { authorEmail: { [Op.like]: `%${q}%` } },
        { comment: { [Op.like]: `%${q}%` } }
      ];
    }

    const rows = await this.db.models.CourseReview.findAndCountAll({
      where,
      include: [{ model: this.db.models.Course, as: 'course', attributes: ['id', 'title', 'slug'] }],
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize
    });

    const items = rows.rows.map((row) => {
      const plain = row.get({ plain: true }) as Record<string, unknown>;
      const course = (plain.course ?? {}) as Record<string, unknown>;
      return {
        id: plain.id,
        courseId: plain.courseId,
        courseTitle: String(course.title ?? '-'),
        courseSlug: String(course.slug ?? '-'),
        authorName: plain.authorName,
        authorEmail: plain.authorEmail,
        rating: plain.rating,
        comment: plain.comment,
        status: plain.status,
        createdAt: plain.createdAt
      };
    });
    return { items, page, pageSize, total: rows.count, totalPages: Math.max(1, Math.ceil(rows.count / pageSize)) };
  }

  @Post('education/course-reviews')
  @RequirePermissions(Permission.COURSE_UPDATE)
  async createCourseReview(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body()
    body: {
      courseId?: string;
      authorName?: string;
      authorEmail?: string;
      rating?: number;
      comment?: string;
      status?: string;
    },
    @Req() req: Request
  ) {
    const courseId = String(body.courseId ?? '').trim();
    if (!courseId) return { ok: false, message: 'courseId is required' };
    const course = await this.db.models.Course.findByPk(courseId);
    if (!course) return { ok: false, message: 'Course not found' };
    const created = await this.db.models.CourseReview.create({
      id: randomUUID(),
      courseId,
      authorName: String(body.authorName ?? 'Admin'),
      authorEmail: String(body.authorEmail ?? ''),
      rating: Math.max(1, Math.min(5, Number(body.rating ?? 5))),
      comment: String(body.comment ?? ''),
      status: String(body.status ?? 'PUBLISHED').toUpperCase()
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'COURSE_UPDATE',
      entityType: 'CourseReview',
      entityId: String(created.get('id')),
      metadata: { courseId },
      ...this.audit.fromRequest(req)
    });
    return created;
  }

  @Patch('education/course-reviews/:id')
  @RequirePermissions(Permission.COURSE_UPDATE)
  async updateCourseReview(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: { status?: string; comment?: string; rating?: number; authorName?: string; authorEmail?: string },
    @Req() req: Request
  ) {
    const row = await this.db.models.CourseReview.findByPk(id);
    if (!row) return { ok: false, message: 'Review not found' };
    await row.update({
      ...(body.status !== undefined ? { status: String(body.status).toUpperCase() } : {}),
      ...(body.comment !== undefined ? { comment: String(body.comment) } : {}),
      ...(body.rating !== undefined ? { rating: Math.max(1, Math.min(5, Number(body.rating))) } : {}),
      ...(body.authorName !== undefined ? { authorName: String(body.authorName) } : {}),
      ...(body.authorEmail !== undefined ? { authorEmail: String(body.authorEmail) } : {})
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'COURSE_UPDATE',
      entityType: 'CourseReview',
      entityId: id,
      metadata: body as Record<string, unknown>,
      ...this.audit.fromRequest(req)
    });
    return row;
  }

  @Post('education/course-reviews/:id/delete')
  @RequirePermissions(Permission.COURSE_UPDATE)
  async deleteCourseReview(@CurrentUser() user: AuthenticatedRequestUser, @Param('id') id: string, @Req() req: Request) {
    const row = await this.db.models.CourseReview.findByPk(id);
    if (!row) return { ok: false, message: 'Review not found' };
    await row.destroy();
    await this.audit.log({
      actorUserId: user.sub,
      action: 'COURSE_UPDATE',
      entityType: 'CourseReview',
      entityId: id,
      metadata: { deleted: true },
      ...this.audit.fromRequest(req)
    });
    return { ok: true };
  }

  @Get('education/quizzes')
  @RequirePermissions(Permission.COURSE_READ)
  educationQuizzes(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('Quiz', query, { searchColumns: ['title'] });
  }

  @Post('education/quizzes')
  @RequirePermissions(Permission.QUIZ_CREATE)
  async createQuiz(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: { title?: string; passingScore?: number; status?: string },
    @Req() req: Request
  ) {
    const created = await this.db.models.Quiz.create({
      id: randomUUID(),
      title: String(body.title ?? 'Nouveau quiz').slice(0, 200),
      passingScore: Number(body.passingScore ?? 70),
      status: String(body.status ?? 'DRAFT').slice(0, 20),
      createdById: user.sub
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'QUIZ_CREATE',
      entityType: 'Quiz',
      entityId: String(created.get('id')),
      metadata: { title: created.get('title') as string },
      ...this.audit.fromRequest(req)
    });
    return created;
  }

  @Get('education/certificates')
  @RequirePermissions(Permission.COURSE_READ)
  educationCertificates(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('Certificate', query, { searchColumns: ['certificateNumber'] });
  }

  @Get('education/assignments')
  @RequirePermissions(Permission.COURSE_READ)
  educationAssignments(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('LessonProgress', query);
  }

  @Get('users/list')
  @RequirePermissions(Permission.USER_MANAGE)
  usersList(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('UserProfile', query, {
      searchColumns: ['fullName', 'email', 'department']
    });
  }

  @Get('users/search')
  @RequirePermissions(Permission.USER_MANAGE)
  async usersSearch(@Query('q') q?: string) {
    const term = String(q ?? '').trim();
    const where = term
      ? {
          [Op.or]: [
            { fullName: { [Op.like]: `%${term}%` } },
            { email: { [Op.like]: `%${term}%` } },
            { department: { [Op.like]: `%${term}%` } }
          ]
        }
      : {};
    const rows = await this.db.models.UserProfile.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 30
    });
    return rows.map((row) => ({
      id: row.get('id'),
      fullName: row.get('fullName'),
      email: row.get('email'),
      status: row.get('status')
    }));
  }

  @Get('users/staffs')
  @RequirePermissions(Permission.USER_MANAGE)
  async staffsList(@Query() query: AdminListQueryDto) {
    const list = await this.adminService.listModel('UserProfile', query, {
      searchColumns: ['fullName', 'email', 'department', 'jobTitle']
    });
    const items = (list.items ?? []).filter((row) => {
      const status = String((row as RowLike).get('status') ?? '').toUpperCase();
      const jt = String((row as RowLike).get('jobTitle') ?? '').toLowerCase();
      return status !== 'STUDENT' || jt.includes('admin') || jt.includes('agent') || jt.includes('auditeur') || jt.includes('direction');
    });
    return { ...list, items, total: items.length, totalPages: 1, page: 1 };
  }

  @Get('users/students')
  @RequirePermissions(Permission.USER_MANAGE)
  async studentsList(@Query() query: AdminListQueryDto) {
    const list = await this.adminService.listModel('UserProfile', query, {
      searchColumns: ['fullName', 'email', 'department', 'jobTitle']
    });
    const items = (list.items ?? []).filter((row) => {
      const status = String((row as RowLike).get('status') ?? '').toUpperCase();
      const jt = String((row as RowLike).get('jobTitle') ?? '').toLowerCase();
      return status === 'STUDENT' || jt.includes('student') || jt.includes('learner');
    });
    return { ...list, items, total: items.length, totalPages: 1, page: 1 };
  }

  @Get('users/instructors')
  @RequirePermissions(Permission.USER_MANAGE)
  async instructorsList(@Query() query: AdminListQueryDto) {
    const list = await this.adminService.listModel('UserProfile', query, {
      searchColumns: ['fullName', 'email', 'department', 'jobTitle']
    });
    const items = (list.items ?? []).filter((row) => {
      const status = String((row as RowLike).get('status') ?? '').toUpperCase();
      const jt = String((row as RowLike).get('jobTitle') ?? '').toLowerCase();
      return status === 'INSTRUCTOR' || status === 'ACTIVE' || jt.includes('formateur') || jt.includes('trainer') || jt.includes('instructor');
    });
    return { ...list, items, total: items.length, totalPages: 1, page: 1 };
  }

  @Get('users/organizations')
  @RequirePermissions(Permission.USER_MANAGE)
  async organizationsList(@Query() query: AdminListQueryDto) {
    const list = await this.adminService.listModel('UserProfile', query, {
      searchColumns: ['fullName', 'email', 'department', 'jobTitle']
    });
    const items = (list.items ?? []).filter((row) => {
      const jt = String((row as RowLike).get('jobTitle') ?? '').toLowerCase();
      const dp = String((row as RowLike).get('department') ?? '').toLowerCase();
      return jt.includes('organization') || jt.includes('organisation') || dp.includes('organization') || dp.includes('organisation');
    });
    return { ...list, items, total: items.length, totalPages: 1, page: 1 };
  }

  @Get('users/restricted')
  @RequirePermissions(Permission.USER_MANAGE)
  usersRestricted(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('UserProfile', query, {
      searchColumns: ['fullName', 'email', 'department', 'jobTitle'],
      extraWhere: { status: { [Op.in]: ['RESTRICTED', 'BLOCKED', 'BANNED'] } }
    });
  }

  @Get('users/delete-account-requests')
  @RequirePermissions(Permission.USER_MANAGE)
  usersDeleteRequests(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('UserProfile', query, {
      searchColumns: ['fullName', 'email', 'department', 'jobTitle'],
      extraWhere: { status: { [Op.in]: ['DELETE_REQUESTED', 'PENDING_DELETE'] } }
    });
  }

  @Get('users/ip-restrictions')
  @RequirePermissions(Permission.AUDIT_LOG_VIEW)
  usersIpRestrictions(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('AuditLog', query, {
      searchColumns: ['ipAddress', 'action', 'actorUserId'],
      extraWhere: { entityType: 'AuthSession' }
    });
  }

  @Get('users/:id')
  @RequirePermissions(Permission.USER_MANAGE)
  async userDetail(@Param('id') id: string) {
    const row = await this.db.models.UserProfile.findByPk(id);
    if (!row) return { ok: false, message: 'User not found' };
    return row;
  }

  @Post('users')
  @RequirePermissions(Permission.USER_MANAGE)
  async createUser(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body()
    body: {
      fullName?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      jobTitle?: string;
      department?: string;
      phone?: string;
      status?: string;
      keycloakUserId?: string;
    },
    @Req() req: Request
  ) {
    const fullName = String(body.fullName ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!fullName || !email) return { ok: false, message: 'fullName and email are required' };

    const firstName = String(body.firstName ?? '').trim() || fullName.split(' ').slice(0, 1).join(' ');
    const lastName = String(body.lastName ?? '').trim() || fullName.split(' ').slice(1).join(' ');
    const keycloakUserId = String(body.keycloakUserId ?? '').trim() || `local-${randomUUID()}`;

    const created = await this.db.models.UserProfile.create({
      id: randomUUID(),
      keycloakUserId,
      email,
      firstName,
      lastName: lastName || '-',
      fullName,
      jobTitle: String(body.jobTitle ?? '') || null,
      department: String(body.department ?? '') || null,
      phone: String(body.phone ?? '') || null,
      status: String(body.status ?? 'ACTIVE').toUpperCase()
    });

    await this.audit.log({
      actorUserId: user.sub,
      action: 'USER_MANAGE',
      entityType: 'UserProfile',
      entityId: String(created.get('id')),
      metadata: { op: 'create', email },
      ...this.audit.fromRequest(req)
    });

    return created;
  }

  @Patch('users/:id')
  @RequirePermissions(Permission.USER_MANAGE)
  async updateUser(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body()
    body: {
      fullName?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      jobTitle?: string;
      department?: string;
      phone?: string;
      status?: string;
    },
    @Req() req: Request
  ) {
    const row = await this.db.models.UserProfile.findByPk(id);
    if (!row) return { ok: false, message: 'User not found' };
    await row.update({
      ...(body.fullName !== undefined ? { fullName: String(body.fullName).trim() } : {}),
      ...(body.email !== undefined ? { email: String(body.email).trim().toLowerCase() } : {}),
      ...(body.firstName !== undefined ? { firstName: String(body.firstName).trim() } : {}),
      ...(body.lastName !== undefined ? { lastName: String(body.lastName).trim() } : {}),
      ...(body.jobTitle !== undefined ? { jobTitle: String(body.jobTitle).trim() || null } : {}),
      ...(body.department !== undefined ? { department: String(body.department).trim() || null } : {}),
      ...(body.phone !== undefined ? { phone: String(body.phone).trim() || null } : {}),
      ...(body.status !== undefined ? { status: String(body.status).toUpperCase() } : {})
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'USER_MANAGE',
      entityType: 'UserProfile',
      entityId: id,
      metadata: { op: 'update', body },
      ...this.audit.fromRequest(req)
    });
    return row;
  }

  @Post('users/:id/delete')
  @RequirePermissions(Permission.USER_MANAGE)
  async deleteUser(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Req() req: Request
  ) {
    const row = await this.db.models.UserProfile.findByPk(id);
    if (!row) return { ok: false, message: 'User not found' };
    await row.destroy();
    await this.audit.log({
      actorUserId: user.sub,
      action: 'USER_MANAGE',
      entityType: 'UserProfile',
      entityId: id,
      metadata: { op: 'delete' },
      ...this.audit.fromRequest(req)
    });
    return { ok: true };
  }

  @Get('users/list/export.csv')
  @RequirePermissions(Permission.USER_MANAGE)
  async exportUsers(@Query() query: AdminListQueryDto, @Res() res: Response) {
    const list = await this.adminService.listModel('UserProfile', { ...query, page: '1', pageSize: '1000' }, {
      searchColumns: ['fullName', 'email', 'department']
    });
    this.sendCsv(
      res,
      'users.csv',
      ['keycloakUserId', 'fullName', 'email', 'department', 'status'],
      list.items.map((row: RowLike) => [
        row.get('keycloakUserId'),
        row.get('fullName'),
        row.get('email'),
        row.get('department'),
        row.get('status')
      ])
    );
  }

  @Get('users/roles/list')
  @RequirePermissions(Permission.USER_MANAGE)
  async usersRolesList() {
    const items = await this.getAppJson<Array<Record<string, unknown>>>('users_roles_catalog', []);
    return { items, page: 1, pageSize: 1000, total: items.length, totalPages: 1 };
  }

  @Post('users/roles')
  @RequirePermissions(Permission.USER_MANAGE)
  async createUsersRole(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: { title?: string; description?: string; permissions?: string[]; status?: string },
    @Req() req: Request
  ) {
    const title = String(body.title ?? '').trim();
    if (!title) return { ok: false, message: 'title is required' };
    const items = await this.getAppJson<Array<Record<string, unknown>>>('users_roles_catalog', []);
    const created = {
      id: randomUUID(),
      title,
      description: String(body.description ?? ''),
      permissions: Array.isArray(body.permissions) ? body.permissions : [],
      status: String(body.status ?? 'ACTIVE').toUpperCase(),
      createdAt: new Date().toISOString()
    };
    items.unshift(created);
    await this.setAppJson('users_roles_catalog', items);
    await this.audit.log({
      actorUserId: user.sub,
      action: 'USER_MANAGE',
      entityType: 'UserRole',
      entityId: String(created.id),
      metadata: created,
      ...this.audit.fromRequest(req)
    });
    return created;
  }

  @Patch('users/roles/:id')
  @RequirePermissions(Permission.USER_MANAGE)
  async updateUsersRole(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; permissions?: string[]; status?: string },
    @Req() req: Request
  ) {
    const items = await this.getAppJson<Array<Record<string, unknown>>>('users_roles_catalog', []);
    const idx = items.findIndex((it) => String(it.id) === id);
    if (idx < 0) return { ok: false, message: 'Role not found' };
    const next = {
      ...items[idx],
      ...(body.title !== undefined ? { title: String(body.title) } : {}),
      ...(body.description !== undefined ? { description: String(body.description) } : {}),
      ...(body.permissions !== undefined ? { permissions: Array.isArray(body.permissions) ? body.permissions : [] } : {}),
      ...(body.status !== undefined ? { status: String(body.status).toUpperCase() } : {}),
      updatedAt: new Date().toISOString()
    };
    items[idx] = next;
    await this.setAppJson('users_roles_catalog', items);
    await this.audit.log({
      actorUserId: user.sub,
      action: 'USER_MANAGE',
      entityType: 'UserRole',
      entityId: id,
      metadata: next,
      ...this.audit.fromRequest(req)
    });
    return next;
  }

  @Post('users/roles/:id/delete')
  @RequirePermissions(Permission.USER_MANAGE)
  async deleteUsersRole(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Req() req: Request
  ) {
    const items = await this.getAppJson<Array<Record<string, unknown>>>('users_roles_catalog', []);
    const next = items.filter((it) => String(it.id) !== id);
    await this.setAppJson('users_roles_catalog', next);
    await this.audit.log({
      actorUserId: user.sub,
      action: 'USER_MANAGE',
      entityType: 'UserRole',
      entityId: id,
      metadata: { deleted: true },
      ...this.audit.fromRequest(req)
    });
    return { ok: true };
  }

  @Get('users/groups/list')
  @RequirePermissions(Permission.USER_MANAGE)
  async usersGroupsList() {
    const items = await this.getAppJson<Array<Record<string, unknown>>>('users_groups_catalog', []);
    return { items, page: 1, pageSize: 1000, total: items.length, totalPages: 1 };
  }

  @Post('users/groups')
  @RequirePermissions(Permission.USER_MANAGE)
  async createUsersGroup(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: { title?: string; description?: string; status?: string },
    @Req() req: Request
  ) {
    const title = String(body.title ?? '').trim();
    if (!title) return { ok: false, message: 'title is required' };
    const items = await this.getAppJson<Array<Record<string, unknown>>>('users_groups_catalog', []);
    const created = {
      id: randomUUID(),
      title,
      description: String(body.description ?? ''),
      status: String(body.status ?? 'ACTIVE').toUpperCase(),
      usersCount: 0,
      createdAt: new Date().toISOString()
    };
    items.unshift(created);
    await this.setAppJson('users_groups_catalog', items);
    await this.audit.log({
      actorUserId: user.sub,
      action: 'USER_MANAGE',
      entityType: 'UserGroup',
      entityId: String(created.id),
      metadata: created,
      ...this.audit.fromRequest(req)
    });
    return created;
  }

  @Patch('users/groups/:id')
  @RequirePermissions(Permission.USER_MANAGE)
  async updateUsersGroup(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; status?: string },
    @Req() req: Request
  ) {
    const items = await this.getAppJson<Array<Record<string, unknown>>>('users_groups_catalog', []);
    const idx = items.findIndex((it) => String(it.id) === id);
    if (idx < 0) return { ok: false, message: 'Group not found' };
    const next = {
      ...items[idx],
      ...(body.title !== undefined ? { title: String(body.title) } : {}),
      ...(body.description !== undefined ? { description: String(body.description) } : {}),
      ...(body.status !== undefined ? { status: String(body.status).toUpperCase() } : {}),
      updatedAt: new Date().toISOString()
    };
    items[idx] = next;
    await this.setAppJson('users_groups_catalog', items);
    await this.audit.log({
      actorUserId: user.sub,
      action: 'USER_MANAGE',
      entityType: 'UserGroup',
      entityId: id,
      metadata: next,
      ...this.audit.fromRequest(req)
    });
    return next;
  }

  @Post('users/groups/:id/delete')
  @RequirePermissions(Permission.USER_MANAGE)
  async deleteUsersGroup(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Req() req: Request
  ) {
    const items = await this.getAppJson<Array<Record<string, unknown>>>('users_groups_catalog', []);
    const next = items.filter((it) => String(it.id) !== id);
    await this.setAppJson('users_groups_catalog', next);
    await this.audit.log({
      actorUserId: user.sub,
      action: 'USER_MANAGE',
      entityType: 'UserGroup',
      entityId: id,
      metadata: { deleted: true },
      ...this.audit.fromRequest(req)
    });
    return { ok: true };
  }

  @Get('users/badges/list')
  @RequirePermissions(Permission.USER_MANAGE)
  async usersBadgesList() {
    const items = await this.getAppJson<Array<Record<string, unknown>>>('users_badges_catalog', []);
    return { items, page: 1, pageSize: 1000, total: items.length, totalPages: 1 };
  }

  @Post('users/badges')
  @RequirePermissions(Permission.USER_MANAGE)
  async createUsersBadge(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: { title?: string; icon?: string; description?: string; status?: string },
    @Req() req: Request
  ) {
    const title = String(body.title ?? '').trim();
    if (!title) return { ok: false, message: 'title is required' };
    const items = await this.getAppJson<Array<Record<string, unknown>>>('users_badges_catalog', []);
    const created = {
      id: randomUUID(),
      title,
      icon: String(body.icon ?? ''),
      description: String(body.description ?? ''),
      status: String(body.status ?? 'ACTIVE').toUpperCase(),
      assignedCount: 0,
      createdAt: new Date().toISOString()
    };
    items.unshift(created);
    await this.setAppJson('users_badges_catalog', items);
    await this.audit.log({
      actorUserId: user.sub,
      action: 'USER_MANAGE',
      entityType: 'UserBadge',
      entityId: String(created.id),
      metadata: created,
      ...this.audit.fromRequest(req)
    });
    return created;
  }

  @Patch('users/badges/:id')
  @RequirePermissions(Permission.USER_MANAGE)
  async updateUsersBadge(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: { title?: string; icon?: string; description?: string; status?: string },
    @Req() req: Request
  ) {
    const items = await this.getAppJson<Array<Record<string, unknown>>>('users_badges_catalog', []);
    const idx = items.findIndex((it) => String(it.id) === id);
    if (idx < 0) return { ok: false, message: 'Badge not found' };
    const next = {
      ...items[idx],
      ...(body.title !== undefined ? { title: String(body.title) } : {}),
      ...(body.icon !== undefined ? { icon: String(body.icon) } : {}),
      ...(body.description !== undefined ? { description: String(body.description) } : {}),
      ...(body.status !== undefined ? { status: String(body.status).toUpperCase() } : {}),
      updatedAt: new Date().toISOString()
    };
    items[idx] = next;
    await this.setAppJson('users_badges_catalog', items);
    await this.audit.log({
      actorUserId: user.sub,
      action: 'USER_MANAGE',
      entityType: 'UserBadge',
      entityId: id,
      metadata: next,
      ...this.audit.fromRequest(req)
    });
    return next;
  }

  @Post('users/badges/:id/delete')
  @RequirePermissions(Permission.USER_MANAGE)
  async deleteUsersBadge(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Req() req: Request
  ) {
    const items = await this.getAppJson<Array<Record<string, unknown>>>('users_badges_catalog', []);
    const next = items.filter((it) => String(it.id) !== id);
    await this.setAppJson('users_badges_catalog', next);
    await this.audit.log({
      actorUserId: user.sub,
      action: 'USER_MANAGE',
      entityType: 'UserBadge',
      entityId: id,
      metadata: { deleted: true },
      ...this.audit.fromRequest(req)
    });
    return { ok: true };
  }

  @Get('users/login-history')
  @RequirePermissions(Permission.AUDIT_LOG_VIEW)
  usersLoginHistory(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('AuditLog', query, {
      searchColumns: ['actorUserId', 'action', 'ipAddress'],
      extraWhere: { entityType: 'AuthSession' }
    });
  }

  @Get('forum/topics')
  @RequirePermissions(Permission.FORUM_READ)
  forumTopics(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('ForumTopic', query, { searchColumns: ['title', 'content'] });
  }

  @Get('crm/supports')
  @RequirePermissions(Permission.SUPPORT_READ)
  crmSupports(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('SupportTicket', query, { searchColumns: ['subject', 'message'] });
  }

  @Patch('crm/supports/:id')
  @RequirePermissions(Permission.SUPPORT_UPDATE)
  async updateSupport(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: { status?: string; priority?: string; assignedToId?: string | null },
    @Req() req: Request
  ) {
    const row = await this.db.models.SupportTicket.findByPk(id);
    if (!row) return { ok: false, message: 'Support ticket not found' };
    await row.update({
      ...(body.status !== undefined ? { status: String(body.status).slice(0, 20) } : {}),
      ...(body.priority !== undefined ? { priority: String(body.priority).slice(0, 20) } : {}),
      ...(body.assignedToId !== undefined ? { assignedToId: body.assignedToId } : {})
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'SUPPORT_UPDATE',
      entityType: 'SupportTicket',
      entityId: id,
      metadata: body,
      ...this.audit.fromRequest(req)
    });
    return row;
  }

  @Get('crm/supports/export.csv')
  @RequirePermissions(Permission.SUPPORT_READ)
  async exportSupports(@Query() query: AdminListQueryDto, @Res() res: Response) {
    const list = await this.adminService.listModel('SupportTicket', { ...query, page: '1', pageSize: '1000' }, {
      searchColumns: ['subject', 'message']
    });
    this.sendCsv(
      res,
      'support-tickets.csv',
      ['id', 'subject', 'status', 'priority', 'openedById', 'assignedToId', 'createdAt'],
      list.items.map((row: RowLike) => [
        row.get('id'),
        row.get('subject'),
        row.get('status'),
        row.get('priority'),
        row.get('openedById'),
        row.get('assignedToId'),
        row.get('createdAt')
      ])
    );
  }

  @Get('crm/notifications')
  @RequirePermissions(Permission.NOTIFICATION_READ)
  crmNotifications(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('Notification', query, { searchColumns: ['title', 'message', 'audience'] });
  }

  @Post('crm/notifications')
  @RequirePermissions(Permission.NOTIFICATION_SEND)
  async crmCreateNotification(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: { title?: string; message?: string; audience?: string },
    @Req() req: Request
  ) {
    const created = await this.db.models.Notification.create({
      id: randomUUID(),
      title: String(body.title ?? 'Nouvelle notification').slice(0, 200),
      message: String(body.message ?? ''),
      audience: String(body.audience ?? 'ALL').slice(0, 64),
      status: 'SENT',
      createdById: user.sub
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'NOTIFICATION_SEND',
      entityType: 'Notification',
      entityId: String(created.get('id')),
      metadata: { audience: created.get('audience') as string },
      ...this.audit.fromRequest(req)
    });
    return created;
  }

  @Patch('crm/notifications/:id')
  @RequirePermissions(Permission.NOTIFICATION_ARCHIVE)
  async updateNotification(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: { status?: string },
    @Req() req: Request
  ) {
    const row = await this.db.models.Notification.findByPk(id);
    if (!row) return { ok: false, message: 'Notification not found' };
    const status = body.status === 'ARCHIVED' ? 'ARCHIVED' : 'SENT';
    await row.update({ status });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'NOTIFICATION_UPDATE',
      entityType: 'Notification',
      entityId: id,
      metadata: { status },
      ...this.audit.fromRequest(req)
    });
    return row;
  }

  @Get('crm/noticeboards')
  @RequirePermissions(Permission.NOTICEBOARD_READ)
  crmNoticeboards(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('Noticeboard', query, { searchColumns: ['title', 'message'] });
  }

  @Get('crm/newsletters')
  @RequirePermissions(Permission.NEWSLETTER_READ)
  crmNewsletters(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('Newsletter', query, { searchColumns: ['subject', 'body'] });
  }

  @Get('content/blog')
  @RequirePermissions(Permission.BLOG_READ)
  contentBlog(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('Blog', query, { searchColumns: ['title', 'content'] });
  }

  @Post('content/blog')
  @RequirePermissions(Permission.BLOG_CREATE)
  async createBlog(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: { title?: string; content?: string; status?: string; categoryId?: string | null },
    @Req() req: Request
  ) {
    const created = await this.db.models.Blog.create({
      id: randomUUID(),
      title: String(body.title ?? 'Nouveau billet').slice(0, 200),
      content: String(body.content ?? ''),
      status: String(body.status ?? 'DRAFT').slice(0, 20),
      categoryId: body.categoryId ?? null,
      createdById: user.sub
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'BLOG_CREATE',
      entityType: 'Blog',
      entityId: String(created.get('id')),
      metadata: { title: created.get('title') as string },
      ...this.audit.fromRequest(req)
    });
    return created;
  }

  @Patch('content/blog/:id')
  @RequirePermissions(Permission.BLOG_CREATE)
  async updateBlog(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: { title?: string; content?: string; status?: string; categoryId?: string | null },
    @Req() req: Request
  ) {
    const row = await this.db.models.Blog.findByPk(id);
    if (!row) return { ok: false, message: 'Blog not found' };
    await row.update({
      ...(body.title !== undefined ? { title: String(body.title).slice(0, 200) } : {}),
      ...(body.content !== undefined ? { content: String(body.content) } : {}),
      ...(body.status !== undefined ? { status: String(body.status).slice(0, 20) } : {}),
      ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {})
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'BLOG_UPDATE',
      entityType: 'Blog',
      entityId: id,
      metadata: body,
      ...this.audit.fromRequest(req)
    });
    return row;
  }

  @Get('content/categories')
  @RequirePermissions(Permission.CATEGORY_READ)
  contentCategories(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('BlogCategory', query, { searchColumns: ['name'] });
  }

  @Post('content/categories')
  @RequirePermissions(Permission.CATEGORY_CREATE)
  async createContentCategory(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: { name?: string; status?: string },
    @Req() req: Request
  ) {
    const created = await this.db.models.BlogCategory.create({
      id: randomUUID(),
      name: String(body.name ?? 'Nouvelle categorie').slice(0, 120),
      status: String(body.status ?? 'ACTIVE').slice(0, 20)
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'CATEGORY_CREATE',
      entityType: 'BlogCategory',
      entityId: String(created.get('id')),
      metadata: { name: created.get('name') as string },
      ...this.audit.fromRequest(req)
    });
    return created;
  }

  @Patch('content/categories/:id')
  @RequirePermissions(Permission.CATEGORY_CREATE)
  async updateContentCategory(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: { name?: string; status?: string },
    @Req() req: Request
  ) {
    const row = await this.db.models.BlogCategory.findByPk(id);
    if (!row) return { ok: false, message: 'Category not found' };
    await row.update({
      ...(body.name !== undefined ? { name: String(body.name).slice(0, 120) } : {}),
      ...(body.status !== undefined ? { status: String(body.status).slice(0, 20) } : {})
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'CATEGORY_CREATE',
      entityType: 'BlogCategory',
      entityId: id,
      metadata: body as unknown as Record<string, unknown>,
      ...this.audit.fromRequest(req)
    });
    return row;
  }

  @Get('users/become-instructors/instructors')
  @RequirePermissions(Permission.USER_MANAGE)
  async instructorRequests(@Query() query: AdminListQueryDto) {
    const list = await this.adminService.listModel('UserProfile', query, {
      searchColumns: ['fullName', 'email', 'jobTitle', 'department']
    });
    const items = (list.items ?? []).filter((row) => {
      const status = String((row as RowLike).get('status') ?? '').toUpperCase();
      const jobTitle = String((row as RowLike).get('jobTitle') ?? '').toLowerCase();
      return (
        status === 'PENDING_INSTRUCTOR' ||
        status === 'INSTRUCTOR_PENDING' ||
        jobTitle.includes('formateur') ||
        jobTitle.includes('trainer') ||
        jobTitle.includes('instructor')
      );
    });
    return {
      ...list,
      items,
      total: items.length,
      totalPages: 1,
      page: 1
    };
  }

  @Get('users/become-instructors/organizations')
  @RequirePermissions(Permission.USER_MANAGE)
  async instructorOrganizationRequests(@Query() query: AdminListQueryDto) {
    const list = await this.adminService.listModel('UserProfile', query, {
      searchColumns: ['fullName', 'email', 'jobTitle', 'department']
    });
    const items = (list.items ?? []).filter((row) => {
      const status = String((row as RowLike).get('status') ?? '').toUpperCase();
      const jt = String((row as RowLike).get('jobTitle') ?? '').toLowerCase();
      const dp = String((row as RowLike).get('department') ?? '').toLowerCase();
      return (
        status === 'PENDING_INSTRUCTOR' ||
        status === 'INSTRUCTOR_PENDING' ||
        jt.includes('organization') ||
        jt.includes('organisation') ||
        dp.includes('organization') ||
        dp.includes('organisation')
      );
    });
    return {
      ...list,
      items,
      total: items.length,
      totalPages: 1,
      page: 1
    };
  }

  @Get('users/become-instructors/settings')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  async instructorRequestSettings() {
    const rows = await this.db.models.AppSetting.findAll({
      where: {
        key: {
          [Op.in]: ['instructor_requests_enabled', 'organization_requests_enabled', 'instructor_auto_approve']
        }
      },
      order: [['key', 'ASC']]
    });
    const map: Record<string, string> = {};
    rows.forEach((row) => {
      map[String(row.get('key'))] = String(row.get('value') ?? '');
    });
    return {
      instructor_requests_enabled: map.instructor_requests_enabled ?? 'true',
      organization_requests_enabled: map.organization_requests_enabled ?? 'true',
      instructor_auto_approve: map.instructor_auto_approve ?? 'false'
    };
  }

  @Patch('users/become-instructors/settings')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  async updateInstructorRequestSettings(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body()
    body: {
      instructor_requests_enabled?: string | boolean;
      organization_requests_enabled?: string | boolean;
      instructor_auto_approve?: string | boolean;
    },
    @Req() req: Request
  ) {
    const entries: Array<[string, string]> = [
      ['instructor_requests_enabled', String(body.instructor_requests_enabled ?? 'true')],
      ['organization_requests_enabled', String(body.organization_requests_enabled ?? 'true')],
      ['instructor_auto_approve', String(body.instructor_auto_approve ?? 'false')]
    ];
    for (const [key, value] of entries) {
      const existing = await this.db.models.AppSetting.findOne({ where: { key } });
      if (existing) {
        await existing.update({ value });
      } else {
        await this.db.models.AppSetting.create({ id: randomUUID(), key, value });
      }
    }
    await this.audit.log({
      actorUserId: user.sub,
      action: 'USER_MANAGE',
      entityType: 'AppSetting',
      entityId: 'instructor-request-settings',
      metadata: Object.fromEntries(entries),
      ...this.audit.fromRequest(req)
    });
    return { ok: true };
  }

  @Patch('users/become-instructors/instructors/:id')
  @RequirePermissions(Permission.USER_MANAGE)
  async updateInstructorRequest(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: { status?: string; decision?: 'APPROVE' | 'REJECT' },
    @Req() req: Request
  ) {
    const row = await this.db.models.UserProfile.findByPk(id);
    if (!row) return { ok: false, message: 'User not found' };
    const decision = String(body.decision ?? '').toUpperCase();
    const computedStatus = decision === 'APPROVE' ? 'ACTIVE' : decision === 'REJECT' ? 'REJECTED' : String(body.status ?? 'ACTIVE').toUpperCase();
    const computedJobTitle = decision === 'APPROVE'
      ? (String(row.get('jobTitle') ?? '').trim() || 'FORMATEUR')
      : String(row.get('jobTitle') ?? '');
    await row.update({
      status: computedStatus,
      jobTitle: computedJobTitle
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'USER_MANAGE',
      entityType: 'UserProfile',
      entityId: id,
      metadata: { decision, status: computedStatus },
      ...this.audit.fromRequest(req)
    });
    return row;
  }

  @Get('content/pages')
  @RequirePermissions(Permission.PAGE_READ)
  contentPages(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('Page', query, { searchColumns: ['title', 'content'] });
  }

  @Get('content/tags')
  @RequirePermissions(Permission.TAG_READ)
  contentTags(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('Tag', query, { searchColumns: ['name'] });
  }

  @Get('settings/app')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  settings(@Query() query: AdminListQueryDto) {
    return this.adminService.listModel('AppSetting', query, { searchColumns: ['key', 'value'] });
  }

  @Get('audit-logs/export.csv')
  @RequirePermissions(Permission.AUDIT_LOG_VIEW)
  async exportAuditLogs(@Query() query: AdminListQueryDto, @Res() res: Response) {
    const list = await this.adminService.listModel('AuditLog', { ...query, page: '1', pageSize: '2000' }, {
      searchColumns: ['actorUserId', 'action', 'entityType', 'entityId', 'ipAddress']
    });
    this.sendCsv(
      res,
      'audit-logs.csv',
      ['id', 'actorUserId', 'action', 'entityType', 'entityId', 'ipAddress', 'createdAt'],
      list.items.map((row: RowLike) => [
        row.get('id'),
        row.get('actorUserId'),
        row.get('action'),
        row.get('entityType'),
        row.get('entityId'),
        row.get('ipAddress'),
        row.get('createdAt')
      ])
    );
  }

  private sendCsv(res: Response, filename: string, headers: string[], rows: Array<Array<unknown>>) {
    const escaped = (value: unknown) => {
      const text = value === null || value === undefined ? '' : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = [headers.map(escaped).join(','), ...rows.map((row) => row.map(escaped).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  }
}
