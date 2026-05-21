import { Body, Controller, Get, Param, Post, Query, Redirect, Render, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthUser, PageContext } from '../security/auth.types';
import { fetchApiJson, fetchApiPublicJson, postApiJson } from '../lib/api-client';
import { WebAuthGuard } from '../security/web-auth.guard';

type RequestWithAuth = Request & { authUser?: AuthUser };
type AdminListResponse = {
  items?: Array<Record<string, unknown>>;
};

@Controller()
export class CoursesController {
  private normalizeLearningItem(
    item: Record<string, unknown>,
    type: 'file' | 'session' | 'text_lesson' | 'quiz' | 'interactive_file'
  ): Record<string, unknown> {
    const payload = (item.payload ?? {}) as Record<string, unknown>;
    const media = String(payload.video_demo ?? payload.video ?? payload.file_path ?? payload.path ?? payload.link ?? payload.url ?? '');
    const source = String(payload.video_demo_source ?? payload.storage ?? payload.source ?? '');
    return {
      id: String(item.id ?? ''),
      webinar_id: String(item.courseId ?? ''),
      title: String(item.title ?? ''),
      storage: source,
      file_path: media,
      is_video: Boolean(media && (/\.(mp4|webm|ogg|mov|m4v)$/i.test(media) || source === 'youtube' || source === 'vimeo' || source === 'secure_host')),
      downloadable: Boolean(payload.downloadable ?? true),
      online_viewer: Boolean(payload.online_viewer ?? false),
      summary: String(payload.summary ?? payload.description ?? ''),
      content: String(payload.content ?? payload.description ?? ''),
      status: String(payload.status ?? item.status ?? ''),
      session_api: String(payload.session_api ?? ''),
      date: String(payload.date ?? ''),
      duration: Number(payload.duration ?? 0),
      extra_time_to_join: Number(payload.extra_time_to_join ?? 0),
      attempt: Number(payload.attempt ?? payload.attempts ?? 0),
      pass_mark: Number(payload.pass_mark ?? payload.passingScore ?? 0),
      questions_count: Number(payload.questionsCount ?? payload.questions_count ?? 0),
      pass_grade: Number(payload.pass_grade ?? 0),
      deadline: String(payload.deadline ?? ''),
      interactive_file_name: String(payload.interactive_file_name ?? payload.index_file_name ?? ''),
      interactive_type: String(payload.interactive_type ?? ''),
      modelName: type
    };
  }
  @Get('/courses')
  @Render('pages/courses/index')
  async courses(
    @Req() req: RequestWithAuth,
    @Query('q') q?: string,
    @Query('level') level?: string,
    @Query('status') status?: string
  ) {
    const page: PageContext = {
      title: 'Catalogue des formations - Wikigouv',
      activeNav: 'courses',
      user: req.authUser ?? null,
      breadcrumbs: [{ label: 'Accueil', href: '/' }, { label: 'Formations' }]
    };

    const response = await fetchApiPublicJson<AdminListResponse>(
      `/api/catalog/courses?page=1&pageSize=300&q=${encodeURIComponent(q ?? '')}&level=${encodeURIComponent(level ?? 'all')}&status=${encodeURIComponent(status ?? 'published')}`
    );
    let rows = response.data?.items ?? [];

    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter((row) => {
        const title = String(row.title ?? '').toLowerCase();
        const slug = String(row.slug ?? '').toLowerCase();
        const summary = String((row as { metadata?: { summary?: string } }).metadata?.summary ?? '').toLowerCase();
        return title.includes(needle) || slug.includes(needle) || summary.includes(needle);
      });
    }

    if (status && status !== 'all') {
      rows = rows.filter((row) => String(row.status ?? '').toLowerCase() === status.toLowerCase());
    }

    if (level && level !== 'all') {
      rows = rows.filter((row) => {
        const levelValue = String((row as { metadata?: { level?: string } }).metadata?.level ?? '').toLowerCase();
        return levelValue === level.toLowerCase();
      });
    }

