import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/auth/current-user.decorator';
import { AuthenticatedRequestUser } from '@/auth/auth.types';
import { AppRole } from '@/auth/roles.enum';
import { SequelizeService } from '@/database/sequelize.service';
import { UsersService } from '@/users/users.service';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { RequirePermissions } from '@/auth/permissions.decorator';
import { Permission } from '@/auth/permissions.enum';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(
    private readonly db: SequelizeService,
    private readonly usersService: UsersService
  ) {}

  @Get('overview')
  @RequirePermissions(Permission.DASHBOARD_VIEW)
  async overview() {
    const [users, courses, enrollments, certs] = await Promise.all([
      this.db.models.UserProfile.count(),
      this.db.models.Course.count(),
      this.db.models.Enrollment.count(),
      this.db.models.Certificate.count()
    ]);
    return { users, courses, enrollments, certificates: certs };
  }

  @Get('dashboard')
  @RequirePermissions(Permission.DASHBOARD_VIEW)
  async dashboard(@CurrentUser() user: AuthenticatedRequestUser) {
    const profile = await this.usersService.syncProfile(user);
    const profileId = String(profile.get('id'));

    const isAdmin =
      user.roles.includes(AppRole.ADMIN) ||
      user.roles.includes(AppRole.SUPER_ADMIN) ||
      user.roles.includes(AppRole.DIRECTION);

    const [publishedCourses, myEnrollments, myAttempts, certificates] = await Promise.all([
      this.db.models.Course.count({ where: { status: 'PUBLISHED' } }),
      this.db.models.Enrollment.count({ where: { userId: profileId } }),
      this.db.models.QuizAttempt.count({ where: { userId: profileId } }),
      this.db.models.Certificate.count({ where: { userId: profileId } })
    ]);

    if (!isAdmin) {
      return {
        role: user.roles[0] ?? 'AGENT',
        kpis: { publishedCourses, myEnrollments, myAttempts, certificates }
      };
    }

    const [users, courses, enrollments, attempts] = await Promise.all([
      this.db.models.UserProfile.count(),
      this.db.models.Course.count(),
      this.db.models.Enrollment.count(),
      this.db.models.QuizAttempt.count()
    ]);

    return {
      role: user.roles[0] ?? 'ADMIN',
      kpis: { users, courses, enrollments, attempts, publishedCourses }
    };
  }
}
