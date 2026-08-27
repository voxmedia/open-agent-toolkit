---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-27
oat_generated: true
oat_summary_last_task: p05-t06
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Project Summary: User-Scope Tool Packs

## Overview

OAT now supports every tool pack as a complete user-scope capability through
the regular CLI/direct-install lifecycle, including project management. The
work reduces repeated managed copies and update-only repository churn without
removing project-scoped reproducibility or resuming the parked native-plugin
effort.

The implementation separates reusable capability from repository authority.
Skills, agents, templates, scripts, and packaged resources can live at user
scope, while PJM adoption, policy, backlog, roadmap, decisions, mutable state,
and repository overrides remain local to each repository.

## What Was Implemented

- A typed canonical manifest defines all eight packs, allowed/default scopes,
  complete release membership, destinations, and ownership policy.
- Scoped intent plus complete inventory replaced one-member availability
  inference. Human and JSON surfaces distinguish complete, partial, absent,
  project-only, user-only, dual-scope, stale, newer, and retained-override
  states.
- Install, direct pack install, update, remove, `has`, `outdated`, status,
  doctor, and provider sync share one deterministic reconcile contract.
- Fresh reusable installs default to user scope; existing placement is
  preserved unless the operator explicitly migrates it.
- `oat tools migrate` previews the move, materializes and verifies the
  destination before source removal, requires explicit source confirmation,
  preserves shared owners, and retains a recoverable state on failure.
- PJM uses a four-state adoption resolver and fail-closed write guard.
  Repository, user, then bundle template precedence preserves repository
  customization while permitting managed user defaults.
- Packaged skill resources resolve from their installed scope, and diagnostics
  report provider materialization gaps without exposing raw home paths.
- CLI and docs shipped at lockstep public package version `0.2.37` after the
  branch integrated `origin/main` at `e270a776e`.

## Key Decisions

- **Scope-neutral complete pack contract:** Treat a pack as its complete current
  managed surface, not one discovered member. One release manifest drives all
  lifecycle commands and future membership additions.
- **Repository-owned PJM adoption:** User-level PJM capability never authorizes
  repository initialization or writes. Adoption, working state, policy, and
  overrides remain repository-owned and guarded.
- **Destination-first scope migration:** A migration verifies the destination
  before any source mutation and requires explicit confirmation before source
  removal, preserving rollback and recovery.
- **User default with project compatibility:** Recommend user scope for fresh
  reusable installs while retaining project scope and preserving all existing
  placements until an explicit move.
- **Repository-first template precedence:** Resolve PJM templates from the
  repository first, then managed user defaults, then the bundled release so
  reusable defaults cannot overwrite owner customization.

## Design Deltas

- Phase 4's plan missed bundled-skill validation under `src/validation/**`; the
  implementation used the complete CLI/workspace gates after bounded recovery.
- Negative tests intentionally mutate and restore `HOME` to establish the
  read/write-home divergence contract despite the design's earlier avoidance.
- Public packages moved from branch-base `0.2.32` to `0.2.37` because integrated
  main had reached `0.2.36` and the release gate requires a newer version.
- Review corrected two production adapters that differed from tested seams and
  could otherwise write repository `AGENTS.md` guidance accidentally.

## Notable Challenges

- Independent review and bounded fix loops closed containment, source-removal,
  provider-sync, production-adapter, and test-seam defects.
- Final review caught no-op removal clearing intent and direct reinstall moving
  placement; both were fixed and revalidated on the merged tree.
- Closeout review found ledger drift, not a source defect. Three ready quick
  projects preserve all accepted residue without weakening shipped claims.

## Integration Notes

- All eleven repository gates passed after the mainline merge: `pnpm check`,
  type-check, tests, build, skill-bump validation, release version checks,
  release validation, docs build, lint, format, and diff check. The post-merge
  CLI suite passed 3,970 tests.
- Mutation tests prove update content refresh and migration
  verify-before-remove fail when the protected behavior is broken.
- Documentation covers scope/intent ownership, migration and rollback,
  adoption, diagnostics, upgrades, `remove --json` outcomes, and the temporary
  PJM migration prerequisite.
- The decisive final closeout review passed with zero findings and confirmed
  no implementation-source changes after the reviewed merge/fix tree.

## Follow-up Items

- [`portable-skill-references`](../../../projects/shared/portable-skill-references/) — portable
  sibling-skill/resource resolution and stronger ratchets
  (`BL-260827-make-packaged-skill-references`).
- [`scope-adoption-diagnostics`](../../../projects/shared/scope-adoption-diagnostics/) — PJM
  migration eligibility, provider-aware agent diagnostics, attribution, and
  failure rendering (`BL-260827-correct-scope-and-adoption`).
- [`tool-pack-lifecycle-config-cleanup`](../../../projects/shared/tool-pack-lifecycle-config-cleanup/)
  — content-accurate inventory, exact adoption reporting, supported config
  state, and per-pack CLI cleanup
  (`BL-260827-clean-up-tool-pack-lifecycle`).

## Workflow Observations

### 2026-08-27 · structural · oat gate review · design

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:4,medium:7,minor:4 exit=1 status=blocked artifact=.oat/projects/shared/user-scope-tool-packs/reviews/artifact-design-review-2026-08-27T012258Z.md

