import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Model } from 'sequelize';
import { AuthenticatedRequestUser } from '@/auth/auth.types';
import { SequelizeService } from '@/database/sequelize.service';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(private readonly db: SequelizeService) {}

  private value<T>(model: Model, key: string): T {
    return model.get(key) as T;
  }

  async syncProfile(user: AuthenticatedRequestUser) {
    const existing = await this.db.models.UserProfile.findOne({
      where: { keycloakUserId: user.sub }
    });

    const fullName = user.name ?? `${user.givenName ?? ''} ${user.familyName ?? ''}`.trim();
    if (existing) {
      await existing.update({
        email: user.email ?? this.value<string>(existing, 'email'),
        firstName: user.givenName ?? this.value<string>(existing, 'firstName'),
        lastName: user.familyName ?? this.value<string>(existing, 'lastName'),
        fullName: fullName || this.value<string>(existing, 'fullName'),
        avatarUrl: user.picture ?? this.value<string | null>(existing, 'avatarUrl'),
        lastLoginAt: new Date()
      });
      return existing;
    }

    return this.db.models.UserProfile.create({
      id: randomUUID(),
      keycloakUserId: user.sub,
      email: user.email ?? `${user.sub}@unknown.local`,
      firstName: user.givenName ?? '',
      lastName: user.familyName ?? '',
      fullName,
      avatarUrl: user.picture ?? null,
      status: 'ACTIVE',
      firstLoginAt: new Date(),
      lastLoginAt: new Date()
    });
  }

  async getMe(user: AuthenticatedRequestUser) {
    const profile = await this.syncProfile(user);
    return {
      profile,
      auth: {
        sub: user.sub,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions
      }
    };
  }

  async patchMe(user: AuthenticatedRequestUser, dto: UpdateMeDto) {
    const profile = await this.syncProfile(user);
    await profile.update({
      jobTitle: dto.jobTitle ?? this.value<string | null>(profile, 'jobTitle'),
      department: dto.department ?? this.value<string | null>(profile, 'department'),
      phone: dto.phone ?? this.value<string | null>(profile, 'phone')
    });
    return profile;
  }
}
