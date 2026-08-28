import { execFileSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { createProjectPullCommand } from '@commands/project/pull/index';
import { defaultGitRunner } from '@commands/project/sync/git';
import {
  buildSyncTarget,
  pullSynced,
  pushSynced,
} from '@commands/project/sync/ref-sync';
import { CliError } from '@errors/cli-error';
import { createSyncedFixture } from '@test-support/synced-fixture';
import { Command } from 'commander';
import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import type { SplitPlanDocument } from '../../../../../projects/split/child-plan';
import { finalizeSplit } from '../../../../../projects/split/finalize';
import { resumeSplit } from '../../../../../projects/split/resume';
import { seedChildren } from '../../../../../projects/split/seed-children';
import { validateChildPlan } from '../../../../../projects/split/validation';
import { writeCoordinationParent } from '../../../../../projects/split/write-parent';
import { createProjectSplitRunCommand } from '../../run';

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

function readFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error('missing frontmatter');
  }
  return YAML.parse(match[1]) as Record<string, unknown>;
}

function documentFor(
  origin: SplitPlanDocument['origin'] = 'declared',
): SplitPlanDocument {
  return {
    origin,
    interactive: true,
    plan: {
      parentSlug: `umbrella-${origin.replaceAll('-', '_')}`,
      children: [
        {
          slug: `foundation-${origin.replaceAll('-', '_')}`,
          inheritedContext: 'Foundation context',
          knownDependencies: [],
          order: 1,
        },
        {
          slug: `api-${origin.replaceAll('-', '_')}`,
          inheritedContext: 'API context',
          knownDependencies: [`foundation-${origin.replaceAll('-', '_')}`],
          order: 2,
        },
        {
          slug: `docs-${origin.replaceAll('-', '_')}`,
          inheritedContext: 'Docs context',
          knownDependencies: [`foundation-${origin.replaceAll('-', '_')}`],
          order: 3,
        },
      ],
      foundationChild: `foundation-${origin.replaceAll('-', '_')}`,
      integrationSketch: 'Foundation ships before API and docs.',
      initialActiveChild: `foundation-${origin.replaceAll('-', '_')}`,
    },
  };
}

async function runSplit(
  repoRoot: string,
  document: SplitPlanDocument,
): Promise<void> {
  await writeCoordinationParent(document, { repoRoot });
  await seedChildren(document.plan, { repoRoot });
  await finalizeSplit(document.plan, { repoRoot });
}

function showOriginFile(originDir: string, slug: string, file: string): string {
  return execFileSync('git', ['show', `refs/oat/projects/${slug}:${file}`], {
    cwd: originDir,
    encoding: 'utf8',
  });
}

function expectPublishedSplit(
  originDir: string,
  document: SplitPlanDocument,
): void {
  const parentState = showOriginFile(
    originDir,
    document.plan.parentSlug,
    'state.md',
  );
  expect(parentState).toContain('oat_phase_status: complete');
  expect(readFrontmatter(parentState)['oat_children']).toEqual(
    document.plan.children
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((child) => child.slug),
  );
  for (const child of document.plan.children) {
    expect(showOriginFile(originDir, child.slug, 'state.md')).toContain(
      `oat_parent: ${document.plan.parentSlug}`,
    );
    expect(showOriginFile(originDir, child.slug, 'discovery.md')).toContain(
      `Split from coordination parent \`${document.plan.parentSlug}\``,
    );
  }
}

function createSplitCommand(
  repoRoot: string,
  push: typeof pushSynced,
): { capture: ReturnType<typeof createLoggerCapture>; program: Command } {
  const capture = createLoggerCapture();
  const run = createProjectSplitRunCommand({
    buildCommandContext: (options: GlobalOptions): CommandContext => ({
      scope: 'project',
      dryRun: false,
      verbose: options.verbose ?? false,
      json: options.json ?? false,
      cwd: repoRoot,
      home: '/home',
      interactive: false,
      logger: capture.logger,
    }),
    resolveProjectRoot: async () => repoRoot,
    resolveProjectsRoot: async () => '.oat/projects/shared',
    refreshDashboard: async () => undefined,
    pushSynced: push,
    processEnv: {},
  });
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .exitOverride();
  const project = new Command('project');
  const split = new Command('split');
  split.addCommand(run);
  project.addCommand(split);
  program.addCommand(project);
  return { capture, program };
}

