import { Controller, Get, Render, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthUser, PageContext } from '../security/auth.types';

type RequestWithAuth = Request & { authUser?: AuthUser };

@Controller()
export class PublicController {
  @Get('/')
  @Render('landing')
  home(@Req() req: RequestWithAuth) {
    const page: PageContext = {
      title: 'Wikigouv ARTF - Accueil',
      activeNav: 'home',
      user: req.authUser ?? null
    };
    return { page };
  }

  @Get('/landing')
  @Render('landing')
  landing(@Req() req: RequestWithAuth) {
    const page: PageContext = {
      title: 'Wikigouv ARTF - Vision',
      activeNav: 'home',
      user: req.authUser ?? null
    };
    return { page };
  }

  @Get('/not-implemented')
  @Render('pages/panel/not-implemented')
  notImplemented(@Req() req: RequestWithAuth) {
    const page: PageContext = {
      title: 'Page non implémentée - Wikigouv',
      activeNav: 'dashboard',
      user: req.authUser ?? null
    };
    return { page, featureTitle: 'Fonctionnalité', allowed: true, comingSoon: true };
  }
}
