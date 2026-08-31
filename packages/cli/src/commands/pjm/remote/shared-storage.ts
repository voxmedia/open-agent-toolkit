import { createHash } from 'node:crypto';

export interface SharedStoragePreview {
  schemaVersion: 1;
  digest: string;
  repositoryFingerprint: string;
  configTarget: string;
  targetKind: 'repository' | 'project';
  projectScope: 'shared' | 'synced' | 'local' | null;
  currentMode: 'local' | 'shared';
  proposedMode: 'shared';
  retainedDataWarning: string;
  proposedPaths: string[];
  createdAt: string;
}

export function buildSharedStoragePreview(
  input: Omit<
    SharedStoragePreview,
    'schemaVersion' | 'digest' | 'proposedMode'
  >,
): SharedStoragePreview {
  if (input.targetKind === 'project' && input.projectScope === 'local') {
    throw new Error(
      'Local project targets cannot use shared operational storage.',
    );
  }
  if (
    !input.repositoryFingerprint ||
    !input.configTarget ||
    input.proposedPaths.length === 0
  ) {
    throw new Error(
      'Shared storage preview requires repository, config target, and proposed paths.',
    );
  }
  const body = {
    schemaVersion: 1 as const,
    ...input,
    proposedMode: 'shared' as const,
  };
  return { ...body, digest: digest(body) };
}

export async function applySharedStorageTransition(input: {
  preview: SharedStoragePreview;
  approval: { previewDigest: string; approvedAt: string } | null;
  current: {
    repositoryFingerprint: string;
    configTarget: string;
    mode: 'local' | 'shared';
  };
  writeSharedConfig(mode: 'shared'): Promise<void>;
}): Promise<{ status: 'applied'; movedRecords: false }> {
  if (!input.approval)
    throw new Error(
      'Shared storage transition requires fresh preview approval.',
    );
  const rebuilt = buildSharedStoragePreview({
    repositoryFingerprint: input.preview.repositoryFingerprint,
    configTarget: input.preview.configTarget,
    targetKind: input.preview.targetKind,
    projectScope: input.preview.projectScope,
    currentMode: input.preview.currentMode,
    retainedDataWarning: input.preview.retainedDataWarning,
    proposedPaths: input.preview.proposedPaths,
    createdAt: input.preview.createdAt,
  });
  if (
    rebuilt.digest !== input.preview.digest ||
    input.approval.previewDigest !== input.preview.digest
  ) {
    throw new Error('Shared storage approval is stale or mismatched.');
  }
  if (
    input.current.repositoryFingerprint !==
      input.preview.repositoryFingerprint ||
    input.current.configTarget !== input.preview.configTarget ||
    input.current.mode !== input.preview.currentMode
  ) {
    throw new Error('Shared storage preview inputs changed before apply.');
  }
  if (
    Date.parse(input.approval.approvedAt) < Date.parse(input.preview.createdAt)
  ) {
    throw new Error('Shared storage approval predates its preview.');
  }
  await input.writeSharedConfig('shared');
  return { status: 'applied', movedRecords: false };
}

function digest(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}
