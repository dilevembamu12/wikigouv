import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/auth/current-user.decorator';
import { AuthenticatedRequestUser } from '@/auth/auth.types';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.usersService.getMe(user);
  }

  @Patch('me/profile')
  patchMe(@CurrentUser() user: AuthenticatedRequestUser, @Body() dto: UpdateMeDto) {
    return this.usersService.patchMe(user, dto);
  }

  @Post('auth/sync-profile')
  syncProfile(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.usersService.syncProfile(user);
  }

  @Get('auth/session')
  session(@CurrentUser() user: AuthenticatedRequestUser) {
    return {
      authenticated: true,
      sub: user.sub,
      roles: user.roles,
      permissions: user.permissions
    };
  }
}
