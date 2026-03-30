---
name: oat-project-next
version: 1.0.0
description: Use to continue working on the active OAT project. Reads project state, determines the next lifecycle action, and invokes the appropriate skill automatically.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash(git:*), Skill
---

# Project Next

Stateful router for the OAT project lifecycle. Reads project state and invokes the appropriate next skill.

## Prerequisites

- Active OAT project set in `.oat/config.local.json` (`activeProject`), or at least one project directory in the projects root

## Mode Assertion

**OAT MODE: Routing**

**Purpose:** Read project state and dispatch to the correct next lifecycle skill. Never mutate project state.

**BLOCKED Activities:**

- ❌ No modifying state.md, plan.md, implementation.md, or any project artifact
- ❌ No executing implementation tasks
- ❌ No creating or modifying review artifacts

**ALLOWED Activities:**

- ✅ Reading all project artifacts and frontmatter
- ✅ Scanning the reviews/ directory
- ✅ Invoking the determined target skill via the Skill tool

**Self-Correction Protocol:**
If you catch yourself:

- Modifying any project file → STOP (this skill is read-only)
- Making a routing decision without reading state → STOP (always read state.md first)

**Recovery:**

1. Acknowledge the deviation
2. Re-read project state
3. Route based on the algorithm below

## Progress Indicators (User-Facing)

- Print a phase banner once at start:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ NEXT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print step indicators matching the actual process:
  - `[1/6] Resolving active project…`
  - `[2/6] Reading state.md + artifact frontmatter…`
  - `[3/6] Classifying artifact state (boundary detection)…`
  - `[4/6] Checking for unprocessed reviews…`
  - `[5/6] Routing to target skill…`
  - `[6/6] Announcing + invoking {target-skill}…`

## Behavioral Notes

This skill is purely a reader and dispatcher — it never mutates project state. All state mutations are handled by the target skill it invokes.

**Relationship to oat-project-progress:** Progress is a read-only diagnostic that outputs a status report and recommendation. This skill reads the same state and dispatches to the recommended skill directly. They are complementary. A user running progress then next may see different recommendations for "Tier 2" states (see Boundary Detection below) — this is intentional and by design.

## Process

### Step 0: Resolve Active Project

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

**If `PROJECT_PATH` is missing or invalid (directory does not exist):**

Check whether any projects exist:

```bash
ls -d "$PROJECTS_ROOT"/*/ 2>/dev/null
```

- **No projects exist:** Report error and suggest:
  - `oat-project-new` — Create a spec-driven project
  - `oat-project-quick-start` — Start a quick workflow project
  - `oat-project-import-plan` — Import an external plan
  - **STOP.** Do not attempt routing.

- **Projects exist but none is active:** Report error and suggest:
  - `oat-project-open` — Select an existing project
  - **STOP.** Do not attempt routing.

**If `PROJECT_PATH` is valid:** derive `{project-name}` as the basename of the path.

### Step 1: Read Project State

Read `"$PROJECT_PATH/state.md"` frontmatter and extract:

| Field                  | Used For                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `oat_phase`            | Current lifecycle position (discovery, spec, design, plan, implement)                   |
| `oat_phase_status`     | Phase completion state (in_progress, complete, pr_open)                                 |
| `oat_workflow_mode`    | Routing table selection (spec-driven, quick, import). Default: `spec-driven`            |
| `oat_execution_mode`   | Implementation skill variant (single-thread, subagent-driven). Default: `single-thread` |
| `oat_hill_checkpoints` | Which phases require HiLL approval                                                      |
| `oat_hill_completed`   | Which HiLL gates have been passed                                                       |
| `oat_blockers`         | Informational warnings (not routing gates)                                              |

**If state.md is missing or unreadable:** Report error and suggest running the relevant phase skill directly. STOP.

Map `oat_phase` to the current artifact file:

| Phase       | Artifact File       |
| ----------- | ------------------- |
| `discovery` | `discovery.md`      |
| `spec`      | `spec.md`           |
| `design`    | `design.md`         |
| `plan`      | `plan.md`           |
| `implement` | `implementation.md` |

Read the artifact frontmatter and extract:

| Field           | Used For                                   |
| --------------- | ------------------------------------------ |
| `oat_status`    | Tier 1 detection (complete vs in_progress) |
| `oat_ready_for` | Direct routing target (skill name or null) |
| `oat_template`  | Tier 3 detection (true = still a template) |

**If artifact file is missing:** Treat as tier 3 (template) — route to the current phase skill.

