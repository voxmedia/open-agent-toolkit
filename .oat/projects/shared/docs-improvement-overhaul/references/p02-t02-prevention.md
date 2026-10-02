# p02-t02 Preservation and Prevention

## Accepted Application

Applied only the approved p02 map on the authorized existing `amphipod` branch. The original 840 source units and map are immutable. Actual conservation passes for all 816 protected units; 24 router-section units have explicit accounting, including 42 CLI guidance units, 70 router entries and 13 Guide dispositions. All three exact H1 transitions and their destinations are checked by the unchanged approved map. No redirects, aliases or transitional stubs were added.

The app has 76 authored pages: 33 retained pages, 35 moved pages, two CLI/Guide consolidations and eight new indexes. The existing Reviews guide is the real Reviews family landing rather than a redundant extra hop. New index frames, reviewed context/discovery additions and six explicit separating LF additions are captured separately in `p02-t02-additions.json`.

## Precommit Failures Retained

1. An initial migration generator matched the first literal `## Contents` inside Docs Tooling inline prose instead of the actual heading. Source validation/build did not detect that prose mutation; the actual section hash guard did. The generator now binds real heading lines and the page was restored from the baseline with only approved edits. The failure was `Non-final protected unit changed docs-tooling/index.md::Docs Tooling::1` in `/tmp/docs-p02-t02-conservation-error.log`.
2. Required `oxfmt` changed the CLI Reference Command Groups table's padding after approved href rewrites. The original strict hash guard rejected it; source/helper writes stopped for root design/plan amendment and independent review. The frozen proposal and its original receipts were not rewritten. The first strict table failure is retained at `/tmp/docs-p02-t02-conservation-04-error.log`.
3. Initial scoped evidence lint rejected mechanical script shadows/template escaping. The scripts were corrected before commit; `/tmp/docs-p02-t02-evidence-lint.log` is the failing log and `p02-t02-verification.json` binds the passing rerun.

## Narrow Table Supplement

The root-approved proposal scope is exactly one existing Command Groups table and 16 inventoried spans: 15 third-cell ASCII-space suffixes and one third delimiter dash width. The supplementary comparison restores those exact spans only after real GFM AST topology/alignment and all 45 raw cell payloads match the href-only expected page. Whole-page bytes outside those spans remain exact. The restored original unit then uses the unchanged href normalization/hash path. The other 815 protected units retain the original comparison.

`p02-t02-table-controls.json` records the actual formatted and href-only positive controls, 13 categorical negative controls, and the proposal review's Low disposition. Neutralizing only the exact-span guard accepts the focused unlisted edge-padding mutation while independent raw payload and AST guards still reject their respective controls. The guarded bad edge rejects and restored valid page passes. No general whitespace normalization, formatter-wide equivalence or table content exemption was introduced.

## Verification and Boundaries

- Formatting precedes focused source checks, type checks and nine direct executed tests. Scoped evidence/404 lint and `git diff --check` pass.
- `pnpm build:docs` passes with six successful tasks and zero cached tasks. Its prebuild invokes branch `cli:source` nav sync and generate-index, not the released installed binary.
- Actual static export and Orama search contain exactly the 76 current page routes; the search contains 6,288 records. Removed and repurposed routes are distinguished explicitly.
- Actual Mini CUA hierarchy, moved leaf, cross-owner discovery and 404 search recovery were performed; see `p02-t02-browser-smoke.md`.
- Root sanctioned the mechanically generated app index and public-package-version asset in this task's amended scope. Five public versions were separately coordinated by root at 0.3.14, greater than fetched main 0.3.13.
- This is precommit prevention, not post-commit recovery. Root retains analysis/tracking, review artifacts, phase closeout, final gates and publication. Consumer/topic/bundle/release closeout remains t03; p04/p05/p06 authoring and editorial residues remain deferred.

Receipts are new append-only evidence, not replacements for historical bound bytes. `p02-t02-conservation.json` encodes every protected unit by immutable `map.sections` index plus actual SHA256, and binds the full raw output hash; `verify-migration.mjs` reproduces the full trace.
