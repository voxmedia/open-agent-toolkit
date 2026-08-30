import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { scaffoldProject } from '@commands/project/new/scaffold';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createProjectLogCommand } from './index';

const REPO_ROOT = resolve(import.meta.dirname, '../../../../../../');
const CANONICAL_ASSETS_ROOT = join(REPO_ROOT, '.oat');
const PROJECT_NAME = 'demo';
const FIXED_DATE = '2026-07-18';
const ORIGINAL_HEADING =
  '### 2026-07-18 · project · friction · gate review handoff';

interface Fixture {
  root: string;
  projectPath: string;
  logPath: string;
  summaryPath: string;
  ledgerPath: string;
}

function createHarness(
  root: string,
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
        cwd: options.cwd ?? root,
        home: join(root, 'home'),
        interactive: !(options.json ?? false),
        logger: capture.logger,
      }),
      resolveProjectRoot: async () => root,
      resolveAssetsRoot: async () => CANONICAL_ASSETS_ROOT,
      readStdin: async () => stdin,
      now: () => new Date(`${FIXED_DATE}T12:00:00.000Z`),
    }),
  };
}

async function runLogCommand(
  root: string,
  subcommand: 'append' | 'check' | 'rollup' | 'synthesize',
  args: string[],
  stdin = '',
): Promise<{ payload: unknown; exitCode: number }> {
  process.exitCode = undefined;
  const { command, capture } = createHarness(root, stdin);
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .option('--cwd <path>')
    .exitOverride();
  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);

  await program.parseAsync(['--json', 'project', 'log', subcommand, ...args], {
    from: 'user',
  });
  return {
    payload: capture.jsonPayloads[0],
    exitCode: process.exitCode ?? 0,
  };
}

async function seedRealTemplates(root: string): Promise<void> {
  const templateRoot = join(root, '.oat', 'templates');
  await mkdir(templateRoot, { recursive: true });
  for (const name of [
    'state.md',
    'discovery.md',
    'plan.md',
    'implementation.md',
    'project-log.md',
  ]) {
    await copyFile(
      join(CANONICAL_ASSETS_ROOT, 'templates', name),
      join(templateRoot, name),
    );
  }
}

async function createFixture(
  tempDirs: string[],
  options: {
    referenceLayer?: boolean;
    explicitLedgerPath?: string;
  } = {},
): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), 'oat-project-log-lifecycle-'));
  tempDirs.push(root);
  await seedRealTemplates(root);
  await writeFile(
    join(root, '.oat', 'config.json'),
    `${JSON.stringify({
      workflow: {
        projectLog: 'auto',
        ...(options.explicitLedgerPath
          ? { projectLogLedgerPath: options.explicitLedgerPath }
          : {}),
      },
    })}\n`,
    'utf8',
  );
  const scaffold = await scaffoldProject({
    repoRoot: root,
    projectName: PROJECT_NAME,
    scope: 'shared',
    mode: 'quick',
    setActive: true,
    refreshDashboard: false,
    commit: false,
    home: join(root, 'home'),
    today: FIXED_DATE,
    nowUtc: `${FIXED_DATE}T12:00:00Z`,
  });
  if (options.referenceLayer) {
    await mkdir(join(root, '.oat', 'repo', 'reference'), {
      recursive: true,
    });
  }
  if (options.explicitLedgerPath) {
    await writeFile(join(root, dirname(options.explicitLedgerPath)), 'blocked');
  }
  const projectPath = resolve(root, scaffold.projectPath);

  return {
    root,
    projectPath,
    logPath: join(projectPath, 'project-log.md'),
    summaryPath: join(projectPath, 'summary.md'),
    ledgerPath: join(
      root,
      options.explicitLedgerPath ??
        '.oat/repo/reference/project-observations.md',
    ),
  };
}

async function writeSummary(fixture: Fixture): Promise<void> {
  await writeFile(
    fixture.summaryPath,
    '# Project Summary\n\n## Outcome\n\nLifecycle verified.\n',
    'utf8',
  );
}

