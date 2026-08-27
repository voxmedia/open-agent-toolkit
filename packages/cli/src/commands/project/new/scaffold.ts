import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';

import {
  applyOatCoreGitignore,
  isSyncedRuleApplied,
} from '@commands/init/gitignore';
import { instantiateProjectLogTemplate } from '@commands/project/log/append';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  buildSyncedRecord,
  writeSyncedRecord,
} from '@commands/project/sync/record';
import {
  buildSyncTarget,
  commitRecordChange,
  createSyncedProject,
  pushSynced,
} from '@commands/project/sync/ref-sync';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
  resolveDefaultScope,
  resolveScopeRoot,
  syncedRecordPath,
  type ProjectScope,
} from '@commands/shared/project-scope';
import { generateStateDashboard } from '@commands/state/generate';
import { setActiveProject } from '@config/oat-config';
import { resolveEffectiveConfig } from '@config/resolve';
import { CliError } from '@errors/cli-error';
import { resolveAssetsRoot } from '@fs/assets';
import { fileExists } from '@fs/io';
import { assertValidProjectStateContent } from '@validation/project-state';

export type ProjectScaffoldMode = 'spec-driven' | 'quick' | 'import';

export interface ScaffoldProjectOptions {
  repoRoot: string;
  projectName: string;
  scope?: ProjectScope;
  mode?: ProjectScaffoldMode;
  force?: boolean;
  setActive?: boolean;
  refreshDashboard?: boolean;
  projectLog?: boolean;
  /**
   * Commit the freshly scaffolded project directory so the artifact baseline is
   * git-tracked from t=0. Opt-in (default false) so library callers that manage
   * their own commits (e.g. the project-split flow) are unaffected; only the
   * `oat project new` command enables it by default.
   */
  commit?: boolean;
  env?: NodeJS.ProcessEnv;
  home?: string;
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
  scope: ProjectScope;
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
  ref?: string;
  sha?: string;
}

export interface ScaffoldProjectDependencies {
  resolveDefaultScope: typeof resolveDefaultScope;
  gitRunner: GitRunner;
  createSyncedProject: typeof createSyncedProject;
  pushSynced: typeof pushSynced;
  commitRecordChange: typeof commitRecordChange;
  writeSyncedRecord: typeof writeSyncedRecord;
  applyOatCoreGitignore: typeof applyOatCoreGitignore;
  isSyncedRuleApplied: typeof isSyncedRuleApplied;
}

const DEFAULT_DEPENDENCIES: ScaffoldProjectDependencies = {
  resolveDefaultScope,
  gitRunner: defaultGitRunner,
  createSyncedProject,
  pushSynced,
  commitRecordChange,
  writeSyncedRecord,
  applyOatCoreGitignore,
  isSyncedRuleApplied,
};

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

const OAT_PLACEHOLDER_PATTERN = /(?<!\{)\{\s*(OAT_[A-Z0-9_]+)\s*\}(?!\})/g;

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

function replaceOatPlaceholders(
  template: string,
  replacements: Record<string, string>,
): string {
  return template.replace(
    OAT_PLACEHOLDER_PATTERN,
    (placeholder, token: string) => replacements[token] ?? placeholder,
  );
}

