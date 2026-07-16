import { execFileSync, spawn } from 'node:child_process';
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
          ['gate-start', 'gate-liveness'].includes(String(entry.type)),
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
      expect(result.stdout).toContain('FAKE_GATE_ROUTE:inline:');
      expect(result.stdout).toContain(':cursor');
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
  },
);
