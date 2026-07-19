---
oat_generated: true
oat_generated_at: 2026-07-19
oat_pr_type: project
oat_pr_scope: final
oat_project: .oat/projects/shared/reviewer-parallelism
---

# feat: add task-class-aware reviewer orchestration

## Summary

Add bounded, provider-neutral reconnaissance to broad OAT reviews while keeping
source validation, synthesis, severity, and final output with the primary
reviewer. Reviewer-local lanes now declare capability floors independently from
their read-only authority, so mechanical work can use fast workers while
semantic or consequential work never silently downgrades. The change also adds
root-owned orchestration logging, synchronized provider roles, user-facing
documentation, and lockstep public-package metadata at the verified unpublished
version `0.2.4`. All 19 planned tasks are complete, including two Bugbot-driven
corrections and post-merge release reconciliation.

## Goals / Non-Goals

- Delegate only genuinely independent, read-only evidence lanes from broad
  reviews; keep narrow reviews inline when coordination would cost more.
- Match worker capability to ambiguity, silent-miss risk, and consequence while
  preserving identical fallback coverage.
- Keep source verification, cross-lane reconciliation, severity, validation,
  review artifacts, structured findings, and project-log writes root-owned.
- Do not add a runtime scheduler, promise named models across providers, create
  recursive worker trees, or reuse full reviewer roles as recon workers.
- Assurance note: this is a quick-mode project with no `spec.md`; its goals are
  grounded in discovery, a reviewed supplemental design, the execution plan,
  implementation outcomes, and a passing final code review.

## Changes

- Added the canonical `oat-reviewer` contract for bounded reconnaissance,
  compact evidence reports, one-level fan-out, direct source re-verification,
  and primary-only judgment.
- Extended `oat-dispatch-subagents` request and record guidance with task
  classes, model-class floors, classification rationale, floor satisfaction,
  mixed-wave separation, and floor-safe caller-inline fallback.
- Defined provider boundaries without hard-coding canonical model names. Cursor
  can delegate suitable mechanical work and retains stronger unavailable lanes
  in the primary reviewer.
- Added root-owned review-orchestration logging: reviewers record evidence in
  review artifacts, and lifecycle roots append one validated structural entry.
- Added an explicit attempted/not-attempted reviewer reconnaissance signal.
  Both review-provide and implementation-owned phase-review roots now consume
  exactly one signal before validation or bookkeeping, enforce the same
  fail-closed branches, and append orchestration evidence only when delegation
  was attempted.
- Bumped the changed `oat-project-implement` skill to `2.1.5` and aligned its
  top-level summary with the detailed signal-first handoff contract.
- Added semantic contract coverage and updated review/project-log docs.
- Regenerated 14 Codex and 12 Cursor reviewer variants, reconciled the current
  upstream native-skill baseline, and removed two obsolete Cursor skill mirrors.
- Archived `BL-260708-enable-oat-reviewer-subagent` and added
  `BL-260719-add-pinned-recon-agents` as an evidence-gated follow-up for
  dedicated pinned recon roles.
- Merged the latest `origin/main` baseline in `0ee096a7`, preserving upstream's
  configured implementation exit gate and Cursor-native skill materialization
  while retaining this branch's reviewed orchestration behavior.
- Updated all five public packages and bundled release surfaces to verified
  unpublished version `0.2.4`.
- Completed all 19 tasks across four phases, including autonomy-inventory
  mapping, implementation-root parity, skill-version reconciliation, and the
  final post-merge release correction.

## Bugbot Findings

- `3610616848` — the artifact-mode handoff did not expose whether
  reconnaissance was attempted. Resolved by `p04-t08` and `p04-t10`: reviewers
  emit exactly one attempted/not-attempted signal, and both roots consume it
  before validation or bookkeeping with fail-closed branch semantics.
- `3610774966` — the top-level implementation summary omitted that signal-first
  ordering. Resolved by `p04-t13`: the summary now matches
  `references/phase-execution.md`, and semantic tests independently pin both
  surfaces.

## Verification

- Focused reviewer, closeout, canonical, and Codex synchronization contracts
  passed: 180/180.
- Canonical skill-version validation against `origin/main` passed for all 60
  skills, including `oat-project-implement` `2.1.5`,
  `oat-dispatch-subagents` `1.1.5`, and `oat-project-review-provide` `1.3.22`.
- Full workspace tests passed, including CLI 3,209/3,209 and smoke 123/123.
- Lint passed with zero warnings/errors; type-check passed 10/10; workspace
  build passed 5/5; formatting and full-range `git diff --check` passed.
- Provider status and project sync dry-run passed with no drift.
- Live npm checks confirmed `0.2.4` is unpublished for all five public
  packages; package-version checks and `pnpm release:validate` passed with 5/5
  `0.2.4` tarballs.
- Class-aware dogfood passed with a mechanical nested lane and parent-inline
  intelligent coverage when the stronger Cursor floor was unavailable.
- The latest superseding final review at `2026-07-19T15:23:39Z` covered the
  complete post-merge range, both Bugbot findings, skill and release versions,
  and lifecycle tracking. It passed with zero Critical, Important, Medium, or
  Minor findings.

## Reviews

| Scope              | Type     | Status | Date                   |
| ------------------ | -------- | ------ | ---------------------- |
| p01                | code     | passed | 2026-07-18             |
| p02                | code     | passed | 2026-07-18             |
| p03                | code     | passed | 2026-07-18             |
| design             | artifact | passed | 2026-07-19             |
| plan               | artifact | passed | 2026-07-19             |
| p04                | code     | passed | 2026-07-19             |
| final-pre-revision | code     | passed | 2026-07-18             |
| final              | code     | passed | 2026-07-19 (15:23:39Z) |

## References

- [Project summary](https://github.com/voxmedia/open-agent-toolkit/blob/reviewer-parallelism/.oat/projects/shared/reviewer-parallelism/summary.md)
- [Discovery](https://github.com/voxmedia/open-agent-toolkit/blob/reviewer-parallelism/.oat/projects/shared/reviewer-parallelism/discovery.md)
- [Supplemental design](https://github.com/voxmedia/open-agent-toolkit/blob/reviewer-parallelism/.oat/projects/shared/reviewer-parallelism/design.md)
- [Plan](https://github.com/voxmedia/open-agent-toolkit/blob/reviewer-parallelism/.oat/projects/shared/reviewer-parallelism/plan.md)
- [Implementation record](https://github.com/voxmedia/open-agent-toolkit/blob/reviewer-parallelism/.oat/projects/shared/reviewer-parallelism/implementation.md)