function createPullCommand(repoRoot: string): {
  capture: ReturnType<typeof createLoggerCapture>;
  program: Command;
} {
  const capture = createLoggerCapture();
  const pull = createProjectPullCommand({
    buildCommandContext: (options: GlobalOptions): CommandContext => ({
      scope: 'project',
      dryRun: false,
      verbose: options.verbose ?? false,
      json: options.json ?? false,
      cwd: repoRoot,
      home: '/home',
      interactive: false,
      logger: capture.logger,
    }),
    resolveProjectRoot: async () => repoRoot,
    processEnv: {},
  });
  const program = new Command()
    .name('oat')
    .option('--json')
    .option('--verbose')
    .exitOverride();
  const project = new Command('project');
  project.addCommand(pull);
  program.addCommand(project);
  return { capture, program };
}

describe('oat-project-split integration fixtures', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('runs the declared happy path with a foundation child', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-integration-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const document = documentFor('declared');

    await runSplit(repoRoot, document);

    const parentRoot = join(
      repoRoot,
      '.oat',
      'projects',
      'shared',
      document.plan.parentSlug,
    );
    const parentState = readFrontmatter(
      await readFile(join(parentRoot, 'state.md'), 'utf8'),
    );
    expect(parentState['oat_kind']).toBe('coordination');
    expect(parentState['oat_phase']).toBe('decomposition');
    expect(parentState['oat_phase_status']).toBe('complete');
    const parentDiscovery = await readFile(
      join(parentRoot, 'discovery.md'),
      'utf8',
    );
    expect(parentDiscovery).toContain('## Split Rationale');
    expect(parentDiscovery).toContain('## Ordered Children');
    expect(parentDiscovery).toContain(
      `1. ${document.plan.foundationChild}: No description provided.`,
    );
    expect(parentDiscovery).toContain('Dependencies: None');
    expect(parentDiscovery).toContain(
      `Dependencies: ${document.plan.foundationChild}`,
    );
    expect(parentDiscovery).toContain('## Inherited Broad Context');
    expect(parentDiscovery).toContain('Foundation context');
    expect(parentDiscovery).toContain('API context');
    expect(parentDiscovery).toContain('Docs context');
    expect(parentDiscovery).toContain('## Shared Constraints');
    expect(parentDiscovery).toContain(
      `- Foundation child: ${document.plan.foundationChild}`,
    );
    expect(parentDiscovery).toContain(
      `- Initial active child: ${document.plan.initialActiveChild}`,
    );
    expect(parentDiscovery).toContain('## Integration Sketch');
    expect(parentDiscovery).toContain('Foundation ships before API and docs.');

    for (const child of document.plan.children) {
      await expect(
        exists(join(repoRoot, '.oat', 'projects', 'shared', child.slug)),
      ).resolves.toBe(true);
    }
    const localConfig = JSON.parse(
      await readFile(join(repoRoot, '.oat', 'config.local.json'), 'utf8'),
    ) as { activeProject: string };
    expect(localConfig.activeProject).toBe(
      `.oat/projects/shared/${document.plan.foundationChild}`,
    );
  });

  it('keeps the coordination-parent file invariant for produced parents', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-integration-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const document = documentFor('detected-mid-stream');

    await runSplit(repoRoot, document);

    const parentRoot = join(
      repoRoot,
      '.oat',
      'projects',
      'shared',
      document.plan.parentSlug,
    );
    for (const file of [
      'spec.md',
      'design.md',
      'plan.md',
      'implementation.md',
    ]) {
      await expect(exists(join(parentRoot, file))).resolves.toBe(false);
    }
  });

  it('persists detected and brainstorm origins in split-plan.json', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-integration-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);

    for (const origin of [
      'detected-mid-stream',
      'detected-convergence',
      'brainstorm-picker',
    ] as const) {
      const document = documentFor(origin);
      await writeCoordinationParent(document, { repoRoot });
      const persisted = JSON.parse(
        await readFile(
          join(
            repoRoot,
            '.oat',
            'projects',
            'shared',
            document.plan.parentSlug,
            'references',
            'split-plan.json',
          ),
          'utf8',
        ),
      ) as SplitPlanDocument;
      expect(persisted.origin).toBe(origin);
    }
  });

  it('resumes from durable split-plan data after an interrupted run', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'oat-split-integration-'));
    tempDirs.push(repoRoot);
    await seedTemplates(repoRoot);
    const document = documentFor('declared');

    await writeCoordinationParent(document, { repoRoot });
    await seedChildren(
      document.plan,
      {
        repoRoot,
      },
      new Set([document.plan.children[0]!.slug]),
    );

    await resumeSplit(
      join(repoRoot, '.oat', 'projects', 'shared', document.plan.parentSlug),
      { repoRoot },
      { confirmed: true },
    );

    for (const child of document.plan.children) {
      await expect(
        exists(join(repoRoot, '.oat', 'projects', 'shared', child.slug)),
      ).resolves.toBe(true);
    }
  });

  it('publishes a fresh synced split parent and every seeded child to origin', async () => {
    const fixture = await createSyncedFixture();
    tempDirs.push(fixture.rootDir);
    const document = documentFor('declared');
    const context = {
      repoRoot: fixture.cloneA,
      projectsRoot: '.oat/projects/shared',
      scope: 'synced' as const,
      scopeRoot: '.oat/projects/synced',
    };

    await writeCoordinationParent(document, context);
    await seedChildren(document.plan, context);
    await finalizeSplit(document.plan, context);

    expectPublishedSplit(fixture.originDir, document);
  }, 15_000);

  it('rejects an internally constructed child target aliased to a sibling before git mutation', async () => {
    const fixture = await createSyncedFixture();
    tempDirs.push(fixture.rootDir);
    const document = documentFor('declared');
    const context = {
      repoRoot: fixture.cloneA,
      projectsRoot: '.oat/projects/shared',
      scope: 'synced' as const,
      scopeRoot: '.oat/projects/synced',
    };
    await writeCoordinationParent(document, context);
    await seedChildren(document.plan, context);
    const aliasedSlug = document.plan.children[0]!.slug;
    const siblingSlug = document.plan.children[1]!.slug;
    const aliasedPath = join(
      fixture.cloneA,
      '.oat/projects/synced',
      aliasedSlug,
    );
    const siblingPath = join(
      fixture.cloneA,
      '.oat/projects/synced',
      siblingSlug,
    );
    const siblingHead = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: siblingPath,
      encoding: 'utf8',
    }).trim();
    const siblingStatus = execFileSync('git', ['status', '--porcelain'], {
      cwd: siblingPath,
      encoding: 'utf8',
    });
    await rm(aliasedPath, { recursive: true, force: true });
    await symlink(siblingPath, aliasedPath, 'dir');
    const calls: Array<{ args: string[]; cwd: string }> = [];
    const recordingRunner: typeof defaultGitRunner = {
      async run(args, options) {
        calls.push({ args: [...args], cwd: options.cwd });
        if (options.cwd === aliasedPath) {
          throw new Error('git must not run through the aliased child target');
        }
        return defaultGitRunner.run(args, options);
      },
    };

    await expect(
      finalizeSplit(document.plan, { ...context, gitRunner: recordingRunner }),
    ).rejects.toMatchObject({
      message: expect.stringContaining('canonical direct child'),
    });
    expect(calls.some((call) => call.cwd === aliasedPath)).toBe(false);
    expect(
      execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: siblingPath,
        encoding: 'utf8',
      }).trim(),
    ).toBe(siblingHead);
    expect(
      execFileSync('git', ['status', '--porcelain'], {
        cwd: siblingPath,
        encoding: 'utf8',
      }),
    ).toBe(siblingStatus);
  });

  it('publishes final parent and child seeds after a missing-child synced resume', async () => {
    const fixture = await createSyncedFixture();
    tempDirs.push(fixture.rootDir);
    const document = documentFor('declared');
    const context = {
      repoRoot: fixture.cloneA,
      projectsRoot: '.oat/projects/shared',
      scope: 'synced' as const,
      scopeRoot: '.oat/projects/synced',
    };

    await writeCoordinationParent(document, context);
    await seedChildren(
      document.plan,
      context,
      new Set([document.plan.children[0]!.slug]),
    );
    await resumeSplit(
      join(fixture.cloneA, '.oat/projects/synced', document.plan.parentSlug),
      {
        repoRoot: fixture.cloneA,
        projectsRoot: '.oat/projects/shared',
      },
      { confirmed: true },
    );

    expectPublishedSplit(fixture.originDir, document);
  });

  it('rolls back a failed terminal marker and republishes every ref through normal resume', async () => {
    const fixture = await createSyncedFixture();
    tempDirs.push(fixture.rootDir);
    const document = documentFor('declared');
    const planFile = join(fixture.cloneA, 'split-plan-input.json');
    await writeFile(planFile, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    await mkdir(join(fixture.cloneA, '.oat'), { recursive: true });
    await writeFile(
      join(fixture.cloneA, '.oat/config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/synced/source' })}\n`,
      'utf8',
    );
    let failPublication = true;
    let publicationCalls = 0;
    const injectedPush: typeof pushSynced = async (target, git, options) => {
      publicationCalls += 1;
      if (failPublication && publicationCalls === 3) {
        throw new CliError('injected origin transport failure', 2);
      }
      return pushSynced(target, git, options);
    };
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;

    const first = createSplitCommand(fixture.cloneA, injectedPush);
    await first.program.parseAsync(
      ['project', 'split', 'run', '--plan-file', planFile],
      { from: 'user' },
    );

    expect(first.capture.error.join('\n')).toContain(
      'injected origin transport failure',
    );
    expect(process.exitCode).toBe(2);
    const parentStatePath = join(
      fixture.cloneA,
      '.oat/projects/synced',
      document.plan.parentSlug,
      'state.md',
    );
    expect(
      readFrontmatter(await readFile(parentStatePath, 'utf8')),
    ).toMatchObject({ oat_phase_status: 'in_progress' });

    failPublication = false;
    publicationCalls = 0;
    process.exitCode = undefined;
    const resumed = createSplitCommand(fixture.cloneA, injectedPush);
    await resumed.program.parseAsync(
      ['project', 'split', 'run', '--plan-file', planFile, '--resume'],
      { from: 'user' },
    );

    expect(process.exitCode).toBe(0);
    expect(publicationCalls).toBe(1 + document.plan.children.length);
    expectPublishedSplit(fixture.originDir, document);
    process.exitCode = previousExitCode;
  });

  it('guides and safely resumes a real mid-publication child rebase conflict', async () => {
    const fixture = await createSyncedFixture({ secondClone: true });
    tempDirs.push(fixture.rootDir);
    const document = documentFor('declared');
    const planFile = join(fixture.cloneA, 'split-plan-conflict.json');
    await writeFile(planFile, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    await mkdir(join(fixture.cloneA, '.oat'), { recursive: true });
    await writeFile(
      join(fixture.cloneA, '.oat/config.local.json'),
      `${JSON.stringify({ version: 1, activeProject: '.oat/projects/synced/source' })}\n`,
      'utf8',
    );

    let publicationCalls = 0;
    let injectConflict = true;
    let seededState = '';
    let conflictedTargetPath = '';
    const conflictingPush: typeof pushSynced = async (
      target,
      gitRunner,
      options,
    ) => {
      publicationCalls += 1;
      if (injectConflict && publicationCalls === 2) {
        conflictedTargetPath = target.projectPath;
        seededState = await readFile(
          join(target.projectPath, 'state.md'),
          'utf8',
        );
        const competingTarget = buildSyncTarget(
          fixture.cloneB!,
          '.oat/projects/shared',
          target.slug,
        );
        await pullSynced(competingTarget, defaultGitRunner);
        const competingStatePath = join(
          competingTarget.projectPath,
          'state.md',
        );
        const competingState = await readFile(competingStatePath, 'utf8');
        await writeFile(
          competingStatePath,
          competingState.replace(
            'oat_parent: null',
            'oat_parent: concurrent-parent',
          ),
          'utf8',
        );
        await pushSynced(competingTarget, defaultGitRunner, {
          message: 'concurrent child state',
        });
      }
      return pushSynced(target, gitRunner, options);
    };
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;

    const first = createSplitCommand(fixture.cloneA, conflictingPush);
    await first.program.parseAsync(
      ['project', 'split', 'run', '--plan-file', planFile],
      { from: 'user' },
    );

    const targetArg = `'${conflictedTargetPath}'`;
    const firstError = first.capture.error.join('\n');
    expect(firstError).toContain(`oat project pull ${targetArg} --continue`);
    expect(firstError).toContain(`oat project pull ${targetArg} --abort`);
    expect(process.exitCode).toBe(1);
    expect(
      execFileSync(
        'git',
        ['-C', conflictedTargetPath, 'rev-parse', '--verify', 'REBASE_HEAD'],
        { encoding: 'utf8' },
      ).trim(),
    ).toMatch(/^[0-9a-f]{40}$/);
    const parentStatePath = join(
      fixture.cloneA,
      '.oat/projects/synced',
      document.plan.parentSlug,
      'state.md',
    );
    expect(
      readFrontmatter(await readFile(parentStatePath, 'utf8')),
    ).toMatchObject({ oat_phase_status: 'in_progress' });

    injectConflict = false;
    publicationCalls = 0;
    process.exitCode = undefined;
    const blockedResume = createSplitCommand(fixture.cloneA, conflictingPush);
    await blockedResume.program.parseAsync(
      ['project', 'split', 'run', '--plan-file', planFile, '--resume'],
      { from: 'user' },
    );

    const resumeError = blockedResume.capture.error.join('\n');
    expect(resumeError).toContain(`oat project pull ${targetArg} --continue`);
    expect(resumeError).toContain(`oat project pull ${targetArg} --abort`);
    expect(publicationCalls).toBe(0);
    expect(process.exitCode).toBe(1);

    await writeFile(
      join(conflictedTargetPath, 'state.md'),
      seededState,
      'utf8',
    );
    execFileSync('git', ['-C', conflictedTargetPath, 'add', 'state.md']);
    process.exitCode = undefined;
    const recovery = createPullCommand(fixture.cloneA);
    await recovery.program.parseAsync(
      ['project', 'pull', conflictedTargetPath, '--continue'],
      { from: 'user' },
    );
    expect(recovery.capture.info.join('\n')).toContain('Pull updated');
    expect(process.exitCode).toBe(0);

    process.exitCode = undefined;
    const resumed = createSplitCommand(fixture.cloneA, pushSynced);
    await resumed.program.parseAsync(
      ['project', 'split', 'run', '--plan-file', planFile, '--resume'],
      { from: 'user' },
    );

    expect(process.exitCode).toBe(0);
    expectPublishedSplit(fixture.originDir, document);
    process.exitCode = previousExitCode;
  }, 15_000);

  it('reports post-manual-mutation validation errors', () => {
    const document = documentFor('declared');
    const mutated = {
      ...document.plan,
      children: document.plan.children.map((child) =>
        child.slug === document.plan.children[1]!.slug
          ? { ...child, knownDependencies: ['missing-sibling'] }
          : child,
      ),
    };

    const result = validateChildPlan(mutated, new Set());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code)).toContain(
        'unknown-dependency',
      );
    }
  });
});
