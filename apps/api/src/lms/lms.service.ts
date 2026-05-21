import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { Model, Op } from 'sequelize';
import { AuthenticatedRequestUser } from '@/auth/auth.types';
import { AuditService } from '@/audit/audit.service';
import { AppRole } from '@/auth/roles.enum';
import { SequelizeService } from '@/database/sequelize.service';
import { UsersService } from '@/users/users.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { ListCoursesQueryDto } from './dto/list-courses-query.dto';
import { SetCourseLastViewDto } from './dto/set-course-last-view.dto';
import { SetCoursePersonalNoteDto } from './dto/set-course-personal-note.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

type DbQuestion = { id: string; points: number; prompt: string };
type DbOption = { id: string; questionId: string; isCorrect: boolean };

@Injectable()
export class LmsService {
  constructor(
    private readonly db: SequelizeService,
    private readonly usersService: UsersService,
    private readonly audit: AuditService
  ) {}

  private value<T>(model: Model, key: string): T {
    return model.get(key) as T;
  }

  async listCourses(): Promise<unknown> {
    return this.db.models.Course.findAll({
      where: { status: 'PUBLISHED' },
      include: [{ model: this.db.models.Module, as: 'modules', include: [{ model: this.db.models.Lesson, as: 'lessons' }] }],
      order: [['createdAt', 'DESC']]
    });
  }

