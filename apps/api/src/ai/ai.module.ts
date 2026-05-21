import { Module } from '@nestjs/common';
import { SimpleRateLimitGuard } from '@/common/guards/simple-rate-limit.guard';
import { AiController } from './ai.controller';

@Module({
  controllers: [AiController],
  providers: [SimpleRateLimitGuard]
})
export class AiModule {}
