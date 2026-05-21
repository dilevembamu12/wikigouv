'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('course_extras', {
      id: { type: Sequelize.STRING(64), allowNull: false, primaryKey: true },
      course_id: { type: Sequelize.STRING(64), allowNull: false },
      type: { type: Sequelize.STRING(80), allowNull: false },
      title: { type: Sequelize.STRING(255), allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      payload: { type: Sequelize.JSON, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addIndex('course_extras', ['course_id', 'type', 'sort_order'], {
      name: 'idx_course_extras_course_type_order'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('course_extras');
  }
};
