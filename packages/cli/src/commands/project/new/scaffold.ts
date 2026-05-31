import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import { generateStateDashboard } from '@commands/state/generate';
import { setActiveProject } from '@config/oat-config';
import { fileExists } from '@fs/io';
import { assertValidProjectStateContent } from '@validation/project-state';

export type ProjectScaffoldMode = 'spec-driven' | 'quick' | 'import';

export interface ScaffoldProjectOptions {
  repoRoot: string;
  projectName: string;
  mode?: ProjectScaffoldMode;
  force?: boolean;
  setActive?: boolean;
  refreshDashboard?: boolean;
  /**
   * Commit the freshly scaffolded project directory so the artifact baseline is
   * git-tracked from t=0. Opt-in (default false) so library callers that manage
   * their own commits (e.g. the project-split flow) are unaffected; only the
   * `oat project new` command enables it by default.
   */
  commit?: boolean;
  env?: NodeJS.ProcessEnv;
  today?: string;
  nowUtc?: string;
  refreshDashboardCallback?: (repoRoot: string) => void | Promise<void>;
}

/**
 * Classified outcome of the scoped scaffold commit. Distinguishing the skip
 * reasons (and `failed`) lets the CLI surface accurate, distinct messaging
 * instead of collapsing every non-commit into a single benign "skipped" line.
 */
export type CommitScaffoldStatus =
  | 'committed'
  | 'skipped_disabled'
  | 'skipped_no_worktree'
  | 'skipped_nothing'
  | 'failed';

export interface ScaffoldProjectResult {
  mode: ProjectScaffoldMode;
  projectsRoot: string;
  projectPath: string;
  createdFiles: string[];
  skippedFiles: string[];
  activePointerUpdated: boolean;
  dashboardRefreshed: boolean;
  committed: boolean;
  commitSha?: string;
  commitStatus: CommitScaffoldStatus;
  commitError?: string;
}

const TEMPLATES_BY_MODE: Record<ProjectScaffoldMode, string[]> = {
  'spec-driven': [
    'state.md',
    'discovery.md',
    'spec.md',
    'design.md',
    'plan.md',
    'implementation.md',
  ],
  quick: ['state.md', 'discovery.md', 'plan.md', 'implementation.md'],
  import: ['state.md', 'plan.md', 'implementation.md'],
};

interface StateTemplateContent {
  hillCheckpoints: string;
  phase: string;
  status: string;
  currentPhase: string;
  artifacts: string[];
  progress: string[];
  nextMilestone: string;
}

const STATE_TEMPLATE_BY_MODE: Record<
  ProjectScaffoldMode,
  StateTemplateContent
> = {
  'spec-driven': {
    hillCheckpoints: "['discovery', 'design']",
    phase: 'discovery',
    status: 'Discovery',
    currentPhase:
      'Discovery - Gathering requirements and understanding the problem space',
    artifacts: [
      '- **Discovery:** `discovery.md` (in_progress)',
      '- **Spec:** `spec.md` (scaffolded template — authored inline by `oat-project-design`)',
      '- **Design:** `design.md` (scaffolded template — not started)',
      '- **Plan:** `plan.md` (scaffolded template — not started)',
      '- **Implementation:** `implementation.md` (scaffolded template — not started)',
    ],
    progress: [
      '- ✓ Discovery started',
      '- ✓ Downstream lifecycle files scaffolded',
      '- ⧗ Awaiting user input',
    ],
    nextMilestone: 'Complete discovery and move to design phase',
  },
  quick: {
    hillCheckpoints: '[]',
    phase: 'discovery',
    status: 'Discovery',
    currentPhase:
      'Discovery - Gathering requirements for a quick workflow before planning',
    artifacts: [
      '- **Discovery:** `discovery.md` (in_progress)',
      '- **Spec:** N/A (quick mode)',
      '- **Design:** N/A (quick mode unless lightweight design is needed)',
      '- **Plan:** `plan.md` (scaffolded template — not started)',
      '- **Implementation:** `implementation.md` (scaffolded template — not started)',
    ],
    progress: [
      '- ✓ Discovery started',
      '- ✓ Execution artifacts scaffolded',
      '- ⧗ Awaiting user input',
    ],
    nextMilestone:
      'Complete discovery and generate a quick implementation plan',
  },
  import: {
    hillCheckpoints: '[]',
    phase: 'plan',
    status: 'Plan Import',
    currentPhase:
      'Plan import - Waiting to normalize an external plan into OAT format',
    artifacts: [
      '- **Discovery:** N/A (import mode)',
      '- **Spec:** N/A (import mode)',
      '- **Design:** N/A (import mode)',
      '- **Plan:** `plan.md` (scaffolded template — awaiting imported content)',
      '- **Implementation:** `implementation.md` (scaffolded template — awaiting imported plan)',
    ],
    progress: [
      '- ✓ Import-mode project scaffolded',
      '- ✓ Execution artifacts scaffolded',
      '- ⧗ Awaiting external plan import',
    ],
    nextMilestone:
      'Run `oat-project-import-plan` to normalize the external plan',
  },
};

