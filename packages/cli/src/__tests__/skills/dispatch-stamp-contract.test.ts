import { describe, expect, it } from 'vitest';

import { expectDispatchStampFieldContract } from './dispatch-stamp-contract';

/**
 * Negative-fixture suite for the shared dispatch-stamp prose contract.
 *
 * The three skill-contract suites call `expectDispatchStampFieldContract`
 * against live canonical skills, so a vacuous helper would let all three pass
 * while the guidance regressed. These fixtures pin the exact contradictions the
 * helper must reject, including the two weakening vectors an independent review
 * demonstrated against the first version of the helper on 2026-09-06.
 */

const SURFACE = 'oat-project-review-provide';
const OWNING_SECTION = '**Step 6.0: Resolve the managed reviewer target**';

const CONTRACT_PARAGRAPH = [
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

const COMPLIANT_CONTRACT = `${OWNING_SECTION}\n\n${CONTRACT_PARAGRAPH}`;

describe('expectDispatchStampFieldContract', () => {
  it('accepts the canonical field-based contract', () => {
    expect(() =>
      expectDispatchStampFieldContract(COMPLIANT_CONTRACT, SURFACE),
    ).not.toThrow();
  });

  it('fails closed for a surface with no registered owning section', () => {
    expect(() =>
      expectDispatchStampFieldContract(COMPLIANT_CONTRACT, 'oat-project-plan'),
    ).toThrow(/No dispatch-stamp owning section registered/);
  });

  it('rejects prose that never states the returned-field contract', () => {
    const shimOnly = [
      OWNING_SECTION,
      '',
      'Require `dispatchReport.schemaVersion: 1`. Derive the formal compatibility',
      'line only with `formatDispatchStamp(dispatchReport)` /',
      '`toDispatchStampRecord(dispatchReport)`. Include that derived line in the',
      'review dispatch audit metadata.',
    ].join('\n');
    expect(() => expectDispatchStampFieldContract(shimOnly, SURFACE)).toThrow(
      /dispatch stamp contract paragraph/,
    );
  });

  it('rejects a negated byte-for-byte copy instruction', () => {
    const negated = COMPLIANT_CONTRACT.replace(
      'Copy that returned value byte-for-byte',
      'Do not copy that returned value byte-for-byte',
    );
    expect(negated).not.toBe(COMPLIANT_CONTRACT);
    expect(() => expectDispatchStampFieldContract(negated, SURFACE)).toThrow(
      /copy clause is not negated/,
    );
  });

  it('rejects prose that permits hand-assembling the stamp', () => {
    const permissive = `${COMPLIANT_CONTRACT}\n\nA caller with no resolver access is permitted to hand-assemble the line.`;
    expect(() => expectDispatchStampFieldContract(permissive, SURFACE)).toThrow(
      /no hand-assembly permission/,
    );
  });

  it('rejects prose that keeps the shim as the only derivation route', () => {
    const shimOnly = `${COMPLIANT_CONTRACT}\n\nDerive the formal compatibility line only through \`formatDispatchStamp(dispatchReport)\`.`;
    expect(() => expectDispatchStampFieldContract(shimOnly, SURFACE)).toThrow(
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
      expectDispatchStampFieldContract(withoutStop, SURFACE),
    ).toThrow(/missing stamp stops/);
  });

  it('rejects prose that makes the shim the normal path', () => {
    const requiredShim = COMPLIANT_CONTRACT.replace(
      'is an optional corroboration where',
      'is the required derivation route where',
    );
    expect(requiredShim).not.toBe(COMPLIANT_CONTRACT);
    expect(() =>
      expectDispatchStampFieldContract(requiredShim, SURFACE),
    ).toThrow(/shim is optional corroboration only/);
  });

  // Review probe A (p03 review 2026-09-06): a single-word softening of the two
  // validation clauses previously passed every contract suite.
  it('rejects a permissive qualifier on the non-empty-string clause', () => {
    const softened = COMPLIANT_CONTRACT.replace(
      'it\nmust be a non-empty string',
      'it\nmay optionally be a non-empty string',
    );
    expect(softened).not.toBe(COMPLIANT_CONTRACT);
    expect(() => expectDispatchStampFieldContract(softened, SURFACE)).toThrow(
      /non-empty stamp is mandatory/,
    );
  });

  it('rejects a permissive qualifier on the byte-for-byte copy clause', () => {
    const softened = COMPLIANT_CONTRACT.replace(
      'Copy that returned value byte-for-byte',
      'Where convenient, copy that returned value byte-for-byte',
    );
    expect(softened).not.toBe(COMPLIANT_CONTRACT);
    expect(() => expectDispatchStampFieldContract(softened, SURFACE)).toThrow(
      /copy clause is not negated/,
    );
  });

  // Review probe B2 (p03 review 2026-09-06): the window anchored on the first
  // occurrence, so a compliant decoy could shadow a gutted normative paragraph.
  it('rejects a compliant decoy that shadows a gutted normative paragraph', () => {
    const gutted = CONTRACT_PARAGRAPH.replace(
      'Copy that returned value byte-for-byte into the review dispatch audit\nmetadata. ',
      '',
    );
    expect(gutted).not.toBe(CONTRACT_PARAGRAPH);
    const decoyed = `${CONTRACT_PARAGRAPH}\n\n${OWNING_SECTION}\n\n${gutted}`;
    expect(() => expectDispatchStampFieldContract(decoyed, SURFACE)).toThrow(
      /dispatch stamp contract paragraph/,
    );
  });

  // The structural half of probe B2: relocating the paragraph out of its owning
  // section is rejected even when exactly one copy survives.
  it('rejects a compliant paragraph relocated out of its owning section', () => {
    const relocated = [
      '## Purpose',
      '',
      CONTRACT_PARAGRAPH,
      '',
      OWNING_SECTION,
      '',
      'Resolve the reviewer target before capability-tier selection.',
    ].join('\n');
    expect(() => expectDispatchStampFieldContract(relocated, SURFACE)).toThrow(
      /dispatch stamp contract paragraph/,
    );
  });

  // Final review 2026-09-06 (m2): the proximity bound alone let a paragraph
  // that had left its section pass whenever a new subsection heading sat inside
  // the 2000-character reach. Section membership must be checked structurally.
  it('rejects a paragraph separated from its owning section by a heading', () => {
    const intervening = [
      OWNING_SECTION,
      '',
      'Resolve the reviewer target before capability-tier selection.',
      '',
      '#### Unrelated subsection',
      '',
      CONTRACT_PARAGRAPH,
    ].join('\n');
    // The anchor is well inside OWNING_SECTION_REACH here, so only the
    // heading check can reject it.
    expect(
      intervening
        .replace(/\s+/g, ' ')
        .indexOf('additive `dispatchStamp` field') -
        intervening.replace(/\s+/g, ' ').indexOf(OWNING_SECTION),
    ).toBeLessThan(2000);
    expect(() =>
      expectDispatchStampFieldContract(intervening, SURFACE),
    ).toThrow(/dispatch stamp contract paragraph/);
  });

  it('rejects a second copy of the contract paragraph', () => {
    const duplicated = `${COMPLIANT_CONTRACT}\n\n${CONTRACT_PARAGRAPH}`;
    expect(() => expectDispatchStampFieldContract(duplicated, SURFACE)).toThrow(
      /dispatch stamp contract paragraph/,
    );
  });
});
