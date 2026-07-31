---
name: oat-project-review-provide
version: 1.4.0
description: Use when the user explicitly asks to review an OAT project — e.g. "review project", "review the project", "run project review", or confirms a previously offered review. Do NOT auto-invoke on completed work alone. Resolves a project review scope and offers before running.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash(git:*), Bash(oat:*), Bash(pnpm:*), Bash(mkdir:*), Bash(date:*), Bash(realpath:*), Bash(awk:*), AskUserQuestion
---

# Request Review

Request and execute a code or artifact review for the current project scope.

## Purpose

Produce an independent review artifact that verifies requirements/design alignment (mode-aware) and code quality.

Reviewers should distinguish implementation defects from artifact drift. If code is defensible but `spec.md`, `design.md`, or `plan.md` is stale, frame the finding as artifact alignment rather than a required code change.

## Prerequisites

**Required:** Active project or explicit user-provided project/review target that resolves to project state, with at least one completed task.

**Required:** Core project artifacts are already committed before the review begins. Review should not be the first step that notices an untracked project tree or pending bookkeeping-only artifact edits.

## Model Invocation Gate

This skill is model-invokable only for explicit review asks such as "review project" or "review the project", or when the user confirms a previously offered project-review step. A gate-originated request from `oat gate review` is also an explicit review ask. Do NOT auto-invoke merely because a task, phase, or implementation appears complete.

Before acting, verify that there is an active OAT project or a user-provided review target that can be resolved to project state. If neither exists, do not run this skill; offer `oat-project-open` / `oat-project-quick-start` for project workflow setup, or `oat-review-provide` for a non-project ad-hoc review.

When the invocation is manual, summarize the inferred review type and scope, then ask before running the review.

**Gate-originated mode:** If the request context says the review is gate-originated, set `REVIEW_INVOCATION=gate`, honor any provided review type/scope arguments, and run without interactive confirmation prompts. The gate session is already the explicit authorization boundary, but it does not waive dispatch controls. Resolve the reviewer target and use the exact registered role or explicitly pinned fresh child. Inline gate review is allowed only with verified equivalent current-host model and effort controls or a documented base-role exception; otherwise fail closed.

## Mode Assertion

**OAT MODE: Review Request**

**Purpose:** Determine review scope and execute a fresh-context review.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ PROVIDE REVIEW
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work (scope resolution, file gathering, writing artifact), print 2–5 short step indicators, e.g.:
  - `[1/5] Resolving scope + range…`
  - `[2/5] Collecting files + context…`
  - `[3/5] Checking subagent availability…`
  - `[4/5] Running review…`
  - `[5/5] Writing review artifact…`
- For long-running operations (reviewing large diffs, running verification commands), print a start line and a completion line (duration optional).
- Keep it concise; don’t print a line for every shell command.

**BLOCKED Activities:**

- No code changes during review
- No fixing issues found (that comes in receive-review)

**ALLOWED Activities:**

- Reading artifacts and code
- Running verification commands
- Writing review artifact

## Usage

### With arguments (if supported)

```
oat-project-review-provide code p02          # Code review for phase
oat-project-review-provide code p02-p03      # Code review for contiguous phase range
oat-project-review-provide code p02-t03      # Code review for task
oat-project-review-provide code final        # Final code review
oat-project-review-provide code base_sha=abc # Review since specific SHA
oat-project-review-provide artifact discovery # Artifact review of discovery.md
oat-project-review-provide artifact spec     # Artifact review of spec.md
oat-project-review-provide artifact design   # Artifact review of design.md
```

### Without arguments

Run the `oat-project-review-provide` skill and it will:

1. Ask review type (code or artifact)
2. Ask scope (task/phase/final/range)
3. Confirm before running

## Artifact Hygiene

Artifact hygiene contract: Before finishing or committing, format every file you created or edited. Use the concrete write/fix formatting command supplied by the governing plan, task, or brief. If none is usable, discover the repository's documented write/fix command from applicable `AGENTS.md`/`CLAUDE.md` instructions and relevant package manifests; do not infer or hardcode a formatter. Prefer a file-scoped invocation when supported, and avoid rewriting unrelated files. If no command is discoverable, warn once with `no format command discovered in repo instructions; skipping`, then continue.

After formatting, run only repository checks relevant to the files changed;
writing prose artifacts or review bookkeeping does not imply unrelated full
test suites.

## Process

### Step 0: Resolve Project or Explicit Review Target

OAT stores active project context in `.oat/config.local.json` (`activeProject`, local-only).

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

Validation rules:

- Prefer `PROJECT_PATH` from `activeProject` when it is set and points to an existing directory.
- If `activeProject` is missing or invalid, allow an explicit user-provided project/review target to resolve `PROJECT_PATH`:
  - project path, e.g. `.oat/projects/shared/{project-name}`
  - project name, resolved as `${PROJECTS_ROOT}/{project-name}`
  - review target phrasing that includes a project name or project path
- A resolved `PROJECT_PATH` must point to an existing directory.
- `"$PROJECT_PATH/state.md"` must exist for mode-aware project review validation.

If neither an active project nor an explicit target resolves to a valid `PROJECT_PATH` with `state.md`, **stop and route**. Do not create or guess project pointers in this skill.

Tell user:

- This is a project-scoped skill and needs an initialized OAT project, either from `activeProject` or from a project/review target the user explicitly provided.
- Without resolvable project state, review can still proceed via non-project skill: `oat-review-provide`.
- To continue with project workflow instead, run one of:
  - `oat-project-open` (existing project)
  - `oat-project-quick-start` (new quick project)
  - `oat-project-import-plan` (external plan import)

If validation passes, derive `{project-name}` as basename of `PROJECT_PATH`. Summarize the resolved project/review target. For manual invocation, ask before continuing to Step 1. For `REVIEW_INVOCATION=gate`, continue without asking.

### Step 1: Parse Arguments or Ask

**If arguments provided:**

- Parse `$ARGUMENTS[0]` as review type: `code` or `artifact`
- Parse `$ARGUMENTS[1]` as scope token

**If no arguments — infer from project state:**

Read `state.md` frontmatter to propose the most likely review type and scope:

```bash
eval "$(oat project status --shell \
  PHASE=project.phase \
  PHASE_STATUS=project.phaseStatus \
  WORKFLOW_MODE=project.workflowMode 2>/dev/null)"
```

Inference rules (first match wins):

| Phase       | Status        | Inferred review                                                                |
| ----------- | ------------- | ------------------------------------------------------------------------------ |
| `discovery` | `complete`    | `artifact discovery`                                                           |
| `spec`      | `complete`    | `artifact spec`                                                                |
| `design`    | `complete`    | `artifact design`                                                              |
| `plan`      | `complete`    | `artifact plan`                                                                |
| `implement` | `in_progress` | `code` with current phase scope (derive from `implementation.md` current task) |
| `implement` | `complete`    | `code final`                                                                   |

If inference produces a result, propose it and proceed unless the user overrides:

```
Based on project state ({phase}, {phase_status}), I'd run: {type} {scope}
Proceed? (Y / or specify different type scope)
```

If the user confirms (or just presses enter), use the inferred type and scope. If the user provides an alternative, use that instead.

