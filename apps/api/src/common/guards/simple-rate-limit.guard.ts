import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

type HitEntry = { count: number; resetAt: number };

@Injectable()
export class SimpleRateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, HitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(private readonly config: ConfigService) {
    this.maxRequests = Number(this.config.get<string>('AI_RATE_LIMIT_MAX', '20'));
    this.windowMs = Number(this.config.get<string>('AI_RATE_LIMIT_WINDOW_MS', '60000'));
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.route?.path ?? req.path}`;
    const now = Date.now();
    const existing = this.hits.get(key);

    if (!existing || existing.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    existing.count += 1;
    if (existing.count > this.maxRequests) {
      throw new HttpException('Rate limit exceeded on AI endpoints', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
