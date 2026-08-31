---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-31
oat_generated: true
oat_summary_last_task: p04-t05
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: Scope and Adoption Diagnostics

## Overview

This project corrected a bounded set of diagnostics and migration behaviors
left after the user-scope tool-pack work. It made PJM migration eligibility,
provider-aware user-agent reachability, shared-owner attribution, and inventory
failure output reflect the repository's actual adoption and materialization
state without taking over the broader provider-by-scope model.

## What Was Implemented

- PJM migration treats judgment-only backlog and second-roadmap leftovers as
  proposals, not mechanically migratable legacy input. They neither authorize
  writes nor prevent a complete canonical repository from returning
  `already-migrated`; complete and incomplete judgment-only layouts are
  byte-for-byte write-free.
- User-agent diagnostics now derive Codex and Cursor managed-role reachability
  from the same config-aware active-provider resolution used by sync. Explicit
  enablement, disablement, detection, and mixed-provider cases are covered
  without treating Claude as a user managed-role materialization path.
- Shared-owner observations now have one canonical representation on the
  selected applicable scope, with no duplicate parent-pack copy. Inventory,
  doctor, status, and removal consume that scope-owned observation, while human
  and JSON output render it exactly once.
- Tests now assert production-reachable lifecycle, manifest, ownership, scope,
  and exception-safety behavior instead of tautological or impossible fixtures.
  CLI Vitest concurrency is capped at four workers so Git-heavy fixtures remain
  stable under the full workspace gate without weakening timeout contracts.
- PR #244's narrow PJM generated-pointer cleanup was integrated first with no
  `pjm/doctor.ts` source conflict. The lockstep public release unit and bundled
  version map advanced to `0.2.50` after integrating current `origin/main`, and
  backlog item `BL-260827-correct-scope-and-adoption` was archived.
- PR #249's migration-eligibility and shared-owner representation findings were
  resolved by `p04-t04` and `p04-t05`. A narrowed four-commit final review found
  zero findings; fresh targeted verification passed 39/39 PJM tests and 181/181
  shared-owner tests. Thomas directed completion without rerunning the now-stale
  configured exit gate.

## Key Decisions

- **Legacy evidence is independent.** Adoption labels and judgment proposals
  describe repository context but cannot prove that mechanically migratable
  input exists. Migration writes require recognized mechanical legacy sources,
  while current scaffold completeness separately determines
  `already-migrated`.
- **Provider-aware reachability.** User-agent
  reachability uses config-aware provider activation rather than filesystem
  presence alone, keeping diagnostics aligned with sync behavior across
  enabled, disabled, detected, and undetected states.
- **Diagnostic inventory failures.** Doctor and status
  continue consuming one canonical inventory model, but an inventory exception
  becomes structured unavailable output instead of a silent fallback or a
  fatal `oat status` error.

## Design Deltas

- PRs #240 and #242 changed inventory, doctor/status, lifecycle, and canonical
  agent-read contracts after the original plan. Five tasks were adapted to
  current main; none were already satisfied. Broader provider state, projection,
  catalog visibility, collection symlinks, restart guidance, `AGENTS.md`
  behavior, picker truthfulness, and dispatch provenance stayed with
  `tool-pack-scope-provider-truthfulness`.
- The cleanup-first dependency landed as PR #244 and was merged into the
  diagnostics history instead of rebasing completed task commits. Generated
  project/version conflicts were reconciled while the shared doctor source had
  no conflict.
- The full test gate exposed host-load-dependent Git fixture timeouts. One
  authorized recovery added only a four-worker CLI test cap; production code,
  assertions, fixtures, and timeout values remained unchanged.
- PR #249 exposed two bounded contract gaps after closeout: judgment proposals
  still counted as migration input, and one shared-owner observation was stored
  at both scope and pack levels. The revision tightened those existing
  contracts without expanding provider/scope ownership.

## Notable Challenges

- The exact full test command failed repeatedly with changing timeout-only
  fixture sets even though focused behavior passed. Completion remained blocked
  until the exact command passed after the bounded concurrency fix; the final
  revision subsequently passed all 4,648 CLI tests.
- The configured Claude Fable exit gate accepted a run but could not refresh
  expired OAuth, so it produced no receive-eligible review. That generation was
  preserved and retired without consuming a remediation attempt; an explicit
  one-time Cursor Fable gate then passed with zero findings.

## Tradeoffs Made

- Provider-aware diagnostics consume the existing active-adapter seam but do
  not define directory-level provider sync or the full provider-by-scope state
  model. This keeps the slice mergeable ahead of the umbrella project.
- Shared-owner attribution keeps one scope-owned observation rather than
  duplicating it for convenient consumers. Callers consume the canonical scoped
  representation instead of depending on hidden deduplication.
