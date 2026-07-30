import { Readable } from 'node:stream';

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
      stdin: Readable.from([
        JSON.stringify({
          validationRunId: 'run-1',
          checkpointToken: 'secret-token',
        }),
      ]),
      write,
      setExitCode,
      checkpoint,
      lifecycle: {} as never,
    });

    await command.parseAsync(['node', 'oat', 'checkpoint-artifacts']);

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

  it('rejects incomplete checkpoint input without calling the lifecycle', async () => {
    const write = vi.fn();
    const checkpoint = vi.fn();
    const command = createReviewCheckpointArtifactsCommand({
      stdin: Readable.from([JSON.stringify({ validationRunId: 'run-1' })]),
      write,
      setExitCode: vi.fn(),
      checkpoint,
      lifecycle: {} as never,
    });

    await command.parseAsync(['node', 'oat', 'checkpoint-artifacts']);

    expect(checkpoint).not.toHaveBeenCalled();
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: false,
      error: { category: 'input', code: 'invalid-checkpoint-input' },
    });
  });
});
