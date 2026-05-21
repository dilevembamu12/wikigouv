import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from './auth.constants';
import { AppRole } from './roles.enum';

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
