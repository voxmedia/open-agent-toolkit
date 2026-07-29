# Fact base

## Confirmed claims

- **design:** ---
  oat_status: complete
  oat_ready_for: null
  oat_blockers: []
  oat_last_updated: 2026-07-22
  oat_generated: false
  oat_template: false
  oat_template_name: design

---

# Design: subagent-orchestration

## Overview

This project separates model-selection guidance from OAT dispatch mechanics
without renaming the existing dispatch skill. A new, self-contained
`subagent-orchestration` skill becomes the canonical guidance layer: it owns
the five task classes, durable selection principles, dated provider mappings,
and evidence-refresh policy. It remains user-invocable and agent-discoverable
so it can be used independently of OAT.

The existing `oat-dispatch-subagents` skill remains an internal utility and
continues to own capability probing, live-catalog intersection, launch routes,
liveness, acceptance and recovery, and dispatch records. Its required-loading
contract composes the generic principles, exactly one provider selection
reference, and the matching OAT mechanics reference. The imported drafts are
starting material only; current OAT safeguards and repository conventions take
precedence.

Both skills ship in the utility pack from canonical `.agents` sources. Claude
receives a generated skill link, while Cursor and Codex native-read canonical
skills and do not receive mirrored skill views. Utility subset selection uses a
directional dependency: selecting `oat-dispatch-subagents` automatically
includes `subagent-orchestration`, while the self-contained guidance skill may
be installed alone. Validation enforces that dependency, the
selection-versus-mechanics boundary, compatibility of additive dispatch
evidence, provider-integration synchronization, and the repository's release
contract.

## Architecture

### System Context

The split introduces a guidance layer above the existing OAT dispatch engine.
Direct users and non-OAT agents can consume the guidance layer alone.
OAT-managed callers continue to invoke `oat-dispatch-subagents`; that skill
loads the guidance needed to choose a floor-satisfying target before applying
provider-specific launch mechanics.

Canonical sources remain under `.agents`. Claude links, materialized agent
roles, synchronization metadata, and bundled CLI assets are generated outputs;
Cursor and Codex ordinary skills remain native-read. The utility-pack installer
is the dependency boundary: dispatch installation must expose guidance, while
guidance-only installation remains valid.

**Key Components:**

- **Generic guidance skill:** Durable task classification and routing
  principles, provider-specific dated matrices, and refresh evidence.
- **OAT dispatch skill:** Provider-neutral launch contract plus
  provider-specific control-surface mechanics and dispatch evidence.
- **Distribution layer:** Utility-pack inventory, bundled assets, and
  synchronized provider views.
- **Validation layer:** Structural, ownership-boundary, safeguard,
  compatibility, synchronization, and release checks.

### Component Diagram

```text
Direct user or non-OAT agent
              |
              v
  subagent-orchestration
  + durable principles
  + one provider selection reference
  + evidence/refresh policy
              ^
              |
OAT caller -> oat-dispatch-subagents
              + provider-neutral launch contract
              + one matching mechanics reference
              + dispatch record schema
              |
              v
    live catalog + authorized route
              |
              v
         child launch

.agents canonical skills
        |
        +--> Claude skill link + materialized agent synchronization
        |
        +--> Cursor/Codex native skill reads
        |
        +--> CLI utility-pack bundle
```

### Data Flow

1. A caller classifies a bounded task and supplies any task-class floor,
   authority, expected evidence, and escalation conditions.
2. `oat-dispatch-subagents` loads the generic model-selection principles.
3. The active provider selects exactly one dated guidance reference; the
   dispatch skill also loads exactly one matching mechanics reference.
4. Configured candidates are intersected with the launching surface's live
   catalog, project policy, and named ceiling.
5. The dispatch engine chooses an eligible authorized route, records each
   selection axis independently, and launches once.
6. Acceptance, continuation, outcome, and runtime identity remain separate.
   Post-acceptance failure never authorizes automatic replacement.
7. Canonical skill changes flow through provider synchronization and CLI
   bundling; validation rejects drift or incomplete release metadata.

## Component Design

### Generic `subagent-orchestration` Guidance

**Purpose:** Provide portable, evidence-aware model-selection guidance without
depending on OAT launch machinery.

**Responsibilities:**

- Define root-versus-subagent ownership and bounded delegation requirements.
- Define the five task classes and escalation boundaries.
- Keep model, provider-native effort, reasoning mode, service tier, role,
  authority, and route as independent axes.
- Load one provider reference containing dated model mappings.
- Qualify newer candidates rather than automatically replacing incumbents.
- Require evidence and independent review for load-bearing or consequential
  conclusions.

**Interfaces:**

- The root skill is both user-invocable and agent-discoverable.
- `model-selection-principles.md` is the durable detailed contract.
- `provider-claude.md`, `provider-codex.md`, and `provider-cursor.md` are
  mutually exclusive active-provider selection references.
- `evidence-and-refresh.md` defines freshness states, review triggers,
  qualification criteria, and reverification records.

**Design Decisions:**

- Provider matrices remain separate because harness behavior and effort
  semantics are not interchangeable.
- Named models are dated examples subordinate to current instructions and the
  live launching-surface catalog.
- Cursor `-fast` aliases are service-tier selections, not capability upgrades.
- Claude routing retains the current Opus-first policy: Opus is the default
  Claude route for hard-reasoning and consequential work; Fable is reserved
  for exceptional escalation. Provider-native effort notes must remain
  separate from the task-class mapping.
- The Claude reference must preserve the root-versus-volume cost asymmetry:
  root-orchestrator calls are low-volume and coherence-critical, while bounded
  subagents carry most execution volume and should capture routine savings.
  Fable escalation therefore requires unresolved ambiguity, exceptional
  novelty or consequence, or a directly relevant Fable strength whose expected
  value justifies its incremental cost; a consequential label alone is not
  sufficient.
- The imported Claude draft's cyber-sensitive exception must be reframed:
  Opus-first is the general rule, and Fable's stronger cyber classifier is
  supporting operational evidence rather than an exception that switches the
  default. Preserve the caveat that stronger classifier behavior is not a
  capability weakness.
- The skill contains no OAT project state, lifecycle, launch, recovery, or
  record-writing policy.

### Internal `oat-dispatch-subagents` Mechanics

**Purpose:** Convert a bounded caller request and generic selection policy into
one authorized, evidenced launch.

**Responsibilities:**

- Probe capability and authorization state.
- Observe the exact launching surface's catalog and role selectors.
- Intersect candidates with policy, ceiling, task-class floor, and live
  selectors.
- Preserve native-first routing and distinguish native, policy-resolved, and
  explicitly authorized alternate routes.
- Record dispatch axes, launch acceptance, continuation, and outcome.
- Preserve fail-closed behavior and no-automatic-replacement safeguards.

**Interfaces:**

- Required loading composes the generic principles, one provider selection
  reference, and one matching mechanics reference.
- Provider mechanics references contain control surfaces, topology,
  liveness, native/CLI/SDK route rules, and catalog-mismatch handling.
- `record-schema.md` defines the request, record, and homogeneous-wave evidence
  shapes.

**Design Decisions:**

- The skill keeps its current name; a generic rename is a separate migration.
- Mechanics may discuss selectors and class floors, but it must not own named
  model families, dated task-class matrices, or provider recommendation
  ladders.
- If generic guidance is absent, class-constrained dispatch fails closed.
  Unconstrained legacy dispatch may use only current user/repository
  instructions intersected with the live catalog.
- Current Cursor outer-lifecycle and reviewer-local safeguards are preserved
  verbatim in meaning, including replacement eligibility only after an actual
  pre-start rejection.

### Consumer Migration

**Purpose:** Move every active selection consumer to the two-layer loading
contract so no caller mistakes mechanics-only references for model guidance.

**Responsibilities:**

- Inventory canonical instructions and validation code that reference
  `oat-dispatch-subagents/references` or otherwise describe the old
  single-reference contract.
- Update direct selection consumers to load generic principles, exactly one
  provider selection reference, and the matching mechanics reference.
- Preserve mechanics-only references where a consumer is intentionally
  discussing launch controls, but ensure that any model-selection step also
  names the generic guidance source.
- Cover at least the canonical reviewer agent, project planning and
  implementation skills, Cursor Cloud orientation, dispatch adapters, and CLI
  skill validation. Generated Claude and Cursor views follow through sync.
- Exclude historical provenance tables and archived project artifacts from
  active-instruction migration while keeping their references intact.

**Interfaces:**

- Canonical `.agents` instructions are the source of truth.
- Repo-wide reference inventory is the acceptance input; provider sync
  propagates canonical edits.
- Validation rejects active selection instructions that still treat
  `oat-dispatch-subagents/references/provider-*.md` as a complete selection
  source.

**Design Decisions:**

- Consumer updates are part of this project, not a follow-up, because the
  ownership split would otherwise leave active callers with incomplete
  guidance.
- Tests distinguish selection-purpose references from valid mechanics-purpose
  references rather than banning every occurrence of the dispatch path.

### Distribution and Synchronization

**Purpose:** Ensure the two-layer contract is installed and published as one
usable utility capability.

**Responsibilities:**

- Add the generic guidance skill to the utility-pack inventory beside
  `oat-dispatch-subagents`.
- Expand custom utility selections so choosing `oat-dispatch-subagents`
  automatically includes `subagent-orchestration`; do not add the inverse
  dependency.
- Keep bundle inputs and installer/remove/update behavior consistent with the
  canonical inventory.
- Generate the Claude skill link from `.agents`; Cursor and Codex native-read
  canonical skills and must not gain mirrored ordinary-skill outputs.
- Update synchronization metadata after canonical changes.
- Apply one frontmatter version increase per changed canonical skill in the
  final PR diff.
