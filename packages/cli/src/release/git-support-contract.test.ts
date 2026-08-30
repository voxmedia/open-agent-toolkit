import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const cliPackagePath = fileURLToPath(
  new URL('../../package.json', import.meta.url),
);
const quickstartPath = fileURLToPath(
  new URL('../../../../apps/oat-docs/docs/quickstart.md', import.meta.url),
);
const hookSourcePath = fileURLToPath(
  new URL('../engine/hook.ts', import.meta.url),
);

describe('runtime support contract', () => {
  it('keeps the documented Git floor aligned with executable usage', async () => {
    const [packageJsonText, quickstart, hookSource] = await Promise.all([
      readFile(cliPackagePath, 'utf8'),
      readFile(quickstartPath, 'utf8'),
      readFile(hookSourcePath, 'utf8'),
    ]);
    const packageJson = JSON.parse(packageJsonText) as {
      engines?: { node?: string };
    };

    expect(packageJson.engines?.node).toBe('>=22.17.0');
    expect(quickstart).toContain('Git 2.31 or newer');
    expect(quickstart).toContain('does not run an up-front Git version check');
    expect(hookSource).toContain("'--path-format=absolute'");
  });
});
