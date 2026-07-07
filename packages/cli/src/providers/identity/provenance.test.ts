import { describe, expect, it } from 'vitest';

import { resolveIdentityConfidence } from './provenance';

describe('resolveIdentityConfidence', () => {
  it('resolves declared plus matching observed identity as high confidence', () => {
    expect(
      resolveIdentityConfidence([
        { value: 'composer-2.5', provenance: 'declared' },
        { value: 'composer-2.5', provenance: 'observed' },
      ]),
    ).toMatchObject({
      value: 'composer-2.5',
      provenance: 'declared',
      confidence: 'high',
      mismatch: false,
      diversityClaimable: true,
    });
  });

  it('promotes uncorroborated declarations only for reject-on-invalid harnesses', () => {
    expect(
      resolveIdentityConfidence([
        {
          value: 'composer-2.5',
          provenance: 'declared',
          rejectOnInvalid: true,
        },
      ]),
    ).toMatchObject({
      value: 'composer-2.5',
      confidence: 'high',
      diversityClaimable: true,
    });

    expect(
      resolveIdentityConfidence([
        { value: 'composer-2.5', provenance: 'declared' },
      ]),
    ).toMatchObject({
      value: 'composer-2.5',
      confidence: 'medium',
      diversityClaimable: true,
    });
  });

  it('uses observed identity on declared/observed mismatch', () => {
    expect(
      resolveIdentityConfidence([
        { value: 'composer-2.5', provenance: 'declared' },
        { value: 'gpt-5.5-high', provenance: 'observed' },
      ]),
    ).toMatchObject({
      value: 'gpt-5.5-high',
      provenance: 'observed',
      confidence: 'low',
      mismatch: true,
      diversityClaimable: true,
    });
  });

  it.each(['observed', 'inferred'] as const)(
    'treats %s identity alone as low confidence',
    (provenance) => {
      expect(
        resolveIdentityConfidence([{ value: 'composer-2.5', provenance }]),
      ).toMatchObject({
        value: 'composer-2.5',
        provenance,
        confidence: 'low',
        mismatch: false,
        diversityClaimable: true,
      });
    },
  );

  it('marks unknown identity as not diversity-claimable', () => {
    expect(
      resolveIdentityConfidence([{ value: 'unknown', provenance: 'unknown' }]),
    ).toMatchObject({
      value: 'unknown',
      provenance: 'unknown',
      confidence: 'unknown',
      mismatch: false,
      diversityClaimable: false,
    });
  });
});
