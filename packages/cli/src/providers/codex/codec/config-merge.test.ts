import TOML from '@iarna/toml';
import { describe, expect, it } from 'vitest';

import {
  mergeCodexConfig,
  mergeCodexConfigForRole,
  readCodexMaxDepth,
} from './config-merge';

const managedRole = {
  roleName: 'oat-reviewer',
  description: 'Reviewer',
  configFile: 'agents/oat-reviewer.toml',
};

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
    expect(agents.max_depth).toBe(2);
    expect(reviewer.description).toBe('Reviewer');
    expect(reviewer.config_file).toBe('agents/oat-reviewer.toml');
  });

  it.each([
    { label: 'missing', existingContent: null, expectedDepth: 2 },
    {
      label: 'invalid',
      existingContent: '[agents]\nmax_depth = "invalid"\n',
      expectedDepth: 2,
    },
    {
      label: 'lower',
      existingContent: '[agents]\nmax_depth = 1\n',
      expectedDepth: 2,
    },
    {
      label: 'equal',
      existingContent: '[agents]\nmax_depth = 2\n',
      expectedDepth: 2,
    },
    {
      label: 'higher',
      existingContent: '[agents]\nmax_depth = 4\n',
      expectedDepth: 4,
    },
  ])(
    'enforces the depth floor when target depth is $label',
    ({ existingContent, expectedDepth }) => {
      const result = mergeCodexConfig({
        existingContent,
        desiredRoles: [managedRole],
      });

      expect(readCodexMaxDepth(result.mergedContent)).toBe(expectedDepth);
    },
  );

  it('preserves a higher inherited depth without changing max_threads', () => {
    const result = mergeCodexConfig({
      existingContent: '[agents]\nmax_depth = 3\nmax_threads = 8\n',
      desiredRoles: [managedRole],
      inheritedMaxDepth: 5,
    });

    const parsed = TOML.parse(result.mergedContent) as Record<string, unknown>;
    const agents = parsed.agents as Record<string, unknown>;

    expect(agents.max_depth).toBe(5);
    expect(agents.max_threads).toBe(8);
  });

  it('preserves unmanaged settings and removes stale managed roles', () => {
    const existing = `title = "Custom"\n[features]\ncustom_flag = true\n[agents]\nmax_threads = 12\n[agents.custom]\ndescription = "Keep me"\nconfig_file = "agents/custom.toml"\n[agents.oat-old]\ndescription = "Old"\nconfig_file = "agents/oat-old.toml"\n`;

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
    const features = parsed.features as Record<string, unknown>;
    const agents = parsed.agents as Record<string, unknown>;

    expect(parsed.title).toBe('Custom');
    expect(features.custom_flag).toBe(true);
    expect(agents.max_threads).toBe(12);
    expect(agents.custom).toBeDefined();
    expect(agents['oat-old']).toBeUndefined();
    expect(agents['oat-reviewer']).toBeDefined();
    expect(result.removedRoles).toEqual(['oat-old']);
  });

  it('left-aligns merged config structure without changing multiline string contents', () => {
    const existing = [
      'title = "Custom"',
      'narrative = """',
      'first line',
      '  indented = keep',
      '    [not.a.table]',
      'last line"""',
      '[agents.custom]',
      'description = "Keep me"',
      'config_file = "agents/custom.toml"',
      '',
    ].join('\n');

    const first = mergeCodexConfig({
      existingContent: existing,
      desiredRoles: [managedRole],
    });
    const second = mergeCodexConfig({
      existingContent: first.mergedContent,
      desiredRoles: [managedRole],
    });
    const structureOnly = first.mergedContent.replace(
      /(?:'''|""")[\s\S]*?(?:'''|""")/g,
      '""""""',
    );

    expect(structureOnly).not.toMatch(/^[ \t]+(?:\[|[A-Za-z0-9_-]+\s*=)/mu);
    expect(first.mergedContent).toContain(
      [
        'narrative = """',
        'first line',
        '  indented = keep',
        '    [not.a.table]',
        'last line"""',
      ].join('\n'),
    );
    expect(TOML.parse(first.mergedContent)).toEqual({
      ...TOML.parse(existing),
      features: { multi_agent: true },
      agents: {
        custom: {
          description: 'Keep me',
          config_file: 'agents/custom.toml',
        },
        max_depth: 2,
        'oat-reviewer': {
          description: 'Reviewer',
          config_file: 'agents/oat-reviewer.toml',
        },
      },
    });
    expect(second.changed).toBe(false);
    expect(second.mergedContent).toBe(first.mergedContent);
  });

  it('merges a single role idempotently', () => {
    const role = {
      roleName: 'oat-reviewer-gpt-5-6-sol-xhigh',
      description: 'Reviewer',
      configFile: 'agents/oat-reviewer-gpt-5-6-sol-xhigh.toml',
    };
    const first = mergeCodexConfigForRole({
      existingContent: null,
      role,
    });
    const second = mergeCodexConfigForRole({
      existingContent: first.mergedContent,
      role,
    });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(second.mergedContent).toBe(first.mergedContent);
  });

  it('passes inherited depth through the single-role wrapper', () => {
    const first = mergeCodexConfigForRole({
      existingContent: null,
      role: managedRole,
      inheritedMaxDepth: 6,
    });
    const second = mergeCodexConfigForRole({
      existingContent: first.mergedContent,
      role: managedRole,
      inheritedMaxDepth: 6,
    });

    expect(readCodexMaxDepth(first.mergedContent)).toBe(6);
    expect(second).toEqual({
      ...first,
      changed: false,
    });
  });
});

describe('readCodexMaxDepth', () => {
  it.each([
    { content: null, expected: null },
    { content: '', expected: null },
    { content: '[agents]\nmax_depth = "invalid"\n', expected: null },
    { content: '[agents]\nmax_depth = 3\n', expected: 3 },
  ])('reads $expected from Codex config', ({ content, expected }) => {
    expect(readCodexMaxDepth(content)).toBe(expected);
  });

  it('preserves the existing TOML parse error contract', () => {
    expect(() => readCodexMaxDepth('[agents\nmax_depth = 2')).toThrow(
      'Failed to parse .codex/config.toml:',
    );
  });
});
