import { ChildProcess } from 'node:child_process';

import { describe, expect, it, vi } from 'vitest';

import type {
  GateActivityEvidence,
  GateActivityProbe,
  GateActivityProbeStatus,
} from './activity-probes';
import { runChildProcess } from './child-process';

describe('gate child process activity coordination', () => {
  it('returns the final timeout observation instead of an older periodic sample', async () => {
    const observations: number[] = [];
    const activityProbe: GateActivityProbe = {
      runtime: 'cursor',
      probe: async () => null,
      observe: vi.fn(async (observedAt = Date.now()) => {
        observations.push(observedAt);
        const evidence: GateActivityEvidence = {
          source: 'transcript-dir',
          runtime: 'cursor',
          scope: 'project-dir',
          observedPath: '/tmp/cursor-transcript',
          lastChangeAt: observedAt,
          totalSizeBytes: observations.length,
          changedSinceBaseline: true,
          observedAt,
        };
        return {
          status: 'available',
          runtime: 'cursor',
          scope: 'project-dir',
          attemptedPath: evidence.observedPath,
          observedAt,
          evidence,
        };
      }),
    };

    const result = await runChildProcess(
      process.execPath,
      ['-e', 'setInterval(() => {}, 1000)'],
      {
        activityProbe,
        cwd: process.cwd(),
        env: {},
        livenessIntervalMs: 10,
        onLiveness: () => {},
        purpose: 'execute',
        stdin: 'ignore',
        stdio: 'ignore',
        timeoutMs: 55,
      },
    );

    expect(observations.length).toBeGreaterThan(1);
    expect(result).toMatchObject({ exitCode: 124, timedOut: true });
    expect(result.activityEvidence).toMatchObject({
      observedAt: observations.at(-1),
      totalSizeBytes: observations.length,
    });
  });

  it('does not let an older in-flight periodic probe overwrite the final timeout sample', async () => {
    let observeCalls = 0;
    let resolvePeriodic:
      | ((status: GateActivityProbeStatus) => void)
      | undefined;
    const periodicResult = new Promise<GateActivityProbeStatus>((resolve) => {
      resolvePeriodic = resolve;
    });
    let periodicObservedAt = 0;
    const activityProbe: GateActivityProbe = {
      runtime: 'cursor',
      probe: async () => null,
      observe: vi.fn(async (observedAt = Date.now()) => {
        observeCalls += 1;
        if (observeCalls === 1) {
          periodicObservedAt = observedAt;
          return periodicResult;
        }
        const finalEvidence: GateActivityEvidence = {
          source: 'transcript-dir',
          runtime: 'cursor',
          scope: 'project-dir',
          observedPath: '/tmp/cursor-transcript',
          lastChangeAt: observedAt,
          totalSizeBytes: 2,
          changedSinceBaseline: true,
          observedAt,
        };
        setTimeout(() => {
          resolvePeriodic?.({
            status: 'available',
            runtime: 'cursor',
            scope: 'project-dir',
            attemptedPath: '/tmp/cursor-transcript',
            observedAt: periodicObservedAt,
            evidence: {
              ...finalEvidence,
              lastChangeAt: periodicObservedAt,
              totalSizeBytes: 1,
              observedAt: periodicObservedAt,
            },
          });
        }, 5);
        return {
          status: 'available',
          runtime: 'cursor',
          scope: 'project-dir',
          attemptedPath: finalEvidence.observedPath,
          observedAt,
          evidence: finalEvidence,
        };
      }),
    };

    const result = await runChildProcess(
      process.execPath,
      [
        '-e',
        'process.on("SIGTERM", () => setTimeout(() => process.exit(0), 60)); setInterval(() => {}, 1000)',
      ],
      {
        activityProbe,
        cwd: process.cwd(),
        env: {},
        livenessIntervalMs: 20,
        onLiveness: () => {},
        purpose: 'execute',
        stdin: 'ignore',
        stdio: 'ignore',
        timeoutMs: 300,
      },
    );

    expect(observeCalls).toBe(2);
    expect(result).toMatchObject({ exitCode: 124, timedOut: true });
    expect(result.activityEvidence).toMatchObject({
      changedSinceBaseline: true,
      totalSizeBytes: 2,
    });
    expect(result.activityEvidence?.observedAt).toBeGreaterThan(
      periodicObservedAt,
    );
  });

  it.each(['absent', 'failed', 'stalled'] as const)(
    'retains the last valid periodic evidence when the final timeout probe is %s',
    async (finalProbeOutcome) => {
      let observeCalls = 0;
      let periodicEvidence: GateActivityEvidence | undefined;
      const activityProbe: GateActivityProbe = {
        runtime: 'claude',
        probe: async () => null,
        observe: vi.fn(async (observedAt = Date.now()) => {
          observeCalls += 1;
          if (observeCalls > 1) {
            if (finalProbeOutcome === 'failed') {
              throw new Error('probe failed');
            }
            if (finalProbeOutcome === 'stalled') {
              return new Promise<GateActivityProbeStatus>(() => {});
            }
            return {
              status: 'path-absent',
              runtime: 'claude',
              scope: 'project-dir',
              attemptedPath: '/tmp/claude-transcript',
              observedAt,
            };
          }
          periodicEvidence = {
            source: 'transcript-dir',
            runtime: 'claude',
            scope: 'project-dir',
            observedPath: '/tmp/claude-transcript',
            lastChangeAt: observedAt,
            totalSizeBytes: 1,
            changedSinceBaseline: true,
            observedAt,
          };
          return {
            status: 'available',
            runtime: 'claude',
            scope: 'project-dir',
            attemptedPath: periodicEvidence.observedPath,
            observedAt,
            evidence: periodicEvidence,
          };
        }),
      };

      const result = await runChildProcess(
        process.execPath,
        ['-e', 'setInterval(() => {}, 1000)'],
        {
          activityProbe,
          cwd: process.cwd(),
          env: {},
          livenessIntervalMs: 20,
          onLiveness: () => {},
          purpose: 'execute',
          stdin: 'ignore',
          stdio: 'ignore',
          timeoutMs: 35,
        },
      );

      expect(observeCalls).toBe(2);
      expect(result).toMatchObject({
        activityEvidence: periodicEvidence,
        exitCode: 124,
        timedOut: true,
      });
    },
  );

  it('returns a structured refusal parsed from real child output', async () => {
    const stdoutWrite = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    try {
      const result = await runChildProcess(
        process.execPath,
        [
          '-e',
          'process.stdout.write("OAT_GATE_REFUSAL: unavailable headless route\\n")',
        ],
        {
          cwd: process.cwd(),
          env: {},
          purpose: 'execute',
          stdin: 'ignore',
          stdio: 'pipe',
          timeoutMs: 1_000,
        },
      );

      expect(result).toMatchObject({
        exitCode: 0,
        refusal: 'unavailable headless route',
      });
    } finally {
      stdoutWrite.mockRestore();
    }
  });

  it('waits within the grace bound for a pending periodic observation on normal close', async () => {
    let periodicObservedAt = 0;
    let resolvePeriodic:
      | ((status: GateActivityProbeStatus) => void)
      | undefined;
    const periodicResult = new Promise<GateActivityProbeStatus>((resolve) => {
      resolvePeriodic = resolve;
    });
    const onLiveness = vi.fn();
    const activityProbe: GateActivityProbe = {
      runtime: 'cursor',
      probe: async () => null,
      observe: vi.fn((observedAt = Date.now()) => {
        periodicObservedAt = observedAt;
        return periodicResult;
      }),
    };
    // Wrap the real emitter so the deferred probe resolves only after the
    // production close listeners start waiting. Timer-based coordination here
    // is flaky because child startup time varies under load.
    const originalEmit = ChildProcess.prototype.emit;
    const emitSpy = vi
      .spyOn(ChildProcess.prototype, 'emit')
      .mockImplementation(function (
        this: ChildProcess,
        event: string | symbol,
        ...args: unknown[]
      ): boolean {
        const emitted = Reflect.apply(originalEmit, this, [
          event,
          ...args,
        ]) as boolean;
        if (event === 'close') {
          const evidence: GateActivityEvidence = {
            source: 'transcript-dir',
            runtime: 'cursor',
            scope: 'project-dir',
            observedPath: '/tmp/cursor-transcript',
            lastChangeAt: periodicObservedAt,
            totalSizeBytes: 3,
            changedSinceBaseline: true,
            observedAt: periodicObservedAt,
          };
          resolvePeriodic?.({
            status: 'available',
            runtime: 'cursor',
            scope: 'project-dir',
            attemptedPath: evidence.observedPath,
            observedAt: periodicObservedAt,
            evidence,
          });
        }
        return emitted;
      });

    try {
      const result = await runChildProcess(
        process.execPath,
        ['-e', 'setTimeout(() => process.exit(0), 50)'],
        {
          activityProbe,
          cwd: process.cwd(),
          env: {},
          livenessIntervalMs: 20,
          onLiveness,
          purpose: 'execute',
          stdin: 'ignore',
          stdio: 'ignore',
          timeoutMs: 1_000,
        },
      );

      expect(activityProbe.observe).toHaveBeenCalledOnce();
      expect(result).toMatchObject({
        activityEvidence: { totalSizeBytes: 3 },
        exitCode: 0,
      });
      expect(onLiveness).not.toHaveBeenCalled();
    } finally {
      emitSpy.mockRestore();
    }
  });
});
