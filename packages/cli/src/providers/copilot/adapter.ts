import { access } from 'node:fs/promises';
import { join } from 'node:path';

import type { ProviderAdapter } from '@providers/shared/adapter.types';

import { COPILOT_PROJECT_MAPPINGS, COPILOT_USER_MAPPINGS } from './paths';

async function detectCopilot(scopeRoot: string): Promise<boolean> {
  const markers = [
    join(scopeRoot, '.copilot'),
    join(scopeRoot, '.github', 'copilot-instructions.md'),
    join(scopeRoot, '.github', 'agents'),
    join(scopeRoot, '.github', 'skills'),
  ];

  for (const marker of markers) {
    try {
      await access(marker);
      return true;
    } catch {
      // continue to next marker
    }
  }

  return false;
}

export const copilotAdapter: ProviderAdapter = {
  name: 'copilot',
  displayName: 'GitHub Copilot',
  defaultStrategy: 'symlink',
  projectMappings: COPILOT_PROJECT_MAPPINGS,
  userMappings: COPILOT_USER_MAPPINGS,
  detect: detectCopilot,
};
