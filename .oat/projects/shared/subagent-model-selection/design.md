---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-07
oat_generated: false
oat_template: false
---

# Design: subagent-model-selection

## Overview

The dispatch-profile feature adds an optional, plan-authored expression of per-phase model and reasoning-effort targets to any `plan.md` that flows through `oat-project-implement` — whether produced by the spec-driven workflow, quick mode, or `oat-project-import-plan`. The expression is plan-format-only and entirely opt-in: phases default to `auto` (the existing behavior) and only need a row when the user wants to pin a specific tier. Imported plans pick it up for free; if the imported plan has no dispatch-profile table, every phase resolves to `auto` and the run behaves exactly like today. The feature is implemented entirely in prompt/skill/template guidance — no new CLI helper, no executable code beyond what already runs in `oat-project-implement`.

The semantic model is **invocation-cap with explicit-approval escalation**. The orchestrator's current invocation tier (the model/effort the user is running OAT at) is the implicit ceiling for the run. Phase target tiers below cap dispatch as authored. Phase target tiers above cap are surfaced in a preflight scan when `oat-project-implement` starts; the user explicitly approves, downgrades, or aborts before any above-cap dispatch occurs. Approvals are run-local and tier-bounded — they cover implementation, review, and review-fix work for that phase at the approved tier, and never mutate `plan.md`.

Reviews adapt Superpowers' "use the most capable model available" rule with "available" reinterpreted as "within the user-reviewed envelope." Reviews, re-reviews, and review-fix dispatches for a phase run at the highest tier currently in scope for that phase: the invocation cap by default, or the approved escalation tier for any phase the user has approved. This means a phase that ran on `haiku` still gets a `sonnet` review on a `sonnet` invocation — review tier tracks the cap, not the implementation tier.

## Architecture

### Approach

The dispatch profile is **read-only data** consumed at three points in the existing OAT lifecycle. There is no new component; the feature lives as a column in `plan.md`, a resolver behavior in `oat-project-implement`, and a dispatch-time rule in `oat-phase-implementer` and `oat-reviewer`. Approvals are run-local state recorded in `implementation.md` if and when persistence is added; the first pass keeps approvals session-local.

### Lifecycle placement

```
       ┌─────────────────────┐
       │  oat-project-plan   │  authoring guidance: how to set
       │ (or import-plan,    │  per-phase tiers + rationale
       │  spec-driven)       │
       └──────────┬──────────┘
                  │ writes
                  ▼
            ┌──────────┐
            │ plan.md  │  contains optional Dispatch Profile table
            └────┬─────┘
                 │ read by
                 ▼
       ┌──────────────────────┐    runtime: read invocation tier,
       │ oat-project-implement│    scan profile vs cap, run preflight
       │   (orchestrator)     │    gate, hold session-local approvals
       └──────┬───────────────┘
              │ dispatches with resolved tier
   ┌──────────┴──────────┐
   ▼                     ▼
┌──────────────────┐  ┌────────────────┐
│ oat-phase-       │  │ oat-reviewer   │  receives resolved tier
│ implementer      │  │ (per-phase)    │  per dispatch; never reads
│ (per phase)      │  │                │  plan.md directly
└──────────────────┘  └────────────────┘
```

### Data flow at runtime

1. **Plan authored** — user (or planner) writes `plan.md`. Optionally adds a `## Dispatch Profile` table with rows for any phase where they want a non-`auto` tier. Imported plans typically have no table; this is fine.
2. **Implement starts** — `oat-project-implement` reads the orchestrator's current invocation tier (provider + model/effort), parses the dispatch-profile table if present, and computes a resolved tier per phase: phase value if set, else `auto`.
3. **Preflight scan** — for each phase whose resolved tier exceeds the invocation cap, surface in a batched gate. User approves / downgrades / aborts. Approvals are held in session memory for the duration of this `oat-project-implement` run.
4. **Per-phase dispatch** — for each phase in turn, `oat-project-implement` resolves the **dispatch tier** (resolved-from-plan or downgraded-by-approval-decision) and the **review tier** (highest tier in scope for the phase: cap or approved tier), passes both to the implementer/reviewer dispatch. The subagents themselves never read `plan.md` for tier — they receive the resolved values.
5. **Mid-run escalation** — triggered either by a subagent reporting BLOCKED with a reasoning request, or by the orchestrator detecting N consecutive review-cycle failures on a phase. In both cases the orchestrator (a) escalates silently within the resolved phase ceiling if there's headroom, or (b) fires a fresh preflight-style gate to ask the user to approve a higher tier. See 3.3a.
6. **Resume** — on `oat-project-implement` resume, session-local approvals from the prior session are not assumed valid; the preflight scan re-fires for any pending phase still flagged. Persistence across resume is out of scope for the first pass.

