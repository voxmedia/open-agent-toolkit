---
name: oat-project-implement
version: 2.0.20
description: Use when plan.md is ready for execution. Dispatches phase-level subagents with bounded fix loops; supports plan-declared parallel phase groups with worktree-isolated execution and ordered fan-in.
argument-hint: '[--retry-limit <N>] [--dry-run]'
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion, Task
---

# Implementation Phase

Execute the implementation plan task-by-task with full state tracking.

## Prerequisites

**Required:** Complete implementation plan. If missing, run the `oat-project-plan` skill first.

## Mode Assertion

**OAT MODE: Implementation**

**Purpose:** Execute plan tasks with TDD discipline, track progress, handle blockers.

**CRITICAL — Bookkeeping commits are mandatory, not optional.**
After every code commit and after every phase/review-fix completion, you MUST commit the OAT tracking files (project: `implementation.md`, `state.md`, `plan.md`) as a separate bookkeeping commit. Refresh the repo dashboard with `oat state refresh` before staging when available, but do not stage `.oat/state.md`; it is generated dashboard state and is normally gitignored. Do not defer, batch, or skip these commits under the reasoning that they "aren't related to the implementation." Skipping a bookkeeping commit is the primary cause of cross-session state drift and will cause the next implementation run to fail bookkeeping cross-checks. If bookkeeping commits feel frequent, that is the intended design — they are cheap and they prevent drift.

**CRITICAL — Review boundaries require a committed artifact baseline.**
Do not enter checkpoint review, final review, revise, or PR-final handoff with dirty core project artifacts (`discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`). If one of those boundaries is next and artifact bookkeeping is still uncommitted, stop and create the bookkeeping commit first.

**CRITICAL — Intentional artifact divergence must be recorded.**
If implementation intentionally diverges from `spec.md`, `design.md`, or `plan.md`, record the delta in `implementation.md` before the next phase/review boundary. Include what diverged, why it diverged, whether the implementation or original artifact is now source of truth, and any follow-up artifact updates or explicit deferral. Do not leave accepted design drift only in chat, a review artifact, or code comments; final summary generation depends on `implementation.md` preserving the delta.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what's happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ IMPLEMENT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- For each task, announce a compact header before doing work:
  - `OAT ▸ IMPLEMENT {task_id}: {task_name}`
- Before multi-step "bookkeeping" work (updating artifacts/state, verification, committing, dashboard refresh), print 2–5 short step indicators, e.g.:
  - `[1/4] Updating implementation.md + state.md…`
  - `[2/4] Running verification…`
  - `[3/4] Committing…`
  - `[4/4] Refreshing dashboard…`
- For long-running operations (tests/lint/type-check/build, reviews, large diffs), print a start line and a completion line (duration optional).
- Keep it concise; don't print a line for every shell command.

**BLOCKED Activities:**

- No skipping tasks
- No changing plan structure
- No scope expansion

**ALLOWED Activities:**

- Executing tasks in order
- Making minor adaptations within task scope
- Logging decisions and issues
- Marking blockers for user review

**Self-Correction Protocol:**
If you catch yourself:

- Skipping ahead in tasks → STOP (execute in order)
- Expanding scope → STOP (log as "deferred")
- Changing plan structure → STOP (update plan.md first)

**Recovery:**

1. Acknowledge the deviation
2. Return to current task
3. Document in implementation.md

## Process

### Step 0: Resolve Active Project

OAT stores active project context in `.oat/config.local.json` (`activeProject`, local-only).

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

**If `PROJECT_PATH` is missing/invalid:**

- Ask the user for `{project-name}`
- Set `PROJECT_PATH` to `${PROJECTS_ROOT}/{project-name}`
- Write it for future phases:
  ```bash
  mkdir -p .oat
  oat config set activeProject "$PROJECT_PATH"
  ```

**If `PROJECT_PATH` is valid:** derive `{project-name}` as the directory name (basename of the path).

### Step 0.5: Capability Detection and Tier Selection

Detect whether native subagent dispatch is available. The detection logic follows the same pattern used by `oat-project-review-provide` but produces a two-tier outcome (no fresh-session tier — this skill runs autonomously and cannot block on user-initiated fresh sessions mid-run).

Detection logic:

- If the host is Claude Code, check Task-tool availability with `subagent_type: "oat-phase-implementer"` and `subagent_type: "oat-reviewer"`. Available → Tier 1.
- If the host is Cursor, use Cursor-native invocation. Available → Tier 1.
- If the host is Codex multi-agent, verify `[features] multi_agent = true` and whether `spawn_agent` requires explicit authorization.
  - Codex Tier 1 dispatches for `oat-phase-implementer` and `oat-reviewer` must use self-contained scope packets and fresh context. Do not rely on forked full-thread context when pinning a specialized OAT role.
  - Available without auth → Tier 1.
  - Available with auth required → fail closed. You MUST ask the user once at skill start before selecting Tier 2 or starting implementation work:

    ```
    This OAT implementation skill normally delegates phase implementation and review to subagents. Authorize subagent delegation for this run?

    Yes authorizes both oat-phase-implementer and oat-reviewer across every phase in this run.
    ```

    - Approved → Tier 1.
    - Declined → Tier 2.

- If the host does not resolve either agent → Tier 2.

**Approval scope rule:** this Tier selection applies to both phase implementation and checkpoint review. Do not infer a mixed mode from conversational emphasis on review checkpoints. If the user has not explicitly approved Tier 1 for the run, stay Tier 2 throughout. Mixed mode is only valid when the user explicitly requests it.

**Codex fail-closed rule:** after this skill is invoked, "user did not separately ask for subagents" is not a valid Tier 2 reason. If Codex can spawn agents but requires explicit user authorization, the implementation MUST NOT continue until the delegation question above is answered. Tier 2 is allowed only when:

- `user declined delegation`
- `spawn_agent unavailable`
- `required agent role unresolved`

Report the selected tier to the user:

```
[preflight] Checking subagent availability…
  → oat-phase-implementer + oat-reviewer: {available | authorization required | not resolved}
  → Selected: Tier {1 | 2} — {Subagents | Inline}
  → Reason: {authorized | available without auth | user declined delegation | spawn_agent unavailable | required agent role unresolved}
```

Do not print `[0/N]` for this preflight step. The implementation denominator is not established by capability detection; use the literal `[preflight]` label above.

**Hard pre-work guard:** before any code edit, test run, or implementation commit, print the selected tier and reason. If Tier 2 is selected, the reason must be one of the three allowed Tier 2 reasons above. Do not run tests, edit files, or create implementation commits until Step 0.5 has completed and the tier report has been printed.

**Tier is locked for the remainder of the run.** Subsequent phase implementation and review dispatches use the same tier. No mid-run re-evaluation or downgrade unless the user explicitly asks to change execution mode.

**Recovery if Step 0.5 was skipped:** If implementation work has already started inline before completing Step 0.5, STOP immediately. Preserve any work in progress, complete or revert to a clean task boundary, and re-run Step 0.5 before continuing. Do not silently continue in Tier 2.

**Codex authorization example:**

```
User invokes: $oat-project-implement
Detected: Codex multi-agent support available; explicit authorization required.
Expected: ask "This OAT implementation skill normally delegates phase implementation and review to subagents. Authorize subagent delegation for this run?"
If approved: Selected: Tier 1 — Subagents
Forbidden: Selected: Tier 2 — Inline because the user did not separately mention subagents.
```

**Legacy state migration:** If `state.md` contains `oat_execution_mode: subagent-driven`, silently ignore it. On the next bookkeeping write, remove that key. Do not redirect to `oat-project-subagent-implement` — that skill is deprecated.

### Dispatch Ceiling Preflight

Before any phase work, resolve and print the OAT dispatch ceiling. This is a
preflight gate, not a mid-run question.

Use the CLI resolver as the source of truth:

```bash
oat project dispatch-ceiling resolve --provider <active-provider> --preflight --json
```

If `oat` is not in PATH, use:

```bash
pnpm run cli -- project dispatch-ceiling resolve --provider <active-provider> --preflight --json
```

Resolution order:

1. Config keys `workflow.dispatchCeiling.providers.<provider>` (local > shared > user)
2. Project `state.md` frontmatter key `oat_dispatch_ceiling`
3. Interactive implementation preflight prompt (below)
4. Non-interactive unresolved: block before work starts

**JSON response shape** (from `--json`):

