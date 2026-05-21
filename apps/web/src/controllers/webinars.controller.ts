import { Body, Controller, Get, Param, Patch, Post, Query, Redirect, Render, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { fetchApiJson, patchApiJson, postApiJson } from '../lib/api-client';
import { AuthUser, PageContext } from '../security/auth.types';
import { WebAuthGuard } from '../security/web-auth.guard';

type RequestWithAuth = Request & { authUser?: AuthUser };

type AdminListResponse = {
  items?: Array<Record<string, unknown>>;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
};

@Controller('/admin')
@UseGuards(WebAuthGuard)
export class WebinarsController {
  private resolveCourseType(value?: string): 'course' | 'webinar' | 'text_lesson' {
    return value === 'webinar' || value === 'text_lesson' ? value : 'course';
  }

  private buildCourseTitle(rawTitle: string, type: 'course' | 'webinar' | 'text_lesson'): string {
    const clean = String(rawTitle ?? '').trim() || 'New course';
    const withoutPrefix = clean.replace(/^\[(COURSE|LIVE|TEXT)\]\s*/i, '').trim();
    const prefix = type === 'webinar' ? '[LIVE] ' : type === 'text_lesson' ? '[TEXT] ' : '[COURSE] ';
    return `${prefix}${withoutPrefix}`.trim();
  }

  private toNullableNumber(value: unknown): number | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  private readonly defaultCategoryFilters = [
    {
      key: 'level',
      label: 'Level',
      options: ['Beginner', 'Intermediate', 'Advanced']
    },
    {
      key: 'language',
      label: 'Langue',
      options: ['Francais', 'Arabe', 'Anglais']
    },
    {
      key: 'topic',
      label: 'Topic',
      options: ['Reglementaire', 'Supervision', 'Conformite', 'Inspection']
    }
  ];

  private normalizeFilterGroups(raw: unknown) {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((group, gIndex) => {
        if (!group || typeof group !== 'object') return null;
        const key = String((group as { key?: unknown }).key ?? `group_${gIndex}`);
        const label = String((group as { label?: unknown }).label ?? key);
        const optionsRaw = (group as { options?: unknown }).options;
        if (!Array.isArray(optionsRaw)) return null;
        const options = optionsRaw
          .map((option, oIndex) => {
            const value = String(option ?? '').trim();
            if (!value) return null;
            return { id: `${key}_${gIndex}_${oIndex}`, label: value };
          })
          .filter((x): x is { id: string; label: string } => Boolean(x));
        if (!options.length) return null;
        return { key, label, options };
      })
      .filter((x): x is { key: string; label: string; options: Array<{ id: string; label: string }> } => Boolean(x));
  }

  private classifyCourseKind(course: Record<string, unknown>): 'course' | 'webinar' | 'text_lesson' {
    const rawTitle = String(course.title ?? '').toLowerCase();
    if (rawTitle.includes('[live]') || rawTitle.includes('live') || rawTitle.includes('class')) return 'webinar';
    if (rawTitle.includes('[text]') || rawTitle.includes('text')) return 'text_lesson';
    return 'course';
  }

  private buildPage(req: RequestWithAuth, title: string, activeNav = 'courses'): PageContext {
    return {
      title,
      activeNav,
      currentPath: req.path,
      user: req.authUser ?? null,
      breadcrumbs: [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Courses' },
        { label: title.replace(' - Wikigouv', '') }
      ]
    };
  }

  @Get('webinars/create')
  @Render('pages/panel/webinars-create')
  async createForm(@Req() req: RequestWithAuth, @Query('ok') ok?: string, @Query('error') error?: string) {
    const page = this.buildPage(req, 'New Course - Wikigouv');
    if (ok) page.alert = { type: 'success', message: `Succes: ${ok}` };
    if (error) page.alert = { type: 'danger', message: `Erreur: ${error}` };

    const [categoriesResp, instructorsResp] = await Promise.all([
      fetchApiJson<AdminListResponse>(req, '/api/admin/education/categories?page=1&pageSize=200'),
      fetchApiJson<AdminListResponse>(req, '/api/admin/education/instructors?page=1&pageSize=300')
    ]);

    const topCategories = (categoriesResp.data?.items ?? []).map((item) => ({
      id: String(item.id ?? ''),
      name: String(item.title ?? item.name ?? 'Untitled category')
    }));

    const categories = await Promise.all(
      topCategories.map(async (cat) => {
        const detail = await fetchApiJson<{ category?: Record<string, unknown>; subCategories?: Array<Record<string, unknown>> }>(
          req,
          `/api/admin/education/categories/${encodeURIComponent(cat.id)}`
        );
        const subCategories = (detail.data?.subCategories ?? []).map((sub) => ({
          id: String(sub.id ?? ''),
          name: String(sub.title ?? 'Untitled subcategory'),
          parentId: String(sub.parentId ?? cat.id)
        }));
        return { ...cat, subCategories };
      })
    );

    const instructors = (instructorsResp.data?.items ?? [])
      .map((item) => ({
        id: String(item.keycloakUserId ?? item.id ?? ''),
        fullName: String(item.fullName ?? ''),
        email: String(item.email ?? ''),
        jobTitle: String(item.jobTitle ?? '')
      }))
      .filter((user) => Boolean(user.id && user.fullName));

    return { page, categories, instructors };
  }

  @Post('webinars/create')
  @Redirect('/admin/webinars/create')
  async createWebinar(
    @Req() req: RequestWithAuth,
    @Body()
    body: {
      type?: 'course' | 'webinar' | 'text_lesson';
      courseType?: 'course' | 'webinar' | 'text_lesson';
      locale?: string;
      title?: string;
      points?: string;
      seoDescription?: string;
      summary?: string;
      description?: string;
      slug?: string;
      category?: string;
      instructor?: string;
      teacherId?: string;
      categoryId?: string;
      categoryFilters?: string | string[];
      categoryFiltersSerialized?: string;
      subCategoryIds?: string | string[];
      subCategoriesSerialized?: string;
      thumbnail?: string;
      coverImage?: string;
      icon?: string;
      timezone?: string;
      capacity?: string;
      videoDemoSource?: string;
      videoDemo?: string;
      videoDemoMinioBucket?: string;
      videoDemoMinioKey?: string;
      status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      draft?: 'yes' | 'no';
      tags?: string;
      hasPrerequisite?: string;
      support?: string;
      certificate?: string;
      downloadable?: string;
      forum?: string;
      private?: string;
      enableWaitlist?: string;
      accessDays?: string;
      messageForReviewer?: string;
    }
  ) {
    const courseType = this.resolveCourseType(body.type ?? body.courseType);
    const title = this.buildCourseTitle(String(body.title ?? ''), courseType);
    const shouldSaveAsDraft = body.draft === 'yes';
    const effectiveStatus = shouldSaveAsDraft ? 'DRAFT' : (body.status ?? 'PUBLISHED');

    const result = await postApiJson(req, '/api/admin/education/courses', {
      title,
      slug: String(body.slug ?? ''),
      description: String(body.description ?? body.summary ?? ''),
      status: effectiveStatus,
      metadata: {
        locale: String(body.locale ?? 'FR'),
        type: courseType,
        points: this.toNullableNumber(body.points),
        seoDescription: String(body.seoDescription ?? ''),
        summary: String(body.summary ?? ''),
        slug: String(body.slug ?? ''),
        category: String(body.category ?? ''),
        instructor: String(body.instructor ?? ''),
        teacherId: String(body.teacherId ?? ''),
        categoryId: String(body.categoryId ?? ''),
        categoryFilters: Array.isArray(body.categoryFilters)
          ? body.categoryFilters
          : String(body.categoryFiltersSerialized ?? body.categoryFilters ?? '')
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean),
        subCategoryIds: Array.isArray(body.subCategoryIds)
          ? body.subCategoryIds
          : String(body.subCategoriesSerialized ?? body.subCategoryIds ?? '')
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean),
        tags: String(body.tags ?? ''),
        reviewerMessage: String(body.messageForReviewer ?? ''),
        thumbnail: String(body.thumbnail ?? ''),
        coverImage: String(body.coverImage ?? ''),
        icon: String(body.icon ?? ''),
        videoDemoSource: String(body.videoDemoSource ?? 'upload'),
        videoDemo: String(body.videoDemo ?? ''),
        videoDemoMinioBucket: String(body.videoDemoMinioBucket ?? ''),
        videoDemoMinioKey: String(body.videoDemoMinioKey ?? ''),
        timezone: String(body.timezone ?? 'Africa/Brazzaville'),
        capacity: String(body.capacity ?? ''),
        accessDays: this.toNullableNumber(body.accessDays),
        hasPrerequisite: String(body.hasPrerequisite ?? 'no'),
        settings: {
          support: Boolean(body.support),
          certificate: Boolean(body.certificate),
          downloadable: Boolean(body.downloadable),
          forum: Boolean(body.forum),
          private: Boolean(body.private),
          enableWaitlist: Boolean(body.enableWaitlist)
        }
      }
    });

    const rawId = result.ok && result.data ? (result.data as { id?: unknown }).id : undefined;
    const createdId = rawId !== undefined && rawId !== null ? String(rawId) : '';

    return {
      url: result.ok
        ? shouldSaveAsDraft
          ? '/admin/webinars/create?ok=draft_saved'
          : createdId
            ? `/admin/webinars/${encodeURIComponent(createdId)}/edit?ok=course_created`
            : `/admin/webinars?type=${encodeURIComponent(courseType)}&ok=course_created`
        : `/admin/webinars/create?error=create_${result.status}`
    };
  }

  @Get('webinars/:id/edit')
  @Render('pages/panel/webinars-edit')
  async editForm(@Req() req: RequestWithAuth, @Query('ok') ok?: string, @Param('id') id?: string) {
    const page = this.buildPage(req, 'Edit Course - Wikigouv');
    if (ok) page.alert = { type: 'success', message: `Succes: ${ok}` };
    return { page, webinarId: id ?? '' };
  }

  @Get('webinars/:id/edit/course')
  @Render('pages/panel/webinars-course-edit')
  async editCourseForm(@Req() req: RequestWithAuth, @Param('id') id: string, @Query('ok') ok?: string) {
    const page = this.buildPage(req, 'Edit Course Information - Wikigouv');
    if (ok) page.alert = { type: 'success', message: `Succes: ${ok}` };
    const [categoriesResp, instructorsResp, courseResp] = await Promise.all([
      fetchApiJson<AdminListResponse>(req, '/api/admin/education/categories?page=1&pageSize=200'),
      fetchApiJson<AdminListResponse>(req, '/api/admin/education/instructors?page=1&pageSize=300'),
      fetchApiJson<{ ok?: boolean; item?: Record<string, unknown> }>(
        req,
        `/api/admin/education/courses/${encodeURIComponent(id)}`
      )
    ]);

    const topCategories = (categoriesResp.data?.items ?? []).map((item) => ({
      id: String(item.id ?? ''),
      name: String(item.title ?? item.name ?? 'Untitled category')
    }));

    const categories = await Promise.all(
      topCategories.map(async (cat) => {
        const detail = await fetchApiJson<{ category?: Record<string, unknown>; subCategories?: Array<Record<string, unknown>> }>(
          req,
          `/api/admin/education/categories/${encodeURIComponent(cat.id)}`
        );
        const subCategories = (detail.data?.subCategories ?? []).map((sub) => ({
          id: String(sub.id ?? ''),
          name: String(sub.title ?? 'Untitled subcategory'),
          parentId: String(sub.parentId ?? cat.id)
        }));
        return { ...cat, subCategories };
      })
    );

    const instructors = (instructorsResp.data?.items ?? [])
      .map((item) => ({
        id: String(item.keycloakUserId ?? item.id ?? ''),
        fullName: String(item.fullName ?? ''),
        email: String(item.email ?? ''),
        jobTitle: String(item.jobTitle ?? '')
      }))
      .filter((user) => Boolean(user.id && user.fullName));

    const course = courseResp.ok ? (courseResp.data?.item ?? null) : null;
    return {
      page,
      webinarId: id,
      course,
      courseStatus: courseResp.status,
      categories,
      instructors,
      formMode: 'edit'
    };
  }

  @Post('webinars/:id/edit/course')
  @Redirect('/admin/webinars')
  async updateCourseForm(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Body()
    body: {
      type?: 'course' | 'webinar' | 'text_lesson';
      courseType?: 'course' | 'webinar' | 'text_lesson';
      locale?: string;
      title?: string;
      points?: string;
      seoDescription?: string;
      summary?: string;
      description?: string;
      slug?: string;
      category?: string;
      instructor?: string;
      teacherId?: string;
      categoryId?: string;
      categoryFilters?: string | string[];
      categoryFiltersSerialized?: string;
      subCategoryIds?: string | string[];
      subCategoriesSerialized?: string;
      thumbnail?: string;
      coverImage?: string;
      icon?: string;
      timezone?: string;
      capacity?: string;
      videoDemoSource?: string;
      videoDemo?: string;
      videoDemoMinioBucket?: string;
      videoDemoMinioKey?: string;
      status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      tags?: string;
      hasPrerequisite?: string;
      support?: string;
      certificate?: string;
      downloadable?: string;
      forum?: string;
      private?: string;
      enableWaitlist?: string;
      accessDays?: string;
      messageForReviewer?: string;
    }
  ) {
    const courseType = this.resolveCourseType(body.type ?? body.courseType);
    const title = this.buildCourseTitle(String(body.title ?? ''), courseType);
    const result = await patchApiJson(req, `/api/admin/education/courses/${encodeURIComponent(id)}`, {
      title,
      slug: String(body.slug ?? ''),
      description: String(body.description ?? body.summary ?? ''),
      status: String(body.status ?? 'DRAFT'),
      metadata: {
        locale: String(body.locale ?? 'FR'),
        type: courseType,
        points: this.toNullableNumber(body.points),
        seoDescription: String(body.seoDescription ?? ''),
        summary: String(body.summary ?? ''),
        slug: String(body.slug ?? ''),
        category: String(body.category ?? ''),
        instructor: String(body.instructor ?? ''),
        teacherId: String(body.teacherId ?? ''),
        categoryId: String(body.categoryId ?? ''),
        categoryFilters: Array.isArray(body.categoryFilters)
          ? body.categoryFilters
          : String(body.categoryFiltersSerialized ?? body.categoryFilters ?? '')
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean),
        subCategoryIds: Array.isArray(body.subCategoryIds)
          ? body.subCategoryIds
          : String(body.subCategoriesSerialized ?? body.subCategoryIds ?? '')
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean),
        tags: String(body.tags ?? ''),
        reviewerMessage: String(body.messageForReviewer ?? ''),
        thumbnail: String(body.thumbnail ?? ''),
        coverImage: String(body.coverImage ?? ''),
        icon: String(body.icon ?? ''),
        videoDemoSource: String(body.videoDemoSource ?? 'upload'),
        videoDemo: String(body.videoDemo ?? ''),
        videoDemoMinioBucket: String(body.videoDemoMinioBucket ?? ''),
        videoDemoMinioKey: String(body.videoDemoMinioKey ?? ''),
        timezone: String(body.timezone ?? 'Africa/Brazzaville'),
        capacity: String(body.capacity ?? ''),
        accessDays: this.toNullableNumber(body.accessDays),
        hasPrerequisite: String(body.hasPrerequisite ?? 'no'),
        settings: {
          support: Boolean(body.support),
          certificate: Boolean(body.certificate),
          downloadable: Boolean(body.downloadable),
          forum: Boolean(body.forum),
          private: Boolean(body.private),
          enableWaitlist: Boolean(body.enableWaitlist)
        }
      }
    });
    return {
      url: result.ok
        ? `/admin/webinars/${encodeURIComponent(id)}/edit/course?ok=course_updated`
        : `/admin/webinars/${encodeURIComponent(id)}/edit/course?error=update_${result.status}`
    };
  }

  @Get('webinars/:id/sections')
  async getSectionItems(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Query('type') type?: string
  ) {
    if (type === 'quiz') {
      const quizzesResp = await fetchApiJson<{ items?: Array<Record<string, unknown>> }>(
        req,
        `/api/admin/education/courses/${encodeURIComponent(id)}/quizzes`
      );
      return { ok: quizzesResp.ok, items: quizzesResp.data?.items ?? [] };
    }
    const extrasResp = await fetchApiJson<{ items?: Array<Record<string, unknown>> }>(
      req,
      `/api/admin/education/courses/${encodeURIComponent(id)}/extras?type=${encodeURIComponent(type ?? '')}`
    );
    return { ok: extrasResp.ok, items: extrasResp.data?.items ?? [] };
  }

  @Post('webinars/:id/sections')
  async createSectionItem(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Body()
    body: {
      type?: string;
      title?: string;
      status?: string;
      payload?: Record<string, unknown>;
      passingScore?: number;
    }
  ) {
    if (body.type === 'quiz') {
      const result = await postApiJson(req, `/api/admin/education/courses/${encodeURIComponent(id)}/quizzes`, {
        title: String(body.title ?? 'New Quiz'),
        passingScore: Number(body.passingScore ?? 70),
        status: String(body.status ?? 'DRAFT'),
        payload: body.payload ?? {}
      });
      return { ok: result.ok, status: result.status, item: result.data, message: result.errorMessage ?? null };
    }

    const result = await postApiJson(req, `/api/admin/education/courses/${encodeURIComponent(id)}/extras`, {
      type: String(body.type ?? 'misc'),
      title: String(body.title ?? 'Untitled'),
      status: String(body.status ?? 'ACTIVE'),
      payload: body.payload ?? {}
    });
    return { ok: result.ok, status: result.status, item: result.data, message: result.errorMessage ?? null };
  }

  @Patch('webinars/:id/sections/:itemId')
  async updateSectionItem(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body()
    body: {
      type?: string;
      title?: string;
      status?: string;
      payload?: Record<string, unknown>;
    }
  ) {
    if (body.type === 'quiz') {
      const result = await patchApiJson(
        req,
        `/api/admin/education/courses/${encodeURIComponent(id)}/quizzes/${encodeURIComponent(itemId)}`,
        {
          title: body.title,
          status: body.status,
          passingScore:
            typeof body.payload?.pass_mark === 'number'
              ? Number(body.payload.pass_mark)
              : undefined,
          payload: body.payload
        }
      );
      return { ok: result.ok, status: result.status, item: result.data, message: result.errorMessage ?? null };
    }

    const updatePayload: Record<string, unknown> = {};
    if (body.title !== undefined) updatePayload.title = body.title;
    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.payload !== undefined) updatePayload.payload = body.payload;

    const result = await patchApiJson(
      req,
      `/api/admin/education/courses/${encodeURIComponent(id)}/extras/${encodeURIComponent(itemId)}`,
      updatePayload
    );
    return { ok: result.ok, status: result.status, item: result.data, message: result.errorMessage ?? null };
  }

  @Post('webinars/:id/sections/:itemId/delete')
  async deleteSectionItem(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: { type?: string }
  ) {
    const type = String(body?.type ?? '').toLowerCase();
    const endpoint = type === 'quiz'
      ? `/api/admin/education/courses/${encodeURIComponent(id)}/quizzes/${encodeURIComponent(itemId)}/delete`
      : `/api/admin/education/courses/${encodeURIComponent(id)}/extras/${encodeURIComponent(itemId)}/delete`;
    const result = await postApiJson(req, endpoint, {});
    return { ok: result.ok, status: result.status, message: result.errorMessage ?? null };
  }

  @Get('webinars/category-filters')
  async categoryFilters(@Req() req: RequestWithAuth, @Query('categoryId') categoryId?: string) {
    let groups: Array<{ key: string; label: string; options: Array<{ id: string; label: string }> }> = [];

    if (categoryId) {
      const categoriesResp = await fetchApiJson<AdminListResponse>(req, '/api/admin/education/categories?page=1&pageSize=500');
      const found = (categoriesResp.data?.items ?? []).find((item) => String(item.id ?? '') === String(categoryId));
      const candidate =
        (found as { filters?: unknown; metadata?: { filters?: unknown } } | undefined)?.filters ??
        (found as { metadata?: { filters?: unknown } } | undefined)?.metadata?.filters;
      groups = this.normalizeFilterGroups(candidate);
    }

    if (!groups.length) {
      const seed = Number((categoryId ?? '').replace(/\D/g, '') || 1);
      groups = this.defaultCategoryFilters.map((group, gIndex) => ({
        key: group.key,
        label: group.label,
        options: group.options.map((option, oIndex) => ({
          id: `${group.key}_${seed}_${gIndex}_${oIndex}`,
          label: option
        }))
      }));
    }

    return {
      categoryId: String(categoryId ?? ''),
      groups
    };
  }

  @Get('webinars')
  @Render('pages/panel/webinars-list')
  async list(
    @Req() req: RequestWithAuth,
    @Query('type') type?: 'course' | 'webinar' | 'text_lesson',
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('instructor') instructor?: string,
    @Query('category') category?: string,
    @Query('filterType') filterType?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string
  ) {
    const currentType = type ?? 'course';
    const page = this.buildPage(
      req,
      currentType === 'webinar'
        ? 'Live Class List - Wikigouv'
        : currentType === 'text_lesson'
          ? 'Text Course List - Wikigouv'
          : 'Courses List - Wikigouv'
    );

    const pageNumber = Math.max(1, Number(pageRaw ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '10') || 10));
    const queryParts = [
      `page=${pageNumber}`,
      `pageSize=${pageSize}`,
      q ? `q=${encodeURIComponent(q)}` : '',
      status ? `status=${encodeURIComponent(status)}` : '',
      dateFrom ? `dateFrom=${encodeURIComponent(dateFrom)}` : '',
      dateTo ? `dateTo=${encodeURIComponent(dateTo)}` : ''
    ].filter(Boolean);

    const response = await fetchApiJson<AdminListResponse>(req, `/api/admin/education/courses?${queryParts.join('&')}`);
    let typedItems = (response.data?.items ?? []).filter((item) => this.classifyCourseKind(item) === currentType);

    if (instructor) {
      const i = instructor.toLowerCase();
      typedItems = typedItems.filter((item) => String(item.createdById ?? '').toLowerCase().includes(i));
    }

    if (category) {
      const c = category.toLowerCase();
      typedItems = typedItems.filter((item) => String(item.category ?? '').toLowerCase().includes(c));
    }

    if (filterType) {
      typedItems = typedItems.filter((item) => this.classifyCourseKind(item) === filterType);
    }

    const localTotal = typedItems.length;
    const localTotalPages = Math.max(1, Math.ceil(localTotal / pageSize));
    const safePage = Math.min(pageNumber, localTotalPages);
    const start = (safePage - 1) * pageSize;
    const pagedRows = typedItems.slice(start, start + pageSize);

    return {
      page,
      type: currentType,
      query: {
        q: q ?? '',
        status: status ?? '',
        dateFrom: dateFrom ?? '',
        dateTo: dateTo ?? '',
        instructor: instructor ?? '',
        category: category ?? '',
        filterType: filterType ?? ''
      },
      listStatus: response.status,
      rows: pagedRows,
      metrics: {
        total: localTotal,
        pending: typedItems.filter((item) => String(item.status ?? '') === 'DRAFT').length,
        totalDurations: `${String(Math.max(1, typedItems.length * 5)).padStart(2, '0')}:00 Hours`,
        totalSales: typedItems.length
      },
      pageNumber: safePage,
      pageSize,
      totalPages: localTotalPages
    };
  }

  @Post('webinars/status')
  @Redirect('/admin/webinars?type=course')
  async updateStatus(
    @Req() req: RequestWithAuth,
    @Body()
    body: {
      id?: string;
      type?: 'course' | 'webinar' | 'text_lesson';
      status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      page?: string;
      pageSize?: string;
      q?: string;
      filterStatus?: string;
      dateFrom?: string;
      dateTo?: string;
      instructor?: string;
      category?: string;
      filterType?: string;
    }
  ) {
    const id = String(body.id ?? '');
    const type = body.type ?? 'course';
    const status = body.status ?? 'DRAFT';

    if (!id) return { url: `/admin/webinars?type=${type}&error=missing_id` };

    const result = await patchApiJson(req, `/api/admin/education/courses/${encodeURIComponent(id)}`, { status });
    const queryParts = [
      `type=${encodeURIComponent(type)}`,
      body.page ? `page=${encodeURIComponent(body.page)}` : '',
      body.pageSize ? `pageSize=${encodeURIComponent(body.pageSize)}` : '',
      body.q ? `q=${encodeURIComponent(body.q)}` : '',
      body.filterStatus ? `status=${encodeURIComponent(body.filterStatus)}` : '',
      body.dateFrom ? `dateFrom=${encodeURIComponent(body.dateFrom)}` : '',
      body.dateTo ? `dateTo=${encodeURIComponent(body.dateTo)}` : '',
      body.instructor ? `instructor=${encodeURIComponent(body.instructor)}` : '',
      body.category ? `category=${encodeURIComponent(body.category)}` : '',
      body.filterType ? `filterType=${encodeURIComponent(body.filterType)}` : ''
    ].filter(Boolean);
    queryParts.push(result.ok ? `ok=status_${status.toLowerCase()}` : `error=status_${result.status}`);
    return { url: `/admin/webinars?${queryParts.join('&')}` };
  }

}
