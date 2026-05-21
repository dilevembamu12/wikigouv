import { Module } from '@nestjs/common';
import { AuditModule } from '@/audit/audit.module';
import { NewslettersController } from './newsletters.controller';

@Module({
  imports: [AuditModule],
  controllers: [NewslettersController]
})
export class NewslettersModule {}
