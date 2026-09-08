import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createProgram } from '@app/create-program';
import { registerCommands } from '@commands/index';
import type { SkillViewDiagnosis } from '@drift/index';
import { afterEach, describe, expect, it } from 'vitest';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.map((root) => rm(root, { recursive: true, force: true })),
  );
  temporaryRoots.length = 0;
});

const SKILL = 'convergence-probe';

/**
 * A project root with a canonical skill and a detectable Claude directory, but
 * no manifest and no provider view: the exact state `oat tools info` could not
 * describe before this diagnostic existed.
 *
 * The strategy is pinned to `symlink` (the adapter default) rather than left to
 * config resolution. A copy-strategy skill *directory* is reported as drifted
 * by `oat status` immediately after a successful sync on this base, because the
 * engine's directory copy adds an OAT-managed banner and an `.oat-generated`
 * marker that the manifest hash does not account for; that pre-existing
 * behavior belongs to the sync engine, not to this read-only diagnostic.
 */
async function createProjectRoot(
  strategy: 'symlink' | 'copy' = 'symlink',
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-skill-view-'));
  temporaryRoots.push(root);
  await mkdir(join(root, '.git'), { recursive: true });
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(root, '.oat', 'sync'), { recursive: true });
  await mkdir(join(root, '.agents', 'skills', SKILL), { recursive: true });
  await writeFile(
    join(root, '.agents', 'skills', SKILL, 'SKILL.md'),
    `---\nname: ${SKILL}\ndescription: Convergence probe skill\nversion: 1.4.2\n---\n\n# Convergence probe\n`,
    'utf8',
  );
  await writeFile(
    join(root, '.oat', 'sync', 'config.json'),
    `${JSON.stringify(
      {
        version: 1,
        defaultStrategy: strategy,
        providers: { claude: { enabled: true } },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  return root;
}

async function runCli(
  root: string,
  home: string,
  args: string[],
): Promise<{ exitCode: number; stdout: string }> {
  const program = createProgram();
  registerCommands(program);
  const chunks: string[] = [];
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  const previousExitCode = process.exitCode;
  const previousHome = process.env.HOME;
  try {
    process.exitCode = undefined;
    process.env.HOME = home;
    (process.stdout.write as unknown as (chunk: unknown) => boolean) = (
      chunk,
    ) => {
      chunks.push(String(chunk));
      return true;
    };
    (process.stderr.write as unknown as (chunk: unknown) => boolean) = () =>
      true;
    await program.parseAsync(['--cwd', root, ...args], { from: 'user' });
    return { exitCode: process.exitCode ?? 0, stdout: chunks.join('') };
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    if (previousHome === undefined) delete process.env.HOME;
    else process.env.HOME = previousHome;
    process.exitCode = previousExitCode;
  }
}

async function diagnose(
  root: string,
  home: string,
): Promise<SkillViewDiagnosis[]> {
  const { stdout } = await runCli(root, home, [
    'tools',
    'info',
    SKILL,
    '--scope',
    'project',
    '--json',
  ]);
  const payload = JSON.parse(stdout) as { providerViews: SkillViewDiagnosis[] };
  return payload.providerViews;
}

/**
 * Content-level mutation tripwire: path, node type, and either the file's
 * content hash or the symlink's target. A name-only listing would miss an
 * in-place rewrite of a file that already exists.
 */
async function snapshotTree(root: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(join(root, prefix), { withFileTypes: true });
  const rows: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = join(prefix, entry.name);
    const absolute = join(root, relative);
    if (entry.isSymbolicLink()) {
      rows.push(`${relative}\tlink\t${await readlink(absolute)}`);
      continue;
    }
    if (entry.isDirectory()) {
      rows.push(`${relative}\tdir`);
      rows.push(...(await snapshotTree(root, relative)));
      continue;
    }
    const digest = createHash('sha256')
      .update(await readFile(absolute))
      .digest('hex');
    rows.push(`${relative}\tfile\t${digest}`);
  }
  return rows;
}

describe('oat tools info provider-view convergence', () => {
  it('diagnoses a never-synced skill, mutates nothing, and converges after a scoped sync', async () => {
    const root = await createProjectRoot();
    const home = await mkdtemp(join(tmpdir(), 'oat-skill-view-home-'));
    temporaryRoots.push(home);

    const before = await snapshotTree(root);
    const homeBefore = await snapshotTree(home);
    const initial = await diagnose(root, home);
    const afterDiagnosis = await snapshotTree(root);

    const claudeBefore = initial[0]?.views.find(
      ({ provider }) => provider === 'claude',
    );
    expect(initial[0]?.scope).toBe('project');
    expect(claudeBefore).toMatchObject({
      viewClass: 'missing-additive',
      providerPath: join('.claude', 'skills', SKILL),
      tracked: false,
      canonicalVersion: '1.4.2',
      suggestion: 'oat sync --scope project',
    });

    // Read-only: no file created, rewritten, or relinked, in either root.
    expect(afterDiagnosis).toEqual(before);
    expect(await snapshotTree(home)).toEqual(homeBefore);
    expect(afterDiagnosis.join('\n')).not.toContain(join('.claude', 'skills'));
    expect(afterDiagnosis.join('\n')).not.toContain('manifest.json');

    const sync = await runCli(root, home, ['sync', '--scope', 'project']);
    expect(sync.exitCode).toBe(0);
    await expect(
      stat(join(root, '.claude', 'skills', SKILL, 'SKILL.md')),
    ).resolves.toBeDefined();

    const syncedTree = await snapshotTree(root);
    const syncedHome = await snapshotTree(home);
    const converged = await diagnose(root, home);
    // The second diagnosis runs with a manifest and a real view present: the
    // path where a write would be easiest to introduce.
    expect(await snapshotTree(root)).toEqual(syncedTree);
    expect(await snapshotTree(home)).toEqual(syncedHome);
    const claudeAfter = converged[0]?.views.find(
      ({ provider }) => provider === 'claude',
    );
    expect(claudeAfter).toMatchObject({
      viewClass: 'in-sync',
      driftState: { status: 'in_sync' },
      tracked: true,
      strategy: 'symlink',
      // A symlinked view *is* the canonical file, so there is no second
      // version to compare and the diagnostic says so rather than inventing
      // one.
      versionComparable: false,
      viewVersion: null,
      canonicalVersion: '1.4.2',
      suggestion: null,
    });
    expect(claudeAfter?.detail).toContain('symlink to the canonical file');
    // Convergence on versions, read through the provider path itself.
    expect(
      await readFile(
        join(root, '.claude', 'skills', SKILL, 'SKILL.md'),
        'utf8',
      ),
    ).toContain('version: 1.4.2');
    expect(
      await readFile(join(root, '.oat', 'sync', 'manifest.json'), 'utf8'),
    ).toContain(join('.claude', 'skills', SKILL));
  });

  it('reads a projected copy view version past the OAT-managed banner', async () => {
    const root = await createProjectRoot('copy');
    const home = await mkdtemp(join(tmpdir(), 'oat-skill-view-home-'));
    temporaryRoots.push(home);

    expect(
      (await runCli(root, home, ['sync', '--scope', 'project'])).exitCode,
    ).toBe(0);
    // The engine prepends a provenance banner to the copied SKILL.md, which
    // puts the frontmatter past byte zero.
    expect(
      await readFile(
        join(root, '.claude', 'skills', SKILL, 'SKILL.md'),
        'utf8',
      ),
    ).toMatch(/^<!-- OAT-managed/);

    const [diagnosis] = await diagnose(root, home);
    const claude = diagnosis?.views.find(
      ({ provider }) => provider === 'claude',
    );

    expect(claude).toMatchObject({
      strategy: 'copy',
      tracked: true,
      versionComparable: true,
      canonicalVersion: '1.4.2',
      viewVersion: '1.4.2',
    });
    // Pre-existing engine behavior, faithfully reported rather than hidden:
    // the banner and `.oat-generated` sentinel are not accounted for in the
    // manifest hash, so `oat status` and the detector already call a freshly
    // synced copy directory drifted. The versions above are what tell the
    // user the content itself is current.
    expect(claude?.viewClass).toBe('modified');
    expect(claude?.driftState).toEqual({
      status: 'drifted',
      reason: 'modified',
    });
  });
});
