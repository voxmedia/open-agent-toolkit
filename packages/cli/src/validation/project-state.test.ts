import { describe, expect, it } from 'vitest';

import {
  assertValidProjectStateContent,
  validateProjectState,
} from './project-state';

describe('validateProjectState - coordination additions', () => {
  it('accepts oat_kind: coordination on a project state', () => {
    expect(
      validateProjectState({
        frontmatter: {
          oat_kind: 'coordination',
          oat_phase: 'discovery',
          oat_phase_status: 'in_progress',
        },
      }),
    ).toMatchObject({ ok: true });
  });

  it('accepts oat_phase: decomposition only when oat_kind == coordination', () => {
    expect(
      validateProjectState({
        frontmatter: {
          oat_kind: 'coordination',
          oat_phase: 'decomposition',
          oat_phase_status: 'complete',
        },
      }),
    ).toMatchObject({ ok: true });
  });

  it('rejects oat_phase: decomposition on an implementation project', () => {
    const result = validateProjectState({
      frontmatter: {
        oat_kind: 'implementation',
        oat_phase: 'decomposition',
        oat_phase_status: 'complete',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'decomposition-requires-coordination',
      }),
    ]);
  });

  it('defaults oat_kind to implementation when absent', () => {
    const result = validateProjectState({
      frontmatter: {
        oat_phase: 'discovery',
        oat_phase_status: 'in_progress',
      },
    });

    expect(result).toMatchObject({
      ok: true,
      state: {
        oat_kind: 'implementation',
      },
    });
  });

  it('throws a readable error when state.md content violates coordination rules', () => {
    const content = [
      '---',
      'oat_phase: decomposition',
      'oat_phase_status: complete',
      '---',
      '',
      '# State',
    ].join('\n');

    expect(() =>
      assertValidProjectStateContent(content, { filePath: 'state.md' }),
    ).toThrow(/oat_phase: decomposition requires oat_kind: coordination/);
  });
});
