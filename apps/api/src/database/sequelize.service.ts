import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';

type AppModel = ModelStatic<Model>;

@Injectable()
export class SequelizeService implements OnModuleInit, OnModuleDestroy {
  readonly sequelize: Sequelize;
  readonly models: Record<string, AppModel>;

  constructor(private readonly config: ConfigService) {
    this.sequelize = new Sequelize(
      this.config.getOrThrow<string>('MYSQL_DATABASE'),
      this.config.getOrThrow<string>('MYSQL_USER'),
      this.config.getOrThrow<string>('MYSQL_PASSWORD'),
      {
        host: this.config.getOrThrow<string>('MYSQL_HOST'),
        port: Number(this.config.get<string>('MYSQL_PORT', '3306')),
        dialect: 'mysql',
        logging: false
      }
    );

    const UserProfile = this.sequelize.define(
      'UserProfile',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        keycloakUserId: { type: DataTypes.STRING(191), unique: true, allowNull: false },
        email: { type: DataTypes.STRING(191), unique: true, allowNull: false },
        firstName: { type: DataTypes.STRING(120), allowNull: false },
        lastName: { type: DataTypes.STRING(120), allowNull: false },
        fullName: { type: DataTypes.STRING(180), allowNull: false },
        avatarUrl: { type: DataTypes.STRING(1024) },
        jobTitle: { type: DataTypes.STRING(120) },
        department: { type: DataTypes.STRING(120) },
        phone: { type: DataTypes.STRING(40) },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
        firstLoginAt: { type: DataTypes.DATE },
        lastLoginAt: { type: DataTypes.DATE }
      },
      { tableName: 'user_profiles' }
    );

