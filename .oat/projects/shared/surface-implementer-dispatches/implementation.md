---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-29
oat_current_task_id: p03-t02
oat_generated: false
---

# Implementation: surface-implementer-dispatches

**Started:** 2026-07-28
**Last Updated:** 2026-07-29

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
| Phase 1 | completed   | 2     | 2/2       |
| Phase 2 | completed   | 2     | 2/2       |
| Phase 3 | in_progress | 2     | 1/2       |

**Total:** 5/6 tasks completed

### Review Received: design

**Date:** 2026-07-29
**Review artifact:**
`reviews/archived/artifact-design-review-2026-07-28T235619Z.md`

**Findings:**

- Critical: 0
- Important: 1
- Medium: 3
- Minor: 3

**Disposition:**

- I1: `resolve_in_artifact` — exclude legacy `--preferred` selection from the
  skipped-selection notice predicate.
- M1: `resolve_in_artifact` — serialize nullable
  `selection.preferredValue` for auditability.
- M2: `resolve_in_artifact` — distinguish the static choices recommendation
  from effective adoption/runtime disclosure.
- M3: `resolve_in_artifact` — use `--task-effort` for classification and retain
  legacy `--preferred` for selection.
- m1: `resolve_in_artifact` — name invalid reviewer classification flags
  explicitly.
- m2: `resolve_in_artifact` — validate task effort against Codex effort values
  and use null for non-Codex providers.
- m3: `resolve_in_artifact` — define Frontier/Fable terminology and cite the
  bundled recommendation.

**New tasks added:** None — artifact reviews update lifecycle artifacts directly.

**Next:** Re-review the design artifact or continue quick-start plan review.

### Review Received: plan exit gate

