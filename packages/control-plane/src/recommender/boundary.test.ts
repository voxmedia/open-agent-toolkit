import { describe, expect, it } from 'vitest';

import { detectBoundaryTier } from './boundary';

describe('detectBoundaryTier', () => {
  it('returns tier 1 when oat_status is complete', () => {
    expect(
      detectBoundaryTier(
        {
          oat_status: 'complete',
          oat_template: false,
        },
        '# Plan\n',
      ),
    ).toBe(1);
  });

  it('returns tier 2 for in-progress non-template content', () => {
    expect(
      detectBoundaryTier(
        {
          oat_status: 'in_progress',
          oat_template: false,
        },
        '# Discovery\nReady for work\n',
      ),
    ).toBe(2);
  });

  it('returns tier 3 for explicit templates', () => {
    expect(
      detectBoundaryTier(
        {
          oat_status: 'in_progress',
          oat_template: true,
        },
        '# Discovery\n',
      ),
    ).toBe(3);
  });

  it('returns tier 3 when placeholder content is present', () => {
    expect(
      detectBoundaryTier(
        {
          oat_status: 'in_progress',
        },
        '# {Project Name}\n{Clear description of the current phase}\n',
      ),
    ).toBe(3);
  });
});
