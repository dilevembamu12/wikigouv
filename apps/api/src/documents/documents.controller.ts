import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { CurrentUser } from '@/auth/current-user.decorator';
import { AuthenticatedRequestUser } from '@/auth/auth.types';
import { RequirePermissions } from '@/auth/permissions.decorator';
import { Permission } from '@/auth/permissions.enum';
import { AuditService } from '@/audit/audit.service';
import { SequelizeService } from '@/database/sequelize.service';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { RolesGuard } from '@/auth/roles.guard';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class DocumentsController {
  constructor(
    private readonly db: SequelizeService,
    private readonly audit: AuditService
  ) {}

  @Get()
  @RequirePermissions(Permission.COURSE_READ)
  list() {
    return this.db.models.Document.findAll({ order: [['createdAt', 'DESC']] });
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @RequirePermissions(Permission.DOCUMENT_UPLOAD)
  async upload(
    @CurrentUser() user: AuthenticatedRequestUser,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number },
    @Req() req: Request
  ) {
    if (!file) throw new BadRequestException('File is required');
    const allowed = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]);
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException('Unsupported MIME type. Allowed: PDF, DOCX, TXT');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File too large. Max 10MB');
    }

    const created = await this.db.models.Document.create({
      id: randomUUID(),
      title: file.originalname,
      type: 'TRAINING_MATERIAL',
      status: 'UPLOADED'
    });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'DOCUMENT_UPLOAD',
      entityType: 'Document',
      entityId: String(created.get('id')),
      metadata: { originalName: file.originalname, mimeType: file.mimetype, size: file.size },
      ...this.audit.fromRequest(req)
    });

    return created;
  }

  @Post(':id/process')
  @RequirePermissions(Permission.DOCUMENT_UPLOAD)
  async process(@CurrentUser() user: AuthenticatedRequestUser, @Param('id') id: string, @Req() req: Request) {
    const doc = await this.db.models.Document.findByPk(id);
    if (!doc) throw new BadRequestException('Document not found');
    await doc.update({ status: 'PROCESSING' });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'DOCUMENT_PROCESS',
      entityType: 'Document',
      entityId: id,
      ...this.audit.fromRequest(req)
    });
    return { ok: true, status: 'PROCESSING' };
  }

  @Post(':id/validate')
  @RequirePermissions(Permission.DOCUMENT_VALIDATE)
  async validate(@CurrentUser() user: AuthenticatedRequestUser, @Param('id') id: string, @Req() req: Request) {
    const doc = await this.db.models.Document.findByPk(id);
    if (!doc) throw new BadRequestException('Document not found');
    await doc.update({ status: 'VALIDATED' });
    await this.audit.log({
      actorUserId: user.sub,
      action: 'DOCUMENT_VALIDATE',
      entityType: 'Document',
      entityId: id,
      ...this.audit.fromRequest(req)
    });
    return { ok: true, status: 'VALIDATED' };
  }
}
