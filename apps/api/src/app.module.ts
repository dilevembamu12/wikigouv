import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import pino from 'pino';
import { resolve } from 'path';
import { createLoggerStreams } from './config/logger.config';
import { validateEnv } from './config/env.validation';
import { AppController } from './app.controller';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiModule } from './ai/ai.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { LmsModule } from './lms/lms.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { DocumentsModule } from './documents/documents.module';
import { ParticipantsModule } from './participants/participants.module';
import { EmployeesModule } from './employees/employees.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SupportsModule } from './supports/supports.module';
import { ForumsModule } from './forums/forums.module';
import { BlogModule } from './blog/blog.module';
import { TagsModule } from './tags/tags.module';
import { PagesModule } from './pages/pages.module';
import { NewslettersModule } from './newsletters/newsletters.module';
import { NoticeboardsModule } from './noticeboards/noticeboards.module';
import { BackofficeModule } from './backoffice/backoffice.module';
import { IamModule } from './iam/iam.module';
import { AdminModule } from './admin/admin.module';
import { ViewsController } from './views.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(__dirname, '../../../.env'), '.env'],
      validate: validateEnv
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const { stream, errorStream } = createLoggerStreams(config.get<string>('LOG_DIR'));
        const level = config.get<string>('LOG_LEVEL', 'info');

        return {
          pinoHttp: {
            level,
            timestamp: pino.stdTimeFunctions.isoTime,
            genReqId: (req) =>
              (req.headers['x-request-id'] as string | undefined) ??
              `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            customProps: (req) => ({
              requestId:
                (req.headers['x-request-id'] as string | undefined) ?? undefined
            }),
            serializers: {
              req: (req) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                remoteAddress: req.remoteAddress
              }),
              res: (res) => ({
                statusCode: res.statusCode
              })
            },
            stream: pino.multistream([
              { stream: process.stdout },
              { stream },
              { level: 'error', stream: errorStream }
            ])
          }
        };
      }
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ParticipantsModule,
    EmployeesModule,
    LmsModule,
    AuditModule,
    AnalyticsModule,
    DocumentsModule,
    AiModule,
    NotificationsModule,
    SupportsModule,
    ForumsModule,
    BlogModule,
    TagsModule,
    PagesModule,
    NewslettersModule,
    NoticeboardsModule,
    BackofficeModule,
    IamModule,
    AdminModule
  ],
  controllers: [AppController, ViewsController],
  providers: []
})
export class AppModule {}
