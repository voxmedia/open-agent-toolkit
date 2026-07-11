import { execFile } from 'node:child_process';
import { access, readFile, readdir, realpath, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const HARNESS_COMMANDS = {
  codex: {
    authentication: { args: ['login', 'status'], executable: 'codex' },
    runtime: { args: ['--version'], executable: 'codex' },
  },
  claude: {
    authentication: { args: ['auth', 'status'], executable: 'claude' },
    runtime: { args: ['--version'], executable: 'claude' },
  },
  'cursor-ide': {
    authentication: { args: ['agent', 'status'], executable: 'cursor' },
    runtime: { args: ['--version'], executable: 'cursor' },
  },
  'cursor-cli': {
    authentication: { args: ['status'], executable: 'cursor-agent' },
    runtime: { args: ['--version'], executable: 'cursor-agent' },
  },
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
    const { stdout } = await execFileAsync(executable, args, {
      encoding: 'utf8',
      timeout: 10_000,
    });
    return { code: 0, stdout };
  } catch (error) {
    return {
      code: typeof error.code === 'number' ? error.code : 1,
      stdout: error.stdout ?? '',
    };
  }
}

async function resolveCommand(executable, env = process.env) {
  try {
    const { stdout } = await execFileAsync(
      'sh',
      ['-c', 'command -v -- "$1"', 'sh', executable],
      { env },
    );
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function defaultRuntimeProbe(
  harness,
  { commandRunner = runCommand } = {},
) {
  const { args, executable } = HARNESS_COMMANDS[harness].runtime;
  const path = await resolveCommand(executable);
  const command = commandLabel(executable, args);

  if (!path) {
    return { command, result: 'unavailable' };
  }

  return {
    command,
    path,
    result:
      (await commandRunner(executable, args)).code === 0
        ? 'installed'
        : 'unavailable',
  };
}

async function defaultAuthProbe(
  harness,
  installed,
  { commandRunner = runCommand } = {},
) {
  const { args, executable } = HARNESS_COMMANDS[harness].authentication;
  const command = commandLabel(executable, args);

  if (installed.result !== 'installed') {
    return { command, result: 'not-run' };
  }

  return {
    command,
    result:
      (await commandRunner(executable, args)).code === 0
        ? 'authenticated'
        : 'unauthenticated',
  };
}

async function latestModifiedTime(path) {
  const entry = await stat(path);

  if (!entry.isDirectory()) {
    return entry.mtimeMs;
  }

  const entries = await readdir(path, { withFileTypes: true });
  const times = await Promise.all(
    entries.map((child) => latestModifiedTime(join(path, child.name))),
  );
  return Math.max(entry.mtimeMs, ...times);
}

async function defaultOatProbe({
  commandRunner = runCommand,
  env = process.env,
  localOatPath = defaultLocalOatPath,
  packagePath = resolve(repositoryRoot, 'packages/cli/package.json'),
} = {}) {
  try {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
    const expectedVersion = packageJson.version;
    const sourcePath = resolve(repositoryRoot, 'packages/cli/src');
    const [
      entry,
      sourceModifiedAt,
      packageModifiedAt,
      versionResult,
      oatCommandPath,
      revisionResult,
    ] = await Promise.all([
      stat(localOatPath),
      latestModifiedTime(sourcePath),
      stat(packagePath),
      commandRunner(localOatPath, ['--version']),
      resolveCommand('oat', env),
      commandRunner('git', ['rev-parse', 'HEAD']),
    ]);
    const [resolvedLocalPath, resolvedCommandPath] = await Promise.all([
      realpath(localOatPath),
      oatCommandPath ? realpath(oatCommandPath) : null,
    ]);
    const revision = revisionResult.stdout.trim() || null;
    const fresh =
      entry.mtimeMs >= Math.max(sourceModifiedAt, packageModifiedAt.mtimeMs);
    const version = versionResult.stdout.trim();

    return {
      expectedVersion,
      freshness: fresh ? 'current-source' : 'stale-dist',
      commandPath: resolvedCommandPath,
      localPath: resolvedLocalPath,
      revision,
      result:
        resolvedCommandPath === resolvedLocalPath &&
        versionResult.code === 0 &&
        version === expectedVersion &&
        fresh
          ? 'local'
          : 'stale-global',
      version,
    };
  } catch {
    return {
      localPath: localOatPath,
      result: 'stale-global',
    };
  }
}

function validateFixtureContract(project) {
  const plan = project.plan;
  const tasks = [
    ...plan.matchAll(
      /^### Task (p(?<phase>\d{2})-t(?<task>\d{2})): .+?\n(?<body>[\s\S]*?)(?=^### Task |(?![\s\S]))/gm,
    ),
  ];
  const requiredSections = [
    '## Reviews',
    '## Implementation Complete',
    '## References',
  ];

  if (
    !/^---\n[\s\S]*?^oat_plan_source: quick$/m.test(plan) ||
    !/^---\n[\s\S]*?^oat_status: in_progress$/m.test(plan) ||
    !/oat_plan_parallel_groups:\s*\[\s*\[\s*['"]?p01['"]?\s*,\s*['"]?p02['"]?\s*\]\s*\]/.test(
      plan,
    ) ||
    requiredSections.some((section) => !plan.includes(section)) ||
    tasks.length !== 9
  ) {
    return 'Fixture plan does not satisfy the smoke contract.';
  }

  if (
    !/^---\n[\s\S]*?^oat_workflow_mode: quick$/m.test(project.state) ||
    !/^---\n[\s\S]*?^oat_dispatch_policy:\n\s+mode: managed$/m.test(
      project.state,
    ) ||
    ['discovery', 'design'].some(
      (artifact) =>
        !/^---\n[\s\S]*?^oat_status: complete$/m.test(project[artifact]) ||
        !/^---\n[\s\S]*?^oat_template: false$/m.test(project[artifact]),
    )
  ) {
    return 'Fixture artifacts do not satisfy the lifecycle contract.';
  }

  for (const task of tasks) {
    const phaseId = `p${task.groups.phase}`;
    const taskId = task[1];
    if (
      !new RegExp(
        `^\\*\\*Write target:\\*\\* \`workspace/logs/${phaseId}\\.log\`$`,
        'm',
      ).test(task.groups.body) ||
      !new RegExp(
        `^\\*\\*Expected commit:\\*\\* \`feat\\(${taskId}\\): append fixture marker\`$`,
        'm',
      ).test(task.groups.body)
    ) {
      return `Fixture task ${taskId} does not satisfy its integrity contract.`;
    }
  }

  return null;
}

async function defaultFixtureProbe({ fixturePath = defaultFixturePath } = {}) {
  const fixtureTests = [
    'fixture-integrity.test.mjs',
    'fixture-format-contract.test.mjs',
    'presets/apply-preset.test.mjs',
  ];
  const missingPaths = [];

  for (const path of REQUIRED_FIXTURE_PATHS) {
    try {
      await access(resolve(fixturePath, path));
    } catch {
      missingPaths.push(path);
    }
  }

  if (missingPaths.length > 0) {
    return {
      reason: `Missing fixture paths: ${missingPaths.join(', ')}`,
      result: 'invalid',
    };
  }

  const fixtureTestResult = await runCommand(process.execPath, [
    '--test',
    ...fixtureTests.map((path) => resolve(defaultFixturePath, path)),
  ]);
  if (fixturePath === defaultFixturePath && fixtureTestResult.code !== 0) {
    return {
      reason: 'Repository fixture validators failed.',
      result: 'invalid',
    };
  }

  const project = Object.fromEntries(
    await Promise.all(
      [
        'state.md',
        'discovery.md',
        'design.md',
        'plan.md',
        'implementation.md',
      ].map(async (artifact) => [
        artifact.replace('.md', ''),
        await readFile(resolve(fixturePath, 'project', artifact), 'utf8'),
      ]),
    ),
  );
  const reason = validateFixtureContract(project);
  if (reason) {
    return { reason, result: 'invalid' };
  }

  try {
    const [implementationReady, preReview, state, p01, p02, p03] =
      await Promise.all([
        readFile(
          resolve(fixturePath, 'presets', 'implementation-ready.json'),
          'utf8',
        ),
        readFile(resolve(fixturePath, 'presets', 'pre-review.json'), 'utf8'),
        readFile(resolve(fixturePath, 'project', 'state.md'), 'utf8'),
        readFile(resolve(fixturePath, 'workspace', 'logs', 'p01.log'), 'utf8'),
        readFile(resolve(fixturePath, 'workspace', 'logs', 'p02.log'), 'utf8'),
        readFile(resolve(fixturePath, 'workspace', 'logs', 'p03.log'), 'utf8'),
      ]);
    const readyPreset = JSON.parse(implementationReady);
    const resetPreset = JSON.parse(preReview);
    const seedLogs = [p01, p02, p03];

    if (
      readyPreset.name !== 'implementation-ready' ||
      resetPreset.name !== 'pre-review' ||
      readyPreset.state?.frontmatter?.oat_phase !== 'implement' ||
      readyPreset.state?.frontmatter?.oat_current_task !== 'p01-t01' ||
      resetPreset.state?.frontmatter?.oat_phase !== 'plan' ||
      resetPreset.state?.frontmatter?.oat_current_task !== 'null' ||
      !/^oat_phase: plan$/m.test(state) ||
      seedLogs.some((log) => log.trim() !== '')
    ) {
      return {
        reason:
          'Fixture presets, inverse lifecycle state, or seed logs do not satisfy the smoke contract.',
        result: 'invalid',
      };
    }
  } catch {
    return {
      reason: 'Fixture presets or seed logs are invalid.',
      result: 'invalid',
    };
  }

  return { result: 'valid' };
}

function unavailableResult(harness) {
  const { args, executable } = HARNESS_COMMANDS[harness].runtime;
  return {
    command: commandLabel(executable, args),
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
  { fixturePath, harness, localOatPath, packagePath },
  { env = process.env, probes = {}, reporter } = {},
) {
  if (!HARNESS_COMMANDS[harness]) {
    throw new TypeError(`Unknown smoke harness: ${harness}`);
  }

  const runtime = probes.runtime ?? defaultRuntimeProbe;
  const auth = probes.auth ?? defaultAuthProbe;
  const fixture = probes.fixture ?? defaultFixtureProbe;
  const oat = probes.oat ?? defaultOatProbe;
  const commandRunner = probes.command ?? runCommand;
  const forcedHarness = env.OAT_SMOKE_FORCE_UNAVAILABLE;
  if (forcedHarness && !HARNESS_COMMANDS[forcedHarness]) {
    throw new PreflightError({
      forcedUnavailable: forcedHarness,
      reason: `Unknown forced-unavailable harness: ${forcedHarness}`,
      selectedHarness: harness,
      status: 'blocked',
    });
  }
  const harnesses = {};

  for (const currentHarness of Object.keys(HARNESS_COMMANDS)) {
    const installed =
      forcedHarness === currentHarness
        ? unavailableResult(currentHarness)
        : await runtime(currentHarness, { commandRunner });
    const authenticated =
      currentHarness === harness
        ? await auth(currentHarness, installed, { commandRunner })
        : {
            command: commandLabel(
              HARNESS_COMMANDS[currentHarness].authentication.executable,
              HARNESS_COMMANDS[currentHarness].authentication.args,
            ),
            reason: 'Authentication is only probed for the selected harness.',
            result: 'not-run',
          };
    harnesses[currentHarness] = { authenticated, installed };
  }

  const report = {
    fixture: await fixture({ fixturePath }),
    forcedUnavailable: forcedHarness ?? null,
    harnesses,
    oat: await oat({ commandRunner, env, localOatPath, packagePath }),
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
