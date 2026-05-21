import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import pino from 'pino';

export type LoggerStreams = {
  stream: pino.DestinationStream;
  errorStream: pino.DestinationStream;
};

export function createLoggerStreams(logDirEnv?: string): LoggerStreams {
  const logDir = logDirEnv
    ? resolve(logDirEnv)
    : resolve(__dirname, '../../../../logs/api');

  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  const stream = pino.destination({
    dest: join(logDir, 'wikigouv-api.log'),
    mkdir: true,
    sync: false
  });

  const errorStream = pino.destination({
    dest: join(logDir, 'wikigouv-api-error.log'),
    mkdir: true,
    sync: false
  });

  return { stream, errorStream };
}

