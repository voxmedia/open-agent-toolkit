import {
  lstat,
  readdir,
  readFile,
  readlink,
  realpath,
  stat,
} from 'node:fs/promises';
import { dirname, join, posix, relative, resolve } from 'node:path';

import {
  readOatConfig,
  resolveDocumentationContentRoot,
} from '@config/oat-config';

import type {
  InstructionSyncStrategy,
  InstructionActionRecord,
  InstructionEntry,
  InstructionsJsonPayload,
  InstructionsMode,
  InstructionsScanOptions,
  InstructionsScanDependencies,
  InstructionsStatus,
  InstructionsSummary,
} from './instructions.types';

export const EXPECTED_CLAUDE_CONTENT = '@AGENTS.md\n';
export const DEFAULT_INSTRUCTION_SYNC_STRATEGY: InstructionSyncStrategy =
  'pointer';

const ROOT_EXCLUDED_DIRECTORIES = new Set(['.git', '.oat', '.worktrees']);
const GLOBAL_EXCLUDED_DIRECTORIES = new Set(['node_modules']);

// The only excluded-subtree re-entry points: a root-level directory is excluded
// wholesale, but a named subdirectory holds tracked instruction files that
// sync/validate must manage, so it is carved back into the scan. `.oat` is
// excluded at the repo root, yet `.oat/repo/**` carries AGENTS.md/CLAUDE.md
// pairs; `.oat/templates`, `.oat/projects`, and `.oat/sync` stay unscanned.
const ROOT_EXCLUDED_DIRECTORY_CARVE_INS = new Map<string, string>([
  ['.oat', 'repo'],
]);

interface BuildInstructionsPayloadArgs {
  mode: InstructionsMode;
  entries: InstructionEntry[];
  actions: InstructionActionRecord[];
  excludedPaths?: string[];
}

interface InstructionDirectoryEntry {
  agentsPath?: string;
  brokenAgentsPath?: string;
  brokenAgentsErrorCode?: string;
  brokenClaudePath?: string;
  brokenClaudeErrorCode?: string;
  claudePath?: string;
}

