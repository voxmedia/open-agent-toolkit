import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { encodeCursorProjectPath } from './activity-probes';

const gateDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(gateDir, '../../../../../');
const cliSource = join(repoRoot, 'packages/cli/src/index.ts');
const fakeRuntime = join(gateDir, '__fixtures__', 'fake-runtime.mjs');
const tempRoots: string[] = [];
// Test-runner headroom only; cases 4 and 5 retain their short gate budgets.
const SUBPROCESS_MATRIX_TEST_TIMEOUT_MS = 15_000;

function cursorTranscriptDir(fixture: { root: string; home: string }): string {
  const encodedCwd = encodeCursorProjectPath(fixture.root);
  return join(
    fixture.home,
    '.cursor',
    'projects',
    encodedCwd,
    'agent-transcripts',
  );
}

interface GateRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  payload: Record<string, unknown> | undefined;
  diagnostics: Record<string, unknown>[];
}

async function setupFixture(): Promise<{ root: string; home: string }> {
  const root = await mkdtemp(join(tmpdir(), 'oat-gate-hardening-'));
  const home = await mkdtemp(join(tmpdir(), 'oat-gate-hardening-home-'));
  tempRoots.push(root, home);
  const project = '.oat/projects/shared/demo';
  execFileSync('git', ['init', '-q'], { cwd: root });
  await mkdir(join(root, project), { recursive: true });
  await writeFile(
    join(root, project, 'state.md'),
    ['---', 'oat_kind: implementation', '---', '', '# State', ''].join('\n'),
  );
  await mkdir(join(root, '.oat'), { recursive: true });
  await writeFile(
    join(root, '.oat', 'config.local.json'),
    `${JSON.stringify({ version: 1, activeProject: project })}\n`,
  );
  await writeFile(
    join(root, '.oat', 'config.json'),
    `${JSON.stringify({
      version: 1,
      workflow: {
        gates: {
          execTargets: {
            'fake-runtime': {
              runtime: 'cursor',
              baseCommand: [process.execPath, fakeRuntime],
              invocation: {
                model: 'fake-model',
                reasoningEffort: 'none',
              },
              priority: 999,
            },
          },
        },
      },
    })}\n`,
  );
  return { root, home };
}

