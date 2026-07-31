import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { currentGateCliLaunch } from '@commands/gate/branch-local-cli';
import { afterEach, describe, expect, it } from 'vitest';

import {
  allocateReviewTimeBudget,
  evaluateWholeDiffEligibility,
} from './budget';
import type { GitChangeMapAdapter } from './change-map';
import { bindAcceptedHandle } from './command-capabilities';
import { executeCommandInvocation } from './command-invocation';
import { prepareReviewContext } from './prepare-context';
import {
  beginEvidence,
  checkpointArtifactsLoaded,
  validateAndReceiptPlan,
} from './review-lifecycle';
import { parseReviewPlanV1 } from './schemas';
import type {
  PreparedReviewContextV1,
  ReviewCommandInvocationV1,
  ReviewPlanV1,
} from './types';
import { ValidationStore } from './validation-store';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

function extractArgument(
  command: ReviewCommandInvocationV1,
  name: string,
): string {
  const index = command.argv.indexOf(name);
  const value = command.argv[index + 1];
  if (index < 0 || !value) {
    throw new Error(`missing trusted command argument: ${name}`);
  }
  return value;
}

function reviewPlan(context: PreparedReviewContextV1): ReviewPlanV1 {
  const time = context.budget.time;
  return {
    schemaVersion: 1,
    runId: context.runId,
    contextDigest: context.contextDigest,
    strategy: 'selective-inline',
    lanes: [
      {
        id: 'primary',
        paths: ['src/example.ts'],
        primaryObligationIds: ['p02-t01'],
        seamObligationIds: [],
        risk: 'low',
        evidenceClass: 'mixed',
        strategy: 'path-diff',
        checks: ['inspect implementation'],
        delegated: false,
        independenceRationale: null,
        substantial: false,
        substantialityRationale: null,
        deadlineMs: null,
        dossier: { contractVersion: 1, partialAllowed: true },
        replay: 'direct-verify',
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
      independentLaneIds: [],
      nonReplayedLaneIds: [],
      expectedSavings: [],
      coordinationCosts: [],
      decisionRationale: 'single coherent lane',
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
        laneIds: ['primary'],
        rationale: 'single-file review',
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
    timeAllocation:
      time === null
        ? null
        : allocateReviewTimeBudget({
            totalMs: time.totalMs,
            source: time.source,
            startedAtMs: time.deadlineMs - time.totalMs,
          }).allocation,
  };
}

describe('review validation lifecycle integration', () => {
  it('composes prepare, bind, checkpoint, validate, and begin boundaries', async () => {
    const root = await mkdtemp(
      join(tmpdir(), 'oat-review-lifecycle-integration-'),
    );
    roots.push(root);
    const store = new ValidationStore(join(root, 'private-store'));
    const branchCandidate = join(root, 'branch-candidate.ts');
    await writeFile(
      branchCandidate,
      "import { fileURLToPath } from 'node:url'; const candidate: string = fileURLToPath(import.meta.url); process.stdin.resume(); process.stdin.on('end', () => process.stdout.write(JSON.stringify({ candidate, argv: process.argv.slice(2) })));",
    );
    const activeLaunch = currentGateCliLaunch({
      argv: [process.execPath, branchCandidate],
      execArgv: ['--import', 'tsx'],
      execPath: process.execPath,
      cwd: root,
    });
    const git: GitChangeMapAdapter = {
      nameStatus: async () => Buffer.from('M\0src/example.ts\0'),
      numstat: async () => Buffer.from('2\t1\tsrc/example.ts\0'),
      patch: async () => ({
        output: (async function* () {
          yield Buffer.from('diff --git a/src/example.ts b/src/example.ts\n');
        })(),
        stop: () => undefined,
      }),
    };
    let tick = 0;
    const clock = () => new Date(Date.UTC(2098, 0, 1, 0, 0, 0, tick++));
    const prepared = await prepareReviewContext(
      {
        repoRoot: root,
        project: '.oat/projects/shared/demo',
        scope: 'p02-t01',
        workflowMode: 'spec-driven',
        range: { baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40) },
        sink: 'structured',
        invocation: 'manual',
        budget: { totalMs: 120_000, source: 'integration' },
        obligationSources: {
          plan: {
            path: 'plan.md',
            source:
              '### Task p02-t01: Example\n\n**Files:**\n- Modify: `src/example.ts`\n\n**Step 1: Verify** Run the integration.',
          },
        },
        target: 'reviewer',
      },
      {
        store,
        git,
        telemetryAdapter: null,
        telemetryAdapterId: null,
        commandExecutable: activeLaunch.command,
        commandArgvPrefix: activeLaunch.args,
        clock,
      },
    );

    const runId = prepared.preparation.runId;
    const oldGlobalDirectory = join(root, 'old-global');
    for (const invocation of Object.values(prepared.commands)) {
      const executed = await executeCommandInvocation(invocation, {
        environment: {
          ...process.env,
          PATH: `${oldGlobalDirectory}:${process.env.PATH ?? ''}`,
        },
        stdin: invocation.stdin === 'review-plan-json' ? '{}' : undefined,
      });
      expect(executed.exitCode).toBe(0);
      expect(JSON.parse(executed.stdout)).toMatchObject({
        candidate: await realpath(branchCandidate),
      });
    }
    await bindAcceptedHandle(store, runId, 'accepted-handle');
    const context = await checkpointArtifactsLoaded(
      {
        runId,
        checkpointToken: extractArgument(
          prepared.commands.checkpointArtifacts,
          '--checkpoint-token',
        ),
      },
      { store, telemetryAdapter: null, telemetryAdapterId: null, clock },
    );
    const validated = await validateAndReceiptPlan(
      {
        runId,
        commandToken: extractArgument(
          prepared.commands.validatePlan,
          '--command-token',
        ),
        plan: parseReviewPlanV1(reviewPlan(context)),
      },
      { store, clock },
    );

    expect(validated.valid).toBe(true);
    if (!validated.valid) throw new Error('expected a valid review plan');
    await expect(
      beginEvidence(
        { runId, receipt: validated.receipt.token },
        { store, clock },
      ),
    ).resolves.toEqual({ validationRunId: runId, phase: 'evidence_started' });
    expect((await store.readRun(runId)).state.phase).toBe('evidence_started');
  });
});
