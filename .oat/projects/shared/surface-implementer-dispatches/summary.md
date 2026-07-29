---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-29
oat_generated: true
oat_summary_last_task: p03-t02
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: surface-implementer-dispatches

## Overview

Managed-capped implementation and fix dispatches could previously resolve
without an exact candidate while leaving no durable indication that candidate
selection had been skipped. This project made that condition visible and
auditable, preserved the root agent's classification judgment, and added the
agreed disclosure for terminal Fable reviewer access and retention-policy
eligibility.

## What Was Implemented

- Extended Dispatch Report V1 with caller-supplied task classification, legacy
  preferred-selection provenance, and ordered structured notices. Legacy
  producers receive safe nullable defaults, and compatibility stamps remain
  byte-for-byte stable.
- Added provider-neutral `--task-class` and Codex-only `--task-effort` inputs.
  Managed named-cap implementation/fix resolutions now emit coded human and JSON
  warnings when exact candidate selection is skipped or a selected candidate
  lacks task-class provenance, while retaining `status: resolved` and exit code
  `0`.
- Centralized terminal-reviewer notices across bundled policy choices,
  post-adoption effective configuration, and runtime reviewer/preflight
  resolution. The notices distinguish target disclosure from organization-owned
  checks for model access and applicable retention policy.
- Updated implementation guidance, executable skill contracts, and user
  documentation for classified dispatches, pre-launch notice handling, and the
  14-recommended/18-catalogued Cursor boundary.
- Bumped the five lockstep public packages and bundled inventory to `0.2.25`,
  repaired the bounded PJM doctor failures, refreshed the autonomy inventory,
  and archived `BL-260727-surface-implementer-dispatches`.

## Key Decisions

- **Classification-only provenance.** Task class and applicable Codex effort are
  recorded independently from policy, candidate requests, and selected targets.
  The CLI requires the provenance in report context but does not judge whether
  the root agent's classification was correct.
- **Provider-neutral selection warnings.** Skipped exact-candidate selection is
  detected for actual managed named-cap implementation/fix routes across
  providers. The release uses stable coded warnings rather than hard failure so
  existing successful resolution and exit semantics remain compatible.
- **Additive dispatch reports.** Classification, legacy preferred selection, and
  notices were added as backward-compatible fields with safe defaults. Existing
  field meanings and the compatibility `Dispatch:` stamp grammar remain
  unchanged.
- **Effective-target reviewer notices.** Policy choices describe the bundled
  recommendation, while adoption and runtime notices derive from the effective
  configured or resolved target. OAT discloses the Fable constraint without
  claiming to establish model access or organization-specific retention
  eligibility.

## Design Deltas

- Phase 2 review showed that effective-target extraction needed to cover layered
  configuration precedence, bare provider values, candidate arrays, and fallback
  routes. Two bounded fix iterations generalized the shared extraction logic
  before the phase passed review.
- Phase 3 verification exposed a stale generated autonomy mapping and two
  pre-existing failing PJM doctor checks. With explicit approval, the plan was
  expanded only to refresh that inventory, initialize canonical decisions
  guidance, and remove template-only metadata from nine instantiated records;
  unrelated PJM warnings remained out of scope.

## Notable Challenges

- Initial post-adoption disclosure used only the written configuration surface
  instead of the effective `local > shared > user` result, and runtime disclosure
  missed supported bare Cursor Fable values. Review-driven fixes first added
  layered re-resolution and runtime fallback, then covered the remaining bare
  provider and candidate-array shapes.
- Closeout stopped twice as repository-wide checks revealed work not represented
  in the original task boundary. Each stop restored a clean worktree, obtained an
  explicit bounded plan decision, and resumed at the same implementation target.

## Tradeoffs Made

- The skipped-selection condition is warning-first for this compatibility
  release. This provides auditability without breaking callers; a future
  fail-closed transition remains separate work.
- Structured observability was added without changing target selection or the
  compatibility stamp. Consumers gain richer reports, while older producers and
  parsers retain their established contract.

## Integration Notes

- `--task-class` and `--task-effort` require report scope plus an
  implementation/fix report action; `--task-effort` is Codex-only. Reviewer
  resolver calls deliberately carry no classification flags.
- Terminal-reviewer notices are advisories. Recommendation metadata is not a
  substitute for the effective target, and Fable catalogue presence does not
  prove access or retention-policy eligibility.

## Follow-up Items

- **M1 — Cross-provider warning/suppression report-context matrix:** add bounded
  command-level cases for lower-tier exact candidates, at-cap legacy preference,
  managed Claude/Cursor skipped selection, and inherit/uncapped/unresolved
  suppression. This is regression-depth hardening rather than a known behavior
  defect; revisit when managed-cap warning predicates or command-level Dispatch
  Report context tests next change. Source:
  [`implementation.md`](implementation.md#deferred-findings-medium).

## Associated Issues

- Completed and archived
  `BL-260727-surface-implementer-dispatches`.

## Workflow Observations

### 2026-07-29 · structural · oat gate review · plan

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:1 exit=0 status=ok artifact=.oat/projects/shared/surface-implementer-dispatches/reviews/artifact-plan-review-2026-07-29T034646Z.md

### 2026-07-29 · structural · oat-project-implement · p01

Phase outcome: passed; fix-loop count: 0; review artifact: reviews/code-p01-review-2026-07-29T043611Z.md.

### 2026-07-29 · structural · oat-project-implement · p02

Phase outcome: passed; fix-loop count: 2; final review artifact: reviews/code-p02-review-2026-07-29T123104Z.md.

### 2026-07-29 · structural · oat-project-implement · p03

Phase outcome: blocked; fix-loop count: 0; p03-t02 stopped at pnpm test due stale autonomy mapping ffb3af0ba8ef.

### 2026-07-29 · structural · oat-project-implement · p03-t02-stop

STOP: plan decision required before refreshing .agents/docs/autonomy-contract.md and resuming p03-t02.

### 2026-07-29 · structural · oat-project-implement · p03-t02-resume

Blocker resolved by explicit approval: p03-t02 now includes the derived .agents/docs/autonomy-contract.md refresh; resume in Run 2.

### 2026-07-29 · structural · oat-project-implement · p03-run2

Phase outcome: blocked; fix-loop count: 0; Run 2 stopped at pre-existing failing pjm doctor checks after all earlier gates passed.

### 2026-07-29 · structural · oat-project-implement · p03-t02-stop-2

STOP: explicit decision required on bounded PJM remediation or a documented pjm doctor exception.

### 2026-07-29 · structural · oat-project-implement · p03-run3

Blocker resolved by explicit approval: Run 3 may repair the two failing PJM doctor checks before resuming p03-t02; warnings remain out of scope.

### 2026-07-29 · structural · oat-project-implement · p03-final

Phase outcome: passed; fix-loop count: 0; review artifact: reviews/code-p03-review-2026-07-29T145300Z.md; two Minor lifecycle-record corrections applied before final review.

### 2026-07-29 · structural · oat-project-implement · final-review

Final review passed; artifact: reviews/code-final-review-2026-07-29T150100Z.md; one non-blocking Medium command-level test-matrix follow-up retained.

### 2026-07-29 · structural · oat gate review · final

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:1 exit=0 status=ok artifact=.oat/projects/shared/surface-implementer-dispatches/reviews/final-review-2026-07-29T152853Z.md

### 2026-07-29 · structural · oat-project-review-receive · final-gate

Configured exit gate received and allowed; M1 deferred with a durable follow-up trigger, m1 corrected, artifact archived at reviews/archived/final-review-2026-07-29T152853Z.md.