- Advance all lockstep public package versions because bundled skill assets are
  shipped CLI functionality.

**Interfaces:**

- Utility-pack manifest and bundle consistency checks.
- `oat sync --scope all` for provider-linked views and sync metadata.
- Repository release validation for the five public packages and bundled
  version metadata.

### Validation Contracts

**Purpose:** Detect accidental duplication, missing dependencies, safeguard
regression, and incomplete distribution.

**Responsibilities:**

- Verify skill frontmatter, invocation posture, and required-loading paths.
- Verify both skills are present in the utility pack and bundle.
- Verify selection references own dated model matrices and evidence metadata.
- Verify mechanics references retain provider control surfaces and contain no
  named recommendation matrix.
- Pin critical launch, liveness, acceptance, and no-replacement language by
  semantic assertions rather than broad snapshot tests.
- Verify dispatch evidence additions remain optional for legacy callers.
- Verify generated provider views and bundled assets are synchronized.

**Design Decisions:**

- Existing tests that read provider guidance from
  `oat-dispatch-subagents` move their selection assertions to the generic
  skill while leaving mechanics assertions on the dispatch skill.
- Negative ownership checks target unambiguous named-model and matrix markers;
  they do not prohibit mechanics from referring to generic model selectors or
  task-class floors.

## Data Models

### Provider Guidance Metadata

**Purpose:** Make dated mappings reviewable and refreshable.

**Schema:**

```yaml
guidance_version: YYYY-MM-DD
last_verified: YYYY-MM-DD
review_after: YYYY-MM-DD
catalog_basis: optional description of observed harness evidence
```

**Validation Rules:**

- Dates are explicit and internally ordered.
- A current live catalog or instruction may override a mapping without
  silently rewriting durable guidance.
- Review-required or stale guidance invokes the evidence-and-refresh contract
  before a consequential dispatch depends on it.

**Storage:** Frontmatter in each canonical provider selection reference.

### Optional Dispatch Guidance Evidence

**Purpose:** Preserve how dated guidance and independent provider controls
influenced a launch while remaining compatible with legacy callers.

**Schema:**

```yaml
reasoning_mode_selector: null
service_tier_selector: standard
guidance_reference: subagent-orchestration/references/provider-codex.md
guidance_version: YYYY-MM-DD
guidance_verified_at: YYYY-MM-DD
guidance_status: fresh
```

**Validation Rules:**

- Existing request and record shapes remain valid when these fields are absent.
- Model, effort, reasoning mode, and service tier remain independent.
- Service tier never changes the task-class floor or floor-satisfaction result.
- Unknown service-tier semantics are diagnostic and may block a consequential
  route.

**Storage:** Structured dispatch request/record evidence owned by the calling
workflow.

## Error Handling

### Missing or Invalid Guidance

- Missing generic guidance blocks class-constrained dispatch before launch.
- Missing, malformed, or stale provider metadata cannot be treated as fresh.
- Unconstrained legacy dispatch may proceed only from current instructions and
  live-catalog evidence; it cannot reconstruct the missing dated matrix.

### Catalog or Route Mismatch

- A missing selector produces a catalog-mismatch diagnostic with observation
  scope and candidate evidence.
- An unavailable native target does not authorize an improvised CLI, SDK, or
  cross-runtime route.
- A launch accepted by the provider is never replaced automatically after
  timeout, interruption, refusal, `BLOCKED`, or task failure.

### Distribution Drift

- Missing utility-pack or bundle entries fail focused consistency checks.
- Provider-view or sync-manifest drift is corrected through the repository sync
  command, not by hand-editing generated views.
- Version or release-contract failures block project completion.

## Testing Strategy

### Skill Contract Tests

- Validate the generic skill's name, version, compatibility statement,
  user-invocable posture, and provider-reference loading contract.
- Validate the dispatch skill's internal posture and progressive loading of
  principles, one selection reference, and one mechanics reference.
- Validate structural matrix invariants: all five task classes, independent
  effort notes, and correctly ordered freshness metadata.
- Validate the durable Opus-first policy and exceptional Fable disposition
  without freezing every dated incumbent name or row value.
- If exact dated mappings need fixture coverage, keep them in one
  refresh-owned fixture whose update obligation is documented by the guidance
  refresh workflow.
- Validate freshness metadata and evidence-refresh triggers.

### Ownership-Boundary Tests

- Assert that named provider families and dated recommendation matrices live
  in generic selection references.
- Assert that OAT provider references retain surface controls, topology,
  liveness, route selection, and catalog-mismatch behavior.
- Assert that mechanics references do not reintroduce named recommendation
  matrices.
- Pin the Cursor pre-start-rejection and no-post-acceptance-replacement
  safeguards.

### Compatibility Tests

- Validate legacy dispatch requests and records without guidance-evidence
  fields.
- Validate enriched records with reasoning mode, service tier, guidance
  reference, version, verification date, and freshness state.
- Validate that an unknown service tier cannot satisfy a higher class floor.

### Distribution and Integration Tests

- Verify the utility pack installs, updates, and removes both skills from the
  canonical inventory.
- Verify subset selection auto-includes guidance when dispatch is selected and
  still permits a guidance-only installation.
- Verify bundle consistency includes both canonical skill trees.
- Regenerate provider integrations and assert no synchronization drift or
  unexpected Cursor/Codex skill mirrors.
- Run focused CLI skill validation, formatting, type checking, and relevant
  tests.
- Run the repository's publishable-package release validation after the
  lockstep version update.

## References

- Discovery: `discovery.md`
- Imported handoff: `references/prior-project/handoff.md`
- Imported global-file record:
  `references/prior-project/global-file-updates.md`
- Imported guidance draft:
  `references/prior-project/skills/subagent-orchestration/`
- Imported dispatch draft:
  `references/prior-project/skills/oat-subagent-dispatch/`
- Downstream coordination: after canonical guidance ships, refresh the
  operator's non-sync-managed vault matrix and global-file record so they do
  not continue to describe the rejected Fable-first policy. Private-repository
  copies remain the responsibility of their existing sync process.
- Workflow bookkeeping: quick-mode lightweight design keeps
  `oat_ready_for: null`; implementation readiness is established only by the
  reviewed, completed plan.
- **implementation:** ---
  oat_status: in_progress
  oat_ready_for: null
  oat_blockers: []
  oat_last_updated: 2026-07-23
  oat_current_task_id: null
  oat_generated: false

---

# Implementation: subagent-orchestration

**Started:** 2026-07-22
**Last Updated:** 2026-07-23

> This document is used to resume interrupted implementation sessions.
> `oat_current_task_id` always points at the next plan task to do.

## Progress Overview

| Phase   | Status   | Tasks | Completed |
| ------- | -------- | ----- | --------- |
| Phase 1 | complete | 4     | 4/4       |
| Phase 2 | complete | 1     | 1/1       |
| Phase 3 | complete | 2     | 2/2       |
| Phase 4 | complete | 2     | 2/2       |
| Phase 5 | complete | 1     | 1/1       |

**Total:** 10/10 tasks completed

## Planning Gate Override

The configured quick-start exit gate used `onFailure: block`. Its first Fable
attempt timed out; its second attempt produced a receive-eligible review whose
findings were dispositioned and fixed. The operator explicitly approved
proceeding on 2026-07-23 without the clean re-review required by the configured
policy.

This records an intentional lifecycle exception. The plan review remains
`fixes_completed`, not `passed`, and later code reviews must independently
verify the implemented result.

---

## Phase 1: Establish the canonical split

**Status:** complete
**Started:** 2026-07-23

### Phase Summary

**Outcome:**

- Added the portable `subagent-orchestration` guidance layer.
- Reduced `oat-dispatch-subagents` to selection/launch mechanics and additive
  dispatch evidence.
- Migrated all declared active consumers and restored repository contracts.

**Verification:**

- Focused contracts: 139/139 passed.
- Full repository suite: 3,539/3,539 passed.
- Type-check and formatting passed.
- Root-owned re-review passed after one bounded fix iteration.

**Notes / Decisions:**

- The review fix added one canonical autonomy mapping update and one test
  version assertion outside the original task file list. The passing
  implementation is the source of truth; no product/design behavior changed.

### Task p01-t01: Add portable model-selection guidance

**Status:** completed
**Commit:** `6d1470423350e6962185cf2433bd0d3342bfab72`

### Task p01-t02: Reduce dispatch references to mechanics

**Status:** completed
**Commit:** `9c2bcb3c5de13e688b32cd9c8aa05fd85b5b2ca7`

### Task p01-t03: Migrate canonical dispatch consumers

**Status:** completed
**Commit:** `b6dbf91a2c55ff2109569ee9bc78ae6d604a8f93`

### Task p01-t04: Restore the existing skill suite to green

**Status:** completed
**Commit:** `1af572393bfbf82907278a546a3f21500330e483`

**Phase review:** passed in
`reviews/archived/p01-review-2026-07-23T050810Z.md` after fix iteration 1.

---

## Phase 2: Enforce guidance and mechanics contracts

**Status:** complete
**Started:** 2026-07-23

### Phase Summary

**Outcome:**

- Added durable structural coverage for orchestration guidance, mechanics,
  provider loading, task classes, compatibility, and service-tier boundaries.

**Verification:**

- Focused contract suite passed 111/111 after one fix iteration.
- Root-owned re-review passed with 0 Critical and 0 Important findings.

**Notes / Decisions:**

- One non-blocking Medium remains: the compatibility test uses a canonical
  request fixture rather than an explicit legacy record fixture.

### Task p02-t01: Harden skill boundary validation

**Status:** completed
**Commit:** `22ae2325dbb8f0c9763c0004e023a93efa49ad2e`

