import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CanonicalEntry } from '@engine/index';
import { afterEach, describe, expect, it } from 'vitest';

import {
  applyCodexProjectExtensionPlan,
  computeCodexProjectExtensionPlan,
} from './sync-extension';

function canonicalAgentFileContent(name: string): string {
  return `---\nname: ${name}\ndescription: ${name} description\n---\n\n## Role\n${name}`;
}

describe('codex sync extension', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('plans and applies codex role/config creation and then becomes idempotent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);

    const canonicalDir = join(root, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalFile = join(canonicalDir, 'oat-reviewer.md');
    await writeFile(canonicalFile, canonicalAgentFileContent('oat-reviewer'));

    const canonicalEntries: CanonicalEntry[] = [
      {
        name: 'oat-reviewer.md',
        type: 'agent',
        canonicalPath: canonicalFile,
        isFile: true,
      },
    ];

    const firstPlan = await computeCodexProjectExtensionPlan(
      root,
      canonicalEntries,
    );
    expect(firstPlan.operations.some((op) => op.action === 'create')).toBe(
      true,
    );

    const applyResult = await applyCodexProjectExtensionPlan(root, firstPlan);
    expect(applyResult.failed).toBe(0);
    expect(applyResult.applied).toBeGreaterThan(0);

    const roleFile = await readFile(
      join(root, '.codex', 'agents', 'oat-reviewer.toml'),
      'utf8',
    );
    const configFile = await readFile(
      join(root, '.codex', 'config.toml'),
      'utf8',
    );
    expect(roleFile).toContain('developer_instructions');
    expect(configFile).toContain('multi_agent = true');

    const secondPlan = await computeCodexProjectExtensionPlan(
      root,
      canonicalEntries,
    );
    expect(secondPlan.operations.every((op) => op.action === 'skip')).toBe(
      true,
    );
  });

  it('does not remove unrelated managed roles during partial install-triggered sync', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);

    const canonicalDir = join(root, '.agents', 'agents');
    await mkdir(canonicalDir, { recursive: true });
    const canonicalFile = join(canonicalDir, 'skeptical-evaluator.md');
    await writeFile(
      canonicalFile,
      canonicalAgentFileContent('skeptical-evaluator'),
    );

    await mkdir(join(root, '.codex', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.codex', 'agents', 'skeptical-evaluator.toml'),
      '# OAT managed role: skeptical-evaluator\ndeveloper_instructions = "review"\n',
      'utf8',
    );
    await writeFile(
      join(root, '.codex', 'config.toml'),
      '[agents.skeptical-evaluator]\ndescription = "skeptical-evaluator description"\nconfig_file = "agents/skeptical-evaluator.toml"\n\n[features]\nmulti_agent = true\n',
      'utf8',
    );

    const partialPlan = await computeCodexProjectExtensionPlan(
      root,
      [
        {
          name: 'skeptical-evaluator.md',
          type: 'agent',
          canonicalPath: canonicalFile,
          isFile: true,
        },
      ],
      ['.agents/skills/oat-docs-analyze'],
    );

    expect(partialPlan.operations.some((op) => op.action === 'remove')).toBe(
      false,
    );
    expect(partialPlan.operations).toEqual([]);
  });

  it('is a no-op for partial sync scopes with no codex-managed agent content', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);

    const partialPlan = await computeCodexProjectExtensionPlan(
      root,
      [],
      ['.agents/skills/oat-docs-analyze'],
    );

    expect(partialPlan.operations).toEqual([]);
    expect(partialPlan.managedRoles).toEqual([]);
  });

  it('does not update an existing user codex config during zero-role partial sync', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-extension-'));
    tempDirs.push(root);

    await mkdir(join(root, '.codex'), { recursive: true });
    await writeFile(join(root, '.codex', 'config.toml'), 'model = "gpt-5"\n');

    const partialPlan = await computeCodexProjectExtensionPlan(
      root,
      [],
      ['.agents/skills/oat-docs-analyze'],
    );

    expect(partialPlan.operations).toEqual([]);
    expect(partialPlan.managedRoles).toEqual([]);
  });
});
