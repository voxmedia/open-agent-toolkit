---
oat_generated: true
oat_generated_at: 2026-10-02T07:48:29Z
oat_review_scope: p02-map
oat_review_type: artifact
oat_review_invocation: auto
oat_project: .oat/projects/shared/docs-improvement-overhaul
oat_review_request_id: docs-overhaul-run1-p02-map-review02
---

# Artifact Review: p02 Migration Draft Round 02

**Reviewed:** 2026-10-02T07:48:29Z
**Scope:** Same non-author reviewer, narrowed to corrected M1/M2 and their exact source/control evidence. No new broad phase review or intrinsic analysis review.
**Reviewed Head:** `-` — these proposal files are uncommitted. Exact source baseline remains `8b78d9a935b31ef50e65713b03a022a5d022aa59`; root's review-release committed HEAD is `bba534f66d73bdcd386d7d1616fb91fdd30690e0`. Neither is falsely represented as a commit containing these drafts.
**Prior review:** `reviews/p02-migration-draft-review.md`; original remains immutable and unchanged against HEAD.
**Dispatch:** request=docs-overhaul-run1-p02-map-review02; role=reviewer; model_axis=selected:gpt-6.1-sol; effort_axis=selected:high; dispatch_policy=high; dispatch_ceiling=high; target=oat-reviewer-gpt-6-1-sol-high; notices=[].
**Reconnaissance:** not-attempted

## Summary

M1 and M2 are resolved in the exact corrected draft: real destination tokens protect label bytes, and the Home compatibility entry has an explicit narrow disposition alongside all retained router descriptions. Independent checks reproduced all 477 actual spans, 70 unchanged source pages, 840 raw/normalized section hashes, 17 original repeated-label collisions and 70 exact non-Guide router items. This clears these two draft findings only; it does not claim Fable approval, an applied preservation move, intrinsic analysis acceptance or phase acceptance.

Findings by severity: 0 critical, 0 high, 0 medium, 0 low

## Exact Draft Binding

Verified correction receipt `references/draft-correction-receipts.json` SHA-256: `c4769cda4624a80393d6f24640b99593410dd674198a93b9078c731cd080210a`. Every in-scope file hash listed in it matched actual bytes before verification; the receipt was rechecked unchanged afterward. The separately reviewed analysis source/snapshot was not opened or reassessed.

| File                                             | SHA-256                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `references/route-migration.json`                | `e58c6780fae9eb1f01698018358941355e0de3f26d39caecc278f5453307436b` |
| `references/capture-migration-baseline.mjs`      | `43c3a7b3f50e9431fde6792cd6b1a246aed8707d9852cc42f1167295b91abc83` |
| `references/destination-spans.mjs`               | `35e929c46c9a8e2f686e3795245aeba57599e0aebfd783b6e7cb6a9eac94addf` |
| `references/normalization-controls.mjs`          | `92427b1e4725863f196624466c0f7eba47a10bce7ecc8ec95db8316ed0aed1fc` |
| `references/content-baseline.md`                 | `14c7f7491c2ac13081c077f72fe218757973e2281e1e5c57bff3e49a15ca32ea` |
| `references/migration-review.md`                 | `bf452d1dc8fbdc6481fb7a91a1850d7070f4c83be0def281f435c82522c1401f` |
| `references/normalization-controls-receipt.json` | `1d55a0245c5a88c8d8a962b27f7a831165791a55a73c5dff0305bd4385bb4cd5` |
| `references/normalization-negative-receipt.json` | `d8e4f59a9a49bd43b06e97182ee382104c86b185be5f083ed5bff4107fcef63b` |

Paths above are project-relative. Capability baseline remains `43b030dfe1e4efe7aa306c38c4c14006e4df0ff0ef5e151754988921c8f1f060`; validator and migration tests remain exactly `07bd5aa9c3d95273aff5ed2c43b4fc206b41083aac165e7c7feba08777def3e1` and `e9c22e4d37f4424cfe7c3884d28d1649ae38309f9188a2684677d056b8a74a71`. Those unchanged surfaces retain the first review's coverage, not a new complete code/capability review claim.

## Findings

### Critical

None

### High

None

### Medium

None

### Low

None

## Requirements/Design Alignment

**Evidence sources used:** Existing quick-mode discovery/plan/design/implementation contract and canonical reviewer/root/app guidance from round 01; immutable original review; corrected capture/helper/control sources and receipts, map and baseline narrative; actual source-baseline git objects. The previously loaded `deliberate-testing` review guidance applies to the controls. No spec is required in quick mode. All other requirements coverage is inherited explicitly from the original review.