    return {
      page,
      filters: {
        q: q ?? '',
        level: level ?? 'all',
        status: status ?? 'published'
      },
      listStatus: response.status,
      rows
    };
  }

  @Get('/courses/:slug')
  @Render('pages/courses/show')
  async courseDetails(@Req() req: RequestWithAuth, @Param('slug') slug: string) {
    const page: PageContext = {
      title: 'Détail de la formation - Wikigouv',
      activeNav: 'courses',
      user: req.authUser ?? null,
      breadcrumbs: [
        { label: 'Accueil', href: '/' },
        { label: 'Formations', href: '/courses' },
        { label: slug }
      ]
    };

    try {
      const response = await fetchApiPublicJson<{ item?: Record<string, unknown> }>(
        `/api/catalog/courses/${encodeURIComponent(slug)}`
      );
      const course = response.data?.item ?? null;

      return {
        page,
        slug,
        listStatus: response.status,
        course
      };
    } catch {
      return {
        page,
        slug,
        listStatus: 503,
        course: null
      };
    }
  }

  @Get('/courses/preview/:id')
  @UseGuards(WebAuthGuard)
  @Render('pages/courses/show')
  async coursePreview(@Req() req: RequestWithAuth, @Param('id') id: string) {
    const page: PageContext = {
      title: 'Prévisualisation du cours - Wikigouv',
      activeNav: 'courses',
      user: req.authUser ?? null,
      breadcrumbs: [
        { label: 'Accueil', href: '/' },
        { label: 'Formations', href: '/courses' },
        { label: 'Prévisualisation' }
      ]
    };

    const response = await fetchApiJson<{ ok?: boolean; item?: Record<string, unknown> }>(
      req,
      `/api/admin/education/courses/${encodeURIComponent(id)}`
    );
    const course = response.ok ? (response.data?.item ?? null) : null;

    return {
      page,
      slug: String((course as { slug?: unknown } | null)?.slug ?? ''),
      listStatus: response.status,
      course,
      previewMode: true
    };
  }

  @Get('/learning/courses/:id')
  @UseGuards(WebAuthGuard)
  @Render('pages/courses/learning')
  async courseLearning(@Req() req: RequestWithAuth, @Param('id') id: string) {
    const page: PageContext = {
      title: 'Suivre le cours - Wikigouv',
      activeNav: 'courses',
      user: req.authUser ?? null,
      breadcrumbs: [
        { label: 'Accueil', href: '/' },
        { label: 'Formations', href: '/courses' },
        { label: 'Learning' }
      ]
    };

    const courseResp = await fetchApiJson<{ ok?: boolean; item?: Record<string, unknown> }>(
      req,
      `/api/admin/education/courses/${encodeURIComponent(id)}`
    );
    const course = courseResp.ok ? (courseResp.data?.item ?? null) : null;

    if (!course) {
      return { page, listStatus: courseResp.status, course: null, progress: null };
    }

    const [extrasResp, quizzesResp, lastViewResp, noticeboardsResp, forumResp] = await Promise.all([
      fetchApiJson<{ items?: Array<Record<string, unknown>> }>(
        req,
        `/api/admin/education/courses/${encodeURIComponent(id)}/extras`
      ),
      fetchApiJson<{ items?: Array<Record<string, unknown>> }>(
        req,
        `/api/admin/education/courses/${encodeURIComponent(id)}/quizzes`
      ),
      fetchApiJson<{ itemType?: string | null; itemId?: string | null; updatedAt?: string | null }>(
        req,
        `/api/courses/${encodeURIComponent(id)}/last-view`
      ),
      fetchApiJson<{ items?: Array<Record<string, unknown>> }>(req, '/api/noticeboards?page=1&pageSize=20&status=ACTIVE'),
      fetchApiJson<{ items?: Array<Record<string, unknown>> }>(req, '/api/forums/topics?page=1&pageSize=20&status=ACTIVE')
    ]);
    const extras = extrasResp.ok ? (extrasResp.data?.items ?? []) : [];
    const quizzes = quizzesResp.ok ? (quizzesResp.data?.items ?? []) : [];
    const extrasByType = extras.reduce<Record<string, Array<Record<string, unknown>>>>((acc, item) => {
      const t = String(item.type ?? 'misc');
      if (!acc[t]) acc[t] = [];
      acc[t].push(item);
      return acc;
    }, {});

    const chapters = extrasByType.chapter ?? [];
    const sections = chapters.map((chapter) => {
      const chapterId = String(chapter.id ?? '');
      const contentItems = extras.filter((item) => {
        const payload = (item.payload ?? {}) as Record<string, unknown>;
        return String(payload.chapterId ?? payload.chapter_id ?? '') === chapterId;
      });
      return { ...chapter, contentItems };
    });
    const contentCount = extras.filter((e) => String(e.type ?? '') !== 'chapter').length + quizzes.length;

    const courseView = {
      ...course,
      extrasByType,
      sections,
      quizzes,
      noticeboards: noticeboardsResp.ok ? (noticeboardsResp.data?.items ?? []) : [],
      forumTopics: forumResp.ok ? (forumResp.data?.items ?? []) : [],
      stats: {
        sections: sections.length,
        lessons: contentCount
      }
    };

    await postApiJson(req, `/api/courses/${encodeURIComponent(id)}/enroll`, {});
    const progressResp = await fetchApiJson<Record<string, unknown>>(req, `/api/courses/${encodeURIComponent(id)}/progress`);

    return {
      page,
      listStatus: courseResp.status,
      course: courseView,
      progress: progressResp.ok ? progressResp.data : null,
      serverLastView: lastViewResp.ok ? lastViewResp.data : null
    };
  }

  @Get('/course/learning/:slug')
  @UseGuards(WebAuthGuard)
  @Redirect()
  async courseLearningBySlug(@Req() req: RequestWithAuth, @Param('slug') slug: string) {
    const response = await fetchApiPublicJson<{ item?: Record<string, unknown> }>(
      `/api/catalog/courses/${encodeURIComponent(slug)}`
    );
    const item = response.data?.item ?? null;
    const id = String((item as { id?: unknown } | null)?.id ?? '');
    if (!id) {
      return {
        url: '/courses?error=course_not_found'
      };
    }
    const queryType = typeof req.query.type === 'string' ? req.query.type.trim() : '';
    const queryItem = typeof req.query.item === 'string' ? req.query.item.trim() : '';
    const suffix = queryType && queryItem
      ? `?type=${encodeURIComponent(queryType)}&item=${encodeURIComponent(queryItem)}`
      : '';
    return {
      url: `/learning/courses/${encodeURIComponent(id)}${suffix}`
    };
  }

  @Get('/course/learning/:slug/noticeboards')
  @UseGuards(WebAuthGuard)
  @Redirect()
  async courseLearningNoticeboards(@Param('slug') slug: string) {
    const response = await fetchApiPublicJson<{ item?: Record<string, unknown> }>(
      `/api/catalog/courses/${encodeURIComponent(slug)}`
    );
    const item = response.data?.item ?? null;
    const id = String((item as { id?: unknown } | null)?.id ?? '');
    if (!id) {
      return { url: '/courses?error=course_not_found' };
    }
    return {
      url: `/learning/courses/${encodeURIComponent(id)}?tab=noticeboards`
    };
  }

  @Get('/course/learning/:slug/forum')
  @UseGuards(WebAuthGuard)
  @Redirect()
  async courseLearningForum(@Param('slug') slug: string) {
    const response = await fetchApiPublicJson<{ item?: Record<string, unknown> }>(
      `/api/catalog/courses/${encodeURIComponent(slug)}`
    );
    const item = response.data?.item ?? null;
    const id = String((item as { id?: unknown } | null)?.id ?? '');
    if (!id) {
      return { url: '/courses?error=course_not_found' };
    }
    return {
      url: `/learning/courses/${encodeURIComponent(id)}?tab=forum`
    };
  }

  @Post('/learning/courses/:id/last-view')
  @UseGuards(WebAuthGuard)
  async setLearningLastView(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Body() body: { itemType?: string; itemId?: string }
  ) {
    const itemType = String(body?.itemType ?? '').trim();
    const itemId = String(body?.itemId ?? '').trim();
    if (!itemType || !itemId) {
      return { ok: false, status: 400, message: 'itemType et itemId sont requis.' };
    }

    const response = await postApiJson(req, `/api/courses/${encodeURIComponent(id)}/last-view`, { itemType, itemId });
    return {
      ok: response.ok,
      status: response.status,
      item: response.data,
      message: response.errorMessage ?? null
    };
  }

  @Post('/learning/itemInfo')
  @UseGuards(WebAuthGuard)
  async learningItemInfo(
    @Req() req: RequestWithAuth,
    @Body() body: { type?: string; id?: string; course_id?: string; courseId?: string }
  ) {
    const type = String(body?.type ?? '').trim() as 'file' | 'session' | 'text_lesson' | 'quiz' | 'interactive_file';
    const itemId = String(body?.id ?? '').trim();
    const courseId = String(body?.course_id ?? body?.courseId ?? '').trim();
    if (!type || !itemId || !courseId) return { code: 422, errors: { type: 'invalid payload' } };

    const [extrasResp, quizzesResp] = await Promise.all([
      fetchApiJson<{ items?: Array<Record<string, unknown>> }>(
        req,
        `/api/admin/education/courses/${encodeURIComponent(courseId)}/extras`
      ),
      fetchApiJson<{ items?: Array<Record<string, unknown>> }>(
        req,
        `/api/admin/education/courses/${encodeURIComponent(courseId)}/quizzes`
      )
    ]);

    if (type === 'quiz') {
      const q = (quizzesResp.data?.items ?? []).find((x) => String(x.id ?? '') === itemId);
      if (!q) return { code: 404 };
      await postApiJson(req, `/api/courses/${encodeURIComponent(courseId)}/last-view`, { itemType: type, itemId });
      return {
        quiz: {
          id: String(q.id ?? ''),
          webinar_id: courseId,
          title: String(q.title ?? 'Quiz'),
          can_try: true,
          modelName: 'quiz',
          questions_count: Number((q as { questionsCount?: unknown }).questionsCount ?? 0),
          pass_mark: Number((q as { passingScore?: unknown }).passingScore ?? 0),
          attempt: Number((q as { attempt?: unknown; attempts?: unknown }).attempt ?? (q as { attempts?: unknown }).attempts ?? 0),
          status: String((q as { status?: unknown }).status ?? '')
        }
      };
    }

    const ex = (extrasResp.data?.items ?? []).find((x) => String(x.id ?? '') === itemId && String(x.type ?? '') === type);
    if (!ex) return { code: 404 };
    await postApiJson(req, `/api/courses/${encodeURIComponent(courseId)}/last-view`, { itemType: type, itemId });

    if (type === 'session') return { session: this.normalizeLearningItem(ex, type) };
    if (type === 'text_lesson') return { textLesson: this.normalizeLearningItem(ex, type) };
    if (type === 'interactive_file') return { file: this.normalizeLearningItem(ex, type) };
    return { file: this.normalizeLearningItem(ex, type) };
  }

  @Post('/learning/personalNotes')
  @UseGuards(WebAuthGuard)
  async learningPersonalNotes(
    @Req() req: RequestWithAuth,
    @Body() body: { course_id?: string; courseId?: string; item_id?: string; itemId?: string; item_type?: string; itemType?: string; note?: string }
  ) {
    const courseId = String(body?.course_id ?? body?.courseId ?? '').trim();
    const itemId = String(body?.item_id ?? body?.itemId ?? '').trim();
    const itemType = String(body?.item_type ?? body?.itemType ?? '').trim();
    const note = String(body?.note ?? '').trim();
    if (!courseId || !itemId || !itemType) return { code: 422, errors: { note: 'invalid payload' } };

    const response = await postApiJson(
      req,
      `/api/courses/${encodeURIComponent(courseId)}/personal-notes`,
      { itemType, itemId, note }
    );

    const payload = (response.data ?? {}) as { note?: string };
    return response.ok ? { code: 200, note: payload.note ?? note } : { code: response.status || 500, errors: { note: response.errorMessage ?? 'save_failed' } };
  }

  @Get('/learning/personalNotes')
  @UseGuards(WebAuthGuard)
  async learningPersonalNotesGet(
    @Req() req: RequestWithAuth,
    @Query('course_id') courseIdRaw?: string,
    @Query('item_id') itemIdRaw?: string,
    @Query('item_type') itemTypeRaw?: string
  ) {
    const courseId = String(courseIdRaw ?? '').trim();
    const itemId = String(itemIdRaw ?? '').trim();
    const itemType = String(itemTypeRaw ?? '').trim();
    if (!courseId || !itemId || !itemType) return { code: 422, note: '' };

    const response = await fetchApiJson<{ note?: string; updatedAt?: string }>(
      req,
      `/api/courses/${encodeURIComponent(courseId)}/personal-notes/${encodeURIComponent(itemType)}/${encodeURIComponent(itemId)}`
    );
    return response.ok ? { code: 200, note: response.data?.note ?? '', updatedAt: response.data?.updatedAt ?? null } : { code: response.status || 500, note: '' };
  }
}
