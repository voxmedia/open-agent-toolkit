import type { PathMapping } from '../shared/adapter.types';

export const CURSOR_PROJECT_MAPPINGS: PathMapping[] = [
  {
    contentType: 'skill',
    canonicalDir: '.agents/skills',
    providerDir: '.cursor/skills',
    nativeRead: false,
  },
  {
    contentType: 'agent',
    canonicalDir: '.agents/agents',
    providerDir: '.cursor/agents',
    nativeRead: false,
  },
];

export const CURSOR_USER_MAPPINGS: PathMapping[] = [
  {
    contentType: 'skill',
    canonicalDir: '.agents/skills',
    providerDir: '.cursor/skills',
    nativeRead: false,
  },
];
