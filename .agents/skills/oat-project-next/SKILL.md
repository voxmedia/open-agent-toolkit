---
name: oat-project-next
version: 1.0.13
description: Use when continuing work on the active OAT project. Reads project state, determines the next lifecycle action, and invokes the appropriate skill automatically.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash(git:*), Bash(oat:*), Skill
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

- Print each step indicator at the **start** of that step, not all at once upfront:
  - `[1/6] Resolving active project…`
  - `[2/6] Reading project state…`
  - `[3/6] Classifying artifact state…`
  - `[4/6] Checking for unprocessed reviews…`
  - `[5/6] Routing to target skill…`
  - `[6/6] Invoking {target-skill}…`

## Behavioral Notes

This skill is purely a reader and dispatcher — it never mutates project state. All state mutations are handled by the target skill it invokes.

**Relationship to oat-project-progress:** Progress is a read-only diagnostic that outputs a status report and recommendation. This skill reads the same state and dispatches to the recommended skill directly. They are complementary. A user running progress then next may see different recommendations for "Tier 2" states (see Boundary Detection below) — this is intentional and by design.

## Process

### Step 0: Resolve Active Project

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
```

Before reading project state, resolve the active project's scope and pull a
synced checkout. Arrival is read-oriented: if scope resolution fails, warn,
skip the pull, and continue into the existing missing/invalid-project routing
instead of terminating the skill.

```bash
if [ -n "$PROJECT_PATH" ]; then
  if ! PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value); then
    echo "Warning: Could not resolve active project scope; skipping arrival pull and continuing with available local state." >&2
    PROJECT_SCOPE=""
  elif [ "$PROJECT_SCOPE" = "synced" ]; then
    [ "$PROJECT_SCOPE" = "synced" ] && oat project pull "$PROJECT_PATH"
  fi
