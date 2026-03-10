import { access } from 'node:fs/promises';
import { join } from 'node:path';

import type { ProviderAdapter } from '@providers/shared/adapter.types';

import { CODEX_PROJECT_MAPPINGS, CODEX_USER_MAPPINGS } from './paths';

async function detectCodex(scopeRoot: string): Promise<boolean> {
  try {
    await access(join(scopeRoot, '.codex'));
    return true;
  } catch {
    return false;
  }
}

export const codexAdapter: ProviderAdapter = {
  name: 'codex',
  displayName: 'Codex CLI',
  defaultStrategy: 'auto',
  projectMappings: CODEX_PROJECT_MAPPINGS,
  userMappings: CODEX_USER_MAPPINGS,
  detect: detectCodex,
};
