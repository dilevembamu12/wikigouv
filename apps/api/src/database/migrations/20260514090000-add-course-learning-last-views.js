'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('course_learning_last_views', {
      id: { type: Sequelize.STRING(64), allowNull: false, primaryKey: true },
      userId: { type: Sequelize.STRING(64), allowNull: false },
      courseId: { type: Sequelize.STRING(64), allowNull: false },
      itemType: { type: Sequelize.STRING(80), allowNull: false },
      itemId: { type: Sequelize.STRING(64), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('course_learning_last_views', ['userId', 'courseId'], {
      name: 'uniq_course_learning_last_view_user_course',
      unique: true
    });
    await queryInterface.addIndex('course_learning_last_views', ['courseId', 'updatedAt'], {
      name: 'idx_course_learning_last_view_course_updated'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('course_learning_last_views');
  }
};
