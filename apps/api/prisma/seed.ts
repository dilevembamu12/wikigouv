import { PrismaClient, CourseLevel, CourseStatus, QuizStatus, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const category = await prisma.courseCategory.upsert({
    where: { slug: 'lcb-ft' },
    update: {},
    create: {
      name: 'LCB/FT',
      slug: 'lcb-ft',
      description: 'Conformité, vigilance et transferts de fonds'
    }
  });

  const course = await prisma.course.upsert({
    where: { slug: 'kyc-fondamentaux-artf' },
    update: {},
    create: {
      title: 'KYC fondamentaux ARTF',
      slug: 'kyc-fondamentaux-artf',
      description: 'Fondamentaux KYC pour agents ARTF',
      objectives: 'Identifier pièces KYC, profils de risque et alertes',
      targetAudience: 'Agents de conformité',
      categoryId: category.id,
      level: CourseLevel.BEGINNER,
      status: CourseStatus.PUBLISHED
    }
  });

  const module1 = await prisma.module.upsert({
    where: { id: 'seed-module-kyc-1' },
    update: {},
    create: {
      id: 'seed-module-kyc-1',
      courseId: course.id,
      title: 'Introduction KYC',
      description: 'Principes de base',
      order: 1
    }
  });

  const lesson1 = await prisma.lesson.upsert({
    where: { id: 'seed-lesson-kyc-1' },
    update: {},
    create: {
      id: 'seed-lesson-kyc-1',
      moduleId: module1.id,
      title: 'Cadre réglementaire ARTF',
      contentType: 'TEXT',
      content: 'Le cadre ARTF impose une vigilance graduée selon le niveau de risque.',
      order: 1
    }
  });

  const lesson2 = await prisma.lesson.upsert({
    where: { id: 'seed-lesson-kyc-2' },
    update: {},
    create: {
      id: 'seed-lesson-kyc-2',
      moduleId: module1.id,
      title: 'Documents KYC requis',
      contentType: 'TEXT',
      content: 'Pièce d identité, justificatif domicile et preuve d activité selon profil.',
      order: 2
    }
  });

  const quiz = await prisma.quiz.upsert({
    where: { id: 'seed-quiz-kyc-1' },
    update: {},
    create: {
      id: 'seed-quiz-kyc-1',
      courseId: course.id,
      moduleId: module1.id,
      title: 'Quiz KYC niveau 1',
      description: 'Validation des notions de base',
      passingScore: 2,
      status: QuizStatus.PUBLISHED
    }
  });

  const q1 = await prisma.question.upsert({
    where: { id: 'seed-question-1' },
    update: {},
    create: {
      id: 'seed-question-1',
      quizId: quiz.id,
      type: QuestionType.SINGLE_CHOICE,
      prompt: 'Quel document est généralement obligatoire en KYC ?',
      points: 1,
      order: 1
    }
  });

  await prisma.answerOption.createMany({
    data: [
      { id: 'seed-opt-1', questionId: q1.id, text: 'Pièce d identité', isCorrect: true, order: 1 },
      { id: 'seed-opt-2', questionId: q1.id, text: 'Carte de fidélité', isCorrect: false, order: 2 }
    ],
    skipDuplicates: true
  });

  const q2 = await prisma.question.upsert({
    where: { id: 'seed-question-2' },
    update: {},
    create: {
      id: 'seed-question-2',
      quizId: quiz.id,
      type: QuestionType.TRUE_FALSE,
      prompt: 'Un transfert fragmenté peut constituer un signal d alerte.',
      points: 1,
      order: 2
    }
  });

  await prisma.answerOption.createMany({
    data: [
      { id: 'seed-opt-3', questionId: q2.id, text: 'Vrai', isCorrect: true, order: 1 },
      { id: 'seed-opt-4', questionId: q2.id, text: 'Faux', isCorrect: false, order: 2 }
    ],
    skipDuplicates: true
  });

  await prisma.caseSimulation.upsert({
    where: { id: 'seed-case-1' },
    update: {},
    create: {
      id: 'seed-case-1',
      title: 'Transferts fragmentés',
      description: 'Cas de risque LCB/FT',
      scenario:
        'Un client effectue 8 transferts de 900 000 XAF en deux jours vers plusieurs bénéficiaires.',
      expectedActions: 'Détection de structuration, revue KYC, escalade conformité',
      regulatoryReferences: 'Guide interne ARTF LCB/FT'
    }
  });

  void lesson1;
  void lesson2;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
