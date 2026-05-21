import { Controller, Get, Render } from '@nestjs/common';

@Controller()
export class ViewsController {
  @Get('/')
  @Render('landing')
  landing() {
    return {};
  }

  @Get('/landing')
  @Render('landing')
  landingAlias() {
    return {};
  }

  @Get('/register')
  @Render('register')
  register() {
    return {};
  }

  @Get('/employees')
  @Render('employees')
  employees() {
    return {};
  }

  @Get('/courses')
  @Render('courses')
  courses() {
    return {};
  }
}

