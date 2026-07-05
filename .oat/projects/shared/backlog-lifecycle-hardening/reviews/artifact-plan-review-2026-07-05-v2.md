---
oat_generated: true
oat_generated_at: 2026-07-05
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/backlog-lifecycle-hardening
---

# Artifact Review: plan

**Reviewed:** 2026-07-05
**Scope:** Quick-mode implementation plan readiness for `backlog-lifecycle-hardening`
**Files reviewed:** 5
**Commits:** N/A (artifact review)

## Review Scope

**Project:** `.oat/projects/shared/backlog-lifecycle-hardening`
**Type:** artifact
**Scope:** plan
**Workflow mode:** quick

**Artifact paths:**

- Discovery: `.oat/projects/shared/backlog-lifecycle-hardening/discovery.md`
- Design: `.oat/projects/shared/backlog-lifecycle-hardening/design.md`
- Plan: `.oat/projects/shared/backlog-lifecycle-hardening/plan.md`
- Implementation: `.oat/projects/shared/backlog-lifecycle-hardening/implementation.md`
- State: `.oat/projects/shared/backlog-lifecycle-hardening/state.md`

**Files reviewed:**

- `.oat/projects/shared/backlog-lifecycle-hardening/plan.md`
- `.oat/projects/shared/backlog-lifecycle-hardening/discovery.md`
- `.oat/projects/shared/backlog-lifecycle-hardening/design.md`
- `.oat/projects/shared/backlog-lifecycle-hardening/implementation.md`
- `.oat/projects/shared/backlog-lifecycle-hardening/state.md`

**Dispatch Profile advisory:** No `## Dispatch Profile` section is present. That is normal for an artifact-plan review and is not a gap. No explicit override rows were available to review.

## Summary

The plan is largely implementation-ready: task IDs are stable, quick-mode upstream coverage is complete, `oat project validate-plan` passes, and the declared p01/p02 parallel group has disjoint write boundaries. One release-phase gap remains: the version-bump task omits the generated CLI asset version map that `bundle-assets.sh` rewrites from the package versions and that the published CLI includes under `assets`.

Findings: 0 critical, 1 important, 0 medium, 0 minor

## Findings

### Critical

None

### Important

- **Release bump task omits the generated public package version map** (`.oat/projects/shared/backlog-lifecycle-hardening/plan.md:543`)
  - Issue: `p06-t02` lists and stages only the five public `package.json` files (`plan.md:543`, `plan.md:569`). However `packages/cli/scripts/bundle-assets.sh:103` reads the public package versions and `packages/cli/scripts/bundle-assets.sh:113` writes `packages/cli/assets/public-package-versions.json`; `packages/cli/package.json:21` publishes `assets`, and `packages/cli/package.json:29` runs that bundling step during the CLI build. After the planned version bump and required validation/build commands, that tracked generated asset will be updated but left out of the commit, leaving a dirty worktree or a PR with stale shipped asset metadata.
  - Fix: Add `packages/cli/assets/public-package-versions.json` to the `p06-t02` file list and final `git add`, and explicitly note that the release validation/build step regenerates it after package versions change.

### Medium

None

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`, root `AGENTS.md`, `packages/cli/scripts/bundle-assets.sh`, `packages/cli/package.json`, live `oat project status`, and live plan validation output.

### Requirements Coverage

| Requirement                                    | Status  | Notes                                                                                                                             |
| ---------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Atomic backlog archive command                 | covered | Phase p01 covers the status module, regeneration export/warnings, and `oat backlog archive` command/tests.                        |
| `.oat/repo/**` instructions scan carve-in      | covered | Phase p02 isolates scan utility and sync/validate integration coverage with disjoint files from p01.                              |
| PJM doctor lifecycle drift checks              | covered | Phase p03 maps the four design checks to `pjm doctor` implementation and tests.                                                   |
| PJM templates, README, and handoff scaffolding | covered | Phase p04 covers template content, asset bundling, init emission, sync hint, and canonical-path doctor nudge.                     |
| Skills/docs propagation                        | covered | Phase p05 covers the 14-skill sweep, docs/index updates, and `oat-pjm-review-backlog` handoff workflow encoding.                  |
| Dogfood and release gates                      | partial | Phase p06 covers dogfood and lockstep package versions, but `p06-t02` must also stage the regenerated public package version map. |

### Extra Work (not in declared requirements)

None. The plan includes the user-approved Q4 kickoff-handoff addition and otherwise stays within discovery/design scope.

## Verification Commands

Run these after applying the artifact fix:

```bash
rg -n "public-package-versions\\.json|packages/\\*/package\\.json" .oat/projects/shared/backlog-lifecycle-hardening/plan.md
oat project validate-plan --project-path .oat/projects/shared/backlog-lifecycle-hardening
```

The release task itself should still verify with:

```bash
pnpm release:validate
pnpm build && pnpm lint && pnpm type-check && pnpm test && pnpm format
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to process the Important artifact-alignment finding.
