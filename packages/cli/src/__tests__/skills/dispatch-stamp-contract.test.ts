import { describe, expect, it } from 'vitest';

import { expectDispatchStampFieldContract } from './dispatch-stamp-contract';

/**
 * Negative-fixture suite for the shared dispatch-stamp prose contract.
 *
 * The three skill-contract suites call `expectDispatchStampFieldContract`
 * against live canonical skills, so a vacuous helper would let all three pass
 * while the guidance regressed. These fixtures pin the exact contradictions the
 * helper must reject.
 */

const COMPLIANT_CONTRACT = [
  'Require `dispatchReport.schemaVersion: 1`. Take the formal compatibility',
  "line directly from the same response's additive `dispatchStamp` field: it",
  'must be a non-empty string beginning with the canonical `Dispatch:` prefix.',
  'Copy that returned value byte-for-byte into the review dispatch audit',
  'metadata. Reformatting the report through `formatDispatchStamp(dispatchReport)`',
  '/ `toDispatchStampRecord(dispatchReport)` is an optional corroboration where',
  'that library is already loaded; it is never the normal path and never a',
  'substitute for the returned field, and no out-of-tree shim is required. Do',
  'not hand-assemble `Dispatch:` fields from a role name or model string. If',
  '`dispatchStamp` is absent or lacks the canonical prefix on a report-bearing',
  'response, stop and report instead of reconstructing it.',
].join('\n');

function withoutContractParagraph(): string {
  return [
    'Require `dispatchReport.schemaVersion: 1`. Derive the formal compatibility',
    'line only with `formatDispatchStamp(dispatchReport)` /',
    '`toDispatchStampRecord(dispatchReport)`. Include that derived line in the',
    'review dispatch audit metadata.',
  ].join('\n');
}

describe('expectDispatchStampFieldContract', () => {
  it('accepts the canonical field-based contract', () => {
    expect(() =>
      expectDispatchStampFieldContract(COMPLIANT_CONTRACT, 'fixture'),
    ).not.toThrow();
  });

  it('rejects prose that never states the returned-field contract', () => {
    expect(() =>
      expectDispatchStampFieldContract(withoutContractParagraph(), 'fixture'),
    ).toThrow(/dispatch stamp contract paragraph/);
  });

  it('rejects a negated byte-for-byte copy instruction', () => {
    const negated = COMPLIANT_CONTRACT.replace(
      'Copy that returned value byte-for-byte',
      'Do not copy that returned value byte-for-byte',
    );
    expect(negated).not.toBe(COMPLIANT_CONTRACT);
    expect(() => expectDispatchStampFieldContract(negated, 'fixture')).toThrow(
      /copy clause is not negated/,
    );
  });

  it('rejects prose that permits hand-assembling the stamp', () => {
    const permissive = `${COMPLIANT_CONTRACT}\n\nA caller with no resolver access is permitted to hand-assemble the line.`;
    expect(() =>
      expectDispatchStampFieldContract(permissive, 'fixture'),
    ).toThrow(/no hand-assembly permission/);
  });

  it('rejects prose that keeps the shim as the only derivation route', () => {
    const shimOnly = `${COMPLIANT_CONTRACT}\n\nDerive the formal compatibility line only through \`formatDispatchStamp(dispatchReport)\`.`;
    expect(() => expectDispatchStampFieldContract(shimOnly, 'fixture')).toThrow(
      /no shim-only derivation/,
    );
  });

  it('rejects prose that drops the fail-closed clause', () => {
    const withoutStop = COMPLIANT_CONTRACT.replace(
      /If\n`dispatchStamp` is absent[\s\S]*$/,
      '',
    );
    expect(withoutStop).not.toBe(COMPLIANT_CONTRACT);
    expect(() =>
      expectDispatchStampFieldContract(withoutStop, 'fixture'),
    ).toThrow(/missing stamp stops/);
  });

  it('rejects prose that makes the shim the normal path', () => {
    const requiredShim = COMPLIANT_CONTRACT.replace(
      'is an optional corroboration where',
      'is the required derivation route where',
    );
    expect(requiredShim).not.toBe(COMPLIANT_CONTRACT);
    expect(() =>
      expectDispatchStampFieldContract(requiredShim, 'fixture'),
    ).toThrow(/shim is optional corroboration only/);
  });
});
