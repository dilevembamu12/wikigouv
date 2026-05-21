import { Controller, Get, Param, Query } from '@nestjs/common';
import { Op } from 'sequelize';
import { SequelizeService } from '@/database/sequelize.service';

@Controller('catalog/courses')
export class LmsCatalogController {
  constructor(private readonly db: SequelizeService) {}

  @Get()
  async listPublished(
    @Query('q') q?: string,
    @Query('level') level?: string,
    @Query('status') status?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string
  ) {
    const page = Math.max(1, Number(pageRaw ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '24') || 24));
    const where: Record<string | symbol, unknown> = {};

    if (!status || status.toLowerCase() === 'published') where.status = 'PUBLISHED';
    else if (status.toLowerCase() !== 'all') where.status = status.toUpperCase();

    if (level && level.toLowerCase() !== 'all') where.level = level.toUpperCase();

    if (q?.trim()) {
      where[Op.or] = [
        { title: { [Op.like]: `%${q.trim()}%` } },
        { slug: { [Op.like]: `%${q.trim()}%` } },
        { description: { [Op.like]: `%${q.trim()}%` } }
      ];
    }

    const { rows, count } = await this.db.models.Course.findAndCountAll({
      where,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [['createdAt', 'DESC']]
    });

    return {
      items: rows,
      page,
      pageSize,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize))
    };
  }

  @Get(':slug')
  async bySlug(@Param('slug') slug: string) {
    const row = await this.db.models.Course.findOne({
      where: { slug, status: 'PUBLISHED' }
    });
    if (!row) return { item: null };

    const courseId = String(row.get('id'));
    const [extrasRows, quizzesRows, enrollmentsCount, commentsRows, reviewsRows] = await Promise.all([
      this.db.models.CourseExtra.findAll({
        where: { courseId },
        order: [['type', 'ASC'], ['sortOrder', 'ASC'], ['id', 'ASC']]
      }),
      this.db.models.Quiz.findAll({
        where: { courseId },
        order: [['createdAt', 'DESC']]
      }),
      this.db.models.Enrollment.count({ where: { courseId } }),
      this.db.models.CourseComment.findAll({
        where: { courseId, status: 'PUBLISHED' },
        order: [['createdAt', 'DESC']],
        limit: 50
      }),
      this.db.models.CourseReview.findAll({
        where: { courseId, status: 'PUBLISHED' },
        order: [['createdAt', 'DESC']],
        limit: 50
      })
    ]);

    const extras = extrasRows.map((x) => x.get({ plain: true }) as Record<string, unknown>);
    const quizzes = quizzesRows.map((x) => x.get({ plain: true }) as Record<string, unknown>);
    const comments = commentsRows.map((x) => x.get({ plain: true }) as Record<string, unknown>);
    const reviews = reviewsRows.map((x) => x.get({ plain: true }) as Record<string, unknown>);
    const averageRating = reviews.length
      ? Number(
          (
            reviews.reduce((sum, row) => sum + Number(row.rating ?? 0), 0) /
            Math.max(1, reviews.length)
          ).toFixed(1)
        )
      : 0;

    const extrasByType = extras.reduce<Record<string, Array<Record<string, unknown>>>>((acc, item) => {
      const t = String(item.type ?? 'misc');
      if (!acc[t]) acc[t] = [];
      acc[t].push(item);
      return acc;
    }, {});

    const sections = (extrasByType.chapter ?? []).map((chapter) => {
      const chapterId = String(chapter.id ?? '');
      const contentItems = extras.filter((item) => {
        const payload = (item.payload ?? {}) as Record<string, unknown>;
        return String(payload.chapterId ?? payload.chapter_id ?? '') === chapterId;
      });
      return { ...chapter, contentItems };
    });

    const item = {
      ...(row.get({ plain: true }) as Record<string, unknown>),
      extrasByType,
      sections,
      quizzes,
      comments,
      reviews,
      averageRating,
      stats: {
        students: Number(enrollmentsCount ?? 0),
        sections: Number(extrasByType.chapter?.length ?? 0),
        lessons:
          Number(extrasByType.text_lesson?.length ?? 0) +
          Number(extrasByType.file?.length ?? 0) +
          Number(extrasByType.interactive_file?.length ?? 0) +
          Number(extrasByType.session?.length ?? 0),
        files: Number(extrasByType.file?.length ?? 0),
        assignments: Number(extrasByType.assignment?.length ?? 0),
        quizzes: Number(quizzes.length),
        comments: Number(comments.length),
        reviews: Number(reviews.length)
      }
    };

    return { item };
  }
}
