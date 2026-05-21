'use strict';

const now = new Date();

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'user_profiles',
      [
        {
          id: 'user_superadmin_001',
          keycloakUserId: 'kc_superadmin_wikigouv',
          email: 'superadmin@wikigouv.local',
          firstName: 'Super',
          lastName: 'Admin',
          fullName: 'Super Admin',
          jobTitle: 'Super Administrateur',
          department: 'DSI',
          phone: '',
          status: 'ACTIVE',
          firstLoginAt: now,
          lastLoginAt: now,
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'user_admin_001',
          keycloakUserId: 'kc_admin_wikigouv',
          email: 'admin@wikigouv.local',
          firstName: 'Admin',
          lastName: 'Wikigouv',
          fullName: 'Admin Wikigouv',
          jobTitle: 'Administrateur Plateforme',
          department: 'Conformité',
          phone: '',
          status: 'ACTIVE',
          firstLoginAt: now,
          lastLoginAt: now,
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'user_formateur_001',
          keycloakUserId: 'kc_formateur_wikigouv',
          email: 'formateur@wikigouv.local',
          firstName: 'Formateur',
          lastName: 'ARTF',
          fullName: 'Formateur ARTF',
          jobTitle: 'Formateur Réglementaire',
          department: 'Formation',
          phone: '',
          status: 'ACTIVE',
          firstLoginAt: now,
          lastLoginAt: now,
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'user_agent_001',
          keycloakUserId: 'kc_agent_wikigouv',
          email: 'agent@wikigouv.local',
          firstName: 'Agent',
          lastName: 'ARTF',
          fullName: 'Agent ARTF',
          jobTitle: 'Agent Conformité',
          department: 'Supervision',
          phone: '',
          status: 'ACTIVE',
          firstLoginAt: now,
          lastLoginAt: now,
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'user_direction_001',
          keycloakUserId: 'kc_direction_wikigouv',
          email: 'direction@wikigouv.local',
          firstName: 'Direction',
          lastName: 'ARTF',
          fullName: 'Direction ARTF',
          jobTitle: 'Direction',
          department: 'Direction Générale',
          phone: '',
          status: 'ACTIVE',
          firstLoginAt: now,
          lastLoginAt: now,
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'user_auditeur_001',
          keycloakUserId: 'kc_auditeur_wikigouv',
          email: 'auditeur@wikigouv.local',
          firstName: 'Auditeur',
          lastName: 'Interne',
          fullName: 'Auditeur Interne',
          jobTitle: 'Auditeur',
          department: 'Audit interne',
          phone: '',
          status: 'ACTIVE',
          firstLoginAt: now,
          lastLoginAt: now,
          createdAt: now,
          updatedAt: now
        }
      ],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'user_profiles',
      {
        email: [
          'superadmin@wikigouv.local',
          'admin@wikigouv.local',
          'formateur@wikigouv.local',
          'agent@wikigouv.local',
          'direction@wikigouv.local',
          'auditeur@wikigouv.local'
        ]
      },
      {}
    );
  }
};
