import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { computeDirectoryHash, computeFileHash } from '@manifest/hash';
import type { ManifestEntry } from '@manifest/manifest.types';
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
