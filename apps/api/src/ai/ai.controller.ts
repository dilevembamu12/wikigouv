import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SimpleRateLimitGuard } from '@/common/guards/simple-rate-limit.guard';
import { RequirePermissions } from '@/auth/permissions.decorator';
import { Permission } from '@/auth/permissions.enum';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { RolesGuard } from '@/auth/roles.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, SimpleRateLimitGuard)
export class AiController {
  @Post('assistant/chat')
  @RequirePermissions(Permission.AI_ASSISTANT_USE)
  chat(@Body() body: { question: string }) {
    return {
      answer:
        "Réponse simulée (MVP): l'intégration RAG document validé est prévue en phase 2 avec citations.",
      citations: [],
      receivedQuestion: body.question
    };
  }

  @Post('quiz-generator')
  @RequirePermissions(Permission.AI_QUIZ_GENERATE)
  quizGenerator() {
    return {
      draft: true,
      questions: [],
      note: 'Génération IA en brouillon, validation humaine obligatoire.'
    };
  }

  @Post('case-simulator/start')
  @RequirePermissions(Permission.AI_CASE_SIMULATE)
  caseStart() {
    return { ok: true, attemptId: 'mvp-case-attempt' };
  }
}
