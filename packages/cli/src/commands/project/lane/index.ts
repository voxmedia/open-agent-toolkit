import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import { commitLaneRecords, type LaneCommitResult } from './commit';
import { formatHeadAhead, isHeadFlagged } from './head';
import {
  LANE_STATES,
  LANES_FILENAME,
  WAITING_ON_KINDS,
  type LaneState,
} from './ledger';
import { setLane, validateOneLine, type SetLaneResult } from './set';
import type { SettableLaneField } from './update';

interface LaneDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  gitRunner: GitRunner;
  now: () => Date;
}

const DEFAULT_DEPENDENCIES: LaneDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  gitRunner: defaultGitRunner,
  now: () => new Date(),
};

interface LaneSetOptions {
  project?: string;
  state?: string;
  dispatch?: boolean;
  /** A file path for `--report`, false for `--no-report`. */
  report?: string | false;
  steer?: string;
  next?: string;
  owner?: string;
  task?: string;
  thread?: string;
  worktree?: string;
  branch?: string;
  base?: string;
  head?: string;
  reviewRound?: string;
  blocker?: string;
  waitingOn?: string;
  replacedBy?: string;
  wake?: string;
  provider?: string;
  model?: string;
  effort?: string;
  observedModel?: string;
  paths?: string;
  commit?: boolean;
}

/** Each field option, its flag and its ledger field. */
const FIELD_OPTIONS: readonly [
  keyof LaneSetOptions,
  string,
  SettableLaneField,
][] = [
  ['next', '--next', 'next'],
  ['owner', '--owner', 'owner'],
  ['task', '--task', 'task'],
  ['thread', '--thread', 'thread'],
  ['worktree', '--worktree', 'worktree'],
  ['branch', '--branch', 'branch'],
  ['base', '--base', 'base'],
  ['head', '--head', 'head'],
  ['reviewRound', '--review-round', 'review_round'],
  ['blocker', '--blocker', 'blocker'],
  ['waitingOn', '--waiting-on', 'waiting_on'],
  ['replacedBy', '--replaced-by', 'replaced_by'],
  ['wake', '--wake', 'wake'],
  ['provider', '--provider', 'provider'],
  ['model', '--model', 'model'],
  ['effort', '--effort', 'effort'],
  ['observedModel', '--observed-model', 'observed_model'],
  ['paths', '--paths', 'paths'],
];

const SAVE_HINT =
  "Nothing was committed or pushed: save it by the records rule for the project's scope in its AGENTS.md.";

/** The line after `Wrote <ledger>.`, for `--commit`. */
function describeCommit(commit: LaneCommitResult): string {
  if (commit.outcome === 'committed') {
    return `Committed ${commit.paths.join(', ')} (${commit.commit?.slice(0, 9) ?? 'unknown'}). Nothing was pushed.`;
  }
  return "Nothing to commit on this checkout's branch: the project's scope keeps its records off it. Save it by the records rule for that scope in its AGENTS.md.";
}

function requestFields(
  options: LaneSetOptions,
): Partial<Record<SettableLaneField, string>> {
  const fields: Partial<Record<SettableLaneField, string>> = {};
  for (const [key, flag, field] of FIELD_OPTIONS) {
    const raw = options[key];
    if (typeof raw !== 'string') {
      continue;
    }
    const value = validateOneLine(flag, raw);
    fields[field] =
      field === 'paths'
        ? value
            .split(',')
            .map((path) => path.trim())
            .filter(Boolean)
            .join(', ')
        : value;
  }
  return fields;
}

function describe(result: SetLaneResult): string {
  const verb = result.created
    ? 'Created'
    : result.closed
      ? 'Closed'
      : 'Updated';
  const changes = result.changes.length
    ? result.changes.join('; ')
    : 'observed, no change';
  return `${verb} lane ${result.block.id} (${result.updateId}, dispatch ${result.dispatch.id} ${result.dispatch.status}): ${changes}`;
}

function reportError(context: CommandContext, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  if (context.json) {
    context.logger.json({ status: 'error', message });
  } else {
    context.logger.error(message);
  }
  process.exitCode = error instanceof CliError ? error.exitCode : 2;
}

