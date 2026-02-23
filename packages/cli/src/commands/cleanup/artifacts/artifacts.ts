import { readdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  confirmAction,
  type MultiSelectChoice,
  type PromptContext,
  selectManyOrEmpty,
} from '@commands/shared/shared.prompts';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { readOatLocalConfig } from '@config/oat-config';
import { CliError } from '@errors/cli-error';
import { ensureDir } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';
import type { CleanupActionRecord, CleanupJsonPayload } from '../cleanup.types';
import { createCleanupPayload, toRepoRelativePath } from '../cleanup.utils';
import type { ArtifactCleanupCandidate } from './artifacts.types';
import {
  buildArchiveTargetPath,
  filterArtifactCandidates,
  findDuplicateChains,
  findReferenceHits,
  selectLatestFromChain,
} from './artifacts.utils';

export interface CleanupArtifactsRunOptions {
  repoRoot: string;
  apply?: boolean;
  allCandidates?: boolean;
  yes?: boolean;
  interactive?: boolean;
  timestamp?: string;
}

interface CleanupArtifactsCommandDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  runCleanupArtifacts: (
    options: CleanupArtifactsRunOptions,
  ) => Promise<CleanupJsonPayload>;
}

interface CleanupArtifactsRunDependencies {
  runInteractiveStaleTriage: typeof runInteractiveStaleTriage;
}

function defaultRunDependencies(): CleanupArtifactsRunDependencies {
  return {
    runInteractiveStaleTriage,
  };
}

function defaultCommandDependencies(): CleanupArtifactsCommandDependencies {
  return {
    buildCommandContext,
    resolveProjectRoot,
    runCleanupArtifacts,
  };
}

