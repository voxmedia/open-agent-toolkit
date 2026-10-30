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

describe('mergeCodexConfig preserves user-owned content', () => {
  const lines = (...content: string[]) => content.join('\n');

  it('edits only managed keys and keeps comments, router markers, and table order', () => {
    const existing = lines(
      '# Codex user config',
      'model = "gpt-5.6-sol" # default model',
      '',
      '[features]',
      '# experimental flags',
      'web_search = true',
      '',
      '# BEGIN codex-router-managed',
      '[model_providers.codex-router] # codex-router-provider-managed',
      'name = "codex-router"',
      'base_url = "http://127.0.0.1:8787/v1"',
      '',
      '[model_providers.codex-router-signed] # codex-router-signed-provider-managed',
      'name = "codex-router-signed"',
      '# END codex-router-managed',
      '',
      '[agents]',
      'max_depth = 1 # raised by oat',
      '',
      '[agents.oat-reviewer]',
      '# reviewer tuning',
      'description = "Old reviewer" # managed',
      'config_file = "agents/oat-reviewer.toml"',
      'model = "custom" # user key',
      '',
      '# retired role below',
      '[agents.oat-old]',
      'description = "Old"',
      'config_file = "agents/oat-old.toml"',
      '',
      '[zeta]',
      'a = 1',
      '',
    );

    const result = mergeCodexConfig({
      existingContent: existing,
      desiredRoles: [
        managedRole,
        {
          roleName: 'oat-mapper',
          description: 'Mapper',
          configFile: 'agents/oat-mapper.toml',
        },
      ],
      staleManagedRoles: ['oat-old'],
    });

    expect(result.mergedContent).toBe(
      lines(
        '# Codex user config',
        'model = "gpt-5.6-sol" # default model',
        '',
        '[features]',
        '# experimental flags',
        'web_search = true',
        'multi_agent = true',
        '',
        '# BEGIN codex-router-managed',
        '[model_providers.codex-router] # codex-router-provider-managed',
        'name = "codex-router"',
        'base_url = "http://127.0.0.1:8787/v1"',
        '',
        '[model_providers.codex-router-signed] # codex-router-signed-provider-managed',
        'name = "codex-router-signed"',
        '# END codex-router-managed',
        '',
        '[agents]',
        'max_depth = 2 # raised by oat',
        '',
        '[agents.oat-reviewer]',
        '# reviewer tuning',
        'description = "Reviewer" # managed',
        'config_file = "agents/oat-reviewer.toml"',
        'model = "custom" # user key',
        '',
        '[agents.oat-mapper]',
        'description = "Mapper"',
        'config_file = "agents/oat-mapper.toml"',
        '',
        '# retired role below',
        '',
        '[zeta]',
        'a = 1',
        '',
      ),
    );
    expect(result.changed).toBe(true);
    expect(result.removedRoles).toEqual(['oat-old']);
  });

  it.each([
    {
      label: 'comments and LF endings',
      existing: lines(
        '# keep me',
        '[features]',
        'multi_agent = true # on',
        '',
        '[agents]',
        'max_depth = 3',
        '[agents.oat-reviewer] # managed',
        "description = 'Reviewer'",
        'config_file = "agents/oat-reviewer.toml"',
        '',
      ),
    },
    {
      label: 'CRLF endings',
      existing:
        '[features]\r\nmulti_agent = true\r\n\r\n[agents]\r\nmax_depth = 2\r\n\r\n[agents.oat-reviewer]\r\ndescription = "Reviewer"\r\nconfig_file = "agents/oat-reviewer.toml"\r\n',
    },
    {
      label: 'no trailing newline',
      existing:
        'agents.max_depth = 2\nagents.oat-reviewer = { description = "Reviewer", config_file = "agents/oat-reviewer.toml" }\nfeatures.multi_agent = true',
    },
    {
      label: 'indented legacy output',
      existing: lines(
        '[features]',
        'multi_agent = true',
        '',
        '[agents]',
        'max_depth = 2',
        '',
        '  [agents.oat-reviewer]',
        '  description = "Reviewer"',
        '  config_file = "agents/oat-reviewer.toml"',
        '',
      ),
    },
  ])(
    'returns the input byte for byte when managed state matches ($label)',
    ({ existing }) => {
      const result = mergeCodexConfig({
        existingContent: existing,
        desiredRoles: [managedRole],
        staleManagedRoles: ['oat-absent'],
      });

      expect(result.mergedContent).toBe(existing);
      expect(result.changed).toBe(false);
      expect(result.removedRoles).toEqual([]);
    },
  );

  it.each([
    {
      label: 'top-level dotted keys',
      existing: lines(
        'features.multi_agent = false # toggled',
        'agents.max_depth = 1',
        '',
        '[zeta]',
        'a = 1',
        '',
      ),
      expected: lines(
        'features.multi_agent = true # toggled',
        'agents.max_depth = 2',
        'agents.oat-reviewer.description = "Reviewer"',
        'agents.oat-reviewer.config_file = "agents/oat-reviewer.toml"',
        '',
        '[zeta]',
        'a = 1',
        '',
      ),
    },
    {
      label: 'inline tables with a stale role',
      existing: lines(
        'features = { web_search = true }',
        'agents = { max_depth = 3, oat-old = { description = "Old" }, custom = { description = "Keep" } }',
        '',
      ),
      expected: lines(
        'features = { web_search = true, multi_agent = true }',
        'agents = { max_depth = 3, custom = { description = "Keep" }, oat-reviewer = { description = "Reviewer", config_file = "agents/oat-reviewer.toml" } }',
        '',
      ),
    },
    {
      label: 'quoted role names',
      existing: lines(
        '[features]',
        'multi_agent = true',
        '[agents]',
        'max_depth = 2',
        '[agents."oat-reviewer"] # quoted',
        "description = 'Old'",
        'extra = true',
        "[agents.'oat-old']",
        'config_file = "agents/oat-old.toml"',
        '',
      ),
      expected: lines(
        '[features]',
        'multi_agent = true',
        '[agents]',
        'max_depth = 2',
        '[agents."oat-reviewer"] # quoted',
        'description = "Reviewer"',
        'extra = true',
        'config_file = "agents/oat-reviewer.toml"',
        '',
      ),
    },
    {
      label: 'CRLF endings',
      existing: '# crlf\r\n[features]\r\nother = 1\r\n',
      expected:
        '# crlf\r\n[features]\r\nother = 1\r\nmulti_agent = true\r\n\r\n[agents]\r\nmax_depth = 2\r\n\r\n[agents.oat-reviewer]\r\ndescription = "Reviewer"\r\nconfig_file = "agents/oat-reviewer.toml"\r\n',
    },
    {
      label: 'a multiline string that contains table headers',
      existing: lines(
        'notes = """',
        '[agents]',
        'max_depth = 9',
        '[agents.oat-old]',
        '"""',
        '[agents]',
        '# depth comment',
        'max_depth = 1',
        '',
        '[agents.oat-old]',
        'description = "Old"',
        '',
      ),
      expected: lines(
        'notes = """',
        '[agents]',
        'max_depth = 9',
        '[agents.oat-old]',
        '"""',
        '[agents]',
        '# depth comment',
        'max_depth = 2',
        '',
        '[agents.oat-reviewer]',
        'description = "Reviewer"',
        'config_file = "agents/oat-reviewer.toml"',
        '',
        '[features]',
        'multi_agent = true',
        '',
      ),
    },
    {
      label: 'no trailing newline',
      existing: '[features]\nmulti_agent = true\n[agents]\nmax_depth = 2',
      expected:
        '[features]\nmulti_agent = true\n[agents]\nmax_depth = 2\n\n[agents.oat-reviewer]\ndescription = "Reviewer"\nconfig_file = "agents/oat-reviewer.toml"',
    },
    {
      label: 'a parent table defined only by its sub-tables',
      existing: lines(
        '# about custom',
        '[agents.custom]',
        'description = "Keep"',
        '',
      ),
      expected: lines(
        '[agents]',
        'max_depth = 2',
        '',
        '# about custom',
        '[agents.custom]',
        'description = "Keep"',
        '',
        '[agents.oat-reviewer]',
        'description = "Reviewer"',
        'config_file = "agents/oat-reviewer.toml"',
        '',
        '[features]',
        'multi_agent = true',
        '',
      ),
    },
    {
      label: 'a parent table whose sub-table directly follows a closing marker',
      existing: lines(
        '[features]',
        'multi_agent = true',
        '',
        '# BEGIN codex-router-managed',
        '[model_providers.codex-router] # codex-router-provider-managed',
        'name = "codex-router"',
        '# END codex-router-managed',
        '[agents.oat-reviewer]',
        'description = "Reviewer"',
        'config_file = "agents/oat-reviewer.toml"',
        '',
      ),
      expected: lines(
        '[features]',
        'multi_agent = true',
        '',
        '# BEGIN codex-router-managed',
        '[model_providers.codex-router] # codex-router-provider-managed',
        'name = "codex-router"',
        '# END codex-router-managed',
        '[agents.oat-reviewer]',
        'description = "Reviewer"',
        'config_file = "agents/oat-reviewer.toml"',
        '',
        '[agents]',
        'max_depth = 2',
        '',
      ),
    },
    {
      label:
        'a parent table whose sub-table directly follows an opening marker',
      existing: lines(
        '[features]',
        'multi_agent = true',
        '[mcp]',
        'x = 1',
        '# BEGIN codex-router-managed',
        '[agents.router]',
        'description = "r"',
        '# END codex-router-managed',
        '',
      ),
      expected: lines(
        '[features]',
        'multi_agent = true',
        '[mcp]',
        'x = 1',
        '# BEGIN codex-router-managed',
        '[agents.router]',
        'description = "r"',
        '# END codex-router-managed',
        '',
        '[agents]',
        'max_depth = 2',
        '',
        '[agents.oat-reviewer]',
        'description = "Reviewer"',
        'config_file = "agents/oat-reviewer.toml"',
        '',
      ),
    },
    {
      label: 'a new role when a closing marker leads straight into a header',
      existing: lines(
        '[features]',
        'multi_agent = true',
        '',
        '[agents]',
        'max_depth = 3',
        '',
        '# BEGIN codex-router-managed',
        '[agents.router]',
        'description = "r"',
        '# END codex-router-managed',
        '[mcp_servers.x]',
        'command = "x"',
        '',
      ),
      expected: lines(
        '[features]',
        'multi_agent = true',
        '',
        '[agents]',
        'max_depth = 3',
        '',
        '# BEGIN codex-router-managed',
        '[agents.router]',
        'description = "r"',
        '# END codex-router-managed',
        '[mcp_servers.x]',
        'command = "x"',
        '',
        '[agents.oat-reviewer]',
        'description = "Reviewer"',
        'config_file = "agents/oat-reviewer.toml"',
        '',
      ),
    },
    {
      label: 'a new role after a marker that closes the last agents table',
      existing: lines(
        '[features]',
        'multi_agent = true',
        '',
        '[agents]',
        'max_depth = 3',
        '',
        '# BEGIN codex-router-managed',
        '[agents.router]',
        'description = "r"',
        '# END codex-router-managed',
        '',
        '[mcp_servers.x]',
        'command = "x"',
        '',
      ),
      expected: lines(
        '[features]',
        'multi_agent = true',
        '',
        '[agents]',
        'max_depth = 3',
        '',
        '# BEGIN codex-router-managed',
        '[agents.router]',
        'description = "r"',
        '# END codex-router-managed',
        '',
        '[agents.oat-reviewer]',
        'description = "Reviewer"',
        'config_file = "agents/oat-reviewer.toml"',
        '',
        '[mcp_servers.x]',
        'command = "x"',
        '',
      ),
    },
    {
      label: 'a stale role written as dotted keys',
      existing: lines(
        '[features]',
        'multi_agent = true',
        '[agents]',
        'max_depth = 2',
        'oat-old.description = "Old" # managed',
        'oat-old.config_file = "agents/oat-old.toml"',
        'keep = 1',
        '',
      ),
      expected: lines(
        '[features]',
        'multi_agent = true',
        '[agents]',
        'max_depth = 2',
        'keep = 1',
        '',
        '[agents.oat-reviewer]',
        'description = "Reviewer"',
        'config_file = "agents/oat-reviewer.toml"',
        '',
      ),
    },
    {
      label: 'a stale role with a nested sub-table',
      existing: lines(
        '[agents]',
        'max_depth = 2',
        '',
        '[agents.oat-old]',
        'description = "Old"',
        '',
        '[agents.oat-old.extra]',
        'x = 1',
        '# after',
        '',
        '[features]',
        'multi_agent = true',
        '',
      ),
      expected: lines(
        '[agents]',
        'max_depth = 2',
        '',
        '[agents.oat-reviewer]',
        'description = "Reviewer"',
        'config_file = "agents/oat-reviewer.toml"',
        '',
        '# after',
        '',
        '[features]',
        'multi_agent = true',
        '',
      ),
    },
  ])('edits $label in place', ({ existing, expected }) => {
    const first = mergeCodexConfig({
      existingContent: existing,
      desiredRoles: [managedRole],
      staleManagedRoles: ['oat-old'],
    });
    const second = mergeCodexConfig({
      existingContent: first.mergedContent,
      desiredRoles: [managedRole],
      staleManagedRoles: ['oat-old'],
    });

    expect(first.mergedContent).toBe(expected);
    expect(second.changed).toBe(false);
  });

  it('round-trips descriptions that need escaping', () => {
    const description =
      'Says "hi"\\ then\nwraps\ttabs and \u0007 bell — ünïcode';
    const result = mergeCodexConfig({
      existingContent: '[features]\nmulti_agent = true # keep\n',
      desiredRoles: [{ ...managedRole, description }],
    });

    const parsed = TOML.parse(result.mergedContent) as Record<string, unknown>;
    const agents = parsed.agents as Record<string, Record<string, unknown>>;
    expect(agents['oat-reviewer']!.description).toBe(description);
    expect(result.mergedContent).toContain('multi_agent = true # keep\n');
  });

  it.each([
    { label: 'features is not a table', existing: 'features = true\n' },
    {
      label: 'agents is an array of tables',
      existing: '[[agents]]\nname = "x"\n',
    },
    {
      label: 'a managed role is not a table',
      existing: '[agents]\noat-reviewer = "x"\n',
    },
    {
      label: 'a managed key is a table',
      existing: '[features.multi_agent]\nx = 1\n',
    },
  ])('refuses to rewrite the file when $label', ({ existing }) => {
    expect(() =>
      mergeCodexConfig({
        existingContent: existing,
        desiredRoles: [managedRole],
      }),
    ).toThrow('Refusing to rewrite .codex/config.toml');
  });

  it('keeps the parse error contract for invalid TOML', () => {
    expect(() =>
      mergeCodexConfig({
        existingContent: '# comment\n[agents\nmax_depth = 2\n',
        desiredRoles: [managedRole],
      }),
    ).toThrow('Failed to parse .codex/config.toml:');
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
