import { Body, Controller, Get, Param, Post, Query, Redirect, Render, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { fetchApiJson, patchApiJson } from '../lib/api-client';
import { AuthUser, PageContext } from '../security/auth.types';
import { WebAuthGuard, WebRoles } from '../security/web-auth.guard';

type RequestWithAuth = Request & { authUser?: AuthUser };

type IamRole = { id?: string; name: string };
type IamUsersResponse = {
  items?: IamUser[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
};
type IamUser = {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  roles: string[];
};
type AuditList = {
  items?: Array<{
    createdAt?: string;
    actorUserId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }>;
};

@Controller()
@UseGuards(WebAuthGuard)
export class IamController {
  @Get('/admin/iam')
  @WebRoles('SUPER_ADMIN')
  @Render('pages/panel/iam')
  async iam(
    @Req() req: RequestWithAuth,
    @Query('ok') ok?: string,
    @Query('error') error?: string,
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('upage') upageRaw?: string,
    @Query('usize') usizeRaw?: string,
    @Query('apage') apageRaw?: string,
    @Query('asize') asizeRaw?: string
  ) {
    const upage = Math.max(1, Number(upageRaw ?? '1') || 1);
    const usize = Math.min(100, Math.max(1, Number(usizeRaw ?? '20') || 20));
    const apage = Math.max(1, Number(apageRaw ?? '1') || 1);
    const asize = Math.min(100, Math.max(1, Number(asizeRaw ?? '15') || 15));
    const page: PageContext = {
      title: 'IAM / Roles dynamiques - Wikigouv',
      activeNav: 'iam',
      user: req.authUser ?? null,
      breadcrumbs: [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'IAM / Roles' }
      ]
    };

    if (ok) page.alert = { type: 'success', message: `Succes: ${ok}` };
    if (error) page.alert = { type: 'danger', message: `Erreur: ${error}` };

    const [rolesRes, usersRes, auditsRes] = await Promise.all([
      fetchApiJson<IamRole[]>(req, '/api/iam/roles'),
      fetchApiJson<IamUsersResponse>(
        req,
        `/api/iam/users?page=${upage}&pageSize=${usize}${q ? `&search=${encodeURIComponent(q)}` : ''}`
      ),
      fetchApiJson<AuditList>(
        req,
        `/api/audit-logs?action=IAM_USER_ROLES_UPDATED&page=${apage}&pageSize=${asize}`
      )
    ]);

    const users = usersRes.data?.items ?? [];
    const filteredUsers = role ? users.filter((u) => (u.roles ?? []).includes(role)) : users;

    return {
      page,
      iamRoles: rolesRes.data ?? [],
      iamUsers: filteredUsers,
      iamAudits: auditsRes.data?.items ?? [],
      usersPage: usersRes.data?.page ?? upage,
      usersPageSize: usersRes.data?.pageSize ?? usize,
      usersTotalPages: usersRes.data?.totalPages ?? 1,
      auditsPage: apage,
      auditsPageSize: asize,
      rolesStatus: rolesRes.status,
      usersStatus: usersRes.status,
      search: q ?? '',
      selectedRole: role ?? ''
    };
  }

  @Post('/admin/iam/users/:userId/roles')
  @WebRoles('SUPER_ADMIN')
  @Redirect('/admin/iam')
  async updateUserRoles(
    @Req() req: RequestWithAuth,
    @Param('userId') userId: string,
    @Body() body: { roles?: string[] | string; q?: string; role?: string }
  ) {
    const rolesRaw = body.roles;
    const roles = Array.isArray(rolesRaw) ? rolesRaw : rolesRaw ? [rolesRaw] : [];

    const result = await patchApiJson<{ userId: string; roles: string[] }>(req, `/api/iam/users/${userId}/roles`, {
      roles
    });

    const q = body.q ? `&q=${encodeURIComponent(body.q)}` : '';
    const role = body.role ? `&role=${encodeURIComponent(body.role)}` : '';
    return {
      url: result.ok
        ? `/admin/iam?ok=roles_updated${q}${role}`
        : `/admin/iam?error=roles_update_${result.status}${q}${role}`
    };
  }
}
