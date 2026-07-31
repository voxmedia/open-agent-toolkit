import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { evaluateWholeDiffEligibility } from './budget';
import { collectChangeMap } from './change-map';
import { executeCommandInvocation } from './command-invocation';
import type { ReviewPlanV1 } from './types';
import {
  requestValidationAuthorityBroker,
  startPreparedValidationAuthorityBroker,
} from './validation-authority-broker';
import { ValidationStore } from './validation-store';
import { ValidationStoreAuthority } from './validation-store-authority';

const exec = promisify(execFile);
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
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
  const socketPath = join(root, 'authority.sock');
  const validationRoot = join(root, '..', `authority-state-${Date.now()}`);
  roots.push(validationRoot);
  const sourceEntry = resolve('src/index.ts');
  return {
    root,
    validationRoot,
    socketPath,
    baseSha,
    headSha,
    sourceEntry,
  };
}

async function fixture() {
  const { root, validationRoot, socketPath, baseSha, headSha, sourceEntry } =
    await repositoryFixture();
  const key = Buffer.alloc(32, 11);
  const broker = await startPreparedValidationAuthorityBroker({
    socketPath,
    key,
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
        range: { baseSha, headSha },
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
): ReviewPlanV1 {
  return {
    schemaVersion: 1,
    runId,
    contextDigest,
    strategy: 'selective-inline',
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
      requiredClaims: [{ kind: 'promoted-finding', mode: 'direct' }],
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
    wholeDiff,
    timeAllocation: null,
  };
}

describe('validation authority broker', () => {
  it('runs every one-shot lifecycle command in a separate keyless process', async () => {
    const { root, broker, store } = await fixture();
    const [checkpoint, validate, begin] = [
      broker.preparation.commands.checkpointArtifacts,
      broker.preparation.commands.validatePlan,
      broker.preparation.commands.beginEvidence,
    ];
    const checkpointResult = await executeCommandInvocation(checkpoint, {
      cwd: resolve('..', '..'),
      environment: {
        ...process.env,
        OAT_REVIEW_AUTHORITY_KEY: 'must-not-reach-command',
      },
    });
    expect(
      checkpointResult.exitCode,
      `${checkpointResult.stderr}\n${JSON.stringify(checkpoint)}`,
    ).toBe(0);
    const checkpointEnvelope = JSON.parse(checkpointResult.stdout) as {
      result: { contextDigest: string };
    };
    const context = (await store.readRun(broker.preparation.preparation.runId))
      .state.context!;
    const validateResult = await executeCommandInvocation(validate, {
      cwd: resolve('..', '..'),
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
    begin.argv[receiptIndex] = validateEnvelope.result.receipt.token;
    const beginResult = await executeCommandInvocation(begin, {
      cwd: resolve('..', '..'),
      environment: {
        ...process.env,
        OAT_REVIEW_AUTHORITY_KEY: 'must-not-reach-command',
      },
    });
    expect(beginResult.exitCode).toBe(0);
    await broker.closed;
    expect(root).not.toContain('OAT_REVIEW_AUTHORITY_KEY');
  }, 20_000);

  it('runs the real source lifecycle after prepare exits without sharing authority', async () => {
    const { root, validationRoot, baseSha, headSha } =
      await repositoryFixture();
    const sourceInvocation = {
      executable: resolve('../../node_modules/.bin/tsx'),
      argv: ['--tsconfig', resolve('tsconfig.json'), resolve('src/index.ts')],
    };
    const prepare = await runSourceCommand(
      sourceInvocation.executable,
      [...sourceInvocation.argv, 'review', 'prepare-context'],
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
    expect(prepare.stdout).not.toContain('accepted-handle');

    const checkpoint = await executeCommandInvocation(
      prepared.commands.checkpointArtifacts,
      { environment: process.env },
    );
    expect(
      checkpoint.exitCode,
      `${checkpoint.stderr}\n${JSON.stringify(prepared.commands.checkpointArtifacts)}`,
    ).toBe(0);
    const checkpointEnvelope = JSON.parse(checkpoint.stdout) as {
      result: { contextDigest: string };
    };
    const changeMap = await collectChangeMap({
      repoRoot: root,
      baseSha,
      headSha,
      remainingTokens: null,
      outerBudgetMs: null,
    });
    const validate = await executeCommandInvocation(
      prepared.commands.validatePlan,
      {
        stdin: JSON.stringify(
          plan(
            prepared.validationRunId,
            checkpointEnvelope.result.contextDigest,
            evaluateWholeDiffEligibility({
              changeMap,
              contextBudget: null,
              coherentLaneCount: 1,
              hasConsequentialSeam: false,
            }),
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
    const started = await executeCommandInvocation(begin, {
      environment: process.env,
    });
    expect(started.exitCode, started.stderr).toBe(0);
  }, 30_000);

  it('rejects reviewer-side key disclosure and state re-signing attempts', async () => {
    const { validationRoot, socketPath, broker } = await fixture();
    const runId = broker.preparation.preparation.runId;
    const statePath = join(validationRoot, `run-${runId}`, 'state.json');
    const adversary = await executeCommandInvocation(
      {
        executable: process.execPath,
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
        checkpointToken: 'forged',
      }),
    ).rejects.toThrow(/authentication/);
    await broker.close();
  });
});

async function runSourceCommand(
  executable: string,
  argv: string[],
  stdin: string,
  environment: NodeJS.ProcessEnv,
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  const child = spawn(executable, argv, {
    cwd: resolve('..', '..'),
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
