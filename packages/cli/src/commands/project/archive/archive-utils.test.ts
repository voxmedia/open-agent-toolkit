import { createHash } from 'node:crypto';
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { CliError } from '@errors/cli-error';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ARCHIVE_SNAPSHOT_METADATA_FILENAME,
  archiveProjectOnCompletion,
  buildArchiveSnapshotName,
  buildProjectArchiveS3Uri,
  ensureS3ArchiveAccess,
  resolveArchiveProjectTarget,
  resolveLocalArchiveProjectPath,
  resolvePrimaryRepoRoot,
  verifySelectedProjectRecapForArchive,
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

  async function createRecapPackage(
    projectPath: string,
    {
      distinctCanonicalHashes = false,
      includeReviewEvidence,
      mode = 'unattended',
      outcome = 'built-not-durable',
      recipeId = 'project-recap',
      runName = 'selected-run',
      sourceBacklinks,
    }: {
      distinctCanonicalHashes?: boolean;
      includeReviewEvidence?: boolean;
      mode?: 'interactive' | 'unattended';
      outcome?:
        | 'built-not-durable'
        | 'built-needs-review'
        | 'failed'
        | 'incomplete';
      recipeId?: string;
      runName?: string;
      sourceBacklinks?: unknown;
    } = {},
  ): Promise<{
    relativeRunPath: string;
    runRoot: string;
    manifestPath: string;
    immutableCount: number;
  }> {
    const relativeRunPath = join('explainers', 'project-recap', runName);
    const runRoot = join(projectPath, relativeRunPath);
    const files: Record<string, string> = {
      'run-request.json': `${JSON.stringify({ mode })}\n`,
      'source/fact-base.json': '{"claims":[]}\n',
      'source/fact-base.md': '# Facts\n',
      'source/content-approval.json': '{"status":"approved"}\n',
      'source/author/recap.json': '{"author":{"id":"fixture"}}\n',
      'source/content/recap.md': `# ${runName}\n`,
      'theme.resolved.json': '{"name":"neutral"}\n',
      'site/index.html': `<h1>${runName}</h1>\n`,
    };
    if (outcome === 'built-not-durable') {
      for (const path of [
        'source/set-plan/request.json',
        'source/set-plan/result.json',
        'source/set-plan/ledger.json',
        'source/set-plan/portfolio.json',
        'source/set-plan/drafts.json',
      ]) {
        files[path] = '{}\n';
      }
    }
    const retainReviewEvidence =
      includeReviewEvidence ??
      (mode === 'unattended' && outcome === 'built-not-durable');
    if (retainReviewEvidence) {
      files['qa/visual-review/attempt-1/request.json'] = '{}\n';
      files['qa/visual-review/attempt-1/result.json'] = '{}\n';
      for (const viewport of ['mobile', 'tablet', 'desktop']) {
        files[`qa/browser/recap/${viewport}.png`] = `png-${viewport}\n`;
        files[`qa/browser/recap/${viewport}.json`] = '{}\n';
        files[`qa/visual-review/attempt-1/evidence/recap/${viewport}.png`] =
          `png-${viewport}\n`;
        files[`qa/visual-review/attempt-1/evidence/recap/${viewport}.json`] =
          '{}\n';
      }
    }

    for (const [relativePath, contents] of Object.entries(files)) {
      const target = join(runRoot, relativePath);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents, 'utf8');
    }

    const immutableHashes = Object.fromEntries(
      Object.entries(files).map(([relativePath, contents]) => [
        relativePath,
        `sha256:${createHash('sha256').update(contents).digest('hex')}`,
      ]),
    );
    const manifestPath = join(runRoot, 'manifest.json');
    await writeFile(
      manifestPath,
      `${JSON.stringify({
        schemaVersion: 'explainer-kit.manifest/v1',
        runId: `run-${runName}`,
        slug: runName,
        recipe: { id: recipeId, version: '1' },
        createdAt: '2026-04-01T12:34:56.000Z',
        source: {
          factBasePath: 'source/fact-base.json',
          factBaseHash: distinctCanonicalHashes
            ? `sha256:${'b'.repeat(64)}`
            : immutableHashes['source/fact-base.json'],
          inputHashes: {},
          authorResultPaths: ['source/author/recap.json'],
          ...(sourceBacklinks !== undefined && {
            backlinks: sourceBacklinks,
          }),
        },
        theme: {
          path: 'theme.resolved.json',
          hash: distinctCanonicalHashes
            ? `sha256:${'c'.repeat(64)}`
            : immutableHashes['theme.resolved.json'],
          derived: false,
        },
        artifacts: [
          {
            id: 'recap',
            type: 'explainer',
            contentPath: 'source/content/recap.md',
            renderedPath: 'site/index.html',
            mediaType: 'text/html',
            status: 'built',
            hash: immutableHashes['site/index.html'],
            rebuildable: false,
          },
        ],
        outcome,
        immutableHashes,
        buildRecord: {
          path: 'build-record.json',
          hash: `sha256:${'a'.repeat(64)}`,
        },
        warnings: [],
      })}\n`,
      'utf8',
    );
    await writeFile(join(runRoot, 'build-record.json'), '{}\n', 'utf8');

    return {
      relativeRunPath,
      runRoot,
      manifestPath,
      immutableCount: Object.keys(immutableHashes).length,
    };
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

  it('resolves the primary repo root from a linked git worktree', async () => {
    const tempRoot = await createRepoRoot();
    const mainRepoRoot = join(tempRoot, 'stoa');
    const worktreeRoot = join(tempRoot, 'sc-pinned-cryostat-af7a');
    await mkdir(join(mainRepoRoot, '.git'), { recursive: true });
    await mkdir(worktreeRoot, { recursive: true });

    const execFile = vi.fn(async (file: string, args: string[]) => {
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
          stdout: join(
            mainRepoRoot,
            '.git',
            'worktrees',
            'sc-pinned-cryostat-af7a',
          ),
          stderr: '',
        };
      }

      throw new Error(`Unexpected command: ${file} ${args.join(' ')}`);
    });

    await expect(
      resolvePrimaryRepoRoot(worktreeRoot, { gitExecFile: execFile }),
    ).resolves.toBe(mainRepoRoot);
  });

  it('resolves local archived project paths from projects.root', () => {
    expect(
      resolveLocalArchiveProjectPath('.oat/projects/shared', 'demo-project'),
    ).toBe('.oat/projects/archived/demo-project');
  });

  it('resolves repo-local absolute projects roots under the primary checkout', async () => {
    const tempRoot = await createRepoRoot();
    const mainRepoRoot = join(tempRoot, 'main-repo');
    const worktreeRoot = join(tempRoot, 'feature-worktree');
    const projectsRoot = join(worktreeRoot, '.oat', 'projects', 'shared');

    await mkdir(join(mainRepoRoot, '.git'), { recursive: true });
    await mkdir(projectsRoot, { recursive: true });

    const gitExecFile = vi.fn(async (file: string, args: string[]) => {
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

    const target = await resolveArchiveProjectTarget(
      {
        repoRoot: worktreeRoot,
        projectsRoot,
        projectName: 'demo',
      },
      {
        gitExecFile,
        timestamp: () => '2026-04-01T12:34:56Z',
      },
    );

    expect(target.archiveProjectPath).toBe('.oat/projects/archived/demo');
    expect(target.archivePath).toBe(
      join(mainRepoRoot, '.oat', 'projects', 'archived', 'demo'),
    );
    expect(target.archivePathIsGitignored).toBe(true);
    expect(target.primaryRepoRoot).toBe(mainRepoRoot);
  });

  it('resolves external absolute projects roots without prefixing the repo root', async () => {
    const tempRoot = await createRepoRoot();
    const repoRoot = join(tempRoot, 'repo');
    const projectsRoot = join(tempRoot, 'external-projects', 'shared');

    await mkdir(repoRoot, { recursive: true });
    await mkdir(projectsRoot, { recursive: true });

    const gitExecFile = vi.fn(async () => {
      const error = new Error('not ignored') as NodeJS.ErrnoException;
      error.code = 1;
      throw error;
    });

    const target = await resolveArchiveProjectTarget(
      {
        repoRoot,
        projectsRoot,
        projectName: 'demo',
      },
      {
        gitExecFile,
        timestamp: () => '2026-04-01T12:34:56Z',
      },
    );

    expect(target.archiveProjectPath).toBe(
      join(tempRoot, 'external-projects', 'archived', 'demo'),
    );
    expect(target.archivePath).toBe(
      join(tempRoot, 'external-projects', 'archived', 'demo'),
    );
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

  it.each(['failed', 'incomplete'] as const)(
    'exports only the selected %s recap package before deleting the active project',
    async (outcome) => {
      const repoRoot = await createRepoRoot();
      const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
      await mkdir(projectPath, { recursive: true });
      const selected = await createRecapPackage(projectPath, { outcome });
      await createRecapPackage(projectPath, { runName: 'unselected-run' });
      const renamePath = vi.fn(async (source: string, destination: string) =>
        rename(source, destination),
      );

      const result = await archiveProjectOnCompletion(
        {
          repoRoot,
          projectPath,
          projectName: 'demo',
          projectsRoot: '.oat/projects/shared',
          projectRecapRun: selected.relativeRunPath,
          s3SyncOnComplete: false,
        },
        {
          renamePath,
          timestamp: () => '2026-04-01T12:34:56Z',
        },
      );

      const exportRoot = join(
        repoRoot,
        '.oat',
        'repo',
        'reference',
        'project-recaps',
        '20260401-demo',
      );
      expect(result.projectRecapExport).toEqual({
        sourceRunRoot: selected.runRoot,
        exportRoot,
        manifest: {
          relativePath: 'manifest.json',
          verifiedArtifactCount: selected.immutableCount,
        },
      });
      await expect(
        readFile(join(exportRoot, 'site', 'index.html'), 'utf8'),
      ).resolves.toBe('<h1>selected-run</h1>\n');
      await expect(
        access(join(exportRoot, '..', 'unselected-run')),
      ).rejects.toThrow();
      await expect(access(projectPath)).rejects.toThrow();
      expect(renamePath).toHaveBeenCalledWith(
        expect.stringMatching(/20260401-demo\.tmp-/),
        exportRoot,
      );
    },
  );

  it('accepts distinct canonical object hashes while verifying complete file-byte coverage', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    const recap = await createRecapPackage(projectPath, {
      distinctCanonicalHashes: true,
    });

    const result = await archiveProjectOnCompletion(
      {
        repoRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        projectRecapRun: recap.relativeRunPath,
        s3SyncOnComplete: false,
      },
      { timestamp: () => '2026-04-01T12:34:56Z' },
    );

    expect(result.projectRecapExport?.manifest.verifiedArtifactCount).toBe(
      recap.immutableCount,
    );
    await expect(access(projectPath)).rejects.toThrow();
  });

  it('archives a successful interactive recap without visual-review evidence', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    const recap = await createRecapPackage(projectPath, {
      mode: 'interactive',
    });

    const result = await archiveProjectOnCompletion(
      {
        repoRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        projectRecapRun: recap.relativeRunPath,
        s3SyncOnComplete: false,
      },
      { timestamp: () => '2026-04-01T12:34:56Z' },
    );

    expect(result.projectRecapExport?.manifest.verifiedArtifactCount).toBe(
      recap.immutableCount,
    );
    await expect(access(projectPath)).rejects.toThrow();
  });

  it('rejects partial interactive review evidence and an unverified mode change', async () => {
    const repoRoot = await createRepoRoot();
    const partialProject = join(
      repoRoot,
      '.oat',
      'projects',
      'shared',
      'partial',
    );
    await mkdir(partialProject, { recursive: true });
    const partial = await createRecapPackage(partialProject, {
      mode: 'interactive',
    });
    const partialPath = 'qa/browser/recap/mobile.png';
    const partialContents = 'partial\n';
    await mkdir(dirname(join(partial.runRoot, partialPath)), {
      recursive: true,
    });
    await writeFile(join(partial.runRoot, partialPath), partialContents);
    const partialManifest = JSON.parse(
      await readFile(partial.manifestPath, 'utf8'),
    ) as { immutableHashes: Record<string, string> };
    partialManifest.immutableHashes[partialPath] =
      `sha256:${createHash('sha256').update(partialContents).digest('hex')}`;
    await writeFile(
      partial.manifestPath,
      `${JSON.stringify(partialManifest)}\n`,
    );

    await expect(
      archiveProjectOnCompletion({
        repoRoot,
        projectPath: partialProject,
        projectName: 'partial',
        projectsRoot: '.oat/projects/shared',
        projectRecapRun: partial.relativeRunPath,
        s3SyncOnComplete: false,
      }),
    ).rejects.toThrow(
      /incomplete visual-review evidence chain|screenshot evidence.*missing.*metrics/i,
    );

    const mutatedProject = join(
      repoRoot,
      '.oat',
      'projects',
      'shared',
      'mutated',
    );
    await mkdir(mutatedProject, { recursive: true });
    const mutated = await createRecapPackage(mutatedProject);
    await writeFile(
      join(mutated.runRoot, 'run-request.json'),
      '{"mode":"interactive"}\n',
    );

    await expect(
      archiveProjectOnCompletion({
        repoRoot,
        projectPath: mutatedProject,
        projectName: 'mutated',
        projectsRoot: '.oat/projects/shared',
        projectRecapRun: mutated.relativeRunPath,
        s3SyncOnComplete: false,
      }),
    ).rejects.toThrow(/hash verification failed.*run-request\.json/i);
  });

  it.each(['failed', 'incomplete'] as const)(
    'rejects partial review evidence retained by a %s package',
    async (outcome) => {
      const repoRoot = await createRepoRoot();
      const projectPath = join(repoRoot, '.oat', 'projects', 'shared', outcome);
      await mkdir(projectPath, { recursive: true });
      const recap = await createRecapPackage(projectPath, { outcome });
      const partialPath = 'qa/review-gate/attempt-1-error.json';
      const partialContents = '{"code":"E_VISUAL_REVIEW"}\n';
      await mkdir(dirname(join(recap.runRoot, partialPath)), {
        recursive: true,
      });
      await writeFile(join(recap.runRoot, partialPath), partialContents);
      const manifest = JSON.parse(
        await readFile(recap.manifestPath, 'utf8'),
      ) as { immutableHashes: Record<string, string> };
      manifest.immutableHashes[partialPath] =
        `sha256:${createHash('sha256').update(partialContents).digest('hex')}`;
      await writeFile(recap.manifestPath, `${JSON.stringify(manifest)}\n`);

      await expect(
        archiveProjectOnCompletion({
          repoRoot,
          projectPath,
          projectName: outcome,
          projectsRoot: '.oat/projects/shared',
          projectRecapRun: recap.relativeRunPath,
          s3SyncOnComplete: false,
        }),
      ).rejects.toThrow(/incomplete visual-review evidence chain/i);
    },
  );

  it('preserves existing behavior when no recap run is selected', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });

    const result = await archiveProjectOnCompletion({
      repoRoot,
      projectPath,
      projectName: 'demo',
      projectsRoot: '.oat/projects/shared',
      s3SyncOnComplete: false,
    });

    expect(result.projectRecapExport).toBeNull();
    await expect(access(projectPath)).rejects.toThrow();
  });

  it.each(['../outside-run', 'explainers/project-recap/../../../outside-run'])(
    'rejects recap paths outside the project explainers directory: %s',
    async (projectRecapRun) => {
      const repoRoot = await createRepoRoot();
      const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
      await mkdir(projectPath, { recursive: true });
      const removePath = vi.fn(async () => undefined);

      await expect(
        archiveProjectOnCompletion(
          {
            repoRoot,
            projectPath,
            projectName: 'demo',
            projectsRoot: '.oat/projects/shared',
            projectRecapRun,
            s3SyncOnComplete: false,
          },
          { removePath },
        ),
      ).rejects.toThrow(/inside.*explainers/i);

      expect(removePath).not.toHaveBeenCalled();
      await expect(access(projectPath)).resolves.toBeUndefined();
    },
  );

  it('rejects a recap path that escapes explainers through a symlink', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    const outside = join(repoRoot, 'outside-run');
    await mkdir(join(projectPath, 'explainers'), { recursive: true });
    await mkdir(outside, { recursive: true });
    await symlink(outside, join(projectPath, 'explainers', 'linked-run'));

    await expect(
      archiveProjectOnCompletion({
        repoRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        projectRecapRun: 'explainers/linked-run',
        s3SyncOnComplete: false,
      }),
    ).rejects.toThrow(/inside.*explainers/i);

    await expect(access(projectPath)).resolves.toBeUndefined();
  });

  it('requires exact project-recap recipe identity', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    const recap = await createRecapPackage(projectPath, {
      recipeId: 'project-explainer',
    });

    await expect(
      archiveProjectOnCompletion({
        repoRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        projectRecapRun: recap.relativeRunPath,
        s3SyncOnComplete: false,
      }),
    ).rejects.toThrow(/recipe.*project-recap/i);

    await expect(access(projectPath)).resolves.toBeUndefined();
  });

  it('refuses to export a recap whose visual review gate is unresolved', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    const recap = await createRecapPackage(projectPath, {
      outcome: 'built-needs-review',
    });

    await expect(
      archiveProjectOnCompletion({
        repoRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        projectRecapRun: recap.relativeRunPath,
        s3SyncOnComplete: false,
      }),
    ).rejects.toThrow(/built-needs-review.*visual review.*before archival/i);

    await expect(access(projectPath)).resolves.toBeUndefined();
  });

  it('rejects an incomplete immutable visual-review evidence chain', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    const recap = await createRecapPackage(projectPath);
    const manifest = JSON.parse(await readFile(recap.manifestPath, 'utf8')) as {
      immutableHashes: Record<string, string>;
    };
    delete manifest.immutableHashes['qa/visual-review/attempt-1/result.json'];
    await writeFile(recap.manifestPath, `${JSON.stringify(manifest)}\n`);

    await expect(
      archiveProjectOnCompletion(
        {
          repoRoot,
          projectPath,
          projectName: 'demo',
          projectsRoot: '.oat/projects/shared',
          projectRecapRun: recap.relativeRunPath,
          s3SyncOnComplete: false,
        },
        { timestamp: () => '2026-04-01T12:34:56Z' },
      ),
    ).rejects.toThrow(/incomplete visual-review evidence chain/i);
  });

  it('fails without overwrite when the recap destination already exists', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    const recap = await createRecapPackage(projectPath);
    const exportRoot = join(
      repoRoot,
      '.oat',
      'repo',
      'reference',
      'project-recaps',
      '20260401-demo',
    );
    await mkdir(exportRoot, { recursive: true });
    await writeFile(join(exportRoot, 'keep.txt'), 'original\n', 'utf8');

    await expect(
      archiveProjectOnCompletion(
        {
          repoRoot,
          projectPath,
          projectName: 'demo',
          projectsRoot: '.oat/projects/shared',
          projectRecapRun: recap.relativeRunPath,
          s3SyncOnComplete: false,
        },
        { timestamp: () => '2026-04-01T12:34:56Z' },
      ),
    ).rejects.toThrow(/already exists/i);

    await expect(readFile(join(exportRoot, 'keep.txt'), 'utf8')).resolves.toBe(
      'original\n',
    );
    await expect(access(projectPath)).resolves.toBeUndefined();
  });

  it('cleans the temporary sibling and keeps the active project when copied hashes do not verify', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    const recap = await createRecapPackage(projectPath);
    const copyDirectory = vi.fn(async (source: string, destination: string) => {
      await cp(source, destination, { recursive: true });
      await writeFile(
        join(destination, 'source', 'content', 'recap.md'),
        '# corrupted\n',
        'utf8',
      );
    });
    const removePath = vi.fn(
      async (target: string, options: { recursive: true; force: true }) =>
        rm(target, options),
    );

    await expect(
      archiveProjectOnCompletion(
        {
          repoRoot,
          projectPath,
          projectName: 'demo',
          projectsRoot: '.oat/projects/shared',
          projectRecapRun: recap.relativeRunPath,
          s3SyncOnComplete: false,
        },
        {
          copyDirectory,
          removePath,
          timestamp: () => '2026-04-01T12:34:56Z',
        },
      ),
    ).rejects.toThrow(/hash/i);

    await expect(access(projectPath)).resolves.toBeUndefined();
    expect(removePath).not.toHaveBeenCalledWith(projectPath, expect.anything());
    const exportParent = join(
      repoRoot,
      '.oat',
      'repo',
      'reference',
      'project-recaps',
    );
    expect(await readdir(exportParent)).toEqual([]);
  });

  it('accepts canonical immutable GitHub source backlinks', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    const recap = await createRecapPackage(projectPath, {
      sourceBacklinks: [
        {
          sourceId: 'plan',
          url: `https://github.com/acme/project/blob/${'1'.repeat(40)}/docs/phase%204/plan.md#L12-L19`,
        },
      ],
    });

    await expect(
      verifySelectedProjectRecapForArchive(projectPath, recap.relativeRunPath),
    ).resolves.toBeUndefined();
  });

  it.each([
    {
      name: 'an unknown backlink key',
      backlinks: [
        {
          sourceId: 'plan',
          url: `https://github.com/acme/project/blob/${'1'.repeat(40)}/plan.md#L1`,
          branch: 'main',
        },
      ],
    },
    {
      name: 'a moving branch revision',
      backlinks: [
        {
          sourceId: 'plan',
          url: 'https://github.com/acme/project/blob/main/plan.md#L1',
        },
      ],
    },
    {
      name: 'a non-GitHub source URL',
      backlinks: [
        {
          sourceId: 'plan',
          url: `https://example.com/acme/project/blob/${'1'.repeat(40)}/plan.md#L1`,
        },
      ],
    },
    {
      name: 'an invalid line range',
      backlinks: [
        {
          sourceId: 'plan',
          url: `https://github.com/acme/project/blob/${'1'.repeat(40)}/plan.md#L19-L12`,
        },
      ],
    },
    {
      name: 'a literal dot segment that normalizes to a moving ref',
      backlinks: [
        {
          sourceId: 'plan',
          url: `https://github.com/acme/project/blob/${'1'.repeat(40)}/../main/plan.md#L1`,
        },
      ],
    },
    {
      name: 'an encoded dot segment that normalizes to a moving ref',
      backlinks: [
        {
          sourceId: 'plan',
          url: `https://github.com/acme/project/blob/${'1'.repeat(40)}/%2e%2e/main/plan.md#L1`,
        },
      ],
    },
    {
      name: 'an empty path segment',
      backlinks: [
        {
          sourceId: 'plan',
          url: `https://github.com/acme/project/blob/${'1'.repeat(40)}/docs//plan.md#L1`,
        },
      ],
    },
    {
      name: 'a decoded slash path segment',
      backlinks: [
        {
          sourceId: 'plan',
          url: `https://github.com/acme/project/blob/${'1'.repeat(40)}/docs/%2Fplan.md#L1`,
        },
      ],
    },
    {
      name: 'noncanonical encoding of an unreserved character',
      backlinks: [
        {
          sourceId: 'plan',
          url: `https://github.com/acme/project/blob/${'1'.repeat(40)}/docs/%70lan.md#L1`,
        },
      ],
    },
  ])('rejects source backlinks with $name', async ({ backlinks }) => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    const recap = await createRecapPackage(projectPath, {
      sourceBacklinks: backlinks,
    });

    await expect(
      verifySelectedProjectRecapForArchive(projectPath, recap.relativeRunPath),
    ).rejects.toThrow(/manifest contract/i);
  });

  it.each([
    {
      name: 'wrong schema version',
      mutate: (manifest: Record<string, unknown>) => {
        manifest.schemaVersion = 'explainer-kit.manifest/v2';
      },
    },
    {
      name: 'empty immutable hash map',
      mutate: (manifest: Record<string, unknown>) => {
        manifest.immutableHashes = {};
      },
    },
    {
      name: 'omitted immutable artifact',
      mutate: (manifest: Record<string, unknown>) => {
        const hashes = manifest.immutableHashes as Record<string, string>;
        delete hashes['theme.resolved.json'];
      },
    },
  ])('rejects a selected recap manifest with $name', async ({ mutate }) => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    const recap = await createRecapPackage(projectPath);
    const manifest = JSON.parse(
      await readFile(recap.manifestPath, 'utf8'),
    ) as Record<string, unknown>;
    mutate(manifest);
    await writeFile(
      recap.manifestPath,
      `${JSON.stringify(manifest)}\n`,
      'utf8',
    );

    await expect(
      archiveProjectOnCompletion(
        {
          repoRoot,
          projectPath,
          projectName: 'demo',
          projectsRoot: '.oat/projects/shared',
          projectRecapRun: recap.relativeRunPath,
          s3SyncOnComplete: false,
        },
        { timestamp: () => '2026-04-01T12:34:56Z' },
      ),
    ).rejects.toThrow(/manifest|immutable/i);

    await expect(access(projectPath)).resolves.toBeUndefined();
  });

  it.each(['run-request.json', 'source/content-approval.json'])(
    'rejects legacy recap manifests that omit immutable %s coverage',
    async (relativePath) => {
      const repoRoot = await createRepoRoot();
      const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
      await mkdir(projectPath, { recursive: true });
      const recap = await createRecapPackage(projectPath);
      const manifest = JSON.parse(
        await readFile(recap.manifestPath, 'utf8'),
      ) as {
        immutableHashes: Record<string, string>;
      };
      delete manifest.immutableHashes[relativePath];
      await writeFile(
        recap.manifestPath,
        `${JSON.stringify(manifest)}\n`,
        'utf8',
      );

      await expect(
        archiveProjectOnCompletion(
          {
            repoRoot,
            projectPath,
            projectName: 'demo',
            projectsRoot: '.oat/projects/shared',
            projectRecapRun: recap.relativeRunPath,
            s3SyncOnComplete: false,
          },
          { timestamp: () => '2026-04-01T12:34:56Z' },
        ),
      ).rejects.toThrow(
        new RegExp(`legacy.*${relativePath.replaceAll('.', '\\.')}`, 'i'),
      );

      await expect(access(projectPath)).resolves.toBeUndefined();
    },
  );

  it('rolls back only its recap export when the later archive copy fails', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    const recap = await createRecapPackage(projectPath);
    let copyCount = 0;
    const copyDirectory = vi.fn(async (source: string, destination: string) => {
      copyCount += 1;
      if (copyCount === 2) {
        throw new Error('injected second copy failure');
      }
      await cp(source, destination, { recursive: true });
    });
    const exportRoot = join(
      repoRoot,
      '.oat',
      'repo',
      'reference',
      'project-recaps',
      '20260401-demo',
    );

    await expect(
      archiveProjectOnCompletion(
        {
          repoRoot,
          projectPath,
          projectName: 'demo',
          projectsRoot: '.oat/projects/shared',
          projectRecapRun: recap.relativeRunPath,
          s3SyncOnComplete: false,
        },
        {
          copyDirectory,
          timestamp: () => '2026-04-01T12:34:56Z',
        },
      ),
    ).rejects.toThrow('injected second copy failure');

    expect(copyDirectory).toHaveBeenCalledTimes(2);
    await expect(access(projectPath)).resolves.toBeUndefined();
    await expect(access(exportRoot)).rejects.toThrow();
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
        '--exclude',
        'reviews/*',
        '--exclude',
        'pr/*',
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

  it('resolves a unique primary-checkout archive target from a linked worktree', async () => {
    const tempRoot = await createRepoRoot();
    const mainRepoRoot = join(tempRoot, 'main-repo');
    const worktreeRoot = join(tempRoot, 'feature-worktree');

    await mkdir(join(mainRepoRoot, '.git'), { recursive: true });
    await mkdir(join(mainRepoRoot, '.oat', 'projects', 'archived', 'demo'), {
      recursive: true,
    });
    await mkdir(worktreeRoot, { recursive: true });

    const gitExecFile = vi.fn(async (file: string, args: string[]) => {
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

    const target = await resolveArchiveProjectTarget(
      {
        repoRoot: worktreeRoot,
        projectsRoot: '.oat/projects/shared',
        projectName: 'demo',
      },
      {
        gitExecFile,
        timestamp: () => '2026-04-01T12:34:56Z',
      },
    );

    expect(target.archivePath).toBe(
      join(mainRepoRoot, '.oat', 'projects', 'archived', 'demo-20260401123456'),
    );
    expect(target.archivePathIsGitignored).toBe(true);
    expect(target.primaryRepoRoot).toBe(mainRepoRoot);
    expect(target.primaryRepoRootAvailable).toBe(true);
    expect(target.localOnlyWarning).toBeNull();
  });

  it('fails before mutating when an ignored worktree archive has no primary checkout', async () => {
    const tempRoot = await createRepoRoot();
    const missingMainRepoRoot = join(tempRoot, 'missing-main-repo');
    const worktreeRoot = join(tempRoot, 'feature-worktree');
    const projectPath = join(
      worktreeRoot,
      '.oat',
      'projects',
      'shared',
      'demo',
    );

    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'summary.md'), '# summary\n', 'utf8');

    const gitExecFile = vi.fn(async (file: string, args: string[]) => {
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
          stdout: join(missingMainRepoRoot, '.git'),
          stderr: '',
        };
      }
      if (
        file === 'git' &&
        args[0] === 'rev-parse' &&
        args[1] === '--git-dir'
      ) {
        return {
          stdout: join(
            missingMainRepoRoot,
            '.git',
            'worktrees',
            'feature-worktree',
          ),
          stderr: '',
        };
      }

      throw new Error(`Unexpected command: ${file} ${args.join(' ')}`);
    });
    const copyDirectory = vi.fn(async () => undefined);
    const removePath = vi.fn(async () => undefined);

    await expect(
      archiveProjectOnCompletion(
        {
          repoRoot: worktreeRoot,
          projectPath,
          projectName: 'demo',
          projectsRoot: '.oat/projects/shared',
          s3SyncOnComplete: false,
        },
        {
          gitExecFile,
          copyDirectory,
          removePath,
        },
      ),
    ).rejects.toThrow(
      'Refusing to archive project `demo` because `.oat/projects/archived/demo` is gitignored in this worktree',
    );

    expect(copyDirectory).not.toHaveBeenCalled();
    expect(removePath).not.toHaveBeenCalled();
    expect(gitExecFile).toHaveBeenCalledWith(
      'git',
      ['check-ignore', '--quiet', '--no-index', '.oat/projects/archived/demo'],
      expect.objectContaining({ cwd: worktreeRoot }),
    );
  });

  it('uploads completion archives under the primary repo root slug from a linked worktree', async () => {
    const tempRoot = await createRepoRoot();
    const mainRepoRoot = join(tempRoot, 'stoa');
    const worktreeRoot = join(tempRoot, 'sc-pinned-cryostat-af7a');
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

    const gitExecFile = vi.fn(async (file: string, args: string[]) => {
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
          stdout: join(
            mainRepoRoot,
            '.git',
            'worktrees',
            'sc-pinned-cryostat-af7a',
          ),
          stderr: '',
        };
      }

      throw new Error(`Unexpected command: ${file} ${args.join(' ')}`);
    });
    const execFile = vi.fn(async () => ({ stdout: '', stderr: '' }));

    const result = await archiveProjectOnCompletion(
      {
        repoRoot: worktreeRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        s3Uri: 's3://example-bucket/oat-archive',
        s3SyncOnComplete: true,
      },
      {
        execFile,
        gitExecFile,
        ensureS3ArchiveAccess: vi.fn(async () => ({ ok: true, warnings: [] })),
        timestamp: () => '2026-04-01T12:34:56Z',
      },
    );

    expect(result.s3Path).toBe(
      's3://example-bucket/oat-archive/stoa/projects/20260401-demo',
    );
    expect(execFile).toHaveBeenCalledWith(
      'aws',
      [
        's3',
        'sync',
        join(mainRepoRoot, '.oat', 'projects', 'archived', 'demo'),
        's3://example-bucket/oat-archive/stoa/projects/20260401-demo',
        '--exclude',
        'reviews/*',
        '--exclude',
        'pr/*',
      ],
      expect.objectContaining({ cwd: worktreeRoot }),
    );
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
        'AWS CLI is required for `oat repo archive sync`, but it is not configured for access to `archive.s3Uri`. Configure AWS credentials or profile settings and retry.',
      ),
    );
  });

  describe('AWS profile/region env plumbing', () => {
    it('forwards awsProfile + awsRegion env to aws s3 sync during completion', async () => {
      const repoRoot = await createRepoRoot();
      const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
      await mkdir(projectPath, { recursive: true });

      const execFile = vi.fn(async () => ({ stdout: '', stderr: '' }));
      const ensureAccess = vi.fn(async () => ({ ok: true, warnings: [] }));

      await archiveProjectOnCompletion(
        {
          repoRoot,
          projectPath,
          projectName: 'demo',
          projectsRoot: '.oat/projects/shared',
          s3Uri: 's3://example-bucket/oat-archive',
          s3SyncOnComplete: true,
          awsProfile: 'work-sso',
          awsRegion: 'us-east-1',
        },
        {
          execFile,
          ensureS3ArchiveAccess: ensureAccess,
          env: { PATH: '/usr/bin' },
          timestamp: () => '2026-04-01T12:34:56Z',
        },
      );

      expect(ensureAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'completion',
          s3Uri: 's3://example-bucket/oat-archive',
          syncOnComplete: true,
          awsProfile: 'work-sso',
          awsRegion: 'us-east-1',
        }),
        expect.anything(),
      );

      const syncCall = execFile.mock.calls.find(
        (call) => call[0] === 'aws' && call[1][0] === 's3',
      );
      expect(syncCall).toBeDefined();
      const env = syncCall?.[2]?.env as NodeJS.ProcessEnv;
      expect(env.AWS_PROFILE).toBe('work-sso');
      expect(env.AWS_REGION).toBe('us-east-1');
    });

    it('forwards awsProfile + awsRegion env to ensureS3ArchiveAccess aws spawns', async () => {
      const execFile = vi.fn(async () => ({ stdout: '', stderr: '' }));

      const result = await ensureS3ArchiveAccess(
        {
          mode: 'sync',
          s3Uri: 's3://example-bucket/oat-archive',
          syncOnComplete: true,
          awsProfile: 'work-sso',
          awsRegion: 'us-east-1',
        },
        {
          execFile,
          env: { PATH: '/usr/bin' },
        },
      );

      expect(result.ok).toBe(true);
      expect(execFile).toHaveBeenCalledTimes(2);

      const versionCall = execFile.mock.calls.find(
        (call) => call[0] === 'aws' && call[1][0] === '--version',
      );
      const stsCall = execFile.mock.calls.find(
        (call) => call[0] === 'aws' && call[1][0] === 'sts',
      );

      expect(versionCall).toBeDefined();
      expect(stsCall).toBeDefined();

      const versionEnv = versionCall?.[2]?.env as NodeJS.ProcessEnv;
      expect(versionEnv.AWS_PROFILE).toBe('work-sso');
      expect(versionEnv.AWS_REGION).toBe('us-east-1');

      const stsEnv = stsCall?.[2]?.env as NodeJS.ProcessEnv;
      expect(stsEnv.AWS_PROFILE).toBe('work-sso');
      expect(stsEnv.AWS_REGION).toBe('us-east-1');
    });

    it('preserves parent-process AWS_PROFILE when no config value is supplied', async () => {
      const execFile = vi.fn(async () => ({ stdout: '', stderr: '' }));

      await ensureS3ArchiveAccess(
        {
          mode: 'sync',
          s3Uri: 's3://example-bucket/oat-archive',
          syncOnComplete: true,
        },
        {
          execFile,
          env: { PATH: '/usr/bin', AWS_PROFILE: 'parent-profile' },
        },
      );

      const versionCall = execFile.mock.calls.find(
        (call) => call[0] === 'aws' && call[1][0] === '--version',
      );
      const env = versionCall?.[2]?.env as NodeJS.ProcessEnv;
      expect(env.AWS_PROFILE).toBe('parent-profile');
    });

    it('clobbers parent-process AWS_PROFILE when config supplies a value (config wins)', async () => {
      const execFile = vi.fn(async () => ({ stdout: '', stderr: '' }));

      await ensureS3ArchiveAccess(
        {
          mode: 'sync',
          s3Uri: 's3://example-bucket/oat-archive',
          syncOnComplete: true,
          awsProfile: 'config-profile',
        },
        {
          execFile,
          env: { PATH: '/usr/bin', AWS_PROFILE: 'parent-profile' },
        },
      );

      const versionCall = execFile.mock.calls.find(
        (call) => call[0] === 'aws' && call[1][0] === '--version',
      );
      const env = versionCall?.[2]?.env as NodeJS.ProcessEnv;
      expect(env.AWS_PROFILE).toBe('config-profile');
    });

    it('clobbers parent-process AWS_REGION when config supplies a value (config wins)', async () => {
      const execFile = vi.fn(async () => ({ stdout: '', stderr: '' }));

      await ensureS3ArchiveAccess(
        {
          mode: 'sync',
          s3Uri: 's3://example-bucket/oat-archive',
          syncOnComplete: true,
          awsRegion: 'us-east-1',
        },
        {
          execFile,
          env: { PATH: '/usr/bin', AWS_REGION: 'eu-west-2' },
        },
      );

      const versionCall = execFile.mock.calls.find(
        (call) => call[0] === 'aws' && call[1][0] === '--version',
      );
      const env = versionCall?.[2]?.env as NodeJS.ProcessEnv;
      expect(env.AWS_REGION).toBe('us-east-1');
    });

    it('does not inject AWS_PROFILE when neither config nor parent env supplies one', async () => {
      const execFile = vi.fn(async () => ({ stdout: '', stderr: '' }));

      await ensureS3ArchiveAccess(
        {
          mode: 'sync',
          s3Uri: 's3://example-bucket/oat-archive',
          syncOnComplete: true,
        },
        {
          execFile,
          env: { PATH: '/usr/bin' },
        },
      );

      const versionCall = execFile.mock.calls.find(
        (call) => call[0] === 'aws' && call[1][0] === '--version',
      );
      const env = versionCall?.[2]?.env as NodeJS.ProcessEnv;
      expect('AWS_PROFILE' in env).toBe(false);
      expect('AWS_REGION' in env).toBe(false);
    });

    it('treats empty-string awsProfile/awsRegion as unset', async () => {
      const execFile = vi.fn(async () => ({ stdout: '', stderr: '' }));

      await ensureS3ArchiveAccess(
        {
          mode: 'sync',
          s3Uri: 's3://example-bucket/oat-archive',
          syncOnComplete: true,
          awsProfile: '',
          awsRegion: '',
        },
        {
          execFile,
          env: { PATH: '/usr/bin', AWS_PROFILE: 'parent-profile' },
        },
      );

      const versionCall = execFile.mock.calls.find(
        (call) => call[0] === 'aws' && call[1][0] === '--version',
      );
      const env = versionCall?.[2]?.env as NodeJS.ProcessEnv;
      expect(env.AWS_PROFILE).toBe('parent-profile');
      expect('AWS_REGION' in env).toBe(false);
    });

    it('treats whitespace-only awsProfile/awsRegion as unset', async () => {
      const execFile = vi.fn(async () => ({ stdout: '', stderr: '' }));

      await ensureS3ArchiveAccess(
        {
          mode: 'sync',
          s3Uri: 's3://example-bucket/oat-archive',
          syncOnComplete: true,
          awsProfile: '   ',
          awsRegion: '\t  ',
        },
        {
          execFile,
          env: { PATH: '/usr/bin' },
        },
      );

      const versionCall = execFile.mock.calls.find(
        (call) => call[0] === 'aws' && call[1][0] === '--version',
      );
      const env = versionCall?.[2]?.env as NodeJS.ProcessEnv;
      expect('AWS_PROFILE' in env).toBe(false);
      expect('AWS_REGION' in env).toBe(false);
    });
  });
});
