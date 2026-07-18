---
name: oat-project-quick-start
version: 2.3.3
description: Use when a task is small enough for quick mode or rapid iteration is preferred. Scaffolds a lightweight OAT project from discovery directly to a runnable plan, with optional brainstorming and lightweight design.
argument-hint: '<project-name> ["project description"]'
oat_gateable: true
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

When `OAT_AUTONOMOUS=1`, read `references/docs/autonomy-contract.md` and keep
`OAT_NON_INTERACTIVE=1` set for this run. The autonomous branches below are
inert otherwise. Record decisions and rationale, but never persist either
autonomy environment signal.

**BLOCKED Activities:**

- No spec-driven spec/design authoring unless the user explicitly asks to
  promote, or `OAT_AUTONOMOUS=1` selects promotion through the documented
  design-depth heuristic.
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
  - `[0/8] Checking inherited git state...`
  - `[1/8] Scaffolding quick-mode project…`
  - `[2/8] Exploring solution space + capturing discovery…`
  - `[3/8] Decision point: design depth…`
  - `[4/8] Generating execution plan…`
  - `[5/8] Running plan artifact review…`
  - `[6/8] Initializing implementation tracker…`
  - `[7/8] Refreshing dashboard + committing…`
  - `[8/8] Running configured gate…`
  - _(If lightweight design is chosen, insert design steps between 3 and 4)_

## Artifact Persistence (Required)

- After any write to `discovery.md`, `design.md`, `plan.md`, `implementation.md`, or project `state.md`, ensure the artifact is saved immediately and remains tracked in git.
- If the skill is about to pause for user input or stop after mutating artifacts, commit the changed artifacts before waiting. Do not leave discovery/design updates only in the working tree.
- Quick-start handoff is not complete until the changed project artifacts have been committed. Refresh `.oat/state.md` when available, but do not stage it; the repo dashboard is generated and normally gitignored.
- This applies to downstream lifecycle boundaries too: implementation, review, revise, and PR skills must inherit a committed artifact baseline, not an untracked project tree.

## Artifact Hygiene

Artifact hygiene contract: Before finishing or committing, format every file you created or edited. Use the concrete write/fix formatting command supplied by the governing plan, task, or brief. If none is usable, discover the repository's documented write/fix command from applicable `AGENTS.md`/`CLAUDE.md` instructions and relevant package manifests; do not infer or hardcode a formatter. Prefer a file-scoped invocation when supported, and avoid rewriting unrelated files. If no command is discoverable, warn once with `no format command discovered in repo instructions; skipping`, then continue.

After formatting, run only repository checks relevant to the files changed;
writing lifecycle artifacts does not imply unrelated full test suites.

## Process

### Step 0 (Preflight): Inherited Git State

Before scaffolding, surface the working tree state so unrelated changes don't get carried into the project workflow's bookkeeping commits.

1. Run `git status --porcelain`. If empty, continue silently to the next step.
2. If non-empty, present the dirty list to the user.
3. If `.oat/sync/manifest.json` or paths under `.claude/`, `.cursor/`, `.codex/` appear in the list, note: "These are generated by `oat sync` (often by `pnpm run worktree:init` or `oat-worktree-bootstrap-auto`) and are typically safe to commit as `chore: run sync`."
4. Offer three choices via `AskUserQuestion`:
   - **Commit now** (recommended when only sync output is dirty) — stage and commit. For sync-only diffs, default the message to `chore: run sync`; otherwise ask the user for the commit message.
   - **Proceed anyway** — start the project workflow with the dirty state acknowledged.
   - **Abort** — exit the skill so the user can clean up manually.

> **Tool availability is not the same as interactivity.** If `AskUserQuestion` is unavailable but chat is available, present the three choices as a plain chat message and wait for the user's reply. Only fall back to "Proceed anyway" when `OAT_NON_INTERACTIVE=1` is set or there is no user-response channel at all.

