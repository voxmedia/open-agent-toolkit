import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import {
  allocateReviewTimeBudget,
  evaluateWholeDiffEligibility,
} from './budget';
import { executeCommandInvocation } from './command-invocation';
import type {
  ReviewCommandInvocationV1,
  ReviewPlanV1,
  WorkerDossierV1,
} from './types';
import {
  requestValidationAuthorityBroker,
  startPreparedValidationAuthorityBroker,
} from './validation-authority-broker';
import { ValidationStore } from './validation-store';
import { ValidationStoreAuthority } from './validation-store-authority';

const exec = promisify(execFile);
const roots: string[] = [];

function executeFromCallerCwd(
  callerCwd: string,
  invocation: ReviewCommandInvocationV1,
  options?: Parameters<typeof executeCommandInvocation>[1],
) {
  const previousCwd = process.cwd();
  process.chdir(callerCwd);
  try {
    return executeCommandInvocation(invocation, options);
  } finally {
    process.chdir(previousCwd);
  }
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

const planSource = `## Phase 2

### Task p02-t01: Broker lifecycle

**Files:**

- Modify: \`a.ts\`

**Step 1: Verify** Broker behavior.
`;

async function repositoryFixture() {
  const root = await mkdtemp(join(tmpdir(), 'oat-authority-broker-'));
  roots.push(root);
  await exec('git', ['init', '-q'], { cwd: root });
  await exec('git', ['config', 'user.email', 'test@example.com'], {
    cwd: root,
  });
  await exec('git', ['config', 'user.name', 'Test'], { cwd: root });
  await writeFile(join(root, 'a.ts'), 'before\n');
  await exec('git', ['add', '.'], { cwd: root });
  await exec('git', ['commit', '-qm', 'base'], { cwd: root });
  const baseSha = (
    await exec('git', ['rev-parse', 'HEAD'], { cwd: root })
  ).stdout.trim();
  await writeFile(join(root, 'a.ts'), 'after\n');
  await exec('git', ['commit', '-qam', 'head'], { cwd: root });
  const headSha = (
    await exec('git', ['rev-parse', 'HEAD'], { cwd: root })
  ).stdout.trim();
  const socketDirectory = await mkdtemp(
    join(tmpdir(), 'oat-review-authority-'),
  );
  roots.push(socketDirectory);
  const socketPath = join(socketDirectory, 'broker.sock');
  const validationRoot = join(root, '..', `authority-state-${Date.now()}`);
  roots.push(validationRoot);
  const sourceEntry = resolve('src/index.ts');
  return {
    root,
    validationRoot,
    socketDirectory,
    socketPath,
    baseSha,
    headSha,
    sourceEntry,
  };
}

async function fixture(
  timings?: {
    connectionReadTimeoutMs?: number;
    shutdownTimeoutMs?: number;
    expiryMs?: number;
  },
  delegated = false,
) {
  const {
    root,
    validationRoot,
    socketDirectory,
    socketPath,
    baseSha,
    headSha,
    sourceEntry,
  } = await repositoryFixture();
  const key = Buffer.alloc(32, 11);
  const broker = await startPreparedValidationAuthorityBroker({
    socketPath,
    key,
    validationRoot,
    acceptedContinuation: {
      schemaVersion: 1,
      handleId: 'accepted-handle',
    },
    timings,
    startup: {
      input: {
        repoRoot: root,
        project: '.oat/projects/shared/demo',
        scope: 'p02-t01',
        workflowMode: 'spec-driven',
        range: { baseSha, headSha },
        sink: 'structured',
        invocation: 'manual',
        budget: delegated ? { totalMs: 120_000, source: 'test' } : null,
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
  const store = new ValidationStore(
    validationRoot,
    new ValidationStoreAuthority(key),
  );
  return {
    root,
    validationRoot,
    key,
    socketDirectory,
    socketPath,
    broker,
    store,
    baseSha,
    headSha,
  };
}

function plan(
  runId: string,
  contextDigest: string,
  wholeDiff: ReviewPlanV1['wholeDiff'],
  delegated = false,
  timeAllocation: ReviewPlanV1['timeAllocation'] = null,
): ReviewPlanV1 {
  return {
    schemaVersion: 1,
    runId,
    contextDigest,
    strategy: delegated ? 'delegated' : 'selective-inline',
    lanes: [
      {
        id: 'lane-1',
        paths: ['a.ts'],
        primaryObligationIds: ['p02-t01'],
        seamObligationIds: [],
        risk: 'low',
        evidenceClass: 'semantic',
        strategy: 'path-diff',
        checks: ['inspect'],
        delegated,
        independenceRationale: delegated ? 'Independent bounded lane.' : null,
        substantial: delegated,
        substantialityRationale: delegated
          ? 'Owns the complete changed path.'
          : null,
        deadlineMs: timeAllocation
          ? timeAllocation.planningDeadlineMs + 1
          : null,
        dossier: { contractVersion: 1, partialAllowed: true },
        replay: delegated ? 'sample' : 'direct-verify',
        primaryContingency: delegated
          ? {
              allowed: true,
              paths: ['a.ts'],
              obligationIds: ['p02-t01'],
            }
          : { allowed: false, paths: [], obligationIds: [] },
      },
      ...(delegated
        ? [
            {
              id: 'verification-lane',
              paths: [],
              primaryObligationIds: [],
              seamObligationIds: [],
              risk: 'low' as const,
              evidenceClass: 'deterministic' as const,
              strategy: 'inventory' as const,
              checks: ['verify'],
              delegated: true,
              independenceRationale: 'Independent deterministic verification.',
              substantial: true,
              substantialityRationale: 'Owns the verification boundary.',
              deadlineMs: timeAllocation!.planningDeadlineMs + 1,
              dossier: { contractVersion: 1 as const, partialAllowed: true },
              replay: 'accept-provenance' as const,
              primaryContingency: {
                allowed: false as const,
                paths: [],
                obligationIds: [],
              },
            },
          ]
        : []),
    ],
    classifications: [],
    crossLaneInvariants: [],
    delegationEconomics: {
      independentLaneIds: delegated ? ['lane-1', 'verification-lane'] : [],
      nonReplayedLaneIds: delegated ? ['verification-lane'] : [],
      expectedSavings: delegated ? ['Bounded concurrent inspection.'] : [],
      coordinationCosts: delegated ? ['One dossier reconciliation.'] : [],
      decisionRationale: delegated ? 'Delegation is bounded.' : 'inline',
      decision: delegated ? 'delegate' : 'inline',
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
        laneIds: delegated ? ['lane-1', 'verification-lane'] : ['lane-1'],
        rationale: 'sample',
      },
      deterministicAcceptance: {
        mode: 'provenance',
        requiredFields: ['command', 'cwd', 'scopeRefs', 'provenance', 'result'],
      },
    },
    wholeDiff,
    timeAllocation,
  };
}

function workerDossier(
  runId: string,
  planDigest: string,
  outcome: 'complete' | 'partial' = 'complete',
): WorkerDossierV1 {
  return {
    schemaVersion: 1,
    runId,
    planDigest,
    laneId: 'lane-1',
    outcome,
    inspectedPaths: outcome === 'complete' ? ['a.ts'] : [],
    inspectedObligationIds: outcome === 'complete' ? ['p02-t01'] : [],
    commands: [],
    evidence: [],
    candidateFindings: [],
    uncoveredObligationIds: outcome === 'complete' ? [] : ['p02-t01'],
    uncertainty:
      outcome === 'complete' ? [] : ['Worker stopped before review.'],
  };
}

describe('validation authority broker', () => {
  it('runs every one-shot lifecycle command in a separate keyless process', async () => {
    const { root, broker, store, socketDirectory, socketPath } = await fixture({
      connectionReadTimeoutMs: 5_000,
      shutdownTimeoutMs: 100,
    });
    const [checkpoint, validate, begin] = [
      broker.preparation.commands.checkpointArtifacts,
      broker.preparation.commands.validatePlan,
      broker.preparation.commands.beginEvidence,
    ];
    const invalidCheckpoint = structuredClone(checkpoint);
    invalidCheckpoint.argv[
      invalidCheckpoint.argv.indexOf('--checkpoint-token') + 1
    ] = 'wrong-capability';
    const capabilityFailure = await executeCommandInvocation(
      invalidCheckpoint,
      {},
    );
    expect(capabilityFailure.exitCode).toBe(1);
    expect(JSON.parse(capabilityFailure.stdout)).toMatchObject({
      error: {
        category: 'contract',
        code: 'command-capability-rejected',
      },
    });
    const checkpointResult = await executeCommandInvocation(checkpoint, {
      environment: {
        ...process.env,
        OAT_REVIEW_AUTHORITY_KEY: 'must-not-reach-command',
      },
    });
    expect(
      checkpointResult.exitCode,
      `${checkpointResult.stderr}\n${JSON.stringify(checkpoint)}`,
    ).toBe(0);
    const replay = await executeCommandInvocation(checkpoint, {});
    expect(replay.exitCode).toBe(1);
    expect(JSON.parse(replay.stdout)).toMatchObject({
      error: {
        category: 'contract',
        code: 'command-capability-rejected',
      },
    });
    const checkpointEnvelope = JSON.parse(checkpointResult.stdout) as {
      result: { contextDigest: string };
    };
    const context = (await store.readRun(broker.preparation.preparation.runId))
      .state.context!;
    const validateResult = await executeCommandInvocation(validate, {
      stdin: JSON.stringify(
        plan(
          broker.preparation.preparation.runId,
          checkpointEnvelope.result.contextDigest,
          evaluateWholeDiffEligibility({
            changeMap: context.changeMap,
            contextBudget: context.budget.context,
            coherentLaneCount: 1,
            hasConsequentialSeam: false,
          }),
        ),
      ),
      environment: {
        ...process.env,
        OAT_REVIEW_AUTHORITY_KEY: 'must-not-reach-command',
      },
    });
    expect(
      validateResult.exitCode,
      `${validateResult.stderr}\n${validateResult.stdout}`,
    ).toBe(0);
    const validateEnvelope = JSON.parse(validateResult.stdout) as {
      result: { receipt: { token: string } };
    };
    const receiptIndex = begin.argv.indexOf('__OAT_PLAN_RECEIPT__');
    const invalidBegin = structuredClone(begin);
    invalidBegin.argv[receiptIndex] = 'wrong-receipt-token';
    const receiptFailure = await executeCommandInvocation(invalidBegin, {});
    expect(receiptFailure.exitCode).toBe(1);
    expect(JSON.parse(receiptFailure.stdout)).toMatchObject({
      error: {
        category: 'validation',
        code: 'plan-receipt-identity-mismatch',
      },
    });
    const pinned = createConnection(socketPath);
    pinned.on('error', () => undefined);
    await waitForSocketConnect(pinned);
    const pinnedClosed = waitForSocketClose(pinned);
    await new Promise<void>((resolveWrite, reject) => {
      pinned.write('{"schemaVersion":1', (error) => {
        if (error) reject(error);
        else resolveWrite();
      });
    });
    begin.argv[receiptIndex] = validateEnvelope.result.receipt.token;
    const beginResult = await executeCommandInvocation(begin, {
      environment: {
        ...process.env,
        OAT_REVIEW_AUTHORITY_KEY: 'must-not-reach-command',
      },
    });
    expect(beginResult.exitCode).toBe(0);
    expect(JSON.parse(beginResult.stdout)).toEqual({
      ok: true,
      result: {
        validationRunId: broker.preparation.preparation.runId,
        phase: 'evidence_started',
      },
    });
    await withinDeadline(broker.closed, 500);
    await withinDeadline(pinnedClosed, 500);
    await expect(stat(socketDirectory)).rejects.toMatchObject({
      code: 'ENOENT',
    });
    const transportFailure = await executeCommandInvocation(begin, {});
    expect(transportFailure.exitCode).toBe(2);
    expect(JSON.parse(transportFailure.stdout)).toMatchObject({
      error: {
        category: 'system',
        code: 'review-json-system-error',
      },
    });
    expect(root).not.toContain('OAT_REVIEW_AUTHORITY_KEY');
  }, 40_000);

  it('binds receipt-correlated delegated dossiers before output validation', async () => {
    const { broker, store, socketPath } = await fixture(undefined, true);
    const runId = broker.preparation.preparation.runId;
    const checkpoint = await executeCommandInvocation(
      broker.preparation.commands.checkpointArtifacts,
      {},
    );
    expect(checkpoint.exitCode, checkpoint.stderr).toBe(0);
    const context = (await store.readRun(runId)).state.context!;
    const candidate = plan(
      runId,
      context.contextDigest,
      evaluateWholeDiffEligibility({
        changeMap: context.changeMap,
        contextBudget: context.budget.context,
        coherentLaneCount: 1,
        hasConsequentialSeam: false,
      }),
      true,
      allocateReviewTimeBudget({
        totalMs: context.budget.time!.totalMs,
        source: context.budget.time!.source,
        startedAtMs:
          context.budget.time!.deadlineMs - context.budget.time!.totalMs,
      }).allocation,
    );
    const validated = await executeCommandInvocation(
      broker.preparation.commands.validatePlan,
      { stdin: JSON.stringify(candidate) },
    );
    expect(validated.exitCode, `${validated.stderr}\n${validated.stdout}`).toBe(
      0,
    );
    const receipt = (
      JSON.parse(validated.stdout) as {
        result: { receipt: { token: string; planDigest: string } };
      }
    ).result.receipt;
    const begin = structuredClone(broker.preparation.commands.beginEvidence);
    begin.argv[begin.argv.indexOf('__OAT_PLAN_RECEIPT__')] = receipt.token;
    const started = await executeCommandInvocation(begin, {});
    expect(started.exitCode, started.stderr).toBe(0);

    const dossier = workerDossier(runId, receipt.planDigest);
    const first = await requestValidationAuthorityBroker(socketPath, {
      action: 'bind-worker-dossier',
      runId,
      receipt: receipt.token,
      dossier,
    });
    await expect(
      requestValidationAuthorityBroker(socketPath, {
        action: 'bind-worker-dossier',
        runId,
        receipt: receipt.token,
        dossier,
      }),
    ).resolves.toEqual(first);
    await expect(
      requestValidationAuthorityBroker(socketPath, {
        action: 'bind-worker-dossier',
        runId,
        receipt: 'wrong-receipt-token',
        dossier,
      }),
    ).rejects.toMatchObject({ code: 'worker-dossier-receipt-mismatch' });
    await expect(
      requestValidationAuthorityBroker(socketPath, {
        action: 'bind-worker-dossier',
        runId,
        receipt: receipt.token,
        dossier: workerDossier(runId, receipt.planDigest, 'partial'),
      }),
    ).rejects.toMatchObject({ code: 'worker-dossier-replacement-rejected' });
    expect((await store.readRun(runId)).state.workerCoverage).toEqual([first]);

    await store.updateRun(runId, (state) => {
      state.phase = 'terminal';
      state.output = { immutableSubstanceDigest: 'a'.repeat(64), attempts: 1 };
      return state;
    });
    await expect(
      requestValidationAuthorityBroker(socketPath, {
        action: 'bind-worker-dossier',
        runId,
        receipt: receipt.token,
        dossier,
      }),
    ).rejects.toMatchObject({ code: 'worker-dossier-binding-phase-invalid' });
    await broker.close();
  }, 20_000);

  it('closes partial clients on their read deadline and at run expiry', async () => {
    const readDeadlineFixture = await fixture({
      connectionReadTimeoutMs: 25,
      shutdownTimeoutMs: 50,
    });
    const slow = createConnection(readDeadlineFixture.socketPath);
    slow.on('error', () => undefined);
    await waitForSocketConnect(slow);
    const slowClosed = waitForSocketClose(slow);
    slow.write('{"schemaVersion":1');
    await withinDeadline(slowClosed, 500);
    await readDeadlineFixture.broker.close();

    const expiryFixture = await fixture({
      connectionReadTimeoutMs: 5_000,
      shutdownTimeoutMs: 50,
      expiryMs: 50,
    });
    const pinned = createConnection(expiryFixture.socketPath);
    pinned.on('error', () => undefined);
    await waitForSocketConnect(pinned);
    const pinnedClosed = waitForSocketClose(pinned);
    pinned.write('{"schemaVersion":1');
    await withinDeadline(expiryFixture.broker.closed, 500);
    await withinDeadline(pinnedClosed, 500);
    await expect(stat(expiryFixture.socketDirectory)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('preserves expiry as a typed broker domain rejection', async () => {
    const { broker, key, socketPath, validationRoot } = await fixture();
    const runId = broker.preparation.preparation.runId;
    const authority = new ValidationStoreAuthority(key);
    const statePath = join(validationRoot, `run-${runId}`, 'state.json');
    const state = authority.open(await readFile(statePath, 'utf8')) as {
      preparation: { expiresAt: string };
    };
    state.preparation.expiresAt = '2000-01-01T00:00:00.000Z';
    await writeFile(statePath, authority.seal(state));
    await expect(
      requestValidationAuthorityBroker(socketPath, {
        action: 'checkpoint',
        runId,
        checkpointToken: 'unused-capability-token',
      }),
    ).rejects.toMatchObject({
      name: 'ReviewDomainError',
      category: 'validation',
      code: 'validation-state-expired',
    });
    await broker.close();
    await broker.close();
    await expect(stat(dirname(socketPath))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('removes the private socket directory after startup failure', async () => {
    const {
      root,
      validationRoot,
      socketDirectory,
      socketPath,
      baseSha,
      headSha,
      sourceEntry,
    } = await repositoryFixture();
    await expect(
      startPreparedValidationAuthorityBroker({
        socketPath,
        key: Buffer.alloc(32, 19),
        validationRoot,
        acceptedContinuation: {
          schemaVersion: 1,
          handleId: 'accepted-handle',
        },
        startup: {
          input: {
            repoRoot: root,
            project: '.oat/projects/shared/demo',
            scope: 'p02-t01',
            workflowMode: 'spec-driven',
            range: { baseSha, headSha: `${headSha}-invalid` },
            sink: 'structured',
            invocation: 'manual',
            budget: null,
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
      }),
    ).rejects.toThrow();
    await expect(stat(socketDirectory)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('rejects malformed exact requests before state or capability mutation', async () => {
    const { broker, store, socketPath } = await fixture();
    const runId = broker.preparation.preparation.runId;
    const before = await store.unsafeReadStateForTesting(runId);
    const candidatePlan = {
      ...plan(runId, 'context-digest', {
        allowed: false,
        estimatedTokens: null,
        evidenceBudgetTokens: null,
        reason: 'No sealed context budget.',
      }),
      unknown: true,
    };
    const malformedNestedPlan = plan(runId, 'context-digest', {
      allowed: false,
      estimatedTokens: null,
      evidenceBudgetTokens: null,
      reason: 'No sealed context budget.',
    }) as unknown as Record<string, unknown>;
    (malformedNestedPlan['verificationBoundary'] as Record<string, unknown>)[
      'requiredClaims'
    ] = ['invalid'];
    const malformedRequests = [
      `{"schemaVersion":1,"action":"checkpoint","action":"checkpoint","runId":${JSON.stringify(runId)},"checkpointToken":"valid-capability-token"}`,
      JSON.stringify({
        schemaVersion: 1,
        action: 'checkpoint',
        runId,
        checkpointToken: 'valid-capability-token',
        unknown: true,
      }),
      JSON.stringify({
        schemaVersion: 1,
        action: 'checkpoint',
        runId: '../malformed',
        checkpointToken: 'valid-capability-token',
      }),
      JSON.stringify({
        schemaVersion: 1,
        action: 'checkpoint',
        runId,
        checkpointToken: 'short',
      }),
      JSON.stringify({
        schemaVersion: 1,
        action: 'bind-worker-dossier',
        runId,
        receipt: 'valid-receipt-token',
        dossier: { schemaVersion: 1 },
      }),
      JSON.stringify({
        schemaVersion: 1,
        action: 'validate',
        runId,
        commandToken: 'valid-capability-token',
        plan: candidatePlan,
      }),
      JSON.stringify({
        schemaVersion: 1,
        action: 'validate',
        runId,
        commandToken: 'valid-capability-token',
        plan: malformedNestedPlan,
      }),
      `${JSON.stringify({
        schemaVersion: 1,
        action: 'begin',
        runId,
        receipt: 'valid-receipt-token',
      })} true`,
    ];

    for (const source of malformedRequests) {
      expect(await rawBrokerRequest(socketPath, source)).toMatchObject({
        ok: false,
        error: {
          category: 'input',
          code: 'validation-authority-broker-request-invalid',
        },
      });
      expect(await store.unsafeReadStateForTesting(runId)).toEqual(before);
    }

    const checkpoint = await executeCommandInvocation(
      broker.preparation.commands.checkpointArtifacts,
      {},
    );
    expect(checkpoint.exitCode, checkpoint.stderr).toBe(0);
    await broker.close();
  });

  it('runs the real source lifecycle after prepare exits without sharing authority', async () => {
    const { root, validationRoot, baseSha, headSha } =
      await repositoryFixture();
    const sourceInvocation = {
      executable: resolve('../../node_modules/.bin/tsx'),
      argv: ['--tsconfig', resolve('tsconfig.json'), resolve('src/index.ts')],
      cwd: resolve('.'),
    };
    const prepare = await runSourceCommand(
      sourceInvocation.executable,
      [...sourceInvocation.argv, 'review', 'prepare-context'],
      sourceInvocation.cwd,
      JSON.stringify({
        schemaVersion: 1,
        repoRoot: root,
        project: '.oat/projects/shared/demo',
        scope: 'p02-t01',
        workflowMode: 'spec-driven',
        range: { baseSha, headSha },
        sink: 'structured',
        invocation: 'manual',
        budget: null,
        gateRunId: null,
        launchAttemptId: null,
        obligationSources: {
          plan: { source: planSource, path: 'plan.md' },
          spec: null,
          implementation: null,
        },
        priorEvidenceCandidates: [],
        target: 'reviewer',
      }),
      {
        ...process.env,
        OAT_REVIEW_AUTHORITY_KEY: Buffer.alloc(32, 17).toString('base64url'),
        OAT_REVIEW_VALIDATION_ROOT: validationRoot,
      },
    );
    expect(prepare.exitCode, prepare.stderr).toBe(0);
    const preparedEnvelope = JSON.parse(prepare.stdout) as {
      result: {
        validationRunId: string;
        commands: PrepareReviewContextResultV1['commands'];
      };
    };
    const prepared = preparedEnvelope.result;
    expect(
      Object.values(prepared.commands).map((invocation) => invocation.cwd),
    ).toEqual([
      sourceInvocation.cwd,
      sourceInvocation.cwd,
      sourceInvocation.cwd,
      sourceInvocation.cwd,
    ]);
    expect(prepare.stdout).not.toContain('accepted-handle');
    const brokerSocket =
      prepared.commands.checkpointArtifacts.argv[
        prepared.commands.checkpointArtifacts.argv.indexOf('--broker-socket') +
          1
      ];
    const brokerSocketDirectory = dirname(brokerSocket);
    expect((await stat(brokerSocketDirectory)).mode & 0o777).toBe(0o700);
    const pinned = createConnection(brokerSocket);
    pinned.on('error', () => undefined);
    await waitForSocketConnect(pinned);
    const pinnedClosed = waitForSocketClose(pinned);
    pinned.write('{"schemaVersion":1');

    const checkpoint = await executeFromCallerCwd(
      root,
      prepared.commands.checkpointArtifacts,
      { environment: process.env },
    );
    expect(
      checkpoint.exitCode,
      `${checkpoint.stderr}\n${JSON.stringify(prepared.commands.checkpointArtifacts)}`,
    ).toBe(0);
    const checkpointEnvelope = JSON.parse(checkpoint.stdout) as {
      result: {
        contextDigest: string;
        planning: {
          obligations: Array<{ id: string }>;
          derivedPolicy: {
            wholeDiff: {
              singleLane: ReviewPlanV1['wholeDiff'];
            };
          };
        };
      };
    };
    expect(checkpointEnvelope.result.planning.obligations).toEqual([
      expect.objectContaining({ id: 'p02-t01' }),
    ]);
    const validate = await executeFromCallerCwd(
      root,
      prepared.commands.validatePlan,
      {
        stdin: JSON.stringify(
          plan(
            prepared.validationRunId,
            checkpointEnvelope.result.contextDigest,
            checkpointEnvelope.result.planning.derivedPolicy.wholeDiff
              .singleLane,
          ),
        ),
        environment: process.env,
      },
    );
    expect(validate.exitCode, `${validate.stderr}\n${validate.stdout}`).toBe(0);
    const validateEnvelope = JSON.parse(validate.stdout) as {
      result: { receipt: { token: string } };
    };
    const begin = structuredClone(prepared.commands.beginEvidence);
    const receiptIndex = begin.argv.indexOf('__OAT_PLAN_RECEIPT__');
    begin.argv[receiptIndex] = validateEnvelope.result.receipt.token;
    const started = await executeFromCallerCwd(root, begin, {
      environment: process.env,
    });
    expect(started.exitCode, started.stderr).toBe(0);
    expect(JSON.parse(started.stdout)).toMatchObject({
      ok: true,
      result: { phase: 'evidence_started' },
    });
    await withinDeadline(pinnedClosed, 2_000);
    await expect(stat(brokerSocketDirectory)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  }, 30_000);

  it('rejects reviewer-side key disclosure and state re-signing attempts', async () => {
    const { validationRoot, socketPath, broker } = await fixture();
    const runId = broker.preparation.preparation.runId;
    const statePath = join(validationRoot, `run-${runId}`, 'state.json');
    const adversary = await executeCommandInvocation(
      {
        executable: process.execPath,
        cwd: resolve('.'),
        argv: [
          '-e',
          "const fs=require('fs'); const p=process.argv[1]; const s=fs.readFileSync(p,'utf8'); fs.writeFileSync(p,s.replace('\"phase\":\"prepared\"','\"phase\":\"evidence_started\"')); process.stdout.write(process.env.OAT_REVIEW_AUTHORITY_KEY ?? 'absent')",
          statePath,
        ],
        stdin: 'none',
      },
      {
        environment: {
          ...process.env,
          OAT_REVIEW_AUTHORITY_KEY: Buffer.alloc(32, 11).toString('base64url'),
        },
      },
    );
    expect(adversary).toMatchObject({ exitCode: 0, stdout: 'absent' });
    expect(await readFile(statePath, 'utf8')).toContain('evidence_started');
    await expect(
      requestValidationAuthorityBroker(socketPath, {
        action: 'checkpoint',
        runId,
        checkpointToken: 'forged-capability',
      }),
    ).rejects.toThrow(/broker failed unexpectedly/);
    await broker.close();
  });
});

async function runSourceCommand(
  executable: string,
  argv: string[],
  cwd: string,
  stdin: string,
  environment: NodeJS.ProcessEnv,
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  const child = spawn(executable, argv, {
    cwd,
    env: environment,
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
  child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
  child.stdin.end(stdin);
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

async function rawBrokerRequest(
  socketPath: string,
  source: string,
): Promise<unknown> {
  const socket = createConnection(socketPath);
  const chunks: Buffer[] = [];
  socket.on('data', (chunk: Buffer) => chunks.push(chunk));
  socket.end(source);
  await new Promise<void>((resolveEnd, reject) => {
    socket.once('end', resolveEnd);
    socket.once('error', reject);
  });
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

async function waitForSocketConnect(
  socket: ReturnType<typeof createConnection>,
) {
  if (socket.readyState === 'open') return;
  await new Promise<void>((resolveConnect, reject) => {
    socket.once('connect', resolveConnect);
    socket.once('error', reject);
  });
}

function waitForSocketClose(
  socket: ReturnType<typeof createConnection>,
): Promise<void> {
  if (socket.closed) return Promise.resolve();
  return new Promise((resolveClose) => socket.once('close', resolveClose));
}

async function withinDeadline<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`deadline exceeded after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
