---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-07
oat_generated: true
oat_summary_last_task: prev2-t04
oat_summary_revision_count: 2
oat_summary_includes_revisions: [p-rev1, p-rev2]
---

# Summary: oat-project-retro

## Overview

OAT needed a durable way to learn from completed project runs without conflating
delivery summaries with execution reflection. This project added an
evidence-grounded retrospective at the post-approval lifecycle boundary, with
separate paths for repo-local improvements and upstream toolkit feedback.

## What Was Implemented

- Added `oat-project-retro` with generate and apply modes. It inventories
  available evidence honestly, writes
  `references/project-retro.md`, and applies approved repo promotions
  idempotently.
- Added `oat-project-retro-file` for consent-aware filing to repository issues,
  OAT backlog items, or upstream issues after capability, duplicate, metadata,
  and sanitization checks.
- Added the machine-scannable `project-retro.md` template. Stable RP and UP
  registers, disposition-specific status fields, and independent promotion and
  filing rollups make interrupted runs resumable.
- Added `retro` as a post-approval-only structured closeout step, the
  `workflow.retro` configuration namespace, and an interactive completion
  safety-net when a retro is missing.
- Registered and bundled the new skills and template, published lifecycle,
  configuration, artifact, and skill-catalog documentation, and advanced the
  five public packages in lockstep to `0.2.30`.
- Dogfooded generation and apply behavior on the completed
  `explainer-improvements` project. One explicitly approved promotion was
  applied; no external filing write was performed.
- Added strict control-plane support for canonical and legacy revision
  phase/task dialects without weakening ordinary phase parsing.
- Dogfooded the workflow twice on this project, then refined mutable-state
  coherence, duplicate handling, verified local receipts, deterministic run
  receipts, standalone evidence-anchored narratives, precise evidence
  inventories, and append-only project-log correction routing. The observed
  closeout defect became `BL-260806-fail-closed-when-configured`.

## Key Decisions

- **Retrospectives run after approval:** A retro is valid only in
  `postApproval`, after the final feedback tail exists but before completion
  freezes project artifacts. Legacy sequence mappings remain unchanged.
- **The retro artifact is the integration contract:** Promotion and upstream
  registers carry stable IDs, authoritative dispositions, bounded mutable
  fields, and independently derivable rollups. Completion, apply, and filing
  consumers remain decoupled.
- **Generation, application, and filing have separate consent boundaries:**
  Explicit sequence configuration may authorize generation, `apply: auto` may
  authorize bounded non-interactive promotions, and configured filing
  destinations may authorize new filings. Existing duplicate mutation and
  consequential actions still require direction.
- **Filing is a companion workflow:** Retro generation records ready-to-file
  proposals but does not create issues or backlog items. The filing skill owns
  destination preflight, deduplication, sanitization, and status writeback.
- **Local filing is destination-first:** New or strengthened local backlog
  destinations must be committed and verified before a later retro writeback
  may record `filed`; local links recover an exact-path receipt, and invalid
  legacy states fail closed.
- **Mutable prose has one bounded home:** `Current State` is derived from
  register fields and frontmatter rollups. Proposal bodies and historical
  narrative remain immutable after generation.
- **Receipt outcomes use one pre-action snapshot:** A total precedence rule
  derives `skipped`, `declined`, `deferred`, or `performed` from initial
  eligibility, action entry, completion, and remaining work.

## Design Deltas

- Phase reviews tightened the original register contract with a mutable
  disposition-note, exact settled/unsettled rollup rules, rendered-provenance
  validation, interrupted-side-effect recovery, and deterministic
  non-interactive duplicate handling.
- Review-required maintenance expanded the p02 and p03 boundaries to focused
  contract tests and autonomy inventory updates. The final review also required
  explicit `Bash(pnpm:*)` grants so both skills could execute their mandatory
  artifact-hygiene steps.
- Revision reviews aligned `design.md` with destination-first filing,
  scenario-specific recovery, deterministic receipt transitions, stable
  evidence anchors, and append-only project-log corrections.

## Notable Challenges

- The plan artifact required four review attempts before its post-approval,
  register-routing, config-command, release-ordering, and rendered-provenance
  contracts were complete.
- Phase reviews exposed resumability and lifecycle-contract gaps that required
  bounded same-target fix continuations before integration.
- Final release testing encountered deterministic smoke residue from temporary
  branches and worktrees. Root verified the resources were disposable, removed
  only those resources, and resumed the accepted phase target.
- The first whole-project review found that mandatory pnpm hygiene commands
  were outside both retro skills' declared grants. A focused final fix and
  narrowed re-review closed the gap.
