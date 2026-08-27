import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  readScopedPackIntent,
  writeScopedPackIntent,
} from './scoped-pack-intent';

const tempDirs: string[] = [];

async function makeScopeRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oat-pack-intent-'));
  tempDirs.push(root);
  await mkdir(join(root, '.oat'), { recursive: true });
  return root;
}

describe('scoped pack intent', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('reads only the concrete project config layer', async () => {
    const scopeRoot = await makeScopeRoot();
    await writeFile(
      join(scopeRoot, '.oat', 'config.local.json'),
      JSON.stringify({ tools: { workflows: true } }),
    );

    await expect(
      readScopedPackIntent({ pack: 'workflows', scope: 'project', scopeRoot }),
    ).resolves.toMatchObject({
      enabled: false,
      source: 'none',
      configPath: join(scopeRoot, '.oat', 'config.json'),
    });

    await writeFile(
      join(scopeRoot, '.oat', 'config.json'),
      JSON.stringify({ version: 1, tools: { workflows: true } }),
    );
    await expect(
      readScopedPackIntent({ pack: 'workflows', scope: 'project', scopeRoot }),
    ).resolves.toMatchObject({ enabled: true, source: 'declared' });
  });

  it('reads and writes user intent without losing unrelated settings', async () => {
    const scopeRoot = await makeScopeRoot();
    const configPath = join(scopeRoot, '.oat', 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        updateNotifications: false,
        futureField: { retained: true },
        tools: { docs: true },
      }),
    );

    await writeScopedPackIntent({
      pack: 'research',
      scope: 'user',
      scopeRoot,
      enabled: true,
    });
    await expect(
      readScopedPackIntent({ pack: 'research', scope: 'user', scopeRoot }),
    ).resolves.toMatchObject({ enabled: true, source: 'declared', configPath });
    expect(JSON.parse(await readFile(configPath, 'utf8'))).toEqual({
      version: 1,
      updateNotifications: false,
      tools: { docs: true, research: true },
      futureField: { retained: true },
    });

    await writeScopedPackIntent({
      pack: 'research',
      scope: 'user',
      scopeRoot,
      enabled: false,
    });
    expect(JSON.parse(await readFile(configPath, 'utf8'))).toMatchObject({
      tools: { docs: true },
      futureField: { retained: true },
    });
  });

  it('writes true and deletes only the selected project key on removal', async () => {
    const scopeRoot = await makeScopeRoot();
    await writeScopedPackIntent({
      pack: 'ideas',
      scope: 'project',
      scopeRoot,
      enabled: true,
    });
    await writeScopedPackIntent({
      pack: 'docs',
      scope: 'project',
      scopeRoot,
      enabled: true,
    });
    await writeScopedPackIntent({
      pack: 'ideas',
      scope: 'project',
      scopeRoot,
      enabled: false,
    });

    expect(
      JSON.parse(
        await readFile(join(scopeRoot, '.oat', 'config.json'), 'utf8'),
      ),
    ).toEqual({ version: 1, tools: { docs: true } });
  });
});
