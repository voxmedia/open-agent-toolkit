---
name: oat-project-pr-progress
description: Use when an active OAT project needs a mid-project PR for a completed phase (pNN). Generates a phase-scoped progress PR description from OAT artifacts and commit history, with optional PR creation.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(awk:*), Bash(gh:*), Bash(git:*), Bash(mktemp:*), Bash(oat:*), Bash(rm:*), Glob, Grep, AskUserQuestion
metadata:
  version: 1.3.4
---

# Progress PR

Create a progress PR description (typically at a plan phase boundary) and write it to disk.

## Purpose

Generate a PR-ready summary that is:

- grounded in OAT artifacts (mode-aware: spec-driven uses spec/design; quick/import may use discovery/import reference; lite uses the five plan.md contract sections; brief and goal use the Project Brief's Outcomes and each phase's Intent and Exit evidence)
- scoped to a specific phase (pNN) or an explicit git range
- easy to paste into GitHub (or used with `gh pr create` if desired)

## Prerequisites

**Required:**

- `activeProject` in `.oat/config.local.json` points at an active project directory (or you can provide project name when prompted)
- `{PROJECT_PATH}/plan.md` exists

**Recommended:**

- Phase code review is `passed` in `plan.md` `## Reviews` before opening a progress PR.

## Mode Assertion

**OAT MODE: PR (Progress)**

**Purpose:** Create PR description and (optionally) open a PR.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ PR PROGRESS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work (scoping, reading artifacts, writing output), print 2–5 short step indicators, e.g.:
  - `[1/5] Preflighting review artifacts…`
  - `[2/5] Resolving scope…`
  - `[3/5] Reading OAT artifacts…`
  - `[4/5] Collecting git context…`
  - `[5/5] Writing PR description…`
- For long-running operations (git logs/diffs on large ranges), print a start line and a completion line (duration optional).
- Keep it concise; don’t print a line for every shell command.

**BLOCKED Activities:**

- No implementation work
- No changing requirements/design/plan

**ALLOWED Activities:**

- Reading artifacts and git history
- Writing PR description file
- Running `gh pr create` (optional, user-confirmed)

## Usage

### With arguments (if supported)

```
oat-project-pr-progress p02                 # progress PR for phase p02
oat-project-pr-progress range=abc..def      # progress PR for explicit range
oat-project-pr-progress base_sha=abc123     # progress PR for abc123..HEAD
```

### Without arguments

Run the `oat-project-pr-progress` skill and it will ask:

- which phase (pNN) or range to scope to
- PR title + base branch (resolved from: explicit `base=` arg → `git.defaultBranch` in `.oat/config.json` → `git rev-parse --abbrev-ref origin/HEAD` → fallback `main`)

## Process

### Step 0: Resolve Active Project

OAT stores active project context in `.oat/config.local.json` (`activeProject`, local-only).

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

If missing/invalid:

- Ask the user for `{project-name}`
- Set `PROJECT_PATH` to `${PROJECTS_ROOT}/{project-name}`
- Write it:
  ```bash
  mkdir -p .oat
  oat config set activeProject "$PROJECT_PATH"
  ```

### Step 0.5: Archive Residual Active Review Artifacts

Before generating the PR, detect any leftover active review artifacts in the top level of `"$PROJECT_PATH/reviews/"`:

```bash
find "$PROJECT_PATH/reviews" -maxdepth 1 -type f -name "*.md" 2>/dev/null
```

If any active review artifacts exist:

1. Create `"$PROJECT_PATH/reviews/archived"` if needed.
2. For each active review file, rewrite any references touched during this preflight so they point to `reviews/archived/{filename}.md` instead of `reviews/{filename}.md`. At minimum, check:
   - `"$PROJECT_PATH/plan.md"`
   - `"$PROJECT_PATH/implementation.md"`
   - `"$PROJECT_PATH/state.md"`
3. Move the review artifact into `reviews/archived/`, adding a timestamp suffix if the archive target already exists.
4. Report the archived paths before continuing.

Rules:

- Only archive top-level active review artifacts. Leave `reviews/archived/` untouched.
- This preflight is bookkeeping only; do not change review statuses unless a rewritten artifact path requires it.

### Step 1: Determine Scope (Phase or Range)

Parse args if provided (otherwise prompt):

- `pNN` (preferred for progress PRs)
- `range=<sha1>..<sha2>`
- `base_sha=<sha>` (meaning `<sha>..HEAD`)

