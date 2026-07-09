---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-09
oat_current_task_id: p04-t05
oat_generated: false
---

# Implementation: codex-family-subagents

**Started:** 2026-07-08
**Last Updated:** 2026-07-09

> This document is used to resume interrupted implementation sessions.
>
> `oat_current_task_id` points at the next plan task to do.

## Progress Overview

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | passed      | 3     | 3/3       |
| Phase 2 | passed      | 5     | 5/5       |
| Phase 3 | passed      | 5     | 5/5       |
| Phase 4 | in_progress | 5     | 4/5       |

**Total:** 17/18 tasks completed

---

## Phase 1: Generic Codex Role Materialization

**Status:** passed
**Started:** 2026-07-08
**Completed:** 2026-07-08
**Review:** `.oat/projects/shared/codex-family-subagents/reviews/p01-review-2026-07-08T224422Z.md`

### Task p01-t01: Add Codex Materialization Codec

**Status:** completed
**Commit:** 6c0437bc

### Task p01-t02: Add Codex Materialize CLI Command

**Status:** completed
**Commit:** a6f83e1d

### Task p01-t03: Write Materialized Roles and Merge Codex Config

**Status:** completed
**Commit:** e6548a82

---

## Phase 2: Replace Hard-Coded Codex Effort Pins

**Status:** passed
**Started:** 2026-07-08
**Completed:** 2026-07-09
**Review:** `.oat/projects/shared/codex-family-subagents/reviews/p02-review-2026-07-09T020945Z.md`

### Task p02-t01: Model Codex Materialization Targets from Dispatch Matrix

**Status:** completed
**Commit:** aed52a1a

### Task p02-t02: Sync Materialized Codex Roles from Matrix Targets

**Status:** completed
**Commit:** 2ed93094

### Task p02-t03: Dispatch to Materialized Codex Role Names

**Status:** completed
**Commit:** e626118d

### Task p02-t04: Update Doctor and Stray Detection for Materialized Roles

**Status:** completed
**Commit:** 3eb5d427

### Task p02-t05: Rewrite Bundled Codex Dispatch Contracts

**Status:** completed
**Commit:** 48b227d6

---

## Phase 3: Model Validation and Canonical Prompts

**Status:** passed
**Started:** 2026-07-09
**Completed:** 2026-07-09
**Review:** `.oat/projects/shared/codex-family-subagents/reviews/p03-review-2026-07-09T030955Z.md`

### Task p03-t01: Validate Cursor Subagent-Eligible Models

**Status:** completed
**Commit:** 963de2ad

### Task p03-t02: Generate Dispatch Policy Choice Text from Canonical Data

**Status:** completed
**Commit:** c2237cc8

### Task p03-t03: Harden Workflow Skills Against Hand-Typed Option Lists

**Status:** completed
**Commit:** b1f43b6c

### Task p03-t04: Validate Codex Matrix Model Availability

**Status:** completed
**Commit:** 267f9e8e

### Task p03-t05: Clarify Human-Facing Dispatch Display

**Status:** completed
**Commit:** 92cb2736

**Review Fix:** 5c7d72a3

---

## Phase 4: Documentation, Versions, and Release Validation

**Status:** in_progress
**Started:** 2026-07-09
**Completed:** -
**Review:** `.oat/projects/shared/codex-family-subagents/reviews/p04-review-2026-07-09T033119Z.md`

### Task p04-t01: Document Materialized Codex and Cursor Dispatch Behavior

**Status:** completed
**Commit:** c05ae475

### Task p04-t02: Update Public Package Versions and Validate Release

**Status:** completed
**Commit:** 218196eb

### Task p04-t03: (review) Resolve Uncapped Codex Materialized Dispatch

**Status:** completed
**Commit:** abfabe78

### Task p04-t04: (review) Clarify Codex User-Scope Materialization Docs

**Status:** completed
**Commit:** d0363d7f

### Task p04-t05: (review) Map Uncapped Codex Preferred Effort to Matrix Tier

**Status:** pending
**Commit:** -

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with run metadata,
phase outcomes, parallel groups, and outstanding items._

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here._

### Run 1 — 2026-07-08 22:45

**Branch:** codex-family-subagents
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p01   | DONE        | pass   | 0/2            | passed      |

#### Parallel Groups

- p01: sequential

#### Dispatch Notes

- Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:high dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-high
- Dispatch policy: high; selected=high; cap=xhigh (codex, enforced — variant oat-phase-implementer-high)
- Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:xhigh dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer-xhigh
- Dispatch policy: high; selected=xhigh; cap=xhigh (codex, enforced — variant oat-reviewer-xhigh)

