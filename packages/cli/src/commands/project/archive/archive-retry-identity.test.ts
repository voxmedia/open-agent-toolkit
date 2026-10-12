import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import {
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';

import type { CommandContext } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { defaultGitRunner } from '@commands/project/sync/git';
import { buildSyncTarget } from '@commands/project/sync/ref-sync';
import { copyDirectory } from '@fs/io';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ARCHIVE_SNAPSHOT_METADATA_FILENAME,
  S3_ARCHIVE_SYNC_EXCLUDES,
  archiveProjectOnCompletion,
  computeArchiveManifestHash,
  evaluateArchiveRetryIdentity,
  resolveRecordlessSyncedArchiveIdentity,
  type ExecFileLike,
} from './archive-utils';
import {
  defaultProjectArchivePushCommandDependencies,
  runArchivePushCommand,
  type ProjectArchivePushCommandDependencies,
} from './push-runner';
import {
  defaultProjectArchiveCommandDependencies,
  runArchiveSyncCommand,
} from './sync-runner';

/**
 * Archive retry identity (artifact-cleanup p03-t02, D11).
 *
 * Every case runs on a scratch repository under `mktemp -d` with S3 stubbed:
 * in-process cases inject `execFile`/`ensureS3ArchiveAccess`, and the public
 * CLI cases put a fake `aws` on PATH that mirrors `s3 sync` into a local
 * directory. No real bucket and no existing archive is ever touched.
 */

const tempDirs: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function scratch(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

/** sha256 over every file below `root` (relative path + bytes), sorted. */
async function treeHash(root: string): Promise<string> {
  if (!existsSync(root)) return 'absent';
  const lines: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        lines.push(`dir ${relative(root, full)}`);
        await walk(full);
      } else if (entry.isFile()) {
        const digest = createHash('sha256')
          .update(await readFile(full))
          .digest('hex');
        lines.push(`${digest} ${relative(root, full)}`);
      }
    }
  };
  await walk(root);
  return lines.sort().join('\n');
}

const PROJECT = 'demo';
const SUMMARY_EXPORT = '.oat/repo/reference/project-summaries';
const S3_URI = 's3://fake-bucket/oat-archive';

interface Fixture {
  repoRoot: string;
  projectPath: string;
  archiveRoot: string;
  pristine: string;
}

/** A shared-scope project plus a pristine copy used to restore it. */
async function createFixture(
  options: { scope?: 'shared' | 'local'; files?: Record<string, string> } = {},
): Promise<Fixture> {
  // Canonical (macOS /private) so CLI-reported paths compare byte-equal.
  const repoRoot = await realpath(await scratch('oat-archive-identity-'));
  const projectPath = join(
    repoRoot,
    '.oat',
    'projects',
    options.scope ?? 'shared',
    PROJECT,
  );
  const files = options.files ?? {
    'state.md': '# state\n',
    'summary.md': '# Summary\n\nDone.\n',
    'project-log.md': '# Project Log: demo\n\n## Entries\n',
    'reviews/review.md': '# review (never archived)\n',
  };
  for (const [name, content] of Object.entries(files)) {
    await mkdir(join(projectPath, name, '..'), { recursive: true });
    await writeFile(join(projectPath, name), content, 'utf8');
  }
  const pristine = await scratch('oat-archive-pristine-');
  await cp(projectPath, pristine, { recursive: true });
  return {
    repoRoot,
    projectPath,
    archiveRoot: join(repoRoot, '.oat', 'projects', 'archived'),
    pristine,
  };
}

async function restoreSource(fixture: Fixture): Promise<void> {
  await rm(fixture.projectPath, { recursive: true, force: true });
  await cp(fixture.pristine, fixture.projectPath, { recursive: true });
}

function stubS3(options: { failSync?: boolean } = {}) {
  const calls: string[][] = [];
  const execFile: ExecFileLike = vi.fn(async (_file, args) => {
    calls.push([...args]);
    if (options.failSync && args[0] === 's3') {
      throw new Error('stubbed S3 outage');
    }
    return { stdout: '', stderr: '' };
  });
  const ensureS3ArchiveAccess = vi.fn(async () => ({
    ok: true,
    warnings: [] as string[],
  }));
  return { calls, execFile, ensureS3ArchiveAccess };
}

/**
 * An in-process `aws` that mirrors `s3 sync` between local directories and
 * `s3Root` and honors every `--exclude` (aws glob: `*` crosses `/`, matched
 * against the path relative to the sync source), plus `s3 ls` of a prefix.
 * Directories whose contents an exclude covers are not created, as S3 holds
 * no directories.
 */
function fakeS3Mirror(s3Root: string): {
  execFile: ExecFileLike;
  ensureS3ArchiveAccess: () => Promise<{ ok: true; warnings: string[] }>;
} {
  const toLocal = (uri: string, cwd: string): string =>
    uri.startsWith('s3://')
      ? join(s3Root, uri.slice('s3://'.length))
      : resolve(cwd, uri);
  const execFile: ExecFileLike = async (file, args, options) => {
    const cwd = options?.cwd ?? process.cwd();
    if (file !== 'aws' || args[0] !== 's3') return { stdout: '', stderr: '' };
    if (args[1] === 'ls') {
      const dir = toLocal(args[2]!, cwd);
      const names = existsSync(dir)
        ? (await readdir(dir, { withFileTypes: true }))
            .filter((entry) => entry.isDirectory())
            .map((entry) => `                           PRE ${entry.name}/`)
        : [];
      return { stdout: `${names.join('\n')}\n`, stderr: '' };
    }
    if (args[1] === 'sync') {
      const source = toLocal(args[2]!, cwd);
      const target = toLocal(args[3]!, cwd);
      const excludes = args
        .flatMap((arg, index) => (args[index - 1] === '--exclude' ? [arg] : []))
        .map(
          (pattern) =>
            new RegExp(
              `^${pattern
                .replace(/[.+^${}()|[\]\\]/g, '\\$&')
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.')}$`,
            ),
        );
      const excluded = (relativePath: string): boolean =>
        excludes.some(
          (pattern) =>
            pattern.test(relativePath) || pattern.test(`${relativePath}/x`),
        );
      await mkdir(target, { recursive: true });
      await cp(source, target, {
        recursive: true,
        filter: (entry) => {
          const relativePath = relative(source, entry).split(sep).join('/');
          return relativePath === '' || !excluded(relativePath);
        },
      });
      return { stdout: '', stderr: '' };
    }
    throw new Error(`fake aws: unsupported ${args.join(' ')}`);
  };
  return {
    execFile,
    ensureS3ArchiveAccess: async () => ({ ok: true, warnings: [] }),
  };
}

/** Runs the public `oat repo archive sync` in process; returns its JSON. */
async function hydrate(
  fixture: Fixture,
  execFile: ExecFileLike,
  projectName: string | undefined,
  options: { force?: boolean } = {},
): Promise<Record<string, unknown>> {
  const capture = createLoggerCapture();
  const exitCode = process.exitCode;
  await runArchiveSyncCommand(
    {
      ...defaultProjectArchiveCommandDependencies(),
      resolveProjectRoot: async () => fixture.repoRoot,
      readOatConfig: async () => ({
        version: 1,
        archive: { s3Uri: S3_URI, s3SyncOnComplete: true },
      }),
      resolveProjectsRoot: async () => '.oat/projects/shared',
      ensureS3ArchiveAccess: async () => ({ ok: true, warnings: [] }),
      execFile,
      processEnv: {},
    },
    projectName,
    options,
    {
      scope: 'project',
      dryRun: false,
      verbose: false,
      json: true,
      cwd: fixture.repoRoot,
      home: fixture.repoRoot,
      interactive: false,
      logger: capture.logger,
    } satisfies CommandContext,
  );
  process.exitCode = exitCode;
  return capture.jsonPayloads[0] as Record<string, unknown>;
}

function archiveOptions(
  fixture: Fixture,
  overrides: {
    summaryExportPath?: string;
    projectPath?: string;
    newGenerationReason?: string;
  } = {},
) {
  return {
    ...(overrides.newGenerationReason !== undefined
      ? { newGenerationReason: overrides.newGenerationReason }
      : {}),
    repoRoot: fixture.repoRoot,
    projectPath: overrides.projectPath ?? fixture.projectPath,
    projectName: PROJECT,
    projectsRoot: '.oat/projects/shared',
    s3Uri: S3_URI,
    s3SyncOnComplete: true,
    summaryExportPath: overrides.summaryExportPath ?? SUMMARY_EXPORT,
  };
}

/** Runs the public archive dry-run in process and returns its JSON report. */
async function previewArchive(
  fixture: Fixture,
  projectPath: string,
  timestamp: string,
  options: { newGeneration?: string } = {},
  overrides: Partial<ProjectArchivePushCommandDependencies> = {},
): Promise<Record<string, unknown>> {
  const capture = createLoggerCapture();
  const exitCode = process.exitCode;
  await runArchivePushCommand(
    {
      ...defaultProjectArchivePushCommandDependencies(),
      resolveProjectRoot: async () => fixture.repoRoot,
      timestamp: () => timestamp,
      ...overrides,
    },
    projectPath,
    { dryRun: true, ...options },
    {
      scope: 'project',
      dryRun: false,
      verbose: false,
      json: true,
      cwd: fixture.repoRoot,
      home: fixture.repoRoot,
      interactive: false,
      logger: capture.logger,
    },
  );
  process.exitCode = exitCode;
  return capture.jsonPayloads[0] as Record<string, unknown>;
}

