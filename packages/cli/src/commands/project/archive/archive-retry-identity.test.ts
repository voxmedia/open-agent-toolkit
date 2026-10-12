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
import { join, relative } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ARCHIVE_SNAPSHOT_METADATA_FILENAME,
  archiveProjectOnCompletion,
  computeArchiveManifestHash,
  type ExecFileLike,
} from './archive-utils';

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

function archiveOptions(
  fixture: Fixture,
  overrides: { summaryExportPath?: string; projectPath?: string } = {},
) {
  return {
    repoRoot: fixture.repoRoot,
    projectPath: overrides.projectPath ?? fixture.projectPath,
    projectName: PROJECT,
    projectsRoot: '.oat/projects/shared',
    s3Uri: S3_URI,
    s3SyncOnComplete: true,
    summaryExportPath: overrides.summaryExportPath ?? SUMMARY_EXPORT,
  };
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
      `Project \`demo\` (shared) was already archived as \`20260901-demo\` at \`${first.archivePath}\`, and its retained artifacts differ from that snapshot; refusing to overwrite the archive or create a second copy before any export, copy or S3 mutation. Record reopened work in a follow-up project (for example \`oat project new demo-followup\`) and archive that project instead.`,
    );
    expect(retryS3.calls).toEqual([]);
    expect(retryS3.ensureS3ArchiveAccess).not.toHaveBeenCalled();
    expect(await treeHash(fixture.archiveRoot)).toBe(archiveBefore);
    expect(await treeHash(join(fixture.repoRoot, SUMMARY_EXPORT))).toBe(
      exportBefore,
    );
    expect(await treeHash(fixture.projectPath)).toBe(sourceBefore);
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

    const localS3 = stubS3();
    const localArchive = await archiveProjectOnCompletion(
      archiveOptions(shared, { projectPath: localPath }),
      { ...localS3, timestamp: () => '2026-09-01T10:00:00Z' },
    );

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
    snapshotId: string;
    archivePath: string;
    summaryExportFile: string | null;
    s3Path: string | null;
  };

  function runArchive(
    fixture: Awaited<ReturnType<typeof cliFixture>>,
    dryRun: boolean,
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
});