#### Outstanding Items

- None

#### Artifact / Design Deltas

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| None          | -               | -                    | -                 | -      | -               | -         |

### Run 2 — 2026-07-08 23:53

**Branch:** codex-family-subagents
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2
**Phases:** 1 executed, 0 passed, 1 failed, 1 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p02   | DONE        | fail   | 2/2            | stopped     |

#### Parallel Groups

- p02: sequential

#### Dispatch Notes

- Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=inherited effort_axis=selected:high dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer-high
- Dispatch policy: high; selected=high; cap=xhigh (codex, enforced — variant oat-phase-implementer-high)
- Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=unresolved effort_axis=unresolved dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer
- Dispatch policy: high; selected=none; cap=xhigh (codex, advisory — policy set but no materialized reviewer target resolved)
- Dispatch: scope=p02 action=fix role=fix producer=unknown provenance=unknown model_axis=inherited effort_axis=provider-default dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer
- Dispatch policy: high; selected=none; cap=xhigh (codex, advisory — policy set but no materialized fix target resolved)
- Dispatch: scope=p02 action=fix role=fix producer=unknown provenance=unknown model_axis=unresolved effort_axis=unresolved dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer
- Dispatch policy: high; selected=none; cap=xhigh (codex, advisory — policy set but no materialized fix target resolved)

#### Outstanding Items

- p02 blocked after retry limit exhaustion. Review artifact:
  `.oat/projects/shared/codex-family-subagents/reviews/p02-review-2026-07-08T235031Z.md`.
- Important finding fixed by explicit narrow retry override:
  review dispatch scope schema now allows selected Codex model axes in
  `.agents/skills/oat-project-implement/SKILL.md` (`40ae8413`).
- Remaining Medium finding: dispatch-matrix recommendation adoption still
  validates Codex route models as closed effort values in
  `packages/cli/src/commands/config/index.ts`.

#### Artifact / Design Deltas

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| None          | -               | -                    | -                 | -      | -               | -         |

### Run 3 — 2026-07-09 01:32

**Branch:** codex-family-subagents
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2 plus explicit narrow override
**Phases:** 1 executed, 0 passed, 1 failed, 1 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p02   | DONE        | fail   | override       | stopped     |

#### Parallel Groups

- p02: sequential

#### Dispatch Notes

- Dispatch: scope=p02 action=fix role=fix producer=unknown provenance=unknown model_axis=unresolved effort_axis=unresolved dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer
- Dispatch policy: high; selected=none; cap=xhigh (codex, advisory — policy set but no materialized fix target resolved)
- Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=unresolved effort_axis=unresolved dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer
- Dispatch policy: high; selected=none; cap=xhigh (codex, advisory — policy set but no materialized reviewer target resolved)

#### Outstanding Items

- Prior Important finding fixed: review dispatch schema no longer excludes
  selected Codex model axes (`40ae8413`).
- New remaining Important finding: model-argument dispatch reports
  `modelAxis: "unresolved"` even when `dispatchArgs.model` selects a concrete
  Claude/Cursor model. Latest review artifact:
  `.oat/projects/shared/codex-family-subagents/reviews/p02-review-2026-07-09T013018Z.md`.
- Remaining Medium finding: dispatch-matrix recommendation adoption still
  validates Codex route models as closed effort values in
  `packages/cli/src/commands/config/index.ts`.

#### Artifact / Design Deltas

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| None          | -               | -                    | -                 | -      | -               | -         |

### Run 4 — 2026-07-09 02:11

**Branch:** codex-family-subagents
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2 plus explicit retry override
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p02   | DONE        | pass   | override+1     | passed      |

#### Parallel Groups

- p02: sequential

#### Dispatch Notes

- Inline approved retry fix: `27890802` reports selected model axes from `dispatchArgs.model` for model-argument providers.
- Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=unresolved effort_axis=unresolved dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer
- Dispatch policy: high; selected=none; cap=xhigh (codex, advisory — policy set but no materialized reviewer target resolved)

#### Outstanding Items

- p02 passed with 0 Critical and 0 Important findings. Review artifact:
  `.oat/projects/shared/codex-family-subagents/reviews/p02-review-2026-07-09T020945Z.md`.
- Deferred Medium finding: dispatch-matrix recommendation adoption still
  validates Codex route models as closed effort values in
  `packages/cli/src/commands/config/index.ts`.

#### Artifact / Design Deltas

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| None          | -               | -                    | -                 | -      | -               | -         |

### Run 5 — 2026-07-09 03:11

**Branch:** codex-family-subagents
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p03   | DONE        | pass   | 1/2            | passed      |

