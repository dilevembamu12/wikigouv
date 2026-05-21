import { Module } from '@nestjs/common';
import { AuditModule } from '@/audit/audit.module';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [AuditModule],
  controllers: [DocumentsController]
})
export class DocumentsModule {}