async function appendGeneralObservation(fixture: Fixture): Promise<void> {
  const result = await runLogCommand(fixture.root, 'append', [
    '--type',
    'friction',
    '--scope',
    'general',
    '--area',
    'portable lifecycle',
    '--body',
    'This observation applies to all project-log lifecycle runs.',
  ]);
  expect(result).toMatchObject({
    payload: { status: 'appended' },
    exitCode: 0,
  });
}

async function appendSeal(fixture: Fixture): Promise<void> {
  const result = await runLogCommand(fixture.root, 'append', [
    '--structural',
    '--producer',
    'oat-project-complete',
    '--ref',
    'seal',
    '--body',
    'Completion sealed after project-log roll-up status: ok.',
  ]);
  expect(result).toMatchObject({
    payload: { status: 'appended' },
    exitCode: 0,
  });
}

async function archiveOkProject(fixture: Fixture): Promise<{
  archivePath: string;
  summaryExportPath: string;
}> {
  const archivePath = join(
    fixture.root,
    '.oat',
    'projects',
    'archived',
    `${PROJECT_NAME}-${FIXED_DATE}`,
  );
  const summaryExportPath = join(
    fixture.root,
    '.oat',
    'repo',
    'reference',
    'project-summaries',
    `${FIXED_DATE.replaceAll('-', '')}-${PROJECT_NAME}.md`,
  );
  await mkdir(dirname(summaryExportPath), { recursive: true });
  await copyFile(fixture.summaryPath, summaryExportPath);
  await mkdir(dirname(archivePath), { recursive: true });
  await rename(fixture.projectPath, archivePath);
  return { archivePath, summaryExportPath };
}

