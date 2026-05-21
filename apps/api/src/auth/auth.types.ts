import { Permission } from './permissions.enum';
import { AppRole } from './roles.enum';

export interface AuthenticatedRequestUser {
  sub: string;
  email?: string;
  givenName?: string;
  familyName?: string;
  name?: string;
  picture?: string;
  roles: AppRole[];
  permissions: Permission[];
  rawToken: Record<string, unknown>;
}
