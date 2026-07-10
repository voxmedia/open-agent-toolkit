import { parseCanonicalAgentMarkdown } from '@agents/canonical';
import { CliError } from '@errors/index';
import TOML from '@iarna/toml';
import { describe, expect, it } from 'vitest';

import {
  buildCodexMaterializedRoleName,
  materializeCodexRole,
} from './materialize';
import { OAT_MANAGED_ROLE_HEADER } from './shared';

describe('materializeCodexRole', () => {
  it('materializes a canonical agent with explicit model and effort', () => {
    const canonical = parseCanonicalAgentMarkdown(
      `---\nname: oat-reviewer\ndescription: Reviewer\nreadonly: true\n---\n\nReview carefully.`,
    );

    const role = materializeCodexRole({
      agent: canonical,
      model: 'gpt-5.6-sol',
      effort: 'xhigh',
    });

    expect(role.roleName).toBe('oat-reviewer-gpt-5-6-sol-xhigh');
    expect(role.configFile).toBe('agents/oat-reviewer-gpt-5-6-sol-xhigh.toml');
    expect(role.content).toContain(OAT_MANAGED_ROLE_HEADER);

    const parsed = TOML.parse(role.content) as Record<string, unknown>;
    expect(parsed.model).toBe('gpt-5.6-sol');
    expect(parsed.model_reasoning_effort).toBe('xhigh');
    expect(parsed.sandbox_mode).toBe('read-only');
  });

  it('normalizes model IDs safely for default role names', () => {
    expect(
      buildCodexMaterializedRoleName({
        agentName: 'custom-agent.md',
        model: 'gpt-5.6/sol@preview',
        effort: 'xhigh',
      }),
    ).toBe('custom-agent-gpt-5-6-sol-preview-xhigh-72897c3c6a');
  });

  it('throws CliError when model or effort is missing', () => {
    const canonical = parseCanonicalAgentMarkdown(
      `---\nname: oat-reviewer\ndescription: Reviewer\n---\n\nReview carefully.`,
    );

    expect(() =>
      materializeCodexRole({ agent: canonical, model: '', effort: 'xhigh' }),
    ).toThrow(CliError);
    expect(() =>
      materializeCodexRole({
        agent: canonical,
        model: 'gpt-5.6-sol',
        effort: '',
      }),
    ).toThrow(CliError);
  });

  it('preserves x_codex extension values unless explicit materialization overrides them', () => {
    const canonical = parseCanonicalAgentMarkdown(
      `---\nname: custom-agent\ndescription: Custom\nx_codex:\n  model: gpt-5\n  model_reasoning_effort: medium\n  sandbox_mode: danger-full-access\n  custom_key: keep-me\n---\n\nCustom body.`,
    );

    const role = materializeCodexRole({
      agent: canonical,
      model: 'gpt-5.6-terra',
      effort: 'high',
    });

    const parsed = TOML.parse(role.content) as Record<string, unknown>;
    expect(parsed.model).toBe('gpt-5.6-terra');
    expect(parsed.model_reasoning_effort).toBe('high');
    expect(parsed.sandbox_mode).toBe('danger-full-access');
    expect(parsed.custom_key).toBe('keep-me');
  });
});
