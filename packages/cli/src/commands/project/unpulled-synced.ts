import { basename, dirname } from 'node:path';

import {
  classifyUnmaterializedSyncedRecord,
  directoryExists,
  probeAuthoritativeCompletedRef,
} from '@commands/project/list';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import { readSyncedRecord } from '@commands/project/sync/record';
import { probeSyncedTerminalRefs } from '@commands/project/sync/resolve-target';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
  canonicalizePath,
  resolveScopeRoot,
  syncedRecordPath,
} from '@commands/shared/project-scope';
import { resolveProjectRoot } from '@fs/paths';

/** A synced project recorded on this branch whose checkout is not here. */
export type UnpulledSyncedProject = Awaited<
  ReturnType<typeof classifyUnmaterializedSyncedRecord>
>;

/**
 * A synced project that has a record on this branch but no checkout in this
 * worktree has no readable state, so no mode is known: status reports the
 * storage instruction `list` gives for it (`oat project pull`), never a
 * lifecycle recommendation. Returns null for every other path, including any
 * project folder that exists. Without a repository root (an absolute
 * `--project-path`), the root is the repository holding the path, never the
 * working directory's.
 */
export async function resolveUnpulledSyncedProject(
  projectDir: string,
  knownRepoRoot?: string,
  options: { env?: NodeJS.ProcessEnv; gitRunner?: GitRunner } = {},
): Promise<UnpulledSyncedProject | null> {
  if (await directoryExists(projectDir)) {
    return null;
  }
  const repoRoot = knownRepoRoot ?? (await repositoryHolding(projectDir));
  if (!repoRoot) {
    return null;
  }
  const projectsRoot = await resolveProjectsRoot(
    repoRoot,
    options.env ?? process.env,
  );
  const scopeRoot = resolveScopeRoot(repoRoot, projectsRoot, 'synced');
  if (canonicalizePath(dirname(projectDir)) !== canonicalizePath(scopeRoot)) {
    return null;
  }
  let recordPath: string;
  try {
    recordPath = syncedRecordPath(scopeRoot, basename(projectDir));
  } catch {
    return null;
  }
  const record = await readSyncedRecord(recordPath);
  if (!record) {
    return null;
  }
  return classifyUnmaterializedSyncedRecord(repoRoot, projectsRoot, record, {
    probeAuthoritativeCompletedRef,
    probeSyncedTerminalRefs,
    gitRunner: options.gitRunner ?? defaultGitRunner,
  });
}

async function repositoryHolding(path: string): Promise<string | null> {
  let current = dirname(path);
  while (!(await directoryExists(current))) {
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
  try {
    return await resolveProjectRoot(current);
  } catch {
    return null;
  }
}
