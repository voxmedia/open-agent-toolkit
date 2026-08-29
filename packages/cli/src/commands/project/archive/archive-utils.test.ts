import { createHash } from 'node:crypto';
import {
  access,
  cp,
  copyFile,
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
import { dirname, isAbsolute, join } from 'node:path';

import { defaultGitRunner } from '@commands/project/sync/git';
import {
  buildSyncedRecord,
  readSyncedRecord,
  writeSyncedRecord,
} from '@commands/project/sync/record';
import {
  buildSyncTarget,
  createSyncedProject,
  pushSynced,
} from '@commands/project/sync/ref-sync';
import { syncedRecordPath } from '@commands/shared/project-scope';
import { CliError } from '@errors/cli-error';
import { createSyncedFixture } from '@test-support/synced-fixture';
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
import { loadExplainerTerminalEvidence } from './explainer-terminal-evidence';

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
      includeTerminalEvidence,
      mode = 'unattended',
      outcome = 'built-not-durable',
      recipeId = 'project-recap',
      runName = 'selected-run',
      sourceBacklinks,
    }: {
      distinctCanonicalHashes?: boolean;
      includeReviewEvidence?: boolean;
      includeTerminalEvidence?: boolean;
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
    const files: Record<string, string | Buffer> = {
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
      const runtime = {
        kind: 'launched',
        name: 'chromium',
        version: '123.0.6312.0',
      };
      const capture = {
        format: 'png',
        fullPage: false,
        reducedMotion: 'reduce',
        animationsDisabled: true,
      };
      const captureIdentity = canonicalHash({ runtime, capture });
      const renderedHash = hashContent(files['site/index.html']);
      const plan = {
        schemaVersion: 'explainer-kit.set-plan/v1',
        planId: 'recap-plan',
        recipe: { id: 'project-recap', version: '1' },
        sourceIds: ['plan'],
        ledger: {
          terminology: [{ term: 'recap', meaning: 'The project recap.' }],
          statuses: [{ subject: 'review', value: 'passed' }],
          numbers: [{ subject: 'artifacts', value: 1, unit: 'artifact' }],
        },
        portfolio: [
          {
            artifactId: 'recap',
            artifactType: 'hub',
            profileId: 'recap-hub',
            required: true,
            sourceIds: ['plan'],
            draft: 'Summarize the completed project.',
            visualIntent: 'Lead with the reviewed outcome.',
          },
        ],
      };
      const evidence = [];
      for (const viewport of ['mobile', 'tablet', 'desktop']) {
        const screenshot = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ]);
        const metrics = `${JSON.stringify({
          schemaVersion: 'explainer-kit.browser-evidence/v2',
          artifactId: 'recap',
          viewport,
          scenario: 'default',
          runtime,
          capture,
          captureIdentity,
          metrics: {
            pageOverflowX: false,
            clippedX: [],
            viewportClipped: [],
            unreadableHeadings: [],
          },
        })}\n`;
        const screenshotPath = `qa/browser/recap/${viewport}.png`;
        const metricsPath = `qa/browser/recap/${viewport}.json`;
        files[screenshotPath] = screenshot;
        files[metricsPath] = metrics;
        files[`qa/visual-review/attempt-1/evidence/recap/${viewport}.png`] =
          screenshot;
        files[`qa/visual-review/attempt-1/evidence/recap/${viewport}.json`] =
          metrics;
        evidence.push({
          viewport,
          screenshotPath,
          screenshotHash: hashContent(screenshot),
          metricsPath,
          metricsHash: hashContent(metrics),
          captureIdentity,
        });
      }
      const requestPayload = {
        schemaVersion: 'explainer-kit.visual-review-request/v1',
        browserRuntime: runtime,
        captureIdentity,
        plan,
        renderedArtifacts: [
          {
            artifactId: 'recap',
            renderedPath: 'site/index.html',
            renderedHash,
            cohesionObservations: [
              {
                artifactId: 'recap',
                contentHash: renderedHash,
                group: 'terminology',
                claim: 'recap',
                value: 'recap',
              },
              {
                artifactId: 'recap',
                contentHash: renderedHash,
                group: 'statuses',
                claim: 'review',
                value: 'passed',
              },
              {
                artifactId: 'recap',
                contentHash: renderedHash,
                group: 'numericClaims',
                claim: 'artifacts',
                value: 1,
              },
            ],
            evidence,
          },
        ],
      };
      const requestHash = canonicalHash(requestPayload);
      const reviewRequest = {
        ...requestPayload,
        requestId: `visual-review-${requestHash.replace(/^sha256:/, '')}`,
        requestHash,
      };
      files['qa/visual-review/attempt-1/request.json'] =
        `${JSON.stringify(reviewRequest)}\n`;
      files['qa/visual-review/attempt-1/result.json'] = `${JSON.stringify({
        schemaVersion: 'explainer-kit.visual-review-evidence/v1',
        requestHash,
        attempt: 1,
        disposition: 'pass',
        reasons: [],
      })}\n`;
    }

    for (const [relativePath, contents] of Object.entries(files)) {
      const target = join(runRoot, relativePath);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents);
    }

    const immutableHashes = Object.fromEntries(
      Object.entries(files).map(([relativePath, contents]) => [
        relativePath,
        hashContent(contents),
      ]),
    );
    const manifestPath = join(runRoot, 'manifest.json');
    const manifest = {
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
    };
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, 'utf8');
    await writeFile(join(runRoot, 'build-record.json'), '{}\n', 'utf8');
    if (
      includeTerminalEvidence ??
      ['built-needs-review', 'failed'].includes(outcome)
    ) {
      const terminalEvidence = await loadExplainerTerminalEvidence();
      await terminalEvidence.writeTerminalEvidence(
        {
          runId: manifest.runId,
          slug: manifest.slug,
          runRoot,
        },
        {
          outcome,
          manifest,
          reasons: [
            {
              stage: outcome === 'failed' ? 'durability' : 'visual-review',
              kind: outcome === 'failed' ? 'provider-failure' : 'finding',
              artifactId: 'recap',
              count: 1,
            },
          ],
          evidenceDisposition: 'retained',
        },
      );
    }

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

  it('refuses a persisted archive snapshot without its originating scope', async () => {
    const repoRoot = await createRepoRoot();

    await expect(
      resolveArchiveProjectTarget({
        repoRoot,
        projectsRoot: '.oat/projects/shared',
        projectName: 'demo',
        archiveSnapshot: '20260827-demo',
      }),
    ).rejects.toEqual(
      new CliError(
        'Persisted archive snapshot `20260827-demo` is missing its originating project scope; refusing an unscoped retry.',
      ),
    );
  });

  it('refuses to archive a project outside every configured scope root', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, 'outside', 'demo');
    const statePath = join(projectPath, 'state.md');
    await mkdir(projectPath, { recursive: true });
    await writeFile(statePath, '# state\n', 'utf8');

    await expect(
      archiveProjectOnCompletion({
        repoRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        s3SyncOnComplete: false,
      }),
    ).rejects.toEqual(
      new CliError(
        `Project path \`${projectPath}\` is outside the configured shared, local, and synced scope roots; refusing to archive without an originating scope.`,
        1,
      ),
    );
    await expect(readFile(statePath, 'utf8')).resolves.toBe('# state\n');
    await expect(
      access(join(repoRoot, '.oat', 'projects', 'archived')),
    ).rejects.toThrow();
  });

  it('refuses a foreign project path with matching scope segments before mutation', async () => {
    const repoRoot = await createRepoRoot();
    const foreignRoot = await createRepoRoot();
    const projectPath = join(foreignRoot, '.oat', 'projects', 'shared', 'demo');
    const statePath = join(projectPath, 'state.md');
    await mkdir(projectPath, { recursive: true });
    await writeFile(statePath, '# foreign state\n', 'utf8');

    await expect(
      archiveProjectOnCompletion({
        repoRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        s3SyncOnComplete: false,
      }),
    ).rejects.toMatchObject({
      name: 'CliError',
      exitCode: 1,
      message: expect.stringContaining('outside the configured'),
    });
    await expect(readFile(statePath, 'utf8')).resolves.toBe(
      '# foreign state\n',
    );
    await expect(
      access(join(repoRoot, '.oat', 'projects', 'archived')),
    ).rejects.toThrow();
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

  it('rejects an existing archive whose snapshot metadata has the wrong scope', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    const archivePath = join(repoRoot, '.oat', 'projects', 'archived', 'demo');
    await mkdir(projectPath, { recursive: true });
    await mkdir(archivePath, { recursive: true });
    await writeFile(join(projectPath, 'state.md'), '# state\n', 'utf8');
    await writeFile(
      join(archivePath, ARCHIVE_SNAPSHOT_METADATA_FILENAME),
      `${JSON.stringify({
        projectName: 'demo',
        snapshotName: '20260827-demo',
        scope: 'local',
      })}\n`,
      'utf8',
    );
    const targetExists = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expect(
      archiveProjectOnCompletion(
        {
          repoRoot,
          projectPath,
          projectName: 'demo',
          projectsRoot: '.oat/projects/shared',
          s3SyncOnComplete: false,
        },
        {
          dirExists: targetExists,
          timestamp: () => '2026-08-27T12:00:00Z',
        },
      ),
    ).rejects.toEqual(
      new CliError(
        `Existing archive \`${archivePath}\` does not match persisted snapshot \`20260827-demo\`; refusing to overwrite it.`,
      ),
    );
  });

  it.each([
    ['shared', 'valid'],
    ['shared', 'malformed'],
    ['local', 'valid'],
    ['local', 'malformed'],
  ] as const)(
    'archives a %s project without reading an unrelated %s same-slug synced record',
    async (scope, recordState) => {
      const repoRoot = await createRepoRoot();
      const projectPath = join(
        repoRoot,
        '.oat',
        'projects',
        scope,
        'same-slug',
      );
      await mkdir(projectPath, { recursive: true });
      await writeFile(join(projectPath, 'state.md'), `# ${scope}\n`, 'utf8');
      const recordPath = join(
        repoRoot,
        '.oat',
        'projects',
        'synced',
        'same-slug.json',
      );
      if (recordState === 'valid') {
        await writeSyncedRecord(recordPath, {
          ...buildSyncedRecord('same-slug', new Date('2026-08-27T00:00:00Z')),
          archiveSnapshot: 'unrelated-synced-snapshot',
        });
      } else {
        await mkdir(join(repoRoot, '.oat', 'projects', 'synced'), {
          recursive: true,
        });
        await writeFile(recordPath, '{ malformed\n', 'utf8');
      }

      const result = await archiveProjectOnCompletion({
        repoRoot,
        projectPath,
        projectName: 'same-slug',
        projectsRoot: '.oat/projects/shared',
        s3SyncOnComplete: false,
      });

      expect(result.archivePath).toBe(
        join(repoRoot, '.oat', 'projects', 'archived', 'same-slug'),
      );
      await expect(
        readFile(join(result.archivePath, 'state.md'), 'utf8'),
      ).resolves.toBe(`# ${scope}\n`);
      await expect(readFile(recordPath, 'utf8')).resolves.toContain(
        recordState === 'valid' ? 'unrelated-synced-snapshot' : '{ malformed',
      );
    },
  );

  it('archives a clean pushed synced project and removes only its checkout', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'demo',
      );
      await createSyncedProject(target, defaultGitRunner);
      await mkdir(join(target.projectPath, 'reviews'), { recursive: true });
      await writeFile(
        join(target.projectPath, 'state.md'),
        '# state\n',
        'utf8',
      );
      await writeFile(
        join(target.projectPath, 'summary.md'),
        '# summary\n',
        'utf8',
      );
      await writeFile(
        join(target.projectPath, 'reviews', 'review.md'),
        '# review\n',
        'utf8',
      );
      const recap = await createRecapPackage(target.projectPath);
      await pushSynced(target, defaultGitRunner, {});
      const recordPath = syncedRecordPath(target.syncedRoot, target.slug);
      await writeSyncedRecord(
        recordPath,
        buildSyncedRecord('demo', new Date('2026-08-27T00:00:00Z')),
      );

      const options = {
        repoRoot: fixture.cloneA,
        projectPath: target.projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        summaryExportPath: '.oat/repo/reference/project-summaries',
        s3Uri: 's3://archive-bucket/projects',
        s3SyncOnComplete: true,
        projectRecapRun: recap.relativeRunPath,
      };
      const s3Calls: string[][] = [];
      const commonDependencies = {
        ensureS3ArchiveAccess: vi.fn(async () => ({
          ok: true,
          warnings: [],
        })),
        execFile: vi.fn(async (_file: string, args: readonly string[]) => {
          s3Calls.push([...args]);
          return { stdout: '', stderr: '' };
        }),
      };
      const result = await archiveProjectOnCompletion(options, {
        ...commonDependencies,
        timestamp: () => '2026-08-27T12:00:00Z',
      });
      const snapshotId = '20260827-demo';

      await expect(access(target.projectPath)).rejects.toThrow();
      expect(result.archivePath).toBe(
        join(fixture.cloneA, '.oat', 'projects', 'archived', 'demo'),
      );
      await expect(access(join(result.archivePath, '.git'))).rejects.toThrow();
      await expect(
        access(join(result.archivePath, 'reviews')),
      ).rejects.toThrow();
      await expect(
        readFile(join(result.archivePath, 'summary.md'), 'utf8'),
      ).resolves.toBe('# summary\n');
      expect(result.lifecycleCommit).toMatch(/^[a-f0-9]{40}$/);
      expect(result.snapshotId).toBe(snapshotId);
      expect(result.summaryExportFile).toBe(
        join(
          fixture.cloneA,
          '.oat',
          'repo',
          'reference',
          'project-summaries',
          `${snapshotId}.md`,
        ),
      );
      expect(result.projectRecapExport?.exportRoot).toBe(
        join(
          fixture.cloneA,
          '.oat',
          'repo',
          'reference',
          'project-recaps',
          snapshotId,
        ),
      );
      expect(result.s3Path).toBe(
        `s3://archive-bucket/projects/clone-a/projects/${snapshotId}`,
      );
      expect(await readSyncedRecord(recordPath)).toMatchObject({
        status: 'complete',
        completedAt: '2026-08-27T12:00:00Z',
        archiveSnapshot: snapshotId,
      });

      const retried = await archiveProjectOnCompletion(options, {
        ...commonDependencies,
        timestamp: () => '2026-08-28T12:00:00Z',
      });
      expect(retried).toMatchObject({
        archivePath: result.archivePath,
        lifecycleCommit: result.lifecycleCommit,
        snapshotId,
      });
      expect(retried.summaryExportFile).toBe(result.summaryExportFile);
      expect(retried.projectRecapExport?.exportRoot).toBe(
        result.projectRecapExport?.exportRoot,
      );
      expect(retried.s3Path).toBe(result.s3Path);
      expect(
        s3Calls
          .filter((args) => args[0] === 's3' && args[1] === 'sync')
          .map((args) => args[3]),
      ).toEqual([result.s3Path, result.s3Path]);
    } finally {
      await fixture.cleanup();
    }
  });

  it.each(['alternate', 'absolute'] as const)(
    'commits and removes a synced checkout under an %s configured root',
    async (rootKind) => {
      const fixture = await createSyncedFixture();
      try {
        const projectsRoot =
          rootKind === 'absolute'
            ? join(fixture.cloneA, '.oat', 'absolute', 'team')
            : '.oat/team-projects';
        const target = buildSyncTarget(fixture.cloneA, projectsRoot, 'demo');
        const archiveRoot = join(dirname(target.sharedRoot), 'archived');
        const gitignorePath = join(fixture.cloneA, '.gitignore');
        const gitignore = await readFile(gitignorePath, 'utf8');
        const repoRelativeSyncedRoot = target.syncedRoot
          .slice(fixture.cloneA.length + 1)
          .split('\\')
          .join('/');
        const repoRelativeArchiveRoot = archiveRoot
          .slice(fixture.cloneA.length + 1)
          .split('\\')
          .join('/');
        await writeFile(
          gitignorePath,
          `${gitignore}\n/${repoRelativeSyncedRoot}/*/\n/${repoRelativeArchiveRoot}/**\n`,
          'utf8',
        );
        await defaultGitRunner.run(['add', '.gitignore'], {
          cwd: fixture.cloneA,
        });
        await defaultGitRunner.run(
          ['commit', '-m', 'test: configure custom project roots'],
          { cwd: fixture.cloneA },
        );

        await createSyncedProject(target, defaultGitRunner);
        await writeFile(
          join(target.projectPath, 'state.md'),
          '# state\n',
          'utf8',
        );
        await pushSynced(target, defaultGitRunner, {});
        const recordPath = syncedRecordPath(target.syncedRoot, target.slug);
        await writeSyncedRecord(
          recordPath,
          buildSyncedRecord('demo', new Date('2026-08-27T00:00:00Z')),
        );
        const beforeHead = (
          await defaultGitRunner.run(['rev-parse', 'HEAD'], {
            cwd: fixture.cloneA,
          })
        ).stdout;

        const result = await archiveProjectOnCompletion(
          {
            repoRoot: fixture.cloneA,
            projectPath: target.projectPath,
            projectName: target.slug,
            projectsRoot,
            s3SyncOnComplete: false,
          },
          { timestamp: () => '2026-08-27T12:00:00Z' },
        );

        expect(result.lifecycleCommit).toMatch(/^[a-f0-9]{40}$/);
        expect(
          (
            await defaultGitRunner.run(
              ['rev-list', '--count', `${beforeHead}..HEAD`],
              { cwd: fixture.cloneA },
            )
          ).stdout,
        ).toBe('1');
        expect(
          (
            await defaultGitRunner.run(['status', '--porcelain'], {
              cwd: fixture.cloneA,
            })
          ).stdout,
        ).toBe('');
        expect(
          (
            await defaultGitRunner.run(['worktree', 'list', '--porcelain'], {
              cwd: fixture.cloneA,
            })
          ).stdout,
        ).not.toContain(target.projectPath);
        await expect(access(target.projectPath)).rejects.toThrow();
        await expect(readSyncedRecord(recordPath)).resolves.toMatchObject({
          status: 'complete',
        });
      } finally {
        await fixture.cleanup();
      }
    },
  );

  it('resolves a same-day synced retry only to its same-scope archive', async () => {
    const fixture = await createSyncedFixture();
    try {
      const slug = 'same-scope-retry';
      const timestamp = () => '2026-08-27T12:00:00Z';
      const sharedProjectPath = join(
        fixture.cloneA,
        '.oat',
        'projects',
        'shared',
        slug,
      );
      await mkdir(sharedProjectPath, { recursive: true });
      await writeFile(
        join(sharedProjectPath, 'summary.md'),
        '# shared summary\n',
        'utf8',
      );
      const sharedArchive = await archiveProjectOnCompletion(
        {
          repoRoot: fixture.cloneA,
          projectPath: sharedProjectPath,
          projectName: slug,
          projectsRoot: '.oat/projects/shared',
          s3SyncOnComplete: false,
        },
        { timestamp },
      );

      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        slug,
      );
      await createSyncedProject(target, defaultGitRunner);
      await writeFile(
        join(target.projectPath, 'summary.md'),
        '# synced summary\n',
        'utf8',
      );
      await pushSynced(target, defaultGitRunner, {});
      const recordPath = syncedRecordPath(target.syncedRoot, target.slug);
      await writeSyncedRecord(
        recordPath,
        buildSyncedRecord(slug, new Date('2026-08-27T00:00:00Z')),
      );
      const options = {
        repoRoot: fixture.cloneA,
        projectPath: target.projectPath,
        projectName: slug,
        projectsRoot: '.oat/projects/shared',
        s3SyncOnComplete: false,
      };

      const syncedArchive = await archiveProjectOnCompletion(options, {
        timestamp,
      });
      expect(syncedArchive.archivePath).not.toBe(sharedArchive.archivePath);
      await expect(
        readFile(join(syncedArchive.archivePath, 'summary.md'), 'utf8'),
      ).resolves.toBe('# synced summary\n');

      const retried = await archiveProjectOnCompletion(options, {
        timestamp: () => '2026-08-28T12:00:00Z',
      });
      expect(retried.archivePath).toBe(syncedArchive.archivePath);
      expect(retried.snapshotId).toBe('20260827-same-scope-retry');
      await expect(
        readFile(join(retried.archivePath, 'summary.md'), 'utf8'),
      ).resolves.toBe('# synced summary\n');
      await expect(
        readFile(
          join(sharedArchive.archivePath, ARCHIVE_SNAPSHOT_METADATA_FILENAME),
          'utf8',
        ),
      ).resolves.toContain('"scope": "shared"');
      await expect(
        readFile(
          join(syncedArchive.archivePath, ARCHIVE_SNAPSHOT_METADATA_FILENAME),
          'utf8',
        ),
      ).resolves.toContain('"scope": "synced"');
    } finally {
      await fixture.cleanup();
    }
  });

  it('omits reviews from shared archive snapshots', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(join(projectPath, 'reviews'), { recursive: true });
    await writeFile(join(projectPath, 'state.md'), '# state\n', 'utf8');
    await writeFile(
      join(projectPath, 'reviews', 'review.md'),
      '# review\n',
      'utf8',
    );

    const result = await archiveProjectOnCompletion(
      {
        repoRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        s3SyncOnComplete: false,
      },
      { timestamp: () => '2026-08-27T12:00:00Z' },
    );

    await expect(
      readFile(join(result.archivePath, 'state.md'), 'utf8'),
    ).resolves.toBe('# state\n');
    await expect(access(join(result.archivePath, 'reviews'))).rejects.toThrow();
  });

  it('leaves no orphan archive when retry identity persistence fails', async () => {
    const fixture = await createSyncedFixture();
    try {
      const slug = 'record-write-failure';
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        slug,
      );
      await createSyncedProject(target, defaultGitRunner);
      await writeFile(
        join(target.projectPath, 'state.md'),
        '# state\n',
        'utf8',
      );
      await writeFile(
        join(target.projectPath, 'summary.md'),
        '# summary\n',
        'utf8',
      );
      await pushSynced(target, defaultGitRunner, {});
      const recordPath = syncedRecordPath(target.syncedRoot, target.slug);
      await writeSyncedRecord(
        recordPath,
        buildSyncedRecord(slug, new Date('2026-08-27T00:00:00Z')),
      );
      const options = {
        repoRoot: fixture.cloneA,
        projectPath: target.projectPath,
        projectName: slug,
        projectsRoot: '.oat/projects/shared',
        s3SyncOnComplete: false,
      };
      const archiveRoot = join(fixture.cloneA, '.oat', 'projects', 'archived');

      await expect(
        archiveProjectOnCompletion(options, {
          timestamp: () => '2026-08-27T12:00:00Z',
          writeSyncedRecord: vi.fn(async () => {
            throw new Error('injected record write failure');
          }),
        }),
      ).rejects.toThrow(/injected record write failure/);
      await expect(access(archiveRoot)).rejects.toThrow();
      expect(await readSyncedRecord(recordPath)).not.toHaveProperty(
        'archiveSnapshot',
      );

      const retried = await archiveProjectOnCompletion(options, {
        timestamp: () => '2026-08-28T12:00:00Z',
      });
      expect(retried.snapshotId).toBe('20260828-record-write-failure');
      expect(await readdir(archiveRoot)).toEqual([slug]);
      await expect(
        readFile(join(retried.archivePath, 'summary.md'), 'utf8'),
      ).resolves.toBe('# summary\n');
      expect(await readSyncedRecord(recordPath)).toMatchObject({
        archiveSnapshot: retried.snapshotId,
        status: 'complete',
      });
    } finally {
      await fixture.cleanup();
    }
  });

  it('refuses to archive a dirty synced checkout before creating a snapshot', async () => {
    const fixture = await createSyncedFixture();
    try {
      const target = buildSyncTarget(
        fixture.cloneA,
        '.oat/projects/shared',
        'dirty',
      );
      await createSyncedProject(target, defaultGitRunner);
      await writeFile(
        join(target.projectPath, 'state.md'),
        '# state\n',
        'utf8',
      );
      await pushSynced(target, defaultGitRunner, {});
      await writeSyncedRecord(
        syncedRecordPath(target.syncedRoot, target.slug),
        buildSyncedRecord('dirty', new Date('2026-08-27T00:00:00Z')),
      );
      await writeFile(
        join(target.projectPath, 'pending.md'),
        'dirty\n',
        'utf8',
      );

      await expect(
        archiveProjectOnCompletion({
          repoRoot: fixture.cloneA,
          projectPath: target.projectPath,
          projectName: 'dirty',
          projectsRoot: '.oat/projects/shared',
          s3SyncOnComplete: false,
        }),
      ).rejects.toThrow(/oat project push/);
      await expect(
        access(join(fixture.cloneA, '.oat/projects/archived/dirty')),
      ).rejects.toThrow();
    } finally {
      await fixture.cleanup();
    }
  });

  it.each(['clean', 'dirty', 'unpushed'] as const)(
    'fails closed for a %s synced checkout without its discovery record',
    async (checkoutState) => {
      const fixture = await createSyncedFixture();
      try {
        const target = buildSyncTarget(
          fixture.cloneA,
          '.oat/projects/shared',
          `missing-record-${checkoutState}`,
        );
        await createSyncedProject(target, defaultGitRunner);
        await writeFile(
          join(target.projectPath, 'state.md'),
          '# state\n',
          'utf8',
        );
        await pushSynced(target, defaultGitRunner, {});

        if (checkoutState === 'dirty') {
          await writeFile(
            join(target.projectPath, 'pending.md'),
            'dirty\n',
            'utf8',
          );
        } else if (checkoutState === 'unpushed') {
          await writeFile(
            join(target.projectPath, 'state.md'),
            '# state\nunpushed\n',
            'utf8',
          );
          await defaultGitRunner.run(['add', 'state.md'], {
            cwd: target.projectPath,
          });
          await defaultGitRunner.run(
            [
              '-c',
              'core.hooksPath=/dev/null',
              'commit',
              '-m',
              'test: leave synced project unpushed',
            ],
            { cwd: target.projectPath },
          );
        }

        const registrationsBefore = await defaultGitRunner.run(
          ['worktree', 'list', '--porcelain'],
          { cwd: fixture.cloneA },
        );
        const archiveRoot = join(
          fixture.cloneA,
          '.oat',
          'projects',
          'archived',
        );

        await expect(
          archiveProjectOnCompletion({
            repoRoot: fixture.cloneA,
            projectPath: target.projectPath,
            projectName: target.slug,
            projectsRoot: '.oat/projects/shared',
            s3SyncOnComplete: false,
          }),
        ).rejects.toThrow(/missing its discovery record.*project pull/s);

        await expect(access(target.projectPath)).resolves.toBeUndefined();
        await expect(
          access(join(target.projectPath, '.git')),
        ).resolves.toBeUndefined();
        await expect(access(archiveRoot)).rejects.toThrow();
        const registrationsAfter = await defaultGitRunner.run(
          ['worktree', 'list', '--porcelain'],
          { cwd: fixture.cloneA },
        );
        expect(registrationsAfter.stdout).toBe(registrationsBefore.stdout);
      } finally {
        await fixture.cleanup();
      }
    },
  );

  it.each([
    'after-copy',
    'after-s3',
    'after-lifecycle',
    'after-checkout-removal',
  ] as const)(
    'reuses one durable synced archive identity on retry %s with and without a recap',
    async (failureBoundary) => {
      for (const withRecap of [false, true]) {
        const fixture = await createSyncedFixture();
        try {
          const slug = `${failureBoundary}-${withRecap ? 'recap' : 'plain'}`;
          const target = buildSyncTarget(
            fixture.cloneA,
            '.oat/projects/shared',
            slug,
          );
          await createSyncedProject(target, defaultGitRunner);
          await writeFile(
            join(target.projectPath, 'state.md'),
            '# state\n',
            'utf8',
          );
          await writeFile(
            join(target.projectPath, 'summary.md'),
            '# summary\n',
            'utf8',
          );
          const recap = withRecap
            ? await createRecapPackage(target.projectPath)
            : null;
          await pushSynced(target, defaultGitRunner, {});
          const recordPath = syncedRecordPath(target.syncedRoot, target.slug);
          await writeSyncedRecord(
            recordPath,
            buildSyncedRecord(slug, new Date('2026-08-27T00:00:00Z')),
          );
          await mkdir(
            join(fixture.cloneA, '.oat', 'projects', 'archived', slug),
            { recursive: true },
          );

          const commitsBefore = Number(
            (
              await defaultGitRunner.run(['rev-list', '--count', 'HEAD'], {
                cwd: fixture.cloneA,
              })
            ).stdout,
          );
          const s3Calls: string[][] = [];
          const successfulExecFile = vi.fn(
            async (_file: string, args: readonly string[]) => {
              s3Calls.push([...args]);
              return { stdout: '', stderr: '' };
            },
          );
          const options = {
            repoRoot: fixture.cloneA,
            projectPath: target.projectPath,
            projectName: slug,
            projectsRoot: '.oat/projects/shared',
            summaryExportPath: '.oat/repo/reference/project-summaries',
            s3Uri: 's3://archive-bucket/projects',
            s3SyncOnComplete: true,
            ...(recap ? { projectRecapRun: recap.relativeRunPath } : {}),
          };
          const commonDependencies = {
            ensureS3ArchiveAccess: vi.fn(async () => ({
              ok: true,
              warnings: [],
            })),
            execFile: successfulExecFile,
          };
          const firstDependencies = {
            ...commonDependencies,
            timestamp: () => '2026-08-27T12:00:00Z',
            ...(failureBoundary === 'after-copy'
              ? {
                  copySingleFile: async (
                    source: string,
                    destination: string,
                  ) => {
                    if (destination.includes('project-summaries')) {
                      throw new Error('injected after-copy failure');
                    }
                    await copyFile(source, destination);
                  },
                }
              : {}),
            ...(failureBoundary === 'after-s3'
              ? {
                  commitRecordChange: vi.fn(async () => {
                    throw new Error('injected after-s3 failure');
                  }),
                }
              : {}),
            ...(failureBoundary === 'after-lifecycle'
              ? {
                  removeSyncedCheckout: vi.fn(async () => {
                    throw new Error('injected after-lifecycle failure');
                  }),
                }
              : {}),
          };

          if (failureBoundary === 'after-checkout-removal') {
            await archiveProjectOnCompletion(options, firstDependencies);
          } else {
            await expect(
              archiveProjectOnCompletion(options, firstDependencies),
            ).rejects.toThrow(/injected/);
          }
          const committedLifecycleBeforeRetry =
            failureBoundary === 'after-lifecycle' ||
            failureBoundary === 'after-checkout-removal'
              ? (
                  await defaultGitRunner.run(['rev-parse', 'HEAD'], {
                    cwd: fixture.cloneA,
                  })
                ).stdout
              : null;

          const retried = await archiveProjectOnCompletion(options, {
            ...commonDependencies,
            timestamp: () => '2026-08-28T12:00:00Z',
          });
          const snapshotId = `20260827-${slug}`;
          const localArchiveId = `${slug}-20260827120000`;
          expect(retried.snapshotId).toBe(snapshotId);
          expect(retried.archivePath).toBe(
            join(
              fixture.cloneA,
              '.oat',
              'projects',
              'archived',
              localArchiveId,
            ),
          );
          expect(retried.summaryExportFile).toBe(
            join(
              fixture.cloneA,
              '.oat',
              'repo',
              'reference',
              'project-summaries',
              `${snapshotId}.md`,
            ),
          );
          expect(retried.s3Path).toBe(
            `s3://archive-bucket/projects/clone-a/projects/${snapshotId}`,
          );
          expect(retried.projectRecapExport?.exportRoot ?? null).toBe(
            recap
              ? join(
                  fixture.cloneA,
                  '.oat',
                  'repo',
                  'reference',
                  'project-recaps',
                  snapshotId,
                )
              : null,
          );
          expect(retried.lifecycleCommit).toMatch(/^[a-f0-9]{40}$/);
          if (committedLifecycleBeforeRetry) {
            expect(retried.lifecycleCommit).toBe(committedLifecycleBeforeRetry);
          }
          await expect(access(target.projectPath)).rejects.toThrow();
          expect(await readSyncedRecord(recordPath)).toMatchObject({
            archiveSnapshot: snapshotId,
            completedAt:
              failureBoundary === 'after-copy'
                ? '2026-08-28T12:00:00Z'
                : '2026-08-27T12:00:00Z',
            status: 'complete',
          });
          const commitsAfter = Number(
            (
              await defaultGitRunner.run(['rev-list', '--count', 'HEAD'], {
                cwd: fixture.cloneA,
              })
            ).stdout,
          );
          expect(commitsAfter - commitsBefore).toBe(1);
          expect(
            await readdir(
              join(
                fixture.cloneA,
                '.oat',
                'repo',
                'reference',
                'project-summaries',
              ),
            ),
          ).toEqual([`${snapshotId}.md`]);
          if (recap) {
            expect(
              await readdir(
                join(
                  fixture.cloneA,
                  '.oat',
                  'repo',
                  'reference',
                  'project-recaps',
                ),
              ),
            ).toEqual([snapshotId]);
          }
          expect(
            s3Calls
              .filter((args) => args[0] === 's3' && args[1] === 'sync')
              .map((args) => args[3]),
          ).toEqual(
            expect.arrayContaining([
              `s3://archive-bucket/projects/clone-a/projects/${snapshotId}`,
            ]),
          );
        } finally {
          await fixture.cleanup();
        }
      }
    },
    20_000,
  );

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
      const manifest = JSON.parse(
        await readFile(join(exportRoot, 'manifest.json'), 'utf8'),
      ) as { immutableHashes: Record<string, string> };
      expect(await relativeFilePaths(exportRoot)).toEqual(
        [
          'build-record.json',
          'manifest.json',
          ...(outcome === 'failed' ? ['terminal-evidence.json'] : []),
          ...Object.keys(manifest.immutableHashes),
        ].sort(),
      );
    },
  );

  it('rejects an undeclared exact-byte source entry instead of promoting it', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    const recap = await createRecapPackage(projectPath);
    const canary = 'ARCHIVE-SOURCE-INVENTORY-{"diagnostic":"exact bytes"}';
    await writeFile(join(recap.runRoot, 'undeclared-provider.txt'), canary);

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
    ).rejects.toThrow(/inventory/i);

    await expect(access(projectPath)).resolves.toBeUndefined();
    await expect(
      access(
        join(
          repoRoot,
          '.oat',
          'repo',
          'reference',
          'project-recaps',
          '20260401-demo',
        ),
      ),
    ).rejects.toThrow();
  });

  it('rejects an undeclared exact-byte staged entry before export promotion', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    const recap = await createRecapPackage(projectPath);
    let stagedRoot: string | undefined;
    const copySingleFile = vi.fn(
      async (source: string, destination: string) => {
        await mkdir(dirname(destination), { recursive: true });
        await copyFile(source, destination);
        if (!stagedRoot) {
          let candidate = dirname(destination);
          while (!candidate.includes('20260401-demo.tmp-')) {
            candidate = dirname(candidate);
          }
          stagedRoot = candidate;
          await writeFile(
            join(stagedRoot, 'undeclared-staged-provider.txt'),
            'ARCHIVE-STAGED-INVENTORY-{"diagnostic":"exact bytes"}',
          );
        }
      },
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
          copySingleFile,
          timestamp: () => '2026-04-01T12:34:56Z',
        },
      ),
    ).rejects.toThrow(/inventory/i);

    expect(copySingleFile).toHaveBeenCalled();
    await expect(access(projectPath)).resolves.toBeUndefined();
  });

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

  it.each(['built-needs-review', 'failed', 'incomplete'] as const)(
    'rejects legacy diagnostic review evidence retained by a %s package',
    async (outcome) => {
      const repoRoot = await createRepoRoot();
      const projectPath = join(repoRoot, '.oat', 'projects', 'shared', outcome);
      await mkdir(projectPath, { recursive: true });
      const recap = await createRecapPackage(projectPath, { outcome });
      const partialPath = 'qa/review-gate/attempt-1-error.json';
      const canary =
        'ARCHIVE-CANARY {"pass\\\\u0077ord":"exact"} ? [yaml-complex] standalone';
      const partialContents = `${JSON.stringify({
        code: 'E_VISUAL_REVIEW',
        message: canary,
      })}\n`;
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
      ).rejects.toThrow(
        /review-gate|terminal evidence|incomplete visual-review evidence/i,
      );
      await expect(
        access(join(repoRoot, '.oat/repo/reference/project-recaps')),
      ).rejects.toMatchObject({ code: 'ENOENT' });
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

  it('exports unresolved review evidence without making it publishable', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    await mkdir(projectPath, { recursive: true });
    const recap = await createRecapPackage(projectPath, {
      outcome: 'built-needs-review',
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
    await expect(
      readFile(
        join(result.projectRecapExport!.exportRoot, 'terminal-evidence.json'),
        'utf8',
      ),
    ).resolves.toContain('"evidenceDisposition": "retained"');
    await expect(access(projectPath)).rejects.toThrow();
  });

  it.each(['built-needs-review', 'failed'] as const)(
    'requires terminal evidence before destructively archiving a %s recap',
    async (outcome) => {
      const repoRoot = await createRepoRoot();
      const projectPath = join(repoRoot, '.oat', 'projects', 'shared', outcome);
      await mkdir(projectPath, { recursive: true });
      const recap = await createRecapPackage(projectPath, {
        outcome,
        includeTerminalEvidence: false,
      });

      await expect(
        archiveProjectOnCompletion({
          repoRoot,
          projectPath,
          projectName: outcome,
          projectsRoot: '.oat/projects/shared',
          projectRecapRun: recap.relativeRunPath,
          s3SyncOnComplete: false,
        }),
      ).rejects.toThrow(/terminal evidence/i);
      await expect(access(projectPath)).resolves.toBeUndefined();
    },
  );

  it.each([
    ['schemaVersion', 'future'],
    ['runId', 'run-other'],
    ['outcome', 'failed'],
    ['manifestHash', `sha256:${'f'.repeat(64)}`],
    ['evidenceDisposition', 'unknown'],
  ] as const)(
    'rejects tampered terminal evidence field %s before project removal',
    async (field, value) => {
      const repoRoot = await createRepoRoot();
      const projectPath = join(repoRoot, '.oat', 'projects', 'shared', field);
      await mkdir(projectPath, { recursive: true });
      const recap = await createRecapPackage(projectPath, {
        outcome: 'built-needs-review',
      });
      const evidencePath = join(recap.runRoot, 'terminal-evidence.json');
      const evidence = JSON.parse(
        await readFile(evidencePath, 'utf8'),
      ) as Record<string, unknown>;
      evidence[field] = value;
      await writeFile(evidencePath, `${JSON.stringify(evidence)}\n`);

      await expect(
        archiveProjectOnCompletion({
          repoRoot,
          projectPath,
          projectName: field,
          projectsRoot: '.oat/projects/shared',
          projectRecapRun: recap.relativeRunPath,
          s3SyncOnComplete: false,
        }),
      ).rejects.toThrow(/terminal evidence/i);
      await expect(access(projectPath)).resolves.toBeUndefined();
    },
  );

  it('rejects terminal evidence symlinked outside the selected recap run', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(
      repoRoot,
      '.oat',
      'projects',
      'shared',
      'symlinked',
    );
    await mkdir(projectPath, { recursive: true });
    const recap = await createRecapPackage(projectPath, {
      outcome: 'failed',
    });
    const evidencePath = join(recap.runRoot, 'terminal-evidence.json');
    const externalEvidencePath = join(repoRoot, 'external-evidence.json');
    await writeFile(externalEvidencePath, await readFile(evidencePath));
    await rm(evidencePath);
    await symlink(externalEvidencePath, evidencePath);

    await expect(
      verifySelectedProjectRecapForArchive(projectPath, recap.relativeRunPath),
    ).rejects.toThrow(/terminal evidence|symbolic link|run root/i);
  });

  it('rejects schema-valid terminal evidence byte substitution while staging', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'staged');
    await mkdir(projectPath, { recursive: true });
    const recap = await createRecapPackage(projectPath, {
      outcome: 'failed',
    });
    const copySingleFile = vi.fn(
      async (source: string, destination: string) => {
        await mkdir(dirname(destination), { recursive: true });
        await copyFile(source, destination);
        if (destination.endsWith('terminal-evidence.json')) {
          const evidencePath = destination;
          const evidence = JSON.parse(
            await readFile(evidencePath, 'utf8'),
          ) as Record<string, unknown>;
          evidence.error = {
            code: 'E_RUN',
            message: 'Schema-valid substituted failure evidence.',
          };
          await writeFile(evidencePath, `${JSON.stringify(evidence)}\n`);
        }
      },
    );

    await expect(
      archiveProjectOnCompletion(
        {
          repoRoot,
          projectPath,
          projectName: 'staged',
          projectsRoot: '.oat/projects/shared',
          projectRecapRun: recap.relativeRunPath,
          s3SyncOnComplete: false,
        },
        { copySingleFile },
      ),
    ).rejects.toThrow(/terminal evidence|changed while staging|byte/i);
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
    const copySingleFile = vi.fn(
      async (source: string, destination: string) => {
        await mkdir(dirname(destination), { recursive: true });
        await copyFile(source, destination);
        if (destination.endsWith(join('source', 'content', 'recap.md'))) {
          await writeFile(destination, '# corrupted\n', 'utf8');
        }
      },
    );
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
          copySingleFile,
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

    const retried = await archiveProjectOnCompletion(
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
    await expect(
      access(join(retried.projectRecapExport!.exportRoot, 'manifest.json')),
    ).resolves.toBeUndefined();
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
    const copyDirectory = vi.fn(
      async (_source: string, _destination: string) => {
        throw new Error('injected archive copy failure');
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
    ).rejects.toThrow('injected archive copy failure');

    expect(copyDirectory).toHaveBeenCalledTimes(1);
    await expect(access(projectPath)).resolves.toBeUndefined();
    await expect(access(exportRoot)).rejects.toThrow();
  });

  it.each(['tracked', 'untracked'] as const)(
    'preserves an adopted %s recap export when later cleanup fails',
    async (trackingState) => {
      const repoRoot = await createRepoRoot();
      const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
      await mkdir(projectPath, { recursive: true });
      const recap = await createRecapPackage(projectPath);
      const options = {
        repoRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        projectRecapRun: recap.relativeRunPath,
        s3SyncOnComplete: false,
      };
      const timestamp = () => '2026-04-01T12:34:56Z';
      const archived = await archiveProjectOnCompletion(options, { timestamp });
      const exportRoot = archived.projectRecapExport!.exportRoot;
      await cp(archived.archivePath, projectPath, { recursive: true });

      await defaultGitRunner.run(['init'], { cwd: repoRoot });
      await defaultGitRunner.run(['config', 'user.name', 'OAT Tests'], {
        cwd: repoRoot,
      });
      await defaultGitRunner.run(
        ['config', 'user.email', 'oat-tests@example.com'],
        { cwd: repoRoot },
      );
      const exportPathspec = '.oat/repo/reference/project-recaps';
      if (trackingState === 'tracked') {
        await defaultGitRunner.run(['add', exportPathspec], { cwd: repoRoot });
        await defaultGitRunner.run(['commit', '-m', 'track recap export'], {
          cwd: repoRoot,
        });
      }

      await expect(
        archiveProjectOnCompletion(options, {
          removePath: async (target, removeOptions) => {
            if (target === projectPath) {
              throw new Error('injected project cleanup failure');
            }
            await rm(target, removeOptions);
          },
          timestamp,
        }),
      ).rejects.toThrow('injected project cleanup failure');

      await expect(
        access(join(exportRoot, 'manifest.json')),
      ).resolves.toBeUndefined();
      const tracked = await defaultGitRunner.run(
        [
          'ls-files',
          '--error-unmatch',
          `${exportPathspec}/20260401-demo/manifest.json`,
        ],
        { allowFailure: true, cwd: repoRoot },
      );
      expect(tracked.code === 0).toBe(trackingState === 'tracked');
    },
  );

  it('removes an attempt-owned partial archive so retry uses one complete target', async () => {
    const repoRoot = await createRepoRoot();
    const projectPath = join(repoRoot, '.oat', 'projects', 'shared', 'demo');
    const archiveRoot = join(repoRoot, '.oat', 'projects', 'archived');
    await mkdir(projectPath, { recursive: true });
    await writeFile(join(projectPath, 'summary.md'), '# summary\n', 'utf8');

    await expect(
      archiveProjectOnCompletion(
        {
          repoRoot,
          projectPath,
          projectName: 'demo',
          projectsRoot: '.oat/projects/shared',
          s3SyncOnComplete: false,
        },
        {
          copyDirectory: async (_source, destination) => {
            await mkdir(destination, { recursive: true });
            await writeFile(join(destination, 'partial.txt'), 'partial\n');
            throw new Error('injected during-copy failure');
          },
          timestamp: () => '2026-04-01T12:34:56Z',
        },
      ),
    ).rejects.toThrow('injected during-copy failure');

    await expect(readdir(archiveRoot)).resolves.toEqual([]);
    await expect(access(projectPath)).resolves.toBeUndefined();

    const result = await archiveProjectOnCompletion(
      {
        repoRoot,
        projectPath,
        projectName: 'demo',
        projectsRoot: '.oat/projects/shared',
        s3SyncOnComplete: false,
      },
      { timestamp: () => '2026-04-01T12:34:56Z' },
    );

    await expect(readdir(archiveRoot)).resolves.toEqual([
      result.archivePath.slice(result.archivePath.lastIndexOf('/') + 1),
    ]);
    await expect(
      access(join(result.archivePath, ARCHIVE_SNAPSHOT_METADATA_FILENAME)),
    ).resolves.toBeUndefined();
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
    expect(isAbsolute(result.summaryExportFile!)).toBe(true);
    await expect(readFile(result.summaryExportFile!, 'utf8')).resolves.toBe(
      '# summary\n',
    );
  });

  it('directs an active record with an absent checkout to project pull', async () => {
    const repoRoot = await createRepoRoot();
    const syncedRoot = join(repoRoot, '.oat', 'projects', 'synced');
    const projectPath = join(syncedRoot, 'absent-demo');
    await writeSyncedRecord(
      syncedRecordPath(syncedRoot, 'absent-demo'),
      buildSyncedRecord('absent-demo', new Date('2026-08-27T00:00:00Z')),
    );

    await expect(
      archiveProjectOnCompletion(
        {
          repoRoot,
          projectPath,
          projectName: 'absent-demo',
          projectsRoot: '.oat/projects/shared',
          s3SyncOnComplete: false,
        },
        {
          preflightSyncedCheckout: vi.fn(async () => ({ status: 'absent' })),
        },
      ),
    ).rejects.toThrow(
      /is absent; run oat project pull absent-demo before archiving/,
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

  it.each(
    (['shared', 'synced'] as const).flatMap((scope) =>
      (['missing-cli', 'invalid-credentials', 'sync-failure'] as const).map(
        (failure) => ({ scope, failure }),
      ),
    ),
  )(
    'keeps $scope completion nonblocking on S3 $failure',
    async ({ scope, failure }) => {
      const fixture = scope === 'synced' ? await createSyncedFixture() : null;
      try {
        const slug = `s3-${failure}`;
        const repoRoot = fixture?.cloneA ?? (await createRepoRoot());
        const target = fixture
          ? buildSyncTarget(repoRoot, '.oat/projects/shared', slug)
          : null;
        const projectPath =
          target?.projectPath ??
          join(repoRoot, '.oat', 'projects', 'shared', slug);
        if (target) {
          await createSyncedProject(target, defaultGitRunner);
        } else {
          await mkdir(projectPath, { recursive: true });
        }
        await writeFile(join(projectPath, 'summary.md'), '# summary\n', 'utf8');
        let recordPath: string | null = null;
        if (target) {
          await pushSynced(target, defaultGitRunner, {});
          recordPath = syncedRecordPath(target.syncedRoot, target.slug);
          await writeSyncedRecord(
            recordPath,
            buildSyncedRecord(slug, new Date('2026-08-27T00:00:00Z')),
          );
        }

        const accessWarning =
          failure === 'missing-cli'
            ? 'Archive S3 sync skipped because AWS CLI is unavailable.'
            : 'Archive S3 sync skipped because AWS credentials are unusable.';
        const ensureAccess = vi.fn(async () =>
          failure === 'sync-failure'
            ? { ok: true, warnings: [] }
            : { ok: false, warnings: [accessWarning] },
        );
        const execFile = vi.fn(async () => {
          throw new Error('injected aws s3 sync failure');
        });
        const result = await archiveProjectOnCompletion(
          {
            repoRoot,
            projectPath,
            projectName: slug,
            projectsRoot: '.oat/projects/shared',
            summaryExportPath: '.oat/repo/reference/project-summaries',
            s3Uri: 's3://archive-bucket/projects',
            s3SyncOnComplete: true,
          },
          {
            ensureS3ArchiveAccess: ensureAccess,
            execFile,
            timestamp: () => '2026-08-27T12:00:00Z',
          },
        );

        expect(result.s3Path).toBeNull();
        expect(result.summaryExportFile).not.toBeNull();
        await expect(readFile(result.summaryExportFile!, 'utf8')).resolves.toBe(
          '# summary\n',
        );
        expect(result.warnings).toEqual([
          failure === 'sync-failure'
            ? expect.stringContaining('injected aws s3 sync failure')
            : accessWarning,
        ]);
        await expect(access(projectPath)).rejects.toThrow();
        if (recordPath) {
          expect(result.lifecycleCommit).toMatch(/^[a-f0-9]{40}$/);
          expect(await readSyncedRecord(recordPath)).toMatchObject({
            status: 'complete',
            archiveSnapshot: `20260827-${slug}`,
          });
        } else {
          expect(result.lifecycleCommit).toBeNull();
        }
      } finally {
        await fixture?.cleanup();
      }
    },
    20_000,
  );

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

function hashContent(value: string | Buffer): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

async function relativeFilePaths(
  root: string,
  relativeRoot = '',
): Promise<string[]> {
  const entries = await readdir(join(root, relativeRoot), {
    withFileTypes: true,
  });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = relativeRoot
        ? `${relativeRoot}/${entry.name}`
        : entry.name;
      return entry.isDirectory()
        ? relativeFilePaths(root, relativePath)
        : [relativePath];
    }),
  );
  return files.flat().sort();
}

function canonicalHash(value: unknown): string {
  return hashContent(JSON.stringify(canonicalize(value)));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}
