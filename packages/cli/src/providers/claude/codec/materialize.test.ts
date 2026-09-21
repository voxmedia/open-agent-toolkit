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
    expect(role.target.capabilityEvidence).toMatchObject({
      source: 'alias-capability-equivalence',
      exactModel: false,
      possibleGenerations: ['opus-5', 'opus-4-8', 'opus-4-7', 'opus-4-6'],
    });
    expect(role.content).toContain('# oat-capability-evidence:');
  });

  it.each([
    ['claude-sonnet-5', 'xhigh', 'sonnet-5'],
    ['claude-opus-5', 'low', 'opus-5'],
    ['claude-fable-5-1', 'low', 'fable-5-1'],
    ['claude-fable-5', 'medium', 'fable-5'],
  ])(
    'materializes documented capability %s/%s',
    (model, effort, generation) => {
      const agent = parseCanonicalAgentMarkdown(
        '---\nname: oat-reviewer\ndescription: Review changes.\n---\n\nBody',
      );
      const role = materializeClaudeAgent({
        agent,
        target: { model, effort, owner: 'project-config' },
      });
      expect(role.target.capabilityEvidence).toMatchObject({
        source: 'explicit-model-id',
        exactModel: true,
        generation,
      });
      expect(role.content).toContain(`"generation":"${generation}"`);
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
    expect(versioned.target.capabilityEvidence).toMatchObject({
      source: 'explicit-model-id',
      exactModel: true,
      generation: 'sonnet-5',
    });

    const pinnedMantle = materializeClaudeAgent({
      agent,
      target,
      env: {
        CLAUDE_CODE_USE_MANTLE: '1',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-5',
      },
    });
    expect(pinnedMantle.target.capabilityEvidence).toMatchObject({
      source: 'family-pin-model-id',
      exactModel: false,
      generation: 'sonnet-5',
      capabilitiesSource: 'ANTHROPIC_DEFAULT_SONNET_MODEL',
    });
  });

  it('covers normal and allowlist-substituted Sonnet plus apps-gateway Fable without exact claims', () => {
    const agent = parseCanonicalAgentMarkdown(
      '---\nname: oat-reviewer\ndescription: Review changes.\n---\n\nBody',
    );
    const sonnet = materializeClaudeAgent({
      agent,
      target: { model: 'sonnet', effort: 'high', owner: 'project-config' },
    });
    expect(sonnet.target.capabilityEvidence).toMatchObject({
      source: 'alias-capability-equivalence',
      exactModel: false,
      possibleGenerations: ['sonnet-5', 'sonnet-4-6'],
      supportedEfforts: ['low', 'medium', 'high', 'max'],
    });

    const appsGatewayFable = materializeClaudeAgent({
      agent,
      target: { model: 'fable', effort: 'xhigh', owner: 'project-config' },
    });
    expect(appsGatewayFable.target.capabilityEvidence).toMatchObject({
      source: 'alias-capability-equivalence',
      exactModel: false,
      possibleGenerations: ['fable-5-1', 'fable-5'],
      supportedEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
    });
  });

  it('honors provider alias mappings and fails closed for Sonnet 4.5', () => {
    const agent = parseCanonicalAgentMarkdown(
      '---\nname: oat-reviewer\ndescription: Review changes.\n---\n\nBody',
    );
    for (const providerEnv of [
      { CLAUDE_CODE_USE_BEDROCK: '1' },
      { CLAUDE_CODE_USE_VERTEX: '1' },
      { CLAUDE_CODE_USE_FOUNDRY: '1' },
    ]) {
      expect(() =>
        materializeClaudeAgent({
          agent,
          target: {
            model: 'sonnet',
            effort: 'high',
            owner: 'project-config',
          },
          env: providerEnv,
        }),
      ).toThrow(/no documented effort-capability equivalence class/iu);
    }

    const bedrockOpus = materializeClaudeAgent({
      agent,
      target: { model: 'opus', effort: 'xhigh', owner: 'project-config' },
      env: { CLAUDE_CODE_USE_BEDROCK: '1' },
    });
    expect(bedrockOpus.target.capabilityEvidence).toMatchObject({
      exactModel: false,
      possibleGenerations: ['opus-5'],
      capabilitiesSource: 'claude-model-alias-table:bedrock-agent-platform',
    });

    const foundryOpus = materializeClaudeAgent({
      agent,
      target: { model: 'opus', effort: 'max', owner: 'project-config' },
      env: { CLAUDE_CODE_USE_FOUNDRY: '1' },
    });
    expect(foundryOpus.target.capabilityEvidence).toMatchObject({
      exactModel: false,
      possibleGenerations: ['opus-4-6'],
      supportedEfforts: ['low', 'medium', 'high', 'max'],
    });
  });

  it('uses declared capabilities for custom Bedrock and Foundry pins', () => {
    const agent = parseCanonicalAgentMarkdown(
      '---\nname: oat-reviewer\ndescription: Review changes.\n---\n\nBody',
    );
    const bedrockArn =
      'arn:aws:bedrock:us-east-1:123456789012:inference-profile/custom-opus';
    const bedrock = materializeClaudeAgent({
      agent,
      target: { model: 'opus', effort: 'xhigh', owner: 'project-config' },
      env: {
        CLAUDE_CODE_USE_BEDROCK: '1',
        ANTHROPIC_DEFAULT_OPUS_MODEL: bedrockArn,
        ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES:
          'effort,xhigh_effort,max_effort',
      },
    });
    expect(bedrock.target.capabilityEvidence).toEqual({
      source: 'family-pin-declaration',
      modelReference: bedrockArn,
      exactModel: false,
      capabilitiesSource: 'ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES',
      supportedEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
    });

    const foundry = materializeClaudeAgent({
      agent,
      target: { model: 'sonnet', effort: 'high', owner: 'project-config' },
      env: {
        CLAUDE_CODE_USE_FOUNDRY: '1',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'prod-sonnet-deployment',
        ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES: 'effort',
      },
    });
    expect(foundry.target.capabilityEvidence).toMatchObject({
      source: 'family-pin-declaration',
      modelReference: 'prod-sonnet-deployment',
      supportedEfforts: ['low', 'medium', 'high'],
    });
    expect(() =>
      materializeClaudeAgent({
        agent,
        target: { model: 'sonnet', effort: 'xhigh', owner: 'project-config' },
        env: {
          ANTHROPIC_DEFAULT_SONNET_MODEL: 'prod-sonnet-deployment',
          ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES: 'effort',
        },
      }),
    ).toThrow(/does not support effort "xhigh"/iu);
    expect(() =>
      materializeClaudeAgent({
        agent,
        target: { model: 'opus', effort: 'high', owner: 'project-config' },
        env: { ANTHROPIC_DEFAULT_OPUS_MODEL: bedrockArn },
      }),
    ).toThrow(/does not establish effort support/iu);
    expect(() =>
      materializeClaudeAgent({
        agent,
        target: { model: 'opus', effort: 'xhigh', owner: 'project-config' },
        env: {
          ANTHROPIC_DEFAULT_OPUS_MODEL: bedrockArn,
          ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES: 'xhigh_effort',
        },
      }),
    ).toThrow(/must include effort/iu);
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