**Phase review:** passed in
`reviews/archived/p02-review-2026-07-23T115055Z.md` after fix iteration 1.

---

## Phase 3: Distribute and document the split

**Status:** complete
**Started:** 2026-07-23

### Phase Summary

**Outcome:**

- Added the directional utility dependency and explicit pack lifecycle
  coverage.
- Updated active orchestration documentation for the guidance/mechanics split.

**Verification:**

- Seven focused files passed 95/95 tests.
- Documentation production build passed after fan-in.
- Root-owned review passed with no findings.

**Notes / Decisions:**

- The original dispatch used stale boundaries and was terminal without edits;
  the operator authorized one fresh same-target recovery.
- Two pre-existing broken docs fragments remain outside this phase.
- The normal `--no-ff` merge was aborted on the duplicate bootstrap-sync
  manifest conflict; the two reviewed task commits were cherry-picked.

### Task p03-t01: Add directional utility dependency

**Status:** completed
**Commit:** `7c519bad` (reviewed source `bc3c81d6`)

### Task p03-t02: Update active orchestration documentation

**Status:** completed
**Commit:** `6c818608` (reviewed source `f15b713c`)

**Phase review:** passed in
`reviews/archived/p03-review-2026-07-23T112224Z.md`.

---

## Phase 4: Synchronize and release the integrated result

**Status:** complete
**Started:** 2026-07-23

### Phase Summary

**Outcome:**

- Advanced the five public packages to the common unpublished version
  `0.2.13`.
- Refreshed bundled public-version metadata and provider-sync release metadata.

**Verification:**

- Five npm histories parsed successfully and did not contain `0.2.13`.
- Focused integration tests passed 249/249.
- Full tests, lint, type-check, formatting, builds, release validation, and
  final sync dry-run passed.
- Root-owned release review passed with no findings.

**Notes / Decisions:**

- Previously generated provider views were already current; p04-t02 changed
  only `.oat/sync/manifest.json` release metadata.

### Task p04-t01: Advance lockstep package versions

**Status:** completed
**Commit:** `8856fa4e5019ad12fd4394d5941181e4f644430b`

### Task p04-t02: Regenerate providers and pass release gates

**Status:** completed
**Commit:** `7d3aaab73126638f6d1b7691a3623c0988ed3f3b`

**Phase review:** passed in
`reviews/archived/p04-review-2026-07-23T120818Z.md`.

---

## Phase 5: Final review fixes

**Status:** complete
**Started:** 2026-07-23

### Phase Summary

**Outcome:**

- Added an explicit canonical legacy dispatch Record without optional guidance
  evidence.
- Updated compatibility coverage to compare the legacy and enriched Record
  fixtures directly.
- Bumped `oat-dispatch-subagents` from `1.2.0` to `1.2.1`.

**Verification:**

- Focused contract suites passed 136/136.
- Formatting, release validation, provider sync dry-run, and diff checks passed.
- Final verification exposed one directly caused autonomy inventory mapping;
  fix `ab60498b` updated the canonical NG mapping and the full test suite passed.

### Task p05-t01: (review) Add explicit legacy dispatch-record fixture

**Status:** completed
**Commit:** `e92a50bd9b38a9f57698f58e9b33d351bf24048b`

**Final review fix:** completed; final re-review pending for
`reviews/archived/final-review-2026-07-23T121234Z.md`.

---

## Orchestration Runs

<!-- orchestration-runs-start -->

### Run 1 — 2026-07-23T05:08:10Z {#run-1}

**Branch:** `subagent-orchestration`
**Tier:** Tier 1 Cursor subagents
**Policy:** managed `high`

#### Phase Outcomes

| Phase | Verdict | Task Commits                                   | Review                                              | Fixes                   |
| ----- | ------- | ---------------------------------------------- | --------------------------------------------------- | ----------------------- |
| p01   | passed  | `6d147042`, `9c2bcb3c`, `b6dbf91a`, `1af57239` | `reviews/archived/p01-review-2026-07-23T050810Z.md` | 1 iteration, `0dda1cf3` |

#### Dispatch Notes

- Implementation: `oat-phase-implementer-gpt-5-6-sol-high`,
  `model_axis=selected:gpt-5.6-sol-high`, `effort_axis=not-applicable`,
  selection reason `native-catalog`.
- Review rounds: `oat-reviewer-gpt-5-6-sol-high` at the managed high ceiling;
  no reviewer-local reconnaissance was attempted.
- Fix continuation resumed the original implementation handle and preserved
  request linkage.
- Dispatch stamps:
  - `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
  - `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
  - `Dispatch: scope=p01-fix1 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`

#### Parallel Groups

None in this run entry.

#### Outstanding Items

None for Phase 1.

### Run 2 — 2026-07-23T11:54:23Z {#run-2}

**Branch:** `subagent-orchestration`
**Tier:** Tier 1 Cursor subagents
**Policy:** managed `high`

#### Phase Outcomes

| Phase | Verdict | Task Commits                                                     | Review                                              | Fixes / Recovery                                 |
| ----- | ------- | ---------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------ |
| p02   | passed  | `22ae2325`                                                       | `reviews/archived/p02-review-2026-07-23T115055Z.md` | 1 fix iteration, `0692243e`                      |
| p03   | passed  | source `bc3c81d6`, `f15b713c`; integrated `7c519bad`, `6c818608` | `reviews/archived/p03-review-2026-07-23T112224Z.md` | 0 fix iterations; 1 operator-authorized recovery |

#### Dispatch Notes

- All implementation and review routes selected the native
  `gpt-5.6-sol-high` materialized variant at the managed `high` ceiling;
  ordered candidates were `gpt-5.6-sol-medium`, then `gpt-5.6-sol-high`.
- Neither root-owned reviewer attempted reviewer-local reconnaissance.
- Phase 2 resumed its original implementation handle for the bounded fix.
- Phase 3's original accepted attempt stopped without edits because the root
  supplied stale boundaries. Its fresh same-target recovery was explicitly
  operator-authorized and linked to the original request.
- Dispatch stamps:
  - `Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
  - `Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
  - `Dispatch: scope=p02-fix1 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
  - `Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
  - `Dispatch: scope=p03-recovery1 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
  - `Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`

#### Parallel Groups

- Group: `[p02, p03]`
- Expected base: `f1e48897be5b4417f62ffd132b80ba87728f97e3`
- Worktrees:
  - `p02`: `.worktrees/subagent-orchestration-p02`, bootstrap sync
    `1668d004`, merged through `51aed2d`, then removed.
  - `p03`: `.worktrees/subagent-orchestration-p03`, bootstrap sync
    `199bc797`, reviewed task commits cherry-picked, then removed.
- The Phase 3 `--no-ff` merge conflicted only because both worktrees carried an
  equivalent bootstrap-generated `.oat/sync/manifest.json` commit. The merge
  was aborted before the task commits were cherry-picked in plan order.

#### Outstanding Items

- Non-blocking Medium: add a canonical legacy dispatch-record fixture without
  optional guidance fields.
- Pre-existing docs fragments:
  `implementation-execution.md#plan-declared-parallelism` and
  `orchestration-model.md#route-tiers-and-terminality`.

### Run 3 — 2026-07-23T12:10:29Z {#run-3}

**Branch:** `subagent-orchestration`
**Tier:** Tier 1 Cursor subagents
**Policy:** managed `high`

#### Phase Outcomes

| Phase | Verdict | Task Commits           | Review                                              | Fixes |
| ----- | ------- | ---------------------- | --------------------------------------------------- | ----- |
| p04   | passed  | `8856fa4e`, `7d3aaab7` | `reviews/archived/p04-review-2026-07-23T120818Z.md` | 0     |

#### Dispatch Notes

- Implementation and review selected the native
  `gpt-5.6-sol-high` materialized variant at the managed `high` ceiling from
  ordered candidates `gpt-5.6-sol-medium`, then `gpt-5.6-sol-high`.
- The root-owned reviewer did not attempt reviewer-local reconnaissance.
- Dispatch stamps:
  - `Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`
  - `Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`

#### Parallel Groups

None in this run entry.

#### Outstanding Items

- Non-blocking legacy dispatch-record fixture improvement from Phase 2.
- Two pre-existing docs fragment-link failures recorded in Run 2.

### Run 4 — 2026-07-23T12:26:31Z {#run-4}

**Branch:** `subagent-orchestration`
**Tier:** Tier 1 Cursor subagents
**Policy:** managed `high`

#### Phase Outcomes

| Phase | Verdict | Task Commits | Review                                                | Fixes                               |
| ----- | ------- | ------------ | ----------------------------------------------------- | ----------------------------------- |
| p05   | passed  | `e92a50bd`   | `reviews/archived/final-review-2026-07-23T123440Z.md` | M1 plus verification fix `ab60498b` |

#### Dispatch Notes

- Implementation selected native `gpt-5.6-sol-high` at the managed `high`
  ceiling from ordered candidates `gpt-5.6-sol-medium`, then
  `gpt-5.6-sol-high`.
- Dispatch stamp:
  - `Dispatch: scope=p05 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high`

#### Parallel Groups

None in this run entry.

#### Outstanding Items

- None. The two known docs fragments predate the branch and remain outside this
  project's findings.

<!-- orchestration-runs-end -->

---

## Review Received: final

**Date:** 2026-07-23
**Review artifact:**
`reviews/archived/final-review-2026-07-23T121234Z.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 1
- Minor: 0

**New tasks added:** `p05-t01`

**Finding disposition:**

- M1: `code_fix_required` — add a canonical legacy dispatch Record fixture and
  assert baseline fields plus absence of optional guidance evidence. Task scope:
  Minor.

**Fix status:** completed in `e92a50bd`; final re-review passed.

---

## Final Re-review Received: final

**Date:** 2026-07-23
**Review artifact:**
`reviews/archived/final-review-2026-07-23T123440Z.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**Deferred ledger:**

