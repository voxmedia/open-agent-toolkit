---
name: oat-project-review-receive
version: 1.6.1
description: Use when the user explicitly asks to receive review findings for an OAT project — e.g. "receive review", "process review", "process the project review", or confirms a previously offered review-receive step. Do NOT auto-invoke merely because a review file exists. Resolves the latest review and offers before acting.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Bash(oat:*), Glob, Grep, AskUserQuestion
---

# Receive Review

Process review findings into actionable plan tasks and guide gap closure execution.

## Purpose

Turn review output into plan changes and a clear next action. This closes the feedback loop between reviewing and fixing.

## Prerequisites

**Required:** An active project review artifact can be resolved, usually from the top level of `{PROJECT_PATH}/reviews/`. Conversational entry may first discover the latest project or ad-hoc review with `oat review latest`; ad-hoc reviews should be routed to `oat-review-receive`.

This skill assumes the reviewed project artifacts were already committed before the review ran. If you discover untracked core project artifacts here, treat that as earlier workflow drift and include them in the bookkeeping fix instead of leaving the project partially tracked.

## Model Invocation Gate

This skill is model-invokable only for explicit review-receive asks such as "receive review" or "process review", or when the user confirms a previously offered review-receive step. Do NOT auto-invoke just because a review artifact exists.

Before acting, resolve either an active project review or a latest ad-hoc review target. If the latest target is ad-hoc, offer to route to `oat-review-receive` instead of processing it with this project lifecycle skill. If no target is resolvable, offer `oat-project-review-provide` for project reviews or `oat-review-provide` for ad-hoc reviews.

When a project review target is resolvable, summarize the selected review path, scope, and generated date, then ask before updating artifacts.

## Mode Assertion

**OAT MODE: Receive Review**

**Purpose:** Convert review findings into plan tasks for systematic gap closure.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ RECEIVE REVIEW
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work (parsing findings, updating artifacts, committing), print 2–5 short step indicators, e.g.:
  - `[1/4] Reading review artifact…`
  - `[2/4] Converting findings → plan tasks…`
  - `[3/4] Updating plan.md + implementation.md…`
  - `[4/4] Committing + next-step summary…`
- For long-running operations (large review artifacts, many findings), print a start line and a completion line (duration optional).
- Keep it concise; don’t print a line for every shell command.

**BLOCKED Activities:**

- No fixing issues directly (convert to tasks first)
- No skipping findings
- No re-reviewing
- For `artifact` reviews: no converting findings into plan tasks
- For `artifact` reviews: no deferring findings by default
- No treating accepted design/code drift as a no-op; accepted drift must be converted to an artifact-alignment task or explicitly deferred, with an `implementation.md` note

**ALLOWED Activities:**

- Reading review artifacts
- Updating plan.md with new tasks
- Updating implementation.md
- Routing to oat-project-implement
- For `artifact` reviews: updating reviewed artifact files directly after user confirmation

## Artifact Hygiene

Artifact hygiene contract: Before finishing or committing, format every file you created or edited. Use the concrete write/fix formatting command supplied by the governing plan, task, or brief. If none is usable, discover the repository's documented write/fix command from applicable `AGENTS.md`/`CLAUDE.md` instructions and relevant package manifests; do not infer or hardcode a formatter. Prefer a file-scoped invocation when supported, and avoid rewriting unrelated files. If no command is discoverable, warn once with `no format command discovered in repo instructions; skipping`, then continue.

After formatting, run only repository checks relevant to the files changed;
writing prose artifacts or review bookkeeping does not imply unrelated full
test suites.

## Process

### Step 0: Resolve Active Project

OAT stores active project context in `.oat/config.local.json` (`activeProject`, local-only).

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

**If `PROJECT_PATH` is missing/invalid:**

- Continue to Step 1 without a project path so `oat review latest` can still discover ad-hoc review targets.
- Do not guess or write `activeProject` during model-invoked target discovery.
- If the user explicitly names a project, set `PROJECT_PATH` to `${PROJECTS_ROOT}/{project-name}` and validate it before Step 1.

**If `PROJECT_PATH` is valid:** derive `{project-name}` as the directory name (basename of the path).

### Step 1: Locate Latest Review Artifact

```bash
if [ -n "${PROJECT_PATH:-}" ] && [ -d "$PROJECT_PATH" ]; then
  oat review latest --project "$PROJECT_PATH" --actionable-project --json
else
  oat review latest --json
fi
```

Selection rules:

- With a valid project, use the `--actionable-project` path first. It resolves only an active/actionable project review from the top-level `reviews/` directory, so newer historical artifacts in `reviews/archived/` cannot strand an older active event.
- If the actionable-project result has `path: null`, run `oat review latest --json` without `--actionable-project` to discover the latest ad-hoc target or report project history. The default resolver intentionally preserves all-history ordering across project (`reviews/` and `reviews/archived/`) and ad-hoc locations.
- Both resolver paths order candidates by `oat_generated_at` frontmatter rather than filesystem mtime. Review artifacts carry a seconds-precision `oat_generated_at` and a matching timestamped filename, so same-scope same-day re-gates order deterministically and the newest round wins — never assume the plain `<scope>-review-<date>.md` name is current.
- Read the JSON result:
  - `path: null` means no review target was found.
  - `kind: "project"` and `actionable: true` means this skill can process the target when the path is an active top-level project review.
  - An `archived: true` or `actionable: false` result from the all-history fallback means no active project review was resolved and the selected result is historical/non-actionable for project review-receive.
  - `kind: "adhoc"` means route to `oat-review-receive` after offering that handoff to the user.
- Only process active project review artifacts in the top level of `"$PROJECT_PATH/reviews/"`.
- Treat archived project artifacts as history only; do not receive them automatically. If `oat review latest` returns an archived project review, tell the user no active project review is waiting and offer to run `oat-project-review-provide`.

Fallback when the CLI is unavailable:

```bash
ls -t "$PROJECT_PATH/reviews/"*.md 2>/dev/null | head -10
```

Use this fallback only for active project reviews. It cannot discover ad-hoc reviews and its filesystem ordering is less reliable than `oat_generated_at`, so state that limitation if fallback is used.

**If no active review files:** Block and ask user to run the `oat-project-review-provide` skill first.

**If multiple candidates:**

- Auto-select the most recent review artifact by `oat_generated_at` frontmatter date (not filesystem mtime, which is unreliable across branches).
- Inform the user which artifact was selected and list any other active artifacts for awareness.
- Do not prompt for selection; proceed immediately with the most recent.

**Read the selected review file completely.**

For a code review, read `oat_review_head_sha`, `oat_review_invocation`, and
`oat_gate_target` from frontmatter. Accept the reviewed head only when it is a
full 40-character hexadecimal SHA; never expand or infer an abbreviated,
symbolic, or range value during receive. A missing invocation remains unknown;
do not assume a legacy artifact was manual. Write `-` for absent provenance
rather than borrowing values from another review event. `oat_gate_target` is
meaningful only when the invocation is `gate`.

Derive archive bookkeeping before making lifecycle edits:

```bash
SOURCE_REVIEW_FILENAME=$(basename "$REVIEW_PATH")
REVIEW_FILENAME="$SOURCE_REVIEW_FILENAME"
ARCHIVED_REVIEW_DIR="$PROJECT_PATH/reviews/archived"
ARCHIVED_REVIEW_PATH="$ARCHIVED_REVIEW_DIR/$REVIEW_FILENAME"

if [[ -e "$ARCHIVED_REVIEW_PATH" ]]; then
  REVIEW_STEM="${SOURCE_REVIEW_FILENAME%.md}"
  ARCHIVE_TIMESTAMP=$(date -u +%Y-%m-%dT%H%M%SZ)
  REVIEW_FILENAME="${REVIEW_STEM}-${ARCHIVE_TIMESTAMP}.md"
  ARCHIVED_REVIEW_PATH="$ARCHIVED_REVIEW_DIR/$REVIEW_FILENAME"
  ARCHIVE_COLLISION_INDEX=2

  while [[ -e "$ARCHIVED_REVIEW_PATH" ]]; do
    REVIEW_FILENAME="${REVIEW_STEM}-${ARCHIVE_TIMESTAMP}-${ARCHIVE_COLLISION_INDEX}.md"
    ARCHIVED_REVIEW_PATH="$ARCHIVED_REVIEW_DIR/$REVIEW_FILENAME"
    ARCHIVE_COLLISION_INDEX=$((ARCHIVE_COLLISION_INDEX + 1))
  done
fi
```

`SOURCE_REVIEW_FILENAME` identifies the selected active event before archival.
`REVIEW_FILENAME` and `ARCHIVED_REVIEW_PATH` are the collision-free final
identity and destination. Resolve them here, before writing plan,
implementation, or artifact-review references. Never choose a different
basename later in either receive path.

### Step 2: Parse Findings into Buckets

Extract findings from the review artifact and categorize:

**Critical (must fix before merge):**

- Missing P0 requirements
- Security vulnerabilities
- Broken functionality
- Missing tests for critical paths

**Important (should fix before merge):**

