---
title: Implementation Execution
description: 'Phase-subagent dispatch, tier detection, runtime dispatch selection, bounded fix loop, plan-declared parallelism, and dry-run mode in oat-project-implement v2.0.'
---

# Implementation Execution

This page covers how `oat-project-implement` actually runs a plan: tier selection, phase-level subagent dispatch, runtime dispatch selection, the review + fix loop, plan-declared parallelism with worktree fan-in, and dry-run.

## Quick Look

- **When to use:** you have a plan ready and want to understand what happens during `oat-project-implement`.
- **Unit of dispatch:** one phase at a time (not one task). A phase implementer executes all tasks in the phase, commits per task, and returns a single summary.
- **Two tiers, one target contract:** capability detection picks Tier 1 (native subagents) or Tier 2 (guarded execution) at start. A concrete managed target still requires its exact registered role or a fresh pinned child; inline is conditional, not a generic fallback.
- **Dispatch policy:** implementation resolves an OAT-owned dispatch policy before work starts. Managed policies are `Economy`, `Balanced`, `High`, `Frontier`, and `Uncapped`; `Inherit Host Defaults` explicitly leaves model/effort controls to the host.
- **Runtime dispatch:** each phase uses the lowest available model/effort/control that can confidently complete the work. Capped managed policies cap preferred selections, managed `Uncapped` uses preferred selections directly, and inherit/default mode uses no OAT-selected control.

## Execution model

### Tier selection

At skill start, `oat-project-implement` detects whether the host supports native subagent dispatch for `oat-phase-implementer` and `oat-reviewer`.

- **Claude Code / Cursor:** native subagent dispatch → Tier 1.
- **Codex multi-agent:** Tier 1 if `spawn_agent` is allowed without authorization, or after an explicit single prompt at skill start if authorization is required. Codex subagent dispatch should use self-contained scope packets with fresh context; do not assume pinned OAT roles can also inherit the full parent thread.
- **Authorization declined or agents do not resolve:** Tier 2 selects a sequential target-preserving route. A concrete managed target still uses its exact registered role or a fresh Codex child pinned to the resolved model and effort. Inline is allowed only with verified equivalent current-host model and effort controls, or for explicit inherit/default behavior or the managed-uncapped reviewer exception; otherwise execution fails closed.

The approval decision covers both phase implementation and checkpoint review for the run. The orchestrator should not drift into a mixed mode based on conversational emphasis alone; if Tier 1 was not approved, retain Tier 2 mechanics without weakening the resolved target contract unless the user explicitly requests mixed execution.

The selected tier is reported to the user and locked for the remainder of the run:

```text
[preflight] Checking subagent availability…
  → oat-phase-implementer + oat-reviewer: available
  → Selected: Tier 1 — Subagents
```

### Dispatch policy preflight

Before phase work starts, `oat-project-implement` resolves and prints the dispatch policy for the current provider. For the conceptual model and per-provider enforcement (Codex vs Claude vs unsupported), see [Dispatch Policy](dispatch-ceiling.md).

The resolver is the source of truth. The command name remains `dispatch-ceiling` for compatibility:

```bash
oat project dispatch-ceiling resolve --provider codex --preflight --json
```

Resolution order:

1. `workflow.dispatchPolicy.mode` / `workflow.dispatchPolicy.policy` from effective config
2. Compatibility `workflow.dispatchCeiling.providers.<provider>` from effective config
3. `oat_dispatch_policy` in project `state.md` frontmatter
4. Legacy `oat_dispatch_ceiling` in project `state.md` frontmatter
5. Interactive implementation preflight prompt
6. Non-interactive unresolved state blocks before work starts

Runtime dispatch reads the resolved policy and provider-specific selection only. If no policy is configured, the interactive preflight prompt offers the policy choices; non-interactive mode blocks.

An incomplete managed active-provider matrix is also unresolved. Planning and
review paths show the complete recommended defaults, persist the selected
configuration layer, and rerun the resolver before readiness or review. The
same rule covers spec-driven plans, quick plans, imported plans, and provider
plans routed through import.

**Policy options (interactive prompt):**

