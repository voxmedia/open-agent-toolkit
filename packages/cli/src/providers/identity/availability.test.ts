import { describe, expect, it, vi } from 'vitest';

import {
  validateMatrixCell,
  type AvailabilityOracleDependencies,
} from './availability';

function createDependencies(
  overrides: Partial<AvailabilityOracleDependencies> = {},
): AvailabilityOracleDependencies {
  return {
    pathExists: vi.fn(async () => false),
    runCursorAgent: vi.fn(async () => ({
      ok: false,
      stdout: '',
      stderr: 'not mocked',
    })),
    env: {},
    ...overrides,
  };
}

describe('validateMatrixCell', () => {
  it('accepts known Claude model tiers and rejects unknown tiers', async () => {
    await expect(
      validateMatrixCell('claude', 'sonnet', {
        cwd: '/repo',
        dependencies: createDependencies(),
      }),
    ).resolves.toBe('valid');

    await expect(
      validateMatrixCell('claude', 'gpt-5.5-high', {
        cwd: '/repo',
        dependencies: createDependencies(),
      }),
    ).resolves.toBe('unknown-value');
  });

  it('requires Codex implementer and reviewer materialized target roles to exist', async () => {
    const pathExists = vi.fn(
      async (path: string) =>
        path.endsWith('oat-phase-implementer-gpt-5-6-terra-xhigh.toml') ||
        path.endsWith('oat-reviewer-gpt-5-6-terra-xhigh.toml'),
    );

    await expect(
      validateMatrixCell('codex', 'gpt-5.6-terra/xhigh', {
        cwd: '/repo',
        dependencies: createDependencies({ pathExists }),
        target: {
          model: 'gpt-5.6-terra',
          effort: 'xhigh',
        },
      }),
    ).resolves.toBe('valid');

    expect(pathExists).toHaveBeenCalledWith(
      '/repo/.codex/agents/oat-phase-implementer-gpt-5-6-terra-xhigh.toml',
    );
    expect(pathExists).toHaveBeenCalledWith(
      '/repo/.codex/agents/oat-reviewer-gpt-5-6-terra-xhigh.toml',
    );
  });

  it('does not validate legacy Codex effort-only role files', async () => {
    const pathExists = vi.fn(
      async (path: string) =>
        path.endsWith('oat-phase-implementer-high.toml') ||
        path.endsWith('oat-reviewer-high.toml'),
    );

    await expect(
      validateMatrixCell('codex', 'high', {
        cwd: '/repo',
        dependencies: createDependencies({ pathExists }),
      }),
    ).resolves.toBe('unknown-value');

    expect(pathExists).not.toHaveBeenCalled();
  });

  it('reports Codex values as unknown when the target or materialized roles are missing', async () => {
    await expect(
      validateMatrixCell('codex', 'opus', {
        cwd: '/repo',
        dependencies: createDependencies(),
      }),
    ).resolves.toBe('unknown-value');

    await expect(
      validateMatrixCell('codex', 'gpt-5.6-terra/xhigh', {
        cwd: '/repo',
        dependencies: createDependencies(),
        target: {
          model: 'gpt-5.6-terra',
          effort: 'xhigh',
        },
      }),
    ).resolves.toBe('unknown-value');
  });

  it('matches Cursor slugs from cursor-agent models first', async () => {
    const runCursorAgent = vi.fn(async () => ({
      ok: true,
      stdout: [
        'Available models',
        'composer-2.5 - Composer 2.5 (current)',
        'gpt-5.5-high - GPT 5.5 High',
      ].join('\n'),
      stderr: '',
    }));

    await expect(
      validateMatrixCell('cursor', 'gpt-5.5-high', {
        cwd: '/repo',
        dependencies: createDependencies({
          runCursorAgent,
          env: { CURSOR_API_KEY: 'secret-key' },
        }),
      }),
    ).resolves.toBe('valid');

    expect(runCursorAgent).toHaveBeenCalledTimes(1);
    expect(runCursorAgent).toHaveBeenCalledWith(
      ['--api-key', 'secret-key', 'models'],
      expect.objectContaining({ cwd: '/repo' }),
    );
  });

  it('falls back to Cursor --list-models when models fails', async () => {
    const runCursorAgent = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, stdout: '', stderr: 'keychain' })
      .mockResolvedValueOnce({
        ok: true,
        stdout: 'composer-2.5-fast - Composer 2.5 Fast\n',
        stderr: '',
      });

    await expect(
      validateMatrixCell('cursor', 'composer-2.5-fast', {
        cwd: '/repo',
        dependencies: createDependencies({ runCursorAgent }),
      }),
    ).resolves.toBe('valid');
  });

  it('reports Cursor slugs as unknown when a live catalog is available without a match', async () => {
    const runCursorAgent = vi.fn(async () => ({
      ok: true,
      stdout: 'composer-2.5 - Composer 2.5\n',
      stderr: '',
    }));

    await expect(
      validateMatrixCell('cursor', 'missing-model', {
        cwd: '/repo',
        dependencies: createDependencies({ runCursorAgent }),
      }),
    ).resolves.toBe('unknown-value');
  });

  it('reports Cursor slugs as unvalidated when catalog probes are unavailable', async () => {
    const runCursorAgent = vi.fn(async () => ({
      ok: false,
      stdout: '',
      stderr: 'command not found',
    }));

    await expect(
      validateMatrixCell('cursor', 'composer-2.5', {
        cwd: '/repo',
        dependencies: createDependencies({ runCursorAgent }),
      }),
    ).resolves.toBe('unvalidated');
  });

  it('treats unknown providers as unvalidated instead of invalid', async () => {
    await expect(
      validateMatrixCell('other-provider', 'best', {
        cwd: '/repo',
        dependencies: createDependencies(),
      }),
    ).resolves.toBe('unvalidated');
  });
});
