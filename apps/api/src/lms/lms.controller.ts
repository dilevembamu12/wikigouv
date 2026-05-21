import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '@/auth/current-user.decorator';
import { RequirePermissions } from '@/auth/permissions.decorator';
import { Permission } from '@/auth/permissions.enum';
import { AuthenticatedRequestUser } from '@/auth/auth.types';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SetCourseLastViewDto } from './dto/set-course-last-view.dto';
import { SetCoursePersonalNoteDto } from './dto/set-course-personal-note.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { LmsService } from './lms.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class LmsController {
  constructor(private readonly lmsService: LmsService) {}

  @Get('courses')
  @RequirePermissions(Permission.COURSE_READ)
  listCourses() {
    return this.lmsService.listCourses();
  }

  @Post('courses')
  @RequirePermissions(Permission.COURSE_CREATE)
  createCourse(@CurrentUser() user: AuthenticatedRequestUser, @Body() dto: CreateCourseDto) {
    return this.lmsService.createCourse(user, dto);
  }

  @Post('courses/:id/enroll')
  @RequirePermissions(Permission.COURSE_READ)
  enroll(@CurrentUser() user: AuthenticatedRequestUser, @Param('id') id: string, @Req() req: Request) {
    return this.lmsService.enroll(user, id, req);
  }

  @Get('enrollments/me')
  @RequirePermissions(Permission.COURSE_READ)
  myEnrollments(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.lmsService.myEnrollments(user);
  }

  @Post('lessons/:id/complete')
  @RequirePermissions(Permission.COURSE_READ)
  completeLesson(@CurrentUser() user: AuthenticatedRequestUser, @Param('id') id: string, @Req() req: Request) {
    return this.lmsService.completeLesson(user, id, req);
  }

  @Get('courses/:id/progress')
  @RequirePermissions(Permission.COURSE_READ)
  courseProgress(@CurrentUser() user: AuthenticatedRequestUser, @Param('id') id: string) {
    return this.lmsService.courseProgress(user, id);
  }

  @Get('courses/:id/last-view')
  @RequirePermissions(Permission.COURSE_READ)
  courseLastView(@CurrentUser() user: AuthenticatedRequestUser, @Param('id') id: string) {
    return this.lmsService.getCourseLastView(user, id);
  }

  @Post('courses/:id/last-view')
  @RequirePermissions(Permission.COURSE_READ)
  setCourseLastView(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() dto: SetCourseLastViewDto,
    @Req() req: Request
  ) {
    return this.lmsService.setCourseLastView(user, id, dto, req);
  }

  @Get('courses/:id/personal-notes/:itemType/:itemId')
  @RequirePermissions(Permission.COURSE_READ)
  getCoursePersonalNote(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Param('itemType') itemType: string,
    @Param('itemId') itemId: string
  ) {
    return this.lmsService.getCoursePersonalNote(user, id, itemType, itemId);
  }

  @Post('courses/:id/personal-notes')
  @RequirePermissions(Permission.COURSE_READ)
  setCoursePersonalNote(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() dto: SetCoursePersonalNoteDto,
    @Req() req: Request
  ) {
    return this.lmsService.setCoursePersonalNote(user, id, dto, req);
  }

  @Post('quizzes')
  @RequirePermissions(Permission.QUIZ_CREATE)
  createQuiz(@CurrentUser() user: AuthenticatedRequestUser, @Body() dto: CreateQuizDto, @Req() req: Request) {
    return this.lmsService.createQuiz(user, dto, req);
  }

  @Post('quizzes/:id/start')
  @RequirePermissions(Permission.QUIZ_SUBMIT)
  startQuiz(@CurrentUser() user: AuthenticatedRequestUser, @Param('id') id: string, @Req() req: Request) {
    return this.lmsService.startQuiz(user, id, req);
  }

  @Post('quiz-attempts/:id/submit')
  @RequirePermissions(Permission.QUIZ_SUBMIT)
  submitQuiz(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() payload: SubmitQuizDto,
    @Req() req: Request
  ) {
    return this.lmsService.submitQuiz(user, id, payload, req);
  }

  @Get('quiz-attempts/:id/result')
  @RequirePermissions(Permission.QUIZ_SUBMIT)
  quizResult(@CurrentUser() user: AuthenticatedRequestUser, @Param('id') id: string) {
    return this.lmsService.quizResult(user, id);
  }

  @Get('certificates/me')
  @RequirePermissions(Permission.COURSE_READ)
  myCertificates(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.lmsService.myCertificates(user);
  }

  @Get('certificates/:id')
  @RequirePermissions(Permission.COURSE_READ)
  getCertificateById(@CurrentUser() user: AuthenticatedRequestUser, @Param('id') id: string) {
    return this.lmsService.getCertificateById(user, id);
  }

  @Get('certificates/verify/:hash')
  verifyByHash(@Param('hash') hash: string) {
    return this.lmsService.verifyCertificate(hash);
  }
}
