import { Module } from '@nestjs/common';
import { AuditModule } from '@/audit/audit.module';
import { TagsController } from './tags.controller';

@Module({
  imports: [AuditModule],
  controllers: [TagsController]
})
export class TagsModule {}