#### Parallel Groups

- p03: sequential

#### Dispatch Notes

- Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=unresolved effort_axis=unresolved dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer
- Dispatch policy: high; selected=none; cap=xhigh (codex, advisory — policy set but no materialized implementer target resolved)
- Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=unresolved effort_axis=unresolved dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer
- Dispatch policy: high; selected=none; cap=xhigh (codex, advisory — policy set but no materialized reviewer target resolved)
- Dispatch: scope=p03 action=fix role=fix producer=unknown provenance=unknown model_axis=unresolved effort_axis=unresolved dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer
- Dispatch policy: high; selected=none; cap=xhigh (codex, advisory — policy set but no materialized fix target resolved)
- Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=unresolved effort_axis=unresolved dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer
- Dispatch policy: high; selected=none; cap=xhigh (codex, advisory — policy set but no materialized reviewer target resolved)

#### Outstanding Items

- p03 passed with 0 Critical, 0 Important, 0 Medium, and 0 Minor findings.
  Review artifact:
  `.oat/projects/shared/codex-family-subagents/reviews/p03-review-2026-07-09T030955Z.md`.

#### Artifact / Design Deltas

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| None          | -               | -                    | -                 | -      | -               | -         |

### Run 6 — 2026-07-09 03:32

**Branch:** codex-family-subagents
**Tier:** 1
**Policy:** merge-strategy=sequential, retry-limit=2
**Phases:** 1 executed, 1 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- |
| p04   | DONE        | pass   | 0/2            | passed      |

#### Parallel Groups

- p04: sequential

#### Dispatch Notes

- Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=unresolved effort_axis=unresolved dispatch_policy=high dispatch_ceiling=xhigh target=oat-phase-implementer
- Dispatch policy: high; selected=none; cap=xhigh (codex, advisory — policy set but no materialized implementer target resolved)
- Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=unresolved effort_axis=unresolved dispatch_policy=high dispatch_ceiling=xhigh target=oat-reviewer
- Dispatch policy: high; selected=none; cap=xhigh (codex, advisory — policy set but no materialized reviewer target resolved)

#### Outstanding Items

- p04 passed with 0 Critical, 0 Important, 0 Medium, and 1 Minor finding.
  Review artifact:
  `.oat/projects/shared/codex-family-subagents/reviews/p04-review-2026-07-09T033119Z.md`.
- Minor follow-up: clarify that user-scope Codex role generation via provider
  sync remains deferred while direct one-off materialization supports
  `--scope user` (`apps/oat-docs/docs/provider-sync/providers.md`).

#### Artifact / Design Deltas

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| None          | -               | -                    | -                 | -      | -               | -         |

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-07-08

**Session Start:** pending

- [x] p01-t01: Add Codex Materialization Codec (`6c0437bc`)
- [x] p01-t02: Add Codex Materialize CLI Command (`a6f83e1d`)
- [x] p01-t03: Write Materialized Roles and Merge Codex Config (`e6548a82`)
- [x] p02-t01: Model Codex Materialization Targets from Dispatch Matrix (`aed52a1a`)
- [x] p02-t02: Sync Materialized Codex Roles from Matrix Targets (`2ed93094`)
- [x] p02-t03: Dispatch to Materialized Codex Role Names (`e626118d`)
- [x] p02-t04: Update Doctor and Stray Detection for Materialized Roles (`3eb5d427`)
- [x] p02-t05: Rewrite Bundled Codex Dispatch Contracts (`48b227d6`)
- [x] p03-t01: Validate Cursor Subagent-Eligible Models (`963de2ad`)
- [x] p03-t02: Generate Dispatch Policy Choice Text from Canonical Data (`c2237cc8`)
- [x] p03-t03: Harden Workflow Skills Against Hand-Typed Option Lists (`b1f43b6c`)
- [x] p03-t04: Validate Codex Matrix Model Availability (`267f9e8e`)
- [x] p03-t05: Clarify Human-Facing Dispatch Display (`92cb2736`)
- [x] p03 review fixes: sentinel validation, unvalidated doctor warnings, and
      `OAT Dispatch Tier` primary display wording (`5c7d72a3`)
- [x] p04-t01: Document Materialized Codex and Cursor Dispatch Behavior (`c05ae475`)
- [x] p04-t02: Update Public Package Versions and Validate Release (`218196eb`)
- [x] p04-t03: Resolve Uncapped Codex Materialized Dispatch (`abfabe78`)
- [x] p04-t04: Clarify Codex User-Scope Materialization Docs (`d0363d7f`)
- [ ] p04-t05: Map Uncapped Codex Preferred Effort to Matrix Tier