| Option                | Mode    | Recommended Codex target | Claude   |
| --------------------- | ------- | ------------------------ | -------- |
| Economy               | managed | `gpt-5.6-luna/high`      | `sonnet` |
| Balanced              | managed | `gpt-5.6-terra/xhigh`    | `sonnet` |
| High                  | managed | `gpt-5.6-sol/high`       | `opus`   |
| Frontier              | managed | `gpt-5.6-sol/max`        | `fable`  |
| Uncapped              | managed | none                     | none     |
| Inherit Host Defaults | inherit | none                     | none     |

For Codex, provider default effort is displayed when available but is not treated as managed `Uncapped` or as a cap. Provider defaults apply only to explicit inherit/default behavior or base/unpinned fallback paths.

```text
Dispatch policy: balanced (codex, managed capped — materialized-role)
Resolved cap: high
Source: project state
Provider default effort: medium
Note: OAT will use resolver-returned materialized Codex role names up to high. Base/unpinned roles resolve through the provider default only on fallback paths.
```

**Enforcement modes** (from resolver):

- `enforced` — the adapter compiled concrete dispatch args and the provider accepted them (Codex: materialized model+effort roles; Claude: Task `model` parameter).
- `advisory` — the provider is supported but no value resolved, or an upgrade request was not honored by the provider.
- `unsupported` — the provider has no registered adapter; the policy is informational only. Dispatch follows provider behavior.

In non-interactive mode, an unresolved policy blocks before any implementation work:

```text
BLOCKED: Codex dispatch policy is unresolved in non-interactive mode.
Set workflow.dispatchPolicy.mode/workflow.dispatchPolicy.policy, workflow.dispatchCeiling.providers.codex, oat_dispatch_policy, or legacy oat_dispatch_ceiling.
```

Dry-run reports unresolved policy and planned behavior without writing project state.

### Runtime dispatch selection

Tier selection decides how OAT invokes work; it does not authorize a target downgrade. Runtime dispatch selection is separate: it decides which provider-specific model and effort controls to use for a specific phase when the host exposes those axes. Inline execution remains guarded by verified equivalent current-host controls or the explicit inherit/default and managed-uncapped reviewer exceptions.

The default rule is conservative: use the lowest available model and/or effort that can confidently complete the phase. Escalate before dispatch when the phase is high-risk, broad, cross-cutting, or when retry evidence suggests the current control is underpowered.

The orchestrator considers, in order:

1. A valid `## Dispatch Profile` override row in `plan.md`, if present and the host can honor it.
2. The phase's files, risk, requirements, and recent review/fix-loop evidence.
3. The host's actual control surface by axis.

Model and effort are separate axes. Each axis logs one of these states:

- `selected:<value>` — the host exposes the axis and the orchestrator chose a value.
- `provider-default` — Codex base/unpinned role follows configured/provider default effort for explicit inherit/default behavior or fallback paths.
- `inherited` — the host exposes the axis and the orchestrator deliberately defers to the parent session.
- `not-applicable` — this host/API has no meaningful per-dispatch concept for that axis.
- `host-auto` — exceptional; the host uses that axis internally but the orchestrator cannot read or pin it.

In Codex, implementation and fix dispatch classify a preferred effort (`low`, `medium`, `high`, `xhigh`, or `max`) and pass it to `oat project dispatch-ceiling resolve --provider codex --role implementer --preferred <effort>`. For capped managed policies, the resolver selects `min(preferred, resolved_cap)` and returns a materialized role name compiled from an explicit model+effort target. For managed `Uncapped`, the resolver selects the preferred materialized role with no cap. For inherit/default mode, it returns no materialized role and OAT uses the base/unpinned role. Reviewer dispatch targets the configured cap only when a capped managed policy exists; managed `Uncapped` and inherit/default use base `oat-reviewer` fallback.

Because Codex preferred values are effort names while dispatch matrix cells are
keyed by OAT tiers, managed `Uncapped` resolves the matching model+effort target
from the matrix. `max` is a first-class effort and can select the Sol/max
catalogue role; it is not treated as `xhigh`.

In Claude Code, implementation and fix dispatch classify a preferred model tier (`haiku`, `sonnet`, `opus`, or `fable`) and pass it to `oat project dispatch-ceiling resolve --provider claude --role implementer --preferred <model> --orchestrator-tier <current-orchestrator-tier>`. Capped policies select `min(preferred, resolved_cap)`, managed `Uncapped` selects the preferred model, and inherit/default omits `model`. Reviewer dispatch passes a `model` only when the resolver returns one. The separate effort axis is `not-applicable`.

