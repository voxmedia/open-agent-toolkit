import { execFile, spawn } from 'node:child_process';
import { access, chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import {
  allocateReviewTimeBudget,
  evaluateWholeDiffEligibility,
} from './budget';
import {
  executeCommandInvocation,
  executeCoordinatorCommandInvocation,
} from './command-invocation';
import { commandResultDigest } from './command-result-digest';
import type {
  ReviewAccountingV1,
  ReviewCommandEvidenceV1,
  ReviewPlanV1,
  ReviewerTerminalV1,
  ValidatedWorkerCoverageProjectionV1,
  WorkerDossierV1,
} from './types';
import { startPreparedValidationAuthorityBroker } from './validation-authority-broker';
import { ValidationStore } from './validation-store';
import { ValidationStoreAuthority } from './validation-store-authority';

const exec = promisify(execFile);
const roots: string[] = [];
const brokerClosers: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(brokerClosers.splice(0).map((close) => close()));
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

const planSource = `## Phase 2

### Task p02-t01: Composed worker lifecycle

**Files:**

- Modify: \`a.ts\`
- Modify: \`b.ts\`

**Step 1: Verify** Exercise the composed worker lifecycle.
`;

interface LifecycleFixture {
  root: string;
  validationRoot: string;
  key: Buffer;
  socketPath: string;
  store: ValidationStore;
  preparation: Awaited<
    ReturnType<typeof startPreparedValidationAuthorityBroker>
  >['preparation'];
}

interface LifecycleFixtureOptions {
  gateRunId?: string;
  launchAttemptId?: string;
  shared?: Pick<LifecycleFixture, 'root' | 'validationRoot' | 'key'>;
}

async function lifecycleFixture(
  sink: 'artifact' | 'structured',
  options: LifecycleFixtureOptions = {},
): Promise<LifecycleFixture> {
  const root =
    options.shared?.root ??
    (await mkdtemp(join(tmpdir(), `oat-dossier-${sink}-`)));
  if (options.shared === undefined) {
    roots.push(root);
    await exec('git', ['init', '-q'], { cwd: root });
    await exec('git', ['config', 'user.email', 'test@example.com'], {
      cwd: root,
    });
    await exec('git', ['config', 'user.name', 'Test'], { cwd: root });
    await writeFile(join(root, 'a.ts'), 'before\n');
    await writeFile(join(root, 'b.ts'), 'before\n');
    await exec('git', ['add', '.'], { cwd: root });
    await exec('git', ['commit', '-qm', 'base'], { cwd: root });
    await writeFile(join(root, 'a.ts'), 'after\n');
    await writeFile(join(root, 'b.ts'), 'after\n');
    await exec('git', ['commit', '-qam', 'head'], { cwd: root });
  }
  const baseSha = (
    await exec('git', ['rev-parse', 'HEAD~1'], { cwd: root })
  ).stdout.trim();
  const headSha = (
    await exec('git', ['rev-parse', 'HEAD'], { cwd: root })
  ).stdout.trim();

  const socketDirectory = await mkdtemp(
    join(tmpdir(), 'oat-dossier-authority-'),
  );
  roots.push(socketDirectory);
  const socketPath = join(socketDirectory, 'broker.sock');
  const validationRoot =
    options.shared?.validationRoot ??
    (await mkdtemp(join(tmpdir(), 'oat-dossier-validation-')));
  if (options.shared === undefined) roots.push(validationRoot);
  const key =
    options.shared?.key ?? Buffer.alloc(32, sink === 'artifact' ? 31 : 32);
  const sourceEntry = resolve('src/index.ts');
  const broker = await startPreparedValidationAuthorityBroker({
    socketPath,
    key,
    validationRoot,
    coordinatorCapabilities: {
      schemaVersion: 1,
      bindToken: `bind-capability-${sink}`,
      cleanupToken: `cleanup-capability-${sink}`,
    },
    startup: {
      input: {
        repoRoot: root,
        project: '.oat/projects/shared/demo',
        scope: 'p02-t01',
        workflowMode: 'spec-driven',
        range: { baseSha, headSha },
        sink,
        invocation: options.gateRunId === undefined ? 'manual' : 'gate',
        budget: { totalMs: 120_000, source: 'test' },
        ...(options.gateRunId === undefined
          ? {}
          : {
              gateRunId: options.gateRunId,
              launchAttemptId: options.launchAttemptId,
            }),
        obligationSources: {
          plan: { source: planSource, path: 'plan.md' },
          implementation: null,
        },
        target: 'reviewer',
      },
      launcherInvocation: {
        executable: resolve('../../node_modules/.bin/tsx'),
        argvPrefix: ['--tsconfig', resolve('tsconfig.json'), sourceEntry],
        cwd: resolve('.'),
      },
    },
  });
  const bound = await executeCoordinatorCommandInvocation(
    broker.preparation.coordinatorCommands!.bindAcceptedContinuation,
    {
      stdin: JSON.stringify({
        schemaVersion: 1,
        handleId: `accepted-${sink}`,
      }),
    },
  );
  expect(bound.exitCode, `${bound.stderr}\n${bound.stdout}`).toBe(0);
  brokerClosers.push(broker.close);
  return {
    root,
    validationRoot,
    key,
    socketPath,
    preparation: broker.preparation,
    store: new ValidationStore(
      validationRoot,
      new ValidationStoreAuthority(key),
    ),
  };
}

function reviewPlan(
  runId: string,
  contextDigest: string,
  context: NonNullable<
    Awaited<ReturnType<ValidationStore['readRun']>>['state']['context']
  >,
): ReviewPlanV1 {
  const time = context.budget.time!;
  const timeAllocation = allocateReviewTimeBudget({
    totalMs: time.totalMs,
    source: time.source,
    startedAtMs: time.deadlineMs - time.totalMs,
  }).allocation;
  return {
    schemaVersion: 1,
    runId,
    contextDigest,
    strategy: 'delegated',
    lanes: [
      {
        id: 'review-lane',
        paths: ['a.ts'],
        primaryObligationIds: ['p02-t01'],
        seamObligationIds: [],
        risk: 'low',
        evidenceClass: 'semantic',
        strategy: 'path-diff',
        checks: ['inspect'],
        delegated: true,
        independenceRationale: 'Independent bounded review lane.',
        substantial: true,
        substantialityRationale: 'Owns the review path.',
        deadlineMs: timeAllocation.planningDeadlineMs + 1,
        dossier: { contractVersion: 1, partialAllowed: true },
        replay: 'sample',
        primaryContingency: {
          allowed: true,
          paths: ['a.ts'],
          obligationIds: ['p02-t01'],
        },
      },
      {
        id: 'verification-lane',
        paths: ['b.ts'],
        primaryObligationIds: [],
        seamObligationIds: [],
        risk: 'low',
        evidenceClass: 'deterministic',
        strategy: 'command',
        checks: ['verify'],
        delegated: true,
        independenceRationale: 'Independent deterministic verification.',
        substantial: true,
        substantialityRationale: 'Owns the verification boundary.',
        deadlineMs: timeAllocation.planningDeadlineMs + 1,
        dossier: { contractVersion: 1, partialAllowed: true },
        replay: 'accept-provenance',
        primaryContingency: {
          allowed: false,
          paths: [],
          obligationIds: [],
        },
      },
    ],
    classifications: [],
    crossLaneInvariants: [],
    delegationEconomics: {
      independentLaneIds: ['review-lane', 'verification-lane'],
      nonReplayedLaneIds: ['verification-lane'],
      expectedSavings: ['Bounded concurrent inspection.'],
      coordinationCosts: ['One dossier reconciliation.'],
      decisionRationale: 'Delegation is bounded.',
      decision: 'delegate',
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
        laneIds: ['review-lane', 'verification-lane'],
        rationale: 'Sample both delegated lanes.',
      },
      deterministicAcceptance: {
        mode: 'provenance',
        requiredFields: ['command', 'cwd', 'scopeRefs', 'provenance', 'result'],
      },
    },
    wholeDiff: evaluateWholeDiffEligibility({
      changeMap: context.changeMap,
      contextBudget: context.budget.context,
      coherentLaneCount: 1,
      hasConsequentialSeam: false,
    }),
    timeAllocation,
  };
}

