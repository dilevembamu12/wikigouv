import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '@/auth/current-user.decorator';
import { AuthenticatedRequestUser } from '@/auth/auth.types';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { RequirePermissions } from '@/auth/permissions.decorator';
import { Permission } from '@/auth/permissions.enum';
import { CreateCourseDto } from './dto/create-course.dto';
import { ListCoursesQueryDto } from './dto/list-courses-query.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { LmsService } from './lms.service';

@Controller('courses/public')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class LmsPublicController {
  constructor(private readonly lmsService: LmsService) {}

  @Get()
  @RequirePermissions(Permission.COURSE_READ)
  listCoursesPublic(@CurrentUser() user: AuthenticatedRequestUser, @Query() query: ListCoursesQueryDto) {
    return this.lmsService.listCoursesPublic(user, query);
  }

  @Post()
  @RequirePermissions(Permission.COURSE_CREATE)
  createCoursePublic(@CurrentUser() user: AuthenticatedRequestUser, @Body() dto: CreateCourseDto, @Req() req: Request) {
    return this.lmsService.createCoursePublic(user, dto, req);
  }

  @Patch(':id')
  @RequirePermissions(Permission.COURSE_UPDATE)
  updateCoursePublic(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: UpdateCourseDto,
    @Req() req: Request
  ) {
    return this.lmsService.updateCoursePublic(user, id, dto, req);
  }

  @Delete(':id')
  @RequirePermissions(Permission.COURSE_DELETE)
  deleteCoursePublic(@CurrentUser() user: AuthenticatedRequestUser, @Param('id') id: string, @Req() req: Request) {
    return this.lmsService.deleteCoursePublic(user, id, req);
  }
}
