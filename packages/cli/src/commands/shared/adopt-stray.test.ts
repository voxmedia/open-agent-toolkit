import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { computeContentHash } from '@manifest/hash';
import { createEmptyManifest } from '@manifest/manager';
import { COPILOT_PROJECT_MAPPINGS } from '@providers/copilot/paths';
import { CURSOR_PROJECT_MAPPINGS } from '@providers/cursor/paths';
import { parseCursorRuleToCanonical } from '@providers/cursor/rule-transform';
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

  it('adopts cursor rule strays into canonical markdown and tracks the provider copy', async () => {
    const scopeRoot = await mkdtemp(join(tmpdir(), 'oat-adopt-stray-'));
    tempDirs.push(scopeRoot);
    await mkdir(join(scopeRoot, '.cursor', 'rules'), { recursive: true });

    const providerContent = `---
description: React components
alwaysApply: false
globs:
  - src/components/**/*.tsx
---

# React Components

Prefer composition over inheritance.

<!-- OAT-managed: do not edit directly. Source: .agents/rules/react-components.md -->
`;

    await writeFile(
      join(scopeRoot, '.cursor', 'rules', 'react-components.mdc'),
      providerContent,
      'utf8',
    );

    const mapping = CURSOR_PROJECT_MAPPINGS.find(
      (entry) => entry.contentType === 'rule',
    );
    expect(mapping).toBeDefined();

    const nextManifest = await adoptStrayToCanonical(
      scopeRoot,
      {
        provider: 'cursor',
        report: {
          providerPath: '.cursor/rules/react-components.mdc',
        },
        mapping: mapping!,
      },
      createEmptyManifest(),
    );

    const canonicalPath = join(
      scopeRoot,
      '.agents',
      'rules',
      'react-components.md',
    );
    const providerPath = join(
      scopeRoot,
      '.cursor',
      'rules',
      'react-components.mdc',
    );

    expect(await readFile(canonicalPath, 'utf8')).toBe(
      parseCursorRuleToCanonical(providerContent),
    );
    expect(await readFile(providerPath, 'utf8')).toContain(
      'alwaysApply: false',
    );
    expect(nextManifest.entries).toMatchObject([
      {
        canonicalPath: '.agents/rules/react-components.md',
        providerPath: '.cursor/rules/react-components.mdc',
        provider: 'cursor',
        contentType: 'rule',
        strategy: 'copy',
        isFile: true,
      },
    ]);
    expect(nextManifest.entries[0]?.contentHash).toBe(
      await computeContentHash(providerPath, true),
    );
  });

  it('adopts copilot rule strays using the shared canonical filename mapping', async () => {
    const scopeRoot = await mkdtemp(join(tmpdir(), 'oat-adopt-stray-'));
    tempDirs.push(scopeRoot);
    await mkdir(join(scopeRoot, '.github', 'instructions'), {
      recursive: true,
    });

    await writeFile(
      join(scopeRoot, '.github', 'instructions', 'frontend.instructions.md'),
      `---
description: Frontend rule
applyTo: src/**/*.tsx
---

# Frontend

Keep components focused.
`,
      'utf8',
    );

    const mapping = COPILOT_PROJECT_MAPPINGS.find(
      (entry) => entry.contentType === 'rule',
    );
    expect(mapping).toBeDefined();

    await adoptStrayToCanonical(
      scopeRoot,
      {
        provider: 'copilot',
        report: {
          providerPath: '.github/instructions/frontend.instructions.md',
        },
        mapping: mapping!,
      },
      createEmptyManifest(),
    );

    const canonical = await readFile(
      join(scopeRoot, '.agents', 'rules', 'frontend.md'),
      'utf8',
    );
    expect(canonical).toContain('description: Frontend rule');
    expect(canonical).toContain('activation: glob');
  });
});