function assertNoUnresolvedOatPlaceholders(
  rendered: string,
  templateFile: string,
): void {
  const unresolved = [
    ...new Set(
      [...rendered.matchAll(OAT_PLACEHOLDER_PATTERN)].map(
        ([placeholder]) => placeholder,
      ),
    ),
  ];
  if (unresolved.length > 0) {
    throw new Error(
      `Cannot scaffold ${templateFile}: unresolved OAT placeholder(s): ${unresolved.join(', ')}`,
    );
  }
}

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
  const oatReplacements = {
    OAT_HILL_CHECKPOINTS: stateContent.hillCheckpoints,
    OAT_WORKFLOW_MODE: mode,
    OAT_PHASE: stateContent.phase,
    OAT_STATUS: stateContent.status,
    OAT_CURRENT_PHASE: stateContent.currentPhase,
    OAT_ARTIFACTS: stateContent.artifacts.join('\n'),
    OAT_PROGRESS: stateContent.progress.join('\n'),
    OAT_NEXT_MILESTONE: stateContent.nextMilestone,
  };
  return replaceOatPlaceholders(template, oatReplacements)
    .replaceAll('{Project Name}', projectName)
    .replaceAll('YYYY-MM-DD', today)
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
async function commitScaffold(
  cwd: string,
  projectPath: string,
  projectName: string,
  createdFiles: string[],
  dependencies: ScaffoldProjectDependencies,
): Promise<CommitScaffoldResult> {
  const inWorktree = await dependencies.gitRunner.run(
    ['rev-parse', '--is-inside-work-tree'],
    { cwd, allowFailure: true },
  );
  if (inWorktree.code !== 0) {
    return { status: 'skipped_no_worktree', committed: false };
  }

  // Only commit files this run created. Nothing created => nothing to commit,
  // which guarantees a re-run never touches unrelated working-tree edits.
  if (createdFiles.length === 0) {
    return { status: 'skipped_nothing', committed: false };
  }
  const pathspecs = createdFiles.map((file) => join(projectPath, file));

  try {
    const commit = await dependencies.commitRecordChange(
      cwd,
      pathspecs,
      `chore(oat): scaffold ${projectName}`,
      dependencies.gitRunner,
      { additionalAllowlistedPaths: pathspecs },
    );
    if (!commit) {
      return { status: 'skipped_nothing', committed: false };
    }
    return { status: 'committed', committed: true, commitSha: commit.sha };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: 'failed', committed: false, error: message };
  }
}

async function scaffoldModeTemplates(
  userOatRoot: string,
  repoRoot: string,
  projectPath: string,
  projectName: string,
  mode: ProjectScaffoldMode,
  today: string,
  nowUtc: string,
): Promise<{ createdFiles: string[]; skippedFiles: string[] }> {
  const createdFiles: string[] = [];
  const skippedFiles: string[] = [];

  for (const templateFile of TEMPLATES_BY_MODE[mode]) {
    const src = await resolveTemplateSource(
      userOatRoot,
      repoRoot,
      templateFile,
    );
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
    assertNoUnresolvedOatPlaceholders(rendered, templateFile);
    if (templateFile === 'state.md') {
      assertValidProjectStateContent(rendered, { filePath: dest });
    }
    await writeFile(dest, rendered, 'utf8');
    createdFiles.push(templateFile);
  }

  return { createdFiles, skippedFiles };
}

async function scaffoldProjectLog(
  userOatRoot: string,
  repoRoot: string,
  projectPath: string,
  projectName: string,
  today: string,
): Promise<'created' | 'skipped'> {
  const templateFile = 'project-log.md';
  const dest = join(repoRoot, projectPath, templateFile);
  if (await fileExists(dest)) {
    return 'skipped';
  }

  const src = await resolveTemplateSource(userOatRoot, repoRoot, templateFile);
  const template = await readFile(src, 'utf8');
  await writeFile(
    dest,
    instantiateProjectLogTemplate(template, projectName, today),
    'utf8',
  );
  return 'created';
}