    const Course = this.sequelize.define(
      'Course',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        title: { type: DataTypes.STRING(200), allowNull: false },
        slug: { type: DataTypes.STRING(200), unique: true, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: false },
        objectives: { type: DataTypes.TEXT },
        targetAudience: { type: DataTypes.TEXT },
        metadata: { type: DataTypes.JSON },
        level: { type: DataTypes.STRING(32), defaultValue: 'INTERMEDIATE' },
        status: { type: DataTypes.STRING(20), defaultValue: 'DRAFT' },
        createdById: { type: DataTypes.STRING(64), allowNull: true }
      },
      { tableName: 'courses' }
    );

    const Module = this.sequelize.define(
      'Module',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        courseId: { type: DataTypes.STRING(64), allowNull: false },
        title: { type: DataTypes.STRING(200), allowNull: false },
        description: { type: DataTypes.TEXT },
        order: { type: DataTypes.INTEGER, defaultValue: 0 }
      },
      { tableName: 'modules' }
    );

    const Lesson = this.sequelize.define(
      'Lesson',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        moduleId: { type: DataTypes.STRING(64), allowNull: false },
        title: { type: DataTypes.STRING(200), allowNull: false },
        contentType: { type: DataTypes.STRING(32), defaultValue: 'TEXT' },
        content: { type: DataTypes.TEXT },
        order: { type: DataTypes.INTEGER, defaultValue: 0 }
      },
      { tableName: 'lessons' }
    );

    const Enrollment = this.sequelize.define(
      'Enrollment',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        userId: { type: DataTypes.STRING(64), allowNull: false },
        courseId: { type: DataTypes.STRING(64), allowNull: false },
        status: { type: DataTypes.STRING(20), defaultValue: 'ENROLLED' },
        progressPercentage: { type: DataTypes.INTEGER, defaultValue: 0 },
        enrolledAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        completedAt: { type: DataTypes.DATE }
      },
      { tableName: 'enrollments', indexes: [{ unique: true, fields: ['userId', 'courseId'] }] }
    );

    const LessonProgress = this.sequelize.define(
      'LessonProgress',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        userId: { type: DataTypes.STRING(64), allowNull: false },
        lessonId: { type: DataTypes.STRING(64), allowNull: false },
        status: { type: DataTypes.STRING(20), defaultValue: 'NOT_STARTED' },
        startedAt: { type: DataTypes.DATE },
        completedAt: { type: DataTypes.DATE }
      },
      { tableName: 'lesson_progress', indexes: [{ unique: true, fields: ['userId', 'lessonId'] }] }
    );

    const Quiz = this.sequelize.define(
      'Quiz',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        courseId: { type: DataTypes.STRING(64) },
        moduleId: { type: DataTypes.STRING(64) },
        title: { type: DataTypes.STRING(200), allowNull: false },
        passingScore: { type: DataTypes.INTEGER, defaultValue: 70 },
        status: { type: DataTypes.STRING(20), defaultValue: 'DRAFT' }
      },
      { tableName: 'quizzes' }
    );

    const Question = this.sequelize.define(
      'Question',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        quizId: { type: DataTypes.STRING(64), allowNull: false },
        type: { type: DataTypes.STRING(32), defaultValue: 'SINGLE_CHOICE' },
        prompt: { type: DataTypes.TEXT, allowNull: false },
        points: { type: DataTypes.INTEGER, defaultValue: 1 },
        order: { type: DataTypes.INTEGER, defaultValue: 0 }
      },
      { tableName: 'questions' }
    );

    const AnswerOption = this.sequelize.define(
      'AnswerOption',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        questionId: { type: DataTypes.STRING(64), allowNull: false },
        text: { type: DataTypes.TEXT, allowNull: false },
        isCorrect: { type: DataTypes.BOOLEAN, defaultValue: false }
      },
      { tableName: 'answer_options' }
    );

    const QuizAttempt = this.sequelize.define(
      'QuizAttempt',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        quizId: { type: DataTypes.STRING(64), allowNull: false },
        userId: { type: DataTypes.STRING(64), allowNull: false },
        attemptNumber: { type: DataTypes.INTEGER, allowNull: false },
        status: { type: DataTypes.STRING(20), defaultValue: 'STARTED' },
        score: { type: DataTypes.INTEGER, defaultValue: 0 },
        passed: { type: DataTypes.BOOLEAN, defaultValue: false },
        startedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        submittedAt: { type: DataTypes.DATE },
        gradedAt: { type: DataTypes.DATE }
      },
      { tableName: 'quiz_attempts' }
    );

    const QuizResponse = this.sequelize.define(
      'QuizResponse',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        attemptId: { type: DataTypes.STRING(64), allowNull: false },
        questionId: { type: DataTypes.STRING(64), allowNull: false },
        selectedOptionIds: { type: DataTypes.JSON },
        textAnswer: { type: DataTypes.TEXT },
        score: { type: DataTypes.INTEGER, defaultValue: 0 },
        feedback: { type: DataTypes.TEXT }
      },
      { tableName: 'quiz_responses' }
    );

    const Certificate = this.sequelize.define(
      'Certificate',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        userId: { type: DataTypes.STRING(64), allowNull: false },
        courseId: { type: DataTypes.STRING(64), allowNull: false },
        certificateNumber: { type: DataTypes.STRING(128), unique: true, allowNull: false },
        verificationHash: { type: DataTypes.STRING(191), unique: true, allowNull: false },
        status: { type: DataTypes.STRING(20), defaultValue: 'ACTIVE' },
        issuedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
      },
      { tableName: 'certificates' }
    );

    const AuditLog = this.sequelize.define(
      'AuditLog',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        actorUserId: { type: DataTypes.STRING(64) },
        action: { type: DataTypes.STRING(100), allowNull: false },
        entityType: { type: DataTypes.STRING(100), allowNull: false },
        entityId: { type: DataTypes.STRING(64) },
        ipAddress: { type: DataTypes.STRING(64) },
        userAgent: { type: DataTypes.STRING(255) },
        metadata: { type: DataTypes.JSON }
      },
      { tableName: 'audit_logs' }
    );

    const Document = this.sequelize.define(
      'Document',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        title: { type: DataTypes.STRING(200), allowNull: false },
        type: { type: DataTypes.STRING(32), defaultValue: 'OTHER' },
        status: { type: DataTypes.STRING(20), defaultValue: 'UPLOADED' }
      },
      { tableName: 'documents' }
    );

    const Participant = this.sequelize.define(
      'Participant',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        full_name: { type: DataTypes.STRING(191), allowNull: false },
        email: { type: DataTypes.STRING(191), allowNull: false },
        phone: { type: DataTypes.STRING(64), allowNull: false },
        organization: { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'ARTF' },
        direction: { type: DataTypes.STRING(120) },
        role: { type: DataTypes.STRING(120), allowNull: false },
        years_experience: { type: DataTypes.INTEGER },
        fintrax_level: { type: DataTypes.STRING(32) },
        learning_goals: { type: DataTypes.TEXT, allowNull: false },
        consent_data: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
      },
      { tableName: 'participants' }
    );

    const EmployeeProfile = this.sequelize.define(
      'EmployeeProfile',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        full_name: { type: DataTypes.STRING(191), allowNull: false },
        occurrences: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        source_pages: { type: DataTypes.JSON }
      },
      { tableName: 'employee_profiles' }
    );

    const Notification = this.sequelize.define(
      'Notification',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        title: { type: DataTypes.STRING(200), allowNull: false },
        message: { type: DataTypes.TEXT, allowNull: false },
        audience: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'ALL' },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'SENT' },
        createdById: { type: DataTypes.STRING(64) }
      },
      { tableName: 'notifications' }
    );

    const SupportTicket = this.sequelize.define(
      'SupportTicket',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        subject: { type: DataTypes.STRING(200), allowNull: false },
        message: { type: DataTypes.TEXT, allowNull: false },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'OPEN' },
        priority: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'MEDIUM' },
        openedById: { type: DataTypes.STRING(64), allowNull: false },
        assignedToId: { type: DataTypes.STRING(64) }
      },
      { tableName: 'support_tickets' }
    );

    const ForumTopic = this.sequelize.define(
      'ForumTopic',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        title: { type: DataTypes.STRING(200), allowNull: false },
        content: { type: DataTypes.TEXT, allowNull: false },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
        createdById: { type: DataTypes.STRING(64), allowNull: false }
      },
      { tableName: 'forum_topics' }
    );

    const BlogCategory = this.sequelize.define(
      'BlogCategory',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ACTIVE' }
      },
      { tableName: 'blog_categories' }
    );

    const Tag = this.sequelize.define(
      'Tag',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ACTIVE' }
      },
      { tableName: 'tags' }
    );

    const Blog = this.sequelize.define(
      'Blog',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        title: { type: DataTypes.STRING(200), allowNull: false },
        content: { type: DataTypes.TEXT, allowNull: false },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'PUBLISHED' },
        categoryId: { type: DataTypes.STRING(64) },
        createdById: { type: DataTypes.STRING(64), allowNull: false }
      },
      { tableName: 'blogs' }
    );
    const ReportReason = this.sequelize.define(
      'ReportReason',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        label: { type: DataTypes.STRING(200), allowNull: false, unique: true },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
        createdById: { type: DataTypes.STRING(64) }
      },
      { tableName: 'report_reasons' }
    );

    const AppSetting = this.sequelize.define(
      'AppSetting',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        settingKey: { type: DataTypes.STRING(120), allowNull: false, unique: true },
        settingValue: { type: DataTypes.JSON, allowNull: false }
      },
      { tableName: 'app_settings' }
    );

    const Page = this.sequelize.define(
      'Page',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        title: { type: DataTypes.STRING(200), allowNull: false },
        slug: { type: DataTypes.STRING(220), allowNull: false, unique: true },
        content: { type: DataTypes.TEXT, allowNull: false },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'PUBLISHED' },
        createdById: { type: DataTypes.STRING(64), allowNull: false }
      },
      { tableName: 'pages' }
    );

    const Newsletter = this.sequelize.define(
      'Newsletter',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        subject: { type: DataTypes.STRING(220), allowNull: false },
        body: { type: DataTypes.TEXT, allowNull: false },
        audience: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'ALL' },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'SENT' },
        createdById: { type: DataTypes.STRING(64), allowNull: false }
      },
      { tableName: 'newsletters' }
    );

    const Noticeboard = this.sequelize.define(
      'Noticeboard',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        title: { type: DataTypes.STRING(220), allowNull: false },
        message: { type: DataTypes.TEXT, allowNull: false },
        audience: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'ALL' },
        priority: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'MEDIUM' },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
        createdById: { type: DataTypes.STRING(64), allowNull: false }
      },
      { tableName: 'noticeboards' }
    );

    const CourseExtra = this.sequelize.define(
      'CourseExtra',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        courseId: { type: DataTypes.STRING(64), allowNull: false, field: 'course_id' },
        type: { type: DataTypes.STRING(80), allowNull: false },
        title: { type: DataTypes.STRING(255), allowNull: false },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
        sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
        payload: { type: DataTypes.JSON }
      },
      {
        tableName: 'course_extras',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    );

    const Category = this.sequelize.define(
      'Category',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        parentId: { type: DataTypes.STRING(64) },
        title: { type: DataTypes.STRING(128), allowNull: false },
        slug: { type: DataTypes.STRING(255), allowNull: false, unique: true },
        icon: { type: DataTypes.STRING(500) },
        order: { type: DataTypes.INTEGER },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ACTIVE' }
      },
      { tableName: 'categories' }
    );

    const TrendCategory = this.sequelize.define(
      'TrendCategory',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        categoryId: { type: DataTypes.STRING(64), allowNull: false },
        icon: { type: DataTypes.STRING(500), allowNull: false },
        color: { type: DataTypes.STRING(32), allowNull: false }
      },
      { tableName: 'trend_categories' }
    );

    const CourseComment = this.sequelize.define(
      'CourseComment',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        courseId: { type: DataTypes.STRING(64), allowNull: false },
        authorName: { type: DataTypes.STRING(191), allowNull: false },
        authorEmail: { type: DataTypes.STRING(191) },
        message: { type: DataTypes.TEXT, allowNull: false },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'PUBLISHED' }
      },
      { tableName: 'course_comments' }
    );

    const CourseReview = this.sequelize.define(
      'CourseReview',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        courseId: { type: DataTypes.STRING(64), allowNull: false },
        authorName: { type: DataTypes.STRING(191), allowNull: false },
        authorEmail: { type: DataTypes.STRING(191) },
        rating: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
        comment: { type: DataTypes.TEXT },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'PUBLISHED' }
      },
      { tableName: 'course_reviews' }
    );

    const CourseLearningLastView = this.sequelize.define(
      'CourseLearningLastView',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        userId: { type: DataTypes.STRING(64), allowNull: false },
        courseId: { type: DataTypes.STRING(64), allowNull: false },
        itemType: { type: DataTypes.STRING(80), allowNull: false },
        itemId: { type: DataTypes.STRING(64), allowNull: false }
      },
      { tableName: 'course_learning_last_views' }
    );

    const CoursePersonalNote = this.sequelize.define(
      'CoursePersonalNote',
      {
        id: { type: DataTypes.STRING(64), primaryKey: true },
        userId: { type: DataTypes.STRING(64), allowNull: false },
        courseId: { type: DataTypes.STRING(64), allowNull: false },
        itemType: { type: DataTypes.STRING(80), allowNull: false },
        itemId: { type: DataTypes.STRING(64), allowNull: false },
        note: { type: DataTypes.TEXT, allowNull: false }
      },
      { tableName: 'course_personal_notes' }
    );

    Course.hasMany(Module, { foreignKey: 'courseId', as: 'modules' });
    Course.hasMany(CourseExtra, { foreignKey: 'courseId', as: 'extras' });
    CourseExtra.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
    Category.hasMany(Category, { foreignKey: 'parentId', as: 'subCategories' });
    Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' });
    Category.hasMany(TrendCategory, { foreignKey: 'categoryId', as: 'trends' });
    TrendCategory.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
    Course.hasMany(CourseComment, { foreignKey: 'courseId', as: 'comments' });
    CourseComment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
    Course.hasMany(CourseReview, { foreignKey: 'courseId', as: 'reviews' });
    CourseReview.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
    Course.hasMany(CourseLearningLastView, { foreignKey: 'courseId', as: 'learningLastViews' });
    CourseLearningLastView.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
    Course.hasMany(CoursePersonalNote, { foreignKey: 'courseId', as: 'personalNotes' });
    CoursePersonalNote.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
    Module.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
    Module.hasMany(Lesson, { foreignKey: 'moduleId', as: 'lessons' });
    Lesson.belongsTo(Module, { foreignKey: 'moduleId', as: 'module' });
    Quiz.hasMany(Question, { foreignKey: 'quizId', as: 'questions' });
    Question.hasMany(AnswerOption, { foreignKey: 'questionId', as: 'options' });

    this.models = {
      UserProfile,
      Course,
      Module,
      Lesson,
      Enrollment,
      LessonProgress,
      Quiz,
      Question,
      AnswerOption,
      QuizAttempt,
      QuizResponse,
      Certificate,
      AuditLog,
      Document,
      Participant,
      EmployeeProfile,
      Notification,
      SupportTicket,
      ForumTopic,
      BlogCategory,
      Tag,
      Blog,
      Page,
      Newsletter,
      Noticeboard,
      CourseExtra,
      Category,
      TrendCategory,
      CourseComment,
      CourseReview,
      CourseLearningLastView,
      CoursePersonalNote,
      ReportReason,
      AppSetting
    };
  }

  async onModuleInit(): Promise<void> {
    await this.sequelize.authenticate();
  }

  async onModuleDestroy(): Promise<void> {
    await this.sequelize.close();
  }
}
