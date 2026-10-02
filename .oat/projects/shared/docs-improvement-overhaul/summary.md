---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-02
oat_generated: true
oat_summary_last_task: p06-t08
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: docs-improvement-overhaul

## Overview

OAT's documentation buried supported skills, separated source navigation intent from the rendered sidebar, and made independent adoption choices hard to evaluate. This quick-workflow project reorganized discovery and improved examples, configuration guidance, the README and visuals without treating missing documentation as permission to remove capabilities.

All **23 task implementations across six phases** are recorded in [implementation.md](implementation.md). The configured implementation exit gate is allowed/passed, but **final approval remains pending**: the configured pre-approval sequence is summary → document → PR, and PR [#342](https://github.com/voxmedia/open-agent-toolkit/pull/342) is open, not merged. This completed summary is not project approval, merge or release.

## What Was Implemented

- **Reader-first site:** Home routes into Getting Started, Skills, Workflows, Provider Sync, Docs Tooling, Reference and Contributing. Projects has planning/execution/review/closeout owners; provider-only, project-free research and docs-tooling adoption are independent paths. Repository consumers and generated indexes/bundles follow canonical routes.
- **Main-only navigation integration:** merge `084053c35` retained main's already-shipped navigation foundation (#336/#338) and Markdown bootstrap (#335). Main's compiler, committed metadata, framework detection and check contract supersede this branch's duplicate compiler/sidecar/flags. Retained app route/anchor validators, tests and authoring guidance add value without a hybrid implementation.
- **Supported-skill discovery:** 71 eligible shipped skills have canonical addressable guides, invocation/prerequisite information, realistic scenarios, expected output/next steps and automation notes. A generated committed catalog links those owners, with eligibility, applicability and parity checks. Existing independent family source-verification records underpin examples; counts alone do not establish semantic accuracy.
- **Evaluator README and visuals:** the README leads with independent adoption choices and an original theme-neutral SVG. Four Mermaid diagrams have text equivalents. User-requested/accepted styling was authored by Fable at `b76c6ed0a`, not directly authored by the user.
- **Configuration and bounded editorial work:** 18 configuration pages gained choice/default/tradeoff guidance. Approvals and automation, what OAT writes, and a team pilot gained named owners. Source-verified corrections cover scope, checkpoints, gate diversity, remote policy and native-read provider behavior without inventing historical default rationale.
- **Late corrections:** reference-style Markdown links/images now use the existing parser and definition resolution; 12 rejection controls demonstrated the old failure and the corrected docs suite passed 71/71. Native-read adoption wording now distinguishes canonical Cursor/Copilot reads from generated provider links (seven existing adoption tests passed). Final accounting names baseline destinations/gaps, and Quickstart's categorical Git system-error meaning was restored at `c916af45c` with 13 existing Git/support tests passing.

See [task outcomes and corrections](implementation.md#phase-6-evaluate-and-improve-the-whole-reader-experience), [editorial consensus](references/editorial-consensus.md), and [coverage/conservation accounting](references/conservation-closeout.md).

## Key Decisions

- **Fumadocs navigation is strict and generated from Contents maps.** Use the accepted main implementation and committed metadata rather than maintain a second compiler. Authors keep Contents maps authoritative; current check/build contracts detect drift. This existing repository decision is retained, not a new branch feature.
- **Reader-first documentation ownership.** Organize discovery by reader task, with one canonical owner for each capability and family-level cross-links, rather than expose install-pack structure as the site taxonomy. Independent adoption paths stay visible; shared indexes and consumers must follow those owners.
- **Canonical supported-skill guides.** Cover every eligible installable user-facing skill with an audited family guide and per-skill anchor, and generate the catalog from canonical metadata plus the curated mapping. This avoids duplicating skill specifications while retaining useful scenarios; eligibility, source verification and guide parity remain separate obligations.
- **Retire moved documentation URLs.** The user explicitly accepted breaking moved URLs: no aliases, redirects or permanent compatibility stubs. Update repository links and provide useful Home/search recovery. Content conservation does not imply old-route compatibility; external consumers must adopt the new routes.

## Design Deltas

- Main shipped the navigation foundation while this branch was in flight; p01's duplicate foundation is superseded work, not additional shipped functionality. Earlier sidecar/ignored-metadata prescriptions are historical, not delivered architecture.
- The user approved dependency-ready parallelism, combining deep guides with initial family authoring, one review round per phase and the eight gates once at close. Fable took over phases 3–6 during Codex's usage reset. Final delivery is one user-requested PR rather than the earlier proposed release units.
- Phases 3–6 lack the originally named per-phase native reviewer artifacts. Drafter/verifier lane pairs and persona reruns do not retroactively fill that omission. The adoption evaluator used HTTP text; initial Fable visual QA used author-run Playwright on the Mini, while laptop Zen checked reachability and two dark-mode pages only.
- Later fully non-author native Mini QA and the bounded final re-review close final acceptance, not historical per-phase omissions. GitHub README judgment was artifact-only, using root's actual published light/dark captures; the independent judge did not operate GitHub itself.

## Verification and Acceptance Basis

The recorded developer persona rerun resolved its six earlier problems. The evaluator rerun resolved 11 of 14, partially resolved two, and retained one subsequently addressed at `a554e9e46`. These are bounded reported outcomes, not a claim that every reader now finds every page clear.

[Independent native QA](reviews/final-independent-native-qa-2026-10-02.md) exercised seven journeys, four docs diagrams, both themes and simulated narrow views; [root's native supplement](reviews/final-native-visual-qa-2026-10-02.md) includes the corrected adoption table. The README SVG was judged from published captures. Phone-label readability and unavailable telemetry remain limits; screenshots/source/HTTP checks are not interchangeable with computer use.

Eight ordered gates exited zero on the correction basis through `64a48da1e`: `pnpm check`, `pnpm type-check`, `pnpm test`, `pnpm build`, skill bumps, release versions after fetch, release validation and docs build. Check/types executed six of eleven Turbo tasks; tests executed five of eleven plus direct smoke/skill/script suites (CLI 8,027; control-plane 153; smoke 163; skills 690; scripts one). Root build and gate docs build replayed caches. After the one-line `c916af45c` correction, direct docs validation and 13 focused tests passed; the forced final docs build executed all six tasks with zero cache. The full eight gates were **not** rerun after that line. Basis/log pointers are in [implementation.md](implementation.md#resumed-dispatch-and-validation-outcomes).

The final source-review correction recheck returned zero findings. The distinct configured cross-family gate passed its High threshold with **0 Critical / 0 High / 1 Medium / 2 Low**, not zero residual findings. Root accepted these ordered dispositions in [the final gate closeout](implementation.md#final-gate-closeout):

1. **M1 stale PJM/backlog pointers:** fixed at `5e3bed75b`; canonical destinations verified, no capability/prose change.
2. **L1 two pre-existing `.agents/README.md` links:** queued for the already-configured document step; final approval waits for it.
3. **L2 root README missing from local Turbo hash:** explicitly deferred to separately scoped tooling work. Direct `pnpm docs:validate` executes the consumer check; current CI caches the pnpm store, not Turbo outputs.

## Conservation and Integration Notes

At extraction SHA `c916af45c9860c000027d7e0467f6a77149861b8`, real read-only APIs exposed 165 Commander nodes (132 action-bearing, 33 structural), 364 explicit option declarations, 110 scoped supported configuration entries and the same 71 eligible skills. Three command/five option additions and three historical option removals are accounted as accepted upstream source replacements, not documentation-removal approval.

The original migration receipt accounts for 816 protected plus 24 router units. All 859 accepted post-main units have named current dispositions: 720 exact hashes, 42 exact-prefix additions, seven exact-node insertions, 23 payload/structure cases and 67 existing-ledger correspondences. Proof strengths differ; neither matching names nor the aggregate 67 count alone proves semantic conservation. The tracked [item-by-item accounting](references/current-coverage-accounting.json) and [closeout](references/conservation-closeout.md) preserve provenance and keeper evidence. All 76 post-main pages remain; current source contains 89 pages.

Current nav flags follow main: old `docs nav sync --framework` and `--validate-only` were superseded by detection/current checking; `project dispatch record --project` was superseded by validation-only evidence handling. Do not restore branch-only flags from historical plans. Source and generated docs remain separate; permanent validators do not depend on project-local accounting artifacts.

## Follow-up Items

- **Named reference gaps:** nine command spellings remain absent, including legacy pack initializers, cleanup selection, split signal evaluation and two internal diagnostics. Seventy-six option declarations lack scoped reference evidence; meaningful gaps include canonical install/remove, cleanup confirmation, remote publication/continuation authority, shared-storage inputs and split controls. These are not 76 equivalent missing capabilities.
- **Configuration completeness:** 39 scoped exact-key/pattern gaps remain (36 remote-policy operation/provider fields, legacy `workflow.dispatchCeiling.providers.claude`, and project/user `sync.providers.<name>.strategy`). Family policy guidance exists but is not a complete per-key reference.
- **Reader limits:** ideas-lifecycle phone-width labels remain difficult; the adjacent text equivalent is the supported recovery. Tool Packs, Workflow Gates and Dispatch Ceiling have backlogged restructuring needs; stability/support/non-goals wording requires the owner's own statement.
- **Product scope:** roughly 46 discovered product defects/gaps were grouped into 25 `BL-261002-*` items, documented in [product-defects-found.md](references/product-defects-found.md). This project did not fix that product backlog. Its validator correction is real tooling work, not proof those product defects were resolved.
- **Closeout boundary:** document and PR steps, queued README pointer repair and final approval remain root-owned. Local README cache hashing is a separate follow-up. No merge, release, installation or live-provider acceptance is implied by this summary.

## Workflow Observations

### 2026-10-02 · structural · oat gate review · plan

target=claude-opus-5-5-high threshold=high exit=1 status=artifact_validation_failed artifact=.oat/projects/shared/docs-improvement-overhaul/reviews/artifact-plan-review-2026-10-02T031625Z.md run=b5d44f07-4bda-4d0d-a45b-ef06aef72067

### 2026-10-02 · structural · oat gate review · plan

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:1,low:1 exit=0 status=ok artifact=.oat/projects/shared/docs-improvement-overhaul/reviews/artifact-plan-review-2026-10-02T032232Z.md run=7b51c81d-c62c-42d2-aab5-1316713014c1

### 2026-10-02 · structural · oat-project-implement · p01

docs-overhaul-run1-p01-pass: p01 accepted after two bounded fix rounds; original native dispatch and terminal review provenance in implementation.md and reviews/p01-code-review-round03-2026-10-02T060828Z.md; all eight root gates exit zero.

### 2026-10-02 · structural · oat-project-implement · p02-t01

docs-overhaul-run1-p02-peer-map-blocked: STOP at required Fable migration-map review; independent M1/M2 recheck passed with zero findings, but peer pane has an unsent draft and queued request consumption is unverified. No pages moved and p02-t01 remains incomplete; evidence in reviews/p02-migration-draft-review-round02.md and references/draft-correction-receipts.json.

### 2026-10-02 · structural · oat-project-implement · p02-t01

docs-overhaul-run1-p02-peer-map-resume: actual Fable map review received via user, destinations and route-only supersessions approved conditional on R1/R2; resume same phase handle for bounded corrections and independent conservation recheck. User explicitly authorizes direct peer sends despite draft signals; see references/orchestration-log.md and references/fable-p02-map-review.md.

### 2026-10-02 · structural · oat-project-implement · p02-main-integration

docs-main-merge-084053c: merge complete, original phase02 handle DONE/HOLD, main-only foundation and all moved main docs retained; focused integration review and new closure gates underway.

### 2026-10-02 · structural · oat-project-implement · p02

docs-p02-close-084053c: accepted, original native review fixes verified, Fable correction and main integration accepted, all eight gates0; recovery1/10, no publication.

### 2026-10-02 · structural · oat-project-retro · project-retro

retro artifact=.oat/projects/shared/docs-improvement-overhaul/references/project-retro.md evidence_used=ci-checks,claude-session-transcript,claude-subagent-transcripts,codex-child-transcripts,codex-root-transcript,git-history,lifecycle-artifacts,project-log,review-artifacts evidence_unavailable=codex-child-task-prompts,oat-execution-learnings promotions=6 upstream=6 apply=performed filing=deferred

### 2026-10-02 · structural · oat gate review · final

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:1,low:2 exit=0 status=ok artifact=.oat/projects/shared/docs-improvement-overhaul/reviews/final-review-2026-10-02T222323Z.md run=45d2802b-263d-447c-904b-5a36d35b1dd9