If scope is `pNN`, gather commits via commit convention grep:

```bash
PHASE="p02" # example
git log --oneline --fixed-strings --grep="(${PHASE}-" --max-count=500
```

If the grep returns no commits:

- Tell user commit conventions are missing/inconsistent for this phase
- Ask user to provide:
  - `base_sha=<sha>` or `range=<sha1>..<sha2>`
  - or confirm a broad range (merge-base..HEAD)

If scope is `range`/`base_sha`, set:

- `SCOPE_RANGE` to the range string (e.g., `abc..HEAD`)

**Brief modes (`oat_workflow_mode: brief`).** A `pNN` or `p-revN` scope (or a
contiguous `pNN-pMM` run) resolves from the journal anchors, never from the
commit grep above (`oat-project-brief/references/brief-contract.md` section
10):

- Read the exact `**Base:**` and `**Head:**` lines directly under the phase's
  `## Phase` heading in `implementation.md`.
- When both exist, verify each names a commit (`git cat-file -e "$SHA^{commit}"`)
  and that the base is an ancestor of the head
  (`git merge-base --is-ancestor "$PHASE_BASE" "$PHASE_HEAD"`), then set
  `SCOPE_RANGE="$PHASE_BASE..$PHASE_HEAD"`. For a run, the range is the first
  base through the last head, under the same containment and continuity
  checks as `oat-project-review-provide` Step 3.0.
- A missing anchor widens the range to `merge-base..HEAD`; `(pNN-` commit
  matches only label which commits belong to the phase, and the PR body says
  the range was widened because the anchors are missing.
- An anchor that is not a commit, a base that is not an ancestor of its head,
  or a contradictory ordering stops the PR: route to `oat-project-reconcile`
  and never narrow the range silently.

**Goal mode (`oat_workflow_mode: goal`).** A goal progress PR is a milestone
delivery, and this skill is its registration owner. The scope is the router's
`deliver mNN` or `deliver mNN/dNN` context, or a pending `oat_goal_recovery`
record at stage `delivering`: the milestone's ordered phase set from the shared
Milestones reader, or a registered delivery's frozen scope. Never derive it from
a `pNN-pMM` range or commit labels. The Git range for the PR description is the
set's first anchored base through its last anchored head; disclose phases of
other milestones that fall inside it. Step 5.5 runs before Step 6 and replaces
its optional PR creation.

### Step 2: Load Artifacts (Mode-Aware)

Resolve workflow mode from `state.md` (default `spec-driven`):

```bash
WORKFLOW_MODE=$(oat project status --field project.workflowMode 2>/dev/null || echo null)
```

Read (as available):

- `{PROJECT_PATH}/spec.md`
- `{PROJECT_PATH}/design.md`
- `{PROJECT_PATH}/plan.md`
- `{PROJECT_PATH}/implementation.md` (if exists)
- `{PROJECT_PATH}/discovery.md` (recommended for quick mode)
- `{PROJECT_PATH}/references/imported-plan.md` (recommended for import mode)

For `WORKFLOW_MODE=brief`, read `plan.md` (the Project Brief: Goal, Outcomes,
Decisions, and the in-scope phases' Intent and Exit evidence are the
requirements source) and `implementation.md` (the phase journal: anchors,
execution records, verification evidence). `discovery.md`, `spec.md`, and
`design.md` are absent by design; say in the PR summary that the requirements
come from the brief rather than noting missing spec-driven artifacts.

If `WORKFLOW_MODE != spec-driven` and spec/design are missing:

- continue (do not block)
- include an explicit note in PR summary that spec-driven requirements/design artifacts are absent for this scope

### Step 3: Check Review Status (Recommended)

If scope is `pNN`, extract only the exact level-two `## Reviews` ledger,
stopping before the next level-two heading, then select its latest appended
event whose Scope is `pNN` and Type is `code`:

```bash
REVIEWS_SECTION=$(awk '
  /^## Reviews[[:space:]]*$/ { in_reviews = 1; next }
  in_reviews && /^##[[:space:]]/ { exit }
  in_reviews { print }
' "$PROJECT_PATH/plan.md" 2>/dev/null)
PHASE_ROW=$(printf '%s\n' "$REVIEWS_SECTION" | grep -E "^\\|\\s*${PHASE}\\s*\\|\\s*code\\s*\\|" | tail -1 || true)
```

