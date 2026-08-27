import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  hasScopedPackOwnershipEvidence,
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

  it('infers legacy physical installs without mutating config', async () => {
    const scopeRoot = await makeScopeRoot();
    const skillPath = join(scopeRoot, '.agents', 'skills', 'oat-project-new');
    await mkdir(skillPath, { recursive: true });

    await expect(
      readScopedPackIntent({ pack: 'workflows', scope: 'project', scopeRoot }),
    ).resolves.toMatchObject({ enabled: true, source: 'inferred-legacy' });
    await expect(
      readFile(join(scopeRoot, '.oat', 'config.json'), 'utf8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('treats legacy false as absent and diagnoses physical conflicts', async () => {
    const scopeRoot = await makeScopeRoot();
    const configPath = join(scopeRoot, '.oat', 'config.json');
    const rawConfig = JSON.stringify({
      version: 1,
      tools: { workflows: false },
    });
    await writeFile(configPath, rawConfig);
    await mkdir(join(scopeRoot, '.agents', 'skills', 'oat-project-new'), {
      recursive: true,
    });

    await expect(
      readScopedPackIntent({ pack: 'workflows', scope: 'project', scopeRoot }),
    ).resolves.toMatchObject({
      enabled: true,
      source: 'inferred-legacy',
      diagnostics: [{ code: 'legacy-false-conflict' }],
    });
    await expect(readFile(configPath, 'utf8')).resolves.toBe(rawConfig);
  });

  it('keeps explicit true intent when every managed asset is missing', async () => {
    const scopeRoot = await makeScopeRoot();
    await writeFile(
      join(scopeRoot, '.oat', 'config.json'),
      JSON.stringify({ version: 1, tools: { workflows: true } }),
    );

    await expect(
      readScopedPackIntent({ pack: 'workflows', scope: 'project', scopeRoot }),
    ).resolves.toMatchObject({ enabled: true, source: 'declared' });
  });

  it('does not treat a shared asset as legacy ownership evidence', async () => {
    const scopeRoot = await makeScopeRoot();
    const sharedScript = join(
      scopeRoot,
      '.oat',
      'scripts',
      'resolve-tracking.sh',
    );
    await mkdir(join(scopeRoot, '.oat', 'scripts'), { recursive: true });
    await writeFile(sharedScript, '#!/bin/sh\n');

    await expect(
      hasScopedPackOwnershipEvidence({
        pack: 'docs',
        scope: 'user',
        scopeRoot,
      }),
    ).resolves.toBe(false);
    await expect(
      hasScopedPackOwnershipEvidence({
        pack: 'workflows',
        scope: 'user',
        scopeRoot,
      }),
    ).resolves.toBe(false);
  });

  it('accepts declared intent or a non-shared physical managed asset', async () => {
    const scopeRoot = await makeScopeRoot();
    await writeScopedPackIntent({
      pack: 'docs',
      scope: 'user',
      scopeRoot,
      enabled: true,
    });
    await mkdir(join(scopeRoot, '.agents', 'skills', 'oat-project-implement'), {
      recursive: true,
    });

    await expect(
      hasScopedPackOwnershipEvidence({
        pack: 'docs',
        scope: 'user',
        scopeRoot,
      }),
    ).resolves.toBe(true);
    await expect(
      hasScopedPackOwnershipEvidence({
        pack: 'workflows',
        scope: 'user',
        scopeRoot,
      }),
    ).resolves.toBe(true);
  });
});
