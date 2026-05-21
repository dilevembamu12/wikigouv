'use strict';

const { randomUUID } = require('crypto');

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert(
      'pages',
      [
        {
          id: randomUUID(),
          title: 'Conditions d utilisation',
          slug: 'conditions-utilisation',
          content: 'Conditions institutionnelles ARTF pour l usage de Wikigouv.',
          status: 'PUBLISHED',
          createdById: 'seed-admin',
          createdAt: now,
          updatedAt: now
        },
        {
          id: randomUUID(),
          title: 'Politique de confidentialite',
          slug: 'politique-confidentialite',
          content: 'Regles de protection des donnees et d usage interne.',
          status: 'PUBLISHED',
          createdById: 'seed-admin',
          createdAt: now,
          updatedAt: now
        }
      ],
      { ignoreDuplicates: true }
    );

    await queryInterface.bulkInsert(
      'newsletters',
      [
        {
          id: randomUUID(),
          subject: 'Veille LCB-FT - Mai',
          body: 'Synthese des mises a jour de conformite a diffuser aux agents.',
          audience: 'AGENT',
          status: 'SENT',
          createdById: 'seed-admin',
          createdAt: now,
          updatedAt: now
        }
      ],
      { ignoreDuplicates: true }
    );

    await queryInterface.bulkInsert(
      'noticeboards',
      [
        {
          id: randomUUID(),
          title: 'Maintenance planifiee',
          message: 'Maintenance plateforme ce samedi de 22h a 23h.',
          audience: 'ALL',
          priority: 'MEDIUM',
          status: 'ACTIVE',
          createdById: 'seed-admin',
          createdAt: now,
          updatedAt: now
        }
      ],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('noticeboards', { createdById: 'seed-admin' });
    await queryInterface.bulkDelete('newsletters', { createdById: 'seed-admin' });
    await queryInterface.bulkDelete('pages', { createdById: 'seed-admin' });
  }
};
