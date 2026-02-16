import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProviderAdapter } from '@providers/shared/adapter.types';
import { CLAUDE_PROJECT_MAPPINGS, CLAUDE_USER_MAPPINGS } from './paths';

async function detectClaude(scopeRoot: string): Promise<boolean> {
  try {
    await access(join(scopeRoot, '.claude'));
    return true;
  } catch {
    return false;
  }
}

export const claudeAdapter: ProviderAdapter = {
  name: 'claude',
  displayName: 'Claude Code',
  defaultStrategy: 'symlink',
  projectMappings: CLAUDE_PROJECT_MAPPINGS,
  userMappings: CLAUDE_USER_MAPPINGS,
  detect: detectClaude,
};