**If state.md is missing or phase is unrecognized:** fall back to asking:

- Ask: "What type of review? (code / artifact)"
- Ask: "What scope?"
  - For code: `pNN-tNN` task / `pNN` phase / `pNN-pMM` contiguous phase range / `final` / `base_sha=SHA` / `SHA..HEAD` range
  - For artifact: `discovery` / `spec` / `design` (and optionally `plan`)

### Step 1.5: Resolve Target Branch and Working Directory

Before validating artifacts or gathering files, verify that the review will run and write artifacts against the correct branch and working directory. This step must run before Step 2 so that `PROJECT_PATH` points to the correct checkout for all downstream operations.

**Detect current state:**

```bash
CURRENT_BRANCH=$(git branch --show-current)
```

**Handle detached HEAD:** If `CURRENT_BRANCH` is empty (detached HEAD), resolve the branch from the current worktree entry:

```bash
if [[ -z "$CURRENT_BRANCH" ]]; then
  REPO_ROOT=$(git rev-parse --show-toplevel)
  CURRENT_BRANCH=$(git worktree list --porcelain | awk -v wt="$REPO_ROOT" '
    /^worktree / { cur=$2 }
    /^branch / { if (cur == wt) { sub("refs/heads/", "", $2); print $2 } }
  ')
fi
```

If still empty after worktree lookup, ask user: "Unable to detect current branch (detached HEAD). Which branch should the review target?"

```bash
TARGET_BRANCH="${TARGET_BRANCH:-$CURRENT_BRANCH}"  # from user scope, worktree context, or default
```

**If target branch matches current branch:** proceed normally — no path adjustment needed.

**If target branch differs from current branch:**

1. Check if the target branch has a worktree:

   ```bash
   WORKTREE_PATH=$(git worktree list --porcelain | awk -v branch="$TARGET_BRANCH" '
     /^worktree / { wt=$2 }
     /^branch / { if ($2 == "refs/heads/" branch) print wt }
   ')
   ```

2. **If worktree exists for target branch:**
   - Compute the project's relative path within the repo: `REL_PROJECT=$(realpath --relative-to="$(git rev-parse --show-toplevel)" "$PROJECT_PATH")`
   - Update `PROJECT_PATH` to resolve inside the worktree: `PROJECT_PATH="$WORKTREE_PATH/$REL_PROJECT"`
   - All subsequent steps (artifact validation, git diff/log, artifact writes, commits) use the updated `PROJECT_PATH`.
   - Run git commands scoped to the worktree: `git -C "$WORKTREE_PATH" ...`
   - Print: `Review target: worktree at {WORKTREE_PATH} (branch: {TARGET_BRANCH})`

3. **If no worktree exists (regular branch on main worktree):**
   - **Stop and notify the user.** Do not silently write to the wrong branch.
   - Print:

     ```
     ⚠️  Target branch "{TARGET_BRANCH}" differs from current branch "{CURRENT_BRANCH}".
     No worktree found for "{TARGET_BRANCH}".

     Options:
     1. Switch to branch "{TARGET_BRANCH}" (git checkout) — artifact will be written on that branch
     2. Provide review inline only (no artifact written to disk)
     3. Cancel and create a worktree first

     Choose:
     ```

   - If user chooses option 1: run `git checkout {TARGET_BRANCH}`, then proceed.
   - If user chooses option 2: set `INLINE_ONLY=true` — skip artifact write (Step 7/8) and output review findings directly in the session. The user can manually save the output.

### Step 1.6: Enforce Committed Artifact Baseline

Before gathering review context, inspect the core project artifacts:

- `"$PROJECT_PATH/discovery.md"`
- `"$PROJECT_PATH/spec.md"`
- `"$PROJECT_PATH/design.md"`
- `"$PROJECT_PATH/plan.md"`
- `"$PROJECT_PATH/implementation.md"`
- `"$PROJECT_PATH/state.md"`
- `.oat/state.md` is generated dashboard state; ignore it for committed artifact baseline checks.

If any of those files are untracked or modified only because the previous workflow step did not finish its bookkeeping commit:

- Stop and tell the user to commit the pending artifact bookkeeping first, or resume the originating workflow skill so it can do that commit.
- Do not write a review artifact against that half-tracked state.

If the review is intentionally inline-only and the user explicitly wants to inspect an uncommitted artifact state, say so clearly in the output and skip writing the review artifact to disk.

- If user chooses option 3: stop and suggest `oat-worktree-bootstrap-auto`.

### Step 2: Validate Artifacts Exist (Mode-Aware)

Resolve workflow mode from the resolved project state path:

```bash
# Step 1.5 may retarget PROJECT_PATH into another worktree, so read from the
# resolved project path instead of the active-project pointer.
WORKFLOW_MODE=$(oat project status --project-path "$PROJECT_PATH" --field project.workflowMode 2>/dev/null || echo null)
```

**Required for code review (by mode):**

- `spec-driven`: `spec.md`, `design.md`, `plan.md`
- `quick`: `discovery.md`, `plan.md` (`spec.md`/`design.md` optional if present)
- `import`: `plan.md` (`references/imported-plan.md` recommended, `spec.md`/`design.md` optional)

**Required for artifact review:**

- The artifact being reviewed must exist.
- Upstream dependencies are required only when relevant to that artifact:
  - reviewing `spec` requires `discovery.md`
  - reviewing `design` in `spec-driven` mode requires `spec.md`
  - reviewing `design` in `quick/import` mode requires only `discovery.md` (spec is skipped in these modes)
  - in `quick/import` mode, missing `spec.md` must not be treated as a project review gate failure for `artifact design`; proceed with normal project-scoped review flow, artifact writing, and bookkeeping
  - reviewing `plan` in `spec-driven` mode requires `spec.md` + `design.md`
  - reviewing `plan` in `quick/import` mode may use `discovery.md` and/or `references/imported-plan.md` instead

**If missing:** Report missing required artifacts for the current mode and stop if requirements are not met.

### Step 3: Determine Scope and Commits

If review type is `artifact`:

- Interpret the scope token as the artifact name (`discovery`, `spec`, `design`, or `plan`)
- Set `SCOPE_RANGE=""` (no git range required)
- Proceed to Step 5 (metadata); Step 4 uses artifact files, not git diff

If review type is `code`, use the scope resolution below.

**Step 3a: Detect Re-Review Context**

After parsing the requested scope, distinguish an explicit range override from a
nominal project scope. An explicitly supplied `base_sha=<sha>` or
`<sha1>..<sha2>` range takes priority and skips automatic narrowing. Nominal
scope identifiers (`pNN`, `pNN-pMM`, `final`, and task IDs) identify the review
scope but do not override re-review narrowing.

For every code review, detect re-review context independently from deciding
whether to narrow:

1. Set `REVIEW_HEAD` to the full commit from
   `git rev-parse HEAD^{commit}`. Resolve the current lineage:
   - `manual` and `auto` invocations use lifecycle lineage.
   - A `gate` invocation uses gate lineage qualified by its exact
     `oat_gate_target`.
2. Resolve `workflow.autoNarrowReReviewScope` before any prior-review lookup or
   Git guard. Unset and `true` enable automatic narrowing; `false` disables it.
   Do not perform candidate work yet.