function validateProjectName(name: string): void {
  if (name.startsWith('-')) {
    throw new Error(
      `Invalid project name "${name}". Project names must not start with a dash.`,
    );
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error(
      `Invalid project name "${name}". Use only letters, numbers, dash, and underscore.`,
    );
  }
}

function applyTemplateReplacements(
  template: string,
  projectName: string,
  today: string,
  nowUtc: string,
  mode: ProjectScaffoldMode,
): string {
  const stateContent = STATE_TEMPLATE_BY_MODE[mode];
  return template
    .replaceAll('{Project Name}', projectName)
    .replaceAll('YYYY-MM-DD', today)
    .replaceAll('{OAT_HILL_CHECKPOINTS}', stateContent.hillCheckpoints)
    .replaceAll('{OAT_WORKFLOW_MODE}', mode)
    .replaceAll('{OAT_PHASE}', stateContent.phase)
    .replaceAll('{OAT_STATUS}', stateContent.status)
    .replaceAll('{OAT_CURRENT_PHASE}', stateContent.currentPhase)
    .replaceAll('{OAT_ARTIFACTS}', stateContent.artifacts.join('\n'))
    .replaceAll('{OAT_PROGRESS}', stateContent.progress.join('\n'))
    .replaceAll('{OAT_NEXT_MILESTONE}', stateContent.nextMilestone)
    .replaceAll(
      /oat_project_created:\s*null/gi,
      `oat_project_created: "${nowUtc}"`,
    )
    .replaceAll(
      /oat_project_state_updated:\s*null/gi,
      `oat_project_state_updated: "${nowUtc}"`,
    )
    .replaceAll(/\n?oat_template:\s*true\s*\n/gi, '\n')
    .replaceAll(/\n?oat_template_name:\s*[^\n]*\n/gi, '\n');
}

async function defaultRefreshDashboard(repoRoot: string): Promise<void> {
  await generateStateDashboard({ repoRoot });
}

interface CommitScaffoldResult {
  status: CommitScaffoldStatus;
  committed: boolean;
  commitSha?: string;
  error?: string;
}

/**
 * Scoped, fail-safe commit of just the files this run created.
 *
 * Stages and commits only the pathspecs derived from `createdFiles` (under
 * `projectPath`) so unrelated working-tree changes — including pre-existing
 * dirty edits inside the same project directory on a re-run, and the
 * `.oat/state.md` dashboard outside it — are never swept in. The returned
 * status distinguishes a clean commit from each skip reason and from a genuine
 * git failure; on failure the captured git stderr is surfaced via `error`. This
 * never throws: any git error is classified as `failed`, not propagated.
 */
function commitScaffold(
  cwd: string,
  projectPath: string,
  projectName: string,
  createdFiles: string[],
): CommitScaffoldResult {
  const run = (args: string[]): string =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      // Capture stderr instead of inheriting it so deliberate skip/failure
      // probes (e.g. tests) do not leak raw `git fatal:` lines to the terminal.
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();

  try {
    run(['rev-parse', '--is-inside-work-tree']);
  } catch {
    return { status: 'skipped_no_worktree', committed: false };
  }

  // Only commit files this run created. Nothing created => nothing to commit,
  // which guarantees a re-run never touches unrelated working-tree edits.
  if (createdFiles.length === 0) {
    return { status: 'skipped_nothing', committed: false };
  }
  const pathspecs = createdFiles.map((file) => join(projectPath, file));

  try {
    run(['add', '--', ...pathspecs]);

    const staged = run(['diff', '--cached', '--name-only', '--', ...pathspecs]);
    if (staged.length === 0) {
      return { status: 'skipped_nothing', committed: false };
    }

    run([
      'commit',
      '-m',
      `chore(oat): scaffold ${projectName}`,
      '--',
      ...pathspecs,
    ]);

    const commitSha = run(['rev-parse', 'HEAD']);
    return { status: 'committed', committed: true, commitSha };
  } catch (error) {
    const stderr =
      error && typeof error === 'object' && 'stderr' in error
        ? (error as { stderr?: Buffer | string }).stderr
        : undefined;
    const message =
      (stderr != null ? stderr.toString().trim() : '') ||
      (error instanceof Error ? error.message : String(error));
    return { status: 'failed', committed: false, error: message };
  }
}

