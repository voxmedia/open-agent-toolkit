import type { ProviderAdapter } from '@providers/shared/adapter.types';

export function createTestAdapter(
  overrides: Partial<ProviderAdapter> = {},
): ProviderAdapter {
  return {
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
      {
        contentType: 'agent',
        canonicalDir: '.agents/agents',
        providerDir: '.claude/agents',
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
    ...overrides,
  };
}
