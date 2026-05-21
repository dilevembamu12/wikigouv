'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('report_reasons', {
      id: { type: Sequelize.STRING(64), primaryKey: true, allowNull: false },
      label: { type: Sequelize.STRING(200), allowNull: false, unique: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
      createdById: { type: Sequelize.STRING(64) },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('app_settings', {
      id: { type: Sequelize.STRING(64), primaryKey: true, allowNull: false },
      settingKey: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      settingValue: { type: Sequelize.JSON, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addIndex('report_reasons', ['status', 'createdAt'], { name: 'idx_report_reasons_status_created_at' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('report_reasons', 'idx_report_reasons_status_created_at');
    await queryInterface.dropTable('app_settings');
    await queryInterface.dropTable('report_reasons');
  }
};