**What changed (high level):**

- Added the Codex materialization codec and tests for deterministic managed
  role generation from canonical agents with explicit model and effort.
- Added the provider-scoped `oat providers codex materialize` command with
  dry-run, JSON, named-agent, and `--agent-path` behavior.
- Added write mode that creates materialized Codex role files and idempotently
  merges `.codex/config.toml` with multi-agent settings.
- Implemented Phase 2 materialized Codex target resolution, sync, dispatch,
  doctor/stray handling, and bundled dispatch contract updates.
- Applied review fixes for payload-derived Codex axes, effective-source sync
  materialization, materialized doctor validation, and Codex model-axis examples.
- Applied an explicit narrow retry override for the final p02 Important finding
  in the review dispatch schema; re-review found that blocker fixed.
- Applied an additional approved retry override for model-argument dispatch
  axes; p02 re-review passed with no Critical or Important findings.
- Implemented Phase 3 Cursor/Codex matrix availability validation, canonical
  dispatch-policy prompt rendering, final-phase HiLL review guidance, and
  human-facing dispatch display guidance.
- Applied p03 review fixes for Cursor Task-probe sentinel validation, doctor
  warning status for unvalidated matrix cells, and `OAT Dispatch Tier` display
  wording; p03 re-review passed with no findings.
- Documented materialized Codex model+effort dispatch, Cursor generic-agent
  plus Task-level model dispatch, subagent eligibility validation, dispatch
  policy modes, and materialized-role filesystem/config behavior.
- Bumped the five public packages to `0.1.46`, refreshed public package version
  assets, and passed the full release validation suite.

**Decisions:**

- Managed implementation dispatch policy is `high`.
- Existing hard-coded Codex effort pins should be replaced by generic
  materialization of canonical agents with explicit model and effort.
- Cursor remains generic-agent plus Task-level model dispatch, with
  subagent-eligible model validation.
- Dispatch UX supplement disposition: fold human-facing display guidance into
  this project as p03-t05; defer reusable machine schema/formatter work to
  `BL-260709-add-dispatch-machine-schema`.

**Follow-ups / TODO:**

- Verify Cursor GPT-5.6 subagent model slugs after availability:
  `BL-260708-verify-cursor-gpt-5-6-subagent`.
- Build a reusable dispatch machine schema/formatter:
  `BL-260709-add-dispatch-machine-schema`.
- Deferred Medium from p02 review: dispatch-matrix recommendation adoption
  still validates Codex route models as closed effort values in
  `packages/cli/src/commands/config/index.ts`.
- p04 Minor: clarify the provider-sync docs wording for user-scope Codex role
  generation versus direct `--scope user` materialization.
- Final review Important: managed uncapped Codex implementer/fix dispatch must
  resolve the preferred matrix target into materialized dispatch args.
- Applied final review fixes: managed uncapped Codex implementer/fix dispatch
  now materializes preferred matrix targets, and provider-sync docs now
  distinguish direct user-scope materialization from deferred user-scope sync.
- Final re-review Important: managed uncapped Codex implementer/fix dispatch
  still needs to map provider preferred effort values such as `xhigh` to matrix
  tier lookup before falling back to the base role.

**Blockers:**

- None.

---

## Deviations from Plan / Design

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

### Review Received: final

**Date:** 2026-07-09
**Review artifact:** `reviews/archived/final-review-2026-07-09T033502Z.md`

**Findings:**

- Critical: 0
- Important: 1
- Medium: 0
- Minor: 1

**Finding disposition map:**

- I1 -> converted: p04-t03 resolves managed uncapped Codex implementer/fix
  dispatch so it attaches the preferred matrix target and compiles a
  materialized Codex variant.
- m1 -> converted: p04-t04 clarifies provider-sync user-scope wording while
  preserving direct one-off `--scope user` materialization docs.

**New tasks added:** p04-t03, p04-t04

**Deferred Medium Ledger:**

- p02 Medium resolved by p03: recommendation adoption now keeps Codex route
  target model/effort pairs together with target context.

**Design drift / artifact alignment notes:**

- None.

**Next:** Execute final review fix tasks via the `oat-project-implement` skill.

After the fix tasks are complete:

- Update the final review row status to `fixes_completed`
- Re-run `oat-project-review-provide code final` then
  `oat-project-review-receive` to reach `passed`

### Review Received: final re-review

**Date:** 2026-07-09
**Review artifact:** `reviews/final-review-2026-07-09T035627Z.md`

**Findings:**

- Critical: 0
- Important: 1
- Medium: 0
- Minor: 0

**Finding disposition map:**

