import { isAbsolute, join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { parseFrontmatterField } from '@commands/shared/frontmatter';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveProjectRoot } from '@fs/paths';
import {
  listProjects,
  type ProjectSummary,
} from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';

interface ProjectListDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveProjectsRoot: (
    repoRoot: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<string>;
  listProjects: (projectsRoot: string) => Promise<ProjectSummary[]>;
  readProjectMetadata: (projectPath: string) => Promise<ProjectListMetadata>;
  processEnv: NodeJS.ProcessEnv;
}

interface ProjectListMetadata {
  kind: string;
  phase: string;
  phaseStatus: string;
}

interface ProjectListOptions {
  includeCoordination?: boolean;
}

const DEFAULT_DEPENDENCIES: ProjectListDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveProjectsRoot,
  listProjects,
  readProjectMetadata,
  processEnv: process.env,
};

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

function formatProjectTable(projects: ProjectSummary[]): string[] {
  if (projects.length === 0) {
    return ['No tracked projects found.'];
  }

  const rows = projects.map((project) => ({
    name: project.name,
    phase: `${project.phase} (${project.phaseStatus})`,
    progress: `${project.progress.completed}/${project.progress.total}`,
    recommendation: project.recommendation.skill,
  }));

  const widths = {
    name: Math.max('NAME'.length, ...rows.map((row) => row.name.length)),
    phase: Math.max('PHASE'.length, ...rows.map((row) => row.phase.length)),
    progress: Math.max(
      'PROGRESS'.length,
      ...rows.map((row) => row.progress.length),
    ),
    recommendation: Math.max(
      'RECOMMENDATION'.length,
      ...rows.map((row) => row.recommendation.length),
    ),
  };

  const header = [
    'NAME'.padEnd(widths.name),
    'PHASE'.padEnd(widths.phase),
    'PROGRESS'.padEnd(widths.progress),
    'RECOMMENDATION'.padEnd(widths.recommendation),
  ].join('  ');

  const divider = [
    '-'.repeat(widths.name),
    '-'.repeat(widths.phase),
    '-'.repeat(widths.progress),
    '-'.repeat(widths.recommendation),
  ].join('  ');

  const lines = rows.map((row) =>
    [
      row.name.padEnd(widths.name),
      row.phase.padEnd(widths.phase),
      row.progress.padEnd(widths.progress),
      row.recommendation.padEnd(widths.recommendation),
    ].join('  '),
  );

  return [header, divider, ...lines];
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
    const absoluteProjectsRoot = isAbsolute(projectsRoot)
      ? projectsRoot
      : join(repoRoot, projectsRoot);
    const projects = await filterProjectsForList(
      await dependencies.listProjects(absoluteProjectsRoot),
      absoluteProjectsRoot,
      options.includeCoordination ?? false,
      dependencies,
    );

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
    process.exitCode = 1;
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
    .action(async (options: ProjectListOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runProjectList(context, dependencies, options);
    });
}
