import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthenticatedRequestUser } from './auth.types';
import { JwtVerifierService } from './jwt-verifier.service';
import { AppRole } from './roles.enum';
import { Permission } from './permissions.enum';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly verifier: JwtVerifierService,
    private readonly config: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedRequestUser }>();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required');
    }

    const token = authHeader.slice(7);
    const fallbackEnabled = this.config.get<string>('AUTH_FALLBACK_ENABLED', 'false') === 'true';
    const fallbackToken = this.config.get<string>('AUTH_FALLBACK_TOKEN', '');

    if (fallbackEnabled && fallbackToken && token === fallbackToken) {
      req.user = this.buildFallbackUser();
      return true;
    }

    let payload: Record<string, unknown>;
    let roles: AppRole[];
    let permissions: Permission[];

    try {
      ({ payload, roles, permissions } = await this.verifier.verify(token));
    } catch (error) {
      if (fallbackEnabled && fallbackToken) {
        throw new ForbiddenException(
          'Keycloak token validation failed. Use the emergency fallback token if intended.'
        );
      }
      throw error;
    }
    const subject = this.pickNonEmptyString(payload, [
      'sub',
      'preferred_username',
      'email',
      'upn',
      'username',
      'client_id',
      'azp'
    ]);

    req.user = {
      sub: String(subject ?? ''),
      email: typeof payload.email === 'string' ? payload.email : undefined,
      givenName: typeof payload.given_name === 'string' ? payload.given_name : undefined,
      familyName: typeof payload.family_name === 'string' ? payload.family_name : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      picture:
        typeof payload.picture === 'string'
          ? payload.picture
          : typeof payload.avatar_url === 'string'
            ? payload.avatar_url
            : undefined,
      roles,
      permissions,
      rawToken: payload
    };

    if (!req.user.sub) {
      throw new UnauthorizedException('Token subject is missing (sub/preferred_username/email)');
    }
    return true;
  }

  private buildFallbackUser(): AuthenticatedRequestUser {
    return {
      sub: 'fallback-emergency',
      email: 'fallback@wikigouv.local',
      givenName: 'Emergency',
      familyName: 'Fallback',
      name: 'Emergency Fallback',
      roles: Object.values(AppRole),
      permissions: Object.values(Permission),
      rawToken: { mode: 'fallback', fullPermissions: true }
    };
  }

  private pickNonEmptyString(
    payload: Record<string, unknown>,
    keys: string[]
  ): string | undefined {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return undefined;
  }
}
