import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { claudeAdapter } from '../claude';
import { codexAdapter } from '../codex';
import { cursorAdapter } from '../cursor';
import type { PathMapping, ProviderAdapter } from './adapter.types';

const ADAPTERS: ProviderAdapter[] = [
  claudeAdapter,
  cursorAdapter,
  codexAdapter,
];

function assertMappingsValid(
  mappings: PathMapping[],
  options: { allowAgent: boolean },
): void {
  for (const mapping of mappings) {
    const allowedTypes = options.allowAgent ? ['skill', 'agent'] : ['skill'];
    expect(allowedTypes).toContain(mapping.contentType);
    expect(mapping.canonicalDir.startsWith('.')).toBe(true);
    expect(mapping.providerDir.startsWith('.')).toBe(true);
    expect(mapping.canonicalDir).not.toContain('..');
    expect(mapping.providerDir).not.toContain('..');
    expect(mapping.canonicalDir).toMatch(/^\.agents\/(skills|agents)$/);
    if (mapping.nativeRead) {
      expect(mapping.providerDir).toBe(mapping.canonicalDir);
    }
  }
}

describe('adapter contract', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  for (const adapter of ADAPTERS) {
    describe(adapter.displayName, () => {
      it('has a non-empty name', () => {
        expect(adapter.name).toBeTruthy();
      });

      it('has a non-empty displayName', () => {
        expect(adapter.displayName).toBeTruthy();
      });

      it('has valid defaultStrategy', () => {
        expect(['auto', 'symlink', 'copy']).toContain(adapter.defaultStrategy);
      });

      it('projectMappings have valid contentType and paths', () => {
        assertMappingsValid(adapter.projectMappings, { allowAgent: true });
      });

      it('userMappings have valid contentType and paths', () => {
        assertMappingsValid(adapter.userMappings, { allowAgent: false });
      });

      it('detect function is callable', async () => {
        const root = await mkdtemp(join(tmpdir(), 'oat-adapter-contract-'));
        tempDirs.push(root);

        const detected = await adapter.detect(root);
        expect(typeof detected).toBe('boolean');
      });

      it('detect returns true when provider root exists', async () => {
        const root = await mkdtemp(join(tmpdir(), 'oat-adapter-contract-'));
        tempDirs.push(root);

        const providerRoot = `.${adapter.name}`;
        await mkdir(join(root, providerRoot), { recursive: true });

        const detected = await adapter.detect(root);
        expect(detected).toBe(true);
      });
    });
  }
});
