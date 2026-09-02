import { stat } from 'node:fs/promises';
import {
  basename,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  listSyncedRecords,
  type SyncedProjectRecord,
} from '@commands/project/sync/record';
import {
  buildSyncTarget,
  classifyRemoteRefLookup,
} from '@commands/project/sync/ref-sync';
import {
  probeSyncedTerminalRefs,
  type SyncedTerminalRefProbe,
} from '@commands/project/sync/resolve-target';
import { parseFrontmatterField } from '@commands/shared/frontmatter';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
  completedSyncedRefName,
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
  probeSyncedTerminalRefs: typeof probeSyncedTerminalRefs;
  probeAuthoritativeCompletedRef: typeof probeAuthoritativeCompletedRef;
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
  probeSyncedTerminalRefs,
  probeAuthoritativeCompletedRef,
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
        ? project.recordError
          ? 'restore record from Git'
          : '—'
        : project.kind === 'recorded-invalid'
          ? 'restore record from Git'
          : project.kind === 'recorded-terminal'
            ? project.archiveSnapshot
              ? 'retry completion cleanup'
              : 'retry archive completion'
            : project.kind === 'terminal-invalid'
              ? 'repair terminal ref mismatch'
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

const ARCHIVE_RETRY_REASON =
  'archive snapshot is incomplete; retry oat-project-complete before retiring terminal state';
const RETIREMENT_RETRY_REASON =
  'archive is durable but legacy terminal cleanup remains; retry oat-project-complete';
const AUTHORITATIVE_COMPLETION_REASON =
  'completed ref is authoritative; remove the stale local checkout or active record with oat-project-complete';

function terminalMismatchReason(
  activeSha: string | null,
  completedSha: string | null,
  expectedSha?: string,
): string {
  return `terminal ref SHA mismatch: active ${activeSha ?? 'absent'}, completed ${completedSha ?? 'absent'}${expectedSha ? `, expected archived source ${expectedSha}` : ''}; repair the ref mismatch before retrying completion or prune`;
}

export function classifyLegacySyncedRecord(
  record: SyncedProjectRecord,
  path: string,
  probe?: SyncedTerminalRefProbe,
): Extract<
  ProjectListRow,
  { kind: 'recorded-absent' | 'recorded-terminal' | 'terminal-invalid' }
> {
  if (probe?.state === 'wrong-sha') {
    return {
      kind: 'terminal-invalid',
      name: record.slug,
      path,
      scope: 'synced',
      checkout: 'invalid',
      terminalState: 'ref-sha-mismatch',
      activeRef: probe.activeRef,
      completedRef: probe.completedRef,
      activeSha: probe.activeSha,
      completedSha: probe.completedSha,
      expectedSha: probe.expectedSha,
      phase: null,
      phaseStatus: null,
      workflowMode: null,
      lifecycle: 'complete',
      progress: null,
      recommendation: {
        skill: 'none',
        reason: terminalMismatchReason(
          probe.activeSha,
          probe.completedSha,
          probe.expectedSha,
        ),
      },
    };
  }

  if (probe?.state === 'completed-only' || probe?.state === 'both') {
    return {
      kind: 'recorded-terminal',
      name: record.slug,
      path,
      scope: 'synced',
      checkout: 'absent',
      terminalState: 'authoritative-completion',
      archiveSnapshot: record.archiveSnapshot ?? null,
      phase: null,
      phaseStatus: null,
      workflowMode: null,
      lifecycle: 'complete',
      progress: null,
      recommendation: {
        skill: 'none',
        reason: AUTHORITATIVE_COMPLETION_REASON,
      },
    };
  }

  if (record.status === 'complete') {
    return {
      kind: 'recorded-terminal',
      name: record.slug,
      path,
      scope: 'synced',
      checkout: 'absent',
      terminalState: 'legacy-completion',
      archiveSnapshot: record.archiveSnapshot ?? null,
      phase: null,
      phaseStatus: null,
      workflowMode: null,
      lifecycle: 'complete',
      progress: null,
      recommendation: {
        skill: 'none',
        reason: record.archiveSnapshot
          ? RETIREMENT_RETRY_REASON
          : ARCHIVE_RETRY_REASON,
      },
    };
  }

  return {
    kind: 'recorded-absent',
    name: record.slug,
    path,
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
  };
}

export async function probeAuthoritativeCompletedRef(
  target: ReturnType<typeof buildSyncTarget>,
  git: GitRunner,
): Promise<SyncedTerminalRefProbe | null> {
  const completedRef = completedSyncedRefName(target.slug);
  const lookup = await git.run(
    ['ls-remote', '--exit-code', target.remote, completedRef],
    { cwd: target.repoRoot, allowFailure: true },
  );
  if (
    classifyRemoteRefLookup(lookup, target.remote, completedRef) === 'absent'
  ) {
    return null;
  }
  const rows = lookup.stdout.split('\n').filter(Boolean);
  const [sha, ref] = rows[0]?.trim().split(/\s+/) ?? [];
  if (
    rows.length !== 1 ||
    ref !== completedRef ||
    !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(sha ?? '')
  ) {
    throw new CliError(
      `Unable to reconcile completed authority for ${target.slug}: origin returned a malformed completed-ref advertisement.`,
      2,
    );
  }
  return probeSyncedTerminalRefs(target, sha!, git);
}

