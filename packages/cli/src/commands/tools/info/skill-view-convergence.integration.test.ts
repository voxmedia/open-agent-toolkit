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

import { readProjectedSkillVersion } from './skill-views';

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
  frontmatter = `name: ${SKILL}\ndescription: Convergence probe skill\nversion: 1.4.2`,
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-skill-view-'));
  temporaryRoots.push(root);
  await mkdir(join(root, '.git'), { recursive: true });
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(root, '.oat', 'sync'), { recursive: true });
  await mkdir(join(root, '.agents', 'skills', SKILL), { recursive: true });
  await writeFile(
    join(root, '.agents', 'skills', SKILL, 'SKILL.md'),
    `---\n${frontmatter}\n---\n\n# Convergence probe\n`,
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
    // No repair is offered for that state, because running one changes
    // nothing: the class is the engine's banner/sentinel condition, tracked as
    // BL-260908-make-copy-strategy-skill.
    expect(claude?.suggestion).toBeNull();
    expect(claude?.detail).toContain('BL-260908-make-copy-strategy-skill');
    const { stdout } = await runCli(root, home, [
      'tools',
      'info',
      SKILL,
      '--scope',
      'project',
    ]);
    expect(stdout).not.toContain('Repair:');
  });

  it.each([
    [
      'both a top-level version and a differing metadata.version',
      `name: ${SKILL}\ndescription: Convergence probe skill\nversion: 1.0.0\nmetadata:\n  version: 2.0.0`,
      '2.0.0',
    ],
    [
      'metadata.version only',
      `name: ${SKILL}\ndescription: Convergence probe skill\nmetadata:\n  version: 2.0.0`,
      '2.0.0',
    ],
  ])(
    'resolves a projected copy version through the shared resolver with %s',
    async (_label, frontmatter, expected) => {
      const root = await createProjectRoot('copy', frontmatter);
      const home = await mkdtemp(join(tmpdir(), 'oat-skill-view-home-'));
      temporaryRoots.push(home);

      expect(
        (await runCli(root, home, ['sync', '--scope', 'project'])).exitCode,
      ).toBe(0);
      const [diagnosis] = await diagnose(root, home);
      const claude = diagnosis?.views.find(
        ({ provider }) => provider === 'claude',
      );

      // The view and its canonical source must resolve by the same precedence
      // rule. A private top-level-only parse reported this byte-identical copy
      // as stale (`canonical 2.0.0, view 1.0.0`) with a repair that would have
      // rewritten an already-correct file.
      expect(claude?.canonicalVersion).toBe(expected);
      expect(claude?.viewVersion).toBe(expected);
      expect(claude?.suggestion).toBeNull();
      expect(claude?.detail).not.toContain(
        'differs from the canonical version',
      );
      const { stdout } = await runCli(root, home, [
        'tools',
        'info',
        SKILL,
        '--scope',
        'project',
      ]);
      expect(stdout).toContain(
        `versions: canonical ${expected}, view ${expected}`,
      );
      expect(stdout).not.toContain('Repair:');
    },
  );

  it('carries a conflicting projected declaration into the output and withholds the comparison', async () => {
    const conflicting = `name: ${SKILL}\ndescription: Convergence probe skill\nversion: 1.0.0\nmetadata:\n  version: 2.0.0`;
    const root = await createProjectRoot('copy', conflicting);
    const home = await mkdtemp(join(tmpdir(), 'oat-skill-view-home-'));
    temporaryRoots.push(home);

    expect(
      (await runCli(root, home, ['sync', '--scope', 'project'])).exitCode,
    ).toBe(0);
    // Canonical moves on; the projected copy keeps the conflicting pair.
    await writeFile(
      join(root, '.agents', 'skills', SKILL, 'SKILL.md'),
      `---\nname: ${SKILL}\ndescription: Convergence probe skill\nmetadata:\n  version: 3.0.0\n---\n\n# Convergence probe\n`,
      'utf8',
    );

    const [diagnosis] = await diagnose(root, home);
    const claude = diagnosis?.views.find(
      ({ provider }) => provider === 'claude',
    );

    // A reader that flattened the conflict to a plain string would report
    // `canonical 3.0.0, view 2.0.0` here and claim a staleness it cannot
    // establish from a file that contradicts itself.
    expect(claude?.canonicalVersion).toBe('3.0.0');
    expect(claude?.versionEvidence).toBe('conflict');
    expect(claude?.viewVersion).toBeNull();
    expect(claude?.versionComparable).toBe(false);

    const { stdout } = await runCli(root, home, [
      'tools',
      'info',
      SKILL,
      '--scope',
      'project',
    ]);
    expect(stdout).toContain('metadata.version 2.0.0');
    expect(stdout).toContain('top-level version 1.0.0');
    expect(stdout).toContain('version comparison was skipped');
    expect(stdout).not.toContain('versions: canonical');
  });

  it('keeps view and canonical parity when an ignored sibling declaration is unusable', async () => {
    // `version: 1.10` parses as a number, so the shared resolver cannot use it
    // and takes `metadata.version` — on both sides. Downgrading the whole
    // reading to "unusable" here would drop the view's version while canonical
    // kept one, re-opening the false-mismatch this round exists to close.
    const root = await createProjectRoot(
      'copy',
      `name: ${SKILL}\ndescription: Convergence probe skill\nversion: 1.10\nmetadata:\n  version: 2.0.0`,
    );
    const home = await mkdtemp(join(tmpdir(), 'oat-skill-view-home-'));
    temporaryRoots.push(home);

    expect(
      (await runCli(root, home, ['sync', '--scope', 'project'])).exitCode,
    ).toBe(0);
    const [diagnosis] = await diagnose(root, home);
    const claude = diagnosis?.views.find(
      ({ provider }) => provider === 'claude',
    );

    expect(claude?.canonicalVersion).toBe('2.0.0');
    expect(claude?.viewVersion).toBe('2.0.0');
    expect(claude?.versionEvidence).toBe('resolved');
    expect(claude?.suggestion).toBeNull();
  });

  describe('readProjectedSkillVersion', () => {
    async function writeView(body: string, banner = true): Promise<string> {
      const dir = await mkdtemp(join(tmpdir(), 'oat-projected-view-'));
      temporaryRoots.push(dir);
      const marker = banner
        ? '<!-- OAT-managed: do not edit directly. Source: .agents/skills/x -->\n'
        : '';
      await writeFile(join(dir, 'SKILL.md'), `${marker}${body}`, 'utf8');
      return dir;
    }

    it('resolves through the shared resolver and reports the resolver state', async () => {
      const conflict = await writeView(
        '---\nname: x\nversion: 1.0.0\nmetadata:\n  version: 2.0.0\n---\n',
      );
      const metadataOnly = await writeView(
        '---\nname: x\nmetadata:\n  version: 2.0.0\n---\n',
      );
      const unusableSibling = await writeView(
        '---\nname: x\nversion: 1.10\nmetadata:\n  version: 2.0.0\n---\n',
      );
      const unusableOnly = await writeView(
        '---\nname: x\nversion: 1.10\n---\n',
      );
      const malformed = await writeView('---\nname: x\n  bad: [\n---\n');
      const unbannered = await writeView(
        '---\nname: x\nversion: 1.0.0\nmetadata:\n  version: 2.0.0\n---\n',
        false,
      );

      await expect(readProjectedSkillVersion(conflict)).resolves.toEqual({
        version: '2.0.0',
        state: 'conflict',
        conflict: { metadata: '2.0.0', topLevel: '1.0.0' },
      });
      await expect(readProjectedSkillVersion(metadataOnly)).resolves.toEqual({
        version: '2.0.0',
        state: 'resolved',
      });
      // Resolved wins over an ignored unusable sibling: canonical resolution
      // reports the same value, and parity is the whole point.
      await expect(readProjectedSkillVersion(unusableSibling)).resolves.toEqual(
        { version: '2.0.0', state: 'resolved' },
      );
      await expect(readProjectedSkillVersion(unusableOnly)).resolves.toEqual({
        version: null,
        state: 'unusable',
      });
      await expect(readProjectedSkillVersion(malformed)).resolves.toEqual({
        version: null,
        state: 'malformed',
      });
      // The banner is the only difference from a canonical read, so a view
      // without one resolves identically.
      await expect(
        readProjectedSkillVersion(unbannered),
      ).resolves.toMatchObject({ version: '2.0.0', state: 'conflict' });
      // A read failure yields no version rather than a guess.
      await expect(
        readProjectedSkillVersion(join(tmpdir(), 'oat-absent-view-dir')),
      ).resolves.toEqual({ version: null, state: 'absent' });
    });
  });

  it.each([
    ['invalid JSON', 'not json {{{'],
    [
      'a schema-invalid manifest',
      '{"version":2,"oatVersion":"x","entries":[{"canonicalPath":".agents/skills/x"}],"collections":[],"lastUpdated":"2026-01-01T00:00:00.000Z"}',
    ],
  ])(
    'keeps the tool detail and exit code when the manifest holds %s',
    async (_label, contents) => {
      const root = await createProjectRoot();
      const home = await mkdtemp(join(tmpdir(), 'oat-skill-view-home-'));
      temporaryRoots.push(home);
      await mkdir(join(home, '.oat', 'sync'), { recursive: true });
      await mkdir(join(home, '.agents', 'skills', SKILL), { recursive: true });
      await writeFile(
        join(home, '.agents', 'skills', SKILL, 'SKILL.md'),
        `---\nname: ${SKILL}\ndescription: Convergence probe skill\nversion: 1.4.2\n---\n`,
        'utf8',
      );

      for (const [scope, manifestPath] of [
        ['project', join(root, '.oat', 'sync', 'manifest.json')],
        ['user', join(home, '.oat', 'sync', 'manifest.json')],
      ] as const) {
        await rm(join(root, '.oat', 'sync', 'manifest.json'), { force: true });
        await rm(join(home, '.oat', 'sync', 'manifest.json'), { force: true });
        await writeFile(manifestPath, contents, 'utf8');

        const { exitCode, stdout } = await runCli(root, home, [
          'tools',
          'info',
          SKILL,
          '--scope',
          'all',
        ]);

        // Before this guard the whole command aborted on the manifest error,
        // taking the tool detail with it — for a user-scope manifest, in every
        // project on the machine.
        expect(exitCode).toBe(0);
        expect(stdout).toContain('Type:        skill');
        expect(stdout).toContain('Version:     1.4.2');
        expect(stdout).toContain(`Provider views (${scope}): unavailable`);
        expect(stdout).not.toContain(scope === 'project' ? root : home);
      }
    },
  );
});
