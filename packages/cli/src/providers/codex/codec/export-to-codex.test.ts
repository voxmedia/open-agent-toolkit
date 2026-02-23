import { parseCanonicalAgentMarkdown } from '@agents/canonical';
import TOML from '@iarna/toml';
import { describe, expect, it } from 'vitest';
import { exportCanonicalAgentToCodexRole } from './export-to-codex';
import {
  OAT_MANAGED_ROLE_HEADER,
  OAT_MANAGED_ROLE_NAME_PREFIX,
} from './shared';

describe('exportCanonicalAgentToCodexRole', () => {
  it('exports canonical agent markdown to managed codex role TOML', () => {
    const canonical = parseCanonicalAgentMarkdown(
      `---\nname: oat-reviewer\ndescription: Reviewer\nmodel: gpt-5\nreadonly: true\n---\n\n## Role\nReview.`,
    );

    const exported = exportCanonicalAgentToCodexRole(canonical);

    expect(exported.roleName).toBe('oat-reviewer');
    expect(exported.configFile).toBe('agents/oat-reviewer.toml');
    expect(exported.content).toContain(OAT_MANAGED_ROLE_HEADER);
    expect(exported.content).toContain(
      `${OAT_MANAGED_ROLE_NAME_PREFIX}oat-reviewer`,
    );

    const parsed = TOML.parse(exported.content) as Record<string, unknown>;
    expect(parsed.developer_instructions).toContain('## Role');
    expect(parsed.sandbox_mode).toBe('read-only');
    expect(parsed.model).toBe('gpt-5');
  });
});
