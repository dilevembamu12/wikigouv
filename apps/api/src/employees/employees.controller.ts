import { Controller, Get, UseGuards } from '@nestjs/common';
import { Permission } from '@/auth/permissions.enum';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { RequirePermissions } from '@/auth/permissions.decorator';
import { RolesGuard } from '@/auth/roles.guard';
import { EmployeesService } from './employees.service';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @RequirePermissions(Permission.COURSE_READ)
  async findAll() {
    const employees = await this.employees.findAll();
    return { employees, count: employees.length };
  }
}