describe('archive retry identity (archive-retry-identity)', () => {
  it('reuses the original snapshot for an identical same-day retry instead of creating a timestamp-suffixed twin', async () => {
    const fixture = await createFixture();
    const expectedManifest = await computeArchiveManifestHash(
      fixture.projectPath,
    );
    const first = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    const metadata = JSON.parse(
      await readFile(
        join(first.archivePath, ARCHIVE_SNAPSHOT_METADATA_FILENAME),
        'utf8',
      ),
    ) as Record<string, unknown>;
    expect(metadata).toEqual({
      projectName: PROJECT,
      snapshotName: '20260901-demo',
      scope: 'shared',
      manifestHash: expectedManifest,
      generation: 1,
    });

    // The tracked project directory reappears unchanged (a restored checkout).
    await restoreSource(fixture);
    const retryS3 = stubS3();
    const retried = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...retryS3,
      timestamp: () => '2026-09-01T15:30:00Z',
    });

    expect(await readdir(fixture.archiveRoot)).toEqual([PROJECT]);
    expect(retried.archivePath).toBe(first.archivePath);
    expect(retried.snapshotId).toBe(first.snapshotId);
    expect(retried.summaryExportFile).toBe(first.summaryExportFile);
    expect(retried.s3Path).toBe(first.s3Path);
    expect(retried.s3Path).toMatch(/\/projects\/20260901-demo$/);
    expect(existsSync(fixture.projectPath)).toBe(false);
  });

  it('refuses to adopt a damaged archive as a retry, leaving both copies untouched', async () => {
    const fixture = await createFixture();
    const first = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    await restoreSource(fixture);
    // Unchanged-retry control: the intact archive is reused.
    const control = await evaluateArchiveRetryIdentity({
      repoRoot: fixture.repoRoot,
      projectsRoot: '.oat/projects/shared',
      projectName: PROJECT,
      projectPath: fixture.projectPath,
      scope: 'shared',
      timestamp: '2026-09-02T09:00:00Z',
    });
    expect(control).toMatchObject({
      disposition: 'retry',
      archivePath: first.archivePath,
    });

    // Damage one archived file; the metadata (and its manifestHash) stays.
    await writeFile(join(first.archivePath, 'state.md'), '# damaged\n');
    const archiveBefore = await treeHash(fixture.archiveRoot);
    const sourceBefore = await treeHash(fixture.projectPath);
    const exportBefore = await treeHash(join(fixture.repoRoot, SUMMARY_EXPORT));
    const s3 = stubS3();

    await expect(
      archiveProjectOnCompletion(archiveOptions(fixture), {
        ...s3,
        timestamp: () => '2026-09-02T09:00:00Z',
      }),
    ).rejects.toMatchObject({
      code: 'archive-retry-candidate-damaged',
      message: expect.stringMatching(
        /^archive-retry-candidate-damaged: .*no longer matches the manifest recorded/,
      ),
    });
    expect(s3.calls).toEqual([]);
    expect(s3.ensureS3ArchiveAccess).not.toHaveBeenCalled();
    expect(await treeHash(fixture.archiveRoot)).toBe(archiveBefore);
    expect(await treeHash(fixture.projectPath)).toBe(sourceBefore);
    expect(await treeHash(join(fixture.repoRoot, SUMMARY_EXPORT))).toBe(
      exportBefore,
    );
    expect(
      await previewArchive(
        fixture,
        fixture.projectPath,
        '2026-09-02T09:00:00Z',
      ),
    ).toMatchObject({
      status: 'error',
      code: 'archive-retry-candidate-damaged',
    });

    // The source-absent resume path refuses the same damaged archive.
    await rm(fixture.projectPath, { recursive: true });
    await expect(
      archiveProjectOnCompletion(archiveOptions(fixture), {
        ...stubS3(),
        timestamp: () => '2026-09-03T09:00:00Z',
      }),
    ).rejects.toMatchObject({ code: 'archive-retry-candidate-damaged' });
    expect(await treeHash(fixture.archiveRoot)).toBe(archiveBefore);
  });

  it('reuses the dated export identity and S3 destination for a cross-date retry', async () => {
    const fixture = await createFixture();
    const first = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    await restoreSource(fixture);
    const retried = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-03T09:00:00Z',
    });

    expect(retried.s3Path).toBe(first.s3Path);
    expect(retried.summaryExportFile).toBe(first.summaryExportFile);
    expect(await readdir(join(fixture.repoRoot, SUMMARY_EXPORT))).toEqual([
      '20260901-demo.md',
    ]);
    expect(await readdir(fixture.archiveRoot)).toEqual([PROJECT]);
  });

  it('resumes a source-absent archive under its persisted identity', async () => {
    const fixture = await createFixture();
    const first = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3({ failSync: true }),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    expect(first.s3Path).toBeNull();
    expect(existsSync(fixture.projectPath)).toBe(false);

    const resumeS3 = stubS3();
    const resumed = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...resumeS3,
      timestamp: () => '2026-09-04T09:00:00Z',
    });

    expect(resumed.archivePath).toBe(first.archivePath);
    expect(resumed.summaryExportFile).toBe(first.summaryExportFile);
    expect(resumed.s3Path).toMatch(/\/projects\/20260901-demo$/);
    expect(resumeS3.calls.filter((args) => args[0] === 's3')).toEqual([
      expect.arrayContaining(['sync', first.archivePath, resumed.s3Path]),
    ]);
  });

  it('refuses changed content before export, copy or S3 mutation, with follow-up guidance', async () => {
    const fixture = await createFixture();
    const first = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    await restoreSource(fixture);
    await writeFile(
      join(fixture.projectPath, 'state.md'),
      '# state (reopened)\n',
    );
    const archiveBefore = await treeHash(fixture.archiveRoot);
    const exportBefore = await treeHash(join(fixture.repoRoot, SUMMARY_EXPORT));
    const sourceBefore = await treeHash(fixture.projectPath);
    const retryS3 = stubS3();

    await expect(
      archiveProjectOnCompletion(archiveOptions(fixture), {
        ...retryS3,
        timestamp: () => '2026-09-02T09:00:00Z',
      }),
    ).rejects.toThrow(
      `Project \`demo\` (shared) was already archived as \`20260901-demo\` (generation 1) at \`${first.archivePath}\`, and its retained artifacts differ from that snapshot; refusing to overwrite the archive or create a second copy before any export, copy or S3 mutation. Record reopened work in a follow-up project (for example \`oat project new demo-followup\`) and archive that project instead.`,
    );
    expect(retryS3.calls).toEqual([]);
    expect(retryS3.ensureS3ArchiveAccess).not.toHaveBeenCalled();
    expect(await treeHash(fixture.archiveRoot)).toBe(archiveBefore);
    expect(await treeHash(join(fixture.repoRoot, SUMMARY_EXPORT))).toBe(
      exportBefore,
    );
    expect(await treeHash(fixture.projectPath)).toBe(sourceBefore);
  });

  it('names the latest generation when changed content is refused', async () => {
    const fixture = await createFixture();
    const generations = [
      { dir: PROJECT, snapshot: '20260901-demo', generation: 1 },
      { dir: `${PROJECT}-g2`, snapshot: '20260902-demo-g2', generation: 2 },
      { dir: `${PROJECT}-g3`, snapshot: '20260903-demo-g3', generation: 3 },
      { dir: `${PROJECT}-g4`, snapshot: '20260904-demo-g4', generation: 4 },
      {
        dir: `${PROJECT}-g5`,
        snapshot: '20260905-demo-g5',
        generation: 5,
        pending: true,
      },
    ];
    for (const entry of generations) {
      const archivePath = join(fixture.archiveRoot, entry.dir);
      await mkdir(archivePath, { recursive: true });
      await writeFile(join(archivePath, 'state.md'), `# ${entry.dir}\n`);
      await writeFile(
        join(archivePath, ARCHIVE_SNAPSHOT_METADATA_FILENAME),
        `${JSON.stringify({
          projectName: PROJECT,
          snapshotName: entry.snapshot,
          scope: 'shared',
          manifestHash: `sha256:${String(entry.generation).repeat(64)}`,
          generation: entry.generation,
          ...(entry.generation > 1 ? { predecessor: 'earlier' } : {}),
          ...(entry.pending ? { allocation: 'pending' } : {}),
        })}\n`,
      );
    }

    await expect(
      archiveProjectOnCompletion(archiveOptions(fixture), {
        ...stubS3(),
        timestamp: () => '2026-09-06T09:00:00Z',
      }),
    ).rejects.toThrow(
      `archive-retry-conflict: Project \`demo\` (shared) was already archived as \`20260905-demo-g5\` (generation 5, allocation: pending) at \`${join(fixture.archiveRoot, 'demo-g5')}\``,
    );
  });

  it('accepts a retry whose only difference is review evidence, which is never archived', async () => {
    const fixture = await createFixture();
    const first = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    await restoreSource(fixture);
    await writeFile(
      join(fixture.projectPath, 'reviews', 'late-review.md'),
      '# late\n',
    );

    const retried = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-02T09:00:00Z',
    });
    expect(retried.archivePath).toBe(first.archivePath);
    expect(retried.s3Path).toBe(first.s3Path);
  });

  it('restores an archive holding PR evidence from S3 and resumes it source-absent as a retry', async () => {
    const fixture = await createFixture({
      files: {
        'state.md': '# state\n',
        'summary.md': '# Summary\n\nDone.\n',
        'pr/final.md': '# PR description (never archived)\n',
        'reviews/review.md': '# review (never archived)\n',
      },
    });
    const s3Root = await scratch('oat-fake-s3-mirror-');
    const mirror = fakeS3Mirror(s3Root);
    const ensureS3ArchiveAccess = vi.fn(async () => ({
      ok: true,
      warnings: [] as string[],
    }));
    const first = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...mirror,
      ensureS3ArchiveAccess,
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    expect(first.s3Path).toMatch(/\/projects\/20260901-demo$/);
    expect(existsSync(fixture.projectPath)).toBe(false);

    // Lose the local archive, then hydrate it from S3 through the public
    // sync runner.
    await rm(first.archivePath, { recursive: true, force: true });
    expect(await hydrate(fixture, mirror.execFile, PROJECT)).toMatchObject({
      status: 'ok',
      targets: ['.oat/projects/archived/demo'],
    });
    await expect(
      readFile(join(first.archivePath, 'state.md'), 'utf8'),
    ).resolves.toBe('# state\n');

    // The source-absent retry recognizes the restored archive as intact.
    await expect(
      evaluateArchiveRetryIdentity({
        repoRoot: fixture.repoRoot,
        projectsRoot: '.oat/projects/shared',
        projectName: PROJECT,
        projectPath: fixture.projectPath,
        scope: 'shared',
        timestamp: '2026-09-04T09:00:00Z',
      }),
    ).resolves.toMatchObject({
      disposition: 'retry',
      archivePath: first.archivePath,
    });
    const resumed = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...mirror,
      ensureS3ArchiveAccess,
      timestamp: () => '2026-09-04T09:00:00Z',
    });
    expect(resumed.archivePath).toBe(first.archivePath);
    expect(resumed.s3Path).toBe(first.s3Path);
  });

  it('retains neither PR nor review evidence in the local copy or in S3', async () => {
    const fixture = await createFixture({
      files: {
        'state.md': '# state\n',
        'pr/final.md': '# PR description (never archived)\n',
        'reviews/review.md': '# review (never archived)\n',
      },
    });
    const s3Root = await scratch('oat-fake-s3-mirror-');
    const mirror = fakeS3Mirror(s3Root);
    const archived = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...mirror,
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    expect(S3_ARCHIVE_SYNC_EXCLUDES).toEqual(['reviews/*', 'pr/*', '.git/*']);
    expect((await readdir(archived.archivePath)).sort()).toEqual([
      ARCHIVE_SNAPSHOT_METADATA_FILENAME,
      'state.md',
    ]);
    const uploaded = join(s3Root, archived.s3Path!.slice('s3://'.length));
    expect((await readdir(uploaded)).sort()).toEqual([
      ARCHIVE_SNAPSHOT_METADATA_FILENAME,
      'state.md',
    ]);
  });

  it("excludes a shared project's .git from the archive and its manifest", async () => {
    const fixture = await createFixture({
      files: {
        'state.md': '# state\n',
        'summary.md': '# Summary\n',
        '.git/HEAD': 'ref: refs/heads/main\n',
      },
    });
    const sourceManifest = await computeArchiveManifestHash(
      fixture.projectPath,
    );
    const archived = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });

    expect(existsSync(join(archived.archivePath, '.git'))).toBe(false);
    expect((await readdir(archived.archivePath)).sort()).toEqual([
      ARCHIVE_SNAPSHOT_METADATA_FILENAME,
      'state.md',
      'summary.md',
    ]);
    expect(await computeArchiveManifestHash(archived.archivePath)).toBe(
      sourceManifest,
    );
    expect(
      JSON.parse(
        await readFile(
          join(archived.archivePath, ARCHIVE_SNAPSHOT_METADATA_FILENAME),
          'utf8',
        ),
      ),
    ).toMatchObject({ manifestHash: sourceManifest });
  });

  it('refuses an unverifiable non-empty directory at the base archive path', async () => {
    const fixture = await createFixture();
    const occupant = join(fixture.archiveRoot, PROJECT);
    await mkdir(occupant, { recursive: true });
    await writeFile(join(occupant, 'state.md'), '# legacy\n');
    const before = await treeHash(fixture.archiveRoot);
    const s3 = stubS3();

    await expect(
      archiveProjectOnCompletion(archiveOptions(fixture), {
        ...s3,
        timestamp: () => '2026-09-01T09:00:00Z',
      }),
    ).rejects.toThrow(/without readable archive metadata.*follow-up project/);
    expect(s3.calls).toEqual([]);
    expect(await treeHash(fixture.archiveRoot)).toBe(before);
    expect(existsSync(fixture.projectPath)).toBe(true);
  });

  it('archives the same slug from a different scope as its own identity without touching the other archive', async () => {
    const shared = await createFixture();
    const sharedArchive = await archiveProjectOnCompletion(
      archiveOptions(shared),
      { ...stubS3(), timestamp: () => '2026-09-01T09:00:00Z' },
    );
    const sharedBefore = await treeHash(sharedArchive.archivePath);
    const localPath = join(
      shared.repoRoot,
      '.oat',
      'projects',
      'local',
      PROJECT,
    );
    await mkdir(localPath, { recursive: true });
    await writeFile(join(localPath, 'state.md'), '# local state\n');
    await writeFile(join(localPath, 'summary.md'), '# Local summary\n');

    const preview = await previewArchive(
      shared,
      localPath,
      '2026-09-01T10:00:00Z',
    );
    const localS3 = stubS3();
    const localArchive = await archiveProjectOnCompletion(
      archiveOptions(shared, { projectPath: localPath }),
      { ...localS3, timestamp: () => '2026-09-01T10:00:07Z' },
    );

    expect(localArchive.archivePath).toBe(
      join(shared.archiveRoot, `${PROJECT}-local`),
    );
    expect(preview).toMatchObject({
      mode: 'dry-run',
      archivePath: localArchive.archivePath,
    });
    expect(localArchive.archivePath).not.toBe(sharedArchive.archivePath);
    expect(localArchive.s3Path).toMatch(/\/projects\/20260901-demo-local$/);
    expect(localArchive.summaryExportFile).toMatch(/20260901-demo-local\.md$/);
    expect(await treeHash(sharedArchive.archivePath)).toBe(sharedBefore);
    expect(
      localS3.calls.filter((args) => args[0] === 's3').map((args) => args[3]),
    ).toEqual([localArchive.s3Path]);
    await expect(
      readFile(sharedArchive.summaryExportFile!, 'utf8'),
    ).resolves.toBe('# Summary\n\nDone.\n');
  });

  it('archives into an empty base directory instead of a clock-suffixed sibling', async () => {
    const fixture = await createFixture();
    await mkdir(join(fixture.archiveRoot, PROJECT), { recursive: true });
    const preview = await previewArchive(
      fixture,
      fixture.projectPath,
      '2026-09-01T09:00:00Z',
    );
    const archived = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:05Z',
    });

    expect(archived.archivePath).toBe(join(fixture.archiveRoot, PROJECT));
    expect(preview).toMatchObject({ archivePath: archived.archivePath });
    expect(await readdir(fixture.archiveRoot)).toEqual([PROJECT]);
    await expect(
      readFile(join(archived.archivePath, 'state.md'), 'utf8'),
    ).resolves.toBe('# state\n');
  });

  it('reuses an empty scope-qualified directory and refuses a non-empty unverifiable one', async () => {
    const shared = await createFixture();
    await archiveProjectOnCompletion(archiveOptions(shared), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    const localPath = join(
      shared.repoRoot,
      '.oat',
      'projects',
      'local',
      PROJECT,
    );
    await mkdir(localPath, { recursive: true });
    await writeFile(join(localPath, 'state.md'), '# local state\n');
    const qualified = join(shared.archiveRoot, `${PROJECT}-local`);

    await mkdir(qualified);
    await writeFile(join(qualified, 'notes.md'), '# unrelated\n');
    const before = await treeHash(shared.archiveRoot);
    await expect(
      archiveProjectOnCompletion(
        archiveOptions(shared, { projectPath: localPath }),
        { ...stubS3(), timestamp: () => '2026-09-01T10:00:00Z' },
      ),
    ).rejects.toMatchObject({ code: 'archive-occupant-unverifiable' });
    expect(await treeHash(shared.archiveRoot)).toBe(before);

    await rm(join(qualified, 'notes.md'));
    const archived = await archiveProjectOnCompletion(
      archiveOptions(shared, { projectPath: localPath }),
      { ...stubS3(), timestamp: () => '2026-09-01T10:00:00Z' },
    );
    expect(archived.archivePath).toBe(qualified);
    expect(archived.snapshotId).toBe(`${PROJECT}-local`);
    await expect(readFile(join(qualified, 'state.md'), 'utf8')).resolves.toBe(
      '# local state\n',
    );
    expect((await readdir(shared.archiveRoot)).sort()).toEqual([
      PROJECT,
      `${PROJECT}-local`,
    ]);
  });

  it('refuses an ambiguous retry when two same-scope archives hold the same content', async () => {
    const fixture = await createFixture();
    const first = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    // The audit's historical twin shape: a timestamp-suffixed copy.
    await cp(first.archivePath, `${first.archivePath}-20260901093000`, {
      recursive: true,
    });
    await restoreSource(fixture);
    const before = await treeHash(fixture.archiveRoot);
    const s3 = stubS3();

    await expect(
      archiveProjectOnCompletion(archiveOptions(fixture), {
        ...s3,
        timestamp: () => '2026-09-02T09:00:00Z',
      }),
    ).rejects.toThrow(/matches 2 existing archives.*refusing an ambiguous/);
    expect(s3.calls).toEqual([]);
    expect(await treeHash(fixture.archiveRoot)).toBe(before);
  });

  it('refuses a recordless synced retry when several archives match the completed ref', async () => {
    const repoRoot = await scratch('oat-archive-identity-synced-');
    const slug = 'ambiguous-recordless';
    const sha = 'c'.repeat(40);
    for (const name of [slug, `${slug}-20260830120000`]) {
      const archivePath = join(repoRoot, '.oat', 'projects', 'archived', name);
      await mkdir(archivePath, { recursive: true });
      await writeFile(join(archivePath, 'summary.md'), '# synced\n');
      await writeFile(
        join(archivePath, ARCHIVE_SNAPSHOT_METADATA_FILENAME),
        `${JSON.stringify({
          projectName: slug,
          snapshotName: `20260830-${slug}`,
          scope: 'synced',
          sourceRefSha: sha,
        })}\n`,
      );
    }
    const s3 = stubS3();

    await expect(
      archiveProjectOnCompletion(
        {
          repoRoot,
          projectPath: join(repoRoot, '.oat', 'projects', 'synced', slug),
          projectName: slug,
          projectsRoot: '.oat/projects/shared',
          summaryExportPath: SUMMARY_EXPORT,
          s3Uri: S3_URI,
          s3SyncOnComplete: true,
        },
        {
          ...s3,
          probeSyncedTerminalRefs: vi.fn(async () => ({
            state: 'completed-only' as const,
            activeRef: `refs/oat/projects/${slug}`,
            completedRef: `refs/oat/completed/${slug}`,
            expectedSha: sha,
            activeSha: null,
            completedSha: sha,
          })),
        },
      ),
    ).rejects.toThrow(/multiple persisted archives match/);
    expect(s3.ensureS3ArchiveAccess).not.toHaveBeenCalled();
    expect(existsSync(join(repoRoot, SUMMARY_EXPORT))).toBe(false);
  });
});

