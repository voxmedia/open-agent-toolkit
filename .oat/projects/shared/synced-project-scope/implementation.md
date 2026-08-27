---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-27
oat_current_task_id: p03-t01
oat_generated: false
---

# Implementation: synced-project-scope

**Started:** 2026-08-26
**Last Updated:** 2026-08-27

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | complete    | 10    | 10/10     |
| Phase 2 | in_progress | 11    | 11/11     |
| Phase 3 | pending     | 10    | 0/10      |
| Phase 4 | pending     | 11    | 0/11      |

**Total:** 21/42 tasks completed

---

## Phase 1: Sync foundations

**Status:** complete
**Started:** 2026-08-27

### Phase Summary

**Outcome (what changed):**

- The scope resolver, synced-ref naming, discovery records, and nested-worktree Git primitives are implemented.
- Push, pull, continue, abort, path-limited parent commits, checkout preflight, and safe checkout removal are covered by focused tests.
- The manual GitHub spike confirmed that custom refs do not trigger the branch workflow, remain blob-addressable while privately authenticated, and stay out of the branch list.
- Independent review found five Git-safety and resilience defects; one bounded fix commit resolved all five and the fresh re-review passed.

**Key files touched:**

- `packages/cli/src/commands/shared/project-scope.ts` - scope and synced-ref resolution.
- `packages/cli/src/commands/project/sync/` - Git runner, records, and ref/worktree state machine.
- `packages/cli/src/__tests__/synced-fixture.ts` - real bare-origin fixture.

**Verification:**

- Run: focused Vitest suites, oxlint over the 12 changed TypeScript files, and CLI type-check.
- Result: phase verification passed (6 test files, 60 tests), plus oxlint, oxfmt, and CLI type-check. Fresh review passed with 0 Critical and 0 Important findings.

**Notes / Decisions:**

- No plan or design deviation was accepted. The maintainer confirmed the private blob rendered, and the scratch custom ref was deleted and verified absent.

### Task p01-t01: Scope resolver module

**Status:** completed
**Commit:** `61cadfdb81ace662407e544506c97fdb8ceede62`

**Outcome (required when completed):**

- Project scope, synced-ref, record-path, nested-checkout, and default-scope resolution now have a shared typed API.

**Files changed:**

- `packages/cli/src/commands/shared/project-scope.ts` and test.

**Verification:**

- Result: focused tests, lint, and type-check passed.

**Notes / Decisions:**

- None.

**Issues Encountered:**

- None.

---

### Task p01-t02: Gitignore rule for synced artifact directories

**Status:** completed
**Commit:** `52b2b34d28fb4b2acc6ac7b62a06c3df8bba1918`

**Notes:**

- Added and tested the directory-only synced checkout rule plus its probe helper.

### Task p01-t03: Git runner

**Status:** completed
**Commit:** `9e46c5a17aef161bd5e514f51ea4983285b449d3`

### Task p01-t04: Synced test fixture helper

**Status:** completed
**Commit:** `642047af45290a9800d017c34df5f6c13f078518`

### Task p01-t05: Discovery record module

**Status:** completed
**Commit:** `a84118dd2d0bac60860a45f1ddae24dd4b05206d`

### Task p01-t06: Ref sync engine - create and mutation invariants

**Status:** completed
**Commit:** `d22af48b8fb07d8f7b278475760d05636ef5e7dc`

### Task p01-t07: Ref sync engine - push

**Status:** completed
**Commit:** `db698714932251ded14592e5bd2b035618791bc7`

### Task p01-t08: Ref sync engine - pull, continue, and abort

**Status:** completed
**Commit:** `9c6949542ae1ed906ce8f49713e9f28274450ac7`

### Task p01-t09: Parent-branch record commits and checkout removal

**Status:** completed
**Commit:** `30688df4eb268501647a3fa6476852422fcf9eba`

### Task p01-t10: GitHub custom-ref spike

**Status:** completed
**Commit:** `chore(p01-t10): record GitHub custom-ref spike evidence` (this task commit)
**Outcome:** The custom ref did not trigger the unfiltered push workflow, the same commit did trigger it when published as a branch, the commit and blob remained available through the authenticated API and logged-in browser, and the custom ref never appeared in the branch list. Both scratch refs are deleted.

---

## Phase 2: CLI surface

**Status:** in progress - implementation complete; final operator-authorized review fix cycle 5/5
**Started:** 2026-08-27

### Phase Summary

**Outcome:** All 11 planned CLI-surface tasks are implemented, including scope-aware scaffolding, push/pull/list/scope commands, remote adoption, coordination children, and synced-aware open/pause behavior. One phase recovery updated stale integration expectations after the default changed to synced.

**Verification:** Full CLI suite passed 282 files and 3,784 tests after fix cycle 4/4; CLI lint, format, and type-check passed against committed HEAD. Review round 5 passed 428 phase tests, 77 command/help/lifecycle tests, and 78 control-plane tests plus type-checks, control-plane build, lint, format, and range diff checks.

