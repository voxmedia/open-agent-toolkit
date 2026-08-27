---
name: oat-project-review-receive-remote
version: 1.5.1
description: Use when processing GitHub PR review comments within project context. Fetches PR comments, creates plan tasks, and updates project artifacts.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Project Remote Review Receive

Fetch unresolved GitHub PR feedback and convert it into review-fix tasks inside the active OAT project.

## Prerequisites

- Active OAT project with `plan.md` and `implementation.md`.
- `npx agent-reviews` is available.
- GitHub authentication configured (`GITHUB_TOKEN`, `.env.local`, or `gh` auth).

## Mode Assertion

**OAT MODE: Review Receive**

**Purpose:** In project scope, ingest remote PR feedback, triage findings, create executable plan tasks, and update implementation state for resumable fix execution.

**BLOCKED Activities:**

- No direct code implementation in this mode.
- No silent finding deferrals/dismissals.
- No plan task ID reuse or re-numbering.

**ALLOWED Activities:**

- Active project resolution.
- Remote PR comment ingestion/classification.
- Findings triage.
- Plan/implementation/state bookkeeping updates.
- Optional GitHub replies tied to dispositions.

**Self-Correction Protocol:**
If you catch yourself:

- Making code changes in receive mode -> STOP and return to triage/bookkeeping only.
- Reusing existing task IDs instead of generating next sequential `pNN-tNN` -> STOP and recalculate the next available ID.
- Posting GitHub replies without explicit user approval -> STOP and present reply content for confirmation first.

## Progress Indicators (User-Facing)

Print this banner once at start:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ PROJECT REMOTE REVIEW RECEIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use step indicators:

- `[1/8] Resolving project...`
- `[2/8] Resolving PR...`
- `[3/8] Fetching comments...`
- `[4/8] Classifying findings...`
- `[5/8] Triaging findings...`
- `[6/8] Updating project artifacts...`
- `[7/8] Enforcing cycle limit...`
- `[8/8] Posting replies (optional)...`

## Findings Model

Normalize findings as:

```yaml
finding:
  id: "C1" | "I1" | "M1" | "m1"
  severity: critical | important | medium | minor
  title: string
  file: string | null
  line: number | null
  body: string
  fix_guidance: string | null
  source: github_pr
  source_ref: string
  comment_id: string | number
```

## Process

### Step 0: Resolve Active Project

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

Validation:

- `PROJECT_PATH` exists
- `plan.md` exists
- `implementation.md` exists
- `state.md` exists

If missing, ask user to choose/fix active project before continuing.

### Step 1: Resolve PR Number

Resolution order:

1. `--pr <N>` from `$ARGUMENTS`
2. auto-detect via `agent-reviews`

Confirm resolved PR number with user.

### Step 2: Fetch Unresolved PR Comments

```bash
npx agent-reviews --json --unresolved --pr <N>
```

Resolve provenance from the GitHub review event that produced the fetched
feedback, not from the PR's current head. Parse its OAT marker block when
present:

- accept `oat_review_head_sha` only as a full 40-character hexadecimal SHA;
- preserve `oat_review_invocation` as the invocation kind;
- preserve `oat_gate_target` only for a gate invocation.

If the source review is legacy, multiple source reviews disagree, or the
lineage cannot be associated with this receive event, leave the corresponding
ledger cells unknown (`-`). Never infer lineage from the reviewer identity or
substitute the current PR head for the commit that was actually reviewed.

**Reviews ledger write contract (all receive paths):**

- Resolve `Scope`, `Type`, `Status`, `Date`, `Artifact`, `Reviewed Head`,
  `Invocation`, and `Gate Target` by header name before mutating a row; never
  use fixed cell positions.
- If the Reviews table has only the legacy five columns, add `Reviewed Head`,
  `Invocation`, and `Gate Target` to its header and separator and pad every
  existing row with `-`. In an already widened table, pad a shorter row with
  `-` through the current header width before mutation.
