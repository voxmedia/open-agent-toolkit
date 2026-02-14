import type { CliLogger } from '../../ui/logger';

export interface LoggerCapture {
  info: string[];
  warn: string[];
  error: string[];
  success: string[];
  debug: string[];
  jsonPayloads: unknown[];
  logger: CliLogger;
}

export function createLoggerCapture(): LoggerCapture {
  const info: string[] = [];
  const warn: string[] = [];
  const error: string[] = [];
  const success: string[] = [];
  const debug: string[] = [];
  const jsonPayloads: unknown[] = [];

  return {
    info,
    warn,
    error,
    success,
    debug,
    jsonPayloads,
    logger: {
      debug(message) {
        debug.push(message);
      },
      info(message) {
        info.push(message);
      },
      warn(message) {
        warn.push(message);
      },
      error(message) {
        error.push(message);
      },
      success(message) {
        success.push(message);
      },
      json(payload) {
        jsonPayloads.push(payload);
      },
    },
  };
}
