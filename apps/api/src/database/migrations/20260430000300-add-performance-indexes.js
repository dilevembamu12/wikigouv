'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('courses', ['status'], {
      name: 'idx_courses_status'
    });
    await queryInterface.addIndex('courses', ['slug'], {
      unique: true,
      name: 'idx_courses_slug_unique'
    });

    await queryInterface.addIndex('modules', ['courseId', 'order'], {
      name: 'idx_modules_course_order'
    });
    await queryInterface.addIndex('lessons', ['moduleId', 'order'], {
      name: 'idx_lessons_module_order'
    });

    await queryInterface.addIndex('enrollments', ['userId'], {
      name: 'idx_enrollments_user'
    });
    await queryInterface.addIndex('enrollments', ['courseId'], {
      name: 'idx_enrollments_course'
    });
    await queryInterface.addIndex('enrollments', ['status'], {
      name: 'idx_enrollments_status'
    });

    await queryInterface.addIndex('lesson_progress', ['userId'], {
      name: 'idx_lesson_progress_user'
    });
    await queryInterface.addIndex('lesson_progress', ['lessonId'], {
      name: 'idx_lesson_progress_lesson'
    });
    await queryInterface.addIndex('lesson_progress', ['status'], {
      name: 'idx_lesson_progress_status'
    });

    await queryInterface.addIndex('quizzes', ['courseId'], {
      name: 'idx_quizzes_course'
    });
    await queryInterface.addIndex('questions', ['quizId', 'order'], {
      name: 'idx_questions_quiz_order'
    });
    await queryInterface.addIndex('answer_options', ['questionId'], {
      name: 'idx_answer_options_question'
    });

    await queryInterface.addIndex('quiz_attempts', ['quizId'], {
      name: 'idx_quiz_attempts_quiz'
    });
    await queryInterface.addIndex('quiz_attempts', ['userId'], {
      name: 'idx_quiz_attempts_user'
    });
    await queryInterface.addIndex('quiz_attempts', ['status'], {
      name: 'idx_quiz_attempts_status'
    });

    await queryInterface.addIndex('certificates', ['userId'], {
      name: 'idx_certificates_user'
    });
    await queryInterface.addIndex('certificates', ['courseId'], {
      name: 'idx_certificates_course'
    });
    await queryInterface.addIndex('certificates', ['verificationHash'], {
      unique: true,
      name: 'idx_certificates_verification_hash_unique'
    });

    await queryInterface.addIndex('documents', ['status'], {
      name: 'idx_documents_status'
    });
    await queryInterface.addIndex('audit_logs', ['createdAt'], {
      name: 'idx_audit_logs_created_at'
    });
    await queryInterface.addIndex('audit_logs', ['actorUserId'], {
      name: 'idx_audit_logs_actor'
    });
    await queryInterface.addIndex('audit_logs', ['action'], {
      name: 'idx_audit_logs_action'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_action');
    await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_actor');
    await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_created_at');
    await queryInterface.removeIndex('documents', 'idx_documents_status');
    await queryInterface.removeIndex('certificates', 'idx_certificates_verification_hash_unique');
    await queryInterface.removeIndex('certificates', 'idx_certificates_course');
    await queryInterface.removeIndex('certificates', 'idx_certificates_user');
    await queryInterface.removeIndex('quiz_attempts', 'idx_quiz_attempts_status');
    await queryInterface.removeIndex('quiz_attempts', 'idx_quiz_attempts_user');
    await queryInterface.removeIndex('quiz_attempts', 'idx_quiz_attempts_quiz');
    await queryInterface.removeIndex('answer_options', 'idx_answer_options_question');
    await queryInterface.removeIndex('questions', 'idx_questions_quiz_order');
    await queryInterface.removeIndex('quizzes', 'idx_quizzes_course');
    await queryInterface.removeIndex('lesson_progress', 'idx_lesson_progress_status');
    await queryInterface.removeIndex('lesson_progress', 'idx_lesson_progress_lesson');
    await queryInterface.removeIndex('lesson_progress', 'idx_lesson_progress_user');
    await queryInterface.removeIndex('enrollments', 'idx_enrollments_status');
    await queryInterface.removeIndex('enrollments', 'idx_enrollments_course');
    await queryInterface.removeIndex('enrollments', 'idx_enrollments_user');
    await queryInterface.removeIndex('lessons', 'idx_lessons_module_order');
    await queryInterface.removeIndex('modules', 'idx_modules_course_order');
    await queryInterface.removeIndex('courses', 'idx_courses_slug_unique');
    await queryInterface.removeIndex('courses', 'idx_courses_status');
  }
};