**Review disposition:** Five independent rounds and four bounded fix iterations ran. Fix iteration 4 closed the real split-conflict recovery defect and ordinary lexical descendant rebinding, while stabilizing the prior load-sensitive test. Review round 5 found 1 Important canonical-target identity defect: a direct-child symlink can alias a sibling checkout and permit mutation under the wrong ref identity. On 2026-08-27 the operator authorized final fix cycle 5/5 plus one fresh sixth review; Phase 3 remains unstarted pending that verdict.

### Task p02-t01: `projects.defaultScope` config key

**Status:** completed
**Commit:** `90f1cbcb5a5825d1e1e3faafd87157bdba87ff59`

### Task p02-t02: Scope-aware scaffold

**Status:** completed
**Commit:** `38d5e05fdeb94914ffeb039d268583e66b7603a8`

### Task p02-t03: `oat project new --scope`

**Status:** completed
**Commit:** `25ccd72816af2f40d1efb75eb7e6cec71b2f3f74`

### Task p02-t04: `oat project scope`

**Status:** completed
**Commit:** `50bab322a99658d6a147923a22f0f1ed1295c38c`

### Task p02-t05: `oat project push`

**Status:** completed
**Commit:** `6c2c463dc517fda7a0efae0a89410358e9bc33ca`

### Task p02-t06: `oat project pull`

**Status:** completed
**Commit:** `b5f9d74dc189c2d8925442983e4c8a88c11f656c`

### Task p02-t07: `oat project list` across scopes

**Status:** completed
**Commit:** `8a949417f26581f000be94793ca2c006f521d6ad`

### Task p02-t08: End-to-end synced lifecycle

**Status:** completed
**Commit:** `9d9c591de2872028e71b30843ac1caa33584b618`

### Task p02-t09: `oat project list --remote`

**Status:** completed
**Commit:** `d4750c84290410baab8ddfc24cf9514e6543de96`

### Task p02-t10: Adopting pull and coordination children

**Status:** completed
**Commit:** `87f688fab14db8acd44fa139cb1fb6d91b9aeb18`

### Task p02-t11: Scope-aware `oat project open` and `oat project pause`

**Status:** completed
**Commit:** `34ecc0c30898dbccd20751d37b5adbc864fc587e`

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

### Run 1 - 2026-08-27T04:40:31Z

**Branch:** `feat/synced-project-scope`
**Tier:** 1 - subagents
**Dispatch policy:** managed `high` (Codex pinned variant)
**Status:** parked - `NEEDS_CONTEXT`

#### Generic Dispatch Record

```yaml
request_id: dispatch-synced-project-scope-p01-20260827T044031Z
caller: oat-project-implement
scope: synced-project-scope/p01
objective: Implement all ten p01 tasks in plan order with one verified commit per task.
action: implementation
role_name: oat-phase-implementer-gpt-5-6-sol-high
role_class: worker
provider: codex
dispatch_context: root-native
dispatch_policy: high
dispatch_ceiling: high
catalog_snapshot:
  id: codex-native-agent-schema-20260827T044031Z
  source: tool-schema
  observed_at: 2026-08-27T04:40:31Z
authority: p01 declared files; p01-t10 implementation evidence; recovery ledger only if activated
role_selector: oat-phase-implementer-gpt-5-6-sol-high
model_selector: gpt-5.6-sol
model_selector_granularity: materialized-role
effort_selector: high
reasoning_mode_selector: null
service_tier_selector: priority
guidance_reference: .agents/skills/subagent-orchestration/references/provider-codex.md
guidance_version: 2026-07-25
guidance_verified_at: 2026-07-25
guidance_status: fresh
selection_source: native-default
candidates_considered:
  - gpt-5.6-sol/high
selection_reason: native-catalog
selected_route: native
deadline_seconds: 7200
retry_limit: 1
payload:
  agent_type: oat-phase-implementer-gpt-5-6-sol-high
  fork_turns: none
  task_name: p01_implement
launch_status: accepted
child_outcome: needs-context
configured_invocation_evidence:
  - exact registered agent type accepted with materialized model and effort controls
runtime_confirmation: not-reported
diagnostics:
  - initial payload was rejected before start because task_name was missing; corrected payload preserved the target and scope
  - no supported signed-in browser connection was available for the private blob UI check
continuation_events: []
task_class: hard-reasoning
model_class_floor: hard-reasoning
classification_source: caller
classification_reason: Subtle custom-ref, nested-worktree, rebase, and path-limited mutation invariants create silent failure modes.
floor_satisfaction: satisfied
project_dispatch:
  project_path: .oat/projects/shared/synced-project-scope
  workflow_mode: spec-driven
  phase: implement
  phase_id: p01
  worktree: root
  commit_policy: one-commit-per-task
lifecycle_outcome:
  task_status: needs-context
  verification_status: code-passed; p01-t10-pending
  commit_range: 61cadfdb81ace662407e544506c97fdb8ceede62..30688df4eb268501647a3fa6476852422fcf9eba
```