- M1 resolved by `e92a50bd`.
- Directly caused autonomy inventory drift resolved by `ab60498b`.
- No deferred Medium or Minor remains.

**Disposition:** final lifecycle review passed.

---

## Gate Review Received: final

**Date:** 2026-07-23
**Gate run:** `48a1a4df-a811-417c-be38-cc975466b1ec`
**Review artifact:**
`reviews/archived/final-review-2026-07-23T124954Z.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**Deferred ledger:** clear. M1 and its directly caused inventory drift were
resolved before this gate; no deferred Medium or Minor remains.

**Disposition:** configured implementation exit gate passed. No fix tasks were
added.

---

## Post-Documentation Final Review Received: final

**Date:** 2026-07-23
**Review artifact:**
`reviews/archived/final-review-2026-07-23T162104Z.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**Deferred ledger:** clear. The review independently verified the approved
documentation and PJM delta, preserved implementation contracts, repaired
fragments, and the existing lockstep `0.2.13` release.

**Disposition:** final lifecycle review passed after documentation sync.

---

## Refreshed Gate Review Received: final

**Date:** 2026-07-23
**Gate run:** `cf1b9992-38b0-4d3a-be67-10435ba5a406`
**Review artifact:**
`reviews/archived/final-review-2026-07-23T163522Z.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 0

**Deferred ledger:** clear. The gate independently re-verified the full project
and confirmed the post-review delta was lifecycle bookkeeping only.

**Disposition:** refreshed configured implementation exit gate passed. No fix
tasks were added.

---

## Implementation Log

### 2026-07-23

- Planning handoff completed.
- Gate findings were fixed and the operator waived the clean Fable re-review.
- Implementation preflight selected Tier 1 Cursor subagents under the managed
  `high` policy.
- HiLL is configured for final Phase 5, with automatic checkpoint review
  enabled.
- Phase 1 produced four verified task commits; focused tests, formatting, and
  type-check passed.
- Root-owned review found two Important full-suite contract drifts. Fix
  iteration 1 is bounded to the canonical autonomy mapping and reviewer-version
  assertion.
- Fix iteration 1 completed both findings in `0dda1cf3`; targeted tests passed
  139/139 and the full suite passed 3,539/3,539.
- Phase 1 re-review passed with no findings.
- Phase 2 implementation completed in `22ae2325`; root review found 2
  Important contract-coverage gaps. Fix iteration 1 completed all 5 findings
  in `0692243e`; re-review passed with one non-blocking Medium.
- Phase 3 passed root review in `reviews/archived/p03-review-2026-07-23T112224Z.md`
  after one operator-authorized recovery.
- Phase 2 merged through `51aed2d`; its focused suite passed 111/111.
- Phase 3's duplicate bootstrap-sync manifest conflicted during `--no-ff`
  merge. The merge was aborted and reviewed task commits were cherry-picked as
  `7c519bad` and `6c818608`; 95/95 focused tests and the docs build passed.
- Phase 4 selected unpublished version `0.2.13`, completed two bounded commits,
  passed all repository and release gates, and passed root review with no
  findings.
- Initial final lifecycle review converted one Medium compatibility gap to
  `p05-t01`; the fix added the explicit legacy Record fixture and passed all
  focused, release, and sync checks.
- Final verification found the fixture's new autonomy-inventory prompt-site
  hash; bounded fix `ab60498b` mapped it to NG and restored the full suite.
- Final lifecycle re-review passed with no findings.
- Configured implementation exit-gate generation persisted at reviewed HEAD
  `e3e0f024` with launch attempt
  `implement-exit-20260723T124207Z-cbd8ecb7-7e28-4201-b6b9-7aca32900a8c`.
- Exit-gate run `48a1a4df-a811-417c-be38-cc975466b1ec` was accepted by
  the gate runtime.
- Exit-gate result envelope persisted with status `ok`, a correlated gate
  artifact, and an eligible receive handoff.
- Gate-review receive intent persisted for run
  `48a1a4df-a811-417c-be38-cc975466b1ec` and event
  `final|code|final-review-2026-07-23T124954Z.md`.
- Configured exit-gate review received with no findings and a clear deferred
  ledger.
- Receive correlation reconciled to bookkeeping commit `835ad76c`; exit-gate
  disposition persisted as `allowed/passed`.
- Freshness delta from reviewed HEAD `e3e0f024` classified closeout-only:
  review ledger, lifecycle notes, structural log, gate receipt, and gate state.
- Project documentation sync added public-skill discoverability and repaired
  the two previously known fragment links; PJM current-state and curated
  backlog context were refreshed.
- Because those documentation commits followed the passing configured gate,
  its freshness state was marked stale before approval.
- Post-documentation final verification passed: `pnpm test`, `pnpm lint`,
  `pnpm type-check`, and `pnpm build`.
- Post-documentation final lifecycle review passed with no findings and a clear
  deferred ledger.
- Prior configured gate receipt and archived artifact remain preserved as
  history; refreshed generation
  `implement-exit-refresh-20260723T162824Z-b9d97a14-342d-49f2-afd3-a9de4c64b511`
  was persisted at reviewed HEAD `3e4cc2b3`.
- Refreshed exit-gate run `cf1b9992-38b0-4d3a-be67-10435ba5a406` was accepted
  by the gate runtime.
- Refreshed exit-gate result envelope persisted with status `ok`, a correlated
  gate artifact, and an eligible receive handoff.
- Refreshed gate-review receive intent persisted for run
  `cf1b9992-38b0-4d3a-be67-10435ba5a406` and event
  `final|code|final-review-2026-07-23T163522Z.md`.
- Refreshed configured exit-gate review received with no findings and a clear
  deferred ledger.
- Refreshed receive correlation reconciled to bookkeeping commit `a0815ea7`;
  exit-gate disposition persisted as `allowed/passed`.
- Freshness delta from refreshed reviewed HEAD `3e4cc2b3` classified
  closeout-only: review ledger, lifecycle notes, structural log, gate receipt,
  and gate state.
- Rebasing PR #172 onto `origin/main` at `18c1a573` dropped the former
  `0.2.13` package bump because that release was already upstream. Registry
  checks confirmed `0.2.14` was unpublished for all five public packages, so
  the branch advanced the lockstep set and bundled metadata to `0.2.14`.
- Bugbot's Medium homogeneous-wave finding was accepted and fixed in
  `e59be3d9`: shared recon-wave records now require equal reasoning mode,
  service tier, and all guidance-freshness fields, including identical
  optional-field presence.
- Targeted contract coverage passed 115/115. Full tests, lint, type-check,
  format, build, docs build, release validation, and provider-sync dry-run also
  passed.
- Bugbot's rerun found one Medium load-order mismatch in `oat-repo-improve` and
  one Low request/record naming ambiguity. Both were accepted and fixed in
  `4d59b8f7`: consumers now load the dispatch engine before selection guidance,
  and the schema maps normalized request intent to resolved provider-native
  selector evidence.
- Strengthening the load-order assertion exposed the same latent ordering gap
  in Cursor Cloud, which was corrected under the same contract rather than
  special-cased.
- Targeted coverage again passed 115/115, followed by another clean full
  test/lint/type-check/format/build/docs/release/sync verification run.
- The prior final review and configured exit-gate pass are preserved as
  history but marked stale because the PR feedback fix changed implementation
  after their reviewed HEAD.
- Next action: refresh final lifecycle review and the configured exit gate
  before final implementation approval.

---

## Deviations from Plan / Design

| Task / Review    | Source Artifact                                     | Planned / Documented                | Actual / Accepted                        | Reason                                                                   | Source of Truth                              | Follow-up                                 |
| ---------------- | --------------------------------------------------- | ----------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------- | ----------------------------------------- |
| quick-start gate | `plan.md`                                           | Clean re-review after applied fixes | Proceed under explicit operator override | Operator waived another timed gate review                                | `plan.md`                                    | Independently verify through code reviews |
| p01 review fixes | `reviews/archived/p01-review-2026-07-23T045715Z.md` | Original p01 task file lists        | Added two bounded contract-only files    | Full-suite drift was directly caused by p01                              | passing code and tests                       | Reflected in Phase 1 summary              |
| p03 fan-in       | `plan.md`                                           | Merge passing phase with `--no-ff`  | Cherry-picked two reviewed task commits  | Duplicate bootstrap sync commits conflicted in `.oat/sync/manifest.json` | reviewed task commits and integration checks | Reflected in Phase 3 summary              |
| PR rebase        | PR #172                                             | Release `0.2.13`                    | Release `0.2.14`                         | `0.2.13` was published upstream before rebase                            | npm registry and `origin/main`               | Lockstep validation passed                |

## Test Results

| Phase | Tests Run                                | Passed                                           | Failed | Coverage                                   |
| ----- | ---------------------------------------- | ------------------------------------------------ | ------ | ------------------------------------------ |
| 1     | focused skills + full suite + type-check | 139/139 focused; 3539/3539 full; type-check pass | 0      | Phase passed after fix iteration 1         |
| 2     | focused skill contracts                  | 111/111                                          | 0      | Phase passed after fix iteration 1         |
| 3     | focused utility lifecycle + docs build   | 95/95; docs build pass                           | 0      | Phase passed; 2 pre-existing link failures |
| 4     | focused + full repository/release gates  | 249/249 focused; all repository gates passed     | 0      | Phase and release review passed            |
| 5     | focused contracts + full tests           | 136/136 focused; full tests + 129/129 smoke pass | 0      | Final review fix and inventory fix pass    |
| PR    | focused + full repository/release gates  | 115/115 focused; all repository gates passed     | 0      | All Bugbot PR feedback fixes passed        |

## Final Summary (for PR/docs)

- Shipped a portable `subagent-orchestration` guidance skill that owns durable
  task classes and model-selection principles while `oat-dispatch-subagents`
  remains responsible for provider-specific launch mechanics.
- Migrated active lifecycle and repository-improvement consumers to load the
  dispatch engine, principles, exactly one active-provider selection reference,
  and matching mechanics in order.
- Added directional utility installation: selecting
  `oat-dispatch-subagents` includes `subagent-orchestration`, while the guidance
  skill remains independently installable.
- Added contract tests for guidance/mechanics ownership, task-class semantics,
  consumer loading, provider recommendations, additive dispatch evidence, and
  homogeneous recon-wave axis parity, including explicit request-intent to
  selector-evidence mapping.
- Updated active docs and generated provider assets, then advanced all five
  public packages and bundled metadata to unpublished version `0.2.14` after
  rebasing onto the published `0.2.13` release.
- Key surfaces: `.agents/skills/subagent-orchestration`,
  `.agents/skills/oat-dispatch-subagents`, active consumer skills,
  `packages/cli/src/validation/skills.test.ts`, CLI utility manifests/tests,
  project docs, package manifests, and provider-sync metadata.
- Verification: focused suites through 249/249, full workspace tests and smoke
  tests, lint, type-check, format, package build, docs build, release
  validation, registry checks, and final provider-sync dry-run all passed.
- Review fixes restored autonomy inventory/version contracts in Phase 1,
  strengthened semantic contract coverage in Phase 2, and added explicit
  legacy Record coverage in Phase 5.
- Design deltas: Phase 3 used reviewed-task cherry-picks after duplicate
  bootstrap-sync manifest conflict; the quick-start planning gate proceeded
  under an explicit operator-approved override after all received findings were
  fixed.

## References

- Plan: `plan.md`
- Design: `design.md`
- Discovery: `discovery.md`
- **plan:** ---
  oat_status: complete
  oat_ready_for: oat-project-implement
  oat_blockers: []
  oat_last_updated: 2026-07-23
  oat_phase: plan
  oat_phase_status: complete
  oat_plan_parallel_groups:
  - [p02, p03]
    oat_plan_hill_phases: [p05]
    oat_auto_review_at_hill_checkpoints: true
    oat_plan_source: quick
    oat_import_reference: null
    oat_import_source_path: null
    oat_import_provider: null
    oat_generated: false
    oat_template: false

---

# Implementation Plan: subagent-orchestration

> Execute this plan using `oat-project-implement`.

**Goal:** Split portable model-selection guidance from OAT dispatch mechanics,
preserve dispatch safeguards, migrate every active consumer, and ship the
result through the utility pack and lockstep release process.

**Architecture:** A new user-invocable `subagent-orchestration` skill owns
durable task classes, dated provider mappings, and evidence refresh. Internal
`oat-dispatch-subagents` composes that guidance with provider-specific launch
mechanics and records; active callers load both layers.

**Tech Stack:** Markdown Agent Skills, TypeScript CLI manifests and Vitest
contract tests, OAT provider synchronization, pnpm/Turborepo release tooling.

**Commit Convention:** `{type}({task-id}): {description}`

## Planning Checklist

- [x] Discovery decisions validated
- [x] Lightweight design reviewed and passed
- [x] Existing review rows preserved
- [x] Adjacent phases evaluated for isolated-worktree parallelism
- [x] Parallel group declared for disjoint validation and distribution work

---

## Parallelism

- `p01` is sequential because guidance, mechanics, and active consumers form
  one semantic contract; later work must not validate or distribute a partial
  split.
- `p02` and `p03` run in parallel after `p01`. `p02` owns only
  `packages/cli/src/validation/skills.test.ts`; `p03` owns utility lifecycle
  code/tests and docs. Their writes are disjoint and their verification does
  not require each other's unmerged changes.
- `p04` runs only after both branches merge. Version selection, generated
  provider roles, sync metadata, bundled package metadata, and release gates
  must observe the complete integrated tree.

---

## Phase 1: Establish the canonical split

### Task p01-t01: Add portable model-selection guidance

**Files:**

- Create: `.agents/skills/subagent-orchestration/SKILL.md`
- Create: `.agents/skills/subagent-orchestration/references/model-selection-principles.md`
- Create: `.agents/skills/subagent-orchestration/references/evidence-and-refresh.md`
- Create: `.agents/skills/subagent-orchestration/references/provider-claude.md`
- Create: `.agents/skills/subagent-orchestration/references/provider-codex.md`
- Create: `.agents/skills/subagent-orchestration/references/provider-cursor.md`

**Step 1: Build the canonical guidance layer**

Adapt the imported guidance draft into a self-contained, user-invocable skill
at version `1.0.0`. Preserve the five task classes, independent selection axes,
one-provider loading, freshness metadata, refresh triggers, and
candidate-qualification rules. Apply the approved Opus-first Claude policy:
Opus is the hard-reasoning and consequential default, Fable is exceptional,
and stronger cyber-classifier behavior is evidence rather than an inverted
exception. Encode the root-versus-subagent-volume cost rationale in
`provider-claude.md`: preserve strong, low-volume root orchestration while
capturing routine savings in higher-volume bounded subagents. Require
unresolved ambiguity, exceptional novelty or consequence, or a directly
relevant Fable strength that justifies incremental cost before escalating the
root from Opus; a consequential label alone is insufficient.

**Step 2: Format**

Run:

```bash
pnpm exec oxfmt --write '.agents/skills/subagent-orchestration/**/*.md'
```

**Step 3: Verify**

Run:

```bash
pnpm exec oxfmt --check '.agents/skills/subagent-orchestration/**/*.md'
git diff --check -- .agents/skills/subagent-orchestration
```

Expected: formatting and whitespace checks pass; all six canonical files are
present with no OAT lifecycle or launch-mechanics ownership, and the Claude
reference records both the Opus-first rationale and concrete Fable escalation
triggers.

**Step 4: Commit**

```bash
git add .agents/skills/subagent-orchestration
git commit -m "feat(p01-t01): add subagent orchestration guidance"
```

---

### Task p01-t02: Reduce dispatch references to mechanics

**Files:**

- Modify: `.agents/skills/oat-dispatch-subagents/SKILL.md`
- Modify: `.agents/skills/oat-dispatch-subagents/references/provider-claude.md`
- Modify: `.agents/skills/oat-dispatch-subagents/references/provider-codex.md`
- Modify: `.agents/skills/oat-dispatch-subagents/references/provider-cursor.md`
- Modify: `.agents/skills/oat-dispatch-subagents/references/record-schema.md`

**Step 1: Apply the mechanics-only contract**

Bump the canonical dispatch skill once to `1.2.0`. The current provider
references already contain no named model matrices; do not replace their bodies
wholesale or remove Task-Class Resolution and class-floor safeguards. Rewrite
Required Loading to compose generic principles, one selection reference, and
one matching mechanics reference. Repair stale wording that claims dated model
examples live in the mechanics references so it points to the new guidance
layer instead. Preserve capability, authorization, catalog intersection,
native-first routing, liveness, acceptance, continuation, and
no-post-acceptance-replacement safeguards. Add optional reasoning-mode,
service-tier, and guidance-freshness evidence to the record schema without
invalidating legacy records.

**Step 2: Format**

Run:

```bash
pnpm exec oxfmt --write '.agents/skills/oat-dispatch-subagents/**/*.md'
```

**Step 3: Verify**

Run:

```bash
pnpm exec oxfmt --check '.agents/skills/oat-dispatch-subagents/**/*.md'
git diff --check -- .agents/skills/oat-dispatch-subagents
```

Expected: mechanics files are formatted; selection matrices remain absent;
stale model-example self-references point to generic guidance; Task-Class
Resolution, Cursor pre-start rejection, and no-replacement rules remain
explicit.

**Step 4: Commit**

```bash
git add .agents/skills/oat-dispatch-subagents
git commit -m "refactor(p01-t02): isolate dispatch mechanics"
```

---

### Task p01-t03: Migrate canonical dispatch consumers

**Files:**

- Modify: `.agents/agents/oat-reviewer.md`
- Modify: `.agents/agents/oat-phase-implementer.md`
- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-dispatch-subagents/SKILL.md`
- Modify: `.agents/skills/oat-cursor-cloud-projects/SKILL.md`
- Modify: `.agents/skills/oat-repo-improve/SKILL.md`