```json
{
  "status": "resolved",
  "provider": "codex",
  "value": "high",
  "source": "project-state",
  "preset": "balanced",
  "unresolved": false,
  "providerDefaultEffort": "medium",
  "providers": {
    "codex": {
      "value": "high",
      "mode": "enforced",
      "mechanism": "pinned-variant",
      "dispatchArgs": { "variant": "oat-phase-implementer-high" },
      "verifyOnDispatch": false
    }
  }
}
```

Read `providers.<active-provider>` for the concrete dispatch controls. The
`dispatchArgs` field carries the provider-specific argument to pass through
(Codex: `variant` name; Claude: `model` string). Never re-derive these from the
preset label — the resolver is the single compilation/join point.

Print before phase work:

```text
Dispatch ceiling: high (codex, enforced — pinned-variant)
Source: project state  |  Preset: balanced
Provider default effort: medium
Note: OAT will use pinned subagent variants up to high. Base/unpinned roles resolve through the provider default.
```

If no ceiling resolves and the session is interactive, present the preset
prompt once before starting work:

```text
No dispatch ceiling is configured for this project.

Set the dispatch ceiling — the maximum subagent tier OAT may use.

  1. Balanced (recommended) — Codex: high · Claude: sonnet
  2. Maximum                — Codex: xhigh · Claude: opus  (reviews always run at this tier)
  3. Cost-conscious         — Codex: medium · Claude: sonnet
  4. Advanced — set per provider
  5. No ceiling

OAT applies this where the provider exposes a reliable mechanism (Codex: pinned
variants; Claude: Task model parameter). Other providers may treat it as advisory.
```

