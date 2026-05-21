import { Controller, Get, Param, Post, Query, Render, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import type { AuthUser, PageContext } from '../security/auth.types';
import { fetchApiJson, postApiEmpty, postApiMultipart } from '../lib/api-client';
import { SensitiveAccessInterceptor } from '../security/sensitive-access.interceptor';
import { WebAuthGuard, WebRoles } from '../security/web-auth.guard';

type RequestWithAuth = Request & { authUser?: AuthUser };

@Controller()
@UseGuards(WebAuthGuard)
export class DocumentsController {
  @Get('/documents')
  @WebRoles('ADMIN', 'SUPER_ADMIN', 'FORMATEUR')
  @UseInterceptors(SensitiveAccessInterceptor)
  @Render('pages/panel/documents')
  async documents(@Req() req: RequestWithAuth, @Query('ok') ok?: string, @Query('error') error?: string) {
    const page: PageContext = {
      title: 'Documents reglementaires - Wikigouv',
      activeNav: 'documents',
      user: req.authUser ?? null,
      breadcrumbs: [{ label: 'Tableau de bord', href: '/dashboard' }, { label: 'Documents' }]
    };
    if (ok) page.alert = { type: 'success', message: `Succès: ${ok}` };
    if (error) page.alert = { type: 'danger', message: `Erreur: ${error}` };
    const docs = await fetchApiJson<unknown[]>(req, '/api/documents');
    return { page, documents: docs.data ?? [], documentsStatus: docs.status };
  }

  @Get('/documents/:id')
  @WebRoles('ADMIN', 'SUPER_ADMIN', 'FORMATEUR')
  @Render('pages/panel/document-detail')
  async documentDetail(@Req() req: RequestWithAuth, @Param('id') id: string) {
    const page: PageContext = {
      title: 'Document detail - Wikigouv',
      activeNav: 'documents',
      user: req.authUser ?? null,
      breadcrumbs: [
        { label: 'Tableau de bord', href: '/dashboard' },
        { label: 'Documents', href: '/documents' },
        { label: 'Detail' }
      ]
    };
    const docs = await fetchApiJson<unknown[]>(req, '/api/documents');
    const list = docs.data ?? [];
    const document = list.find((item) => String((item as { id?: string }).id) === id) ?? null;
    return { page, document, documentsStatus: docs.status };
  }

  @Post('/documents/upload')
  @WebRoles('ADMIN', 'SUPER_ADMIN', 'FORMATEUR')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@Req() req: RequestWithAuth, @Res() res: Response, @UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype: string }) {
    if (!file) return res.redirect('/documents?error=file_required');
    const result = await postApiMultipart(req, '/api/documents/upload', file);
    return res.redirect(`/documents${result.ok ? '?ok=uploaded' : `?error=upload_${result.status}`}`);
  }

  @Post('/documents/:id/process')
  @WebRoles('ADMIN', 'SUPER_ADMIN', 'FORMATEUR')
  async process(@Req() req: RequestWithAuth, @Res() res: Response, @Param('id') id: string) {
    const result = await postApiEmpty(req, `/api/documents/${id}/process`);
    return res.redirect(`/documents${result.ok ? '?ok=processed' : `?error=process_${result.status}`}`);
  }

  @Post('/documents/:id/validate')
  @WebRoles('ADMIN', 'SUPER_ADMIN', 'FORMATEUR')
  async validate(@Req() req: RequestWithAuth, @Res() res: Response, @Param('id') id: string) {
    const result = await postApiEmpty(req, `/api/documents/${id}/validate`);
    return res.redirect(`/documents${result.ok ? '?ok=validated' : `?error=validate_${result.status}`}`);
  }
}
