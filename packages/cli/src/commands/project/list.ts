import { stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import { listSyncedRecords } from '@commands/project/sync/record';
import { parseFrontmatterField } from '@commands/shared/frontmatter';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
  PROJECT_SCOPES,
  resolveScopeRoot,
  type ProjectScope,
} from '@commands/shared/project-scope';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';
import {
  listProjects,
  type ProjectListRow,
  type ProjectSummary,
} from '@open-agent-toolkit/control-plane';
import { Command, Option } from 'commander';

interface ProjectListDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveProjectsRoot: (
    repoRoot: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<string>;
  listProjects: (projectsRoot: string) => Promise<ProjectSummary[]>;
  listSyncedRecords: typeof listSyncedRecords;
  directoryExists: (path: string) => Promise<boolean>;
  readProjectMetadata: (projectPath: string) => Promise<ProjectListMetadata>;
  processEnv: NodeJS.ProcessEnv;
  gitRunner: GitRunner;
}

interface ProjectListMetadata {
  kind: string;
  phase: string;
  phaseStatus: string;
}

interface ProjectListOptions {
  includeCoordination?: boolean;
  scope?: ProjectScope;
  remote?: boolean;
}

const DEFAULT_DEPENDENCIES: ProjectListDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveProjectsRoot,
  listProjects,
  listSyncedRecords,
  directoryExists,
  readProjectMetadata,
  processEnv: process.env,
  gitRunner: defaultGitRunner,
};

async function directoryExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function readProjectMetadata(
  projectPath: string,
): Promise<ProjectListMetadata> {
  const stateFile = join(projectPath, 'state.md');
  const [kind, phase, phaseStatus] = await Promise.all([
    parseFrontmatterField(stateFile, 'oat_kind'),
    parseFrontmatterField(stateFile, 'oat_phase'),
    parseFrontmatterField(stateFile, 'oat_phase_status'),
  ]);

  return {
    kind: kind || 'implementation',
    phase: phase || 'discovery',
    phaseStatus: phaseStatus || 'in_progress',
  };
}

function isTerminalCoordinationProject(metadata: ProjectListMetadata): boolean {
  return (
    metadata.kind === 'coordination' &&
    metadata.phase === 'decomposition' &&
    metadata.phaseStatus === 'complete'
  );
}

async function filterProjectsForList(
  projects: ProjectSummary[],
  projectsRoot: string,
  includeCoordination: boolean,
  dependencies: ProjectListDependencies,
): Promise<ProjectSummary[]> {
  if (includeCoordination) return projects;

  const filtered: ProjectSummary[] = [];
  for (const project of projects) {
    const metadata = await dependencies.readProjectMetadata(
      join(projectsRoot, project.name),
    );
    if (!isTerminalCoordinationProject(metadata)) {
      filtered.push(project);
    }
  }
  return filtered;
}

function formatProjectTable(projects: ProjectListRow[]): string[] {
  if (projects.length === 0) {
    return ['No tracked projects found.'];
  }

  const rows = projects.map((project) => ({
    name: project.name,
    scope: project.scope,
    phase:
      project.phase === null
        ? '—'
        : `${project.phase} (${project.phaseStatus})`,
    progress:
      project.progress === null
        ? '—'
        : `${project.progress.completed}/${project.progress.total}`,
    recommendation: project.recommendation.skill,
    hint:
      project.kind === 'materialized'
        ? '—'
        : `oat project pull ${project.name}`,
  }));

  const widths = {
    name: Math.max('NAME'.length, ...rows.map((row) => row.name.length)),
    scope: Math.max('SCOPE'.length, ...rows.map((row) => row.scope.length)),
    phase: Math.max('PHASE'.length, ...rows.map((row) => row.phase.length)),
    progress: Math.max(
      'PROGRESS'.length,
      ...rows.map((row) => row.progress.length),
    ),
    recommendation: Math.max(
      'RECOMMENDATION'.length,
      ...rows.map((row) => row.recommendation.length),
    ),
    hint: Math.max('HINT'.length, ...rows.map((row) => row.hint.length)),
  };

  const header = [
    'NAME'.padEnd(widths.name),
    'SCOPE'.padEnd(widths.scope),
    'PHASE'.padEnd(widths.phase),
    'PROGRESS'.padEnd(widths.progress),
    'RECOMMENDATION'.padEnd(widths.recommendation),
    'HINT'.padEnd(widths.hint),
  ].join('  ');

  const divider = [
    '-'.repeat(widths.name),
    '-'.repeat(widths.scope),
    '-'.repeat(widths.phase),
    '-'.repeat(widths.progress),
    '-'.repeat(widths.recommendation),
    '-'.repeat(widths.hint),
  ].join('  ');

  const lines = rows.map((row) =>
    [
      row.name.padEnd(widths.name),
      row.scope.padEnd(widths.scope),
      row.phase.padEnd(widths.phase),
      row.progress.padEnd(widths.progress),
      row.recommendation.padEnd(widths.recommendation),
      row.hint.padEnd(widths.hint),
    ].join('  '),
  );

  return [header, divider, ...lines];
}

function displayPath(repoRoot: string, absolutePath: string): string {
  return relative(repoRoot, absolutePath).split(sep).join('/');
}

