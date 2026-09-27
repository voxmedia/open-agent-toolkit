import type { CommandContext } from '@app/command-context';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// `vi.mock` is hoisted above every import, so the spy is created inside the
// factory and read back through the mocked module rather than captured from a
// top-level binding.
vi.mock('@commands/sync/index', () => ({ runSyncInProcess: vi.fn() }));

import { runSyncInProcess as runSyncInProcessImport } from '@commands/sync/index';

import { inProcessSyncDependencies } from './in-process-sync';

const runSyncInProcess = vi.mocked(runSyncInProcessImport);

describe('inProcessSyncDependencies', () => {
  beforeEach(() => {
    runSyncInProcess.mockReset();
    runSyncInProcess.mockResolvedValue(undefined);
  });

  it('runs sync against the caller cwd and home with JSON capture enabled', async () => {
    await inProcessSyncDependencies.runSync({
      scope: 'project',
      cwd: '/tmp/project',
      home: '/tmp/home',
      installedCanonicalPaths: ['.agents/skills/analyze'],
    });

    expect(runSyncInProcess).toHaveBeenCalledTimes(1);
    const [context, filter] = runSyncInProcess.mock.calls[0] as [
      CommandContext,
      { installedCanonicalPaths?: string[]; removedCanonicalPaths?: string[] },
    ];
    // The target project reaches sync through the context, not through the
    // ambient process cwd.
    expect(context).toMatchObject({
      scope: 'project',
      cwd: '/tmp/project',
      home: '/tmp/home',
      json: true,
      dryRun: false,
      interactive: false,
    });
    expect(filter).toEqual({
      installedCanonicalPaths: ['.agents/skills/analyze'],
    });
  });

  it('forwards removal filters and omits the install filter', async () => {
    await inProcessSyncDependencies.runSync({
      scope: 'user',
      cwd: '/tmp/project',
      home: '/tmp/home',
      removedCanonicalPaths: ['.agents/skills/analyze'],
    });

    const [, filter] = runSyncInProcess.mock.calls[0] as [
      CommandContext,
      Record<string, unknown>,
    ];
    expect(filter).toEqual({
      removedCanonicalPaths: ['.agents/skills/analyze'],
    });
  });

  it('normalizes the captured sync payload into reachability evidence', async () => {
    runSyncInProcess.mockImplementation(async (context: CommandContext) => {
      context.logger.json({
        operationResults: [
          {
            provider: 'claude',
            scope: 'project',
            contentKind: 'skill',
            asset: '.agents/skills/analyze',
            status: 'changed',
          },
        ],
        materializationExtensions: [
          {
            provider: 'codex',
            operationResults: [
              { provider: 'codex', status: 'failed', failure: 'denied' },
            ],
          },
        ],
        providerRefreshAdvice: [
          {
            scope: 'project',
            provider: 'claude',
            contentKind: 'skill',
            // The producer (`buildProviderRefreshAdvice` in sync/apply.ts)
            // forwards the registered capability policy, so a sourced state
            // always carries its provenance.
            visibility: {
              state: 'visible',
              policy: {
                state: 'live',
                provenance: {
                  kind: 'repository-decision',
                  reference: 'DR-000000-example',
                  verifiedAt: '2026-09-01',
                },
              },
            },
          },
        ],
      });
    });

    const evidence = await inProcessSyncDependencies.runSync({
      scope: 'project',
      cwd: '/tmp/project',
      home: '/tmp/home',
    });

    expect(evidence).toMatchObject({ scope: 'project', ran: true });
    expect(evidence?.operationResults).toHaveLength(1);
    expect(evidence?.extensionResults[0]).toMatchObject({
      provider: 'codex',
      status: 'failed',
      failure: 'denied',
      contentKind: 'agent',
    });
    expect(evidence?.refreshAdvice[0]?.visibility?.policy).toEqual({
      state: 'live',
      provenance: {
        kind: 'repository-decision',
        reference: 'DR-000000-example',
        verifiedAt: '2026-09-01',
      },
    });
  });

  it('records failures reported without a thrown error', async () => {
    const priorExitCode = process.exitCode;
    try {
      // `runSyncApply` sets exit code 1 and returns normally. The subprocess
      // this replaced surfaced that as a rejection; in-process it must not
      // become "Auto-sync completed."
      runSyncInProcess.mockImplementation(async (context: CommandContext) => {
        context.logger.json({ summary: { failed: 2 }, operationResults: [] });
        process.exitCode = 1;
      });

      const evidence = await inProcessSyncDependencies.runSync({
        scope: 'project',
        cwd: '/tmp/project',
        home: '/tmp/home',
      });

      // Reported through the evidence, not by throwing: a throw would discard
      // the rows that name which provider failed.
      expect(evidence?.failedOperations).toBe(2);
      expect(process.exitCode).toBe(priorExitCode);
    } finally {
      process.exitCode = priorExitCode;
    }
  });

  it('records a non-zero exit with no per-operation failure', async () => {
    const priorExitCode = process.exitCode;
    try {
      // A rejected collection is counted as a failure but is not a planned
      // operation, so the exit code is the only signal.
      runSyncInProcess.mockImplementation(async (context: CommandContext) => {
        context.logger.json({ summary: { failed: 0 } });
        process.exitCode = 1;
      });

      const evidence = await inProcessSyncDependencies.runSync({
        scope: 'project',
        cwd: '/tmp/project',
        home: '/tmp/home',
      });

      expect(evidence?.failedOperations).toBe(1);
    } finally {
      process.exitCode = priorExitCode;
    }
  });

  it('restores the caller exit code that the sync run overwrites', async () => {
    const priorExitCode = process.exitCode;
    try {
      process.exitCode = 1;
      runSyncInProcess.mockImplementation(async () => {
        // `runSyncApply` assigns its own exit code; in a subprocess that never
        // reached the installer.
        process.exitCode = 0;
      });

      await inProcessSyncDependencies.runSync({
        scope: 'project',
        cwd: '/tmp/project',
        home: '/tmp/home',
      });

      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = priorExitCode;
    }
  });

  it('restores the caller exit code when the sync run throws', async () => {
    const priorExitCode = process.exitCode;
    try {
      process.exitCode = 1;
      runSyncInProcess.mockImplementation(async () => {
        process.exitCode = 0;
        throw new Error('sync exploded');
      });

      await expect(
        inProcessSyncDependencies.runSync({
          scope: 'project',
          cwd: '/tmp/project',
          home: '/tmp/home',
        }),
      ).rejects.toThrow('sync exploded');
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = priorExitCode;
    }
  });
});

