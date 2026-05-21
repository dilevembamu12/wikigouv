import { Module } from '@nestjs/common';
import { AuditModule } from '@/audit/audit.module';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [AuditModule],
  controllers: [NotificationsController]
})
export class NotificationsModule {}

