import { stat } from 'node:fs/promises';
import { basename, isAbsolute, resolve } from 'node:path';

import { readSyncedRecord } from '@commands/project/sync/record';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
  resolveProjectScope,
  resolveScopeRoot,
  syncedRecordPath,
} from '@commands/shared/project-scope';
import { readOatLocalConfig, type OatLocalConfig } from '@config/oat-config';
import { CliError } from '@errors/cli-error';

import { buildSyncTarget, type SyncTarget } from './ref-sync';

const PROJECT_SLUG_PATTERN = /^(?!-)[a-zA-Z0-9_-]+$/;

export interface ResolveSyncedTargetContext {
  repoRoot: string;
  env?: NodeJS.ProcessEnv;
}

export interface ResolveSyncedTargetOptions {
  allowMissingCheckout?: boolean;
}

export interface ResolveSyncedTargetDependencies {
  resolveProjectsRoot: typeof resolveProjectsRoot;
  readOatLocalConfig: (repoRoot: string) => Promise<OatLocalConfig>;
  readSyncedRecord: typeof readSyncedRecord;
  pathExists: (path: string) => Promise<boolean>;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

const DEFAULT_DEPENDENCIES: ResolveSyncedTargetDependencies = {
  resolveProjectsRoot,
  readOatLocalConfig,
  readSyncedRecord,
  pathExists,
};

function isBareSlug(value: string): boolean {
  return PROJECT_SLUG_PATTERN.test(value);
}

export async function resolveSyncedTarget(
  context: ResolveSyncedTargetContext,
  pathOrSlug?: string,
  overrides: Partial<ResolveSyncedTargetDependencies> = {},
  options: ResolveSyncedTargetOptions = {},
): Promise<SyncTarget> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const projectsRoot = await dependencies.resolveProjectsRoot(
    context.repoRoot,
    context.env ?? process.env,
  );
  const syncedRoot = resolveScopeRoot(context.repoRoot, projectsRoot, 'synced');

  let requested = pathOrSlug;
  if (!requested) {
    requested =
      (await dependencies.readOatLocalConfig(context.repoRoot)).activeProject ??
      undefined;
    if (!requested) {
      throw new CliError('No active project is configured.', 1);
    }
  }

  const bareSlug = isBareSlug(requested);
  const projectPath = bareSlug
    ? resolve(syncedRoot, requested)
    : isAbsolute(requested)
      ? resolve(requested)
      : resolve(context.repoRoot, requested);
  const slug = bareSlug ? requested : basename(projectPath);
  const checkoutExists = await dependencies.pathExists(projectPath);
  const record = await dependencies.readSyncedRecord(
    syncedRecordPath(syncedRoot, slug),
  );

  if (!bareSlug) {
    const scope = resolveProjectScope(
      projectPath,
      resolve(context.repoRoot, projectsRoot),
    );
    if (scope && scope !== 'synced') {
      throw new CliError(
        `Project ${requested} is in ${scope} scope; this command requires synced scope.`,
        1,
      );
    }
    if (!scope) {
      throw new CliError(
        `Project path is outside the synced project root: ${requested}`,
        1,
      );
    }
  }

  if (!checkoutExists && !(options.allowMissingCheckout && record)) {
    throw new CliError(`No synced project named ${slug}.`, 1);
  }

  return buildSyncTarget(context.repoRoot, projectsRoot, slug);
}