3. Find the newest prior completed code review for the same project, exact
   nominal scope, and lineage. Do this even when an explicit range override was
   supplied. If one exists, set `IS_RE_REVIEW=true`. Lifecycle lineage treats
   `manual` and `auto` as interchangeable. Gate lineage matches only a prior
   `gate` review with the same exact gate target; it never matches a lifecycle
   review or another gate target.
4. If an explicit range override was supplied, resolve that exact range through
   the explicit-input rules below, set the resolution reason to
   `explicit base/range override`, and skip automatic narrowing.
5. Otherwise, when the resolved preference is `false`, set the resolution
   reason to `narrowing disabled`, skip all prior-head candidate lookup and
   guards, and continue to normal full-scope resolution. Do not replace that
   reason with a provenance or guard reason.
6. Only when automatic narrowing is enabled, resolve `PRIOR_REVIEWED_HEAD` from
   these provenance sources:
   - First inspect the matching prior review artifact at its active path or
     locally archived counterpart and read its full `oat_review_head_sha`.
   - Then inspect the matching append-ordered event row in the tracked
     `plan.md` Reviews table and read its `Reviewed Head`. Match row provenance
     by `Scope`, `Type=code`, and invocation lineage: `manual` and `auto` are
     interchangeable lifecycle values; `gate` matches only `gate` with the same
     exact `Gate Target`. Legacy rows without a usable lineage qualifier are
     ineligible.
   - When both matching sources exist, they must name the same reviewed head.
     If they disagree, do not prefer either source.
   - When the artifact is absent (for example, after receive/archive), use the
     matching tracked row. When neither source yields a candidate, this is an
     initial review or provenance is unavailable.
7. Accept a candidate only when it is exactly 40 hexadecimal characters and
   both guards pass:

   ```bash
   git cat-file -e "${PRIOR_REVIEWED_HEAD}^{commit}" &&
     git merge-base --is-ancestor "$PRIOR_REVIEWED_HEAD" "$REVIEW_HEAD"
   ```

   If accepted, the narrowed range is exactly
   `SCOPE_RANGE="$PRIOR_REVIEWED_HEAD..$REVIEW_HEAD"`. Mark the range resolved
   and skip the normal scope-resolution rules below.

8. Fail open to normal full-scope resolution when this is an initial review,
   neither provenance source yields a valid candidate, the sources disagree,
   the commit does not exist, or the ancestry guard fails. State the specific
   fallback reason; never infer narrowing from ambiguous or legacy lineage.

If no valid guarded range was resolved, continue with normal full-scope
resolution automatically. The re-review path has no interactive narrowing
decision.

**Priority order for scope resolution (only when Step 3a did not resolve a
narrowed range):**

1. **Explicit user input (preferred):**
   - `base_sha=<sha>` → review range is `<sha>..HEAD`
   - `<sha1>..<sha2>` → exact range review
   - `pNN-tNN` → task scope
   - `pNN` → phase scope
   - `pNN-pMM` → contiguous inclusive phase-range scope (for example `p02-p03`)
   - `final` → full project review

**Phase-range semantics:**

- `pNN-pMM` scopes are inclusive and must represent contiguous implementation phases.
- This is the canonical scope format for checkpoint auto-reviews that need to cover multiple previously unpassed phases in one review.
- When a phase-range token is used, treat it as a range review for artifact naming/storage, but preserve the exact `oat_review_scope` value (for example `p02-p03`) in frontmatter and plan review rows.

2. **Automatic phase detection (if invoked at phase boundary):**
   - Derive current phase from plan.md + implementation.md
   - Use commit convention grep to find commits:

     ```bash
     # Task commits: grep for (pNN-tNN)
     git log --oneline --grep="\(p${PHASE}-t" HEAD~50..HEAD

     # Phase commits: grep for (pNN-
     git log --oneline --grep="\(p${PHASE}-" HEAD~50..HEAD
     ```

   - For contiguous phase-range scopes (`pNN-pMM`), aggregate commit matches for each phase in the inclusive range:

     ```bash
     for PHASE_NUM in $(seq "$START_PHASE_NUM" "$END_PHASE_NUM"); do
       PHASE_ID=$(printf "p%02d" "$PHASE_NUM")
       git log --oneline --grep="\\(${PHASE_ID}-" HEAD~50..HEAD
     done
     ```

3. **Fallback (if commit conventions missing/inconsistent):**
   - Prompt user to choose:
     - Provide `base_sha=<sha>`
     - Provide `<sha1>..<sha2>` range
     - Confirm "review merge-base..HEAD" (all changes on branch)

   **Merge-base approach:**

   ```bash
   MERGE_BASE=$(git merge-base origin/main HEAD 2>/dev/null || git merge-base main HEAD 2>/dev/null)
   SCOPE_RANGE="$MERGE_BASE..HEAD"
   ```

**Step 3b: Classify and Report Re-Review Resolution**

After `SCOPE_RANGE` is final, classify it for reporting whenever
`IS_RE_REVIEW=true`, including when an explicit base or SHA-range override
supplied the exact final range:

- `empty`: `git diff --name-only "$SCOPE_RANGE"` returns no files.
- `bookkeeping-only`: every changed path is inside the exact active project
  prefix `"$PROJECT_RELATIVE/"`, where `PROJECT_RELATIVE` is the path from
  `git rev-parse --show-toplevel` to `PROJECT_PATH`.
- `substantive`: any changed path is outside that project prefix. If changed
  files cannot be enumerated, conservatively use `substantive` and include
  `changed-files-unavailable` in the reason.

Classification is reporting-only; all three classifications still dispatch the
review over the resolved range.

Print exactly one re-review resolution line:

```
Re-review scope: range={SCOPE_RANGE}; classification={empty|bookkeeping-only|substantive}; reason={explicit base/range override | narrowing disabled | no usable prior reviewed head | provenance disagreement | prior commit missing | prior commit not an ancestor | narrowed from guarded prior reviewed head | changed-files-unavailable plus the applicable resolution reason}.
```

The reason must state why narrowing applied or why full scope was selected. Do
not print a second narrowing-decision line elsewhere.

### Step 4: Get Files Changed

If review type is `code`, once scope range is determined:

```bash
FILES_CHANGED=$(git diff --name-only "$SCOPE_RANGE" 2>/dev/null)
FILE_COUNT=$(echo "$FILES_CHANGED" | wc -l | tr -d ' ')
```

If review type is `artifact`, the "files in scope" are the artifact(s):

