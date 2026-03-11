import { describe, expect, it } from 'vitest';

import { ManifestSchema } from './manifest.types';

const validManifest = {
  version: 1,
  oatVersion: '0.1.0',
  entries: [
    {
      canonicalPath: '.agents/skills/example',
      providerPath: '.claude/skills/example',
      provider: 'claude',
      contentType: 'skill',
      strategy: 'symlink',
      contentHash: null,
      lastSynced: '2026-02-13T00:00:00.000Z',
    },
  ],
  lastUpdated: '2026-02-13T00:00:00.000Z',
};

describe('manifest schema', () => {
  it('validates a well-formed manifest', () => {
    expect(ManifestSchema.safeParse(validManifest).success).toBe(true);
  });

  it('rejects manifest with unknown version', () => {
    const candidate = { ...validManifest, version: 2 };

    expect(ManifestSchema.safeParse(candidate).success).toBe(false);
  });

  it('rejects entry with missing canonicalPath', () => {
    const candidate = {
      ...validManifest,
      entries: [
        {
          ...validManifest.entries[0],
          canonicalPath: '',
        },
      ],
    };

    expect(ManifestSchema.safeParse(candidate).success).toBe(false);
  });

  it('rejects entry where copy strategy has null contentHash', () => {
    const candidate = {
      ...validManifest,
      entries: [
        {
          ...validManifest.entries[0],
          strategy: 'copy',
          contentHash: null,
        },
      ],
    };

    expect(ManifestSchema.safeParse(candidate).success).toBe(false);
  });

  it('rejects duplicate (canonicalPath, provider) pairs', () => {
    const duplicate = validManifest.entries[0];
    const candidate = {
      ...validManifest,
      entries: [
        duplicate,
        { ...duplicate, providerPath: '.claude/skills/other' },
      ],
    };

    expect(ManifestSchema.safeParse(candidate).success).toBe(false);
  });

  it('accepts empty entries array', () => {
    const candidate = { ...validManifest, entries: [] };

    expect(ManifestSchema.safeParse(candidate).success).toBe(true);
  });

  it('accepts copy-mode rule file entries with content hashes', () => {
    const candidate = {
      ...validManifest,
      entries: [
        {
          canonicalPath: '.agents/rules/react-components.md',
          providerPath: '.cursor/rules/react-components.mdc',
          provider: 'cursor',
          contentType: 'rule',
          strategy: 'copy',
          contentHash: 'abcd1234',
          isFile: true,
          lastSynced: '2026-02-13T00:00:00.000Z',
        },
      ],
    };

    expect(ManifestSchema.safeParse(candidate).success).toBe(true);
  });
});
