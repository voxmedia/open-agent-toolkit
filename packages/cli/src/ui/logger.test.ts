import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from './logger';

describe('CliLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('info() writes to stdout in human mode', () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const logger = createLogger({ json: false, verbose: false });

    logger.info('hello');

    expect(stdout).toHaveBeenCalled();
    expect(String(stdout.mock.calls[0]?.[0])).toContain('hello');
  });

  it('warn() writes to stderr in human mode', () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const logger = createLogger({ json: false, verbose: false });

    logger.warn('careful');

    expect(stderr).toHaveBeenCalled();
    expect(String(stderr.mock.calls[0]?.[0])).toContain('careful');
  });

  it('error() writes to stderr in human mode', () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const logger = createLogger({ json: false, verbose: false });

    logger.error('boom');

    expect(stderr).toHaveBeenCalled();
    expect(String(stderr.mock.calls[0]?.[0])).toContain('boom');
  });

  it('success() writes to stdout in human mode', () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const logger = createLogger({ json: false, verbose: false });

    logger.success('done');

    expect(stdout).toHaveBeenCalled();
    expect(String(stdout.mock.calls[0]?.[0])).toContain('done');
  });

  it('json() outputs single JSON document to stdout', () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const logger = createLogger({ json: true, verbose: false });

    logger.json({ ok: true, count: 1 });

    expect(stdout).toHaveBeenCalledTimes(1);
    expect(String(stdout.mock.calls[0]?.[0])).toContain('"ok": true');
    expect(String(stdout.mock.calls[0]?.[0])).toContain('"count": 1');
  });

  it('suppresses colors/messages for info in json mode', () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const logger = createLogger({ json: true, verbose: false });

    logger.info('hidden');

    expect(stdout).not.toHaveBeenCalled();
  });

  it('debug() only outputs when verbose is true', () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const quiet = createLogger({ json: false, verbose: false });
    const verbose = createLogger({ json: false, verbose: true });

    quiet.debug('quiet');
    verbose.debug('loud');

    expect(stdout).toHaveBeenCalledTimes(1);
    expect(String(stdout.mock.calls[0]?.[0])).toContain('loud');
  });

  it('error() emits structured JSON to stderr in json mode', () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const logger = createLogger({ json: true, verbose: false });

    logger.error('bad', { code: 'E_TEST' });

    expect(stderr).toHaveBeenCalledTimes(1);
    const raw = String(stderr.mock.calls[0]?.[0]);
    expect(() => JSON.parse(raw)).not.toThrow();
    const parsed = JSON.parse(raw);
    expect(parsed).toMatchObject({
      type: 'error',
      message: 'bad',
      meta: { code: 'E_TEST' },
    });
  });
});
