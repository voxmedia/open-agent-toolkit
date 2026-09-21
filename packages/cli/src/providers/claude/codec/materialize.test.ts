import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseCanonicalAgentMarkdown } from '@agents/canonical';
import { buildCursorMaterializedRoleName } from '@providers/cursor/codec/shared';
import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import {
  assertNoUnmanagedClaudeAgentCollisions,
  materializeClaudeAgent,
  materializeClaudeAgents,
} from './materialize';

describe('Claude effort materializer', () => {
  const roots: string[] = [];
  afterEach(async () => {
    await Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    );
    roots.length = 0;
  });

  it('preserves the canonical body and renders explicit model and effort', () => {
    const agent = parseCanonicalAgentMarkdown(
      '---\nname: oat-reviewer\ndescription: Review changes.\ntools: Read\nversion: 4\n---\n\n## Role\nReview exactly.\n',
    );
    const role = materializeClaudeAgent({
      agent,
      target: { model: 'opus', effort: 'high', owner: 'project-config' },
    });
    const match = /^---\n([\s\S]*?)\n---\n?/.exec(role.content)!;
    const parsed = YAML.parse(match[1]!) as Record<string, unknown>;
    expect(role.roleName).toBe('oat-reviewer-claude-opus-high');
    expect(parsed).toMatchObject({
      name: role.roleName,
      model: 'opus',
      effort: 'high',
      tools: 'Read',
    });
    expect(parsed.description).toContain(
      'Claude-native opus/high effort variant',
    );
    expect(parsed).not.toHaveProperty('version');
    expect(role.content.slice(match[0].length)).toBe(agent.body);
    expect(role.content).toContain('# oat-resolved-model: opus-5');
  });

  it.each([
    ['claude-sonnet-5', 'xhigh', 'sonnet-5'],
    ['claude-opus-5', 'low', 'opus-5'],
    ['claude-fable-5-1', 'low', 'fable-5-1'],
    ['claude-fable-5', 'medium', 'fable-5'],
  ])(
    'materializes documented capability %s/%s',
    (model, effort, resolvedModel) => {
      const agent = parseCanonicalAgentMarkdown(
        '---\nname: oat-reviewer\ndescription: Review changes.\n---\n\nBody',
      );
      const role = materializeClaudeAgent({
        agent,
        target: { model, effort, owner: 'project-config' },
      });
      expect(role.target.resolvedModel).toBe(resolvedModel);
      expect(role.content).toContain(`# oat-resolved-model: ${resolvedModel}`);
    },
  );

  it('rejects Sonnet 4.6 xhigh and unresolved gateway aliases', () => {
    const agent = parseCanonicalAgentMarkdown(
      '---\nname: oat-reviewer\ndescription: Review changes.\n---\n\nBody',
    );
    expect(() =>
      materializeClaudeAgent({
        agent,
        target: {
          model: 'claude-sonnet-4-6',
          effort: 'xhigh',
          owner: 'project-config',
        },
      }),
    ).toThrow(/sonnet-4-6.*does not support effort "xhigh"/iu);
    expect(() =>
      materializeClaudeAgent({
        agent,
        target: { model: 'sonnet', effort: 'xhigh', owner: 'project-config' },
        env: { ANTHROPIC_BASE_URL: 'https://gateway.example.test' },
      }),
    ).toThrow(/ambiguous provider-dependent generation/iu);
  });

  it('honors host-managed precedence and requires Mantle alias pins', () => {
    const agent = parseCanonicalAgentMarkdown(
      '---\nname: oat-reviewer\ndescription: Review changes.\n---\n\nBody',
    );
    const target = {
      model: 'sonnet',
      effort: 'xhigh',
      owner: 'project-config' as const,
    };
    expect(() =>
      materializeClaudeAgent({
        agent,
        target,
        env: {
          CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST: '1',
          ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-5',
        },
      }),
    ).toThrow(
      /host-managed.*takes precedence.*ANTHROPIC_DEFAULT_SONNET_MODEL/iu,
    );
    expect(() =>
      materializeClaudeAgent({
        agent,
        target,
        env: { CLAUDE_CODE_USE_MANTLE: '1' },
      }),
    ).toThrow(/no documented built-in Mantle generation mapping/iu);

    const versioned = materializeClaudeAgent({
      agent,
      target: { ...target, model: 'claude-sonnet-5' },
      env: {
        CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST: '1',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-4-6',
      },
    });
    expect(versioned.target.resolvedModel).toBe('sonnet-5');

    const pinnedMantle = materializeClaudeAgent({
      agent,
      target,
      env: {
        CLAUDE_CODE_USE_MANTLE: '1',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-5',
      },
    });
    expect(pinnedMantle.target.resolvedModel).toBe('sonnet-5');
  });

  it('refuses unmanaged cross-directory collisions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-claude-collision-'));
    roots.push(root);
    const role = 'oat-reviewer-claude-opus-high';
    await mkdir(join(root, '.cursor', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.cursor', 'agents', `${role}.md`),
      `---\nname: ${role}\ndescription: collision\n---\n`,
    );
    await expect(
      assertNoUnmanagedClaudeAgentCollisions(root, [role]),
    ).rejects.toThrow(/\.cursor\/agents/);
  });

  it('refuses normalized Codex TOML role collisions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-claude-collision-'));
    roots.push(root);
    const role = 'oat-reviewer-claude-opus-high';
    await mkdir(join(root, '.codex', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.codex', 'agents', 'OAT_Reviewer-Claude-Opus-High.toml'),
      'name = "unmanaged-collision"\n',
    );

    await expect(
      assertNoUnmanagedClaudeAgentCollisions(root, [role]),
    ).rejects.toThrow(/\.codex\/agents/);
  });

  it('keeps Cursor Claude-catalog names distinct and refuses normalized Claude collisions', () => {
    const agent = parseCanonicalAgentMarkdown(
      '---\nname: oat-reviewer\ndescription: Review changes.\n---\n\nBody',
    );
    const claude = materializeClaudeAgent({
      agent,
      target: { model: 'opus', effort: 'high', owner: 'project-config' },
    });
    const cursor = buildCursorMaterializedRoleName({
      agentName: agent.name,
      ladderModelId: 'claude-opus-5-thinking-high',
    });
    expect(claude.roleName).toBe('oat-reviewer-claude-opus-high');
    expect(cursor).toBe('oat-reviewer-claude-opus-5-thinking-high');
    expect(cursor).not.toBe(claude.roleName);

    expect(() =>
      materializeClaudeAgents({
        agents: [agent, { ...agent, name: 'oat_reviewer' }],
        targets: [{ model: 'opus', effort: 'high', owner: 'project-config' }],
      }),
    ).toThrow(/same normalized role name/i);
  });
});
