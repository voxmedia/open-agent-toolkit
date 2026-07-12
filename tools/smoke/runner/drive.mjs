import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectEvidence } from '../evidence/collect.mjs';
import { emitEvidenceReport } from '../evidence/report.mjs';
import { gateTargetForHarness } from './provision.mjs';

const runnerDirectory = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = resolve(runnerDirectory, '../../..');
const protocolsDirectory = resolve(runnerDirectory, '../protocols');
const runRoot = join(repositoryRoot, 'tools/smoke/.runs');
const sourceOatEntryPoint = join(repositoryRoot, 'packages/cli/dist/index.js');
const cursorBrokerLauncher = join(
  repositoryRoot,
  'tools/smoke/runner/cursor-broker-launch.mjs',
);
const PROMPT_START = '<!-- OAT_SMOKE_PROMPT_START -->';
const PROMPT_END = '<!-- OAT_SMOKE_PROMPT_END -->';

const PROTOCOL_FILES = Object.freeze({
  claude: 'claude.md',
  codex: 'codex.md',
  'cursor-cli': 'cursor-cli.md',
  'cursor-ide': 'cursor-ide.md',
});

const SCENARIO_INSTRUCTIONS = Object.freeze({
  full: 'Complete plan review first, then implement and review all fixture phases. Stop when implementation is complete; do not run final closeout.',
  implement:
    'Implement and review all fixture phases from the implementation-ready state. Stop when implementation is complete; do not run final closeout.',
  'plan-review':
    'Complete the active plan review and receive path until the project is implementation-ready. Do not implement any fixture task.',
});

export class DriveError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DriveError';
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}-${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => {});
  }
}

function scenarioInstruction(scenario) {
  const instruction = SCENARIO_INSTRUCTIONS[scenario];
  if (!instruction) {
    throw new DriveError(`Unknown smoke scenario: ${scenario}`);
  }
  return instruction;
}

export function reportRootFor(
  { driveMode, harness, scenario },
  repository = repositoryRoot,
) {
  return join(
    repository,
    'tools',
    'smoke',
    'reports',
    harness,
    ...(driveMode === 'operator' ? ['operator'] : []),
    scenario,
  );
}

export function protocolPathFor(harness) {
  const fileName = PROTOCOL_FILES[harness];
  if (!fileName) {
    throw new DriveError(`Unknown smoke harness: ${harness}`);
  }
  return join(protocolsDirectory, fileName);
}

function extractPromptTemplate(contents, path) {
  const start = contents.indexOf(PROMPT_START);
  const end = contents.indexOf(PROMPT_END);
  if (start === -1 || end === -1 || end <= start) {
    throw new DriveError(`Smoke protocol has no canned prompt block: ${path}`);
  }
  return contents
    .slice(start + PROMPT_START.length, end)
    .trim()
    .replace(/^```text\n/u, '')
    .replace(/\n```$/u, '');
}

export async function loadProtocol(
  { gateTarget, harness, scenario },
  { read = readFile } = {},
) {
  gateTarget ??= gateTargetForHarness(harness);
  const path = protocolPathFor(harness);
  const contents = await read(path, 'utf8');
  const prompt = extractPromptTemplate(contents, path)
    .replaceAll('{{SCENARIO}}', scenario)
    .replaceAll('{{SCENARIO_INSTRUCTIONS}}', scenarioInstruction(scenario))
    .replaceAll('{{GATE_TARGET}}', gateTarget);
  return { contents, path, prompt };
}

