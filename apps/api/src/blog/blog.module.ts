import { Module } from '@nestjs/common';
import { AuditModule } from '@/audit/audit.module';
import { BlogController } from './blog.controller';

@Module({
  imports: [AuditModule],
  controllers: [BlogController]
})
export class BlogModule {}

