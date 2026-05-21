import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from './auth.constants';
import { AuthenticatedRequestUser } from './auth.types';
import { AppRole } from './roles.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedRequestUser }>();
    const user = req.user;
    if (!user) throw new ForbiddenException('User context is missing');

    if (!requiredRoles.some((role) => user.roles.includes(role))) {
      throw new ForbiddenException('Role not allowed');
    }
    return true;
  }
}
