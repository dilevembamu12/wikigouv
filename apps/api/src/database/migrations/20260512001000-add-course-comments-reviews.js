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

    await queryInterface.createTable('course_comments', {
      id,
      courseId: { type: Sequelize.STRING(64), allowNull: false },
      authorName: { type: Sequelize.STRING(191), allowNull: false },
      authorEmail: { type: Sequelize.STRING(191) },
      message: { type: Sequelize.TEXT, allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'PUBLISHED' },
      ...timestamps
    });
    await queryInterface.addIndex('course_comments', ['courseId', 'status', 'createdAt'], {
      name: 'idx_course_comments_course_status_created'
    });

    await queryInterface.createTable('course_reviews', {
      id,
      courseId: { type: Sequelize.STRING(64), allowNull: false },
      authorName: { type: Sequelize.STRING(191), allowNull: false },
      authorEmail: { type: Sequelize.STRING(191) },
      rating: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
      comment: { type: Sequelize.TEXT },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'PUBLISHED' },
      ...timestamps
    });
    await queryInterface.addIndex('course_reviews', ['courseId', 'status', 'createdAt'], {
      name: 'idx_course_reviews_course_status_created'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('course_reviews');
    await queryInterface.dropTable('course_comments');
  }
};