async function resolveTemplateSource(
  userOatRoot: string,
  repoRoot: string,
  templateFile: string,
): Promise<string> {
  const userSource = join(userOatRoot, 'templates', templateFile);
  if (await fileExists(userSource)) {
    return userSource;
  }

  const repoSource = join(repoRoot, '.oat', 'templates', templateFile);
  if (await fileExists(repoSource)) {
    return repoSource;
  }

  const assetsRoot = await resolveAssetsRoot();
  return join(assetsRoot, 'templates', templateFile);
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
  overrides: Partial<ScaffoldProjectDependencies> = {},
): Promise<ScaffoldProjectResult> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const mode = options.mode ?? 'spec-driven';
  const setActive = options.setActive ?? true;
  const refreshDashboard = options.refreshDashboard ?? true;
  const env = options.env ?? process.env;
  const home =
    options.home ??
    env.HOME ??
    env.USERPROFILE ??
    process.env.HOME ??
    homedir();
  const userOatRoot = join(home, '.oat');
  const now = new Date();
  const today = options.today ?? now.toISOString().slice(0, 10);
  const nowUtc = options.nowUtc ?? now.toISOString();

  validateProjectName(options.projectName);
  const projectsRoot = await resolveProjectsRoot(options.repoRoot, env);
  const scope =
    options.scope ??
    (await dependencies.resolveDefaultScope(options.repoRoot, env));
  const absoluteScopeRoot =
    scope === 'shared'
      ? resolve(options.repoRoot, projectsRoot)
      : resolveScopeRoot(options.repoRoot, projectsRoot, scope);
  const absoluteProjectPath = join(absoluteScopeRoot, options.projectName);
  const projectPath = (
    isAbsolute(projectsRoot)
      ? absoluteProjectPath
      : relative(options.repoRoot, absoluteProjectPath)
  )
    .split('\\')
    .join('/');
  // `--force` is currently accepted for compatibility with the legacy script.
  // Scaffold behavior is always non-destructive (create missing files only).
  void options.force;

  let gitignoreChanged = false;
  let syncTarget: ReturnType<typeof buildSyncTarget> | undefined;
  if (scope === 'synced') {
    const remote = await dependencies.gitRunner.run(
      ['remote', 'get-url', 'origin'],
      { cwd: options.repoRoot, allowFailure: true },
    );
    if (remote.code !== 0) {
      throw new CliError(
        'Synced project creation requires a configured origin remote. Configure origin or use --scope local.',
        1,
      );
    }
    if (!(await dependencies.isSyncedRuleApplied(options.repoRoot))) {
      const applied = await dependencies.applyOatCoreGitignore(
        options.repoRoot,
      );
      gitignoreChanged = applied.action !== 'no-change';
      console.error(
        'Warning: applied the OAT synced-project rule to .gitignore before scaffolding.',
      );
    }
    syncTarget = buildSyncTarget(
      options.repoRoot,
      projectsRoot,
      options.projectName,
    );
    await dependencies.createSyncedProject(syncTarget, dependencies.gitRunner);
  }

  await ensureStructure(options.repoRoot, projectPath, mode);
  const { createdFiles, skippedFiles } = await scaffoldModeTemplates(
    userOatRoot,
    options.repoRoot,
    projectPath,
    options.projectName,
    mode,
    today,
    nowUtc,
  );
  const effectiveProjectLog =
    options.projectLog ??
    (await resolveEffectiveConfig(options.repoRoot, userOatRoot, env)).resolved[
      'workflow.projectLog'
    ]?.value === true;
  if (effectiveProjectLog) {
    const projectLogResult = await scaffoldProjectLog(
      userOatRoot,
      options.repoRoot,
      projectPath,
      options.projectName,
      today,
    );
    if (projectLogResult === 'created') {
      createdFiles.push('project-log.md');
    } else {
      skippedFiles.push('project-log.md');
    }
  }

  let ref: string | undefined;
  let sha: string | undefined;
  if (scope === 'synced' && syncTarget) {
    const pushed = await dependencies.pushSynced(
      syncTarget,
      dependencies.gitRunner,
      { message: `chore(oat): scaffold ${options.projectName}` },
    );
    if (pushed.status !== 'pushed' && pushed.status !== 'up-to-date') {
      throw new CliError(
        `Unable to publish synced project ${options.projectName}: ${pushed.status}.`,
        1,
      );
    }
    ref = syncTarget.ref;
    sha = pushed.sha;
    const recordPath = syncedRecordPath(absoluteScopeRoot, options.projectName);
    await dependencies.writeSyncedRecord(
      recordPath,
      buildSyncedRecord(options.projectName, new Date(nowUtc)),
    );
  }

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
  if (options.commit && scope === 'shared') {
    // `projectPath` is relative to `repoRoot`, so git must run there for the
    // pathspecs to resolve to the scaffolded files.
    const commitResult = await commitScaffold(
      options.repoRoot,
      projectPath,
      options.projectName,
      createdFiles,
      dependencies,
    );
    committed = commitResult.committed;
    commitSha = commitResult.commitSha;
    commitStatus = commitResult.status;
    commitError = commitResult.error;
  } else if (options.commit && scope === 'synced') {
    const recordPath = syncedRecordPath(absoluteScopeRoot, options.projectName);
    try {
      const recordCommit = await dependencies.commitRecordChange(
        options.repoRoot,
        [recordPath, ...(gitignoreChanged ? ['.gitignore'] : [])],
        `chore(oat): scaffold ${options.projectName}`,
        dependencies.gitRunner,
      );
      committed = recordCommit !== null;
      commitSha = recordCommit?.sha;
      commitStatus = recordCommit ? 'committed' : 'skipped_nothing';
    } catch (error) {
      commitStatus = 'failed';
      commitError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    mode,
    scope,
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
    ref,
    sha,
  };
}