**Step 1: Update active instructions**

Replace every selection-purpose use of the old single provider reference with
the generic principles, one provider selection reference, and one matching
mechanics reference. Preserve mechanics-only pointers, including Cursor Cloud
launch/recovery delegation. Advance each changed canonical skill or agent
version once. Do not edit generated `.claude`, `.cursor`, or `.codex` views and
do not rewrite historical autonomy/provenance tables. Ensure
`oat-repo-improve` loads generic guidance before it performs its existing
candidate selection.

**Step 2: Format**

Run:

```bash
pnpm exec oxfmt --write \
  .agents/agents/oat-reviewer.md \
  .agents/agents/oat-phase-implementer.md \
  .agents/skills/oat-project-plan-writing/SKILL.md \
  .agents/skills/oat-project-implement/SKILL.md \
  .agents/skills/oat-project-dispatch-subagents/SKILL.md \
  .agents/skills/oat-cursor-cloud-projects/SKILL.md \
  .agents/skills/oat-repo-improve/SKILL.md
```

**Step 3: Verify**

Run:

```bash
pnpm exec oxfmt --check \
  .agents/agents/oat-reviewer.md \
  .agents/agents/oat-phase-implementer.md \
  .agents/skills/oat-project-plan-writing/SKILL.md \
  .agents/skills/oat-project-implement/SKILL.md \
  .agents/skills/oat-project-dispatch-subagents/SKILL.md \
  .agents/skills/oat-cursor-cloud-projects/SKILL.md \
  .agents/skills/oat-repo-improve/SKILL.md
rg -n 'oat-dispatch-subagents/references' .agents/agents .agents/skills --glob '*.md'
```