Ignore matching rows outside `REVIEWS_SECTION`; they are not review events.

- If `PHASE_ROW` is `| pNN | code | passed | ...`: good
- Otherwise: warn that review has not been marked `passed` for this phase (e.g., it may be `received`, `fixes_added`, or `fixes_completed` pending re-review)

Do not let an earlier passed event hide a later event for the same phase.

Do not block PR generation; this is a progress PR.

### Step 4: Collect Scope Data

Produce:

- commit list (for `pNN` grep or `SCOPE_RANGE`)
- changed files (best-effort)

For `SCOPE_RANGE`:

```bash
git log --oneline "$SCOPE_RANGE"
git diff --name-only "$SCOPE_RANGE"
git diff --shortstat "$SCOPE_RANGE"
```

For `pNN` (no reliable contiguous range):

- include the commit list from grep
- optionally include file lists per commit (only if needed; can be large)

### Step 5: Write PR Description Artifact

Write to:

- `{PROJECT_PATH}/pr/progress-{scope}-YYYY-MM-DD.md`

```bash
mkdir -p "$PROJECT_PATH/pr"
```

Frontmatter policy:

- Keep YAML frontmatter in the local artifact file for OAT metadata and traceability.
- Do **not** include YAML frontmatter in the PR body submitted to GitHub.

Reference links policy:

- Prefer clickable blob links to the current branch for References.
- Build links from `origin` + current branch when possible.
- If remote URL cannot be resolved into a web URL, fall back to plain relative paths.
- For `synced`, never add project artifact paths to References. The delimited
  `oat project links` block replaces them and contains only eligible pinned
  discovery/design/summary links; it never links plan, state, implementation,
  or reviews.

Local path exclusion:

- Read `.oat/config.json` and extract `localPaths` (glob patterns for gitignored directories).
- Do **not** include References links to any path that matches a `localPaths` pattern — those paths are gitignored and will not exist on the remote.
- Common matches: `.oat/projects/**/reviews/archived`, `.oat/projects/**/pr`. Active `reviews/` paths remain eligible for References when they are tracked; only archived review paths should be treated as local-only by default.

Example link context:

```bash
ORIGIN_URL=$(git remote get-url origin 2>/dev/null || echo "")
BRANCH=$(git rev-parse --abbrev-ref HEAD)
PROJECT_REL="${PROJECT_PATH#./}"

REPO_WEB=""
case "$ORIGIN_URL" in
  git@github.com:*) REPO_WEB="https://github.com/${ORIGIN_URL#git@github.com:}" ;;
  https://github.com/*) REPO_WEB="$ORIGIN_URL" ;;
esac
REPO_WEB="${REPO_WEB%.git}"
```

Recommended template:

```markdown
---
oat_generated: true
oat_generated_at: YYYY-MM-DD
oat_pr_type: progress
oat_pr_scope: { pNN|range }
oat_project: { PROJECT_PATH }
---

# {project-name} ({scope})

## Summary

{1-3 sentence summary of what this phase delivered}

## Goals / Non-Goals

{goals addressed by this phase, from available requirement artifacts: spec in spec-driven mode; discovery/import reference in quick/import mode; Summary, Decisions, Assumptions, Out of Scope, and Validation Criteria in plan.md for lite; the phase's Intent and Exit evidence plus the brief's Outcomes for brief and goal}

## Changes

- Project: `{PROJECT_PATH}`
- Scope: `{scope}`
- Commits:
  {bulleted list}

## Verification

- Tests: {what was run / expected}
- Lint/Types/Build: {what was run / expected}

## Reviews

{phase review row from plan.md Reviews table, if available}

## References

Only include links to artifacts that actually exist in the project. Omit any that are absent.

- Spec: `[spec.md]({REPO_WEB}/blob/{BRANCH}/{PROJECT_REL}/spec.md)`
- Design: `[design.md]({REPO_WEB}/blob/{BRANCH}/{PROJECT_REL}/design.md)`
- Plan: `[plan.md]({REPO_WEB}/blob/{BRANCH}/{PROJECT_REL}/plan.md)` (fallback: `{PROJECT_PATH}/plan.md`)
- Implementation: `[implementation.md]({REPO_WEB}/blob/{BRANCH}/{PROJECT_REL}/implementation.md)` (fallback: `{PROJECT_PATH}/implementation.md`)
- Discovery: `[discovery.md]({REPO_WEB}/blob/{BRANCH}/{PROJECT_REL}/discovery.md)`
- Imported Source: `[references/imported-plan.md]({REPO_WEB}/blob/{BRANCH}/{PROJECT_REL}/references/imported-plan.md)`
- Reviews: `[reviews/]({REPO_WEB}/tree/{BRANCH}/{PROJECT_REL}/reviews)` (fallback: `{PROJECT_PATH}/reviews/`) — include when active `reviews/` is tracked; omit archived review paths and any target that still matches a `localPaths` pattern
```

