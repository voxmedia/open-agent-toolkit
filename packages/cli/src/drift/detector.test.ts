import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { OAT_DIRECTORY_SENTINEL, OAT_MARKER_PREFIX } from '@engine/markers';
import { computeDirectoryHash, computeFileHash } from '@manifest/hash';
import type { ManifestEntry, ManifestEntryV2 } from '@manifest/manifest.types';
import { afterEach, describe, expect, it } from 'vitest';

import type { CopyTransform } from './detector';
import { detectDrift } from './detector';

function createManifestEntry(
  overrides: Partial<ManifestEntry> = {},
): ManifestEntry {
  return {
    canonicalPath: '.agents/skills/skill-one',
    providerPath: '.claude/skills/skill-one',
    provider: 'claude',
    contentType: 'skill',
    strategy: 'symlink',
    contentHash: null,
    lastSynced: new Date().toISOString(),
    ...overrides,
  };
}

async function seedSkill(root: string, relativePath: string): Promise<void> {
  const skillDir = join(root, relativePath);
  await mkdir(skillDir, { recursive: true });
  await writeFile(join(skillDir, 'SKILL.md'), '# skill\n', 'utf8');
}

/**
 * Seeds the canonical skill plus the managed provider copy the sync writer
 * produces: canonical bytes, the `.oat-generated` sentinel, and the banner
 * prepended to `SKILL.md`, both naming the same absolute canonical path.
 * `canonicalHash` is the undecorated canonical directory hash — exactly what
 * `execute-plan.ts` records as the manifest `contentHash`.
 */
async function seedManagedCopy(root: string): Promise<{
  canonicalHash: string;
  canonicalPath: string;
  providerPath: string;
}> {
  const canonicalPath = join(root, '.agents', 'skills', 'skill-one');
  const providerPath = join(root, '.claude', 'skills', 'skill-one');
  await seedSkill(root, '.agents/skills/skill-one');
  const canonicalHash = await computeDirectoryHash(canonicalPath);
  await mkdir(providerPath, { recursive: true });
  const marker = `${OAT_MARKER_PREFIX} Source: ${canonicalPath} -->`;
  await writeFile(
    join(providerPath, 'SKILL.md'),
    `${marker}\n# skill\n`,
    'utf8',
  );
  await writeFile(
    join(providerPath, OAT_DIRECTORY_SENTINEL),
    `${marker}\n`,
    'utf8',
  );
  return { canonicalHash, canonicalPath, providerPath };
}

