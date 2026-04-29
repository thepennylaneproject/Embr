import { LoggerService } from '@nestjs/common';

function emit(
  level: string,
  message: unknown,
  context?: string,
  trace?: string,
): void {
  let msg: string;
  if (typeof message === 'string') {
    msg = message;
  } else if (message instanceof Error) {
    msg = message.message;
  } else {
    try {
      msg = JSON.stringify(message);
    } catch {
      msg = String(message);
    }
  }
  const rec: Record<string, unknown> = {
    level,
    time: new Date().toISOString(),
    msg,
    ...(context ? { context } : {}),
    ...(trace ? { trace } : {}),
  };
  // eslint-disable-next-line no-console -- intentional JSON log sink for log aggregators
  console.log(JSON.stringify(rec));
}

/**
 * One JSON object per line (stdout). Set `LOG_FORMAT=json` and use with
 * NestFactory.create(..., { logger: new JsonLinesLogger() }).
 */
export class JsonLinesLogger implements LoggerService {
  constructor(private readonly defaultContext = 'App') {}

  log(message: unknown, context?: string): void {
    emit('info', message, context ?? this.defaultContext);
  }

  error(message: unknown, trace?: string, context?: string): void {
    emit('error', message, context ?? this.defaultContext, trace);
  }

  warn(message: unknown, context?: string): void {
    emit('warn', message, context ?? this.defaultContext);
  }

  debug(message: unknown, context?: string): void {
    emit('debug', message, context ?? this.defaultContext);
  }

  verbose(message: unknown, context?: string): void {
    emit('verbose', message, context ?? this.defaultContext);
  }
}
