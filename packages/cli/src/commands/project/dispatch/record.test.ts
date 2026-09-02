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

const target = {
  provider: 'codex',
  modelSelector: 'gpt-5.6-sol',
  effortSelector: 'high',
  reasoningModeSelector: null,
  serviceTierSelector: 'priority',
  selectedRoute: 'native',
};

function rejectionEvent(requestId = 'dispatch-native-1') {
  return {
    kind: 'pre-start-rejection-attestation' as const,
    requestId,
    source: 'provider-wrapper' as const,
    expectedLaunchStatus: 'blocked-before-start' as const,
    rejection: {
      code: 'native-role-unavailable',
      rejectedAt: '2026-09-02T00:00:01.000Z',
      provesNoChildStarted: true as const,
    },
  };
}

function blockedRecord() {
  return genericRecord({
    launch_status: 'blocked-before-start',
    child_outcome: 'not-started',
  });
}

function fallbackInput(fallbackRequestId: string) {
  return {
    record: genericRecord({
      request_id: fallbackRequestId,
      launch_status: 'blocked-before-start' as const,
      child_outcome: 'not-started',
      role_selector: 'generalPurpose',
      selection_reason: 'pre-start-rejection' as const,
    }),
    event: {
      kind: 'fallback-link' as const,
      requestId: fallbackRequestId,
      source: 'provider-wrapper' as const,
      evidence: {
        status: 'fallback-dispatch' as const,
        triggerRequestId: 'dispatch-native-1',
        fallbackRequestId,
        trigger: 'pre-start-rejection' as const,
        fallbackReason: 'Native role rejected before start',
        kind: 'canonical-instruction-fresh-child' as const,
        approximation: true as const,
        preservedTarget: target,
        rejection: {
          source: 'provider-wrapper' as const,
          code: 'native-role-unavailable',
          rejectedAt: '2026-09-02T00:00:01.000Z',
          provesNoChildStarted: true as const,
        },
        roleInstructions: canonicalEvent().evidence,
      },
    },
  };
}

