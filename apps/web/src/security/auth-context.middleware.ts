import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AuthUser, WebRole } from './auth.types';

type RequestWithAuth = Request & { authUser?: AuthUser };

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad === 0 ? normalized : `${normalized}${'='.repeat(4 - pad)}`;
  return Buffer.from(padded, 'base64').toString('utf8');
}

function parseCookie(header?: string): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const value = decodeURIComponent(part.slice(idx + 1).trim());
    acc[key] = value;
    return acc;
  }, {});
}

function extractToken(req: Request): string | null {
  const auth = req.header('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }

  const cookies = parseCookie(req.header('cookie'));
  return cookies.kc_access_token ?? cookies.wg_access_token ?? null;
}

function parseRoles(payload: Record<string, unknown>): WebRole[] {
  const roles = new Set<WebRole>();
  const normalizeRole = (role: string): WebRole | null => {
    const normalized = role.trim().toUpperCase().replace(/[-\s]/g, '_');
    const aliases: Record<string, WebRole> = {
      SUPERADMIN: 'SUPER_ADMIN',
      SUPER_ADMIN: 'SUPER_ADMIN',
      SUPERUSER: 'SUPER_ADMIN',
      ADMIN: 'ADMIN',
      FORMATEUR: 'FORMATEUR',
      AGENT: 'AGENT',
      DIRECTION: 'DIRECTION',
      AUDITEUR: 'AUDITEUR'
    };
    return aliases[normalized] ?? null;
  };

  const resourceAccess = payload.resource_access as
    | Record<string, { roles?: string[] }>
    | undefined;

  // Aggregate roles from all Keycloak clients to avoid missing SUPER_ADMIN
  // when it is attached to a client other than "wikigouv-api".
  for (const client of Object.values(resourceAccess ?? {})) {
    for (const role of client?.roles ?? []) {
      const mapped = normalizeRole(role);
      if (mapped) roles.add(mapped);
    }
  }

  const realmAccess = payload.realm_access as { roles?: string[] } | undefined;
  for (const role of realmAccess?.roles ?? []) {
    const mapped = normalizeRole(role);
    if (mapped) roles.add(mapped);
  }
  return Array.from(roles);
}

function parseJwt(token: string): AuthUser | null {
  const chunks = token.split('.');
  if (chunks.length < 2) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(chunks[1])) as Record<string, unknown>;
    const exp = typeof payload.exp === 'number' ? payload.exp : null;
    if (exp && Date.now() >= exp * 1000) {
      return null;
    }
    return {
      sub: typeof payload.sub === 'string' ? payload.sub : undefined,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      preferredUsername:
        typeof payload.preferred_username === 'string' ? payload.preferred_username : undefined,
      picture:
        typeof payload.picture === 'string'
          ? payload.picture
          : typeof payload.avatar_url === 'string'
            ? payload.avatar_url
            : undefined,
      avatarUrl:
        typeof payload.avatarUrl === 'string'
          ? payload.avatarUrl
          : typeof payload.avatar_url === 'string'
            ? payload.avatar_url
            : typeof payload.picture === 'string'
              ? payload.picture
              : undefined,
      roles: parseRoles(payload)
    };
  } catch {
    return null;
  }
}

function parseFallbackUser(token: string): AuthUser | null {
  const fallbackEnabled = String(process.env.AUTH_FALLBACK_ENABLED ?? 'false').toLowerCase() === 'true';
  const fallbackToken = String(process.env.AUTH_FALLBACK_TOKEN ?? '').trim();
  if (!fallbackEnabled || !fallbackToken || token !== fallbackToken) {
    return null;
  }

  return {
    sub: 'fallback-emergency',
    email: 'fallback@wikigouv.local',
    name: 'Emergency Fallback',
    preferredUsername: 'fallback-emergency',
    roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR', 'AGENT', 'DIRECTION', 'AUDITEUR'] as WebRole[]
  };
}

@Injectable()
export class AuthContextMiddleware implements NestMiddleware {
  use(req: RequestWithAuth, _res: Response, next: NextFunction): void {
    const token = extractToken(req);
    if (token) {
      req.authUser = parseJwt(token) ?? parseFallbackUser(token) ?? undefined;
    } else {
      req.authUser = undefined;
    }
    next();
  }
}
