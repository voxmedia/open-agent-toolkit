import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
  rollbackCreatedSyncedProject,
} from '@commands/project/sync/ref-sync';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
  PROJECT_SCOPES,
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
import { dirExists, fileExists } from '@fs/io';
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
  rollbackCreatedSyncedProject: typeof rollbackCreatedSyncedProject;
  writeSyncedRecord: typeof writeSyncedRecord;
  applyOatCoreGitignore: typeof applyOatCoreGitignore;
  isSyncedRuleApplied: typeof isSyncedRuleApplied;
  setActiveProject: typeof setActiveProject;
}

const DEFAULT_DEPENDENCIES: ScaffoldProjectDependencies = {
  resolveDefaultScope,
  gitRunner: defaultGitRunner,
  createSyncedProject,
  pushSynced,
  commitRecordChange,
  rollbackCreatedSyncedProject,
  writeSyncedRecord,
  applyOatCoreGitignore,
  isSyncedRuleApplied,
  setActiveProject,
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
    throw new CliError(
      `Invalid project name "${name}". Project names must not start with a dash.`,
      1,
    );
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new CliError(
      `Invalid project name "${name}". Use only letters, numbers, dash, and underscore.`,
      1,
    );
  }
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
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
  absoluteProjectPath: string,
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
  const pathspecs = createdFiles.map((file) => join(absoluteProjectPath, file));

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
  absoluteProjectPath: string,
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
    const dest = join(absoluteProjectPath, templateFile);

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
  absoluteProjectPath: string,
  projectName: string,
  today: string,
): Promise<'created' | 'skipped'> {
  const templateFile = 'project-log.md';
  const dest = join(absoluteProjectPath, templateFile);
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
  absoluteProjectPath: string,
  mode: ProjectScaffoldMode,
): Promise<void> {
  await mkdir(absoluteProjectPath, { recursive: true });
  await mkdir(join(absoluteProjectPath, 'reviews'), { recursive: true });
  await mkdir(join(absoluteProjectPath, 'pr'), { recursive: true });

  if (mode === 'import') {
    const referencesDir = join(absoluteProjectPath, 'references');
    await mkdir(referencesDir, { recursive: true });
    const gitkeepPath = join(referencesDir, '.gitkeep');
    if (!(await fileExists(gitkeepPath))) {
      await writeFile(gitkeepPath, '', 'utf8');
    }
  }
}

interface GitignoreRepair {
  changed: boolean;
  before: string | null | undefined;
}

async function ensureScopedProjectIgnored(
  repoRoot: string,
  absoluteScopeRoot: string,
  scope: 'local' | 'synced',
  dependencies: ScaffoldProjectDependencies,
): Promise<GitignoreRepair> {
  const scopeRelative = relative(resolve(repoRoot), absoluteScopeRoot);
  if (
    scopeRelative === '..' ||
    scopeRelative.startsWith('../') ||
    scopeRelative.startsWith('..\\') ||
    isAbsolute(scopeRelative)
  ) {
    return { changed: false, before: undefined };
  }

  const probe = join(absoluteScopeRoot, '__probe__', 'artifact.md');
  const ignored = await dependencies.gitRunner.run(
    ['check-ignore', '--quiet', '--no-index', probe],
    { cwd: repoRoot, allowFailure: true },
  );
  if (ignored.code === 0) return { changed: false, before: undefined };
  if (ignored.code !== 1) {
    throw new CliError(
      `git check-ignore failed (exit ${ignored.code}): ${ignored.stderr || ignored.stdout || 'unknown Git error'}`,
      2,
    );
  }

  const gitignorePath = join(repoRoot, '.gitignore');
  const before = (await fileExists(gitignorePath))
    ? await readFile(gitignorePath, 'utf8')
    : null;
  if (!(await dependencies.isSyncedRuleApplied(repoRoot))) {
    await dependencies.applyOatCoreGitignore(repoRoot);
  }
  const repaired = await dependencies.gitRunner.run(
    ['check-ignore', '--quiet', '--no-index', probe],
    { cwd: repoRoot, allowFailure: true },
  );
  if (repaired.code === 0) {
    return {
      changed:
        before === null || (await readFile(gitignorePath, 'utf8')) !== before,
      before,
    };
  }
  if (repaired.code !== 1) {
    throw new CliError(
      `git check-ignore failed after applying the managed block (exit ${repaired.code}): ${repaired.stderr || repaired.stdout || 'unknown Git error'}`,
      2,
    );
  }
  const normalizedRoot = scopeRelative.split('\\').join('/');
  const rule =
    scope === 'local' ? `/${normalizedRoot}/**` : `/${normalizedRoot}/*/`;
  const current = (await fileExists(gitignorePath))
    ? await readFile(gitignorePath, 'utf8')
    : '';
  if (!current.split('\n').includes(rule)) {
    const separator = current === '' || current.endsWith('\n') ? '' : '\n';
    await writeFile(gitignorePath, `${current}${separator}${rule}\n`, 'utf8');
  }
  return {
    changed:
      before === null || (await readFile(gitignorePath, 'utf8')) !== before,
    before,
  };
}