- Missing P1 requirements
- Missing error handling
- Significant maintainability issues

**Medium (default fix before pass):**

- P2 requirements with meaningful behavior/quality impact
- Moderate maintainability/testability issues
- Contract gaps that can cause future regressions

**Minor (fix if time permits):**

- Cosmetic/non-behavioral polish
- Style issues
- Documentation gaps

**Count findings:**

```
Critical: {N}
Important: {N}
Medium: {N}
Minor: {N}
```

Assign stable finding IDs for this receive run and keep them consistent in all prompts:

- Critical: `C1`, `C2`, ...
- Important: `I1`, `I2`, ...
- Medium: `M1`, `M2`, ...
- Minor: `m1`, `m2`, ...

For each finding, build a structured register entry:

- ID, severity, title, file/line (if available)
- Reviewer finding (issue + suggested fix)
- Agent analysis (agree/disagree + why)
- Recommendation (convert to task now vs defer with rationale)
- Task Scope (`Large` | `Moderate` | `Minor` | `Negligible`)
- Drift disposition, when applicable:
  - `code_fix_required` — implementation should change
  - `artifact_alignment_required` — shipped implementation is defensible; design/docs/plan should be aligned
  - `explicit_deferral` — drift is accepted for now with a concrete rationale and follow-up trigger
- For `artifact` reviews, use dispositions:
  - `resolve_in_artifact`
  - `rejected_with_rationale` (invalid/not applicable)
  - `needs_user_direction` (unclear or disagreement)

**If Critical + Important + Medium == 0:**

- For non-final scopes:
  - Mark the review as `passed` in the plan.md Reviews table (if plan.md exists)
  - No fix tasks are added
  - Minor findings still follow the Step 9 recommendation/disposition rules before routing onward
  - Route user to normal next action
- For `final` scope:
  - Do not mark `passed` until both gates are complete:
    1. Deferred-medium resurfacing/disposition (Step 8.5)
    2. Minor findings disposition is explicitly confirmed by user (Step 9)
  - After both gates are complete, mark `passed` and route to PR/finalization
- Note: `passed` means “review passed” (not merely “fixes completed”). If fixes exist, use `fixes_completed` until a re-review passes.

### Step 2.5: Present Findings Overview + Analysis (Required Before Any Disposition Prompt)

Before asking the user to defer/convert findings, present a concise but complete summary so they do not need to open the review file.

Required output structure:

```markdown
Findings Overview:

- Critical: {N}
- Important: {N}
- Medium: {N}
- Minor: {N}

Critical Findings:
{for each C\* finding}

- `{ID}` `{title}` (`{file}:{line}` if known)
  - Reviewer finding: {issue + reviewer fix guidance}
  - Finding analysis: {why you agree/disagree; practical risk if not fixed}
  - Recommendation: {convert_to_task | defer_with_rationale}
  - Task Scope: {Large | Moderate | Minor | Negligible}

Important Findings:
{same pattern}

Medium Findings:
{same pattern}

Minor Findings:
{same pattern, include fix-now vs defer-now tradeoff in plain language}
```

Rules:

- Include all non-empty severities; if a severity has zero findings, state `None`.
- Keep each analysis concise and decision-oriented.
- Use finding IDs in every section and in every later user choice prompt.
- Every finding must include exactly one `Task Scope` line using: `Large`, `Moderate`, `Minor`, or `Negligible`.
- Scope meaning:
  - `Large`: likely multi-file or cross-module behavior change
  - `Moderate`: bounded implementation in one area with some verification breadth
  - `Minor`: small localized code/test/doc change
  - `Negligible`: trivial cleanup/refactor with very low risk
- Do not ask the user for disposition decisions until this overview is shown.

### Step 2.6: Select Review Handling Mode (Required)

Read `oat_review_type` and `oat_review_invocation` from review artifact frontmatter:

- If `oat_review_type == artifact`:
  - Present findings and proposed artifact edits/dispositions to the user first.
  - Require explicit user confirmation before applying any artifact edits.
  - Resolve findings directly in artifact files; do not convert findings into plan tasks.
  - Do not defer findings by default. Only use `rejected_with_rationale` for invalid findings, or `needs_user_direction` when user input is required.
