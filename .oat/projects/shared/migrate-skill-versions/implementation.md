---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-08
oat_current_task_id: p02-t01
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

| Phase   | Status   | Tasks | Completed |
| ------- | -------- | ----- | --------- |
| Phase 1 | complete | 3     | 3/3       |
| Phase 2 | pending  | 2     | 0/2       |

**Total:** 3/5 tasks completed

---

## Phase 1: Metadata-aware readers and shape-agnostic tests

**Status:** complete (root review round 1: 0C/2I/3M/3m — no code defect; fix round `mig-p01-fix-001` for the two code Mediums and one Minor, then round 2)
**Started:** 2026-09-08

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- `tools/release/build-explainer-rc.mjs` reads bundled skill versions through the CLI's built canonical resolver (`packages/cli/dist/commands/shared/frontmatter.js`), loaded lazily after the builder's own `pnpm build`; conflict, unusable, malformed, and absent declarations each throw `E_SKILL_VERSION` with a category-specific message; no regex reader of the precedence rule remains in `tools/release`.
- `.agents/skills/oat-explainer-kit/scripts/check-core.mjs` keeps a self-contained, dependency-free reader (accepted exception: an installed skill script cannot import the repository) bound by the new parity contract `tools/smoke/explainer-kit/check-core-version-parity.test.mjs` (39 fixtures plus every bundled skill; documented fail-closed limits pinned); the packaged-layout probe reads and mutates whichever declaration is present, confined to the frontmatter.
- Every bundled-skill version reader in the test suites is shape-agnostic through the new test-support module `packages/cli/src/__tests__/skills/skill-version.ts` (resolver-backed read, shape-aware writer) and small local readers in the three `node --test` files; every pinned literal unchanged; the lifecycle mutation asserts the content changed; `review-skill-contracts.test.ts:359` keeps its raw agent-role read by design.

**Key files touched:**

- `tools/release/build-explainer-rc.mjs`, `build-explainer-rc.test.mjs` - lazy canonical resolver; fixture-local clean-checkout control
- `.agents/skills/oat-explainer-kit/scripts/check-core.mjs`, `tests/check-core.test.mjs`, `tools/smoke/explainer-kit/check-core-version-parity.test.mjs`, `packaged-layout.test.mjs` - self-contained reader + parity contract
- `packages/cli/src/validation/skills.test.ts`, `commands/tools/tool-pack-lifecycle.integration.test.ts`, `commands/init/tools/shared/{review-skill-contracts,agent-instructions-bundle-contract}.test.ts`, `packages/cli/src/__tests__/skills/skill-version.ts` (new), `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs`, `.agents/skills/{explainer-kit,recon}/tests/*.mjs` - shape-agnostic readers

**Verification:**

- Run: Phase 1 set — `pnpm check`, `pnpm type-check`, `HOME=$(mktemp -d) pnpm exec turbo run test --force`, `pnpm build`, `pnpm run check:skill-bumps`, `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:release`, `pnpm lint`, `pnpm format`, `pnpm oat:validate-skills`
- Result: all exit 0 (`Cached: 0`; CLI 6287; smoke 165; skills 859; release 42 + 1 env-gated skip; 82 alias warnings expected until Phase 2); re-run by the root reviewer with the same results plus the env-gated real-RC integration test (2/2) against this checkout. Controls: t01 neutralization (additive module-top `dist` import → `ERR_MODULE_NOT_FOUND`), t02 regex revert (3 of 5 parity tests red), t03 full-corpus simulation (all 82 skills metadata-only → 43 vitest + 3 `node --test` failures on the old readers, 0 on the new).

**Notes / Decisions:**

- Deviation (p01-t01 case g): the clean-checkout control runs a fixture-local builder against a `dist`-free checkout instead of moving the repository's own `dist` aside (`pnpm test:release` runs four files in parallel against the shared checkout); strictly stronger.
- Deviation (p01-t01 Step 2): the unusable-declaration message names the skill and the condition, not the scalar (the resolver exposes only a flag; the plan forbids a second parse) — plan amended at the review.
- Mechanical widening: `packages/cli/src/__tests__/skills/skill-version.ts` added (one shared reader instead of four copies; type-checked by the existing test-support tsconfig).
- Found for Phase 2: the `oat-project-implement` 245-line budget in `skills.test.ts` must become 246 (plan p02-t01 amended).
- Pre-existing, out of scope: the builder's main-module guard compares `import.meta.url` against `process.argv[1]` without `realpath`, so a symlinked checkout silently no-ops (worked around in the test).

### Task p01-t01: Read metadata.version in the explainer RC builder

**Status:** completed
**Commit:** `d054384ee`