**Date:** 2026-07-29
**Review artifact:**
`reviews/archived/artifact-plan-review-2026-07-29T034646Z.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 1
- Minor: 1

**Disposition:**

- M1: `resolve_in_artifact` — finalize `plan.md` with
  `oat_template: false` and `oat_template_name: plan`.
- m1: `resolve_in_artifact` — annotate the artifact-less structured
  quick-start review row with its provenance.

**New tasks added:** None — artifact reviews update lifecycle artifacts directly.

**Gate outcome:** Passed at the `important` threshold with corroborated handoff.

**Next:** Start implementation at `p01-t01`.

---

## Phase 1: Enforce Selection Provenance

**Status:** completed
**Started:** 2026-07-28

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Dispatch Report V1 records task classification, legacy preferred selection,
  and ordered structured notices with backward-compatible defaults.
- Managed named-cap implementation/fix resolution warns when exact candidate
  selection is skipped or an exact candidate lacks task-class provenance.
- Classification flags remain independent from candidate flags and legacy
  `--preferred`; warning routes preserve resolved status and exit code 0.

**Key files touched:**

- `packages/cli/src/providers/identity/dispatch-report.ts` - additive report
  schema, serialization, and human formatting.
- `packages/cli/src/commands/project/dispatch-ceiling/index.ts` -
  classification validation, notice derivation, and CLI flags.
- Focused report, resolver, integration, gate, and help tests - contract and
  regression coverage.

**Verification:**

- Run: Phase 1 focused Vitest suite and CLI type-check.
- Result: pass (214 focused tests; type-check clean).

**Notes / Decisions:**

- Classification is report provenance only and never participates in candidate
  normalization or target selection.
- Notices are derived after resolution and suppressed for preflight, review,
  inherit, uncapped, unresolved, and legacy-preferred paths.

### Task p01-t01: Extend Dispatch Report V1 with classification and notices

**Status:** completed
**Commit:** `fdd075bec64d8dadd79c99f9ba158a0d9331af18`

**Outcome (required when completed):**

- Dispatch Report V1 now records caller classification, legacy preferred
  selection, and ordered structured notices while defaulting legacy producers
  safely.

**Files changed:**

- `packages/cli/src/providers/identity/dispatch-report.ts` - extended the
  additive report contract, serializer, and human formatter.
- `packages/cli/src/providers/identity/dispatch-report.test.ts` - covered
  defaults, ordering, formatting, and compatibility-stamp stability.

**Verification:**

- Run: focused dispatch-report/gate Vitest suite and CLI type-check.
- Result: pass (138 tests; type-check clean).

**Notes / Decisions:**

- `formatDispatchStamp()` remains unchanged; the report-to-stamp projection
  ignores the additive report fields.

**Issues Encountered:**

- New contract assertions failed before implementation, then passed after the
  additive fields and defaults were implemented.

---

### Task p01-t02: Add classification inputs and managed-cap warnings

**Status:** completed
**Commit:** `d3ce4975068e10640858fc831822607e3e09f9cd`

**Outcome (required when completed):**

- Added provider-neutral `--task-class` and Codex-only `--task-effort`
  provenance inputs plus deterministic managed-cap warnings in human and JSON
  reports.

**Files changed:**

- `packages/cli/src/commands/project/dispatch-ceiling/index.ts` - parsed and
  validated classification, threaded report metadata, and derived notices.
- `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts` - covered
  classification, warning, suppression, and exit behavior.
- `packages/cli/src/commands/commands.integration.test.ts` - verified
  end-to-end report classification.
- `packages/cli/src/commands/help-snapshots.test.ts` - verified the new help
  surface.

**Verification:**

- Run: focused resolver/integration/help/report Vitest suite and CLI
  type-check.
- Result: pass (214 tests; type-check clean).

**Notes / Decisions:**

- Legacy `--preferred` remains a selection control and is serialized separately
  as `selection.preferredValue`.

**Issues Encountered:**

- New command tests initially failed on unknown flags and missing notices, then
  passed after implementation.

---

## Phase 2: Expose Terminal Reviewer Constraints

**Status:** completed
**Started:** 2026-07-29

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- Added shared structured notices for terminal Fable reviewer constraints to
  policy choices, effective adoption results, and runtime resolution.
- Updated implementation and fix guidance to require classification provenance
  while keeping reviewer routes classification-free.
- Documented effective-target runtime disclosure, organization-owned Fable
  access and retention checks, and the 14-recommended/18-catalogued Cursor
  boundary.

**Key files touched:**

- `packages/cli/src/config/dispatch-notices.ts` and resolver/config command
  surfaces - centralized terminal-reviewer notice behavior.
- `.agents/skills/oat-project-implement/` - classified resolver calls, Phase
  Scope provenance, pre-launch notices, and effective-target disclosure.
- Dispatch-policy and configuration docs - adoption/runtime boundaries, Fable
  responsibilities, corrected Cursor counts, and copyable resolver examples.

**Verification:**

- Run: focused disclosure and skill-contract Vitest suites, CLI type-check,
  docs index generation, workspace lint/format, docs checks, and docs build.
- Result: pass (269 disclosure tests; 117 skill-contract tests; type-check,
  lint, format, docs checks, and docs build clean).
- Generated docs index: regenerated with 9 entries and no semantic diff.

**Notes / Decisions:**

- Bundled recommendation metadata never substitutes for the effective resolver
  target when producing runtime disclosure.
- Fable recommendation/catalogue presence does not establish access or
  organization-specific retention eligibility.

### Task p02-t01: Add shared terminal-reviewer disclosures

**Status:** completed
**Commit:** `e37a044a3a5afd9b8a65c3ffb2b47d0461ab94f5`

**Outcome (required when completed):**

- Centralized structured terminal-reviewer eligibility notices for policy
  choices, effective post-adoption configuration, and runtime resolution.
- Preserved explicit Frontier cells and derived disclosures from effective
  Fable targets without inferring model access or organizational retention
  policy.

**Files changed:**

- `packages/cli/src/config/dispatch-notices.ts` - shared Fable target matching,
  notice metadata, and human formatting.
- `packages/cli/src/config/dispatch-policy-options.ts` - bundled recommendation
  disclosure in canonical choices.
- Config adoption and dispatch-ceiling commands - effective post-adoption and
  runtime disclosures in human and JSON output.
- Focused tests - recommendation/effective distinctions, preserved cells, and
  Fable/non-Fable runtime behavior.

**Verification:**

- Run: focused disclosure Vitest suite and CLI type-check.
- Result: pass (269 tests; type-check clean).

**Notes / Decisions:**

- Runtime notices are emitted only for reviewer or preflight resolution and
  match the effective target, not recommendation-version provenance.

---

### Task p02-t02: Update implementation guidance and documentation

**Status:** completed
**Commit:** `a48bc356cfd6778630c046f23bcdc11bcb33ceac`

**Outcome (required when completed):**

- Required implementation and fix examples to carry task classification,
  including Codex preferred effort, while reviewer routes remain free of
  classification flags.
- Required Phase Scope classification source/rationale and structured resolver
  notices before launch, with runtime disclosure based on effective targets.
- Documented Fable access/retention responsibility boundaries and corrected
  Cursor counts to 14 recommended candidates and 18 catalogued IDs.

**Files changed:**

- `.agents/skills/oat-project-implement/SKILL.md` - bumped the contract from
  2.2.1 to 2.2.2 and required pre-launch notices/effective-target disclosure.
- `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md` -
  classified implementation/fix commands and Dispatch Report notice handling.
- `.agents/skills/oat-project-implement/references/phase-execution.md` - Phase
  Scope classification provenance and effective-target rules.
- `packages/cli/src/validation/skills.test.ts` - executable skill/docs contract
  coverage.
- Dispatch-policy and configuration docs - user-facing examples, Fable
  boundaries, and corrected candidate counts.

**Verification:**

- Run: focused skill-contract Vitest suite, docs index generation, `pnpm lint`,
  `pnpm format`, `pnpm --filter oat-docs check`, and `pnpm build:docs`.
- Result: pass (117 focused tests; all documentation/workspace gates clean).

**Notes / Decisions:**

- Reviewer resolver commands deliberately carry no task classification flags.
- The generated docs index was regenerated and remained unchanged.

**Issues Encountered:**

- New contract assertions failed before the skill and docs changes, then passed
  after implementation.

---

## Phase 3: Release and Backlog Closeout

**Status:** in_progress
**Started:** 2026-07-29

### Task p03-t01: Bump lockstep public package versions

**Status:** completed
**Commit:** `fadf2cc418ac8e3012c056ddd457e8561d0b801f`

**Outcome (required when completed):**

- Bumped all five lockstep public packages and the bundled public-package
  inventory from `0.2.24` to `0.2.25`.

**Files changed:**

- Five public package manifests under `packages/` - lockstep release versions.
- `packages/cli/assets/public-package-versions.json` - bundled package-version
  inventory.

**Verification:**

- Run: `pnpm release:validate`.
- Result: pass (five public packages validated at `0.2.25`; visual validation
  passed with 65 measurements).

**Notes / Decisions:**

- No lockfile or generated tracked files changed.

---

### Task p03-t02: Archive the completed backlog item and run final verification

**Status:** blocked
**Commit:** -

**Blocker:**

- `pnpm test` reports stale autonomy gate-inventory mapping
  `ffb3af0ba8ef` for `oat-project-implement/SKILL.md`.
- The direct cause is the Phase 2 skill wording change; the derived contract
  file `.agents/docs/autonomy-contract.md` is outside the current Phase 3 task
  boundary.
- Backlog archive changes were reverted; the worktree is clean.

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

### Run 1 — 2026-07-29

<a id="run-1"></a>

**Branch:** `surface-implementer-dispatches`
**Provider / tier:** Cursor / Tier 1
**Dispatch policy:** managed High
**Schedule:** sequential (`p01` → `p02` → `p03`)

#### Dispatch Acceptance — p01 implementer

- **Request:** `impl-p01-20260729T042426Z`
- **Accepted target:** `oat-phase-implementer-gpt-5-6-sol-medium`
- **Task classification:** `default-implementation` (caller-owned bootstrap
  provenance)
- **Selection reason:** first sufficient High-tier candidate under the managed
  High ceiling
- **Candidates:** `gpt-5.6-sol-medium`, `gpt-5.6-sol-high`
- **Base / result:** `46fdec97d385f1b72525ceabdfb0be4b94f995a5` →
  `c18933689be4c19da60f7f7f44edd260e63f4786`
- **Outcome:** accepted once; `DONE`; report and four-commit task/bookkeeping
  sequence validated; no optional children

**Dispatch stamp:**

```text
Dispatch: scope=p01 action=implementation role=implementer producer=gpt-5.6-sol-medium provenance=declared model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-phase-implementer-gpt-5-6-sol-medium
```

#### Dispatch Acceptance — p01 reviewer

- **Request:** `review-p01-r1-20260729T043611Z`
- **Accepted target:** `oat-reviewer-gpt-5-6-sol-high`
- **Selection reason:** exact matrix-pinned review target at the configured High
  ceiling
- **Range:** `46fdec97d385f1b72525ceabdfb0be4b94f995a5` →
  `c18933689be4c19da60f7f7f44edd260e63f4786`
- **Outcome:** accepted once; artifact validated; `PASS`
- **Reconnaissance:** not attempted; no review-orchestration evidence required
- **Artifact:**
  `reviews/code-p01-review-2026-07-29T043611Z.md`

**Dispatch stamp:**

```text
Dispatch: scope=p01 action=review role=reviewer producer=gpt-5.6-sol-high provenance=declared model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high
```

#### Phase Outcome — p01

| Phase | Tasks | Implementation | Root Review | Fix Loops | Result |
| ----- | ----- | -------------- | ----------- | --------- | ------ |
| p01   | 2/2   | `DONE`         | `PASS`      | 0         | passed |

- **Findings:** 0 Critical, 0 Important, 1 Medium, 0 Minor
- **Non-blocking follow-up:** expand table-driven warning/suppression coverage
  across exact-candidate, legacy-preferred, provider, inherit, uncapped, and
  unresolved paths
- **Phase gate:** disabled
- **Parallel groups:** none
- **Outstanding blocking items:** none

#### Dispatch Acceptance — p02 implementer

- **Request:** `impl-p02-20260729T044336Z`
- **Accepted target:** `oat-phase-implementer-gpt-5-6-sol-medium`
- **Task classification:** `default-implementation` (caller)
- **Selection reason:** first sufficient High-tier candidate under the managed
  High ceiling
- **Candidates:** `gpt-5.6-sol-medium`, `gpt-5.6-sol-high`
- **Base / result:** `f617a05416a2ebf96496a328b76b80777d295b07` →
  `aeccb96fe90ece1df1916102d5d803e4599a02c4`
- **Continuation:** resumed the accepted handle after explicit user approval of
  the p02-t02 documentation delta
- **Outcome:** accepted once; `DONE`; report and four-commit task/bookkeeping
  sequence validated; no optional children
- **Resolver notices:** none

**Dispatch stamp:**

```text
Dispatch: scope=p02 action=implementation role=implementer producer=gpt-5.6-sol-medium provenance=declared model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-phase-implementer-gpt-5-6-sol-medium
```

#### Dispatch Acceptance — p02 reviewer round 1

- **Request:** `review-p02-r1-20260729T120024Z`
- **Accepted target:** `oat-reviewer-gpt-5-6-sol-high`
- **Selection reason:** exact matrix-pinned review target at the configured High
  ceiling
- **Range:** `f617a05416a2ebf96496a328b76b80777d295b07` →
  `aeccb96fe90ece1df1916102d5d803e4599a02c4`
- **Outcome:** accepted once; artifact validated; `BLOCKED`
- **Reconnaissance:** not attempted; no review-orchestration evidence required
- **Findings:** 0 Critical, 2 Important, 0 Medium, 0 Minor
- **Artifact:**
  `reviews/code-p02-review-2026-07-29T120024Z.md`

**Dispatch stamp:**

```text
Dispatch: scope=p02 action=review role=reviewer producer=gpt-5.6-sol-high provenance=declared model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high
```

#### Continuation Event — p02 fix iteration 1

- **Original request:** `impl-p02-20260729T044336Z`
- **Review request:** `review-p02-r1-20260729T120024Z`
- **Bounded findings:** layered effective post-adoption notice resolution; bare
  Cursor Fable runtime-target extraction
- **Route:** resume the original accepted Phase 2 implementer at the same exact
  target
- **Fix base:** `3d59d6299ec63bde3d82d3d3987eda826b118c94`
- **Fix commit:** `e0fab56e00961d2db4bff18ea4ecc25e3c54d608`
- **Outcome:** both Important findings fixed; 393 focused tests, CLI type-check,
  and CLI check passed
- **Status:** fixes complete; awaiting fresh root-owned Phase 2 re-review

#### Dispatch Acceptance — p02 reviewer round 2

- **Request:** `review-p02-r2-20260729T121857Z`
- **Accepted target:** `oat-reviewer-gpt-5-6-sol-high`
- **Range:** `f617a05416a2ebf96496a328b76b80777d295b07` →
  `c9b2ce70aa5bccc6a6123f0008d0cbc5b873c50e`
- **Outcome:** accepted once; artifact validated; `BLOCKED`
- **Reconnaissance:** not attempted; no review-orchestration evidence required
- **Prior findings:** layered adoption partially resolved; bare Cursor runtime
  disclosure resolved
- **Findings:** 0 Critical, 1 Important, 0 Medium, 0 Minor
- **Artifact:**
  `reviews/code-p02-review-2026-07-29T121857Z.md`

**Dispatch stamp:**

```text
Dispatch: scope=p02 action=review role=reviewer producer=gpt-5.6-sol-high provenance=declared model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high
```

#### Continuation Event — p02 fix iteration 2

- **Original request:** `impl-p02-20260729T044336Z`
- **Review request:** `review-p02-r2-20260729T121857Z`
- **Bounded finding:** layered adoption drops a higher-precedence bare-provider
  Fable target
- **Route:** resume the original accepted Phase 2 implementer at the same exact
  target
- **Fix base:** `49891d14cecc174e024595bfc451b3363914c3a8`
- **Fix commit:** `48944e9fb9bf2fc76849e4c89958b53e10d98967`
- **Outcome:** the remaining Important finding is fixed; 401 focused tests,
  CLI type-check, and CLI check passed; direct extraction probe returned
  Fable=1, non-Fable=0, candidate-array=1
- **Status:** fixes complete; awaiting final root-owned Phase 2 re-review

#### Dispatch Acceptance — p02 reviewer round 3

- **Request:** `review-p02-r3-20260729T123104Z`
- **Accepted target:** `oat-reviewer-gpt-5-6-sol-high`
- **Range:** `f617a05416a2ebf96496a328b76b80777d295b07` →
  `66283b6d2c72af3ed5273d6ce90feb1b6fdbef99`
- **Outcome:** accepted once; artifact validated; `PASS`
- **Reconnaissance:** not attempted; no review-orchestration evidence required
- **Prior findings:** both round-1 findings and the round-2 residual resolved
- **Findings:** 0 Critical, 0 Important, 0 Medium, 0 Minor
- **Artifact:**
  `reviews/code-p02-review-2026-07-29T123104Z.md`

**Dispatch stamp:**

```text
Dispatch: scope=p02 action=review role=reviewer producer=gpt-5.6-sol-high provenance=declared model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high
```

#### Phase Outcome — p02

| Phase | Tasks | Implementation | Root Review | Fix Loops | Result |
| ----- | ----- | -------------- | ----------- | --------- | ------ |
| p02   | 2/2   | `DONE`         | `PASS`      | 2         | passed |

- **Final findings:** 0 Critical, 0 Important, 0 Medium, 0 Minor
- **Phase gate:** disabled
- **Parallel groups:** none
- **Outstanding blocking items:** none

#### Dispatch Acceptance — p03 implementer

- **Request:** `impl-p03-20260729T123620Z`
- **Accepted target:** `oat-phase-implementer-gpt-5-6-sol-medium`
- **Task classification:** `default-implementation` (caller)
- **Selection reason:** first sufficient High-tier candidate under the managed
  High ceiling
- **Candidates:** `gpt-5.6-sol-medium`, `gpt-5.6-sol-high`
- **Base / result:** `052d60887172355d96b2a06c978039e46b409326` →
  `f71fabc9adeb7acd105dfb442270d71ac99a7f68`
- **Outcome:** accepted once; `BLOCKED` after p03-t01; report and two-commit
  task/bookkeeping sequence validated; no optional children
- **Resolver notices:** none

**Dispatch stamp:**

```text
Dispatch: scope=p03 action=implementation role=implementer producer=gpt-5.6-sol-medium provenance=declared model_axis=selected:gpt-5.6-sol-medium effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-phase-implementer-gpt-5-6-sol-medium
```

#### Phase Outcome — p03

| Phase | Tasks | Implementation | Root Review | Fix Loops | Result  |
| ----- | ----- | -------------- | ----------- | --------- | ------- |
| p03   | 1/2   | `BLOCKED`      | not run     | 0         | blocked |

- **Trigger:** `pnpm test` rejected stale autonomy gate-inventory mapping
  `ffb3af0ba8ef` after the Phase 2 skill edit
- **Restoration:** backlog archive changes reverted; clean worktree preserved
- **Outstanding item:** decide whether to add the derived
  `.agents/docs/autonomy-contract.md` refresh to the approved plan

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-07-28

**Session Start:** {time}

- [x] p01-t01: {Task name} - {commit sha}
- [ ] p01-t02: {Task name} - in progress

**What changed (high level):**

- {short bullets suitable for PR/docs}

**Decisions:**

- {Decision made and rationale}

**Follow-ups / TODO:**

- {anything discovered during implementation that should be captured for later}

**Blockers:**

- {Blocker description} - {status: resolved/pending}

**Session End:** {time}

---

### 2026-07-28

**Session Start:** {time}

{Continue log...}

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
| 1     | 412       | 412    | 0      | Focused  |
| 2     | 386       | 386    | 0      | Focused  |

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
