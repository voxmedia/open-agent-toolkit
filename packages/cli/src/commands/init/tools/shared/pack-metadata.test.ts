import { afterEach, describe, expect, it } from 'vitest';

import { PACK_METADATA, resolvePackDefaultScope } from './skill-manifest';

describe('resolvePackDefaultScope', () => {
  const originalEntries = Object.keys(PACK_METADATA);

  afterEach(() => {
    // Remove any test-only fixture entries added during a test, while
    // preserving real entries that ship with the manifest.
    for (const key of Object.keys(PACK_METADATA)) {
      if (!originalEntries.includes(key)) {
        delete PACK_METADATA[key];
      }
    }
  });

  it("returns 'project' when pack name is absent from metadata", () => {
    expect(resolvePackDefaultScope('definitely-not-a-pack')).toBe('project');
  });

  it("returns the configured 'user' defaultScope when present", () => {
    PACK_METADATA['fixture-user-pack'] = {
      name: 'fixture-user-pack',
      defaultScope: 'user',
    };
    expect(resolvePackDefaultScope('fixture-user-pack')).toBe('user');
  });

  it("returns the configured 'project' defaultScope when present", () => {
    PACK_METADATA['fixture-project-pack'] = {
      name: 'fixture-project-pack',
      defaultScope: 'project',
    };
    expect(resolvePackDefaultScope('fixture-project-pack')).toBe('project');
  });

  it("falls back to 'project' for absent pack names even when other entries exist", () => {
    PACK_METADATA['fixture-user-pack'] = {
      name: 'fixture-user-pack',
      defaultScope: 'user',
    };
    expect(resolvePackDefaultScope('some-other-pack')).toBe('project');
  });
});

describe('PACK_METADATA', () => {
  it('contains only the registered opt-in entries', () => {
    // The mechanism is established in p01; pack registrations land in p02
    // and onward. Each opt-in must be paired with installer behavior wiring
    // in the same PR. This guards against accidental opt-ins.
    expect(Object.keys(PACK_METADATA).sort()).toEqual(['brainstorm']);
  });

  it('registers brainstorm with defaultScope=user', () => {
    expect(PACK_METADATA.brainstorm).toEqual({
      name: 'brainstorm',
      defaultScope: 'user',
    });
  });
});