function workerDossier(
  runId: string,
  planDigest: string,
  laneId: 'review-lane' | 'verification-lane',
  outcome: 'complete' | 'partial' = 'complete',
): WorkerDossierV1 {
  const verification = laneId === 'verification-lane';
  const dossier: WorkerDossierV1 = {
    schemaVersion: 1,
    runId,
    planDigest,
    laneId,
    outcome,
    inspectedPaths:
      outcome === 'complete' ? [verification ? 'b.ts' : 'a.ts'] : [],
    inspectedObligationIds:
      outcome === 'complete' && !verification ? ['p02-t01'] : [],
    commands: [],
    evidence: [],
    candidateFindings: [],
    uncoveredObligationIds:
      outcome === 'partial' && !verification ? ['p02-t01'] : [],
    uncertainty:
      outcome === 'partial' ? ['Worker stopped before inspection.'] : [],
  };
  if (verification) {
    const command: ReviewCommandEvidenceV1 = {
      id: 'verification-command',
      command: 'pnpm test',
      cwd: '.',
      scopeRefs: [
        {
          bucket: 'lane',
          bucketId: 'verification-lane',
          pathIndexes: [0],
        },
      ],
      provenance: {
        runner: 'worker',
        invocationDigest: 'verification-invocation',
        capturedAt: '2026-08-02T20:00:00.000Z',
      },
      result: {
        status: 'completed',
        exitCode: 0,
        outputDigest: 'verification-output',
      },
    };
    dossier.commands.push(command);
    dossier.evidence.push({
      id: 'verification-command-evidence',
      kind: 'command',
      locator: 'command:verification-command',
      scopeRefs: command.scopeRefs,
      provenance: 'validated command executor',
      digest: 'command-evidence-digest',
      commandId: command.id,
      commandResultDigest: commandResultDigest(command),
    });
  }
  return dossier;
}