When `OAT_AUTONOMOUS=1`, use that existing proceed-anyway branch, record gate
`QS-01`, and leave all unrelated working-tree files unstaged. A cleanup that
could discard work remains a destructive-change boundary.

Do not advance past this gate without an explicit choice.

### Step 0.5: Resolve Active Project

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

If no valid active project exists:

- Resolve startup input from `$ARGUMENTS` before doing any discovery work:
  - Accept `{project-name}` plus an optional `{project-description}`.
  - If `$ARGUMENTS` contains only a bare `{project-name}` (for example a slug or short title) without a substantive description, ask the user for a short project description before scanning the repo or drafting discovery.
  - Do not infer requirements from the project name alone or go exploring the codebase to guess what the project means.
  - If neither field is available, ask for both the project name and a short project description. One or two sentences is enough for the description.
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

- Base this classification on the user's project description plus session context. A bare project name by itself is not enough context to start discovery.

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

### Step 2d: Persist Discovery Before Any Decision Pause

If discovery/state artifacts were updated and the skill is about to pause for the Step 2.5 design-depth decision, commit those artifact changes first so the project can be resumed cleanly.

```bash
git add "$PROJECT_PATH/discovery.md" "$PROJECT_PATH/state.md"
git diff --cached --quiet || git commit -m "chore(oat): capture quick-start discovery for {project-name}"
```

### Step 2.5: Decision Point — Design Depth

**Auto-advance rule:** If the request was classified as **well-understood** in Step 2a and discovery surfaced no architecture decisions, component boundary questions, or unexpected complexity, skip this decision point entirely and continue directly to Step 2.6 (the requirements gate still fires before plan generation). This preserves the minimal-ceremony contract for straightforward requests.

**Autonomous resolution:** If `OAT_AUTONOMOUS=1` and the auto-advance rule did
not apply, do not present the choice below. Apply the same recommendation
heuristic to select straight-to-plan, lightweight design, or spec-driven
promotion. Record gate `QS-04`, the selected depth, and the evidence-based
rationale in `discovery.md` before following the selected branch. Stop at a
product-judgment boundary if the available evidence cannot support the choice.

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

**If user chooses "Straight to plan":** continue to Step 2.6 (requirements gate), then Step 3.

**If user chooses "Lightweight design first":** execute Step 2.75 before continuing to Step 3. The Step 2.6 requirements gate is skipped — Step 2.75's in-conversation design validation covers that ground.

**If user chooses "Promote to spec-driven":**

- Complete discovery through the CLI validation boundary:

```bash
oat project complete-discovery "$PROJECT_PATH" --ready-for oat-project-design
```

- Update `state.md`:
  - `oat_workflow_mode: spec-driven`
  - `oat_phase: discovery`
  - `oat_phase_status: complete`
  - `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`
- Refresh repo dashboard: `oat state refresh`
- Commit the promoted discovery/state artifacts before stopping:

```bash
git add "$PROJECT_PATH/discovery.md" "$PROJECT_PATH/state.md"
git diff --cached --quiet || git commit -m "chore(oat): promote quick-start discovery for {project-name}"
```

- Inform the user: "Discovery is complete. Run `oat-project-design` next — it will confirm requirements and produce both `spec.md` and `design.md` in one collaborative pass. If you'd rather formalize requirements without designing yet, `oat-project-spec` remains available as an optional standalone step."
- Stop here. Do not generate a plan.

### Step 2.6: Requirements Gate (Straight-to-Plan Path)

Fires only when the straight-to-plan path was chosen at Step 2.5 (explicit choice or auto-advance). Skip when the user selected "Lightweight design first" (Step 2.75 handles its own in-conversation confirmation) or "Promote to spec-driven".

Single conversational turn — no loop inside the gate. If the user materially redirects scope, route OUT to lightweight design or back to discovery.

> **Tool availability is not the same as interactivity.** If `AskUserQuestion` is unavailable but chat is available, present this gate as a plain chat message and wait for the user's reply. Do not auto-confirm just because the structured question tool is missing.

