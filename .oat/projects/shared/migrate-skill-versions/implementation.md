---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-08
oat_current_task_id: p01-t01
oat_generated: false
---

# Implementation: migrate-skill-versions

**Started:** 2026-09-08
**Last Updated:** 2026-09-08

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.

## Progress Overview

| Phase   | Status  | Tasks | Completed |
| ------- | ------- | ----- | --------- |
| Phase 1 | pending | 3     | 0/3       |
| Phase 2 | pending | 2     | 0/2       |

**Total:** 0/5 tasks completed

---

## Phase 1: Metadata-aware readers and shape-agnostic tests

**Status:** pending
**Started:** -

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- -

**Key files touched:**

- -

**Verification:**

- Run: -
- Result: -

**Notes / Decisions:**

- -

### Task p01-t01: Read metadata.version in the explainer RC builder

**Status:** pending
**Commit:** -

### Task p01-t02: Read metadata.version in the explainer-kit core check and its packaged-layout probe

**Status:** pending
**Commit:** -

### Task p01-t03: Make the skill test sweeps and mutation tests read through the resolver

**Status:** pending
**Commit:** -

## Phase 2: Migrate the 82 skills, repoint the pins, record the decision

**Status:** pending
**Started:** -

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- -

**Key files touched:**

- -

**Verification:**

- Run: -
- Result: -

**Notes / Decisions:**

- -

### Task p02-t01: Move every bundled skill's version to metadata.version and bump it

**Status:** pending
**Commit:** -

### Task p02-t02: Record the alias retirement decision, update the docs, and take the lockstep bump

**Status:** pending
**Commit:** -

## Autonomy Gate Provenance

### Review Received: plan (attempt 1 — blocked)

**Date:** 2026-09-08
**Gate:** run `4fac934c-78bf-4e2d-9148-93739e006cf5`, target `codex-5-6-sol-xhigh`, outcome `review_completed_blocking_findings`, 0C/2I/2M/0m.
**Review artifact:** reviews/archived/artifact-plan-review-2026-09-08T080653Z.md

**Dispositions (all fixed in-artifact before attempt 2):**

- I1 (`oat_plan_hill_phases: []` means every phase, contradicting the "no phase gates" prose) → set to `['p02']` (final phase only, the workflow default) and the checklist line now distinguishes HiLL from the operator's declined phase-boundary review gates.
- I2 (the backlog archive had no executable owner) → p02-t02's last step archives `BL-260904-migrate-bundled-skills-from` with an outcome summary after verifying its acceptance criteria; the moved item and regenerated `completed.md`/`index.md` are in the task's file boundary and commit.
- M1 (route the decision through `oat-pjm-decision`) → that skill is not installed in this repository, so root `AGENTS.md`'s fallback (`oat decision new`) applies; the task says so explicitly and keeps the preflight.
- M2 (the p01-t03 negative control was not runnable — the corpus tests anchor on `process.cwd()`) → replaced with a backup-and-restore mutation of one real canonical skill run against the exact named test before and after the rewrite, with the failing assertion recorded.

### Review Received: plan (attempt 2 — blocked)

**Date:** 2026-09-08
**Gate:** target `codex-5-6-sol-xhigh`, outcome `review_completed_blocking_findings`, 0C/2I/3M/1m.
**Review artifact:** reviews/archived/artifact-plan-review-2026-09-08T082541Z.md

**Dispositions (all fixed in-artifact before attempt 3):**

