import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { evaluateWholeDiffEligibility } from './budget';
import { bindAcceptedHandle } from './command-capabilities';
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

async function fixture() {
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
  const key = Buffer.alloc(32, 11);
  const sourceEntry = resolve('src/index.ts');
  const broker = await startPreparedValidationAuthorityBroker({
    socketPath,
    key,
    validationRoot,
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
  await bindAcceptedHandle(
    store,
    broker.preparation.preparation.runId,
    'accepted-handle',
  );
  return { root, validationRoot, key, socketPath, broker, store };
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
