'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'employee_profiles',
      [
        {
          id: 'emp_001',
          full_name: 'AKABOH Berenice',
          occurrences: 10,
          source_pages: JSON.stringify([1, 4, 6, 7]),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'emp_002',
          full_name: 'AKOLI Emmanuel',
          occurrences: 1,
          source_pages: JSON.stringify([17]),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'emp_003',
          full_name: 'ANKINA Gav Chya',
          occurrences: 11,
          source_pages: JSON.stringify([1, 3, 4, 6, 7]),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('employee_profiles', { id: ['emp_001', 'emp_002', 'emp_003'] }, {});
  }
};
