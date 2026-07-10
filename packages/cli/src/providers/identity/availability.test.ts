import { describe, expect, it, vi } from 'vitest';

import {
  validateCursorSubagentModel,
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
    runCodex: vi.fn(async () => ({
      ok: false,
      stdout: '',
      stderr: 'not mocked',
    })),
    env: {},
    ...overrides,
  };
}

function codexCatalog(models: unknown[]): string {
  return JSON.stringify({ models });
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

  it('validates Codex models and efforts through codex debug models', async () => {
    const runCodex = vi.fn(async () => ({
      ok: true,
      stdout: codexCatalog([
        {
          slug: 'gpt-5.5',
          supported_reasoning_levels: [
            { effort: 'low' },
            { effort: 'medium' },
            { effort: 'high' },
            { effort: 'xhigh' },
          ],
        },
      ]),
      stderr: '',
    }));

    await expect(
      validateMatrixCell('codex', 'gpt-5.5/xhigh', {
        cwd: '/repo',
        dependencies: createDependencies({ runCodex }),
        target: {
          model: 'gpt-5.5',
          effort: 'xhigh',
        },
      }),
    ).resolves.toBe('valid');

    expect(runCodex).toHaveBeenCalledWith(['debug', 'models'], {
      cwd: '/repo',
      env: {},
    });
  });

  it('accepts max as a first-class Codex reasoning effort', async () => {
    const runCodex = vi.fn(async () => ({
      ok: true,
      stdout: codexCatalog([
        {
          slug: 'gpt-5.6-sol',
          supported_reasoning_levels: [{ effort: 'max' }],
        },
      ]),
      stderr: '',
    }));

    await expect(
      validateMatrixCell('codex', 'gpt-5.6-sol/max', {
        cwd: '/repo',
        dependencies: createDependencies({ runCodex }),
        target: { model: 'gpt-5.6-sol', effort: 'max' },
      }),
    ).resolves.toBe('valid');
  });

  it('reports unknown Codex model slugs from the debug catalog', async () => {
    const runCodex = vi.fn(async () => ({
      ok: true,
      stdout: codexCatalog([
        {
          slug: 'gpt-5.5',
          supported_reasoning_levels: [{ effort: 'xhigh' }],
        },
      ]),
      stderr: '',
    }));

    await expect(
      validateMatrixCell('codex', 'gpt-5.6-sol/xhigh', {
        cwd: '/repo',
        detailed: true,
        dependencies: createDependencies({ runCodex }),
        target: {
          model: 'gpt-5.6-sol',
          effort: 'xhigh',
        },
      }),
    ).resolves.toMatchObject({
      availability: 'unknown-value',
      message: "Codex debug models does not list 'gpt-5.6-sol'.",
    });
  });

  it('reports unsupported Codex efforts separately from model availability', async () => {
    const runCodex = vi.fn(async () => ({
      ok: true,
      stdout: codexCatalog([
        {
          slug: 'gpt-5.5',
          supported_reasoning_levels: [
            { effort: 'medium' },
            { effort: 'high' },
          ],
        },
      ]),
      stderr: '',
    }));

    await expect(
      validateMatrixCell('codex', 'gpt-5.5/xhigh', {
        cwd: '/repo',
        detailed: true,
        dependencies: createDependencies({ runCodex }),
        target: {
          model: 'gpt-5.5',
          effort: 'xhigh',
        },
      }),
    ).resolves.toMatchObject({
      availability: 'unknown-value',
      message:
        "Codex debug models lists 'gpt-5.5', but effort 'xhigh' is not supported. Supported Codex efforts: medium, high.",
    });
  });

  it('reports Codex availability as unvalidated when debug models is unavailable or unparsable', async () => {
    const failedRunCodex = vi.fn(async () => ({
      ok: false,
      stdout: '',
      stderr: 'not authenticated',
    }));
    const invalidRunCodex = vi.fn(async () => ({
      ok: true,
      stdout: 'not json',
      stderr: '',
    }));

    await expect(
      validateMatrixCell('codex', 'gpt-5.5/xhigh', {
        cwd: '/repo',
        dependencies: createDependencies({ runCodex: failedRunCodex }),
        target: {
          model: 'gpt-5.5',
          effort: 'xhigh',
        },
      }),
    ).resolves.toBe('unvalidated');

    await expect(
      validateMatrixCell('codex', 'gpt-5.5/xhigh', {
        cwd: '/repo',
        dependencies: createDependencies({ runCodex: invalidRunCodex }),
        target: {
          model: 'gpt-5.5',
          effort: 'xhigh',
        },
      }),
    ).resolves.toBe('unvalidated');
  });

  it('falls back to model/effort parsing from Codex matrix values', async () => {
    const runCodex = vi.fn(async () => ({
      ok: true,
      stdout: codexCatalog([
        {
          slug: 'gpt-5.5',
          supported_reasoning_levels: [{ effort: 'xhigh' }],
        },
      ]),
      stderr: '',
    }));

    await expect(
      validateMatrixCell('codex', 'gpt-5.5/xhigh', {
        cwd: '/repo',
        dependencies: createDependencies({ runCodex }),
      }),
    ).resolves.toBe('valid');
  });

  it('does not require Codex materialized target role files for catalog-valid models', async () => {
    const pathExists = vi.fn(async () => false);
    const runCodex = vi.fn(async () => ({
      ok: true,
      stdout: codexCatalog([
        {
          slug: 'gpt-5.5',
          supported_reasoning_levels: [{ effort: 'xhigh' }],
        },
      ]),
      stderr: '',
    }));

    await expect(
      validateMatrixCell('codex', 'gpt-5.5/xhigh', {
        cwd: '/repo',
        dependencies: createDependencies({ pathExists, runCodex }),
        target: {
          model: 'gpt-5.5',
          effort: 'xhigh',
        },
      }),
    ).resolves.toBe('valid');

    expect(pathExists).not.toHaveBeenCalled();
  });

  it('rejects legacy Codex effort-only values before model catalog validation', async () => {
    const runCodex = vi.fn(
      async () =>
        ({
          ok: true,
          stdout: codexCatalog([
            {
              slug: 'gpt-5.5',
              supported_reasoning_levels: [{ effort: 'high' }],
            },
          ]),
          stderr: '',
        }) as const,
    );

    await expect(
      validateMatrixCell('codex', 'high', {
        cwd: '/repo',
        dependencies: createDependencies({ runCodex }),
      }),
    ).resolves.toBe('unknown-value');

    expect(runCodex).not.toHaveBeenCalled();
  });

  it('reports Codex values as unknown when model or effort is missing', async () => {
    const runCodex = vi.fn(async () => ({
      ok: true,
      stdout: codexCatalog([]),
      stderr: '',
    }));

    await expect(
      validateMatrixCell('codex', 'opus', {
        cwd: '/repo',
        dependencies: createDependencies({ runCodex }),
      }),
    ).resolves.toBe('unknown-value');

    await expect(
      validateMatrixCell('codex', 'gpt-5.5', {
        cwd: '/repo',
        dependencies: createDependencies({ runCodex }),
        target: {
          model: 'gpt-5.5',
        },
      }),
    ).resolves.toBe('unknown-value');

    expect(runCodex).not.toHaveBeenCalled();
  });

  it('validates Cursor models through a subagent probe before trusting the broad catalog', async () => {
    const runCursorAgent = vi.fn(async () => ({
      ok: true,
      stdout: 'OAT_CURSOR_SUBAGENT_MODEL_VALID',
      stderr: '',
    }));

    await expect(
      validateMatrixCell('cursor', 'gpt-5.3-codex', {
        cwd: '/repo',
        dependencies: createDependencies({
          runCursorAgent,
          env: {
            CURSOR_API_KEY: 'secret-key',
            AGENT_CLI_CREDENTIAL_STORE: 'file',
          },
        }),
      }),
    ).resolves.toBe('valid');

    expect(runCursorAgent).toHaveBeenCalledTimes(1);
    expect(runCursorAgent).toHaveBeenCalledWith(
      expect.arrayContaining(['--api-key', 'secret-key', '-p']),
      expect.objectContaining({
        cwd: '/repo',
        env: expect.objectContaining({
          CURSOR_API_KEY: 'secret-key',
          AGENT_CLI_CREDENTIAL_STORE: 'file',
        }),
      }),
    );
  });

  it('does not validate Cursor models when the probe succeeds without the sentinel', async () => {
    const runCursorAgent = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        stdout:
          'The parent agent completed, but OAT_CURSOR_SUBAGENT_MODEL_VALID was not reported by a Task result.',
        stderr: '',
      })
      .mockResolvedValueOnce({
        ok: true,
        stdout: 'gpt-5.3-codex - GPT 5.3 Codex\n',
        stderr: '',
      });

    await expect(
      validateCursorSubagentModel('gpt-5.3-codex', {
        cwd: '/repo',
        dependencies: createDependencies({ runCursorAgent }),
      }),
    ).resolves.toEqual({
      availability: 'unvalidated',
      message:
        "Cursor's broad model catalog lists 'gpt-5.3-codex', but subagent Task dispatch could not be validated.",
    });
    expect(runCursorAgent).toHaveBeenCalledTimes(2);
  });

  it('does not treat cursor-agent models as proof of subagent eligibility', async () => {
    const runCursorAgent = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, stdout: '', stderr: 'keychain' })
      .mockResolvedValueOnce({
        ok: true,
        stdout: 'gpt-5.3-codex-low - GPT 5.3 Codex Low\n',
        stderr: '',
      });

    await expect(
      validateMatrixCell('cursor', 'gpt-5.3-codex-low', {
        cwd: '/repo',
        dependencies: createDependencies({ runCursorAgent }),
      }),
    ).resolves.toBe('unvalidated');
  });

  it('parses Cursor invalid-subagent-model allowed slugs', async () => {
    const runCursorAgent = vi.fn(async () => ({
      ok: false,
      stdout: '',
      stderr:
        'Invalid subagent model gpt-5.3-codex-low. Allowed models: gpt-5.3-codex, composer-2.5',
    }));

    await expect(
      validateCursorSubagentModel('gpt-5.3-codex-low', {
        cwd: '/repo',
        dependencies: createDependencies({ runCursorAgent }),
      }),
    ).resolves.toEqual({
      availability: 'unknown-value',
      allowedValues: ['gpt-5.3-codex', 'composer-2.5'],
      message:
        'Cursor rejected this model for subagent Task dispatch. Allowed subagent models: gpt-5.3-codex, composer-2.5.',
    });
  });

  it('marks Cursor models as valid when the invalid-model allow-list includes them', async () => {
    const runCursorAgent = vi.fn(async () => ({
      ok: false,
      stdout: '',
      stderr:
        'Invalid subagent model mystery. Allowed models: gpt-5.3-codex, composer-2.5',
    }));

    await expect(
      validateCursorSubagentModel('gpt-5.3-codex', {
        cwd: '/repo',
        dependencies: createDependencies({ runCursorAgent }),
      }),
    ).resolves.toMatchObject({
      availability: 'valid',
      allowedValues: ['gpt-5.3-codex', 'composer-2.5'],
    });
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
