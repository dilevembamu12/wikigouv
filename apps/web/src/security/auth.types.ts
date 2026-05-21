export type WebRole = 'AGENT' | 'FORMATEUR' | 'ADMIN' | 'DIRECTION' | 'AUDITEUR' | 'SUPER_ADMIN';

export interface AuthUser {
  sub?: string;
  email?: string;
  name?: string;
  preferredUsername?: string;
  picture?: string;
  avatarUrl?: string;
  roles: WebRole[];
}

export interface PageContext {
  title: string;
  activeNav?: string;
  currentPath?: string;
  user?: AuthUser | null;
  alert?: {
    type: 'info' | 'success' | 'warning' | 'danger';
    message: string;
  } | null;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}