function classifyMaterializedTerminalRow(
  row: Extract<ProjectListRow, { kind: 'materialized' }>,
  probe: SyncedTerminalRefProbe,
): ProjectListRow {
  const record: SyncedProjectRecord = {
    schemaVersion: 1,
    slug: row.name,
    scope: 'synced',
    ref: probe.activeRef,
    remote: 'origin',
    status: 'active',
    createdAt: new Date(0).toISOString(),
    completedAt: null,
  };
  const classified = classifyLegacySyncedRecord(record, row.path, probe);
  return classified.kind === 'recorded-terminal'
    ? { ...classified, checkout: 'present' }
    : classified;
}

function displayPath(repoRoot: string, absolutePath: string): string {
  return relative(repoRoot, absolutePath).split(sep).join('/');
}

async function collectProjectRows(
  repoRoot: string,
  projectsRoot: string,
  options: ProjectListOptions,
  context: CommandContext,
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
      const records = await dependencies.listSyncedRecords(root.path, {
        onInvalid: (path, error) => {
          const message =
            error instanceof Error ? error.message : String(error);
          const name = basename(path, extname(path));
          const materializedRow = rows.find(
            (row): row is Extract<ProjectListRow, { kind: 'materialized' }> =>
              row.scope === 'synced' &&
              row.kind === 'materialized' &&
              row.name === name,
          );
          if (materializedRow) {
            materializedRow.recordError = message;
            materializedRow.recommendation = {
              skill: 'none',
              reason: 'restore invalid record from a trusted Git revision',
            };
          } else {
            rows.push({
              kind: 'recorded-invalid',
              name,
              path: displayPath(repoRoot, path),
              scope: 'synced',
              checkout: 'invalid',
              recordError: message,
              phase: null,
              phaseStatus: null,
              workflowMode: null,
              lifecycle: null,
              progress: null,
              recommendation: {
                skill: 'none',
                reason: 'restore invalid record from a trusted Git revision',
              },
            });
          }
          context.logger.warn(
            `Skipping invalid synced project record ${displayPath(repoRoot, path)}: ${message}`,
          );
        },
      });
      for (const row of rows.filter(
        (
          candidate,
        ): candidate is Extract<ProjectListRow, { kind: 'materialized' }> =>
          candidate.scope === 'synced' && candidate.kind === 'materialized',
      )) {
        const target = buildSyncTarget(repoRoot, projectsRoot, row.name);
        const probe = await dependencies.probeAuthoritativeCompletedRef(
          target,
          dependencies.gitRunner,
        );
        if (!probe) continue;
        const index = rows.indexOf(row);
        rows[index] = classifyMaterializedTerminalRow(row, probe);
      }
      const represented = new Set(
        rows.filter((row) => row.scope === 'synced').map((row) => row.name),
      );
      for (const record of records) {
        if (!represented.has(record.slug)) {
          const target = buildSyncTarget(repoRoot, projectsRoot, record.slug);
          const authoritative =
            await dependencies.probeAuthoritativeCompletedRef(
              target,
              dependencies.gitRunner,
            );
          const probe =
            authoritative ??
            (record.archiveSourceRefSha
              ? await dependencies.probeSyncedTerminalRefs(
                  target,
                  record.archiveSourceRefSha,
                  dependencies.gitRunner,
                )
              : undefined);
          rows.push(
            classifyLegacySyncedRecord(
              record,
              displayPath(repoRoot, join(root.path, record.slug)),
              probe,
            ),
          );
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
    ['ls-remote', 'origin', 'refs/oat/projects/*', 'refs/oat/completed/*'],
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
  const refs = new Map<
    string,
    {
      activeRef?: string;
      activeSha?: string;
      completedRef?: string;
      completedSha?: string;
    }
  >();
  for (const line of remote.stdout.split('\n')) {
    const [sha, ref] = line.trim().split(/\s+/);
    const activePrefix = 'refs/oat/projects/';
    const completedPrefix = 'refs/oat/completed/';
    const prefix = ref?.startsWith(activePrefix)
      ? activePrefix
      : ref?.startsWith(completedPrefix)
        ? completedPrefix
        : null;
    if (!sha || !ref || !prefix) continue;
    const name = ref.slice(prefix.length);
    if (!name) continue;
    const entry = refs.get(name) ?? {};
    if (prefix === activePrefix) {
      entry.activeRef = ref;
      entry.activeSha = sha;
    } else {
      entry.completedRef = ref;
      entry.completedSha = sha;
    }
    refs.set(name, entry);
  }
  for (const [name, refState] of refs) {
    if (localSlugs.has(name) || !refState.activeRef) continue;
    if (refState.completedRef && refState.completedSha === refState.activeSha) {
      continue;
    }
    if (refState.completedRef && refState.completedSha && refState.activeSha) {
      rows.push({
        kind: 'terminal-invalid',
        name,
        scope: 'synced',
        checkout: 'invalid',
        terminalState: 'ref-sha-mismatch',
        activeRef: refState.activeRef,
        completedRef: refState.completedRef,
        activeSha: refState.activeSha,
        completedSha: refState.completedSha,
        phase: null,
        phaseStatus: null,
        workflowMode: null,
        lifecycle: 'complete',
        progress: null,
        recommendation: {
          skill: 'none',
          reason: terminalMismatchReason(
            refState.activeSha,
            refState.completedSha,
          ),
        },
      });
      continue;
    }
    rows.push({
      kind: 'remote',
      name,
      scope: 'synced',
      origin: 'remote',
      checkout: 'absent',
      ref: refState.activeRef,
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
      context,
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
