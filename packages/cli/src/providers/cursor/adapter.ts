import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProviderAdapter } from '../shared/adapter.types';
import { CURSOR_PROJECT_MAPPINGS, CURSOR_USER_MAPPINGS } from './paths';

async function detectCursor(scopeRoot: string): Promise<boolean> {
  try {
    await access(join(scopeRoot, '.cursor'));
    return true;
  } catch {
    return false;
  }
}

export const cursorAdapter: ProviderAdapter = {
  name: 'cursor',
  displayName: 'Cursor',
  defaultStrategy: 'symlink',
  projectMappings: CURSOR_PROJECT_MAPPINGS,
  userMappings: CURSOR_USER_MAPPINGS,
  detect: detectCursor,
};