async function seedRejectedTrigger() {
  const projectPath = await mkdtemp(join(tmpdir(), 'oat-dispatch-project-'));
  roots.push(projectPath);
  await writeFile(
    join(projectPath, 'state.md'),
    '---\noat_status: active\n---\n',
  );
  await recordProjectDispatch({
    projectPath,
    input: { record: blockedRecord(), event: canonicalEvent() },
  });
  await recordProjectDispatch({
    projectPath,
    input: { record: blockedRecord(), event: rejectionEvent() },
  });
  return projectPath;
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

  it.each([
    'apiKey',
    'api_key',
    'password',
    'systemPrompt',
    'transcriptBody',
    'accessToken',
    'clientSecret',
    'messageContent',
    'content',
  ])(
    'refuses to persist %s and leaves no journal or temporary file',
    async (key) => {
      const projectPath = await mkdtemp(
        join(tmpdir(), 'oat-dispatch-project-'),
      );
      roots.push(projectPath);
      await writeFile(
        join(projectPath, 'state.md'),
        '---\noat_status: active\n---\n',
      );

      expect(() =>
        parseDispatchRecordInput({
          record: genericRecord({ payload: { nested: { [key]: 'value' } } }),
          event: canonicalEvent(),
        }),
      ).toThrow(/sensitive dispatch content/i);
      await expect(
        recordProjectDispatch({
          projectPath,
          input: {
            record: genericRecord({ payload: { nested: { [key]: 'value' } } }),
            event: canonicalEvent(),
          },
        }),
      ).rejects.toThrow(/sensitive dispatch content/i);
      await expect(
        recordProjectDispatch({
          projectPath,
          input: {
            record: genericRecord(),
            event: { ...canonicalEvent(), [key]: 'value' },
          },
        }),
      ).rejects.toThrow(/sensitive dispatch content/i);

      await expect(
        readdir(join(projectPath, 'dispatch')),
      ).rejects.toMatchObject({ code: 'ENOENT' });
      expect(await readdir(projectPath)).toEqual(['state.md']);
    },
  );

  it('persists exactly one fallback when a second claim interleaves deterministically', async () => {
    const projectPath = await seedRejectedTrigger();

    let winner: Awaited<ReturnType<typeof recordProjectDispatch>> | null = null;
    await expect(
      recordProjectDispatch({
        projectPath,
        input: fallbackInput('fallback-a'),
        raceBarriers: {
          // `fallback-a` has already read the trigger revision; `fallback-b`
          // now claims and publishes before `fallback-a` takes the lock.
          afterRead: async () => {
            winner = await recordProjectDispatch({
              projectPath,
              input: fallbackInput('fallback-b'),
            });
          },
        },
      }),
    ).rejects.toThrow(/changed since it was read|already has a fallback/i);

    expect(winner).toMatchObject({ status: 'persisted', created: true });
    expect((await readdir(join(projectPath, 'dispatch'))).sort()).toEqual([
      'dispatch-native-1.json',
      'fallback-b.json',
    ]);
    const trigger = JSON.parse(
      await readFile(
        join(projectPath, 'dispatch', 'dispatch-native-1.json'),
        'utf8',
      ),
    );
    expect(trigger.oat.fallbackClaim).toMatchObject({
      fallbackRequestId: 'fallback-b',
    });
    expect(await readdir(projectPath)).not.toContain('.dispatch-lock');
  });

  it('persists exactly one fallback under real concurrency', async () => {
    const projectPath = await seedRejectedTrigger();

    const results = await Promise.allSettled([
      recordProjectDispatch({
        projectPath,
        input: fallbackInput('fallback-a'),
      }),
      recordProjectDispatch({
        projectPath,
        input: fallbackInput('fallback-b'),
      }),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    const names = (await readdir(join(projectPath, 'dispatch'))).sort();
    expect(names).toHaveLength(2);
    expect(names).toContain('dispatch-native-1.json');
  });

  it('fails a stale concurrent update instead of losing the winning event', async () => {
    const projectPath = await seedRejectedTrigger();
    const path = join(projectPath, 'dispatch', 'dispatch-native-1.json');

    await expect(
      recordProjectDispatch({
        projectPath,
        input: {
          record: blockedRecord(),
          event: {
            kind: 'runtime-observation',
            requestId: 'dispatch-native-1',
            source: 'runtime-observer',
            observation: { status: 'not-reported' },
          },
        },
        raceBarriers: {
          afterRead: async () => {
            await recordProjectDispatch({
              projectPath,
              input: {
                record: blockedRecord(),
                event: {
                  kind: 'runtime-observation',
                  requestId: 'dispatch-native-1',
                  source: 'runtime-observer',
                  observation: {
                    status: 'reported',
                    provider: 'codex',
                    source: 'codex-session',
                    observedAt: '2026-09-02T00:00:02.000Z',
                    match: 'matching',
                  },
                },
              },
            });
          },
        },
      }),
    ).rejects.toThrow(/changed since it was read/i);

    const final = JSON.parse(await readFile(path, 'utf8'));
    expect(final.oat.preStartRejection).toMatchObject({
      code: 'native-role-unavailable',
    });
    expect(final.oat.runtimeObservation).toMatchObject({
      status: 'reported',
      match: 'matching',
    });
    expect(await readdir(projectPath)).not.toContain('.dispatch-lock');
  });

  it('preserves both events when two different events race for one request', async () => {
    const projectPath = await seedRejectedTrigger();
    const path = join(projectPath, 'dispatch', 'dispatch-native-1.json');

    const results = await Promise.allSettled([
      recordProjectDispatch({
        projectPath,
        input: {
          record: blockedRecord(),
          event: {
            kind: 'runtime-observation',
            requestId: 'dispatch-native-1',
            source: 'runtime-observer',
            observation: {
              status: 'reported',
              provider: 'codex',
              source: 'codex-session',
              observedAt: '2026-09-02T00:00:02.000Z',
              match: 'matching',
            },
          },
        },
      }),
      recordProjectDispatch({
        projectPath,
        input: { record: blockedRecord(), event: canonicalEvent() },
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    const final = JSON.parse(await readFile(path, 'utf8'));
    // Whatever the interleaving, no accepted write may erase evidence that was
    // already published.
    expect(final.oat.preStartRejection).toMatchObject({
      code: 'native-role-unavailable',
    });
    expect(final.oat.canonicalRole).toMatchObject({ status: 'resolved' });
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
