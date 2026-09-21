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