- Mutate only the event selected by the event-identity rules below. Preserve
  every unknown column in its original position and every existing known value
  unless the operation explicitly advances that cell. Never truncate a row to
  five, eight, or any other assumed width.

If no unresolved comments:

1. Create a UTC timestamp and event-distinct filename:
   `reviews/archived/remote-pr-<N>-review-YYYY-MM-DDTHHMMSSZ.md`.
2. Ensure `reviews/archived/` exists, then write that artifact with the PR
   number, fetch timestamp, remote scope/type, and a zero-unresolved-findings
   result. A clean remote review is consumed as it is recorded, so it must not
   remain in top-level `reviews/`.
3. Record the clean result as a `passed` Reviews event whose event identity
   combines `Scope`, `Type`, and artifact filename:
   - Apply the Reviews ledger write contract above before claiming, appending,
     or mutating the event.
   - Claim only an unbound `pending` placeholder with matching Scope + Type and
     Artifact `-`; otherwise append a distinct row.
   - Set Date and Artifact to this clean event. Advance only this event and
     never mutate another row by scope alone.
   - Populate `Reviewed Head`, `Invocation`, and `Gate Target` only from the
     validated source-review provenance above; use `-` when it is unknown.
4. Commit `plan.md` and the clean review artifact atomically with
   `chore(oat): record clean remote review (pr-#<N>)`. Do not stop with
   uncommitted bookkeeping.
5. Report clean status and stop.

### Step 3: Classify and Normalize Findings

For each comment:

- capture `type`, `path`, `line`, `url`, and comment body.
- classify severity using 4-tier model.
- use review state (e.g., `CHANGES_REQUESTED`) as a hint, not a hard override.
- assign stable IDs by severity bucket (`C`, `I`, `M`, `m`).

### Step 4: Present Findings Overview and Triage

Before prompting dispositions, print:

- counts per severity
- compact register (`id`, `title`, `file:line`, `source_ref`)

Disposition options:

- `convert` (default for critical/important/medium/minor)
- `defer`
- `dismiss`

Require concrete rationale for `defer`/`dismiss` at any severity, including minor. Small findings are usually cheaper to fix inline than to track as backlog items, so a minor `defer` must be justified just like any other deferral.

### Step 5: Convert Findings to Plan Tasks

For each converted finding:

- Determine next stable `pNN-tNN` IDs from current plan.
- Create tasks using heading format:
  - `### Task pNN-tNN: (review) <title>`
- Include standard 4-step execution structure:
  - analyze failure context
  - implement fix
  - verify targeted behavior
  - verify project commands from plan
- Use commit template:
  - `fix(pNN-tNN): <description>`

### Step 6: Update Project Artifacts

Before changing the ledger, write an event-distinct review artifact containing
the PR number, fetch timestamp, normalized findings, dispositions, and any
validated source-review head/invocation/gate-target provenance:
`reviews/archived/remote-pr-<N>-review-YYYY-MM-DDTHHMMSSZ.md`. Remote receive
fully dispositions the event as `passed` or `fixes_added`, so the artifact is
consumed immediately and belongs in `reviews/archived/`, not top-level
`reviews/`. Each fetch/triage cycle gets a new timestamped artifact filename,
even when the PR and lifecycle scope are unchanged.

```bash
REMOTE_REVIEW_TIMESTAMP=$(date -u +%Y-%m-%dT%H%M%SZ)
REMOTE_REVIEW_FILENAME="remote-pr-${PR_NUMBER}-review-${REMOTE_REVIEW_TIMESTAMP}.md"
mkdir -p "$PROJECT_PATH/reviews/archived"
REMOTE_REVIEW_PATH="$PROJECT_PATH/reviews/archived/$REMOTE_REVIEW_FILENAME"
```

Update `plan.md`:

- Append inserted review-fix task sections in correct phase order.
- Record an append-ordered `## Reviews` event for the remote scope:
  - status `fixes_added` when tasks were added
  - status `passed` when no actionable findings remain
  - date set to today
  - artifact `reviews/archived/remote-pr-<N>-review-YYYY-MM-DDTHHMMSSZ.md`
  - reviewed head set to the validated full source-review SHA, or `-`
  - invocation set to the source-review invocation kind, or `-`
  - gate target set only for a gate source review, or `-`
- Claim an unbound `pending` placeholder only when its Scope + Type matches and
  its Artifact is `-`; otherwise append the event. Later mutations select it by
  Scope + Type + artifact filename, never by scope or `github-pr #<N>` alone.
- Never move an event status backward or overwrite an earlier event from the
  same PR.
- Apply the Reviews ledger write contract above before claiming, appending, or
  mutating the event.
- Update `## Implementation Complete` totals.

Update `implementation.md`:

- Add "Remote Review Received" section with:
  - date
  - PR number
  - severity counts
  - new task IDs
  - deferred/dismissed notes
- Set `oat_current_task_id` to first new review-fix task ID when tasks were added.
- If no new tasks: keep current task pointer unchanged or set `null` if all work is complete.

Update `state.md`:

- `oat_phase: implement`
- `oat_phase_status: in_progress`
- `oat_current_task: <first-new-task-id|null>`
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

### Step 6.5: Commit Review Bookkeeping (Required)

**CRITICAL — DO NOT SKIP.** This skill modifies the event-distinct review artifact, `plan.md`, `implementation.md`, and `state.md` when processing GitHub PR comments. When it runs in a separate agent session (subagent, fresh session, or different conversation), uncommitted bookkeeping updates cause state drift for the original agent. The commit below is the safety net.

Commit all modified OAT tracking files atomically:

```bash
PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || { echo "oat: cannot resolve project scope for $PROJECT_PATH; refusing to commit artifacts" >&2; exit 1; }
# fail closed: never fall back to branch bookkeeping when scope resolution fails
if [ "$PROJECT_SCOPE" = "synced" ]; then
  oat project push "$PROJECT_PATH" --message "chore(oat): record remote review findings and add fix tasks (pr-#$PR_NUMBER)"
else
  git add "$PROJECT_PATH/plan.md" "$PROJECT_PATH/implementation.md" "$PROJECT_PATH/state.md" "$REMOTE_REVIEW_PATH"
  git diff --cached --quiet || git commit -m "chore(oat): record remote review findings and add fix tasks (pr-#$PR_NUMBER)"
fi
```

Do not use `git add -A` or glob patterns. Do not include unrelated implementation or code files. Do not defer this commit without explicit user approval.

**Worktree handling:** If the project was resolved via a worktree in Step 0, run the git commands scoped to the worktree (`git -C "$WORKTREE_PATH" ...`) so the commit lands on the worktree branch.

### Step 7: Enforce Review Cycle Limit and Route Next Action

Track review cycles for the same scope.

- Maximum: 3 receive cycles.
- If limit reached, block and ask user whether to escalate scope or resolve manually.

Route next action:

- If tasks added: `oat-project-implement`
- If no tasks and review passed: continue toward finalization/PR flow

### Step 8: Optional GitHub Replies

Ask user whether to reply to processed comments.
If yes:

- Convert: `npx agent-reviews --reply <id> "Tracking as task pNN-tNN"`
- Defer: `npx agent-reviews --reply <id> "Deferred: <reason>"`
- Dismiss: `npx agent-reviews --reply <id> "Won't fix: <reason>"`

Never post replies without explicit user approval.

## Output Contract

At completion, report:

- project path
- PR number
- findings by severity
- converted/deferred/dismissed counts
- created task IDs (if any)
- updated review status
- next recommended action

## Success Criteria

- Active project resolved and validated.
- Remote PR feedback fetched and normalized.
- Findings triaged with explicit dispositions.
- Plan tasks created with stable IDs when needed.
- `plan.md`, `implementation.md`, and `state.md` updated consistently.
- All artifact updates committed atomically before the skill exits to prevent cross-session drift.
- Review cycle guard and next-action routing applied.
