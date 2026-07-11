import { execFile } from 'node:child_process';
import { access, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const HARNESS_COMMANDS = {
  codex: { auth: ['login', 'status'], executable: 'codex' },
  claude: { auth: ['auth', 'status'], executable: 'claude' },
  'cursor-ide': { auth: ['status'], executable: 'cursor' },
  'cursor-cli': { auth: ['status'], executable: 'cursor-agent' },
};

const REQUIRED_FIXTURE_PATHS = [
  'project/design.md',
  'project/discovery.md',
  'project/implementation.md',
  'project/plan.md',
  'project/state.md',
  'workspace/logs/p01.log',
  'workspace/logs/p02.log',
  'workspace/logs/p03.log',
];

const runnerDirectory = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = resolve(runnerDirectory, '../../..');
const defaultFixturePath = resolve(repositoryRoot, 'tools/smoke/fixture');
const defaultLocalOatPath = resolve(
  repositoryRoot,
  'packages/cli/dist/index.js',
);

export class PreflightError extends Error {
  constructor(report) {
    super('Smoke preflight failed. No provisioning was started.');
    this.name = 'PreflightError';
    this.report = report;
  }
}

function commandLabel(executable, args = []) {
  return [executable, ...args].join(' ');
}

async function runCommand(executable, args) {
  try {
    await execFileAsync(executable, args, {
      encoding: 'utf8',
      timeout: 10_000,
    });
    return 0;
  } catch (error) {
    return typeof error.code === 'number' ? error.code : 1;
  }
}

async function resolveCommand(executable) {
  try {
    const { stdout } = await execFileAsync('sh', [
      '-lc',
      'command -v -- "$1"',
      'sh',
      executable,
    ]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function pathsMatch(firstPath, secondPath) {
  if (!firstPath || !secondPath) {
    return false;
  }

  try {
    return (await realpath(firstPath)) === (await realpath(secondPath));
  } catch {
    return false;
  }
}

async function defaultRuntimeProbe(harness) {
  const { executable } = HARNESS_COMMANDS[harness];
  const path = await resolveCommand(executable);
  const command = commandLabel(executable, ['--version']);

  if (!path) {
    return { command, result: 'unavailable' };
  }

  return {
    command,
    path,
    result:
      (await runCommand(executable, ['--version'])) === 0
        ? 'installed'
        : 'unavailable',
  };
}

async function defaultAuthProbe(harness, installed) {
  const { auth, executable } = HARNESS_COMMANDS[harness];
  const command = commandLabel(executable, auth);

  if (installed.result !== 'installed') {
    return { command, result: 'not-run' };
  }

  return {
    command,
    result:
      (await runCommand(executable, auth)) === 0
        ? 'authenticated'
        : 'unauthenticated',
  };
}

async function defaultOatProbe() {
  const globalPath = await resolveCommand('oat');
  const localExists = await access(defaultLocalOatPath)
    .then(() => true)
    .catch(() => false);
  const matchesLocal = await pathsMatch(globalPath, defaultLocalOatPath);

  return {
    globalPath,
    localPath: defaultLocalOatPath,
    result: localExists && matchesLocal ? 'local' : 'stale-global',
  };
}

async function defaultFixtureProbe() {
  const missingPaths = [];

  for (const path of REQUIRED_FIXTURE_PATHS) {
    try {
      await access(resolve(defaultFixturePath, path));
    } catch {
      missingPaths.push(path);
    }
  }

  return missingPaths.length === 0
    ? { result: 'valid' }
    : {
        reason: `Missing fixture paths: ${missingPaths.join(', ')}`,
        result: 'invalid',
      };
}

function unavailableResult(harness) {
  const { executable } = HARNESS_COMMANDS[harness];
  return {
    command: commandLabel(executable, ['--version']),
    result: 'unavailable',
  };
}

function isReady(report, selectedHarness) {
  return (
    report.fixture.result === 'valid' &&
    report.oat.result === 'local' &&
    report.harnesses[selectedHarness].installed.result === 'installed' &&
    report.harnesses[selectedHarness].authenticated.result === 'authenticated'
  );
}

export function formatReadinessReport(report) {
  const lines = [
    `Smoke preflight: ${report.status}`,
    `selected harness: ${report.selectedHarness}`,
    `local oat: ${report.oat.result}`,
    `fixture: ${report.fixture.result}`,
  ];

  for (const [harness, readiness] of Object.entries(report.harnesses)) {
    lines.push(
      `${harness}: installed=${readiness.installed.result}, authenticated=${readiness.authenticated.result}`,
    );
  }

  return lines.join('\n');
}

export function emitReadinessReport(report, write = console.log) {
  write(formatReadinessReport(report));
  write(JSON.stringify(report));
}

export async function runPreflight(
  { harness },
  { env = process.env, probes = {}, reporter } = {},
) {
  if (!HARNESS_COMMANDS[harness]) {
    throw new TypeError(`Unknown smoke harness: ${harness}`);
  }

  const runtime = probes.runtime ?? defaultRuntimeProbe;
  const auth = probes.auth ?? defaultAuthProbe;
  const fixture = probes.fixture ?? defaultFixtureProbe;
  const oat = probes.oat ?? defaultOatProbe;
  const forcedHarness = env.OAT_SMOKE_FORCE_UNAVAILABLE;
  const harnesses = {};

  for (const currentHarness of Object.keys(HARNESS_COMMANDS)) {
    const installed =
      forcedHarness === currentHarness
        ? unavailableResult(currentHarness)
        : await runtime(currentHarness);
    const authenticated = await auth(currentHarness, installed);
    harnesses[currentHarness] = { authenticated, installed };
  }

  const report = {
    fixture: await fixture(),
    forcedUnavailable: forcedHarness ?? null,
    harnesses,
    oat: await oat(),
    selectedHarness: harness,
  };
  report.status = isReady(report, harness) ? 'ready' : 'blocked';

  if (typeof reporter === 'function') {
    emitReadinessReport(report, reporter);
  }

  if (report.status !== 'ready') {
    throw new PreflightError(report);
  }

  return report;
}
