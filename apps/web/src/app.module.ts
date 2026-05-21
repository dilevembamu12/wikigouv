import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod
} from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AdminPanelController } from './controllers/admin-panel.controller';
import { CoursesController } from './controllers/courses.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { DocumentsController } from './controllers/documents.controller';
import { IamController } from './controllers/iam.controller';
import { PublicController } from './controllers/public.controller';
import { WebinarsController } from './controllers/webinars.controller';
import { CategoriesController } from './controllers/categories.controller';
import { LibraryCompatController, LibraryController } from './controllers/library.controller';
import { UsersController } from './controllers/users.controller';
import { LibraryMinioService } from './services/library-minio.service';
import { AuthContextMiddleware } from './security/auth-context.middleware';
import { SensitiveAccessInterceptor } from './security/sensitive-access.interceptor';
import { WebAuthGuard } from './security/web-auth.guard';

@Module({
  controllers: [
    PublicController,
    AuthController,
    WebinarsController,
    CoursesController,
    DashboardController,
    DocumentsController,
    IamController,
    LibraryController,
    LibraryCompatController,
    CategoriesController,
    UsersController,
    AdminPanelController
  ],
  providers: [SensitiveAccessInterceptor, WebAuthGuard, LibraryMinioService]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthContextMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL
    });
  }
}
