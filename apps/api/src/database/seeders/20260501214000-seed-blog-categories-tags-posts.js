'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'blog_categories',
      [
        { id: 'blog_cat_001', name: 'Conformite', status: 'ACTIVE', createdAt: now, updatedAt: now },
        { id: 'blog_cat_002', name: 'Supervision', status: 'ACTIVE', createdAt: now, updatedAt: now }
      ],
      { ignoreDuplicates: true }
    );

    await queryInterface.bulkInsert(
      'tags',
      [
        { id: 'tag_001', name: 'LCBFT', status: 'ACTIVE', createdAt: now, updatedAt: now },
        { id: 'tag_002', name: 'Inspection', status: 'ACTIVE', createdAt: now, updatedAt: now }
      ],
      { ignoreDuplicates: true }
    );

    await queryInterface.bulkInsert(
      'blogs',
      [
        {
          id: 'blog_001',
          title: 'Bonnes pratiques KYC sur le terrain',
          content: 'Synthese des pratiques de controle KYC pour les agents.',
          status: 'PUBLISHED',
          categoryId: 'blog_cat_001',
          createdById: 'system',
          createdAt: now,
          updatedAt: now
        }
      ],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('blogs', { id: ['blog_001'] }, {});
    await queryInterface.bulkDelete('tags', { id: ['tag_001', 'tag_002'] }, {});
    await queryInterface.bulkDelete('blog_categories', { id: ['blog_cat_001', 'blog_cat_002'] }, {});
  }
};