async function pathIsDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function collectMarkdownFiles(root: string): Promise<string[]> {
  if (!(await pathIsDirectory(root))) {
    return [];
  }

  const files: string[] = [];
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

export function planDuplicatePruneActions(
  candidates: string[],
): CleanupActionRecord[] {
  const actions: CleanupActionRecord[] = [];
  const chains = findDuplicateChains(candidates);

  for (const chain of chains) {
    const latest = selectLatestFromChain(chain);
    for (const entry of chain.entries) {
      if (entry.target === latest) {
        continue;
      }

      actions.push({
        type: 'delete',
        target: entry.target,
        reason: `duplicate chain prune (latest kept: ${latest})`,
        phase: 'duplicate-prune',
        result: 'planned',
      });
    }
  }

  return actions;
}

export async function discoverArtifactCandidates(
  repoRoot: string,
  excludedTargets: string[] = [],
): Promise<string[]> {
  const roots = [
    join(repoRoot, '.oat/repo/reviews'),
    join(repoRoot, '.oat/repo/reference/external-plans'),
  ];
  const files = (
    await Promise.all(roots.map((root) => collectMarkdownFiles(root)))
  ).flat();
  const candidates = files
    .map((filePath) => toRepoRelativePath(repoRoot, filePath))
    .sort((left, right) => left.localeCompare(right));
  return filterArtifactCandidates(candidates, new Set(excludedTargets));
}

async function collectReferenceContents(repoRoot: string): Promise<string[]> {
  const contents: string[] = [];
  const repoReferenceFiles = await collectMarkdownFiles(
    join(repoRoot, '.oat/repo/reference'),
  );

  let activeProjectFiles: string[] = [];
  try {
    const localConfig = await readOatLocalConfig(repoRoot);
    const activeProjectPath = localConfig.activeProject?.trim();
    if (activeProjectPath) {
      const resolvedActiveProject = join(repoRoot, activeProjectPath);
      activeProjectFiles = await collectMarkdownFiles(resolvedActiveProject);
    }
  } catch {
    activeProjectFiles = [];
  }

  for (const filePath of [...repoReferenceFiles, ...activeProjectFiles]) {
    try {
      contents.push(await readFile(filePath, 'utf8'));
    } catch {
      // Ignore unreadable files and continue scanning.
    }
  }

  return contents;
}

export async function findReferencedArtifactCandidates(
  repoRoot: string,
  candidates: string[],
): Promise<Set<string>> {
  const contents = await collectReferenceContents(repoRoot);
  return findReferenceHits(candidates, contents);
}

export interface NonInteractiveDeleteOptions {
  allCandidates: boolean;
  yes: boolean;
}

export function planNonInteractiveArtifactActions(
  candidates: ArtifactCleanupCandidate[],
  options: NonInteractiveDeleteOptions,
): CleanupActionRecord[] {
  if (!options.allCandidates || !options.yes) {
    return candidates.map((candidate) => ({
      type: 'skip',
      target: candidate.target,
      reason:
        'non-interactive stale deletion skipped; pass --all-candidates --yes to enable deletion',
      phase: 'safety-gates',
      result: 'skipped',
    }));
  }

  return candidates.map((candidate) => {
    if (candidate.referenced) {
      return {
        type: 'block',
        target: candidate.target,
        reason:
          'candidate is referenced and blocked from non-interactive deletion',
        phase: 'safety-gates',
        result: 'blocked',
      } satisfies CleanupActionRecord;
    }

    return {
      type: 'delete',
      target: candidate.target,
      reason:
        'non-interactive stale deletion approved (--all-candidates --yes)',
      phase: 'safety-gates',
      result: 'planned',
    } satisfies CleanupActionRecord;
  });
}

export function planArchiveActions(
  targets: string[],
  existingTargets: Set<string>,
  timestamp: string,
): CleanupActionRecord[] {
  return targets.map((target) => {
    const archiveTarget = buildArchiveTargetPath(
      target,
      existingTargets,
      timestamp,
    );
    existingTargets.add(archiveTarget);
    return {
      type: 'archive',
      target: archiveTarget,
      reason: `archive stale artifact from ${target}`,
      phase: 'archive',
      result: 'planned',
    } satisfies CleanupActionRecord;
  });
}

export interface InteractiveTriageResult {
  keep: string[];
  archive: string[];
  delete: string[];
}

interface InteractiveTriageDependencies {
  selectManyOrEmpty: <T extends string>(
    message: string,
    choices: MultiSelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T[]>;
  confirmAction: (message: string, ctx: PromptContext) => Promise<boolean>;
}

function defaultInteractiveDependencies(): InteractiveTriageDependencies {
  return {
    selectManyOrEmpty,
    confirmAction,
  };
}

export async function runInteractiveStaleTriage(
  candidates: ArtifactCleanupCandidate[],
  ctx: PromptContext,
  overrides: Partial<InteractiveTriageDependencies> = {},
): Promise<InteractiveTriageResult> {
  const dependencies = {
    ...defaultInteractiveDependencies(),
    ...overrides,
  };
  const candidateMap = new Map(
    candidates.map((candidate) => [candidate.target, candidate]),
  );
  const baseChoices: MultiSelectChoice<string>[] = candidates.map(
    (candidate) => ({
      label: candidate.target,
      value: candidate.target,
      description: candidate.referenced ? 'referenced' : 'unreferenced',
    }),
  );

  const archive = await dependencies.selectManyOrEmpty(
    'Select stale artifacts to archive',
    baseChoices,
    ctx,
  );
  const remaining = candidates.filter(
    (candidate) => !archive.includes(candidate.target),
  );
  const deleteChoices: MultiSelectChoice<string>[] = remaining.map(
    (candidate) => ({
      label: candidate.target,
      value: candidate.target,
      description: candidate.referenced ? 'referenced' : 'unreferenced',
    }),
  );
  let toDelete = await dependencies.selectManyOrEmpty(
    'Select stale artifacts to delete',
    deleteChoices,
    ctx,
  );

  const referencedSelectedForDelete = toDelete.filter(
    (target) => candidateMap.get(target)?.referenced === true,
  );
  if (referencedSelectedForDelete.length > 0) {
    const confirmed = await dependencies.confirmAction(
      'Some selected delete targets are referenced. Delete anyway?',
      ctx,
    );
    if (!confirmed) {
      toDelete = toDelete.filter(
        (target) => !referencedSelectedForDelete.includes(target),
      );
    }
  }

  const keep = candidates
    .map((candidate) => candidate.target)
    .filter((target) => !archive.includes(target) && !toDelete.includes(target))
    .sort((left, right) => left.localeCompare(right));

  return {
    keep,
    archive: [...archive].sort((left, right) => left.localeCompare(right)),
    delete: [...toDelete].sort((left, right) => left.localeCompare(right)),
  };
}

async function collectArchiveTargets(repoRoot: string): Promise<Set<string>> {
  const files = await collectMarkdownFiles(join(repoRoot, '.oat/repo/archive'));
  return new Set(
    files.map((filePath) => toRepoRelativePath(repoRoot, filePath)),
  );
}

function buildDryRunStaleActions(
  candidates: ArtifactCleanupCandidate[],
): CleanupActionRecord[] {
  return candidates.map((candidate) =>
    candidate.referenced
      ? ({
          type: 'block',
          target: candidate.target,
          reason:
            'candidate is referenced and requires explicit operator decision',
          phase: 'stale-candidates',
          result: 'blocked',
        } satisfies CleanupActionRecord)
      : ({
          type: 'delete',
          target: candidate.target,
          reason: 'stale candidate detected (dry-run)',
          phase: 'stale-candidates',
          result: 'planned',
        } satisfies CleanupActionRecord),
  );
}

function buildInteractiveDeleteActions(
  targets: string[],
): CleanupActionRecord[] {
  return targets.map(
    (target) =>
      ({
        type: 'delete',
        target,
        reason: 'interactive stale triage delete selection',
        phase: 'interactive-triage',
        result: 'planned',
      }) satisfies CleanupActionRecord,
  );
}

function buildInteractiveKeepActions(targets: string[]): CleanupActionRecord[] {
  return targets.map(
    (target) =>
      ({
        type: 'skip',
        target,
        reason: 'interactive stale triage keep selection',
        phase: 'interactive-triage',
        result: 'skipped',
      }) satisfies CleanupActionRecord,
  );
}

function parseArchiveSourceTarget(action: CleanupActionRecord): string {
  const prefix = 'archive stale artifact from ';
  if (!action.reason.startsWith(prefix)) {
    throw new CliError(
      `Invalid archive action metadata for target ${action.target}`,
      2,
    );
  }

  return action.reason.slice(prefix.length);
}

async function applyArtifactAction(
  repoRoot: string,
  action: CleanupActionRecord,
): Promise<CleanupActionRecord> {
  if (action.result !== 'planned') {
    return action;
  }

  if (action.type === 'delete') {
    await rm(join(repoRoot, action.target), { force: true });
    return { ...action, result: 'applied' };
  }

  if (action.type === 'archive') {
    const sourceTarget = parseArchiveSourceTarget(action);
    const sourcePath = join(repoRoot, sourceTarget);
    const archivePath = join(repoRoot, action.target);
    await ensureDir(dirname(archivePath));
    await rename(sourcePath, archivePath);
    return { ...action, result: 'applied' };
  }

  return action;
}

function formatCleanupArtifactsPlan(payload: CleanupJsonPayload): string {
  const lines: string[] = [
    `cleanup artifacts (${payload.mode})`,
    `status: ${payload.status}`,
    `summary: scanned=${payload.summary.scanned}, issues=${payload.summary.issuesFound}, planned=${payload.summary.planned}, applied=${payload.summary.applied}, skipped=${payload.summary.skipped}, blocked=${payload.summary.blocked}`,
  ];

  if (payload.actions.length === 0) {
    lines.push('actions: none');
    return lines.join('\n');
  }

  lines.push('actions:');
  for (const action of payload.actions) {
    lines.push(`- ${action.type} ${action.target} (${action.reason})`);
  }

  return lines.join('\n');
}

export async function runCleanupArtifacts(
  {
    repoRoot,
    apply = false,
    allCandidates = false,
    yes = false,
    interactive = false,
    timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14),
  }: CleanupArtifactsRunOptions,
  overrides: Partial<CleanupArtifactsRunDependencies> = {},
): Promise<CleanupJsonPayload> {
  const dependencies = {
    ...defaultRunDependencies(),
    ...overrides,
  };

  const allCandidateTargets = await discoverArtifactCandidates(repoRoot);
  const duplicatePruneActions = planDuplicatePruneActions(allCandidateTargets);
  const staleTargets = await discoverArtifactCandidates(
    repoRoot,
    duplicatePruneActions.map((action) => action.target),
  );
  const referenceHits = await findReferencedArtifactCandidates(
    repoRoot,
    staleTargets,
  );
  const staleCandidates = staleTargets.map((target) => ({
    target,
    referenced: referenceHits.has(target),
  }));

  let staleActions: CleanupActionRecord[] = [];
  if (!apply) {
    staleActions = buildDryRunStaleActions(staleCandidates);
  } else if (interactive && !allCandidates && !yes) {
    const triage = await dependencies.runInteractiveStaleTriage(
      staleCandidates,
      { interactive },
    );
    const existingArchiveTargets = await collectArchiveTargets(repoRoot);
    staleActions = [
      ...planArchiveActions(triage.archive, existingArchiveTargets, timestamp),
      ...buildInteractiveDeleteActions(triage.delete),
      ...buildInteractiveKeepActions(triage.keep),
    ];
  } else {
    staleActions = planNonInteractiveArtifactActions(staleCandidates, {
      allCandidates,
      yes,
    });
  }

  const plannedActions = [...duplicatePruneActions, ...staleActions];
  const issuesFound = duplicatePruneActions.length + staleCandidates.length;
  const scanned = allCandidateTargets.length;

  if (!apply) {
    return createCleanupPayload({
      status: issuesFound > 0 ? 'drift' : 'ok',
      apply: false,
      scanned,
      issuesFound,
      actions: plannedActions,
    });
  }

  const appliedActions: CleanupActionRecord[] = [];
  for (const action of plannedActions) {
    appliedActions.push(await applyArtifactAction(repoRoot, action));
  }

  const unresolved = appliedActions.some(
    (action) => action.result !== 'applied',
  );
  return createCleanupPayload({
    status: unresolved ? 'drift' : 'ok',
    apply: true,
    scanned,
    issuesFound,
    actions: appliedActions,
  });
}

export function createCleanupArtifactsCommand(
  overrides: Partial<CleanupArtifactsCommandDependencies> = {},
): Command {
  const dependencies = {
    ...defaultCommandDependencies(),
    ...overrides,
  };

  return new Command('artifacts')
    .description('Cleanup stale review and external-plan artifacts')
    .option('--apply', 'Apply cleanup changes (default is dry-run)')
    .option(
      '--all-candidates',
      'Allow non-interactive stale cleanup candidates in apply mode',
    )
    .option('--yes', 'Confirm non-interactive stale cleanup mutations')
    .action(
      async (
        options: { apply?: boolean; allCandidates?: boolean; yes?: boolean },
        command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );

        try {
          const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
          const payload = await dependencies.runCleanupArtifacts({
            repoRoot,
            apply: options.apply ?? false,
            allCandidates: options.allCandidates ?? false,
            yes: options.yes ?? false,
            interactive: context.interactive,
          });

          if (context.json) {
            context.logger.json(payload);
          } else {
            context.logger.info(formatCleanupArtifactsPlan(payload));
          }

          process.exitCode = payload.status === 'ok' ? 0 : 1;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          if (context.json) {
            context.logger.json({ status: 'error', message });
          } else {
            context.logger.error(message);
          }
          process.exitCode = error instanceof CliError ? error.exitCode : 2;
        }
      },
    );
}
