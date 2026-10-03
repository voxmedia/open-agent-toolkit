import { execFileSync, spawn } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
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

interface GateFixture {
  root: string;
  home: string;
  /** Per-fixture TMPDIR, so run markers from other processes are never seen. */
  tmp: string;
}

async function setupFixture(): Promise<GateFixture> {
  const root = await mkdtemp(join(tmpdir(), 'oat-gate-hardening-'));
  const home = await mkdtemp(join(tmpdir(), 'oat-gate-hardening-home-'));
  const tmp = await mkdtemp(join(tmpdir(), 'oat-gate-hardening-tmp-'));
  tempRoots.push(root, home, tmp);
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
  return { root, home, tmp };
}

async function runGate(
  fixture: GateFixture,
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
        TMPDIR: fixture.tmp,
        // A gate prefers an inherited absolute marker directory over TMPDIR,
        // so pin each fixture to its own; case 10 overrides it on purpose.
        OAT_GATE_RUN_MARKER_DIR: join(fixture.tmp, 'oat-gate-runs'),
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
          [
            'gate-start',
            'gate-liveness',
            'gate-route',
            'gate-recursion',
          ].includes(String(entry.type)),
        ),
      });
    });
  });
}

/** Waits until a live gate under `tmp` has taken its duplicate-run claim. */
async function waitForClaim(tmp: string): Promise<void> {
  const dir = join(tmp, 'oat-gate-runs');
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const names = await readdir(dir).catch(() => [] as string[]);
    if (names.some((name) => name.startsWith('claim-'))) {
      return;
    }
    await new Promise((settle) => setTimeout(settle, 50));
  }
  throw new Error(`no gate claim appeared under ${dir}`);
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
        remediable: false,
        handoff: null,
      });
      // The reserved targeting cause keeps its exact shape; post-selection
      // recovery never reuses or extends it.
      expect(result.payload).not.toHaveProperty('postSelection');
      expect(result.payload).not.toHaveProperty('postSelectionRecovery');
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
      // An ordinary pass carries no recovery marker, so the recovered
      // envelope's extra field is purely additive for consumers.
      expect(result.payload).not.toHaveProperty('postSelectionRecovery');
      const artifactPath = String(result.payload?.artifactPath);
      const artifact = await readFile(join(fixture.root, artifactPath), 'utf8');
      expect(artifact).toContain(
        `oat_gate_run_id: ${String(result.payload?.runId)}`,
      );
    });

    it('case 8: a running gate rejects a second identical gate', async () => {
      const fixture = await setupFixture();
      const first = runGate(fixture, {
        env: { FAKE_GATE_ARTIFACT: 'correlated', FAKE_GATE_DELAY_MS: '5000' },
      });
      await waitForClaim(fixture.tmp);
      const second = await runGate(fixture, {
        env: { FAKE_GATE_ARTIFACT: 'correlated' },
      });
      const firstResult = await first;

      expect(firstResult.exitCode, firstResult.stderr).toBe(0);
      expect(firstResult.payload).toMatchObject({
        status: 'ok',
        recursion: { decision: 'none' },
      });
      expect(second.exitCode, second.stderr).toBe(1);
      expect(second.payload).toMatchObject({
        status: 'review_failed',
        outcome: 'review_did_not_complete',
        recursion: {
          decision: 'rejected',
          matchedRunId: firstResult.payload?.runId,
        },
      });
      expect(second.payload).not.toHaveProperty('receiveEligible');
      expect(second.diagnostics).toContainEqual({
        type: 'gate-recursion',
        runId: second.payload?.runId,
        decision: 'rejected',
        matchedRunId: firstResult.payload?.runId,
        matchedPid: expect.any(Number),
        claimPath: expect.stringContaining(
          join(fixture.tmp, 'oat-gate-runs', 'claim-'),
        ),
      });
      // The rejected gate launched nothing.
      expect(
        second.diagnostics.filter((entry) => entry.type === 'gate-start'),
      ).toEqual([]);
      // The first gate released its claim on completion.
      expect(
        (await readdir(join(fixture.tmp, 'oat-gate-runs'))).filter((name) =>
          name.startsWith('claim-'),
        ),
      ).toEqual([]);
    });

    it('case 9: two simultaneous identical gates run exactly once', async () => {
      const fixture = await setupFixture();
      const env = {
        FAKE_GATE_ARTIFACT: 'correlated',
        FAKE_GATE_DELAY_MS: '3000',
      };
      const results = await Promise.all([
        runGate(fixture, { env }),
        runGate(fixture, { env }),
      ]);

      const statuses = results.map((result) => result.payload?.status).sort();
      expect(
        statuses,
        results.map((result) => result.stderr).join('\n'),
      ).toEqual(['ok', 'review_failed']);
      const winner = results.find((result) => result.payload?.status === 'ok');
      const loser = results.find(
        (result) => result.payload?.status === 'review_failed',
      );
      expect(loser?.payload).toMatchObject({
        recursion: {
          decision: 'rejected',
          matchedRunId: winner?.payload?.runId,
        },
      });
    });

    it('case 11: an inherited caller marker directory is left untouched', async () => {
      // Inside a gate reviewer, the parent gate exports its absolute marker
      // directory. Ordinary fixtures must claim and mark under their own tmp,
      // where waitForClaim looks, and never write into the parent's area.
      const inherited = await mkdtemp(
        join(tmpdir(), 'oat-gate-hardening-inherited-'),
      );
      tempRoots.push(inherited);
      const previous = process.env.OAT_GATE_RUN_MARKER_DIR;
      process.env.OAT_GATE_RUN_MARKER_DIR = inherited;
      try {
        const fixture = await setupFixture();
        const first = runGate(fixture, {
          env: { FAKE_GATE_ARTIFACT: 'correlated', FAKE_GATE_DELAY_MS: '2000' },
        });
        await waitForClaim(fixture.tmp);
        const result = await first;

        // waitForClaim above proved the claim was taken under fixture.tmp.
        expect(result.exitCode, result.stderr).toBe(0);
        expect(await readdir(inherited)).toEqual([]);
      } finally {
        if (previous === undefined) delete process.env.OAT_GATE_RUN_MARKER_DIR;
        else process.env.OAT_GATE_RUN_MARKER_DIR = previous;
      }
    });

    it('case 10: a nested gate with a different TMPDIR finds the exported claim directory', async () => {
      const fixture = await setupFixture();
      const childTmp = await mkdtemp(
        join(tmpdir(), 'oat-gate-hardening-child-'),
      );
      tempRoots.push(childTmp);
      const parent = runGate(fixture, {
        env: { FAKE_GATE_ARTIFACT: 'correlated', FAKE_GATE_DELAY_MS: '5000' },
      });
      await waitForClaim(fixture.tmp);
      // What a reviewer child sees: its own TMPDIR plus the parent's export.
      const nested = await runGate(fixture, {
        env: {
          FAKE_GATE_ARTIFACT: 'correlated',
          TMPDIR: childTmp,
          OAT_GATE_RUN_MARKER_DIR: join(fixture.tmp, 'oat-gate-runs'),
        },
      });
      const parentResult = await parent;

      expect(parentResult.payload).toMatchObject({ status: 'ok' });
      expect(nested.exitCode, nested.stderr).toBe(1);
      expect(nested.payload).toMatchObject({
        recursion: {
          decision: 'rejected',
          matchedRunId: parentResult.payload?.runId,
        },
      });
    });
  },
);
