import { ReviewDomainError } from '@review/errors';
import type { PreparedReviewContextV1 } from '@review/types';
import { describe, expect, it, vi } from 'vitest';

import { createReviewCheckpointArtifactsCommand } from './checkpoint-artifacts';

describe('createReviewCheckpointArtifactsCommand', () => {
  it('returns the safe sealed planning projection without capabilities', async () => {
    const write = vi.fn();
    const checkpoint = vi.fn(async () => {
      return {
        runId: 'run-1',
        contextDigest: 'context-digest',
        postArtifactTelemetryEvidenceDigest: 'telemetry-digest',
        changeMap: {
          files: [],
          totals: {
            estimatedPatchTokens: null,
            patchEstimateState: 'coarse-denied',
          },
        },
        obligations: [],
        priorEvidence: [],
        budget: { time: null, context: null },
      } as unknown as PreparedReviewContextV1;
    });
    const setExitCode = vi.fn();
    const command = createReviewCheckpointArtifactsCommand({
      write,
      setExitCode,
      checkpoint,
      lifecycle: {} as never,
    });

    await command.parseAsync([
      'node',
      'oat',
      'checkpoint-artifacts',
      '--run-id',
      'run-1',
      '--checkpoint-token',
      'secret-token',
      '--json',
    ]);

    expect(checkpoint).toHaveBeenCalledWith(
      { runId: 'run-1', checkpointToken: 'secret-token' },
      {},
    );
    expect(setExitCode).toHaveBeenCalledWith(0);
    const output = write.mock.calls[0]?.[0] as string;
    expect(JSON.parse(output)).toEqual({
      ok: true,
      result: {
        validationRunId: 'run-1',
        phase: 'artifacts_loaded',
        contextDigest: 'context-digest',
        postArtifactTelemetryEvidenceDigest: 'telemetry-digest',
        planning: {
          schemaVersion: 1,
          contextDigest: 'context-digest',
          changeMap: {
            files: [],
            totals: {
              estimatedPatchTokens: null,
              patchEstimateState: 'coarse-denied',
            },
          },
          obligations: [],
          priorEvidence: [],
          budget: { time: null, context: null },
          derivedPolicy: {
            wholeDiff: {
              singleLane: {
                allowed: false,
                estimatedTokens: null,
                evidenceBudgetTokens: null,
                reason: 'missing post-artifact context telemetry',
              },
              multipleLanes: {
                allowed: false,
                estimatedTokens: null,
                evidenceBudgetTokens: null,
                reason: 'missing post-artifact context telemetry',
              },
            },
            timeAllocation: null,
          },
        },
      },
    });
    expect(output).not.toContain('secret-token');
  });

  it('requires the exact trusted argv contract', async () => {
    const checkpoint = vi.fn();
    const command = createReviewCheckpointArtifactsCommand({
      write: vi.fn(),
      setExitCode: vi.fn(),
      checkpoint,
      lifecycle: {} as never,
    }).exitOverride();

    await expect(
      command.parseAsync([
        'node',
        'oat',
        'checkpoint-artifacts',
        '--run-id',
        'run-1',
        '--json',
      ]),
    ).rejects.toMatchObject({ code: 'commander.missingMandatoryOptionValue' });

    expect(checkpoint).not.toHaveBeenCalled();
  });

  it('publishes exact whole-diff policy with present telemetry', async () => {
    const write = vi.fn();
    const command = createReviewCheckpointArtifactsCommand({
      write,
      setExitCode: vi.fn(),
      checkpoint: vi.fn(async () => {
        return {
          runId: 'run-1',
          contextDigest: 'context-digest',
          postArtifactTelemetryEvidenceDigest: 'telemetry-digest',
          changeMap: {
            files: [],
            totals: { estimatedPatchTokens: 10, patchEstimateState: 'exact' },
          },
          obligations: [],
          priorEvidence: [],
          budget: {
            time: null,
            context: { evidenceBudgetTokens: 100 },
          },
        } as unknown as PreparedReviewContextV1;
      }),
      lifecycle: {} as never,
    });
    await command.parseAsync([
      'node',
      'oat',
      'checkpoint-artifacts',
      '--run-id',
      'run-1',
      '--checkpoint-token',
      'secret-token',
      '--json',
    ]);
    expect(
      JSON.parse(write.mock.calls[0]?.[0] as string).result.planning
        .derivedPolicy.wholeDiff.singleLane,
    ).toEqual({
      allowed: true,
      estimatedTokens: 10,
      evidenceBudgetTokens: 100,
      reason: 'whole diff is eligible',
    });
  });

  it('emits safe exit-one lifecycle rejections', async () => {
    const write = vi.fn();
    const setExitCode = vi.fn();
    const command = createReviewCheckpointArtifactsCommand({
      write,
      setExitCode,
      checkpoint: vi.fn(async () => {
        throw new ReviewDomainError({
          category: 'contract',
          code: 'command-capability-rejected',
          message: 'review command capability was rejected',
        });
      }),
      lifecycle: {} as never,
    });
    await command.parseAsync([
      'node',
      'oat',
      'checkpoint-artifacts',
      '--run-id',
      'run-1',
      '--checkpoint-token',
      'replayed',
      '--json',
    ]);

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: false,
      error: {
        category: 'contract',
        code: 'command-capability-rejected',
      },
    });
  });
});
