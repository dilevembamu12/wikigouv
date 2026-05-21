import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedRequestUser } from './auth.types';
import { JwtVerifierService } from './jwt-verifier.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly verifier: JwtVerifierService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedRequestUser }>();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required');
    }

    const token = authHeader.slice(7);
    const { payload, roles, permissions } = await this.verifier.verify(token);
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