- Test stability is controlled at runner concurrency rather than by extending
  timeouts, so slow regressions remain visible at the cost of less intra-package
  parallelism.

## Integration Notes

- `tool-pack-scope-provider-truthfulness` should rebase after this diagnostics
  slice and preserve the config-aware managed-role input and canonical
  inventory/rendering seams unless it deliberately supersedes them.
- The diagnostics branch already includes PR #244. Future work touching
  `pack-inventory.ts`, doctor/status reporting, or provider activation should
  reconcile against both changes rather than replaying pre-PR assumptions.

## Associated Issues

- Completed and archived:
  `BL-260827-correct-scope-and-adoption` — Correct scope and adoption
  diagnostics.

## Workflow Observations

### 2026-08-27 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/scope-adoption-diagnostics/reviews/artifact-plan-review-2026-08-27T221042Z.md

### 2026-08-30 · structural · oat-project-implement · p01

Phase p01 passed after two planned commits and one bounded review fix; High re-review passed with zero findings. Artifact: reviews/p01-review-2026-08-30T220913Z.md.

### 2026-08-30 · project · feedback · merge-order

Diagnostics implementation may continue, but merge waits for migrate-the-legacy-pjm to land. Rebase diagnostics, inspect any pjm/doctor.ts overlap, and rerun the PJM suite before merge; tool-pack-scope-provider-truthfulness rebases after diagnostics.

### 2026-08-30 · structural · oat-project-implement · p02

Phase p02 passed after three planned commits and one settled phase-recovery attempt; High review passed with zero findings after attempted reviewer reconnaissance was rejected pre-start and reconciled inline. Artifact: reviews/p02-review-2026-08-30T224248Z.md.

### 2026-08-30 · structural · oat-project-implement · p03

Phase p03 passed after two test-only commits; High review passed with zero findings. Artifact: reviews/p03-review-2026-08-30T225845Z.md.

### 2026-08-30 · structural · oat-project-implement · p04-integration

PR #244 integrated at ac380219d after diagnostics release commit 0d6371d69; no source conflict existed in packages/cli/src/commands/pjm/doctor.ts, generated backlog/version conflicts preserved both projects, and oat pjm doctor passed all checks.

### 2026-08-30 · project · friction · full-test-gate

The final focused suite passed 417/417 and all timeout-affected files passed 250/250 together in a bounded rerun, but three ordinary full-suite runs and one forced run remained nonzero from changing Git-fixture timeouts; no assertion failed. Keep p04-t02 blocked until pnpm test exits zero; do not treat isolated evidence as a gate pass.

### 2026-08-30 · structural · oat-project-implement · p04-test-retry

Exact pnpm test retry exited 1 with 4593/4599 passing and six timeout-only failures across four Git-heavy files; the failure set again changed and shrank, with no assertion failure. p04-t02 remains blocked.

### 2026-08-31 · structural · oat-project-implement · p04

Phase p04 passed High review with zero findings at 89a74da25cfb8e870b74645d760feeb6bb03996a after one authorized concurrency-only recovery; reviewer reconnaissance launch was attempted but rejected at the host thread limit, so the primary reviewer reconciled inline. Artifact: reviews/archived/p04-review-2026-08-31T002514Z.md

### 2026-08-31 · structural · oat-project-implement · final

Final High review returned PASS with one Minor artifact-alignment finding; p04-t03 resolved the three current summaries in e920d77c1, and Thomas explicitly waived a redundant second review before configured closeout.

### 2026-08-31 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important exit=1 status=review_failed

### 2026-08-31 · project · friction · implementation exit gate authentication

Observation: configured gate run 09b87ee3-2fde-4ed4-b863-67d2365a2e79 accepted claude-fable-skip-permissions but returned review_failed because Claude OAuth expired and could not refresh. Impact: no review artifact or receive-eligible handoff exists, so closeout remains blocked with 0/2 remediation attempts consumed. Recommendation: restore Claude authentication and resume oat-project-implement against the persisted generation.

### 2026-08-31 · structural · oat gate review · final

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/scope-adoption-diagnostics/reviews/final-review-2026-08-31T013235Z.md

### 2026-08-31 · structural · oat-project-retro · project-retro

retro artifact=.oat/projects/shared/scope-adoption-diagnostics/references/project-retro.md evidence_used=archived-review-markdown,decision-records,gate-receipts,git-history,lifecycle-artifacts,project-log,session-transcript evidence_unavailable=active-review-markdown,host-resource-telemetry,oat-execution-learnings,raw-gate-logs promotions=0 upstream=0 apply=skipped filing=skipped
