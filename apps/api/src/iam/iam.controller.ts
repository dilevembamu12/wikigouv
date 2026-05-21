import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '@/auth/current-user.decorator';
import { AuthenticatedRequestUser } from '@/auth/auth.types';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { Roles } from '@/auth/roles.decorator';
import { AppRole } from '@/auth/roles.enum';
import { RolesGuard } from '@/auth/roles.guard';
import { AuditService } from '@/audit/audit.service';
import { IamService } from './iam.service';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';

@Controller('iam')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.SUPER_ADMIN)
export class IamController {
  constructor(
    private readonly iamService: IamService,
    private readonly auditService: AuditService
  ) {}

  @Get('roles')
  listRoles() {
    return this.iamService.listClientRoles();
  }

  @Get('users')
  listUsers(
    @Query('search') search?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string
  ) {
    const page = Math.max(1, Number(pageRaw ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? '20') || 20));
    return this.iamService.listUsersWithRoles(search, page, pageSize);
  }

  @Patch('users/:userId/roles')
  async updateUserRoles(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRolesDto,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Req() req: Request
  ) {
    const result = await this.iamService.syncUserClientRoles(userId, dto.roles ?? []);
    const meta = this.auditService.fromRequest(req);

    await this.auditService.log({
      actorUserId: user.sub,
      action: 'IAM_USER_ROLES_UPDATED',
      entityType: 'KeycloakUser',
      entityId: userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: {
        oldRoles: result.oldRoles,
        newRoles: result.roles,
        addedRoles: result.addedRoles,
        removedRoles: result.removedRoles
      }
    });

    return result;
  }
}