async function configureCorrelationRuntime(fixture: {
  root: string;
}): Promise<string> {
  const runtime = join(fixture.root, 'correlation-runtime.mjs');
  await writeFile(
    runtime,
    String.raw`
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

function invoke(executable, argv, input) {
  const result = spawnSync(executable, argv, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: process.env,
    input: input === undefined ? undefined : JSON.stringify(input),
  });
  let envelope;
  try {
    envelope = JSON.parse(result.stdout);
  } catch {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(20);
  }
  return { result, envelope };
}

const cli = process.env.OAT_GATE_CLI_PATH;
writeFileSync(
  process.env.OAT_GATE_ROUTE_RECEIPT_PATH,
  JSON.stringify({
    route: 'inline',
    reason: 'correlation integration fixture',
    cliRoot: process.env.OAT_GATE_CLI_ROOT,
    runtime: 'cursor',
  }),
);
const preparationInput = {
  schemaVersion: 1,
  repoRoot: process.cwd(),
  project: '.oat/projects/shared/demo',
  scope: 'p01',
  workflowMode: 'spec-driven',
  range: {
    baseSha: process.env.FAKE_GATE_BASE_SHA,
    headSha: process.env.FAKE_GATE_HEAD_SHA,
  },
  sink: 'structured',
  invocation: 'gate',
  budget: null,
  gateRunId: null,
  launchAttemptId: null,
  obligationSources: {
    plan: {
      path: '.oat/projects/shared/demo/plan.md',
      source: '### Task p01-t01: Review fixture\n\n**Files:**\n\n- Modify: \`fixture.txt\`\n',
    },
    spec: null,
    implementation: null,
  },
  priorEvidenceCandidates: [],
  target: 'fake-runtime',
};
const preparedCall = invoke(
  cli,
  ['--json', 'review', 'prepare-context'],
  preparationInput,
);
if (preparedCall.result.status !== 0 || !preparedCall.envelope.ok) {
  process.stderr.write(preparedCall.result.stderr || preparedCall.result.stdout);
  process.exit(21);
}
const prepared = preparedCall.envelope.result;
const checkpointCall = invoke(
  prepared.commands.checkpointArtifacts.executable,
  prepared.commands.checkpointArtifacts.argv,
);
if (checkpointCall.result.status !== 0 || !checkpointCall.envelope.ok) {
  process.stderr.write(checkpointCall.result.stderr || checkpointCall.result.stdout);
  process.exit(22);
}
const storeModule = pathToFileURL(
  join(process.env.OAT_GATE_CLI_ROOT, 'packages/cli/src/review/validation-store.ts'),
).href;
const authorityModule = pathToFileURL(
  join(
    process.env.OAT_GATE_CLI_ROOT,
    'packages/cli/src/review/validation-store-authority.ts',
  ),
).href;
const stateReader = [
  "const { ValidationStore } = await import(" + JSON.stringify(storeModule) + ");",
  "const { launcherValidationStoreAuthority, launcherValidationStoreRoot } = await import(" + JSON.stringify(authorityModule) + ");",
  "const store = new ValidationStore(launcherValidationStoreRoot(), launcherValidationStoreAuthority());",
  "process.stdout.write(JSON.stringify((await store.readRun(" + JSON.stringify(prepared.validationRunId) + ")).state.context));",
].join('\n');
const stateCall = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--input-type=module', '--eval', stateReader],
  {
    cwd: join(process.env.OAT_GATE_CLI_ROOT, 'packages/cli'),
    encoding: 'utf8',
    env: process.env,
  },
);
if (stateCall.status !== 0) {
  process.stderr.write(stateCall.stderr || stateCall.stdout);
  process.exit(26);
}
const context = JSON.parse(stateCall.stdout);
const paths = context.changeMap.files.map((file) => file.path);
const obligationIds = context.obligations.map((obligation) => obligation.id);
const estimatedTokens = context.changeMap.totals.estimatedPatchTokens;
const evidenceBudgetTokens = context.budget.context?.evidenceBudgetTokens ?? null;
let wholeDiffReason = 'whole diff is eligible';
if (context.budget.context === null) {
  wholeDiffReason = 'missing post-artifact context telemetry';
} else if (
  context.changeMap.totals.patchEstimateState !== 'exact' ||
  estimatedTokens === null
) {
  wholeDiffReason = 'patch size is not exact';
} else if (estimatedTokens > evidenceBudgetTokens) {
  wholeDiffReason = 'patch exceeds the sealed evidence budget';
}
const plan = {
  schemaVersion: 1,
  runId: prepared.validationRunId,
  contextDigest: checkpointCall.envelope.result.contextDigest,
  strategy: 'selective-inline',
  lanes: [{
    id: 'fixture-lane',
    paths,
    primaryObligationIds: obligationIds,
    seamObligationIds: [],
    risk: 'high',
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
  }],
  classifications: [],
  crossLaneInvariants: [],
  delegationEconomics: {
    independentLaneIds: [],
    nonReplayedLaneIds: [],
    expectedSavings: [],
    coordinationCosts: [],
    decisionRationale: 'inline fixture',
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
      laneIds: ['fixture-lane'],
      rationale: 'fixture sample',
    },
    deterministicAcceptance: {
      mode: 'provenance',
      requiredFields: ['command', 'cwd', 'scopeRefs', 'provenance', 'result'],
    },
  },
  wholeDiff: {
    allowed: wholeDiffReason === 'whole diff is eligible',
    estimatedTokens,
    evidenceBudgetTokens,
    reason: wholeDiffReason,
  },
  timeAllocation: null,
};
const validatedCall = invoke(
  prepared.commands.validatePlan.executable,
  prepared.commands.validatePlan.argv,
  plan,
);
if (validatedCall.result.status !== 0 || !validatedCall.envelope.ok) {
  process.stderr.write(validatedCall.result.stderr || validatedCall.result.stdout);
  process.exit(23);
}
const receipt = validatedCall.envelope.result.receipt;
const begin = structuredClone(prepared.commands.beginEvidence);
begin.argv[begin.argv.indexOf('__OAT_PLAN_RECEIPT__')] = receipt.token;
const beginCall = invoke(begin.executable, begin.argv);
if (beginCall.result.status !== 0 || !beginCall.envelope.ok) {
  process.stderr.write(beginCall.result.stderr || beginCall.result.stdout);
  process.exit(24);
}
const terminal = {
  schemaVersion: 1,
  status: 'complete',
  candidate: {
    kind: 'structured',
    review: { summary: 'fixture', findings: [], verification_commands: [] },
  },
  reviewAccounting: {
    schemaVersion: 1,
    receipt: 'wrong-receipt',
    contextDigest: receipt.contextDigest,
    planDigest: receipt.planDigest,
    assignmentDigest: receipt.assignmentDigest,
    strategy: 'selective-inline',
    completion: 'complete',
    evidence: [],
    lanes: [{
      id: 'fixture-lane',
      paths,
      primaryObligationIds: obligationIds,
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
    }],
    classifications: [],
    verification: [],
    budget: { evidenceStoppedAt: null, outputReservePreserved: null },
  },
};
const outputCall = invoke(
  cli,
  [
    '--json',
    'review',
    'validate-output',
    '--run-id',
    prepared.validationRunId,
    '--stdin',
  ],
  terminal,
);
if (outputCall.result.status === 0 || outputCall.envelope.ok) {
  process.stderr.write(outputCall.result.stderr || outputCall.result.stdout);
  process.exit(25);
}
process.exit(1);
`,
  );
  await writeFile(
    join(fixture.root, '.oat', 'config.json'),
    `${JSON.stringify({
      version: 1,
      workflow: {
        reviewPlanMode: 'enforce',
        gates: {
          execTargets: {
            'fake-runtime': {
              runtime: 'cursor',
              baseCommand: [process.execPath, runtime],
              invocation: {
                model: 'fake-model',
                reasoningEffort: 'none',
              },
              priority: 999,
            },
          },
        },
      },
    })}\n`,
  );
  return runtime;
}

