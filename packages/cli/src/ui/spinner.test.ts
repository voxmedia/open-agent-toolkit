import { beforeEach, describe, expect, it, vi } from 'vitest';

const { oraMock } = vi.hoisted(() => ({
  oraMock: vi.fn(),
}));

vi.mock('ora', () => ({
  default: oraMock,
}));

import { createSpinner } from './spinner';

describe('createSpinner', () => {
  beforeEach(() => {
    oraMock.mockReset();
  });

  it('returns an ora instance in TTY mode', () => {
    const oraInstance = {
      text: 'Loading',
      start: vi.fn(),
      stop: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };
    oraMock.mockReturnValue(oraInstance);

    const spinner = createSpinner('Loading', {
      json: false,
      interactive: true,
    });

    expect(oraMock).toHaveBeenCalledTimes(1);
    expect(spinner).toBe(oraInstance);
  });

  it('returns a no-op spinner in non-TTY mode', () => {
    const spinner = createSpinner('Loading', {
      json: false,
      interactive: false,
    });

    expect(oraMock).not.toHaveBeenCalled();
    expect(() => {
      spinner.start();
      spinner.info('ok');
      spinner.warn('ok');
      spinner.succeed('ok');
      spinner.fail('ok');
      spinner.stop();
    }).not.toThrow();
  });

  it('returns a no-op spinner in json mode', () => {
    const spinner = createSpinner('Loading', { json: true, interactive: true });

    expect(oraMock).not.toHaveBeenCalled();
    expect(() => {
      spinner.start();
      spinner.stop();
    }).not.toThrow();
  });
});
