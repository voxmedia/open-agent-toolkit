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
 * Scope of this contract, stated plainly: it is a tripwire against an ordinary
 * future edit that quietly weakens the guidance, not a proof against prose
 * deliberately crafted to evade it. Natural language has no regex formulation
 * that simultaneously rejects every trailing exception and accepts every
 * legitimate rephrasing, so the assertions below deliberately fail closed and
 * expect an author who trips one to rephrase rather than to loosen the guard.
 * Two protections are structural rather than lexical and do hold categorically:
 * the contract must live inside its owning section (so a compliant paragraph
 * cannot be relocated elsewhere while the normative one is deleted), and it
 * must appear exactly once per surface. Section membership is enforced by
 * rejecting any ATX heading between the owning section and the contract anchor,
 * not by the proximity bound alone; the 2000-character reach is a secondary
 * bound layered on top of that check. Setext headings are out of reach because
 * the content is flattened before scanning, which destroys the underline that
 * defines them; every governed surface uses ATX headings throughout.
 */

/** Anchor that opens the contract paragraph in every governed surface. */
const CONTRACT_ANCHOR = 'additive `dispatchStamp` field';

/** Bounded paragraph length; the longest live paragraph is ~750 characters. */
const CONTRACT_WINDOW_LENGTH = 1000;

/**
 * The section that owns the contract on each surface. Binding to the owning
 * section is what makes relocation a failure rather than a silent pass: skill
 * entry files are concatenated with their references before these checks, so a
 * paragraph moved into any unrelated section would otherwise still satisfy a
 * document-wide search.
 */
const OWNING_SECTION: Readonly<Record<string, string>> = {
  'oat-project-implement': '#### Dispatch Report V1 contract',
  'oat-project-review-provide':
    '**Step 6.0: Resolve the managed reviewer target**',
  'oat-project-review-provide-remote':
    '**Step 5.0: Resolve and report the exact reviewer target.**',
};

/**
 * Maximum flattened distance from the owning section heading to the contract
 * anchor. Live surfaces use 505-846 characters, so this leaves room for prose
 * growth. This is a secondary proximity bound only: section membership itself
 * is decided by {@link INTERVENING_HEADING}, because a distance bound alone
 * would admit a paragraph relocated into a new subsection that happens to sit
 * within the reach window.
 */
const OWNING_SECTION_REACH = 2000;

/**
 * A Markdown ATX heading in flattened text: one to six `#` characters opening a
 * whitespace-delimited token and followed by heading text. Any such heading
 * between the owning section and the contract anchor means the anchor now
 * belongs to a different section, which is what makes the membership claim in
 * this file's header categorical rather than merely proximate. The
 * whitespace-delimited form does not match `#` inside inline code or a link
 * fragment such as `(...#per-project-gate-overrides)`. A `# comment` line in a
 * fenced block would match, which only ever rejects; erring toward rejection is
 * the safe direction for a guard whose failure mode is a silent pass.
 */
const INTERVENING_HEADING = /(?:^|\s)#{1,6}\s/;

/**
 * Permissive qualifiers that would downgrade a mandatory validation step to an
 * optional one. `must be a non-empty string` is the load-bearing wording; a
 * single-word softening to `may optionally be` must fail closed.
 */
const PERMISSIVE_QUALIFIER =
  '\\b(?:may|might|optionally|optional|where convenient|if convenient|if desired|if practical|preferably|ideally|when possible|where possible)\\b';

function flatten(content: string): string {
  return content.replace(/\s+/g, ' ');
}

/**
 * Resolve the owning section for a caller label. Callers pass either a bare
 * skill name or a `.agents/skills/<name>/SKILL.md` path, so match on the
 * longest known key the label contains and fail closed on anything unknown.
 */
