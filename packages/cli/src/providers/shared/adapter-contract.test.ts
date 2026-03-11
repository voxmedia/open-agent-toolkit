import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { claudeAdapter } from '@providers/claude';
import { codexAdapter } from '@providers/codex';
import { copilotAdapter } from '@providers/copilot';
import { cursorAdapter } from '@providers/cursor';
import { geminiAdapter } from '@providers/gemini';
import { afterEach, describe, expect, it } from 'vitest';

import type { PathMapping, ProviderAdapter } from './adapter.types';

const ADAPTERS: ProviderAdapter[] = [
  claudeAdapter,
  cursorAdapter,
  codexAdapter,
  copilotAdapter,
  geminiAdapter,
];

function assertMappingsValid(
  mappings: PathMapping[],
  options: { allowAgent: boolean },
): void {
  for (const mapping of mappings) {
    const allowedTypes = options.allowAgent
      ? ['skill', 'agent', 'rule']
      : ['skill'];
    expect(allowedTypes).toContain(mapping.contentType);
    expect(mapping.canonicalDir.startsWith('.')).toBe(true);
    expect(mapping.providerDir.startsWith('.')).toBe(true);
    expect(mapping.canonicalDir).not.toContain('..');
    expect(mapping.providerDir).not.toContain('..');
    expect(mapping.canonicalDir).toMatch(/^\.agents\/(skills|agents|rules)$/);
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

      it('rule projectMappings declare transform hooks and provider extensions', () => {
        const ruleMappings = adapter.projectMappings.filter(
          (mapping) => mapping.contentType === 'rule',
        );

        for (const mapping of ruleMappings) {
          expect(mapping.providerExtension).toBeTruthy();
          expect(mapping.transformCanonical).toEqual(expect.any(Function));
          expect(mapping.parseToCanonical).toEqual(expect.any(Function));
        }
      });

      it('userMappings have valid contentType and paths', () => {
        assertMappingsValid(adapter.userMappings, { allowAgent: true });
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

        const providerRoot =
          adapter.name === 'copilot'
            ? '.github/instructions'
            : `.${adapter.name}`;
        await mkdir(join(root, providerRoot), { recursive: true });

        const detected = await adapter.detect(root);
        expect(detected).toBe(true);
      });
    });
  }
});
