import { Body, Controller, Get, Param, Post, Redirect, Render, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { fetchApiJson, patchApiJson, postApiJson } from '../lib/api-client';
import { AuthUser, PageContext } from '../security/auth.types';
import { WebAuthGuard } from '../security/web-auth.guard';

type RequestWithAuth = Request & { authUser?: AuthUser };
type UserRow = Record<string, unknown>;
type AdminListResponse = {
  items?: UserRow[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
};

@Controller('/admin')
@UseGuards(WebAuthGuard)
export class UsersController {
  private sendCsv(res: Response, filename: string, headers: string[], rows: Array<Array<unknown>>) {
    const escaped = (value: unknown) => {
      const text = value === null || value === undefined ? '' : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = [headers.map(escaped).join(','), ...rows.map((row) => row.map(escaped).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  }

  private buildPage(req: RequestWithAuth, title: string): PageContext {
    const page: PageContext = {
      title: `${title} - Wikigouv`,
      activeNav: 'users',
      currentPath: req.path,
      user: req.authUser ?? null,
      breadcrumbs: [{ label: 'Dashboard', href: '/dashboard' }, { label: title }]
    };
    const ok = req.query.ok as string | undefined;
    const error = req.query.error as string | undefined;
    if (ok) page.alert = { type: 'success', message: `Succès: ${ok}` };
    if (error) page.alert = { type: 'danger', message: `Erreur: ${error}` };
    return page;
  }

  private async renderUsersList(
    req: RequestWithAuth,
    title: string,
    endpoint: string,
    segment: string
  ) {
    const page = this.buildPage(req, title);
    const pageNumber = Math.max(1, Number((req.query.page as string | undefined) ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number((req.query.pageSize as string | undefined) ?? '10') || 10));
    const q = String((req.query.q as string | undefined) ?? '');
    const status = String((req.query.status as string | undefined) ?? '');
    const query = [`page=${pageNumber}`, `pageSize=${pageSize}`, q ? `q=${encodeURIComponent(q)}` : '', status ? `status=${encodeURIComponent(status)}` : '']
      .filter(Boolean)
      .join('&');
    const result = await fetchApiJson<AdminListResponse>(req, `${endpoint}?${query}`);
    return {
      page,
      listStatus: result.status,
      items: result.data?.items ?? [],
      pageNumber: result.data?.page ?? pageNumber,
      pageSize: result.data?.pageSize ?? pageSize,
      total: result.data?.total ?? 0,
      totalPages: result.data?.totalPages ?? 1,
      q,
      status,
      segment
    };
  }

  @Get('users/create')
  @Render('pages/panel/users-create')
  createForm(@Req() req: RequestWithAuth) {
    const page = this.buildPage(req, 'New User');
    return { page, userItem: null, mode: 'create' };
  }

  @Post('users/store')
  @Redirect('/admin/all-users')
  async store(
    @Req() req: RequestWithAuth,
    @Body()
    body: {
      fullName?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      jobTitle?: string;
      department?: string;
      phone?: string;
      status?: string;
      keycloakUserId?: string;
    }
  ) {
    const result = await postApiJson(req, '/api/admin/users', body);
    return { url: result.ok ? '/admin/all-users?ok=created' : `/admin/users/create?error=create_${result.status}` };
  }

  @Get('users/:id/edit')
  @Render('pages/panel/users-create')
  async editForm(@Req() req: RequestWithAuth, @Param('id') id: string) {
    const page = this.buildPage(req, 'Edit User');
    const result = await fetchApiJson<UserRow>(req, `/api/admin/users/${encodeURIComponent(id)}`);
    return { page, userItem: result.ok ? result.data : null, mode: 'edit' };
  }

  @Post('users/:id/update')
  @Redirect('/admin/all-users')
  async update(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Body()
    body: {
      fullName?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      jobTitle?: string;
      department?: string;
      phone?: string;
      status?: string;
    }
  ) {
    const result = await patchApiJson(req, `/api/admin/users/${encodeURIComponent(id)}`, body);
    return { url: result.ok ? '/admin/all-users?ok=updated' : `/admin/users/${encodeURIComponent(id)}/edit?error=update_${result.status}` };
  }

  @Post('users/:id/delete')
  @Redirect('/admin/all-users')
  async delete(@Req() req: RequestWithAuth, @Param('id') id: string) {
    const result = await postApiJson(req, `/api/admin/users/${encodeURIComponent(id)}/delete`, {});
    return { url: result.ok ? '/admin/all-users?ok=deleted' : '/admin/all-users?error=delete_failed' };
  }

  @Get('all-users')
  @Render('pages/panel/users-list')
  async allUsers(@Req() req: RequestWithAuth) {
    return this.renderUsersList(req, 'Users', '/api/admin/users/list', 'all-users');
  }

  @Get('staffs')
  @Render('pages/panel/users-list')
  async staffs(@Req() req: RequestWithAuth) {
    return this.renderUsersList(req, 'Staff', '/api/admin/users/staffs', 'staffs');
  }

  @Get('students')
  @Render('pages/panel/users-list')
  async students(@Req() req: RequestWithAuth) {
    return this.renderUsersList(req, 'Students', '/api/admin/users/students', 'students');
  }

  @Get('instructors')
  @Render('pages/panel/users-list')
  async instructors(@Req() req: RequestWithAuth) {
    return this.renderUsersList(req, 'Instructors', '/api/admin/users/instructors', 'instructors');
  }

  @Get('organizations')
  @Render('pages/panel/users-list')
  async organizations(@Req() req: RequestWithAuth) {
    return this.renderUsersList(req, 'Organizations', '/api/admin/users/organizations', 'organizations');
  }

  @Get('users/not-access-to-content')
  @Render('pages/panel/users-list')
  async restricted(@Req() req: RequestWithAuth) {
    return this.renderUsersList(req, 'Access Restricted', '/api/admin/users/restricted', 'restricted');
  }

  @Get('users/login-history')
  @Render('pages/panel/users-list')
  async loginHistory(@Req() req: RequestWithAuth) {
    return this.renderUsersList(req, 'Logins History', '/api/admin/users/login-history', 'login-history');
  }

  @Get('users/become-instructors/instructors')
  @Render('pages/panel/users-list')
  async instructorRequests(@Req() req: RequestWithAuth) {
    return this.renderUsersList(req, 'Instructor Requests', '/api/admin/users/become-instructors/instructors', 'instructor-requests');
  }

  @Get('users/become-instructors/organizations')
  @Render('pages/panel/users-list')
  async instructorOrganizationRequests(@Req() req: RequestWithAuth) {
    return this.renderUsersList(req, 'Organization Requests', '/api/admin/users/become-instructors/organizations', 'organizations');
  }

  @Get('users/delete-account-requests')
  @Render('pages/panel/users-list')
  async deleteAccountRequests(@Req() req: RequestWithAuth) {
    return this.renderUsersList(req, 'Account Deletion Requests', '/api/admin/users/delete-account-requests', 'restricted');
  }

  @Get('users/ip-restriction')
  @Render('pages/panel/users-list')
  async ipRestriction(@Req() req: RequestWithAuth) {
    return this.renderUsersList(req, 'IP Restrictions', '/api/admin/users/ip-restrictions', 'login-history');
  }

  @Get('users/become-instructors/settings')
  @Render('pages/panel/users-instructor-settings')
  async instructorSettings(@Req() req: RequestWithAuth) {
    const page = this.buildPage(req, 'Instructor Request Settings');
    const result = await fetchApiJson<{
      instructor_requests_enabled?: string;
      organization_requests_enabled?: string;
      instructor_auto_approve?: string;
    }>(req, '/api/admin/users/become-instructors/settings');
    return { page, settings: result.data ?? {} };
  }

  @Post('users/become-instructors/settings')
  @Redirect('/admin/users/become-instructors/settings')
  async updateInstructorSettings(
    @Req() req: RequestWithAuth,
    @Body()
    body: {
      instructor_requests_enabled?: string;
      organization_requests_enabled?: string;
      instructor_auto_approve?: string;
    }
  ) {
    const payload = {
      instructor_requests_enabled: body.instructor_requests_enabled === 'on',
      organization_requests_enabled: body.organization_requests_enabled === 'on',
      instructor_auto_approve: body.instructor_auto_approve === 'on'
    };
    const result = await patchApiJson(req, '/api/admin/users/become-instructors/settings', payload);
    return { url: result.ok ? '/admin/users/become-instructors/settings?ok=updated' : '/admin/users/become-instructors/settings?error=update_failed' };
  }

  @Get('roles')
  @Render('pages/panel/users-meta-list')
  async rolesList(@Req() req: RequestWithAuth) {
    const page = this.buildPage(req, 'User Roles');
    const result = await fetchApiJson<{ items?: UserRow[] }>(req, '/api/admin/users/roles/list');
    return { page, items: result.data?.items ?? [], listStatus: result.status, type: 'roles', featureTitle: 'User Roles' };
  }

  @Get('roles/create')
  @Render('pages/panel/users-meta-create')
  roleCreateForm(@Req() req: RequestWithAuth) {
    const page = this.buildPage(req, 'New User Role');
    return { page, type: 'roles', item: null, featureTitle: 'New User Role' };
  }

  @Get('roles/:id/edit')
  @Render('pages/panel/users-meta-create')
  async roleEditForm(@Req() req: RequestWithAuth, @Param('id') id: string) {
    const page = this.buildPage(req, 'Edit User Role');
    const result = await fetchApiJson<{ items?: UserRow[] }>(req, '/api/admin/users/roles/list');
    const item = (result.data?.items ?? []).find((it) => String(it.id) === id) ?? null;
    return { page, type: 'roles', item, featureTitle: 'Edit User Role' };
  }

  @Post('roles/store')
  @Redirect('/admin/roles')
  async roleStore(@Req() req: RequestWithAuth, @Body() body: Record<string, unknown>) {
    const result = await postApiJson(req, '/api/admin/users/roles', body);
    return { url: result.ok ? '/admin/roles?ok=created' : '/admin/roles/create?error=create_failed' };
  }

  @Post('roles/:id/update')
  @Redirect('/admin/roles')
  async roleUpdate(@Req() req: RequestWithAuth, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const result = await patchApiJson(req, `/api/admin/users/roles/${encodeURIComponent(id)}`, body);
    return { url: result.ok ? '/admin/roles?ok=updated' : `/admin/roles/${encodeURIComponent(id)}/edit?error=update_failed` };
  }

  @Post('roles/:id/delete')
  @Redirect('/admin/roles')
  async roleDelete(@Req() req: RequestWithAuth, @Param('id') id: string) {
    const result = await postApiJson(req, `/api/admin/users/roles/${encodeURIComponent(id)}/delete`, {});
    return { url: result.ok ? '/admin/roles?ok=deleted' : '/admin/roles?error=delete_failed' };
  }

  @Get('users/groups')
  @Render('pages/panel/users-meta-list')
  async groupsList(@Req() req: RequestWithAuth) {
    const page = this.buildPage(req, 'Groups');
    const result = await fetchApiJson<{ items?: UserRow[] }>(req, '/api/admin/users/groups/list');
    return { page, items: result.data?.items ?? [], listStatus: result.status, type: 'groups', featureTitle: 'Groups' };
  }

  @Get('users/groups/create')
  @Render('pages/panel/users-meta-create')
  groupCreateForm(@Req() req: RequestWithAuth) {
    const page = this.buildPage(req, 'New Group');
    return { page, type: 'groups', item: null, featureTitle: 'New Group' };
  }

  @Get('users/groups/:id/edit')
  @Render('pages/panel/users-meta-create')
  async groupEditForm(@Req() req: RequestWithAuth, @Param('id') id: string) {
    const page = this.buildPage(req, 'Edit Group');
    const result = await fetchApiJson<{ items?: UserRow[] }>(req, '/api/admin/users/groups/list');
    const item = (result.data?.items ?? []).find((it) => String(it.id) === id) ?? null;
    return { page, type: 'groups', item, featureTitle: 'Edit Group' };
  }

  @Post('users/groups/store')
  @Redirect('/admin/users/groups')
  async groupStore(@Req() req: RequestWithAuth, @Body() body: Record<string, unknown>) {
    const result = await postApiJson(req, '/api/admin/users/groups', body);
    return { url: result.ok ? '/admin/users/groups?ok=created' : '/admin/users/groups/create?error=create_failed' };
  }

  @Post('users/groups/:id/update')
  @Redirect('/admin/users/groups')
  async groupUpdate(@Req() req: RequestWithAuth, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const result = await patchApiJson(req, `/api/admin/users/groups/${encodeURIComponent(id)}`, body);
    return { url: result.ok ? '/admin/users/groups?ok=updated' : `/admin/users/groups/${encodeURIComponent(id)}/edit?error=update_failed` };
  }

  @Post('users/groups/:id/delete')
  @Redirect('/admin/users/groups')
  async groupDelete(@Req() req: RequestWithAuth, @Param('id') id: string) {
    const result = await postApiJson(req, `/api/admin/users/groups/${encodeURIComponent(id)}/delete`, {});
    return { url: result.ok ? '/admin/users/groups?ok=deleted' : '/admin/users/groups?error=delete_failed' };
  }

  @Get('users/badges')
  @Render('pages/panel/users-meta-list')
  async badgesList(@Req() req: RequestWithAuth) {
    const page = this.buildPage(req, 'Badges');
    const result = await fetchApiJson<{ items?: UserRow[] }>(req, '/api/admin/users/badges/list');
    return { page, items: result.data?.items ?? [], listStatus: result.status, type: 'badges', featureTitle: 'Badges' };
  }

  @Get('users/badges/create')
  @Render('pages/panel/users-meta-create')
  badgeCreateForm(@Req() req: RequestWithAuth) {
    const page = this.buildPage(req, 'New Badge');
    return { page, type: 'badges', item: null, featureTitle: 'New Badge' };
  }

  @Get('users/badges/:id/edit')
  @Render('pages/panel/users-meta-create')
  async badgeEditForm(@Req() req: RequestWithAuth, @Param('id') id: string) {
    const page = this.buildPage(req, 'Edit Badge');
    const result = await fetchApiJson<{ items?: UserRow[] }>(req, '/api/admin/users/badges/list');
    const item = (result.data?.items ?? []).find((it) => String(it.id) === id) ?? null;
    return { page, type: 'badges', item, featureTitle: 'Edit Badge' };
  }

  @Post('users/badges/store')
  @Redirect('/admin/users/badges')
  async badgeStore(@Req() req: RequestWithAuth, @Body() body: Record<string, unknown>) {
    const result = await postApiJson(req, '/api/admin/users/badges', body);
    return { url: result.ok ? '/admin/users/badges?ok=created' : '/admin/users/badges/create?error=create_failed' };
  }

  @Post('users/badges/:id/update')
  @Redirect('/admin/users/badges')
  async badgeUpdate(@Req() req: RequestWithAuth, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const result = await patchApiJson(req, `/api/admin/users/badges/${encodeURIComponent(id)}`, body);
    return { url: result.ok ? '/admin/users/badges?ok=updated' : `/admin/users/badges/${encodeURIComponent(id)}/edit?error=update_failed` };
  }

  @Post('users/badges/:id/delete')
  @Redirect('/admin/users/badges')
  async badgeDelete(@Req() req: RequestWithAuth, @Param('id') id: string) {
    const result = await postApiJson(req, `/api/admin/users/badges/${encodeURIComponent(id)}/delete`, {});
    return { url: result.ok ? '/admin/users/badges?ok=deleted' : '/admin/users/badges?error=delete_failed' };
  }

  @Get('roles/export.csv')
  async rolesExport(@Req() req: RequestWithAuth, @Res() res: Response) {
    const result = await fetchApiJson<{ items?: UserRow[] }>(req, '/api/admin/users/roles/list');
    const items = result.data?.items ?? [];
    this.sendCsv(
      res,
      'user-roles.csv',
      ['id', 'title', 'description', 'status', 'createdAt'],
      items.map((it) => [it.id, it.title, it.description, it.status, it.createdAt])
    );
  }

  @Get('users/groups/export.csv')
  async groupsExport(@Req() req: RequestWithAuth, @Res() res: Response) {
    const result = await fetchApiJson<{ items?: UserRow[] }>(req, '/api/admin/users/groups/list');
    const items = result.data?.items ?? [];
    this.sendCsv(
      res,
      'user-groups.csv',
      ['id', 'title', 'description', 'usersCount', 'status', 'createdAt'],
      items.map((it) => [it.id, it.title, it.description, it.usersCount, it.status, it.createdAt])
    );
  }

  @Get('users/badges/export.csv')
  async badgesExport(@Req() req: RequestWithAuth, @Res() res: Response) {
    const result = await fetchApiJson<{ items?: UserRow[] }>(req, '/api/admin/users/badges/list');
    const items = result.data?.items ?? [];
    this.sendCsv(
      res,
      'user-badges.csv',
      ['id', 'title', 'icon', 'description', 'assignedCount', 'status', 'createdAt'],
      items.map((it) => [it.id, it.title, it.icon, it.description, it.assignedCount, it.status, it.createdAt])
    );
  }

  @Get('organizations/export.csv')
  async organizationsExport(@Req() req: RequestWithAuth, @Res() res: Response) {
    const q = 'page=1&pageSize=1000';
    const result = await fetchApiJson<AdminListResponse>(req, `/api/admin/users/organizations?${q}`);
    const items = result.data?.items ?? [];
    this.sendCsv(
      res,
      'organizations.csv',
      ['id', 'fullName', 'email', 'department', 'jobTitle', 'status', 'createdAt'],
      items.map((it) => [it.id, it.fullName, it.email, it.department, it.jobTitle, it.status, it.createdAt])
    );
  }
}
