import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { AuditModule } from '@/audit/audit.module';
import { DatabaseModule } from '@/database/database.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthModule, AuditModule, DatabaseModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}