async function directoryExists(
  dependencies: InstructionsScanDependencies,
  directoryPath: string,
): Promise<boolean> {
  try {
    const stats = await dependencies.stat(directoryPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

function getErrorCode(error: unknown): string | null {
  return error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : null;
}

function normalizeLineEndings(content: string): string {
  return content.replaceAll('\r\n', '\n');
}

export function resolveInstructionSyncStrategy(
  strategy?: InstructionSyncStrategy,
): InstructionSyncStrategy {
  return strategy ?? DEFAULT_INSTRUCTION_SYNC_STRATEGY;
}

function getValidInstructionDetail(strategy: InstructionSyncStrategy): string {
  switch (strategy) {
    case 'symlink':
      return 'symlink valid';
    case 'copy':
      return 'copy valid';
    default:
      return 'pointer valid';
  }
}

function getInvalidInstructionDetail(
  strategy: InstructionSyncStrategy,
): string {
  switch (strategy) {
    case 'symlink':
      return 'expected symlink to AGENTS.md';
    case 'copy':
      return 'expected hard copy of AGENTS.md content';
    default:
      return `expected ${JSON.stringify(EXPECTED_CLAUDE_CONTENT)}`;
  }
}

function toPosixPath(pathValue: string): string {
  return pathValue.replaceAll('\\', '/');
}

function normalizeEntries(entries: InstructionEntry[]): InstructionEntry[] {
  return [...entries].sort((left, right) => {
    const leftSortPath = left.agentsPath ?? left.claudePath;
    const rightSortPath = right.agentsPath ?? right.claudePath;
    return (
      leftSortPath.localeCompare(rightSortPath) ||
      left.claudePath.localeCompare(right.claudePath) ||
      left.status.localeCompare(right.status) ||
      left.detail.localeCompare(right.detail)
    );
  });
}

function normalizeActions(
  actions: InstructionActionRecord[],
): InstructionActionRecord[] {
  return [...actions].sort((left, right) => {
    return (
      left.target.localeCompare(right.target) ||
      left.type.localeCompare(right.type) ||
      left.result.localeCompare(right.result) ||
      left.reason.localeCompare(right.reason)
    );
  });
}

function recordInstructionFile(
  directoryEntries: Map<string, InstructionDirectoryEntry>,
  directoryPath: string,
  entryName: 'AGENTS.md' | 'CLAUDE.md',
  entryPath: string,
): void {
  const current = directoryEntries.get(directoryPath) ?? {};
  if (entryName === 'AGENTS.md') {
    current.agentsPath = entryPath;
    current.brokenAgentsPath = undefined;
    current.brokenAgentsErrorCode = undefined;
  } else {
    current.claudePath = entryPath;
    current.brokenClaudePath = undefined;
    current.brokenClaudeErrorCode = undefined;
  }
  directoryEntries.set(directoryPath, current);
}

/**
 * Canonicalize repo-relative exclusion entries into the exact form the scan
 * compares against: POSIX separators, collapsed `.` and `..` segments and
 * duplicate slashes, no trailing slash, de-duplicated, order-preserving.
 *
 * Full normalization is what makes the comparison trustworthy. The scan tests
 * an exclusion against `relative(repoRoot, entryPath)`, which is always
 * already-normalized, so an un-normalized entry like `apps/./docs` or
 * `apps//docs` would silently never match and quietly fail open.
 *
 * Two classes of entry are dropped rather than normalized:
 *
 * - anything resolving to the repository root (`.`, `` , `./`), because
 *   excluding the root would silence the entire scan — including the
 *   `.oat/repo` carve-in — from one stray config value; and
 * - absolute paths and entries escaping the repository (`..`, `../x`), which
 *   can never name a directory inside the tree being scanned. Dropping them
 *   keeps a malformed value from masquerading as a matchable exclusion.
 */
export function normalizeExcludedPaths(
  excludedPaths: readonly string[] = [],
): string[] {
  const normalized: string[] = [];

  for (const candidate of excludedPaths) {
    const trimmed = toPosixPath(candidate.trim());
    if (!trimmed || posix.isAbsolute(trimmed)) {
      continue;
    }

    const posixPath = posix.normalize(trimmed).replace(/\/+$/, '');
    if (
      !posixPath ||
      posixPath === '.' ||
      posixPath === '..' ||
      posixPath.startsWith('../')
    ) {
      continue;
    }

    if (!normalized.includes(posixPath)) {
      normalized.push(posixPath);
    }
  }

  return normalized;
}

/**
 * The directories `oat instructions sync` and `oat instructions validate` skip:
 * the derived documentation content root first, then the explicit
 * `documentation.instructionPointerExcludes` opt-outs.
 *
 * Both commands resolve exclusions through this one function. That is the
 * property that matters: if they computed exclusions separately, validate
 * could report drift in a directory sync refuses to touch, and the repository
 * would have no clean state to reach.
 *
 * Nothing here deletes or rewrites an existing pointer. Excluding a directory
 * only stops it being reported and written; a `CLAUDE.md` already inside an
 * excluded tree is left exactly as it is.
 */
export async function resolveInstructionPointerExcludes(
  repoRoot: string,
): Promise<string[]> {
  const config = await readOatConfig(repoRoot);
  const contentRoot = await resolveDocumentationContentRoot(repoRoot, config);

  return normalizeExcludedPaths([
    ...(contentRoot ? [contentRoot] : []),
    ...(config.documentation?.instructionPointerExcludes ?? []),
  ]);
}

async function scanInstructionDirectories(
  repoRoot: string,
  dependencies: InstructionsScanDependencies,
  debug?: (message: string) => void,
  excludedPaths: ReadonlySet<string> = new Set<string>(),
): Promise<Map<string, InstructionDirectoryEntry>> {
  const queue = [repoRoot];
  const directoryEntries = new Map<string, InstructionDirectoryEntry>();

  while (queue.length > 0) {
    const currentDirectory = queue.shift();
    if (!currentDirectory) {
      continue;
    }

    let entries: Awaited<ReturnType<InstructionsScanDependencies['readdir']>>;
    try {
      entries = await dependencies.readdir(currentDirectory, {
        withFileTypes: true,
      });
    } catch (error) {
      const errorCode = getErrorCode(error);
      debug?.(
        `Skipping directory scan for ${toPosixPath(currentDirectory)} (${errorCode ?? 'unknown error'})`,
      );
      continue;
    }

    for (const entry of entries) {
      const entryPath = join(currentDirectory, entry.name);
      const isRootLevel = currentDirectory === repoRoot;

      if (entry.isDirectory()) {
        if (GLOBAL_EXCLUDED_DIRECTORIES.has(entry.name)) {
          continue;
        }
        if (isRootLevel && ROOT_EXCLUDED_DIRECTORIES.has(entry.name)) {
          const carveIn = ROOT_EXCLUDED_DIRECTORY_CARVE_INS.get(entry.name);
          if (carveIn) {
            const carveInPath = join(entryPath, carveIn);
            if (await directoryExists(dependencies, carveInPath)) {
              queue.push(carveInPath);
            }
          }
          continue;
        }
        // Deliberately after the carve-in above, never before it: the carve-in
        // path is already queued by the time a configured exclusion is tested,
        // so excluding `.oat` (or any documentation root that happens to
        // contain one) still leaves `.oat/repo/**` scanned. Skipping the
        // directory here also skips its whole subtree, because a directory
        // that is never queued is never read.
        if (excludedPaths.size > 0) {
          const relativePath = toPosixPath(relative(repoRoot, entryPath));
          if (excludedPaths.has(relativePath)) {
            debug?.(`Skipping excluded directory ${relativePath}`);
            continue;
          }
        }
        queue.push(entryPath);
        continue;
      }

      if (entry.isFile()) {
        if (entry.name === 'AGENTS.md' || entry.name === 'CLAUDE.md') {
          recordInstructionFile(
            directoryEntries,
            currentDirectory,
            entry.name,
            entryPath,
          );
        }
        continue;
      }

      if (!entry.isSymbolicLink()) {
        continue;
      }

      let entryStats: Awaited<ReturnType<InstructionsScanDependencies['stat']>>;
      try {
        entryStats = await dependencies.stat(entryPath);
      } catch (error) {
        const errorCode = getErrorCode(error);
        if (entry.name === 'CLAUDE.md') {
          const current = directoryEntries.get(currentDirectory) ?? {};
          current.claudePath = entryPath;
          current.brokenClaudePath = entryPath;
          current.brokenClaudeErrorCode = errorCode ?? 'unknown error';
          directoryEntries.set(currentDirectory, current);
          continue;
        }
        if (entry.name === 'AGENTS.md') {
          const current = directoryEntries.get(currentDirectory) ?? {};
          current.brokenAgentsPath = entryPath;
          current.brokenAgentsErrorCode = errorCode ?? 'unknown error';
          directoryEntries.set(currentDirectory, current);
          continue;
        }
        debug?.(
          `Skipping symlink target stat for ${toPosixPath(entryPath)} (${errorCode ?? 'unknown error'})`,
        );
        continue;
      }

      if (entryStats.isDirectory()) {
        continue;
      }

      if (
        entryStats.isFile() &&
        (entry.name === 'AGENTS.md' || entry.name === 'CLAUDE.md')
      ) {
        recordInstructionFile(
          directoryEntries,
          currentDirectory,
          entry.name,
          entryPath,
        );
      }
    }
  }

  return directoryEntries;
}

export async function scanInstructionFiles(
  repoRoot: string,
  options: InstructionsScanOptions = {},
  overrides: Partial<InstructionsScanDependencies> = {},
): Promise<InstructionEntry[]> {
  const strategy = resolveInstructionSyncStrategy(options.strategy);
  const dependencies: InstructionsScanDependencies = {
    lstat,
    realpath,
    readdir,
    readFile,
    readlink,
    stat,
    ...overrides,
  };

  const instructionDirectories = await scanInstructionDirectories(
    repoRoot,
    dependencies,
    options.debug,
    new Set(normalizeExcludedPaths(options.excludedPaths)),
  );
  const entries: InstructionEntry[] = [];

  for (const [directoryPath, directoryEntry] of instructionDirectories) {
    const agentsPath = directoryEntry.agentsPath ?? null;
    const brokenAgentsPath = directoryEntry.brokenAgentsPath ?? null;
    const brokenAgentsErrorCode =
      directoryEntry.brokenAgentsErrorCode ?? 'unknown error';
    const brokenClaudePath = directoryEntry.brokenClaudePath ?? null;
    const brokenClaudeErrorCode =
      directoryEntry.brokenClaudeErrorCode ?? 'unknown error';
    const claudePath =
      directoryEntry.claudePath ?? join(directoryPath, 'CLAUDE.md');

    if (!agentsPath && brokenAgentsPath) {
      entries.push({
        agentsPath: brokenAgentsPath,
        claudePath,
        status: 'content_mismatch',
        detail:
          brokenAgentsErrorCode === 'ENOENT'
            ? 'broken AGENTS.md symlink'
            : `unreadable AGENTS.md symlink target (${brokenAgentsErrorCode})`,
      });
      continue;
    }

    if (brokenClaudePath) {
      entries.push({
        agentsPath,
        claudePath,
        status: 'content_mismatch',
        detail:
          brokenClaudeErrorCode === 'ENOENT'
            ? 'broken CLAUDE.md symlink'
            : `unreadable CLAUDE.md symlink target (${brokenClaudeErrorCode})`,
      });
      continue;
    }

    if (!agentsPath) {
      try {
        await dependencies.readFile(claudePath, 'utf8');
      } catch (error) {
        entries.push({
          agentsPath: null,
          claudePath,
          status: 'content_mismatch',
          detail: `unable to read CLAUDE.md (${getErrorCode(error) ?? 'unknown'})`,
        });
        continue;
      }
      entries.push({
        agentsPath: null,
        claudePath,
        status: 'stray',
        detail: 'CLAUDE.md found without AGENTS.md',
      });
      continue;
    }

    let claudeStats;
    try {
      claudeStats = await dependencies.lstat(claudePath);
    } catch (error) {
      const errorCode = getErrorCode(error);
      if (errorCode === 'ENOENT') {
        entries.push({
          agentsPath,
          claudePath,
          status: 'missing',
          detail: 'CLAUDE.md missing',
        });
      } else {
        entries.push({
          agentsPath,
          claudePath,
          status: 'content_mismatch',
          detail: `unable to read CLAUDE.md (${errorCode ?? 'unknown error'})`,
        });
      }
      continue;
    }

    if (strategy === 'symlink') {
      if (!claudeStats.isSymbolicLink()) {
        entries.push({
          agentsPath,
          claudePath,
          status: 'content_mismatch',
          detail: getInvalidInstructionDetail(strategy),
        });
        continue;
      }

      let claudeTarget: string;
      try {
        claudeTarget = await dependencies.readlink(claudePath);
      } catch (error) {
        const errorCode = getErrorCode(error);
        entries.push({
          agentsPath,
          claudePath,
          status: 'content_mismatch',
          detail: `unable to read CLAUDE.md symlink target (${errorCode ?? 'unknown error'})`,
        });
        continue;
      }

      const resolvedTarget = resolve(dirname(claudePath), claudeTarget);
      const [canonicalTarget, canonicalAgentsPath] = await Promise.all([
        dependencies.realpath(resolvedTarget).catch(() => resolvedTarget),
        dependencies.realpath(agentsPath).catch(() => agentsPath),
      ]);

      if (canonicalTarget === canonicalAgentsPath) {
        entries.push({
          agentsPath,
          claudePath,
          status: 'ok',
          detail: getValidInstructionDetail(strategy),
        });
      } else {
        entries.push({
          agentsPath,
          claudePath,
          status: 'content_mismatch',
          detail: getInvalidInstructionDetail(strategy),
        });
      }
      continue;
    }

    if (claudeStats.isSymbolicLink()) {
      entries.push({
        agentsPath,
        claudePath,
        status: 'content_mismatch',
        detail: getInvalidInstructionDetail(strategy),
      });
      continue;
    }

    let claudeContent: string;
    try {
      claudeContent = await dependencies.readFile(claudePath, 'utf8');
    } catch (error) {
      const errorCode = getErrorCode(error);
      if (errorCode === 'ENOENT') {
        entries.push({
          agentsPath,
          claudePath,
          status: 'missing',
          detail: 'CLAUDE.md missing',
        });
      } else {
        entries.push({
          agentsPath,
          claudePath,
          status: 'content_mismatch',
          detail: `unable to read CLAUDE.md (${errorCode ?? 'unknown error'})`,
        });
      }
      continue;
    }

    const expectedContent =
      strategy === 'copy'
        ? await (async () => {
            try {
              return await dependencies.readFile(agentsPath, 'utf8');
            } catch (error) {
              const errorCode = getErrorCode(error);
              entries.push({
                agentsPath,
                claudePath,
                status: 'content_mismatch',
                detail: `unable to read AGENTS.md (${errorCode ?? 'unknown error'})`,
              });
              return null;
            }
          })()
        : EXPECTED_CLAUDE_CONTENT;

    if (expectedContent === null) {
      continue;
    }

    if (
      normalizeLineEndings(claudeContent) ===
      normalizeLineEndings(expectedContent)
    ) {
      entries.push({
        agentsPath,
        claudePath,
        status: 'ok',
        detail: getValidInstructionDetail(strategy),
      });
    } else {
      entries.push({
        agentsPath,
        claudePath,
        status: 'content_mismatch',
        detail: getInvalidInstructionDetail(strategy),
      });
    }
  }

  return normalizeEntries(entries);
}

export function buildInstructionsSummary(
  entries: InstructionEntry[],
  actions: InstructionActionRecord[],
): InstructionsSummary {
  const normalizedEntries = normalizeEntries(entries);
  const normalizedActions = normalizeActions(actions);

  return {
    scanned: normalizedEntries.length,
    ok: normalizedEntries.filter((entry) => entry.status === 'ok').length,
    missing: normalizedEntries.filter((entry) => entry.status === 'missing')
      .length,
    contentMismatch: normalizedEntries.filter(
      (entry) => entry.status === 'content_mismatch',
    ).length,
    stray: normalizedEntries.filter((entry) => entry.status === 'stray').length,
    created: normalizedActions.filter((action) => action.type === 'create')
      .length,
    updated: normalizedActions.filter((action) => action.type === 'update')
      .length,
    skipped: normalizedActions.filter((action) => action.result === 'skipped')
      .length,
  };
}

function deriveInstructionsStatus(
  entries: InstructionEntry[],
  actions: InstructionActionRecord[],
): InstructionsStatus {
  if (
    entries.some((entry) => entry.status !== 'ok') ||
    actions.some((action) => action.result === 'skipped')
  ) {
    return 'drift';
  }

  return 'ok';
}

export function buildInstructionsPayload({
  mode,
  entries,
  actions,
  excludedPaths,
}: BuildInstructionsPayloadArgs): InstructionsJsonPayload {
  const normalizedEntries = normalizeEntries(entries);
  const normalizedActions = normalizeActions(actions);
  const normalizedExcludedPaths = normalizeExcludedPaths(excludedPaths);

  return {
    mode,
    status: deriveInstructionsStatus(normalizedEntries, normalizedActions),
    summary: buildInstructionsSummary(normalizedEntries, normalizedActions),
    entries: normalizedEntries,
    actions: normalizedActions,
    // Omitted rather than emitted empty, so a repository with no documentation
    // root keeps its existing payload shape exactly.
    ...(normalizedExcludedPaths.length > 0
      ? { excludedPaths: normalizedExcludedPaths }
      : {}),
  };
}

export function formatInstructionsReport(
  payload: InstructionsJsonPayload,
  repoRoot?: string,
): string {
  const lines = [
    `instructions ${payload.mode}`,
    `status: ${payload.status}`,
    `summary: scanned=${payload.summary.scanned}, ok=${payload.summary.ok}, missing=${payload.summary.missing}, content_mismatch=${payload.summary.contentMismatch}, stray=${payload.summary.stray}, created=${payload.summary.created}, updated=${payload.summary.updated}, skipped=${payload.summary.skipped}`,
  ];

  if (payload.entries.length === 0) {
    lines.push('entries: none');
  } else {
    lines.push('entries:');
    for (const entry of payload.entries) {
      const displayPath = entry.agentsPath ?? entry.claudePath;
      const relativePath = repoRoot
        ? toPosixPath(relative(repoRoot, displayPath)) || '.'
        : toPosixPath(displayPath);
      lines.push(`- ${relativePath} -> ${entry.status} (${entry.detail})`);
    }
  }

  if (payload.actions.length === 0) {
    lines.push('actions: none');
  } else {
    lines.push('actions:');
    for (const action of payload.actions) {
      const target = repoRoot
        ? toPosixPath(relative(repoRoot, action.target)) || '.'
        : toPosixPath(action.target);
      lines.push(
        `- ${action.type} ${target} (${action.reason}) [${action.result}]`,
      );
    }
  }

  return lines.join('\n');
}
