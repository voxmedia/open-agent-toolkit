import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import { createArtifactDraft } from '@review/artifact-staging';
import type { ReviewAccountingV1, ReviewerTerminalV1 } from '@review/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createValidateOutputCommand,
  validateStoredReviewOutput,
} from './validate-output';

const roots: string[] = [];

function accounting(): ReviewAccountingV1 & { completion: 'complete' } {
  return {
    schemaVersion: 1,
    receipt: 'receipt',
    contextDigest: 'context',
    planDigest: 'plan',
    assignmentDigest: 'assignment',
    strategy: 'selective-inline',
    completion: 'complete',
    evidence: [],
    lanes: [
      {
        id: 'lane',
        paths: ['src/a.ts'],
        primaryObligationIds: ['task:p01-t01'],
        seamObligationIds: [],
        workerOutcome: 'not-delegated',
        dossierDigest: null,
        inspectionCoverage: 'all',
        uninspectedPathIndexes: [],
        uncoveredObligationIds: [],
        commands: [],
        evidenceRefIds: [],
        uncertainty: [],
        primaryCompletion: {
          outcome: 'not-needed',
          completedPathIndexes: [],
          completedObligationIds: [],
          commands: [],
          evidenceRefIds: [],
        },
      },
    ],
    classifications: [],
    verification: [],
    budget: { evidenceStoppedAt: null, outputReservePreserved: null },
  };
}

function terminal(): ReviewerTerminalV1 {
  return {
    schemaVersion: 1,
    status: 'complete',
    candidate: {
      kind: 'structured',
      review: { summary: 'done', findings: [], verification_commands: [] },
    },
    reviewAccounting: accounting(),
  };
}

function args(): string[] {
  return [
    'node',
    'oat',
    'validate-output',
    '--run-id',
    'validation-run-1',
    '--stdin',
    '--json',
  ];
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('validate-output command', () => {
  it('emits one success envelope and exit zero', async () => {
    const write = vi.fn();
    const setExitCode = vi.fn();
    const validate = vi.fn(async () => ({
      valid: true as const,
      outputDigest: 'digest',
    }));
    await createValidateOutputCommand({
      stdin: Readable.from([JSON.stringify(terminal())]),
      write,
      setExitCode,
      validate,
    }).parseAsync(args());

    expect(setExitCode).toHaveBeenCalledWith(0);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0]?.[0]).toMatch(/\n$/);
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toEqual({
      ok: true,
      result: { valid: true, outputDigest: 'digest' },
    });
  });

  it('uses exit one for validation rejection with typed result', async () => {
    const write = vi.fn();
    const setExitCode = vi.fn();
    await createValidateOutputCommand({
      stdin: Readable.from([JSON.stringify(terminal())]),
      write,
      setExitCode,
      validate: vi.fn(async () => ({
        valid: false as const,
        errors: [
          { code: 'receipt-mismatch', pointer: '/receipt', message: 'wrong' },
        ],
      })),
    }).parseAsync(args());
    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: false,
      error: { category: 'validation', code: 'invalid-review-output' },
      result: { valid: false, errors: [{ code: 'receipt-mismatch' }] },
    });
  });

  it('uses exit two for system failure and rejects malformed terminals first', async () => {
    const systemWrite = vi.fn();
    const systemExit = vi.fn();
    await createValidateOutputCommand({
      stdin: Readable.from([JSON.stringify(terminal())]),
      write: systemWrite,
      setExitCode: systemExit,
      validate: vi.fn(async () => {
        throw new Error('private store failed');
      }),
    }).parseAsync(args());
    expect(systemExit).toHaveBeenCalledWith(2);
    expect(JSON.parse(systemWrite.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: false,
      error: { category: 'system' },
    });

    const invalidWrite = vi.fn();
    const validate = vi.fn();
    await createValidateOutputCommand({
      stdin: Readable.from(['{"schemaVersion":1,"status":"complete"}']),
      write: invalidWrite,
      setExitCode: vi.fn(),
      validate,
    }).parseAsync(args());
    expect(validate).not.toHaveBeenCalled();
    expect(JSON.parse(invalidWrite.mock.calls[0]?.[0] as string)).toMatchObject(
      {
        ok: false,
        error: { category: 'input', code: 'review-output-schema-invalid' },
      },
    );
  });

  it('requires canonical equality between artifact and envelope accounting', async () => {
    const root = join(
      tmpdir(),
      `oat-validate-output-${process.pid}-${Date.now()}`,
    );
    roots.push(root);
    await mkdir(root, { mode: 0o700 });
    const draft = await createArtifactDraft(root);
    await writeFile(
      draft.path,
      `## Review Accounting\n\n\`\`\`json\n${JSON.stringify(accounting())}\n\`\`\`\n`,
    );
    const value = terminal();
    if (value.status !== 'complete') throw new Error('fixture');
    value.candidate = {
      kind: 'artifact-draft',
      privateDraftPath: draft.path,
    };
    const state = {
      phase: 'evidence_started',
      draft,
      receipt: {
        token: 'receipt',
        validationRunId: 'validation-run-1',
        gateRunId: null,
        launchAttemptId: 'launch',
        acceptedHandleDigest: 'handle',
        contractVersion: 1,
        contextDigest: 'context',
        planDigest: 'plan',
        assignmentDigest: 'assignment',
        validatedAt: '2026-07-30T20:00:00.000Z',
        expiresAt: '2026-07-30T22:00:00.000Z',
      },
      plan: {
        strategy: 'selective-inline',
        verificationBoundary: {
          requiredClaims: [],
          positiveCoverage: { mode: 'sample', laneIds: [], rationale: '' },
          deterministicAcceptance: {
            mode: 'provenance',
            requiredFields: [],
          },
        },
      },
      assignment: {
        lanes: [
          {
            id: 'lane',
            paths: ['src/a.ts'],
            primaryObligationIds: ['task:p01-t01'],
            seamObligationIds: [],
            primaryContingency: {
              allowed: false,
              paths: [],
              obligationIds: [],
            },
          },
        ],
        classifications: [],
      },
    };
    const store = {
      readRun: vi.fn(async () => ({ state })),
    };
    expect(
      await validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: value },
        store as never,
      ),
    ).toMatchObject({ valid: true });

    value.reviewAccounting.receipt = 'different';
    expect(
      await validateStoredReviewOutput(
        { runId: 'validation-run-1', terminal: value },
        store as never,
      ),
    ).toMatchObject({
      valid: false,
      errors: [{ code: 'schema-error' }],
    });
  });
});