function createSetCommand(dependencies: LaneDependencies): Command {
  return new Command('set')
    .description(
      "Create or update a lane in a freestyle project's lanes.md (orchestrator checkout only)",
    )
    .argument('<lane>', 'Lane ID such as l01; an ID not yet listed creates it')
    .option(
      '--project <name-or-path>',
      'Project name or path; defaults to the active project',
    )
    .option('--state <state>', `Lane state: ${LANE_STATES.join(', ')}`)
    .option(
      '--dispatch',
      "Open the lane's next dispatch (its last one must be closed)",
    )
    .option(
      '--report <file>',
      'File the returned report for the open dispatch into lane-reports/, verbatim, and close the dispatch',
    )
    .option(
      '--no-report',
      'Close the open dispatch with no report (an interrupted turn)',
    )
    .option(
      '--steer <text>',
      'Record a message sent to the running lane (amends the open dispatch)',
    )
    .option('--next <text>', 'Next action, one line')
    .option('--owner <who>', 'Who takes the next action')
    .option('--task <handle>', 'Task or run handle')
    .option('--thread <handle>', 'Thread handle')
    .option(
      '--worktree <path>',
      "The lane's worktree (stored relative to the repository or ~ when possible); this checkout means the lane shares the orchestrator's",
    )
    .option('--branch <name>', "The lane's branch")
    .option('--base <sha>', "The lane's base")
    .option('--head <sha>', "The head the lane's last report delivered")
    .option('--review-round <n>', 'Review round')
    .option('--blocker <text>', 'What blocks the lane, one line')
    .option(
      '--waiting-on <kind>',
      `What a blocked lane waits on: ${WAITING_ON_KINDS.join(', ')}`,
    )
    .option('--replaced-by <lane>', 'The lane that supersedes this one')
    .option('--wake <source>', 'What wakes the orchestrator for this lane')
    .option('--provider <name>', 'Configured provider')
    .option('--model <model>', 'Configured model')
    .option('--effort <effort>', 'Configured effort')
    .option('--observed-model <model>', 'Model the lane was observed running')
    .option(
      '--paths <list>',
      "Comma-separated paths a lane in the orchestrator's checkout may change",
    )
    .option(
      '--commit',
      'Commit lanes.md and the report this update filed, by exact path; other changes stay uncommitted and nothing is pushed',
    )
    .addHelpText(
      'after',
      `
An empty value (for example --blocker "") clears a field. Each update appends one History line.
With --commit, a shared project's records are committed on this branch; a synced project's live in its nested worktree (publish them with oat project push) and a local project's stay uncommitted, so there is nothing to commit. Pushing is a separate step.`,
    )
    .action(async (lane: string, options: LaneSetOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      try {
        const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
        const steer =
          options.steer === undefined
            ? undefined
            : validateOneLine('--steer', options.steer);
        if (steer === '') {
          throw new CliError('--steer needs the message, one line.', 1);
        }
        const result = await setLane({
          repoRoot,
          cwd: context.cwd,
          project: options.project,
          request: {
            lane,
            state: options.state as LaneState | undefined,
            dispatch: options.dispatch,
            report: typeof options.report === 'string',
            noReport: options.report === false,
            steer,
            fields: requestFields(options),
          },
          reportFile:
            typeof options.report === 'string' ? options.report : undefined,
          now: dependencies.now(),
          git: dependencies.gitRunner,
        });
        const commit = options.commit
          ? await commitLaneRecords({
              repoRoot,
              projectDir: result.project.absolutePath,
              files: [
                LANES_FILENAME,
                ...(result.reportPath ? [result.reportPath] : []),
              ],
              lane: result.block.id,
              updateId: result.updateId,
              git: dependencies.gitRunner,
            })
          : undefined;
        if (context.json) {
          context.logger.json({
            status: 'ok',
            projectName: result.project.name,
            ledgerPath: result.ledgerPath,
            lane: result.block.id,
            updateId: result.updateId,
            created: result.created,
            closed: result.closed,
            dispatch: result.dispatch,
            fields: result.block.fields,
            changes: result.changes,
            reportPath: result.reportPath ?? null,
            headCheck: result.headCheck,
            ...(commit ? { commit } : {}),
          });
        } else {
          context.logger.info(describe(result));
          if (commit?.outcome === 'failed') {
            context.logger.error(
              `Wrote ${result.ledgerPath} but could not commit it: ${commit.error ?? 'no detail'}`,
            );
          } else {
            context.logger.info(
              `Wrote ${result.ledgerPath}. ${commit ? describeCommit(commit) : SAVE_HINT}`,
            );
          }
          if (result.headCheck && isHeadFlagged(result.headCheck)) {
            context.logger.warn(
              `Warning: ${formatHeadAhead(result.headCheck)}`,
            );
          }
        }
        process.exitCode = commit?.outcome === 'failed' ? 1 : 0;
      } catch (error) {
        reportError(context, error);
      }
    });
}

export function createProjectLaneCommand(
  overrides: Partial<LaneDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('lane')
    .description("Manage a freestyle project's lane ledger (lanes.md)")
    .addCommand(createSetCommand(dependencies));
}