describe('summary locator finalization at export', () => {
  const SUMMARY = `# Summary: demo

## Autonomous Execution Learnings

### Workflow issues

- Warm the cache before resuming. Sources: oat-project:demo#2026-10-11-friction-cache-misses-1, oat-project:demo#2026-10-11-friction-cache-misses-2
- Pin the cache key. Source: legacy learning 2026-10-01T09:00:00Z — gotcha — legacy cache lesson

## Workflow Observations

- **friction · cache misses** — The cache missed on resume. oat-project:demo#2026-10-11-friction-cache-misses-1
- **friction · cache misses** — The cache missed again. oat-project:demo#2026-10-11-friction-cache-misses-2
- See [the log](project-log.md#entries) and [legacy notes](./oat-execution-learnings.md); related oat-project:other#2026-10-01-bug-x-1.
- **feedback · review** — Raised in [the review](reviews/final.md#f2) and [the p01 review](./reviews/archived/p01-review.md); see [the docs](https://example.com/reviews/final.md).
- **feedback · pr** — Described in [the PR description](pr/project-pr.md); compare [the upstream PR](https://example.com/pr/1).
`;

  it('finalizes both sections to the persisted archive identity, verified from a non-default destination', async () => {
    const fixture = await createFixture({
      files: { 'state.md': '# state\n', 'summary.md': SUMMARY },
    });
    const exportPath = 'docs/archive/summaries';
    const first = await archiveProjectOnCompletion(
      archiveOptions(fixture, { summaryExportPath: exportPath }),
      { ...stubS3(), timestamp: () => '2026-10-11T09:00:00Z' },
    );
    const destination = join(fixture.repoRoot, exportPath);
    expect(first.summaryExportFile).toBe(join(destination, '20261011-demo.md'));
    const exported = await readFile(
      join(destination, '20261011-demo.md'),
      'utf8',
    );

    const [learnings, observations] = exported
      .split('## Workflow Observations')
      .map((section) => section);
    for (const section of [learnings!, observations!]) {
      expect(section).toContain(
        'oat-archive:20261011-demo#2026-10-11-friction-cache-misses-1',
      );
      expect(section).toContain(
        'oat-archive:20261011-demo#2026-10-11-friction-cache-misses-2',
      );
      expect(section).not.toMatch(/oat-project:demo#/);
      expect(section).not.toMatch(/\]\((?:\.\/)?project-log\.md/);
      expect(section).not.toMatch(/\]\((?:\.\/)?oat-execution-learnings\.md/);
    }
    expect(exported).toContain(
      'Source: legacy learning 2026-10-01T09:00:00Z — gotcha — legacy cache lesson',
    );
    expect(exported).toContain(
      'See the log (oat-archive:20261011-demo/project-log.md) and legacy notes (oat-archive:20261011-demo/oat-execution-learnings.md)',
    );
    expect(exported).toContain('oat-project:other#2026-10-01-bug-x-1');
    // Review links become plain provenance; an external link is kept.
    expect(exported).toContain(
      'Raised in the review (review `reviews/final.md`, local to the project; not archived) and the p01 review (review `reviews/archived/p01-review.md`, local to the project; not archived)',
    );
    expect(exported).not.toMatch(/\]\((?:\.\/)?reviews\//);
    // PR evidence is not archived either: the same plain provenance.
    expect(exported).toContain(
      'Described in the PR description (PR artifact `pr/project-pr.md`, local to the project; not archived)',
    );
    expect(exported).not.toMatch(/\]\((?:\.\/)?pr\//);
    expect(exported).toContain('[the upstream PR](https://example.com/pr/1)');
    expect(exported).toContain(
      '[the docs](https://example.com/reviews/final.md)',
    );
    // The archive keeps the summary exactly as authored.
    await expect(
      readFile(join(first.archivePath, 'summary.md'), 'utf8'),
    ).resolves.toBe(SUMMARY);

    // A later identical retry finds the finalized export already in place.
    await restoreSource(fixture);
    const retried = await archiveProjectOnCompletion(
      archiveOptions(fixture, { summaryExportPath: exportPath }),
      { ...stubS3(), timestamp: () => '2026-10-13T09:00:00Z' },
    );
    expect(retried.summaryExportFile).toBe(first.summaryExportFile);
    expect(retried.warnings).toEqual([]);
    await expect(
      readFile(join(destination, '20261011-demo.md'), 'utf8'),
    ).resolves.toBe(exported);
  });
});

describe('public archive dry-run and apply share one retry identity', () => {
  function builtCliEntry(): string {
    const entry = join(import.meta.dirname, '../../../../dist/index.js');
    if (!existsSync(entry)) {
      throw new Error(
        `Missing built CLI at ${entry}; run \`pnpm --filter @open-agent-toolkit/cli build\` first.`,
      );
    }
    return entry;
  }

  /** A fake `aws` that mirrors `s3 sync <dir> s3://…` into `$FAKE_S3`. */
  async function fakeAws(): Promise<{ bin: string; s3: string; log: string }> {
    const bin = await scratch('oat-fake-aws-bin-');
    const s3 = await scratch('oat-fake-s3-');
    const log = join(bin, 'calls.log');
    await writeFile(
      join(bin, 'aws'),
      [
        '#!/bin/sh',
        'printf "%s\\n" "$*" >> "$FAKE_AWS_LOG"',
        'case "$1" in',
        '  --version) echo "aws-cli/2.0.0 fake"; exit 0 ;;',
        '  sts) echo "{}"; exit 0 ;;',
        '  s3)',
        '    if [ "$2" = sync ]; then',
        '      dest="$FAKE_S3/${4#s3://}"',
        '      mkdir -p "$dest" && cp -R "$3/." "$dest/"',
        '      exit $?',
        '    fi ;;',
        'esac',
        'exit 1',
        '',
      ].join('\n'),
    );
    await chmod(join(bin, 'aws'), 0o755);
    return { bin, s3, log };
  }

  async function cliFixture(): Promise<
    Fixture & { home: string; aws: Awaited<ReturnType<typeof fakeAws>> }
  > {
    const fixture = await createFixture();
    execFileSync('git', ['init', '-q'], { cwd: fixture.repoRoot });
    await writeFile(
      join(fixture.repoRoot, '.oat', 'config.json'),
      `${JSON.stringify(
        {
          version: 1,
          archive: {
            s3Uri: S3_URI,
            s3SyncOnComplete: true,
            summaryExportPath: SUMMARY_EXPORT,
          },
        },
        null,
        2,
      )}\n`,
    );
    return {
      ...fixture,
      home: await scratch('oat-archive-home-'),
      aws: await fakeAws(),
    };
  }

  type Report = {
    status: string;
    mode: string;
    generation?: number;
    predecessorSnapshot?: string | null;
    snapshotId: string;
    archivePath: string;
    summaryExportFile: string | null;
    s3Path: string | null;
  };

  function runArchive(
    fixture: Awaited<ReturnType<typeof cliFixture>>,
    dryRun: boolean,
    extraArgs: readonly string[] = [],
  ): Report {
    const result = spawnSync(
      process.execPath,
      [
        builtCliEntry(),
        '--json',
        'project',
        'archive',
        '.oat/projects/shared/demo',
        ...(dryRun ? ['--dry-run'] : []),
        ...extraArgs,
      ],
      {
        cwd: fixture.repoRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home,
          PATH: `${fixture.aws.bin}:${process.env.PATH ?? ''}`,
          FAKE_S3: fixture.aws.s3,
          FAKE_AWS_LOG: fixture.aws.log,
          AWS_PROFILE: '',
        },
      },
    );
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    return JSON.parse(result.stdout) as Report;
  }

  const identityOf = (report: Report) => ({
    snapshotId: report.snapshotId,
    archivePath: report.archivePath,
    summaryExportFile: report.summaryExportFile,
    s3Path: report.s3Path,
  });

  async function expectParity(
    fixture: Awaited<ReturnType<typeof cliFixture>>,
    persisted: { snapshotName: string; archivePath: string },
  ): Promise<void> {
    const repoBefore = await treeHash(fixture.repoRoot);
    const s3Before = await treeHash(fixture.aws.s3);
    const preview = runArchive(fixture, true);
    expect(preview.mode).toBe('dry-run');
    // Dry-run changes no file, metadata, ref or stubbed S3 object.
    expect(await treeHash(fixture.repoRoot)).toBe(repoBefore);
    expect(await treeHash(fixture.aws.s3)).toBe(s3Before);

    const applied = runArchive(fixture, false);
    expect(applied.mode).toBe('apply');
    expect(identityOf(preview)).toEqual(identityOf(applied));
    expect(applied.archivePath).toBe(persisted.archivePath);
    expect(applied.summaryExportFile).toBe(
      join(fixture.repoRoot, SUMMARY_EXPORT, `${persisted.snapshotName}.md`),
    );
    expect(applied.s3Path).toMatch(
      new RegExp(`/projects/${persisted.snapshotName}$`),
    );
    expect(await readdir(fixture.archiveRoot)).toEqual([PROJECT]);
  }

  it('previews and applies the same identity for a retained-source retry', async () => {
    const fixture = await cliFixture();
    const first = runArchive(fixture, false);
    await restoreSource(fixture);
    const snapshotName = first.s3Path!.split('/').at(-1)!;
    await expectParity(fixture, {
      snapshotName,
      archivePath: first.archivePath,
    });
  });

  it('previews and applies the persisted identity for a cross-date retry', async () => {
    const fixture = await cliFixture();
    const first = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    await restoreSource(fixture);
    await expectParity(fixture, {
      snapshotName: '20260901-demo',
      archivePath: first.archivePath,
    });
  });

  it('previews and applies the persisted identity for a source-absent resume', async () => {
    const fixture = await cliFixture();
    const first = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3({ failSync: true }),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    expect(first.s3Path).toBeNull();
    expect(existsSync(fixture.projectPath)).toBe(false);
    await expectParity(fixture, {
      snapshotName: '20260901-demo',
      archivePath: first.archivePath,
    });
    expect(
      existsSync(
        join(
          fixture.aws.s3,
          'fake-bucket/oat-archive',
          relative(join(fixture.repoRoot, '..'), fixture.repoRoot),
          'projects/20260901-demo/state.md',
        ),
      ),
    ).toBe(true);
  });
  it('previews a new generation without persisting it, then applies the same identity', async () => {
    const fixture = await cliFixture();
    const first = runArchive(fixture, false);
    await restoreSource(fixture);
    await writeFile(join(fixture.projectPath, 'state.md'), '# reopened\n');
    const repoBefore = await treeHash(fixture.repoRoot);
    const s3Before = await treeHash(fixture.aws.s3);
    const args = ['--new-generation', 'reopened for follow-up fixes'];

    const preview = runArchive(fixture, true, args);
    expect(await treeHash(fixture.repoRoot)).toBe(repoBefore);
    expect(await treeHash(fixture.aws.s3)).toBe(s3Before);
    expect(preview.generation).toBe(2);
    expect(preview.predecessorSnapshot).toBe(first.s3Path!.split('/').at(-1));
    expect(preview.archivePath).toBe(join(fixture.archiveRoot, 'demo-g2'));

    const applied = runArchive(fixture, false, args);
    expect(identityOf(applied)).toEqual(identityOf(preview));
    expect(applied.generation).toBe(2);
    expect(applied.predecessorSnapshot).toBe(preview.predecessorSnapshot);
    expect((await readdir(fixture.archiveRoot)).sort()).toEqual([
      'demo',
      'demo-g2',
    ]);
  });
});

describe('explicit archive generations (archive-generation-authorization)', () => {
  const REASON = 'reopened for follow-up fixes';

  async function reopen(fixture: Fixture, state: string): Promise<void> {
    await restoreSource(fixture);
    await writeFile(join(fixture.projectPath, 'state.md'), state);
  }

  async function readMetadata(archivePath: string) {
    return JSON.parse(
      await readFile(
        join(archivePath, ARCHIVE_SNAPSHOT_METADATA_FILENAME),
        'utf8',
      ),
    ) as Record<string, unknown>;
  }

  function requestId(predecessor: string, manifestHash: string): string {
    return `sha256:${createHash('sha256')
      .update(
        JSON.stringify([
          'oat-archive-generation/1',
          PROJECT,
          'shared',
          predecessor,
          manifestHash,
        ]),
      )
      .digest('hex')}`;
  }

  it('archives reopened work as generation 2 bound to its single predecessor', async () => {
    const fixture = await createFixture();
    const first = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    const firstBefore = await treeHash(first.archivePath);
    await reopen(fixture, '# reopened\n');
    const manifest = await computeArchiveManifestHash(fixture.projectPath);
    const s3 = stubS3();

    const second = await archiveProjectOnCompletion(
      archiveOptions(fixture, { newGenerationReason: REASON }),
      { ...s3, timestamp: () => '2026-09-05T09:00:00Z' },
    );

    expect(second.archivePath).toBe(join(fixture.archiveRoot, 'demo-g2'));
    expect(second.generation).toBe(2);
    expect(second.predecessorSnapshot).toBe('20260901-demo');
    expect(second.s3Path).toMatch(/\/projects\/20260905-demo-g2$/);
    expect(second.summaryExportFile).toMatch(/20260905-demo-g2\.md$/);
    expect(await readMetadata(second.archivePath)).toEqual({
      projectName: PROJECT,
      snapshotName: '20260905-demo-g2',
      scope: 'shared',
      manifestHash: manifest,
      generation: 2,
      predecessor: '20260901-demo',
      generationRequest: requestId('20260901-demo', manifest),
      generationReason: REASON,
    });
    expect(await treeHash(first.archivePath)).toBe(firstBefore);
    expect(existsSync(fixture.projectPath)).toBe(false);
  });

  it('persists the allocation before any side effect and reuses it on an in-flight retry', async () => {
    const fixture = await createFixture();
    await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    await reopen(fixture, '# reopened\n');
    const generationPath = join(fixture.archiveRoot, 'demo-g2');
    const seenAtCopy: Array<Record<string, unknown>> = [];
    const failingS3 = stubS3();

    await expect(
      archiveProjectOnCompletion(
        archiveOptions(fixture, { newGenerationReason: REASON }),
        {
          ...failingS3,
          timestamp: () => '2026-09-05T09:00:00Z',
          copyDirectory: vi.fn(async () => {
            seenAtCopy.push(await readMetadata(generationPath));
            throw new Error('injected copy interruption');
          }),
        },
      ),
    ).rejects.toThrow('injected copy interruption');
    expect(seenAtCopy).toEqual([
      expect.objectContaining({
        snapshotName: '20260905-demo-g2',
        generation: 2,
        predecessor: '20260901-demo',
        allocation: 'pending',
      }),
    ]);
    expect(failingS3.calls).toEqual([]);
    expect(await readdir(generationPath)).toEqual([
      ARCHIVE_SNAPSHOT_METADATA_FILENAME,
    ]);
    expect(existsSync(fixture.projectPath)).toBe(true);

    const retried = await archiveProjectOnCompletion(
      archiveOptions(fixture, { newGenerationReason: REASON }),
      { ...stubS3(), timestamp: () => '2026-09-07T09:00:00Z' },
    );
    expect(retried.archivePath).toBe(generationPath);
    expect(retried.s3Path).toMatch(/\/projects\/20260905-demo-g2$/);
    expect(await readMetadata(generationPath)).not.toHaveProperty('allocation');
    await expect(
      readFile(join(generationPath, 'state.md'), 'utf8'),
    ).resolves.toBe('# reopened\n');
    expect((await readdir(fixture.archiveRoot)).sort()).toEqual([
      'demo',
      'demo-g2',
    ]);
  });

  it('never copies the predecessor metadata of a source reopened from its archive over the pending allocation', async () => {
    const fixture = await createFixture();
    const first = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    // Reopen by copying the generation-1 archive back, metadata included.
    await cp(first.archivePath, fixture.projectPath, { recursive: true });
    await writeFile(join(fixture.projectPath, 'state.md'), '# reopened\n');
    expect(
      existsSync(join(fixture.projectPath, ARCHIVE_SNAPSHOT_METADATA_FILENAME)),
    ).toBe(true);
    const generationPath = join(fixture.archiveRoot, 'demo-g2');
    const admitted: string[] = [];

    await expect(
      archiveProjectOnCompletion(
        archiveOptions(fixture, { newGenerationReason: REASON }),
        {
          ...stubS3(),
          timestamp: () => '2026-09-05T09:00:00Z',
          // The production copy with the production filter, interrupted
          // only after every admitted entry has been written.
          copyDirectory: vi.fn(async (source, destination, filter) => {
            await copyDirectory(
              source,
              destination,
              async (sourcePath, relativePath) => {
                const keep = filter
                  ? await filter(sourcePath, relativePath)
                  : true;
                if (keep) admitted.push(relativePath);
                return keep;
              },
            );
            throw new Error('injected copy interruption');
          }),
        },
      ),
    ).rejects.toThrow('injected copy interruption');
    expect(admitted).toContain('state.md');
    expect(admitted).not.toContain(ARCHIVE_SNAPSHOT_METADATA_FILENAME);
    expect(await readMetadata(generationPath)).toEqual(
      expect.objectContaining({
        snapshotName: '20260905-demo-g2',
        generation: 2,
        predecessor: '20260901-demo',
        allocation: 'pending',
      }),
    );

    const retried = await archiveProjectOnCompletion(
      archiveOptions(fixture, { newGenerationReason: REASON }),
      { ...stubS3(), timestamp: () => '2026-09-07T09:00:00Z' },
    );
    expect(retried.archivePath).toBe(generationPath);
    expect(retried.s3Path).toMatch(/\/projects\/20260905-demo-g2$/);
    expect(await readMetadata(generationPath)).toEqual(
      expect.objectContaining({ generation: 2, predecessor: '20260901-demo' }),
    );
    expect(await readMetadata(generationPath)).not.toHaveProperty('allocation');
    expect(await readMetadata(first.archivePath)).toEqual(
      expect.objectContaining({ snapshotName: '20260901-demo', generation: 1 }),
    );
  });

  it('restores the latest generation by project name and follows the damaged-archive hint to its exact snapshot', async () => {
    const fixture = await createFixture();
    const mirror = fakeS3Mirror(await scratch('oat-fake-s3-mirror-'));
    const first = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...mirror,
      timestamp: () => '2026-10-11T09:00:00Z',
    });
    await reopen(fixture, '# reopened\n');
    const second = await archiveProjectOnCompletion(
      archiveOptions(fixture, { newGenerationReason: REASON }),
      { ...mirror, timestamp: () => '2026-10-12T09:00:00Z' },
    );
    expect(second.s3Path).toMatch(/\/projects\/20261012-demo-g2$/);

    // Both local archives are lost; sync by the project name restores the
    // latest generation to its own directory, never over generation 1.
    await rm(fixture.archiveRoot, { recursive: true, force: true });
    expect(await hydrate(fixture, mirror.execFile, PROJECT)).toMatchObject({
      status: 'ok',
      sources: [second.s3Path],
      targets: ['.oat/projects/archived/demo-g2'],
    });
    expect(existsSync(first.archivePath)).toBe(false);
    expect(await readMetadata(second.archivePath)).toEqual(
      expect.objectContaining({
        snapshotName: '20261012-demo-g2',
        generation: 2,
      }),
    );
    // The full generation name and an unnamed sync reach their own targets.
    expect(await hydrate(fixture, mirror.execFile, 'demo-g2')).toMatchObject({
      status: 'ok',
      targets: [],
      skipped: true,
    });
    expect(await hydrate(fixture, mirror.execFile, undefined)).toMatchObject({
      status: 'ok',
      targets: ['.oat/projects/archived/demo'],
    });
    expect((await readdir(fixture.archiveRoot)).sort()).toEqual([
      'demo',
      'demo-g2',
    ]);

    // A damaged generation-1 archive names the command that restores it,
    // which a by-name sync (now the latest generation) would not.
    await writeFile(join(first.archivePath, 'state.md'), '# damaged\n');
    await restoreSource(fixture);
    const evaluate = () =>
      evaluateArchiveRetryIdentity({
        repoRoot: fixture.repoRoot,
        projectsRoot: '.oat/projects/shared',
        projectName: PROJECT,
        projectPath: fixture.projectPath,
        scope: 'shared',
        timestamp: '2026-10-13T09:00:00Z',
      });
    const refusal = await evaluate().catch((error: unknown) => error as Error);
    expect(String(refusal)).toContain('archive-retry-candidate-damaged');
    const hinted = String(refusal).match(
      /`oat repo archive sync (\S+) --force`/,
    );
    expect(hinted?.[1]).toBe('20261011-demo');
    expect(
      await hydrate(fixture, mirror.execFile, hinted![1], { force: true }),
    ).toMatchObject({
      status: 'ok',
      targets: ['.oat/projects/archived/demo'],
    });
    await expect(
      readFile(join(first.archivePath, 'state.md'), 'utf8'),
    ).resolves.toBe('# state\n');
    await expect(evaluate()).resolves.toMatchObject({
      disposition: 'retry',
      archivePath: first.archivePath,
    });
  });

  it('treats a replayed request as the same generation and a later changed request as the next', async () => {
    const fixture = await createFixture();
    await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    await reopen(fixture, '# reopened\n');
    const second = await archiveProjectOnCompletion(
      archiveOptions(fixture, { newGenerationReason: REASON }),
      { ...stubS3(), timestamp: () => '2026-09-05T09:00:00Z' },
    );

    // Replay: same predecessor and content, so the same request id.
    await reopen(fixture, '# reopened\n');
    const replay = await archiveProjectOnCompletion(
      archiveOptions(fixture, { newGenerationReason: REASON }),
      { ...stubS3(), timestamp: () => '2026-09-06T09:00:00Z' },
    );
    expect(replay.archivePath).toBe(second.archivePath);
    expect(replay.generation).toBe(2);
    expect(replay.warnings).toEqual([
      `\`--new-generation\` resolved to existing generation 2 (\`20260905-demo-g2\`): retained artifacts are identical to that archive, allocated for reason \`${REASON}\`; no new generation was allocated.`,
    ]);
    expect((await readMetadata(second.archivePath)).generationRequest).toBe(
      requestId(
        '20260901-demo',
        (await readMetadata(second.archivePath)).manifestHash as string,
      ),
    );

    // A subsequent explicit request with changed content: generation 3.
    await reopen(fixture, '# reopened again\n');
    const third = await archiveProjectOnCompletion(
      archiveOptions(fixture, { newGenerationReason: 'second follow-up' }),
      { ...stubS3(), timestamp: () => '2026-09-09T09:00:00Z' },
    );
    expect(third.archivePath).toBe(join(fixture.archiveRoot, 'demo-g3'));
    expect(third.generation).toBe(3);
    expect(third.predecessorSnapshot).toBe('20260905-demo-g2');

    // Without the option, changed content still refuses with guidance.
    await reopen(fixture, '# reopened a third time\n');
    await expect(
      archiveProjectOnCompletion(archiveOptions(fixture), {
        ...stubS3(),
        timestamp: () => '2026-09-10T09:00:00Z',
      }),
    ).rejects.toThrow(/retained artifacts differ.*follow-up project/);
  });

  it('warns in apply and dry-run when --new-generation resolves to an existing generation', async () => {
    const fixture = await createFixture();
    await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    await restoreSource(fixture);
    const expected =
      '`--new-generation` resolved to existing generation 1 (`20260901-demo`): retained artifacts are identical to that archive; the reason was not recorded.';

    const capture = createLoggerCapture();
    const context: CommandContext = {
      scope: 'project',
      dryRun: false,
      verbose: false,
      json: true,
      cwd: fixture.repoRoot,
      home: fixture.repoRoot,
      interactive: false,
      logger: capture.logger,
    };
    const exitCode = process.exitCode;
    await runArchivePushCommand(
      {
        ...defaultProjectArchivePushCommandDependencies(),
        resolveProjectRoot: async () => fixture.repoRoot,
        timestamp: () => '2026-09-05T09:00:00Z',
      },
      fixture.projectPath,
      { dryRun: true, newGeneration: REASON },
      context,
    );
    process.exitCode = exitCode;
    expect(capture.jsonPayloads[0]).toMatchObject({
      mode: 'dry-run',
      generation: 1,
      warnings: [expected],
    });

    const applied = await archiveProjectOnCompletion(
      archiveOptions(fixture, { newGenerationReason: REASON }),
      { ...stubS3(), timestamp: () => '2026-09-05T09:00:00Z' },
    );
    expect(applied.generation).toBe(1);
    expect(applied.warnings).toEqual([expected]);
    expect(await readdir(fixture.archiveRoot)).toEqual([PROJECT]);
  });

  it.each([
    // Same day: the second request's dated identity also collides.
    ['shared', 'local', '2026-09-05T10:00:00Z', '20260905'],
    ['local', 'shared', '2026-09-05T10:00:00Z', '20260905'],
    // A later day: only the other scope's archive at `demo-g2` qualifies the
    // path, so the path-held-by-another-scope rule alone decides.
    ['shared', 'local', '2026-09-06T10:00:00Z', '20260906'],
    ['local', 'shared', '2026-09-06T10:00:00Z', '20260906'],
  ] as const)(
    'scope-qualifies the successor path and identity of the second scope to reach generation 2 (%s first, then %s at %s)',
    async (firstScope, secondScope, secondTimestamp, secondDate) => {
      const fixture = await createFixture();
      const localPath = join(
        fixture.repoRoot,
        '.oat',
        'projects',
        'local',
        PROJECT,
      );
      const writeLocal = async (state: string): Promise<void> => {
        await mkdir(localPath, { recursive: true });
        await writeFile(join(localPath, 'state.md'), state);
        await writeFile(join(localPath, 'summary.md'), '# Local summary\n');
      };
      const pathOf = { shared: fixture.projectPath, local: localPath };
      const archiveScope = (
        scope: 'shared' | 'local',
        timestamp: string,
        newGenerationReason?: string,
      ) =>
        archiveProjectOnCompletion(
          archiveOptions(fixture, {
            projectPath: pathOf[scope],
            ...(newGenerationReason ? { newGenerationReason } : {}),
          }),
          { ...stubS3(), timestamp: () => timestamp },
        );

      await archiveScope('shared', '2026-09-01T09:00:00Z');
      await writeLocal('# local state\n');
      const localFirst = await archiveScope('local', '2026-09-01T10:00:00Z');
      expect(localFirst.archivePath).toBe(
        join(fixture.archiveRoot, `${PROJECT}-local`),
      );

      // Both scopes reopen and request generation 2 on the same day.
      await reopen(fixture, '# shared reopened\n');
      await writeLocal('# local reopened\n');
      const first = await archiveScope(
        firstScope,
        '2026-09-05T09:00:00Z',
        REASON,
      );
      const second = await archiveScope(secondScope, secondTimestamp, REASON);

      expect(first.archivePath).toBe(join(fixture.archiveRoot, 'demo-g2'));
      expect(first.s3Path).toMatch(/\/projects\/20260905-demo-g2$/);
      expect(second.archivePath).toBe(
        join(fixture.archiveRoot, `demo-g2-${secondScope}`),
      );
      expect(second.s3Path).toMatch(
        new RegExp(`/projects/${secondDate}-demo-g2-${secondScope}$`),
      );
      expect(second.summaryExportFile).toMatch(
        new RegExp(`${secondDate}-demo-g2-${secondScope}\\.md$`),
      );
      expect(await readMetadata(first.archivePath)).toMatchObject({
        snapshotName: '20260905-demo-g2',
        scope: firstScope,
        generation: 2,
      });
      expect(await readMetadata(second.archivePath)).toMatchObject({
        snapshotName: `${secondDate}-demo-g2-${secondScope}`,
        scope: secondScope,
        generation: 2,
      });

      // Each source-absent retry resumes its own generation.
      for (const [scope, archived] of [
        [firstScope, first],
        [secondScope, second],
      ] as const) {
        expect(existsSync(pathOf[scope])).toBe(false);
        const resumed = await archiveScope(scope, '2026-09-08T09:00:00Z');
        expect(resumed.archivePath).toBe(archived.archivePath);
        expect(resumed.s3Path).toBe(archived.s3Path);
      }
      expect((await readdir(fixture.archiveRoot)).sort()).toEqual([
        'demo',
        'demo-g2',
        `demo-g2-${secondScope}`,
        'demo-local',
      ]);
    },
  );

  it('still refuses a generation path held by something that is not an archive', async () => {
    const fixture = await createFixture();
    await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    await reopen(fixture, '# reopened\n');
    await mkdir(join(fixture.archiveRoot, 'demo-g2'));
    await writeFile(join(fixture.archiveRoot, 'demo-g2', 'notes.md'), 'x\n');

    await expect(
      archiveProjectOnCompletion(
        archiveOptions(fixture, { newGenerationReason: REASON }),
        { ...stubS3(), timestamp: () => '2026-09-05T09:00:00Z' },
      ),
    ).rejects.toThrow(/^archive-generation-path-occupied: /);
    expect(existsSync(join(fixture.archiveRoot, 'demo-g2-shared'))).toBe(false);
  });

  it('reuses an empty generation directory', async () => {
    const fixture = await createFixture();
    await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    await restoreSource(fixture);
    await writeFile(join(fixture.projectPath, 'state.md'), '# reopened\n');
    const generationPath = join(fixture.archiveRoot, `${PROJECT}-g2`);
    await mkdir(generationPath);

    const second = await archiveProjectOnCompletion(
      archiveOptions(fixture, { newGenerationReason: REASON }),
      { ...stubS3(), timestamp: () => '2026-09-05T09:00:00Z' },
    );
    expect(second.archivePath).toBe(generationPath);
    expect(second.generation).toBe(2);
    expect(second.predecessorSnapshot).toBe('20260901-demo');
    await expect(
      readFile(join(generationPath, 'state.md'), 'utf8'),
    ).resolves.toBe('# reopened\n');
    expect((await readdir(fixture.archiveRoot)).sort()).toEqual([
      PROJECT,
      `${PROJECT}-g2`,
    ]);
  });

  it('refuses a generation when two archives hold the latest generation', async () => {
    const fixture = await createFixture();
    const first = await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    await cp(first.archivePath, `${first.archivePath}-20260901093000`, {
      recursive: true,
    });
    await reopen(fixture, '# reopened\n');
    const before = await treeHash(fixture.archiveRoot);
    const s3 = stubS3();

    await expect(
      archiveProjectOnCompletion(
        archiveOptions(fixture, { newGenerationReason: REASON }),
        { ...s3, timestamp: () => '2026-09-05T09:00:00Z' },
      ),
    ).rejects.toThrow(
      /needs exactly one predecessor, but 2 archives hold generation 1.*refusing to allocate a generation/,
    );
    expect(s3.calls).toEqual([]);
    expect(await treeHash(fixture.archiveRoot)).toBe(before);
    expect(existsSync(fixture.projectPath)).toBe(true);
  });

  it('refuses a generation without a predecessor, without a reason, or for a synced project', async () => {
    const fixture = await createFixture();
    const s3 = stubS3();
    await expect(
      archiveProjectOnCompletion(
        archiveOptions(fixture, { newGenerationReason: REASON }),
        { ...s3, timestamp: () => '2026-09-05T09:00:00Z' },
      ),
    ).rejects.toThrow(/needs an archived predecessor.*none exists/);
    await expect(
      archiveProjectOnCompletion(
        archiveOptions(fixture, { newGenerationReason: '   ' }),
        { ...s3, timestamp: () => '2026-09-05T09:00:00Z' },
      ),
    ).rejects.toThrow(/requires a non-empty, single-line reason/);
    await expect(
      evaluateArchiveRetryIdentity({
        repoRoot: fixture.repoRoot,
        projectsRoot: '.oat/projects/shared',
        projectName: PROJECT,
        projectPath: join(
          fixture.repoRoot,
          '.oat',
          'projects',
          'synced',
          PROJECT,
        ),
        scope: 'synced',
        timestamp: '2026-09-05T09:00:00Z',
        newGeneration: { reason: REASON },
      }),
    ).rejects.toThrow(/applies to shared and local projects/);
    expect(s3.calls).toEqual([]);
    expect(existsSync(fixture.archiveRoot)).toBe(false);
  });
});

