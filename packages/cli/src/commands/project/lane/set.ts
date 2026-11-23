import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { assertOrchestratorCheckout } from '@commands/project/orchestrator/branch';
import {
  resolveProjectOrActive,
  type NamedProject,
} from '@commands/project/resolve-named-project';
import type { GitRunner } from '@commands/project/sync/git';
import { isFreestyleState } from '@commands/shared/frontmatter';
import { canonicalizePath } from '@commands/shared/project-scope';
import { CliError } from '@errors/cli-error';

import { checkLaneHead, type LaneHeadCheck } from './head';
import {
  LANES_FILENAME,
  readLaneLedger,
  writeLaneLedger,
  type LedgerWriteFs,
} from './ledger';
import {
  applyLaneUpdate,
  type LaneUpdateRequest,
  type LaneUpdateResult,
} from './update';

export interface SetLaneOptions {
  repoRoot: string;
  /** Where relative `--worktree` and `--report` paths are read from. */
  cwd: string;
  project?: string;
  request: LaneUpdateRequest;
  /** The returned report, saved verbatim to a file, for `request.report`. */
  reportFile?: string;
  now: Date;
  git?: GitRunner;
  fs?: LedgerWriteFs;
}

export interface SetLaneResult extends LaneUpdateResult {
  project: NamedProject;
  /** `lanes.md` beside the project's own path, as output names it. */
  ledgerPath: string;
  /** The head-ahead check for the lane; null when it does not apply. */
  headCheck: LaneHeadCheck | null;
}

/** Text a ledger line can hold: one line. */
export function validateOneLine(option: string, value: string): string {
  if (/[\r\n\u2028\u2029]/.test(value)) {
    throw new CliError(`${option} must be one line.`, 1);
  }
  return value.trim();
}

/**
 * A lane in the orchestrator's own checkout shares its worktree; any other
 * worktree is the lane's own. `lane set` runs only in the orchestrator's
 * checkout, so the comparison is with this checkout's root.
 */
function placementFor(worktree: string, repoRoot: string): string {
  return worktree === canonicalizePath(repoRoot)
    ? 'shared-worktree'
    : 'own-worktree';
}

/**
 * Copy the returned report into `lane-reports/` verbatim. A report is never
 * edited, so an existing different file is refused; the same bytes again (a
 * retry after the ledger write failed) are accepted.
 */
async function fileReport(
  projectDir: string,
  reportPath: string,
  source: string,
): Promise<void> {
  const content = await readFile(source);
  const target = join(projectDir, reportPath);
  await mkdir(dirname(target), { recursive: true });
  try {
    await writeFile(target, content, { flag: 'wx' });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
      if ((await readFile(target)).equals(content)) {
        return;
      }
      throw new CliError(
        `${reportPath} already exists with different content; a filed report is never edited.`,
        1,
      );
    }
    throw error;
  }
}

/**
 * `oat project lane set`: one update to a freestyle project's lane ledger,
 * refused unless this checkout is the project's orchestrator. A report is
 * filed first, then the ledger is written atomically with its pointer, so a
 * failed write never leaves a pointer to a missing report. The lane's
 * head-ahead check runs on the result. Nothing is committed or pushed.
 */
export async function setLane(options: SetLaneOptions): Promise<SetLaneResult> {
  const project = await resolveProjectOrActive(
    options.repoRoot,
    options.project,
  );
  const state = await readFile(join(project.absolutePath, 'state.md'), 'utf8');
  if (!isFreestyleState(state)) {
    throw new CliError(
      `Project ${project.name} is not a freestyle project; only a freestyle project keeps a lane ledger.`,
      1,
    );
  }
  await assertOrchestratorCheckout({
    projectDir: project.absolutePath,
    projectName: project.name,
    projectPath: project.projectPath,
    repoRoot: options.repoRoot,
    action: `update lane ${options.request.lane}`,
    git: options.git,
  });
  if (options.request.report && !options.reportFile) {
    throw new CliError('--report needs the file holding the report.', 1);
  }

  const request: LaneUpdateRequest = {
    ...options.request,
    fields: { ...options.request.fields },
  };
  const worktree = request.fields.worktree;
  if (worktree) {
    const absolute = canonicalizePath(resolve(options.cwd, worktree));
    request.fields.worktree = absolute;
    request.fields.placement = placementFor(absolute, options.repoRoot);
  } else if (worktree === '') {
    request.fields.placement = '';
  }

  const { ledger } = await readLaneLedger(project.absolutePath, project.name);
  const result = applyLaneUpdate(ledger, request, options.now);
  if (result.reportPath && options.reportFile) {
    await fileReport(
      project.absolutePath,
      result.reportPath,
      resolve(options.cwd, options.reportFile),
    );
  }
  await writeLaneLedger(project.absolutePath, result.ledger, options.fs);
  return {
    ...result,
    project,
    ledgerPath: `${project.projectPath}/${LANES_FILENAME}`,
    headCheck: await checkLaneHead(result.block, options.repoRoot, options.git),
  };
}
