import { homedir } from 'node:os';
import * as path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildCommandContext } from './command-context';

describe('buildCommandContext', () => {
  const originalTty = process.stdin.isTTY;

  afterEach(() => {
    if (typeof originalTty === 'undefined') {
      Reflect.deleteProperty(process.stdin, 'isTTY');
    } else {
      Object.defineProperty(process.stdin, 'isTTY', {
        configurable: true,
        value: originalTty,
      });
    }
    vi.restoreAllMocks();
  });

  it('creates context with default scope "all"', () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      configurable: true,
      value: true,
    });

    const context = buildCommandContext({});

    expect(context.scope).toBe('all');
  });

  it('sets interactive=true when TTY and json=false', () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      configurable: true,
      value: true,
    });

    const context = buildCommandContext({ json: false });

    expect(context.interactive).toBe(true);
  });

  it('sets interactive=false when json=true', () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      configurable: true,
      value: true,
    });

    const context = buildCommandContext({ json: true });

    expect(context.interactive).toBe(false);
  });

  it('resolves cwd to absolute path', () => {
    const relativeCwd = '.';
    const context = buildCommandContext({ cwd: relativeCwd });

    expect(context.cwd).toBe(path.resolve(relativeCwd));
    expect(path.isAbsolute(context.cwd)).toBe(true);
  });

  it('resolves home from os.homedir()', () => {
    const context = buildCommandContext({});

    expect(context.home).toBe(homedir());
  });
});