### Key architectural decisions

- **Profile is plan data, not skill data.** The table lives in `plan.md` so it travels with the plan (across mode, across resume, across handoff). Skills consume it; they don't own it.
- **Resolver lives in `oat-project-implement`.** Subagents receive resolved tiers, not raw plan rows. This keeps subagent prompts independent of profile syntax and means the plan format can evolve without touching subagent prompts.
- **Approvals are execution state, session-local in the first pass.** Future persistence (if needed) lives in `implementation.md`, not `plan.md`. The plan stays authored intent.
- **No new component.** Everything is guidance/rule changes to existing skills + a templated table. No CLI helper, no library code.
- **Cross-provider isolation is implicit.** A Claude orchestrator never dispatches a Codex phase, so we never need to reconcile provider-specific values across a single dispatch. The table can include columns for both providers; only the column matching the current orchestrator's provider is consulted.
- **Proposal logic lives in `oat-project-plan-writing`.** All three entry skills (`oat-project-plan`, `oat-project-quick-start`, `oat-project-import-plan`) reference it. No duplication.

### What's deliberately _not_ changing

- Existing subagent prompts (`oat-phase-implementer`, `oat-reviewer`) only get a _resolved-tier_ parameter and a small dispatch-time rule about reviews; their core logic doesn't change.
- The fix-loop retry budget (`oat_orchestration_retry_limit`) remains a count of redispatches and is unchanged. Tier escalation interacts with the budget by being a kind of redispatch — see Component Design.
- The existing `auto`-default behavior is preserved for any plan without the table or any phase without a row.

## Component Design

### 3.1 Dispatch Profile table in `plan.md`

**Purpose:** Authored expression of per-phase model/effort targets and rationale.

**Format:**

```markdown
## Dispatch Profile

| Phase | Claude model | Codex effort | Rationale                                |
| ----- | ------------ | ------------ | ---------------------------------------- |
| p02   | opus         | xhigh        | cross-cutting refactor of resolver       |
| p04   | haiku        | low          | scaffold-only, single-file               |
| p07   | opus         | xhigh        | architectural decision in dispatch logic |
```

**Rules:**

- Columns: `Phase` (required, `pNN` format), `Claude model` (optional cell), `Codex effort` (optional cell), `Rationale` (optional but recommended).
- A blank cell in `Claude model` or `Codex effort` = `auto` for that provider.
- A phase **not in the table** = `auto` for both providers (same as a row with both cells blank).
- Section is optional — plans without it behave exactly like today.
- Section header is omitted entirely when no rows are proposed; users add the section by hand if they later want manual rows.

**Decisions:**

- **Rationale optional, recommended in prompts.** Forcing rationale would penalize legitimate "I just want this on haiku" cases. Skill guidance says "if you can't explain why, the row probably shouldn't exist."
- **No risk/scope column.** Rationale absorbs it.

### 3.2 Resolver in `oat-project-implement`

**Purpose:** Compute the dispatch tier and review tier for a phase given the plan profile, the invocation cap, and the run's approvals.

**Inputs:**

- `phase_id` (e.g., `p02`)
- `invocation` — current orchestrator's `{provider, tier}` (e.g., `{claude, sonnet}` or `{codex, high}`)
- `profile` — parsed Dispatch Profile table from `plan.md`
- `approvals` — session-local map of `phase_id → approved_tier`

**Outputs:** `{ dispatch_tier, review_tier }` — both tier values in the invocation's provider domain (or `auto`).

**Logic:**