Dispatch logs use a consistent structured block so provider behavior is comparable without flattening the model and effort axes:

```text
OAT Dispatch: Phase p01 implementation
Host: Claude Code
Model axis: selected:sonnet
Effort axis: not-applicable
Dispatch target: oat-phase-implementer
Rationale: multi-file integration with mock wiring; sonnet is the lowest sufficient Claude model.

OAT Dispatch: Phase p02 implementation
Host: Codex
Preferred effort: high
Dispatch policy: economy
Resolved cap: high
Selected effort: high
Policy source: repo config
Provider default effort: high
Selection mode: capped
Model axis: selected:gpt-5.6-luna
Effort axis: selected:high
Dispatch target: oat-phase-implementer-gpt-5-6-luna-high
Rationale: shared TypeScript/config substrate; high preferred due to integration risk, capped by configured policy.

OAT Dispatch: Phase p03 review
Host: Codex
Dispatch policy: high
Resolved cap: high
Selected effort: high
Policy source: project state
Provider default effort: medium
Selection mode: review-target
Model axis: selected:gpt-5.6-sol
Effort axis: selected:high
Dispatch target: oat-reviewer-gpt-5-6-sol-high
Rationale: reviewer runs at the configured policy cap for deterministic quality gate behavior.

OAT Dispatch: Phase p03 implementation
Host: Codex
Preferred effort: xhigh
Dispatch policy: uncapped
Resolved cap: none
Selected effort: xhigh
Policy source: project state
Provider default effort: medium
Selection mode: uncapped
Model axis: selected:gpt-5.6-terra
Effort axis: selected:xhigh
Dispatch target: oat-phase-implementer-gpt-5-6-terra-xhigh
Rationale: high-risk phase; managed uncapped policy allows the preferred materialized target.

OAT Dispatch: Phase p04 implementation
Host: Other
Model axis: host-auto
Effort axis: host-auto
Dispatch target: host default
Rationale: host does not expose readable or pinnable dispatch controls; rationale maps to standard effort.

OAT Dispatch: p02-t10 sidecar exploration
Host: Codex
Preferred effort: provider-default
Dispatch policy: high
Resolved cap: xhigh
Selected effort: provider-default
Policy source: project state
Provider default effort: xhigh
Model axis: inherited
Effort axis: provider-default
Dispatch target: explorer
Rationale: read-only sidecar exploration; generic explorer payload does not pin an OAT-managed effort variant.
```

Phase and review scope packets include dispatch context when the orchestrator has resolved it: `model_axis`, `effort_axis`, `dispatch_policy`, `dispatch_ceiling`, `policy_source`, `ceiling_source` as a compatibility alias, `provider_default_effort`, and `dispatch_rationale`.

Generic sidecars such as built-in `explorer` are not OAT-managed implementer, reviewer, or fix roles. If a sidecar payload does not pin a reliable effort/model control, log it as provider-default rather than classifying the task complexity as a selected effort. Sidecar results are advisory context; implementation and review/fix gates still follow the OAT-managed dispatch rules above.

### Dispatch Profile overrides

`plan.md` should omit `## Dispatch Profile` by default. Missing dispatch rows are normal, because runtime selection has fresher phase context and host capability information at execution time.

Add Dispatch Profile rows only when the user has an explicit constraint or preference, such as "use high reasoning effort for the security implementation phase" or "keep documentation-only phases on the lowest tier." Override rows should include a rationale explaining why runtime selection should not decide on its own.

### Per-phase loop

For each phase in the plan (whether sequential or inside a parallel group):

1. **Select runtime dispatch control** for the phase and log the chosen control plus rationale.
2. **Dispatch the selected implementer role** with a Phase Scope block (project path, phase id, artifact paths, commit convention, workflow mode, and dispatch context when known). In Codex, use the exact resolver-returned registered role when selectable. If it is not selectable in the current session, launch a fresh Codex child pinned to the resolved model and reasoning effort with `.agents/agents/oat-phase-implementer.md` as its canonical instructions. Never silently use the managed base role.
3. **Receive the summary:** `DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`.
   - `BLOCKED` stops the run and surfaces the blocker to the user.