```
# Explicit non-interactive fallback FIRST (FR9 contract; same signal as
# design mode choice). Lack of AskUserQuestion alone is NOT non-interactive
# — if chat with the user is available, present the gate as a plain chat
# message and wait for their reply instead.
if [ "${OAT_NON_INTERACTIVE:-}" = "1" ] || no_user_response_channel_exists; then
  echo "Requirements gate auto-confirmed in non-interactive mode."
  # proceed to Step 3
fi

# Interactive bypass (power-user opt-out).
if [ "${OAT_NO_REQUIREMENTS_GATE:-}" = "1" ] || [ "$ARG_NO_GATE" = "1" ]; then
  # proceed to Step 3 silently
fi

# Extract requirements from discovery.md:
#   - Key Decisions
#   - Success Criteria
#   - Constraints
# Format as bullet list and present (SINGLE TURN):
#
#   > "Before I generate the plan, here are the requirements I'm building against:
#   >
#   >    Key decisions:
#   >    - [decision 1]
#   >    - [decision 2]
#   >
#   >    Success criteria:
#   >    - [criterion 1]
#   >
#   >    Constraints:
#   >    - [constraint 1]
#   >
#   >  Does this match what you want?"

# AskUserQuestion multi-choice:
#   1. Yes — proceed to plan generation
#   2. Add a minor requirement that still fits this scope (capture inline, proceed — no re-present)
#   3. Scope needs redirecting — rework discovery or produce a lightweight design first
#
# On choice 1: continue to Step 3.
# On choice 2: prompt once for the addition, append to discovery.md, proceed to Step 3 (do NOT re-present).
# On choice 3: exit the gate cleanly. Present follow-up choice:
#   a. Produce a lightweight design first (run Step 2.75)
#   b. Expand discovery (return to Step 2)
# Route the user accordingly. Do NOT loop back into the gate.
```

Under `OAT_AUTONOMOUS=1`, the non-interactive branch above is the gate `QS-05`
resolution. Record the auto-confirmed requirement set in the discovery/plan
handoff. Contradictory or materially incomplete requirements remain a
product-judgment boundary; auto-confirmation is not permission to invent scope.

Before continuing to Step 3, complete discovery through the CLI validation
boundary:

```bash
oat project complete-discovery "$PROJECT_PATH" --ready-for oat-project-quick-start
```

### Step 2.75a: Lightweight Design Mode Choice

Resolve the interaction mode before drafting. Same mechanics as the full `oat-project-design` skill (Component 1): argument precedes env var, config fallback, **explicit** non-interactive fallback to draft.

> **Tool availability is not the same as interactivity.** If `AskUserQuestion` is unavailable but chat is available, ask the mode-choice question as a plain chat message and wait for the user's reply. Only fall back to draft when `OAT_NON_INTERACTIVE=1` is set or there is no user-response channel at all.

```
DESIGN_MODE="${ARG_MODE:-${OAT_DESIGN_MODE:-}}"
if [ -z "$DESIGN_MODE" ]; then
  if [ "${OAT_NON_INTERACTIVE:-}" = "1" ] || no_user_response_channel_exists; then
    DESIGN_MODE="draft"
    echo "Non-interactive context detected. Falling back to draft-and-review mode."
  else
    # Consult persisted preference (FR15 / Component 14) before prompting
    CONFIG_MODE=$(oat config get workflow.designMode 2>/dev/null || echo "")
    if [ "$CONFIG_MODE" = "collaborative" ] || [ "$CONFIG_MODE" = "selective" ] || [ "$CONFIG_MODE" = "draft" ]; then
      DESIGN_MODE="$CONFIG_MODE"
      if [ "$DESIGN_MODE" = "selective" ]; then
        DESIGN_MODE="collaborative"
        echo "Using workflow.designMode = selective from config (treating as collaborative for lightweight design; Selective Collaborative is only available in full oat-project-design)."
      else
        echo "Using workflow.designMode = ${DESIGN_MODE} from config."
      fi
    else
      # Prefer AskUserQuestion for structured multi-choice when available.
      # If AskUserQuestion is unavailable, ask the same question as a plain
      # chat message and wait for the user's reply. Do NOT switch to draft
      # mode just because the structured tool is missing.
      #
      # Prompt (SAME text as oat-project-design Step 1.5):
      #   "How would you like to work through the lightweight design?
      #     1. Collaborative (recommended) — section-by-section, one approach confirmation before drafting
      #     2. Draft-and-review — full draft up front, you review holistically"
      :
    fi
  fi
fi
echo "Running in ${DESIGN_MODE} mode."
```

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

