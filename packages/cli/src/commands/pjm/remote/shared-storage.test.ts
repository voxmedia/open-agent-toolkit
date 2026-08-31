import { describe, expect, it, vi } from 'vitest';

import {
  applySharedStorageTransition,
  buildSharedStoragePreview,
} from './shared-storage';

const preview = buildSharedStoragePreview({
  repositoryFingerprint: 'sha256:repository',
  configTarget: '.oat/config.json',
  targetKind: 'repository',
  projectScope: null,
  currentMode: 'local',
  retainedDataWarning:
    'Sanitized ticket content and audit history will enter Git history.',
  proposedPaths: ['.oat/repo/pjm/remote/bindings'],
  createdAt: '2026-08-31T12:00:00.000Z',
});

describe('shared operational storage', () => {
  it('binds preview to repository, config target, current mode, warning, and paths', () => {
    expect(preview.digest).toMatch(/^sha256:/);
    for (const change of [
      { repositoryFingerprint: 'sha256:other' },
      { configTarget: 'other.json' },
      { currentMode: 'shared' as const },
      { retainedDataWarning: 'changed warning' },
      { proposedPaths: ['other/path'] },
    ]) {
      expect(
        buildSharedStoragePreview({ ...preview, ...change }).digest,
      ).not.toBe(preview.digest);
    }
  });

  it('applies only after a fresh matching approval without moving records', async () => {
    const writeSharedConfig = vi.fn();
    await expect(
      applySharedStorageTransition({
        preview,
        approval: {
          previewDigest: preview.digest,
          approvedAt: '2026-08-31T12:01:00.000Z',
        },
        current: {
          repositoryFingerprint: preview.repositoryFingerprint,
          configTarget: preview.configTarget,
          mode: preview.currentMode,
        },
        writeSharedConfig,
      }),
    ).resolves.toEqual({ status: 'applied', movedRecords: false });
    expect(writeSharedConfig).toHaveBeenCalledWith('shared');
  });

  it('rejects absent/stale approval and changed current inputs before writing', async () => {
    const writeSharedConfig = vi.fn();
    const current = {
      repositoryFingerprint: preview.repositoryFingerprint,
      configTarget: preview.configTarget,
      mode: preview.currentMode,
    };
    await expect(
      applySharedStorageTransition({
        preview,
        approval: null,
        current,
        writeSharedConfig,
      }),
    ).rejects.toThrow(/requires fresh/);
    await expect(
      applySharedStorageTransition({
        preview,
        approval: {
          previewDigest: 'sha256:stale',
          approvedAt: '2026-08-31T12:01:00.000Z',
        },
        current,
        writeSharedConfig,
      }),
    ).rejects.toThrow(/stale|mismatched/);
    await expect(
      applySharedStorageTransition({
        preview,
        approval: {
          previewDigest: preview.digest,
          approvedAt: '2026-08-31T12:01:00.000Z',
        },
        current: { ...current, mode: 'shared' },
        writeSharedConfig,
      }),
    ).rejects.toThrow(/changed/);
    expect(writeSharedConfig).not.toHaveBeenCalled();
  });

  it('rejects local project targets', () => {
    expect(() =>
      buildSharedStoragePreview({
        ...preview,
        targetKind: 'project',
        projectScope: 'local',
      }),
    ).toThrow(/Local project/);
  });
});
