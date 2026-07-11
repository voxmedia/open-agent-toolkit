import type { DispatchMatrixCellRef } from '@config/dispatch-matrix';
import { describe, expect, it, vi } from 'vitest';

import type { AvailabilityOracleDependencies } from './availability';
import {
  createDispatchValidationPassContext,
  validateDispatchMatrixRefs,
} from './dispatch-validation';

function cursorRef(value: string, path: string): DispatchMatrixCellRef {
  return {
    provider: 'cursor',
    tier: 'balanced',
    candidateIndex: 0,
    fallbackRouteIndex: null,
    value,
    target: null,
    path,
    source: 'repo-config',
  };
}

function dependencies(
  runCursorAgent: AvailabilityOracleDependencies['runCursorAgent'],
): Partial<AvailabilityOracleDependencies> {
  return {
    pathExists: vi.fn(async () => false),
    runCursorAgent,
    runCodex: vi.fn(async () => ({
      ok: false,
      stdout: '',
      stderr: 'not mocked',
    })),
    env: {},
  };
}

describe('validateDispatchMatrixRefs', () => {
  it('passes only oracle options to a non-Cursor structured-target validator', async () => {
    const validateMatrixCell = vi.fn(async () => 'valid' as const);
    const probeCursorSubagentModel = vi.fn(async () => {
      throw new Error('Cursor probe should not run');
    });
    const resolveCursorModelCatalog = vi.fn(async () => {
      throw new Error('Cursor catalog should not run');
    });
    const target = {
      harness: 'codex',
      model: 'gpt-5.6-sol',
      effort: 'xhigh',
    };
    const ref: DispatchMatrixCellRef = {
      provider: 'cursor',
      tier: 'frontier',
      candidateIndex: 0,
      fallbackRouteIndex: 0,
      value: null,
      target,
      path: 'cursor.frontier[0].route[0]',
      source: 'repo-config',
    };

    await expect(
      validateDispatchMatrixRefs(
        [ref],
        createDispatchValidationPassContext({
          cwd: '/repo',
          env: { OAT_TEST: '1' },
          validateMatrixCell,
          probeCursorSubagentModel,
          resolveCursorModelCatalog,
        }),
      ),
    ).resolves.toEqual([
      {
        ref,
        status: 'valid',
        evidence: 'none',
        catalogPresence: null,
        diagnostic: '',
      },
    ]);

    expect(validateMatrixCell).toHaveBeenCalledWith('codex', 'gpt-5.6-sol', {
      cwd: '/repo',
      env: { OAT_TEST: '1' },
      detailed: true,
      target,
    });
    expect(probeCursorSubagentModel).not.toHaveBeenCalled();
    expect(resolveCursorModelCatalog).not.toHaveBeenCalled();
  });

  it('fans one exact candidate probe back to duplicate source refs', async () => {
    const runCursorAgent = vi.fn(async () => ({
      ok: true,
      stdout: 'OAT_CURSOR_SUBAGENT_MODEL_VALID\n',
      stderr: '',
    }));
    const refs = [
      cursorRef('gpt-5.6-terra-xhigh', 'shared.cursor.balanced[0]'),
      cursorRef('gpt-5.6-terra-xhigh', 'local.cursor.balanced[2]'),
    ];

    const results = await validateDispatchMatrixRefs(
      refs,
      createDispatchValidationPassContext({
        cwd: '/repo',
        dependencies: dependencies(runCursorAgent),
      }),
    );

    expect(runCursorAgent).toHaveBeenCalledTimes(1);
    expect(results).toEqual(
      refs.map((ref) => ({
        ref,
        status: 'valid',
        evidence: 'task-probe',
        catalogPresence: null,
        diagnostic: '',
      })),
    );
  });

  it('probes each distinct exact opaque candidate once and shares one catalog', async () => {
    const runCursorAgent = vi.fn(async (args: string[]) => {
      if (args.includes('models')) {
        return {
          ok: true,
          stdout: 'Opaque-A - First\nOpaque-B - Second\n',
          stderr: '',
        };
      }
      return { ok: false, stdout: '', stderr: 'probe inconclusive' };
    });
    const refs = [
      cursorRef('Opaque-A', 'cursor.balanced[0]'),
      cursorRef('Opaque-A', 'cursor.high[0]'),
      cursorRef('Opaque-B', 'cursor.frontier[0]'),
    ];

    const results = await validateDispatchMatrixRefs(
      refs,
      createDispatchValidationPassContext({
        cwd: '/repo',
        dependencies: dependencies(runCursorAgent),
      }),
    );

    const calls = runCursorAgent.mock.calls.map(([args]) => args);
    expect(calls.filter((args) => args.includes('-p'))).toHaveLength(2);
    expect(calls.filter((args) => args.includes('models'))).toHaveLength(1);
    expect(calls.filter((args) => args.includes('--list-models'))).toHaveLength(
      0,
    );
    expect(
      results.map(({ status, evidence, catalogPresence }) => ({
        status,
        evidence,
        catalogPresence,
      })),
    ).toEqual([
      {
        status: 'unvalidated',
        evidence: 'catalog-only',
        catalogPresence: true,
      },
      {
        status: 'unvalidated',
        evidence: 'catalog-only',
        catalogPresence: true,
      },
      {
        status: 'unvalidated',
        evidence: 'catalog-only',
        catalogPresence: true,
      },
    ]);
  });

  it('shares one primary and one fallback catalog call across concurrent requests', async () => {
    const runCursorAgent = vi.fn(async (args: string[]) => {
      if (args.includes('models')) {
        return { ok: false, stdout: '', stderr: 'models unavailable' };
      }
      if (args.includes('--list-models')) {
        return {
          ok: true,
          stdout: 'known-candidate - Known\n',
          stderr: '',
        };
      }
      return { ok: false, stdout: '', stderr: 'probe inconclusive' };
    });
    const context = createDispatchValidationPassContext({
      cwd: '/repo',
      dependencies: dependencies(runCursorAgent),
    });

    const [known, missing] = await Promise.all([
      validateDispatchMatrixRefs(
        [cursorRef('known-candidate', 'cursor.balanced[0]')],
        context,
      ),
      validateDispatchMatrixRefs(
        [cursorRef('missing-candidate', 'cursor.high[0]')],
        context,
      ),
    ]);

    const calls = runCursorAgent.mock.calls.map(([args]) => args);
    expect(calls.filter((args) => args.includes('models'))).toHaveLength(1);
    expect(calls.filter((args) => args.includes('--list-models'))).toHaveLength(
      1,
    );
    expect(known[0]).toMatchObject({
      status: 'unvalidated',
      evidence: 'catalog-only',
      catalogPresence: true,
    });
    expect(missing[0]).toMatchObject({
      status: 'unknown-value',
      evidence: 'catalog-only',
      catalogPresence: false,
    });
  });

  it('memoizes probe and catalog failures for the entire explicit pass', async () => {
    const probeCursorSubagentModel = vi.fn(async () => {
      throw new Error('Task probe failed');
    });
    const resolveCursorModelCatalog = vi.fn(async () => {
      throw new Error('catalog failed');
    });
    const context = createDispatchValidationPassContext({
      cwd: '/repo',
      probeCursorSubagentModel,
      resolveCursorModelCatalog,
    });
    const ref = cursorRef('opaque-value', 'cursor.frontier[0]');

    const [first, second] = await Promise.all([
      validateDispatchMatrixRefs([ref], context),
      validateDispatchMatrixRefs([ref], context),
    ]);

    expect(probeCursorSubagentModel).toHaveBeenCalledTimes(1);
    expect(resolveCursorModelCatalog).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
    expect(first[0]).toMatchObject({
      status: 'unvalidated',
      evidence: 'none',
      catalogPresence: null,
      diagnostic: 'Task probe failed\ncatalog failed',
    });
  });

  it('preserves explicit allow-list availability, evidence, and diagnostics', async () => {
    const runCursorAgent = vi.fn(async () => ({
      ok: false,
      stdout: '',
      stderr:
        'Invalid subagent model rejected. Allowed models: accepted-2.5, composer-2.5',
    }));
    const refs = [
      cursorRef('accepted-2.5', 'cursor.high[0]'),
      cursorRef('rejected-2.5', 'cursor.high[1]'),
    ];

    const results = await validateDispatchMatrixRefs(
      refs,
      createDispatchValidationPassContext({
        cwd: '/repo',
        dependencies: dependencies(runCursorAgent),
      }),
    );

    expect(results[0]).toMatchObject({
      status: 'valid',
      evidence: 'subagent-allow-list',
      catalogPresence: null,
      diagnostic: 'Allowed subagent models: accepted-2.5, composer-2.5.',
    });
    expect(results[1]).toMatchObject({
      status: 'unknown-value',
      evidence: 'subagent-allow-list',
      catalogPresence: null,
      diagnostic:
        'Cursor rejected this model for subagent Task dispatch. Allowed subagent models: accepted-2.5, composer-2.5.',
    });
  });
});
