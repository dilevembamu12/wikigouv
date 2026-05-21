'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const id = { type: Sequelize.STRING(64), primaryKey: true, allowNull: false };
    const timestamps = {
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    };

    await queryInterface.createTable('user_profiles', {
      id,
      keycloakUserId: { type: Sequelize.STRING(191), allowNull: false, unique: true },
      email: { type: Sequelize.STRING(191), allowNull: false, unique: true },
      firstName: { type: Sequelize.STRING(120), allowNull: false },
      lastName: { type: Sequelize.STRING(120), allowNull: false },
      fullName: { type: Sequelize.STRING(180), allowNull: false },
      jobTitle: { type: Sequelize.STRING(120) },
      department: { type: Sequelize.STRING(120) },
      phone: { type: Sequelize.STRING(40) },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
      firstLoginAt: { type: Sequelize.DATE },
      lastLoginAt: { type: Sequelize.DATE },
      ...timestamps
    });

    await queryInterface.createTable('courses', {
      id,
      title: { type: Sequelize.STRING(200), allowNull: false },
      slug: { type: Sequelize.STRING(200), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT, allowNull: false },
      objectives: { type: Sequelize.TEXT },
      targetAudience: { type: Sequelize.TEXT },
      level: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'INTERMEDIATE' },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'DRAFT' },
      createdById: { type: Sequelize.STRING(64) },
      ...timestamps
    });

    await queryInterface.createTable('modules', {
      id,
      courseId: { type: Sequelize.STRING(64), allowNull: false },
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT },
      order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      ...timestamps
    });

    await queryInterface.createTable('lessons', {
      id,
      moduleId: { type: Sequelize.STRING(64), allowNull: false },
      title: { type: Sequelize.STRING(200), allowNull: false },
      contentType: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'TEXT' },
      content: { type: Sequelize.TEXT },
      order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      ...timestamps
    });

    await queryInterface.createTable('enrollments', {
      id,
      userId: { type: Sequelize.STRING(64), allowNull: false },
      courseId: { type: Sequelize.STRING(64), allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ENROLLED' },
      progressPercentage: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      enrolledAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      completedAt: { type: Sequelize.DATE },
      ...timestamps
    });
    await queryInterface.addConstraint('enrollments', {
      type: 'unique',
      fields: ['userId', 'courseId'],
      name: 'enrollments_user_course_unique'
    });

    await queryInterface.createTable('lesson_progress', {
      id,
      userId: { type: Sequelize.STRING(64), allowNull: false },
      lessonId: { type: Sequelize.STRING(64), allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'NOT_STARTED' },
      startedAt: { type: Sequelize.DATE },
      completedAt: { type: Sequelize.DATE },
      ...timestamps
    });
    await queryInterface.addConstraint('lesson_progress', {
      type: 'unique',
      fields: ['userId', 'lessonId'],
      name: 'lesson_progress_user_lesson_unique'
    });

    await queryInterface.createTable('quizzes', {
      id,
      courseId: { type: Sequelize.STRING(64) },
      moduleId: { type: Sequelize.STRING(64) },
      title: { type: Sequelize.STRING(200), allowNull: false },
      passingScore: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 70 },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'DRAFT' },
      ...timestamps
    });

    await queryInterface.createTable('questions', {
      id,
      quizId: { type: Sequelize.STRING(64), allowNull: false },
      type: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'SINGLE_CHOICE' },
      prompt: { type: Sequelize.TEXT, allowNull: false },
      points: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      ...timestamps
    });

    await queryInterface.createTable('answer_options', {
      id,
      questionId: { type: Sequelize.STRING(64), allowNull: false },
      text: { type: Sequelize.TEXT, allowNull: false },
      isCorrect: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ...timestamps
    });

    await queryInterface.createTable('quiz_attempts', {
      id,
      quizId: { type: Sequelize.STRING(64), allowNull: false },
      userId: { type: Sequelize.STRING(64), allowNull: false },
      attemptNumber: { type: Sequelize.INTEGER, allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'STARTED' },
      score: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      passed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      startedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      submittedAt: { type: Sequelize.DATE },
      gradedAt: { type: Sequelize.DATE },
      ...timestamps
    });

    await queryInterface.createTable('quiz_responses', {
      id,
      attemptId: { type: Sequelize.STRING(64), allowNull: false },
      questionId: { type: Sequelize.STRING(64), allowNull: false },
      selectedOptionIds: { type: Sequelize.JSON },
      textAnswer: { type: Sequelize.TEXT },
      score: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      feedback: { type: Sequelize.TEXT },
      ...timestamps
    });

    await queryInterface.createTable('certificates', {
      id,
      userId: { type: Sequelize.STRING(64), allowNull: false },
      courseId: { type: Sequelize.STRING(64), allowNull: false },
      certificateNumber: { type: Sequelize.STRING(128), allowNull: false, unique: true },
      verificationHash: { type: Sequelize.STRING(191), allowNull: false, unique: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
      issuedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      ...timestamps
    });

    await queryInterface.createTable('audit_logs', {
      id,
      actorUserId: { type: Sequelize.STRING(64) },
      action: { type: Sequelize.STRING(100), allowNull: false },
      entityType: { type: Sequelize.STRING(100), allowNull: false },
      entityId: { type: Sequelize.STRING(64) },
      ipAddress: { type: Sequelize.STRING(64) },
      userAgent: { type: Sequelize.STRING(255) },
      metadata: { type: Sequelize.JSON },
      ...timestamps
    });

    await queryInterface.createTable('documents', {
      id,
      title: { type: Sequelize.STRING(200), allowNull: false },
      type: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'OTHER' },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'UPLOADED' },
      ...timestamps
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('documents');
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('certificates');
    await queryInterface.dropTable('quiz_responses');
    await queryInterface.dropTable('quiz_attempts');
    await queryInterface.dropTable('answer_options');
    await queryInterface.dropTable('questions');
    await queryInterface.dropTable('quizzes');
    await queryInterface.dropTable('lesson_progress');
    await queryInterface.dropTable('enrollments');
    await queryInterface.dropTable('lessons');
    await queryInterface.dropTable('modules');
    await queryInterface.dropTable('courses');
    await queryInterface.dropTable('user_profiles');
  }
};
