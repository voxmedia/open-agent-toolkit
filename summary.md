---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-30
oat_generated: true
oat_summary_last_task: p03-t09
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: Gate Execution Contract Hardening

## Overview

This quick-workflow project replaced two discovery-only projects with one
bounded execution contract spanning gate configuration, headless review
runtime behavior, and configured-command integration. It closed the gap where
malformed lifecycle review commands could be persisted and where a clean child
exit without an artifact was diagnosed as a correlation mismatch.

## What Was Implemented

- Added a pure, conservative classifier for direct lifecycle
  `oat gate review` commands. `oat gate set` now requires canonical global
  `--json` placement for recognized commands and rejects invalid shapes before
  shared, local, or user configuration is mutated.
- Added the fail-closed `artifact_missing` /
  `review_completed_artifact_missing` terminal for a clean accepted child that
  produces no artifact. Existing refusal, timeout, validation, and correlation
  mismatch outcomes retain their distinct diagnoses.
- Reinforced the runner-owned headless prompt and five lifecycle skills so
  review work, artifact creation, and bookkeeping must finish inline or be
  synchronously awaited before the child exits.
- Added a configuration-driven subprocess harness that persists, resolves, and
  executes the exact stored command through the PATH-selected source CLI. It
  proves correlated success, missing-artifact failure, and wrong-run mismatch
  as separate structured outcomes.
- Updated public docs and all five lockstep public packages to 0.2.49, retired
  the two superseded project trees, and archived both owned backlog items.

All 13 tasks completed. Phase reviews passed, conflict reconciliation against
current main preserved migrated PJM state, and the final independent decision
review passed with zero findings. The replacement configured Claude exit gate
then passed at the Important threshold with zero findings and was received
durably.

## Key Decisions

- **Conservative direct-command validation:** Validate only recognized direct
  lifecycle gate-review commands at the configuration-write boundary, require
  `oat --json gate review`, preserve valid argv byte-for-byte, and leave
  wrappers, pipelines, and provider `baseCommand` values outside this
  classifier. This closes the durable configuration defect without pretending
  to provide a general shell parser.
- **Cause-specific fail-closed runtime terminal:** Treat clean accepted child
  completion without an artifact as `artifact_missing`, distinct from an
  observed artifact that fails run, project, or invocation correlation. Both
  remain non-receive-eligible and authorize neither same-run remediation nor a
  replacement accepted launch.
- **Synchronous configured-command proof:** Require headless work to complete
  synchronously and verify the contract by executing the exact configured
  command through the deterministic fake runtime. This tests the public
  configuration-to-envelope seam without adding provider-specific behavior.

## Design Deltas

- `packages/cli/assets/public-package-versions.json` joined p03-t03 because the
  release/build tooling deterministically regenerates it from the planned
  lockstep package versions. This changed bookkeeping scope, not behavior.
- The first final review established that shipped configuration enforcement,
  runtime classification, and prompt ownership live together in
  `packages/cli/src/commands/gate/index.ts`, while the configured subprocess
  proof lives in `configured-gate.integration.test.ts`. The stale handoff was
  corrected to those accepted source-of-truth paths, and quick-mode `spec.md`
  was explicitly marked not applicable.
- Conflict reconciliation absorbed current main's PJM migration and planning
  state while retaining the two archived backlog records, the combined project
  owner, regenerated indexes, and lockstep 0.2.49 release metadata.

## Notable Challenges

- The first p01 review exposed supported `--cwd`, shell newline/backtick, and
  empty quoted-token cases in the conservative classifier. Two bounded fix
  iterations added regression coverage and reached a zero-finding phase review
  without widening the wrapper boundary.
- The first final review found two Medium and one Minor handoff/contract gaps.
  p03-t04 corrected project references, p03-t05 completed the public
  `artifact_missing` assertion, and the independent re-review passed with zero
  findings.
- The post-merge review found stale planning references, a POSIX
  single-quoted-backslash tokenizer edge case, and a migrated scope estimate.
  p03-t06 through p03-t09 resolved each item; two narrowed decision reviews
  verified the combined project as the sole owner and ended with zero findings.
- Running test and build concurrently exposed a shared CLI asset-bundling race.
  The gates were rerun sequentially, where check, type-check, test, build,
  lint, and format all exited 0.

## Tradeoffs Made

- Blocking validation applies only when the command is confidently recognized
  as a direct lifecycle gate review. Unknown wrapper-heavy commands retain
  compatibility, at the cost of remaining outside this validation guarantee.
- `artifact_missing` adds a public terminal literal so automation receives an
  actionable cause instead of an overloaded mismatch status. Eligibility and
  retry semantics remain unchanged to avoid broad receipt/event redesign.

## Integration Notes

- Lifecycle declarations must place the global option before the subcommand:
  `oat --json gate review ...`. Provider exec-target commands are a separate
  argv contract and must not receive this OAT option.
- A successful child exit is insufficient: a correlated artifact remains the
  only receive-eligible outcome. Fix synchronous artifact production and begin
  a new gate run rather than attempting review-receive or same-run remediation.

## Follow-up Items

- None within the approved execution-contract scope. Receipt/event redesign,
  ReviewPlan, bookkeeping-only re-review policy, and general review/gate
  integrity remain owned by their existing work rather than this project.

## Associated Issues

- `BL-260826-gate-targets-must-not-yield` — archived after synchronous headless
  completion and missing-artifact behavior shipped.
- `BL-260726-validate-structured-output` — archived after configuration-time
  canonical structured-output validation shipped.

## Workflow Observations

### 2026-08-30 · structural · oat gate review · plan

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:0,minor:2 exit=0 status=ok artifact=.oat/projects/synced/gate-execution-contract-hardening/reviews/artifact-plan-review-2026-08-30T222802Z.md

### 2026-08-30 · structural · oat-project-implement · p01-p02

Parallel fan-in merged p01 then p02 in plan order; both root reviews passed and the combined 478-test suite plus CLI type-check passed.

### 2026-08-30 · structural · oat-project-implement · p03

Phase p03 passed root review with three task commits; full DoD, uncached verification, release validation, docs build, and owned backlog closeout passed.

### 2026-08-31 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:0,minor:1 exit=0 status=ok artifact=.oat/projects/synced/gate-execution-contract-hardening/reviews/final-review-2026-08-31T000938Z.md

### 2026-08-31 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/synced/gate-execution-contract-hardening/reviews/final-review-2026-08-31T014107Z.md
