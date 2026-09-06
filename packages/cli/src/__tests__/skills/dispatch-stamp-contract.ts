import { expect } from 'vitest';

/**
 * Shared assertions for the canonical dispatch-stamp consumption contract that
 * `oat-project-implement`, `oat-project-review-provide`, and
 * `oat-project-review-provide-remote` must carry.
 *
 * The resolver emits `dispatchStamp` beside `dispatchReport`, so orchestrator
 * guidance must read that field rather than depending on an out-of-tree
 * `formatDispatchStamp` shim as its normal path.
 *
 * Assertions run against a bounded window of the contract paragraph rather than
 * the whole document. Skill entry files are concatenated with their references
 * before these checks, so a whole-document match would let a clause from an
 * unrelated section satisfy the contract.
 */

/** Anchor that opens the contract paragraph in every governed surface. */
const CONTRACT_ANCHOR = 'additive `dispatchStamp` field';

/** Bounded paragraph length; the longest live paragraph is ~750 characters. */
const CONTRACT_WINDOW_LENGTH = 1000;

/**
 * Collapse whitespace so assertions survive prose rewrapping by the markdown
 * formatter, then return the contract paragraph window.
 */
export function dispatchStampContractWindow(content: string): string {
  const flat = content.replace(/\s+/g, ' ');
  const start = flat.indexOf(CONTRACT_ANCHOR);
  return start === -1 ? '' : flat.slice(start, start + CONTRACT_WINDOW_LENGTH);
}

/**
 * Assert that one surface consumes the resolver-returned stamp, keeps the
 * formatter call as optional corroboration only, and never authorizes
 * hand-assembly or a shim-only derivation.
 */
export function expectDispatchStampFieldContract(
  content: string,
  label: string,
): void {
  const contract = dispatchStampContractWindow(content);
  expect(contract, `${label} dispatch stamp contract paragraph`).not.toBe('');
  expect(contract, `${label} canonical stamp prefix`).toContain(
    'canonical `Dispatch:` prefix',
  );
  expect(contract, `${label} non-empty stamp`).toContain('non-empty string');
  expect(contract, `${label} byte-for-byte stamp copy`).toMatch(
    /cop(?:y|ied)(?: that returned value)? byte-for-byte/i,
  );
  // A bare positive match would also accept "Do not copy ... byte-for-byte".
  expect(contract, `${label} copy clause is not negated`).not.toMatch(
    /(?:do not|don't|never|must not|no need to|avoid|rather than|instead of)[^.]{0,80}cop(?:y|ied|ying)[^.]{0,60}byte-for-byte/i,
  );
  expect(contract, `${label} shim is optional corroboration only`).toMatch(
    /`formatDispatchStamp\(dispatchReport\)` \/ `toDispatchStampRecord\(dispatchReport\)` is an optional corroboration[^.]{0,160}never the normal path/,
  );
  expect(contract, `${label} no required shim`).toContain(
    'no out-of-tree shim is required',
  );
  expect(contract, `${label} rejects hand-assembly`).toMatch(
    /(?:Do not|Never) hand-(?:assemble|build)/,
  );
  expect(contract, `${label} missing stamp stops`).toMatch(
    /`dispatchStamp` is absent or lacks the canonical prefix[^.]{0,120}stop and report/,
  );

  const flat = content.replace(/\s+/g, ' ');
  // Reject the pre-field guidance that made the out-of-tree formatter the only
  // derivation route, and any clause that permits hand-assembly.
  expect(flat, `${label} no shim-only derivation`).not.toMatch(
    /deriv(?:e|ed|ing)[^.]{0,120}only (?:with|through) `(?:formatDispatchStamp|toDispatchStampRecord)/i,
  );
  expect(flat, `${label} no hand-assembly permission`).not.toMatch(
    /(?:may|can|should|permitted to|allowed to|free to|fine to|acceptable to|ok to|okay to)[^.]{0,40}hand-(?:assemble|assembling|build|building)/i,
  );
}
