import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '../../../..');
const GUIDANCE_FILES = [
  '.github/PULL_REQUEST_TEMPLATE.md',
  'apps/oat-docs/docs/contributing/code.md',
] as const;

describe('breaking CLI grammar release guidance', () => {
  it.each(GUIDANCE_FILES)(
    '%s requires a visible callout and actionable migration',
    (relativePath) => {
      const content = readFileSync(join(REPO_ROOT, relativePath), 'utf8');

      expect(content).toContain('Breaking CLI grammar changes');
      expect(content).toMatch(/Before:\*{0,2}\s+`[^`]+`/);
      expect(content).toMatch(/After:\*{0,2}\s+`[^`]+`/);
      expect(content).toMatch(/Migration action:\*{0,2}\s+\S/);
      expect(content).toMatch(/BREAKING:/);
      expect(content).toMatch(/release notes/i);
    },
  );
});
