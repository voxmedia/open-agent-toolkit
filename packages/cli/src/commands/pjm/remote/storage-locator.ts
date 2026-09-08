import { createHash } from 'node:crypto';
import { isAbsolute, join, relative, resolve } from 'node:path';

export type RemoteStorageClass = 'shared' | 'synced' | 'local';

export interface RemoteStorageTarget {
  kind: 'backlog' | 'project';
  scope: RemoteStorageClass;
  path: string | null;
}

export interface ResolveRemoteStorageLocationsInput {
  repoRoot: string;
  gitCommonDir: string;
  repositoryIdentity: string;
  stateStorage: 'local' | 'shared';
  target: RemoteStorageTarget;
}

export interface RemoteStorageLocations {
  repositoryFingerprint: string;
  portable: {
    storageClass: RemoteStorageClass;
    bindingsDir: string;
  };
  operational: {
    storageClass: 'local' | 'shared';
    root: string;
    bindingsDir: string;
    operationsDir: string;
    batchesDir: string;
  };
}

export function resolveRemoteStorageLocations(
  input: ResolveRemoteStorageLocationsInput,
): RemoteStorageLocations {
  const repoRoot = resolve(input.repoRoot);
  const gitCommonDir = resolve(input.gitCommonDir);
  const repositoryFingerprint = fingerprintRepository(input.repositoryIdentity);
  const localOperationalRoot = join(
    gitCommonDir,
    'oat',
    'pjm-remote',
    repositoryFingerprint,
  );

  const ownerRemoteRoot = resolveOwnerRemoteRoot(repoRoot, input.target);
  if (input.stateStorage === 'shared' && input.target.scope === 'local') {
    throw new Error(
      'Local projects cannot use shared operational storage; choose local state storage.',
    );
  }

  const operationalRoot =
    input.stateStorage === 'shared'
      ? join(ownerRemoteRoot, 'state')
      : localOperationalRoot;
  const portableBindingsDir =
    input.target.scope === 'local'
      ? join(localOperationalRoot, 'metadata', 'bindings')
      : join(ownerRemoteRoot, 'bindings');

  return {
    repositoryFingerprint,
    portable: {
      storageClass: input.target.scope,
      bindingsDir: portableBindingsDir,
    },
    operational: {
      storageClass: input.stateStorage,
      root: operationalRoot,
      bindingsDir: join(operationalRoot, 'bindings'),
      operationsDir: join(operationalRoot, 'operations'),
      batchesDir: join(operationalRoot, 'batches'),
    },
  };
}

function resolveOwnerRemoteRoot(
  repoRoot: string,
  target: RemoteStorageTarget,
): string {
  if (target.kind === 'backlog') {
    if (target.scope !== 'shared') {
      throw new Error('Backlog remote metadata must use shared scope.');
    }
    return join(repoRoot, '.oat', 'repo', 'pjm', 'remote');
  }

  if (!target.path || !isAbsolute(target.path)) {
    throw new Error(
      'Project remote storage requires an absolute project path.',
    );
  }
  const projectPath = resolve(target.path);
  const relativePath = relative(repoRoot, projectPath);
  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error(
      'Project remote storage path must remain inside the repository.',
    );
  }
  return join(projectPath, 'remote');
}

function fingerprintRepository(repositoryIdentity: string): string {
  const normalized = repositoryIdentity
    .trim()
    .replace(/\.git$/i, '')
    .replace(/\/$/, '')
    .toLowerCase();
  if (!normalized) {
    throw new Error(
      'A stable repository identity is required for remote state.',
    );
  }
  return createHash('sha256').update(normalized).digest('hex').slice(0, 24);
}
