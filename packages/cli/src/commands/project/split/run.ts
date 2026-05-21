import { appendFile, readFile, readdir, stat } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { generateStateDashboard } from '@commands/state/generate';
import { readOatLocalConfig } from '@config/oat-config';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import type { SplitPlanDocument } from '../../../projects/split/child-plan';
import { finalizeSplit } from '../../../projects/split/finalize';
import { resumeSplit, SplitResumeError } from '../../../projects/split/resume';
import { seedChildren } from '../../../projects/split/seed-children';
import { validateChildPlan } from '../../../projects/split/validation';
import { writeCoordinationParent } from '../../../projects/split/write-parent';

interface RunSplitOptions {
  planFile: string;
  nonInteractive?: boolean;
}

interface RunSplitDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveProjectsRoot: (
    repoRoot: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<string>;
  readFile: typeof readFile;
  readdir: typeof readdir;
  stat: typeof stat;
  appendFile: typeof appendFile;
  refreshDashboard: (options: { repoRoot: string }) => Promise<void>;
  processEnv: NodeJS.ProcessEnv;
}

const DEFAULT_DEPENDENCIES: RunSplitDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveProjectsRoot,
  readFile,
  readdir,
  stat,
  appendFile,
  refreshDashboard: async (options) => {
    await generateStateDashboard(options);
  },
  processEnv: process.env,
};

function isDocument(value: unknown): value is SplitPlanDocument {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const document = value as Partial<SplitPlanDocument>;
  return (
    typeof document.origin === 'string' &&
    typeof document.interactive === 'boolean' &&
    Boolean(document.plan) &&
    typeof document.plan?.parentSlug === 'string' &&
    Array.isArray(document.plan?.children) &&
    typeof document.plan?.initialActiveChild === 'string'
  );
}

async function exists(
  path: string,
  dependencies: Pick<RunSplitDependencies, 'stat'>,
): Promise<boolean> {
  try {
    await dependencies.stat(path);
    return true;
  } catch {
    return false;
  }
}

async function existingProjectSlugs(
  repoRoot: string,
  projectsRoot: string,
  dependencies: Pick<RunSplitDependencies, 'readdir'>,
): Promise<Set<string>> {
  const absoluteProjectsRoot = isAbsolute(projectsRoot)
    ? projectsRoot
    : join(repoRoot, projectsRoot);
  try {
    const entries = await dependencies.readdir(absoluteProjectsRoot, {
      withFileTypes: true,
    });
    return new Set(
      entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
    );
  } catch {
    return new Set();
  }
}

async function recordDetectedRecommendation(
  repoRoot: string,
  document: SplitPlanDocument,
  dependencies: Pick<RunSplitDependencies, 'appendFile'>,
): Promise<void> {
  const localConfig = await readOatLocalConfig(repoRoot);
  if (!localConfig.activeProject) {
    throw new Error(
      'Cannot record detected split recommendation without an active project',
    );
  }
  const discoveryPath = join(
    repoRoot,
    localConfig.activeProject,
    'discovery.md',
  );
  await dependencies.appendFile(
    discoveryPath,
    [
      '',
      '## Detected Split Recommendation',
      '',
      `Origin: ${document.origin}`,
      `Proposed parent: ${document.plan.parentSlug}`,
      `Proposed children: ${document.plan.children
        .map((child) => child.slug)
        .join(', ')}`,
      '',
    ].join('\n'),
    'utf8',
  );
}

export function createProjectSplitRunCommand(
  overrides: Partial<RunSplitDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };

  return new Command('run')
    .description('Run an oat-project-split SplitPlanDocument end to end')
    .requiredOption('--plan-file <path>', 'Path to split-plan.json')
    .option(
      '--non-interactive',
      'Fail fast for detected split origins instead of writing projects',
    )
    .action(async (options: RunSplitOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );

      try {
        const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
        const projectsRoot = await dependencies.resolveProjectsRoot(
          repoRoot,
          dependencies.processEnv,
        );
        const raw = await dependencies.readFile(options.planFile, 'utf8');
        const parsed: unknown = JSON.parse(raw);
        if (!isDocument(parsed)) {
          throw new Error('Invalid SplitPlanDocument');
        }

        if (
          options.nonInteractive &&
          (parsed.origin === 'detected-mid-stream' ||
            parsed.origin === 'detected-convergence')
        ) {
          await recordDetectedRecommendation(repoRoot, parsed, dependencies);
          context.logger.error(
            'Detected split requires interactive confirmation; recommendation recorded.',
          );
          process.exitCode = 1;
          return;
        }

        const parentPath = join(projectsRoot, parsed.plan.parentSlug)
          .split('\\')
          .join('/');
        const absoluteParentPath = isAbsolute(parentPath)
          ? parentPath
          : join(repoRoot, parentPath);
        if (await exists(absoluteParentPath, dependencies)) {
          await resumeSplit(parentPath, { repoRoot, projectsRoot });
        } else {
          const slugs = await existingProjectSlugs(
            repoRoot,
            projectsRoot,
            dependencies,
          );
          const validation = validateChildPlan(parsed.plan, slugs);
          if (!validation.ok) {
            throw new Error(
              `Split plan validation failed: ${validation.errors
                .map((error) => error.message)
                .join('; ')}`,
            );
          }
          await writeCoordinationParent(parsed, { repoRoot, projectsRoot });
          await seedChildren(parsed.plan, { repoRoot, projectsRoot });
          await finalizeSplit(parsed.plan, { repoRoot, projectsRoot });
        }

        await dependencies.refreshDashboard({ repoRoot });
        context.logger.info('Split completed.');
        process.exitCode = 0;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        context.logger.error(message);
        if (error instanceof SplitResumeError) {
          process.exitCode = 1;
          return;
        }
        process.exitCode = 1;
      }
    });
}
