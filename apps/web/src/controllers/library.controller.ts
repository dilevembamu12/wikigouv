import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Render,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AuthUser, PageContext, WebRole } from '../security/auth.types';
import { WebAuthGuard } from '../security/web-auth.guard';
import { LibraryMinioService } from '../services/library-minio.service';

type RequestWithAuth = Request & { authUser?: AuthUser };

@Controller('/admin/library')
@UseGuards(WebAuthGuard)
export class LibraryController {
  constructor(private readonly library: LibraryMinioService) {}

  private buildPage(req: RequestWithAuth): PageContext {
    return {
      title: 'Library - Wikigouv',
      activeNav: 'courses',
      currentPath: req.path,
      user: req.authUser ?? null,
      breadcrumbs: [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Library' }]
    };
  }

  private getWritableRoles(): WebRole[] {
    const raw =
      process.env.LIBRARY_WRITE_ROLES ??
      'AGENT,FORMATEUR,ADMIN,DIRECTION,AUDITEUR,SUPER_ADMIN';
    const valid: WebRole[] = ['AGENT', 'FORMATEUR', 'ADMIN', 'DIRECTION', 'AUDITEUR', 'SUPER_ADMIN'];
    return raw
      .split(',')
      .map((r) => r.trim().toUpperCase())
      .filter((r): r is WebRole => valid.includes(r as WebRole));
  }

  private assertWriteAccess(req: RequestWithAuth) {
    const roles = req.authUser?.roles ?? [];
    const writable = this.getWritableRoles();
    const allowed = roles.some((r) => writable.includes(r));
    if (!allowed) {
      throw new ForbiddenException('You are not allowed to modify the Library');
    }
  }

  @Get()
  @Render('pages/panel/library')
  async page(
    @Req() req: RequestWithAuth,
    @Query('picker') picker?: string,
    @Query('target') target?: string,
    @Query('folder') folder?: string
  ) {
    return {
      page: this.buildPage(req),
      picker: picker === '1',
      target: String(target ?? ''),
      folder: this.library.sanitizeFolder(folder)
    };
  }

  @Get('items')
  async items(
    @Query('folder') folder?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.library.list(folder, q, page, pageSize);
  }

  @Get('presign')
  async presign(@Query('key') key?: string) {
    return this.library.presign(key);
  }

  @Get('scorm/resolve')
  async resolveScorm(
    @Query('key') key?: string,
    @Query('index') index?: string
  ) {
    return this.library.resolveScormEntry(key, index);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Req() req: RequestWithAuth,
    @UploadedFile() file?: { originalname: string; mimetype: string; buffer: Buffer },
    @Body('folder') folder?: string
  ) {
    this.assertWriteAccess(req);
    if (!file) return { ok: false, message: 'file is required' };
    const mime = String(file.mimetype ?? '');
    const allowedMime =
      /^(image\/|video\/|audio\/|application\/pdf|application\/zip|application\/x-zip-compressed|application\/msword|application\/vnd\.)/i.test(
        mime
      );
    if (!allowedMime) return { ok: false, message: 'invalid file type' };
    if (!file.buffer || file.buffer.length === 0) {
      throw new HttpException('Upload failed: empty file buffer', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.library.upload(folder ?? '', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown upload error';
      throw new HttpException(`Upload failed: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('folder')
  async createFolder(
    @Req() req: RequestWithAuth,
    @Body() body: { folder?: string; name?: string }
  ) {
    this.assertWriteAccess(req);
    return this.library.createFolder(
      String(body.folder ?? ''),
      String(body.name ?? `folder_${Date.now()}`)
    );
  }

  @Post('rename')
  async rename(
    @Req() req: RequestWithAuth,
    @Body() body: { key?: string; name?: string }
  ) {
    this.assertWriteAccess(req);
    const key = String(body.key ?? '');
    const folder = key.split('/').slice(0, -1).join('/') || 'images';
    return this.library.renameOrMove(key, folder, String(body.name ?? ''));
  }

  @Post('move')
  async move(
    @Req() req: RequestWithAuth,
    @Body() body: { key?: string; folder?: string; name?: string }
  ) {
    this.assertWriteAccess(req);
    return this.library.renameOrMove(
      String(body.key ?? ''),
      String(body.folder ?? ''),
      String(body.name ?? '')
    );
  }

  @Post('delete')
  async delete(@Req() req: RequestWithAuth, @Body() body: { key?: string }) {
    this.assertWriteAccess(req);
    return this.library.deleteKey(body.key);
  }
}

@Controller('/admin')
@UseGuards(WebAuthGuard)
export class LibraryCompatController {
  constructor(private readonly library: LibraryMinioService) {}

  @Get('webinars/library/items')
  async legacyItems(
    @Query('folder') folder?: string,
    @Query('q') q?: string,
    @Query('limit') limitRaw?: string
  ) {
    const pageSize = String(limitRaw ?? '40');
    return this.library.list(folder, q, '1', pageSize);
  }
}
