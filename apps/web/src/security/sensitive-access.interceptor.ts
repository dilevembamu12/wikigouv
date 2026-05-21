import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class SensitiveAccessInterceptor implements NestInterceptor {
  private readonly logger = new Logger('SensitiveAccess');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      path: string;
      ip: string;
      headers: Record<string, string | undefined>;
      authUser?: { sub?: string; email?: string; preferredUsername?: string };
    }>();

    return next.handle().pipe(
      tap(() => {
        const actor =
          req.authUser?.sub ?? req.authUser?.preferredUsername ?? req.authUser?.email ?? 'anonymous';
        this.logger.log(
          JSON.stringify({
            action: 'WEB_SENSITIVE_PAGE_ACCESS',
            actor,
            method: req.method,
            path: req.path,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] ?? 'unknown'
          })
        );
      })
    );
  }
}

