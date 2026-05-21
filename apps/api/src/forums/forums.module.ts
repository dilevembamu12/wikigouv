import { Module } from '@nestjs/common';
import { AuditModule } from '@/audit/audit.module';
import { ForumsController } from './forums.controller';

@Module({
  imports: [AuditModule],
  controllers: [ForumsController]
})
export class ForumsModule {}

