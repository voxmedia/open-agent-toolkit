import TOML from '@iarna/toml';
import { describe, expect, it } from 'vitest';

import { mergeCodexConfig } from './config-merge';

describe('mergeCodexConfig', () => {
  it('upserts features.multi_agent and managed role entries', () => {
    const result = mergeCodexConfig({
      existingContent: null,
      desiredRoles: [
        {
          roleName: 'oat-reviewer',
          description: 'Reviewer',
          configFile: 'agents/oat-reviewer.toml',
        },
      ],
    });

    const parsed = TOML.parse(result.mergedContent) as Record<string, unknown>;
    const features = parsed.features as Record<string, unknown>;
    const agents = parsed.agents as Record<string, unknown>;
    const reviewer = agents['oat-reviewer'] as Record<string, unknown>;

    expect(features.multi_agent).toBe(true);
    expect(reviewer.description).toBe('Reviewer');
    expect(reviewer.config_file).toBe('agents/oat-reviewer.toml');
  });

  it('preserves unmanaged settings and removes stale managed roles', () => {
    const existing = `title = "Custom"\n[agents.custom]\ndescription = "Keep me"\nconfig_file = "agents/custom.toml"\n[agents.oat-old]\ndescription = "Old"\nconfig_file = "agents/oat-old.toml"\n`;

    const result = mergeCodexConfig({
      existingContent: existing,
      desiredRoles: [
        {
          roleName: 'oat-reviewer',
          description: 'Reviewer',
          configFile: 'agents/oat-reviewer.toml',
        },
      ],
      staleManagedRoles: ['oat-old'],
    });

    const parsed = TOML.parse(result.mergedContent) as Record<string, unknown>;
    const agents = parsed.agents as Record<string, unknown>;

    expect(parsed.title).toBe('Custom');
    expect(agents.custom).toBeDefined();
    expect(agents['oat-old']).toBeUndefined();
    expect(agents['oat-reviewer']).toBeDefined();
    expect(result.removedRoles).toEqual(['oat-old']);
  });
});
