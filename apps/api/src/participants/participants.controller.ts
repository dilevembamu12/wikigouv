import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ParticipantsService } from './participants.service';

@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participants: ParticipantsService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body()
    payload: {
      full_name?: string;
      email?: string;
      phone?: string;
      organization?: string;
      direction?: string;
      role?: string;
      years_experience?: number | string;
      fintrax_level?: string;
      learning_goals?: string;
      consent_data?: boolean;
    }
  ) {
    if (!payload.full_name || !payload.email || !payload.phone || !payload.role || !payload.learning_goals) {
      throw new BadRequestException('Champs obligatoires manquants.');
    }

    const participant = await this.participants.register({
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone,
      organization: payload.organization,
      direction: payload.direction,
      role: payload.role,
      years_experience: payload.years_experience,
      fintrax_level: payload.fintrax_level,
      learning_goals: payload.learning_goals,
      consent_data: payload.consent_data
    });

    return { ok: true, participant };
  }
}
