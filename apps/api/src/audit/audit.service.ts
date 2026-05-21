import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SequelizeService } from '@/database/sequelize.service';

export type AuditRequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditService {
  constructor(private readonly db: SequelizeService) {}

  async log(params: {
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.models.AuditLog.create({
      id: randomUUID(),
      actorUserId: params.actorUserId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      metadata: params.metadata ?? {}
    });
  }

  fromRequest(req: { ip?: string; headers?: Record<string, unknown> }): AuditRequestMeta {
    const userAgentHeader = req.headers?.['user-agent'];
    return {
      ipAddress: req.ip ?? null,
      userAgent: typeof userAgentHeader === 'string' ? userAgentHeader : null
    };
  }
}