### Step 5.5: Goal Delivery Registration (`goal` only)

`oat-project-brief/references/brief-contract.md` sections 12.5–12.8 govern;
this step states only the order. It never writes review dispositions, exit
gate outcomes, or `oat_milestone` itself, and it never registers a delivery
without passing evidence.

1. **Refresh.** When `oat_deliveries` has entries, run
   `oat project delivery refresh --project "$PROJECT_PATH" --json` and commit
   the persisted observations as bookkeeping.
2. **Check.** Run
   `oat project delivery check --project "$PROJECT_PATH" --subject <mNN|dNN> --json`.
   Register only on `status: ok` (exit 0): a passed, fresh integrated review
   and an allowed, fresh exit carrier (`exit.source: milestone-carrier`).
3. **Stale evidence stops before registration.** When refresh or check
   reports the integrated review or the `exit` carrier not fresh, choose the
   recovery stage by the section 12.5 missing-evidence order (a missing,
   blocked or stale exit carrier → `exit_gate`; otherwise a missing or stale
   integrated review → `reviewing`) and:
   - **active milestone's delivery:** write `oat_milestone_status: reviewing`
     and `oat_goal_recovery: { milestone, delivery_id, phase_ids, stage,
review_artifact: null }`;
   - **older milestone's delivery:** write only that targeted
     `oat_goal_recovery` record; the active milestone's `oat_milestone`,
     `oat_milestone_status`, `oat_current_task_id`, and `oat_current_task`
     stay unchanged.

   Commit and stop, reporting the stage owner. Never register stale evidence.

