'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('participants', {
      id: { type: Sequelize.STRING(64), primaryKey: true, allowNull: false },
      full_name: { type: Sequelize.STRING(191), allowNull: false },
      email: { type: Sequelize.STRING(191), allowNull: false },
      phone: { type: Sequelize.STRING(64), allowNull: false },
      organization: { type: Sequelize.STRING(120), allowNull: false, defaultValue: 'ARTF' },
      direction: { type: Sequelize.STRING(120) },
      role: { type: Sequelize.STRING(120), allowNull: false },
      years_experience: { type: Sequelize.INTEGER },
      fintrax_level: { type: Sequelize.STRING(32) },
      learning_goals: { type: Sequelize.TEXT, allowNull: false },
      consent_data: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.createTable('employee_profiles', {
      id: { type: Sequelize.STRING(64), primaryKey: true, allowNull: false },
      full_name: { type: Sequelize.STRING(191), allowNull: false },
      occurrences: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      source_pages: { type: Sequelize.JSON },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('employee_profiles');
    await queryInterface.dropTable('participants');
  }
};