- If `oat_review_type == code` AND `oat_review_invocation == auto`, OR `oat_review_invocation == gate` from a **blocking** gate (the gate-originated context does not indicate a passing-gate sweep):
  - **Auto-disposition mode.** This review was spawned by the auto-review checkpoint trigger in `oat-project-implement` or by a blocking `oat gate review`. Apply relaxed disposition defaults:
    - Critical/Important/Medium: convert to fix tasks (same as manual mode)
    - Minor: auto-convert to fix tasks unless clearly out of scope (e.g., cosmetic polish unrelated to changed code). Manual mode now also defaults minors to `convert` (see Step 9); auto/gate mode keeps the same intent — fix everything while context is fresh — but without any user prompts.
    - **No user prompts for disposition decisions.** The auto/gate review path runs fully autonomously.
    - Genuinely ambiguous findings (e.g., a medium the agent disagrees with) are deferred with a note explaining why, rather than pausing for interactive resolution.
  - Follow the task-conversion flow in Steps 3-10 with these adjusted defaults.
- If `oat_review_type == code` AND `oat_review_invocation == gate` from a **passing** gate (the gate-originated context indicates a passing-gate judgment sweep):
  - **Judgment-sweep mode.** The phase gate already passed at its `exit_nonzero_on` threshold, so the phase does not stop. Consume the artifact anyway, so its sub-threshold findings become durable, ordered dispositions in `implementation.md` instead of evaporating. Fully non-pausing; no user prompts.
    - The gate verdict decided whether the phase stops; it did **not** decide whether Medium/Minor findings are ignored. There are, by definition, no unresolved Critical/Important findings in a passing gate (if there were, the gate would have blocked).
    - Make a per-finding **judgment call** for each Medium/Minor — do not mechanically dump them all:
      - **Defer to final** (default): record under "Deferred Findings" (Mediums under "Deferred Findings (Medium)" so Step 8.5 resurfacing picks them up) with concrete rationale.
      - **Address now:** only for small, contained, low-risk fixes. Apply the fix, commit it with the phase bookkeeping, and record the disposition. Do **not** re-run the standard reviewer or re-gate the phase for address-now fixes.
      - **Reject** as false-positive / out-of-scope, with concrete rationale.
    - `address now` is an **exception, not the norm** — when in doubt, defer. Do not let a passing gate drift into behaving like a Medium-blocking gate by habit.
    - **Escalation exception:** if an address-now fix reveals or creates a Critical/Important concern, stop treating it as a sweep item. Convert it to a fix task and return control to the blocking-gate path (`oat-project-implement` re-runs the standard reviewer and the gate for the phase).
    - Do not add blocking fix tasks for deferred or rejected findings. After recording all dispositions, archive the artifact (Step 7.5) and commit review bookkeeping (Step 7.6) as usual.
- If `oat_review_type == code` (manual or `oat_review_invocation` absent):
  - Follow the existing task-conversion flow in Steps 3-10 with standard disposition behavior.

### Step 3: Determine Task Scope

Applies to `code` reviews only. (`artifact` reviews are handled via Step 2.6, the archive + routing in Step 10A, and the artifact summary path in Step 11.)

**Which phase should receive fix tasks?**

1. Check review scope from artifact frontmatter (`oat_review_scope`)
2. If scope is `pNN` (phase) or `pNN-tNN` (task): add fix tasks to that phase
3. If scope is `pNN-pMM` (contiguous phase range): add fix tasks to the last phase in the range (`pMM`)
4. If scope is `final` or SHA/range review: add fix tasks to a new "Review Fixes" phase or the last phase

### Step 4: Determine Next Task IDs

Read plan.md to find the last task ID in the target phase:

```bash
# Example for phase p03:
# grep -E "^### Task p03-t[0-9]+:" "$PROJECT_PATH/plan.md" | tail -5
grep -E "^### Task ${TASK_PREFIX}-t[0-9]+:" "$PROJECT_PATH/plan.md" | tail -5
```

**Revision phase naming:**

For revision phases (`p-revN`), the task prefix is `prevN`, not `p-revN`:

- Scope `p-rev1` → task prefix `prev1` → regex `^### Task prev1-t[0-9]+:`
- Scope `p-rev2` → task prefix `prev2` → regex `^### Task prev2-t[0-9]+:`

For standard phases (`pNN`), the task prefix matches the phase: `p03` → `p03-tNN`.

Derive `TASK_PREFIX` from scope:

- If scope matches `p-revN`: `TASK_PREFIX = "prevN"` (e.g., `p-rev1` → `prev1`)
- Otherwise: `TASK_PREFIX = TARGET_PHASE` (e.g., `p03` → `p03`)

**Numbering convention:**

- Find highest task number in target phase using the correct `TASK_PREFIX` (e.g., `prev1-t02`)
- New tasks continue sequentially: `prev1-t03`, `prev1-t04`, etc.

### Step 5: Convert Findings to Tasks

**For each Critical, Important, and Medium finding (default):**

Create a plan task entry:

````markdown
### Task {task_id}: (review) {Finding title}

