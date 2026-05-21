import { Injectable } from '@nestjs/common';
import { SequelizeService } from '@/database/sequelize.service';
import { randomUUID } from 'crypto';

type RegisterParticipantInput = {
  full_name: string;
  email: string;
  phone: string;
  organization?: string;
  direction?: string;
  role: string;
  years_experience?: number | string;
  fintrax_level?: string;
  learning_goals: string;
  consent_data?: boolean;
};

@Injectable()
export class ParticipantsService {
  constructor(private readonly db: SequelizeService) {}

  async register(input: RegisterParticipantInput) {
    const Participant = this.db.models.Participant;
    const created = await Participant.create({
      id: `part_${randomUUID().slice(0, 12)}`,
      full_name: input.full_name,
      email: input.email,
      phone: input.phone,
      organization: input.organization || 'ARTF',
      direction: input.direction || null,
      role: input.role,
      years_experience:
        input.years_experience === undefined || input.years_experience === ''
          ? null
          : Number(input.years_experience),
      fintrax_level: input.fintrax_level || null,
      learning_goals: input.learning_goals,
      consent_data: Boolean(input.consent_data)
    });
    return created.toJSON();
  }
}
