import { describe, expect, it } from 'vitest';

import { commandResultDigest } from './command-result-digest';
import {
  validateReviewOutput,
  type ReviewOutputValidationContext,
} from './output-validator';
import {
  assembleReviewerTerminal,
  type ReviewerTerminalAssemblyContextV1,
} from './terminal-assembly';
import type {
  ReviewCommandEvidenceV1,
  ReviewerTerminalOverlayV1,
} from './types';

function fixture(pathCount = 2): {
  context: ReviewerTerminalAssemblyContextV1;
  overlay: ReviewerTerminalOverlayV1;
} {
  const paths = Array.from(
    { length: pathCount },
    (_, index) => `src/path-${index}.ts`,
  );
  const command: ReviewCommandEvidenceV1 = {
    id: 'command-1',
    command: 'pnpm test',
    cwd: '.',
    scopeRefs: [
      {
        bucket: 'lane',
        bucketId: 'lane-delegated',
        pathIndexes: [0],
      },
    ],
    provenance: {
      runner: 'launcher',
      invocationDigest: 'invocation',
      capturedAt: '2026-08-03T13:30:00.000Z',
    },
    result: { status: 'completed', exitCode: 0, outputDigest: 'output' },
  };
  const evidence = {
    id: 'evidence-1',
    kind: 'command' as const,
    locator: 'pnpm test',
    scopeRefs: structuredClone(command.scopeRefs),
    provenance: 'launcher',
    digest: 'evidence',
    commandId: command.id,
    commandResultDigest: commandResultDigest(command),
  };
  const context: ReviewerTerminalAssemblyContextV1 = {
    receipt: {
      token: 'receipt',
      validationRunId: 'validation-run',
      gateRunId: null,
      launchAttemptId: 'launch',
      acceptedHandleDigest: 'handle',
      contractVersion: 1,
      contextDigest: 'context',
      planDigest: 'plan',
      assignmentDigest: 'assignment',
      validatedAt: '2026-08-03T13:00:00.000Z',
      expiresAt: '2026-08-03T15:00:00.000Z',
    },
    plan: {
      strategy: 'delegated',
      lanes: [
        {
          id: 'lane-delegated',
          delegated: true,
          replay: 'accept-provenance',
        },
        { id: 'lane-inline', delegated: false, replay: 'direct-verify' },
      ],
      verificationBoundary: {
        requiredClaims: [
          { kind: 'promoted-finding', mode: 'direct' },
          { kind: 'consequential-absence', mode: 'direct' },
          { kind: 'worker-conflict', mode: 'direct' },
          { kind: 'cross-lane-gap', mode: 'direct' },
        ],
        positiveCoverage: {
          mode: 'sample',
          laneIds: ['lane-inline', 'lane-delegated'],
          rationale: 'sample both lanes',
        },
        deterministicAcceptance: {
          mode: 'provenance',
          requiredFields: [
            'command',
            'cwd',
            'scopeRefs',
            'provenance',
            'result',
          ],
        },
      },
    },
    assignment: {
      lanes: [
        {
          id: 'lane-delegated',
          paths,
          primaryObligationIds: ['FR1'],
          seamObligationIds: ['FR2'],
          primaryContingency: {
            allowed: false,
            paths: [],
            obligationIds: [],
          },
        },
        {
          id: 'lane-inline',
          paths: ['src/inline.ts'],
          primaryObligationIds: ['FR3'],
          seamObligationIds: [],
          primaryContingency: {
            allowed: false,
            paths: [],
            obligationIds: [],
          },
        },
      ],
      classifications: [
        {
          id: 'generated',
          kind: 'generated',
          reason: 'Generated output',
          paths: ['dist/generated.js'],
          disposition: 'inspect',
          strategy: 'manifest-check',
          checks: ['check manifest'],
          exclusionAuthority: null,
        },
      ],
    },
    workerCoverage: [
      {
        validationRunId: 'validation-run',
        planDigest: 'plan',
        laneId: 'lane-delegated',
        dossierDigest: 'd'.repeat(64),
        outcome: 'complete',
        inspectedPathIndexes: paths.map((_, index) => index),
        uncoveredPathIndexes: [],
        inspectedObligationIds: ['FR1'],
        uncoveredObligationIds: [],
      },
    ],
  };
  const directClaim = (claimId: string, disposition = 'rejected' as const) => ({
    claimId,
    laneIds: ['lane-delegated'],
    disposition,
    evidenceRefIds: ['evidence-1'],
  });
  return {
    context,
    overlay: {
      schemaVersion: 1,
      contract: 'reviewer-terminal-overlay/v1',
      status: 'complete',
      candidate: {
        kind: 'structured',
        review: {
          summary: 'No findings',
          findings: [],
          verification_commands: ['pnpm test'],
        },
      },
      reviewAccounting: {
        evidence: [evidence],
        lanes: [
          {
            laneId: 'lane-inline',
            inspectionCoverage: 'all',
            uninspectedPathIndexes: [],
            uncoveredObligationIds: [],
            commands: [],
            evidenceRefIds: ['evidence-1'],
            uncertainty: [],
            primaryCompletion: {
              outcome: 'not-needed',
              completedPathIndexes: [],
              completedObligationIds: [],
              commands: [],
              evidenceRefIds: [],
            },
          },
          {
            laneId: 'lane-delegated',
            inspectionCoverage: 'all',
            uninspectedPathIndexes: [],
            uncoveredObligationIds: [],
            commands: [command],
            evidenceRefIds: ['evidence-1'],
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
        classifications: [
          {
            classificationId: 'generated',
            outcome: 'complete',
            inspectionCoverage: 'all',
            uninspectedPathIndexes: [],
            commands: [],
            uncertainty: [],
          },
        ],
        verification: {
          promotedFindings: [
            {
              ...directClaim('claim-promoted'),
              findingId: null,
            },
          ],
          consequentialAbsence: directClaim('claim-absence', 'verified'),
          workerConflict: directClaim('claim-conflict'),
          crossLaneGap: directClaim('claim-gap'),
          positiveCoverage: [
            {
              claimId: 'claim-positive-delegated',
              laneId: 'lane-delegated',
              disposition: 'verified',
              evidenceRefIds: ['evidence-1'],
            },
            {
              claimId: 'claim-positive-inline',
              laneId: 'lane-inline',
              disposition: 'verified',
              evidenceRefIds: ['evidence-1'],
            },
          ],
          deterministicResults: [
            directClaim('claim-deterministic', 'verified'),
          ],
        },
        budget: {
          evidenceStoppedAt: null,
          outputReservePreserved: true,
        },
      },
    },
  };
}

function validationContext(
  context: ReviewerTerminalAssemblyContextV1,
): ReviewOutputValidationContext {
  return context;
}

describe('reviewer terminal assembly', () => {
  it('assembles complete output in sealed order with launcher-owned identity and typed slots', () => {
    const { context, overlay } = fixture();
    const terminal = assembleReviewerTerminal(overlay, context);

    expect(terminal.reviewAccounting).toMatchObject({
      receipt: 'receipt',
      contextDigest: 'context',
      planDigest: 'plan',
      assignmentDigest: 'assignment',
      strategy: 'delegated',
      completion: 'complete',
    });
    expect(terminal.reviewAccounting.lanes.map((lane) => lane.id)).toEqual([
      'lane-delegated',
      'lane-inline',
    ]);
    expect(terminal.reviewAccounting.lanes[0]).toMatchObject({
      workerOutcome: 'complete',
      dossierDigest: 'd'.repeat(64),
    });
    expect(
      terminal.reviewAccounting.verification.map(({ kind, mode, laneIds }) => ({
        kind,
        mode,
        laneIds,
      })),
    ).toEqual([
      {
        kind: 'promoted-finding',
        mode: 'direct',
        laneIds: ['lane-delegated'],
      },
      {
        kind: 'consequential-absence',
        mode: 'direct',
        laneIds: ['lane-delegated'],
      },
      {
        kind: 'worker-conflict',
        mode: 'direct',
        laneIds: ['lane-delegated'],
      },
      {
        kind: 'cross-lane-gap',
        mode: 'direct',
        laneIds: ['lane-delegated'],
      },
      {
        kind: 'positive-coverage-sample',
        mode: 'sample',
        laneIds: ['lane-inline'],
      },
      {
        kind: 'positive-coverage-sample',
        mode: 'sample',
        laneIds: ['lane-delegated'],
      },
      {
        kind: 'deterministic-result',
        mode: 'provenance',
        laneIds: ['lane-delegated'],
      },
    ]);
    expect(validateReviewOutput(validationContext(context), terminal)).toEqual({
      valid: true,
      outputDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it('preserves blocked semantics for partial delegated coverage', () => {
    const { context, overlay } = fixture();
    context.workerCoverage[0] = {
      ...context.workerCoverage[0]!,
      outcome: 'partial',
      inspectedPathIndexes: [0],
      uncoveredPathIndexes: [1],
    };
    const delegated = overlay.reviewAccounting.lanes.find(
      (lane) => lane.laneId === 'lane-delegated',
    )!;
    delegated.inspectionCoverage = 'partial';
    delegated.uninspectedPathIndexes = [1];
    delegated.primaryCompletion.outcome = 'not-permitted';
    const blocked: ReviewerTerminalOverlayV1 = {
      ...overlay,
      status: 'blocked',
      reason: 'delegated coverage is partial',
      diagnostics: ['src/path-1.ts remains uncovered'],
    };

    const terminal = assembleReviewerTerminal(blocked, context);
    expect(terminal).toMatchObject({
      status: 'blocked',
      reviewAccounting: {
        completion: 'blocked-incomplete',
      },
    });
    expect(terminal.reviewAccounting.lanes[0]).toMatchObject({
      workerOutcome: 'partial',
      inspectionCoverage: 'partial',
    });
    expect(validateReviewOutput(validationContext(context), terminal)).toEqual({
      valid: true,
      outputDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it('preserves one typed direct claim per promoted structured finding', () => {
    const { context, overlay } = fixture();
    if (
      overlay.status !== 'complete' ||
      overlay.candidate.kind !== 'structured'
    ) {
      throw new Error('invalid test fixture');
    }
    overlay.candidate.review.findings = ['finding-1', 'finding-2'].map(
      (id, index) => ({
        id,
        severity: 'important' as const,
        title: `Finding ${index + 1}`,
        file: `src/path-${index}.ts`,
        line: index + 1,
        body: 'Body',
        fix_guidance: null,
      }),
    );
    const template = overlay.reviewAccounting.verification.promotedFindings[0]!;
    overlay.reviewAccounting.verification.promotedFindings = [
      {
        ...structuredClone(template),
        claimId: 'claim-promoted-2',
        findingId: 'finding-2',
        disposition: 'verified',
      },
      {
        ...structuredClone(template),
        claimId: 'claim-promoted-1',
        findingId: 'finding-1',
        disposition: 'verified',
      },
    ];

    const terminal = assembleReviewerTerminal(overlay, context);
    expect(
      terminal.reviewAccounting.verification
        .filter((claim) => claim.kind === 'promoted-finding')
        .map(({ findingId, kind, mode }) => ({ findingId, kind, mode })),
    ).toEqual([
      {
        findingId: 'finding-1',
        kind: 'promoted-finding',
        mode: 'direct',
      },
      {
        findingId: 'finding-2',
        kind: 'promoted-finding',
        mode: 'direct',
      },
    ]);
    expect(validateReviewOutput(validationContext(context), terminal)).toEqual({
      valid: true,
      outputDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it('composes bound worker coverage with an allowed primary contingency', () => {
    const { context, overlay } = fixture();
    context.assignment.lanes[0]!.primaryContingency = {
      allowed: true,
      paths: ['src/path-1.ts'],
      obligationIds: [],
    };
    context.workerCoverage[0] = {
      ...context.workerCoverage[0]!,
      outcome: 'partial',
      inspectedPathIndexes: [0],
      uncoveredPathIndexes: [1],
    };
    const delegated = overlay.reviewAccounting.lanes.find(
      (lane) => lane.laneId === 'lane-delegated',
    )!;
    delegated.primaryCompletion = {
      outcome: 'complete',
      completedPathIndexes: [1],
      completedObligationIds: [],
      commands: [],
      evidenceRefIds: ['evidence-1'],
    };

    const terminal = assembleReviewerTerminal(overlay, context);
    expect(terminal.reviewAccounting.lanes[0]).toMatchObject({
      workerOutcome: 'partial',
      inspectionCoverage: 'all',
      uninspectedPathIndexes: [],
    });
    expect(validateReviewOutput(validationContext(context), terminal)).toEqual({
      valid: true,
      outputDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it.each([
    [
      'duplicate lane',
      (overlay: ReviewerTerminalOverlayV1) => {
        overlay.reviewAccounting.lanes[0]!.laneId = 'lane-delegated';
      },
      'duplicate-overlay-selector',
    ],
    [
      'unknown lane',
      (overlay: ReviewerTerminalOverlayV1) => {
        overlay.reviewAccounting.lanes[0]!.laneId = 'unknown';
      },
      'unknown-overlay-selector',
    ],
    [
      'missing lane',
      (overlay: ReviewerTerminalOverlayV1) => {
        overlay.reviewAccounting.lanes.pop();
      },
      'missing-overlay-selector',
    ],
    [
      'extra classification',
      (overlay: ReviewerTerminalOverlayV1) => {
        overlay.reviewAccounting.classifications.push({
          ...overlay.reviewAccounting.classifications[0]!,
          classificationId: 'extra',
        });
      },
      'unknown-overlay-selector',
    ],
    [
      'missing positive coverage slot',
      (overlay: ReviewerTerminalOverlayV1) => {
        overlay.reviewAccounting.verification.positiveCoverage.pop();
      },
      'missing-overlay-selector',
    ],
    [
      'missing deterministic provenance slot',
      (overlay: ReviewerTerminalOverlayV1) => {
        overlay.reviewAccounting.verification.deterministicResults = [];
      },
      'missing-overlay-selector',
    ],
    [
      'deterministic result for a replayed lane',
      (overlay: ReviewerTerminalOverlayV1) => {
        overlay.reviewAccounting.verification.deterministicResults[0]!.laneIds =
          ['lane-inline'];
      },
      'unknown-overlay-selector',
    ],
    [
      'duplicate promoted finding selector',
      (overlay: ReviewerTerminalOverlayV1) => {
        const promoted =
          overlay.reviewAccounting.verification.promotedFindings[0]!;
        promoted.findingId = 'finding-1';
        overlay.reviewAccounting.verification.promotedFindings.push(
          structuredClone(promoted),
        );
        if (
          overlay.status === 'complete' &&
          overlay.candidate.kind === 'structured'
        ) {
          overlay.candidate.review.findings = [
            {
              id: 'finding-1',
              severity: 'important',
              title: 'Finding',
              file: 'src/path-0.ts',
              line: 1,
              body: 'Body',
              fix_guidance: null,
            },
          ];
        }
      },
      'duplicate-overlay-selector',
    ],
  ])('rejects %s join selectors', (_name, mutate, code) => {
    const { context, overlay } = fixture();
    mutate(overlay);
    expect(() => assembleReviewerTerminal(overlay, context)).toThrowError(
      expect.objectContaining({
        name: 'ReviewTerminalAssemblyError',
        code,
      }),
    );
  });

  it('requires deterministic command evidence scoped to its sealed provenance lane', () => {
    const { context, overlay } = fixture();
    const delegated = overlay.reviewAccounting.lanes.find(
      (lane) => lane.laneId === 'lane-delegated',
    )!;
    const command = delegated.commands[0]!;
    command.scopeRefs = [
      { bucket: 'lane', bucketId: 'lane-inline', pathIndexes: [0] },
    ];
    const evidence = overlay.reviewAccounting.evidence[0]!;
    evidence.scopeRefs = structuredClone(command.scopeRefs);
    if (evidence.kind !== 'command') throw new Error('invalid test fixture');
    evidence.commandResultDigest = commandResultDigest(command);

    const result = validateReviewOutput(
      validationContext(context),
      assembleReviewerTerminal(overlay, context),
    );
    expect(result).toMatchObject({
      valid: false,
      errors: [{ code: 'invalid-deterministic-provenance' }],
    });
  });

  it('emits deterministic provenance slots in sealed lane order', () => {
    const { context, overlay } = fixture();
    context.plan.lanes.splice(1, 0, {
      id: 'lane-delegated-2',
      delegated: true,
      replay: 'accept-provenance',
    });
    context.assignment.lanes.splice(1, 0, {
      ...structuredClone(context.assignment.lanes[0]!),
      id: 'lane-delegated-2',
      paths: ['src/delegated-2.ts'],
    });
    context.workerCoverage.push({
      ...structuredClone(context.workerCoverage[0]!),
      laneId: 'lane-delegated-2',
      dossierDigest: 'e'.repeat(64),
    });
    overlay.reviewAccounting.lanes.push({
      ...structuredClone(overlay.reviewAccounting.lanes[1]!),
      laneId: 'lane-delegated-2',
    });
    const deterministic =
      overlay.reviewAccounting.verification.deterministicResults[0]!;
    overlay.reviewAccounting.verification.deterministicResults = [
      {
        ...structuredClone(deterministic),
        claimId: 'claim-deterministic-2',
        laneIds: ['lane-delegated-2'],
      },
      deterministic,
    ];

    expect(
      assembleReviewerTerminal(overlay, context)
        .reviewAccounting.verification.filter(
          (claim) => claim.kind === 'deterministic-result',
        )
        .map((claim) => claim.laneIds[0]),
    ).toEqual(['lane-delegated', 'lane-delegated-2']);
  });

  it('defensively clones all immutable and authored arrays', () => {
    const { context, overlay } = fixture();
    const terminal = assembleReviewerTerminal(overlay, context);
    terminal.reviewAccounting.lanes[0]!.paths.push('mutated.ts');
    terminal.reviewAccounting.lanes[0]!.commands.length = 0;
    terminal.reviewAccounting.classifications[0]!.plannedChecks.push('mutated');
    terminal.reviewAccounting.verification[0]!.laneIds.push('lane-inline');

    expect(context.assignment.lanes[0]!.paths).not.toContain('mutated.ts');
    expect(context.assignment.classifications[0]!.checks).not.toContain(
      'mutated',
    );
    expect(
      overlay.reviewAccounting.lanes.find(
        (lane) => lane.laneId === 'lane-delegated',
      )!.commands,
    ).toHaveLength(1);
    expect(
      overlay.reviewAccounting.verification.promotedFindings[0]!.laneIds,
    ).toEqual(['lane-delegated']);
  });

  it('assembles and validates 209 paths without retaining an accounting seed', () => {
    const { context, overlay } = fixture(209);
    const terminal = assembleReviewerTerminal(overlay, context);

    expect(terminal.reviewAccounting.lanes[0]!.paths).toHaveLength(209);
    expect(
      'receipt' in overlay.reviewAccounting ||
        'paths' in overlay.reviewAccounting.lanes[0]!,
    ).toBe(false);
    expect(validateReviewOutput(validationContext(context), terminal)).toEqual({
      valid: true,
      outputDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });
});