1. Look up `phase_target = profile[phase_id][invocation.provider]`. If absent or blank → `auto`.
2. Resolve `phase_ceiling`:
   - If `phase_target == auto` → no concrete ceiling; `dispatch_tier = auto`, `review_tier = invocation.tier`.
   - If `phase_target ≤ invocation.tier` → `dispatch_tier = phase_target`, `review_tier = invocation.tier`.
   - If `phase_target > invocation.tier` and `approvals[phase_id]` exists → `dispatch_tier = approvals[phase_id]`, `review_tier = approvals[phase_id]`.
   - If `phase_target > invocation.tier` and no approval → resolver returns `needs_approval`; orchestrator triggers preflight gate.

**Notes:**

- Per-provider ordering is codified in skill prompts (e.g., `haiku < sonnet < opus`; `low < medium < high < xhigh`).
- The resolver is a documented procedure, not code. It's expressed in `oat-project-implement`'s prompt.

### 3.3 Preflight gate in `oat-project-implement`

**Purpose:** Surface above-cap phases at run start; obtain explicit user approval before dispatching above cap.

**Trigger:** Once at the start of `oat-project-implement`, before phase 1 dispatches. Re-fires on resume for any still-pending flagged phase.

**Inputs:** Set of phases where resolver returned `needs_approval`, with their target tiers and rationale.

**UX flow:**

```
[Preflight] Invocation: claude / sonnet
3 phases request escalation above cap:

  Phase  Target  Rationale
  p02    opus    cross-cutting refactor of resolver
  p04    opus    architectural decision in dispatch logic
  p07    opus    plan generation logic

Phases on auto: p01, p03, p05, p06 (4 phases)

What would you like to do?
  1) Downgrade flagged phases to sonnet for this run
  2) Abort and re-invoke at opus
  3) Approve specific phases (interactive)
  4) Approve all flagged phases
```

**Decisions:**

- **Long-plan UX:** Per Codex's guardrail, `(1)` and `(2)` are listed first because they're the safer paths on long lists. `(3)` and `(4)` are available but secondary.
- **Auto visibility:** Render a single-line "Phases on auto: …" footer summarizing the count and IDs. Auto phases do not appear as rows in the gate.

**Mid-run escalation:** Same gate fires (single-phase variant) when a subagent BLOCKED-with-reasoning escalation would exceed the cap or the approved tier. Approval expands the cap for that phase to exactly the new tier.

### 3.3a Tier escalation (unified flow)

Tier escalation has two trigger sources but a single resolution path. The orchestrator handles escalation between dispatches; subagents don't manage their own tier.

**Triggers:**

- **Implementer-initiated:** subagent reports `BLOCKED` with a reasoning request.
- **Orchestrator-detected:** N consecutive review-cycle failures on the same phase. Default `N=2`; configurable in future.

**Resolution (identical for both triggers):**

1. Compute the next tier up from the implementer's current dispatch tier in the invocation's provider scale (`haiku → sonnet → opus`; `low → medium → high → xhigh`).
2. **If next tier ≤ resolved phase ceiling** (invocation cap, or an already-approved escalation tier) → **escalate silently.** Surface a one-line log entry to the user (`Phase 3 escalated to sonnet after 2 review-cycle failures`) so the change is visible but not interrupting. No gate fires.
3. **If next tier > resolved phase ceiling** → fire the preflight-style gate (3.3 above). Options: approve escalation, continue at current tier, stop, split, plan-wrong. Approval expands the phase cap to exactly the approved tier (same approval mechanism, same semantics).
4. **If already at the top of the provider scale** (e.g., implementer at `opus` on Claude, or `xhigh` on Codex) → no escalation is possible. Orchestrator picks one of: provide context, stop, split, plan-wrong. This is the existing blocked-at-ceiling path.

**Retry-budget interaction:** Tier escalations count toward `oat_orchestration_retry_limit` as redispatches (existing behavior). If the budget exhausts before convergence, the orchestrator stops as it does today; escalation does not extend the budget.

**Rationale:** Silent escalation within cap matches Superpowers' original "re-dispatch with a more capable model" behavior. The user is interrupted only when escalation needs to cross their consent envelope (the invocation cap or a prior approval). Within the envelope, the orchestrator acts; outside it, the orchestrator asks.

### 3.4 Approval state

**First pass — session-local.** Held in the orchestrator's working memory for the duration of one `oat-project-implement` invocation. Cleared when the run ends (whether successful or aborted). Re-prompts on resume.

**Schema (forward-compatible for future persistence in `implementation.md`):**