  async listCoursesPublic(user: AuthenticatedRequestUser, query: ListCoursesQueryDto): Promise<unknown> {
    const where: Record<string, unknown> = {};
    if (query.level) where.level = query.level;
    if (query.status) where.status = query.status;
    if (query.q?.trim()) {
      (where as Record<symbol, unknown[]>)[Op.or] = [
        { title: { [Op.like]: `%${query.q.trim()}%` } },
        { description: { [Op.like]: `%${query.q.trim()}%` } }
      ];
    }
    if (!this.canManageCourse(user)) {
      where.status = 'PUBLISHED';
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const offset = (page - 1) * pageSize;

    const { rows, count } = await this.db.models.Course.findAndCountAll({
      where,
      limit: pageSize,
      offset,
      order: [
        ['status', 'ASC'],
        ['createdAt', 'DESC']
      ]
    });

    return {
      items: rows,
      page,
      pageSize,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize))
    };
  }

  async createCoursePublic(user: AuthenticatedRequestUser, dto: CreateCourseDto, req?: Request): Promise<unknown> {
    const profile = await this.usersService.syncProfile(user);
    const profileId = this.value<string>(profile, 'id');
    const created = await this.db.models.Course.create({
      id: randomUUID(),
      title: dto.title,
      slug: this.slugify(`${dto.title}-${Date.now()}`),
      description: dto.description,
      objectives: dto.objectives ?? '',
      targetAudience: dto.targetAudience ?? '',
      level: dto.level ?? 'INTERMEDIATE',
      status: 'DRAFT',
      createdById: profileId
    });
    await this.audit.log({
      actorUserId: profileId,
      action: 'COURSE_CREATE_PUBLIC',
      entityType: 'Course',
      entityId: this.value<string>(created, 'id'),
      ...this.requestMeta(req)
    });
    return created;
  }

  async updateCoursePublic(user: AuthenticatedRequestUser, id: string, dto: UpdateCourseDto, req?: Request): Promise<unknown> {
    const profile = await this.usersService.syncProfile(user);
    const profileId = this.value<string>(profile, 'id');
    const course = await this.db.models.Course.findByPk(id);
    if (!course) throw new NotFoundException('Course not found');

    const patch: Record<string, unknown> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.objectives !== undefined) patch.objectives = dto.objectives;
    if (dto.targetAudience !== undefined) patch.targetAudience = dto.targetAudience;
    if (dto.level !== undefined) patch.level = dto.level;
    if (dto.status !== undefined) patch.status = dto.status;

    if (dto.title) {
      patch.slug = this.slugify(`${dto.title}-${Date.now()}`);
    }

    await course.update(patch);
    await this.audit.log({
      actorUserId: profileId,
      action: 'COURSE_UPDATE_PUBLIC',
      entityType: 'Course',
      entityId: id,
      metadata: patch,
      ...this.requestMeta(req)
    });
    return course;
  }

  async deleteCoursePublic(user: AuthenticatedRequestUser, id: string, req?: Request): Promise<{ ok: true }> {
    const profile = await this.usersService.syncProfile(user);
    const profileId = this.value<string>(profile, 'id');
    const course = await this.db.models.Course.findByPk(id);
    if (!course) throw new NotFoundException('Course not found');
    await course.destroy();
    await this.audit.log({
      actorUserId: profileId,
      action: 'COURSE_DELETE_PUBLIC',
      entityType: 'Course',
      entityId: id,
      ...this.requestMeta(req)
    });
    return { ok: true };
  }

  async createCourse(user: AuthenticatedRequestUser, dto: CreateCourseDto, req?: Request): Promise<unknown> {
    const profile = await this.usersService.syncProfile(user);
    const profileId = this.value<string>(profile, 'id');
    const course = await this.db.models.Course.create({
      id: randomUUID(),
      title: dto.title,
      slug: this.slugify(dto.title),
      description: dto.description,
      objectives: dto.objectives ?? '',
      targetAudience: dto.targetAudience ?? '',
      level: dto.level ?? 'INTERMEDIATE',
      status: 'DRAFT',
      createdById: profileId
    });
    await this.audit.log({
      actorUserId: profileId,
      action: 'COURSE_CREATE',
      entityType: 'Course',
      entityId: this.value<string>(course, 'id'),
      ...this.requestMeta(req)
    });
    return course;
  }

  async enroll(user: AuthenticatedRequestUser, courseId: string, req?: Request): Promise<unknown> {
    const profile = await this.usersService.syncProfile(user);
    const profileId = this.value<string>(profile, 'id');
    const course = await this.db.models.Course.findByPk(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const existing = await this.db.models.Enrollment.findOne({
      where: { userId: profileId, courseId }
    });
    if (existing) return existing;

    const enrollment = await this.db.models.Enrollment.create({
      id: randomUUID(),
      userId: profileId,
      courseId,
      status: 'ENROLLED',
      progressPercentage: 0
    });
    await this.audit.log({
      actorUserId: profileId,
      action: 'COURSE_ENROLL',
      entityType: 'Enrollment',
      entityId: this.value<string>(enrollment, 'id'),
      ...this.requestMeta(req)
    });
    return enrollment;
  }

  async completeLesson(user: AuthenticatedRequestUser, lessonId: string, req?: Request): Promise<unknown> {
    const profile = await this.usersService.syncProfile(user);
    const profileId = this.value<string>(profile, 'id');
    const lesson = await this.db.models.Lesson.findByPk(lessonId);
    if (!lesson) throw new NotFoundException('Lesson not found');

    const existing = await this.db.models.LessonProgress.findOne({
      where: { userId: profileId, lessonId }
    });
    if (existing) {
      await existing.update({ status: 'COMPLETED', completedAt: new Date() });
    } else {
      await this.db.models.LessonProgress.create({
        id: randomUUID(),
        userId: profileId,
        lessonId,
        status: 'COMPLETED',
        startedAt: new Date(),
        completedAt: new Date()
      });
    }

    const moduleId = this.value<string>(lesson, 'moduleId');
    const module = await this.db.models.Module.findByPk(moduleId);
    if (!module) throw new NotFoundException('Module not found');
    const courseId = this.value<string>(module, 'courseId');

    const progress = await this.courseProgress(user, courseId);
    await this.db.models.Enrollment.update(
      { progressPercentage: (progress as { progressPercentage: number }).progressPercentage, status: 'IN_PROGRESS' },
      { where: { userId: profileId, courseId } }
    );

    await this.audit.log({
      actorUserId: profileId,
      action: 'LESSON_COMPLETE',
      entityType: 'Lesson',
      entityId: lessonId,
      metadata: { courseId },
      ...this.requestMeta(req)
    });

    return progress;
  }

  async myEnrollments(user: AuthenticatedRequestUser): Promise<unknown> {
    const profile = await this.usersService.syncProfile(user);
    const profileId = this.value<string>(profile, 'id');
    return this.db.models.Enrollment.findAll({
      where: { userId: profileId },
      order: [['enrolledAt', 'DESC']]
    });
  }

  async startQuiz(user: AuthenticatedRequestUser, quizId: string, req?: Request): Promise<unknown> {
    const profile = await this.usersService.syncProfile(user);
    const profileId = this.value<string>(profile, 'id');
    const attempts = await this.db.models.QuizAttempt.count({
      where: { quizId, userId: profileId }
    });
    const attempt = await this.db.models.QuizAttempt.create({
      id: randomUUID(),
      quizId,
      userId: profileId,
      attemptNumber: attempts + 1,
      status: 'STARTED'
    });
    await this.audit.log({
      actorUserId: profileId,
      action: 'QUIZ_START',
      entityType: 'QuizAttempt',
      entityId: this.value<string>(attempt, 'id'),
      metadata: { quizId },
      ...this.requestMeta(req)
    });
    return attempt;
  }

  async submitQuiz(user: AuthenticatedRequestUser, attemptId: string, payload: SubmitQuizDto, req?: Request): Promise<unknown> {
    const profile = await this.usersService.syncProfile(user);
    const profileId = this.value<string>(profile, 'id');
    const attempt = await this.db.models.QuizAttempt.findByPk(attemptId);
    if (!attempt || this.value<string>(attempt, 'userId') !== profileId) {
      throw new NotFoundException('Attempt not found');
    }

    const quiz = await this.db.models.Quiz.findByPk(this.value<string>(attempt, 'quizId'));
    if (!quiz) throw new NotFoundException('Quiz not found');

    const questions = (await this.db.models.Question.findAll({
      where: { quizId: this.value<string>(quiz, 'id') }
    })) as unknown as DbQuestion[];
    const questionIds = questions.map((q) => q.id);
    const options = (await this.db.models.AnswerOption.findAll({
      where: { questionId: { [Op.in]: questionIds } }
    })) as unknown as DbOption[];

    let score = 0;
    await this.db.models.QuizResponse.destroy({ where: { attemptId } });

    for (const response of payload.responses) {
      const question = questions.find((q) => q.id === response.questionId);
      if (!question) continue;
      const expected = options
        .filter((o) => o.questionId === question.id && o.isCorrect)
        .map((o) => o.id)
        .sort();
      const selected = (response.selectedOptionIds ?? []).sort();
      const isCorrect = JSON.stringify(expected) === JSON.stringify(selected);
      const questionScore = isCorrect ? Number(question.points ?? 1) : 0;
      score += questionScore;

      await this.db.models.QuizResponse.create({
        id: randomUUID(),
        attemptId,
        questionId: question.id,
        selectedOptionIds: response.selectedOptionIds ?? [],
        textAnswer: response.textAnswer ?? null,
        score: questionScore,
        feedback: isCorrect ? 'Correct' : 'A revoir'
      });
    }

    const passed = score >= Number(this.value<number | null>(quiz, 'passingScore') ?? 70);
    await attempt.update({
      status: 'GRADED',
      score,
      passed,
      submittedAt: new Date(),
      gradedAt: new Date()
    });
    await this.audit.log({
      actorUserId: profileId,
      action: 'QUIZ_SUBMIT',
      entityType: 'QuizAttempt',
      entityId: attemptId,
      metadata: { score, passed },
      ...this.requestMeta(req)
    });

    return { attempt, maxScore: questions.reduce((s, q) => s + Number(q.points ?? 1), 0) };
  }

  async quizResult(user: AuthenticatedRequestUser, attemptId: string): Promise<unknown> {
    const profile = await this.usersService.syncProfile(user);
    const profileId = this.value<string>(profile, 'id');
    const attempt = await this.db.models.QuizAttempt.findByPk(attemptId);
    if (!attempt || this.value<string>(attempt, 'userId') !== profileId) {
      throw new NotFoundException('Attempt not found');
    }
    const responses = await this.db.models.QuizResponse.findAll({ where: { attemptId } });
    return { attempt, responses };
  }

  async createQuiz(user: AuthenticatedRequestUser, dto: CreateQuizDto, req?: Request): Promise<unknown> {
    const profile = await this.usersService.syncProfile(user);
    const profileId = this.value<string>(profile, 'id');
    const t = await this.db.sequelize.transaction();
    try {
      const quiz = await this.db.models.Quiz.create(
        {
          id: randomUUID(),
          courseId: dto.courseId,
          moduleId: dto.moduleId ?? null,
          title: dto.title,
          passingScore: dto.passingScore ?? 70,
          status: 'DRAFT'
        },
        { transaction: t }
      );

      for (let index = 0; index < dto.questions.length; index += 1) {
        const q = dto.questions[index];
        const question = await this.db.models.Question.create(
          {
            id: randomUUID(),
            quizId: this.value<string>(quiz, 'id'),
            type: q.type,
            prompt: q.prompt,
            points: q.points,
            order: index + 1
          },
          { transaction: t }
        );
        for (const option of q.options) {
          await this.db.models.AnswerOption.create(
            {
              id: randomUUID(),
              questionId: this.value<string>(question, 'id'),
              text: option.text,
              isCorrect: option.isCorrect
            },
            { transaction: t }
          );
        }
      }

      await t.commit();
      await this.audit.log({
        actorUserId: profileId,
        action: 'QUIZ_CREATE',
        entityType: 'Quiz',
        entityId: this.value<string>(quiz, 'id'),
        metadata: { questions: dto.questions.length },
        ...this.requestMeta(req)
      });
      return quiz;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async courseProgress(user: AuthenticatedRequestUser, courseId: string): Promise<unknown> {
    const profile = await this.usersService.syncProfile(user);
    const profileId = this.value<string>(profile, 'id');
    const course = await this.db.models.Course.findByPk(courseId, {
      include: [{ model: this.db.models.Module, as: 'modules', include: [{ model: this.db.models.Lesson, as: 'lessons' }] }]
    });
    if (!course) throw new NotFoundException('Course not found');

    const modules = (course.get('modules') as Model[] | undefined) ?? [];
    const lessons = modules.flatMap((m) => ((m.get('lessons') as Model[] | undefined) ?? []).map((l) => l));

    const lessonIds = lessons.map((l) => this.value<string>(l, 'id'));
    const progresses = await this.db.models.LessonProgress.findAll({
      where: { userId: profileId, lessonId: { [Op.in]: lessonIds } }
    });
    const completedSet = new Set(
      progresses.filter((p) => this.value<string>(p, 'status') === 'COMPLETED').map((p) => this.value<string>(p, 'lessonId'))
    );

    const totalLessons = lessonIds.length;
    const completedLessons = completedSet.size;
    const progressPercentage = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const nextLesson = lessons.find((l) => !completedSet.has(this.value<string>(l, 'id'))) ?? null;

    if (progressPercentage === 100) {
      await this.db.models.Enrollment.update(
        { status: 'COMPLETED', progressPercentage, completedAt: new Date() },
        { where: { userId: profileId, courseId } }
      );
    }

    return {
      courseId,
      totalLessons,
      completedLessons,
      progressPercentage,
      nextLessonId: nextLesson ? this.value<string>(nextLesson, 'id') : null
    };
  }

  async getCourseLastView(user: AuthenticatedRequestUser, courseId: string): Promise<unknown> {
    const profile = await this.usersService.syncProfile(user);
    const profileId = this.value<string>(profile, 'id');

    const lastView = await this.db.models.CourseLearningLastView.findOne({
      where: { userId: profileId, courseId }
    });

    if (!lastView) {
      return { itemType: null, itemId: null, updatedAt: null };
    }

    return {
      itemType: this.value<string>(lastView, 'itemType'),
      itemId: this.value<string>(lastView, 'itemId'),
      updatedAt: this.value<Date>(lastView, 'updatedAt')
    };
  }

  async setCourseLastView(
    user: AuthenticatedRequestUser,
    courseId: string,
    dto: SetCourseLastViewDto,
    req?: Request
  ): Promise<unknown> {
    const profile = await this.usersService.syncProfile(user);
    const profileId = this.value<string>(profile, 'id');

    const [lastView] = await this.db.models.CourseLearningLastView.upsert(
      {
        id: randomUUID(),
        userId: profileId,
        courseId,
        itemType: dto.itemType,
        itemId: dto.itemId
      },
      { returning: true }
    );

    await this.audit.log({
      actorUserId: profileId,
      action: 'COURSE_LAST_VIEW_UPDATE',
      entityType: 'CourseLearningLastView',
      entityId: this.value<string>(lastView, 'id'),
      metadata: { courseId, itemType: dto.itemType, itemId: dto.itemId },
      ...this.requestMeta(req)
    });

    return {
      ok: true,
      itemType: this.value<string>(lastView, 'itemType'),
      itemId: this.value<string>(lastView, 'itemId'),
      updatedAt: this.value<Date>(lastView, 'updatedAt')
    };
  }

  async getCoursePersonalNote(
    user: AuthenticatedRequestUser,
    courseId: string,
    itemType: string,
    itemId: string
  ): Promise<unknown> {
    const profile = await this.usersService.syncProfile(user);
    const profileId = this.value<string>(profile, 'id');

    const row = await this.db.models.CoursePersonalNote.findOne({
      where: { userId: profileId, courseId, itemType, itemId }
    });

    return {
      note: row ? this.value<string>(row, 'note') : '',
      updatedAt: row ? this.value<Date>(row, 'updatedAt') : null
    };
  }

  async setCoursePersonalNote(
    user: AuthenticatedRequestUser,
    courseId: string,
    dto: SetCoursePersonalNoteDto,
    req?: Request
  ): Promise<unknown> {
    const profile = await this.usersService.syncProfile(user);
    const profileId = this.value<string>(profile, 'id');

    const [row] = await this.db.models.CoursePersonalNote.upsert(
      {
        id: randomUUID(),
        userId: profileId,
        courseId,
        itemType: dto.itemType,
        itemId: dto.itemId,
        note: dto.note
      },
      { returning: true }
    );

    await this.audit.log({
      actorUserId: profileId,
      action: 'COURSE_PERSONAL_NOTE_UPSERT',
      entityType: 'CoursePersonalNote',
      entityId: this.value<string>(row, 'id'),
      metadata: { courseId, itemType: dto.itemType, itemId: dto.itemId },
      ...this.requestMeta(req)
    });

    return {
      ok: true,
      note: this.value<string>(row, 'note'),
      updatedAt: this.value<Date>(row, 'updatedAt')
    };
  }

  private canManageCourse(user: AuthenticatedRequestUser): boolean {
    return (
      user.roles.includes(AppRole.ADMIN) ||
      user.roles.includes(AppRole.FORMATEUR) ||
      user.roles.includes(AppRole.SUPER_ADMIN)
    );
  }

  private requestMeta(req?: Request): { ipAddress?: string | null; userAgent?: string | null } {
    if (!req) return {};
    return this.audit.fromRequest(req);
  }

  async myCertificates(user: AuthenticatedRequestUser): Promise<unknown> {
    const profile = await this.usersService.syncProfile(user);
    const profileId = this.value<string>(profile, 'id');
    return this.db.models.Certificate.findAll({
      where: { userId: profileId },
      order: [['issuedAt', 'DESC']]
    });
  }

  async getCertificateById(_user: AuthenticatedRequestUser, certificateId: string): Promise<unknown> {
    const certificate = await this.db.models.Certificate.findByPk(certificateId);
    if (!certificate) throw new NotFoundException('Certificate not found');
    return certificate;
  }

  async verifyCertificate(hash: string): Promise<unknown> {
    const certificate = await this.db.models.Certificate.findOne({ where: { verificationHash: hash } });
    return { valid: !!certificate, certificate };
  }

  private slugify(v: string): string {
    return v
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