**Preset selection** persists `preset` + compiled per-provider values. On
selection, print the exact compiled result (e.g., "Ceiling set: balanced →
Codex: high · Claude: sonnet") before proceeding.

**Advanced (option 4)** prompts for each provider's value individually, then
persists `providers` + `source` only — no `preset` key.

**No ceiling (option 5)** leaves `oat_dispatch_ceiling` unset; implementer
subagents run at provider defaults.

Persist in project `state.md` frontmatter using the normalized shape:

```yaml
oat_dispatch_ceiling:
  preset: balanced # omit when Advanced was chosen
  providers:
    codex: high
    claude: sonnet
  source: project-state
```

If no ceiling resolves and `OAT_NON_INTERACTIVE=1` or no user-response channel
exists, rerun the resolver with non-interactive behavior and stop before work
starts if it blocks:

```bash
oat project dispatch-ceiling resolve --provider <active-provider> --preflight --non-interactive
```

```text
BLOCKED: Codex dispatch ceiling is unresolved in non-interactive mode.
Set workflow.dispatchCeiling.providers.codex in .oat/config.json or oat_dispatch_ceiling in project state.
```

Dry-run mode must report the unresolved ceiling and planned behavior without
modifying project state.

### Runtime dispatch selection

Before each phase implementation, fix, or review dispatch, choose and log the
runtime dispatch controls. This is separate from Tier 1/Tier 2 execution mode:
Tier 1/Tier 2 decides whether OAT uses subagents or inline fallback; runtime
dispatch selection decides model/effort controls for the specific work.

Use these inputs:

- resolved dispatch ceiling and source
- phase ID and phase scope
- optional `## Dispatch Profile` row in `plan.md`
- host-exposed provider controls, by axis
- prior outcomes for the phase, including review results and failed retries

Axis states:

- `selected:<value>` - host exposes the axis and the orchestrator chose a value.
- `provider-default` - Codex base/unpinned role follows configured/provider default effort.
- `inherited` - host/API explicitly inherits the parent setting and OAT can trust that behavior.
- `not-applicable` - this host/API has no meaningful per-dispatch concept for that axis.
- `host-auto` - exceptional; the host uses that axis internally but OAT cannot read or pin it.

Codex rules:

1. Codex effort order is `low < medium < high < xhigh`.
2. Classify preferred effort from scope:
   - `low`: trivial docs-only, narrow single-file, or mechanical changes
   - `medium`: normal multi-file implementation and moderate integration risk
   - `high`: broad architecture, security/auth/redaction boundaries, subtle state behavior, or repeated substantive review failures
   - `xhigh`: highest-risk work that requires the configured ceiling to allow xhigh
3. Selected effort is `min(preferred, resolved_ceiling)` for implementer/fix work.
4. For implementer/fix dispatch: call `oat project dispatch-ceiling resolve --provider codex --role implementer`; read `providers.codex.dispatchArgs.variant` for the role name (e.g., `oat-phase-implementer-high`). Pass that variant name directly — do not re-derive it from the ceiling value.
5. For review dispatch: call `oat project dispatch-ceiling resolve --provider codex --role reviewer`; read `providers.codex.dispatchArgs.variant` for the reviewer role name (e.g., `oat-reviewer-high`). Reviewer always targets the ceiling for deterministic quality gate behavior.
6. Use base/unpinned Codex roles only as a fallback or explicit provider-default choice. Log `Selected effort: provider-default`, display provider default effort when known, and do not describe this as parent-ceiling inheritance.
7. Do not use top-level per-call `reasoning_effort` as the standard OAT selected-effort path; dogfooding showed that path can be inconsistent.

Claude rules:

- Claude ceiling is model-based: `haiku < sonnet < opus`.
- Implementer dispatch: select the lowest sufficient model capped by the resolved Claude ceiling (`min(preferred, ceiling)`).
- Review dispatch: target the resolved Claude ceiling directly.
- Call `oat project dispatch-ceiling resolve --provider claude --role implementer --orchestrator-tier <current-orchestrator-tier>` (or `--role reviewer`); read `providers.claude.dispatchArgs.model` for the model string to pass. Pass `--orchestrator-tier` so the resolver can flag above-orchestrator upgrade requests and set `verifyOnDispatch` correctly.
- Pass `model: "<value>"` when `model_axis=selected:<value>` on the Task tool call.
- Keep `effort_axis=not-applicable`; Claude Code has no separate per-dispatch effort axis.

Payload-first invariant:

- Build the actual host dispatch argument map before logging.
- Do not emit `selected:<value>` unless the host invocation contains the corresponding role/model selection.
- Derive `Dispatch target` and `Effort axis` / `Model axis` from the payload.

Structured dispatch log:

```text
OAT Dispatch: Phase {phase_id} {implementation | fix | review}
Host: {Claude Code | Codex | Cursor | other host}
Preferred effort: {low | medium | high | xhigh | not-applicable}
Dispatch ceiling: {resolved ceiling value}
Selected effort: {low | medium | high | xhigh | provider-default | not-applicable}
Ceiling source: {repo config | project state | preflight prompt}
Provider default effort: {value | unknown | not-applicable}
Model axis: { selected:<value> | inherited | not-applicable | host-auto }
Effort axis: { selected:<value> | provider-default | inherited | not-applicable | host-auto }
Dispatch target: {host-specific subagent/role/tool target}
Rationale: {short rationale grounded in phase scope and any ceiling cap}
```

Codex capped example:

```text
OAT Dispatch: Phase p02 implementation
Host: Codex
Preferred effort: high
Dispatch ceiling: medium
Selected effort: medium
Ceiling source: repo config
Provider default effort: high
Model axis: inherited
Effort axis: selected:medium
Dispatch target: oat-phase-implementer-medium
Rationale: normal multi-file implementation; high preferred due to integration risk, capped by configured ceiling.
```

Codex reviewer example:

```text
OAT Dispatch: Phase p02 review
Host: Codex
Preferred effort: high
Dispatch ceiling: high
Selected effort: high
Ceiling source: project state
Provider default effort: medium
Model axis: inherited
Effort axis: selected:high
Dispatch target: oat-reviewer-high
Rationale: reviewer runs at the configured ceiling for deterministic quality gate behavior.
```

Codex base/unpinned fallback example:

```text
OAT Dispatch: Phase p02 review
Host: Codex
Preferred effort: provider-default
Dispatch ceiling: high
Selected effort: provider-default
Ceiling source: project state
Provider default effort: medium
Model axis: inherited
Effort axis: provider-default
Dispatch target: oat-reviewer
Rationale: base unpinned role fallback; effective effort follows Codex provider default.
```

Include resolved dispatch context in scope packets when known:

```yaml
model_axis: { selected:<value> | inherited | not-applicable | host-auto }
effort_axis:
  {
    selected:<value> | provider-default | inherited | not-applicable | host-auto,
  }
dispatch_ceiling: { resolved ceiling value }
ceiling_source: { repo config | project state | preflight prompt }
provider_default_effort: { value | unknown | not-applicable }
dispatch_rationale: { short rationale }
```

### Dispatch Ceiling Enforcement Log

After each phase dispatch (implementation, fix, or review), append one enforcement
log line. The log reflects the `mode` and `mechanism` returned by
`oat project dispatch-ceiling resolve` — do not compute these yourself.

**Three-state log format:**

```text
Dispatch ceiling: {value} ({provider}, {mode} — {mechanism detail})
```

**Log examples (matching resolver output):**

```text
Dispatch ceiling: high (codex, enforced — variant oat-phase-implementer-high)
Dispatch ceiling: high (codex, enforced — variant oat-reviewer-high)
Dispatch ceiling: sonnet (claude, enforced — Task model arg)
Dispatch ceiling: opus (claude, enforced — Task model arg)
Dispatch ceiling: high (cursor, unsupported — no adapter; informational)
Dispatch ceiling: unresolved (codex, advisory — ceiling set but no value resolved)
```

**Verify-on-upgrade (`verifyOnDispatch: true`):**

When the resolver returns `providers.<provider>.verifyOnDispatch: true`, the
requested tier is above the orchestrator tier (an upgrade request). Before
logging `enforced`, confirm the actual model/tier used by the dispatched agent.
If the provider honored the request, log `enforced`. If it did not:

```text
Dispatch ceiling: opus (claude, advisory — provider did not honor upgrade; ran sonnet)
```

**`enforced`** — the adapter compiled concrete dispatch args and the provider
accepted them. Log value + provider + mechanism detail (variant name or "Task
model arg").

**`advisory`** — the adapter supports the ceiling but no concrete value resolved,
or the provider is known but could not be verified. Log with note "ceiling set
but no value resolved" or "provider did not honor upgrade; ran \<tier\>".

**`unsupported`** — the provider has no registered adapter. Log with note "no
adapter; informational". Never block on unsupported — dispatch follows provider
defaults.

### Dry-Run Mode

When the skill is invoked with `--dry-run`:

1. Perform Steps 0–2 fully (resolve project, capability detection, read plan, validate metadata, build schedule).
2. Skip all phase dispatches, merges, and artifact writes.
3. Output the execution plan:

   ```
   OAT ▸ IMPLEMENT (dry-run)

   Project:   {PROJECT_PATH}
   Tier:      {1 | 2}
   Retry:     {N}

   Schedule:
     [1] p01 (sequential)
     [2] p02, p03 (parallel group, worktrees)
     [3] p04 (sequential)

   Worktrees that would be created:
     - {project-name}/p02
     - {project-name}/p03

   No commits, no artifact writes.
   ```

4. Exit without modifying any files.

### Step 1: Check Plan Complete

```bash
cat "$PROJECT_PATH/plan.md" | head -10 | grep "oat_status:"
```

**Required frontmatter:**

- `oat_status: complete`
- `oat_ready_for: oat-project-implement`

**If not complete:** Block and ask user to finish plan first.

### Step 1.5: Resumption Detection

If `{PROJECT_PATH}/implementation.md` already contains orchestration run entries, we may be resuming an interrupted run.

1. Read `implementation.md` and find the most recent `### Run N` entry.
2. Compare its phases-passed / phases-failed / phases-stopped counts against the plan's phase list.
3. If there are phases in the plan that are not yet covered by any run entry, those are the resume targets.
4. Read `state.md` for `oat_current_task` to cross-check the expected resume point.
5. Read `git log` to verify the most recent bookkeeping commit matches the last reported state.

**Detected state reconciliation:**

- If there is an in-flight phase (implementer committed but no review verdict in implementation.md), re-dispatch the reviewer for that phase's current HEAD.
- If there are un-cleaned worktrees from a prior parallel group, list them and ask the user whether to resume or clean up:

  ```
  Found un-cleaned worktrees from a prior run:
    - ../worktrees/{name}/p02 — verdict was: excluded
    - ../worktrees/{name}/p03 — verdict was: pass, not merged

  Resume (merge pending verdicts into orchestration branch) or clean up?
  ```

6. Once resume target is identified, continue from that phase with the normal per-phase flow.

**On first-ever invocation** (no prior run entries), skip resumption detection and proceed to Step 2.

### Step 2: Read Plan Document

Read `"$PROJECT_PATH/plan.md"` completely to understand:

- All phases and tasks
- File changes per task
- Verification commands
- Commit messages

### Step 2.1: Validate Parallelism Metadata

Invoke the CLI validator to check plan.md parallelism metadata:

```bash
oat project validate-plan --project-path "${PROJECT_PATH}"
```

(If `oat` is not in PATH, use: `pnpm run cli -- project validate-plan --project-path "${PROJECT_PATH}"`)

The command validates:

- `oat_plan_parallel_groups` is either missing / empty (meaning fully sequential, no check needed) or a nested array of phase ID strings.
- Every referenced phase ID exists in the plan.
- No phase ID appears in more than one group.
- No singleton groups (each group must contain at least 2 phases).

**Reactions:**

- Exit code 0 → validation passed; continue to Step 2.2.
- Non-zero exit code → STOP immediately. Surface the validator's stderr output to the user. Do not silently fall back to sequential — the plan must be fixed first.

The validation contract is enforced by the CLI command and unit-tested there; the skill is just the consumer.

### Step 2.2: Build Execution Schedule

From the phase list and the validated parallel groups, build an execution schedule:

- Phases not listed in any group form singleton entries (run sequentially).
- Each parallel group forms a multi-phase entry (run concurrently in worktrees).
- Schedule entries execute in plan order.

Example:

- Plan phases: p01, p02, p03, p04, p05
- `oat_plan_parallel_groups: [["p02", "p03"], ["p04", "p05"]]`
- Schedule: `[p01]` → `[p02, p03]` (group) → `[p04, p05]` (group)

### Step 2.5: Confirm Plan HiLL Checkpoints

Read `oat_plan_hill_phases` from `"$PROJECT_PATH/plan.md"` frontmatter when present and validate it.

- **Valid format:** JSON-like array of phase IDs (e.g., `["p01","p03"]`)
- **Allowed pre-confirmation state:** field missing entirely on the first implementation run
- **Invalid format examples:** scalar string, malformed array, unknown phase IDs

Determine whether this is a first implementation run:

- If `"$PROJECT_PATH/implementation.md"` does not exist, treat as first run.
- If it exists but still has template placeholders and no completed task evidence, treat as first run.

#### Workflow preference check (before prompting)

Before presenting the checkpoint prompt to the user, check if a workflow preference has been configured:

```bash
HILL_DEFAULT=$(oat config get workflow.hillCheckpointDefault 2>/dev/null || true)
```

- **If `HILL_DEFAULT` is `every`:** Skip the prompt. Write `oat_plan_hill_phases: []` to plan.md frontmatter. Print: `HiLL checkpoints: every phase (from workflow.hillCheckpointDefault)`. Continue to Touchpoint A.
- **If `HILL_DEFAULT` is `final`:** Skip the prompt. Determine the final phase ID from plan.md (e.g., `p05`) and write `oat_plan_hill_phases: ["<final_phase_id>"]` to plan.md frontmatter. Print: `HiLL checkpoints: final phase only (from workflow.hillCheckpointDefault)`. Continue to Touchpoint A.
- **If unset, empty, or invalid:** Fall through to the standard prompt behavior below.

This preference check only applies on first runs — resuming implementations should trust the existing `oat_plan_hill_phases` value in plan.md (or repair as bookkeeping drift).

Prompt behavior:

- **If first run:** always present a complete phase-by-phase summary and confirm checkpoint phases before any task execution. A missing `oat_plan_hill_phases` value is the normal unconfirmed state; if a value is already present, treat it as a provisional value to confirm rather than as final.
- **If resuming and `oat_plan_hill_phases` is valid:** do not re-ask; print active checkpoint config and continue.
- **If resuming and `oat_plan_hill_phases` is missing/invalid:** treat this as bookkeeping drift, because implementation should already have written the confirmed value before prior task execution. Ask the user to repair the checkpoint configuration before continuing.

Required prompt shape for first-run confirmation:

1. Open with plan framing:
   - `This plan has {phase_count} phases. Final phase: {final_phase_id}.`
2. Briefly summarize every plan phase in order:
   - `p01 — {short phase summary}`
   - `p02 — {short phase summary}`
   - ...
   - Never omit this summary, even if the plan has only one phase or `oat_plan_hill_phases` already contains a provisional value.
3. Ask the checkpoint question using exactly three options:
   - `Which checkpoint behavior do you want?`
   - `1. Stop after each phase (default)`
   - `2. Stop after specific phases, e.g. p02, p05`
   - `3. Stop only after the final phase is completed`
4. Map the options to stored values:
   - `1` -> `[]`
   - `2` -> user-specified array such as `["p02","p05"]`
   - `3` -> `["p07"]` (replace `p07` with the actual final phase ID for this plan)
5. If a provisional `oat_plan_hill_phases` value already exists, mention it after presenting the three options, but still require the user to choose or confirm one of them.

When user confirms/changes:

- Update `"$PROJECT_PATH/plan.md"` frontmatter `oat_plan_hill_phases` to the confirmed value before executing tasks.
- Keep the value stable for the rest of the run unless the user explicitly requests a change.

#### Auto-Review at HiLL Checkpoints (Touchpoint A)

After checkpoint behavior is confirmed, resolve auto-review preference:

1. Read `workflow.autoReviewAtHillCheckpoints` via `oat config get workflow.autoReviewAtHillCheckpoints`. This uses local > shared > user resolution and falls back to legacy `.oat/config.json` `autoReviewAtCheckpoints` when the workflow key is unset.
2. **If config explicitly `true`:** Skip the prompt. Write `oat_auto_review_at_hill_checkpoints: true` to plan.md frontmatter. Print: "Auto-review at HiLL checkpoints: enabled (from workflow.autoReviewAtHillCheckpoints)."
3. **If config explicitly `false`:** Skip the prompt. Write `oat_auto_review_at_hill_checkpoints: false` to plan.md frontmatter. Print: "Auto-review at HiLL checkpoints: disabled (from workflow.autoReviewAtHillCheckpoints)."
4. **If config is unset:** Add one question after the checkpoint choice:
   ```
   4. Auto-review at HiLL checkpoints?
      - yes: automatically run the lifecycle review when a HiLL checkpoint phase completes
      - no (default): manual lifecycle review triggering
   ```
5. Write `oat_auto_review_at_hill_checkpoints: true|false` to plan.md frontmatter alongside `oat_plan_hill_phases`.

This setting controls only the extra `oat-project-review-provide` lifecycle review at HiLL checkpoints. It does not control Tier 1 phase gate reviews; Tier 1 always runs `oat-reviewer` after each phase.

**On resume:** If `oat_auto_review_at_hill_checkpoints` is already present in plan.md frontmatter, skip Touchpoint A entirely — do not re-ask, do not re-read config, do not print the auto-review note. The stored value is authoritative. If only legacy `oat_auto_review_at_checkpoints` is present, treat it as authoritative for this run and write the new `oat_auto_review_at_hill_checkpoints` key on the next plan frontmatter update.

### Step 3: Check Implementation State

Check if implementation already started:

```bash
cat "$PROJECT_PATH/implementation.md" 2>/dev/null | head -20
```

**If exists and has progress:**

- Read `oat_current_task_id` from frontmatter (e.g., "p01-t03" or "prev1-t01")
- **Revision task recognition:** `p-revN` phases and `prevN-tNN` task IDs are treated identically to standard `pNN` phases and `pNN-tNN` tasks for execution purposes. The implement skill does not need special handling — it just follows the plan sequentially.
- Validate the task pointer:
  - If `oat_current_task_id` points at a task already marked `completed` in the body, advance to the **next incomplete** task (first `pending` / `in_progress` / `blocked` entry).
  - If all tasks are completed, skip ahead to finalization (Step 11+).
- **Always resume** from the resolved task. Print `Resuming from {task_id}.` Do not prompt.
- **Fresh start is an explicit override only.** If the user invoked the skill with `fresh=true` (argument), warn `Starting fresh — this will overwrite implementation.md. Any draft logs will be lost.` and proceed with fresh initialization. Do not offer fresh start interactively; it is a rare edge case reserved for corrupt state or deliberate plan rewrites.

**Stale-state reconciliation (approval required):**

- Before executing tasks, cross-check `plan.md` Reviews status with `implementation.md` + `state.md`.
- If `plan.md` shows a scope as `passed` but `implementation.md` / `state.md` still says "awaiting re-review" (or leaves `oat_current_task_id` / `oat_current_task` as `null` while future plan tasks are still incomplete), treat this as bookkeeping drift.
- Resolve the next task from plan order (first incomplete non-review task after the passed scope), then ask:
  - "Detected bookkeeping drift: review is passed in plan.md, but state artifacts still show awaiting re-review. Update artifacts and continue from {next_task_id}?"
- Only if the user approves:
  - Update `implementation.md` frontmatter `oat_current_task_id: {next_task_id}`
  - Update `state.md` frontmatter `oat_current_task: {next_task_id}` and refresh stale "awaiting re-review" wording
  - Update implementation review notes "Next" guidance to continue implementation (not re-review)
- If the user declines:
  - Do not auto-edit bookkeeping; pause and ask whether to proceed manually or stop.

**If doesn't exist:**

- Initialize from template (Step 4)

**Important:** Never overwrite an existing `implementation.md` without explicit user confirmation (and warn that draft logs will be lost).

### Step 4: Initialize Implementation Document

Copy template: `.oat/templates/implementation.md` → `"$PROJECT_PATH/implementation.md"`

Update frontmatter:

```yaml
---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: { today }
oat_current_task_id: p01-t01 # Stable task ID from plan
---
```

Initialize project state so other skills (e.g., `oat-project-progress`) reflect that implementation has started:

- In `"$PROJECT_PATH/state.md"` frontmatter:
  - `oat_phase: implement`
  - `oat_phase_status: in_progress`
  - `oat_current_task: p01-t01`
  - `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

### Step 5: Per-Phase Execution

For each phase `pNN` in the plan (or each phase in the current parallel group), the orchestrator dispatches phase-level work as follows.

**Tier 1 dispatch (native subagents):**

1. Build the Phase Scope block:

   ```
   project: {PROJECT_PATH}
   phase: {pNN}
   mode: implement
   artifact_paths:
     plan: {PROJECT_PATH}/plan.md
     design: {PROJECT_PATH}/design.md
     spec: {PROJECT_PATH}/spec.md
     implementation: {PROJECT_PATH}/implementation.md
     discovery: {PROJECT_PATH}/discovery.md
   delta_recording: record any intentional divergence from spec/design/plan in implementation.md with rationale, source of truth, and follow-up artifact disposition
   commit_convention: {from plan.md header}
   workflow_mode: {from state.md or plan.md frontmatter}
   model_axis: {selected:<value> | inherited | not-applicable | host-auto; omit if unknown}
   effort_axis: {selected:<value> | provider-default | inherited | not-applicable | host-auto; omit if unknown}
   dispatch_ceiling: {resolved ceiling value; omit if unknown}
   ceiling_source: {repo config | project state | preflight prompt; omit if unknown}
   provider_default_effort: {value | unknown | not-applicable; omit if unknown}
   dispatch_rationale: {short rationale; omit if unknown}
   ```

2. Perform a pre-dispatch assertion against the host invocation parameters. The Phase Scope fields are audit/context fields; selected axes must also be represented in the actual host dispatch call.
   - Codex implementer/fix dispatch:
     - Before building the `spawn_agent` argument map, classify the phase complexity and choose preferred effort (`low`, `medium`, `high`, or `xhigh`), then cap it to the resolved Codex dispatch ceiling.
     - Build the `spawn_agent` argument map before logging the dispatch. If `effort_axis=selected:low|medium|high|xhigh`, the argument map MUST use the matching `agent_type`: `"oat-phase-implementer-low"`, `"oat-phase-implementer-medium"`, `"oat-phase-implementer-high"`, or `"oat-phase-implementer-xhigh"`. Then derive the `OAT Dispatch:` block `Effort axis:` field from that same argument map.
     - Example selected low payload shape: `agent_type: "oat-phase-implementer-low"` and a Phase Scope message containing `effort_axis: selected:low`.
     - Immediately after spawning, compare the returned Codex status line with the selected effort before waiting on the agent. If the spawned status reports a different effort than the selected value (for example, the log says `effort_axis=selected:medium` but the spawn result reports `gpt-5.5 high`), treat this as an orchestration deviation. Stop, record the deviation in `implementation.md`, and redispatch with corrected parameters before continuing. Do not use work from the mismatched dispatch.
     - If `effort_axis=provider-default`, use base `agent_type: "oat-phase-implementer"` and omit `reasoning_effort`. The dispatch rationale MUST say this is a base/unpinned fallback and include provider default effort when known.
   - Claude Code implementer/fix dispatch:
     - If `model_axis=selected:<value>`, the Task tool call MUST include `model: "<value>"`.
     - If `model_axis=inherited`, omit `model`.

3. Dispatch the selected implementer role (Tier 1 via provider-native subagent mechanism) — the role asserted in the pre-dispatch step above (e.g., `oat-phase-implementer-low`, `oat-phase-implementer-medium`, `oat-phase-implementer-high`, `oat-phase-implementer-xhigh`, or base `oat-phase-implementer` only for provider-default fallback) — with the Phase Scope block as input and with the asserted host invocation parameters.

4. Receive the structured summary (DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED).

**Tier 2 dispatch (inline fallback):**

If Tier 2 is selected, do not dispatch. Instead:

1. Read `.agents/agents/oat-phase-implementer.md` for the phase-execution process.
2. Execute that process yourself against the same Phase Scope.
3. Produce an equivalent summary in your own context.

#### Handling Implementer Status

- **DONE:** Proceed to phase review (Step below).
- **DONE_WITH_CONCERNS:** Read the concerns block. If any concern is correctness-related (bug, wrong behavior, missing requirement), address it before review — re-dispatch implementer with a targeted fix instruction. If concerns are advisory (e.g., "this file is getting large"), note them in `implementation.md` and proceed to review.
- **NEEDS_CONTEXT:** Provide the missing context (usually an artifact path or a cross-phase reference) and re-dispatch. This counts toward the retry limit.
- **BLOCKED:** STOP the run. Surface the block to the user with:
  - Phase ID
  - What the implementer reported as blocking
  - Recommended next step (plan fix, external resolution, user guidance)
    Do not proceed to subsequent phases while a phase is blocked.

#### Confidence-Based Dispatch Escalation

Escalate the runtime dispatch control when there is evidence that the current control is underpowered:

- implementer reports low confidence
- implementer reports a reasoning or capability blockage
- the same phase fails substantive review twice
- the fix loop repeats the same class of error

When escalation is needed:

1. If a stronger available control exists, re-dispatch at the next stronger control and include the reason in the scope packet. The escalation ladder is provider-specific:
   - **Codex:** `selected:low -> selected:medium -> selected:high -> selected:xhigh`, capped by the resolved Codex dispatch ceiling.
   - **Claude Code:** `selected:haiku -> selected:sonnet -> selected:opus`, capped by the resolved Claude dispatch ceiling.
2. Count the escalation redispatch against the existing bounded retry budget. Escalation changes the control; it does not create extra retry attempts.
3. Record a compact note in `implementation.md` when practical:
   - `Dispatch: p03 escalated to model_axis=selected:opus, effort_axis=not-applicable after repeated review failures.` (Claude Code)
   - `Dispatch: p03 escalated to effort_axis=selected:high, model_axis=inherited after repeated review failures.` (Codex)
   - `Dispatch: p02 remained model_axis=host-auto, effort_axis=host-auto; no explicit stronger control is exposed by this host.`
4. If the phase is already at the strongest available control, do not invent a stronger tier. Provide more context, split the phase, revise the plan, or stop for user direction.

#### Dispatch Retry (Transient Failures)

If a Tier 1 dispatch fails (agent did not resolve, returned empty, etc.), retry exactly once. If the second attempt also fails, treat the phase as `failed` via the same mechanism as fix-loop retry exhaustion (see Step 7 below). Tier is never silently downgraded.

### Per-Phase Review

After the implementer returns DONE (or DONE_WITH_CONCERNS without correctness concerns), dispatch the reviewer for the phase.

**Dispatch:**

- Use the same tier that was selected at start.
- For Codex, dispatch the reviewer variant matching the resolved ceiling (`oat-reviewer-low|medium|high|xhigh`) for deterministic quality gates.
- For Claude Code, cap any selected review model by the resolved Claude ceiling and keep `effort_axis=not-applicable`.
- Tier 1: dispatch the selected reviewer target via provider-native subagent mechanism with Review Scope:

  ```
  project: {PROJECT_PATH}
  type: code
  scope: {pNN}
  commits: {base_sha}..{head_sha}
  files_changed: {optional hint from implementer's report}
  workflow_mode: {from state.md}
  artifact_paths: {same as Phase Scope}
  tasks_in_scope: {list of pNN-tNN IDs in the phase}
  dispatch_ceiling: {resolved ceiling value}
  ceiling_source: {repo config | project state | preflight prompt}
  provider_default_effort: {value | unknown | not-applicable}
  model_axis: inherited
  effort_axis: selected:{resolved Codex ceiling}   # on Codex; use not-applicable on Claude Code
  dispatch_rationale: reviewer runs at the configured ceiling for deterministic quality gate behavior
  ```

  - For Codex Tier 1 dispatches, send the Review Scope block as a self-contained packet and keep fresh context (`fork_context: false`). The reviewer is expected to reconstruct context from git state and the OAT artifacts listed above.
  - For Codex Tier 1 review dispatches, use `agent_type: "oat-reviewer-low|medium|high|xhigh"` matching the resolved ceiling. Use base `oat-reviewer` only as a provider-default fallback and log `effort_axis=provider-default`. For Claude Code review dispatches, do not pass a per-review effort override because the effort axis is not applicable; if selecting a model, cap it by the resolved Claude ceiling.
  - Treat the commit range as authoritative for review scope. `files_changed` is optional orientation metadata only.
  - If a Codex reviewer does not return a terminal result on the first wait, poll once more. If it still has not concluded, send one concise nudge to return immediately with current findings. If the reviewer still does not conclude, treat the Tier 1 review dispatch as failed for this phase and perform the review inline instead of waiting indefinitely.

- Tier 2: inline — read `.agents/agents/oat-reviewer.md` and perform the review yourself.

**Verdict outcomes:**

Parse the reviewer's confirmation for verdict + finding severities. Map to pass / fail:

- **pass:** zero Critical and zero Important findings.
- **fail:** one or more Critical or Important findings.

Medium / Minor findings do not block the phase but are recorded.

#### Bounded Fix Loop

On reviewer verdict `fail`, run a bounded fix loop.

1. Read `oat_orchestration_retry_limit` from `state.md` frontmatter (default: `2`, range 0–5).
2. For each retry (up to the limit):
   a. Select/log fix dispatch axes from the fix scope, then perform the same pre-dispatch assertion used for implementation dispatch. A Codex fix dispatch with `effort_axis=selected:low|medium|high|xhigh` MUST use matching `agent_type: "oat-phase-implementer-low|medium|high|xhigh"`; a Claude Code fix dispatch with `model_axis=selected:<value>` MUST pass `model: "<value>"` on the Task call.
   b. Dispatch the selected phase implementer role in `fix` mode (Tier 1) OR read the agent and apply fixes inline (Tier 2), with: - `review_artifact`: the path written by the reviewer - `findings`: the Critical + Important findings list - `prior_summary`: the last implementer summary
   c. Receive the fix summary.
   d. Re-dispatch the reviewer with the updated commit range.
   e. Parse the new verdict.
   f. If pass → exit the loop successfully.
   g. If fail and retries remain → continue.
   h. If fail and retries exhausted → exit the loop with terminal verdict `failed`.

**Terminal `failed` handling:**

- **Sequential mode:** STOP the run. Surface to user with phase ID, unresolved findings, review artifact path. Do not proceed to subsequent phases.
- **Parallel group mode:** mark the phase `excluded`. Do not merge its worktree. Continue the remaining phases in the group. Report in Outstanding Items after the group completes.

### Parallel Group Execution

When the current schedule entry is a multi-phase group, execute as follows.

**Tier 2 degradation:** If Tier 2 was selected at skill start, Tier 2 cannot run concurrent subagents. Degrade the entire group to sequential inline execution — run each phase in the group sequentially on the orchestration branch. Do not create worktrees. Proceed through the per-phase loop (dispatch / review / fix-loop / bookkeeping) for each phase in plan order.

**Tier 1 parallel execution:**

1.  **Bootstrap worktrees:** for each phase in the group, invoke `oat-worktree-bootstrap-auto` with branch name `{project-name}/{pNN}` and base = orchestration branch.

    > ⚠️ **CRITICAL — DO NOT substitute host-native worktree primitives.** Bootstrap MUST go through `oat-worktree-bootstrap-auto` with an explicit `--base` set to the current orchestration branch HEAD (capture `EXPECTED_HEAD=$(git rev-parse HEAD)` from the orchestration cwd before dispatching). Do not use Claude Code's `Agent({ isolation: "worktree" })`, Cursor's equivalent, or any other host-native isolation primitive in lieu of this skill — those mechanisms may use the primary repo's checkout (often `main`) as the base regardless of the orchestrator's current branch, silently producing a worktree that cannot see prior phase commits and forcing the entire group to degrade to sequential.
    - If **any** bootstrap fails, cancel any worktrees that bootstrapped successfully for this group and degrade the whole group to sequential inline execution. Log the degradation reason to `implementation.md` Outstanding Items.

2.  **Verify worktree HEAD before dispatch (base-mismatch gate):** After bootstrap, verify each worktree is at the expected orchestration HEAD. From the orchestration cwd, capture `EXPECTED_HEAD=$(git rev-parse HEAD)` _before_ invoking bootstrap. After bootstrap, for each new worktree path, run `git -C {worktree-path} rev-parse HEAD` and confirm it matches `EXPECTED_HEAD`, or run `git -C {worktree-path} merge-base --is-ancestor "$EXPECTED_HEAD" HEAD` and confirm it succeeds (exit 0). If either check fails for any phase, treat the bootstrap as failed for that phase, cancel any successful sibling worktrees in this group, and degrade the entire group to sequential inline execution — same mechanism as a primary bootstrap failure. Log the mismatch to `implementation.md` Outstanding Items, including the observed and expected SHAs (`expected={EXPECTED_HEAD}, observed={observed-head-sha}, phase={pNN}, worktree={path}`).

3.  **Concurrent dispatch:** for each successfully bootstrapped worktree (passing the base-mismatch gate above), dispatch `oat-phase-implementer` (with the worktree as working directory) concurrently. Each dispatch runs the per-phase loop internally (implementer → reviewer → fix-loop).

4.  **Wait for all phases:** do not proceed until every phase in the group reports a terminal verdict (pass or excluded).

5.  **Fan-in reconciliation (merge back in plan order):**

    For each phase in the group, in plan order (p02 before p03, etc.), if its verdict is pass:

    a. Attempt `git merge --no-ff {project-name}/{pNN} -m "merge({pNN}): {summary from implementer}"`.
    b. If merge produces conflicts, abort the merge and attempt cherry-pick of the phase's commits.
    c. If cherry-pick also produces conflicts, dispatch an inline conflict-resolution subagent via the Task tool. The orchestrator MUST NOT read the conflicted files itself — delegate to the subagent. Use this dispatch shape:

        ```
        Task (general-purpose subagent):
          description: "Resolve merge conflict for phase {pNN}"
          prompt: |
            You are resolving a git merge conflict during parallel-phase fan-in.

            Phase: {pNN}
            Orchestration branch: {orchestration-branch}
            Worktree: {worktree-path}
            Conflicted files: {list from git status}
            Project artifacts:
              plan:   {PROJECT_PATH}/plan.md
              design: {PROJECT_PATH}/design.md
              spec:   {PROJECT_PATH}/spec.md

            Steps:
            1. Read each conflicted file. Parse conflict markers (<<<<<<<, =======, >>>>>>>).
            2. Read the project artifacts to understand intent from both sides.
            3. Apply a resolution that preserves intent from both sides where possible.
            4. Remove conflict markers. Save files.
            5. Stage resolved files with `git add <files>`.
            6. Run integration verification: `pnpm test && pnpm lint && pnpm type-check`.
            7. If all pass: commit with `merge({pNN}): resolved conflict during fan-in`.
            8. If any step fails: do NOT commit. Return with the appropriate status.

            Return format (end of response):
              status: RESOLVED | UNRESOLVABLE | VERIFICATION_FAILED
              reasoning: <2-4 sentence summary of what you did or why you stopped>
              commit: <sha if RESOLVED, else null>
        ```

    d. Parse the subagent's return status: - `RESOLVED` → subagent has committed the merge; orchestrator proceeds to integration verification (Step 6) and the next phase in the group. - `UNRESOLVABLE` or `VERIFICATION_FAILED` → STOP the run. Surface to user with phase ID, conflicting files, worktree path, subagent's reasoning summary. Do not merge remaining phases.

    **Tier 2 (inline) exception:** In Tier 2 runs, parallel groups already degrade to sequential, so fan-in conflicts don't arise from this code path. If a conflict ever surfaces in Tier 2 (e.g., from another operation), the orchestrator resolves inline since the whole run is already inline — consistent with Tier 2 semantics.

6.  **Integration verification after each merge:**

    After each successful merge, run project verification (tests, lint, type-check). If verification fails:
    - Attempt a tractable fix (missing import, trivial type error). If the fix succeeds and verification passes, commit the fix.
    - If the fix is not tractable → revert the merge, STOP the run. Surface to user.

7.  **Worktree cleanup:**

    For phases that merged successfully and passed integration verification, clean up the worktree using the existing worktree cleanup mechanism (e.g., `git worktree remove`).

    For phases that were excluded (fix-loop exhausted), preserve the worktree and log its path in `implementation.md` Outstanding Items.

8.  **Bookkeeping commit** after the group completes. Then HiLL checkpoint check.

### Step 7: Artifact Updates After Each Phase (or Group)

After each phase (sequential) or each parallel group (multi-phase) completes, update the tracking artifacts before moving on.

**`implementation.md`:**

Append a new entry to the `## Orchestration Runs` section between the `<!-- orchestration-runs-start -->` and `<!-- orchestration-runs-end -->` markers. Format:

```markdown
### Run {N} — {YYYY-MM-DD HH:MM}

**Branch:** {orchestration-branch}
**Tier:** {1 | 2}
**Policy:** merge-strategy=merge, retry-limit={N}
**Phases:** {N} executed, {N} passed, {N} failed, {N} stopped

#### Phase Outcomes

| Phase | Implementer | Review | Fix Iterations | Disposition |
| ----- | ----------- | ------ | -------------- | ----------- | ------- | -------- | -------- |
| pNN   | {status}    | {pass  | fail}          | N/{limit}   | {merged | excluded | stopped} |

#### Parallel Groups

- Group {N} [{phase list}]: worktree-based, merged in order
- {singleton phases}: sequential

#### Dispatch Notes

- Dispatch: {phase dispatch control and rationale, including escalation notes when applicable}

#### Outstanding Items

- {None | list of excluded phases with review paths and worktree paths}

#### Artifact / Design Deltas

Run-scoped snapshot only. The durable record is `## Deviations from Plan / Design`; consolidate any non-`None` entries there at the next phase boundary.

| Task / Review                 | Source Artifact                     | Planned / Documented            | Actual / Accepted                      | Reason                       | Source of Truth           | Follow-up                                   |
| ----------------------------- | ----------------------------------- | ------------------------------- | -------------------------------------- | ---------------------------- | ------------------------- | ------------------------------------------- |
| {task_id/review_id or `None`} | {spec.md/design.md/plan.md section} | {planned behavior/taxonomy/API} | {actual shipped behavior/taxonomy/API} | {why divergence is accepted} | {implementation/artifact} | {artifact update task or explicit deferral} |
```

Append only — never overwrite prior run entries.

**`plan.md` review table:**

For each phase that completed:

- Pass on first try → set phase row to `passed` with date + review artifact path.
- Pass after fixes → set to `fixes_added` → `fixes_completed` → `passed` (match existing lifecycle).
- Fix-loop exhausted → leave at `fixes_added` with "excluded" note in the artifact link.
- `final` review row is never touched by this skill.

**`state.md`:**

- Update `oat_current_task` to the next un-run task ID (or the final task if run complete).
- Update `oat_last_commit` to the bookkeeping commit SHA about to be made.
- Update `oat_project_state_updated` to current ISO 8601 UTC timestamp.
- If `oat_execution_mode: subagent-driven` is present, remove the key.
- If the user supplied a `--retry-limit` override, persist as `oat_orchestration_retry_limit`.

**Bookkeeping commit (mandatory):**

```bash
oat state refresh
git add {PROJECT_PATH}/implementation.md {PROJECT_PATH}/state.md {PROJECT_PATH}/plan.md
git commit -m "chore(oat): bookkeeping after {pNN} {pass|fail}"
```

Then check HiLL checkpoint — if the phase ID is in `oat_plan_hill_phases`, pause for user approval before continuing.

### Step 8: Check Plan Phase Completion

When all tasks in current plan phase complete (e.g., all p01-\* tasks done):

**Update frontmatter:**

```yaml
oat_current_task_id: { first_task_of_next_phase } # e.g., p02-t01
```

**Plan phase checkpoint:**
At the end of each plan phase (p01, p02, etc.), check `oat_plan_hill_phases` in plan.md to decide whether to pause:

- **If `oat_plan_hill_phases` is empty (`[]`):** Pause after every phase (default behavior after confirmation).
- **If `oat_plan_hill_phases` has values:** Pause only after completing a listed phase.
  - Example: `["p01", "p04"]` → pause after p01 completes and after p04 completes; skip p02, p03.
  - Example: `["p03"]` where p03 is the last phase → run all phases without pausing, then pause after p03 (end of implementation).
- **If `oat_plan_hill_phases` is missing at a phase boundary:** treat this as bookkeeping drift and stop to repair it before continuing, because the confirmation should already have been written during the first implementation run.

**Key semantic: listed phases are where you stop AFTER completing them, not before.** `["p03"]` means "complete p03, then pause" — not "pause before starting p03."

**Auto-review at HiLL checkpoints (Touchpoint B):**

Before pausing at a checkpoint, check if auto-review is enabled:

1. Read `oat_auto_review_at_hill_checkpoints` from plan.md frontmatter. If not present, fall back to legacy `oat_auto_review_at_checkpoints`. If neither is present, fall back to `oat config get workflow.autoReviewAtHillCheckpoints` (which itself falls back to legacy `.oat/config.json` `autoReviewAtCheckpoints` when unset).

2. If enabled and this is a checkpoint phase:
   a. **Determine review scope:** Find the highest completed implementation phase already covered by a **`passed`** code-review row in plan.md Reviews table. Count only whole-phase scopes: `pNN` or `pNN-pMM`. Ignore task scopes (`pNN-tNN`) and rows with `fixes_added` or `fixes_completed` because those reviews did not pass and must be re-covered. Scope = every implementation phase after that passed coverage through the current phase, inclusive. If no earlier passed whole-phase review exists, start from the first implementation phase. Use `pNN-pMM` when the scope spans multiple phases. If this is the final implementation phase checkpoint, use scope `final`.
   - Example: prior passed row `p01`, current checkpoint `p03` → review `p02-p03`
   - Example: no prior passed whole-phase review, current checkpoint `p03` → review `p01-p03`
   - Example: current checkpoint is the last implementation phase → review `final`
     b. **Spawn subagent review:** `oat-project-review-provide code {scope}` — instruct it to include `oat_review_invocation: auto` in the review artifact frontmatter.
     c. **Auto-invoke review-receive:** `oat-project-review-receive` — operates in auto-disposition mode when `oat_review_invocation: auto` is present:
   - Critical/Important/Medium: convert to fix tasks (same as manual)
   - Minor: auto-convert to fix tasks unless clearly out of scope
   - No user prompts for disposition
     d. **If fix tasks added:** continue implementing automatically (no checkpoint pause — return to Step 5 for the new fix tasks)
     e. **If scope passed:** proceed to the checkpoint pause below

3. If disabled: skip directly to the checkpoint pause.

When pausing:

- Output phase summary (tasks completed, commits made)
- Ask user: "Phase {N} ({phase_name}) complete. Continue to next phase?"
- Wait for user approval before proceeding to next plan phase

**Restart safety (required):**

- At the end of each task and at each phase boundary, ensure `implementation.md` is persisted and internally consistent:
  - `oat_current_task_id` points at the next task to do (or `null` when complete)
  - Phase status sections match the progress overview table
  - The implementation log reflects what was actually completed

**Phase summaries (required):**

- When a plan phase completes (p01, p02, etc.), update the "Phase Summary" section in `implementation.md` for that phase:
  - Outcome (behavior-level)
  - Key files touched (paths)
  - Verification run
  - Notable decisions/deviations

**Design/artifact deltas (required when present):**

- If a completed task intentionally diverged from `spec.md`, `design.md`, or `plan.md`, update the `## Deviations from Plan / Design` table in `implementation.md`.
- For existing project artifacts, treat any `## Deviations...` heading as the deviations section; migrate to the preferred `## Deviations from Plan / Design` heading and table shape when already touching the section.
- Each delta must include: the affected source artifact/section, the planned/documented expectation, the actual shipped implementation, the reason the divergence is accepted, the current source of truth, and any follow-up artifact update task or explicit deferral.
- If the implementation is now source of truth and the design/spec/plan is stale, write that directly. Do not treat the stale artifact as a no-op just because code is correct.
- If no deltas exist for the phase, do not invent one; leave the table unchanged.

**Bookkeeping commit (required):**

**DO NOT SKIP.** This commit prevents state drift across sessions.

After phase summary and task pointer advancement, refresh the repo dashboard when available and commit all modified project tracking files:

```bash
oat state refresh
git add "$PROJECT_PATH/implementation.md" "$PROJECT_PATH/state.md" "$PROJECT_PATH/plan.md"
git diff --cached --quiet || git commit -m "chore(oat): update tracking artifacts for {phase} completion"
```

Do not use `git add -A` or glob patterns. Only commit the three project artifacts listed above; `.oat/state.md` is a generated, gitignored dashboard.

**Note on HiLL types:**

- **Workflow HiLL** (`oat_hill_checkpoints` in state.md): Gates between workflow phases (discovery → spec → design → plan → implement). Checked by oat-project-progress router.
- **Plan phase checkpoints** (`oat_plan_hill_phases` in plan.md): Gates at plan phase boundaries during implementation. `[]` means pause after every phase; a populated array pauses only after listed phases. The field may be absent only before the first implementation-run confirmation. Listed phases are where you stop AFTER completing them.

**Revision phase completion handling:**

When all tasks in a `p-revN` phase complete (revision phases created by `oat-project-revise`):

1. Set `oat_phase_status: pr_open` (not `complete` — the PR is still open for further review)
2. Set `oat_current_task: null`
3. Invoke `oat-project-summary` to update summary.md if it exists (implement owns summary re-generation at revision phase completion, not the revise skill)
4. Update next milestone: "Revision complete. Push changes to update PR. Run `oat-project-revise` for more feedback or `oat-project-complete` when approved."
5. Push changes to update the PR branch

This is different from regular phase completion — revision phases return to `pr_open` instead of continuing to the next phase, because the user needs to decide whether more revisions are needed.

### Step 9: Repeat Until Complete

Continue Steps 5-8 until all plan phases complete.

**Batch execution:**

- Default: Execute tasks one at a time
- If user requests: Execute N tasks before checking in
- Stop at configured plan phase boundaries for review

### Step 10: Handle Blockers

If a task cannot be completed:

**Mark as blocked:**

```yaml
oat_blockers:
  - task_id: { task_id } # e.g., p01-t03
    reason: '{description}'
    since: { date }
```

**Update task status:**

```markdown
### Task {task_id}: {Task Name}

**Status:** blocked
**Blocker:** {description}
```

**Notify user:**

```
Task {task_id} blocked: {reason}

Options:
1. Resolve blocker and continue
2. Skip task (mark as deferred)
3. Modify plan to address blocker
```

### Step 11: Mark Implementation Complete

When all plan tasks are complete (i.e., there is no next incomplete `pNN-tNN` task):

**Update "Final Summary" (required):**

- Before requesting final review / running `oat-project-pr-final`, update the `## Final Summary (for PR/docs)` section in `"$PROJECT_PATH/implementation.md"`:
  - What shipped (capabilities, behavior-level)
  - Key files/modules touched
  - Verification performed (tests/lint/typecheck/build/manual)
  - Design deltas (if any)
- This should reflect **what was actually implemented**, including any deviations from design and any review-fix work.

Update frontmatter:

```yaml
---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: { today }
oat_current_task_id: null
---
```

**Important:** `oat_current_task_id` should never point at an already-completed task. If all tasks are done, set it to `null` and proceed to the final review gate.

### Step 12: Update Project State

Update `"$PROJECT_PATH/state.md"` so other skills reflect task completion and review gating:

**Frontmatter updates:**

- `oat_current_task: null`
- `oat_last_commit: {final_commit_sha}`
- `oat_blockers: []`
- `oat_phase: implement`
- `oat_phase_status: in_progress` (until final review passes)
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`
- **If** `"implement"` is in `oat_hill_checkpoints`: append `"implement"` to `oat_hill_completed` array

**Note:** Only append to `oat_hill_completed` when the phase is configured as a HiLL gate.

Update content:

```markdown
## Current Phase

Implementation - Tasks complete; awaiting final review.

## Progress

- ✓ Discovery complete
- ✓ Specification complete
- ✓ Design complete
- ✓ Plan complete
- ✓ Implementation tasks complete
- ⧗ Awaiting final review
```

**Bookkeeping commit (required):**

**DO NOT SKIP.** This commit prevents state drift across sessions.

After updating state.md to reflect implementation completion, refresh the repo dashboard when available and commit all modified project tracking files:

```bash
oat state refresh
git add "$PROJECT_PATH/implementation.md" "$PROJECT_PATH/state.md" "$PROJECT_PATH/plan.md"
git diff --cached --quiet || git commit -m "chore(oat): update tracking artifacts for implementation complete"
```

Do not use `git add -A` or glob patterns. Only commit the three project artifacts listed above; `.oat/state.md` is a generated, gitignored dashboard.

### Step 13: Final Verification

Run project-wide verification:

```bash
# Run tests
pnpm test

# Run lint
pnpm lint

# Run type check
pnpm type-check

# Run build
pnpm build
```

All must pass before proceeding.

### Step 14: Trigger Final Review

**At the final plan phase boundary, a code review is required before PR.**

Before requesting final review, ensure the latest project-artifact bookkeeping is already committed. Review should evaluate the implementation state as it actually stands on the branch, not a half-tracked working tree.

Check if final review already completed (preferred source of truth: plan.md Reviews table):

```bash
FINAL_ROW=$(grep -E "^\\|\\s*final\\s*\\|" "$PROJECT_PATH/plan.md" 2>/dev/null | head -1)
echo "$FINAL_ROW"
```

**If final review row exists and status is `passed`:**

- Example row:
  - `| final | code | passed | 2026-01-28 | reviews/final-review-2026-01-28.md |`
- Check:
  ```bash
  echo "$FINAL_ROW" | grep -qE "^\\|\\s*final\\s*\\|.*\\|\\s*passed\\s*\\|" && echo "passed"
  ```
- Skip to Step 15 (PR prompt)

**If final review is not marked `passed`:**

- Tell user: "All tasks complete. Final review required before PR."

**Workflow preference check (before prompting):**

```bash
REVIEW_MODEL=$(oat config get workflow.reviewExecutionModel 2>/dev/null || true)
```

- **If `REVIEW_MODEL` is `subagent`:** Print `Review execution: subagent (from workflow.reviewExecutionModel).` Dispatch the review subagent directly via the Task tool. No prompt.
- **If `REVIEW_MODEL` is `inline`:** Print `Review execution: inline (from workflow.reviewExecutionModel).` Run the review in-context per `oat-project-review-provide` skill. No prompt.
- **If `REVIEW_MODEL` is `fresh-session`:** This is a **soft preference with escape hatch** because the agent cannot run the review in a fresh session on the user's behalf. Print the guidance block below, then handle the user's response per the three outcomes listed after it.
- **If unset or invalid:** Fall through to the standard 3-tier prompt below.

**Fresh-session guidance block (print when `REVIEW_MODEL` is `fresh-session`):**

```
Per your config (workflow.reviewExecutionModel: fresh-session), your
preference is to run the review in a fresh session.

Run `oat-project-review-provide code final` in a separate session, then
resume this session when the review is complete.

If you'd like to review here instead:
  1) subagent
  2) inline

Enter 1 or 2 to run the review here, or press Enter to wait.
```

**Fresh-session response outcomes:**

- User enters `1` → dispatch the subagent review (same behavior as `REVIEW_MODEL=subagent`).
- User enters `2` → run the review inline (same behavior as `REVIEW_MODEL=inline`).
- User presses Enter (or equivalent no-input confirmation) → pause the session and wait for the fresh-session review to complete before continuing.

**Standard prompt (when preference is unset):**

Offer review options (3-tier capability model):

```
Implementation complete. Final review required.

Review options:
1. Run review in this session via a subagent (recommended if provider supported)
2. Run review in a fresh session and return to this session to receive review
3. Run review inline

To run in a separate session use: oat-project-review-provide code final
```

**After user chooses:**

- If subagent (option 1): Agent spawns the review via Task tool — no command needed from user
- If fresh session (option 2): User runs `oat-project-review-provide code final` in a separate session, then returns here
- If inline (option 3): Agent executes the review directly per oat-project-review-provide skill
- After review: User runs `oat-project-review-receive` to process findings
- If Critical/Important findings: Fix tasks added, re-run the `oat-project-implement` skill
- Loop until final review passes (max 3 cycles per oat-project-review-receive)

**After final review is marked `passed`:**

- Update `"$PROJECT_PATH/state.md"` frontmatter:
  - `oat_phase: implement`
  - `oat_phase_status: complete`
  - `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`
  - Append `"implement"` to `oat_hill_completed` (only if configured as a HiLL gate)
- Update state content to "Implementation complete".
- Update `"$PROJECT_PATH/plan.md"`:
  - Set the `final` review row status to `passed` (if not already)
  - Ensure `## Implementation Complete` totals reflect any review fix tasks that were added
- Update `"$PROJECT_PATH/implementation.md"`:
  - Ensure `oat_current_task_id: null`
  - Ensure the "Review Received" section reflects completed fixes and points to the next action (PR) rather than "execute fix tasks"

### Step 15: Prompt for Next Steps

After final review passes (no Critical/Important findings):

**Workflow preference check (before prompting):**

```bash
POST_IMPL=$(oat config get workflow.postImplementSequence 2>/dev/null || true)
```

- **If `POST_IMPL` is `wait`:** Print `Post-implementation: wait (from workflow.postImplementSequence). Run follow-up skills manually when ready.` Exit without auto-chaining.
- **If `POST_IMPL` is `summary`:** Print `Post-implementation: summary (from workflow.postImplementSequence).` Invoke `oat-project-summary`. Stop after summary completes.
- **If `POST_IMPL` is `pr`:** Print `Post-implementation: pr (from workflow.postImplementSequence).` Invoke `oat-project-pr-final` (which auto-generates `summary.md` as part of its flow).
- **If `POST_IMPL` is `docs-pr`:** Print `Post-implementation: docs-pr (from workflow.postImplementSequence).` Invoke `oat-project-document` then `oat-project-pr-final` (summary included via pr-final).
- **If unset or invalid:** Fall through to the standard prompt below.

**Rationale:** `oat-project-pr-final` already auto-generates/refreshes `summary.md` as part of its flow, so `pr` and `docs-pr` do not need a separate summary step. The `summary` value exists as a standalone option for the rare case where you want just the summary without PR.

**Standard prompt (when preference is unset):**

```
Final review passed for {project-name}.

All tasks complete and verified. Next steps:

1. Generate project summary (oat-project-summary)
2. Sync documentation (oat-project-document) — if applicable
3. Create final PR (oat-project-pr-final)

Options:
a. Run all three in sequence now
b. Run summary + PR only (skip docs)
c. Exit (run individually later)

Choose:
```

**If user chooses sequence (a or b):**

1. Invoke `oat-project-summary` to generate summary.md
2. If docs selected: invoke `oat-project-document`
3. Invoke `oat-project-pr-final` — this sets `oat_phase_status: pr_open` and guides to revise/complete

Do not route directly to `oat-project-complete`. The `pr_open` status set by pr-final is the proper entry to the revision/completion flow.

**If user chooses exit (c):**

Tell user: "Run the skills individually when ready: oat-project-summary → oat-project-document → oat-project-pr-final"

### Step 16: Output Summary

```
Implementation complete for {project-name}.

Summary:
- Phases: {N} completed
- Tasks: {N} completed
- Commits: {N} created

Final verification:
- Tests: ✓ passing
- Lint: ✓ clean
- Types: ✓ valid
- Build: ✓ success

Final review:
- Status: ✓ passed
- Artifact: reviews/final-review-{date}.md

Next: Create PR or run the oat-project-pr-final skill (when available)
```

## Success Criteria

- All tasks executed in order
- TDD discipline followed
- Each task has a commit
- Implementation.md tracks all progress
- Final verification passes
- Final review passes (no Critical/Important findings)
- No unresolved blockers
