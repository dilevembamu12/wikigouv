import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSIONS_KEY } from './auth.constants';
import { Permission } from './permissions.enum';
import { AuthenticatedRequestUser } from './auth.types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedRequestUser }>();
    const user = req.user;
    if (!user) throw new ForbiddenException('User context is missing');

    if (!required.every((perm) => user.permissions.includes(perm))) {
      const missing = required.filter((perm) => !user.permissions.includes(perm));
      throw new ForbiddenException({
        message: 'Permission denied',
        requiredPermissions: required,
        missingPermissions: missing,
        userPermissions: user.permissions,
        userRoles: user.roles
      });
    }
    return true;
  }
}
