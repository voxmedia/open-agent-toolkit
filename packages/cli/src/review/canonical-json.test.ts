import { describe, expect, it } from 'vitest';

import {
  canonicalizeJson,
  hashCanonicalJson,
  parseStrictJson,
} from './canonical-json';

describe('canonical review JSON', () => {
  it('is independent of object key order with stable SHA-256 output', () => {
    expect(canonicalizeJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(hashCanonicalJson({ b: 2, a: 1 })).toBe(
      '43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777',
    );
    expect(hashCanonicalJson({ a: 1, b: 2 })).toBe(
      hashCanonicalJson({ b: 2, a: 1 }),
    );
  });

  it('excludes only declared top-level digest and lifecycle timestamps', () => {
    const value = {
      runId: 'run',
      preparationDigest: 'self',
      createdAt: 'now',
      nested: { createdAt: 'retained' },
    };
    expect(
      canonicalizeJson(value, {
        excludeTopLevelKeys: ['preparationDigest', 'createdAt'],
      }),
    ).toBe('{"nested":{"createdAt":"retained"},"runId":"run"}');
  });

  it('includes telemetry evidence in hashes', () => {
    expect(hashCanonicalJson({ telemetryEvidenceDigest: 'one' })).not.toBe(
      hashCanonicalJson({ telemetryEvidenceDigest: 'two' }),
    );
  });

  it('rejects duplicate keys in strict JSON text', () => {
    expect(() => canonicalizeJson('{"a":1,"a":2}', { jsonText: true })).toThrow(
      /duplicate/,
    );
  });

  it('exposes a strict parser that rejects duplicate keys and trailing values', () => {
    expect(parseStrictJson('{"a":1}')).toEqual({ a: 1 });
    expect(() => parseStrictJson('{"a":1,"a":1}')).toThrow(/duplicate/);
    expect(() =>
      parseStrictJson(
        '{"action":"validate","plan":{"runId":"one","runId":"two"}}',
      ),
    ).toThrow(/duplicate/);
    expect(() => parseStrictJson('{"a":1} true')).toThrow(/strict JSON/);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, undefined, () => undefined])(
    'rejects non-JSON value %s',
    (value) => expect(() => canonicalizeJson(value)).toThrow(),
  );
});