**Files:**

- Modify: `{file from finding}`

**Step 1: Understand the issue**

Review finding: {issue description from review}
Location: `{file}:{line}`

**Step 2: Implement fix**

{Fix guidance from review}

**Step 3: Verify**

Run: `{verification command from review or standard test command}`
Expected: {expected outcome}

**Step 4: Commit**

```bash
git add {files}
git commit -m "fix({task_id}): {description}"
```

Fix tasks that edit synced artifacts use `oat project push` under the scope
guard instead of the branch commit template above.
````

````

**Task naming:**
- Prefix with `(review)` to indicate review-generated task
- Use active verb: "Fix...", "Add...", "Update..."

### Step 6: Update Plan.md

Add new tasks to plan.md in the target phase. When adding or editing tasks, preserve/restore shared `plan.md` invariants per the `oat-project-plan-writing` contract (stable task IDs, required sections, review table preservation, accurate `## Implementation Complete` totals).

**Review-fix bookkeeping (required):**
- When you add review-generated fix tasks:
  - Locate the Reviews event matching the selected review's Scope, Type, and `SOURCE_REVIEW_FILENAME`, then update it to `fixes_added` (work queued), set the Date, and replace its Artifact with `reviews/archived/$REVIEW_FILENAME`.
  - For code events, populate or preserve `Reviewed Head`, `Invocation`, and
    `Gate Target` from the selected artifact's validated frontmatter. Never
    replace known provenance with `-`; if the artifact is legacy or a value is
    invalid, preserve existing cells and otherwise leave the value unknown.
  - The written `REVIEW_FILENAME` becomes the event's artifact filename and identity for every later mutation; use the already-resolved final basename in every plan and implementation reference.
  - Never select a row by scope alone or move an event status backward. If the exact bound event is missing, stop and reconcile the ledger instead of mutating another event.
  - Mutate cells by header name. If the table is still the legacy five-column
    shape, add `Reviewed Head`, `Invocation`, and `Gate Target` to the header
    and separator and pad every existing row with `-`. If it is already
    widened, preserve all existing and unknown trailing cells; never rebuild a
    row as only five or eight cells.
  - Update `## Implementation Complete` totals (phase counts + total task count) so downstream PR/review summaries don’t go stale.
  - If the plan includes any phase rollups that reference task counts, update those too.

**Keep plan runnable:**
- Do NOT leave plan.md in a state that blocks `oat-project-implement`.
- Ensure plan.md frontmatter remains:
  - `oat_status: complete`
  - `oat_ready_for: oat-project-implement`

**Keep plan internally consistent:**
- If the plan contains an `## Implementation Complete` summary (phase counts, total task count), update it to reflect any newly added review fix tasks.
- If the plan has phase headings that include task counts (or other rollups), update those rollups as well.

**Update Reviews section:**
```markdown
## Reviews
- Find the existing event by `{scope}`, review Type, and
  `$SOURCE_REVIEW_FILENAME`, then update only that row:
  - Status: `fixes_added` (if tasks were added) or `passed` (if no Critical/Important/Medium and no unresolved final-scope gates)
  - Date: `{today}`
  - Artifact: `reviews/archived/$REVIEW_FILENAME`
  - Reviewed Head: validated full `oat_review_head_sha` for code reviews
  - Invocation: `oat_review_invocation` for code reviews
  - Gate Target: exact `oat_gate_target` for gate code reviews; `-` otherwise
````

**Status semantics (v1):**

- `fixes_added`: fix tasks were created and added to the plan
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review completed and recorded as passing (no unresolved Critical/Important/Medium, and all final-scope gates satisfied: deferred-medium + minor disposition)
- Status changes are monotonic. Never move an event status backward, replace an earlier event, or update a different event that happens to share the same scope/type.

### Step 7: Update Implementation.md

Add a note to implementation.md:

```markdown
### Review Received: {scope}

**Date:** {today}
**Review artifact:** reviews/archived/$REVIEW_FILENAME

**Findings:**

- Critical: {N}
- Important: {N}
- Medium: {N}
- Minor: {N}

**New tasks added:** {task_ids}

**Design drift / artifact alignment notes:**

- {finding_id}: {review found stale design/spec/plan relative to shipped implementation; why the implementation is accepted; source of truth; artifact-alignment task ID or explicit deferral}

**Next:** Execute fix tasks via the `oat-project-implement` skill.

After the fix tasks are complete:

- Update this same artifact-identified review event to `fixes_completed`
- Re-run `oat-project-review-provide {type} {scope}` then `oat-project-review-receive` to reach `passed`
```

**Restart safety (required):**

- If `{PROJECT_PATH}/implementation.md` exists, ensure it will resume correctly after this skill:
  - If `oat_current_task_id` is `null` (or points at already-completed work), set it to the **first newly-added review-fix task ID** (or the next incomplete task in plan order).
  - Update the Progress Overview table totals (tasks + completed) if they are present and depend on task counts.
  - If any finding is resolved by accepting the shipped implementation and aligning stale artifacts instead of changing code, add an explicit review note under the current "Review Received" section and update `## Deviations from Plan / Design` when that table exists.
    - For existing project artifacts, treat any `## Deviations...` heading as the deviations section; migrate to the preferred `## Deviations from Plan / Design` heading and table shape when already touching the section.
    - The note must say the review found design/spec/plan drift, why the shipped implementation is accepted, which source is now authoritative, and which artifact-alignment task will update the stale artifact.
    - If the artifact update is intentionally deferred, record the deferral rationale and follow-up trigger in `implementation.md`.
  - Update `{PROJECT_PATH}/state.md` frontmatter so routing/UI is accurate:
    - `oat_phase: implement`
    - `oat_phase_status: in_progress`
    - `oat_current_task: {first_fix_task_id}` (or next incomplete)
    - `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

### Step 7.5: Archive the Consumed Review Artifact

After plan/implementation/state updates reference the archived location, move the processed review artifact into the local-only history directory:

```bash
mkdir -p "$ARCHIVED_REVIEW_DIR"
mv "$REVIEW_PATH" "$ARCHIVED_REVIEW_PATH"
```

Rules:

- Perform the move only after all written references and event identity have been updated to `reviews/archived/$REVIEW_FILENAME`.
- Use the `REVIEW_FILENAME` and `ARCHIVED_REVIEW_PATH` resolved in Step 1. Do not rename or re-resolve the destination here.
- Report the archived location in the final summary.

### Step 7.6: Commit Review Bookkeeping (Required)

**CRITICAL — DO NOT SKIP.** When this skill runs in a separate agent session (subagent, fresh session, or different conversation), uncommitted bookkeeping updates cause state drift for the original agent. This skill modifies `plan.md`, `implementation.md`, `state.md`, and the contents of `reviews/` (via the Step 7.5 archive move) but does not commit them on its own — the commit below is the safety net.

Commit all modified OAT tracking files atomically:

```bash
PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || { echo "oat: cannot resolve project scope for $PROJECT_PATH; refusing to commit artifacts" >&2; exit 1; }
# fail closed: never fall back to branch bookkeeping when scope resolution fails
if [ "$PROJECT_SCOPE" = "synced" ]; then
  oat project push "$PROJECT_PATH" --message "chore(oat): record review findings and add fix tasks ({scope})" || { echo "oat: project push failed; run oat project pull, resolve the reported state, and retry" >&2; exit 1; }
else
  git add "$PROJECT_PATH/plan.md" "$PROJECT_PATH/implementation.md" "$PROJECT_PATH/state.md"
  # Capture the Step 7.5 archive move: stages both the deletion of the original
  # review path and the new archived location. Scope to the project's reviews/
  # directory — never use repo-wide `git add -A`.
  git add "$PROJECT_PATH/reviews/"
  git diff --cached --quiet || git commit -m "chore(oat): record review findings and add fix tasks ({scope})"
fi
```

Do not use `git add -A` or glob patterns that reach outside `"$PROJECT_PATH/reviews/"`. Do not include unrelated implementation or code files in this commit. Do not defer this commit without explicit user approval — if deferred, clearly state in the summary that bookkeeping is uncommitted so the original agent knows to commit on return.

If the project itself is still untracked because earlier lifecycle steps never committed the initial artifact set, widen this bookkeeping commit to include the untracked core project artifacts (`discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`). Do not stage `.oat/state.md`; it is generated dashboard state and normally gitignored. Do not leave the project tree partially tracked after receive-review finishes.

**Note on archived review paths:** When `reviews/archived/` matches a `localPaths` pattern (the default setup), the archived file is gitignored and `git add "$PROJECT_PATH/reviews/"` will only stage the deletion of the original (now-moved) top-level review file. When `reviews/archived/` is tracked, both the deletion and the new archived location are staged. Both cases are safe — the command handles them uniformly.

**Worktree handling:** If the project was resolved via a worktree in Step 0, run the git commands scoped to the worktree (`git -C "$WORKTREE_PATH" ...`) so the commit lands on the worktree branch.

### Step 8: Check Review Cycle Count

**Bounded loop protection:**

Count how many review cycles have occurred for this scope. Exclude gate-originated artifacts (`oat_review_invocation: gate`): the cap measures failed fix cycles of the standard review loop, not artifact volume, and phase gate re-runs are governed by the phase review gate flow in `oat-project-implement`, not by this cap.

```bash
{
  find "$PROJECT_PATH/reviews" -maxdepth 1 -type f -name "*$SCOPE_TOKEN*.md" 2>/dev/null
  find "$PROJECT_PATH/reviews/archived" -maxdepth 1 -type f -name "*$SCOPE_TOKEN*.md" 2>/dev/null
} | while IFS= read -r artifact; do
  grep -q "oat_review_invocation: gate" "$artifact" || echo "$artifact"
