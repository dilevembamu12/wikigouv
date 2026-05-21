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

    await queryInterface.createTable('forum_topics', {
      id,
      title: { type: Sequelize.STRING(200), allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
      createdById: { type: Sequelize.STRING(64), allowNull: false },
      ...timestamps
    });

    await queryInterface.addIndex('forum_topics', ['status', 'createdAt'], {
      name: 'forum_topics_status_created_at_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('forum_topics');
  }
};