#### Phase Outcomes

| Phase | Verdict       | Tasks | Root review | Fix loops |
| ----- | ------------- | ----- | ----------- | --------- |
| p01   | needs-context | 9/10  | not-started | 0         |

**Parallel groups:** None - the validated plan is fully sequential.

**Outstanding items:**

- p01-t10: maintainer confirmation of the private blob page, or explicit acceptance of authenticated API proof.
- After context: continue the same accepted handle, record evidence, delete only `refs/oat/projects/spike`, verify it is absent, and commit p01-t10.

### Run 2 - 2026-08-27T06:31:48Z

**Branch:** `feat/synced-project-scope`
**Tier:** 1 - subagents
**Dispatch policy:** managed `high` (Codex pinned variants)
**Status:** p01 passed; advancing to p02

#### Phase Outcomes

| Phase | Verdict | Tasks | Root review | Fix loops |
| ----- | ------- | ----- | ----------- | --------- |
| p01   | passed  | 10/10 | passed      | 1         |

**Implementation dispatch:** `oat-phase-implementer-gpt-5-6-sol-high` (`gpt-5.6-sol`, high), request `dispatch-synced-project-scope-p01-20260827T044031Z`.

**Task commits:** `61cadfdb`, `52b2b34d`, `9e46c5a1`, `642047af`, `a84118dd`, `d22af48b`, `db698714`, `9c694954`, `30688df4`, `82525eff`.

**Review round 1:** blocked with 2 Critical, 1 Important, and 2 Medium findings; artifact `reviews/code-p01-review-2026-08-27T055958Z.md`; reviewed head `82525efff71247350983816d180445980330400f`.

**Fix iteration 1:** commit `60787fce522cb9685d7076b56a0862296ffd82c4`; all five findings resolved; phase recovery usage remained 0/10.

**Review round 2:** passed with 0 Critical, 0 Important, 1 Medium, and 1 Minor finding; artifact `reviews/code-p01-review-2026-08-27T062203Z.md`; reviewed head `60787fce522cb9685d7076b56a0862296ffd82c4`.

**Review dispatch:** `oat-reviewer-gpt-5-6-sol-high` (`gpt-5.6-sol`, high) for both rounds. Neither reviewer attempted nested reconnaissance.

**Parallel groups:** None - the validated plan is fully sequential.

**Outstanding items:**

- Non-blocking Minor: replace the `@shared/../__tests__/synced-fixture` test import with a traversal-free explicit alias when that import surface is next touched.

### Run 3 - 2026-08-27T08:26:53Z

**Branch:** `feat/synced-project-scope`
**Tier:** 1 - subagents
**Dispatch policy:** managed `high` (Codex pinned variants)
**Status:** blocked - p02 terminal review retry exhausted

#### Phase Outcomes

| Phase | Verdict | Tasks | Root review | Fix loops |
| ----- | ------- | ----- | ----------- | --------- |
| p02   | blocked | 11/11 | blocked     | 2/2       |

**Implementation dispatch:** `oat-phase-implementer-gpt-5-6-sol-high` (`gpt-5.6-sol`, high), request `dispatch-synced-project-scope-p02-20260827T063331Z`.

**Task commits:** `90f1cbcb`, `38d5e05f`, `25ccd728`, `50bab322`, `6c2c463d`, `b5f9d74d`, `8a949417`, `9d9c591d`, `d4750c84`, `87f688fa`, `34ecc0c3`.

**Phase recovery:** attempt 1/10 recovered stale integration expectations in `43820a76`; canonical event `recovery-p02-01-cli-phase-suite`; ledger settled at 1/10 with `pending_attempt: null`.

**Review round 1:** blocked with 1 Critical, 4 Important, 2 Medium; artifact `reviews/code-p02-review-2026-08-27T071958Z.md`; reviewed head `7082c2b4205c8e287d79442e4d09bc76ced8ed80`.

**Fix iteration 1:** `1fef87205999940086aeb9e14d0c3d80d8309c5a`, continuation `continuation-p02-review-r1-fix-01-20260827T073752Z`; all seven findings addressed.

**Review round 2:** blocked with 4 Important; artifact `reviews/code-p02-review-2026-08-27T075217Z.md`; reviewed head `1fef87205999940086aeb9e14d0c3d80d8309c5a`.

**Fix iteration 2:** `00c9f24efb6b4a5fd4aaaadd40765853377c9b27`, continuation `continuation-p02-review-r2-fix-02-20260827T080529Z`; all four findings addressed.

**Review round 3:** terminal blocked with 2 Important; artifact `reviews/code-p02-review-2026-08-27T081844Z.md`; reviewed head `00c9f24efb6b4a5fd4aaaadd40765853377c9b27`.

**Review dispatch:** every round used fresh `oat-reviewer-gpt-5-6-sol-high` (`gpt-5.6-sol`, high). No reviewer attempted nested reconnaissance.