**Draft the design based on `DESIGN_MODE` (resolved in Step 2.75a):**

```
IF DESIGN_MODE == "collaborative":
  For SECTION in [Overview, Architecture, Component Design, Testing Strategy
                  (required); Data Models, API Design, Error Handling
                  (include only when relevant); SKIP Security, Performance,
                  Deployment, Migration]:
    Draft section content. Scale each section to its complexity:
      a few sentences if straightforward, up to 200-300 words if nuanced.
    Not-applicable sections: state as a single sentence, not empty.
    Present:
      "Here's what I have for [section]: [content].
       Does this look right, or should we adjust before continuing?"
    Use AskUserQuestion for the validation prompt.
    Revise inline on feedback. Be ready to go back and clarify if something
      doesn't make sense. Re-present if substantive.
    Mark section approved. Move to next.

IF DESIGN_MODE == "draft":
  Draft all required sections (Overview, Architecture, Component Design,
    Testing Strategy) and any applicable optional sections (Data Models,
    API Design, Error Handling) in ONE pass (same reduced section set).
  Scale each section to its complexity — no per-section prompts fire.
  Run the FULL 4-check self-review (placeholder + internal consistency +
    scope + ambiguity). No scaled-down variant — identical to the full
    oat-project-design self-review.
  Present the user-review gate wording (adapted for quick-start:
    no HiLL gate by default; commits-first is still in effect).
  Produce design.md only — NO spec.md is written by lightweight design.
```

If `design.md` or `state.md` was updated before one of these validation pauses, commit those artifact changes before waiting for the user response.

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

Update `"$PROJECT_PATH/state.md"` to reflect the design phase:

- `oat_phase: design`
- `oat_phase_status: complete`
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

Before proceeding to plan generation or pausing for validation, persist the design bookkeeping:

```bash
git add "$PROJECT_PATH/design.md" "$PROJECT_PATH/state.md"
git diff --cached --quiet || git commit -m "chore(oat): capture quick-start design for {project-name}"
```

Complete discovery through the CLI validation boundary before proceeding to plan generation:

```bash
oat project complete-discovery "$PROJECT_PATH" --ready-for oat-project-quick-start
git add "$PROJECT_PATH/discovery.md" "$PROJECT_PATH/state.md"
git diff --cached --quiet || git commit -m "chore(oat): complete quick-start discovery for {project-name}"
```

### Step 2.9: Snapshot Explicit Phase-Review Setting Before Plan Rewrite

Before any template-based create, update, replacement, or normalization of
`"$PROJECT_PATH/plan.md"`, inspect the existing plan frontmatter and snapshot:

1. The key presence of `oat_phase_review_gate` as a separate boolean. Presence
   is not truthiness: an explicit key is authoritative regardless of validity or
   value.
2. When the key is present, the complete explicit value as the exact YAML
   frontmatter entry, including its full nested mapping or scalar form. Preserve
   enabled, disabled, selected-phase, `null`, and malformed-for-contract values
   verbatim; do not normalize, validate, or reconstruct the value while taking
   the snapshot.

This snapshot protects a resumed explicit value from the template rewrite. Its
explicit presence must not trigger a target probe or re-prompt, even when the
preserved value is `null` or malformed for the phase-review contract.

### Step 3: Generate Plan Directly

