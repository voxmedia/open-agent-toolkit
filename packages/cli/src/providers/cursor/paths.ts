import type { PathMapping } from '@providers/shared/adapter.types';

import {
  parseCursorRuleToCanonical,
  transformCanonicalToCursorRule,
} from './rule-transform';

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
  {
    contentType: 'rule',
    canonicalDir: '.agents/rules',
    providerDir: '.cursor/rules',
    nativeRead: false,
    providerExtension: '.mdc',
    transformCanonical: transformCanonicalToCursorRule,
    parseToCanonical: parseCursorRuleToCanonical,
  },
];

export const CURSOR_USER_MAPPINGS: PathMapping[] = [
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