```yaml
oat_phase_approvals:
  - phase_id: p02
    approved_tier: opus # provider implicit (from current invocation)
    approved_at: 2026-05-07T14:23:00Z
  - phase_id: p04
    approved_tier: opus
    approved_at: 2026-05-07T14:23:00Z
```

**Decision:** Schema is documented in this design but **not** written to `implementation.md` in the first pass. If we later persist across resume, the schema is ready to land. This avoids forward-incompatible churn.

### 3.5 Subagent dispatch rules

**`oat-phase-implementer`:**

- Receives `dispatch_tier` parameter from the orchestrator.
- Runs at that tier. No internal model selection.
- BLOCKED-with-reasoning report mentions the tier it was running at; the orchestrator decides whether to retry, escalate, or stop.
- The implementer does not manage its own tier across retries. Tier escalation between dispatches (whether triggered by BLOCKED or by repeated review failures) is handled by the orchestrator per 3.3a.

**`oat-reviewer` (per-phase):**

- Receives `review_tier` parameter from the orchestrator.
- Runs at that tier. Per the review-tier rule, this is always the highest tier in scope for the phase (cap or approved tier).

**On `review_tier` parameter semantics:**
The `review_tier` parameter is meaningful only when a phase has been approved to escalate above the invocation cap; in the default case it equals the invocation tier and is redundant with what the orchestrator is already running at. The orchestrator passes it always (rather than conditionally) so the dispatch site doesn't have to branch on approval state, and so the dispatched reviewer has a single explicit input describing tier-in-scope for the phase.

**Role scope:** Only `oat-phase-implementer` and per-phase `oat-reviewer` participate in the dispatch profile. Other dispatched roles (`oat-codebase-mapper`, `oat-reviewer` in non-phase contexts, `skeptical-evaluator`, etc.) are not phase-specific and run at the **invocation tier** by default. They don't read or apply the dispatch profile.

### 3.6 Plan-writing proposal behavior

**Canonical home: `oat-project-plan-writing`.** This shared skill owns the format spec (per 3.1) and the per-phase proposal step. All three entry skills reference it.

**Per-phase proposal step (during authoring):**

When authoring each phase, `oat-project-plan-writing`:

1. Writes the phase content (tasks, verification, commits).
2. Analyzes that phase's work against the Superpowers tier heuristic.
3. Emits a row in the running `## Dispatch Profile` table **only when analysis suggests a clear deviation from typical work.** Typical-work phases get no row and stay `auto`.

**Decision rule:**

| Phase signals                                                                          | Action                                                                               |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1–2 files, clear spec, scaffolding/mechanical                                          | Propose row: Claude `haiku` / Codex `low`, rationale grounded in scope signals       |
| Multi-file, integration logic, debugging, pattern matching                             | **No row** — typical work, stays `auto`                                              |
| Cross-cutting refactor, architectural decisions, broad codebase touch, design judgment | Propose row: Claude `opus` / Codex `xhigh`, rationale grounded in scope/risk signals |
| Uncertain — can't strongly justify either direction                                    | **No row** — defer to runtime, stays `auto`                                          |

`auto` therefore means "the agent's analysis didn't find a strong reason to deviate from defaults." It's an explicit absence of strong signal, not a positive choice. The bar for proposing a row is "I can write a defensible rationale."

**Proposal contract (reusable unit):**

- **Input:** phase content (tasks, files, scope) + optional pre-baked rationale signals
- **Output:** `{ claude_model, codex_effort, rationale }` or `null` (no row)

**Entry-skill consumers:**

- **`oat-project-plan`** (native spec-driven) — invokes `oat-project-plan-writing`; proposal happens per-phase during authoring.
- **`oat-project-quick-start`** — invokes `oat-project-plan-writing`; same behavior.
- **`oat-project-import-plan`** — invokes `oat-project-plan-writing` for canonical format, and layers two import-specific behaviors:
  1. **Preservation short-circuit:** if the source has a recognizable OAT-format `## Dispatch Profile` section, skip the proposal step for those phases and use the source rows as-is. Document the preservation in the import summary.
  2. **Signal injection:** if the source has foreign-format model/effort hints (YAML, prose, tool-specific metadata), parse them and feed them into the proposal step as additional rationale signals. The proposal logic still runs and produces its own decision; the foreign hint is input, not output.

