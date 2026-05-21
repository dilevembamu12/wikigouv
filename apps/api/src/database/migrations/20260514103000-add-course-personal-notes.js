'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('course_personal_notes', {
      id: {
        type: Sequelize.STRING(64),
        allowNull: false,
        primaryKey: true
      },
      userId: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      courseId: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      itemType: {
        type: Sequelize.STRING(80),
        allowNull: false
      },
      itemId: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('course_personal_notes', ['userId', 'courseId', 'itemType', 'itemId'], {
      name: 'uniq_course_personal_note_user_course_item',
      unique: true
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('course_personal_notes');
  }
};
