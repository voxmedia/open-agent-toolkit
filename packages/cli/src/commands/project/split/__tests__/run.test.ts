import { execFileSync } from 'node:child_process';
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
import { createProjectStatusCommand } from '@commands/project/status';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

function createHarness(
  repoRoot: string,
  overrides: {
    interactive?: boolean;
    json?: boolean;
    processEnv?: NodeJS.ProcessEnv;
    projectsRoot?: string;
    confirmResponses?: boolean[];
  } = {},
): {
  capture: LoggerCapture;
  command: Command;
  confirmAction: ReturnType<typeof vi.fn>;
} {
  const capture = createLoggerCapture();
  const confirmResponses = [...(overrides.confirmResponses ?? [])];
  const confirmAction = vi.fn(async () => confirmResponses.shift() ?? false);
  const json = overrides.json ?? false;
  const command = createProjectSplitRunCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: false,
      json,
      cwd: repoRoot,
      home: join(repoRoot, 'home'),
      interactive: overrides.interactive ?? !json,
      logger: capture.logger,
    }),
    resolveProjectRoot: async () => repoRoot,
    resolveProjectsRoot: async () =>
      overrides.projectsRoot ?? '.oat/projects/shared',
    refreshDashboard: async () => {},
    confirmAction,
    processEnv: overrides.processEnv ?? {},
  });
  return { capture, command, confirmAction };
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

