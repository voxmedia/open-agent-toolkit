import { createHash } from 'node:crypto';

import { z } from 'zod';

import { containsSensitiveContentSignal } from './credential-safety';

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

const SharedStoragePreviewSchema = z
  .object({
    schemaVersion: z.literal(1),
    digest: z.string().min(1).max(512),
    repositoryFingerprint: z.string().min(1).max(512),
    configTarget: z.string().min(1).max(4_096),
    targetKind: z.enum(['repository', 'project']),
    projectScope: z.enum(['shared', 'synced', 'local']).nullable(),
    currentMode: z.enum(['local', 'shared']),
    proposedMode: z.literal('shared'),
    retainedDataWarning: z.string().min(1).max(8_192),
    proposedPaths: z.array(z.string().min(1).max(4_096)).min(1).max(64),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

export function parseSharedStoragePreview(
  value: unknown,
): SharedStoragePreview {
  const preview = SharedStoragePreviewSchema.parse(value);
  const rebuilt = buildSharedStoragePreview({
    repositoryFingerprint: preview.repositoryFingerprint,
    configTarget: preview.configTarget,
    targetKind: preview.targetKind,
    projectScope: preview.projectScope,
    currentMode: preview.currentMode,
    retainedDataWarning: preview.retainedDataWarning,
    proposedPaths: preview.proposedPaths,
    createdAt: preview.createdAt,
  });
  if (rebuilt.digest !== preview.digest) {
    throw new Error('Shared storage preview digest is stale or mismatched.');
  }
  return preview;
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
  approval: {
    previewDigest: string;
    approvedAt: string;
    actor: string;
    source: string;
  } | null;
  now: string;
  maxAgeMs: number;
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
  const approvedAt = Date.parse(input.approval.approvedAt);
  const previewAt = Date.parse(input.preview.createdAt);
  const now = Date.parse(input.now);
  if (
    !Number.isFinite(approvedAt) ||
    !Number.isFinite(previewAt) ||
    !Number.isFinite(now) ||
    !Number.isFinite(input.maxAgeMs) ||
    input.maxAgeMs < 0
  ) {
    throw new Error('Shared storage approval contains an invalid time.');
  }
  if (approvedAt < previewAt) {
    throw new Error('Shared storage approval predates its preview.');
  }
  if (approvedAt > now) {
    throw new Error('Shared storage approval is dated in the future.');
  }
  if (now - approvedAt > input.maxAgeMs) {
    throw new Error('Shared storage approval is expired.');
  }
  if (
    !isSafeEvidence(input.approval.actor) ||
    !isSafeEvidence(input.approval.source)
  ) {
    throw new Error('Shared storage approval evidence is unsafe.');
  }
  await input.writeSharedConfig('shared');
  return { status: 'applied', movedRecords: false };
}

function isSafeEvidence(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 255 &&
    !/[\r\n]/.test(value) &&
    !value.includes('\0') &&
    !containsSensitiveContentSignal(value)
  );
}

function digest(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}