```bash
case "$SCOPE_TOKEN" in
  discovery) FILES_CHANGED=$(printf "%s\n" "$PROJECT_PATH/discovery.md") ;;
  spec) FILES_CHANGED=$(printf "%s\n" "$PROJECT_PATH/spec.md" "$PROJECT_PATH/discovery.md") ;;
  design)
    if [[ "$WORKFLOW_MODE" == "spec-driven" ]]; then
      FILES_CHANGED=$(printf "%s\n" "$PROJECT_PATH/design.md" "$PROJECT_PATH/spec.md")
    else
      FILES_CHANGED=$(printf "%s\n" "$PROJECT_PATH/design.md" "$PROJECT_PATH/discovery.md")
    fi
    ;;
  plan)
    if [[ "$WORKFLOW_MODE" == "spec-driven" ]]; then
      FILES_CHANGED=$(printf "%s\n" "$PROJECT_PATH/plan.md" "$PROJECT_PATH/spec.md" "$PROJECT_PATH/design.md")
    elif [[ "$WORKFLOW_MODE" == "quick" ]]; then
      FILES_CHANGED=$(printf "%s\n" "$PROJECT_PATH/plan.md" "$PROJECT_PATH/discovery.md")
    else
      FILES_CHANGED=$(printf "%s\n" "$PROJECT_PATH/plan.md" "$PROJECT_PATH/references/imported-plan.md")
    fi
    ;;
esac
FILE_COUNT=$(echo "$FILES_CHANGED" | wc -l | tr -d ' ')
```

Display to user:

```
Review scope: {scope}
Range: {SCOPE_RANGE} (code reviews only; artifact reviews have no git range)
Files changed: {FILE_COUNT}

{FILE_LIST preview - first 20 files}

Proceed with review?
```

If `REVIEW_INVOCATION=gate`, print the same scope summary but do not ask `Proceed with review?`; continue directly.

### Step 4.1: Dispatch Profile Ceiling Advisory (Artifact Plan Only)

When reviewing `artifact plan`, apply this Dispatch Profile named-ceiling
advisory:

- A missing `## Dispatch Profile` section is normal and must not be flagged.
- Important findings:
  - invalid phase ID that does not match a real plan phase
  - unknown named ceiling or a phase ceiling above the project ceiling
  - wording that pins an exact provider model, family, effort, or role instead
    of a named maximum
  - low named ceiling for multi-file integration, architecture, or review-heavy
    work
  - low named ceiling with missing or generic rationale
- Medium findings:
  - malformed but recoverable Dispatch Profile table structure
  - mid-tier ceiling for architecture-heavy work without convincing rationale
- Minor findings:
  - rationale is present but weakly tied to phase scope

Include this advisory in the Review Scope metadata for artifact plan reviews so
the reviewer evaluates explicit ceiling rows without treating omitted rows as a
gap. A named ceiling is a maximum; lower configured candidates remain eligible
for later task selection.

### Step 4.5: Gather Deferred Findings Ledger (Final Scope Only)

If `review type == code` and `scope == final`, gather unresolved deferred findings from prior review cycles.

Preferred sources:

- `implementation.md` sections titled `Deferred Findings (...)`
- prior review artifacts under `reviews/archived/` when implementation notes are incomplete (plus the current active review file in `reviews/`, if one exists for the in-flight cycle)

Build:

- `DEFERRED_MEDIUM_COUNT`
- `DEFERRED_MINOR_COUNT`
- `DEFERRED_LEDGER` (one-line summary per finding with source artifact)

Rules:

- Include this ledger in review metadata so final review explicitly re-evaluates carry-forward debt.
- Final review should call out whether each deferred Medium remains acceptable or should now be fixed.

### Step 5: Prepare Review Metadata Block

Build the "Review Scope" metadata for the reviewer:

```markdown
## Review Scope

**Project:** {PROJECT_PATH}
**Type:** {code|artifact}
**Scope:** {scope}{optional: " (" + SCOPE_RANGE + ")"}
**Date:** {today}

**Artifact Paths:**

- Spec: {PROJECT_PATH}/spec.md (required in spec-driven mode; optional in quick/import)
- Design: {PROJECT_PATH}/design.md (required in spec-driven mode; optional in quick/import)
- Plan: {PROJECT_PATH}/plan.md
- Implementation: {PROJECT_PATH}/implementation.md
- Discovery: {PROJECT_PATH}/discovery.md
- Imported Plan Reference: {PROJECT_PATH}/references/imported-plan.md (optional; import mode)

**Tasks in Scope (code review only):** {task IDs from plan.md matching scope}

**Files Changed ({FILE_COUNT}):**
{FILE_LIST}

**Commits (code review only):**
{git log --oneline for SCOPE_RANGE}

**Narrowed Review Provenance (code re-reviews only):**

- Narrowing applied: {yes|no}
- Prior review artifact: {artifact path from the matching event}
- Prior reviewed head: {full PRIOR_REVIEWED_HEAD, or unavailable}
- Resolved range: {SCOPE_RANGE}
- When narrowing applied, the resulting review artifact must name the prior
  review artifact and reviewed head it builds on. Treat requirements coverage
  outside the narrowed range as inherited from that artifact, not re-verified
  by this pass.

**Deferred Findings Ledger (final scope only):**

- Deferred Medium count: {DEFERRED_MEDIUM_COUNT}
- Deferred Minor count: {DEFERRED_MINOR_COUNT}
  {DEFERRED_LEDGER}

**Design Drift Review Guidance:**

- If implementation differs from `spec.md`, `design.md`, or `plan.md`, decide whether the code should change or whether the artifact is stale.
- Use artifact-alignment framing when shipped implementation is defensible and the lifecycle artifact should be updated.
- Do not force a code-defect framing for accepted design drift; `oat-project-review-receive` can convert artifact drift into alignment tasks or explicit deferrals.
```

### Step 6: Execute Review (3-Tier Capability Model)

**Step 6.0: Resolve the managed reviewer target**

Before capability-tier selection, resolve the same reviewer contract used by
plan artifact review and implementation phase/final review:

```bash
oat project dispatch-ceiling resolve --provider "$ACTIVE_PROVIDER" --role reviewer --preflight --report-scope "$SCOPE_TOKEN" --report-action review --json
```

Require `dispatchReport.schemaVersion: 1`. Render/consume the resolver's
versioned report using `formatDispatchReport(dispatchReport)` semantics, and
derive the formal compatibility line only with
`formatDispatchStamp(dispatchReport)` / `toDispatchStampRecord(dispatchReport)`.
Include that derived line in the review dispatch audit metadata; do not
hand-assemble `Dispatch:` fields from a role name or model string.

The exact managed provider target still comes from
`providers.<provider>.dispatchArgs` plus
`providers.<provider>.selection.target`, and the actual reviewer invocation
must retain it byte-for-byte. The report is an audit/rendering surface, not a
selection fallback. Configured invocation (including gate-owned immutable
metadata), work-producer diversity, and independently observed reviewer runtime identity are distinct. Do not promote producer stamps, configured defaults, or
reviewer self-report into `dispatchReport.runtimeIdentity`; leave it
`not-reported` unless an independent observation exists.

The reviewer resolver selects the final candidate of the configured review
ceiling. Do not supply ephemeral implementer candidate requests for artifact,
phase, project, or final review. A lower candidate is allowed only when a
separate reviewed contract explicitly authorizes reviewer lowering and defines
its bounds; a Dispatch Profile row does not authorize it.

Resolve every concrete managed reviewer target before probing generic subagent
availability or selecting Tier 1/Tier 2/Tier 3. The concrete target takes
precedence over all availability, preference, timeout, fresh-session, and gate
fallbacks.
A concrete managed Codex target takes precedence over tier availability.
Build the actual provider invocation before reporting the target as enforced:

- Codex must send the resolver-returned Codex variant first as the native
  `agent_type`. Spawn acceptance plus the complete launcher payload is
  configured invocation evidence; it does not require reviewer self-report or
  separate runtime telemetry. A native role-selection rejection means an
  explicit host rejection of that exact `agent_type` before any reviewer or
  child starts. Only after that pre-start rejection may the workflow launch a
  fresh Codex child with the resolver target's explicit model, reasoning
  effort, canonical role instructions from `.agents/agents/oat-reviewer.md`,
  and the same Review Scope payload. If neither exact route is available, use
  only a verified-equivalent inline route or block the review.
- Claude requires a non-empty `providers.claude.dispatchArgs.model`; the actual
  provider invocation must include that exact value as its `model` argument.
- Cursor requires a non-empty `providers.cursor.dispatchArgs.variant`; the
  actual provider invocation must launch that exact resolver-returned native
  reviewer variant as the native agent type first. Keep Cursor model strings
  opaque inside the materialized mapping and resolver. Only a recorded
  pre-start native role-selection rejection of that exact variant before any
  reviewer starts permits another target-preserving route.

Managed incomplete resolver results, including a missing or incomplete
candidate ladder, fail closed before review. Route interactive repair through
the planning workflow's `Complete Dispatch Ladder Adoption Contract`; do not
invent a reviewer target.

**Pre-plan policy inheritance:** When the resolver returns
`unresolvedReason: 'policy'`, and only then, an `artifact` review whose scope is
`discovery`, `design`, or `spec` does not block or prompt. Review by deliberate
inheritance in the current context and record
`selection_reason: inherit (pre-plan; no project policy)`. An explicitly set
project policy is always honored, including for pre-plan artifacts. Code
reviews and `artifact plan` reviews still hard-require a resolved policy.
Missing or incomplete ladder results (`unresolvedReason: 'ladder' | 'both'`)
still fail closed. Gate exec-target selection is unaffected by this
inheritance rule because gates resolve their target independently.

After constructing the complete provider payload, record the launcher-owned
`target`, `model_axis`, and `effort_axis` with
`launcher-selected/config-declared` provenance. These fields are immutable:
missing telemetry, missing reviewer self-report, or contradictory self-report
must not populate, replace, or overwrite them and must not trigger fallback.

Once the native host accepts a reviewer, every terminal result is an
authoritative review outcome. An accepted reviewer returning `BLOCKED` is a
terminal blocking review outcome: it blocks the review and does not invoke or
trigger the fresh-child fallback. Absent findings from that terminal must not
be parsed, interpreted, or treated as a passing review.

Before acceptance, an explicit transport or role-selection rejection may retry
with the same exact role and complete invocation payload, including the Claude
model argument or Cursor native variant. After acceptance, poll, nudge, or
continue only through the existing reviewer handle. Terminal timeout,
interruption, or `BLOCKED` blocks or escalates without another launch. If the
host cannot apply a required role, variant, or model argument before launch,
fail closed or block unless inline execution has verified equivalent
current-host controls.
Workflow correctness must not require provider restart or hot reload.
Never use a managed base role because a target is missing or unavailable; a
managed base role is forbidden except for
explicit inherit/default behavior or the documented managed-uncapped reviewer
fallback.

**Step 6.1: Headless gate route (overrides normal tier selection)**

When either prompt frontmatter has `oat_gate_headless: true` or the environment
has `OAT_GATE_HEADLESS=1`, copy the expected runtime and model from
`oat_gate_runtime` and `oat_invocation_model`, determine whether this host has
an awaited-child capability, and use the gate-provided branch-local CLI path.
Fail closed with `OAT_GATE_REFUSAL` if `OAT_GATE_CLI_PATH` is absent or not
executable. Run the route command and validate its JSON before using it:

```bash
ROUTE_JSON="$("$OAT_GATE_CLI_PATH" gate route --json \
  --expect-runtime "$OAT_GATE_RUNTIME" \
  --expect-model "$OAT_INVOCATION_MODEL" \
  --can-await true)"

OAT_GATE_ROUTE_JSON="$ROUTE_JSON" node -e '
const value = JSON.parse(process.env.OAT_GATE_ROUTE_JSON);
if (!["inline", "delegate-sync", "refuse"].includes(value.route) ||
    typeof value.reason !== "string") process.exit(1);
if (value.cliRoot !== process.env.OAT_GATE_CLI_ROOT) process.exit(1);
process.stdout.write(JSON.stringify(value));
'
```

Pass `--can-await false` when this host cannot synchronously await delegated
review completion. An absent command, command failure, help/non-JSON output,
invalid envelope, or `cliRoot` different from `OAT_GATE_CLI_ROOT` is a
structured refusal; never retry with bare `oat` or another installed CLI. Do
not make a separate runtime/model identity judgment in skill prose; follow the
validated helper route:

In the terminal headless response, report
`Gate route: <route> (runtime=<expected-runtime>, cliRoot=<validated-cliRoot>)`
so the parent can retain branch-local route evidence.

- `inline`: execute the complete `oat-reviewer` role contract in the current
  context, write the artifact, and finish bookkeeping before returning.
- `delegate-sync`: dispatch through an awaited handle, then verify the expected
  artifact exists and carries the matching `oat_gate_run_id` before returning.
  A terminal `BLOCKED`, interruption, timeout, or missing/mismatched artifact
  remains terminal and must not trigger a second launch.
- `refuse`: print `OAT_GATE_REFUSAL: <reason from route output>` on its own
  line. Exit nonzero where the host permits; the gate classifies this line
  independently of exit code.

Headless gate mode overrides the Tier 1 background-dispatch preference:
NEVER use fire-and-forget background dispatch in this mode. The review and its
artifact/bookkeeping completion must be inline or synchronously awaited before
the gate child exits.

**Step 6a: Probe Subagent Availability**

Before selecting a tier, announce the probe and its result so the user can see what's happening:

```
[3/5] Checking subagent availability…
  → oat-reviewer: {available | authorization required | not resolved} ({reason})
  → Selected: Tier {1|2|3} — {Subagent (fresh context) | Fresh session (recommended) | Inline review}
```

Detection logic:

- If the host is Claude Code, use Task-style subagent dispatch with `subagent_type: "oat-reviewer"` and resolve from `.claude/agents/oat-reviewer.md`.
- If the host is Cursor, invoke the exact resolver-selected native reviewer
  variant when a concrete managed target exists. Use base `oat-reviewer` only
  for an explicit inherit/default exception, resolved from
  `.cursor/agents/oat-reviewer.md` (or the `.claude/agents/oat-reviewer.md`
  compatibility path).
- If the host is Codex multi-agent, verify Codex requirements first:
  - `[features] multi_agent = true` is enabled in active Codex config.
  - For a concrete managed target, `agent_type` must be the exact custom role declared under `[agents.<name>]`; built-in roles and auto-selection are not equivalent fallbacks.
  - If the current Codex host requires explicit user authorization before calling `spawn_agent`, do not mark `oat-reviewer` as unresolved. Announce `authorization required` and ask one concise confirmation question before selecting Tier 2 or Tier 3:

    ```
    Delegate this review to `oat-reviewer`?
    ```

  - If the user authorizes delegation and Codex role prerequisites are satisfied, use **Tier 1**.
  - If the user declines delegation, continue only through a target-preserving pinned-child or guarded inline route. Otherwise block.

