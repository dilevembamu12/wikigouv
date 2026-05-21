import { Module } from '@nestjs/common';
import { AuditModule } from '@/audit/audit.module';
import { PagesController } from './pages.controller';

@Module({
  imports: [AuditModule],
  controllers: [PagesController]
})
export class PagesModule {}