describe('archive identity refusal codes', () => {
  function evaluate(
    fixture: Fixture,
    overrides: {
      scope?: 'shared' | 'synced';
      projectPath?: string;
      reason?: string;
    } = {},
  ) {
    return evaluateArchiveRetryIdentity({
      repoRoot: fixture.repoRoot,
      projectsRoot: '.oat/projects/shared',
      projectName: PROJECT,
      projectPath: overrides.projectPath ?? fixture.projectPath,
      scope: overrides.scope ?? 'shared',
      timestamp: '2026-09-05T09:00:00Z',
      ...(overrides.reason !== undefined
        ? { newGeneration: { reason: overrides.reason } }
        : {}),
    });
  }

  async function expectCode(
    promise: Promise<unknown>,
    code: string,
  ): Promise<void> {
    await expect(promise).rejects.toMatchObject({
      code,
      message: expect.stringMatching(new RegExp(`^${code}: `)),
    });
  }

  async function archived(): Promise<Fixture> {
    const fixture = await createFixture();
    await archiveProjectOnCompletion(archiveOptions(fixture), {
      ...stubS3(),
      timestamp: () => '2026-09-01T09:00:00Z',
    });
    return fixture;
  }

  async function reopenChanged(fixture: Fixture): Promise<void> {
    await restoreSource(fixture);
    await writeFile(join(fixture.projectPath, 'state.md'), '# reopened\n');
  }

  it('prefixes every refusal with its stable code', async () => {
    const twins = await archived();
    await cp(
      join(twins.archiveRoot, PROJECT),
      join(twins.archiveRoot, `${PROJECT}-20260901093000`),
      { recursive: true },
    );
    await restoreSource(twins);
    await expectCode(evaluate(twins), 'archive-retry-ambiguous');
    await reopenChanged(twins);
    await expectCode(
      evaluate(twins, { reason: 'x' }),
      'archive-generation-ambiguous-predecessor',
    );

    const conflict = await archived();
    await reopenChanged(conflict);
    await expectCode(evaluate(conflict), 'archive-retry-conflict');
    await expectCode(
      evaluate(conflict, { reason: '  ' }),
      'archive-generation-reason',
    );
    await expectCode(
      evaluate(conflict, { scope: 'synced', reason: 'x' }),
      'archive-generation-synced',
    );
    await expectCode(
      evaluate(conflict, {
        projectPath: join(conflict.repoRoot, 'missing', PROJECT),
        reason: 'x',
      }),
      'archive-generation-source-absent',
    );
    const occupiedGeneration = join(conflict.archiveRoot, `${PROJECT}-g2`);
    await mkdir(occupiedGeneration);
    await writeFile(join(occupiedGeneration, 'notes.md'), '# unrelated\n');
    await expectCode(
      evaluate(conflict, { reason: 'x' }),
      'archive-generation-path-occupied',
    );
    await rm(occupiedGeneration, { recursive: true });
    await mkdir(occupiedGeneration);
    await writeFile(
      join(occupiedGeneration, ARCHIVE_SNAPSHOT_METADATA_FILENAME),
      `${JSON.stringify({
        projectName: PROJECT,
        snapshotName: '20260903-demo-g2',
        scope: 'shared',
        manifestHash: `sha256:${'0'.repeat(64)}`,
        generation: 2,
        predecessor: '20260901-demo',
        allocation: 'pending',
      })}\n`,
    );
    await expectCode(
      evaluate(conflict, { reason: 'x' }),
      'archive-generation-pending',
    );

    const fresh = await createFixture();
    await expectCode(
      evaluate(fresh, { reason: 'x' }),
      'archive-generation-no-predecessor',
    );
    const occupant = join(fresh.archiveRoot, PROJECT);
    await mkdir(occupant, { recursive: true });
    await writeFile(join(occupant, 'state.md'), '# partial copy\n');
    await expectCode(evaluate(fresh), 'archive-occupant-unverifiable');
    await expect(evaluate(fresh)).rejects.toThrow(
      'If this directory is a partial copy left by an interrupted archive, inspect and remove it, then retry; otherwise record reopened work in a follow-up project',
    );
  });

  it('reports the code in the archive JSON error', async () => {
    const fixture = await archived();
    await reopenChanged(fixture);
    const report = await previewArchive(
      fixture,
      fixture.projectPath,
      '2026-09-05T09:00:00Z',
    );
    expect(report).toMatchObject({
      status: 'error',
      code: 'archive-retry-conflict',
      message: expect.stringMatching(/^archive-retry-conflict: Project `demo`/),
    });
  });
});

