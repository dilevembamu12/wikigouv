import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { Permission } from './permissions.enum';
import { rolePermissions } from './rbac.map';
import { AppRole } from './roles.enum';

@Injectable()
export class JwtVerifierService {
  private readonly issuer: string;
  private readonly audience: string;
  private readonly apiClientId: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly config: ConfigService) {
    this.issuer = this.config.getOrThrow<string>('JWT_ISSUER');
    this.audience = this.config.getOrThrow<string>('JWT_AUDIENCE');
    this.apiClientId = this.config.get<string>('KEYCLOAK_API_CLIENT_ID') ?? this.audience;
    const jwksUri = this.config.getOrThrow<string>('JWKS_URI');
    this.jwks = createRemoteJWKSet(new URL(jwksUri));
  }

  async verify(token: string): Promise<{
    payload: JWTPayload;
    roles: AppRole[];
    permissions: Permission[];
  }> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience
      });

      const roles = this.extractRoles(payload);
      const permissions = this.computePermissions(roles);

      return { payload, roles, permissions };
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private extractRoles(payload: JWTPayload): AppRole[] {
    const realmRoles = (payload.realm_access as { roles?: string[] } | undefined)?.roles ?? [];
    const resourceAccess =
      (payload.resource_access as Record<string, { roles?: string[] }> | undefined) ?? {};
    const clientRolesFromApi = resourceAccess[this.apiClientId]?.roles ?? [];
    const clientRolesFromAudience =
      this.audience === this.apiClientId ? [] : resourceAccess[this.audience]?.roles ?? [];

    const merged = [...realmRoles, ...clientRolesFromApi, ...clientRolesFromAudience];
    const validRoles = Object.values(AppRole);
    return Array.from(new Set(merged)).filter((r): r is AppRole => validRoles.includes(r as AppRole));
  }

  private computePermissions(roles: AppRole[]): Permission[] {
    const set = new Set<Permission>();
    for (const role of roles) {
      for (const permission of rolePermissions[role] ?? []) {
        set.add(permission);
      }
    }
    return Array.from(set.values());
  }
}
