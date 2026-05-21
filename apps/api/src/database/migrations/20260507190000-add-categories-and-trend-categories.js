'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categories', {
      id: { type: Sequelize.STRING(64), primaryKey: true, allowNull: false },
      parentId: { type: Sequelize.STRING(64), allowNull: true },
      title: { type: Sequelize.STRING(128), allowNull: false },
      slug: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      icon: { type: Sequelize.STRING(500), allowNull: true },
      order: { type: Sequelize.INTEGER, allowNull: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('categories', ['parentId', 'order'], { name: 'categories_parent_order_idx' });
    await queryInterface.addIndex('categories', ['status', 'createdAt'], { name: 'categories_status_created_idx' });

    await queryInterface.createTable('trend_categories', {
      id: { type: Sequelize.STRING(64), primaryKey: true, allowNull: false },
      categoryId: { type: Sequelize.STRING(64), allowNull: false },
      icon: { type: Sequelize.STRING(500), allowNull: false },
      color: { type: Sequelize.STRING(32), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addConstraint('trend_categories', {
      type: 'foreign key',
      name: 'fk_trend_categories_category_id',
      fields: ['categoryId'],
      references: {
        table: 'categories',
        field: 'id'
      },
      onDelete: 'cascade',
      onUpdate: 'cascade'
    });
    await queryInterface.addIndex('trend_categories', ['categoryId'], { name: 'trend_categories_category_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trend_categories');
    await queryInterface.dropTable('categories');
  }
};
