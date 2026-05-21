import { Module } from '@nestjs/common';
import { AuditModule } from '@/audit/audit.module';
import { SupportsController } from './supports.controller';

@Module({
  imports: [AuditModule],
  controllers: [SupportsController]
})
export class SupportsModule {}

