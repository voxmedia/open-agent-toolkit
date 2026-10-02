---
oat_generated: true
oat_generated_at: 2026-10-02T07:19:08Z
oat_review_scope: p02-map
oat_review_type: artifact
oat_review_invocation: auto
oat_project: .oat/projects/shared/docs-improvement-overhaul
oat_review_request_id: docs-overhaul-run1-p02-map-review01
---

# Artifact Review: p02 Migration Draft

**Reviewed:** 2026-10-02T07:19:08Z
**Scope:** Independent, non-author p02-t01 map/baseline review before moves, including the validator refactor and new migration tests. Intrinsic docs-analysis review is separately owned and excluded.
**Files reviewed:** Seven scoped draft/code files; all 70 source pages and 83 canonical skill records mechanically checked, with primary CLI/config/pack and project contracts inspected.
**Reviewed Head:** `-` — proposals are uncommitted; no commit SHA binds this draft review. Dispatch launch HEAD was `fc3515327df51632286f0c9a373e76e7b36b8c30`; exact source baseline is `8b78d9a935b31ef50e65713b03a022a5d022aa59`, initial implementation base `257517ab5aa1a5846cb4069ba036eafd7b5009f5`.
**Dispatch:** scope=p02-map; action=review; role=reviewer; producer=unknown; provenance=unknown; model_axis=selected:gpt-6.1-sol; effort_axis=selected:high; dispatch_policy=high; dispatch_ceiling=high; target=oat-reviewer-gpt-6-1-sol-high.
**Reconnaissance:** not-attempted

## Summary

All 70 source pages have explicit destinations; inventory counts, raw source hashes, real command/config/pack extraction and source-only migration tests check out. Two Medium defects prevent accepting the preservation evidence: the normalizer substitutes displayed labels for actual hrefs in 17 real links, and the obsolete Home User Guide entry lacks a compatible explicit accounting disposition. No source moves, approvals, publication or phase completion are claimed.

Findings by severity: 0 critical, 0 high, 2 medium, 0 low

## Exact Draft Binding

SHA-256 values were captured before substantive review and rechecked after test execution; all seven remained unchanged. Root-owned tracking commits during review were disclosed and did not alter these proposals or the docs/CLI/skill source baseline.

| File                                        | SHA-256                                                            |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `references/route-migration.json`           | `cd6829ed9798e79ad6a16a71a76ff046ef6a064097fb96c6a5f16cfd01446ac3` |
| `references/content-baseline.md`            | `e8b6951366cc76d4282ab92571a3646cefaedb64dce638f580db2cb954fe2c02` |
| `references/capability-baseline.json`       | `43b030dfe1e4efe7aa306c38c4c14006e4df0ff0ef5e151754988921c8f1f060` |
| `references/capture-migration-baseline.mjs` | `c149dab109fde4ff2fa465a5438eace78bee1ed72a762413b05e6f826b3f9f00` |
| `references/migration-review.md`            | `ed6d9767e7b5dc89b144e467ad4f24a3bf123e4772ddcb3c09836c859e20f2cd` |
| `apps/oat-docs/scripts/validate.ts`         | `07bd5aa9c3d95273aff5ed2c43b4fc206b41083aac165e7c7feba08777def3e1` |
| `apps/oat-docs/tests/migration.test.ts`     | `e9c22e4d37f4424cfe7c3884d28d1649ae38309f9188a2684677d056b8a74a71` |

The five `references/` paths above are relative to this project. The app paths are repository-relative.

## Findings

### Critical

None

### High

None

### Medium

- **M1: Normalization edits link labels instead of href destinations** (`.oat/projects/shared/docs-improvement-overhaul/references/capture-migration-baseline.mjs:193`)
  - Issue: `snippet.indexOf(href)` finds the first identical substring, including displayed text. Seventeen actual links have their href repeated in an inline-code label, such as `apps/oat-docs/docs/docs-tooling/add-docs-to-a-repo.md:215` and `apps/oat-docs/docs/docs-tooling/commands.md:227`. For ``[`workflows.md`](workflows.md)``, the recorded normalization replaces the label while retaining the real URL. This contradicts the protected-non-URL-byte contract and is not correct URL-normalized preservation evidence. An independent AST/source-offset sweep reproduced all 17 collisions and verified that the recorded normalized hashes use these incorrect spans; raw hashes remain valid. Although these examples currently resolve to retained paths, that does not make the claimed normalization contract true.
  - Fix: Resolve the actual destination token span separately from label/title text for links, images and definitions; fail explicitly if a parsed URL cannot be matched to its source token rather than silently inventing a span. Recapture affected section hashes and retain a literal expected-output control where label and href are identical, plus a permitted destination-only rewrite that preserves the label. Do not use a blanket label rewrite or whitespace exemption. A project-local probe is sufficient; permanent CI must not import the project baseline.
  - Requirement: p02-t01 exact identified-href-only normalization; design information migration and whole-site conservation contracts.

