---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-06
oat_generated: true
oat_summary_last_task: p05-t02
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
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
  five public packages in lockstep to `0.2.29`.
- Dogfooded generation and apply behavior on the completed
  `explainer-improvements` project. One explicitly approved promotion was
  applied; no external filing write was performed.

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

## Design Deltas

- Phase reviews tightened the original register contract with a mutable
  disposition-note, exact settled/unsettled rollup rules, rendered-provenance
  validation, interrupted-side-effect recovery, and deterministic
  non-interactive duplicate handling.
- Review-required maintenance expanded the p02 and p03 boundaries to focused
  contract tests and autonomy inventory updates. The final review also required
  explicit `Bash(pnpm:*)` grants so both skills could execute their mandatory
  artifact-hygiene steps.

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

- Upstream issue filing remains unavailable until issues are enabled on
  `voxmedia/open-agent-toolkit`; generated retros preserve proposals meanwhile.
- Optional future refinements include splitting a large upstream-feedback lane,
  reusable evidence-audit automation, general CLI evidence helpers, per-item
  filing retargeting, and thin filing aliases if usage justifies them.

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
