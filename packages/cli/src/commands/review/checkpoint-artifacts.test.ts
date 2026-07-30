import type { PreparedReviewContextV1 } from '@review/types';
import { describe, expect, it, vi } from 'vitest';

import { createReviewCheckpointArtifactsCommand } from './checkpoint-artifacts';

describe('createReviewCheckpointArtifactsCommand', () => {
  it('passes exact correlation input and hides numeric telemetry', async () => {
    const write = vi.fn();
    const checkpoint = vi.fn(async () => {
      return {
        runId: 'run-1',
        contextDigest: 'context-digest',
        postArtifactTelemetryEvidenceDigest: 'telemetry-digest',
        budget: { context: { remainingTokens: 90_000 } },
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
      },
    });
    expect(output).not.toContain('remainingTokens');
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
});