**Authoring guidance updates:**

- `oat-project-plan` and `oat-project-quick-start`: no new guidance beyond what they already inherit from `oat-project-plan-writing`.
- `oat-project-plan-writing`: adds the Dispatch Profile format spec, the proposal step description, the tier heuristic table, and the "if you can't explain why, no row" rule.
- `oat-project-import-plan`: documents the two import-specific layers and notes that the proposal logic itself is shared, not duplicated.

### 3.7 Plan-review tier advisory

**Purpose:** Flag risky tier choices in the Dispatch Profile when a plan is reviewed, so the user catches them before the plan is locked in for execution.

**Home:** `oat-project-review-provide` (and any sibling skill that reviews plan artifacts).

**Triggers — review checklist additions:**

For each row in `## Dispatch Profile`, evaluate against the phase's scope and complexity (rationale field + phase task list).

- **Flag as `Important` review finding** when:
  - Tier is at the bottom of its scale (Claude `haiku`, Codex `low`) **and** the phase touches multiple files, integration code, or cross-cutting concerns.
  - Rationale is missing or generic ("save cost", "simple") on a low-tier row.
  - A phase explicitly marked as architecture/design work has a low-tier row.
- **Flag as `Minor` review finding** when:
  - Mid-tier (Claude `sonnet`, Codex `medium`) on a phase that includes architectural decisions.
  - Rationale is present but doesn't address the phase scope.

**Non-flag cases (intentional silence):**

- High-tier rows. Reviewing those is the user's call; the design doesn't second-guess upward choices.
- Phases not in the table (running on `auto`). The advisory only evaluates explicit choices.

**Output format:** Standard review-finding format used by the existing review skill, just with `dispatch-profile` as the category. No new review surface.

**Decision:** The reviewer doesn't need its own dispatch tier — it inherits whatever tier the project review's own dispatch is at, which is unrelated to this profile. This component is read-only against the profile; it doesn't influence dispatch.

### Cross-cutting decisions

- **Cross-provider field handling:** The column for the _other_ provider is data-only. A Codex `reasoning_effort` value is read as data when authoring, but ignored at dispatch on a Claude run (and vice versa). Plans authored on one provider remain valid on the other; the inert column is not warned or rejected. This keeps plans portable.
- **Retry-budget interaction:** Each redispatch (same tier or escalated) counts as one fix-loop iteration against `oat_orchestration_retry_limit`. Tier escalation does not get a separate budget. This keeps the existing retry semantics intact.

## Data Models

### Dispatch Profile table (in `plan.md`)

**Schema:** Markdown table within a `## Dispatch Profile` section. See 3.1 for the format.

**Validation rules:**

- Phase IDs must match the format used elsewhere in `plan.md` (`pNN`).
- Claude model cell: one of `haiku`, `sonnet`, `opus`, `auto`, or blank.
- Codex effort cell: one of `low`, `medium`, `high`, `xhigh`, `auto`, or blank.
- Rationale cell: free text, optional.

**Storage:** Plain Markdown in `plan.md`. No database, no parser library — parsed by the resolver as part of `oat-project-implement`'s prompt-driven workflow.

### Approval state (session-local in first pass)

**Schema (for future `implementation.md` persistence):**

```yaml
oat_phase_approvals:
  - phase_id: <pNN>
    approved_tier: <model | effort>
    approved_at: <ISO 8601 UTC>
```

**Validation rules:**

- `phase_id` must reference a real phase in `plan.md`.
- `approved_tier` must be a tier in the current invocation's provider scale.
- `approved_at` is purely informational in the first pass.

**Storage:** In-memory for the first pass. Schema documented here so future persistence can land without forward-incompatible churn.

## Error Handling

### Resolver outcomes

The resolver produces one of three concrete outcomes for each phase:

- **`{dispatch_tier, review_tier}` (concrete tiers):** phase is ready to dispatch.
- **`auto`:** phase dispatches with no explicit override; provider/runtime picks.
- **`needs_approval`:** phase target exceeds invocation cap and no run-local approval exists. Orchestrator must surface in preflight or mid-run gate.

### Preflight denial / abort

