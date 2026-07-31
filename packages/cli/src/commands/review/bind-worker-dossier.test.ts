import { Readable } from 'node:stream';

import { ReviewDomainError } from '@review/errors';
import type { WorkerDossierV1 } from '@review/types';
import { describe, expect, it, vi } from 'vitest';

import { createReviewBindWorkerDossierCommand } from './bind-worker-dossier';

function dossier(): WorkerDossierV1 {
  return {
    schemaVersion: 1,
    runId: 'validation-run-1',
    planDigest: 'plan-digest',
    laneId: 'delegated-lane',
    outcome: 'complete',
    inspectedPaths: ['src/review.ts'],
    inspectedObligationIds: ['FR1'],
    commands: [],
    evidence: [],
    candidateFindings: [],
    uncoveredObligationIds: [],
    uncertainty: [],
  };
}

describe('createReviewBindWorkerDossierCommand', () => {
  it('submits one exact receipt-bound dossier through the launcher broker', async () => {
    const write = vi.fn();
    const setExitCode = vi.fn();
    const bind = vi.fn(async () => ({
      validationRunId: 'validation-run-1',
      planDigest: 'plan-digest',
      laneId: 'delegated-lane',
      dossierDigest: 'a'.repeat(64),
      outcome: 'complete' as const,
      inspectedPathIndexes: [0],
      uncoveredPathIndexes: [],
      inspectedObligationIds: ['FR1'],
      uncoveredObligationIds: [],
    }));
    const command = createReviewBindWorkerDossierCommand({
      stdin: Readable.from([JSON.stringify(dossier())]),
      write,
      setExitCode,
      bind,
    });

    await command.parseAsync([
      'node',
      'oat',
      'bind-worker-dossier',
      '--run-id',
      'validation-run-1',
      '--receipt',
      'receipt-1',
      '--broker-socket',
      '/private/broker.sock',
      '--stdin',
      '--json',
    ]);

    expect(bind).toHaveBeenCalledWith({
      brokerSocket: '/private/broker.sock',
      runId: 'validation-run-1',
      receipt: 'receipt-1',
      dossier: dossier(),
    });
    expect(setExitCode).toHaveBeenCalledWith(0);
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: true,
      result: {
        validationRunId: 'validation-run-1',
        laneId: 'delegated-lane',
      },
    });
  });

  it('rejects malformed dossiers before contacting the broker', async () => {
    const write = vi.fn();
    const setExitCode = vi.fn();
    const bind = vi.fn();
    const command = createReviewBindWorkerDossierCommand({
      stdin: Readable.from(['{"schemaVersion":1}']),
      write,
      setExitCode,
      bind,
    });

    await command.parseAsync([
      'node',
      'oat',
      'bind-worker-dossier',
      '--run-id',
      'validation-run-1',
      '--receipt',
      'receipt-1',
      '--broker-socket',
      '/private/broker.sock',
      '--stdin',
      '--json',
    ]);

    expect(bind).not.toHaveBeenCalled();
    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      error: {
        category: 'input',
        code: 'worker-dossier-schema-invalid',
      },
    });
  });

  it('preserves typed broker correlation rejections', async () => {
    const write = vi.fn();
    const setExitCode = vi.fn();
    const command = createReviewBindWorkerDossierCommand({
      stdin: Readable.from([JSON.stringify(dossier())]),
      write,
      setExitCode,
      bind: vi.fn(async () => {
        throw new ReviewDomainError({
          category: 'validation',
          code: 'worker-dossier-receipt-mismatch',
          message: 'worker dossier receipt identity mismatch',
        });
      }),
    });

    await command.parseAsync([
      'node',
      'oat',
      'bind-worker-dossier',
      '--run-id',
      'validation-run-1',
      '--receipt',
      'wrong-receipt',
      '--broker-socket',
      '/private/broker.sock',
      '--stdin',
      '--json',
    ]);

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      error: {
        category: 'validation',
        code: 'worker-dossier-receipt-mismatch',
      },
    });
  });
});
