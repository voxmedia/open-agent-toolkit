import { describe, expect, it, vi } from 'vitest';

import type { PathMapping, ProviderAdapter } from './adapter.types';
import {
  getAdoptionSources,
  getActiveAdapters,
  getConfigAwareAdapters,
  getSyncMappings,
} from './adapter.utils';

describe('ProviderAdapter types', () => {
  it('PathMapping has required fields', () => {
    const mapping: PathMapping = {
      contentType: 'skill',
      canonicalDir: '.agents/skills',
      providerDir: '.claude/skills',
      nativeRead: false,
    };

    expect(mapping.contentType).toBe('skill');
    expect(mapping.canonicalDir).toBe('.agents/skills');
    expect(mapping.providerDir).toBe('.claude/skills');
    expect(mapping.nativeRead).toBe(false);
  });

  it('PathMapping supports optional transform hooks for rendered content', () => {
    const mapping: PathMapping = {
      contentType: 'rule',
      canonicalDir: '.agents/rules',
      providerDir: '.cursor/rules',
      nativeRead: false,
      providerExtension: '.mdc',
      transformCanonical: (content, canonicalPath) =>
        `${canonicalPath ?? ''}\n${content}`,
      parseToCanonical: (content) => content,
    };

    expect(mapping.providerExtension).toBe('.mdc');
    expect(
      mapping.transformCanonical?.('# rule', '.agents/rules/demo.md'),
    ).toContain('.agents/rules/demo.md');
  });

  it('PathMapping supports provider-local adoption sources', () => {
    const mapping: PathMapping = {
      contentType: 'skill',
      canonicalDir: '.agents/skills',
      providerDir: '.agents/skills',
      nativeRead: true,
      adoptionSourceDirs: ['.cursor/skills'],
    };

    expect(mapping.adoptionSourceDirs).toEqual(['.cursor/skills']);
    expect(mapping.providerDir).toBe(mapping.canonicalDir);
  });

  it('ProviderAdapter has required fields', () => {
    const adapter: ProviderAdapter = {
      name: 'claude',
      displayName: 'Claude Code',
      defaultStrategy: 'symlink',
      projectMappings: [],
      userMappings: [],
      detect: async () => true,
    };

    expect(adapter.name).toBe('claude');
    expect(adapter.displayName).toBe('Claude Code');
    expect(adapter.defaultStrategy).toBe('symlink');
  });

  it('getActiveAdapters filters by detection', async () => {
    const detected = vi.fn(async () => true);
    const missing = vi.fn(async () => false);

    const adapters: ProviderAdapter[] = [
      {
        name: 'claude',
        displayName: 'Claude Code',
        defaultStrategy: 'symlink',
        projectMappings: [],
        userMappings: [],
        detect: detected,
      },
      {
        name: 'cursor',
        displayName: 'Cursor',
        defaultStrategy: 'symlink',
        projectMappings: [],
        userMappings: [],
        detect: missing,
      },
    ];

    const active = await getActiveAdapters(adapters, '/tmp/project');

    expect(active).toHaveLength(1);
    expect(active[0]?.name).toBe('claude');
    expect(detected).toHaveBeenCalledWith('/tmp/project');
    expect(missing).toHaveBeenCalledWith('/tmp/project');
  });

  it('getSyncMappings filters nativeRead entries', () => {
    const adapter: ProviderAdapter = {
      name: 'example',
      displayName: 'Example Provider',
      defaultStrategy: 'auto',
      projectMappings: [
        {
          contentType: 'skill',
          canonicalDir: '.agents/skills',
          providerDir: '.agents/skills',
          nativeRead: true,
        },
        {
          contentType: 'agent',
          canonicalDir: '.agents/agents',
          providerDir: '.example/agents',
          nativeRead: false,
        },
      ],
      userMappings: [],
      detect: async () => true,
    };

    const mappings = getSyncMappings(adapter, 'project');

    expect(mappings).toHaveLength(1);
    expect(mappings[0]?.contentType).toBe('agent');
  });

  it('getSyncMappings deduplicates mappings for all scope', () => {
    const adapter: ProviderAdapter = {
      name: 'claude',
      displayName: 'Claude Code',
      defaultStrategy: 'symlink',
      projectMappings: [
        {
          contentType: 'skill',
          canonicalDir: '.agents/skills',
          providerDir: '.claude/skills',
          nativeRead: false,
        },
      ],
      userMappings: [
        {
          contentType: 'skill',
          canonicalDir: '.agents/skills',
          providerDir: '.claude/skills',
          nativeRead: false,
        },
      ],
      detect: async () => true,
    };

    const mappings = getSyncMappings(adapter, 'all');

    expect(mappings).toHaveLength(1);
    expect(mappings[0]).toMatchObject({
      contentType: 'skill',
      canonicalDir: '.agents/skills',
      providerDir: '.claude/skills',
    });
  });

  it('getAdoptionSources uses mirrored provider directories and explicit native-read sources', () => {
    const adapter: ProviderAdapter = {
      name: 'example',
      displayName: 'Example Provider',
      defaultStrategy: 'auto',
      projectMappings: [
        {
          contentType: 'skill',
          canonicalDir: '.agents/skills',
          providerDir: '.agents/skills',
          nativeRead: true,
          adoptionSourceDirs: ['.example/skills'],
        },
        {
          contentType: 'agent',
          canonicalDir: '.agents/agents',
          providerDir: '.example/agents',
          nativeRead: false,
        },
      ],
      userMappings: [],
      detect: async () => true,
    };

    expect(getAdoptionSources(adapter, 'project')).toEqual([
      {
        contentType: 'skill',
        directory: '.example/skills',
        mapping: adapter.projectMappings[0],
      },
      {
        contentType: 'agent',
        directory: '.example/agents',
        mapping: adapter.projectMappings[1],
      },
    ]);
  });

  it('getAdoptionSources excludes native-read mappings without explicit sources and deduplicates all scope', () => {
    const sharedSkillMapping: PathMapping = {
      contentType: 'skill',
      canonicalDir: '.agents/skills',
      providerDir: '.agents/skills',
      nativeRead: true,
      adoptionSourceDirs: ['.cursor/skills'],
    };
    const adapter: ProviderAdapter = {
      name: 'cursor',
      displayName: 'Cursor',
      defaultStrategy: 'symlink',
      projectMappings: [
        sharedSkillMapping,
        {
          contentType: 'agent',
          canonicalDir: '.agents/agents',
          providerDir: '.agents/agents',
          nativeRead: true,
        },
      ],
      userMappings: [sharedSkillMapping],
      detect: async () => true,
    };

    expect(getAdoptionSources(adapter, 'all')).toEqual([
      {
        contentType: 'skill',
        directory: '.cursor/skills',
        mapping: sharedSkillMapping,
      },
    ]);
  });

  it('getConfigAwareAdapters keeps explicitly enabled provider active even when not detected', async () => {
    const adapters: ProviderAdapter[] = [
      {
        name: 'claude',
        displayName: 'Claude Code',
        defaultStrategy: 'symlink',
        projectMappings: [],
        userMappings: [],
        detect: async () => false,
      },
    ];

    const result = await getConfigAwareAdapters(adapters, '/tmp/project', {
      version: 1,
      defaultStrategy: 'auto',
      providers: {
        claude: { enabled: true },
      },
    });

    expect(result.activeAdapters.map((adapter) => adapter.name)).toEqual([
      'claude',
    ]);
    expect(result.detectedUnset).toEqual([]);
    expect(result.detectedDisabled).toEqual([]);
  });

  it('getConfigAwareAdapters excludes explicitly disabled provider and reports mismatch when detected', async () => {
    const adapters: ProviderAdapter[] = [
      {
        name: 'claude',
        displayName: 'Claude Code',
        defaultStrategy: 'symlink',
        projectMappings: [],
        userMappings: [],
        detect: async () => true,
      },
    ];

    const result = await getConfigAwareAdapters(adapters, '/tmp/project', {
      version: 1,
      defaultStrategy: 'auto',
      providers: {
        claude: { enabled: false },
      },
    });

    expect(result.activeAdapters).toEqual([]);
    expect(result.detectedDisabled).toEqual(['claude']);
    expect(result.detectedUnset).toEqual([]);
  });

  it('getConfigAwareAdapters falls back to detection for unset providers', async () => {
    const adapters: ProviderAdapter[] = [
      {
        name: 'claude',
        displayName: 'Claude Code',
        defaultStrategy: 'symlink',
        projectMappings: [],
        userMappings: [],
        detect: async () => true,
      },
      {
        name: 'cursor',
        displayName: 'Cursor',
        defaultStrategy: 'symlink',
        projectMappings: [],
        userMappings: [],
        detect: async () => false,
      },
    ];

    const result = await getConfigAwareAdapters(adapters, '/tmp/project', {
      version: 1,
      defaultStrategy: 'auto',
      providers: {},
    });

    expect(result.activeAdapters.map((adapter) => adapter.name)).toEqual([
      'claude',
    ]);
    expect(result.detectedUnset).toEqual(['claude']);
    expect(result.detectedDisabled).toEqual([]);
  });
});