| Finding / contract                      | Status    | Independently verified evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1: Destination-only normalization      | Resolved  | `references/destination-spans.mjs:39` selects real resource/definition destination-string tokens with nearest link/image/definition owner. Owner type/offsets and decoded URL must match (`:63`); ambiguity, missing owner/span and mismatch fail explicitly. Capture consumes those token spans, not a substring search.                                                                                                                                                                                                                                                                                                                              |
| M1: Real-source baseline and protection | Resolved  | Independently parsed all source pages without importing the extractor: each of 477 recorded token spans contains exactly the actual AST URL, sits within its owner, and follows the actual destination delimiter (`](` / definition delimiter), not the display label. Every raw section hash matched original git bytes; independently descending-span-normalized text matched all 840 recorded normalized hashes. All 70 live source pages remain identical to the exact baseline.                                                                                                                                                                   |
| M1: Capable controls                    | Resolved  | Eight literal link/image/definition controls include repeated labels, repeated title text, angle destinations, parentheses, escapes/entities and nested image/link ownership. Destination-only rewrite preserves a literal expected label; label mutation is rejected. All 17 real original label-collision cases are separately enumerated. A copied-helper first-substring negative control fails the literal expected output with child exit 1, while valid corrected controls pass. These are one-time project-local proof, not permanent CI inputs.                                                                                               |
| M2: Exact obsolete entry                | Resolved  | `routeOnlySupersessions` contains precisely Guide sentences at `guide/index.md:8` and `:18`, and the separate Home Contents item at `index.md:19`. Exact original text/lines and the existing no-alias decision are retained. Only the compatibility claims/entry are superseded; no broader router or product capability deletion is introduced.                                                                                                                                                                                                                                                                                                      |
| M2: Retained router information         | Resolved  | Independently reconstructed all non-Guide router list items from exact source sections: 70 exact source item/line/description records, 69 retained, one narrowly superseded Home entry. Each retained item names a destination anchor, target and label in the mapped destination set. Skills cross-owner entries specifically use `skills/index.md#related-guides`; workflow overview Contents specifically remains at `workflows/choose-workflow.md#contents`. Guide's sentence/bullet accounting remains separate and unchanged in intent. Actual destination rendering/preservation is downstream proof, not established by named proposals alone. |
| Other p02-t01 requirements              | Inherited | See round 01 for CLI/config/skill inventories, destination ownership and source-only validator tests. Hash equality confirms no alteration of those accepted evidence/code surfaces, but this narrowed pass did not repeat their full independent review.                                                                                                                                                                                                                                                                                                                                                                                              |

## Verification Commands and Outcomes

Executed without regenerating or writing proposal receipts:

```bash
node .oat/projects/shared/docs-improvement-overhaul/references/normalization-controls.mjs > /tmp/docs-p02-map-review02-controls.json 2> /tmp/docs-p02-map-review02-controls.stderr
node .oat/projects/shared/docs-improvement-overhaul/references/normalization-controls.mjs --legacy-negative-control > /tmp/docs-p02-map-review02-negative.json 2> /tmp/docs-p02-map-review02-negative.stderr
git diff --exit-code 8b78d9a935b31ef50e65713b03a022a5d022aa59 -- apps/oat-docs/docs packages/cli/src .agents/skills
git diff --exit-code HEAD -- .oat/projects/shared/docs-improvement-overhaul/reviews/p02-migration-draft-review.md
```

All four commands exit **0**. The negative-control wrapper's success means its isolated copied-helper child failed as expected with **exit 1** and the intended wrong-label assertion; it is not a claimed passing child. Its temporary copy is removed, and no checkout guard is disabled. Separate independent source/hash/span/router verification exits **0**, including exact correction-receipt hashes. The corrected control output contains eight literal controls, 477 span checks, 70 page checks, 840 section checks and 17 original collisions.

**Verification limits:** No source moves, baseline capture/regeneration, full gates, build, release checks, core tracking, analysis writes, commits or browser work. New app tests and pristine setup were not rerun in this narrowly bounded pass; earlier direct-test evidence and failed Turbo setup remain as recorded in round 01, not upgraded to new runs or passes. These project-local control scripts intentionally read the project baseline, while permanent app checks/tests remain unchanged and must not do so. Fable map approval and downstream actual preservation/export/search proofs remain separate and pending from this review's perspective.

## Recommended Next Step

Root may receive this clean M1/M2 recheck for the exact receipt-bound proposal and continue its separately owned Fable/map and task-closeout workflow. Do not treat it as phase acceptance or silently approve moves before the remaining configured map review/authorization conditions are satisfied.
