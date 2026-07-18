import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { checkProjectLog } from './check';
import { createProjectLogCommand } from './index';

function createHarness(
  cwd: string,
  stdin = '',
): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();
  return {
    capture,
    command: createProjectLogCommand({
      buildCommandContext: (options: GlobalOptions): CommandContext => ({
        scope: 'project',
        dryRun: false,
        verbose: options.verbose ?? false,
        json: options.json ?? false,
        cwd: options.cwd ?? cwd,
        home: join(cwd, 'home'),
        interactive: !(options.json ?? false),
        logger: capture.logger,
      }),
      resolveProjectRoot: async () => cwd,
      readStdin: async () => stdin,
    }),
  };
}

async function runCommand(command: Command, args: string[]): Promise<void> {
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--cwd <path>')
    .exitOverride();
  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);
  await program.parseAsync(
    ['--json', 'project', 'log', 'synthesize', ...args],
    { from: 'user' },
  );
}

describe('oat project log synthesize', () => {
  const tempDirs: string[] = [];
  let originalExitCode: number | undefined;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createRepo(withLog = true): Promise<{
    root: string;
    projectPath: string;
    logPath: string;
  }> {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-log-synthesize-'));
    tempDirs.push(root);
    const relativeProject = '.oat/projects/shared/demo';
    const projectPath = join(root, relativeProject);
    const logPath = join(projectPath, 'project-log.md');
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), '---\n---\n', 'utf8');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: relativeProject })}\n`,
      'utf8',
    );
    if (withLog) {
      await writeFile(
        logPath,
        `# Project Log: demo

## Entries

### 2026-07-17 · project · bug · gate exit

The gate returned the wrong exit code.

## End-of-run synthesis (pending — do not skip at project completion)

Summarize before archive.
`,
        'utf8',
      );
    }
    return { root, projectPath, logPath };
  }

  it('fills the pending synthesis section from --body', async () => {
    const { root, logPath } = await createRepo();
    const { command, capture } = createHarness(root);

    await runCommand(command, [
      '--body',
      'Verdict: keep. Adopted the safer gate behavior.',
    ]);

    const content = await readFile(logPath, 'utf8');
    expect(content).toContain(
      '## End-of-run synthesis\n\nVerdict: keep. Adopted the safer gate behavior.',
    );
    expect(content).not.toContain('pending — do not skip');
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'synthesized',
      logPath,
    });
    expect(process.exitCode).toBe(0);
  });

  it('accepts synthesis body from stdin', async () => {
    const { root, logPath } = await createRepo();
    const { command } = createHarness(
      root,
      'Observation: The workflow improved.\nImpact: Fewer retries.',
    );

    await runCommand(command, ['--body', '-']);

    await expect(readFile(logPath, 'utf8')).resolves.toContain(
      'Observation: The workflow improved.\nImpact: Fewer retries.',
    );
  });

  it('errors when the project log is absent', async () => {
    const { root } = await createRepo(false);
    const { command, capture } = createHarness(root);

    await runCommand(command, ['--body', 'Nothing to synthesize.']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('does not exist'),
    });
    expect(process.exitCode).toBe(1);
  });

  it('errors when synthesis is already written', async () => {
    const { root, logPath } = await createRepo();
    const content = await readFile(logPath, 'utf8');
    await writeFile(
      logPath,
      content.replace(
        '## End-of-run synthesis (pending — do not skip at project completion)',
        '## End-of-run synthesis',
      ),
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command, ['--body', 'Replacement is not allowed.']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('already written'),
    });
    expect(process.exitCode).toBe(1);
  });

  it('preserves Entries bytes, flips check, and stays format-stable', async () => {
    const { root, logPath } = await createRepo();
    const before = await readFile(logPath, 'utf8');
    const entriesBefore = before.slice(
      before.indexOf('## Entries'),
      before.indexOf('\n## End-of-run synthesis'),
    );
    const { command } = createHarness(root);

    await runCommand(command, ['--body', 'Verdict: adopt the workflow.']);

    const after = await readFile(logPath, 'utf8');
    const entriesAfter = after.slice(
      after.indexOf('## Entries'),
      after.indexOf('\n## End-of-run synthesis'),
    );
    expect(entriesAfter).toBe(entriesBefore);
    await expect(checkProjectLog({ repoRoot: root })).resolves.toMatchObject({
      status: 'ok',
      synthesisPending: false,
    });
    execFileSync('pnpm', ['exec', 'oxfmt', '--check', logPath], {
      cwd: resolve(import.meta.dirname, '../../../../../..'),
      stdio: 'pipe',
    });
  });
});
