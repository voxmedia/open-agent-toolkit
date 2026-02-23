import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEmptyManifest } from '@manifest/manager';
import { afterEach, describe, expect, it } from 'vitest';
import { adoptStrayToCanonical } from './adopt-stray';

describe('adoptStrayToCanonical', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('adopts codex role stray into canonical markdown', async () => {
    const scopeRoot = await mkdtemp(join(tmpdir(), 'oat-adopt-stray-'));
    tempDirs.push(scopeRoot);
    await mkdir(join(scopeRoot, '.codex', 'agents'), { recursive: true });

    await writeFile(
      join(scopeRoot, '.codex', 'agents', 'oat-reviewer.toml'),
      'developer_instructions = "## Role\\nReview"\nsandbox_mode = "read-only"',
      'utf8',
    );

    const nextManifest = await adoptStrayToCanonical(
      scopeRoot,
      {
        provider: 'codex',
        report: {
          providerPath: '.codex/agents/oat-reviewer.toml',
        },
        mapping: {
          contentType: 'agent',
          canonicalDir: '.agents/agents',
          providerDir: '.codex/agents',
          nativeRead: false,
        },
        adoption: {
          kind: 'codex_role',
          roleName: 'oat-reviewer',
          description: 'Reviewer',
        },
      },
      createEmptyManifest(),
    );

    const canonical = await readFile(
      join(scopeRoot, '.agents', 'agents', 'oat-reviewer.md'),
      'utf8',
    );

    expect(canonical).toContain('name: oat-reviewer');
    expect(canonical).toContain('description: Reviewer');
    expect(canonical).toContain('readonly: true');
    expect(nextManifest.entries).toHaveLength(0);
  });

  it('replaces canonical codex markdown when replace option is enabled', async () => {
    const scopeRoot = await mkdtemp(join(tmpdir(), 'oat-adopt-stray-'));
    tempDirs.push(scopeRoot);
    await mkdir(join(scopeRoot, '.agents', 'agents'), { recursive: true });
    await mkdir(join(scopeRoot, '.codex', 'agents'), { recursive: true });

    await writeFile(
      join(scopeRoot, '.agents', 'agents', 'oat-reviewer.md'),
      `---\nname: oat-reviewer\ndescription: Existing\n---\n\nOld body`,
      'utf8',
    );
    await writeFile(
      join(scopeRoot, '.codex', 'agents', 'oat-reviewer.toml'),
      'developer_instructions = "New body"',
      'utf8',
    );

    await adoptStrayToCanonical(
      scopeRoot,
      {
        provider: 'codex',
        report: {
          providerPath: '.codex/agents/oat-reviewer.toml',
        },
        mapping: {
          contentType: 'agent',
          canonicalDir: '.agents/agents',
          providerDir: '.codex/agents',
          nativeRead: false,
        },
        adoption: {
          kind: 'codex_role',
          roleName: 'oat-reviewer',
        },
      },
      createEmptyManifest(),
      { replaceCanonical: true },
    );

    const canonical = await readFile(
      join(scopeRoot, '.agents', 'agents', 'oat-reviewer.md'),
      'utf8',
    );

    expect(canonical).toContain('New body');
  });
});