### 2026-08-27 · structural · oat gate review · plan

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:1,medium:2,minor:4 exit=1 status=blocked artifact=.oat/projects/shared/user-scope-tool-packs/reviews/artifact-plan-review-2026-08-27T015201Z.md

### 2026-08-27 · structural · oat gate review · plan

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:1,minor:3 exit=0 status=ok artifact=.oat/projects/shared/user-scope-tool-packs/reviews/artifact-plan-review-2026-08-27T020356Z.md

### 2026-08-27 · structural · oat-project-implement · p01

Phase p01 blocked after 2/2 review-fix iterations; final review reviews/p01-review-2026-08-27T041427Z.md reports one Critical managed-root containment finding.

### 2026-08-27 · structural · oat-project-implement · p01

Phase p01 passed after authorized fix iteration 3/4; review reviews/p01-review-2026-08-27T050410Z.md reports 0 Critical, 0 Important, and 2 deferred Medium findings.

### 2026-08-27 · structural · oat-project-implement · p02-implementation

Phase p02 completed 9/9 task commits and passed 554 phase tests plus 3,700 CLI tests; independent review must verify the self-reported concern that shared reconcile planner/apply modules have no production callers.

### 2026-08-27 · structural · oat-project-implement · p02-review

Phase p02 review reviews/p02-review-2026-08-27T055129Z.md found 5 Critical, 2 Important, and 1 Medium issue; review-fix iteration 1/2 is required.

### 2026-08-27 · structural · oat-project-implement · p02-re-review

Phase p02 re-review reviews/p02-review-2026-08-27T063435Z.md found 2 Critical, 1 Important, and 1 Medium issue; final configured fix iteration 2/2 is required.

### 2026-08-27 · structural · oat-project-implement · p02

Phase p02 passed after fix iteration 2/2; decisive review reviews/p02-review-2026-08-27T070524Z.md reports no findings at any severity.

### 2026-08-27 · structural · oat-project-implement · p03

Phase 3 implementation and verification complete; independent review pending; see implementation.md.

### 2026-08-27 · structural · oat-project-implement · p03-review

Independent Phase 3 review blocked with 2 Critical, 2 Important, and 1 Medium finding; fix iteration 1/2 authorized; see reviews/p03-review-2026-08-27T074154Z.md.

### 2026-08-27 · structural · oat-project-implement · p03-fix1

Phase 3 fix iteration 1/2 completed all five dispositions in 6b0a7fe542f41f2a20143b0f3194242cf63ef770; fresh re-review pending; see implementation.md.

### 2026-08-27 · structural · oat-project-implement · p03-review-fix1

Phase 3 re-review reduced the remaining set to 0 Critical, 1 Important, and 1 Medium finding; final fix iteration 2/2 authorized; see reviews/p03-review-2026-08-27T081809Z.md.

### 2026-08-27 · structural · oat-project-implement · p03-fix2

Final configured Phase 3 fix iteration 2/2 completed both remaining dispositions in b0a6bc16e5efa5cb22cac853d8a45c2f8358e8f1; decisive re-review pending; see implementation.md.

### 2026-08-27 · structural · oat-project-implement · p03-review-fix2

Decisive Phase 3 re-review closed all Critical and Important findings but left one Medium planner/JSON inconsistency; configured fix iterations exhausted; operator authorization or explicit deferral required; see reviews/p03-review-2026-08-27T083913Z.md.

### 2026-08-27 · structural · oat-project-implement · p03-iteration3

Operator authorized one additional bounded Phase 3 fix/re-review iteration; temporary retry limit raised from 2 to 3; remaining Medium assigned to fix iteration 3/3; see implementation.md.

### 2026-08-27 · structural · oat-project-implement · p03-fix3

Operator-authorized Phase 3 fix iteration 3/3 completed the remaining Medium disposition in 38233ba2e997f3e18ad2fa3ebc888cab95131688; decisive re-review pending; see implementation.md.

### 2026-08-27 · structural · oat-project-implement · p03-complete

Phase 3 passed decisive review with no findings; temporary retry limit restored to 2; Phase 4 ready at p04-t01; see reviews/p03-review-2026-08-27T125029Z.md.

### 2026-08-27 · structural · oat-project-implement · p04

Phase 4 implemented 7/7 tasks (4790cbd3b..0c189eb5b); implementer returned BLOCKED direction-required on missing request provenance, recovered operator-authorized root-inline as attempt 1/10 in db9c0b1ed; phase verification passes; review pending. See implementation.md#orchestration-runs.

### 2026-08-27 · structural · oat-project-implement · p04

Phase 4 passed: re-review 0 Critical / 0 Important (1 Medium, 4 Minor deferred to Phase 5), 1 fix loop of 2 configured, 3 recovery attempts of 10 used. See reviews/p04-review-2026-08-27T144000Z.md.

### 2026-08-27 · structural · oat-project-implement · p05

Phase 5 passed: re-review 0 Critical / 0 Important (1 Medium, 5 Minor), 1 fix loop of 2, 0 recovery attempts; reviewer reconnaissance attempted with orchestration evidence in reviews/p05-review-2026-08-27T170000Z.md.