### Step 2: Classify Artifact State (Boundary Detection)

Apply the following tiers in order:

**Tier 1 (Complete with target):**

- `oat_status == "complete"` AND `oat_ready_for` is not null
- → Use `oat_ready_for` as the target skill

**Tier 1b (Complete without target):**

- `oat_status == "complete"` AND `oat_ready_for` is null
- → Route to the NEXT phase's skill (the artifact is complete, so advance)
- This handles cases where a phase skill completed the artifact but didn't set `oat_ready_for`.

**Tier 2 (Substantive content):**

- `oat_status == "in_progress"`
- AND `oat_template` is NOT `true` (field is absent or `false`)
- AND the artifact does NOT contain template placeholders (fallback check: patterns like `{Project Name}`, `{Copy of user's initial request}`, `{Clear description`)
- → Route to the NEXT phase's skill (the downstream skill handles marking the current phase complete)

**Tier 3 (Template/Empty):**

- `oat_template == true`
- OR the artifact contains template placeholder patterns
- OR the artifact file does not exist
- → Route to the CURRENT phase's skill (resume mid-work)

**Primary signal:** The `oat_template` frontmatter field. Templates from `.oat/templates/` include `oat_template: true`; phase skills set it to `false` when they begin working.

**Fallback heuristic:** Only needed when `oat_template` is missing. Check for `{Project Name}` in the title or `{Copy of` / `{Clear description` in section content.

### Step 3: Route to Target Skill

#### Step 3a: HiLL Gate Override (applied first)

If `oat_phase` is in `oat_hill_checkpoints` AND NOT in `oat_hill_completed`:
→ Route to the current phase's skill regardless of boundary tier or phase status.
→ Announce: "HiLL gate pending — routing to current phase for approval."

Phase-to-skill mapping for HiLL override:

| Phase     | Skill                  |
| --------- | ---------------------- |
| discovery | `oat-project-discover` |
| spec      | `oat-project-spec`     |
| design    | `oat-project-design`   |
| plan      | `oat-project-plan`     |

Note: `implement` is intentionally omitted. Implementation-phase checkpoints are handled by `oat_plan_hill_phases` in plan.md (plan-phase-level gates), not by the workflow-level `oat_hill_checkpoints` in state.md.

#### Step 3b: Phase Routing Tables

If `oat_phase == "implement"` AND (`oat_phase_status == "complete"` OR `oat_phase_status == "pr_open"`):
→ Skip to **Step 5: Post-Implementation Router**

Otherwise, look up the target skill from the routing table for the current `oat_workflow_mode`:

**Spec-Driven Mode** (default):

| Current Phase | Phase Status | Boundary Tier        | Target Skill               |
| ------------- | ------------ | -------------------- | -------------------------- |
| discovery     | in_progress  | tier 3 (template)    | `oat-project-discover`     |
| discovery     | in_progress  | tier 2 (substantive) | `oat-project-spec`         |
| discovery     | complete     | tier 1               | `oat-project-spec`         |
| spec          | in_progress  | tier 3               | `oat-project-spec`         |
| spec          | in_progress  | tier 2               | `oat-project-design`       |
| spec          | complete     | tier 1               | `oat-project-design`       |
| design        | in_progress  | tier 3               | `oat-project-design`       |
| design        | in_progress  | tier 2               | `oat-project-plan`         |
| design        | complete     | tier 1               | `oat-project-plan`         |
| plan          | in_progress  | tier 3               | `oat-project-plan`         |
| plan          | in_progress  | tier 2               | `oat-project-implement` \* |
| plan          | complete     | tier 1               | `oat-project-implement` \* |
| implement     | in_progress  | —                    | `oat-project-implement` \* |

**Quick Mode:**

| Current Phase | Phase Status | Boundary Tier | Target Skill               |
| ------------- | ------------ | ------------- | -------------------------- |
| discovery     | in_progress  | tier 3        | `oat-project-discover`     |
| discovery     | in_progress  | tier 2        | `oat-project-plan`         |
| discovery     | complete     | tier 1        | `oat-project-plan`         |
| plan          | in_progress  | tier 3        | `oat-project-plan`         |
| plan          | in_progress  | tier 2        | `oat-project-implement` \* |
| plan          | complete     | tier 1        | `oat-project-implement` \* |
| implement     | in_progress  | —             | `oat-project-implement` \* |

**Import Mode:**