- If the runtime can dispatch reviewer work (`subagent_type` in Claude Code, Cursor invocation via `/name` or natural mention, or Codex multi-agent spawn/auto-spawn) → **Tier 1**.
- If the Task tool is not available or subagent dispatch is not supported, use **Tier 2** only after applying the target-first contract.
- If the user explicitly requests inline or confirms they are already in a fresh session, use **Tier 3** only when the guarded inline route is valid.
- Gate-originated review skips fresh-session handoff instructions and immediately uses the first target-preserving route available from Step 6.0. If none exists, fail closed.

**Step 6b: Tier 1 — Subagent (if available)**

First, pre-compute the final review artifact path using Step 7 naming
conventions, but do not create that discoverable file. For enforce-mode code
review, invoke launcher-owned `oat review prepare-context` before dispatch and
retain its validation run, private artifact draft path, and command
invocations. The reviewer receives only the private draft path.

Then spawn the reviewer:

- Use provider-appropriate dispatch:
  - Claude Code: Task tool with `subagent_type: "oat-reviewer"` (resolves from `.claude/agents/oat-reviewer.md`). For a concrete managed target, the payload must also contain `model: providers.claude.dispatchArgs.model` with the resolver-returned value.
  - Cursor: for a concrete managed target, invoke `providers.cursor.dispatchArgs.variant` as the exact resolver-selected native reviewer variant. Do not attach a Task-level model argument or normalize the mapped model. Base `oat-reviewer` is allowed only for explicit inherit/default behavior. A pre-start native role-selection rejection is the only replacement boundary.
  - Codex style: for a concrete managed target, first spawn the exact resolver-returned native `agent_type`; only an explicit pre-start native role-selection rejection permits the explicitly pinned fresh-child route from Step 6.0. Generic auto-selection is permitted only for the documented base-role exceptions.
- Pass the Review Scope metadata block from Step 5 as the prompt
- Pass only `artifactDraftPath` for the subagent to write to. Do not include the pre-computed final publication path in any reviewer prompt, payload, or instruction.
- **If a worktree was resolved in Step 1.5:** include the worktree path in the prompt so the subagent writes the artifact to the worktree directory, not the current session's working directory
- Run in background if supported (`run_in_background: true`)

The `oat-reviewer` agent definition contains the full review process, mode contract, severity categories, artifact template, and critical rules. No additional instructions need to be injected.

When the host accepts the reviewer, bind and retain that exact accepted handle
for the full coordinator lifetime. The accepted reviewer performs required
artifact intake, invokes the supplied `checkpointArtifacts`, submits
`ReviewPlanV1` through `validate-plan`, retains its
`PlanValidationReceiptV1`, and invokes `begin-evidence` before selective
content evidence. Retain that exact accepted reviewer handle for its typed
`ReviewerTerminalV1`; never launch a replacement after accepted timeout,
blocked, malformed, or accounting-invalid output.

After the subagent completes:

- Submit the complete terminal through launcher-owned `validate-output`.
- If and only if every error points into the closed accounting allowlist, offer
  at most two same-handle accounting repair turns through the retained handle.
  Substance mutation or exhausted repair yields
  `review_complete_accounting_invalid`.
- Only an accepted complete artifact terminal may invoke launcher-owned
  `oat review publish-output --run-id <id> --destination <final-path> --json`.
  The command consumes the private accepted snapshot once and never reads or
  re-snapshots the reviewer draft. After publication, continue to Step 8.5 and
  then the Step 9/9.5 bookkeeping.
- Blocked or accounting-invalid output remains non-actionable. No discoverable
  artifact, Reviews row, project log, or bookkeeping commit may be created.
  Delete the private draft and stop. Never infer a pass from absent findings.

**Step 6c: Tier 2 — Fresh Session (recommended fallback)**

If target-preserving subagent dispatch is not available:

- If user is already in a fresh session (confirmed), proceed to Tier 3.
- If Codex reported `authorization required` and the user approved delegation, do **not** use Tier 2. Return to Tier 1 and delegate to `oat-reviewer`.
- If user prefers fresh session: provide instructions and exit.
- Gate-originated review does not return fresh-session instructions; it uses the guarded route selected in Step 6.0 or fails closed.

Instructions for fresh session:

```
To run review in a fresh session:
1. Open a new terminal/session
2. Run the oat-project-review-provide skill with: code {scope}
3. When complete, return to this session
4. Run the oat-project-review-receive skill
```

### Step 6d: Tier 3 — Plan-First Inline Continuation (fallback)

If the user requests inline review, first verify equivalent current-host model
and effort controls. Inline is also allowed for explicit inherit/default or the
documented managed-uncapped reviewer behavior. User preference alone does not
override a concrete managed target; if the guard fails, use the exact/pinned
route or block.

When inline is allowed, use the following contract. The current planning parent
is the accepted inline continuation. Do not launch a replacement reviewer or
introduce another coordinator. The launcher-owned commands and validators
remain authoritative; execute their supplied executable and argument arrays
directly.

Use this exact contract:

1. **Preparation (`oat review prepare-context`)** — Invoke the launcher-owned
   `prepare-context` command for the authoritative range, sink, invocation, and
   already-resolved outer budget. Treat its changed-file set, metadata-only
   ChangeMap, obligations, run identity, and command invocations as
   authoritative. Bind the current planning parent as the accepted handle and
   retain it for all continuation and repair turns.
2. **Required artifact intake** — Re-read the mode-required lifecycle artifacts
   from scratch. Use `FILES_CHANGED` only as the authoritative path inventory;
   do not read source files or content-level diffs yet. For a narrowed
   re-review, keep the exact narrowed range and inherited-coverage provenance.
3. **Artifact checkpoint (`checkpointArtifacts`)** — After artifact intake,
   execute the supplied one-shot checkpoint command from this accepted
   continuation. Use its sealed `PreparedReviewContextV1` and post-artifact
   budget; never supply self-reported token counts.
4. **Validated plan (`ReviewPlanV1`)** — Build one compact inline plan that
   assigns every authoritative path and obligation, records the mandatory
   delegation economics and verification boundary, and records a
   selective-inline or eligible whole-diff-inline evidence strategy. Submit it
   with the supplied `validate-plan` command. One rejected plan may be
   corrected once before evidence.
5. **Validation receipt (`PlanValidationReceiptV1`)** — Retain the opaque
   receipt returned by the launcher-owned validator. Do not infer acceptance
   from reviewer-authored digests.
6. **Evidence transition (`beginEvidence`)** — Execute the supplied
   begin-evidence command with that receipt. Do not read source files or
   content-level diffs unless this atomic transition succeeds.
7. **Selective evidence** — Inspect consequential seams first, then use
   path-scoped diffs and targeted source context according to the validated
   plan. Inline does not imply whole-diff. Whole-diff is valid only when
   `patchEstimateState === 'exact'`, observed post-artifact telemetry produced
   a context budget, `estimatedPatchTokens <= evidenceBudgetTokens`, and the
   scope is one coherent lane without an unresolved consequential seam.
   Missing telemetry, missing budget evidence, or an inexact/capped patch
   estimate keeps the review inline but requires path-scoped evidence.
