import type { PathMapping } from '../shared/adapter.types';

export const CODEX_PROJECT_MAPPINGS: PathMapping[] = [
  {
    contentType: 'skill',
    canonicalDir: '.agents/skills',
    providerDir: '.agents/skills',
    nativeRead: true,
  },
  {
    contentType: 'agent',
    canonicalDir: '.agents/agents',
    providerDir: '.codex/agents',
    nativeRead: false,
  },
];

export const CODEX_USER_MAPPINGS: PathMapping[] = [
  {
    contentType: 'skill',
    canonicalDir: '.agents/skills',
    providerDir: '.agents/skills',
    nativeRead: true,
  },
];