- I1 -> converted: p04-t05 maps managed uncapped Codex preferred effort values
  such as `xhigh` to dispatch matrix tier lookup before compiling materialized
  dispatch args.

**New tasks added:** p04-t05

**Next:** Execute p04-t05 via the `oat-project-implement` skill.

## Test Results

| Phase | Tests Run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Passed | Failed | Coverage |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | -------- |
| 1     | `pnpm --filter @open-agent-toolkit/cli test -- src/providers/codex/codec/materialize.test.ts`; `pnpm --filter @open-agent-toolkit/cli test -- src/providers/codex/codec/export-to-codex.test.ts src/providers/codex/codec/materialize.test.ts`; `pnpm --filter @open-agent-toolkit/cli test -- src/commands/providers/codex/materialize.test.ts src/commands/help-snapshots.test.ts`; `pnpm --filter @open-agent-toolkit/cli test -- src/commands/providers/codex/materialize.test.ts src/providers/codex/codec/config-merge.test.ts`; p01 review verification: CLI scoped test suite, type-check, and direct dry-run JSON check | yes    | no     | phase    |
| 2     | p02 task verification commands; p02 fix-loop verification commands; resolver smoke; p02-related CLI Vitest suites; CLI type-check; p02 re-review verification commands                                                                                                                                                                                                                                                                                                                                                                                                                                                           | yes    | no     | phase    |
| 3     | `pnpm --filter @open-agent-toolkit/cli test -- src/providers/identity/availability.test.ts src/commands/config/index.test.ts src/commands/doctor/index.test.ts`; `pnpm --filter @open-agent-toolkit/cli test -- src/config/dispatch-policy-options.test.ts src/commands/project/dispatch-ceiling/index.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/validation/skills.test.ts`; `git diff --check` via p03 re-review                                                                                                                      | yes    | no     | phase    |
| 4     | `pnpm build:docs` before docs update; stale role grep; `pnpm build:docs`; pre-bump `pnpm release:validate` expected guardrail failure; `pnpm format`; `pnpm lint`; `pnpm type-check`; `pnpm test`; `pnpm build`; `pnpm build:docs`; `pnpm release:validate`; p04 review verification: `git diff --check`, stale role grep, `pnpm build:docs`, `pnpm release:validate`; final review fix verification: `pnpm --filter @open-agent-toolkit/cli test -- src/commands/project/dispatch-ceiling/index.test.ts src/commands/config/index.test.ts src/providers/codex/codec/sync-extension.test.ts`, `pnpm build:docs`                  | yes    | no     | phase    |

## Final Summary (for PR/docs)

**What shipped:**

- Generic Codex role materialization for canonical agents with explicit model
  and reasoning effort.
- Dispatch-matrix-driven Codex materialized roles, plus Cursor and Claude model
  argument dispatch handling.
- Cursor and Codex matrix model availability validation with explicit warning
  states for unknown or unvalidated cells.
- Canonical dispatch-policy option rendering and hardened workflow guidance.
- Documentation and lockstep public package version updates for the shipped CLI
  and bundled asset changes.

**Behavioral changes (user-facing):**

- `oat providers codex materialize` can generate deterministic Codex roles from
  a canonical agent, model, and effort.
- OAT-managed Codex dispatch uses materialized model+effort roles when the
  resolver returns them; base roles are explicit provider-default fallbacks.
- Managed uncapped Codex implementer/fix dispatch resolves preferred matrix
  targets into materialized model+effort variants when available, while
  uncapped reviewer dispatch keeps its base-role fallback.
- Managed uncapped Codex implementer/fix dispatch maps preferred effort values
  such as `xhigh` to dispatch matrix tier lookup before using the base-role
  fallback.
- Cursor dispatch keeps generic `.cursor/agents` files and applies model
  control through Task-level arguments after subagent eligibility validation.
- Dispatch prompts and docs distinguish capped managed, managed uncapped,
  inherit host defaults, and unresolved deferral behavior.

**Key files / modules:**

- `packages/cli/src/providers/codex/codec/*`
- `packages/cli/src/commands/providers/codex/*`
- `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- `packages/cli/src/providers/identity/availability.ts`
- `.agents/skills/oat-project-implement/SKILL.md`
- `apps/oat-docs/docs/**`

**Verification performed:**

- Phase-scoped CLI Vitest suites, CLI type-check, docs build, stale-role docs
  grep, full `pnpm format`, `pnpm lint`, `pnpm type-check`, `pnpm test`,
  `pnpm build`, `pnpm build:docs`, and `pnpm release:validate`.

**Design deltas (if any):**

- None.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
