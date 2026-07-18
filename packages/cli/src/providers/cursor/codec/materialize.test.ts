import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseCanonicalAgentMarkdown } from '@agents/canonical';
import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import { CURSOR_MODEL_PIN_MAPPINGS } from './catalog';
import {
  assertNoUnmanagedCursorAgentCollisions,
  materializeCursorAgent,
  materializeCursorAgents,
} from './materialize';

function parseRendered(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(content);
  if (!match) {
    throw new Error('missing frontmatter');
  }
  return {
    frontmatter: YAML.parse(match[1]!) as Record<string, unknown>,
    body: content.slice(match[0].length),
  };
}

describe('cursor markdown materializer', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('projects canonical frontmatter and preserves the body byte-for-byte', () => {
    const canonical = parseCanonicalAgentMarkdown(
      [
        '---',
        'name: oat-reviewer',
        'description: Review implementation changes.',
        'version: 9',
        'tools:',
        '  - Read',
        'color: blue',
        'readonly: true',
        'is_background: false',
        'x_codex:',
        '  model: ignored',
        '---',
        '',
        '## Role',
        '',
        'Review exactly.',
        '',
      ].join('\n'),
      'oat-reviewer.md',
    );
    const mapping = CURSOR_MODEL_PIN_MAPPINGS.find(
      ({ ladderModelId }) => ladderModelId === 'gpt-5.6-sol-high',
    )!;

    const materialized = materializeCursorAgent({
      agent: canonical,
      mapping,
      owner: 'supported-catalogue',
    });
    const rendered = parseRendered(materialized.content);

    expect(materialized.roleName).toBe('oat-reviewer-gpt-5-6-sol-high');
    expect(rendered.frontmatter).toEqual({
      name: 'oat-reviewer-gpt-5-6-sol-high',
      description: 'Review implementation changes.',
      model: 'gpt-5.6-sol[reasoning=high]',
      readonly: true,
      is_background: false,
    });
    expect(rendered.frontmatter).not.toHaveProperty('version');
    expect(rendered.frontmatter).not.toHaveProperty('tools');
    expect(rendered.frontmatter).not.toHaveProperty('color');
    expect(rendered.body).toBe(canonical.body);
    expect(materialized.content).toContain('# oat-managed: true');
    expect(materialized.content).toContain('# oat-owner: supported-catalogue');
  });

  it('rejects normalized desired-name collisions before writes', () => {
    const canonical = parseCanonicalAgentMarkdown(
      '---\nname: oat-reviewer\ndescription: Review.\n---\n\nBody',
    );
    const baseMapping = CURSOR_MODEL_PIN_MAPPINGS[0]!;

    expect(() =>
      materializeCursorAgents({
        agents: [canonical],
        targets: [
          baseMapping,
          {
            ...baseMapping,
            ladderModelId: 'composer_2.5',
          },
        ],
        owner: 'project-config',
      }),
    ).toThrow(/same Cursor role name/i);
  });

  it('detects unmanaged Markdown collisions in every Cursor discovery directory and ignores Codex TOML', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-cursor-codec-'));
    tempDirs.push(root);
    const roleName = 'oat-reviewer-gpt-5-6-sol-high';

    for (const directory of ['.cursor/agents', '.claude/agents']) {
      await mkdir(join(root, directory), { recursive: true });
      await writeFile(
        join(root, directory, `${roleName}.md`),
        '---\nname: unmanaged\ndescription: collision\n---\n',
      );
      await expect(
        assertNoUnmanagedCursorAgentCollisions(root, [roleName]),
      ).rejects.toThrow(new RegExp(directory.replace('/', '\\/')));
      await rm(join(root, directory, `${roleName}.md`));
    }

    await mkdir(join(root, '.codex', 'agents'), { recursive: true });
    await writeFile(
      join(root, '.codex', 'agents', `${roleName}.toml`),
      'developer_instructions = "not cursor markdown"\n',
    );
    await expect(
      assertNoUnmanagedCursorAgentCollisions(root, [roleName]),
    ).resolves.toBeUndefined();

    const external = await mkdtemp(join(tmpdir(), 'oat-cursor-collision-'));
    tempDirs.push(external);
    await writeFile(join(external, `${roleName}.md`), 'unmanaged');
    await symlink(
      join(external, `${roleName}.md`),
      join(root, '.codex', 'agents', `${roleName}.md`),
    );
    await expect(
      assertNoUnmanagedCursorAgentCollisions(root, [roleName]),
    ).rejects.toThrow(/\.codex\/agents/);
  });
});
