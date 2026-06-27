import { appendFile, readFile, readdir, stat } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import { confirmAction } from '@commands/shared/shared.prompts';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { generateStateDashboard } from '@commands/state/generate';
import { readOatLocalConfig } from '@config/oat-config';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import type { SplitPlanDocument } from '../../../projects/split/child-plan';
import { validateSplitPlanDocumentShape } from '../../../projects/split/document-validation';
import { finalizeSplit } from '../../../projects/split/finalize';
import {
  continueSplitResume,
  detectPartialSplit,
  type PartialSplit,
  SplitResumeError,
} from '../../../projects/split/resume';
import { seedChildren } from '../../../projects/split/seed-children';
import { validateChildPlan } from '../../../projects/split/validation';
import { writeCoordinationParent } from '../../../projects/split/write-parent';

interface RunSplitOptions {
  planFile: string;
  nonInteractive?: boolean;
  resume?: boolean;
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
  confirmAction: typeof confirmAction;
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
  confirmAction,
  processEnv: process.env,
};

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

function isEffectivelyNonInteractive(
  options: RunSplitOptions,
  context: CommandContext,
  processEnv: NodeJS.ProcessEnv,
): boolean {
  return (
    options.nonInteractive === true ||
    context.interactive === false ||
    processEnv.OAT_NON_INTERACTIVE === '1'
  );
}

function formatResumePreview(partial: PartialSplit): string[] {
  return [
    'Recovered partial split plan:',
    `Parent: ${partial.parentProjectPath}`,
    `Children: ${partial.plan.children.map((child) => child.slug).join(', ')}`,
    `Missing children: ${partial.missingChildren.length > 0 ? partial.missingChildren.join(', ') : 'none'}`,
    `Dependencies: ${partial.plan.children
      .map((child) => {
        const dependencies =
          child.knownDependencies.length > 0
            ? child.knownDependencies.join(', ')
            : 'none';
        return `${child.slug} -> ${dependencies}`;
      })
      .join('; ')}`,
    `Active child: ${partial.plan.initialActiveChild}`,
  ];
}

function isDetectedOrigin(document: SplitPlanDocument): boolean {
  return (
    document.origin === 'detected-mid-stream' ||
    document.origin === 'detected-convergence'
  );
}

function normalizeProjectPath(path: string): string {
  return path.split('\\').join('/');
}

function toRepoRelativeProjectPath(
  repoRoot: string,
  projectPath: string,
): string {
  const absoluteProjectPath = isAbsolute(projectPath)
    ? projectPath
    : join(repoRoot, projectPath);
  return normalizeProjectPath(relative(repoRoot, absoluteProjectPath));
}

async function isActiveDetectedParentProject(
  repoRoot: string,
  parentPath: string,
  document: SplitPlanDocument,
): Promise<boolean> {
  if (!isDetectedOrigin(document)) {
    return false;
  }

  const localConfig = await readOatLocalConfig(repoRoot);
  if (!localConfig.activeProject) {
    return false;
  }

  return (
    toRepoRelativeProjectPath(repoRoot, localConfig.activeProject) ===
    toRepoRelativeProjectPath(repoRoot, parentPath)
  );
}

async function runFreshSplit(
  document: SplitPlanDocument,
  repoRoot: string,
  projectsRoot: string,
  dependencies: Pick<RunSplitDependencies, 'readdir'>,
  options: { allowExistingParent?: boolean } = {},
): Promise<void> {
  const slugs = await existingProjectSlugs(
    repoRoot,
    projectsRoot,
    dependencies,
  );
  if (options.allowExistingParent) {
    slugs.delete(document.plan.parentSlug);
  }
  const validation = validateChildPlan(document.plan, slugs);
  if (!validation.ok) {
    throw new Error(
      `Split plan validation failed: ${validation.errors
        .map((error) => error.message)
        .join('; ')}`,
    );
  }
  await writeCoordinationParent(document, { repoRoot, projectsRoot });
  await seedChildren(document.plan, { repoRoot, projectsRoot });
  await finalizeSplit(document.plan, { repoRoot, projectsRoot });
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
    .option(
      '--resume',
      'Confirm resuming an existing partial split without prompting',
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
        const documentShape = validateSplitPlanDocumentShape(parsed);
        if (!documentShape.ok) {
          throw new Error(
            `Invalid SplitPlanDocument: ${documentShape.errors
              .map((error) => error.message)
              .join('; ')}`,
          );
        }
        const document = documentShape.document;

        if (
          isEffectivelyNonInteractive(
            options,
            context,
            dependencies.processEnv,
          ) &&
          (document.origin === 'detected-mid-stream' ||
            document.origin === 'detected-convergence')
        ) {
          await recordDetectedRecommendation(repoRoot, document, dependencies);
          context.logger.error(
            'Detected split requires interactive confirmation; recommendation recorded.',
          );
          process.exitCode = 1;
          return;
        }

        const parentPath = join(projectsRoot, document.plan.parentSlug)
          .split('\\')
          .join('/');
        const absoluteParentPath = isAbsolute(parentPath)
          ? parentPath
          : join(repoRoot, parentPath);
        if (await exists(absoluteParentPath, dependencies)) {
          let partial: PartialSplit | null = null;
          let convertActiveDetectedParent = false;
          try {
            partial = await detectPartialSplit(parentPath, {
              repoRoot,
              projectsRoot,
            });
          } catch (error) {
            if (
              error instanceof SplitResumeError &&
              error.message === 'Split resume requires a coordination parent' &&
              (await isActiveDetectedParentProject(
                repoRoot,
                parentPath,
                document,
              ))
            ) {
              convertActiveDetectedParent = true;
            } else {
              throw error;
            }
          }

          if (convertActiveDetectedParent) {
            await runFreshSplit(
              document,
              repoRoot,
              projectsRoot,
              dependencies,
              {
                allowExistingParent: true,
              },
            );
            await dependencies.refreshDashboard({ repoRoot });
            context.logger.info('Split completed.');
            if (context.json) {
              context.logger.json({
                status: 'ok',
                parentSlug: document.plan.parentSlug,
                children: document.plan.children.map((child) => child.slug),
              });
            }
            process.exitCode = 0;
            return;
          }

          if (!partial) {
            throw new SplitResumeError(
              'Cannot resume split without recovered partial state.',
            );
          }

          for (const line of formatResumePreview(partial)) {
            context.logger.info(line);
          }
          const effectiveNonInteractive = isEffectivelyNonInteractive(
            options,
            context,
            dependencies.processEnv,
          );
          if (!options.resume) {
            if (effectiveNonInteractive) {
              throw new SplitResumeError(
                'Partial split detected. Re-run with --resume to confirm resuming without an interactive prompt.',
              );
            }
            const confirmed = await dependencies.confirmAction(
              'Resume this split from the recovered plan?',
              { interactive: context.interactive },
            );
            if (!confirmed) {
              throw new SplitResumeError('Split resume cancelled.');
            }
          }
          await continueSplitResume(partial, { repoRoot, projectsRoot });
        } else {
          await runFreshSplit(document, repoRoot, projectsRoot, dependencies);
        }

        await dependencies.refreshDashboard({ repoRoot });
        context.logger.info('Split completed.');
        if (context.json) {
          context.logger.json({
            status: 'ok',
            parentSlug: document.plan.parentSlug,
            children: document.plan.children.map((child) => child.slug),
          });
        }
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
