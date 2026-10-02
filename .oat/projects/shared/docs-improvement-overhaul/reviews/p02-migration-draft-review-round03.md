---
oat_generated: true
oat_generated_at: 2026-10-02T12:48:00Z
oat_review_scope: p02-map
oat_review_type: artifact
oat_review_invocation: auto
oat_project: .oat/projects/shared/docs-improvement-overhaul
oat_review_request_id: docs-overhaul-run1-p02-map-review03
---

# Artifact Review: p02 Migration Draft Round 03

**Reviewed:** 2026-10-02T12:48:00Z
**Scope:** Same non-author reviewer, bounded to Fable-approved R1/R2/O3, adjacent broad-CLI-description ownership, O4 carry-forward and preservation of prior M1/M2 repairs. Intrinsic analysis remains separately owned and excluded.
**Reviewed Head:** `-` — the amended proposal is uncommitted. Exact source baseline is `8b78d9a935b31ef50e65713b03a022a5d022aa59`; root released this review at bookkeeping HEAD `adf82ca334cf662887182b3579b58f4e5afb1c12`. Neither SHA is represented as a commit containing these draft bytes.
**Prior reviews:** `reviews/p02-migration-draft-review.md`, `reviews/p02-migration-draft-review-round02.md`; prior findings/coverage remain auditable, not overwritten.
**Dispatch:** request=docs-overhaul-run1-p02-map-review03; role=reviewer; model_axis=selected:gpt-6.1-sol; effort_axis=selected:high; dispatch_policy=high; dispatch_ceiling=high; target=oat-reviewer-gpt-6-1-sol-high; notices=[].
**Reconnaissance:** not-attempted

## Summary

The amended draft conserves the old CLI router through exact owner/byte accounting, narrowly inventories the three H1 changes and separates new onboarding/Reference discovery from retained guidance. Independent source and capable-control checks support R1/R2/O3 and the adjacent description correction; prior M1/M2 repairs remain intact. One Low narrative count mismatch remains, without changing the correct map or preservation results; no move, task/phase acceptance, browser acceptance or publication is claimed.

Findings by severity: 0 critical, 0 high, 0 medium, 1 low

## Exact Draft Binding

Correction receipt `references/fable-map-correction-receipts.json` SHA-256: `221c8d6d6bd86671926a87781fe175e1ce789b86991471a4f5a3854389df47a4`. All 15 in-scope file hashes in its 16-file inventory matched actual bytes; the separately owned ignored analysis entry was deliberately excluded because root is refreshing/reviewing it independently.

| File                                        | SHA-256                                                            |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `references/route-migration.json`           | `a277764b339bea9d4f7f7884aa6f250dfde23c730ad3c82b373cab70bad08417` |
| `references/capture-migration-baseline.mjs` | `6bd414dbf34fd1ef38a8befeb2174a4ece602ddf1ccf488b7124751d2b8b0643` |
| `references/cli-router-accounting.mjs`      | `da971af848142f8f3ef7bcf0ea7893c9a6e68e9b5edbc95325897fc436bcae29` |
| `references/heading-normalization.mjs`      | `e3a56d21d5fb275b6d42fc908a0d273ad393397ee0949e481c28715cf921825c` |
| `references/normalization-controls.mjs`     | `37c9fe51940d06acba26e6167bbc8cff14546b7bc2f5d49bda0e261c2ac303a2` |
| `references/content-baseline.md`            | `20b15e1a50bfe7ecbac241a2a762826e647d58d55394a1582c9b29f0d025f860` |
| `references/migration-review.md`            | `4b6860a98cc67efe9e8663a3f10eaddf1218e4309e3c2f879b47fa055c6efffc` |
| `references/fable-p02-map-review.md`        | `53e349a6900a175651b9437c5353ab2501a64e5b4f2bf904a8bf946ac1ee612e` |

