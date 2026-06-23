---
name: oat-project-complete
version: 1.5.0
description: Use when all implementation work is finished and the project is ready to close. Marks the OAT project lifecycle as complete.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, AskUserQuestion
---

# Complete Project

Mark the active OAT project lifecycle as complete.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what's happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ COMPLETE PROJECT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print step indicators, e.g.:
  - `[1/6] Resolving project + collecting user choices…`
  - `[2/6] Checking completion gates…`
  - `[3/6] Completing lifecycle…`
  - `[4/6] Generating PR description + archiving…`
  - `[5/6] Refreshing dashboard + committing…`
  - `[6/6] Opening PR or syncing description…`

## Process

### Step 1: Resolve Active Project + Detect Shared Status

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)

if [[ -z "$PROJECT_PATH" ]]; then
  echo "Error: No active project set. Use the oat-project-open skill first." >&2
  exit 1
fi

PROJECT_NAME=$(basename "$PROJECT_PATH")

PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
IS_SHARED_PROJECT="false"

case "$PROJECT_PATH" in
  "${PROJECTS_ROOT}/"*) IS_SHARED_PROJECT="true" ;;
esac
```

### Step 2: Upfront User Questions (Batched)

Ask all user questions at once so the user can answer them in a single interaction, then the rest of the skill runs without further prompts.

**Host-specific structured input guidance:**

- Claude Code: use `AskUserQuestion` when available
- Codex: use structured user-input tooling when available in the current Codex host/runtime
- Fallback: present as a plain-text conversational prompt

Before asking the batched questions, read `oat_pr_status` and `oat_pr_url` from `state.md` frontmatter.

**Capture pre-mutation PR state for later steps.** The skill mutates `state.md` (Step 5) and the project tree (Step 8) before Step 11.5 needs to know whether the PR was already open at the start. Persist that decision in a shell variable now:

```bash
WAS_PR_OPEN_AT_START="false"
if [[ "${oat_pr_status:-}" == "open" ]]; then
  WAS_PR_OPEN_AT_START="true"
fi
```

Use the same `state.md` read you already perform for `oat_pr_status`/`oat_pr_url` — do not re-read after Step 5. Step 11.5 (Sync Open-PR Description on GitHub) consumes this value.

**Workflow preference checks (before asking questions):**

Some questions can be answered automatically from workflow preferences. Read each preference before deciding whether to include its question in the batched prompt:

```bash
ARCHIVE_PREF=$(oat config get workflow.archiveOnComplete 2>/dev/null || true)
PR_ON_COMPLETE=$(oat config get workflow.createPrOnComplete 2>/dev/null || true)
```

- **If `ARCHIVE_PREF` is `true`:** Set `SHOULD_ARCHIVE="true"`. Skip the archive question. Print `Archive on complete: enabled (from workflow.archiveOnComplete).`
- **If `ARCHIVE_PREF` is `false`:** Set `SHOULD_ARCHIVE="false"`. Skip the archive question. Print `Archive on complete: disabled (from workflow.archiveOnComplete).`
- **If unset:** Include the archive question in the batched prompt as normal (backward compatible).
- **If `PR_ON_COMPLETE` is `true` AND no tracked open PR exists:** Set `SHOULD_OPEN_PR="true"`. Skip the Open PR question. Print `PR on complete: enabled (from workflow.createPrOnComplete).`
- **If `PR_ON_COMPLETE` is `false`:** Set `SHOULD_OPEN_PR="false"`. Skip the Open PR question. Print `PR on complete: disabled (from workflow.createPrOnComplete).`
- **If `PR_ON_COMPLETE` is unset:** Include the Open PR question in the batched prompt as normal (backward compatible).
- The existing tracked-PR skip still applies: if `oat_pr_status` is `open`, do not ask the Open PR question and do not honor `PR_ON_COMPLETE=true` — the PR already exists.

The "Ready to mark complete?" confirmation is always asked — it is a meaningful "are you sure" moment, not a preference.

Also preflight summary status using the same freshness rules as `oat-project-summary`:

- `summary.md` is `missing` when `{PROJECT_PATH}/summary.md` does not exist
- `summary.md` is `stale` when the tracking frontmatter fields `oat_summary_last_task`, `oat_summary_revision_count`, or `oat_summary_includes_revisions` no longer match `current_last_task`, `current_rev_count`, or `current_rev_list` as defined in `oat-project-summary` Step 3
- `summary.md` is `current` when those tracking fields still match the `oat-project-summary` Step 3 comparison inputs

**Questions to ask (in a single prompt):**

1. **Confirm completion:** "Ready to mark **{PROJECT_NAME}** as complete?"
2. **Archive** (only if `IS_SHARED_PROJECT` is `true`): "Archive the project after completion?"
3. **Generate or refresh summary** (only if summary status is `missing` or `stale`): present the status explicitly:
   - Missing example: "A summary has not been generated yet. Would you like me to generate it now as part of completion?"
   - Stale example: "The project summary is out of date. Would you like me to refresh it now as part of completion?"
4. **Open PR:** "Open a PR in GitHub after generating the PR description?" — ask this only when no tracked open PR already exists.

If `oat_pr_status` is `open`, do not ask the Open PR question. Set `SHOULD_OPEN_PR="false"` and treat the existing PR as already tracked.

Present all applicable questions together. Example combined prompt:

```
Ready to complete project **{PROJECT_NAME}**?

