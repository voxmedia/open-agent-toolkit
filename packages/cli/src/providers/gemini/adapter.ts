import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProviderAdapter } from '@providers/shared/adapter.types';
import { GEMINI_PROJECT_MAPPINGS, GEMINI_USER_MAPPINGS } from './paths';

async function detectGemini(scopeRoot: string): Promise<boolean> {
  try {
    await access(join(scopeRoot, '.gemini'));
    return true;
  } catch {
    return false;
  }
}

export const geminiAdapter: ProviderAdapter = {
  name: 'gemini',
  displayName: 'Gemini CLI',
  defaultStrategy: 'auto',
  projectMappings: GEMINI_PROJECT_MAPPINGS,
  userMappings: GEMINI_USER_MAPPINGS,
  detect: detectGemini,
};