Create/update `"$PROJECT_PATH/plan.md"` from `.oat/templates/plan.md`.

Restore the exact snapshot into the resulting `plan.md` frontmatter as part of
the first resulting plan write, before any later frontmatter rewrite and before
Step 3.55 invokes the shared setup contract. Carry the snapshot losslessly
through every subsequent plan update. When the key was explicitly present, its
complete value must still be present exactly as captured; do not probe,
re-prompt, validate, or replace it here. When the key was absent, do not invent
one before the shared setup contract runs.

Required frontmatter updates:

- `oat_status: in_progress`
- `oat_ready_for: null`
- `oat_phase: plan`
- `oat_phase_status: in_progress`
- `oat_plan_source: quick`
- `oat_import_reference: null`
- `oat_import_source_path: null`
- `oat_import_provider: null`
- `oat_template: true`

These values are the interruption-safe pre-review state. Here,
`oat_template: true` marks the generated plan as still owned by the current
planning workflow even after its substantive content has been written. If the
skill pauses, is interrupted, or cannot resolve dispatch before Step 3.7,
persist and commit this state. `oat-project-next` must route it back to the
current planning workflow and cannot advance it to implementation.

Plan requirements — apply `oat-project-plan-writing` canonical format invariants:

- Stable task IDs (`pNN-tNN`)
- Verification step per task
- Atomic commit message per task
- Required sections: `## Reviews`, `## Implementation Complete`, `## References`
- Review table preservation rules (never delete existing rows)

Required parallelism pass before finalizing the plan:

- Evaluate adjacent phases for phase-level parallelism before treating the plan as complete.
- Set `oat_plan_parallel_groups` whenever phases can run independently in isolated worktrees with disjoint write boundaries and independent verification.
- Keep dependent tasks in the same phase when they must run sequentially.
- Do not declare parallel groups when phases share a fragile migration, require the same generated artifact, or one phase's tests depend on another phase's behavior.
- Add a short `## Parallelism` section to `plan.md` explaining the dependency and write-set reasoning, including why groups were declared or why the plan remains sequential.
- Quick mode is not "sequential by default." A quick-start plan is sequential only when the dependency and write-set analysis says it should be.
- When a task claims scoped verification, prefer the exact runner invocation that truly scopes to the intended file, test, or target instead of package-level shortcuts that may execute the full suite.

### Step 3.5: Resolve Dispatch Policy Before Implementation Readiness

Before moving the quick project to ready-for-implementation, resolve the
complete dispatch ladder and the project named ceiling.

Invoke the `Complete Dispatch Ladder Adoption Contract` from
`oat-project-plan-writing`. If the effective ladder is missing or incomplete,
show the full bundled recommendation and ask the user to select its owning
scope before running exactly one command:

```bash
oat config adopt dispatch-matrix --shared
oat config adopt dispatch-matrix --local
oat config adopt dispatch-matrix --user
```

The selected scope owns only the reusable ladders. A project-specific active
policy or ceiling must not be written to user `~/.oat/config.json`.
Adoption preserves explicit cells, so re-run the resolver and completeness
check. An incomplete or missing ladder after adoption blocks readiness; do not
overwrite explicit cells or silently infer a fallback. Non-interactive setup
also blocks on a missing or incomplete ladder.

Then resolve the named ceiling in this order:

1. Project `state.md` frontmatter `oat_dispatch_policy`
2. Legacy project `oat_dispatch_ceiling`
3. Config `workflow.dispatchPolicy.*` as a proposed starting value
4. Interactive quick-planning prompt
5. Unresolved non-interactive state blocks implementation readiness

Generate the canonical prompt with:

```bash
oat project dispatch-ceiling choices --format markdown
```

Do not hand-type the dispatch policy menu.
`Uncapped`: OAT still manages dispatch selection. It has no named maximum.
`Inherit Host Defaults`: OAT does not choose model or effort.
`Leave Unresolved` is a planning deferral.
Implementation preflight must block until a runnable ceiling resolves.