| Current Phase | Phase Status | Boundary Tier | Target Skill               |
| ------------- | ------------ | ------------- | -------------------------- |
| plan          | in_progress  | tier 3        | `oat-project-import-plan`  |
| plan          | in_progress  | tier 2        | `oat-project-implement` \* |
| plan          | complete     | tier 1        | `oat-project-implement` \* |
| implement     | in_progress  | —             | `oat-project-implement` \* |

\* When `oat_execution_mode: subagent-driven`, use `oat-project-subagent-implement` instead.

### Step 4: Check for Unprocessed Reviews (Review Safety Check)

Before dispatching the target skill, check for unprocessed review artifacts:

**Step 1:** Scan `{PROJECT_PATH}/reviews/` directory (exclude `archived/` subdirectory).

- If no files found → skip, proceed to dispatcher.

**Step 2:** Cross-reference against plan.md Reviews table (if it exists):

- Status `"passed"` → processed (review completed successfully)
- Status `"fixes_added"` or `"fixes_completed"` → processed (review-receive already converted findings to tasks)
- Any other status (blank, `"pending"`, `"in_progress"`, `"received"`) → **UNPROCESSED**
- File exists in `reviews/` but has NO entry in the Reviews table → **UNPROCESSED**

**Step 3:** If any unprocessed reviews exist → override routing target to `oat-project-review-receive`. Announce: "Unprocessed review feedback detected — routing to review-receive first."

**Design note:** This expands beyond the spec's original definition of "processed" (which only listed `passed`) to include `fixes_added` and `fixes_completed`, because re-invoking review-receive on already-processed reviews would be redundant.

### Step 5: Post-Implementation Router

Entry condition: `oat_phase == "implement"` AND (`oat_phase_status == "complete"` OR `oat_phase_status == "pr_open"`)

Apply the following checks in priority order. Stop at the first match:

**5.1: Incomplete revision tasks**

Grep plan.md for `p-revN` phases. If any `p-revN` tasks exist with status != completed in implementation.md:
→ Route to `oat-project-implement` (or `oat-project-subagent-implement` if subagent-driven)
→ Announce: "Revision tasks pending — continuing implementation"

**5.2: Unprocessed reviews**

Run the Review Safety Check (Step 4 above). If unprocessed reviews exist:
→ Route to `oat-project-review-receive`
→ Announce: "Unprocessed review feedback detected"

**5.3: Final code review not passed**

Parse plan.md Reviews table for a row with `Scope="final"` and `Type="code"`:

- If no such row exists, OR row exists with `Status="pending"`:
  → Route to `oat-project-review-provide` (with scope hint: "code final")
  → Announce: "Implementation complete — triggering final code review"

- If row exists with `Status="fixes_completed"`:
  → Route to `oat-project-review-provide` (with scope hint: "code final")
  → Announce: "Review fixes implemented — triggering re-review"

- If row exists with other non-passed status (e.g., `"received"`, `"fixes_added"`):
  → Route to `oat-project-review-receive` (review findings not yet converted to tasks)
  → Announce: "Final review in progress — continuing review cycle"

- If row exists with `Status="passed"`:
  → Continue to 5.4

**5.4: Summary not done**

Read `{PROJECT_PATH}/summary.md`:

- If file doesn't exist OR `oat_status != "complete"`:
  → Route to `oat-project-summary`
  → Announce: "Final review passed — generating project summary"

**5.5: PR not created**

If `oat_phase_status != "pr_open"`:
→ Route to `oat-project-pr-final`
→ Announce: "Summary complete — creating final PR"

**5.6: PR is open**

If `oat_phase_status == "pr_open"`:
→ Route to `oat-project-complete`
→ Announce: "PR is open — ready to complete project"

### Step 6: Announce and Invoke

Print the routing announcement:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ NEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: {project-name}
Current: {oat_phase} ({oat_phase_status}) — {boundary tier or post-impl step description}
Routing: → {target-skill-name}
Reason: {one-line explanation}
```

**Blocker warning:** If `oat_blockers` is non-empty, add before the routing line:

```
⚠️  Blockers: {blocker descriptions}
```

The router still dispatches (blockers are informational, not gates).

**Invoke the target skill** using the Skill tool. The agent will load the skill content and follow it directly.

## Success Criteria

- ✅ Active project resolved (or clear error with guidance if none set)
- ✅ State.md and artifact frontmatter read correctly
- ✅ Boundary tier classified correctly (complete / substantive / template)
- ✅ HiLL gates respected (not bypassed)
- ✅ Unprocessed reviews caught before advancing
- ✅ Correct target skill invoked for the current workflow mode and phase
- ✅ Routing announcement displayed before dispatch