1. Archive the project after completion? (yes/no)
2. A summary has not been generated yet. Generate it now as part of completion? (yes/no)
3. Open a PR in GitHub? (yes/no)
```

If the user declines the completion confirmation, exit gracefully.

Store the answers as `SHOULD_ARCHIVE`, `SHOULD_GENERATE_SUMMARY`, and `SHOULD_OPEN_PR` for use in later steps.

If the summary status is `current`, set `SHOULD_GENERATE_SUMMARY="false"` and note that a current summary is already available.

If `oat_pr_url` is present, show it in the completion summary.

### Step 3: Check Completion Gates

#### 3.0: Phase Status Permissiveness

Read `oat_phase_status` from `state.md` frontmatter and handle permissively:

- **`pr_open`:** Proceed normally. This is the expected entry point after `oat-project-pr-final`.
- **`complete`:** Proceed normally. Implementation is done.
- **`in_progress`:** Note: "Project is still in progress. Completing anyway." — proceed without additional confirmation.

All three are valid starting states for completion. Do not block on any phase status value.

#### 3.1: Final Review Status

Run all gate checks and collect warnings. These are informational — they don't require individual user answers.

```bash
PLAN_FILE="${PROJECT_PATH}/plan.md"

if [[ -f "$PLAN_FILE" ]]; then
  final_row=$(grep -E "^\|\s*final\s*\|" "$PLAN_FILE" | head -1 || true)
  if [[ -z "$final_row" ]]; then
    echo "Warning: No final review row found in plan.md."
  elif ! echo "$final_row" | grep -qE "\|\s*passed\s*\|"; then
    echo "Warning: Final code review is not marked passed."
    echo "Recommendation: run the oat-project-review-provide skill with code final and oat-project-review-receive before completing."
  fi
else
  echo "Warning: plan.md not found, unable to verify final review status."
fi
```

#### 3.2: Deferred Medium Findings

```bash
IMPL_FILE="${PROJECT_PATH}/implementation.md"

