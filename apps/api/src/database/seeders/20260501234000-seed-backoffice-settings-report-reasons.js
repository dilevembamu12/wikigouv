'use strict';

const { randomUUID } = require('crypto');

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'report_reasons',
      [
        { id: randomUUID(), label: 'Contenu inexact', status: 'ACTIVE', createdById: 'seed-admin', createdAt: now, updatedAt: now },
        { id: randomUUID(), label: 'Non conforme LCB-FT', status: 'ACTIVE', createdById: 'seed-admin', createdAt: now, updatedAt: now }
      ],
      { ignoreDuplicates: true }
    );

    await queryInterface.bulkInsert(
      'app_settings',
      [
        {
          id: randomUUID(),
          settingKey: 'settings.general',
          settingValue: JSON.stringify({
            platformName: 'Wikigouv ARTF',
            supportEmail: 'support@wikigouv.local',
            locale: 'fr',
            timezone: 'Africa/Lagos'
          }),
          createdAt: now,
          updatedAt: now
        },
        {
          id: randomUUID(),
          settingKey: 'settings.personalization',
          settingValue: JSON.stringify({
            primary: '#0d6efd',
            secondary: '#6c757d',
            hero: true,
            statistics: true,
            forums: false
          }),
          createdAt: now,
          updatedAt: now
        }
      ],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('app_settings', {
      settingKey: ['settings.general', 'settings.personalization']
    });
    await queryInterface.bulkDelete('report_reasons', { createdById: 'seed-admin' });
  }
};
