import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SplitPlanDocument } from '../../../../projects/split/child-plan';
import { createProjectSplitRunCommand } from '../run';

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function seedTemplates(repoRoot: string): Promise<void> {
  const templatesDir = join(repoRoot, '.oat', 'templates');
  await mkdir(templatesDir, { recursive: true });
  await writeFile(
    join(templatesDir, 'state.md'),
    [
      '---',
      'oat_phase: {OAT_PHASE}',
      'oat_phase_status: in_progress',
      'oat_workflow_mode: {OAT_WORKFLOW_MODE}',
      '---',
      '',
      '# Project State: {Project Name}',
    ].join('\n'),
    'utf8',
  );
  for (const file of ['discovery.md', 'plan.md', 'implementation.md']) {
    await writeFile(
      join(templatesDir, file),
      ['---', 'oat_template: true', '---', '', `# {Project Name} ${file}`].join(
        '\n',
      ),
      'utf8',
    );
  }
}

function document(
  overrides: Partial<SplitPlanDocument> = {},
): SplitPlanDocument {
  return {
    origin: 'declared',
    interactive: true,
    plan: {
      parentSlug: 'umbrella',
      children: [
        {
          slug: 'foundation',
          inheritedContext: 'Foundation context',
          knownDependencies: [],
          order: 1,
        },
        {
          slug: 'docs',
          inheritedContext: 'Docs context',
          knownDependencies: ['foundation'],
          order: 2,
        },
      ],
      foundationChild: 'foundation',
      initialActiveChild: 'foundation',
    },
    ...overrides,
  };
}

function createHarness(repoRoot: string): {
  capture: LoggerCapture;
  command: Command;
} {
  const capture = createLoggerCapture();
  const command = createProjectSplitRunCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: false,
      json: false,
      cwd: repoRoot,
      home: join(repoRoot, 'home'),
      interactive: true,
      logger: capture.logger,
    }),
    resolveProjectRoot: async () => repoRoot,
    resolveProjectsRoot: async () => '.oat/projects/shared',
    refreshDashboard: async () => {},
    processEnv: {},
  });
  return { capture, command };
}

async function runCommand(command: Command, args: string[]): Promise<void> {
  const program = new Command().name('oat').exitOverride();
  const project = new Command('project');
  const split = new Command('split');
  split.addCommand(command);
  project.addCommand(split);
  program.addCommand(project);
  await program.parseAsync(['project', 'split', 'run', ...args], {
    from: 'user',
  });
}

describe('oat project split run', () => {
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

  async function writePlanFile(
    repoRoot: string,
    payload: unknown,
  ): Promise<string> {
    const planFile = join(repoRoot, 'split-plan.json');
    await writeFile(planFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    return planFile;
  }

  it('produces parent + children + activates initial child for a valid plan', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-run-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const planFile = await writePlanFile(repoRoot, document());
    const { command } = createHarness(repoRoot);

    await runCommand(command, ['--plan-file', planFile]);

    expect(process.exitCode).toBe(0);
    const localConfig = JSON.parse(
      await readFile(join(repoRoot, '.oat', 'config.local.json'), 'utf8'),
    ) as { activeProject: string };
    expect(localConfig.activeProject).toBe('.oat/projects/shared/foundation');
    await expect(
      exists(join(repoRoot, '.oat', 'projects', 'shared', 'umbrella')),
    ).resolves.toBe(true);
    await expect(
      exists(join(repoRoot, '.oat', 'projects', 'shared', 'docs')),
    ).resolves.toBe(true);
  });

  it('asserts the coordination-parent file invariant', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-run-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const planFile = await writePlanFile(repoRoot, document());
    const { command } = createHarness(repoRoot);

    await runCommand(command, ['--plan-file', planFile]);

    const parentRoot = join(repoRoot, '.oat', 'projects', 'shared', 'umbrella');
    for (const file of [
      'spec.md',
      'design.md',
      'plan.md',
      'implementation.md',
    ]) {
      await expect(exists(join(parentRoot, file))).resolves.toBe(false);
    }
  });

  it('fails fast in --non-interactive mode when origin is detected', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-run-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const activeRoot = join(repoRoot, '.oat', 'projects', 'shared', 'active');
    await mkdir(activeRoot, { recursive: true });
    await writeFile(join(activeRoot, 'discovery.md'), '# Discovery\n', 'utf8');
    await mkdir(join(repoRoot, '.oat'), { recursive: true });
    await writeFile(
      join(repoRoot, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/active' })}\n`,
      'utf8',
    );
    const planFile = await writePlanFile(
      repoRoot,
      document({ origin: 'detected-mid-stream', interactive: false }),
    );
    const { command } = createHarness(repoRoot);

    await runCommand(command, ['--plan-file', planFile, '--non-interactive']);

    expect(process.exitCode).toBe(1);
    await expect(
      exists(join(repoRoot, '.oat', 'projects', 'shared', 'umbrella')),
    ).resolves.toBe(false);
    await expect(
      readFile(join(activeRoot, 'discovery.md'), 'utf8'),
    ).resolves.toContain('## Detected Split Recommendation');
  });

  it('proceeds in --non-interactive mode when origin is declared', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-run-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const planFile = await writePlanFile(
      repoRoot,
      document({ origin: 'declared', interactive: false }),
    );
    const { command } = createHarness(repoRoot);

    await runCommand(command, ['--plan-file', planFile, '--non-interactive']);

    expect(process.exitCode).toBe(0);
    await expect(
      exists(join(repoRoot, '.oat', 'projects', 'shared', 'umbrella')),
    ).resolves.toBe(true);
  });

  it('rejects invalid origins before writing projects', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-run-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const planFile = await writePlanFile(repoRoot, {
      ...document(),
      origin: 'not-a-real-origin',
    });
    const { capture, command } = createHarness(repoRoot);

    await runCommand(command, ['--plan-file', planFile]);

    expect(process.exitCode).toBe(1);
    expect(capture.error.join('\n')).toContain('Invalid SplitPlanDocument');
    expect(capture.error.join('\n')).toContain(
      'SplitPlanDocument origin is required',
    );
    await expect(
      exists(join(repoRoot, '.oat', 'projects', 'shared', 'umbrella')),
    ).resolves.toBe(false);
  });

  it('persists split-plan.json and resumes partial prior runs', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-run-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const splitDocument = document();
    const planFile = await writePlanFile(repoRoot, splitDocument);
    const { command } = createHarness(repoRoot);

    await runCommand(command, ['--plan-file', planFile]);
    const parentRoot = join(repoRoot, '.oat', 'projects', 'shared', 'umbrella');
    await expect(
      readFile(join(parentRoot, 'references', 'split-plan.json'), 'utf8'),
    ).resolves.toContain('"origin": "declared"');

    await rm(join(repoRoot, '.oat', 'projects', 'shared', 'docs'), {
      recursive: true,
      force: true,
    });
    const statePath = join(parentRoot, 'state.md');
    const state = await readFile(statePath, 'utf8');
    await writeFile(
      statePath,
      state.replace(
        'oat_phase_status: complete',
        'oat_phase_status: in_progress',
      ),
      'utf8',
    );

    await runCommand(command, ['--plan-file', planFile]);

    await expect(
      exists(join(repoRoot, '.oat', 'projects', 'shared', 'docs')),
    ).resolves.toBe(true);
  });
});
