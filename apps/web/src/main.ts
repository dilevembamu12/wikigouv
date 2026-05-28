import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import helmet from 'helmet';
import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import { AppModule } from './app.module';

const envCandidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '.env'),
  resolve(process.cwd(), '..', '..', '.env')
];

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath });
    break;
  }
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const minioProtocol = String(process.env.MINIO_USE_SSL ?? 'false').toLowerCase() === 'true' ? 'https' : 'http';
  const minioHost = process.env.MINIO_ENDPOINT ?? 'localhost';
  const minioPort = process.env.MINIO_PORT ?? '9000';
  const minioOrigin = `${minioProtocol}://${minioHost}:${minioPort}`;
  const extraMediaOrigins = String(process.env.LEARNING_MEDIA_ORIGINS ?? 'http://localhost:81')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.youtube.com', 'https://s.ytimg.com', 'https://player.vimeo.com'],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", 'data:'],
          frameSrc: ["'self'", minioOrigin, ...extraMediaOrigins, 'https://www.youtube.com', 'https://www.youtube-nocookie.com', 'https://player.vimeo.com'],
          imgSrc: ["'self'", 'data:', 'blob:', minioOrigin],
          mediaSrc: ["'self'", 'data:', 'blob:', minioOrigin, ...extraMediaOrigins],
          workerSrc: ["'self'", 'blob:'],
          connectSrc: ["'self'", minioOrigin, ...extraMediaOrigins, 'https://www.youtube.com', 'https://s.ytimg.com', 'https://player.vimeo.com']
        }
      }
    })
  );
  app.enableCors({
    origin: true,
    credentials: true
  });
  const webRoot = resolve(__dirname, '..');
  app.useStaticAssets(resolve(webRoot, 'public'));
  app.setBaseViewsDir(resolve(webRoot, 'views'));
  app.setViewEngine('ejs');

  await app.listen(3000);
}

void bootstrap();