Paths above are project-relative. Remaining evidence/control and unchanged capability/validator/test hashes are bound by the exact correction receipt. Independently loaded the original Fable-reviewed map from `fce36cc61f083e1db524354d218f576c4c9aa804`, verified its `e58c6780fae9eb1f01698018358941355e0de3f26d39caecc278f5453307436b` hash and compared all 70 source/destination pairs: unchanged. Classification changes and new indexes do not silently change another page destination.

## Findings

### Critical

None

### High

None

### Medium

None

### Low

- **L1: Baseline narrative still reports the superseded migration counts** (`.oat/projects/shared/docs-improvement-overhaul/references/content-baseline.md:31`)
  - Issue: The paragraph says 36 moves, one consolidation and seven new indexes. R1 now classifies CLI Utilities as a second consolidation and creates the independent Getting Started index: the exact map/receipt and handoff correctly show **33 retained, 35 moved, two consolidations and eight new indexes**, still 76 projected pages. This is low-impact artifact wording drift: the exhaustive ledger and actual conservation evidence are correct, but the summary contradicts them.
  - Fix: Update only this count/summary paragraph to the current 35/two/eight classification while retaining the 33 retained / 76 projected totals and Reviews promotion explanation. Do not alter destinations, baseline source evidence or preservation rules to make the old counts true. A prose-only correction needs formatting and an exact diff check, not recapture/build/full gates.

## Requirements/Design Alignment

**Evidence sources used:** Existing quick-mode project contract and prior reviewer/app/root guidance; current plan p02-t01 Reviewed Map Amendment; actual `references/fable-p02-map-review.md`; corrected map, capture/CLI/H1/helper/control sources, baseline/handoff narrative and exact correction receipts; original source-baseline git objects. `deliberate-testing` review guidance applies to the added controls. No spec is required. Other phase/capability/code coverage remains inherited from the prior reviews, not newly claimed here.

| Contract                                      | Status                                            | Independently verified evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1: Real owners, not relabeled CLI onboarding | Verified                                          | All nine old CLI sections route through explicit owner rows rather than a single relocated body. Exactly **101 contiguous rows** reconstruct every original body byte: **42 paragraph/list guidance units, eight structural headings, 51 whitespace-only separators**. Every row's exact text/hash/offset and original AST kind matches source; every guidance row retains exact text with only inventoried href changes and an owner-local destination href. Structural rows contain no hidden substantive prose.                                      |
| R1: Metadata and router-heading roles         | Verified                                          | CLI frontmatter title/description have separate exact records; the description remains verbatim at Reference, not as Getting Started metadata. All **13 consolidated CLI/Guide heading records** match original heading text/source lines and named destination anchors. CLI's broad introduction at source lines 8/10 belongs at `reference/index.md#general-cli-adoption-guidance`; bootstrap/packs/config/state/remote/log/gates guidance follows its actual named owners.                                                                           |
| Adjacent broad descriptions and additions     | Verified                                          | Home's old CLI description and Guide's old CLI description match exact source and survive verbatim at Reference's general-CLI body owner; only their individually inventoried router markup is consolidated. New Getting Started introduction, Home onboarding entry and Reference owner-context links are separately declared additions. Their authored relative targets resolve within the proposed canonical destination set. No broad-lane text is relabeled as onboarding.                                                                         |
| R2: Exact H1 exceptions and anchors           | Verified                                          | Only Home, Projects and Choose a Workflow have approved H1 changes. Old/new heading/anchor records match actual source and installed slugger behavior; zero parsed authored incoming old-anchor links and zero exact old-fragment mentions in the tracked source-baseline tree were independently confirmed. Renaming those H1s leaves all **18 other headings/anchors on the three pages unchanged**. Exact new-H1-to-old normalization preserves surrounding prose; unapproved H1 and changed surrounding prose do not become accepted equal content. |
| Conservation and M1/M2 retention              | Verified for this draft                           | Independent checks matched **70 unchanged source pages, 477 actual destination spans and all 840 raw/normalized section hashes**. The partition is now **816 protected / 24 explicitly accounted router units**. Micromark destination-span helper remains unchanged from accepted M1 repair; three exact route-only supersessions remain individually inventoried, not a general deletion exemption.                                                                                                                                                   |
| O3: Prominent Projects reference discovery    | Verified as addition                              | `workflows/projects/index.md#reference-contracts` explicitly adds Project Artifacts and State Machine body links immediately after the introduction, before Contents. Both relative URLs resolve to approved Reference owners; existing introduction/Contents guidance remains protected separately. Actual rendered prominence awaits apply/build verification.                                                                                                                                                                                        |
| O4: Mandatory later residues                  | Recorded accurately                               | Quickstart's existing CLI Utilities subsection and Choose a Workflow's retained Contents heading are exact source headings, carried as two named **p06** editorial residues. They are not silently rewritten now or misclassified as p02 blockers. Optional Waves promotion/dispatch filename advice stays deferred.                                                                                                                                                                                                                                    |
| Current map totals                            | Correct in authoritative map; Low narrative drift | 33 retained + 35 moved + two consolidations = 70 source pages. The 68 physical retained/moved destinations plus eight genuinely new indexes yield **76** canonical pages. L1 concerns only the stale baseline summary.                                                                                                                                                                                                                                                                                                                                  |

