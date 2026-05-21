import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { AuthUser, WebRole } from './auth.types';

type RequestWithAuth = Request & { authUser?: AuthUser };

export const WEB_ROLES_KEY = 'web-roles';
export const WebRoles = (...roles: WebRole[]) => SetMetadata(WEB_ROLES_KEY, roles);

@Injectable()
export class WebAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithAuth>();
    const res = context.switchToHttp().getResponse<Response>();
    const user = req.authUser;

    if (!user) {
      const requestedPath = String(req.originalUrl || req.url || '/dashboard').trim() || '/dashboard';
      const safeRequestedPath =
        requestedPath.startsWith('/') &&
        !requestedPath.startsWith('//') &&
        !requestedPath.startsWith('/login') &&
        !requestedPath.startsWith('/auth/')
          ? requestedPath
          : '/dashboard';
      res.cookie('wg_return_to', safeRequestedPath, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/'
      });
      res.redirect(`/login?returnTo=${encodeURIComponent(safeRequestedPath)}`);
      return false;
    }

    const roles = this.reflector.getAllAndOverride<WebRole[]>(WEB_ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (roles && roles.length > 0) {
      const hasRole = user.roles.includes('SUPER_ADMIN') || user.roles.some((role) => roles.includes(role));
      if (!hasRole) {
        res.redirect('/unauthorized');
        return false;
      }
    }

    return true;
  }
}
