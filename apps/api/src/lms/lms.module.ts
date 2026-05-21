import { Module } from '@nestjs/common';
import { AuditModule } from '@/audit/audit.module';
import { UsersModule } from '@/users/users.module';
import { LmsController } from './lms.controller';
import { LmsCatalogController } from './lms.catalog.controller';
import { LmsPublicController } from './lms.public.controller';
import { LmsService } from './lms.service';

@Module({
  imports: [UsersModule, AuditModule],
  controllers: [LmsController, LmsPublicController, LmsCatalogController],
  providers: [LmsService]
})
export class LmsModule {}