If the user picks **abort** or **downgrade-all** at the preflight gate, `oat-project-implement` does not dispatch any phase above cap. Downgrade replaces the phase target with the invocation tier for the duration of the run; abort exits cleanly without phase 1 starting.

### Tier escalation (BLOCKED or repeated review failures)

Tier escalation flows through 3.3a regardless of trigger source. Within the resolved phase ceiling (invocation cap or approved tier), escalation is silent with a log entry. Crossing the ceiling fires the preflight-style gate.

If the resolved phase ceiling is already at the invocation cap (or at the approved escalation tier) and no further headroom exists, the orchestrator chooses a non-escalation response:

- Provide missing context (if the BLOCKED report indicates context, not reasoning, was the issue).
- Stop for user input.
- Split the task into smaller pieces.
- Treat the plan as needing correction.

The orchestrator does **not** silently escalate above the resolved ceiling.

### Retry-beyond-approval

If a phase has been approved to escalate (e.g., approved at `opus`) and a retry within that phase wants to escalate further (e.g., to a hypothetical tier above `opus`), the orchestrator fires a fresh preflight-style gate. The original approval covers up to the approved tier, not beyond.

### Plan-format errors

If the `## Dispatch Profile` table contains malformed cells (unknown tier name, invalid phase ID, etc.):

- Treat unknown tier values as if blank (= `auto` for that cell). The orchestrator surfaces a warning at preflight noting the row was ignored.
- Invalid phase IDs are surfaced as a warning at preflight and the row is ignored. The phase resolves to `auto`.

The orchestrator never refuses to run on a malformed table. The plan-review advisory (3.7) is the layer that catches malformed rows before execution.

### Provider mismatch

A plan with both Claude and Codex columns runs on whichever provider is invoking. The other provider's column is treated as data-only and ignored at dispatch. No warning is surfaced for this case — cross-provider portability is the intent.

## Testing Strategy

This is a prompt/skill/template guidance project — no runtime code, no APIs, no unit tests in the traditional sense. The "testing" is verification that the prompts produce the right behavior. Three test levels apply.

### Scenario walkthroughs (manual, in-session)

The core verification mode. After implementing the guidance changes, run `oat-project-implement` against curated example plans and confirm the orchestrator behaves correctly. Key scenarios:

| Scenario                                          | Setup                                                                                     | Expected behavior                                                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Empty profile**                                 | Plan with no `## Dispatch Profile` section                                                | All phases dispatch as `auto`. No preflight gate. Behaves identically to today.                                                |
| **All-auto profile**                              | Plan with a Dispatch Profile section but all cells blank                                  | Same as empty — no preflight, all `auto`.                                                                                      |
| **Below-cap phase**                               | Invocation: sonnet. Phase 4 set to `haiku`                                                | Phase 4 dispatches at `haiku`. Phase 4 review dispatches at `sonnet` (the cap). No preflight gate.                             |
| **Above-cap phase, approved**                     | Invocation: sonnet. Phase 2 set to `opus`. User approves at preflight.                    | Phase 2 implementation and reviews dispatch at `opus`. Other phases unaffected.                                                |
| **Above-cap phase, downgraded**                   | Invocation: sonnet. Phase 2 set to `opus`. User downgrades at preflight.                  | Phase 2 dispatches at `sonnet`. No mid-run escalation gate.                                                                    |
| **Above-cap phase, aborted**                      | Invocation: sonnet. Phase 2 set to `opus`. User aborts.                                   | Implement exits cleanly. No dispatches occur.                                                                                  |
| **Mid-run escalation, approved**                  | Invocation: sonnet. Phase 3 at `auto`. Subagent reports BLOCKED needing reasoning.        | Gate fires. User approves `opus`. Phase 3 redispatches at `opus`.                                                              |
| **Mid-run escalation, blocked at ceiling**        | Invocation: opus. Phase 3 set to `opus`. Subagent reports BLOCKED needing more reasoning. | No escalation. Orchestrator picks one of: context, stop, split, plan-wrong.                                                    |
| **Repeated review-failure, silent escalation**    | Invocation: sonnet. Phase 3 at `haiku`. Implementer fails review twice.                   | Orchestrator silently escalates haiku → sonnet (within cap). Log entry surfaced. No gate fires.                                |
| **Repeated review-failure, gate-on-cap-crossing** | Invocation: sonnet. Phase 3 at `sonnet`. Implementer fails review twice.                  | Orchestrator wants to escalate sonnet → opus (above cap). Gate fires. User approves / continues / stops / splits / plan-wrong. |
| **Cross-provider portability**                    | Plan has both Claude and Codex columns. User runs on Claude orchestrator.                 | Codex column ignored at dispatch. No warning. Plan works identically as if Codex column were absent.                           |
| **Malformed cell**                                | Plan has a row with `Claude model: foobar`                                                | Row treated as if cell is blank (`auto`). Preflight surfaces a warning. Plan still runs.                                       |
| **Resume re-prompt**                              | Run is interrupted after preflight approvals; user resumes.                               | Preflight re-fires for any still-pending flagged phase. Prior approvals not assumed.                                           |