- **M2: Home's obsolete User Guide router entry is unaccounted for** (`.oat/projects/shared/docs-improvement-overhaul/references/capture-migration-baseline.mjs:361`)
  - Issue: Generic `routerAccounting.contentDestination` says every existing Contents description is retained at a new physical-parent entry or body discovery owner. However, `apps/oat-docs/docs/index.md:19` describes a “Legacy compatibility router for old guide links” and targets `guide/index.md`, which consolidates into Home itself. This is a separate obsolete entry from the two specifically enumerated compatibility-status sentences at `guide/index.md:8` and `:18`. The draft provides no explicit disposition for its description/removal: retaining its claim implies compatibility that the user rejected, while silently dropping it violates the stated accounting contract. No product capability removal is needed to resolve this.
  - Fix: Add exact source-line/text accounting for this Home Contents item, marking its route-only status/entry as superseded by the existing no-alias decision, with independently reviewed rationale. Align the “only two” wording to distinguish two guide sentences from this separate router-list item. Name concrete destination entries/body anchors for redistributed descriptions where the generic parent-or-body choice would otherwise leave preservation unverifiable. Keep all capability/adoption guidance; do not expand this into an arbitrary router-content deletion exemption.
  - Requirement: p02-t01 explicit router consolidation accounting; user-authorized URL breakage, not capability removal.

### Low

None

## Requirements/Design Alignment

**Evidence sources used:** Quick-mode `discovery.md`, `plan.md` (p02-t01 plus common conservation/verification contracts), `design.md`, and `implementation.md`; canonical reviewer role; root/app AGENTS guidance; `deliberate-testing`; all seven scoped draft/code files. No spec exists by design. Primary implementation sources included `packages/cli/src/app/create-program.ts`, command registration, read-only config describe/catalog, pack manifest, and actual source docs/skill frontmatter. The separately owned intrinsic analysis artifact was not reviewed.

| Requirement                                      | Status                                   | Evidence / limits                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Exact pre-move page/heading/content inventory    | Implemented                              | Independently matched 70 git-tree pages, every page/source hash, a gap-free per-page section partition, 840 raw section hashes and 477 parsed link occurrences. Current docs and all 83 inventoried skills match source-baseline bytes. Zero tracked assets is a verified empty inventory.                                                                                                                                                                                                                                                                                           |
| One canonical owner and explicit destinations    | Implemented as proposal                  | 33 retained pages, 36 moves, one consolidation; 69 unique retained/moved destinations plus seven new indexes give 76 authored pages. Seven primary labels match design. Old URL compatibility is deliberately not implemented. Actual moved files/export/sidebar/search are downstream p02-t02/t03 proof, not established now.                                                                                                                                                                                                                                                       |
| Exact allowed normalization/frontmatter          | Partial                                  | Four exact title exceptions and original frontmatter are inventoried; no arbitrary paragraph/whitespace stripping. M1 blocks the href-only claim.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Explicit router units and Guide consolidation    | Partial                                  | All 16 exception units retain exact source text; Guide's nonblank sentence/bullet text is accounted for, including the exact duplicate Concepts entry and two explicitly proposed obsolete guide sentences. M2 blocks complete root-router accounting. No blanket deletion authorization exists.                                                                                                                                                                                                                                                                                     |
| Reviews landing and actual capability owners     | Aligned                                  | Existing Reviews prose becomes `workflows/projects/reviews/index.md`, not a duplicate leaf. Additional Contents is expressly additive and must be separated from protected text at apply time. Actual `repo-analysis.md` documents `oat repo pr-comments`; Reference ownership is defensible. Project Log's actual append/synthesis workflow belongs under Projects execution.                                                                                                                                                                                                       |
| Real CLI/config/skill capability baseline        | Implemented                              | Independent live constructor traversal equals all 162 recorded nodes, 362 explicit option flag declarations and aliases. Real read-only config describe equals all 110 recorded catalog entries, including values/defaults. All 83 skill source hashes and pack memberships match; 71 are eligible. Framework help/global flags are explicitly separate, ancestor options are not counted again. Structural/dynamic fields are distinct from supported catalog keys, and unresolved coverage remains visible rather than semantic completeness being inferred from literal mentions. |
| Permanent checks independent of project/baseline | Implemented for current task             | Validator resolves actual source targets and fragments; three new tests use temporary live-source fixtures. Searches of app scripts/tests found no project/map/baseline-SHA dependency. Current test enrollment runs all nine directly. Future topic-map/README consumers and p04 catalog checks remain separately planned, not missing p02-t01 work.                                                                                                                                                                                                                                |
| Disposable source-only proof                     | Evidence sufficient within stated limits | Reviewed direct-build/check/test receipts and successful logs from `/tmp/docs-p02-pristine-6lOMe5`; independently rechecked absent project directory and app metadata/sidecar/.source/out. Did not rerun dependency installation/builds/check. Turbo failed before tasks; its failure is explicitly not a passing verification result.                                                                                                                                                                                                                                               |