async function collectProjectRows(
  repoRoot: string,
  projectsRoot: string,
  options: ProjectListOptions,
  dependencies: ProjectListDependencies,
): Promise<ProjectListRow[]> {
  const configuredSharedRoot = isAbsolute(projectsRoot)
    ? resolve(projectsRoot)
    : resolve(repoRoot, projectsRoot);
  const roots: Array<{ scope: ProjectScope; path: string }> = [
    { scope: 'shared', path: configuredSharedRoot },
    {
      scope: 'synced',
      path: resolveScopeRoot(repoRoot, projectsRoot, 'synced'),
    },
    {
      scope: 'local',
      path: resolveScopeRoot(repoRoot, projectsRoot, 'local'),
    },
  ];
  const selected = options.scope
    ? roots.filter((entry) => entry.scope === options.scope)
    : roots;
  const rows: ProjectListRow[] = [];
  for (const root of selected) {
    if (await dependencies.directoryExists(root.path)) {
      const projects = await filterProjectsForList(
        await dependencies.listProjects(root.path),
        root.path,
        options.includeCoordination ?? false,
        dependencies,
      );
      rows.push(
        ...projects.map(
          (project): ProjectListRow => ({
            ...project,
            kind: 'materialized',
            scope: root.scope,
            checkout: 'present',
          }),
        ),
      );
    }
    if (root.scope === 'synced') {
      const materialized = new Set(
        rows
          .filter(
            (row) => row.scope === 'synced' && row.kind === 'materialized',
          )
          .map((row) => row.name),
      );
      for (const record of await dependencies.listSyncedRecords(root.path)) {
        if (!materialized.has(record.slug)) {
          rows.push({
            kind: 'recorded-absent',
            name: record.slug,
            path: displayPath(repoRoot, join(root.path, record.slug)),
            scope: 'synced',
            checkout: 'absent',
            phase: null,
            phaseStatus: null,
            workflowMode: null,
            lifecycle: null,
            progress: null,
            recommendation: {
              skill: 'oat project pull',
              reason: 'checkout absent',
            },
          });
        }
      }
    }
  }
  return rows.sort(
    (left, right) =>
      left.name.localeCompare(right.name) ||
      left.scope.localeCompare(right.scope),
  );
}

async function appendRemoteRows(
  rows: ProjectListRow[],
  repoRoot: string,
  context: CommandContext,
  dependencies: ProjectListDependencies,
): Promise<ProjectListRow[]> {
  const remote = await dependencies.gitRunner.run(
    ['ls-remote', 'origin', 'refs/oat/projects/*'],
    { cwd: repoRoot, allowFailure: true },
  );
  if (remote.code !== 0) {
    context.logger.warn(
      `Warning: unable to list remote synced projects: ${remote.stderr || remote.stdout || 'origin is unreachable'}`,
    );
    return rows;
  }
  const localSlugs = new Set(
    rows.filter((row) => row.scope === 'synced').map((row) => row.name),
  );
  for (const line of remote.stdout.split('\n')) {
    const [, ref] = line.trim().split(/\s+/);
    if (!ref?.startsWith('refs/oat/projects/')) continue;
    const name = ref.slice('refs/oat/projects/'.length);
    if (!name || localSlugs.has(name)) continue;
    rows.push({
      kind: 'remote',
      name,
      scope: 'synced',
      origin: 'remote',
      checkout: 'absent',
      ref,
      phase: null,
      phaseStatus: null,
      workflowMode: null,
      lifecycle: null,
      progress: null,
      recommendation: {
        skill: 'oat project pull',
        reason: 'not adopted on this branch',
      },
    });
  }
  return rows.sort(
    (left, right) =>
      left.name.localeCompare(right.name) ||
      left.scope.localeCompare(right.scope),
  );
}

async function runProjectList(
  context: CommandContext,
  dependencies: ProjectListDependencies,
  options: ProjectListOptions,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const projectsRoot = await dependencies.resolveProjectsRoot(
      repoRoot,
      dependencies.processEnv,
    );
    let projects = await collectProjectRows(
      repoRoot,
      projectsRoot,
      options,
      dependencies,
    );
    if (options.remote && (!options.scope || options.scope === 'synced')) {
      projects = await appendRemoteRows(
        projects,
        repoRoot,
        context,
        dependencies,
      );
    }

    if (context.json) {
      context.logger.json({ status: 'ok', projects });
    } else {
      for (const line of formatProjectTable(projects)) {
        context.logger.info(line);
      }
    }

    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = error instanceof CliError ? error.exitCode : 2;
  }
}

export function createProjectListCommand(
  overrides: Partial<ProjectListDependencies> = {},
): Command {
  const dependencies: ProjectListDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('list')
    .description('List tracked OAT projects')
    .option(
      '--include-coordination',
      'Include completed coordination parent projects',
    )
    .addOption(
      new Option('--scope <scope>', 'Filter by project scope').choices(
        PROJECT_SCOPES,
      ),
    )
    .option('--remote', 'Include synced projects discovered on origin')
    .action(async (options: ProjectListOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runProjectList(context, dependencies, options);
    });
}