8. **Typed terminal (`ReviewerTerminalV1`)** — Apply the full canonical
   `oat-reviewer` checklist, reconcile evidence, and return one complete or
   blocked terminal from this same continuation. Complete output carries the
   dispatch-selected candidate and `ReviewAccountingV1`; blocked output carries
   blocked-incomplete accounting and no actionable candidate.
9. **Output validation (`validate-output`)** — Run the launcher-owned output
   validator before translating to the artifact sink. For an artifact
   candidate, require the private draft path and immutable embedded accounting
   snapshot to equal the terminal envelope.
10. **Bounded repair** — If and only if all validation errors point into the
    closed encoding allowlist, perform at most two same-handle accounting repair
    turns in this accepted inline continuation. Preserve the immutable substance
    digest and never launch a replacement after accepted timeout, blocked,
    malformed, or accounting-invalid output.
11. **Acceptance side effects** — Only accepted complete artifact output may
    invoke launcher-owned
    `oat review publish-output --run-id <id> --destination <final-path> --json`
    for the final Step 7 path and then continue with artifact orchestration
    validation and bookkeeping. The command consumes the exact private accepted
    snapshot once and never reads or re-snapshots the reviewer draft. Blocked or
    accounting-invalid output remains non-actionable. No discoverable artifact,
    Reviews row, project log, or bookkeeping commit may be created; delete the
    private draft and stop.

### Step 7: Determine Review Artifact Path

**If `INLINE_ONLY=true`** (user chose inline-only in Step 1.5): skip this step — no artifact path needed.

Review storage contract:

- Write new review artifacts to the active tracked directory: `{PROJECT_PATH}/reviews/`
- Do **not** write new artifacts directly into `{PROJECT_PATH}/reviews/archived/`
- After `oat-project-review-receive` consumes a review, that skill moves it into `reviews/archived/` for local-only historical storage

**Naming convention:**

Use a seconds-precision **UTC** timestamp token (`YYYY-MM-DDTHHMMSSZ`, from `date -u +%Y-%m-%dT%H%M%SZ` — the `-u` and the trailing `Z` are mandatory), not a date-only or local-time stamp, so that same-scope re-reviews and re-gates within one day never collide and `oat review latest` orders them by recency:

- Phase review: `{PROJECT_PATH}/reviews/pNN-review-YYYY-MM-DDTHHMMSSZ.md`
- Task review: `{PROJECT_PATH}/reviews/pNN-tNN-review-YYYY-MM-DDTHHMMSSZ.md`
- Final review: `{PROJECT_PATH}/reviews/final-review-YYYY-MM-DDTHHMMSSZ.md`
- Range review: `{PROJECT_PATH}/reviews/range-review-YYYY-MM-DDTHHMMSSZ.md`
- Artifact review: `{PROJECT_PATH}/reviews/artifact-{artifact}-review-YYYY-MM-DDTHHMMSSZ.md`

Set `oat_generated_at` in the artifact frontmatter to the matching full timestamp (`YYYY-MM-DDTHH:MM:SSZ`). Same-second collisions are effectively impossible for sequential runs; if one occurs, append `-v2`, `-v3`, etc.

**Important:** `PROJECT_PATH` here must be the resolved path from Step 1.5. If a worktree was detected, this path is relative to the worktree root, ensuring the artifact is written on the correct branch.

```bash
mkdir -p "$PROJECT_PATH/reviews"
```

### Step 8: Write Review Artifact (if Tier 3)

If running inline (Tier 3), execute the review into the launcher-created
private draft only. Do not write the Step 7 discoverable path directly.
Step 6d validates the terminal and embedded accounting snapshot, then publishes
the accepted snapshot atomically. If validation does not accept a complete
terminal, delete the private draft and skip Steps 8.5, 9, and 9.5.

**Review checklist (from oat-reviewer):**

