import { createHash } from 'node:crypto';
import {
  chmod,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  MAIN_SESSION_TRANSCRIPT,
  SIDECHAIN_TRANSCRIPT,
} from '@providers/identity/claude-runtime-observation.fixtures';
import {
  DEPTH_1_ROLLOUT,
  DEPTH_2_ROLLOUT,
  ROOT_ROLLOUT,
} from '@providers/identity/codex-runtime-observation.fixtures';
import type { GenericDispatchRecord } from '@providers/identity/generic-dispatch-record';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createProjectDispatchCommand } from './index';
import {
  parseDispatchRecordInput,
  recordProjectDispatch,
  redactDispatchMessage,
} from './record';

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

/** Request IDs present in the append-only journal, latest revision per ID. */
async function journalRequests(projectPath: string): Promise<string[]> {
  const names = await readdir(join(projectPath, 'dispatch'));
  return [
    ...new Set(
      names
        .filter((name) => name.endsWith('.json'))
        .map((name) => name.slice(0, -'.json'.length).split('@')[0]),
    ),
  ].sort();
}

async function latestRecord(projectPath: string, requestId: string) {
  const names = (await readdir(join(projectPath, 'dispatch')))
    .filter(
      (name) =>
        name.endsWith('.json') &&
        name.slice(0, -'.json'.length).split('@')[0] === requestId,
    )
    .sort();
  const newest = names[names.length - 1];
  return JSON.parse(
    await readFile(join(projectPath, 'dispatch', newest), 'utf8'),
  );
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
    // Append-only: the update publishes a new revision instead of replacing
    // the first one, which stays byte-identical.
    expect((await readdir(join(projectPath, 'dispatch'))).sort()).toEqual([
      'dispatch-native-1.json',
      'dispatch-native-1@0002.json',
    ]);
    expect(created.path).toBe('dispatch/dispatch-native-1.json');
    expect(updated.path).toBe('dispatch/dispatch-native-1@0002.json');
    expect(
      JSON.parse(
        await readFile(
          join(projectPath, 'dispatch', 'dispatch-native-1.json'),
          'utf8',
        ),
      ).oat.runtimeObservation,
    ).toEqual({ status: 'not-reported' });
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
    'instructions',
    'systemInstructions',
    'pwd',
    'privKey',
    'sshKey',
    'creds',
    'oauth',
    'sessionId',
    '\u0430piKey',
    '\uff30\uff21\uff33\uff33\uff37\uff2f\uff32\uff24',
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
    ).rejects.toThrow(
      /concurrent update was preserved|already has a fallback/i,
    );

    expect(winner).toMatchObject({ status: 'persisted', created: true });
    expect(await journalRequests(projectPath)).toEqual([
      'dispatch-native-1',
      'fallback-b',
    ]);
    const trigger = await latestRecord(projectPath, 'dispatch-native-1');
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
    const requests = await journalRequests(projectPath);
    expect(requests).toHaveLength(2);
    expect(requests).toContain('dispatch-native-1');
  });

  it('fails a stale concurrent update instead of losing the winning event', async () => {
    const projectPath = await seedRejectedTrigger();

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
    ).rejects.toThrow(/concurrent update was preserved/i);

    const final = await latestRecord(projectPath, 'dispatch-native-1');
    expect(final.oat.preStartRejection).toMatchObject({
      code: 'native-role-unavailable',
    });
    expect(final.oat.runtimeObservation).toMatchObject({
      status: 'reported',
      // Derived, not caller-asserted: this observation reports no comparable
      // axis, so it can only be `not-comparable`.
      match: 'not-comparable',
    });
    expect(await readdir(projectPath)).not.toContain('.dispatch-lock');
  });

  it('preserves both events when two different events race for one request', async () => {
    const projectPath = await seedRejectedTrigger();

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
    const final = await latestRecord(projectPath, 'dispatch-native-1');
    // Whatever the interleaving, no accepted write may erase evidence that was
    // already published.
    expect(final.oat.preStartRejection).toMatchObject({
      code: 'native-role-unavailable',
    });
    expect(final.oat.canonicalRole).toMatchObject({ status: 'resolved' });
  });

  it('never leaks an absolute path when a stale write loses the revision race', async () => {
    const projectPath = await seedRejectedTrigger();

    const error = await recordProjectDispatch({
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
            input: { record: blockedRecord(), event: canonicalEvent() },
          });
        },
      },
    }).catch((raised: Error) => raised);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(
      /concurrent update was preserved/i,
    );
    expect((error as Error).message).not.toContain(projectPath);
    expect((error as Error).message).not.toContain(tmpdir());
  });

  it('refuses to persist free-form prompt text smuggled through evidence arrays', async () => {
    const projectPath = await mkdtemp(join(tmpdir(), 'oat-dispatch-project-'));
    roots.push(projectPath);
    await writeFile(
      join(projectPath, 'state.md'),
      '---\noat_status: active\n---\n',
    );

    for (const field of [
      'continuation_events',
      'configured_invocation_evidence',
      'diagnostics',
    ] as const) {
      await expect(
        recordProjectDispatch({
          projectPath,
          input: {
            record: genericRecord({
              [field]:
                field === 'diagnostics'
                  ? ['SYSTEM: you are the OAT reviewer. '.repeat(300)]
                  : [
                      {
                        note: 'SYSTEM: you are the OAT reviewer. '.repeat(300),
                      },
                    ],
            }),
            event: canonicalEvent(),
          },
        }),
      ).rejects.toThrow(/closed control projection/i);
    }

    await expect(readdir(join(projectPath, 'dispatch'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect(await readdir(projectPath)).toEqual(['state.md']);
  });

  it('reports a redacted relative path when another writer holds the lock', async () => {
    const projectPath = await mkdtemp(join(tmpdir(), 'oat-dispatch-project-'));
    roots.push(projectPath);
    await writeFile(
      join(projectPath, 'state.md'),
      '---\noat_status: active\n---\n',
    );
    const lock = join(projectPath, '.dispatch-lock');
    await mkdir(lock);
    await writeFile(
      join(lock, 'holder.json'),
      `${JSON.stringify({
        hostId: createHash('sha256')
          .update(hostname(), 'utf8')
          .digest('hex')
          .slice(0, 16),
        pid: process.pid,
        processStartedAt: Date.now(),
        acquiredAt: new Date().toISOString(),
      })}\n`,
      'utf8',
    );

    const error = await recordProjectDispatch({
      projectPath,
      input: { record: genericRecord(), event: canonicalEvent() },
    }).catch((raised: Error) => raised);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('.dispatch-lock');
    expect((error as Error).message).not.toContain(projectPath);
    expect((error as Error).message).not.toContain(tmpdir());
    await expect(readdir(join(projectPath, 'dispatch'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  }, 20_000);

  it('redacts a damaged journal directory instead of leaking its absolute path', async () => {
    const projectPath = await mkdtemp(join(tmpdir(), 'oat-dispatch-project-'));
    roots.push(projectPath);
    await writeFile(
      join(projectPath, 'state.md'),
      '---\noat_status: active\n---\n',
    );
    // `dispatch` occupied by a regular file: readdir raises ENOTDIR.
    await writeFile(join(projectPath, 'dispatch'), 'not a directory', 'utf8');

    const error = await recordProjectDispatch({
      projectPath,
      input: { record: genericRecord(), event: canonicalEvent() },
    }).catch((raised: Error) => raised);

    expect(error).toMatchObject({ code: 'ENOTDIR' });
    expect((error as Error).message).toContain('dispatch/');
    expect((error as Error).message).not.toContain(projectPath);
    expect((error as Error).message).not.toContain(tmpdir());
  });

  it('redacts an unreadable revision file instead of leaking its absolute path', async () => {
    const projectPath = await mkdtemp(join(tmpdir(), 'oat-dispatch-project-'));
    roots.push(projectPath);
    await writeFile(
      join(projectPath, 'state.md'),
      '---\noat_status: active\n---\n',
    );
    await recordProjectDispatch({
      projectPath,
      input: { record: genericRecord(), event: canonicalEvent() },
    });
    const published = join(projectPath, 'dispatch', 'dispatch-native-1.json');
    await chmod(published, 0o000);
    try {
      const error = await recordProjectDispatch({
        projectPath,
        input: { record: genericRecord(), event: canonicalEvent() },
      }).catch((raised: Error) => raised);

      expect(error).toMatchObject({ code: 'EACCES' });
      expect((error as Error).message).toContain(
        'dispatch/dispatch-native-1.json',
      );
      expect((error as Error).message).not.toContain(projectPath);
      expect((error as Error).message).not.toContain(tmpdir());
    } finally {
      await chmod(published, 0o644);
    }
  });

  it('scrubs absolute paths at the command boundary regardless of producer', () => {
    expect(
      redactDispatchMessage(
        "ENOTDIR: not a directory, scandir '/home/u/repo/proj/dispatch'",
        { project: '/home/u/repo/proj', repo: '/home/u/repo', home: '/home/u' },
      ),
    ).toBe("ENOTDIR: not a directory, scandir '<project>/dispatch'");
    // A producer this boundary has never seen still cannot leak.
    expect(
      redactDispatchMessage('EACCES: permission denied, open /var/x/y/z.json'),
    ).toBe('EACCES: permission denied, open <redacted-path>');
    expect(redactDispatchMessage('Another writer holds .dispatch-lock.')).toBe(
      'Another writer holds .dispatch-lock.',
    );
    expect(
      redactDispatchMessage('Journal revision dispatch/request-1.json exists.'),
    ).toBe('Journal revision dispatch/request-1.json exists.');
  });

  it('emits no absolute path through the JSON command surface', async () => {
    const projectPath = await mkdtemp(join(tmpdir(), 'oat-dispatch-project-'));
    roots.push(projectPath);
    await writeFile(
      join(projectPath, 'state.md'),
      '---\noat_status: active\n---\n',
    );
    await writeFile(join(projectPath, 'dispatch'), 'not a directory', 'utf8');

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
          cwd: projectPath,
          home: projectPath,
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
        resolveProjectRoot: async () => projectPath,
        readFile: async () => {
          throw new Error('event file should not be read');
        },
        readStdin: async () =>
          JSON.stringify({ record: genericRecord(), event: canonicalEvent() }),
      });
      await command.parseAsync(
        ['record', '--project', '.', '--event-file', '-'],
        { from: 'user' },
      );

      const payload = json.mock.calls.at(-1)?.[0] as { message?: string };
      expect(payload.message).toBeDefined();
      expect(payload.message).not.toContain(projectPath);
      expect(payload.message).not.toContain(tmpdir());
    } finally {
      process.exitCode = previousExitCode;
    }
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

describe('runtime observation integration', () => {
  // Real Codex 0.152.1 depth-1 subagent shape. Note that no real turn_context
  // carries a service tier, so that axis stays unreported.
  const codexEntries = [
    {
      ordinal: 0,
      type: 'session_meta',
      payload: {
        session_id: '01a06402-2861-7421-821a-137187a03f7f',
        id: '01a06402-4d66-74f1-a706-f69cde1516f6',
        parent_thread_id: '01a06402-2861-7421-821a-137187a03f7f',
        thread_source: 'subagent',
        agent_role: 'oat-phase-implementer',
        agent_path: '/root/phase_7',
        source: {
          subagent: {
            thread_spawn: {
              parent_thread_id: '01a06402-2861-7421-821a-137187a03f7f',
              depth: 1,
              agent_path: '/root/phase_7',
              agent_role: 'oat-phase-implementer',
            },
          },
        },
      },
    },
    {
      ordinal: 7,
      type: 'turn_context',
      payload: { model: 'gpt-5.6-sol', effort: 'high' },
    },
  ];

  function observationEvent(entries: readonly unknown[], provider = 'codex') {
    return {
      kind: 'runtime-observation' as const,
      requestId: 'dispatch-native-1',
      source: 'runtime-observer' as const,
      metadata: {
        provider,
        observedAt: '2026-09-02T12:00:00.000Z',
        entries,
      },
    };
  }

  async function record(
    entries: readonly unknown[],
    overrides: Partial<GenericDispatchRecord> = {},
    provider = 'codex',
  ) {
    const projectPath = await mkdtemp(join(tmpdir(), 'oat-dispatch-project-'));
    roots.push(projectPath);
    const result = await recordProjectDispatch({
      projectPath,
      input: {
        record: genericRecord(overrides),
        event: observationEvent(entries, provider),
      },
    });
    return { projectPath, result };
  }

  it('records a matching observation without touching configured evidence', async () => {
    const configured = genericRecord();
    const { result } = await record(codexEntries);

    expect(result.record.oat.runtimeObservation).toEqual({
      status: 'reported',
      provider: 'codex',
      childLineage: 'depth-1',
      role: 'oat-phase-implementer',
      model: 'gpt-5.6-sol',
      effort: 'high',
      source: 'codex-rollout-metadata',
      observedAt: '2026-09-02T12:00:00.000Z',
      match: 'matching',
      comparedAxes: ['role', 'model', 'effort'],
    });
    const { oat: _oat, ...generic } = result.record;
    expect(generic).toEqual(configured);
    expect(result.record.launch_status).toBe('accepted');
    expect(result.record.runtime_confirmation).toBe('not-reported');
  });

  it('records a mismatch as evidence without changing launch or controls', async () => {
    const { result } = await record([
      {
        ordinal: 0,
        type: 'session_meta',
        payload: {
          id: '01a06402-2861-7421-821a-137187a03f7f',
          thread_source: 'user',
          source: 'exec',
        },
      },
      {
        ordinal: 7,
        type: 'turn_context',
        payload: { model: 'gpt-5.6-terra' },
      },
    ]);

    expect(result.record.oat.runtimeObservation).toMatchObject({
      status: 'reported',
      match: 'mismatching',
      model: 'gpt-5.6-terra',
    });
    // A post-acceptance mismatch is not a fallback trigger.
    expect(result.record.oat.fallback).toEqual({
      status: 'not-applicable',
      reason: 'No fallback recorded.',
    });
    expect(result.record.model_selector).toBe('gpt-5.6-sol');
    expect(result.record.launch_status).toBe('accepted');
    expect(result.record.child_outcome).toBe('completed');
  });

  it('records missing metadata and Cursor as not-reported', async () => {
    const missing = await record([]);
    expect(missing.result.record.oat.runtimeObservation).toEqual({
      status: 'not-reported',
    });

    const cursor = await record(
      codexEntries,
      { provider: 'cursor', role_selector: 'generalPurpose' },
      'cursor',
    );
    expect(cursor.result.record.oat.runtimeObservation).toEqual({
      status: 'not-reported',
    });
    expect(JSON.stringify(cursor.result.record.oat)).not.toContain(
      'gpt-5.6-sol',
    );
  });

  it('reports configured and observed evidence as separate result fields', async () => {
    const { result } = await record(codexEntries);
    expect(result.runtimeIdentity).toEqual({
      configured: {
        roleName: 'oat-phase-implementer',
        roleSelector: 'oat-phase-implementer-gpt-5-6-sol-high',
        model: 'gpt-5.6-sol',
        effort: 'high',
        serviceTier: 'priority',
      },
      observed: {
        provider: 'codex',
        source: 'codex-rollout-metadata',
        observedAt: '2026-09-02T12:00:00.000Z',
        childLineage: 'depth-1',
        role: 'oat-phase-implementer',
        model: 'gpt-5.6-sol',
        effort: 'high',
        serviceTier: null,
      },
      match: 'matching',
      comparedAxes: ['role', 'model', 'effort'],
      status: 'reported',
    });

    const absent = await record([]);
    expect(absent.result.runtimeIdentity).toMatchObject({
      observed: null,
      match: null,
      comparedAxes: [],
      status: 'not-reported',
    });
    expect(absent.result.runtimeIdentity.configured.model).toBe('gpt-5.6-sol');
  });

  it('refuses an ambiguous or malformed observation event', () => {
    expect(() =>
      parseDispatchRecordInput({
        record: genericRecord(),
        event: {
          ...observationEvent(codexEntries),
          observation: { status: 'not-reported' },
        },
      }),
    ).toThrow(/observation or metadata/i);
    expect(() =>
      parseDispatchRecordInput({
        record: genericRecord(),
        event: {
          ...observationEvent(codexEntries),
          metadata: {
            provider: 'codex',
            observedAt: '2026-09-02T12:00:00.000Z',
            entries: codexEntries,
            transcript: 'the whole conversation',
          },
        },
      }),
    ).toThrow();
  });

  it.each([
    ['codex', 'ROOT_ROLLOUT', ROOT_ROLLOUT],
    ['codex', 'DEPTH_1_ROLLOUT', DEPTH_1_ROLLOUT],
    ['codex', 'DEPTH_2_ROLLOUT', DEPTH_2_ROLLOUT],
    ['claude', 'MAIN_SESSION_TRANSCRIPT', MAIN_SESSION_TRANSCRIPT],
    ['claude', 'SIDECHAIN_TRANSCRIPT', SIDECHAIN_TRANSCRIPT],
  ])(
    'drives the real %s fixture %s through the durable-write boundary',
    async (provider, _name, entries) => {
      // The captured shapes must survive the boundary they cross in
      // production. Testing the parsers alone let a projection that the
      // sensitive-content boundary refuses ship twice.
      const projectPath = await mkdtemp(
        join(tmpdir(), 'oat-dispatch-project-'),
      );
      roots.push(projectPath);
      const result = await recordProjectDispatch({
        projectPath,
        input: {
          record: genericRecord({ provider }),
          event: {
            kind: 'runtime-observation',
            requestId: 'dispatch-native-1',
            source: 'runtime-observer',
            metadata: {
              provider,
              observedAt: '2026-09-02T12:00:00.000Z',
              entries,
            },
          },
        },
      });
      expect(result.status).toBe('persisted');
      expect(result.record.oat.runtimeObservation).toMatchObject({
        status: 'reported',
      });
      await expect(
        readFile(
          join(projectPath, 'dispatch', 'dispatch-native-1.json'),
          'utf8',
        ),
      ).resolves.toContain('runtimeObservation');
    },
  );

  it('refuses a second differing observation and leaves the journal intact', async () => {
    const { projectPath } = await record(codexEntries);
    const path = join(projectPath, 'dispatch', 'dispatch-native-1.json');
    const before = await readFile(path, 'utf8');
    const revisionsBefore = (
      await readdir(join(projectPath, 'dispatch'))
    ).sort();

    await expect(
      recordProjectDispatch({
        projectPath,
        input: {
          record: genericRecord(),
          event: {
            kind: 'runtime-observation',
            requestId: 'dispatch-native-1',
            source: 'runtime-observer',
            metadata: {
              provider: 'codex',
              observedAt: '2026-09-02T13:00:00.000Z',
              entries: codexEntries,
            },
          },
        },
      }),
    ).rejects.toThrow(/immutable once reported/i);

    await expect(readFile(path, 'utf8')).resolves.toBe(before);
    expect((await readdir(join(projectPath, 'dispatch'))).sort()).toEqual(
      revisionsBefore,
    );
  });

  it('degrades an over-bound envelope instead of losing the record', async () => {
    const projectPath = await mkdtemp(join(tmpdir(), 'oat-dispatch-project-'));
    roots.push(projectPath);
    const result = await recordProjectDispatch({
      projectPath,
      input: {
        record: genericRecord(),
        event: {
          kind: 'runtime-observation',
          requestId: 'dispatch-native-1',
          source: 'runtime-observer',
          metadata: {
            provider: 'codex',
            observedAt: '2026-09-02T12:00:00.000Z',
            entries: Array.from({ length: 20_000 }, () => ({
              type: 'event_msg',
            })),
          },
        },
      },
    });
    // The observation layer is optional; a size violation on it must never
    // destroy the mandatory record write.
    expect(result.status).toBe('persisted');
    expect(result.record.oat.runtimeObservation).toEqual({
      status: 'not-reported',
    });
  });

  it('refuses a reported observation for a provider with no capability', async () => {
    await expect(
      recordProjectDispatch({
        projectPath: null,
        input: {
          record: genericRecord({
            provider: 'cursor',
            role_selector: 'generalPurpose',
          }),
          event: {
            kind: 'runtime-observation',
            requestId: 'dispatch-native-1',
            source: 'runtime-observer',
            observation: {
              status: 'reported',
              provider: 'cursor',
              model: 'cursor-composer-2',
              source: 'cursor-transcript-metadata',
              observedAt: '2026-09-02T12:00:00.000Z',
              match: 'matching',
            },
          },
        },
      }),
    ).rejects.toThrow(/capabilit/i);
  });

  it('never lets a caller borrow a parser source string', async () => {
    const result = await recordProjectDispatch({
      projectPath: null,
      input: {
        record: genericRecord(),
        event: {
          kind: 'runtime-observation',
          requestId: 'dispatch-native-1',
          source: 'runtime-observer',
          observation: {
            status: 'reported',
            provider: 'codex',
            model: 'gpt-5.6-sol',
            source: 'codex-rollout-metadata',
            observedAt: '2026-09-02T12:00:00.000Z',
            match: 'matching',
          },
        },
      },
    });
    // Source states provenance, so it is derived from the path that produced
    // the evidence rather than accepted from the caller.
    expect(result.record.oat.runtimeObservation).toMatchObject({
      status: 'reported',
      source: 'caller-asserted',
    });
  });

  it('accepts a raw captured rollout and stores none of its content', async () => {
    // Real rollouts carry `session_id` (which classifies as sensitive),
    // `base_instructions`, and conversation entries. The allowlist projection
    // is the guarantee: they are dropped before anything is asserted or
    // persisted, so a caller never has to hand-roll a stripper.
    const { projectPath, result } = await record([
      {
        ordinal: 0,
        type: 'session_meta',
        payload: {
          session_id: '01a06402-2861-7421-821a-137187a03f7f',
          id: '01a06402-4d66-74f1-a706-f69cde1516f6',
          parent_thread_id: '01a06402-2861-7421-821a-137187a03f7f',
          thread_source: 'subagent',
          agent_role: 'oat-phase-implementer',
          agent_path: '/root/phase_7',
          base_instructions: 'SECRET-SYSTEM-PROMPT',
          cwd: '/Users/someone/secret-workspace',
          git: { repository_url: 'git@example.com:private/repo.git' },
          source: {
            subagent: {
              thread_spawn: {
                parent_thread_id: '01a06402-2861-7421-821a-137187a03f7f',
                depth: 1,
                agent_path: '/root/phase_7',
                agent_role: 'oat-phase-implementer',
              },
            },
          },
        },
      },
      {
        ordinal: 3,
        type: 'response_item',
        payload: { content: 'SECRET-USER-MESSAGE' },
      },
      {
        ordinal: 7,
        type: 'turn_context',
        payload: {
          model: 'gpt-5.6-sol',
          effort: 'high',
          cwd: '/Users/someone/secret-workspace',
        },
      },
    ]);

    expect(result.record.oat.runtimeObservation).toMatchObject({
      status: 'reported',
      childLineage: 'depth-1',
      role: 'oat-phase-implementer',
      model: 'gpt-5.6-sol',
    });
    const journal = await readFile(
      join(projectPath, 'dispatch', 'dispatch-native-1.json'),
      'utf8',
    );
    for (const secret of [
      'SECRET-SYSTEM-PROMPT',
      'SECRET-USER-MESSAGE',
      '/Users/someone/secret-workspace',
      'git@example.com',
      'base_instructions',
      'session_id',
      'entries',
    ]) {
      expect(journal, secret).not.toContain(secret);
    }
  });

  it('drops a Claude result answer instead of merely ignoring it', async () => {
    const projectPath = await mkdtemp(join(tmpdir(), 'oat-dispatch-project-'));
    roots.push(projectPath);
    const result = await recordProjectDispatch({
      projectPath,
      input: {
        record: genericRecord({
          provider: 'claude',
          model_selector: 'claude-opus-5',
          role_selector: 'oat-phase-implementer',
          service_tier_selector: 'standard',
        }),
        event: {
          kind: 'runtime-observation',
          requestId: 'dispatch-native-1',
          source: 'runtime-observer',
          metadata: {
            provider: 'claude',
            observedAt: '2026-09-02T12:00:00.000Z',
            entries: [
              {
                type: 'system',
                subtype: 'init',
                session_id: 'sess-claude-1',
                model: 'claude-opus-5',
                service_tier: 'standard',
                agent: 'oat-phase-implementer',
              },
              {
                type: 'result',
                subtype: 'success',
                result: 'SECRET-ASSISTANT-ANSWER in full prose form.',
                modelUsage: { 'claude-opus-5': { serviceTier: 'standard' } },
              },
            ],
          },
        },
      },
    });

    expect(result.record.oat.runtimeObservation).toMatchObject({
      status: 'reported',
      provider: 'claude',
      model: 'claude-opus-5',
    });
    expect(JSON.stringify(result.record)).not.toContain(
      'SECRET-ASSISTANT-ANSWER',
    );
    const journal = await readFile(
      join(projectPath, 'dispatch', 'dispatch-native-1.json'),
      'utf8',
    );
    expect(journal).not.toContain('SECRET-ASSISTANT-ANSWER');
  });

  it('recomputes a caller-asserted match instead of trusting it', () => {
    // A caller cannot declare agreement it does not have: match is derived at
    // the durable-write boundary from the observation's own axes.
    const parsed = parseDispatchRecordInput({
      record: genericRecord(),
      event: {
        kind: 'runtime-observation',
        requestId: 'dispatch-native-1',
        source: 'runtime-observer',
        observation: {
          status: 'reported',
          provider: 'codex',
          model: 'wrong-model',
          source: 'attacker',
          observedAt: '2026-09-02T12:00:00.000Z',
          match: 'matching',
        },
      },
    });
    expect(parsed.event).toMatchObject({
      observation: { match: 'mismatching', model: 'wrong-model' },
    });

    const agreeing = parseDispatchRecordInput({
      record: genericRecord(),
      event: {
        kind: 'runtime-observation',
        requestId: 'dispatch-native-1',
        source: 'runtime-observer',
        observation: {
          status: 'reported',
          provider: 'codex',
          model: 'gpt-5.6-sol',
          source: 'codex-rollout-metadata',
          observedAt: '2026-09-02T12:00:00.000Z',
          match: 'mismatching',
        },
      },
    });
    expect(agreeing.event).toMatchObject({
      observation: { match: 'matching' },
    });
  });

  it('refuses an observation claiming a provider the record does not name', () => {
    expect(() =>
      parseDispatchRecordInput({
        record: genericRecord(),
        event: {
          kind: 'runtime-observation',
          requestId: 'dispatch-native-1',
          source: 'runtime-observer',
          observation: {
            status: 'reported',
            provider: 'claude',
            source: 'attacker',
            observedAt: '2026-09-02T12:00:00.000Z',
            match: 'matching',
          },
        },
      }),
    ).toThrow(/provider/i);
  });

  it('refuses observation values that are not provider identifiers', () => {
    for (const model of [
      'a model chosen by the child',
      '/Users/someone/secret',
      'C:/Users/someone/secret',
      'https://evil.example/x',
    ]) {
      expect(
        () =>
          parseDispatchRecordInput({
            record: genericRecord(),
            event: {
              kind: 'runtime-observation',
              requestId: 'dispatch-native-1',
              source: 'runtime-observer',
              observation: {
                status: 'reported',
                provider: 'codex',
                model,
                source: 'codex-rollout-metadata',
                observedAt: '2026-09-02T12:00:00.000Z',
                match: 'matching',
              },
            },
          }),
        model,
      ).toThrow();
    }
  });

  it('keeps a finished observation event working unchanged', () => {
    const parsed = parseDispatchRecordInput({
      record: genericRecord(),
      event: {
        kind: 'runtime-observation',
        requestId: 'dispatch-native-1',
        source: 'runtime-observer',
        observation: { status: 'not-reported' },
      },
    });
    expect(parsed.event).toMatchObject({
      kind: 'runtime-observation',
      observation: { status: 'not-reported' },
    });
  });

  it('launches no provider: the recorder graph cannot start a process', async () => {
    const modules = [
      './record.ts',
      './index.ts',
      '../../../providers/identity/runtime-observation.ts',
      '../../../providers/identity/codex-runtime-observation.ts',
      '../../../providers/identity/claude-runtime-observation.ts',
      '../../../providers/identity/oat-dispatch-record.ts',
      '../../../providers/identity/generic-dispatch-record.ts',
    ];
    const launchers =
      /child_process|node:net|node:http|\bspawn\s*\(|\bexecFile|\bexecSync\s*\(|\bfetch\s*\(/u;
    for (const specifier of modules) {
      const source = await readFile(
        new URL(specifier, import.meta.url),
        'utf8',
      );
      expect(
        launchers.test(source),
        `${specifier} must not be able to launch a provider`,
      ).toBe(false);
    }
  });
});
