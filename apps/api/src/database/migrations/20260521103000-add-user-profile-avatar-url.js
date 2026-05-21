'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_profiles', 'avatarUrl', {
      type: Sequelize.STRING(1024),
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('user_profiles', 'avatarUrl');
  }
};