1. Verify scope (don't review out-of-scope changes)
2. If code review: verify alignment to available requirements sources (`spec`/`design` for spec-driven mode; `discovery`/import reference for quick/import)
3. If code review: verify code quality (correctness, tests, security, maintainability)
4. If artifact review: verify completeness/clarity/readiness of the artifact and its alignment with upstream artifacts
5. Categorize findings (Critical/Important/Medium/Minor)
6. For final scope: explicitly disposition deferred Medium ledger items (fix now vs accept defer)
7. Write artifact with file:line references and fix guidance

**Review artifact template:** (see `.agents/agents/oat-reviewer.md` for full format)

Shared ad-hoc companion reference (non-project mode):

- `.agents/skills/oat-review-provide/references/review-artifact-template.md`

```markdown
---
oat_generated: true
oat_generated_at: { full UTC timestamp, e.g. 2026-07-06T11:16:01Z }
oat_review_scope: { scope }
oat_review_type: { code|artifact }
oat_review_invocation: { manual|auto|gate }
oat_project: { PROJECT_PATH }
# Code-review only: full 40-character SHA from `git rev-parse <range-head>^{commit}`.
oat_review_head_sha: { authoritative range head commit SHA }
# Narrowed code-review only: copy the complete resolved provenance chain.
oat_review_range: { prior reviewed head }..{ authoritative range head }
oat_prior_review_artifact: { prior artifact path }
oat_prior_review_head_sha: { prior artifact's full reviewed head commit SHA }
# Gate-only: copy the exact prompt-provided fields below.
oat_gate_run_id: { gate run id }
oat_gate_target: { configured target id }
oat_gate_runtime: { configured runtime }
oat_invocation_model: { configured model|provider-default|unknown }
oat_invocation_reasoning_effort: { configured effort|provider-default|unknown }
oat_invocation_source: { exec-target-config|unknown }
---

# {Code|Artifact} Review: {scope}

**Reviewed:** {today}
**Scope:** {scope description}
**Files reviewed:** {N}
**Commits:** {range}
```

**Frontmatter field: `oat_review_invocation`**

- `manual` (default): Review was manually triggered by the user. `oat-project-review-receive` uses standard disposition behavior (user prompts for triage, minors auto-deferred for non-final scopes).
- `auto`: Review was spawned by the auto-review checkpoint trigger in `oat-project-implement`. `oat-project-review-receive` uses relaxed disposition: minors are auto-converted to fix tasks (not deferred), no user prompts for disposition decisions.
- `gate`: Review was spawned by `oat gate review` for a workflow gate. Gate-originated reviews use normal stateful review-provide behavior: write the review artifact, update the `## Reviews` row, and commit review bookkeeping. The gate CLI maps the review artifact findings to exit status, and `oat-project-review-receive` dispositions gate reviews autonomously (no user prompts) — selecting convert-to-fix-tasks when the gate **blocked** at its threshold, or non-pausing judgment-sweep disposition (defer / small-fix-now / reject, with sub-threshold findings recorded durably) when the gate **passed**.

When `oat-project-implement` spawns this skill for auto-review at checkpoints, it passes context indicating auto invocation. Set `oat_review_invocation: auto` in the artifact frontmatter.

When `oat gate review` invokes this skill, it includes gate-originated context instructing the reviewer to write `oat_review_invocation: gate`. Honor that instruction in the artifact frontmatter.

The gate prompt also supplies exact values for `oat_gate_run_id`, `oat_gate_target`, `oat_gate_runtime`, `oat_invocation_model`, `oat_invocation_reasoning_effort`, and `oat_invocation_source`. Copy all six values verbatim for gate-originated artifacts. These fields record OAT's configured invocation; do not derive them from `baseCommand`, the target id, model self-identification, or surrounding dispatch prose. Optional observed/self-reported identity is separate and non-authoritative.

For all other invocations (user-triggered, fresh session), use `manual`.

Gate parsing contract:

- Include either the `Findings: {N} critical, {N} important, {N} medium, {N} minor` summary line or the standard `## Findings` section with `### Critical`, `### Important`, `### Medium`, and `### Minor` subsections populated with findings or `None`.
- Do not omit severity headings merely because a severity has zero findings; `oat gate review` depends on counts or standard Findings sections to determine whether the review blocks.

## Summary

{2-3 sentence summary}

Findings: {N} critical, {N} important, {N} medium, {N} minor

## Findings

### Critical

{findings or "None"}

### Important

{findings or "None"}

### Medium

{findings or "None"}

### Minor

{findings or "None"}

## Spec/Design Alignment

### Requirements Coverage

| Requirement | Status                          | Notes   |
| ----------- | ------------------------------- | ------- |
| {ID}        | implemented / missing / partial | {notes} |

### Extra Work (not in requirements)

{list or "None"}

## Verification Commands

{commands to verify fixes}

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.

```

### Step 8.5: Validate Review Orchestration and Append Root Log

If `INLINE_ONLY=true`, skip this step because no review artifact or
artifact-mode confirmation exists.

Before validating the review artifact or updating project bookkeeping, consume
the reviewer's brief artifact-mode confirmation. It must contain exactly one of
these exact lines:

- `**Reconnaissance:** attempted`
- `**Reconnaissance:** not-attempted`

A missing, duplicate, or invalid reconnaissance signal is an
incomplete-artifact error: stop and fail closed without updating bookkeeping or
appending a project-log entry.

Use the valid signal to validate the review artifact's orchestration evidence:

- For `attempted`, require a complete `## Review Orchestration` section with
  one compact account of every attempted wave: task class, classification
  rationale, selected target, acceptance/outcome, floor satisfaction, fallback,
  and primary reconciliation. Missing or incomplete evidence is an
  incomplete-artifact error. After successful validation, append exactly once
  through `oat project log append`, creating one concise structural entry that
  references the review artifact path.
- For `not-attempted`, the artifact must not contain
  `## Review Orchestration`; treat a present section as an inconsistent,
  incomplete artifact. Do not append a log entry and do not invoke
  `oat project log append`.

For the attempted branch, do not duplicate individual worker records. Defer
flags and entry format to `oat project log append --help`; never pre-check
project-log configuration because the helper no-ops when logging is disabled.
The reviewer and workers never write `project-log.md` or append this entry.

### Step 9: Update Plan Reviews Section

After review artifact is written, update `plan.md` `## Reviews` table _if plan.md exists_.

Record this artifact as one append-ordered review event:

- `Scope`: `{scope}` (examples: `p02`, `final`, `spec`, `design`)
  - Phase-range examples such as `p02-p03` are valid code-review scopes and should be preserved exactly.
- `Type`: `code` or `artifact`
- `Status`: `received` (receive-review will decide `fixes_added` vs `passed`; `passed` now requires no unresolved Critical/Important/Medium and final deferred-medium disposition when applicable)
- `Date`: `{today}`
- `Artifact`: `reviews/{filename}.md`
- `Reviewed Head`: for code reviews, the full 40-character SHA from
  `git rev-parse <authoritative-range-head>^{commit}`; `-` for non-code reviews.
  Never record an abbreviation, symbolic ref, or range string.
- `Invocation`: for code reviews, the artifact's `oat_review_invocation`
  (`manual`, `auto`, or `gate`); `-` for non-code reviews.
- `Gate Target`: for gate code reviews, the exact gate-context
  `oat_gate_target`; `-` otherwise.

For the first event with this Scope + Type, claim an unbound `pending`
placeholder only when its Artifact is `-`. Otherwise append a new row for the
new artifact. Never replace or regress a bound event merely because Scope +
Type matches; distinct artifact filenames are distinct review events.

Before writing, inspect the table header. A legacy five-column ledger is valid:
widen its header and separator with `Reviewed Head`, `Invocation`, and
`Gate Target`, and pad existing rows with `-` in those three cells. For an
already widened ledger, mutate cells by header name rather than rebuilding the
row. Preserve every existing row and every trailing cell, including columns
this skill does not recognize; never rewrite a widened row back to five or
eight columns.

If plan.md is missing (e.g., spec/design review before planning), skip this update and rely on the review artifact + next-step routing.

### Step 9.5: Commit Review Bookkeeping Atomically (Required)

**If `INLINE_ONLY=true`:** skip this step — no artifact was written to disk.

After writing the review artifact and applying the Step 9 Reviews-table update, create an atomic bookkeeping commit.

**If a worktree was resolved in Step 1.5:** run git commands scoped to the worktree (`git -C "$WORKTREE_PATH" ...`) so the commit lands on the worktree branch, not the current session's branch.

**Commit scope:**

- Always include the active review artifact file: `reviews/{filename}.md`
- Include `plan.md` when Step 9 updated the Reviews table
- Do not write or commit new review artifacts directly into `reviews/archived/`
- Do not include unrelated implementation/code files in this commit

**Commit message:**

- `chore(oat): record {scope} review artifact`

**If the user asks to defer commit:**

- Require explicit user confirmation to proceed without commit
- Warn that uncommitted review bookkeeping can desync workflow routing/restart behavior
- In the summary, clearly state: "bookkeeping not committed (user-approved defer)"

### Step 10: Output Summary

**If subagent used (Tier 1):**

```

Review requested via subagent.

When the reviewer finishes, run the oat-project-review-receive skill to process findings.

```

**If fresh session recommended (Tier 2):**

```

For best review quality, run in a fresh session:

1. Open new terminal/session
2. Run the oat-project-review-provide skill with: code {scope}
3. Return here and run the oat-project-review-receive skill

Or say "inline" to request review in the current session; the managed-target
guard still applies.

```

**If inline review completed (Tier 3):**

```

Review complete for {project-name}.

Scope: {scope}
Files reviewed: {N}
Findings: {N} critical, {N} important, {N} medium, {N} minor

Review artifact: {path}
Bookkeeping commit: {sha or "deferred with user approval"}

Next: Run the oat-project-review-receive skill to convert findings into plan tasks.

```

## Success Criteria

- Active project resolved
- Review type and scope determined
- Target branch and working directory resolved (worktree detection in Step 1.5)
- Commit range identified
- Files changed list obtained
- Review executed (subagent, fresh session guidance, or inline)
- Review artifact written to the correct branch's working directory (worktree path if applicable; inline-only if user chose that option)
- Plan.md Reviews section updated
- Review artifact + plan bookkeeping committed atomically on the correct branch (or explicitly deferred with user approval)
- For final scope, deferred findings ledger included in reviewer context
- User guided to next step (`oat-project-review-receive`)
```
