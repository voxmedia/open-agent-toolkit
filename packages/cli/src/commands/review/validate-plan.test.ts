import { Readable } from 'node:stream';

import { ReviewDomainError } from '@review/errors';
import type { ReviewPlanV1 } from '@review/types';
import { describe, expect, it, vi } from 'vitest';

import { createReviewValidatePlanCommand } from './validate-plan';

const plan = {
  schemaVersion: 1,
  runId: 'run-1',
  contextDigest: 'context-digest',
  strategy: 'selective-inline',
  lanes: [
    {
      id: 'lane-1',
      paths: ['src/example.ts'],
      primaryObligationIds: ['p02-t01'],
      seamObligationIds: [],
      risk: 'low',
      evidenceClass: 'semantic',
      strategy: 'path-diff',
      checks: ['inspect'],
      delegated: false,
      independenceRationale: null,
      substantial: false,
      substantialityRationale: null,
      deadlineMs: null,
      dossier: { contractVersion: 1, partialAllowed: true },
      replay: 'direct-verify',
      primaryContingency: { allowed: false, paths: [], obligationIds: [] },
    },
  ],
  classifications: [],
  crossLaneInvariants: [],
  delegationEconomics: {
    independentLaneIds: [],
    nonReplayedLaneIds: [],
    expectedSavings: [],
    coordinationCosts: [],
    decisionRationale: 'inline',
    decision: 'inline',
  },
  verificationBoundary: {
    requiredClaims: [
      { kind: 'promoted-finding', mode: 'direct' },
      { kind: 'consequential-absence', mode: 'direct' },
      { kind: 'worker-conflict', mode: 'direct' },
      { kind: 'cross-lane-gap', mode: 'direct' },
    ],
    positiveCoverage: {
      mode: 'sample',
      laneIds: ['lane-1'],
      rationale: 'sample',
    },
    deterministicAcceptance: {
      mode: 'provenance',
      requiredFields: ['command', 'cwd', 'scopeRefs', 'provenance', 'result'],
    },
  },
  wholeDiff: {
    allowed: false,
    estimatedTokens: 30,
    evidenceBudgetTokens: null,
    reason: 'No sealed context budget.',
  },
  timeAllocation: null,
} satisfies ReviewPlanV1;

describe('createReviewValidatePlanCommand', () => {
  it('returns a receipt for a valid plan', async () => {
    const write = vi.fn();
    const validate = vi.fn(async () => ({
      valid: true as const,
      receipt: { token: 'receipt-1' },
    }));
    const command = createReviewValidatePlanCommand({
      stdin: Readable.from([JSON.stringify(plan)]),
      write,
      setExitCode: vi.fn(),
      validate: validate as never,
      lifecycle: {} as never,
    });

    await command.parseAsync([
      'node',
      'oat',
      'validate-plan',
      '--run-id',
      'run-1',
      '--command-token',
      'plan-token',
      '--stdin',
      '--json',
    ]);

    expect(validate).toHaveBeenCalledWith(
      { runId: 'run-1', commandToken: 'plan-token', plan },
      {},
    );
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: true,
      result: { valid: true, receipt: { token: 'receipt-1' } },
    });
  });

  it('emits validation failure with result and exit one', async () => {
    const write = vi.fn();
    const setExitCode = vi.fn();
    const command = createReviewValidatePlanCommand({
      stdin: Readable.from([JSON.stringify(plan)]),
      write,
      setExitCode,
      validate: vi.fn(async () => ({
        valid: false,
        errors: [
          { code: 'missing-path-owner', pointer: '/lanes', message: 'missing' },
        ],
      })),
      lifecycle: {} as never,
    });

    await command.parseAsync([
      'node',
      'oat',
      'validate-plan',
      '--run-id',
      'run-1',
      '--command-token',
      'plan-token',
      '--stdin',
      '--json',
    ]);

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: false,
      error: { category: 'validation', code: 'invalid-review-plan' },
      result: { valid: false, errors: [{ code: 'missing-path-owner' }] },
    });
  });

  it('requires stdin mode and rejects malformed ReviewPlanV1 documents', async () => {
    const missingStdin = createReviewValidatePlanCommand({
      stdin: Readable.from([JSON.stringify(plan)]),
      write: vi.fn(),
      setExitCode: vi.fn(),
      validate: vi.fn(),
      lifecycle: {} as never,
    }).exitOverride();
    await expect(
      missingStdin.parseAsync([
        'node',
        'oat',
        'validate-plan',
        '--run-id',
        'run-1',
        '--command-token',
        'plan-token',
        '--json',
      ]),
    ).rejects.toMatchObject({ code: 'commander.missingMandatoryOptionValue' });

    for (const malformed of [
      null,
      { ...plan, unknown: true },
      {
        ...plan,
        verificationBoundary: {
          ...plan.verificationBoundary,
          requiredClaims: ['not-a-claim'],
        },
      },
    ]) {
      const write = vi.fn();
      const validate = vi.fn();
      const invalidPlan = createReviewValidatePlanCommand({
        stdin: Readable.from([JSON.stringify(malformed)]),
        write,
        setExitCode: vi.fn(),
        validate,
        lifecycle: {} as never,
      });
      await invalidPlan.parseAsync([
        'node',
        'oat',
        'validate-plan',
        '--run-id',
        'run-1',
        '--command-token',
        'plan-token',
        '--stdin',
        '--json',
      ]);

      expect(validate).not.toHaveBeenCalled();
      expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
        ok: false,
        error: { category: 'input', code: 'review-plan-schema-invalid' },
      });
    }
  });

  it('maps lifecycle contract rejection to a safe exit-one envelope', async () => {
    const write = vi.fn();
    const setExitCode = vi.fn();
    const command = createReviewValidatePlanCommand({
      stdin: Readable.from([JSON.stringify(plan)]),
      write,
      setExitCode,
      validate: vi.fn(async () => {
        throw new ReviewDomainError({
          category: 'validation',
          code: 'plan-validation-attempt-limit',
          message: 'plan validation attempt limit exceeded',
        });
      }),
      lifecycle: {} as never,
    });
    await command.parseAsync([
      'node',
      'oat',
      'validate-plan',
      '--run-id',
      'run-1',
      '--command-token',
      'token',
      '--stdin',
      '--json',
    ]);

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(write.mock.calls[0]?.[0] as string)).toMatchObject({
      ok: false,
      error: {
        category: 'validation',
        code: 'plan-validation-attempt-limit',
      },
    });
  });
});
