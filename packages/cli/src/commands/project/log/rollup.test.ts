import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createProjectLogCommand } from './index';
import { rollupProjectLog } from './rollup';

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
      readStdin: async () => '',
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
  await program.parseAsync(['--json', 'project', 'log', 'rollup', ...args], {
    from: 'user',
  });
}

describe('oat project log rollup', () => {
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

  async function createRepo(
    options: {
      withLog?: boolean;
      withSummary?: boolean;
      referenceLayer?: boolean;
      explicitLedgerPath?: string;
      siblingArtifact?: boolean;
    } = {},
  ): Promise<{
    root: string;
    projectPath: string;
    logPath: string;
    summaryPath: string;
    ledgerPath: string;
  }> {
    const {
      withLog = true,
      withSummary = true,
      referenceLayer = true,
      explicitLedgerPath,
      siblingArtifact = false,
    } = options;
    const root = await mkdtemp(join(tmpdir(), 'oat-project-log-rollup-'));
    tempDirs.push(root);
    const relativeProject = '.oat/projects/shared/demo';
    const projectPath = join(root, relativeProject);
    const logPath = join(projectPath, 'project-log.md');
    const summaryPath = join(projectPath, 'summary.md');
    const ledgerPath = join(
      root,
      explicitLedgerPath ?? '.oat/repo/reference/project-observations.md',
    );
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), '---\n---\n', 'utf8');
    await writeFile(
      join(root, '.oat', 'config.local.json'),
      `${JSON.stringify({
        version: 1,
        activeProject: relativeProject,
        ...(explicitLedgerPath
          ? { workflow: { projectLogLedgerPath: explicitLedgerPath } }
          : {}),
      })}\n`,
      'utf8',
    );
    if (referenceLayer) {
      await mkdir(join(root, '.oat/repo/reference'), { recursive: true });
    }
    if (withSummary) {
      await writeFile(
        summaryPath,
        '# Project Summary\n\n## Outcome\n\nShipped.\n',
        'utf8',
      );
    }
    if (withLog) {
      await writeFile(
        logPath,
        `# Project Log: demo

## Entries

### 2026-07-16 · general · friction · review retries

Repeated reviews obscured the actionable result.

### 2026-07-17 · project · worked-well · task commits

One commit per task made rollback straightforward.

### 2026-07-17 · structural · oat-project-implement · p01

Phase completed with six commits.

## End-of-run synthesis

Verdict: adopt the task commit discipline.
`,
        'utf8',
      );
    }
    if (siblingArtifact) {
      await writeFile(
        join(projectPath, 'oat-execution-learnings.md'),
        '### 1999-01-01 · general · bug · sibling-only\n\nIgnore me.\n',
        'utf8',
      );
    }
    return { root, projectPath, logPath, summaryPath, ledgerPath };
  }

  it('writes the summary section, appends the ledger, and emits the envelope', async () => {
    const { root, summaryPath, ledgerPath } = await createRepo();
    const { command, capture } = createHarness(root);

    await runCommand(command, []);

    expect(capture.jsonPayloads[0]).toEqual({
      status: 'ok',
      summarySection: 'written',
      ledgerOutcome: 'appended',
      entriesRolledUp: 3,
    });
    await expect(readFile(summaryPath, 'utf8')).resolves.toContain(
      '## Workflow Observations',
    );
    const ledger = await readFile(ledgerPath, 'utf8');
    expect(ledger).toContain('review retries');
    expect(ledger).not.toContain('task commits');
    expect(process.exitCode).toBe(0);
  });

  it('updates the summary and deduplicates ledger entries idempotently', async () => {
    const { root, summaryPath, ledgerPath } = await createRepo();
    const first = await rollupProjectLog({
      repoRoot: root,
      home: join(root, 'home'),
    });
    const second = await rollupProjectLog({
      repoRoot: root,
      home: join(root, 'home'),
    });

    expect(first).toMatchObject({
      summarySection: 'written',
      ledgerOutcome: 'appended',
    });
    expect(second).toEqual({
      status: 'ok',
      summarySection: 'updated',
      ledgerOutcome: 'deduplicated',
      entriesRolledUp: 3,
    });
    const summary = await readFile(summaryPath, 'utf8');
    expect(summary.match(/## Workflow Observations/g)).toHaveLength(1);
    const ledger = await readFile(ledgerPath, 'utf8');
    expect(ledger.match(/review retries/g)).toHaveLength(1);
  });

  it('rolls up complete safe multiline judgment bodies', async () => {
    const { root, logPath, summaryPath, ledgerPath } = await createRepo();
    await writeFile(
      logPath,
      `# Project Log: demo

## Entries

### 2026-07-17 · general · feedback · serialization boundary

Observation: Safe multiline bodies remain within one entry.
Impact: Roll-up retains the complete judgment.
Recommendation: Keep command-owned headings out of bodies.

## End-of-run synthesis

Complete.
`,
      'utf8',
    );

    await expect(
      rollupProjectLog({ repoRoot: root, home: join(root, 'home') }),
    ).resolves.toMatchObject({
      status: 'ok',
      ledgerOutcome: 'appended',
      entriesRolledUp: 1,
    });
    for (const path of [summaryPath, ledgerPath]) {
      const content = await readFile(path, 'utf8');
      expect(content).toContain(
        'Observation: Safe multiline bodies remain within one entry.',
      );
      expect(content).toContain(
        'Impact: Roll-up retains the complete judgment.',
      );
      expect(content).toContain(
        'Recommendation: Keep command-owned headings out of bodies.',
      );
    }
  });

  it('permits a skipped ledger when the default reference layer is absent', async () => {
    const { root, ledgerPath } = await createRepo({ referenceLayer: false });

    await expect(
      rollupProjectLog({ repoRoot: root, home: join(root, 'home') }),
    ).resolves.toEqual({
      status: 'ok',
      summarySection: 'written',
      ledgerOutcome: 'skipped_permitted',
      entriesRolledUp: 3,
    });
    await expect(readFile(ledgerPath, 'utf8')).rejects.toThrow();
  });

  it('returns failed when an explicit ledger path is unwritable', async () => {
    const { root } = await createRepo({
      referenceLayer: false,
      explicitLedgerPath: 'blocked/project-observations.md',
    });
    await writeFile(join(root, 'blocked'), 'not a directory', 'utf8');

    await expect(
      rollupProjectLog({ repoRoot: root, home: join(root, 'home') }),
    ).resolves.toEqual({
      status: 'failed',
      summarySection: 'written',
      ledgerOutcome: 'failed',
      entriesRolledUp: 3,
    });
  });

  it('errors without creating summary.md when it is absent', async () => {
    const { root, summaryPath } = await createRepo({ withSummary: false });
    const { command, capture } = createHarness(root);

    await runCommand(command, []);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('summary.md does not exist'),
    });
    await expect(readFile(summaryPath, 'utf8')).rejects.toThrow();
    expect(process.exitCode).toBe(1);
  });

  it('errors when no project log exists', async () => {
    const { root } = await createRepo({ withLog: false });
    const { command, capture } = createHarness(root);

    await runCommand(command, []);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('Project log does not exist'),
    });
    expect(process.exitCode).toBe(1);
  });

  it('ignores sibling artifacts entirely', async () => {
    const { root, summaryPath, ledgerPath } = await createRepo({
      siblingArtifact: true,
    });

    await rollupProjectLog({ repoRoot: root, home: join(root, 'home') });

    await expect(readFile(summaryPath, 'utf8')).resolves.not.toContain(
      'sibling-only',
    );
    await expect(readFile(ledgerPath, 'utf8')).resolves.not.toContain(
      'sibling-only',
    );
  });

  it('keeps the artifact target parameterizable only through the module API', async () => {
    const { root, projectPath } = await createRepo({ withLog: false });
    await writeFile(
      join(projectPath, 'custom-log.md'),
      `# Custom Log

## Entries

### 2026-07-17 · general · feedback · custom target

The internal target is reusable.
`,
      'utf8',
    );

    const result = await rollupProjectLog({
      repoRoot: root,
      home: join(root, 'home'),
      artifactTarget: { filename: 'custom-log.md' },
    });

    expect(result.entriesRolledUp).toBe(1);
    expect(createProjectLogCommand().helpInformation()).not.toContain(
      '--artifact-target',
    );
  });
});