Expected: formatting passes; remaining dispatch-reference matches are
mechanics-purpose or historical, and every active selection consumer names the
generic guidance layer.

**Step 4: Commit**

```bash
git add \
  .agents/agents/oat-reviewer.md \
  .agents/agents/oat-phase-implementer.md \
  .agents/skills/oat-project-plan-writing/SKILL.md \
  .agents/skills/oat-project-implement/SKILL.md \
  .agents/skills/oat-project-dispatch-subagents/SKILL.md \
  .agents/skills/oat-cursor-cloud-projects/SKILL.md \
  .agents/skills/oat-repo-improve/SKILL.md
git commit -m "refactor(p01-t03): migrate dispatch consumers"
```

---

### Task p01-t04: Restore the existing skill suite to green

**Files:**

- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Migrate baseline assertions**

Update existing assertions that source model guidance from dispatch provider
paths or require the old single-reference Required Loading contract. Point
baseline selection assertions to the new guidance skill, retain mechanics
assertions on dispatch, and include `oat-repo-improve` in active consumer
coverage. Keep this task limited to restoring existing contracts; a new
dispatch version pin, if useful, belongs to the Phase 2 hardening coverage.

**Step 2: Format**

Run:

```bash
pnpm exec oxfmt --write packages/cli/src/validation/skills.test.ts
```

**Step 3: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
```

Expected: the existing focused skill suite passes before the Phase 1 review
boundary.

**Step 4: Commit**

```bash
git add packages/cli/src/validation/skills.test.ts
git commit -m "test(p01-t04): migrate orchestration skill assertions"
```

---

## Phase 2: Enforce guidance and mechanics contracts

### Task p02-t01: Harden skill boundary validation

**Files:**

- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Add boundary-hardening assertions**

Extend the now-green suite with structural checks for all five task classes,
ordered freshness metadata, the durable Opus-first policy, mechanics-only
provider references, optional additive record evidence, and active consumer
loading. Add negative assertions for unambiguous named-model matrix markers in
mechanics without banning generic selector or floor terminology. Assert that
`oat-repo-improve` loads generic guidance before candidate selection.
Explicitly cover all dispatch-record compatibility scenarios: legacy records
with guidance fields absent, enriched records containing every optional
guidance field, and unknown service tiers being unable to satisfy a higher
task-class floor.

**Step 2: Format**

Run:

```bash
pnpm exec oxfmt --write packages/cli/src/validation/skills.test.ts
```

**Step 3: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
```

Expected: the focused skill contract suite passes.

**Step 4: Commit**

```bash
git add packages/cli/src/validation/skills.test.ts
git commit -m "test(p02-t01): enforce orchestration skill boundaries"
```

---

## Phase 3: Distribute and document the split

### Task p03-t01: Add directional utility dependency

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`
- Modify: `packages/cli/scripts/bundle-inputs.mjs`
- Modify: `packages/cli/src/commands/init/tools/utility/index.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
- Modify: `packages/cli/src/commands/init/tools/utility/index.test.ts`
- Modify: `packages/cli/src/commands/init/tools/utility/install-utility.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/scan-tools.test.ts`
- Modify: `packages/cli/src/commands/tools/update/update-tools.test.ts`
- Modify: `packages/cli/src/commands/tools/remove/remove-tools.test.ts`
- Modify: `packages/cli/src/commands/remove/skills/remove-skills.test.ts`

**Step 1: Add failing lifecycle coverage**

Add `subagent-orchestration` to utility and bundle expectations. Add a custom
selection test proving that selecting `oat-dispatch-subagents` automatically
includes guidance while selecting guidance alone remains valid. Keep update,
scan, and removal pack membership explicit without inventing a reverse removal
dependency.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/init/tools/shared/bundle-consistency.test.ts \
  src/commands/init/tools/utility/index.test.ts \
  src/commands/init/tools/utility/install-utility.test.ts \
  src/commands/tools/shared/scan-tools.test.ts \
  src/commands/tools/update/update-tools.test.ts \
  src/commands/tools/remove/remove-tools.test.ts \
  src/commands/remove/skills/remove-skills.test.ts
```

Expected: the new membership and directional-dependency assertions fail before
implementation.

**Step 2: Implement distribution behavior**

Add the new skill beside dispatch in the canonical utility and bundle
inventories. Expand custom utility selections only in the dispatch-to-guidance
direction. Preserve existing default/full-pack behavior and standalone
guidance installation.

**Step 3: Format**

Run:

```bash
pnpm exec oxfmt --write \
  packages/cli/src/commands/init/tools/shared/skill-manifest.ts \
  packages/cli/scripts/bundle-inputs.mjs \
  packages/cli/src/commands/init/tools/utility/index.ts \
  packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts \
  packages/cli/src/commands/init/tools/utility/index.test.ts \
  packages/cli/src/commands/init/tools/utility/install-utility.test.ts \
  packages/cli/src/commands/tools/shared/scan-tools.test.ts \
  packages/cli/src/commands/tools/update/update-tools.test.ts \
  packages/cli/src/commands/tools/remove/remove-tools.test.ts \
  packages/cli/src/commands/remove/skills/remove-skills.test.ts
```

**Step 4: Verify**

Re-run the seven-file Vitest command from Step 1.

Expected: utility selection, pack lifecycle, and bundle consistency tests pass.

**Step 5: Commit**

```bash
git add \
  packages/cli/src/commands/init/tools/shared/skill-manifest.ts \
  packages/cli/scripts/bundle-inputs.mjs \
  packages/cli/src/commands/init/tools/utility/index.ts \
  packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts \
  packages/cli/src/commands/init/tools/utility/index.test.ts \
  packages/cli/src/commands/init/tools/utility/install-utility.test.ts \
  packages/cli/src/commands/tools/shared/scan-tools.test.ts \
  packages/cli/src/commands/tools/update/update-tools.test.ts \
  packages/cli/src/commands/tools/remove/remove-tools.test.ts \
  packages/cli/src/commands/remove/skills/remove-skills.test.ts
git commit -m "feat(p03-t01): distribute orchestration guidance"
```

---

### Task p03-t02: Update active orchestration documentation

**Files:**

- Modify: `apps/oat-docs/docs/workflows/skills/repo-improve.md`
- Modify: `apps/oat-docs/docs/workflows/projects/reviews.md`
- Modify: `apps/oat-docs/docs/workflows/projects/orchestration-model.md`
- Modify: `apps/oat-docs/docs/contributing/skills.md`
- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md`
- Regenerate if changed: `apps/oat-docs/index.md`

**Step 1: Document the ownership split**

Teach that generic guidance owns task classes, model selection, provider
matrices, and refresh evidence while OAT dispatch owns capability, catalog,
route, launch, recovery, and records. Document two-reference loading and the
directional utility dependency. Preserve provider-neutral and root-owned
judgment language.

**Step 2: Regenerate and format**

Run:

```bash
pnpm -w run cli:source -- docs generate-index \
  --docs-dir apps/oat-docs/docs \
  --output apps/oat-docs/index.md
pnpm exec oxfmt --write \
  apps/oat-docs/docs/workflows/skills/repo-improve.md \
  apps/oat-docs/docs/workflows/projects/reviews.md \
  apps/oat-docs/docs/workflows/projects/orchestration-model.md \
  apps/oat-docs/docs/contributing/skills.md \
  apps/oat-docs/docs/cli-utilities/tool-packs.md
```

`apps/oat-docs/index.md` is generator-owned; `docs generate-index` is its only
writer.

**Step 3: Verify**

Run:

```bash
pnpm docs:check-links
pnpm build:docs
```

Expected: generated index, links, and docs production build pass.

**Step 4: Commit**

```bash
git add \
  apps/oat-docs/docs/workflows/skills/repo-improve.md \
  apps/oat-docs/docs/workflows/projects/reviews.md \
  apps/oat-docs/docs/workflows/projects/orchestration-model.md \
  apps/oat-docs/docs/contributing/skills.md \
  apps/oat-docs/docs/cli-utilities/tool-packs.md \
  apps/oat-docs/index.md
git commit -m "docs(p03-t02): explain orchestration skill split"
```

---

## Phase 4: Synchronize and release the integrated result

### Task p04-t01: Advance lockstep package versions

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Regenerate: `packages/cli/assets/public-package-versions.json`

**Step 1: Select the release version**

Refresh release evidence against the current integrated base and npm. Choose
the next common unpublished version for all five public packages; do not assume
the currently projected patch version remains available.

Set `RELEASE_VERSION` to the candidate and verify it is absent from every
registry history:

```bash
export RELEASE_VERSION='<selected-version>'
for package in \
  @open-agent-toolkit/cli \
  @open-agent-toolkit/control-plane \
  @open-agent-toolkit/docs-config \
  @open-agent-toolkit/docs-theme \
  @open-agent-toolkit/docs-transforms; do
  npm view "$package" versions --json > /tmp/oat-package-versions.json || exit 1
  node -e '
    const fs = require("node:fs");
    const versions = [].concat(
      JSON.parse(fs.readFileSync(process.argv[1], "utf8")),
    );
    if (versions.includes(process.argv[2])) {
      console.error(`${process.argv[3]}@${process.argv[2]} is already published`);
      process.exit(1);
    }
  ' /tmp/oat-package-versions.json "$RELEASE_VERSION" "$package" || exit 1
done
```