The menu includes every named tier plus `Uncapped`, `Inherit Host
Defaults`, and `Leave Unresolved`. A named tier is a maximum, never an
enduring exact model-family or effort preference. A named `High` ceiling
keeps lower configured `Economy`, `Balanced`, and `High` candidates
available at or below that maximum. An optional phase Dispatch Profile may
narrow the maximum.

```yaml
oat_dispatch_policy:
  mode: managed
  policy: high
  source: project-state
```

Persist the active project ceiling only in `"$PROJECT_PATH/state.md"`. Do not
copy compiled provider targets into this shape or user config. `Uncapped` and
`Inherit Host Defaults` remain explicit modes; `Leave Unresolved` and
non-interactive unresolved state are not implementation-ready.

### Step 3.55: Configure Optional Phase Gate Review

After the generated quick plan has stable phase IDs and before Step 3.6 starts
the plan artifact review, invoke the `Shared Phase Gate Review Setup Contract` from
`oat-project-plan-writing`.

When that contract offers a choice, render its required question verbatim:
"Should an additional cross-runtime phase gate review run after implementation
phases? Built-in per-phase root reviews and the final review run regardless of
this choice." Do not add a bare `(Recommended)` option label.

If `plan.md` already contains an explicit `oat_phase_review_gate`, preserve it
through the shared contract without probing, prompting, or mutation. Otherwise
let the contract probe qualifying targets and offer all phases, selected
phases, or disabled. If the probe fails, no target qualifies, or the user
declines, leave Phase gate review disabled and continue with the contract's concise
status output.

This Phase gate review setup is independent from HiLL checkpoints. Do not read or
change HiLL fields here, and do not add a provider/model `--target` to any
lifecycle command.

### Step 3.6: Run Plan Artifact Review Loop

Before dispatching the artifact reviewer, invoke the `Managed Dispatch
Readiness and Review Contract` from `oat-project-plan-writing`:

```bash
oat project dispatch-ceiling resolve --provider "$ACTIVE_PROVIDER" --role reviewer --preflight --json
```

If managed resolution or the complete ladder is unresolved, return to Step
3.5, adopt the recommendation in the selected ownership scope, and re-run the
resolver. Do not hand the quick plan to implementation while either contract is
unresolved.

Invoke the shared `Auto Artifact-Review Loop` from `oat-project-plan-writing` with target `plan` before syncing project state or handing off to implementation.

Required payload:

- `target: plan`
- `type: artifact`
- `scope: plan`
- `artifact_path: "$PROJECT_PATH/plan.md"`
- `oat_output_mode: structured`

Apply the shared loop exactly:

- Resolve `workflow.autoArtifactReview.plan`; only an explicit `false` skips the loop.
- Resolve `oat_orchestration_retry_limit` from project state, defaulting to `2`.
- Review in the current planning parent by deliberate inheritance by default.
  Do not launch a managed child unless launcher-owned evidence identifies that
  parent as unknown or below the resolved reviewer ceiling.
- For that exception only, apply the shared concrete target contract. A Codex
  materialized variant must first be launched as the exact native `agent_type`;
  only a recorded actual pre-start role-selection rejection permits a fresh
  child pinned to the resolved model and effort. Claude uses the exact
  resolver-returned `providers.claude.dispatchArgs.model` value. Cursor
  launches the exact resolver-returned
  `providers.cursor.dispatchArgs.variant` native reviewer variant first;
  Cursor model strings remain opaque inside the mapping and resolver. Only a
  pre-start native role-selection rejection permits another route.
- After acceptance, poll, nudge, or continue only through the existing reviewer
  handle. A terminal timeout blocks or escalates without another launch.
  Replacement eligibility is limited to explicit pre-start rejection.
- Run an exception inline only with verified equivalent current-host model and
  effort controls. Default inherited review runs in the planning parent. If
  neither route applies, fail closed before artifact review.
