'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const id = { type: Sequelize.STRING(64), primaryKey: true, allowNull: false };
    const timestamps = {
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    };

    await queryInterface.createTable('blog_categories', {
      id,
      name: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
      ...timestamps
    });

    await queryInterface.createTable('tags', {
      id,
      name: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
      ...timestamps
    });

    await queryInterface.createTable('blogs', {
      id,
      title: { type: Sequelize.STRING(200), allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'PUBLISHED' },
      categoryId: { type: Sequelize.STRING(64), allowNull: true },
      createdById: { type: Sequelize.STRING(64), allowNull: false },
      ...timestamps
    });

    await queryInterface.addIndex('blogs', ['status', 'createdAt'], { name: 'blogs_status_created_at_idx' });
    await queryInterface.addIndex('blog_categories', ['status', 'createdAt'], {
      name: 'blog_categories_status_created_at_idx'
    });
    await queryInterface.addIndex('tags', ['status', 'createdAt'], { name: 'tags_status_created_at_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('blogs');
    await queryInterface.dropTable('tags');
    await queryInterface.dropTable('blog_categories');
  }
};

