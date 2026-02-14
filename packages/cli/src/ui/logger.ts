import chalk from 'chalk';

export interface CliLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  success(message: string, meta?: Record<string, unknown>): void;
  json(payload: unknown): void;
}

interface CreateLoggerOptions {
  json: boolean;
  verbose: boolean;
}

function serializeMeta(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) {
    return '';
  }
  return ` ${JSON.stringify(meta)}`;
}

function writeStdout(message: string): void {
  process.stdout.write(`${message}\n`);
}

function writeStderr(message: string): void {
  process.stderr.write(`${message}\n`);
}

export function createLogger(options: CreateLoggerOptions): CliLogger {
  const { json, verbose } = options;

  return {
    debug(message, meta) {
      if (json || !verbose) {
        return;
      }
      writeStdout(chalk.gray(`[debug] ${message}${serializeMeta(meta)}`));
    },

    info(message, meta) {
      if (json) {
        return;
      }
      writeStdout(chalk.cyan(message) + serializeMeta(meta));
    },

    warn(message, meta) {
      if (json) {
        return;
      }
      writeStderr(chalk.yellow(message) + serializeMeta(meta));
    },

    error(message, meta) {
      if (json) {
        process.stderr.write(
          `${JSON.stringify({ type: 'error', message, ...(meta ? { meta } : {}) })}\n`,
        );
        return;
      }
      writeStderr(chalk.red(message) + serializeMeta(meta));
    },

    success(message, meta) {
      if (json) {
        return;
      }
      writeStdout(chalk.green(message) + serializeMeta(meta));
    },

    json(payload) {
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    },
  };
}