**Parallel groups:** None - the validated plan is fully sequential.

**Outstanding items requiring operator direction:**

- Make post-publication active-pointer recovery use the scope-correct project path so duplicate slugs across scopes cannot make the emitted recovery command ambiguous.
- Make mid-sequence synced split publication failure resumable and preserve transport/system exit classification; a normal `--resume` must republish every parent/child ref.
- Configured review-fix iterations are exhausted at 2/2. Phase 3 has not started.

### Run 4 - 2026-08-27T12:35:47Z

**Branch:** `feat/synced-project-scope`
**Tier:** 1 - subagents
**Dispatch policy:** managed `high` (Codex pinned variants)
**Status:** completed - fix cycle 3/3 committed and terminal review dispatched

#### Operator Extension

- Direction: `add one cycle and proceed`
- Durable retry limit: `oat_orchestration_retry_limit: 3`
- Scope: only the two Important findings in `reviews/code-p02-review-2026-08-27T081844Z.md`
- Exact implementation target: `oat-phase-implementer-gpt-5-6-sol-high`
- Review authorization: one fresh fourth p02 reviewer after the bounded fix; this explicitly extends the ordinary three-cycle review cap for p02 by one cycle
- Phase recovery: unchanged at 1/10 with `pending_attempt: null`
- Phase 3: not started

### Run 5 - 2026-08-27T12:59:31Z

**Branch:** `feat/synced-project-scope`
**Tier:** 1 - subagents
**Dispatch policy:** managed `high` (Codex pinned variants)
**Status:** blocked - p02 operator extension exhausted

#### Terminal Outcome

- Fix iteration 3: `7c8ee775bb12a24346927819de70cd0ff648350a`, continuation `continuation-p02-review-r3-fix-03-20260827T123547Z`; the two round-3 Important findings are closed
- Review round 4: blocked with 2 Important and 1 Medium; artifact `reviews/code-p02-review-2026-08-27T124656Z.md`; reviewed head `7c8ee775bb12a24346927819de70cd0ff648350a`
- Review dispatch: fresh `oat-reviewer-gpt-5-6-sol-high`, request `dispatch-synced-project-scope-p02-review-r4-20260827T124656Z`, reconnaissance not attempted
- Important blocker 1: explicit descendant paths can resolve to and mutate a different sibling synced project
- Important blocker 2: split finalization conflicts leave a child in rebase without safe normal-resume detection or target-specific recovery guidance
- Medium: the new Git-backed split recovery test can exceed the default timeout under suite load, although it passes in isolation
- Retry authority: fix cycle 3/3 and the explicitly extended fourth review are consumed; another cycle or a plan revision requires operator direction
- Phase recovery: unchanged at 1/10 with `pending_attempt: null`
- Phase 3: not started

### Run 6 - 2026-08-27T13:13:53Z

**Branch:** `feat/synced-project-scope`
**Tier:** 1 - subagents
**Dispatch policy:** managed `high` (Codex pinned variants)
**Status:** completed - fix cycle 4/4 committed and terminal review dispatched

#### Operator Extension

- Direction: `Authorizing`
- Interpreted scope: one additional bounded p02 fix/review cycle, matching the explicit choice offered at the prior stop
- Durable retry limit: `oat_orchestration_retry_limit: 4`
- Scope: only the two Important findings in `reviews/code-p02-review-2026-08-27T124656Z.md`
- Exact implementation target: `oat-phase-implementer-gpt-5-6-sol-high`
- Review authorization: one fresh fifth p02 reviewer after the bounded fix; this extends the ordinary three-cycle review cap for p02 by a second operator-authorized cycle
- Phase recovery: unchanged at 1/10 with `pending_attempt: null`
- Phase 3: not started

### Run 7 - 2026-08-27T13:40:05Z

**Branch:** `feat/synced-project-scope`
**Tier:** 1 - subagents
**Dispatch policy:** managed `high` (Codex pinned variants)
**Status:** blocked - p02 second operator extension exhausted

#### Terminal Outcome

- Fix iteration 4: `7a03f675a74fbf687b75ae17e8205167d9899345`, continuation `continuation-p02-review-r4-fix-04-20260827T131353Z`; both round-4 Important findings are closed for ordinary lexical paths and split conflict recovery
- Verification: the full CLI suite passed 282 files and 3,784 tests; CLI type-check, lint, and format passed
- Review round 5: blocked with 1 Important and no other findings; artifact `reviews/code-p02-review-2026-08-27T132942Z.md`; reviewed head `7a03f675a74fbf687b75ae17e8205167d9899345`
- Review verification: 17 phase files and 428 tests, 3 command/help/lifecycle files and 77 tests, and 78 control-plane tests passed; type-checks, control-plane build, lint, format, and range diff checks passed
- Review dispatch: fresh `oat-reviewer-gpt-5-6-sol-high`, request `dispatch-synced-project-scope-p02-review-r5-20260827T132942Z`, reconnaissance not attempted
- Important blocker: a direct-child symlink can alias a sibling synced checkout, pass the nested-worktree invariant, and let push mutate it under the requested slug's different ref identity
- Prior round-4 disposition: real split rebase-conflict recovery is fully closed; ordinary relative/absolute descendant paths are rejected, but the symlink alias variant remains
- Retry authority: fix cycle 4/4 and the fifth review are consumed; another cycle or a plan revision requires operator direction
- Phase recovery: unchanged at 1/10 with `pending_attempt: null`
- Phase 3: not started

