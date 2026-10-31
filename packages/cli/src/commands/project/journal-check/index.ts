import { readFile as defaultReadFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { journalRewrites } from '@commands/project/delivery/evidence';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  resolveActiveProject,
  type ActiveProjectResolution,
} from '@config/oat-config';
import { CliError } from '@errors/cli-error';
import { dirExists, fileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import {
  normalizePhaseId,
  parseTaskProgress,
  readFrontmatterMetadata,
} from '@open-agent-toolkit/control-plane';
import { Command } from 'commander';

import { evaluateJournal } from './evaluator';
import {
  JOURNAL_CHECK_BOUNDARIES,
  type JournalCheckBoundary,
  type JournalCheckReason,
  type JournalCheckResult,
} from './types';

export { evaluateJournal } from './evaluator';
export type {
  JournalCheckBoundary,
  JournalCheckReason,
  JournalCheckResult,
} from './types';

export interface JournalCheckFiles {
  planContent: string;
  journalContent: string;
  stateContent: string;
}

export interface JournalCheckDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveActiveProject: (repoRoot: string) => Promise<ActiveProjectResolution>;
  readFile: (path: string, encoding: 'utf8') => Promise<string>;
  dirExists: (path: string) => Promise<boolean>;
  fileExists: (path: string) => Promise<boolean>;
  git: GitRunner;
}

const DEFAULT_DEPENDENCIES: JournalCheckDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveActiveProject,
  readFile: (path, encoding) => defaultReadFile(path, encoding),
  dirExists,
  fileExists,
  git: defaultGitRunner,
};

/**
 * Read the three inputs the evaluator needs. A missing journal or plan is a
 * command error, never an empty file: an unreadable input must not read as a
 * valid journal.
 */
export async function readJournalCheckFiles(
  projectDir: string,
  dependencies: Pick<JournalCheckDependencies, 'readFile' | 'fileExists'>,
): Promise<JournalCheckFiles> {
  const read = async (name: string): Promise<string> => {
    const path = join(projectDir, name);
    if (!(await dependencies.fileExists(path))) {
      throw new CliError(`Project ${name} not found: ${path}`, 1);
    }
    return dependencies.readFile(path, 'utf8');
  };
  return {
    planContent: await read('plan.md'),
    journalContent: await read('implementation.md'),
    stateContent: await read('state.md'),
  };
}

/**
 * Parse `--scope pNN[,pNN]` into normalized phase ids, each of which must name
 * a phase the plan declares.
 */
export function parseJournalScope(
  raw: string,
  planContent: string,
  workflowMode: 'task' | 'phase-unit',
): string[] {
  const tokens = raw
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  if (tokens.length === 0) {
    throw new CliError('--scope needs at least one phase id (pNN).', 1);
  }
  const declared = new Set(
    parseTaskProgress(planContent, '', {
      phaseUnits: workflowMode === 'phase-unit',
    }).phases.map((phase) => phase.phaseId),
  );
  return tokens.map((token) => {
    const phaseId = normalizePhaseId(token);
    if (phaseId === null) {
      throw new CliError(`--scope ${token} is not a phase id (pNN).`, 1);
    }
    if (!declared.has(phaseId)) {
      throw new CliError(`--scope ${token} names no phase in plan.md.`, 1);
    }
    return phaseId;
  });
}

function readWorkflowMode(stateContent: string): string {
  const metadata = readFrontmatterMetadata(stateContent);
  const mode =
    metadata.state === 'ok' ? metadata.record.oat_workflow_mode : undefined;
  return typeof mode === 'string' && mode.length > 0 ? mode : 'spec-driven';
}

async function readCommittedJournal(
  projectDir: string,
  git: GitRunner,
): Promise<string | null> {
  const head = await git.run(
    ['rev-parse', '--verify', '--quiet', 'HEAD^{commit}'],
    { cwd: projectDir, allowFailure: true },
  );
  if (head.code === 1) {
    const symbolic = await git.run(['symbolic-ref', '-q', 'HEAD'], {
      cwd: projectDir,
      allowFailure: true,
    });
    if (symbolic.code !== 0 || symbolic.stdout === '') {
      throw new CliError(
        `Unable to inspect the committed journal: HEAD does not resolve and its branch could not be identified${symbolic.stderr ? `: ${symbolic.stderr}` : ''}`,
        2,
      );
    }
    const branch = await git.run(
      ['show-ref', '--verify', '--quiet', symbolic.stdout],
      { cwd: projectDir, allowFailure: true },
    );
    if (branch.code === 1) {
      return null;
    }
    throw new CliError(
      `Unable to inspect the committed journal: HEAD does not resolve${branch.stderr ? `: ${branch.stderr}` : ''}`,
      2,
    );
  }
  if (head.code !== 0) {
    throw new CliError(
      `Unable to inspect the committed journal: ${head.stderr || `git exited ${head.code}`}`,
      2,
    );
  }

  const entry = await git.run(
    ['ls-tree', '--full-name', '-z', 'HEAD', '--', 'implementation.md'],
    { cwd: projectDir, allowFailure: true },
  );
  if (entry.code !== 0) {
    throw new CliError(
      `Unable to inspect the committed journal path: ${entry.stderr || `git exited ${entry.code}`}`,
      2,
    );
  }
  if (entry.stdout === '') {
    return null;
  }

  const blob = await git.run(['show', 'HEAD:./implementation.md'], {
    cwd: projectDir,
    allowFailure: true,
  });
  if (blob.code !== 0) {
    throw new CliError(
      `Unable to read the committed journal: ${blob.stderr || `git exited ${blob.code}`}`,
      2,
    );
  }
  return blob.stdout;
}