async function scaffoldModeTemplates(
  repoRoot: string,
  projectPath: string,
  projectName: string,
  mode: ProjectScaffoldMode,
  today: string,
  nowUtc: string,
): Promise<{ createdFiles: string[]; skippedFiles: string[] }> {
  const templatesDir = join(repoRoot, '.oat', 'templates');
  const createdFiles: string[] = [];
  const skippedFiles: string[] = [];

  for (const templateFile of TEMPLATES_BY_MODE[mode]) {
    const src = join(templatesDir, templateFile);
    const dest = join(repoRoot, projectPath, templateFile);

    if (await fileExists(dest)) {
      skippedFiles.push(templateFile);
      continue;
    }

    const template = await readFile(src, 'utf8');
    const rendered = applyTemplateReplacements(
      template,
      projectName,
      today,
      nowUtc,
      mode,
    );
    if (templateFile === 'state.md') {
      assertValidProjectStateContent(rendered, { filePath: dest });
    }
    await writeFile(dest, rendered, 'utf8');
    createdFiles.push(templateFile);
  }

  return { createdFiles, skippedFiles };
}

async function ensureStructure(
  repoRoot: string,
  projectPath: string,
  mode: ProjectScaffoldMode,
): Promise<void> {
  const projectRoot = join(repoRoot, projectPath);
  await mkdir(projectRoot, { recursive: true });
  await mkdir(join(projectRoot, 'reviews'), { recursive: true });
  await mkdir(join(projectRoot, 'pr'), { recursive: true });

  if (mode === 'import') {
    const referencesDir = join(projectRoot, 'references');
    await mkdir(referencesDir, { recursive: true });
    const gitkeepPath = join(referencesDir, '.gitkeep');
    if (!(await fileExists(gitkeepPath))) {
      await writeFile(gitkeepPath, '', 'utf8');
    }
  }
}

export async function scaffoldProject(
  options: ScaffoldProjectOptions,
): Promise<ScaffoldProjectResult> {
  const mode = options.mode ?? 'spec-driven';
  const setActive = options.setActive ?? true;
  const refreshDashboard = options.refreshDashboard ?? true;
  const env = options.env ?? process.env;
  const now = new Date();
  const today = options.today ?? now.toISOString().slice(0, 10);
  const nowUtc = options.nowUtc ?? now.toISOString();

  validateProjectName(options.projectName);
  const projectsRoot = await resolveProjectsRoot(options.repoRoot, env);
  const projectPath = join(projectsRoot, options.projectName);
  // `--force` is currently accepted for compatibility with the legacy script.
  // Scaffold behavior is always non-destructive (create missing files only).
  void options.force;

  await ensureStructure(options.repoRoot, projectPath, mode);
  const { createdFiles, skippedFiles } = await scaffoldModeTemplates(
    options.repoRoot,
    projectPath,
    options.projectName,
    mode,
    today,
    nowUtc,
  );

  if (setActive) {
    await setActiveProject(options.repoRoot, projectPath);
  }

  let dashboardRefreshed = false;
  if (refreshDashboard) {
    try {
      await (options.refreshDashboardCallback ?? defaultRefreshDashboard)(
        options.repoRoot,
      );
      dashboardRefreshed = true;
    } catch (error) {
      console.error(
        `Warning: dashboard refresh failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  let committed = false;
  let commitSha: string | undefined;
  let commitStatus: CommitScaffoldStatus = 'skipped_disabled';
  let commitError: string | undefined;
  if (options.commit) {
    // `projectPath` is relative to `repoRoot`, so git must run there for the
    // pathspecs to resolve to the scaffolded files.
    const commitResult = commitScaffold(
      options.repoRoot,
      projectPath,
      options.projectName,
      createdFiles,
    );
    committed = commitResult.committed;
    commitSha = commitResult.commitSha;
    commitStatus = commitResult.status;
    commitError = commitResult.error;
  }

  return {
    mode,
    projectsRoot,
    projectPath,
    createdFiles,
    skippedFiles,
    activePointerUpdated: setActive,
    dashboardRefreshed,
    committed,
    commitSha,
    commitStatus,
    commitError,
  };
}