async function runStatusCommand(
  repoRoot: string,
  args: string[],
): Promise<LoggerCapture> {
  const capture = createLoggerCapture();
  const command = createProjectStatusCommand({
    buildCommandContext: (globalOptions: GlobalOptions): CommandContext => ({
      scope: (globalOptions.scope ?? 'project') as 'project' | 'user' | 'all',
      dryRun: false,
      verbose: false,
      json: globalOptions.json ?? false,
      cwd: repoRoot,
      home: join(repoRoot, 'home'),
      interactive: !(globalOptions.json ?? false),
      logger: capture.logger,
    }),
    resolveProjectRoot: async () => repoRoot,
  });
  const program = new Command().name('oat').option('--json').exitOverride();
  const project = new Command('project');
  project.addCommand(command);
  program.addCommand(project);
  await program.parseAsync(['--json', 'project', 'status', ...args], {
    from: 'user',
  });
  return capture;
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
    const { capture, command } = createHarness(repoRoot);

    await runCommand(command, ['--plan-file', planFile]);

    expect(capture.error).toEqual([]);
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

  it('inherits local scope from a single-segment configured root', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-run-'));
    tempDirs.push(repoRoot);
    execFileSync('git', ['init', '-q'], { cwd: repoRoot });
    await seedTemplates(repoRoot);
    await mkdir(join(repoRoot, '.oat'), { recursive: true });
    await writeFile(
      join(repoRoot, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: 'local/source' })}\n`,
      'utf8',
    );
    const planFile = await writePlanFile(repoRoot, document());
    const { capture, command } = createHarness(repoRoot, {
      projectsRoot: 'projects',
      processEnv: { OAT_PROJECTS_ROOT: 'projects' },
    });

    await runCommand(command, ['--plan-file', planFile]);

    expect(capture.error).toEqual([]);
    expect(process.exitCode).toBe(0);
    const localConfig = JSON.parse(
      await readFile(join(repoRoot, '.oat', 'config.local.json'), 'utf8'),
    ) as { activeProject: string };
    expect(localConfig.activeProject).toBe('local/foundation');
    await expect(exists(join(repoRoot, 'local', 'umbrella'))).resolves.toBe(
      true,
    );
    await expect(exists(join(repoRoot, 'local', 'docs'))).resolves.toBe(true);
  });

  it('seeds the active child with quick routing state for project status', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-run-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const planFile = await writePlanFile(repoRoot, document());
    const { command } = createHarness(repoRoot);

    await runCommand(command, ['--plan-file', planFile]);

    const statusCapture = await runStatusCommand(repoRoot, [
      '--project-path',
      '.oat/projects/shared/foundation',
    ]);
    expect(statusCapture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      project: {
        phase: 'discovery',
        workflowMode: 'quick',
        recommendation: {
          skill: 'oat-project-plan',
        },
      },
    });
    await expect(
      readFile(
        join(repoRoot, '.oat', 'projects', 'shared', 'foundation', 'plan.md'),
        'utf8',
      ),
    ).resolves.toContain('oat_plan_source: quick');
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

  it('fails fast for detected origins when OAT_NON_INTERACTIVE=1', async () => {
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
      document({ origin: 'detected-convergence', interactive: false }),
    );
    const { command } = createHarness(repoRoot, {
      processEnv: { OAT_NON_INTERACTIVE: '1' },
    });

    await runCommand(command, ['--plan-file', planFile]);

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

  it('converts the active detected discovery project into the coordination parent', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-run-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const parentRoot = join(repoRoot, '.oat', 'projects', 'shared', 'umbrella');
    await mkdir(parentRoot, { recursive: true });
    await writeFile(
      join(parentRoot, 'state.md'),
      [
        '---',
        'oat_phase: discovery',
        'oat_phase_status: in_progress',
        'oat_workflow_mode: quick',
        '---',
        '',
        '# Project State: umbrella',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(parentRoot, 'discovery.md'),
      '# Discovery: umbrella\n\nExisting detected discovery context.\n',
      'utf8',
    );
    await writeFile(join(parentRoot, 'plan.md'), '# Plan\n', 'utf8');
    await writeFile(
      join(parentRoot, 'implementation.md'),
      '# Implementation\n',
      'utf8',
    );
    await mkdir(join(repoRoot, '.oat'), { recursive: true });
    await writeFile(
      join(repoRoot, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/umbrella' })}\n`,
      'utf8',
    );
    const planFile = await writePlanFile(
      repoRoot,
      document({ origin: 'detected-mid-stream', interactive: true }),
    );
    const { command } = createHarness(repoRoot);

    await runCommand(command, ['--plan-file', planFile]);

    expect(process.exitCode).toBe(0);
    const parentState = await readFile(join(parentRoot, 'state.md'), 'utf8');
    expect(parentState).toContain('oat_kind: coordination');
    expect(parentState).toContain('oat_phase: decomposition');
    expect(parentState).toContain('oat_phase_status: complete');
    await expect(exists(join(parentRoot, 'plan.md'))).resolves.toBe(false);
    await expect(exists(join(parentRoot, 'implementation.md'))).resolves.toBe(
      false,
    );
    await expect(
      exists(join(repoRoot, '.oat', 'projects', 'shared', 'foundation')),
    ).resolves.toBe(true);
    const localConfig = JSON.parse(
      await readFile(join(repoRoot, '.oat', 'config.local.json'), 'utf8'),
    ) as { activeProject: string };
    expect(localConfig.activeProject).toBe('.oat/projects/shared/foundation');
  });

  it('emits JSON result under --json when convertActiveDetectedParent path succeeds', async () => {
    // This test exercises the second JSON emission branch inside `run.ts`:
    // when an existing detected parent is converted in-place, JSON is emitted
    // from within the `convertActiveDetectedParent` guard rather than the
    // fall-through success path. Both branches must emit the same payload shape.
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-run-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const parentRoot = join(repoRoot, '.oat', 'projects', 'shared', 'umbrella');
    await mkdir(parentRoot, { recursive: true });
    await writeFile(
      join(parentRoot, 'state.md'),
      [
        '---',
        'oat_phase: discovery',
        'oat_phase_status: in_progress',
        'oat_workflow_mode: quick',
        '---',
        '',
        '# Project State: umbrella',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(parentRoot, 'discovery.md'),
      '# Discovery: umbrella\n\nExisting detected discovery context.\n',
      'utf8',
    );
    await writeFile(join(parentRoot, 'plan.md'), '# Plan\n', 'utf8');
    await writeFile(
      join(parentRoot, 'implementation.md'),
      '# Implementation\n',
      'utf8',
    );
    await mkdir(join(repoRoot, '.oat'), { recursive: true });
    await writeFile(
      join(repoRoot, '.oat', 'config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/shared/umbrella' })}\n`,
      'utf8',
    );
    const planFile = await writePlanFile(
      repoRoot,
      document({ origin: 'detected-mid-stream', interactive: true }),
    );
    // Use json: true + interactive: true so the non-interactive detected-split
    // guard is bypassed and the convertActiveDetectedParent branch emits JSON.
    const { capture, command } = createHarness(repoRoot, {
      json: true,
      interactive: true,
    });

    await runCommand(command, ['--plan-file', planFile]);

    expect(process.exitCode).toBe(0);
    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      parentSlug: 'umbrella',
      children: expect.arrayContaining(['foundation', 'docs']),
    });
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

  it('previews partial prior runs and requires confirmation before resume writes', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-run-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const splitDocument = document();
    const planFile = await writePlanFile(repoRoot, splitDocument);
    const { command: initialCommand } = createHarness(repoRoot);

    await runCommand(initialCommand, ['--plan-file', planFile]);
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

    const { capture, command } = createHarness(repoRoot);
    await runCommand(command, ['--plan-file', planFile]);

    expect(process.exitCode).toBe(1);
    expect(capture.info.join('\n')).toContain(
      'Parent: .oat/projects/shared/umbrella',
    );
    expect(capture.info.join('\n')).toContain('Children: foundation, docs');
    expect(capture.info.join('\n')).toContain('Missing children: docs');
    expect(capture.info.join('\n')).toContain('docs -> foundation');
    expect(capture.info.join('\n')).toContain('Active child: foundation');
    await expect(
      exists(join(repoRoot, '.oat', 'projects', 'shared', 'docs')),
    ).resolves.toBe(false);
  });

  it('resumes partial prior runs after interactive confirmation', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-run-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const splitDocument = document();
    const planFile = await writePlanFile(repoRoot, splitDocument);
    const { command: initialCommand } = createHarness(repoRoot);

    await runCommand(initialCommand, ['--plan-file', planFile]);
    const parentRoot = join(repoRoot, '.oat', 'projects', 'shared', 'umbrella');
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

    const { command } = createHarness(repoRoot, {
      confirmResponses: [true],
    });
    await runCommand(command, ['--plan-file', planFile]);

    await expect(
      exists(join(repoRoot, '.oat', 'projects', 'shared', 'docs')),
    ).resolves.toBe(true);
  });

  it('emits JSON result under --json when split succeeds', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-run-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const planFile = await writePlanFile(repoRoot, document());
    const { capture, command } = createHarness(repoRoot, { json: true });

    await runCommand(command, ['--plan-file', planFile]);

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      parentSlug: 'umbrella',
      children: expect.arrayContaining(['foundation', 'docs']),
    });
    expect(process.exitCode).toBe(0);
  });

  it('aborts non-interactive partial resume unless --resume confirms it', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-run-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const splitDocument = document();
    const planFile = await writePlanFile(repoRoot, splitDocument);
    const { command: initialCommand } = createHarness(repoRoot);

    await runCommand(initialCommand, ['--plan-file', planFile]);
    const parentRoot = join(repoRoot, '.oat', 'projects', 'shared', 'umbrella');
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

    const { command } = createHarness(repoRoot, {
      interactive: false,
      processEnv: { OAT_NON_INTERACTIVE: '1' },
    });
    await runCommand(command, ['--plan-file', planFile]);

    expect(process.exitCode).toBe(1);
    await expect(
      exists(join(repoRoot, '.oat', 'projects', 'shared', 'docs')),
    ).resolves.toBe(false);

    const { command: resumeCommand } = createHarness(repoRoot, {
      interactive: false,
      processEnv: { OAT_NON_INTERACTIVE: '1' },
    });
    await runCommand(resumeCommand, ['--plan-file', planFile, '--resume']);

    expect(process.exitCode).toBe(0);
    await expect(
      exists(join(repoRoot, '.oat', 'projects', 'shared', 'docs')),
    ).resolves.toBe(true);
  });
});