Expected: all five registry queries succeed and the selected version is absent
from every returned list. A query or parse failure blocks the task and is never
treated as evidence that a version is unpublished.

**Step 2: Apply and generate**

Update all five package manifests in lockstep, then run:

```bash
bash packages/cli/scripts/bundle-assets.sh
pnpm exec oxfmt --write \
  packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json \
  packages/cli/assets/public-package-versions.json
```

**Step 3: Verify**

Run:

```bash
pnpm release:check-versions
```

Expected: lockstep and bundled public-version metadata checks pass.

**Step 4: Commit**

```bash
git add \
  packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json \
  packages/cli/assets/public-package-versions.json
git commit -m "chore(p04-t01): bump public package versions"
```

---

### Task p04-t02: Regenerate providers and pass release gates

**Files:**

- Create: `.claude/skills/subagent-orchestration`
- Regenerate: `.oat/sync/manifest.json`
- Regenerate: `.codex/agents/oat-reviewer*.toml`
- Regenerate: `.codex/agents/oat-phase-implementer*.toml`
- Regenerate: `.cursor/agents/oat-reviewer*.md`
- Regenerate: `.cursor/agents/oat-phase-implementer*.md`
- Regenerate if changed: `packages/cli/assets/public-package-versions.json`

**Step 1: Preview and apply provider synchronization**

Run:

```bash
pnpm run cli:source -- --json sync --scope project --dry-run
pnpm run cli:source -- sync --scope project
pnpm run cli:source -- --json sync --scope project --dry-run
```

Expected: the final dry-run reports no pending canonical sync changes. Cursor
and Codex native-read canonical `.agents/skills`, so neither produces a
mirrored skill view; Claude receives the generated skill link, consistent with
the reviewed design. The tracked `.cursor/skills` convenience view is outside
provider-sync scope and intentionally unchanged by this task.

**Step 2: Run focused integration checks**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts \
  src/commands/init/tools/shared/bundle-consistency.test.ts \
  src/commands/init/tools/utility/index.test.ts \
  src/commands/init/tools/utility/install-utility.test.ts \
  src/commands/tools/shared/scan-tools.test.ts \
  src/commands/tools/update/update-tools.test.ts \
  src/commands/tools/remove/remove-tools.test.ts \
  src/commands/remove/skills/remove-skills.test.ts \
  src/providers/cursor/codec/sync-extension.test.ts \
  src/providers/codex/codec/sync-extension.test.ts
```

Expected: all focused contract, lifecycle, and provider-generation tests pass.

**Step 3: Run repository and release gates**

Run:

```bash
pnpm test
pnpm lint
pnpm type-check
pnpm format
pnpm build
pnpm build:docs
pnpm release:validate
pnpm run cli:source -- --json sync --scope project --dry-run
git status --short
```

Expected: all workspace, production build, documentation, release, and sync
checks pass; only intended generated outputs remain uncommitted.

**Step 4: Commit generated outputs**

```bash
git add \
  .claude/skills/subagent-orchestration \
  .oat/sync/manifest.json \
  .codex/agents/oat-reviewer*.toml \
  .codex/agents/oat-phase-implementer*.toml \
  .cursor/agents/oat-reviewer*.md \
  .cursor/agents/oat-phase-implementer*.md \
  packages/cli/assets/public-package-versions.json
git diff --cached --quiet || \
  git commit -m "chore(p04-t02): sync providers and release assets"