4. **Dispatch the selected reviewer role** with a Review Scope block (phase id, commit range, optional files-changed hint, and dispatch context). The commit range is authoritative; the file list is only orientation metadata. In Codex, pass this as a self-contained packet with `fork_context: false`; use the exact resolver-returned registered reviewer role when selectable, otherwise launch a fresh Codex child pinned to the resolved model and reasoning effort with `.agents/agents/oat-reviewer.md` as canonical instructions. Base `oat-reviewer` is valid only for explicit inherit/default behavior and the documented managed-uncapped reviewer exception. Inline review requires verified equivalent current-host model and effort controls. In Claude Code, pass a review `model` only when the resolver returns one and always record `effort_axis=not-applicable`. If the reviewer times out or does not conclude on the first wait, poll once more and send a concise "return now with current findings" nudge. Then retry the same exact role or pinned child within the retry bound; if the target-preserving retry still fails, fail closed instead of downgrading inline.
5. **Parse the verdict:** zero Critical + zero Important findings → `pass`; otherwise `fail`.
6. **On fail, run the bounded fix loop** (see below).
7. **Update artifacts** (`implementation.md`, `plan.md` review row, `state.md`) and make the mandatory bookkeeping commit.
8. **Phase review gate** — when `oat_phase_review_gate` selects the phase, run the optional non-pausing external gate (`oat gate review`) after the step 7 bookkeeping commit and before the HiLL check. A passing gate continues automatically; a blocking gate is received and fixed, reusing the bounded fix loop's `oat_orchestration_retry_limit`. See [Reviews → Phase review gate](reviews.md#phase-review-gate).
9. **HiLL checkpoint** if the phase id is listed in `oat_plan_hill_phases`.

### Bounded fix loop

On a `fail` verdict:

- Read `oat_orchestration_retry_limit` from `state.md` frontmatter (default `2`, range `0–5`).
- For each retry: re-dispatch the implementer in `fix` mode with the review artifact and findings, then re-dispatch the reviewer.
- On `pass` → exit the loop; the phase disposition becomes `merged` (sequential) or `merged` (parallel, after fan-in).
- On retries exhausted:
  - **Sequential mode:** STOP the run with phase id, unresolved findings, and review artifact path.
  - **Parallel group mode:** mark the phase `excluded`, do not merge its worktree, continue the remaining phases in the group, and report it in Outstanding Items.

Tier is never silently downgraded. If a Tier 1 dispatch has a transient failure, the orchestrator retries exactly once; a second failure is treated the same as fix-loop exhaustion for that phase.

### Escalation termini

When escalation re-dispatches at a stronger control, the ladder is provider-specific:

- **Codex:** `selected:low -> selected:medium -> selected:high -> selected:xhigh -> selected:max`, capped by the resolved managed cap when one exists. Managed `Uncapped` can select the preferred value; inherit/default mode has no OAT escalation control.
- **Claude Code:** `selected:haiku -> selected:sonnet -> selected:opus -> selected:fable`, capped by the resolved managed cap when one exists. Managed `Uncapped` can select the preferred model; inherit/default mode has no OAT escalation control.

Escalation re-dispatches still count against the bounded retry budget; escalation changes the dispatch control, it does not grant extra retry attempts.

## Plan-declared parallelism

Phases whose task file sets do not overlap may execute concurrently. Declare this in `plan.md` frontmatter:

```yaml
oat_plan_parallel_groups: [['p02', 'p03'], ['p04', 'p05']]
```

- Each inner array is a group of phases that run concurrently — one worktree per phase.
- Phases not listed in any group run sequentially in plan order.
- Groups themselves run sequentially — group `[p02, p03]` merges before group `[p04, p05]` starts.
- Empty or missing field → fully sequential, no worktrees created, behavior identical to today's `oat-project-implement`.

### How a parallel group runs

1. **Bootstrap worktrees** via `oat-worktree-bootstrap-auto`, one per phase, branch name `{project-name}/{pNN}`.
   - The bootstrap checks inherited git cleanliness before the all-scope provider sync sweep.
   - If that sync leaves `.oat/sync/manifest.json` or provider directories dirty, bootstrap commits only existing or tracked sync-managed paths (`.oat/sync/manifest.json`, `.claude`, `.cursor`, `.codex`) as `chore: run sync` and reports `sync_commit: pass | fail | skip`.
   - If any bootstrap fails, cancel successful worktrees and **degrade the entire group** to sequential target-preserving execution.
