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
      target: {
        model: 'claude-opus-5-5',
        effort: 'high',
        owner: 'project-config',
      },
    });
    const match = /^---\n([\s\S]*?)\n---\n?/.exec(role.content)!;
    const parsed = YAML.parse(match[1]!) as Record<string, unknown>;
    expect(role.roleName).toBe('oat-reviewer-claude-claude-opus-5-5-high');
    expect(parsed).toMatchObject({
      name: role.roleName,
      model: 'claude-opus-5-5',
      effort: 'high',
      tools: 'Read',
    });
    expect(parsed.description).toContain(
      'Claude-native claude-opus-5-5/high effort variant',
    );
    expect(parsed).not.toHaveProperty('version');
    expect(role.content.slice(match[0].length)).toBe(agent.body);
    expect(role.target.capabilityEvidence).toMatchObject({
      source: 'explicit-model-id',
      exactModel: true,
      generation: 'opus-5-5',
    });
    expect(role.content).toContain('# oat-capability-evidence:');
  });

  it.each([
    ['claude-sonnet-5', 'xhigh', 'sonnet-5'],
    ['claude-opus-5-5', 'low', 'opus-5-5'],
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
    ).toThrow(/availableModels.*organization policy/iu);
  });

  it('does not attribute retired Opus generations to the new capability', () => {
    const agent = parseCanonicalAgentMarkdown(
      '---\nname: oat-reviewer\ndescription: Review changes.\n---\n\nBody',
    );
    for (const model of ['claude-opus-5', 'claude-opus-4-8']) {
      expect(() =>
        materializeClaudeAgent({
          agent,
          target: { model, effort: 'high', owner: 'project-config' },
        }),
      ).toThrow(/establish a documented Claude effort capability/iu);
    }
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
    ).toThrow(/availableModels.*organization policy/iu);

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

  it('refuses effort-pinned aliases that availableModels or an organization may substitute', () => {
    const agent = parseCanonicalAgentMarkdown(
      '---\nname: oat-reviewer\ndescription: Review changes.\n---\n\nBody',
    );
    for (const model of ['sonnet', 'opus', 'fable']) {
      expect(() =>
        materializeClaudeAgent({
          agent,
          target: { model, effort: 'high', owner: 'project-config' },
        }),
      ).toThrow(/availableModels.*organization policy/iu);
    }

    for (const model of [
      'claude-sonnet-5',
      'claude-opus-5-5',
      'claude-fable-5-1',
    ]) {
      expect(
        materializeClaudeAgent({
          agent,
          target: { model, effort: 'high', owner: 'project-config' },
        }).target.capabilityEvidence,
      ).toMatchObject({ source: 'explicit-model-id', exactModel: true });
    }
  });

  it('fails closed for provider and allowlist alias substitutions', () => {
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
      ).toThrow(/availableModels.*organization policy/iu);
    }
    expect(() =>
      materializeClaudeAgent({
        agent,
        target: {
          model: 'sonnet',
          effort: 'high',
          owner: 'project-config',
        },
        env: { CLAUDE_CODE_USE_ANTHROPIC_AWS: '1' },
      }),
    ).toThrow(/availableModels.*organization policy/iu);
    expect(
      materializeClaudeAgent({
        agent,
        target: {
          model: 'claude-sonnet-4-6',
          effort: 'high',
          owner: 'project-config',
        },
      }).target.capabilityEvidence,
    ).toMatchObject({ generation: 'sonnet-4-6', exactModel: true });
    expect(() =>
      materializeClaudeAgent({
        agent,
        target: {
          model: 'claude-sonnet-4-5',
          effort: 'high',
          owner: 'project-config',
        },
      }),
    ).toThrow(/cannot establish a documented Claude effort capability/iu);
  });

  it.each([
    ['effort', 'high', ['low', 'medium', 'high']],
    ['effort,xhigh_effort', 'xhigh', ['low', 'medium', 'high', 'xhigh']],
    ['effort,max_effort', 'max', ['low', 'medium', 'high', 'max']],
  ] as const)(
    'treats recognized-pin capability declaration %s as authoritative',
    (declaration, effort, supportedEfforts) => {
      const agent = parseCanonicalAgentMarkdown(
        '---\nname: oat-reviewer\ndescription: Review changes.\n---\n\nBody',
      );
      const env = {
        CLAUDE_CODE_USE_BEDROCK: '1',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'us.anthropic.claude-opus-5-5-v1:0',
        ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES: declaration,
      };
      const role = materializeClaudeAgent({
        agent,
        target: { model: 'opus', effort, owner: 'project-config' },
        env,
      });
      expect(role.target.capabilityEvidence).toEqual({
        source: 'family-pin-declaration',
        modelReference: 'us.anthropic.claude-opus-5-5-v1:0',
        exactModel: false,
        generation: 'opus-5-5',
        capabilitiesSource:
          'ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES',
        supportedEfforts: [...supportedEfforts],
      });
      if (!supportedEfforts.includes('xhigh')) {
        expect(() =>
          materializeClaudeAgent({
            agent,
            target: { model: 'opus', effort: 'xhigh', owner: 'project-config' },
            env,
          }),
        ).toThrow(/does not support effort "xhigh"/iu);
      }
      if (!supportedEfforts.includes('max')) {
        expect(() =>
          materializeClaudeAgent({
            agent,
            target: { model: 'opus', effort: 'max', owner: 'project-config' },
            env,
          }),
        ).toThrow(/does not support effort "max"/iu);
      }
    },
  );

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
    const role = 'oat-reviewer-claude-claude-opus-5-5-high';
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
    const role = 'oat-reviewer-claude-claude-opus-5-5-high';
    await mkdir(join(root, '.codex', 'agents'), { recursive: true });
    await writeFile(
      join(
        root,
        '.codex',
        'agents',
        'OAT_Reviewer-Claude-Claude-Opus-5-5-High.toml',
      ),
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
      target: {
        model: 'claude-opus-5-5',
        effort: 'high',
        owner: 'project-config',
      },
    });
    const cursor = buildCursorMaterializedRoleName({
      agentName: agent.name,
      ladderModelId: 'claude-sonnet-5-thinking-high',
    });
    expect(claude.roleName).toBe('oat-reviewer-claude-claude-opus-5-5-high');
    expect(cursor).toBe('oat-reviewer-claude-sonnet-5-thinking-high');
    expect(cursor).not.toBe(claude.roleName);

    expect(() =>
      materializeClaudeAgents({
        agents: [agent, { ...agent, name: 'oat_reviewer' }],
        targets: [
          {
            model: 'claude-opus-5-5',
            effort: 'high',
            owner: 'project-config',
          },
        ],
      }),
    ).toThrow(/same normalized role name/i);
  });
});
