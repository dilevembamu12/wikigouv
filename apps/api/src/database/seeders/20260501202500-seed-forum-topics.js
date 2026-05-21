'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'forum_topics',
      [
        {
          id: 'forum_topic_20260501_001',
          title: 'Controle interne des operations suspectes',
          content: 'Partage des pratiques et cas rencontres sur le terrain.',
          status: 'ACTIVE',
          createdById: 'system',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'forum_topic_20260501_002',
          title: 'FAQ inspections ARTF',
          content: 'Questions recurrentes sur les inspections de conformite.',
          status: 'MODERATED',
          createdById: 'system',
          createdAt: now,
          updatedAt: now
        }
      ],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'forum_topics',
      { id: ['forum_topic_20260501_001', 'forum_topic_20260501_002'] },
      {}
    );
  }
};

