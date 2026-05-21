'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('courses');
    if (!table.metadata) {
      await queryInterface.addColumn('courses', 'metadata', {
        type: Sequelize.JSON,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('courses');
    if (table.metadata) {
      await queryInterface.removeColumn('courses', 'metadata');
    }
  }
};

