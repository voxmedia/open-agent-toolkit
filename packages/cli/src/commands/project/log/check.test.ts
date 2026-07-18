import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { appendProjectLog } from './append';
import { checkProjectLog } from './check';
import { createProjectLogCommand } from './index';

function createHarness(cwd: string): {
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
    }),
  };
}

async function runCommand(
  command: Command,
  args: string[] = [],
  globalArgs: string[] = ['--json'],
): Promise<void> {
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
    [...globalArgs, 'project', 'log', 'check', ...args],
    { from: 'user' },
  );
}

describe('oat project log check', () => {
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

  async function createRepo(): Promise<{
    root: string;
    projectPath: string;
    logPath: string;
  }> {
    const root = await mkdtemp(join(tmpdir(), 'oat-project-log-check-'));
    tempDirs.push(root);
    const relativeProject = '.oat/projects/shared/demo';
    const projectPath = join(root, relativeProject);
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), '---\n---\n', 'utf8');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: relativeProject })}\n`,
      'utf8',
    );
    return {
      root,
      projectPath,
      logPath: join(projectPath, 'project-log.md'),
    };
  }

  function logContent(
    entries: string,
    synthesisHeading = '## End-of-run synthesis (pending — do not skip at project completion)',
  ): string {
    return `# Project Log: demo

## Entries

${entries}

${synthesisHeading}

Synthesis content.
`;
  }

  it('returns the absent envelope when no project log exists', async () => {
    const { root } = await createRepo();
    const { command, capture } = createHarness(root);

    await runCommand(command);

    expect(capture.jsonPayloads[0]).toEqual({
      status: 'absent',
      logPath: null,
      entryCounts: {
        structural: 0,
        judgment: {
          bug: 0,
          friction: 0,
          'worked-well': 0,
          feedback: 0,
        },
      },
      scopeCounts: { project: 0, general: 0 },
      lastEntryDate: null,
      synthesisPending: false,
      grammarViolations: [],
    });
    expect(process.exitCode).toBe(0);
  });

  it('reports counts, last date, and pending synthesis', async () => {
    const { root, logPath } = await createRepo();
    await writeFile(
      logPath,
      logContent(`### 2026-07-15 · project · bug · gate exit

First.

### 2026-07-16 · general · worked-well · command help

Second.

### 2026-07-17 · structural · oat-project-implement · p01

Third.`),
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'synthesis_pending',
      entryCounts: {
        structural: 1,
        judgment: {
          bug: 1,
          friction: 0,
          'worked-well': 1,
          feedback: 0,
        },
      },
      scopeCounts: { project: 1, general: 1 },
      lastEntryDate: '2026-07-17',
      synthesisPending: true,
      grammarViolations: [],
    });
    expect(process.exitCode).toBe(0);
  });

  it('reports completed synthesis and exits zero when required', async () => {
    const { root, logPath } = await createRepo();
    await writeFile(
      logPath,
      logContent(
        '### 2026-07-17 · project · feedback · lifecycle\n\nUseful.',
        '## End-of-run synthesis',
      ),
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command, ['--require-synthesis']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      synthesisPending: false,
    });
    expect(process.exitCode).toBe(0);
  });

  it('exits one only when --require-synthesis sees pending synthesis', async () => {
    const { root, logPath } = await createRepo();
    await writeFile(logPath, logContent(''), 'utf8');
    const { command, capture } = createHarness(root);

    await runCommand(command, ['--require-synthesis']);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'synthesis_pending',
      synthesisPending: true,
    });
    expect(process.exitCode).toBe(1);
  });

  it('reports only invalid level-three headings under Entries', async () => {
    const { root, logPath } = await createRepo();
    await writeFile(
      logPath,
      logContent(`### 2026-07-17 · project · bug · valid

Valid.

### handwritten heading

Invalid.

### 2026-07-17 · structural · producer · ref

Valid structural.`),
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command);

    expect(capture.jsonPayloads[0]).toMatchObject({
      grammarViolations: ['### handwritten heading'],
    });
    expect(process.exitCode).toBe(0);
  });

  it('parses a helper-written multiline judgment without boundary collisions', async () => {
    const { root, projectPath, logPath } = await createRepo();
    await writeFile(logPath, logContent(''), 'utf8');

    await appendProjectLog({
      repoRoot: root,
      project: projectPath,
      type: 'feedback',
      scope: 'project',
      area: 'serialization boundary',
      body: [
        'Observation: Safe multiline bodies remain within one entry.',
        'Impact: Check retains the complete judgment.',
        'Recommendation: Keep command-owned headings out of bodies.',
      ].join('\n'),
    });

    await expect(
      checkProjectLog({ repoRoot: root, project: projectPath }),
    ).resolves.toMatchObject({
      entryCounts: {
        structural: 0,
        judgment: {
          bug: 0,
          friction: 0,
          'worked-well': 0,
          feedback: 1,
        },
      },
      grammarViolations: [],
    });
  });

  it('ignores sibling append-only artifacts entirely', async () => {
    const { root, projectPath } = await createRepo();
    await writeFile(
      join(projectPath, 'oat-execution-learnings.md'),
      '# Learnings\n\n### [2026-07-17] Different grammar\n',
      'utf8',
    );
    const { command, capture } = createHarness(root);

    await runCommand(command);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'absent',
      grammarViolations: [],
    });
    expect(capture.warn).toEqual([]);
    expect(process.exitCode).toBe(0);
  });
});