export function createInvocationPlan({
  driveMode,
  harness,
  prompt,
  worktreePath,
}) {
  const operator = driveMode === 'operator';
  if (operator) {
    const command = {
      claude: { args: [], executable: 'claude' },
      codex: { args: ['-C', worktreePath], executable: 'codex' },
      'cursor-cli': { args: [], executable: 'cursor-agent' },
      'cursor-ide': { args: [worktreePath], executable: 'cursor' },
    }[harness];
    if (!command) {
      throw new DriveError(`Unknown smoke harness: ${harness}`);
    }
    return { ...command, cwd: worktreePath, operator: true, prompt };
  }

  const command = {
    claude: {
      args: [
        '-p',
        '--permission-mode',
        'bypassPermissions',
        '--output-format',
        'stream-json',
        '--verbose',
        prompt,
      ],
      executable: 'claude',
    },
    codex: {
      args: [
        'exec',
        '--ephemeral',
        '--sandbox',
        'workspace-write',
        '--dangerously-bypass-hook-trust',
        '--json',
        '-C',
        worktreePath,
        prompt,
      ],
      executable: 'codex',
    },
    'cursor-cli': {
      args: [
        '-p',
        '--force',
        '--trust',
        '--output-format',
        'stream-json',
        '--workspace',
        worktreePath,
        prompt,
      ],
      executable: 'cursor-agent',
    },
    'cursor-ide': {
      args: [worktreePath],
      executable: 'cursor',
      manualOnly: true,
    },
  }[harness];
  if (!command) {
    throw new DriveError(`Unknown smoke harness: ${harness}`);
  }
  return {
    ...command,
    credentialBroker: harness === 'codex',
    cwd: worktreePath,
    operator: false,
    prompt,
  };
}

export function renderHandoff(plan) {
  const baseCommand = [plan.executable, ...plan.args];
  const invocation = (
    plan.credentialBroker
      ? [process.execPath, cursorBrokerLauncher, '--', ...baseCommand]
      : baseCommand
  )
    .map(shellQuote)
    .join(' ');
  const command = [
    `export OAT_SMOKE_LOCAL_CLI=${shellQuote(sourceOatEntryPoint)}`,
    `export PATH=${shellQuote(join(plan.cwd, 'tools/smoke/bin'))}:"$PATH"`,
    invocation,
  ].join('; ');
  return [
    `Working directory: ${plan.cwd}`,
    `Command: ${command}`,
    '',
    'Paste this canned root prompt:',
    '',
    plan.prompt,
  ].join('\n');
}

