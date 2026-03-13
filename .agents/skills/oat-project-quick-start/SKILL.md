---
name: oat-project-quick-start
version: 1.3.0
description: Use when a task is small enough for quick mode or rapid iteration is preferred. Scaffolds a lightweight OAT project from discovery directly to a runnable plan, with optional brainstorming and lightweight design.
argument-hint: '<project-name>'
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Quick Start Project

Create or resume a project in **quick mode** and produce a runnable `plan.md` with minimal ceremony.

## Prerequisites

- A repository initialized for OAT (`.oat/` and `.agents/` exist).
- User has a feature request or task objective to execute.

## Mode Assertion

**OAT MODE: Quick Start**

**Purpose:** Capture intent quickly (`discovery.md`) and generate an execution-ready `plan.md` for `oat-project-implement`.

**BLOCKED Activities:**

- No spec-driven spec/design authoring unless user explicitly asks to promote to the spec-driven workflow.
- No implementation code changes.

**ALLOWED Activities:**

- Project scaffolding and project pointer updates.
- Discovery conversation with adaptive depth (including brainstorming when appropriate).
- Optional lightweight design artifact (`design.md`) when user chooses it at the decision point.
- Plan generation with stable task IDs and verification commands.

**Self-Correction Protocol:**
If you catch yourself:

- Expanding into spec-driven lifecycle documentation → STOP and keep scope to quick workflow artifacts.
- Writing implementation code → STOP and return to plan authoring.

**Recovery:**

1. Re-focus on quick workflow outcome (`discovery.md` + `plan.md`).
2. Route implementation to `oat-project-implement`.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ QUICK START
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print step indicators, e.g.:
  - `[1/6] Scaffolding quick-mode project…`
  - `[2/6] Exploring solution space + capturing discovery…`
  - `[3/6] Decision point: design depth…`
  - `[4/6] Generating execution plan…`
  - `[5/6] Initializing implementation tracker…`
  - `[6/6] Refreshing dashboard…`
  - _(If lightweight design is chosen, insert design steps between 3 and 4)_

## Process

### Step 0: Resolve Active Project

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

If no valid active project exists:

- Read `{project-name}` from `$ARGUMENTS`, or ask user.
- Create project via the same scaffolding path used by `oat-project-new`:

```bash
oat project new "{project-name}" --mode quick
```

This guarantees:

- standard artifact scaffolding from `.oat/templates/`
- `activeProject` update in `.oat/config.local.json`
- repo dashboard refresh (`.oat/state.md`) via existing scaffolder behavior

### Step 1: Set Quick Workflow Metadata

Update `"$PROJECT_PATH/state.md"` frontmatter:

- `oat_workflow_mode: quick`
- `oat_workflow_origin: native`
- `oat_phase: discovery`
- `oat_phase_status: in_progress`
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

### Step 2: Capture Discovery (Adaptive Depth)

If `"$PROJECT_PATH/discovery.md"` is missing, create it from `.oat/templates/discovery.md` first.

**Adapt discovery depth to the ambiguity of the request.** Do not rush past exploration to get to planning.

#### 2a: Assess Request Ambiguity

Before asking questions, classify the request:

- **Well-understood** — the user has a clear mental model, requirements are specific, approach is obvious. Examples: "add a CLI flag for verbose output", "rename X to Y across the codebase."
  → Synthesize `discovery.md` from available session context quickly when enough detail is already available. Ask only the minimum additional questions needed to remove blockers for a quality plan.

- **Exploratory** — the user is thinking out loud, requirements have gaps, multiple approaches are viable. Signals: "I'm considering...", "what do you think about...", "how should we approach...", "I want to add X but I'm not sure how."
  → Invest in solution space exploration before converging.

#### 2b: Solution Space Exploration (Exploratory Requests)

For exploratory requests, spend time in divergent thinking before converging on an approach:

1. **Propose 2-3 distinct approaches** — not minor variations, but genuinely different strategies. For each:
   - Describe the approach concretely
   - List tradeoffs (not just pros/cons — explain _when_ each approach is the better choice)
   - **Lead with your recommendation and explain why**

2. **One question at a time** — ask focused clarifying questions sequentially, not as a batch. After each answer, update your understanding and let the next question be informed by the response.

3. **Incremental validation** — after exploring the solution space and converging on an approach, summarize the chosen direction and get explicit user buy-in before moving to decisions and constraints.

Document the exploration in the `## Solution Space` section of `discovery.md`.

#### 2c: Capture Decisions

Whether well-understood or exploratory, backfill `discovery.md` with the discussion, Q&A, and decisions from the session before planning:

- initial request
- solution space exploration (if applicable)
- clarifying Q&A that materially shaped the project
- key decisions
- options considered and chosen approach
- constraints
- out-of-scope
- success criteria

Keep this concise and outcome-oriented.

### Step 2.5: Decision Point — Design Depth

**Auto-advance rule:** If the request was classified as **well-understood** in Step 2a and discovery surfaced no architecture decisions, component boundary questions, or unexpected complexity, skip this decision point entirely and continue directly to Step 3. This preserves the minimal-ceremony contract for straightforward requests.

**Otherwise**, present the user with a choice about how to proceed:

> "Discovery is complete. How would you like to proceed?"
>
> 1. **Straight to plan** — scope is clear, ready to generate tasks
> 2. **Lightweight design first** — draft architecture and components before planning _(produces design.md)_
> 3. **Promote to spec-driven** — this needs formal requirements and full design

Use `AskUserQuestion` to present this choice.

**Recommendation heuristic** — lead with a recommendation based on discovery findings:

- If discovery revealed clear scope with no significant architecture decisions → recommend "Straight to plan"
- If discovery surfaced architecture choices, component boundaries, or data model questions → recommend "Lightweight design first"
- If discovery revealed the scope is larger or more complex than initially expected → recommend "Promote to spec-driven"

**If user chooses "Straight to plan":** continue to Step 3.

**If user chooses "Lightweight design first":** execute Step 2.75 before continuing to Step 3.

**If user chooses "Promote to spec-driven":**

- Update `discovery.md` frontmatter:
  - `oat_status: complete`
  - `oat_ready_for: oat-project-spec`
  - `oat_last_updated: {today}`
- Update `state.md`:
  - `oat_workflow_mode: spec-driven`
  - `oat_phase: discovery`
  - `oat_phase_status: complete`
  - `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`
- Refresh repo dashboard: `oat state refresh`
- Inform the user: "Discovery is complete. Run `oat-project-spec` next to formalize requirements."
- Stop here. Do not generate a plan.

### Step 2.75: Lightweight Design (Optional)

Produce a focused `design.md` covering only what's needed for a quality plan. This is NOT the full spec-driven design — it's a quick architectural sketch.

Copy template: `.oat/templates/design.md` → `"$PROJECT_PATH/design.md"`

**Required sections (always fill these):**

1. **Overview** — 2-3 paragraph summary of the technical approach
2. **Architecture** — system context, key components, and data flow
3. **Component Design** — for each component: purpose, responsibilities, interfaces
4. **Testing Strategy** — key test levels and scenarios (no requirement-to-test mapping needed in quick mode)

**Optional sections (include only when relevant to the feature):**

- Data Models — if new models or schema changes are involved
- API Design — if new endpoints or interfaces are introduced
- Error Handling — if non-obvious error scenarios exist

**Skip these sections in quick mode** (they belong to spec-driven design):

- Security Considerations (unless the feature is security-related)
- Performance Considerations (unless the feature has specific performance requirements)
- Deployment Strategy
- Migration Plan
- Dependencies (captured in discovery instead)
- Risks and Mitigation (captured in discovery instead)

**Present design incrementally for validation:**

1. Draft architecture overview → present to user for validation
2. Draft component design → present to user for validation
3. Draft data flow + testing approach → present to user for validation
4. Finalize `design.md`

After each chunk, ask: "Does this look right, or should we adjust before continuing?"

Update `design.md` frontmatter:

```yaml
---
oat_status: complete
oat_ready_for: null
oat_last_updated: { today }
oat_generated: false
oat_template: false
---
```

### Step 3: Generate Plan Directly

Create/update `"$PROJECT_PATH/plan.md"` from `.oat/templates/plan.md`.

Required frontmatter updates:

- `oat_status: complete`
- `oat_ready_for: oat-project-implement`
- `oat_phase: plan`
- `oat_phase_status: complete`
- `oat_plan_source: quick`
- `oat_import_reference: null`
- `oat_import_source_path: null`
- `oat_import_provider: null`

Plan requirements — apply `oat-project-plan-writing` canonical format invariants:

- Stable task IDs (`pNN-tNN`)
- Verification step per task
- Atomic commit message per task
- Required sections: `## Reviews`, `## Implementation Complete`, `## References`
- Review table preservation rules (never delete existing rows)

### Step 4: Sync Project State

Update `"$PROJECT_PATH/state.md"`:

- `oat_phase: plan`
- `oat_phase_status: complete`
- `oat_current_task: null`
- `oat_project_state_updated: "{ISO 8601 UTC timestamp, e.g. 2026-03-10T14:30:00Z}"`
- set `oat_hill_checkpoints: []` for quick mode to avoid spec/design gate confusion

Recommended quick-mode gate defaults:

- keep implementation phase checkpoints via `oat_plan_hill_phases`
- do not require discovery/spec/design artifact review rows to be passed before implementation

### Step 5: Initialize Implementation Tracking

Ensure `"$PROJECT_PATH/implementation.md"` exists and frontmatter is resumable:

- `oat_status: in_progress`
- `oat_current_task_id: p01-t01` (or first task in plan)

### Step 6: Refresh Repo Dashboard

Always regenerate the repo dashboard after quick-start updates (including resume path):

```bash
oat state refresh
```

### Step 7: Output Next Action

Report:

- workflow mode (`quick`)
- total phases/tasks generated
- first task ID
- next options:
  - `oat-project-implement` (sequential, default)
  - `oat-project-subagent-implement` (parallel with autonomous review gates)
- dashboard location: `.oat/state.md` (confirm it was regenerated)

## Success Criteria

- ✅ Active project exists and pointer is valid.
- ✅ `state.md` marks `oat_workflow_mode: quick`.
- ✅ `discovery.md` contains synthesized or backfilled quick discovery decisions from the session context.
- ✅ `plan.md` is complete and executable (`oat_ready_for: oat-project-implement`).
- ✅ `implementation.md` is initialized for resumable execution.