**Extra work:** No significant scope creep found. The reusable source-target boundary is used by live-page validation and is a defensible prerequisite for later consumer validation. No generated/runtime routing manifest is introduced.

## Verification Commands and Outcomes

Run directly, without Turbo replay:

```bash
pnpm --filter oat-docs exec tsx --tsconfig tsconfig.docs-tools.json --test tests/migration.test.ts
pnpm docs:test
```

Independent execution: focused migration tests **exit 0, 3/3 passed**; complete app tests **exit 0, 9/9 passed**. The tests' known literal missing-file/fragment outcomes provide non-circular guards, not snapshots of the proposed inventory.

Independent guard control: copied only validator/test into a self-contained temporary ESM directory, replaced exactly `if (errors.length) throw new Error(errors.join('\n'));` with a false condition, and changed the copied test import to that copied validator. Running Node/tsx with the app's absolute tsconfig produced **exit 1: 1 valid control passed, 2 failures with Missing expected rejection**. No checkout files were changed. An initial temp-copy attempt lacked `type: module` and failed at transformation, not at the guard; that setup failure is not negative-control evidence. The corrected ESM retry produced the intended guard failures and all temp copies were removed.

Reproduction of M1's exact source-span error, using the literal repeated-label form found in actual docs:

```bash
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
const snippet = '[`commands.md`](commands.md)';
const href = 'commands.md';
const stable = 'oat-docs:docs-tooling/commands.md';
const offset = snippet.indexOf(href);
const actual = snippet.slice(0, offset) + stable + snippet.slice(offset + href.length);
const expected = '[`commands.md`](oat-docs:docs-tooling/commands.md)';
assert.notEqual(actual, expected);
console.log({ actual, expected });
NODE
```

This confirms the draft's bad categorical outcome; after correction, a probe of the actual extractor must equal the literal expected string. Independently rerun the full real-source URL-span sweep and baseline hash verification after recapture, including all 17 repeated-label occurrences. Account for M2 against original `index.md:19` and the two distinct guide sentences, not an invented fixture.

**Verification limits:** No broad gates, build, regeneration, move, source mutation, release validation or browser tour was executed in this review. Disposable direct check/test receipts were inspected, not re-executed. Earlier Turbo setup attempts failed with `I/O error: Is a directory (os error 21)`; the first direct docs-config build failed from wrong dependency order before the corrected sequence passed. Those remain failures. This is not independent phase/final code acceptance; actual preservation at new destinations and moved-route/export/search behavior remain downstream. Fable map consumption/approval and the separate intrinsic analysis review remain unverified here.

## Recommended Next Step

Return these two bounded findings to the existing p02 implementer, correct and recapture the exact proposal, then independently recheck the changed evidence and obtain Fable map review before any move. Root owns lifecycle receipt/tracking and any review-receive invocation; this reviewer did not write core tracking or project-log.md.
