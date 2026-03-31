import { afterEach, describe, expect, it, vi } from 'vitest';

import { CliError } from '@errors/cli-error';

import {
  buildProjectArchiveS3Uri,
  ensureS3ArchiveAccess,
  resolveLocalArchiveProjectPath,
} from './archive-utils';

describe('archive utils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a repo-scoped remote archive URI', () => {
    expect(
      buildProjectArchiveS3Uri(
        's3://example-bucket/oat-archive',
        '/tmp/workspace/open-agent-toolkit',
        'demo-project',
      ),
    ).toBe('s3://example-bucket/oat-archive/open-agent-toolkit/demo-project');
  });

  it('resolves local archived project paths from projects.root', () => {
    expect(
      resolveLocalArchiveProjectPath('.oat/projects/shared', 'demo-project'),
    ).toBe('.oat/projects/archived/demo-project');
  });

  it('warns during completion when archive sync is enabled but aws is missing', async () => {
    const execFile = vi.fn(async () => {
      const error = new Error('spawn aws ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      throw error;
    });

    const result = await ensureS3ArchiveAccess(
      {
        mode: 'completion',
        s3Uri: 's3://example-bucket/oat-archive',
        syncOnComplete: true,
      },
      { execFile },
    );

    expect(result.ok).toBe(false);
    expect(result.warnings).toEqual([
      "Archive S3 sync is enabled via `archive.s3SyncOnComplete`, but AWS CLI was not found on PATH. Skipping S3 archive sync.",
    ]);
  });

  it('fails for explicit sync when aws credentials are unusable', async () => {
    const execFile = vi
      .fn()
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockRejectedValueOnce(new Error('Unable to locate credentials'));

    await expect(
      ensureS3ArchiveAccess(
        {
          mode: 'sync',
          s3Uri: 's3://example-bucket/oat-archive',
          syncOnComplete: true,
        },
        { execFile },
      ),
    ).rejects.toEqual(
      new CliError(
        'AWS CLI is required for `oat project archive sync`, but it is not configured for access to `archive.s3Uri`. Configure AWS credentials or profile settings and retry.',
      ),
    );
  });
});
