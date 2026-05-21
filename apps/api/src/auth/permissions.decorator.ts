import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from './auth.constants';
import { Permission } from './permissions.enum';

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