fi
```

**If `PROJECT_PATH` is missing or invalid (directory does not exist):**

Ask the CLI for its all-scope project inventory. Do not probe only the shared
projects root:

```bash
PROJECT_LIST_JSON=$(oat project list --json) || exit 1
```

Read the structured `projects` array. It includes shared projects, local-only
projects, and synced records whose detached checkout is absent.

- **The `projects` array is empty:** Report error and suggest:
  - `oat-project-new` — Create a spec-driven project
  - `oat-project-quick-start` — Start a quick workflow project
  - `oat-project-import-plan` — Import an external plan
  - **STOP.** Do not attempt routing.

- **The `projects` array is non-empty but the active pointer is missing or
  invalid:** Show the available project names with their `scope` and `checkout`
  state, then invoke `oat-project-open` by loading the current
  `oat-project-open/SKILL.md` and following it, so the user selects an existing
  project. An absent-checkout synced record and a local-only project both take
  this selection route; never suggest creating a replacement project. **STOP**
  this router after the selection workflow returns so the next invocation can
  pull/read the chosen project normally.

**If `PROJECT_PATH` is valid:** derive `{project-name}` as the basename of the path.

### Step 1: Read Project State

Read `"$PROJECT_PATH/state.md"` frontmatter and extract:

| Field                     | Used For                                                                     |
| ------------------------- | ---------------------------------------------------------------------------- |
| `oat_phase`               | Current lifecycle position (discovery, spec, design, plan, implement)        |
| `oat_phase_status`        | Phase completion state (in_progress, complete, pr_open)                      |
| `oat_workflow_mode`       | Routing table selection (spec-driven, quick, import). Default: `spec-driven` |
| `oat_hill_checkpoints`    | Which phases require HiLL approval                                           |
| `oat_hill_completed`      | Which HiLL gates have been passed                                            |
| `oat_blockers`            | Informational warnings (not routing gates)                                   |
| `oat_implement_exit_gate` | Whether the implementation exit gate is allowed and fresh                    |

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
| spec      | `oat-project-design`   |
| design    | `oat-project-design`   |
| plan      | `oat-project-plan`     |

Note: a `spec` HiLL phase only appears in legacy projects scaffolded before requirements confirmation was folded into `oat-project-design`. New projects scaffold with `['discovery', 'design']` HiLL checkpoints, so `spec` falls through to `oat-project-design` here as a graceful migration. The standalone `oat-project-spec` skill remains available as an opt-in for users who want to formalize requirements separately.

Note: `implement` is intentionally omitted. Implementation-phase checkpoints are handled by `oat_plan_hill_phases` in plan.md (plan-phase-level gates), not by the workflow-level `oat_hill_checkpoints` in state.md.

#### Step 3b: Phase Routing Tables

If `oat_phase == "implement"` AND (`oat_phase_status == "complete"` OR `oat_phase_status == "pr_open"`):
→ Skip to **Step 5: Post-Implementation Router**

Otherwise, look up the target skill from the routing table for the current `oat_workflow_mode`:

**Spec-Driven Mode** (default):

| Current Phase | Phase Status | Boundary Tier        | Target Skill               |
| ------------- | ------------ | -------------------- | -------------------------- |
| discovery     | in_progress  | tier 3 (template)    | `oat-project-discover`     |
| discovery     | in_progress  | tier 2 (substantive) | `oat-project-design`       |
| discovery     | complete     | tier 1               | `oat-project-design`       |
| spec          | in_progress  | tier 3               | `oat-project-design`       |
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
| plan          | in_progress  | tier 3        | `oat-project-quick-start`  |
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

\* `oat-project-implement` handles both sequential and parallel execution.

### Step 4: Check for Unprocessed Reviews (Review Safety Check)

Before dispatching the target skill, check for unprocessed review artifacts:

**Step 1:** Scan `{PROJECT_PATH}/reviews/` directory (exclude `archived/` subdirectory).

- If no files found → skip, proceed to dispatcher.

**Step 2:** Cross-reference against plan.md Reviews table (if it exists):

- For each active artifact, match the event by Scope + Type + artifact filename;
  never infer its status from another row that shares only the scope.
- Status `"passed"` → processed (review completed successfully)
- Status `"fixes_added"` or `"fixes_completed"` → processed (review-receive already converted findings to tasks)
- Any other status (blank, `"pending"`, `"in_progress"`, `"received"`) → **UNPROCESSED**
- File exists in `reviews/` but has NO entry in the Reviews table → **UNPROCESSED**

**Step 3:** If any unprocessed reviews exist → override routing target to `oat-project-review-receive`. Announce: "Unprocessed review feedback detected — routing to review-receive first."

**Design note:** This expands beyond the spec's original definition of "processed" (which only listed `passed`) to include `fixes_added` and `fixes_completed`, because re-invoking review-receive on already-processed reviews would be redundant.

### Step 5: Post-Implementation Router

Entry condition: `oat_phase == "implement"` AND (`oat_phase_status == "complete"` OR `oat_phase_status == "pr_open"`)

Apply the following checks in priority order. Stop at the first match:

**5.0: Unresolved implementation exit gate**

Before every other post-implementation route, inspect
`oat_implement_exit_gate` in project state. If
`oat_implement_exit_gate` is absent, `pending`, `blocked`, `stale`, malformed,
or not fresh, route to `oat-project-implement`.

This override applies even when `oat_phase_status` is `complete` or `pr_open`,
and before the summary, document, PR, or `oat-project-complete` routes. When a
qualified allowed result matches but its rolling checkpoint trails HEAD,
announce exactly: "Implementation exit gate freshness checkpoint pending —
resume with `oat-project-implement` before post-implementation routing." For all
other unresolved or stale cases, announce exactly: "Implementation exit gate
unresolved or stale — resume with `oat-project-implement` before
post-implementation routing."

Only an `allowed` and fresh exit-gate disposition falls through to the normal
post-implementation checks.

Validate freshness from the complete persisted transition, not from `status`
alone:

- `allowed/no_gate` is valid only with `disposition: no_gate`, null gate-run and
  artifact provenance, and current `reviewed_head` and implementation
  fingerprint fields. Qualified state also requires `implementation_base_ref`,
  `freshness_head`, and `freshness_fingerprint`.
- `allowed/configured` is valid only with `disposition: passed`, `warned`, or
  `prompt_approved`; matching `config_fingerprint`, `reviewed_head`,
  `implementation_fingerprint`, configured gate-run provenance, and any eligible
  receive durably completed. Qualified state also requires the complete rolling
  freshness fields.
- `pending`, `blocked`, malformed, contradictory, or legacy-absent state never
  falls through. Pending and blocked generations resume their persisted
  configuration; configuration-fingerprint mismatch fails closed.
- Recognized closeout-only descendants preserve a fresh allowed result; unknown
  paths and substantive changes route as stale. The recognized set is limited
  to configured gate artifacts and receipts, project tracking and
  `project-log.md` appends, summary/documentation/PR sequence outputs, final
  HiLL bookkeeping, and completion bookkeeping. A category match without its
  persisted transition boundary is unknown, not closeout-only.
- For qualified state, require `implementation_base_ref`, `freshness_head`, and
  a valid `freshness_fingerprint`. Exactly one merge base and 64-character
  lowercase hexadecimal implementation/freshness digests are mandatory.
  Missing or malformed inputs route as stale. When HEAD differs from
  `freshness_head`, use the full raw Git byte algorithm read from the current
  `oat-project-implement/SKILL.md`, with only its literal state-carrier
  exclusion, rather than a remembered version of that algorithm. Verify
  and ignore state-only checkpoint commits before classification. An unchanged
  qualified fingerprint preserves freshness across a merge, rebase, or base
  update but routes to `oat-project-implement` to persist the advanced rolling
  checkpoint; a mismatch routes as stale. This read-only router never advances
  state or invents another fingerprint algorithm.
- Legacy unqualified fingerprints retain the closeout-only descendant-path
  check. Any implementation, test, skill, template, workflow configuration, or
  other unrecognized change after `reviewed_head` invalidates the implementation
  fingerprint and routes to `oat-project-implement`. Do not reinterpret or
  migrate legacy state while routing.

Routing is read-only: announce stale or malformed state, but leave transition
repair, gate execution, receive, and persistence to `oat-project-implement`.

**5.1: Incomplete approval-aware post-implementation sequence**

Before every other post-implementation route, inspect `oat_post_implement_sequence`
in project state. When the snapshot exists and is incomplete, route to
`oat-project-implement`. This applies even when `oat_phase_status` is `pr_open`
or a summary exists. A completed snapshot falls through to the normal router.

**5.2: Incomplete revision tasks**

Grep plan.md for `p-revN` phases. If any `p-revN` tasks exist with status != completed in implementation.md:
→ Route to `oat-project-implement`
→ Announce: "Revision tasks pending — continuing implementation"

**5.3: Unprocessed reviews**

Run the Review Safety Check (Step 4 above). If unprocessed reviews exist:
→ Route to `oat-project-review-receive`
→ Announce: "Unprocessed review feedback detected"

**5.4: Final code review not passed**

Extract only the exact level-two `## Reviews` ledger, stopping before the next
level-two heading, then select its latest appended event with `Scope="final"`
and `Type="code"`:

```bash
REVIEWS_SECTION=$(awk '
  /^## Reviews[[:space:]]*$/ { in_reviews = 1; next }
  in_reviews && /^##[[:space:]]/ { exit }
  in_reviews { print }
' "$PROJECT_PATH/plan.md" 2>/dev/null)
FINAL_ROW=$(printf '%s\n' "$REVIEWS_SECTION" | grep -E "^\\|\\s*final\\s*\\|\\s*code\\s*\\|" | tail -1 || true)
```

Ignore matching rows outside `REVIEWS_SECTION`; they are not review events.

- If `FINAL_ROW` is empty, OR it has `Status="pending"`:
  → Route to `oat-project-review-provide` (with scope hint: "code final")
  → Announce: "Implementation complete — triggering final code review"

- If `FINAL_ROW` has `Status="fixes_completed"`:
  → Route to `oat-project-review-provide` (with scope hint: "code final")
  → Announce: "Review fixes implemented — triggering re-review"

- If `FINAL_ROW` has another non-passed status (e.g., `"received"`, `"fixes_added"`) and Step 5.3 did not find an active top-level review artifact:
  → Route to `oat-project-review-provide` (with scope hint: "code final")
  → Announce: "Final review is not passed and no active review artifact exists — rerunning final review"

- If `FINAL_ROW` has `Status="passed"`:
  → Continue to 5.5

**5.5: Summary not done**

Read `{PROJECT_PATH}/summary.md`:

- If file doesn't exist OR `oat_status != "complete"`:
  → Route to `oat-project-summary`
  → Announce: "Final review passed — generating project summary"

**5.6: PR not created**

If `oat_phase_status != "pr_open"`:
→ Route to `oat-project-pr-final`
→ Announce: "Summary complete — creating final PR"

**5.7: PR is open**

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

**Invoke the target skill** using the Skill tool. Invoking the target means loading the target skill's current `SKILL.md` and following it directly, or dispatching a child that carries it; a remembered outcome or ambient discovery is not compliant. This step, not the Step 5 routing decisions, is this router's execution boundary.

## Success Criteria

- ✅ Active project resolved (or clear error with guidance if none set)
- ✅ State.md and artifact frontmatter read correctly
- ✅ Boundary tier classified correctly (complete / substantive / template)
- ✅ HiLL gates respected (not bypassed)
- ✅ Unprocessed reviews caught before advancing
- ✅ Correct target skill invoked for the current workflow mode and phase
- ✅ Routing announcement displayed before dispatch