- The configured post-implementation sequence originally reached terminal
  implementation without a durable snapshot, forcing manual summary,
  documentation, and PR recovery. The dedicated backlog item preserves the
  fail-closed follow-up.
- Final revision review found missing durable event identities for both p-rev1
  review rounds. Root review-receive bookkeeping reconciled and archived the
  artifacts before the corrected-state final pass.

## Tradeoffs Made

- Autonomous defaults remain unchanged: a retro never runs without explicit
  sequence configuration or interactive confirmation.
- V1 uses artifact- and skill-level evidence discovery instead of adding general
  CLI evidence helpers.
- Filing routes per lane rather than per item; item-level retargeting remains
  deferred until usage demonstrates a need.

## Integration Notes

- Existing installations need `oat tools update` followed by
  `oat sync --scope all` to receive the new bundled skills and template.
- `workflow.postImplementSequence.preApproval` rejects `retro`; place it only in
  `postApproval`.
- `workflow.retro.apply` and `workflow.retro.filing.*` are consent-bearing
  settings. When unset in non-interactive runs, findings remain proposals.

## Follow-up Items

- Implement `BL-260806-fail-closed-when-configured`: configured closeout must
  persist its snapshot and fail closed until ordered children are durably
  complete.
- Optional future refinements include splitting a large upstream-feedback lane,
  reusable evidence-audit automation, general CLI evidence helpers, per-item
  filing retargeting, and thin filing aliases if usage justifies them.

## Revision History

- **p-rev1 — Dogfood revision:** Four tasks converted self-retro findings into
  coherence, duplicate-classification, durable-receipt, and concise-output
  contracts. One bounded review-fix round repaired receipt chronology,
  local-link/rerun recovery, and design alignment; the re-review and final
  whole-project review passed.
- **p-rev2 — Second-dogfood refinement:** Four tasks clarified receipt,
  narrative, evidence-inventory, and project-log correction contracts. Two
  bounded fix rounds established executable append semantics and a total
  pre-action outcome state machine; round three passed with no findings.

## Workflow Observations

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/oat-project-retro/reviews/artifact-plan-review-2026-08-06T002316Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/oat-project-retro/reviews/artifact-plan-review-2026-08-06T004058Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/oat-project-retro/reviews/artifact-plan-review-2026-08-06T005234Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/oat-project-retro/reviews/artifact-plan-review-2026-08-06T005256Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:0 exit=0 status=ok artifact=.oat/projects/shared/oat-project-retro/reviews/artifact-plan-review-2026-08-06T012151Z.md

### 2026-08-06 · project · bug · configured post-implementation sequence was skipped

Observation: workflow.postImplementSequence configured preApproval=[summary, document, pr], but implementation finished without persisting oat_post_implement_sequence or dispatching those children; document and pr-final were run manually after final approval, and pr-final generated the missing summary as fallback. Impact: required pre-approval ordering and sequence provenance were lost even though the final artifacts now exist. Recommendation: fail closed before implementation completion when a configured sequence has no durable snapshot or incomplete pre-approval steps, and add regression coverage for this boundary. (observed on oat-project-implement 2.0 closeout contract, CLI 0.2.29)

### 2026-08-06 · structural · oat-project-retro · references/project-retro.md

artifact=.oat/projects/shared/oat-project-retro/references/project-retro.md evidence=project-log,lifecycle-artifacts,archived-reviews,session-transcript,github-pr-192 unavailable=oat-execution-learnings promotions=0 upstream=1 apply=deferred filing=deferred

### 2026-08-06 · structural · oat-project-implement · p06

Phase passed after one bounded review-fix round; see reviews/p06-review-2026-08-06T234340Z.md.

### 2026-08-07 · structural · oat-project-implement · p-rev1

Phase passed after one bounded review-fix round; see reviews/p-rev1-review-2026-08-07T003046Z.md.

### 2026-08-07 · general · bug · configured post-implementation sequence was skipped

Promotes : configured closeout must persist its sequence snapshot and fail closed until ordered children are durably complete; the dedicated backlog item remains the implementation follow-up. (observed on OAT CLI 0.2.30)

### 2026-08-07 · general · bug · configured closeout promotion correction

Correction to "### 2026-08-07 · general · bug · configured post-implementation sequence was skipped", whose source heading was dropped during command serialization. Promoted from "### 2026-08-06 · project · bug · configured post-implementation sequence was skipped": configured closeout must persist its sequence snapshot and fail closed until ordered children are durably complete; the dedicated backlog item remains the implementation follow-up. (observed on OAT CLI 0.2.30)
