---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-28
oat_generated: true
oat_summary_last_task: p03-t03
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: portable-skill-references

## Overview

This project closed the portability follow-ups from `user-scope-tool-packs`.
Several packaged skills still read sibling skills through repository-relative
paths, which worked in a source checkout but failed when the same pack was
installed at user scope. The project standardized installed-scope resolution
and strengthened the shipped regression contract that prevents those paths
from returning.

## What Was Implemented

- Migrated the idea, implementation-dispatch, plan-writing, and brainstorm
  handoff surfaces to resolve sibling skills from the loaded pack first, then
  user scope, then project scope, with an actionable fail-closed outcome when
  no candidate exists.
- Reworked the bundled-docs ratchet to scan authored Markdown recursively,
  detect quoted, unquoted, linked, `./`, and `../` repository-relative sibling
  reads, and report exact source-file and target evidence.
- Constrained scanner exclusions to the skill-root materialized
  `references/docs/` subtree while proving that similarly named nested authored
  paths remain scanned.
- Advanced six canonical skill versions and all five public package versions in
  lockstep to `0.2.39`, refreshed bundled provider views, and archived backlog
  item `BL-260827-make-packaged-skill-references`.
- Completed three implementation phases and eight tasks, including the final
  review fixes that hardened candidate-order assertions and reconciled closeout
  evidence.

## Key Decisions

- **Use one loaded-scope-first resolver contract.** Every executable sibling
  read follows loaded pack, user scope, then project scope. This preserves
  project installs while making user-scope packs self-contained.
- **Treat operational Markdown as executable surface.** The ratchet scans both
  `SKILL.md` and authored reference files. Historical evidence is allowed only
  through an exact file-and-target baseline with an explicit rationale.
- **Fail closed on missing siblings.** A skill stops with an actionable message
  instead of silently falling back to an improvised workflow.
- **Ship skill content as release-shaped CLI behavior.** Canonical skill bumps,
  bundled views, the public-package inventory, and all five public package
  versions move together because installed assets are part of the CLI product.

## Design Deltas

- The original two-phase plan grew a bounded third phase after the final review
  reproduced missing order and relative-path assertions and found stale
  closeout prose. Those findings became three explicit review-fix tasks; no
  product boundary or original scope changed.

## Notable Challenges

- The first phase needed one recovery commit to reconcile mechanically derived
  skill-validation pins and the skill line budget after the portable contracts
  changed.
- Full tests encountered two cleanup-timeout flakes across the lifecycle. Both
  passed on the permitted no-edit rerun, and independent reviewers reran the
  relevant gates successfully.
- The first final review found that task completion and lifecycle artifacts had
  drifted apart. Phase 3 reconciled state, plan, implementation evidence, and
  review history before closeout continued.

## Tradeoffs Made

- The ratchet retains a small exact baseline for historical evidence instead of
  rewriting old reports or broadly excluding reference directories. This keeps
  executable regressions visible without turning archival prose into release
  work.
- The configured exit-gate Minor about a self-contained presence assertion was
  rejected as duplicate coverage: the companion validation suite already makes
  both dispatch strings mandatory, and changing code after the verified gate
  basis would have invalidated closeout for test-readability polish.

## Integration Notes

- New packaged skills that read sibling skills should reuse the same
  loaded/user/project resolver and missing-sibling stop rather than embedding a
  repository-relative `.agents/skills/...` path.
- Authored Markdown under user-default packs is part of the portability
  contract. Only the root materialized `references/docs/` copy is excluded;
  nested authored directories with those names remain in scope.
- The closeout verification passed `pnpm check`, type checking, full tests,
  build, skill-version validation, release-version validation, package release
  validation, docs build, lint, format, and diff checks. A separate Fable exit
  review also passed at the Important threshold with no blocking finding.

## Follow-up Items

- PJM doctor still reports pre-existing repository-layout warnings unrelated to
  this project.
- Cleanup-timeout flakes remain observable test-infrastructure noise; they did
  not reproduce on the permitted no-edit reruns.

## Associated Issues

- Completed and archived:
  `.oat/repo/pjm/backlog/archived/BL-260827-make-packaged-skill-references.md`.

## Workflow Observations

### 2026-08-27 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important exit=1 status=targeting_correlation_failed artifact=.oat/projects/shared/scope-adoption-diagnostics/reviews/artifact-plan-review-2026-08-27T215450Z.md

### 2026-08-27 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:1 exit=0 status=ok artifact=.oat/projects/shared/portable-skill-references/reviews/artifact-plan-review-2026-08-27T220007Z.md

### 2026-08-27 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:0 exit=0 status=ok artifact=.oat/projects/shared/portable-skill-references/reviews/artifact-plan-review-2026-08-27T220505Z.md

### 2026-08-28 · structural · oat-project-implement · p01

Phase p01 passed root-owned review at dba46295a0d02c1bd1bca179a954bf902a2ae1c6; 0 Critical, 0 Important, 1 non-blocking Medium. Artifact: reviews/p01-review-2026-08-28T015302Z.md

### 2026-08-28 · structural · oat-project-implement · p02

Phase p02 passed root-owned review at 9d5be6432d30bb31b6bf3fed01ed152c936640c0 with no findings. Artifact: reviews/p02-review-2026-08-28T021707Z.md

### 2026-08-28 · structural · oat-project-review-provide · final

Final auto review used two reconnaissance waves and found 1 Important plus 1 Medium. Artifact: reviews/final-review-2026-08-28T022049Z.md

### 2026-08-28 · structural · oat-project-implement · p03

Phase p03 passed narrowed re-review at 63b1c7e4076e14369390e7bea9192ecc674f9719 with no findings. Artifact: reviews/p03-review-2026-08-28T025628Z.md

### 2026-08-28 · structural · oat gate review · final

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:1 exit=0 status=ok artifact=.oat/projects/shared/portable-skill-references/reviews/final-review-2026-08-28T032516Z.md
