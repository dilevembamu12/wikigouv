'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert(
      'notifications',
      [
        {
          id: 'notif_20260501_001',
          title: 'Mise a jour procedure LCB/FT',
          message: 'La procedure interne LCB/FT version 1.2 est disponible.',
          audience: 'ALL',
          status: 'SENT',
          createdById: 'system',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'notif_20260501_002',
          title: 'Session webinar inspection',
          message: 'Session inspection terrain prevue lundi 10h00.',
          audience: 'AGENT',
          status: 'SENT',
          createdById: 'system',
          createdAt: now,
          updatedAt: now
        }
      ],
      { ignoreDuplicates: true }
    );

    await queryInterface.bulkInsert(
      'support_tickets',
      [
        {
          id: 'ticket_20260501_001',
          subject: 'Acces quiz refuse',
          message: "L utilisateur ne peut pas soumettre le quiz KYC.",
          status: 'OPEN',
          priority: 'HIGH',
          openedById: 'system',
          assignedToId: null,
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'ticket_20260501_002',
          subject: 'Erreur upload document',
          message: "Le PDF ne passe pas la validation d upload.",
          status: 'OPEN',
          priority: 'MEDIUM',
          openedById: 'system',
          assignedToId: null,
          createdAt: now,
          updatedAt: now
        }
      ],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('support_tickets', { id: ['ticket_20260501_001', 'ticket_20260501_002'] }, {});
    await queryInterface.bulkDelete('notifications', { id: ['notif_20260501_001', 'notif_20260501_002'] }, {});
  }
};

