import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CliError } from '@errors/cli-error';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ARCHIVE_SNAPSHOT_METADATA_FILENAME,
  archiveProjectOnCompletion,
  buildArchiveSnapshotName,
  buildProjectArchiveS3Uri,
  ensureS3ArchiveAccess,
  resolveLocalArchiveProjectPath,
} from './archive-utils';

describe('archive utils', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createRepoRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oat-archive-utils-'));
    tempDirs.push(root);
    return root;
  }

  it('builds a repo-scoped remote archive URI', () => {
    expect(
      buildProjectArchiveS3Uri(
        's3://example-bucket/oat-archive',
        '/tmp/workspace/open-agent-toolkit',
        'demo-project',
      ),
    ).toBe(
      's3://example-bucket/oat-archive/open-agent-toolkit/projects/demo-project',
    );
  });

  it('resolves local archived project paths from projects.root', () => {
    expect(
      resolveLocalArchiveProjectPath('.oat/projects/shared', 'demo-project'),
    ).toBe('.oat/projects/archived/demo-project');
  });

  it('archives the project locally during completion', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), '# state\n', 'utf8');

    const result = await archiveProjectOnCompletion({
      repoRoot,
      projectPath,
      projectName: 'demo',
      projectsRoot: '.oat/projects/shared',
      s3SyncOnComplete: false,
    });

    await expect(
      readFile(join(result.archivePath, 'state.md'), 'utf8'),
    ).resolves.toBe('# state\n');
    await expect(
      readFile(join(projectPath, 'state.md'), 'utf8'),
    ).rejects.toThrow();
    await expect(
      readFile(
        join(result.archivePath, ARCHIVE_SNAPSHOT_METADATA_FILENAME),
        'utf8',
      ),
    ).resolves.toContain('"snapshotName": "');
    expect(result.s3Path).toBeNull();
    expect(result.summaryExportFile).toBeNull();
    expect(result.warnings).toEqual([]);
  });

  it('uploads the archived project to S3 when completion sync is enabled and configured', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });

    const execFile = vi.fn(async () => ({ stdout: '', stderr: '' }));
    const ensureAccess = vi.fn(async () => ({ ok: true, warnings: [] }));

    const result = await archiveProjectOnCompletion(
      {
        repoRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        s3Uri: 's3://example-bucket/oat-archive',
        s3SyncOnComplete: true,
      },
      {
        execFile,
        ensureS3ArchiveAccess: ensureAccess,
        timestamp: () => '2026-04-01T12:34:56Z',
      },
    );

    expect(ensureAccess).toHaveBeenCalledWith(
      {
        mode: 'completion',
        s3Uri: 's3://example-bucket/oat-archive',
        syncOnComplete: true,
      },
      expect.objectContaining({ execFile }),
    );
    expect(execFile).toHaveBeenCalledWith(
      'aws',
      [
        's3',
        'sync',
        join(repoRoot, '.oat', 'projects', 'archived', 'demo'),
        `s3://example-bucket/oat-archive/${repoRoot.split('/').at(-1)}/projects/20260401-demo`,
      ],
      expect.objectContaining({ cwd: repoRoot }),
    );
    expect(result.s3Path).toBe(
      `s3://example-bucket/oat-archive/${repoRoot.split('/').at(-1)}/projects/20260401-demo`,
    );
  });

  it('skips S3 upload when completion sync is disabled', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });

    const execFile = vi.fn(async () => ({ stdout: '', stderr: '' }));
    const ensureAccess = vi.fn(async () => ({ ok: true, warnings: [] }));

    const result = await archiveProjectOnCompletion(
      {
        repoRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        s3Uri: 's3://example-bucket/oat-archive',
        s3SyncOnComplete: false,
      },
      {
        execFile,
        ensureS3ArchiveAccess: ensureAccess,
      },
    );

    expect(ensureAccess).not.toHaveBeenCalled();
    expect(execFile).not.toHaveBeenCalled();
    expect(result.s3Path).toBeNull();
  });

  it('skips S3 upload when no S3 URI is configured', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });

    const execFile = vi.fn(async () => ({ stdout: '', stderr: '' }));
    const ensureAccess = vi.fn(async () => ({ ok: true, warnings: [] }));

    const result = await archiveProjectOnCompletion(
      {
        repoRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        s3SyncOnComplete: true,
      },
      {
        execFile,
        ensureS3ArchiveAccess: ensureAccess,
      },
    );

    expect(ensureAccess).not.toHaveBeenCalled();
    expect(execFile).not.toHaveBeenCalled();
    expect(result.s3Path).toBeNull();
  });

  it('copies summary.md to the configured summary export path', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'summary.md'), '# summary\n', 'utf8');

    const result = await archiveProjectOnCompletion(
      {
        repoRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        s3SyncOnComplete: false,
        summaryExportPath: '.oat/repo/reference/project-summaries',
      },
      {
        timestamp: () => '2026-04-01T12:34:56Z',
      },
    );

    expect(result.summaryExportFile).toBe(
      join(
        repoRoot,
        '.oat',
        'repo',
        'reference',
        'project-summaries',
        '20260401-demo.md',
      ),
    );
    await expect(readFile(result.summaryExportFile!, 'utf8')).resolves.toBe(
      '# summary\n',
    );
  });

  it('archives to the primary checkout when completion runs from a git worktree', async () => {
    const tempRoot = await createRepoRoot();
    const mainRepoRoot = join(tempRoot, 'main-repo');
    const worktreeRoot = join(tempRoot, 'feature-worktree');
    const projectPath = join(
      worktreeRoot,
      '.oat',
      'projects',
      'shared',
      'demo',
    );

    await mkdir(join(mainRepoRoot, '.git'), { recursive: true });
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'summary.md'), '# summary\n', 'utf8');

    const execFile = vi.fn(async (file: string, args: string[]) => {
      if (
        file === 'git' &&
        args[0] === 'check-ignore' &&
        args[1] === '--quiet' &&
        args[2] === '--no-index' &&
        args[3] === '.oat/projects/archived/demo'
      ) {
        return {
          stdout: '',
          stderr: '',
        };
      }
      if (
        file === 'git' &&
        args[0] === 'rev-parse' &&
        args[1] === '--git-common-dir'
      ) {
        return {
          stdout: join(mainRepoRoot, '.git'),
          stderr: '',
        };
      }
      if (
        file === 'git' &&
        args[0] === 'rev-parse' &&
        args[1] === '--git-dir'
      ) {
        return {
          stdout: join(mainRepoRoot, '.git', 'worktrees', 'feature-worktree'),
          stderr: '',
        };
      }

      throw new Error(`Unexpected command: ${file} ${args.join(' ')}`);
    });

    const result = await archiveProjectOnCompletion(
      {
        repoRoot: worktreeRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        s3SyncOnComplete: false,
        summaryExportPath: '.oat/repo/reference/project-summaries',
      },
      {
        gitExecFile: execFile,
        timestamp: () => '2026-04-01T12:34:56Z',
      },
    );

    expect(result.archivePath).toBe(
      join(mainRepoRoot, '.oat', 'projects', 'archived', 'demo'),
    );
    expect(result.summaryExportFile).toBe(
      join(
        worktreeRoot,
        '.oat',
        'repo',
        'reference',
        'project-summaries',
        '20260401-demo.md',
      ),
    );
    await expect(readFile(result.summaryExportFile!, 'utf8')).resolves.toBe(
      '# summary\n',
    );
    await expect(
      readFile(join(result.archivePath, 'summary.md'), 'utf8'),
    ).resolves.toBe('# summary\n');
  });

  it('archives in the current worktree when the archive path is version controlled', async () => {
    const tempRoot = await createRepoRoot();
    const mainRepoRoot = join(tempRoot, 'main-repo');
    const worktreeRoot = join(tempRoot, 'feature-worktree');
    const projectPath = join(
      worktreeRoot,
      '.oat',
      'projects',
      'shared',
      'demo',
    );

    await mkdir(join(mainRepoRoot, '.git'), { recursive: true });
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'summary.md'), '# summary\n', 'utf8');

    const execFile = vi.fn(async (file: string, args: string[]) => {
      if (
        file === 'git' &&
        args[0] === 'check-ignore' &&
        args[1] === '--quiet' &&
        args[2] === '--no-index' &&
        args[3] === '.oat/projects/archived/demo'
      ) {
        const error = new Error('not ignored') as NodeJS.ErrnoException;
        error.code = 1;
        throw error;
      }
      if (
        file === 'git' &&
        args[0] === 'rev-parse' &&
        args[1] === '--git-common-dir'
      ) {
        return {
          stdout: join(mainRepoRoot, '.git'),
          stderr: '',
        };
      }
      if (
        file === 'git' &&
        args[0] === 'rev-parse' &&
        args[1] === '--git-dir'
      ) {
        return {
          stdout: join(mainRepoRoot, '.git', 'worktrees', 'feature-worktree'),
          stderr: '',
        };
      }

      throw new Error(`Unexpected command: ${file} ${args.join(' ')}`);
    });

    const result = await archiveProjectOnCompletion(
      {
        repoRoot: worktreeRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        s3SyncOnComplete: false,
        summaryExportPath: '.oat/repo/reference/project-summaries',
      },
      {
        gitExecFile: execFile,
        timestamp: () => '2026-04-01T12:34:56Z',
      },
    );

    expect(result.archivePath).toBe(
      join(worktreeRoot, '.oat', 'projects', 'archived', 'demo'),
    );
    expect(result.summaryExportFile).toBe(
      join(
        worktreeRoot,
        '.oat',
        'repo',
        'reference',
        'project-summaries',
        '20260401-demo.md',
      ),
    );
    await expect(readFile(result.summaryExportFile!, 'utf8')).resolves.toBe(
      '# summary\n',
    );
    await expect(
      readFile(join(result.archivePath, 'summary.md'), 'utf8'),
    ).resolves.toBe('# summary\n');
  });

  it('skips summary export when no summary export path is configured', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'summary.md'), '# summary\n', 'utf8');

    const result = await archiveProjectOnCompletion({
      repoRoot,
      projectPath,
      projectName: 'demo',
      projectsRoot: '.oat/projects/shared',
      s3SyncOnComplete: false,
    });

    expect(result.summaryExportFile).toBeNull();
  });

  it('warns and continues local completion when S3 is enabled but AWS access is unavailable', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });

    const execFile = vi.fn(async () => ({ stdout: '', stderr: '' }));
    const ensureAccess = vi.fn(async () => ({
      ok: false,
      warnings: ['Skipping S3 archive sync because AWS CLI is unavailable.'],
    }));

    const result = await archiveProjectOnCompletion(
      {
        repoRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        s3Uri: 's3://example-bucket/oat-archive',
        s3SyncOnComplete: true,
      },
      {
        execFile,
        ensureS3ArchiveAccess: ensureAccess,
      },
    );

    await expect(
      readFile(join(result.archivePath, 'summary.md'), 'utf8'),
    ).rejects.toThrow();
    expect(execFile).not.toHaveBeenCalled();
    expect(result.warnings).toEqual([
      'Skipping S3 archive sync because AWS CLI is unavailable.',
    ]);
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
      'Archive S3 sync is enabled via `archive.s3SyncOnComplete`, but AWS CLI was not found on PATH. Skipping S3 archive sync.',
    ]);
  });

  it('builds a date-prefixed archive snapshot name', () => {
    expect(
      buildArchiveSnapshotName(
        'documentation-improvement',
        '2026-04-01T12:34:56Z',
      ),
    ).toBe('20260401-documentation-improvement');
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