describe('detectDrift', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('returns missing when provider path absent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await seedSkill(root, '.agents/skills/skill-one');

    const report = await detectDrift(createManifestEntry(), root);

    expect(report.state).toEqual({ status: 'missing' });
  });

  it('returns in_sync when symlink target matches', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await seedSkill(root, '.agents/skills/skill-one');
    await mkdir(join(root, '.claude', 'skills'), { recursive: true });
    await symlink(
      join(root, '.agents', 'skills', 'skill-one'),
      join(root, '.claude', 'skills', 'skill-one'),
      'dir',
    );

    const report = await detectDrift(createManifestEntry(), root);

    expect(report.state).toEqual({ status: 'in_sync' });
  });

  it('reports inherited collection entries in sync from exact alias identity', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await seedSkill(root, '.agents/skills/skill-one');
    await mkdir(join(root, '.claude'), { recursive: true });
    await symlink(
      join('..', '.agents', 'skills'),
      join(root, '.claude', 'skills'),
      'dir',
    );
    const entry: ManifestEntryV2 = {
      ...createManifestEntry(),
      strategy: 'collection',
      collectionId: 'claude-skills',
    };

    const report = await detectDrift(entry, root);

    expect(report.state).toEqual({ status: 'in_sync' });
  });

  it('reports a changed owned collection alias as replaced without mutating it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await seedSkill(root, '.agents/skills/skill-one');
    await mkdir(join(root, '.claude'), { recursive: true });
    await mkdir(join(root, 'foreign'), { recursive: true });
    await symlink(
      join(root, 'foreign'),
      join(root, '.claude', 'skills'),
      'dir',
    );
    const entry: ManifestEntryV2 = {
      ...createManifestEntry(),
      strategy: 'collection',
      collectionId: 'claude-skills',
    };

    const report = await detectDrift(entry, root);

    expect(report.state).toEqual({ status: 'drifted', reason: 'replaced' });
  });

  it('returns drifted:broken when symlink target does not exist', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await mkdir(join(root, '.claude', 'skills'), { recursive: true });
    await symlink(
      join(root, '.agents', 'skills', 'missing-skill'),
      join(root, '.claude', 'skills', 'skill-one'),
      'dir',
    );

    const report = await detectDrift(createManifestEntry(), root);

    expect(report.state).toEqual({
      status: 'drifted',
      reason: 'broken',
    });
  });

  it('returns drifted:replaced when provider path is not a symlink', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await seedSkill(root, '.agents/skills/skill-one');
    await mkdir(join(root, '.claude', 'skills', 'skill-one'), {
      recursive: true,
    });

    const report = await detectDrift(createManifestEntry(), root);

    expect(report.state).toEqual({
      status: 'drifted',
      reason: 'replaced',
    });
  });

  it('returns drifted:replaced when symlink target differs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await seedSkill(root, '.agents/skills/skill-one');
    await seedSkill(root, '.agents/skills/other-skill');
    await mkdir(join(root, '.claude', 'skills'), { recursive: true });
    await symlink(
      join(root, '.agents', 'skills', 'other-skill'),
      join(root, '.claude', 'skills', 'skill-one'),
      'dir',
    );

    const report = await detectDrift(createManifestEntry(), root);

    expect(report.state).toEqual({
      status: 'drifted',
      reason: 'replaced',
    });
  });

  it('returns in_sync when copy hash matches', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await seedSkill(root, '.agents/skills/skill-one');
    await seedSkill(root, '.claude/skills/skill-one');
    const providerHash = await computeDirectoryHash(
      join(root, '.claude', 'skills', 'skill-one'),
    );
    const copyEntry = createManifestEntry({
      strategy: 'copy',
      contentHash: providerHash,
    });

    const report = await detectDrift(copyEntry, root);

    expect(report.state).toEqual({ status: 'in_sync' });
  });

  it('returns drifted:modified when copy hash differs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await seedSkill(root, '.agents/skills/skill-one');
    await seedSkill(root, '.claude/skills/skill-one');
    const copyEntry = createManifestEntry({
      strategy: 'copy',
      contentHash: 'deadbeef',
    });

    const report = await detectDrift(copyEntry, root);

    expect(report.state).toEqual({
      status: 'drifted',
      reason: 'modified',
    });
  });

  it('returns in_sync for a managed directory copy whose manifest hash is the canonical hash', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    const { canonicalHash } = await seedManagedCopy(root);
    const copyEntry = createManifestEntry({
      strategy: 'copy',
      contentHash: canonicalHash,
      isFile: false,
    });

    // No `copyTransform` argument on purpose: `commands/tools/info/index.ts`
    // passes none, so this also covers the `oat tools info` call site.
    const report = await detectDrift(copyEntry, root);

    expect(report.state).toEqual({ status: 'in_sync' });
  });

  it('returns drifted:modified when a managed directory copy body was edited', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    const { canonicalHash, canonicalPath, providerPath } =
      await seedManagedCopy(root);
    await writeFile(
      join(providerPath, 'SKILL.md'),
      `${OAT_MARKER_PREFIX} Source: ${canonicalPath} -->\n# skill edited by hand\n`,
      'utf8',
    );
    const copyEntry = createManifestEntry({
      strategy: 'copy',
      contentHash: canonicalHash,
      isFile: false,
    });

    const report = await detectDrift(copyEntry, root);

    expect(report.state).toEqual({
      status: 'drifted',
      reason: 'modified',
    });
  });

  it('returns drifted:modified when the sentinel names a different canonical path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    const { canonicalHash, providerPath } = await seedManagedCopy(root);
    // A hand-forged sentinel must not buy an in_sync verdict, even over
    // otherwise faithful content.
    await writeFile(
      join(providerPath, OAT_DIRECTORY_SENTINEL),
      `${OAT_MARKER_PREFIX} Source: ${join(root, '.agents', 'skills', 'other-skill')} -->\n`,
      'utf8',
    );
    const copyEntry = createManifestEntry({
      strategy: 'copy',
      contentHash: canonicalHash,
      isFile: false,
    });

    const report = await detectDrift(copyEntry, root);

    expect(report.state).toEqual({
      status: 'drifted',
      reason: 'modified',
    });
  });

  it('returns drifted:modified when the sentinel is a symlink to a file holding the exact marker', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    const { canonicalHash, canonicalPath, providerPath } =
      await seedManagedCopy(root);
    const side = join(root, 'side-sentinel');
    await writeFile(
      side,
      `${OAT_MARKER_PREFIX} Source: ${canonicalPath} -->\n`,
      'utf8',
    );
    await rm(join(providerPath, OAT_DIRECTORY_SENTINEL));
    await symlink(side, join(providerPath, OAT_DIRECTORY_SENTINEL));
    const copyEntry = createManifestEntry({
      strategy: 'copy',
      contentHash: canonicalHash,
      isFile: false,
    });

    const report = await detectDrift(copyEntry, root);

    expect(report.state).toEqual({
      status: 'drifted',
      reason: 'modified',
    });
  });

  it('returns drifted:modified when the provider root is a symlink to a faithful decorated tree', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    const canonicalPath = join(root, '.agents', 'skills', 'skill-one');
    await seedSkill(root, '.agents/skills/skill-one');
    const canonicalHash = await computeDirectoryHash(canonicalPath);
    // A faithful decorated tree parked outside the provider dir, reachable
    // only through a symlink at the tracked provider path.
    const real = join(root, 'real-copy');
    await mkdir(real, { recursive: true });
    const marker = `${OAT_MARKER_PREFIX} Source: ${canonicalPath} -->`;
    await writeFile(join(real, 'SKILL.md'), `${marker}\n# skill\n`, 'utf8');
    await writeFile(join(real, OAT_DIRECTORY_SENTINEL), `${marker}\n`, 'utf8');
    await mkdir(join(root, '.claude', 'skills'), { recursive: true });
    await symlink(real, join(root, '.claude', 'skills', 'skill-one'));
    const copyEntry = createManifestEntry({
      strategy: 'copy',
      contentHash: canonicalHash,
      isFile: false,
    });

    const report = await detectDrift(copyEntry, root);

    expect(report.state).toEqual({
      status: 'drifted',
      reason: 'modified',
    });
  });

  it('returns in_sync when transformed rule file hash matches', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'rules'), { recursive: true });
    await mkdir(join(root, '.cursor', 'rules'), { recursive: true });
    await writeFile(
      join(root, '.agents', 'rules', 'react-components.md'),
      '# canonical source\n',
      'utf8',
    );
    await writeFile(
      join(root, '.cursor', 'rules', 'react-components.mdc'),
      '# rendered rule\n',
      'utf8',
    );

    const providerPath = join(root, '.cursor', 'rules', 'react-components.mdc');
    const report = await detectDrift(
      createManifestEntry({
        canonicalPath: '.agents/rules/react-components.md',
        providerPath: '.cursor/rules/react-components.mdc',
        provider: 'cursor',
        contentType: 'rule',
        strategy: 'copy',
        contentHash: await computeFileHash(providerPath),
        isFile: true,
      }),
      root,
    );

    expect(report.state).toEqual({ status: 'in_sync' });
  });

  it('returns in_sync via transform fallback when manifest hash is stale', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'rules'), { recursive: true });
    await mkdir(join(root, '.claude', 'rules'), { recursive: true });

    // Canonical has frontmatter that gets stripped by the transform
    await writeFile(
      join(root, '.agents', 'rules', 'observability.md'),
      '---\ndescription: obs rules\nactivation: always\n---\n\n# Obs\n',
      'utf8',
    );
    // Provider has the rendered (transformed) content
    const renderedContent =
      '# Obs\n\n<!-- OAT-managed: Source: .agents/rules/observability.md -->\n';
    await writeFile(
      join(root, '.claude', 'rules', 'observability.md'),
      renderedContent,
      'utf8',
    );

    const transform: CopyTransform = {
      transformCanonical: (content: string, _path: string) => {
        // Simulate stripping frontmatter + appending marker
        const body = content.replace(/^---\n[\s\S]*?\n---\n\n?/, '');
        return `${body.trimEnd()}\n\n<!-- OAT-managed: Source: .agents/rules/observability.md -->\n`;
      },
    };

    const report = await detectDrift(
      createManifestEntry({
        canonicalPath: '.agents/rules/observability.md',
        providerPath: '.claude/rules/observability.md',
        provider: 'claude',
        contentType: 'rule',
        strategy: 'copy',
        // Stale hash — simulates hash computed from a previous version
        contentHash: 'stale-hash-from-previous-sync',
        isFile: true,
      }),
      root,
      transform,
    );

    expect(report.state).toEqual({ status: 'in_sync' });
  });

  it('returns drifted when provider was manually edited even with transform', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'rules'), { recursive: true });
    await mkdir(join(root, '.claude', 'rules'), { recursive: true });

    await writeFile(
      join(root, '.agents', 'rules', 'observability.md'),
      '---\ndescription: obs rules\nactivation: always\n---\n\n# Obs\n',
      'utf8',
    );
    // Provider was manually edited — content differs from transform output
    await writeFile(
      join(root, '.claude', 'rules', 'observability.md'),
      '# MANUALLY EDITED\n',
      'utf8',
    );

    const transform: CopyTransform = {
      transformCanonical: (content: string, _path: string) => {
        const body = content.replace(/^---\n[\s\S]*?\n---\n\n?/, '');
        return `${body.trimEnd()}\n\n<!-- OAT-managed: Source: .agents/rules/observability.md -->\n`;
      },
    };

    const report = await detectDrift(
      createManifestEntry({
        canonicalPath: '.agents/rules/observability.md',
        providerPath: '.claude/rules/observability.md',
        provider: 'claude',
        contentType: 'rule',
        strategy: 'copy',
        contentHash: 'stale-hash',
        isFile: true,
      }),
      root,
      transform,
    );

    expect(report.state).toEqual({ status: 'drifted', reason: 'modified' });
  });

  it('skips transform fallback when no copyTransform provided', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-drift-detector-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'rules'), { recursive: true });
    await mkdir(join(root, '.claude', 'rules'), { recursive: true });

    await writeFile(
      join(root, '.agents', 'rules', 'test-rule.md'),
      '---\nactivation: always\n---\n\n# Rule\n',
      'utf8',
    );
    await writeFile(
      join(root, '.claude', 'rules', 'test-rule.md'),
      '# Rule\n',
      'utf8',
    );

    const report = await detectDrift(
      createManifestEntry({
        canonicalPath: '.agents/rules/test-rule.md',
        providerPath: '.claude/rules/test-rule.md',
        provider: 'claude',
        contentType: 'rule',
        strategy: 'copy',
        contentHash: 'wrong-hash',
        isFile: true,
      }),
      root,
    );

    expect(report.state).toEqual({ status: 'drifted', reason: 'modified' });
  });
});