### Plan-writing proposal sanity checks (manual)

For the proposal behavior in `oat-project-plan-writing`, verify against representative plans:

- **Mechanical-heavy plan** (e.g., scaffolding-only changes across 5 phases) — proposal should produce 1–3 rows pinning low tiers, no rows for typical phases.
- **Architecture-heavy plan** (e.g., the resolver itself, or a cross-cutting refactor) — proposal should produce rows pinning high tiers on architectural phases, no rows for mechanical scaffolding.
- **Mixed plan** (most plans) — proposal should produce 0–3 rows where deviation is clear; the bulk of phases get no row.
- **Import preservation** — feed `oat-project-import-plan` a source plan that already has an OAT-format Dispatch Profile section; verify preservation short-circuit fires for those rows; verify proposal step still runs for any phases not covered by the source profile.

These aren't pass/fail tests — they're sanity checks that the heuristic produces reasonable output. Findings inform tier-heuristic refinements in `oat-project-plan-writing`.

### Plan-review advisory dry runs (manual)

For the plan-review advisory in `oat-project-review-provide`, verify against constructed test plans:

- **Plan with risky low-tier row** (e.g., a cross-cutting refactor pinned to `haiku` with rationale "save cost") — advisory should flag as `Important`.
- **Plan with missing rationale on low-tier row** — advisory should flag as `Important`.
- **Plan with sonnet on architectural phase** — advisory should flag as `Minor`.
- **Plan with all high-tier rows** — advisory should be silent (no upward second-guessing).
- **Plan with all-auto** — advisory should be silent (no rows to evaluate).

### What's NOT tested in this project

- **Behavioral correctness of `auto` selection.** Whether provider/runtime auto-selection picks good tiers is out of scope. This project is about the dispatch-profile and review-tier mechanism, not the underlying provider behavior.
- **Token cost / time-savings measurements.** This project doesn't make a cost claim. If we want one, measure separately after the feature ships.
- **Reviewer quality with different tiers.** The review-tier rule says "reviews run at cap or approved tier." We don't claim "this produces better reviews than running at implementer's tier" — that's a hypothesis that would need measurement separately.

### Verification at task level

Each implementation task in `plan.md` will have its own verification step per the canonical plan format. The skill prompts and templates being edited can be verified by:

- Reading the modified skill files and confirming the new sections are present and well-formed.
- Running the affected skills in a no-op scenario and confirming the new sections render.
- For `oat-project-implement` changes: running it on a fixture plan (above-cap, all-auto, etc.) and confirming the documented behavior.

## Open Questions

_All open questions from discovery resolved in component design above. None remaining at design time._

## References

- Discovery: `discovery.md`
- Plan template: `.oat/templates/plan.md`
- Canonical plan-writing skill: `.agents/skills/oat-project-plan-writing/`
- Entry skills: `.agents/skills/oat-project-plan/`, `.agents/skills/oat-project-quick-start/`, `.agents/skills/oat-project-import-plan/`
- Implementation orchestrator: `.agents/skills/oat-project-implement/`
- Phase implementer agent: `.agents/agents/oat-phase-implementer.md`
- Reviewer agent: `.agents/agents/oat-reviewer.md`
- Superpowers reference: `/Users/thomas.stang/Code/vox/open-agent-toolkit/.oat/projects/archived/collaborative-design-workflow/reference/superpowers-subagent-driven-development.md`
- Backlog item: `.oat/repo/reference/backlog/items/phase-subagent-reasoning-budget-guidance.md` (bl-0738)