done | wc -l
```

**If 3 or more cycles:**

```
⚠️  Review cycle limit reached (3 cycles).

This scope has been reviewed {N} times. Further automated review cycles are blocked.

Options:
1. Review findings manually and decide which to address
2. Proceed to PR with current state
3. Request explicit user override to continue

Choose an option:
```

**If under limit:** Proceed normally.

### Step 8.5: Final Scope Deferred-Medium Resurfacing (Required)

If `scope == final`, resurface previously deferred Medium findings from prior review cycles before marking final as `passed`.

- Source of truth: `implementation.md` review notes ("Deferred Findings"), plus prior review artifacts in `reviews/archived/` (and any still-active top-level `reviews/` file for the current cycle).
- Build a "Deferred Medium Ledger" with each item and current disposition state.

Ask user to decide each deferred Medium:

1. Convert to fix task now
2. Explicitly accept defer to post-release with rationale

Rules:

- Do not silently keep deferred Mediums in final scope.
- If any deferred Medium remains undecided, final review cannot be marked `passed`.
- Record user decisions + rationale in `implementation.md` under the final review notes.

### Step 9: Handle Medium Deferral Requests and Minor Findings

Medium findings are converted to tasks by default.

Only propose Medium deferral when there is a concrete reason (duplicate, blocked dependency, explicit out-of-scope follow-up, or high-risk churn now).

If any Medium is proposed for deferral:

- Ask user explicitly for approval per finding.
- If user declines deferral, convert that Medium to a fix task now.
- If user approves deferral, record rationale in `implementation.md` under "Deferred Findings (Medium)".

Design drift handling applies before Medium/Minor convenience deferrals:

- If a review finding reveals that the design artifact is stale relative to a defensible implementation, do not treat this as a no-op.
- Either convert the finding to an artifact-alignment task or record an explicit deferral.
- In both cases, add an `implementation.md` review note so final summary generation can preserve the design delta.
- The note must include what drift was found, why the implementation is accepted, whether implementation or artifact is source of truth, and the artifact task or deferral that will align the lifecycle record.

Minor findings handling is scope-aware:

- If `scope != final`:
  - Minor findings default to `convert`, not `defer`. Small findings are usually cheaper to fix inline than to track as backlog items, so converting is the baseline disposition for every Minor.
  - `defer` (and `dismiss`) at Minor severity requires explicit, concrete rationale — the same gate that applies to Medium and above. Only propose deferral when the finding is genuinely low-probability cleanup, blocked by another change, duplicated elsewhere, explicitly out of scope, or fixing now would create disproportionate churn/risk.
  - If deferred, record rationale in implementation.md under "Deferred Findings".
  - Do not block review completion on minor disposition once each finding has been converted or explicitly deferred with rationale.

- If `scope == final`:
  - Minor findings are NOT auto-deferred silently.
  - Before asking for disposition, explain each minor in plain language:
    - what the issue is,
    - potential user/maintainer impact,
    - why fixing now vs deferring is reasonable.
  - Recommendation default:
    - default to recommending `convert` — fixing a non-blocking minor inline is usually cheaper than tracking it as a backlog item, and this is especially true for `Negligible`/`Minor`-scope fixes;
    - recommend `defer` only when the finding is unlikely to matter soon, blocked, duplicated, or high-churn to address now, and capture that concrete rationale.
  - Keep explanations concise (1-3 sentences per minor) and include file/line when available.
  - Ask user explicitly:

    ```
    {N} minor findings pending final disposition:
    - {m1}: {summary} — {brief explanation}
    - {m2}: {summary} — {brief explanation}
    ...

    Options:
    1. Defer all minor findings with rationale
    2. Select specific minor IDs to convert to tasks (e.g., m2,m3)
    3. Convert all minors to tasks

    Choose:
    ```

  - If option 2 is chosen, echo back selected IDs and the corresponding finding titles before proceeding.
  - If deferred, record rationale in implementation.md under "Deferred Findings".
  - Hard guard: do not mark final review `passed` until this explicit choice is recorded.

### Step 10: Route to Next Action

**Ask user:**

```
Review processed for {project-name}.