if [[ -f "$IMPL_FILE" ]]; then
  medium_items=$(awk '
    BEGIN { in_medium = 0 }
    /^\*\*Deferred Findings \(Medium\):\*\*/ { in_medium = 1; next }
    /^\*\*Deferred Findings \(Medium\/Minor\):\*\*/ { in_medium = 1; next }
    in_medium && /^\*\*/ { in_medium = 0; next }
    in_medium && /^[[:space:]]*-[[:space:]]+/ { print }
  ' "$IMPL_FILE")

  has_unresolved_medium="false"
  while IFS= read -r line; do
    item=$(echo "$line" | sed -E 's/^[[:space:]]*-[[:space:]]+//')
    if ! echo "$item" | grep -qiE '^none([[:space:]]|[[:punct:]]|$)'; then
      has_unresolved_medium="true"
      break
    fi
  done <<< "$medium_items"

  if [[ "$has_unresolved_medium" == "true" ]]; then
    echo "Warning: Deferred Medium findings are recorded in implementation.md."
    echo "Recommendation: resurface via final review and explicitly disposition before completion."
  fi
fi
```

#### 3.3: Documentation Sync Status

```bash
DOCS_UPDATED=$(oat project status --field project.docsUpdated 2>/dev/null || echo null)

# Read policy from config (default: false = soft suggestion)
REQUIRE_DOCS=$(oat config get documentation.requireForProjectCompletion 2>/dev/null || echo "false")

if [[ "$DOCS_UPDATED" == "null" || -z "$DOCS_UPDATED" ]]; then
  if [[ "$REQUIRE_DOCS" == "true" ]]; then
    echo "Gate: Documentation sync required (documentation.requireForProjectCompletion is true)."
    echo "Action: Run oat-project-document first, or choose to skip."
  else
    echo "Suggestion: Consider running oat-project-document to sync documentation before completing."
  fi
fi
```

If `oat_docs_updated` is `null` or empty:

- **If `requireForProjectCompletion` is `true`:** Hard gate — ask user to run `oat-project-document` or explicitly skip. If user chooses to skip, update `state.md` frontmatter to set `oat_docs_updated: skipped`.
- **If `requireForProjectCompletion` is `false` (default):** Soft suggestion — inform user about `oat-project-document` and allow proceeding. If user wants to skip, set `oat_docs_updated: skipped`.

If `oat_docs_updated` is `skipped` or `complete`: proceed normally.

#### Gate Confirmation

After collecting all warnings from 3.1, 3.2, and 3.3:

- If any gate is unsatisfied (final review not `passed`, unresolved deferred Medium findings, or documentation gate blocking), present all warnings together and ask one confirmation:
  - "Completion gates are not fully satisfied. Continue marking lifecycle complete anyway?"
- If all gates pass, proceed without asking.

### Step 3.5: Summary Gate

Check if `{PROJECT_PATH}/summary.md` exists and whether it is current against the implementation state:

- If `summary.md` is missing or stale and `SHOULD_GENERATE_SUMMARY="true"`, generate or refresh it before completing.
- Prefer running the `oat-project-summary` skill when skill-to-skill invocation is available in the current host/runtime.
- If direct skill invocation is unavailable, generate or update `summary.md` inline by following the same synthesis rules as `oat-project-summary` (validate implementation state, read the same project artifacts, apply the same freshness checks, update the same frontmatter tracking fields, and write a complete `summary.md` before continuing).
- Do not assume `oat-project-summary` is a shell command on `PATH`. Only execute a shell command with that name if the environment explicitly provides a real executable.
- If `summary.md` is missing or stale and `SHOULD_GENERATE_SUMMARY="false"`, emit: `Warning: Proceeding without summary generation.`
- If summary generation succeeds, proceed with the refreshed `summary.md` available for PR and archive steps.
- If summary generation fails mid-way (context limits, missing artifacts, etc.), warn "Summary generation failed: {reason}. Proceeding without summary." Do NOT leave a half-written summary.md — either it completes fully or clean up the partial file and proceed without it.
- If `summary.md` already exists and is current, note it as available. Summary.md will be:
  - Used as source for the PR description (in Step 7)
  - Preserved in the archived project directory (in Step 8)

### Step 4: Archive Residual Active Review Artifacts

Detect any leftover active review artifacts in the top level of `"$PROJECT_PATH/reviews/"`:

```bash
find "$PROJECT_PATH/reviews" -maxdepth 1 -type f -name "*.md" 2>/dev/null
```

If any active review artifacts exist:

1. Create `"$PROJECT_PATH/reviews/archived"` if needed.
2. Rewrite any references touched during this preflight from `reviews/{filename}.md` to `reviews/archived/{filename}.md` in:
   - `"$PROJECT_PATH/plan.md"`
   - `"$PROJECT_PATH/implementation.md"`
   - `"$PROJECT_PATH/state.md"`
3. Move each active review artifact into `reviews/archived/`, adding a timestamp suffix if needed to avoid overwriting prior history.
4. Report the archived paths before continuing.

Rules:

- Only archive top-level active review artifacts. Leave `reviews/archived/` untouched.
- Keep these archive moves inside the project at `reviews/archived/`; do not route them through the shared-project archive destination logic in Step 6.

### Step 5: Set Lifecycle Complete

Delegate the canonical `state.md` completion mutation to the CLI:

```bash
COMPLETE_STATE_ARGS=("$PROJECT_PATH")
if [[ "$SHOULD_ARCHIVE" == "true" && "$IS_SHARED_PROJECT" == "true" ]]; then
  COMPLETE_STATE_ARGS+=("--archived")
fi

oat project complete-state "${COMPLETE_STATE_ARGS[@]}"
```

The CLI command owns both the frontmatter completion fields and the canonical markdown body updates for `state.md`.
It must set `oat_lifecycle: complete`, completion timestamps, `**Status:** Complete`, `**Last Updated:**`, the canonical `## Current Phase` body, normalized `## Progress`, and `## Next Milestone`.

### Step 6: Clear Active Project Pointer

Clear the active project pointer immediately. If the user is completing a project, clearing the pointer is implicit — no confirmation needed.

```bash
oat config set activeProject ""
echo "Active project pointer cleared."
```

### Step 7: Generate PR Description

PR description generation is automatic — it always runs as part of project completion. This must happen **before** archiving so that project artifacts are still at their tracked paths and blob links resolve correctly.

Follow the `oat-project-pr-final` skill's process (Steps 0.5 through 4) inline:

1. **Archive residual review artifacts** — already handled in Step 4.
2. **Validate required artifacts** — read available project artifacts (`plan.md`, `implementation.md`, `spec.md`, `design.md`, `discovery.md`) based on workflow mode from `state.md`.
3. **Check final review status** — already checked in Step 3.1. Use the result, don't re-check.
4. **Collect project summary** — if `summary.md` exists (from Step 3.5), use it as the primary source for the PR description's Summary section (per `oat-project-pr-final` Step 3.0). Read remaining artifacts and collect git context:

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
MERGE_BASE=$(git merge-base origin/main HEAD 2>/dev/null || git merge-base main HEAD 2>/dev/null || echo "")

if [[ -n "$MERGE_BASE" ]]; then
  git log --oneline "${MERGE_BASE}..HEAD"
  git diff --shortstat "${MERGE_BASE}..HEAD"
fi
```

5. **Write PR description artifact** — write to `{PROJECT_PATH}/pr/project-pr-YYYY-MM-DD.md` following the template and policies from `oat-project-pr-final` Step 4 (frontmatter policy, reference links policy, local path exclusion).

If a PR description artifact already exists at `{PROJECT_PATH}/pr/project-pr-*.md`:

- When `SHOULD_ARCHIVE` is `true`, regenerate it (overwrite). The existing artifact was authored by `oat-project-pr-final` before any archive intent existed and links to artifact paths that will be local-only after Step 8. Regenerating ensures Step 11 / Step 11.5 push a body whose links still resolve on the remote.
- When `SHOULD_ARCHIVE` is `false`, skip generation and use the existing artifact as-is. No archive means the existing blob links remain valid.

**Archive-aware References (required when `SHOULD_ARCHIVE` is `true`):**

When archiving, the project artifacts at `{PROJECT_PATH}/{plan,implementation,discovery,spec,design,summary}.md` will move to a gitignored archive location in Step 8. After commit + push (Step 10), those paths no longer exist on the branch and any blob link to them returns 404 on GitHub. The PR description must anticipate this:

- **Drop References bullets** that point to artifacts about to become local-only:
  - `plan.md`, `implementation.md`, `discovery.md`, `spec.md`, `design.md`, `summary.md`, `references/imported-plan.md`
  - Active `reviews/` (the active project tree, including `reviews/`, moves with the archive)
- **Add a canonical project-record bullet** when `archive.summaryExportPath` is configured and `summary.md` exists:
  - Resolve the export filename: `${SUMMARY_EXPORT_PATH}/$(date +%Y%m%d)-${PROJECT_NAME}.md` (matches `archive-utils.ts` naming).
  - Reference it as a tracked, post-archive blob link, e.g.:
    `- Project record: [${SUMMARY_EXPORT_PATH}/${YYYYMMDD}-${PROJECT_NAME}.md]({REPO_WEB}/blob/{BRANCH}/${SUMMARY_EXPORT_PATH}/${YYYYMMDD}-${PROJECT_NAME}.md)`
  - Use the **current/head branch** for the blob link (the same `{BRANCH}` value used by `oat-project-pr-final` Step 4 for every other reference). Step 8 creates the export on the current checkout and Step 10 commits + pushes it on the feature branch, so the link resolves immediately while the PR is open and continues to resolve after merge once the file lands on the base branch.
  - Anti-pattern: do **not** point this link at the base branch (`main` / resolved default branch). The export does not exist on the base branch until the PR merges, so a `blob/main/...` link 404s for the entire window the PR is open — the same class of broken link this whole step exists to prevent.
  - When `archive.summaryExportPath` is unset or `summary.md` is missing, omit this bullet rather than emit a broken link.
- **Keep References bullets** that resolve independently of the archive: backlog item links under `.oat/repo/pjm/backlog/`, decision record links under `.oat/repo/reference/decisions/`, repo-reference docs, ticket URLs, and anything else under tracked paths outside the project directory.
- Apply the existing `localPaths`-based exclusion rule from `oat-project-pr-final` Step 4 on top of these rules — it already covers `.oat/**/pr` and `.oat/**/reviews/archived` and may catch additional patterns configured per repo.

Anti-pattern: do not "rescue" a dropped artifact by linking to its archived path under `.oat/projects/archived/<name>/...`. That path is gitignored on every checkout and never reaches the remote.

### Step 8: Archive Project (Conditional)

**Skip if `SHOULD_ARCHIVE` is false or `IS_SHARED_PROJECT` is false.**

Archive happens after PR description generation (so artifacts are readable at tracked paths) but before commit+push (so the archive deletion is included in the commit).

The archive-side effects in this step are CLI-owned. Do not reimplement local archive movement, summary export, S3 sync, AWS credential handling, or worktree durability checks in the skill.

```bash
ARCHIVE_OUTPUT=""
if ! ARCHIVE_OUTPUT=$(oat project archive "$PROJECT_PATH" 2>&1); then
  printf '%s\n' "$ARCHIVE_OUTPUT" >&2
  echo "Error: Project archive failed." >&2
  exit 1
fi

printf '%s\n' "$ARCHIVE_OUTPUT"

ARCHIVE_PATH=$(printf '%s\n' "$ARCHIVE_OUTPUT" | sed -nE 's/^Archived project `[^`]+` to `(.+)`\.$/\1/p' | tail -1)
if [[ -z "$ARCHIVE_PATH" ]]; then
  echo "Error: oat project archive did not report the archived path." >&2
  exit 1
fi

PROJECT_PATH="$ARCHIVE_PATH"
ARCHIVE_S3_PATH=$(printf '%s\n' "$ARCHIVE_OUTPUT" | sed -nE 's/^S3 archive: (.+)$/\1/p' | tail -1)
ARCHIVE_S3_CONTEXT=$(printf '%s\n' "$ARCHIVE_OUTPUT" | grep -E '^Archive S3 sync: .*profile=.*region=' | tail -1 || true)
```

Use `ARCHIVE_S3_CONTEXT` in Step 12 if the command reports profile/region details. If S3 sync ran and only `ARCHIVE_S3_PATH` is available, report the destination and note that credential context was not emitted by the command.

### Step 9: Regenerate Dashboard

Regenerate the repo state dashboard so the completion status is reflected before committing.

```bash
oat state refresh
```

### Step 10: Commit + Push Bookkeeping (Required)

Completion is not done until bookkeeping changes are committed and pushed. This prevents local-only `state.md` updates that leave project status stale for later sessions/reviews.

Expected changes may include:

- `{PROJECT_PATH}/state.md`
- `{PROJECT_PATH}/implementation.md` (if touched earlier in the lifecycle closeout)
- `{PROJECT_PATH}/plan.md` (if review receive just ran)
- `{PROJECT_PATH}/pr/project-pr-*.md` (PR description artifact)
- `.oat/state.md` is regenerated locally in Step 9 but should not be staged; it is generated dashboard state and normally gitignored.
- `.oat/config.local.json` (if `activeProject` cleared)
- Shared-project deletions under `{PROJECTS_ROOT}/{PROJECT_NAME}` (if archived)

Run:

```bash
git status --short
git add -A
git commit -m "chore(oat): complete project lifecycle for ${PROJECT_NAME}"
git push
```

Rules:

- If there are unrelated unstaged/staged changes, stage and commit only the completion/bookkeeping files (do not sweep unrelated work into this commit).
- If there is nothing to commit, state that explicitly and verify whether the completion bookkeeping was already committed in a prior commit.
- If push fails, report the failure and do not claim completion is fully recorded.

### Step 11: Open PR in GitHub (Conditional)

**Skip if `SHOULD_OPEN_PR` is false.**

**CRITICAL — Strip YAML frontmatter before submitting to GitHub.**
The local artifact file contains YAML frontmatter (`---` delimited block at the top) for OAT metadata. This frontmatter MUST NOT appear in the GitHub PR body. Before passing the file to `gh pr create`, strip everything from the start of the file through and including the closing `---` line. Verify the resulting body starts with the markdown heading (e.g., `# feat: ...`), not YAML keys.

Steps:

1. Locate the PR description artifact at `{PROJECT_PATH}/pr/project-pr-*.md`.
2. Write the stripped body to a temporary file (remove all lines from the opening `---` through the closing `---`, inclusive).
3. Verify the temp file does not start with YAML frontmatter keys.
4. Push and create the PR:

```bash
git push -u origin "$(git rev-parse --abbrev-ref HEAD)"
gh pr create --base main --title "{title}" --body-file "$TMP_BODY"
```

5. Clean up the temp file.

Do not assume `gh` is installed; if missing, instruct manual PR creation using the file contents.

### Step 11.5: Sync Open-PR Description on GitHub (Conditional)

**Run only when `WAS_PR_OPEN_AT_START="true"` AND `SHOULD_ARCHIVE="true"`.**

When the PR was already open at the start of this skill (typically because `oat-project-pr-final` ran earlier in the lifecycle) AND we just archived, the GitHub PR description authored by `oat-project-pr-final` still points to the active artifact paths. Step 8 moved those artifacts to a gitignored archive location and Step 10 pushed the move, so any blob link in the open PR body now 404s. Push the regenerated archive-aware body to the existing PR.

Skip this step when:

- The PR was not yet open at the start (`WAS_PR_OPEN_AT_START="false"`) — Step 11 already created the PR with the archive-aware body.
- No archive happened (`SHOULD_ARCHIVE="false"`) — the original blob links still resolve.
- `IS_SHARED_PROJECT="false"` — non-shared projects are not archived in this skill, so no link breakage.

Steps:

1. Locate the PR description artifact at `{PROJECT_PATH}/pr/project-pr-*.md`. After Step 8, `PROJECT_PATH` points at the archived location, so the artifact lives at `{ARCHIVE_PATH}/pr/project-pr-*.md`.
2. Strip YAML frontmatter (everything from the opening `---` through and including the closing `---`) and write the result to a temporary file. Verify the temp file does not start with YAML frontmatter keys.
3. Resolve the open PR. Prefer the tracked URL captured in Step 2:

   ```bash
   PR_REF="${oat_pr_url:-}"
   if [[ -z "$PR_REF" ]]; then
     # Fall back to the head branch — gh auto-resolves to the open PR for the current branch.
     PR_REF=$(git rev-parse --abbrev-ref HEAD)
   fi
   ```

4. Push the updated body:

   ```bash
   gh pr edit "$PR_REF" --body-file "$TMP_BODY"
   ```

5. Clean up the temp file.

Failure handling:

- If `gh` is missing, warn and print the path to the regenerated artifact body so the user can paste it into the PR manually. Do not fail the skill.
- If `gh pr edit` fails (e.g. PR was merged between Step 2 and now, or the auth token lacks edit permission), warn and continue. Step 12's completion summary should call out that the PR body was not updated and surface the artifact path so the user can update it manually.
- Never re-archive or re-commit on failure here — the lifecycle bookkeeping in Step 10 already shipped.

### Step 12: Confirm to User

Show user:

- "Project **{PROJECT_NAME}** marked as complete."
- If archived: "Archived location: **{PROJECT_PATH}**"
- If S3 archive sync ran: include `ARCHIVE_S3_CONTEXT` when the archive command reported profile/region details. If only `ARCHIVE_S3_PATH` is available, include the S3 destination and note that profile/region context was not reported by the command. Never echo raw credentials (`AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, etc.).
- Include commit hash and push result for the bookkeeping changes.
- If PR was opened: include the PR URL.
- If `oat_pr_url` is present, show it in the completion summary even when PR creation was skipped because the project already tracked an open PR.
- If Step 11.5 ran, report whether the PR description was synced (e.g. `PR description synced: <PR URL>`) or warn that the sync failed and surface the artifact path so the user can update it manually.
