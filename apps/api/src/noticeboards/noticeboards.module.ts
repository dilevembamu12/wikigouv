import { Module } from '@nestjs/common';
import { AuditModule } from '@/audit/audit.module';
import { NoticeboardsController } from './noticeboards.controller';

@Module({
  imports: [AuditModule],
  controllers: [NoticeboardsController]
})
export class NoticeboardsModule {}
