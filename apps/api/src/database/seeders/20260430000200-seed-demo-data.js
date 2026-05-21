'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const courseId = 'course_kyc_artf_001';
    const moduleId = 'module_kyc_intro_001';
    const lesson1 = 'lesson_kyc_reglementaire_001';
    const lesson2 = 'lesson_kyc_documents_001';
    const quizId = 'quiz_kyc_n1_001';
    const q1 = 'question_kyc_001';
    const q2 = 'question_kyc_002';

    await queryInterface.bulkInsert(
      'courses',
      [
        {
          id: courseId,
          title: 'KYC fondamentaux ARTF',
          slug: 'kyc-fondamentaux-artf',
          description: 'Fondamentaux KYC pour agents ARTF',
          objectives: 'Identifier pieces KYC, profils de risque et alertes',
          targetAudience: 'Agents conformite',
          level: 'BEGINNER',
          status: 'PUBLISHED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      { ignoreDuplicates: true }
    );

    await queryInterface.bulkInsert(
      'modules',
      [
        {
          id: moduleId,
          courseId,
          title: 'Introduction KYC',
          description: 'Principes de base',
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      { ignoreDuplicates: true }
    );

    await queryInterface.bulkInsert(
      'lessons',
      [
        {
          id: lesson1,
          moduleId,
          title: 'Cadre reglementaire ARTF',
          contentType: 'TEXT',
          content: 'Le cadre ARTF impose une vigilance graduee selon le risque.',
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: lesson2,
          moduleId,
          title: 'Documents KYC requis',
          contentType: 'TEXT',
          content: 'Piece identite, justificatif domicile, preuve activite.',
          order: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      { ignoreDuplicates: true }
    );

    await queryInterface.bulkInsert(
      'quizzes',
      [
        {
          id: quizId,
          courseId,
          moduleId,
          title: 'Quiz KYC niveau 1',
          passingScore: 2,
          status: 'PUBLISHED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      { ignoreDuplicates: true }
    );

    await queryInterface.bulkInsert(
      'questions',
      [
        {
          id: q1,
          quizId,
          type: 'SINGLE_CHOICE',
          prompt: 'Quel document est generalement obligatoire en KYC ?',
          points: 1,
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: q2,
          quizId,
          type: 'TRUE_FALSE',
          prompt: "Un transfert fragmente peut etre un signal d'alerte.",
          points: 1,
          order: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('questions', null, {});
    await queryInterface.bulkDelete('quizzes', null, {});
    await queryInterface.bulkDelete('lessons', null, {});
    await queryInterface.bulkDelete('modules', null, {});
    await queryInterface.bulkDelete('courses', null, {});
  }
};