- Apply Critical and Important artifact-local fixes when unambiguous; offer Medium and Minor fixes instead of silently applying them.
- Re-dispatch after rewrites until clean or the retry bound is exhausted.
- Update the `plan` artifact row in the `## Reviews` table to `passed` when clean. If residual findings remain, preserve the row and surface the residual findings before downstream handoff.

### Gate Execution

The quick-start exit-gate review scope is the complete artifact bundle that
exists at this point:

- `discovery.md`, including assumptions, constraints, and the chosen depth;
- `design.md` when lightweight design was produced;
- `plan.md`, including task completeness and executable verification.

Review the bundle as one pre-implementation handoff so discovery assumptions
and lightweight design decisions are checked with the plan that depends on
them. This broadens review scope only; it does not change gate configuration
schema or authorize runtime argument injection.

Legacy quick-start gates whose configured command or prompt explicitly reviews
only `plan.md` remain valid. Execute those commands unchanged, record
`legacy-plan-only` scope in gate provenance, and do not require a config
migration. New or bundle-capable gate declarations should evaluate every
artifact above that exists.

After artifact finalization and plan artifact review, run the configured gate
as the last check before plan and project completion:

1. Resolve the gate for this skill:

   ```bash
   oat gate resolve <this-skill> --json
   ```

   If the command returns JSON `null`, no gate is configured; proceed directly to the completion steps in Step 3.7 below.

2. Export the resolved project path into the command shell:

   ```bash
   export PROJECT_PATH
   ```

   If the resolved command invokes `oat gate review`, the configured review command must already include `--project "$PROJECT_PATH"` and must not include `--target <id>`. A valid reusable shape is `oat gate review --project "$PROJECT_PATH" ...`. If the declaration is missing, stop and migrate the stored gate command; do not inject or append arguments at execution time.

3. Resolve the current planning parent's model identity from session context.
   When that identity is non-empty and the resolved configured command invokes
   `oat gate review`, export
   `OAT_GATE_PRODUCER_IDENTITY=<model>:declared` for that command invocation.
   For a non-review configured command or unavailable current identity, ensure
   `OAT_GATE_PRODUCER_IDENTITY` is unset. Do not persist the value or alter the
   configured command.

4. Execute the resolved command exactly as configured and unchanged. Capture
   stdout, stderr, the exit code, and the structured JSON result. A zero exit
   code means the review passed its threshold, but it does not by itself
   authorize artifact receipt or complete the handoff.

5. Review-artifact handoff:
   - Parse the structured gate result. An exit code or artifact path alone never authorizes `oat-project-review-receive`.
   - Invoke receive only when all three conditions hold: `status` is `ok` or `blocked`, the envelope explicitly sets `receiveEligible: true`, and a non-null `handoff` confirms the artifact was corroborated.
   - `receiveEligible: false` is a hard stop even when `artifactPath` is present. Never receive `targeting_correlation_failed`; correct the project/run routing and run a new gate.
   - Keep `artifact_validation_failed` outside receive until the artifact is corrected and the gate successfully revalidates it. Treat `review_failed`, unknown statuses, null handoffs, and contradictory eligibility fields as operational failures.
   - `blocked` exits nonzero but is receive-eligible; `ok` exits zero and still requires durable receive disposition. Route by structured status and eligibility, not by exit code.

6. If the command exits nonzero, use `description` to orient the next steps and handle `onFailure`:
   - `block`: read gate feedback, remediate, and re-run the gate up to `maxAttempts` attempts (default `2`). If attempts are exhausted, escalate to the human with accumulated feedback and append that feedback to `implementation.md`. Treat a launch failure, missing CLI, or no eligible runtime as escalation-biased and do not spend it as a remediation attempt.
   - `prompt`: surface the gate failure and ask the human how to proceed.
   - `warn`: record the gate failure and continue.