function terminal(
  receipt: {
    token: string;
    contextDigest: string;
    planDigest: string;
    assignmentDigest: string;
  },
  reviewCoverage: ValidatedWorkerCoverageProjectionV1,
  verificationCoverage: ValidatedWorkerCoverageProjectionV1,
): ReviewerTerminalV1 {
  const verificationCommand: ReviewCommandEvidenceV1 = {
    id: 'verification-command',
    command: 'pnpm test',
    cwd: '.',
    scopeRefs: [
      {
        bucket: 'lane',
        bucketId: 'verification-lane',
        pathIndexes: [0],
      },
    ],
    provenance: {
      runner: 'worker',
      invocationDigest: 'verification-invocation',
      capturedAt: '2026-08-02T20:00:00.000Z',
    },
    result: {
      status: 'completed',
      exitCode: 0,
      outputDigest: 'verification-output',
    },
  };
  const evidence = {
    id: 'evidence-1',
    kind: 'source' as const,
    locator: 'validated review scope',
    scopeRefs: [
      {
        bucket: 'lane' as const,
        bucketId: 'review-lane',
        pathIndexes: [0],
      },
      {
        bucket: 'lane' as const,
        bucketId: 'verification-lane',
        pathIndexes: [0],
      },
    ],
    provenance: 'reviewer',
    digest: 'evidence',
    commandId: null,
    commandResultDigest: null,
  };
  const accounting: ReviewAccountingV1 = {
    schemaVersion: 1,
    receipt: receipt.token,
    contextDigest: receipt.contextDigest,
    planDigest: receipt.planDigest,
    assignmentDigest: receipt.assignmentDigest,
    strategy: 'delegated',
    completion: 'complete',
    evidence: [
      evidence,
      {
        id: 'verification-command-evidence',
        kind: 'command',
        locator: 'command:verification-command',
        scopeRefs: structuredClone(verificationCommand.scopeRefs),
        provenance: 'validated command executor',
        digest: 'command-evidence-digest',
        commandId: verificationCommand.id,
        commandResultDigest: commandResultDigest(verificationCommand),
      },
    ],
    lanes: [
      {
        id: 'review-lane',
        paths: ['a.ts'],
        primaryObligationIds: ['p02-t01'],
        seamObligationIds: [],
        workerOutcome: reviewCoverage.outcome,
        dossierDigest: reviewCoverage.dossierDigest,
        inspectionCoverage: 'all',
        uninspectedPathIndexes: [],
        uncoveredObligationIds: [],
        commands: [],
        evidenceRefIds: ['evidence-1'],
        uncertainty: [],
        primaryCompletion:
          reviewCoverage.outcome === 'partial'
            ? {
                outcome: 'complete',
                completedPathIndexes: [0],
                completedObligationIds: ['p02-t01'],
                commands: [],
                evidenceRefIds: ['evidence-1'],
              }
            : {
                outcome: 'not-needed',
                completedPathIndexes: [],
                completedObligationIds: [],
                commands: [],
                evidenceRefIds: [],
              },
      },
      {
        id: 'verification-lane',
        paths: ['b.ts'],
        primaryObligationIds: [],
        seamObligationIds: [],
        workerOutcome: 'complete',
        dossierDigest: verificationCoverage.dossierDigest,
        inspectionCoverage: 'all',
        uninspectedPathIndexes: [],
        uncoveredObligationIds: [],
        commands: [verificationCommand],
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
    classifications: [],
    verification: [
      {
        claimId: 'promoted',
        kind: 'promoted-finding',
        findingId: null,
        laneIds: ['review-lane'],
        mode: 'direct',
        disposition: 'rejected',
        evidenceRefIds: ['evidence-1'],
      },
      ...(
        ['consequential-absence', 'worker-conflict', 'cross-lane-gap'] as const
      ).map((kind) => ({
        claimId: kind,
        kind,
        findingId: null,
        laneIds: ['review-lane'],
        mode: 'direct' as const,
        disposition: 'rejected' as const,
        evidenceRefIds: ['evidence-1'],
      })),
      {
        claimId: 'positive',
        kind: 'positive-coverage-sample',
        findingId: null,
        laneIds: ['review-lane', 'verification-lane'],
        mode: 'sample',
        disposition: 'verified',
        evidenceRefIds: ['evidence-1'],
      },
      {
        claimId: 'verification-deterministic',
        kind: 'deterministic-result',
        findingId: null,
        laneIds: ['verification-lane'],
        mode: 'provenance',
        disposition: 'verified',
        evidenceRefIds: ['verification-command-evidence'],
      },
    ],
    budget: { evidenceStoppedAt: null, outputReservePreserved: null },
  };
  return {
    schemaVersion: 1,
    status: 'complete',
    candidate: {
      kind: 'structured',
      review: {
        summary: `${reviewCoverage.outcome} composed review`,
        findings: [],
        verification_commands: [],
      },
    },
    reviewAccounting: accounting,
  };
}

async function executeLauncherCommand(input: {
  fixture: LifecycleFixture;
  args: string[];
  stdin: string;
}) {
  const command = input.fixture.preparation.commands.bindWorkerDossier;
  const commandIndex = command.argv.indexOf('review');
  const child = spawn(
    command.executable,
    [...command.argv.slice(0, commandIndex), ...input.args],
    {
      cwd: resolve('..', '..'),
      env: {
        ...process.env,
        OAT_REVIEW_AUTHORITY_KEY: input.fixture.key.toString('base64url'),
        OAT_REVIEW_VALIDATION_ROOT: input.fixture.validationRoot,
      },
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
  child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
  child.stdin.end(input.stdin);
  const exitCode = await new Promise<number | null>((resolveExit, reject) => {
    child.once('error', reject);
    child.once('close', resolveExit);
  });
  return {
    exitCode,
    stdout: Buffer.concat(stdout).toString('utf8'),
    stderr: Buffer.concat(stderr).toString('utf8'),
  };
}

function binderInvocation(
  fixture: LifecycleFixture,
  receipt: string,
  runId = fixture.preparation.preparation.runId,
) {
  const invocation = structuredClone(
    fixture.preparation.commands.bindWorkerDossier,
  );
  invocation.argv[invocation.argv.indexOf('__OAT_PLAN_RECEIPT__')] = receipt;
  invocation.argv[invocation.argv.indexOf('--run-id') + 1] = runId;
  return invocation;
}

async function prepareEvidence(fixture: LifecycleFixture) {
  const checkpoint = await executeCommandInvocation(
    fixture.preparation.commands.checkpointArtifacts,
    {},
  );
  expect(checkpoint.exitCode, checkpoint.stderr).toBe(0);
  const context = (
    await fixture.store.readRun(fixture.preparation.preparation.runId)
  ).state.context!;
  const validation = await executeCommandInvocation(
    fixture.preparation.commands.validatePlan,
    {
      stdin: JSON.stringify(
        reviewPlan(
          fixture.preparation.preparation.runId,
          context.contextDigest,
          context,
        ),
      ),
    },
  );
  expect(
    validation.exitCode,
    `${validation.stderr}\n${validation.stdout}`,
  ).toBe(0);
  const receipt = (
    JSON.parse(validation.stdout) as {
      result: {
        receipt: {
          token: string;
          contextDigest: string;
          planDigest: string;
          assignmentDigest: string;
        };
      };
    }
  ).result.receipt;
  const begin = structuredClone(fixture.preparation.commands.beginEvidence);
  begin.argv[begin.argv.indexOf('__OAT_PLAN_RECEIPT__')] = receipt.token;
  const started = await executeCommandInvocation(begin);
  expect(started.exitCode, started.stderr).toBe(0);
  return receipt;
}

async function bind(
  fixture: LifecycleFixture,
  receipt: string,
  dossier: WorkerDossierV1,
) {
  const result = await executeCommandInvocation(
    binderInvocation(fixture, receipt),
    {
      environment: {
        ...process.env,
        PATH: `${join(fixture.root, 'shadow-bin')}:${process.env.PATH ?? ''}`,
      },
      stdin: JSON.stringify(dossier),
    },
  );
  return {
    ...result,
    envelope: JSON.parse(result.stdout) as {
      ok: boolean;
      result?: ValidatedWorkerCoverageProjectionV1;
      error?: { code: string };
    },
  };
}

describe('branch-local worker dossier lifecycle', () => {
  it.each([
    ['structured', 'complete'],
    ['artifact', 'partial'],
  ] as const)(
    'composes %s output after process-level %s dossier binding',
    async (sink, outcome) => {
      const fixture = await lifecycleFixture(sink);
      const shadowBin = join(fixture.root, 'shadow-bin');
      const shadowMarker = join(fixture.root, 'ambient-oat-used');
      await mkdir(shadowBin);
      const shadowOat = join(shadowBin, 'oat');
      await writeFile(
        shadowOat,
        `#!/bin/sh\ntouch "${shadowMarker}"\nexit 99\n`,
      );
      await chmod(shadowOat, 0o700);
      const receipt = await prepareEvidence(fixture);
      const reviewDossier = workerDossier(
        fixture.preparation.preparation.runId,
        receipt.planDigest,
        'review-lane',
        outcome,
      );
      const verificationDossier = workerDossier(
        fixture.preparation.preparation.runId,
        receipt.planDigest,
        'verification-lane',
      );

      const reviewBinding = await bind(fixture, receipt.token, reviewDossier);
      expect(reviewBinding.exitCode, reviewBinding.stderr).toBe(0);
      expect(reviewBinding.envelope.ok).toBe(true);
      const identical = await bind(fixture, receipt.token, reviewDossier);
      expect(identical.exitCode, identical.stderr).toBe(0);
      expect(identical.envelope.result).toEqual(reviewBinding.envelope.result);
      const verificationBinding = await bind(
        fixture,
        receipt.token,
        verificationDossier,
      );
      expect(verificationBinding.exitCode, verificationBinding.stderr).toBe(0);
      await expect(access(shadowMarker)).rejects.toMatchObject({
        code: 'ENOENT',
      });

      const value = terminal(
        receipt,
        reviewBinding.envelope.result!,
        verificationBinding.envelope.result!,
      );
      if (sink === 'artifact') {
        if (value.status !== 'complete') throw new Error('invalid terminal');
        value.candidate = {
          kind: 'artifact-draft',
          privateDraftPath: fixture.preparation.artifactDraftPath!,
        };
        await writeFile(
          fixture.preparation.artifactDraftPath!,
          `# Review\n\nFindings: 0 critical, 0 important, 0 medium, 0 minor\n\n## Review Accounting\n\n\`\`\`json\n${JSON.stringify(value.reviewAccounting)}\n\`\`\`\n`,
        );
      }
      const output = await executeLauncherCommand({
        fixture,
        args: [
          'review',
          'validate-output',
          '--run-id',
          fixture.preparation.preparation.runId,
          '--stdin',
          '--json',
        ],
        stdin: JSON.stringify(value),
      });
      expect(output.exitCode, `${output.stderr}\n${output.stdout}`).toBe(0);
      expect(JSON.parse(output.stdout)).toMatchObject({
        ok: true,
        result: { valid: true },
      });
      await expect(
        fixture.store.readRun(fixture.preparation.preparation.runId),
      ).resolves.toMatchObject({
        state: {
          phase: 'accepted',
          workerCoverage: [
            { laneId: 'review-lane', outcome },
            { laneId: 'verification-lane', outcome: 'complete' },
          ],
        },
      });

      const lateReplay = await bind(fixture, receipt.token, reviewDossier);
      expect(lateReplay.exitCode).toBe(1);
      expect(lateReplay.envelope.error?.code).toBe(
        'worker-dossier-binding-phase-invalid',
      );
    },
    90_000,
  );

  it('fails closed for wrong receipt, run/plan mismatch, sibling attempt, and replacement', async () => {
    const gateRunId = 'shared-gate-run';
    const fixture = await lifecycleFixture('structured', {
      gateRunId,
      launchAttemptId: 'current-launch-attempt',
    });
    const sibling = await lifecycleFixture('structured', {
      gateRunId,
      launchAttemptId: 'sibling-launch-attempt',
      shared: fixture,
    });
    const receipt = await prepareEvidence(fixture);
    const siblingReceipt = await prepareEvidence(sibling);
    const dossier = workerDossier(
      fixture.preparation.preparation.runId,
      receipt.planDigest,
      'review-lane',
    );

    expect(fixture.preparation.preparation.correlation).toEqual({
      gateRunId,
      launchAttemptId: 'current-launch-attempt',
    });
    expect(sibling.preparation.preparation.correlation).toEqual({
      gateRunId,
      launchAttemptId: 'sibling-launch-attempt',
    });

    const wrongReceipt = await bind(fixture, 'wrong-receipt-token', dossier);
    expect(wrongReceipt.exitCode).toBe(1);
    expect(wrongReceipt.envelope.error?.code).toBe(
      'worker-dossier-receipt-mismatch',
    );

    const runPlanMismatch = await bind(
      fixture,
      receipt.token,
      workerDossier(
        sibling.preparation.preparation.runId,
        siblingReceipt.planDigest,
        'review-lane',
      ),
    );
    expect(runPlanMismatch.exitCode).toBe(1);
    expect(runPlanMismatch.envelope.error?.code).toBe(
      'worker-dossier-validation-failed',
    );

    const siblingAttempt = await bind(
      fixture,
      siblingReceipt.token,
      workerDossier(
        sibling.preparation.preparation.runId,
        siblingReceipt.planDigest,
        'review-lane',
      ),
    );
    expect(siblingAttempt.exitCode).toBe(1);
    expect(siblingAttempt.envelope.error?.code).toBe(
      'worker-dossier-receipt-mismatch',
    );
    await expect(
      fixture.store.readRun(fixture.preparation.preparation.runId),
    ).resolves.toMatchObject({ state: { workerCoverage: [] } });
    await expect(
      sibling.store.readRun(sibling.preparation.preparation.runId),
    ).resolves.toMatchObject({ state: { workerCoverage: [] } });

    const accepted = await bind(fixture, receipt.token, dossier);
    expect(accepted.exitCode).toBe(0);
    const replacement = await bind(fixture, receipt.token, {
      ...dossier,
      outcome: 'partial',
      inspectedPaths: [],
      inspectedObligationIds: [],
      uncoveredObligationIds: ['p02-t01'],
      uncertainty: ['replacement'],
    });
    expect(replacement.exitCode).toBe(1);
    expect(replacement.envelope.error?.code).toBe(
      'worker-dossier-replacement-rejected',
    );
  }, 30_000);
});