### Run 8 - 2026-08-27T15:27:53Z

**Branch:** `feat/synced-project-scope`
**Tier:** 1 - subagents
**Dispatch policy:** managed `high` (Codex pinned variants)
**Status:** p02 final operator extension accepted; fix cycle 5/5 pending

#### Operator Extension

- Direction: `Agree, proceed`
- Interpreted scope: one final bounded p02 fix/review cycle, matching the recommendation accepted by the operator
- Durable retry limit: `oat_orchestration_retry_limit: 5` (configured maximum)
- Scope: only the Important canonical-target identity finding in `reviews/code-p02-review-2026-08-27T132942Z.md`
- Required repair: canonicalize the selected checkout and require equality with the slug's canonical direct child before mutation; add real-worktree regressions for explicit-path and bare-slug symlink aliases
- Exact implementation target: preserve `oat-phase-implementer-gpt-5-6-sol-high`
- Review authorization: one fresh sixth p02 reviewer after the bounded fix
- Stop rule: no further extension; any blocking sixth-review finding requires plan revision
- Phase recovery: unchanged at 1/10 with `pending_attempt: null`
- Phase 3: not started

<!-- orchestration-runs-end -->

---

## Recovery Events

### Recovery Event recovery-p02-01-cli-phase-suite

- Phase/task: p02 / p02-t11 phase verification
- Original request: dispatch-synced-project-scope-p02-20260827T063331Z
- Original commit: 34ecc0c30898dbccd20751d37b5adbc864fc587e
- Defect class: test
- Discovered by: `pnpm --filter @open-agent-toolkit/cli test`
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 1/10
- Dispatch target: oat-phase-implementer-gpt-5-6-sol-high
- Recovery commit: 43820a760b26d104f5a6bd2cbb61254bed35513d
- Verification: focused 76/76 and relevant phase 3,739/3,739 passed before commit and against committed HEAD
- Reason: mechanically related stale help snapshots and one integration fixture required explicit shared scope after the new synced default; no public behavior or architecture changed

---

## Implementation Log

Chronological log of implementation progress.

### 2026-08-27

**Session Start:** 04:40Z

- [x] p01-t01 through p01-t09 - nine verified append-only commits
- [ ] p01-t10 - parked for maintainer context

**What changed (high level):**

- Added the foundational typed and Git-plumbing modules for synced project refs and nested worktrees.
- Added focused coverage for custom-ref creation, push/pull conflict paths, parent record commits, and checkout removal.

**Decisions:**

- Preserved the scratch ref until its private blob page is visually confirmed or the API proof is explicitly accepted.

**Follow-ups / TODO:**

- Continue request `dispatch-synced-project-scope-p01-20260827T044031Z` through its original handle after context is supplied.

**Blockers:**

- p01-t10 private blob browser confirmation - pending.

**Session End:** 05:08Z (parked)

### 2026-08-27 - p01 completion

- [x] p01-t10 - maintainer confirmed the private blob rendered; scratch custom ref deleted and verified absent
- [x] p01 review fix iteration 1 - five findings resolved in `60787fce`
- [x] p01 fresh re-review - passed at 0 Critical / 0 Important
- [ ] p02-t01 - next task

### 2026-08-27 - p02 terminal review stop

- [x] p02-t01 through p02-t11 - eleven verified planned commits
- [x] p02 recovery attempt 1/10 - recovered and settled
- [x] p02 review fix iterations 1 and 2 - eleven findings resolved
- [x] p02 review fix iteration 3 - two round-3 findings resolved in `7c8ee775`
- [x] p02 review cycle 4 - blocked at 2 Important / 1 Medium in `reviews/code-p02-review-2026-08-27T124656Z.md`
- [x] p02 review fix iteration 4 - both round-4 Important findings resolved in `7a03f675`
- [x] p02 review cycle 5 - blocked at 1 Important / 0 Medium in `reviews/code-p02-review-2026-08-27T132942Z.md`
- [x] p02 operator disposition - final bounded cycle authorized
- [ ] p02 review fix iteration 5 and review cycle 6 - pending
- [ ] p03-t01 - not started

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage      |
| ----- | --------- | ------ | ------ | ------------- |
| 1     | 60        | 60     | 0      | not collected |
| 2     | 3,777     | 3,777  | 0      | not collected |

## Final Summary (for PR/docs)