7. Runtime selection note: the review-only declaration carries producer
   identity, not reviewer runtime identity. By default, `oat gate review` and
   `oat gate cross-provider-exec` resolve the current host from built-in
   `hostDetectionCommand`s and avoid the same runtime when no exact target is
   supplied. Reusable lifecycle skill-gate commands must not include
   `--target <id>` so independent review stays provider-neutral. Use explicit
   targets only for manual/debug commands or deliberate local/user-specific
   overrides; do not hardcode provider/model targets in bundled skill guidance
   or shared lifecycle gate examples.

A gate that ends in `block` after attempts are exhausted, or at an unresolved
`prompt` boundary, means the completion steps below MUST NOT run; the phase
stays `in_progress` and resumable.

### Step 3.7: Record Review Disposition and Mark Plan Complete

Reach this completion boundary only after the configured gate passes or resolves
according to its `onFailure` policy.

Before changing readiness, durably record the review outcome in `plan.md`:

- When review ran, update the `plan` review row in the `## Reviews` section to
  the outcome reached by Step 3.6. Use `passed` only for a clean result. If
  residual findings remain, retain their actual non-passed status and add a
  concise residual-finding disposition in the same section.
- When `workflow.autoArtifactReview.plan` is explicitly `false`, record the
  explicit skip in the `## Reviews` section as
  `Plan artifact review: skipped (workflow.autoArtifactReview.plan=false)`.
  Do not claim that the plan passed review.

The review row or explicit skip must be written to `plan.md`; chat or status
output alone is not durable. Only after that write succeeds, atomically update
the plan frontmatter:

- `oat_status: complete`
- `oat_ready_for: oat-project-implement`
- `oat_phase_status: complete`
- `oat_template: false`

If dispatch remains unresolved, review execution fails closed, or the outcome
cannot be recorded, leave the Step 3 pre-review values unchanged and commit
them before stopping. Never expose a partially reviewed quick plan to
`oat-project-implement`.

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
- record the `plan` artifact review row from Step 3.6 unless `workflow.autoArtifactReview.plan` was explicitly disabled

### Step 5: Initialize Implementation Tracking

Ensure `"$PROJECT_PATH/implementation.md"` exists and frontmatter is resumable:

- `oat_status: in_progress`
- `oat_current_task_id: p01-t01` (or first task in plan)

### Step 6: Refresh Repo Dashboard

Always regenerate the repo dashboard after quick-start updates (including resume path):

```bash
oat state refresh
```

### Step 6.5: Commit Quick-Start Artifacts

After dashboard refresh, stage and commit the changed quick-start artifacts before handing off to implementation or stopping.

```bash
for path in \
  "$PROJECT_PATH/discovery.md" \
  "$PROJECT_PATH/design.md" \
  "$PROJECT_PATH/plan.md" \
  "$PROJECT_PATH/implementation.md" \
  "$PROJECT_PATH/state.md"; do
  [ -e "$path" ] && git add "$path"
done
git diff --cached --quiet || git commit -m "chore(oat): update quick-start artifacts for {project-name}"
```

### Step 7: Output Next Action

Report:

- workflow mode (`quick`)
- total phases/tasks generated
- first task ID
- execution shape summary (sequential or declared parallel groups)
- next options:
  - `oat-project-implement`
- dashboard location: `.oat/state.md` (confirm it was regenerated locally)

## Success Criteria

- ✅ Active project exists and pointer is valid.
- ✅ `state.md` marks `oat_workflow_mode: quick`.
- ✅ `discovery.md` contains synthesized or backfilled quick discovery decisions from the session context.
- ✅ `plan.md` is complete and executable (`oat_ready_for: oat-project-implement`).
- ✅ `plan.md` records the plan artifact review row unless `workflow.autoArtifactReview.plan` was explicitly disabled.
- ✅ `implementation.md` is initialized for resumable execution.
- ✅ Changed quick-start artifacts are committed before handoff or pause; `.oat/state.md` is refreshed locally when available.
- ✅ Configured gate has run, and only a corroborated, receive-eligible artifact has been handed off to `oat-project-review-receive` before it is treated as consumed.