## Verification Commands and Outcomes

Executed read-only controls; output goes only to `/tmp`, never into proposal receipts:

```bash
node .oat/projects/shared/docs-improvement-overhaul/references/normalization-controls.mjs > /tmp/docs-p02-map-review03-controls.json 2> /tmp/docs-p02-map-review03-controls.stderr
node .oat/projects/shared/docs-improvement-overhaul/references/normalization-controls.mjs --legacy-negative-control > /tmp/docs-p02-map-review03-span-negative.json 2> /tmp/docs-p02-map-review03-span-negative.stderr
node .oat/projects/shared/docs-improvement-overhaul/references/normalization-controls.mjs --h1-negative-control > /tmp/docs-p02-map-review03-h1-negative.json 2> /tmp/docs-p02-map-review03-h1-negative.stderr
git diff --exit-code 8b78d9a935b31ef50e65713b03a022a5d022aa59 -- apps/oat-docs/docs packages/cli/src .agents/skills
```

All four commands exit **0**. Corrected controls include eight literal destination-token forms and three literal H1 transitions. The copied-helper span-negative child exits **1** for the intended displayed-label assertion; the copied-H1-guard child exits **1** with **Missing expected exception**. Valid controls pass separately. Removing the guided-doctor source unit from the CLI partition is rejected; changing prose around an allowed H1 does not normalize away. No checkout guard was disabled.

Separate independent source/hash/AST/byte/H1/owner-link probes complete with **exit 0**, including receipt/map hash verification and unchanged old/new page destinations. Initial exploratory assertions needed two harness corrections: no-match `git grep` correctly returns 1, and a separator can begin at an end-of-heading newline rather than the start of a display line. Those aborted probes are not passing evidence; final probes accept the correct no-hit status and check separator bytes/offsets directly, confirming all 51 separators are whitespace only.

**Verification limits:** No baseline recapture/regeneration, moves, build, broad gates, source edits, permanent CI changes, app test rerun, commits, core tracking or browser work. Previous source-only app/pristine evidence is inherited, not rerun or upgraded; failed Turbo setup remains failed. Intrinsic analysis/snapshot changes and its review are outside this pass. Fable's durable conditional map direction was read, but this reviewer does not grant task/phase/publication authority. Actual new-destination preservation/rendering/export/search checks remain downstream.

## Recommended Next Step

Apply the one bounded L1 prose correction through the existing phase02 owner, format/diff-check it, and let root receive this conservation outcome with the exact proposal binding and current Fable disposition. R1/R2/O3 and adjacent ownership checks do not require another substantive map round unless the correction changes destinations or conservation behavior.
