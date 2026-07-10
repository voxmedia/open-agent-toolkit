import { describe, expect, it } from 'vitest';

import {
  SUPPORTED_CODEX_BASE_ROLES,
  SUPPORTED_CODEX_ROLE_TARGETS,
  expandSupportedCodexRoleCatalogue,
  isSupportedCodexRoleTarget,
} from './catalog';

describe('supported Codex role catalogue', () => {
  it('contains the exact immutable 13-target product set', () => {
    expect(SUPPORTED_CODEX_ROLE_TARGETS).toEqual([
      { model: 'gpt-5.6-luna', effort: 'low' },
      { model: 'gpt-5.6-luna', effort: 'medium' },
      { model: 'gpt-5.6-luna', effort: 'high' },
      { model: 'gpt-5.6-luna', effort: 'xhigh' },
      { model: 'gpt-5.6-terra', effort: 'low' },
      { model: 'gpt-5.6-terra', effort: 'medium' },
      { model: 'gpt-5.6-terra', effort: 'high' },
      { model: 'gpt-5.6-terra', effort: 'xhigh' },
      { model: 'gpt-5.6-sol', effort: 'low' },
      { model: 'gpt-5.6-sol', effort: 'medium' },
      { model: 'gpt-5.6-sol', effort: 'high' },
      { model: 'gpt-5.6-sol', effort: 'xhigh' },
      { model: 'gpt-5.6-sol', effort: 'max' },
    ]);
    expect(SUPPORTED_CODEX_BASE_ROLES).toEqual([
      'oat-phase-implementer',
      'oat-reviewer',
    ]);
  });

  it('expands deterministically to exactly 26 unique pinned variants', () => {
    const catalogue = expandSupportedCodexRoleCatalogue();
    const roleNames = catalogue.map((entry) => entry.roleName);

    expect(catalogue).toHaveLength(26);
    expect(new Set(roleNames)).toHaveLength(26);
    expect(roleNames).toEqual([...roleNames].sort());
    expect(roleNames).toContain('oat-phase-implementer-gpt-5-6-sol-max');
    expect(roleNames).toContain('oat-reviewer-gpt-5-6-sol-max');
    expect(roleNames.some((name) => name.includes('luna-max'))).toBe(false);
    expect(roleNames.some((name) => name.includes('terra-max'))).toBe(false);
  });

  it('recognizes supported targets without accepting near misses', () => {
    expect(
      isSupportedCodexRoleTarget({ model: 'gpt-5.6-sol', effort: 'max' }),
    ).toBe(true);
    expect(
      isSupportedCodexRoleTarget({ model: 'gpt-5.6-terra', effort: 'max' }),
    ).toBe(false);
    expect(
      isSupportedCodexRoleTarget({
        model: 'gpt-5.6-sol-preview',
        effort: 'max',
      }),
    ).toBe(false);
  });
});
