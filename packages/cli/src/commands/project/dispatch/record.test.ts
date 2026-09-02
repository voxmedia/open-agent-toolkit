import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { GenericDispatchRecord } from '@providers/identity/generic-dispatch-record';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createProjectDispatchCommand } from './index';
import { parseDispatchRecordInput, recordProjectDispatch } from './record';

const roots: string[] = [];

function genericRecord(
  overrides: Partial<GenericDispatchRecord> = {},
): GenericDispatchRecord {
  return {
    request_id: 'dispatch-native-1',
    caller: 'oat-project-implement',
    scope: 'p06',
    objective: 'Implement dispatch provenance',
    action: 'implementation',
    role_name: 'oat-phase-implementer',
    role_class: 'implementation',
    provider: 'codex',
    dispatch_context: 'root-native',
    dispatch_policy: 'high',
    dispatch_ceiling: 'high',
    catalog_snapshot: {
      id: 'catalog-1',
      source: 'tool-schema',
      observed_at: '2026-09-02T00:00:00.000Z',
    },
    authority: 'phase-files',
    role_selector: 'oat-phase-implementer-gpt-5-6-sol-high',
    model_selector: 'gpt-5.6-sol',
    model_selector_granularity: 'exact-native-model-choice',
    effort_selector: 'high',
    reasoning_mode_selector: null,
    service_tier_selector: 'priority',
    selection_source: 'policy-resolved',
    candidates_considered: ['oat-phase-implementer-gpt-5-6-sol-high'],
    selection_reason: 'native-catalog',
    selected_route: 'native',
    deadline_seconds: 600,
    retry_limit: 0,
    payload: { task: 'p06' },
    launch_status: 'accepted',
    child_outcome: 'completed',
    configured_invocation_evidence: ['dispatch ceiling resolver'],
    runtime_confirmation: 'not-reported',
    diagnostics: [],
    continuation_events: [],
    ...overrides,
  };
}

function canonicalEvent(requestId = 'dispatch-native-1') {
  return {
    kind: 'canonical-role-resolution' as const,
    requestId,
    source: 'canonical-role-resolver' as const,
    evidence: {
      status: 'resolved' as const,
      dependency: 'workflows',
      canonicalRole: 'oat-phase-implementer',
      tier: 'user' as const,
      validation: 'direct-canonical' as const,
      canonicalPath: '<user>/agents/oat-phase-implementer.md',
      selectedPath: '<user>/agents/oat-phase-implementer.md',
      roleVersion: '1.2.3',
      contentDigest: `sha256:${'a'.repeat(64)}`,
      candidateMisses: [],
    },
  };
}

afterEach(async () => {
  await Promise.all(
    roots.map((root) => rm(root, { recursive: true, force: true })),
  );
  roots.length = 0;
});

describe('recordProjectDispatch', () => {
  it('creates and updates one request journal atomically', async () => {
    const projectPath = await mkdtemp(join(tmpdir(), 'oat-dispatch-project-'));
    roots.push(projectPath);
    await writeFile(
      join(projectPath, 'state.md'),
      '---\noat_status: active\n---\n',
    );
    const record = genericRecord();

    const created = await recordProjectDispatch({
      projectPath,
      input: { record, event: canonicalEvent() },
    });
    expect(created).toMatchObject({ status: 'persisted', created: true });
    expect(created.record.oat.canonicalRole).toMatchObject({
      status: 'resolved',
    });

    const updated = await recordProjectDispatch({
      projectPath,
      input: {
        record,
        event: {
          kind: 'runtime-observation',
          requestId: record.request_id,
          source: 'runtime-observer',
          observation: { status: 'not-reported' },
        },
      },
    });
    expect(updated).toMatchObject({ status: 'persisted', created: false });
    expect(updated.record.oat.canonicalRole).toEqual(
      created.record.oat.canonicalRole,
    );
    expect(await readdir(join(projectPath, 'dispatch'))).toEqual([
      'dispatch-native-1.json',
    ]);
  });

  it('preserves a prior record when generic fields are redefined', async () => {
    const projectPath = await mkdtemp(join(tmpdir(), 'oat-dispatch-project-'));
    roots.push(projectPath);
    await recordProjectDispatch({
      projectPath,
      input: { record: genericRecord(), event: canonicalEvent() },
    });
    const path = join(projectPath, 'dispatch', 'dispatch-native-1.json');
    const before = await readFile(path, 'utf8');

    await expect(
      recordProjectDispatch({
        projectPath,
        input: {
          record: genericRecord({ model_selector: 'different-model' }),
          event: canonicalEvent(),
        },
      }),
    ).rejects.toThrow(/generic fields/i);
    await expect(readFile(path, 'utf8')).resolves.toBe(before);
  });

  it('validates without persistence outside a project', async () => {
    const result = await recordProjectDispatch({
      projectPath: null,
      input: { record: genericRecord(), event: canonicalEvent() },
    });
    expect(result).toMatchObject({ status: 'validated-only', path: null });
  });

  it('rejects request traversal and sensitive stdin-shaped input', () => {
    expect(() =>
      parseDispatchRecordInput({
        record: genericRecord({ request_id: '../escape' }),
        event: canonicalEvent('../escape'),
      }),
    ).toThrow(/request_id/i);
    expect(() =>
      parseDispatchRecordInput({
        record: genericRecord(),
        event: {
          ...canonicalEvent(),
          prompt: 'do not persist me',
        },
      }),
    ).toThrow(/sensitive dispatch content/i);
  });

  it('does not adopt a pre-existing invalid journal', async () => {
    const projectPath = await mkdtemp(join(tmpdir(), 'oat-dispatch-project-'));
    roots.push(projectPath);
    await mkdir(join(projectPath, 'dispatch'));
    await writeFile(
      join(projectPath, 'dispatch', 'dispatch-native-1.json'),
      '{"unexpected":true}\n',
    );
    await expect(
      recordProjectDispatch({
        projectPath,
        input: { record: genericRecord(), event: canonicalEvent() },
      }),
    ).rejects.toThrow();
    await expect(
      readFile(join(projectPath, 'dispatch', 'dispatch-native-1.json'), 'utf8'),
    ).resolves.toBe('{"unexpected":true}\n');
  });

  it('reads one complete record and event from stdin', async () => {
    const json = vi.fn();
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      const command = createProjectDispatchCommand({
        buildCommandContext: () => ({
          scope: 'all',
          dryRun: false,
          verbose: false,
          json: true,
          cwd: process.cwd(),
          home: process.cwd(),
          interactive: false,
          logger: {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            success: vi.fn(),
            json,
          },
        }),
        resolveProjectRoot: async () => process.cwd(),
        readFile: async () => {
          throw new Error('event file should not be read');
        },
        readStdin: async () =>
          JSON.stringify({ record: genericRecord(), event: canonicalEvent() }),
      });
      await command.parseAsync(['record', '--event-file', '-'], {
        from: 'user',
      });

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'validated-only', path: null }),
      );
      expect(process.exitCode).toBe(0);
    } finally {
      process.exitCode = previousExitCode;
    }
  });
});
