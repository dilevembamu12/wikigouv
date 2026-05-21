import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Render,
  Req,
  Res,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthUser, PageContext } from '../security/auth.types';
import { fetchApiJson, postApiJson } from '../lib/api-client';
import { SensitiveAccessInterceptor } from '../security/sensitive-access.interceptor';
import { WebAuthGuard, WebRoles } from '../security/web-auth.guard';

type RequestWithAuth = Request & { authUser?: AuthUser };

@Controller()
@UseGuards(WebAuthGuard)
export class DashboardController {
  @Get('/dashboard')
  @UseInterceptors(SensitiveAccessInterceptor)
  @Render('pages/panel/dashboard')
  async dashboard(@Req() req: RequestWithAuth) {
    const page: PageContext = {
      title: 'Tableau de bord - Wikigouv',
      activeNav: 'dashboard',
      user: req.authUser ?? null,
      breadcrumbs: [{ label: 'Tableau de bord' }]
    };
    const dashboard = await fetchApiJson<{
      role?: string;
      kpis?: Record<string, number>;
    }>(req, '/api/analytics/dashboard');
    return { page, dashboard: dashboard.data, dashboardStatus: dashboard.status };
  }

  @Get('/quizzes')
  @Render('pages/panel/quizzes')
  async quizzes(@Req() req: RequestWithAuth, @Query('ok') ok?: string, @Query('error') error?: string) {
    const page: PageContext = {
      title: 'Quiz - Wikigouv',
      activeNav: 'quizzes',
      user: req.authUser ?? null,
      breadcrumbs: [{ label: 'Tableau de bord', href: '/dashboard' }, { label: 'Quiz' }]
    };
    if (ok) page.alert = { type: 'success', message: `Succès: ${ok}` };
    if (error) page.alert = { type: 'danger', message: `Erreur: ${error}` };
    const quizzes = await fetchApiJson<{ items?: unknown[] }>(req, '/api/backoffice/quizzes');
    return { page, quizzes: quizzes.data?.items ?? [], quizzesStatus: quizzes.status };
  }

  @Post('/quizzes/create')
  async createQuiz(
    @Req() req: RequestWithAuth,
    @Res() res: Response,
    @Body('title') title?: string
  ) {
    const result = await postApiJson(req, '/api/backoffice/quizzes', {
      title: (title ?? '').trim() || 'Nouveau quiz',
      passingScore: 70,
      status: 'DRAFT'
    });
    return res.redirect(`/quizzes${result.ok ? '?ok=quiz_created' : `?error=quiz_create_${result.status}`}`);
  }

  @Get('/certificates')
  @Render('pages/panel/certificates')
  async certificates(@Req() req: RequestWithAuth, @Query('ok') ok?: string, @Query('error') error?: string) {
    const page: PageContext = {
      title: 'Certificats - Wikigouv',
      activeNav: 'certificates',
      user: req.authUser ?? null
    };
    if (ok) page.alert = { type: 'success', message: `Succès: ${ok}` };
    if (error) page.alert = { type: 'danger', message: `Erreur: ${error}` };
    const certificates = await fetchApiJson<unknown[]>(req, '/api/certificates/me');
    return { page, certificates: certificates.data ?? [], certificatesStatus: certificates.status };
  }

  @Get('/forum')
  @Render('pages/panel/forum')
  async forum(@Req() req: RequestWithAuth, @Query('ok') ok?: string, @Query('error') error?: string) {
    const page: PageContext = {
      title: 'Forum - Wikigouv',
      activeNav: 'forum',
      user: req.authUser ?? null
    };
    if (ok) page.alert = { type: 'success', message: `Succès: ${ok}` };
    if (error) page.alert = { type: 'danger', message: `Erreur: ${error}` };
    const topics = await fetchApiJson<{ items?: unknown[] }>(req, '/api/forums/topics');
    return { page, topics: topics.data?.items ?? [], topicsStatus: topics.status };
  }

  @Post('/forum/create')
  async createForumTopic(
    @Req() req: RequestWithAuth,
    @Res() res: Response,
    @Body('title') title?: string,
    @Body('content') content?: string
  ) {
    const result = await postApiJson(req, '/api/forums/topics', {
      title: (title ?? '').trim() || 'Nouveau sujet',
      content: (content ?? '').trim() || 'Aucun contenu'
    });
    return res.redirect(`/forum${result.ok ? '?ok=topic_created' : `?error=topic_create_${result.status}`}`);
  }

  @Get('/support')
  @Render('pages/panel/support')
  async support(@Req() req: RequestWithAuth, @Query('ok') ok?: string, @Query('error') error?: string) {
    const page: PageContext = {
      title: 'Support - Wikigouv',
      activeNav: 'support',
      user: req.authUser ?? null
    };
    if (ok) page.alert = { type: 'success', message: `Succès: ${ok}` };
    if (error) page.alert = { type: 'danger', message: `Erreur: ${error}` };
    const supports = await fetchApiJson<{ items?: unknown[] }>(req, '/api/supports');
    return { page, supports: supports.data?.items ?? [], supportsStatus: supports.status };
  }

  @Post('/support/create')
  async createSupport(
    @Req() req: RequestWithAuth,
    @Res() res: Response,
    @Body('subject') subject?: string,
    @Body('message') message?: string,
    @Body('priority') priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  ) {
    const result = await postApiJson(req, '/api/supports', {
      subject: (subject ?? '').trim() || 'Support request',
      message: (message ?? '').trim() || 'No message',
      priority: priority ?? 'MEDIUM'
    });
    return res.redirect(`/support${result.ok ? '?ok=ticket_created' : `?error=ticket_create_${result.status}`}`);
  }

  @Get('/audit-logs')
  @WebRoles('ADMIN', 'SUPER_ADMIN', 'AUDITEUR')
  @UseInterceptors(SensitiveAccessInterceptor)
  @Render('pages/panel/audit-logs')
  auditLogs(@Req() req: RequestWithAuth) {
    const page: PageContext = {
      title: 'Audit Logs - Wikigouv',
      activeNav: 'audit',
      user: req.authUser ?? null
    };
    return { page };
  }
}