**3a. Already-registered active delivery.** When the active milestone
(`oat_milestone`) already has a non-superseded registered delivery (a `dNN`
entry with `status: open` or `at_endpoint`), after its recovery completes at
`delivering` or when `oat-project-goal` hands back a stale `delivered`
milestone, run items 1–2 for that `dNN` instead of registering. On
`status: ok`, in one bookkeeping write, clear any `oat_goal_recovery` that
targets it, write `oat_milestone_status: delivered`, and project
`oat_pr_status` and `oat_pr_url` from its latest member's observed status.
Register nothing, create no pull request, and append no log entry. On a
not-fresh report, apply item 3 (active milestone's delivery). A `registering`
entry is not registered yet and resumes at item 5.

4. **Idempotent registration.** When the active milestone has no
   non-superseded registered delivery (item 3a), allocate the next unused
   `dNN` and write its entry with `status: registering`: `milestone`, the
   frozen `scope` (the ordered set), the agreed `endpoint` from the brief's
   Delivery endpoint and authority, `kind: pr`, the persisted `lookup` keys
   (`repository` from `gh repo view --json nameWithOwner`, `head_branch`,
   `head_sha_at_registration` from `git rev-parse HEAD`), the
   `integrated_review` (`artifact`, `scope`, `bound_revisions`,
   `disposition: passed`) and the accepted `exit_gate` copied from the
   milestone's current exit carrier, so the gate result is captured with the
   delivery evidence. A replacement writes `covers_scope_of: <predecessor>`
   and the predecessor's `superseded_by: <dNN>` in the same write; an additive
   correction writes `corrects_delivery_id` instead. Commit this registration
   record before creating anything.
5. **Create or attach.** Generate the PR description (Steps 2–5), push the
   branch, and create the pull request with the Step 6 commands. On resume
   with a `registering` entry, first run
   `gh pr list --repo <repository> --head <head_branch> --state all --json url,headRefOid`:
   exactly one match is attached without creating a duplicate; zero matches
   create once; more than one stops and routes to `oat-project-reconcile`.
6. **Record.** Write the member (`url`, `base`, `reviewed_head`),
   `status: open`, `oat_milestone_status: delivered` for the active milestone,
   `oat_pr_status: open`, `oat_pr_url`, and `oat_phase_status: pr_open`;
   commit this registration bookkeeping.
7. **Log.** After that registration commit, append exactly one structural
   entry and commit it in this same step:
   `oat project log append --project "$PROJECT_PATH" --structural --producer oat-project-pr-progress --ref <dNN> --idempotency-key "<goal-slug>-register-<dNN>" --body "Registered <dNN> for <mNN> (<ordered phase ids>) at <url>; <goal-slug>-register-<dNN>"`.
   Never pre-check log configuration: the helper no-ops when logging is
   disabled.
8. **Recovery targets.** For a pending `oat_goal_recovery` at stage
   `delivering`, push the targeted delivery's fixes to its existing member,
   run steps 1–2 for that `dNN`, and on `status: ok` clear the record
   (`oat_goal_recovery: null`). When the record's milestone is not
   `oat_milestone` (an older delivery), that is the whole write: the active
   milestone stays untouched. When it targets the active milestone's own
   delivery, fall through to item 3a, which clears the record and writes
   `delivered` in one step.

`delivered` means registered, open and review-ready. Activation of the next
milestone belongs to `oat-project-goal` once the delivery reaches its agreed
endpoint.

### Step 6: Optional - Open PR

For a synced project whose user chooses to open the PR, use this ordered flow:

1. Finish or refresh `summary.md` and the progress PR artifact.
2. Run `oat project push "$PROJECT_PATH" --message "chore(oat): prepare progress PR artifacts" --json` so the ref contains both files; a nonzero exit stops the flow until the reported pull/conflict recovery is resolved and the push is retried.
3. Render `oat project links "$PROJECT_PATH" --format markdown` and insert or replace its delimited block in the stripped PR body. A freshly generated summary must be present in this initial block.
4. Push the code branch, run `gh pr create`, and capture the returned URL.
5. Set `oat_phase_status: pr_open`, `oat_pr_status: open`, `oat_pr_url`, and `oat_project_state_updated` in `state.md`.
6. Run `oat project push "$PROJECT_PATH" --message "chore(oat): record progress PR metadata" --json` again so push-time refresh rewrites the block to the new ref SHA. A nonzero exit stops closeout until the reported recovery is resolved and the push is retried.

Resolve scope fail-closed before branching:

```bash
PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || { echo "oat: cannot resolve project scope for $PROJECT_PATH; refusing PR bookkeeping" >&2; exit 1; }
```

The non-synced optional flow below remains unchanged.

Ask the user:

```
PR description written to {path}.

Do you want to open a PR now?
1) Yes (use gh CLI if available)
2) No (I will open manually)
```

If user chooses (1), provide best-effort guidance:

- Strip YAML frontmatter from the local artifact into a temporary body file:
  ```bash
  BODY_FILE="{path}"
  TMP_BODY="$(mktemp -t oat-pr-body.XXXXXX.md)"
  awk 'NR==1 && $0=="---" {infm=1; next} infm && $0=="---" {infm=0; next} !infm {print}' "$BODY_FILE" > "$TMP_BODY"
  ```
- Resolve the base branch:

  ```bash
  # Resolution chain: explicit arg > OAT config > git remote > fallback
  BASE_BRANCH="{base_arg if provided}"
  if [ -z "$BASE_BRANCH" ]; then
    BASE_BRANCH=$(oat config get git.defaultBranch 2>/dev/null || true)
  fi
  if [ -z "$BASE_BRANCH" ]; then
    BASE_BRANCH=$(git rev-parse --abbrev-ref origin/HEAD 2>/dev/null | sed 's|origin/||' || true)
  fi
  BASE_BRANCH="${BASE_BRANCH:-main}"
  ```

- Use the stripped body file with `gh`:

  ```bash
  git push -u origin "$(git rev-parse --abbrev-ref HEAD)"
  gh pr create --base "$BASE_BRANCH" --title "{title}" --body-file "$TMP_BODY"
  ```

- Optionally clean up temp file:
  ```bash
  rm -f "$TMP_BODY"
  ```

Do not assume `gh` is installed; if missing, instruct manual PR creation using the file contents and note the resolved base branch.

## Success Criteria

- Residual active review artifacts are archived before PR generation continues
- Scope determined (phase or explicit range)
- PR description artifact written to `{PROJECT_PATH}/pr/`
- Goal mode: the delivery was registered only on a deliverable `delivery check`, idempotently, with its exit-gate result captured and one structural log entry per registration
- User has clear next step to open PR (manual or gh)