2. **Concurrent dispatch** of `oat-phase-implementer` into each worktree (Tier 1 only — Tier 2 cannot run concurrently and therefore executes sequentially while retaining the exact-role, pinned-child, or guarded-inline contract).
3. **Wait for terminal verdicts** (`pass` or `failed`) across every phase in the group.
4. **Fan-in reconciliation in plan order:** for each passing phase, `git merge --no-ff {project-name}/{pNN}`. Integration verification (`pnpm test && pnpm lint && pnpm type-check`) runs after each merge.
5. **Failed phases are excluded** — their worktrees are preserved and logged in `implementation.md` Outstanding Items. Passing phases still merge (partial merge-back, not atomic).
6. **Worktree cleanup** runs for merged phases; preserved for excluded phases.
7. **Bookkeeping commit** + HiLL checkpoint check after the group finishes.

### Merge-conflict handling

When a merge produces a conflict:

1. `git merge --no-ff` is aborted.
2. `git cherry-pick` of the phase's commits is attempted.
3. If cherry-pick also conflicts, an **inline conflict-resolution subagent** is dispatched via the Task tool. The orchestrator **never reads conflicted files itself** — that context belongs in a fresh subagent.
4. The subagent reads conflicted files and project artifacts (`plan.md`, `design.md`, `spec.md`), applies a resolution, runs integration verification, and returns:
   - `RESOLVED` → merge is committed; orchestrator proceeds.
   - `UNRESOLVABLE` or `VERIFICATION_FAILED` → STOP the run with phase id, conflicting files, worktree path, and the subagent's reasoning summary.

The orchestrator does not proceed past a broken merge.

## Validating plan metadata

Before dispatching, `oat-project-implement` invokes the validator CLI:

```bash
oat project validate-plan --project-path "${PROJECT_PATH}"
```

The command enforces:

- `oat_plan_parallel_groups` is either missing/empty (treated as fully sequential) or a non-empty nested array of phase ID strings.
- Every referenced phase id exists in the plan body.
- No phase id appears in more than one group.
- No singleton groups (each group must contain at least 2 phases).
- Frontmatter YAML parses cleanly — malformed frontmatter fails with exit 1.

Non-zero exit stops the run. The skill does not re-implement validation in prose — the CLI is the single source of truth.

## Dry-run mode

Run with `--dry-run` to preview a run without dispatching anything:

```bash
oat-project-implement --dry-run
```

Dry-run:

- Performs tier selection and plan validation.
- Builds the execution schedule (singleton phases + parallel groups in plan order).
- Prints the planned dispatches and worktree layout.
- Exits 0 without dispatching subagents, creating worktrees, or modifying files.

Use dry-run as a sanity check after editing `oat_plan_parallel_groups` to confirm the schedule matches your intent.

## Resumption

On re-invocation after a partial run:

1. Read `implementation.md` for the most recent orchestration-runs entry.
2. Compare phase counts against the plan's phase list; phases not covered by any run are the resume targets.
3. Read `state.md` for `oat_current_task` and cross-check with git log.
4. If a phase committed implementer output but has no review verdict recorded, the reviewer is re-dispatched for that phase's current HEAD.
5. If un-cleaned worktrees remain from a prior parallel group, the orchestrator lists them and asks whether to resume or clean up.

First-ever invocations skip resumption detection.

## State and artifact updates

After each phase (or parallel group) completes, `oat-project-implement` updates:

- `implementation.md` — appends a `### Run N` entry between the `<!-- orchestration-runs-start -->` markers with tier, dispatch rationale, phase outcomes, parallel groups, and outstanding items.
- `plan.md` — updates the reviews table lifecycle (`pending` → `passed` or `fixes_added` → `fixes_completed` → `passed`).
- `state.md` — updates `oat_current_task`, `oat_last_commit`, `oat_project_state_updated`, and persists `oat_orchestration_retry_limit` if the user overrode the default.

Legacy `oat_execution_mode: subagent-driven` in existing projects is silently ignored and removed on the next bookkeeping write.

## Related

- [Lifecycle](lifecycle.md) — where implementation sits in the full project flow.
- [Artifacts](artifacts.md) — `plan.md` frontmatter contract, including `oat_plan_parallel_groups`.
- [HiLL Checkpoints](hill-checkpoints.md) — orthogonal pause semantics; fires after a phase or group completes and merges.
- [CLI Reference](../../reference/cli-reference.md) — `oat project validate-plan` and other commands.