Added {N} fix tasks:
- {task_id}: {description}
- {task_id}: {description}
...

Options:
1. Execute fix tasks now (oat-project-implement)
2. Review the plan first (then manually run oat-project-implement)
3. Exit (tasks added, execute later)

Choose:
```

**If execute now:**

- Update state.md: `oat_phase_status: in_progress`, `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`
- Tell user: "Run the `oat-project-implement` skill to execute fix tasks starting from {first_fix_task_id}"
- Or directly invoke `oat-project-implement` if environment supports skill chaining

**If review first:**

- Tell user: "Review `plan.md`, then run the `oat-project-implement` skill when ready"

**If exit:**

- Tell user: "Fix tasks added to plan. Run the `oat-project-implement` skill when ready."

### Step 10A: Route to Next Action for Artifact Reviews

For `artifact` reviews, do not route to implementation tasks. After user-approved artifact edits are applied:

**Archive the consumed review artifact (same as Step 7.5):**

```bash
mkdir -p "$ARCHIVED_REVIEW_DIR"
mv "$REVIEW_PATH" "$ARCHIVED_REVIEW_PATH"
```

- Before the move, use the Step 1 `REVIEW_FILENAME` for every artifact-review reference or event identity written by the approved edits.
- Perform the move only after all artifact edits are applied and every written reference points to `reviews/archived/$REVIEW_FILENAME`.
- Use the Step 1 `ARCHIVED_REVIEW_PATH` unchanged. Do not rename or re-resolve the destination here.

**Then route:**

- If any finding is `needs_user_direction`, ask targeted follow-up question(s) and wait for decision.
- If all findings are `resolve_in_artifact` or `rejected_with_rationale`, ask user:
  1. Re-run `oat-project-review-provide artifact {scope}`
  2. Continue phase flow (approve artifact / proceed to next phase skill)

### Step 11: Output Summary

```
Review received for {project-name}.

Review: $REVIEW_FILENAME
Scope: {scope}
Findings: {N} critical, {N} important, {N} medium, {N} minor

Actions taken:
- Added {N} fix tasks to plan.md ({task_ids})
- Updated implementation.md with review notes
- Archived review artifact to `reviews/archived/$REVIEW_FILENAME`
- Deferred/accepted Medium findings: {N}
- Minor findings dispositioned: {N} converted (default), {N} deferred-with-rationale (explicit user decision required for final scope)
- Finding disposition map: {ID -> converted|deferred|accepted + rationale summary}

Review cycle: {N} of 3

Next: {recommended action based on user choice}
```

For `artifact` reviews, summarize instead:

```
Review received for {project-name}.

Review: $REVIEW_FILENAME
Scope: {scope}
Findings: {N} critical, {N} important, {N} medium, {N} minor

Actions taken:
- Applied {N} artifact edits
- Archived review artifact to `reviews/archived/$REVIEW_FILENAME`
- No plan tasks created
- Finding disposition map: {ID -> resolve_in_artifact|rejected_with_rationale|needs_user_direction}

Next: {re-review artifact or continue phase, per user choice}
```

## Re-Review Scoping

After fix tasks are executed, if another review is requested:

**Default scope for re-review:** Fix tasks only (not full phase)

This prevents reviewing already-approved code and focuses the reviewer on just the fixes.

**How it works:**

1. When `oat-project-review-provide` is called after fix tasks exist
2. It detects `(review)` tasks in plan.md for the scope, including range review tags such as `(p02-p03-review)`
3. It offers: "Scope to fix tasks only? (Y/n)"
4. If yes: scope is just the fix task commits

## Success Criteria

- Active project resolved
- Active review artifact located and read
- Findings parsed and categorized
- Findings overview + per-finding analysis presented to user before disposition choices
- Fix tasks created for Critical/Important/Medium findings by default
- Plan.md updated with new tasks
- Implementation.md updated with review notes
- Consumed review artifact archived under `reviews/archived/`
- All artifact updates (plan.md, implementation.md, state.md) committed atomically before the skill exits to prevent cross-session drift
- Review cycle count checked (cap at 3)
- Final-scope deferred Medium findings resurfaced and explicitly dispositioned
- User routed to next action
- Medium deferrals handled via explicit user approval
- Minor findings handled (converted or deferred), with explicit user decision required for final scope
- For `artifact` reviews: findings are resolved directly in artifacts (or rejected with rationale if invalid), with no default deferrals
- For `artifact` reviews: user confirms proposed edits before they are applied