describe('project-log lifecycle integration', () => {
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

  it('preserves promoted observations across roll-up, synthesis, seal, and archive', async () => {
    const fixture = await createFixture(tempDirs, { referenceLayer: true });

    await expect(readFile(fixture.logPath, 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });

    const dispatch = await runLogCommand(fixture.root, 'append', [
      '--structural',
      '--producer',
      'oat-project-implement',
      '--ref',
      'p03',
      '--body',
      'Dispatch recorded at implementation.md#run-3.',
    ]);
    expect(dispatch).toMatchObject({
      payload: { status: 'appended', created: true },
      exitCode: 0,
    });
    const createdLog = await readFile(fixture.logPath, 'utf8');
    expect(createdLog).toContain('purpose: project-observations');
    expect(createdLog).toContain(`# Project Log: ${PROJECT_NAME}`);
    expect(createdLog).toContain('## Logging contract');
    expect(createdLog).not.toContain('oat_template: true');

    await runLogCommand(fixture.root, 'append', [
      '--structural',
      '--producer',
      'oat gate review',
      '--ref',
      'p03',
      '--body',
      'Gate passed with zero blocking findings.',
    ]);
    await runLogCommand(fixture.root, 'append', [
      '--type',
      'friction',
      '--scope',
      'project',
      '--area',
      'gate review handoff',
      '--body',
      'The project gate handoff required a manual retry.',
    ]);
    const promotion = await runLogCommand(fixture.root, 'append', [
      '--type',
      'friction',
      '--scope',
      'general',
      '--area',
      'gate review handoff',
      '--body',
      `Promotes '${ORIGINAL_HEADING}': the handoff rule applies across projects.`,
    ]);
    expect(promotion.payload).toMatchObject({ status: 'appended' });

    const pending = await runLogCommand(fixture.root, 'check', []);
    expect(pending).toMatchObject({
      payload: {
        status: 'synthesis_pending',
        synthesisPending: true,
        entryCounts: { structural: 2 },
        scopeCounts: { project: 1, general: 1 },
      },
      exitCode: 0,
    });

    await writeSummary(fixture);
    const appended = await runLogCommand(fixture.root, 'rollup', []);
    expect(appended).toEqual({
      payload: {
        status: 'ok',
        summarySection: 'written',
        ledgerOutcome: 'appended',
        entriesRolledUp: 4,
      },
      exitCode: 0,
    });
    const summary = await readFile(fixture.summaryPath, 'utf8');
    expect(summary).toContain('## Workflow Observations');
    expect(summary).toContain(ORIGINAL_HEADING);

    const ledger = await readFile(fixture.ledgerPath, 'utf8');
    expect(ledger).toContain(
      '### 2026-07-18 · general · friction · gate review handoff',
    );
    expect(ledger).toContain(`Promotes '${ORIGINAL_HEADING}'`);
    expect(ledger).not.toContain('The project gate handoff required');
    expect(ledger).not.toMatch(
      /^### 2026-07-18 · project · friction · gate review handoff$/m,
    );

    const deduplicated = await runLogCommand(fixture.root, 'rollup', []);
    expect(deduplicated).toEqual({
      payload: {
        status: 'ok',
        summarySection: 'updated',
        ledgerOutcome: 'deduplicated',
        entriesRolledUp: 4,
      },
      exitCode: 0,
    });
    expect(
      (await readFile(fixture.ledgerPath, 'utf8')).match(
        /general · friction · gate review handoff/g,
      ),
    ).toHaveLength(1);

    const synthesized = await runLogCommand(
      fixture.root,
      'synthesize',
      ['--body', '-'],
      'Verdict: keep the append-only lifecycle and roll-up gate.',
    );
    expect(synthesized).toMatchObject({
      payload: { status: 'synthesized' },
      exitCode: 0,
    });
    const complete = await runLogCommand(fixture.root, 'check', []);
    expect(complete).toMatchObject({
      payload: { status: 'ok', synthesisPending: false },
      exitCode: 0,
    });

    await appendSeal(fixture);
    const sealedLog = await readFile(fixture.logPath, 'utf8');
    expect(
      sealedLog.lastIndexOf('· structural · oat-project-complete · seal'),
    ).toBeGreaterThan(
      sealedLog.lastIndexOf('· general · friction · gate review handoff'),
    );

    const archived = await archiveOkProject(fixture);
    await expect(readFile(fixture.summaryPath, 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(
      readFile(join(archived.archivePath, 'project-log.md'), 'utf8'),
    ).resolves.toContain('· structural · oat-project-complete · seal');
    await expect(
      readFile(archived.summaryExportPath, 'utf8'),
    ).resolves.toContain('## Workflow Observations');
    await expect(readFile(fixture.ledgerPath, 'utf8')).resolves.toContain(
      '· general · friction · gate review handoff',
    );

    const skippedFixture = await createFixture(tempDirs);
    await appendGeneralObservation(skippedFixture);
    await writeSummary(skippedFixture);
    const skipped = await runLogCommand(skippedFixture.root, 'rollup', []);
    expect(skipped).toEqual({
      payload: {
        status: 'ok',
        summarySection: 'written',
        ledgerOutcome: 'skipped_permitted',
        entriesRolledUp: 1,
      },
      exitCode: 0,
    });
    await appendSeal(skippedFixture);
    const skippedArchive = await archiveOkProject(skippedFixture);
    await expect(
      readFile(join(skippedArchive.archivePath, 'project-log.md'), 'utf8'),
    ).resolves.toContain('· structural · oat-project-complete · seal');

    const failedFixture = await createFixture(tempDirs, {
      explicitLedgerPath: 'blocked/project-observations.md',
    });
    await appendGeneralObservation(failedFixture);
    await writeSummary(failedFixture);
    const failed = await runLogCommand(failedFixture.root, 'rollup', []);
    expect(failed).toEqual({
      payload: {
        status: 'failed',
        summarySection: 'written',
        ledgerOutcome: 'failed',
        entriesRolledUp: 1,
      },
      exitCode: 1,
    });
    await expect(
      readFile(failedFixture.logPath, 'utf8'),
    ).resolves.not.toContain('· structural · oat-project-complete · seal');
    await expect(
      readFile(
        join(
          failedFixture.root,
          '.oat',
          'projects',
          'archived',
          `${PROJECT_NAME}-${FIXED_DATE}`,
        ),
        'utf8',
      ),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