```

Expected: generated provider and bundle metadata are committed; ignored
`packages/cli/assets/skills/**` files are not staged.

---

## Phase 5: Final review fixes

### Task p05-t01: (review) Add explicit legacy dispatch-record fixture

**Files:**

- Modify: `.agents/skills/oat-dispatch-subagents/SKILL.md`
- Modify:
  `.agents/skills/oat-dispatch-subagents/references/record-schema.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Regenerate if changed: `.oat/sync/manifest.json`

**Step 1: Understand the issue**

Review finding M1: the compatibility test calls the canonical `## Request`
example a legacy fixture while asserting the absence of six optional
Record-only evidence fields. This cannot detect a future contract change that
stops representing a legacy dispatch Record without those fields.

Location: `packages/cli/src/validation/skills.test.ts:4157`

**Step 2: Implement the fix**

Add a canonical, explicitly labeled legacy dispatch-record example that retains
the baseline Record fields while omitting `reasoning_mode_selector`,
`service_tier_selector`, `guidance_reference`, `guidance_version`,
`guidance_verified_at`, and `guidance_status`. Update the test to parse this
fixture beside the enriched Record example and assert baseline presence plus
optional-field absence/presence directly. Bump the changed
`oat-dispatch-subagents` skill version once for this PR.

**Step 3: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts \
  src/commands/init/tools/shared/bundle-consistency.test.ts
pnpm exec oxfmt --check \
  .agents/skills/oat-dispatch-subagents/SKILL.md \
  .agents/skills/oat-dispatch-subagents/references/record-schema.md \
  packages/cli/src/validation/skills.test.ts
pnpm release:validate
pnpm run cli:source -- --json sync --scope project --dry-run
```

Expected: the canonical legacy Record is exercised, all focused and release
checks pass, and provider synchronization has no pending changes.

**Step 4: Commit**

```bash
git add \
  .agents/skills/oat-dispatch-subagents/SKILL.md \
  .agents/skills/oat-dispatch-subagents/references/record-schema.md \
  packages/cli/src/validation/skills.test.ts \
  .oat/sync/manifest.json
git commit -m "fix(p05-t01): cover legacy dispatch records"
```

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                      |
| ------ | -------- | --------------- | ---------- | ------------------------------------------------------------- |
| p01    | code     | fixes_completed | 2026-07-23 | reviews/archived/p01-review-2026-07-23T045715Z.md             |
| p02    | code     | fixes_completed | 2026-07-23 | reviews/archived/p02-review-2026-07-23T113654Z.md             |
| final  | code     | fixes_completed | 2026-07-23 | reviews/archived/final-review-2026-07-23T121234Z.md           |
| spec   | artifact | pending         | -          | -                                                             |
| design | artifact | fixes_completed | 2026-07-22 | reviews/archived/artifact-design-review-2026-07-22T225632Z.md |
| design | artifact | passed          | 2026-07-22 | reviews/archived/artifact-design-review-2026-07-22T231919Z.md |
| p03    | code     | passed          | 2026-07-23 | reviews/archived/p03-review-2026-07-23T112224Z.md             |
| p04    | code     | passed          | 2026-07-23 | reviews/archived/p04-review-2026-07-23T120818Z.md             |
| plan   | artifact | fixes_completed | 2026-07-23 | reviews/archived/artifact-plan-review-2026-07-23T024325Z.md   |
| p01    | code     | passed          | 2026-07-23 | reviews/archived/p01-review-2026-07-23T050810Z.md             |
| p02    | code     | passed          | 2026-07-23 | reviews/archived/p02-review-2026-07-23T115055Z.md             |
| final  | code     | passed          | 2026-07-23 | reviews/archived/final-review-2026-07-23T123440Z.md           |
| final  | code     | passed          | 2026-07-23 | reviews/archived/final-review-2026-07-23T124954Z.md           |
| final  | code     | passed          | 2026-07-23 | reviews/archived/final-review-2026-07-23T162104Z.md           |
| final  | code     | passed          | 2026-07-23 | reviews/archived/final-review-2026-07-23T163522Z.md           |

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists but findings have not been dispositioned.
- `fixes_added`: fix tasks were added to the plan.
- `fixes_completed`: fixes were applied and await re-review.
- `passed`: re-review completed without unresolved blocking findings.

**Configured gate disposition:** Operator-approved override on 2026-07-23. The
first Fable gate attempt timed out; the second produced the plan review above.
All received findings were dispositioned and the plan was corrected, but the
operator explicitly waived the clean re-review after the configured
`onFailure: block` attempts were exhausted. The plan review row therefore
remains `fixes_completed`, not `passed`. This is a project-level lifecycle
exception, not evidence that the configured gate passed.

---

## Implementation Complete

**Summary:**

- Phase 1: 4 tasks - canonical guidance, mechanics, consumers, and baseline tests
- Phase 2: 1 task - skill boundary contract validation
- Phase 3: 2 tasks - utility distribution and active documentation
- Phase 4: 2 tasks - lockstep versioning, provider sync, and release gates
- Phase 5: 1 task - final review compatibility fix

**Total: 10 tasks**

Ready for code review and merge after all tasks and reviews pass.

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Imported handoff: `references/prior-project/handoff.md`
- Imported guidance draft:
  `references/prior-project/skills/subagent-orchestration/`
- Imported dispatch draft:
  `references/prior-project/skills/oat-subagent-dispatch/`
- **summary:** ---
  oat_status: complete
  oat_ready_for: null
  oat_blockers: []
  oat_last_updated: 2026-07-23
  oat_generated: true
  oat_summary_last_task: p05-t01
  oat_summary_revision_count: 0
  oat_summary_includes_revisions: []

---

# Summary: subagent-orchestration

## Overview

This project separated portable model-selection guidance from OAT's subagent
launch machinery. It preserves one canonical source for task classification and
provider routing while keeping OAT-specific authorization, launch, recovery,
and evidence contracts independently maintainable.

## What Was Implemented

- Added the user-invocable, self-contained `subagent-orchestration` skill with
  five task classes, durable selection principles, provider-specific dated
  guidance, and explicit evidence-refresh rules.
- Reduced `oat-dispatch-subagents` to mechanics ownership while preserving
  capability probing, live-catalog intersection, native-first routing,
  acceptance terminality, recovery, and fail-closed behavior.
- Migrated active reviewer, implementer, planning, lifecycle-adapter, Cursor
  Cloud, and repository-improvement consumers to load generic principles, one
  provider selection reference, and matching mechanics in order.
- Added directional utility installation: selecting dispatch automatically
  includes guidance, while the guidance skill remains independently
  installable. Provider sync and bundled distribution carry the same contract.
- Hardened structural coverage for ownership boundaries, task-class semantics,
  consumer composition, Claude routing, provider freshness, service tiers, and
  legacy versus enriched dispatch records. PR feedback additionally pinned
  homogeneous-wave axis equality, engine-first consumer loading, and the
  mapping from normalized request intent to resolved selector evidence.
- Updated user and maintainer documentation, then advanced the five public
  packages and release metadata to `0.2.14` after rebasing onto the release of
  `0.2.13`.

## Key Decisions

- **Guidance and mechanics ownership split.** Portable task classification,
  model-selection principles, dated provider mappings, and refresh evidence
  belong to `subagent-orchestration`; OAT dispatch retains authorization,
  launch, liveness, recovery, and record mechanics. This avoids duplicated,
  drifting model policy without weakening launch safeguards.
- **Directional utility dependency.** Installing `oat-dispatch-subagents`
  includes `subagent-orchestration`, but guidance may be installed alone.
  Dispatch therefore fails closed when required guidance is unavailable while
  non-OAT users can consume the portable layer independently.
- **Opus-first Claude routing.** Opus remains the hard-reasoning and
  consequential default; Fable is an exceptional escalation for unresolved
  ambiguity, novelty, consequence, or a directly relevant strength. Cost
  savings belong primarily in the higher-volume bounded-subagent layer rather
  than the low-volume root orchestrator.
- **Additive dispatch evidence compatibility.** New guidance, reasoning,
  service-tier, and freshness evidence remains optional so legacy records stay
  valid. Canonical legacy and enriched fixtures make that compatibility
  executable rather than implicit.

## Design Deltas

- The quick-start planning gate proceeded under an explicit operator override
  after its received findings were fixed. Independent phase, final lifecycle,
  and cross-family exit-gate reviews subsequently passed.
- Phase 3's normal merge encountered a duplicate bootstrap-sync manifest
  conflict. The two reviewed task commits were cherry-picked and the integrated
  contract and docs checks passed.

## Notable Challenges

- Phase 1 exposed directly caused autonomy-inventory and reviewer-version
  contract drift; a bounded fix restored the full suite.
- The first Phase 3 dispatch carried stale boundaries and stopped without
  edits. An operator-authorized fresh attempt used the canonical plan and
  completed successfully.
- Final verification found that the new legacy-record fixture added one prompt
  site to the autonomy inventory. Mapping it as non-gating schema evidence
  restored all repository tests.

## Tradeoffs Made

- The existing `oat-dispatch-subagents` name was retained to keep the ownership
  split reviewable; a generic dispatch-engine rename remains separate work.
- Volatile provider matrices stay in canonical skill references instead of
  being duplicated in global instructions or the docs site. Live catalogs and
  current user or repository instructions always take precedence.

## Integration Notes

- Utility installers, update/remove flows, provider synchronization, and active
  OAT consumers all rely on the two-layer contract.
- Cursor and Codex read canonical skills directly; Claude receives the
  generated canonical skill link. Generated agent roles consume the same
  loading order.
- Final verification passed workspace tests, lint, type-check, package and docs
  builds, release validation, registry checks, local docs-link crawling, and
  provider-sync dry runs. Final lifecycle and Fable exit-gate reviews reported
  no findings.

## Follow-up Items

- Evaluate a generic dispatch-skill rename as a separate compatibility
  migration if naming consistency becomes worth the consumer churn.
- Consider user-scope installation of the portable guidance skill after the
  project-level distribution has operating evidence.

## Workflow Observations

### 2026-07-23 · structural · oat gate review · plan

target=cursor-fable-5-xhigh threshold=important exit=124 status=review_failed

### 2026-07-23 · structural · oat gate review · plan

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:1,medium:1,minor:3 exit=1 status=blocked artifact=.oat/projects/shared/subagent-orchestration/reviews/artifact-plan-review-2026-07-23T024325Z.md

### 2026-07-23 · structural · oat-project-implement · p01-implementation-dispatch

Accepted request implement-p01-20260723T0437Z-b0cc87dd on target oat-phase-implementer-gpt-5-6-sol-high; tracking anchor .oat/projects/shared/subagent-orchestration/implementation.md#orchestration-runs-start.

### 2026-07-23 · structural · oat-project-implement · p01-review-dispatch

Accepted request review-p01-20260723T0454Z-1af57239 on target oat-reviewer-gpt-5-6-sol-high for range b0cc87dd..1af57239; tracking anchor .oat/projects/shared/subagent-orchestration/implementation.md#orchestration-runs-start.

### 2026-07-23 · structural · oat-project-implement · p01-fix1-dispatch

Resumed request implement-p01-20260723T0437Z-b0cc87dd as fix-p01-r1-20260723T0500Z-5b7cae1e on the original target for findings in reviews/p01-review-2026-07-23T045715Z.md; tracking anchor implementation.md#orchestration-runs-start.

### 2026-07-23 · structural · oat-project-implement · p01-rereview-dispatch

Accepted request rereview-p01-20260723T0506Z-0dda1cf3 on target oat-reviewer-gpt-5-6-sol-high for fix range 5b7cae1e..0dda1cf3; tracking anchor implementation.md#orchestration-runs-start.

### 2026-07-23 · structural · oat-project-implement · p01-outcome

Phase p01 passed root-owned re-review after 1 fix iteration; evidence: reviews/p01-review-2026-07-23T050810Z.md and implementation.md#run-1.

### 2026-07-23 · structural · oat-project-implement · implement-p02-20260723T0516Z-1668d004

Accepted p02 phase implementer dispatch in worktree .worktrees/subagent-orchestration-p02. Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · implement-p03-20260723T0516Z-199bc797

Accepted p03 phase implementer dispatch in worktree .worktrees/subagent-orchestration-p03. Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · p03-outcome-implement-p03-20260723T0516Z-199bc797

Phase p03 outcome: block; fix-loop count 0. Root dispatch carried stale boundaries that conflicted with canonical plan.md; accepted implementer made no changes and left .worktrees/subagent-orchestration-p03 clean at 199bc797. Recovery requires a new explicitly operator-authorized action.

### 2026-07-23 · structural · oat-project-implement · implement-p03-recovery1-20260723T1112Z-199bc797

Accepted operator-authorized p03 recovery in unchanged worktree .worktrees/subagent-orchestration-p03, linked to terminal request implement-p03-20260723T0516Z-199bc797. Dispatch: scope=p03-recovery1 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · review-p03-20260723T1121Z-f15b713c

Accepted fresh root-owned p03 review for recovered range 199bc797..f15b713c. Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · p03-outcome-review-p03-20260723T1121Z-f15b713c

Phase p03 outcome: pass after operator-authorized recovery; fix-loop count 0. Task commits bc3c81d6 and f15b713c; review evidence reviews/p03-review-2026-07-23T112224Z.md. The two docs link failures were independently confirmed pre-existing and out of scope.

### 2026-07-23 · structural · oat-project-implement · review-p02-20260723T1135Z-22ae2325

Accepted fresh root-owned p02 review for range 1668d004..22ae2325. Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · p02-fix1

Accepted p02 fix iteration 1 by resuming original request implement-p02-20260723T0516Z-1668d004 against review reviews/p02-review-2026-07-23T113654Z.md. Dispatch: scope=p02-fix1 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · rereview-p02-20260723T1148Z-0692243e

Accepted fresh root-owned p02 re-review for fix iteration 1, range 22ae2325..0692243e. Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · p02-outcome-rereview-p02-20260723T1148Z-0692243e

Phase p02 outcome: pass after 1 fix iteration; task commit 22ae2325 and fix commit 0692243e; review evidence reviews/p02-review-2026-07-23T115055Z.md. One non-blocking Medium legacy-record fixture gap remains recorded.

### 2026-07-23 · structural · oat-project-implement · implement-p04-20260723T1157Z-96cb638f

Accepted p04 phase implementer in root worktree at base 96cb638f. Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · review-p04-20260723T1203Z-7d3aaab7

Accepted fresh root-owned p04 review for range 96cb638f..7d3aaab7. Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · p04-outcome-review-p04-20260723T1203Z-7d3aaab7

Phase p04 outcome: pass with 0 Critical, Important, Medium, or Minor findings; task commits 8856fa4e and 7d3aaab7; review evidence reviews/p04-review-2026-07-23T120818Z.md.

### 2026-07-23 · structural · oat-project-implement · review-final-20260723T121234Z-85591011

Accepted auto final lifecycle review for range 244e329e..85591011. Dispatch: scope=final action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · implement-p05-20260723T1222Z-e1662494

Accepted p05 final-review-fix implementer at base e1662494. Dispatch: scope=p05 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · fix-p05-20260723T1230Z-e92a50bd

Accepted p05 fix continuation for final-verification autonomy inventory drift; original request implement-p05-20260723T1222Z-e1662494. Dispatch: scope=p05-fix1 action=fix role=fix producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat-project-implement · rereview-final-20260723T123440Z-fca6f9ce

Accepted auto final lifecycle re-review for p05 fix commits e92a50bd and ab60498b. Dispatch: scope=final action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat gate review · final

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/subagent-orchestration/reviews/final-review-2026-07-23T124954Z.md

### 2026-07-23 · structural · oat-project-implement · rereview-final-docs-20260723T1612Z-47fedc68

Accepted fresh final lifecycle re-review after approved docs and repo-reference synchronization. Dispatch: scope=final action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high

### 2026-07-23 · structural · oat gate review · final

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/subagent-orchestration/reviews/final-review-2026-07-23T163522Z.md

## Unresolved claims

- None.