export function formatJournalReason(reason: JournalCheckReason): string {
  const location =
    reason.line === null ? reason.path : `${reason.path}:${reason.line}`;
  return `${reason.code} ${location} (${reason.owner}): ${reason.message}`;
}

export function formatJournalRefusal(
  projectPath: string,
  result: JournalCheckResult,
): string {
  return [
    `Journal check refused ${projectPath} at ${result.boundary} (${result.reasons.length} reason${result.reasons.length === 1 ? '' : 's'}):`,
    ...result.reasons.map((reason) => `- ${formatJournalReason(reason)}`),
  ].join('\n');
}

interface JournalCheckOptions {
  project?: string;
  at?: string;
  scope?: string;
}

async function resolveProjectDir(
  options: JournalCheckOptions,
  repoRoot: string,
  dependencies: JournalCheckDependencies,
): Promise<string> {
  if (options.project) {
    const projectDir = isAbsolute(options.project)
      ? resolve(options.project)
      : resolve(repoRoot, options.project);
    if (
      !(await dependencies.dirExists(projectDir)) ||
      !(await dependencies.fileExists(join(projectDir, 'state.md')))
    ) {
      throw new CliError(
        `Project path is missing or invalid: ${options.project}. Pass --project <path> for a directory containing state.md.`,
        1,
      );
    }
    return projectDir;
  }
  const active = await dependencies.resolveActiveProject(repoRoot);
  if (active.status !== 'active' || !active.path) {
    throw new CliError(
      'No active project resolves. Set activeProject or pass --project <path>.',
      1,
    );
  }
  return resolve(repoRoot, active.path);
}

async function runJournalCheck(
  options: JournalCheckOptions,
  context: CommandContext,
  dependencies: JournalCheckDependencies,
): Promise<void> {
  try {
    const boundary = options.at as JournalCheckBoundary | undefined;
    if (
      boundary === undefined ||
      !(JOURNAL_CHECK_BOUNDARIES as readonly string[]).includes(boundary)
    ) {
      throw new CliError(
        `--at must be one of ${JOURNAL_CHECK_BOUNDARIES.join(', ')}.`,
        1,
      );
    }
    if (boundary === 'review' && !options.scope) {
      throw new CliError('--at review needs an explicit --scope pNN[,pNN].', 1);
    }
    if (boundary !== 'review' && options.scope) {
      throw new CliError('--scope applies only to --at review.', 1);
    }

    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const projectDir = await resolveProjectDir(options, repoRoot, dependencies);
    const files = await readJournalCheckFiles(projectDir, dependencies);
    const workflowMode = readWorkflowMode(files.stateContent);
    const scope =
      boundary === 'review' && options.scope
        ? parseJournalScope(
            options.scope,
            files.planContent,
            workflowMode === 'brief' || workflowMode === 'goal'
              ? 'phase-unit'
              : 'task',
          )
        : null;
    let result = evaluateJournal({ boundary, scope, ...files });
    if (
      workflowMode === 'goal' &&
      (boundary === 'implement-preflight' || boundary === 'review')
    ) {
      const committed = await readCommittedJournal(
        projectDir,
        dependencies.git,
      );
      if (committed !== null) {
        const reasons: JournalCheckReason[] = journalRewrites(
          committed,
          files.journalContent,
        ).flatMap((rewrite): JournalCheckReason[] => {
          if (rewrite.kind === 'recorded-line-rewritten') {
            return [
              {
                code: 'journal-line-rewritten',
                path: 'implementation.md',
                line: null,
                owner: 'oat-project-implement',
                message: `Committed journal line "${rewrite.line}" was removed or rewritten.`,
              },
            ];
          }
          if (
            rewrite.kind === 'frontmatter-unparseable' &&
            rewrite.side !== 'after'
          ) {
            return [
              {
                code: 'journal-frontmatter-malformed',
                path: 'implementation.md',
                line: null,
                owner: 'oat-project-implement',
                message:
                  'Committed implementation.md frontmatter could not be parsed.',
              },
            ];
          }
          return [];
        });
        if (reasons.length > 0) {
          result = {
            ...result,
            status: 'refused',
            reasons: [...result.reasons, ...reasons],
          };
        }
      }
    }

    if (context.json) {
      context.logger.json({ ...result, projectPath: projectDir });
    } else if (result.status === 'ok') {
      context.logger.info(
        `Journal check passed at ${boundary}${scope === null ? '' : ` for ${scope.join(', ')}`}.`,
      );
      for (const warning of result.warnings) {
        context.logger.warn(`warning: ${formatJournalReason(warning)}`);
      }
    } else {
      context.logger.info(formatJournalRefusal(projectDir, result));
      for (const warning of result.warnings) {
        context.logger.warn(`warning: ${formatJournalReason(warning)}`);
      }
    }
    process.exitCode = result.status === 'ok' ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = error instanceof CliError ? error.exitCode : 1;
  }
}

export function createProjectJournalCommand(
  overrides: Partial<JournalCheckDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('journal')
    .description('Validate the implementation journal (read-only)')
    .addCommand(
      new Command('check')
        .description(
          'Evaluate implementation.md against plan.md and state.md at one lifecycle boundary (writes nothing)',
        )
        .option(
          '--project <path>',
          'Project directory (defaults to the active project)',
        )
        .option(
          '--at <boundary>',
          'Boundary: implement-preflight, review, or completion',
        )
        .option(
          '--scope <phases>',
          'Review only: comma-separated phase ids to check (pNN[,pNN])',
        )
        .action(
          async (
            options: JournalCheckOptions,
            command: Command,
          ): Promise<void> => {
            const context = dependencies.buildCommandContext(
              readGlobalOptions(command),
            );
            await runJournalCheck(options, context, dependencies);
          },
        ),
    );
}