describe('normalizeSyncEvidence required fields', () => {
  async function evidenceFor(payload: unknown) {
    runSyncInProcess.mockImplementation(async (context: CommandContext) => {
      context.logger.json(payload);
    });
    return inProcessSyncDependencies.runSync({
      scope: 'project',
      cwd: '/tmp/project',
      home: '/tmp/home',
    });
  }

  it('drops an operation with no contentKind instead of defaulting it', async () => {
    // Defaulting to `skill` would let an operation of unknown kind be
    // attributed to a skill row it never touched; `provider` and `status` are
    // already dropped on the same footing.
    const evidence = await evidenceFor({
      operationResults: [
        {
          provider: 'claude',
          scope: 'project',
          asset: 'analyze',
          status: 'changed',
        },
      ],
    });

    expect(evidence?.operationResults).toEqual([]);
  });

  it.each([
    [
      'provider',
      { scope: 'project', contentKind: 'skill', asset: 'a', status: 'changed' },
    ],
    [
      'status',
      {
        provider: 'claude',
        scope: 'project',
        contentKind: 'skill',
        asset: 'a',
      },
    ],
  ])('drops an operation with no %s', async (_field, operation) => {
    const evidence = await evidenceFor({ operationResults: [operation] });

    expect(evidence?.operationResults).toEqual([]);
  });

  it('keeps a fully specified operation', async () => {
    const evidence = await evidenceFor({
      operationResults: [
        {
          provider: 'claude',
          scope: 'project',
          contentKind: 'skill',
          asset: 'analyze',
          status: 'changed',
        },
      ],
    });

    expect(evidence?.operationResults).toHaveLength(1);
    expect(evidence?.operationResults[0]?.contentKind).toBe('skill');
  });

  describe('catalog-refresh policy validation', () => {
    const provenance = {
      kind: 'repository-decision',
      reference: 'DR-000000-example',
      verifiedAt: '2026-09-01',
    };

    function adviceWithPolicy(policy: unknown) {
      return {
        providerRefreshAdvice: [
          {
            scope: 'project',
            provider: 'claude',
            contentKind: 'skill',
            visibility: {
              state: 'restart-required',
              reason: 'claude needs a new session',
              policy,
            },
          },
        ],
      };
    }

    it.each([
      ['an unrecognized state', { state: 'eventually', provenance }],
      ['a missing state', { provenance }],
      ['a sourced state without provenance', { state: 'live' }],
      [
        'a sourced state with malformed provenance',
        { state: 'manual-refresh', provenance: { kind: 'hearsay' } },
      ],
      ['an unknown state without a reason', { state: 'unknown' }],
    ])(
      'drops a policy with %s but keeps the advice entry',
      async (_label, policy) => {
        const evidence = await evidenceFor(adviceWithPolicy(policy));

        expect(evidence?.refreshAdvice).toHaveLength(1);
        expect(evidence?.refreshAdvice[0]?.visibility).toEqual({
          state: 'restart-required',
          reason: 'claude needs a new session',
        });
      },
    );

    it.each([
      ['live', { state: 'live', provenance }],
      [
        'manual-refresh with a provider version',
        {
          state: 'manual-refresh',
          provenance: { ...provenance, providerVersion: '1.2.3' },
        },
      ],
      ['restart-required', { state: 'restart-required', provenance }],
      ['unknown', { state: 'unknown', reason: 'no contract registered' }],
    ])('keeps a well-formed %s policy', async (_label, policy) => {
      const evidence = await evidenceFor(adviceWithPolicy(policy));

      expect(evidence?.refreshAdvice[0]?.visibility?.policy).toEqual(policy);
    });
  });
});