function owningSectionFor(label: string): string {
  const key = Object.keys(OWNING_SECTION)
    .sort((left, right) => right.length - left.length)
    .find((name) => label.includes(name));
  if (!key) {
    throw new Error(
      `No dispatch-stamp owning section registered for "${label}". Add the surface to OWNING_SECTION before asserting its contract.`,
    );
  }
  return OWNING_SECTION[key] as string;
}

/**
 * Return the contract paragraph window, bound to its owning section. Returns
 * `''` whenever the section or the anchor is missing, is duplicated, or the
 * anchor has drifted out of the section, so every failure mode reads as a
 * missing contract rather than as a pass.
 */
function dispatchStampContractWindow(content: string, label: string): string {
  const flat = flatten(content);
  const section = flatten(owningSectionFor(label));
  if (flat.split(section).length - 1 !== 1) {
    return '';
  }
  if (flat.split(CONTRACT_ANCHOR).length - 1 !== 1) {
    return '';
  }
  const sectionStart = flat.indexOf(section);
  const anchorStart = flat.indexOf(CONTRACT_ANCHOR);
  const gap = anchorStart - sectionStart;
  if (gap < 0 || gap > OWNING_SECTION_REACH) {
    return '';
  }
  // Skip the owning section's own marker before scanning, so a section that is
  // itself an ATX heading does not report itself as an intervening one.
  if (
    INTERVENING_HEADING.test(
      flat.slice(sectionStart + section.length, anchorStart),
    )
  ) {
    return '';
  }
  return flat.slice(anchorStart, anchorStart + CONTRACT_WINDOW_LENGTH);
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
  const contract = dispatchStampContractWindow(content, label);
  expect(
    contract,
    `${label} dispatch stamp contract paragraph, exactly once inside "${owningSectionFor(label)}"`,
  ).not.toBe('');
  expect(contract, `${label} canonical stamp prefix`).toContain(
    'canonical `Dispatch:` prefix',
  );
  // Assert the mandatory wording, not just the noun phrase: "it may optionally
  // be a non-empty string" would satisfy a bare `non-empty string` match.
  expect(contract, `${label} non-empty stamp is mandatory`).toContain(
    'must be a non-empty string',
  );
  expect(contract, `${label} byte-for-byte stamp copy`).toMatch(
    /cop(?:y|ied)(?: that returned value)? byte-for-byte/i,
  );
  // A bare positive match would also accept "Do not copy ... byte-for-byte" or
  // "Where convenient, copy ... byte-for-byte". This is clause-local by
  // construction: `[^.]` cannot cross a sentence boundary, which is why the
  // legitimate "is an optional corroboration" sentence downstream still passes.
  expect(contract, `${label} copy clause is not negated`).not.toMatch(
    new RegExp(
      `(?:do not|don't|never|must not|no need to|avoid|rather than|instead of|${PERMISSIVE_QUALIFIER})[^.]{0,80}cop(?:y|ied|ying)[^.]{0,60}byte-for-byte`,
      'i',
    ),
  );
  // No permissive qualifier may soften either validation clause.
  expect(contract, `${label} validation clauses are not qualified`).not.toMatch(
    new RegExp(
      `${PERMISSIVE_QUALIFIER}[^.]{0,60}(?:non-empty string|canonical \`Dispatch:\` prefix)`,
      'i',
    ),
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

  const flat = flatten(content);
  // Reject the pre-field guidance that made the out-of-tree formatter the only
  // derivation route, and any clause that permits hand-assembly. These two run
  // document-wide on purpose: they must catch a contradiction reintroduced
  // anywhere in the surface, not only inside the contract paragraph.
  expect(flat, `${label} no shim-only derivation`).not.toMatch(
    /deriv(?:e|ed|ing)[^.]{0,120}only (?:with|through) `(?:formatDispatchStamp|toDispatchStampRecord)/i,
  );
  expect(flat, `${label} no hand-assembly permission`).not.toMatch(
    /(?:may|can|should|permitted to|allowed to|free to|fine to|acceptable to|ok to|okay to)[^.]{0,40}hand-(?:assemble|assembling|build|building)/i,
  );
}
