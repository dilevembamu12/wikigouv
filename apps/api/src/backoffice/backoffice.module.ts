import { Module } from '@nestjs/common';
import { AuditModule } from '@/audit/audit.module';
import { BackofficeController } from './backoffice.controller';

@Module({
  imports: [AuditModule],
  controllers: [BackofficeController]
})
export class BackofficeModule {}