### Task p01-t02: Read metadata.version in the explainer-kit core check and its packaged-layout probe

**Status:** completed
**Commit:** `8948bf1ea`

### Task p01-t03: Make every bundled-skill version reader in the test suites shape-agnostic

**Status:** completed
**Commit:** `6c461e3fe`

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

## Review Received: p01 (round 1)

**Date:** 2026-09-08
**Review artifact:** reviews/archived/p01-review-2026-09-08T101506Z.md (reviewed head `6c461e3fe4577b6bf78b4ace79e5bab1b5dfa510`, invocation manual, request `mig-p01-review-001`, reconnaissance not-attempted)
**Findings:** 0 Critical / 2 Important / 3 Medium / 3 Minor — no code defect; all five brief rulings verified first-hand (incl. the env-gated real-RC integration test 2/2 and a mechanical literal-invariance diff).

**Dispositions:**

- I1 (Phase 1 unrecorded in `implementation.md` / `state.md`) → recorded in this receive.
- I2 (p02-t01 "values only" would fail on the 245-line budget) → plan p02-t01 amended to name the 246 budget edit and the shared test-support reader.
- M1 (`check-core.mjs` `isReadableValue` fails OPEN for plain scalars containing `: ` or the reserved indicators `@` / backtick — seven divergences incl. `version: 1.2.3: x`; not a regression, `parseVersion` rejects downstream) → fix round `mig-p01-fix-001`: tighten the reader and pin the shapes in the parity corpus.
- M2 (the three `node --test` local readers scan the whole document, not the frontmatter block — latent) → fix round: port the frontmatter bound.
- M3 (the shipped unusable-declaration message names the condition, not the scalar; plan text stale) → plan amended; Deviations row.
- m1 (`test:smoke` / `test:release` need a prior `pnpm build`) → plan Verification mode notes it; p02-t02 adds one sentence to `AGENTS.md`.
- m2 (`withDeclaredVersion` rewrites only the resolved position while `withSkillVersion` rewrites every declaration) → fix round: rewrite every declaration present.
- m3 (p01-t03 heading drift in `implementation.md`) → re-synced here.

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
- Phase 1 done (`d054384ee`, `8948bf1ea`, `6c461e3fe`; Phase 1 gates green); root review round 1 0C/2I/3M/3m (no code defect) → records fixed here, fix round `mig-p01-fix-001` for M1/M2/m2, round 2 next.
- Plan gate attempt 1 blocked (0C/2I/2M); all four findings fixed in the plan.
- Plan gate attempt 2 blocked (0C/2I/3M/1m): reader architecture resolved (canonical resolver for the RC builder; accepted exception + parity contract for the bundled script), Phase 1 gate subset, decision via `oat-pjm-decision`, control categories, HiLL pending; attempt 3 blocked (0C/2I/1M: HiLL `[]` semantics, raw readers left to Phase 2, the exact eight-gate order) and fixed in-artifact; attempt 4 blocked (0C/2I/2M: Format step, dist import timing, resolver diagnostics, staging) and fixed in-artifact; the plan gate is capped at four attempts and the project proceeds to Phase 1 with root implementation-time reviews.

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact | Planned / Documented                                                               | Actual / Accepted                                                                    | Reason                                                                      | Source of Truth                    | Follow-up |
| ------------- | --------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------- | --------- |
| p01-t01       | plan Step 1 (g) | move the repository's own `packages/cli/dist` aside for the clean-checkout control | a fixture-local builder runs against a `dist`-free checkout                          | `pnpm test:release` runs four files in parallel against the shared checkout | implementation                     | none      |
| p01-t01       | plan Step 2     | the unusable case names the unusable value                                         | names the skill and the condition                                                    | the resolver exposes only a flag; the plan forbids a second parse           | implementation (plan amended)      | none      |
| p01-t03       | plan Files      | seven listed files                                                                 | plus `packages/cli/src/__tests__/skills/skill-version.ts` (new shared reader/writer) | one module instead of four copies                                           | implementation                     | none      |
| p02-t01       | plan Step 2     | "values only"                                                                      | plus the 245 → 246 line budget for `oat-project-implement`                           | the migration adds one frontmatter line                                     | plan amended at the Phase 1 review | none      |

## Test Results

Track test execution during implementation.

| Phase | Tests Run                                                         | Passed | Failed | Coverage |
| ----- | ----------------------------------------------------------------- | ------ | ------ | -------- |
| 1     | CLI 6287 (forced, 0 cached) + smoke 165 + skills 859 + release 42 | all    | 0      | -        |
| 2     | -                                                                 | -      | -      | -        |

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
