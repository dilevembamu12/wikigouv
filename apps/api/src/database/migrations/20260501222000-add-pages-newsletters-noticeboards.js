'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pages', {
      id: { type: Sequelize.STRING(64), primaryKey: true, allowNull: false },
      title: { type: Sequelize.STRING(200), allowNull: false },
      slug: { type: Sequelize.STRING(220), allowNull: false, unique: true },
      content: { type: Sequelize.TEXT('long'), allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'PUBLISHED' },
      createdById: { type: Sequelize.STRING(64), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('newsletters', {
      id: { type: Sequelize.STRING(64), primaryKey: true, allowNull: false },
      subject: { type: Sequelize.STRING(220), allowNull: false },
      body: { type: Sequelize.TEXT('long'), allowNull: false },
      audience: { type: Sequelize.STRING(64), allowNull: false, defaultValue: 'ALL' },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'SENT' },
      createdById: { type: Sequelize.STRING(64), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('noticeboards', {
      id: { type: Sequelize.STRING(64), primaryKey: true, allowNull: false },
      title: { type: Sequelize.STRING(220), allowNull: false },
      message: { type: Sequelize.TEXT('long'), allowNull: false },
      audience: { type: Sequelize.STRING(64), allowNull: false, defaultValue: 'ALL' },
      priority: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'MEDIUM' },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
      createdById: { type: Sequelize.STRING(64), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addIndex('pages', ['status', 'createdAt'], { name: 'idx_pages_status_created_at' });
    await queryInterface.addIndex('newsletters', ['status', 'audience', 'createdAt'], { name: 'idx_newsletters_status_audience_created_at' });
    await queryInterface.addIndex('noticeboards', ['status', 'audience', 'priority', 'createdAt'], {
      name: 'idx_noticeboards_status_audience_priority_created_at'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('noticeboards', 'idx_noticeboards_status_audience_priority_created_at');
    await queryInterface.removeIndex('newsletters', 'idx_newsletters_status_audience_created_at');
    await queryInterface.removeIndex('pages', 'idx_pages_status_created_at');
    await queryInterface.dropTable('noticeboards');
    await queryInterface.dropTable('newsletters');
    await queryInterface.dropTable('pages');
  }
};
