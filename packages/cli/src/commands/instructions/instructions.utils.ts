import { lstat, readdir, readFile, readlink, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

import type {
  InstructionSyncStrategy,
  InstructionActionRecord,
  InstructionEntry,
  InstructionsJsonPayload,
  InstructionsMode,
  InstructionsScanDependencies,
  InstructionsStatus,
  InstructionsSummary,
} from './instructions.types';

export const EXPECTED_CLAUDE_CONTENT = '@AGENTS.md\n';
export const DEFAULT_INSTRUCTION_SYNC_STRATEGY: InstructionSyncStrategy =
  'pointer';

const ROOT_EXCLUDED_DIRECTORIES = new Set(['.git', '.oat', '.worktrees']);
const GLOBAL_EXCLUDED_DIRECTORIES = new Set(['node_modules']);

interface BuildInstructionsPayloadArgs {
  mode: InstructionsMode;
  entries: InstructionEntry[];
  actions: InstructionActionRecord[];
}

interface InstructionDirectoryEntry {
  agentsPath?: string;
  claudePath?: string;
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
  } else {
    current.claudePath = entryPath;
  }
  directoryEntries.set(directoryPath, current);
}

async function scanInstructionDirectories(
  repoRoot: string,
  dependencies: InstructionsScanDependencies,
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
      dependencies.debug?.(
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
          continue;
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
        dependencies.debug?.(
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
  overrides: Partial<InstructionsScanDependencies> = {},
): Promise<InstructionEntry[]> {
  const strategy = resolveInstructionSyncStrategy(overrides.strategy);
  const dependencies: InstructionsScanDependencies = {
    lstat,
    readdir,
    readFile,
    readlink,
    stat,
    ...overrides,
  };

  const instructionDirectories = await scanInstructionDirectories(
    repoRoot,
    dependencies,
  );
  const entries: InstructionEntry[] = [];

  for (const [directoryPath, directoryEntry] of instructionDirectories) {
    const agentsPath = directoryEntry.agentsPath ?? null;
    const claudePath =
      directoryEntry.claudePath ?? join(directoryPath, 'CLAUDE.md');

    if (!agentsPath) {
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
      if (resolvedTarget === agentsPath) {
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
}: BuildInstructionsPayloadArgs): InstructionsJsonPayload {
  const normalizedEntries = normalizeEntries(entries);
  const normalizedActions = normalizeActions(actions);

  return {
    mode,
    status: deriveInstructionsStatus(normalizedEntries, normalizedActions),
    summary: buildInstructionsSummary(normalizedEntries, normalizedActions),
    entries: normalizedEntries,
    actions: normalizedActions,
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
