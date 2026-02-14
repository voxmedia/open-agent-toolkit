import { describe, expect, it } from 'vitest';
import { CliError } from './cli-error';

describe('CliError', () => {
  it('stores message and exit code', () => {
    const err = new CliError('bad input', 2);

    expect(err.message).toBe('bad input');
    expect(err.exitCode).toBe(2);
  });

  it('defaults to exit code 1 for user errors', () => {
    const err = new CliError('user error');

    expect(err.exitCode).toBe(1);
  });

  it('accepts exit code 2 for system errors', () => {
    const err = new CliError('system failure', 2);

    expect(err.exitCode).toBe(2);
  });

  it('is instanceof Error', () => {
    const err = new CliError('boom');

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('CliError');
  });
});