async function runGate(
  fixture: { root: string; home: string },
  options: {
    env?: NodeJS.ProcessEnv;
    json?: boolean;
    timeoutMs?: number;
    reviewType?: 'artifact' | 'code';
    reviewScope?: string;
  } = {},
): Promise<GateRunResult> {
  const args = [
    '--import',
    'tsx',
    cliSource,
    ...(options.json === false ? [] : ['--json']),
    '--cwd',
    fixture.root,
    'gate',
    'review',
    '--project',
    '.oat/projects/shared/demo',
    '--review-type',
    options.reviewType ?? 'code',
    '--review-scope',
    options.reviewScope ?? 'final',
    '--target',
    'fake-runtime',
    ...(options.timeoutMs ? ['--timeout-ms', String(options.timeoutMs)] : []),
    'Review the deterministic fixture.',
  ];

  return await new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: join(repoRoot, 'packages', 'cli'),
      env: {
        ...process.env,
        HOME: fixture.home,
        NO_UPDATE_NOTIFIER: '1',
        OAT_GATE_LIVENESS_INTERVAL_MS: '100',
        FAKE_GATE_WRITE_ROUTE_RECEIPT_RUNTIME: 'cursor',
        ...options.env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', (code) => {
      const jsonLines = `${stdout}\n${stderr}`.split('\n').flatMap((line) => {
        try {
          return [JSON.parse(line) as Record<string, unknown>];
        } catch {
          return [];
        }
      });
      const finalJsonStart = Math.max(
        stdout.lastIndexOf('\n{') + 1,
        stdout.startsWith('{') ? 0 : -1,
      );
      let finalPayload: Record<string, unknown> | undefined;
      if (finalJsonStart >= 0) {
        try {
          finalPayload = JSON.parse(stdout.slice(finalJsonStart)) as Record<
            string,
            unknown
          >;
        } catch {
          finalPayload = undefined;
        }
      }
      resolveResult({
        exitCode: code ?? 1,
        stdout,
        stderr,
        payload:
          finalPayload ??
          jsonLines.findLast((entry) => typeof entry.status === 'string'),
        diagnostics: jsonLines.filter((entry) =>
          ['gate-start', 'gate-liveness', 'gate-route'].includes(
            String(entry.type),
          ),
        ),
      });
    });
  });
}

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe(
  'gate hardening fake-runtime matrix',
  { timeout: SUBPROCESS_MATRIX_TEST_TIMEOUT_MS },
  () => {
    it('case 1: headless inline reviewer writes a correlated artifact', async () => {
      const fixture = await setupFixture();
      const result = await runGate(fixture, {
        env: {
          FAKE_GATE_ARTIFACT: 'correlated',
          FAKE_GATE_REQUIRE_HEADLESS: '1',
          FAKE_GATE_REQUIRE_ROUTE_RUNTIME: 'cursor',
          FAKE_GATE_REPORT_ROUTE: '1',
        },
      });

      expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(result.payload).toMatchObject({
        status: 'ok',
        receiveEligible: true,
        corroboration: { run: 'matched', invocation: 'matched' },
      });
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: 'ok',
        receiveEligible: true,
      });
      expect(result.stdout).not.toContain(
        'FAKE_GATE_ROUTE:inline:cursor:fake-model:',
      );
      expect(result.stderr).toContain(
        'FAKE_GATE_ROUTE:inline:cursor:fake-model:',
      );
      expect(result.diagnostics).toContainEqual({
        type: 'gate-route',
        target: 'fake-runtime',
        route: 'inline',
        reason: expect.any(String),
        cliRoot: repoRoot,
        runtime: 'cursor',
      });
    });

    it('case 2: async-ceiling class refusal fails closed', async () => {
      const fixture = await setupFixture();
      const result = await runGate(fixture, {
        env: {
          FAKE_GATE_REFUSAL: 'no awaited child route',
          FAKE_GATE_EXIT_CODE: '0',
        },
      });

      expect(result.exitCode).toBe(1);
      expect(result.payload).toMatchObject({
        status: 'review_failed',
        outcome: 'review_did_not_complete',
        refusal: 'no awaited child route',
      });
      expect(result.payload).not.toHaveProperty('receiveEligible');
    });

    it('case 3: large final code review uses the new scope-default budget', async () => {
      const fixture = await setupFixture();
      const result = await runGate(fixture, {
        env: { FAKE_GATE_ARTIFACT: 'correlated', FAKE_GATE_DELAY_MS: '50' },
      });

      expect(result.exitCode).toBe(0);
      expect(result.diagnostics).toContainEqual({
        type: 'gate-start',
        target: 'fake-runtime',
        runtime: 'cursor',
        timeoutMs: 1_800_000,
        timeoutSource: 'scope-default',
      });
      expect(result.payload).toMatchObject({ status: 'ok' });
    });

    it('case 4: timeout reports advancing transcript activity while stdout-idle', async () => {
      const fixture = await setupFixture();
      const result = await runGate(fixture, {
        timeoutMs: 1_500,
        env: {
          FAKE_GATE_DELAY_MS: '2000',
          FAKE_GATE_TRANSCRIPT_INTERVAL_MS: '100',
          FAKE_GATE_TRANSCRIPT_DIR: cursorTranscriptDir(fixture),
        },
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.diagnostics.length).toBeGreaterThan(0);
      const activeTick = result.diagnostics.find(
        (entry) =>
          (entry.lastActivityEvidence as { changedSinceBaseline?: boolean })
            ?.changedSinceBaseline === true,
      );
      expect(activeTick).toMatchObject({ processAlive: true });
      expect(activeTick?.idleMs).toBe(activeTick?.elapsedMs);
      expect(result.payload).toMatchObject({
        status: 'review_failed',
        timedOut: true,
        activityEvidence: {
          changedSinceBaseline: true,
          scope: 'project-dir',
        },
      });
    });

    it('case 5: timeout without output or artifact remains fail-closed', async () => {
      const fixture = await setupFixture();
      const result = await runGate(fixture, {
        timeoutMs: 1_000,
        env: { FAKE_GATE_DELAY_MS: '1500' },
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.payload).toMatchObject({
        status: 'review_failed',
        outcome: 'review_did_not_complete',
        timedOut: true,
        noOutputProduced: true,
      });
      expect(result.payload).not.toHaveProperty('receiveEligible');
    });

    it('case 6: provenance mismatch rejects an artifact with the wrong runId', async () => {
      const fixture = await setupFixture();
      const result = await runGate(fixture, {
        env: { FAKE_GATE_ARTIFACT: 'wrong-run' },
      });

      expect(result.exitCode).toBe(1);
      expect(result.payload).toMatchObject({
        status: 'targeting_correlation_failed',
        outcome: 'review_completed_targeting_correlation_failed',
        corroboration: { run: 'mismatched' },
        receiveEligible: false,
      });
    });

    it('case 7: passing artifact preserves handoff and receive eligibility', async () => {
      const fixture = await setupFixture();
      const result = await runGate(fixture, {
        env: { FAKE_GATE_ARTIFACT: 'correlated' },
      });

      expect(result.exitCode).toBe(0);
      expect(result.payload).toMatchObject({
        status: 'ok',
        receiveEligible: true,
      });
      expect(result.payload?.handoff).toContain('oat-project-review-receive');
      const artifactPath = String(result.payload?.artifactPath);
      const artifact = await readFile(join(fixture.root, artifactPath), 'utf8');
      expect(artifact).toContain(
        `oat_gate_run_id: ${String(result.payload?.runId)}`,
      );
    });

    it('case 8: exact gate tuple reaches accounting-invalid translation', async () => {
      const fixture = await setupFixture();
      await configureCorrelationRuntime(fixture);
      await writeFile(join(fixture.root, 'fixture.txt'), 'before\n');
      execFileSync('git', ['add', '.'], { cwd: fixture.root });
      execFileSync(
        'git',
        [
          '-c',
          'user.name=OAT Test',
          '-c',
          'user.email=oat@example.invalid',
          'commit',
          '-qm',
          'base',
        ],
        { cwd: fixture.root },
      );
      const baseSha = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: fixture.root,
        encoding: 'utf8',
      }).trim();
      await writeFile(join(fixture.root, 'fixture.txt'), 'after\n');
      execFileSync('git', ['add', 'fixture.txt'], { cwd: fixture.root });
      execFileSync(
        'git',
        [
          '-c',
          'user.name=OAT Test',
          '-c',
          'user.email=oat@example.invalid',
          'commit',
          '-qm',
          'change',
        ],
        { cwd: fixture.root },
      );
      const headSha = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: fixture.root,
        encoding: 'utf8',
      }).trim();
      const result = await runGate(fixture, {
        env: {
          OAT_REVIEW_AUTHORITY_KEY: randomBytes(32).toString('base64url'),
          OAT_REVIEW_VALIDATION_ROOT: join(fixture.home, 'validation'),
          TSX_TSCONFIG_PATH: join(repoRoot, 'packages/cli/tsconfig.json'),
          FAKE_GATE_BASE_SHA: baseSha,
          FAKE_GATE_HEAD_SHA: headSha,
        },
      });

      expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(1);
      expect(
        result.payload,
        `${result.stdout}\n${result.stderr}`,
      ).toMatchObject({
        status: 'review_failed',
        failure: {
          kind: 'review_complete_accounting_invalid',
          gateRunId: expect.any(String),
          launchAttemptId: expect.any(String),
          validationRunId: expect.any(String),
          validationAttempts: 1,
          repairAttempts: 0,
          diagnosticPath: expect.any(String),
        },
        artifactPath: null,
        receiveEligible: false,
        handoff: null,
      });
    });
  },
);
