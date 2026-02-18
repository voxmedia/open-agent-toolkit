import { readdir, readFile, stat } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';
import {
  confirmAction,
  type MultiSelectChoice,
  type PromptContext,
  selectManyOrEmpty,
} from '@commands/shared/shared.prompts';
import { Command } from 'commander';
import type { CleanupActionRecord } from '../cleanup.types';
import type { ArtifactCleanupCandidate } from './artifacts.types';
import {
  filterArtifactCandidates,
  findDuplicateChains,
  findReferenceHits,
  selectLatestFromChain,
} from './artifacts.utils';

function toRepoRelativePath(repoRoot: string, targetPath: string): string {
  return relative(repoRoot, targetPath).replaceAll('\\', '/');
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
    const activeProjectPath = (
      await readFile(join(repoRoot, '.oat/active-project'), 'utf8')
    ).trim();
    if (activeProjectPath) {
      const resolvedActiveProject = isAbsolute(activeProjectPath)
        ? activeProjectPath
        : join(repoRoot, activeProjectPath);
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

export function createCleanupArtifactsCommand(): Command {
  return new Command('artifacts').description(
    'Cleanup stale review and external-plan artifacts',
  );
}
