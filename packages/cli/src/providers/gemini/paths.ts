import type { PathMapping } from '@providers/shared/adapter.types';

export const GEMINI_PROJECT_MAPPINGS: PathMapping[] = [
  {
    contentType: 'skill',
    canonicalDir: '.agents/skills',
    providerDir: '.agents/skills',
    nativeRead: true,
  },
  {
    contentType: 'agent',
    canonicalDir: '.agents/agents',
    providerDir: '.agents/agents',
    nativeRead: true,
  },
];

export const GEMINI_USER_MAPPINGS: PathMapping[] = [
  {
    contentType: 'skill',
    canonicalDir: '.agents/skills',
    providerDir: '.agents/skills',
    nativeRead: true,
  },
  {
    contentType: 'agent',
    canonicalDir: '.agents/agents',
    providerDir: '.agents/agents',
    nativeRead: true,
  },
];