describe('recordless synced dry-run binds through the completed ref', () => {
  const SLUG = 'recordless';
  const SHA_A = 'a'.repeat(40);
  const SHA_B = 'b'.repeat(40);

  async function syncedFixture(
    shas: readonly string[],
  ): Promise<Fixture & { syncedPath: string }> {
    const fixture = await createFixture();
    const names = [SLUG, `${SLUG}-20260830120000`];
    for (const [index, sha] of shas.entries()) {
      const archivePath = join(fixture.archiveRoot, names[index]!);
      await mkdir(archivePath, { recursive: true });
      await writeFile(join(archivePath, 'summary.md'), `# synced ${index}\n`);
      await writeFile(
        join(archivePath, ARCHIVE_SNAPSHOT_METADATA_FILENAME),
        `${JSON.stringify({
          projectName: SLUG,
          snapshotName: `2026083${index}-${SLUG}`,
          scope: 'synced',
          sourceRefSha: sha,
        })}\n`,
      );
    }
    return {
      ...fixture,
      syncedPath: join(fixture.repoRoot, '.oat', 'projects', 'synced', SLUG),
    };
  }

  function probeCompleted(completedSha: string) {
    return vi.fn(async (_target: unknown, expectedSha: string) => ({
      state: 'completed-only' as const,
      activeRef: `refs/oat/projects/${SLUG}`,
      completedRef: `refs/oat/completed/${SLUG}`,
      expectedSha,
      activeSha: null,
      completedSha,
    }));
  }

  function preview(
    fixture: Fixture & { syncedPath: string },
    probe: ReturnType<typeof probeCompleted>,
  ) {
    return previewArchive(
      fixture,
      fixture.syncedPath,
      '2026-10-01T09:00:00Z',
      {},
      {
        resolveRecordlessSyncedArchiveIdentity: (options) =>
          resolveRecordlessSyncedArchiveIdentity(
            options,
            buildSyncTarget(
              options.repoRoot,
              options.projectsRoot,
              options.projectName,
            ),
            defaultGitRunner,
            { probeSyncedTerminalRefs: probe },
          ),
      },
    );
  }

  function apply(
    fixture: Fixture & { syncedPath: string },
    probe: ReturnType<typeof probeCompleted>,
    s3: ReturnType<typeof stubS3>,
  ) {
    return archiveProjectOnCompletion(
      {
        repoRoot: fixture.repoRoot,
        projectPath: fixture.syncedPath,
        projectName: SLUG,
        projectsRoot: '.oat/projects/shared',
        summaryExportPath: SUMMARY_EXPORT,
        s3Uri: S3_URI,
        s3SyncOnComplete: true,
        commit: false,
      },
      {
        ...s3,
        timestamp: () => '2026-10-01T09:00:05Z',
        probeSyncedTerminalRefs: probe,
        retireSyncedRef: vi.fn(async () => ({
          status: 'already-retired' as const,
          state: 'completed-only' as const,
          activeAliasRetained: false,
          activeRef: `refs/oat/projects/${SLUG}`,
          completedRef: `refs/oat/completed/${SLUG}`,
          verifiedSha: SHA_B,
        })),
        removeSyncedCheckout: vi.fn(async () => ({
          status: 'absent' as const,
        })),
        removeSyncedRecord: vi.fn(async () => undefined),
      },
    );
  }

  it('previews and applies the archive the completed ref selects among several', async () => {
    const fixture = await syncedFixture([SHA_A, SHA_B]);
    const probe = probeCompleted(SHA_B);
    const report = await preview(fixture, probe);
    const applied = await apply(fixture, probe, stubS3());

    expect(report).toMatchObject({
      mode: 'dry-run',
      snapshotId: `20260831-${SLUG}`,
      archivePath: join(fixture.archiveRoot, `${SLUG}-20260830120000`),
    });
    expect(applied.snapshotId).toBe(report.snapshotId);
    expect(applied.archivePath).toBe(report.archivePath);
  });

  it('reports the unbound and persisted-path codes in both modes', async () => {
    const unmatched = await syncedFixture([SHA_A]);
    const probe = probeCompleted(SHA_B);
    const report = await preview(unmatched, probe);
    expect(report).toMatchObject({
      status: 'error',
      code: 'archive-synced-recordless-unbound',
    });
    await expect(apply(unmatched, probe, stubS3())).rejects.toMatchObject({
      code: 'archive-synced-recordless-unbound',
      message: expect.stringMatching(/^archive-synced-recordless-unbound: /),
    });

    const none = await syncedFixture([]);
    expect(await preview(none, probe)).toMatchObject({
      status: 'error',
      code: 'archive-synced-recordless-unbound',
    });

    // Two archives carry the persisted snapshot a synced record binds.
    const twins = await syncedFixture([SHA_A, SHA_A]);
    for (const name of [SLUG, `${SLUG}-20260830120000`]) {
      const metadataPath = join(
        twins.archiveRoot,
        name,
        ARCHIVE_SNAPSHOT_METADATA_FILENAME,
      );
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
      await writeFile(
        metadataPath,
        `${JSON.stringify({ ...metadata, snapshotName: `20260830-${SLUG}` })}\n`,
      );
    }
    await expect(
      evaluateArchiveRetryIdentity({
        repoRoot: twins.repoRoot,
        projectsRoot: '.oat/projects/shared',
        projectName: SLUG,
        projectPath: twins.syncedPath,
        scope: 'synced',
        timestamp: '2026-10-01T09:00:00Z',
        persistedSnapshot: `20260830-${SLUG}`,
      }),
    ).rejects.toMatchObject({
      code: 'archive-retry-ambiguous',
      message: expect.stringMatching(/^archive-retry-ambiguous: Persisted/),
    });
  });

  it('refuses in both modes when several archives match the completed ref', async () => {
    const fixture = await syncedFixture([SHA_B, SHA_B]);
    const probe = probeCompleted(SHA_B);
    const before = await treeHash(fixture.archiveRoot);
    const report = await preview(fixture, probe);
    const s3 = stubS3();

    expect(report).toMatchObject({
      status: 'error',
      code: 'archive-synced-recordless-ambiguous',
      message: expect.stringMatching(
        /^archive-synced-recordless-ambiguous: .*multiple persisted archives match/,
      ),
    });
    await expect(apply(fixture, probe, s3)).rejects.toMatchObject({
      code: 'archive-synced-recordless-ambiguous',
      exitCode: 2,
    });
    expect(s3.calls).toEqual([]);
    expect(await treeHash(fixture.archiveRoot)).toBe(before);
  });
});
