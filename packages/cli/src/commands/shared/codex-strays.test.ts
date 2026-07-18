import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CanonicalEntry } from '@engine/index';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  detectCodexRoleStrays,
  filterMaterializationManagedStrays,
  regenerateCodexAfterAdoption,
} from './codex-strays';

function canonicalAgentEntry(root: string, name: string): CanonicalEntry {
  return {
    name: `${name}.md`,
    type: 'agent',
    canonicalPath: join(root, '.agents', 'agents', `${name}.md`),
    isFile: true,
  };
}

describe('detectCodexRoleStrays', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('detects codex role strays from config and agents directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-strays-'));
    tempDirs.push(root);

    await mkdir(join(root, '.codex', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.codex', 'config.toml'),
      `[agents.oat-reviewer]\ndescription = "Reviewer"\nconfig_file = "agents/oat-reviewer.toml"\n`,
      'utf8',
    );
    await writeFile(
      join(root, '.codex', 'agents', 'oat-reviewer.toml'),
      'developer_instructions = "Review"',
      'utf8',
    );
    await writeFile(
      join(root, '.codex', 'agents', 'orphan.toml'),
      'developer_instructions = "Orphan"',
      'utf8',
    );

    const strays = await detectCodexRoleStrays(root, []);

    expect(strays).toEqual([
      {
        roleName: 'oat-reviewer',
        providerPath: '.codex/agents/oat-reviewer.toml',
        description: 'Reviewer',
      },
      {
        roleName: 'orphan',
        providerPath: '.codex/agents/orphan.toml',
      },
    ]);
  });

  it('does not report roles that already exist canonically', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-strays-'));
    tempDirs.push(root);

    await mkdir(join(root, '.codex', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.codex', 'agents', 'oat-reviewer.toml'),
      'developer_instructions = "Review"',
      'utf8',
    );

    const strays = await detectCodexRoleStrays(root, [
      canonicalAgentEntry(root, 'oat-reviewer'),
    ]);

    expect(strays).toEqual([]);
  });

  it('does not flag managed materialized roles identified by file header', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-strays-'));
    tempDirs.push(root);

    await mkdir(join(root, '.codex', 'agents'), { recursive: true });
    await writeFile(
      join(
        root,
        '.codex',
        'agents',
        'oat-phase-implementer-gpt-5-6-terra-xhigh.toml',
      ),
      [
        '# oat-managed: true',
        '# oat-role: oat-phase-implementer-gpt-5-6-terra-xhigh',
        'model = "gpt-5.6-terra"',
        'model_reasoning_effort = "xhigh"',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(root, '.codex', 'agents', 'oat-reviewer-gpt-5-6-sol-high.toml'),
      [
        '# oat-managed: true',
        '# oat-role: oat-reviewer-gpt-5-6-sol-high',
        'model = "gpt-5.6-sol"',
        'model_reasoning_effort = "high"',
      ].join('\n'),
      'utf8',
    );

    const strays = await detectCodexRoleStrays(root, []);

    expect(strays).toEqual([]);
  });

  it('still flags genuinely orphaned roles not in managedRoles', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-strays-'));
    tempDirs.push(root);

    await mkdir(join(root, '.codex', 'agents'), { recursive: true });
    // Generated variant — should be excluded via managedRoles
    await writeFile(
      join(root, '.codex', 'agents', 'oat-phase-implementer-low.toml'),
      'model_reasoning_effort = "low"',
      'utf8',
    );
    // Truly orphaned role — no canonical source, not in managedRoles
    await writeFile(
      join(root, '.codex', 'agents', 'old-orphan.toml'),
      'developer_instructions = "leftover"',
      'utf8',
    );

    const managedRoleNames = new Set(['oat-phase-implementer-low']);

    const strays = await detectCodexRoleStrays(root, [], managedRoleNames);

    expect(strays).toEqual([
      {
        roleName: 'old-orphan',
        providerPath: '.codex/agents/old-orphan.toml',
      },
    ]);
  });

  it('does not report config entries backed by managed materialized files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-codex-strays-'));
    tempDirs.push(root);

    await mkdir(join(root, '.codex', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.codex', 'config.toml'),
      `[agents.custom-gpt-5-6-sol-high]
description = "Generated custom role"
config_file = "agents/custom-gpt-5-6-sol-high.toml"
`,
      'utf8',
    );
    await writeFile(
      join(root, '.codex', 'agents', 'custom-gpt-5-6-sol-high.toml'),
      [
        '# oat-managed: true',
        '# oat-role: custom-gpt-5-6-sol-high',
        'model = "gpt-5.6-sol"',
        'model_reasoning_effort = "high"',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(root, '.codex', 'agents', 'old-orphan.toml'),
      'developer_instructions = "leftover"',
      'utf8',
    );

    const strays = await detectCodexRoleStrays(root, []);

    expect(strays).toEqual([
      {
        roleName: 'old-orphan',
        providerPath: '.codex/agents/old-orphan.toml',
      },
    ]);
  });
});

describe('filterMaterializationManagedStrays', () => {
  it('removes provider-owned Cursor variants without hiding unrelated files', () => {
    const candidates = [
      {
        provider: 'cursor',
        report: {
          providerPath: '.cursor/agents/oat-reviewer-gpt.md',
        },
      },
      {
        provider: 'cursor',
        report: { providerPath: '.cursor/agents/custom.md' },
      },
    ];
    const plans = [
      {
        provider: 'cursor',
        operations: [
          {
            provider: 'cursor',
            action: 'skip' as const,
            target: 'role',
            path: '.cursor/agents/oat-reviewer-gpt.md',
            reason: 'already in sync',
          },
        ],
        managedEntries: ['oat-reviewer-gpt'],
        aggregateHash: 'hash',
        metadata: {},
      },
    ];

    expect(filterMaterializationManagedStrays(candidates, plans)).toEqual([
      {
        provider: 'cursor',
        report: { providerPath: '.cursor/agents/custom.md' },
      },
    ]);
  });
});

describe('regenerateCodexAfterAdoption', () => {
  it('scans canonical entries, computes extension plan, then applies it', async () => {
    const canonicalEntries: CanonicalEntry[] = [
      {
        name: 'reviewer.md',
        type: 'agent',
        canonicalPath: '/tmp/workspace/.agents/agents/reviewer.md',
        isFile: true,
      },
    ];
    const extensionPlan = {
      operations: [],
      managedRoles: ['reviewer'],
      aggregateConfigHash: 'hash-reviewer',
    };
    const scanCanonical = vi.fn(async () => canonicalEntries);
    const computeExtensionPlan = vi.fn(async () => extensionPlan);
    const applyExtensionPlan = vi.fn(async () => ({
      applied: 0,
      failed: 0,
      skipped: 0,
    }));

    await regenerateCodexAfterAdoption({
      scopeRoot: '/tmp/workspace',
      scanCanonical,
      computeExtensionPlan,
      applyExtensionPlan,
    });

    expect(scanCanonical).toHaveBeenCalledTimes(1);
    expect(computeExtensionPlan).toHaveBeenCalledWith(
      '/tmp/workspace',
      canonicalEntries,
    );
    expect(applyExtensionPlan).toHaveBeenCalledWith(
      '/tmp/workspace',
      extensionPlan,
    );
  });
});