**What shipped:**

- {capability 1}
- {capability 2}

**Behavioral changes (user-facing):**

- {bullet}

**Key files / modules:**

- `{path}` - {purpose}

**Verification performed:**

- {tests/lint/typecheck/build/manual steps}

**Design deltas (if any):**

- {what changed vs design.md and why}

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`

## Plan Gate Escalation (2026-08-27)

The configured `oat-project-plan` gate (`oat gate review --review-type artifact --review-scope plan --exit-nonzero-on important`, target `cursor-gpt-5-6-sol-xhigh`, `onFailure: block`, `maxAttempts: 2`) blocked on both attempts. Attempts are exhausted; per the gate contract the plan stays `in_progress` pending human direction. Accumulated feedback:

**Attempt 1 — `reviews/archived/artifact-plan-review-2026-08-27T013313Z.md`** (0 critical, 2 important, 2 medium) — all resolved in `plan.md`:

- I1 NFR2 spike could not prove no-CI-trigger in this repo (all workflows filter to `main`) → p01-t10 now uses a disposable GitHub repo with an unfiltered `on: [push]` workflow, waits, queries by SHA, deletes the repo.
- I2 FR14 worktree docs uncovered → p04-t07 adds a "Synced projects in worktrees" section to `workflows/projects/implementation-execution.md`.
- M1 p03-t04 file surface → `fs/io.ts` in Files; e2e in GREEN verify + format.
- M2 p04-t01 negated `jq` grep → `! grep …`.

**Attempt 2 — `reviews/archived/artifact-plan-review-2026-08-27T014220Z.md`** (2 critical, 3 important, 1 medium) — five resolved in `plan.md`/`design.md`, one resolved by a reversible product default:

- C1 `commitRecordChange` must exclude pre-staged unrelated changes → p01-t09 requires pathspec-limited commits (`git commit -m … -- <pathspecs>`) and a pre-staged-file test.
- C2 `oat-project-review-provide` Step 9.5 missing from the sweep; validator too literal → added to p04-t02; p04-t06 gains rule (c) guarded-variable-pathspec check and rule (d) checked-in bookkeeping-site inventory.
- I1 prune could bypass the open-PR guard with no checkout → p03-t05 reads `git show <ref>:state.md` when the checkout is absent; new test.
- I2 migration rollback not retryable → single rollback contract (remove everything migrate created, restore source); design.md updated; step-5 failure-injection test added.
- I3 listing `local` conflicts with the spec non-goal → **resolved toward the spec as written**: `list` enumerates `shared` + `synced` only; `local` stays unenumerated. Reversible: if the maintainer prefers to list `local`, amend spec Non-Goals/NFR1 and restore the p02-t07 `local` cases (design.md notes this).
- M1 dangling `received` ledger rows → both gate rows now point at archived provenance with invocation/target filled.

**Needed from the maintainer:** confirm the I3 default (or reverse it), then either authorize a third gate attempt (`oat gate review …` as configured) or approve the plan without a further gate run. `plan.md` frontmatter remains `oat_status: in_progress` until then.

**Maintainer direction received (2026-08-27):** list `local` projects too (existing gap, not a boundary) — spec Non-Goals/NFR1 amended, p02-t07 and design restored to three-scope listing. Disposable spike repository provided by the maintainer: `https://github.com/tkstang/disposable-test-repo-for-oat` (deletion is an operator step after implementation). Third plan gate attempt authorized; implementation is not to start until the maintainer is told the plan is ready.

**Attempt 3 — `reviews/archived/artifact-plan-review-2026-08-27T015823Z.md`** (1 critical, 2 important, 1 medium) — all resolved in `plan.md`/`design.md`:

- C1 PR skills never push/persist PR state for synced projects → p04-t05 now specifies a six-step sequence for both PR skills (push → links → create → persist `oat_pr_status`/`oat_pr_url` (new for progress PRs) → push).
- I1 prune only removed the current worktree's checkout → prune is project-wide across all registered checkouts with per-checkout preflight; two-parent-worktree test; design updated.
- I2 migration rollback after the branch commit → capture pre-migration HEAD; `reset --soft` + path-scoped restore incl. self-healed `.gitignore`; failure injection after commit and at `activeProject` retarget; design updated.
- M1 dogfood asserted the whole `refs/oat/projects/*` namespace empty → assertions scoped to the scratch slug.

Status after attempt 3: still `blocked` by the gate; all findings applied. Awaiting maintainer: run again or approve.

**Attempt 4 — `reviews/archived/artifact-plan-review-2026-08-27T022840Z.md`** (1 critical, 2 important, 2 medium) — all resolved in `plan.md`:

- C1 `oat-project-complete` classifies scope shared-vs-local in Step 1 and gates archive/recap on it → p04-t05 now rewrites Step 1 to `oat project scope` + `IS_DURABLE_PROJECT` (shared|synced), audits all six `IS_SHARED_PROJECT` sites, and updates the pinned contract test.
- I1 `oat-project-review-provide` Step 1.6 baseline check can't see the nested checkout → p04-t02 makes it scope-aware (`git -C "$PROJECT_PATH" status` on core artifacts; pull when absent) with a contract-test case.
- I2 p04-t09/p04-t10 could fix files without committing them → scoped fix commits before evidence commits; clean-status assertions before/after.
- M1 format/commit surfaces incomplete (p02-t05, p02-t07, p04-t06, p04-t08) → all declared files now formatted and staged; manifest format step added.
- M2 `ProjectSummary.scope` public API → `packages/control-plane/README.md` added to p02-t07.

Status after attempt 4: still `blocked`; all findings applied. Awaiting maintainer: run again or approve.

**Attempt 5 — `reviews/archived/artifact-plan-review-2026-08-27T025742Z.md`** (0 critical, 3 important) — all resolved:

- I1 canonical snippet failed open to `shared` → fail-closed (`|| exit 1`); validator rule (c) rejects fallback patterns.
- I2 archive "dry-check" named a destructive helper → new read-only `preflightSyncedCheckout`; `removeSyncedCheckout` called exactly once, last.
- I3 spike never requested a blob URL → spike commit carries `design.md`; `blob/<sha>/design.md` fetched and content-checked.

**Scope fold-in (maintainer direction 2026-08-27):** FR16 remote discovery & adoption (`list --remote`, adopting `pull`) and FR17 coordination pull added to spec; design gains the API additions and a "Discovery across machines and users" section (forks, clone refspec, GC roots); plan gains p02-t09/p02-t10 and a "picking up projects" docs page (40 tasks); FR18 (archive drops reviews/ for all scopes; S3 already excluded them) folded into p03-t04. Gate attempt 6 authorized on the combined change.

**Attempt 6 — `reviews/archived/artifact-plan-review-2026-08-27T031106Z.md`** (2 critical, 4 important, 1 medium; on the FR16/FR17 fold-in) — all resolved in `plan.md`:

- C1 synced split: `finalize.ts`/`split/run.ts` carry the parent scope root; parent + children re-pushed after post-scaffold mutations; e2e asserts remote parent `oat_children`.
- C2 arrival ordering: implement Step 0 and review-provide Step 0 pull before validating the directory; contract fixtures.
- I1 `oat_children` parsed from the YAML frontmatter object, not the scalar helper; slug validation; test uses `writeCoordinationParent` output.
- I2 single commit owner: `pullSynced` returns pending record paths; the command commits once (or not, `--no-commit`); partial-failure semantics specified.
- I3 `ProjectListRow` discriminated contract (materialized / recorded-absent / remote) with null lifecycle fields; README.
- I4 gate logs written to `mktemp -d`, removed before clean-status assertions.
- M1 ledger reconciled: duplicate 013313Z row removed (my accidental duplicate; the gate's row kept), stale 025742Z row set to archived/fixes_completed.

Gate attempt 7 authorized by the fold-in decision.

**Attempt 7 — `reviews/archived/artifact-plan-review-2026-08-27T032056Z.md`** (2 critical, 1 important, 2 medium) — all resolved:

- C1 recap two-commit protocol preserved for synced completion (lifecycle commit incl. immutable recap exports → attestation → evidence commit → one push); allowlist extended; tests.
- C2 inventory gaps → new p02-t11 (`open`/`pause` synced-aware) and p04-t11 (capture, promote-spec-driven, autonomous, next, retro-file); p04-t06 inventory now covers every resolver/arrival/writer with a completeness test.
- I1 archive retry identity: `record.archiveSnapshot` persisted before copy; failure injection at every boundary; checkout removed last.
- M1 dogfood runs real skills (`oat-project-summary`, `oat-project-progress`).
- M2 `push-runner.ts` added to p03-t04.

Plan is now 42 tasks. Gate attempt 8 follows.

**Attempt 8 — `reviews/archived/artifact-plan-review-2026-08-27T033204Z.md`** (1 critical, 2 important, 2 medium) — all resolved:

- C1 `open` publishes `state.md` when it resumes a paused synced project (push before pointer change; tests).
- I1 spike commit built on the workflow-bearing tip; positive control on a branch; blob check after branch deletion.
- I2 archive persists `record.archiveSnapshot` before any copy; synced mode from scope root + record; absent-checkout completed rerun is a no-op.
- M1 dogfood invokes the real `oat-project-progress` with the checkout absent.
- M2 conflict messages name the explicit target.

**Plan approved by the maintainer after attempt 8** ("sounds good" to: approve after receiving gate 8 unless structural). Eight gate runs, 36 findings, all applied. `plan.md` marked complete; implementation not started.

### Pre-implementation access check (2026-08-27T04:08Z)

Verified by a subagent against `https://github.com/tkstang/disposable-test-repo-for-oat` (repo is empty — no commits, no default branch yet):

- `gh auth status`: `tkstang`, ssh, scopes `gist read:org repo workflow`.
- Pushed a parentless empty-tree commit `c63e6e8d…` to `refs/oat/spike/access-check-20260827T040832Z` → `* [new reference]`, exit 0.
- `git ls-remote origin 'refs/oat/*'` showed the ref; `gh api …/git/refs/oat` listed it (REST API surfaces the namespace); `gh api …/commits/<sha>` returned 200 for a commit reachable only from the custom ref.
- Cleanup: remote + local ref deleted, `ls-remote` empty, clone removed. No branches/tags touched.

Implications for p01-t10: push access and custom-ref acceptance are proven; the spike still needs the workflow-bearing commit + branch positive control + blob-URL check. Because the repo is empty, p01-t10's Step 1 creates `main` with the probe workflow as its first commit.

### p01-t10 GitHub custom-ref spike — pre-verified (2026-08-27T04:15–04:22Z)

Run by a subagent against `https://github.com/tkstang/disposable-test-repo-for-oat` (private; Actions enabled). `main` = `3661e5d4` (first commit: `.github/workflows/probe.yml` with unfiltered `on: [push]` + README); the main push produced a run within ~22 s, proving the workflow is active.

- Spike commit `C = e36cc034464607ba353751fe92984dc5f3def096` (parent `main`, tree contains the workflow **and** `design.md`), blob `fadfd33f73706ee6f939a374644390e61117a99e`.
- **A — custom ref does not trigger Actions: PROVEN.** Pushed `C` to `refs/oat/projects/spike` at 04:15:54Z; at 04:18:37Z `gh run list … select(.headSha=="C")` → empty.
- **A′ — positive control: PROVEN.** Same `C` pushed to `refs/heads/oat-spike-branch` at 04:19:04Z; at 04:21:44Z exactly one run, `headBranch: oat-spike-branch`, `headSha: C`. Branch deleted 04:21:49Z. Final run list at 04:22:30Z: only the `main` and `oat-spike-branch` runs — none for the custom ref.
- **B — blob for a commit reachable only from the custom ref: PROVEN via API.** With the branch deleted, `gh api repos/…/contents/design.md?ref=C` → `fadfd33f…` (matches BLOB); `gh api repos/…/commits/C` → 200. Unauthenticated `curl` of the HTML page returns 404 because the repo is private — expected, not a negative. Browser-rendered check: `https://github.com/tkstang/disposable-test-repo-for-oat/blob/e36cc034464607ba353751fe92984dc5f3def096/design.md` (ref re-created via the API after the run so the page stays addressable; delete with the repo).
- **C — custom ref never in the branch list: PROVEN.** `gh api repos/…/branches` → `main` only throughout.
- Cleanup: spike ref and contrast branch deleted after the run (ref later re-created for the browser check); `main` + workflow left in place; local clone removed.
- Side finding: in zsh, `"$C:refs/heads/x"` expands `$C:r` as a modifier — use `"${C}:…"`. Plan commands updated.

Disposition for implementation: p01-t10 copies this evidence into its section; no re-push needed unless the repo is recreated.

### p01-t10 GitHub spike

- Repository: `https://github.com/tkstang/disposable-test-repo-for-oat`
- Spike commit: `e36cc034464607ba353751fe92984dc5f3def096`
- Blob: `fadfd33f73706ee6f939a374644390e61117a99e`
- Rendered blob URL: `https://github.com/tkstang/disposable-test-repo-for-oat/blob/e36cc034464607ba353751fe92984dc5f3def096/design.md`
- Maintainer visual confirmation: on 2026-08-27, after viewing the private page in a logged-in browser, the maintainer confirmed, “I see it, proceed.”

#### A - custom ref Actions query at 2026-08-27T04:18:37Z

```text
(empty)
```

#### A-prime - branch positive control at 2026-08-27T04:21:44Z

```json
{
  "event": "push",
  "headBranch": "oat-spike-branch",
  "headSha": "e36cc034464607ba353751fe92984dc5f3def096"
}
```

The final run-list check at 2026-08-27T04:22:30Z contained runs for `main` and `oat-spike-branch` only; no run had the spike SHA under the custom ref.

#### B - authenticated blob and commit checks after branch deletion

```text
contents/design.md blob: fadfd33f73706ee6f939a374644390e61117a99e
commit e36cc034464607ba353751fe92984dc5f3def096: HTTP 200
```

The authenticated contents result matched the expected blob, and the maintainer's logged-in browser confirmation on 2026-08-27 established that the rendered page was available while the commit was reachable only through the custom ref.

#### C - branch-list output

```text
main
```

Cleanup completed on 2026-08-27: `refs/heads/oat-spike-branch` and `refs/oat/projects/spike` are deleted, the same-named local custom ref is absent, and the repository itself remains for the operator. Final verification:

```text
$ git ls-remote https://github.com/tkstang/disposable-test-repo-for-oat 'refs/oat/*'
(empty)
```