- I1 (two new indentation parsers would duplicate the precedence rule the backlog item forbids) → architecture resolved: the RC builder imports the CLI's built canonical resolver (`packages/cli/dist/commands/shared/frontmatter.js`; `pnpm build` precedes it in the Definition of Done and `turbo run test` depends on `^build`); the bundled `check-core.mjs` keeps a self-contained reader as an accepted exception (an installed skill script cannot import the repository or `yaml`) bound by a new parity contract test over a shared fixture corpus; the exception is recorded in the p02-t02 decision.
- I2 (Phase 1's full-gate promise cannot pass before the bump) → Phase 1 phase-wide verification is a passing subset without the release-version gates; the complete Definition of Done runs at the end of Phase 2.
- M1 (`oat-pjm-decision` IS installed; the attempt-1 receive said otherwise because a `ls | grep` under the `lsd` alias returned nothing) → p02-t02 routes the decision through the skill's Steps 0–5 with the inputs supplied.
- M2 (re-adding the old alias beside the new metadata value is a conflict, not an alias warning) → three controls with their exact categories: same-value dual (sweep red, no validator finding), alias-only (sweep red, one alias warning), different-value dual (one conflict error).
- M3 (HiLL recorded as confirmed without confirmation) → `oat_plan_hill_phases` left at the scaffold value and marked pending for the implementation-start resolver (`workflow.hillCheckpointDefault` = `final`).
- m1 (line-3 claim) → reworded (two skills declare at line 4).

### Review Received: plan (attempt 3 — blocked)

**Date:** 2026-09-08
**Gate:** target `codex-5-6-sol-xhigh`, outcome `review_completed_blocking_findings`, 0C/2I/1M/0m.
**Review artifact:** reviews/archived/artifact-plan-review-2026-09-08T084454Z.md

**Dispositions (all fixed in-artifact before attempt 4 — the last rerun under the plan-gate cap):**

- I1 (`[]` is a valid every-phase HiLL selection, not a sentinel; autonomous implementation would pause after p01) → the field removed from the frontmatter entirely, unset pending implementation-start resolution.
- I2 (p01-t03 left the other raw readers untouched until p02-t01 changed their keys) → every bundled-skill reader from the recon inventory moved into p01-t03 (the two `review-skill-contracts` skill sites, `agent-instructions-bundle-contract`, the four `.toMatch` sites, and the three `node --test` files with a tiny local metadata-first reader); `:356` retained as an agent-role assertion; p02-t01 changes pinned values only.
- M1 (the Definition of Done substituted the forced Turbo run for `pnpm test`) → the eight CI gates in their exact order, with the forced run and the separate suites as supplemental evidence.

### Review Received: plan (attempt 4 — blocked; gate capped)

**Date:** 2026-09-08
**Gate:** target `codex-5-6-sol-xhigh`, outcome `review_completed_blocking_findings`, 0C/2I/2M/0m.
**Review artifact:** reviews/archived/artifact-plan-review-2026-09-08T090611Z.md

**Dispositions (fixed in-artifact; no further rerun):**

- I1 (no concrete write/fix Format step in any task) → a file-scoped `pnpm exec oxfmt --write …` Format line added before Step 4 of every task (p02-t01 also `pnpm format:fix` for the generated provider projections), with `pnpm format` kept as the check.
- I2 (a module-top import of `packages/cli/dist` would break the documented clean-checkout RC command, since the builder runs `pnpm build` itself) → the resolver is loaded lazily after the builder's own build, `parseSkillVersion` becomes async, and a clean-checkout control (dist moved aside) proves the builder reaches its internal build first.
- M1 (the canonical resolver exposes only a `malformed` flag, not a parser diagnostic) → the malformed case throws the generic `E_SKILL_VERSION` malformed-frontmatter message and the test asserts the category; no second YAML parse.
- M2 (whole-tree staging with error suppression) → p02-t01 stages an exact changed-file manifest (transformation paths, named pin files, `oat sync`'s reported rewrites) with no deletions and no suppression; p02-t02 lists the five package manifests literally.

**Gate disposition:** four attempts, each blocking on a new surface (attempt 1: HiLL/archive owner/decision routing/control; 2: reader architecture, phase gates, decision skill, control categories, HiLL; 3: HiLL semantics, reader coverage, gate order; 4: format step, dist timing, diagnostics, staging). Every finding was fixed in the plan; no Critical was ever raised. Per the repository's recorded plan-gate experience (`lite-workflow-mode` blocked eleven times on the same pattern), the gate is capped here and the project proceeds to implementation with the root implementation-time reviews (per-phase and final) plus the configured exit gate as the review coverage. The plan ledger row stays `fixes_added` (not `passed`) to record that no gate run approved the final text.

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-09-08

- Project scaffolded (quick mode) on branch `migrate-skill-versions` from `origin/main` `5b3b82151` (the wave-6 close); discovery and plan authored from the 2026-09-08 recon.
- Plan gate attempt 1 blocked (0C/2I/2M); all four findings fixed in the plan.
- Plan gate attempt 2 blocked (0C/2I/3M/1m): reader architecture resolved (canonical resolver for the RC builder; accepted exception + parity contract for the bundled script), Phase 1 gate subset, decision via `oat-pjm-decision`, control categories, HiLL pending; attempt 3 blocked (0C/2I/1M: HiLL `[]` semantics, raw readers left to Phase 2, the exact eight-gate order) and fixed in-artifact; attempt 4 blocked (0C/2I/2M: Format step, dist import timing, resolver diagnostics, staging) and fixed in-artifact; the plan gate is capped at four attempts and the project proceeds to Phase 1 with root implementation-time reviews.

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- (filled at closeout)

**Behavioral changes (user-facing):**

- (filled at closeout)

**Key files / modules:**

- (filled at closeout)

**Verification performed:**

- (filled at closeout)

**Design deltas (if any):**

- (filled at closeout)

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
