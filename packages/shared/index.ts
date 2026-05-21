export enum SharedRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FORMATEUR = 'FORMATEUR',
  AGENT = 'AGENT',
  DIRECTION = 'DIRECTION',
  AUDITEUR = 'AUDITEUR'
}

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