async function assertCrossScopeSlugAvailable(
  repoRoot: string,
  projectsRoot: string,
  projectName: string,
  targetScope: ProjectScope,
  dependencies: ScaffoldProjectDependencies,
): Promise<void> {
  const collisions: ProjectScope[] = [];
  for (const scope of PROJECT_SCOPES) {
    if (scope === targetScope) continue;
    const scopeRoot = resolveScopeRoot(repoRoot, projectsRoot, scope);
    if (await dirExists(join(scopeRoot, projectName))) {
      collisions.push(scope);
      continue;
    }
    if (
      scope === 'synced' &&
      (await fileExists(syncedRecordPath(scopeRoot, projectName)))
    ) {
      collisions.push(scope);
    }
  }

  if (targetScope !== 'synced' && !collisions.includes('synced')) {
    const workTree = await dependencies.gitRunner.run(
      ['rev-parse', '--is-inside-work-tree'],
      { cwd: repoRoot, allowFailure: true },
    );
    if (workTree.code === 0) {
      const syncedTarget = buildSyncTarget(repoRoot, projectsRoot, projectName);
      const localRef = await dependencies.gitRunner.run(
        ['show-ref', '--verify', '--quiet', syncedTarget.ref],
        { cwd: repoRoot, allowFailure: true },
      );
      if (localRef.code !== 0 && localRef.code !== 1) {
        throw new CliError(
          `Unable to check synced project collision for ${projectName}: ${localRef.stderr || localRef.stdout || 'git show-ref failed'}`,
          2,
        );
      }
      if (localRef.code === 0) {
        collisions.push('synced');
      }

      const remote = await dependencies.gitRunner.run(
        ['remote', 'get-url', 'origin'],
        { cwd: repoRoot, allowFailure: true },
      );
      if (remote.code === 0 && localRef.code === 1) {
        const remoteRef = await dependencies.gitRunner.run(
          ['ls-remote', '--exit-code', syncedTarget.remote, syncedTarget.ref],
          { cwd: repoRoot, allowFailure: true },
        );
        if (remoteRef.code === 0) {
          collisions.push('synced');
        } else if (remoteRef.code !== 2) {
          console.error(
            `Warning: unable to verify remote synced project collision for ${projectName}; continuing ${targetScope} project creation: ${remoteRef.stderr || remoteRef.stdout || 'git ls-remote failed'}`,
          );
        }
      }
    }
  }

  if (collisions.length > 0) {
    throw new CliError(
      `Project name "${projectName}" already exists in ${collisions.join(', ')} scope. Choose a unique name, or pass --force and use an explicit project path when opening the duplicate.`,
      1,
    );
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
  const relativeProjectPath = relative(
    resolve(options.repoRoot),
    absoluteProjectPath,
  );
  const projectPath =
    relativeProjectPath === '..' ||
    relativeProjectPath.startsWith('../') ||
    relativeProjectPath.startsWith('..\\') ||
    isAbsolute(relativeProjectPath)
      ? absoluteProjectPath
      : relativeProjectPath.split('\\').join('/');
  if (!options.force) {
    await assertCrossScopeSlugAvailable(
      options.repoRoot,
      projectsRoot,
      options.projectName,
      scope,
      dependencies,
    );
  }

  let gitignoreChanged = false;
  let gitignoreBefore: string | null | undefined;
  let syncTarget: ReturnType<typeof buildSyncTarget> | undefined;
  let syncedCreatedByInvocation = false;
  let published = false;
  let recordWritten = false;
  let ref: string | undefined;
  let sha: string | undefined;
  let committed = false;
  let commitSha: string | undefined;
  let commitStatus: CommitScaffoldStatus = 'skipped_disabled';
  let commitError: string | undefined;
  let createdFiles: string[] = [];
  let skippedFiles: string[] = [];

  try {
    if (scope === 'local') {
      const repair = await ensureScopedProjectIgnored(
        options.repoRoot,
        absoluteScopeRoot,
        scope,
        dependencies,
      );
      if (repair.changed) {
        console.error(
          'Warning: applied the OAT local-project rule to .gitignore before scaffolding.',
        );
      }
    }
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
      const repair = await ensureScopedProjectIgnored(
        options.repoRoot,
        absoluteScopeRoot,
        scope,
        dependencies,
      );
      gitignoreBefore = repair.before;
      gitignoreChanged = repair.changed;
      if (gitignoreChanged) {
        console.error(
          'Warning: applied the OAT synced-project rule to .gitignore before scaffolding.',
        );
      }
      syncTarget = buildSyncTarget(
        options.repoRoot,
        projectsRoot,
        options.projectName,
      );
      await dependencies.createSyncedProject(
        syncTarget,
        dependencies.gitRunner,
      );
      syncedCreatedByInvocation = true;
    }

    await ensureStructure(absoluteProjectPath, mode);
    ({ createdFiles, skippedFiles } = await scaffoldModeTemplates(
      userOatRoot,
      options.repoRoot,
      absoluteProjectPath,
      options.projectName,
      mode,
      today,
      nowUtc,
    ));
    const effectiveProjectLog =
      options.projectLog ??
      (await resolveEffectiveConfig(options.repoRoot, userOatRoot, env))
        .resolved['workflow.projectLog']?.value === true;
    if (effectiveProjectLog) {
      const projectLogResult = await scaffoldProjectLog(
        userOatRoot,
        options.repoRoot,
        absoluteProjectPath,
        options.projectName,
        today,
      );
      if (projectLogResult === 'created') {
        createdFiles.push('project-log.md');
      } else {
        skippedFiles.push('project-log.md');
      }
    }

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
      published = true;
      ref = syncTarget.ref;
      sha = pushed.sha;
      const recordPath = syncedRecordPath(
        absoluteScopeRoot,
        options.projectName,
      );
      await dependencies.writeSyncedRecord(
        recordPath,
        buildSyncedRecord(options.projectName, new Date(nowUtc)),
      );
      recordWritten = true;

      if (options.commit) {
        const recordCommit = await dependencies.commitRecordChange(
          options.repoRoot,
          [recordPath, ...(gitignoreChanged ? ['.gitignore'] : [])],
          `chore(oat): scaffold ${options.projectName}`,
          dependencies.gitRunner,
          { additionalAllowlistedPaths: [recordPath] },
        );
        committed = recordCommit !== null;
        commitSha = recordCommit?.sha;
        commitStatus = recordCommit ? 'committed' : 'skipped_nothing';
      }
    }
  } catch (error) {
    if (scope === 'synced' && syncTarget && !published) {
      if (syncedCreatedByInvocation) {
        await dependencies.rollbackCreatedSyncedProject(
          syncTarget,
          dependencies.gitRunner,
        );
      }
      if (gitignoreChanged && gitignoreBefore !== undefined) {
        const gitignorePath = join(options.repoRoot, '.gitignore');
        if (gitignoreBefore === null) {
          await rm(gitignorePath, { force: true });
        } else {
          await writeFile(gitignorePath, gitignoreBefore, 'utf8');
        }
      }
    }
    if (scope === 'synced' && published) {
      const detail = error instanceof Error ? error.message : String(error);
      if (!recordWritten) {
        throw new CliError(
          `Synced project ${options.projectName} was published, but its discovery record was not written: ${detail}. Run oat project pull '${options.projectName}' to resume record adoption; do not rerun project creation.`,
          2,
        );
      }
      const recordPath = syncedRecordPath(
        absoluteScopeRoot,
        options.projectName,
      );
      const relativeRecordPath = relative(options.repoRoot, recordPath)
        .split('\\')
        .join('/');
      throw new CliError(
        `Synced project ${options.projectName} and its discovery record were written, but the parent commit failed: ${detail}. Repair Git, then run git add -- '${relativeRecordPath}'${gitignoreChanged ? " '.gitignore'" : ''} && git commit -m 'chore(oat): scaffold ${options.projectName}' -- '${relativeRecordPath}'${gitignoreChanged ? " '.gitignore'" : ''}; do not rerun project creation.`,
        2,
      );
    }
    throw error;
  }

  let activePointerUpdated = false;
  if (setActive) {
    try {
      await dependencies.setActiveProject(options.repoRoot, projectPath);
      activePointerUpdated = true;
    } catch (error) {
      if (scope === 'synced' && published) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new CliError(
          `Synced project ${options.projectName} was published and recorded, but its active pointer was not updated: ${detail}. Run oat project open ${shellQuote(projectPath)} to complete recovery; do not rerun project creation.`,
          2,
        );
      }
      throw error;
    }
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

  if (options.commit && scope === 'shared') {
    // `projectPath` is relative to `repoRoot`, so git must run there for the
    // pathspecs to resolve to the scaffolded files.
    const commitResult = await commitScaffold(
      options.repoRoot,
      absoluteProjectPath,
      options.projectName,
      createdFiles,
      dependencies,
    );
    committed = commitResult.committed;
    commitSha = commitResult.commitSha;
    commitStatus = commitResult.status;
    commitError = commitResult.error;
  }

  return {
    mode,
    scope,
    projectsRoot,
    projectPath,
    createdFiles,
    skippedFiles,
    activePointerUpdated,
    dashboardRefreshed,
    committed,
    commitSha,
    commitStatus,
    commitError,
    ref,
    sha,
  };
}
