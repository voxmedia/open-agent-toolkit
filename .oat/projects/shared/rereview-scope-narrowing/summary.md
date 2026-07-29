---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-29
oat_generated: true
oat_summary_last_task: p07-t05
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: Re-review Scope Narrowing

## Overview

OAT re-reviews previously required an interactive narrowing decision and used
different safety models across local and remote review rails. In the slow final
review that motivated this project, repeated same-scope reviews spent roughly
20 minutes re-reading already reviewed work while returning identical findings.

This project made guarded narrowing the default, removed the narrowing prompt,
and made the reviewed-head provenance durable enough to survive review receive,
artifact archival, fresh clones, and worktree hand-offs.

## What Was Implemented

- Unset and `true` now enable re-review narrowing; `false` is the explicit
  full-scope opt-out. Explicit base/SHA ranges and remote `--narrow` /
  `--no-narrow` controls retain per-invocation precedence.
- Local lifecycle, configured gate, project remote, and ad-hoc remote reviews
  use lineage-qualified prior reviewed heads. Lifecycle reviews never inherit a
  gate's coverage, and gates match only their own exact target and scope.
- Automatic narrowing accepts only full commit SHAs that exist and are
  ancestors of the current review head. Missing, conflicting, stale, or
  unreachable provenance fails open to the nominal full scope with a stated
  reason.
- Review artifacts record the reviewed head and, for narrowed passes, the
  resolved range plus prior artifact/head. The tracked Reviews ledger mirrors
  validated provenance so it remains available after local-only archival.
- Every re-review reports its selected range, reason, and
  `empty`/`bookkeeping-only`/`substantive` classification. Classification is
  informational and never skips review.
- Reviews ledger readers and writers now resolve known cells by header name,
  widen legacy rows safely, preserve unknown columns, and validate full SHAs.
- User docs, generated provider views, and all five public packages shipped in
  lockstep at `0.2.25`.

## Key Decisions

- **Default narrowing with explicit opt-out.** The common path is prompt-free:
  unset and `true` narrow, while `false` requests full scope. Existing explicit
  ranges and remote flags remain the one-run escape hatches.
- **Lineage-qualified guarded ranges.** A re-review uses
  `<prior-reviewed-head>..<current-head>` only within its own lifecycle or
  target-qualified gate lineage and only after full-SHA, existence, and
  ancestry checks. Ambiguous state reviews more code rather than less.
- **Dual durable review provenance.** The artifact is authoritative while
  present, and the tracked Reviews row preserves the same validated head after
  receive and archival. Disagreement fails open instead of selecting a source.
- **Classification reports but does not authorize skipping.** Empty,
  bookkeeping-only, and substantive labels make review cost visible without
  weakening review coverage. Skipping bookkeeping-only re-reviews remains a
  separately scoped follow-up.
- **Narrowed coverage is inherited explicitly.** A narrowed artifact names its
  prior artifact and reviewed head and must not restate requirements coverage
  it did not verify.

## Design Deltas

- Phase 3 prompt removal also required regenerating the autonomy prompt
  inventory. The initial task boundary named only the canonical skill, but the
  focused inventory test proved the generated mapping was a required
  consequence; it was restored and recorded as a durable workflow observation.

## Notable Challenges

- The first full-scope final review revalidated three deferred Medium findings
  and one Minor wording issue. All four became a final repair phase, and one
  combined narrowed verification review resolved them with zero findings.
- Release validation exposed a stale bundled public-package version snapshot
  even though package manifests were correct. Regeneration and post-merge
  reconciliation kept the final release surface lockstep at `0.2.25`.

## Tradeoffs Made

- Narrowing is intentionally opportunistic. Rebases, merges, shallow history,
  and worktree consolidation can invalidate ancestry and trigger full-scope
  fallback rather than more complex patch-equivalence logic.
- The change reduces diff traversal but not all lifecycle artifact intake.
  Correctness and auditable coverage took precedence over skipping review based
  solely on a path classification.

## Integration Notes

- Runtime behavior is expressed in canonical review skills while
  `packages/cli/src/review-remote/` supplies tested semantic contracts. Changes
  to narrowing must keep both surfaces aligned.
- Review ledger mutations must preserve the header-relative provenance contract
  in every provide, receive, implementation, gate, and archival path.
- Canonical skill changes require one PR-scoped version bump, provider sync,
  lockstep public package versions, and `pnpm release:validate`.

## Follow-up Items

- `BL-260711-skip-re-review-for-bookkeeping` tracks the stricter,
  deterministically validated optimization that can omit reviewer dispatch when
  every fix is lifecycle bookkeeping. This project supplies reporting
  classification only and deliberately does not authorize that skip.

## Workflow Observations

### 2026-07-28 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:5,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/rereview-scope-narrowing/reviews/artifact-plan-review-2026-07-28T004222Z.md

### 2026-07-28 · structural · oat gate review · plan

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:3 exit=0 status=ok artifact=.oat/projects/shared/rereview-scope-narrowing/reviews/artifact-plan-review-2026-07-28T182554Z.md

### 2026-07-28 · structural · oat-project-implement · p01

Phase passed after one bounded fix round; passing review: reviews/archived/p01-review-2026-07-28T205203Z.md

### 2026-07-28 · structural · oat gate review · p02

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:0,medium:3,minor:0 exit=0 status=ok artifact=.oat/projects/shared/rereview-scope-narrowing/reviews/p02-review-2026-07-28T214026Z.md

### 2026-07-28 · structural · oat-project-implement · p03

Phase passed after one bounded Medium-finding fix round; passing review: reviews/archived/p03-review-2026-07-28T221100Z.md

### 2026-07-28 · structural · oat-project-implement · p04

Phase passed after two bounded Important-finding fix rounds; passing review: reviews/archived/p04-review-2026-07-28T225031Z.md

### 2026-07-28 · structural · oat gate review · p05

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:1 exit=0 status=ok artifact=.oat/projects/shared/rereview-scope-narrowing/reviews/p05-review-2026-07-28T230930Z.md

### 2026-07-28 · project · friction · Phase 3 autonomy inventory boundary

The Phase 3 boundary cleanup reverted a generated prompt-inventory update that the full CLI suite requires. The stale five-entry mapping was restored in e9b6ffe0 after the focused inventory test reproduced the failure; generated autonomy evidence must be treated as a required consequence of prompt-path edits.

### 2026-07-28 · structural · oat-project-implement · p06

Phase passed after one bounded release-consistency fix; passing review: reviews/archived/p06-review-2026-07-28T233714Z.md

### 2026-07-29 · general · friction · Generated autonomy inventory coupling

Promotes the original entry "2026-07-28 · project · friction · Phase 3 autonomy inventory boundary": prompt-path edits that change autonomy gates must preserve or regenerate the associated inventory evidence, with focused inventory tests run before cleanup.
