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

    await queryInterface.createTable('notifications', {
      id,
      title: { type: Sequelize.STRING(200), allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      audience: { type: Sequelize.STRING(64), allowNull: false, defaultValue: 'ALL' },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'SENT' },
      createdById: { type: Sequelize.STRING(64) },
      ...timestamps
    });

    await queryInterface.createTable('support_tickets', {
      id,
      subject: { type: Sequelize.STRING(200), allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'OPEN' },
      priority: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'MEDIUM' },
      openedById: { type: Sequelize.STRING(64), allowNull: false },
      assignedToId: { type: Sequelize.STRING(64) },
      ...timestamps
    });

    await queryInterface.addIndex('notifications', ['createdAt'], {
      name: 'notifications_created_at_idx'
    });
    await queryInterface.addIndex('support_tickets', ['status', 'createdAt'], {
      name: 'support_tickets_status_created_at_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('support_tickets');
    await queryInterface.dropTable('notifications');
  }
};

