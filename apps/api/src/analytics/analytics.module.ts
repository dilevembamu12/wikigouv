import { Module } from '@nestjs/common';
import { UsersModule } from '@/users/users.module';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [UsersModule],
  controllers: [AnalyticsController]
})
export class AnalyticsModule {}