async function executeInvocation(plan, { registerSubprocess } = {}) {
  return new Promise((resolvePromise, reject) => {
    const executable = plan.credentialBroker
      ? process.execPath
      : plan.executable;
    const args = plan.credentialBroker
      ? [cursorBrokerLauncher, '--', plan.executable, ...plan.args]
      : plan.args;
    const child = spawn(executable, args, {
      cwd: plan.cwd,
      env: {
        ...process.env,
        OAT_SMOKE_LOCAL_CLI: sourceOatEntryPoint,
        PATH: `${join(plan.cwd, 'tools/smoke/bin')}:${process.env.PATH ?? ''}`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const unregister = registerSubprocess?.(child);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });
    child.once('error', (error) => {
      unregister?.();
      reject(error);
    });
    child.once('close', (code, signal) => {
      unregister?.();
      if (code === 0) {
        resolvePromise({ code, signal, stderr, stdout });
      } else {
        reject(
          new DriveError(
            `Smoke drive exited with ${signal ?? `code ${String(code)}`}.`,
          ),
        );
      }
    });
  });
}

function assertReady(options, context, manifest) {
  if (context.results?.preflight?.status !== 'ready') {
    throw new DriveError(
      `Smoke drive refused ${options.harness}: preflight is not ready.`,
    );
  }
  if (
    manifest?.readiness?.status !== 'ready' ||
    manifest.harness !== options.harness ||
    manifest.appliedScenario !== options.scenario ||
    manifest.driveMode !== options.driveMode
  ) {
    throw new DriveError(
      'Smoke manifest does not match the ready drive request.',
    );
  }
}

async function saveDriveRecord(manifest, record) {
  manifest.drive = record;
  await atomicWriteJson(manifest.manifestPath, manifest);
}

export async function driveSmoke(
  options,
  context,
  { execute = executeInvocation, reporter = console.log } = {},
) {
  const manifest = context.manifest;
  assertReady(options, context, manifest);
  const protocol = await loadProtocol({
    ...options,
    gateTarget: manifest.gateTarget,
  });
  const plan = createInvocationPlan({
    ...options,
    prompt: protocol.prompt,
    worktreePath: manifest.worktreePath,
  });
  const record = {
    driveMode: options.driveMode,
    invocation: {
      args:
        plan.operator || plan.manualOnly ? plan.args : plan.args.slice(0, -1),
      executable: plan.executable,
    },
    promptSha256: sha256(plan.prompt),
    protocol: relative(repositoryRoot, protocol.path),
    status: options.dryRun
      ? 'dry-run-stub'
      : plan.operator || plan.manualOnly
        ? 'awaiting-operator'
        : 'running',
  };

  if (options.dryRun || plan.operator || plan.manualOnly) {
    await saveDriveRecord(manifest, record);
    reporter(renderHandoff(plan));
    return { plan, record };
  }

  await saveDriveRecord(manifest, record);
  try {
    const result = await execute(plan, context);
    const outputPath = join(
      dirname(manifest.manifestPath),
      'drive-output.json',
    );
    await atomicWriteJson(outputPath, {
      code: result.code,
      stderr: result.stderr,
      stdout: result.stdout,
    });
    manifest.createdPaths.push(outputPath);
    await saveDriveRecord(manifest, {
      ...record,
      outputPath,
      status: 'completed',
    });
    return { outputPath, plan, record: manifest.drive };
  } catch (error) {
    await saveDriveRecord(manifest, {
      ...record,
      error: error instanceof Error ? error.message : String(error),
      status: 'failed',
    });
    throw error;
  }
}

async function manifestCandidates(runsDirectory) {
  let entries;
  try {
    entries = await readdir(runsDirectory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  return Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('smoke-'))
      .map(async (entry) => {
        const path = join(
          runsDirectory,
          entry.name,
          'provisioning-manifest.json',
        );
        try {
          return { path, value: JSON.parse(await readFile(path, 'utf8')) };
        } catch {
          return null;
        }
      }),
  ).then((candidates) => candidates.filter(Boolean));
}

export async function loadPreparedManifest(
  { driveMode, harness, scenario },
  { runsDirectory = runRoot } = {},
) {
  const matches = (await manifestCandidates(runsDirectory)).filter(
    ({ value }) =>
      value.appliedScenario === scenario &&
      value.driveMode === driveMode &&
      value.harness === harness &&
      value.readiness?.status === 'ready',
  );
  if (matches.length !== 1) {
    throw new DriveError(
      `Expected exactly one prepared ${driveMode} ${harness}/${scenario} run; found ${matches.length}.`,
    );
  }
  return matches[0].value;
}

export async function collectSmoke(
  options,
  context,
  {
    collect = collectEvidence,
    emitReport = emitEvidenceReport,
    repository = repositoryRoot,
    runsDirectory = runRoot,
  } = {},
) {
  context.manifest ??= await loadPreparedManifest(options, { runsDirectory });
  const manifest = context.manifest;
  assertReady(options, context, manifest);
  const expectedReportRoot = reportRootFor(options, repository);
  if (resolve(manifest.reportRoot) !== resolve(expectedReportRoot)) {
    throw new DriveError(
      'Smoke manifest report root does not match drive mode.',
    );
  }
  if (options.dryRun) {
    manifest.collection = { status: 'dry-run-stub' };
    await atomicWriteJson(manifest.manifestPath, manifest);
    return manifest.collection;
  }
  if (!['awaiting-operator', 'completed'].includes(manifest.drive?.status)) {
    throw new DriveError(
      'Smoke evidence collection requires a completed drive.',
    );
  }

  const collected = await collect({
    manifestPath: manifest.manifestPath,
    outDirectory: manifest.reportRoot,
    worktreePath: manifest.worktreePath,
  });
  const report = await emitReport({
    bundlePath: collected.outputPath,
    outDirectory: manifest.reportRoot,
  });
  const passed = report.report.status === 'passed';
  manifest.collection = {
    bundlePath: collected.outputPath,
    reportPath: report.jsonPath,
    status: passed ? 'completed' : 'failed',
  };
  if (manifest.drive.status === 'awaiting-operator') {
    manifest.drive.status = 'operator-returned';
  }
  await atomicWriteJson(manifest.manifestPath, manifest);
  if (!passed) {
    throw new DriveError(
      `Smoke evidence report failed ${report.report.summary.failed} assertion(s).`,
    );
  }
  return { collected, report };
}
