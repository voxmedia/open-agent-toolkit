import { execFileSync, spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const gateDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(gateDir, '../../../../../');
const cliSource = join(repoRoot, 'packages/cli/src/index.ts');
const tsxLoader = join(repoRoot, 'node_modules/tsx/dist/loader.mjs');
const fakeRuntime = join(gateDir, '__fixtures__', 'fake-runtime.mjs');
const tempRoots: string[] = [];

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface Fixture {
  root: string;
  home: string;
  shimDir: string;
  shimPath: string;
  invocationLog: string;
  env: NodeJS.ProcessEnv;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function runCommand(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
): Promise<CommandResult> {
  return await new Promise((resolveResult, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
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
      resolveResult({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

async function setupFixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), 'oat-configured-gate-'));
  const home = await mkdtemp(join(tmpdir(), 'oat-configured-gate-home-'));
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

  const shimDir = join(root, 'shim');
  const shimPath = join(shimDir, 'oat');
  await mkdir(shimDir, { recursive: true });
  await writeFile(
    shimPath,
    [
      '#!/bin/sh',
      `exec ${shellQuote(process.execPath)} --import ${shellQuote(tsxLoader)} ${shellQuote(cliSource)} "$@"`,
      '',
    ].join('\n'),
    { mode: 0o755 },
  );

  const invocationLog = join(root, 'fake-runtime-invocations.jsonl');
  return {
    root,
    home,
    shimDir,
    shimPath,
    invocationLog,
    env: {
      ...process.env,
      HOME: home,
      NO_UPDATE_NOTIFIER: '1',
      PATH: `${shimDir}:${process.env.PATH ?? ''}`,
      TSX_TSCONFIG_PATH: join(repoRoot, 'packages/cli/tsconfig.json'),
    },
  };
}

async function configureAndResolve(fixture: Fixture): Promise<string> {
  const configuredCommand =
    'oat --json gate review --project "$PROJECT_PATH" --review-type code --review-scope p03 --target fake-runtime "Review the configured gate fixture."';
  const selectedShim = await runCommand('/bin/sh', ['-c', 'command -v oat'], {
    cwd: fixture.root,
    env: fixture.env,
  });
  expect(selectedShim).toMatchObject({ exitCode: 0, stderr: '' });
  expect(selectedShim.stdout.trim()).toBe(fixture.shimPath);

  const configured = await runCommand(
    'oat',
    [
      '--json',
      'gate',
      'set',
      'oat-project-implement',
      '--command',
      configuredCommand,
      '--on-failure',
      'block',
      '--layer',
      'shared',
    ],
    { cwd: fixture.root, env: fixture.env },
  );
  expect(
    configured.exitCode,
    `${configured.stdout}\n${configured.stderr}`,
  ).toBe(0);
  expect(JSON.parse(configured.stdout)).toMatchObject({
    status: 'ok',
    gate: { command: configuredCommand },
  });

  const resolved = await runCommand(
    'oat',
    ['--json', 'gate', 'resolve', 'oat-project-implement'],
    { cwd: fixture.root, env: fixture.env },
  );
  expect(resolved.exitCode, `${resolved.stdout}\n${resolved.stderr}`).toBe(0);
  expect(JSON.parse(resolved.stdout)).toMatchObject({
    command: configuredCommand,
  });
  return (JSON.parse(resolved.stdout) as { command: string }).command;
}

async function runConfiguredGate(
  fixture: Fixture,
  artifact: 'correlated' | 'none' | 'wrong-run',
): Promise<{ result: CommandResult; payload: Record<string, unknown> }> {
  const command = await configureAndResolve(fixture);
  const result = await runCommand('/bin/sh', ['-c', command], {
    cwd: fixture.root,
    env: {
      ...fixture.env,
      PROJECT_PATH: '.oat/projects/shared/demo',
      FAKE_GATE_ARTIFACT: artifact,
      FAKE_GATE_INVOCATION_LOG: fixture.invocationLog,
      FAKE_GATE_REQUIRE_HEADLESS: '1',
      FAKE_GATE_REQUIRE_ROUTE_RUNTIME: 'cursor',
      FAKE_GATE_REPORT_ROUTE: '1',
    },
  });

  const payload = JSON.parse(result.stdout) as Record<string, unknown>;
  expect(result.stdout.trim().startsWith('{')).toBe(true);
  expect(result.stdout.trim().endsWith('}')).toBe(true);
  expect(result.stdout).not.toContain('FAKE_GATE_ROUTE:');
  expect(result.stderr).toContain('FAKE_GATE_ROUTE:inline:cursor:fake-model:');

  const invocations = (await readFile(fixture.invocationLog, 'utf8'))
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as Record<string, unknown>);
  expect(invocations).toHaveLength(1);
  expect(invocations[0]).toMatchObject({
    headless: '1',
    nonInteractive: '1',
    runId: expect.any(String),
    cliPath: expect.any(String),
    routeReceiptPath: expect.any(String),
  });
  return { result, payload };
}

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('configured gate headless execution', { timeout: 15_000 }, () => {
  it('returns a structured corroborated handoff for a correlated artifact', async () => {
    const fixture = await setupFixture();
    const { result, payload } = await runConfiguredGate(fixture, 'correlated');

    expect(result.exitCode, result.stderr).toBe(0);
    expect(payload).toMatchObject({
      status: 'ok',
      receiveEligible: true,
      corroboration: { run: 'matched', invocation: 'matched' },
    });
    expect(payload.handoff).toContain('oat-project-review-receive');
  });

  it('returns artifact_missing when the child exits cleanly without an artifact', async () => {
    const fixture = await setupFixture();
    const { result, payload } = await runConfiguredGate(fixture, 'none');

    expect(result.exitCode).toBe(1);
    expect(payload).toMatchObject({
      status: 'artifact_missing',
      outcome: 'review_completed_artifact_missing',
      receiveEligible: false,
      remediable: false,
      handoff: null,
    });
  });

  it('keeps wrong-run artifacts distinct as targeting correlation failures', async () => {
    const fixture = await setupFixture();
    const { result, payload } = await runConfiguredGate(fixture, 'wrong-run');

    expect(result.exitCode).toBe(1);
    expect(payload).toMatchObject({
      status: 'targeting_correlation_failed',
      outcome: 'review_completed_targeting_correlation_failed',
      receiveEligible: false,
      remediable: false,
      handoff: null,
      corroboration: { run: 'mismatched' },
    });
  });
});
