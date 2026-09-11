---
name: oat-project-complete
description: Use when all implementation work is finished and the project is ready to close. Marks the OAT project lifecycle as complete.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, AskUserQuestion
metadata:
  version: 1.7.11
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
ACTIVE_PROJECT_PATH="$PROJECT_PATH"

# Set SKILL_DIR to the absolute directory containing this loaded SKILL.md.
COMPLETION_RECEIPT_SCRIPT="$SKILL_DIR/scripts/recover-completion-receipts.mjs"
RECAP_INTENT_CONSUMER="$SKILL_DIR/scripts/consume-persisted-recap-intent.mjs"
COMPLETION_RETRY_SCRIPT="$SKILL_DIR/scripts/resolve-completion-retry.mjs"
COMPLETION_RETRY_FIELDS_SCRIPT="$SKILL_DIR/scripts/parse-completion-retry-fields.mjs"
NONARCHIVE_LIFECYCLE_RECEIPT_SCRIPT="$SKILL_DIR/scripts/validate-nonarchive-lifecycle-receipt.mjs"
SYNCED_ARCHIVE_ENTRY_SCRIPT="$SKILL_DIR/scripts/resolve-synced-archive-entry.mjs"
SYNCED_ARCHIVE_EXECUTE_SCRIPT="$SKILL_DIR/scripts/execute-synced-archive-entry.mjs"
SYNCED_ARCHIVE_RESUME_FIELDS_SCRIPT="$SKILL_DIR/scripts/parse-synced-archive-resume-fields.mjs"
SYNCED_ARCHIVE_FINALIZE_SCRIPT="$SKILL_DIR/scripts/finalize-synced-archive.mjs"
DURABLE_ARCHIVE_RECEIPT_SCRIPT="$SKILL_DIR/scripts/validate-durable-archive-receipt.mjs"
test -f "$COMPLETION_RECEIPT_SCRIPT" || {
  echo "oat: completion receipt recovery script is missing" >&2
  exit 1
}
test -f "$RECAP_INTENT_CONSUMER" || {
  echo "oat: persisted recap intent consumer is missing" >&2
  exit 1
}
test -f "$COMPLETION_RETRY_SCRIPT" || {
  echo "oat: completion retry routing script is missing" >&2
  exit 1
}
test -f "$COMPLETION_RETRY_FIELDS_SCRIPT" || {
  echo "oat: completion retry field decoder is missing" >&2
  exit 1
}
test -f "$NONARCHIVE_LIFECYCLE_RECEIPT_SCRIPT" || {
  echo "Missing non-archive lifecycle receipt validator: $NONARCHIVE_LIFECYCLE_RECEIPT_SCRIPT" >&2
  exit 1
}
test -f "$SYNCED_ARCHIVE_ENTRY_SCRIPT" || {
  echo "Missing synced archive entry router: $SYNCED_ARCHIVE_ENTRY_SCRIPT" >&2
  exit 1
}
test -f "$SYNCED_ARCHIVE_EXECUTE_SCRIPT" || {
  echo "Missing synced archive entry executor: $SYNCED_ARCHIVE_EXECUTE_SCRIPT" >&2
  exit 1
}
test -f "$SYNCED_ARCHIVE_RESUME_FIELDS_SCRIPT" || {
  echo "Missing synced archive resume field parser: $SYNCED_ARCHIVE_RESUME_FIELDS_SCRIPT" >&2
  exit 1
}
test -f "$SYNCED_ARCHIVE_FINALIZE_SCRIPT" || {
  echo "Missing synced archive finalizer: $SYNCED_ARCHIVE_FINALIZE_SCRIPT" >&2
  exit 1
}
test -f "$DURABLE_ARCHIVE_RECEIPT_SCRIPT" || {
  echo "Missing durable archive receipt validator: $DURABLE_ARCHIVE_RECEIPT_SCRIPT" >&2
  exit 1
}

PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || { echo "oat: cannot resolve project scope for $PROJECT_PATH; refusing completion" >&2; exit 1; }
SYNCED_ARCHIVE_RESUME="false"
if [[ "$PROJECT_SCOPE" == "synced" ]]; then
  SYNCED_RECORD_PATH="${PROJECT_PATH}.json"
  REPO_ROOT=$(git rev-parse --show-toplevel) || exit 1
  SYNCED_ARCHIVE_ENTRY=$(node "$SYNCED_ARCHIVE_EXECUTE_SCRIPT" \
    --repo-root "$REPO_ROOT" \
    --record-path "$SYNCED_RECORD_PATH" \
    --project-name "$PROJECT_NAME" \
    --project-path "$PROJECT_PATH") || exit 1
  SYNCED_ARCHIVE_ENTRY_ROUTE=$(node -e '
const value = JSON.parse(process.argv[1]);
if (value.status !== "ok" || !["continue-active", "archive-resumed"].includes(value.route)) process.exit(1);
process.stdout.write(value.route);
' "$SYNCED_ARCHIVE_ENTRY") || exit 1
  if [[ "$SYNCED_ARCHIVE_ENTRY_ROUTE" == "archive-resumed" ]]; then
    printf '%s\n' "$SYNCED_ARCHIVE_ENTRY"
    SYNCED_ARCHIVE_RESUME_ASSIGNMENTS=$(node \
      "$SYNCED_ARCHIVE_RESUME_FIELDS_SCRIPT" \
      "$SYNCED_ARCHIVE_ENTRY") || exit 1
    eval "$SYNCED_ARCHIVE_RESUME_ASSIGNMENTS" || exit 1
    ARCHIVED_PROJECT_STATUS_ASSIGNMENTS=$(oat project status \
      --project-path "$ARCHIVE_PATH" --shell \
      oat_pr_status=project.prStatus \
      oat_pr_url=project.prUrl) || exit 1
    eval "$ARCHIVED_PROJECT_STATUS_ASSIGNMENTS" || exit 1
    WAS_PR_OPEN_AT_START="false"
    if [[ "${oat_pr_status:-}" == "open" ]]; then
      WAS_PR_OPEN_AT_START="true"
    fi
    echo "Verified synced archive terminal receipt; active pointer retained until closeout succeeds."
    echo "Steps 2-8 will not replay; continuing at Step 8.5."
  fi
fi
PROJECT_RETAINED_REF=""
if [[ "$PROJECT_SCOPE" == "synced" ]]; then
  PROJECT_RETAINED_REF="refs/oat/projects/${PROJECT_NAME}"
fi
IS_DURABLE_PROJECT="false"
if [[ "$PROJECT_SCOPE" == "shared" || "$PROJECT_SCOPE" == "synced" ]]; then
  IS_DURABLE_PROJECT="true"
fi
# shared-archive-resume:start
SHARED_ARCHIVE_RESUME="false"
if [[ "$PROJECT_SCOPE" == "shared" && ! -d "$PROJECT_PATH" ]]; then
  ARCHIVED_PROJECTS_ROOT="$(dirname "$(dirname "$PROJECT_PATH")")/archived"
  if ! DISCOVERED_ARCHIVE_PATH=$(node "$DURABLE_ARCHIVE_RECEIPT_SCRIPT" \
    --mode directory \
    --archived-root "$ARCHIVED_PROJECTS_ROOT" \
    --project-name "$PROJECT_NAME"); then
    echo "Shared archive completion cannot resume automatically: the retained active pointer names a source directory that no longer exists and no single validated archive matches $PROJECT_NAME." >&2
    echo "Manual recovery: locate the archive directory under $ARCHIVED_PROJECTS_ROOT, confirm 'oat_lifecycle: complete' in its state.md, then run: oat config set activeProject \"\"" >&2
    exit 1
  fi
  SHARED_ARCHIVE_RESUME="true"
  PROJECT_PATH="$DISCOVERED_ARCHIVE_PATH"
  ARCHIVE_PATH="$DISCOVERED_ARCHIVE_PATH"
  echo "Verified discovered shared archive at $DISCOVERED_ARCHIVE_PATH; clearing the retained active pointer without a second archive."
fi
# shared-archive-resume:end
```

When `SHARED_ARCHIVE_RESUME="true"`, continue directly at **Step 12**. This is
the single recognized shared-scope checkpoint: the archive already succeeded
and the run died before the Step 12 clear. Do not execute Steps 2 through 11.5,
ask the upfront questions again, invoke `oat project archive` a second time,
regenerate any artifact, or replay the Step 3.7 seal append. The discovered
archive's `state.md` is the terminal evidence, re-derived through the same
`oat_lifecycle: complete` and archived-phase-marker checks Step 12 derives from
`ARCHIVE_OUTPUT`, so no second completion seal is written.

Every other interruption is not a resume checkpoint. After `complete-state`, or
after the Step 7 PR artifact, the retained pointer still names an existing
source directory, so this branch is not taken and the normal completion entry
runs: Step 3.7 routes on the status probe's `sealed` field as described there,
so a log that is already sealed is left alone (and a probe answering
`status: "ambiguous"` stops completion until the log is repaired), and
Step 7 regenerates the PR artifact only when it is missing. When the source
directory is gone and zero or several archived candidates match, the branch
stops with the manual-recovery message above and leaves the pointer untouched.

When `SYNCED_ARCHIVE_RESUME="true"`, continue directly at **Step 8.5**. Do not
execute Steps 2 through 8, ask the upfront questions again, read or mutate the
retired active checkout, regenerate active artifacts, or invoke archive a
second time. The executor result and the archived project status have already
initialized every resume-safe downstream receipt and choice. A resume never
opens a new PR from an unpersisted prior answer; `SHOULD_OPEN_PR="false"`, while
an already-tracked open PR is updated by Step 11.5.

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

Both lifecycle orderings are supported:

- **Complete before merge:** run this skill while the PR is open, then merge.
- **Merge before completion:** merge first, then run this skill.

An open PR is not a blocker. When completion archives project artifacts, the
existing archive-aware flow regenerates and syncs the open PR body so its links
remain valid.

```bash
ARCHIVE_PREF=$(oat config get workflow.archiveOnComplete 2>/dev/null || true)
PR_ON_COMPLETE=$(oat config get workflow.createPrOnComplete 2>/dev/null || true)
PROJECT_RECAP_CONFIG=$(oat config get workflow.explainers.projectRecap --json 2>/dev/null || true)
```

- **If `IS_DURABLE_PROJECT` is `false`:** Omit the archive question regardless of
  `ARCHIVE_PREF`. The resolver below selects `local-default`; do not assign
  `SHOULD_ARCHIVE` directly.
- **If `IS_DURABLE_PROJECT` is `true` and `ARCHIVE_PREF` is `true`:** Skip the
  archive question. Print
  `Archive on complete: enabled (from workflow.archiveOnComplete).`
- **If `IS_DURABLE_PROJECT` is `true` and `ARCHIVE_PREF` is `false`:** Skip the
  archive question. Print
  `Archive on complete: disabled (from workflow.archiveOnComplete).`
- **If `IS_DURABLE_PROJECT` is `true` and `ARCHIVE_PREF` is unset:** Include
  the archive question in the batched prompt as normal (backward compatible).
- **If `PR_ON_COMPLETE` is `true` AND no tracked open PR exists:** Set `SHOULD_OPEN_PR="true"`. Skip the Open PR question. Print `PR on complete: enabled (from workflow.createPrOnComplete).`
- **If `PR_ON_COMPLETE` is `false`:** Set `SHOULD_OPEN_PR="false"`. Skip the Open PR question. Print `PR on complete: disabled (from workflow.createPrOnComplete).`
- **If `PR_ON_COMPLETE` is unset:** Include the Open PR question in the batched prompt as normal (backward compatible).
- The existing tracked-PR skip still applies: if `oat_pr_status` is `open`, do not ask the Open PR question and do not honor `PR_ON_COMPLETE=true` — the PR already exists.

Select archive prompt participation before assembling the batched prompt:

```bash
# archive-prompt-selection:start
ARCHIVE_QUESTION_REQUIRED="false"
if [[ "$IS_DURABLE_PROJECT" == "true" ]]; then
  if [[ "$ARCHIVE_PREF" == "true" ]]; then
    echo "Archive on complete: enabled (from workflow.archiveOnComplete)."
  elif [[ "$ARCHIVE_PREF" == "false" ]]; then
    echo "Archive on complete: disabled (from workflow.archiveOnComplete)."
  else
    ARCHIVE_QUESTION_REQUIRED="true"
  fi
fi
# archive-prompt-selection:end
```

The "Ready to mark complete?" confirmation is always asked — it is a meaningful "are you sure" moment, not a preference.

The configured-decline case is `workflow.archiveOnComplete=false`. When the
preference is unset and the user declines the batched archive question, the
interactive archive answer is `false`. Both cases select the same explicit
non-archive transaction below; declining archive never means skipping synced
record durability.

Route every source through
`scripts/recover-completion-receipts.mjs#resolveCompletionArchiveDecision`
before assigning `SHOULD_ARCHIVE`. For a local project, pass the explicit
`localNonArchive=true` decision without asking the archive question. For a
durable project, pass `configuredPreference` only when
`workflow.archiveOnComplete` is set; otherwise pass the accepted batched
`interactiveAnswer`. Require the result's `source` to be `local-default`,
`configured`, or `interactive` as appropriate and use its `shouldArchive`
boolean. An absent, conflicting, or non-boolean decision fails closed instead
of silently selecting a lifecycle path. The executable completion transaction
tests must use this same resolver; scenario labels alone are not decision
coverage.

After the configured preference or accepted interactive answer is available,
invoke the resolver rather than assigning `SHOULD_ARCHIVE` directly:

```bash
# archive-decision-resolution:start
ARCHIVE_DECISION_ARGS=()
EXPECTED_ARCHIVE_DECISION_SOURCE=""
if [[ "$IS_DURABLE_PROJECT" == "false" ]]; then
  ARCHIVE_DECISION_ARGS+=(--local-nonarchive true)
  EXPECTED_ARCHIVE_DECISION_SOURCE="local-default"
elif [[ "$ARCHIVE_PREF" == "true" || "$ARCHIVE_PREF" == "false" ]]; then
  ARCHIVE_DECISION_ARGS+=(--archive-preference "$ARCHIVE_PREF")
  EXPECTED_ARCHIVE_DECISION_SOURCE="configured"
else
  test "$ARCHIVE_INTERACTIVE_ANSWER" = "true" \
    || test "$ARCHIVE_INTERACTIVE_ANSWER" = "false" \
    || exit 1
  ARCHIVE_DECISION_ARGS+=(--interactive-archive "$ARCHIVE_INTERACTIVE_ANSWER")
  EXPECTED_ARCHIVE_DECISION_SOURCE="interactive"
fi
ARCHIVE_DECISION_JSON=$(node "$COMPLETION_RECEIPT_SCRIPT" \
  "${ARCHIVE_DECISION_ARGS[@]}") || exit 1
ARCHIVE_DECISION_FIELDS=$(node -e '
const value = JSON.parse(process.argv[1]);
if (typeof value.shouldArchive !== "boolean" || !["local-default", "configured", "interactive"].includes(value.source)) process.exit(1);
process.stdout.write(`${value.shouldArchive}\t${value.source}`);
' "$ARCHIVE_DECISION_JSON") || exit 1
IFS=$'\t' read -r SHOULD_ARCHIVE ARCHIVE_DECISION_SOURCE \
  <<< "$ARCHIVE_DECISION_FIELDS"
test "$ARCHIVE_DECISION_SOURCE" = "$EXPECTED_ARCHIVE_DECISION_SOURCE" || exit 1
if [[ "$ARCHIVE_DECISION_SOURCE" == "local-default" ]]; then
  test "$SHOULD_ARCHIVE" = "false" || exit 1
fi
# archive-decision-resolution:end
```

Require `ARCHIVE_DECISION_SOURCE` to match the source selected above. Local
completion always resolves to explicit non-archive without asking the archive
question. Store an unconfigured durable-project batched answer as
`ARCHIVE_INTERACTIVE_ANSWER` until this resolver returns; only then assign
`SHOULD_ARCHIVE`.

Resolve `projectRecap` intent before presenting the batched completion prompt.
Use the `oat-explainer-kit` lifecycle intent resolver in interactive mode with
the current `oat_project_recap` value from the same `state.md` read and the
source-aware `workflow.explainers.projectRecap` preference. Preserve the state
content hash required by the adapter's safe intent persistence contract.

When resolution returns `needsPrompt: true`, add exactly one project-recap question to that same batched prompt: "Generate a final project recap as part of completion?" Do not open a second prompt. Resolve the answer as `generate` or `skip`, then use the adapter's intent persistence helper with the captured state hash. Persist either `generate` or `skip` as the returned `interactive` record before continuing. If persistence reports a stale write, re-read state and resolve precedence again; never retry the stale record blindly. A valid persisted `oat_project_recap` decision prevents another prompt.

Set `SHOULD_GENERATE_RECAP="true"` only when the final resolved decision is
`generate`; otherwise set it to `"false"`. Direct `always` or `never` workflow
preference results are effective for this run but are not copied into project
state.

Also preflight summary status using the same freshness rules as `oat-project-summary`, read from the current `oat-project-summary/SKILL.md` rather than a remembered version of that step:

- `summary.md` is `missing` when `{PROJECT_PATH}/summary.md` does not exist
- `summary.md` is `stale` when the tracking frontmatter fields `oat_summary_last_task`, `oat_summary_revision_count`, or `oat_summary_includes_revisions` no longer match `current_last_task`, `current_rev_count`, or `current_rev_list` as defined in `oat-project-summary` Step 3
- `summary.md` is `current` when those tracking fields still match the `oat-project-summary` Step 3 comparison inputs

Preflight `{PROJECT_PATH}/references/project-retro.md` alongside the summary.
The safety-net offer is governed by how this completion run executes, not by how
implementation ran:

- Treat the run as non-interactive when `OAT_AUTONOMOUS=1` or
  `OAT_NON_INTERACTIVE=1`; otherwise treat it as interactive.
- When the retro is missing and this completion run is interactive, add exactly
  one question to the batched prompt: "No project retro exists. Generate one
  before completing?"
- When the retro is missing and this completion run is non-interactive, skip the
  offer. Explicitly configured `retro` in the post-implementation sequence is
  the consented non-interactive path.
- When the retro exists, never offer regeneration. If either
  `oat_retro_promotions` or `oat_retro_filing` is `proposed` or `partial`, emit
  at most one line noting that the existing retro has unsettled register items.

**Questions to ask (in a single prompt):**

1. **Confirm completion:** "Ready to mark **{PROJECT_NAME}** as complete?"
2. **Archive** (only if `ARCHIVE_QUESTION_REQUIRED` is `true`):
   "Archive the project after completion?"
3. **Generate or refresh summary** (only if summary status is `missing` or `stale`): present the status explicitly:
   - Missing example: "A summary has not been generated yet. Would you like me to generate it now as part of completion?"
   - Stale example: "The project summary is out of date. Would you like me to refresh it now as part of completion?"
4. **Generate project retro** (only when the retro is missing and this completion run is interactive): "No project retro exists. Generate one before completing?"
5. **Generate final project recap** (only when recap intent resolution returned `needsPrompt: true`): "Generate a final project recap as part of completion?"
6. **Open PR:** "Open a PR in GitHub after generating the PR description?" — ask this only when no tracked open PR already exists.

If `oat_pr_status` is `open`, do not ask the Open PR question. Set `SHOULD_OPEN_PR="false"` and treat the existing PR as already tracked.

Present all applicable questions together. Example combined prompt:

```
Ready to complete project **{PROJECT_NAME}**?

1. Archive the project after completion? (yes/no)
2. A summary has not been generated yet. Generate it now as part of completion? (yes/no)
3. No project retro exists. Generate one before completing? (yes/no)
4. Generate a final project recap as part of completion? (yes/no)
5. Open a PR in GitHub? (yes/no)
```

If the user declines the completion confirmation, exit gracefully.

After the user accepts the completion confirmation, store a prompted archive
answer as `ARCHIVE_INTERACTIVE_ANSWER`; assign `SHOULD_ARCHIVE` only through
the decision resolver above. Store the remaining answers as
`SHOULD_GENERATE_SUMMARY`, `SHOULD_GENERATE_RETRO`, `SHOULD_GENERATE_RECAP`,
and `SHOULD_OPEN_PR` for use in later steps. Set
`SHOULD_GENERATE_RETRO="false"` when the retro already exists or this completion
run is non-interactive. Persist a prompted recap answer only after that
confirmation is accepted.

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
  reviews_section=$(awk '
    /^## Reviews[[:space:]]*$/ { in_reviews = 1; next }
    in_reviews && /^##[[:space:]]/ { exit }
    in_reviews { print }
  ' "$PLAN_FILE")
  final_row=$(printf '%s\n' "$reviews_section" | grep -E "^\|\s*final\s*\|\s*code\s*\|" | tail -1 || true)
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

`reviews_section` is strictly the `## Reviews` section through the next
level-two heading. Within that ledger, `final_row` is the latest appended event
whose Scope is `final` and Type is `code`; earlier events remain history.

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
- When skill-to-skill invocation is available in the current host/runtime, load the current `oat-project-summary/SKILL.md` and follow it; never synthesize the summary from a remembered version of that skill.
- If direct skill invocation is unavailable, generate or update `summary.md` inline by following the same synthesis rules as `oat-project-summary` (validate implementation state, read the same project artifacts, apply the same freshness checks, update the same frontmatter tracking fields, and write a complete `summary.md` before continuing).
- Do not assume `oat-project-summary` is a shell command on `PATH`. Only execute a shell command with that name if the environment explicitly provides a real executable.
- If `summary.md` is missing or stale and `SHOULD_GENERATE_SUMMARY="false"`, emit: `Warning: Proceeding without summary generation.`
- If summary generation succeeds, proceed with the refreshed `summary.md` available for PR and archive steps.
- If summary generation fails mid-way (context limits, missing artifacts, etc.), warn "Summary generation failed: {reason}. Proceeding without summary." Do NOT leave a half-written summary.md — either it completes fully or clean up the partial file and proceed without it.
- If `summary.md` already exists and is current, note it as available. Summary.md will be:
  - Used as source for the PR description (in Step 7)
  - Preserved in the archived project directory (in Step 8)

### Step 3.5.5: Retro Safety-Net

When `SHOULD_GENERATE_RETRO="true"`, dispatch `oat-project-retro` in generate
mode before any lifecycle mutation: load the current
`oat-project-retro/SKILL.md` and follow it, or dispatch a child that carries it.
Apply and filing behavior remains config-gated inside that skill.

Use the host's skill-to-skill invocation when available. Do not assume
`oat-project-retro` is a shell command on `PATH`. If dispatch is unavailable or
generation fails, warn with the reason and continue completion; this offer is a
safety net, not a completion gate. Never leave a partial retro artifact.

When `SHOULD_GENERATE_RETRO="false"`, do not dispatch the skill.

### Step 3.6: Select Final Project Recap

Run this gate after the optional summary refresh and before any lifecycle
mutation. Initialize `SELECTED_PROJECT_RECAP_RUN=""`.

First re-read the persisted `oat_project_recap` record from
`"$PROJECT_PATH/state.md"` through
`scripts/consume-persisted-recap-intent.mjs`. Pass the project path to this
single executable decision/effect boundary. It derives `state.md` and
`explainers/` itself, re-reads the persisted decision, and performs manifest
discovery only for `generate`. Its route and authoring permission are
authoritative even when an earlier in-memory resolution set
`SHOULD_GENERATE_RECAP`.

A persisted `skip`, including `skip/failed_attempt`, returns route `skip`
without touching `explainers/`, suppressing manifest discovery, bundle, and
authoring together. Leave `SELECTED_PROJECT_RECAP_RUN` empty and invoke the
terminal-outcome guard with `--intent skip` and the persisted source as
`--skip-reason`. For `failed_attempt`, also pass the failed or incomplete
`manifest.json`, or the flow's `failure.json`.

```bash
RECAP_CONSUMPTION=$(node "$RECAP_INTENT_CONSUMER" \
  "$PROJECT_PATH") || exit 1
RECAP_CONSUMPTION_FIELDS=$(node -e '
const value = JSON.parse(process.argv[1]);
if (value.route !== value.decision) process.exit(1);
if (value.route === "skip" && (value.manifestDiscoveryPerformed !== false ||
    value.manifestCandidates.length !== 0 ||
    value.authoringPermitted !== false)) process.exit(1);
if (value.route === "generate" &&
    (value.manifestDiscoveryPerformed !== true ||
     !Array.isArray(value.manifestCandidates) ||
     value.authoringPermitted !== true)) process.exit(1);
if (!["generate", "skip"].includes(value.route)) process.exit(1);
process.stdout.write(`${value.route}\t${value.source}\t` +
  `${value.authoringPermitted}\t${JSON.stringify(value.manifestCandidates)}`);
' "$RECAP_CONSUMPTION") || exit 1
IFS=$'\t' read -r PERSISTED_RECAP_DECISION PERSISTED_RECAP_SOURCE \
  RECAP_AUTHORING_PERMITTED RECAP_MANIFEST_CANDIDATES_JSON \
  <<< "$RECAP_CONSUMPTION_FIELDS"
```

For route `generate`, inspect only the manifest candidates returned in
`RECAP_MANIFEST_CANDIDATES_JSON`; do not perform a second filesystem discovery
outside the executable boundary. Reuse a fresh satisfied `project-recap`
package without invoking the adapter. Fresh means the manifest identifies
recipe `project-recap`, belongs to this project, has outcome `built` or
`built-needs-review`, passes the complete package guard, and its input hashes
match the current approved implementation inputs, including the refreshed
summary when present.

If no fresh package exists, require
`RECAP_AUTHORING_PERMITTED="true"` from that same boundary before invoking the
`oat-explainer-kit` adapter's § Generate with recipe `project-recap`, project
invocation, the active project, and `mode: unattended`. The executable boundary
does not fabricate host-agent authoring; it gates permission for the lifecycle
caller that performs the installed core check, resolves inputs, theme, and
output root, then runs `bundle` → host-agent authoring → `verify` → `record`.
Lifecycle generation never prompts. Use the first available browser rung; a
missing browser becomes `built-needs-review`, not a skip or block.

`built` and `built-needs-review` satisfy generation. Set
`SELECTED_PROJECT_RECAP_RUN` only to that final satisfied project-recap run, as
the project-relative path `explainers/<run-slug>`. A stale, wrong-project,
`project-explainer`, `failed`, or `incomplete` manifest is never selected.

On `failed` or `incomplete`, show the sanitized cause and require an explicit
retry or skip before lifecycle mutation. Under autonomy, retry once. If that
retry also fails, persist `skip/failed_attempt` with a fresh state hash and
re-read it through the executable consumer before continuing. Never silently
skip a failed attempt.

Before any lifecycle mutation, invoke
`oat-explainer-kit/scripts/check-terminal-outcome.mjs` with the persisted
intent. For `generate`, pass the selected package's canonical `manifest.json`;
for `skip`, pass the recorded source and any required failed-attempt evidence.
The outcome vocabulary is `built`, `built-needs-review`, `failed`, and
`incomplete`: only the first two satisfy generation. Missing packages do not
satisfy generation.

`project-explainer` runs are active-project working artifacts, not
post-completion reference products. Do not export or add archive-aware PR or
summary reference links for a `project-explainer` run.

For `IS_DURABLE_PROJECT="false"`, never export a tracked project recap and
never construct or pass `--project-recap-run`. This is the local scope. Do not
treat local filesystem presence as project durability. Shared and synced recaps
are exported by the later archive step.

### Step 3.65: Recover a Recognizable Completion Receipt Before Mutation

Initialize `PROJECT_LINKS_PIN_COMMIT=""`, `PROJECT_REF_COMMIT=""`,
`PR_DESCRIPTION_RELATIVE_PATH=""`, and
`COMPLETION_RECEIPTS_RECOVERED="false"`. For a
synced non-archive run, invoke the skill-owned retry router before the
project-log probe, seal append, review moves, `complete-state`, active-pointer,
or PR-artifact mutation. This is the one executable routing surface; do not
recreate candidate detection and recovery as separate shell branches:

```bash
if [[ "$PROJECT_SCOPE" == "synced" && "$SHOULD_ARCHIVE" == "false" ]]; then
  COMPLETION_RETRY_ARGS=(
    --project-path "$ACTIVE_PROJECT_PATH"
    --retained-ref "$PROJECT_RETAINED_REF"
  )
  COMPLETION_RETRY_JSON=$(node "$COMPLETION_RETRY_SCRIPT" \
    "${COMPLETION_RETRY_ARGS[@]}") || exit 1
  COMPLETION_RETRY_FIELDS=$(node "$COMPLETION_RETRY_FIELDS_SCRIPT" \
    "$COMPLETION_RETRY_JSON") || exit 1
  IFS=$'\t' read -r COMPLETION_RETRY_ROUTE _ \
    <<< "$COMPLETION_RETRY_FIELDS"
  if [[ "$COMPLETION_RETRY_ROUTE" == "recovery" ]]; then
    IFS=$'\t' read -r COMPLETION_RETRY_ROUTE PROJECT_LINKS_PIN_COMMIT \
      PROJECT_REF_COMMIT PR_DESCRIPTION_RELATIVE_PATH \
      <<< "$COMPLETION_RETRY_FIELDS"
    PR_DESCRIPTION_PATH="$ACTIVE_PROJECT_PATH/$PR_DESCRIPTION_RELATIVE_PATH"
    COMPLETION_RECEIPTS_RECOVERED="true"
  elif [[ "$COMPLETION_RETRY_ROUTE" == "pin-source" ]]; then
    IFS=$'\t' read -r COMPLETION_RETRY_ROUTE PROJECT_LINKS_PIN_COMMIT \
      PR_DESCRIPTION_RELATIVE_PATH <<< "$COMPLETION_RETRY_FIELDS"
    PR_DESCRIPTION_PATH="$ACTIVE_PROJECT_PATH/$PR_DESCRIPTION_RELATIVE_PATH"
    COMPLETION_RECEIPTS_RECOVERED="true"
  elif [[ "$COMPLETION_RETRY_ROUTE" != "normal" || \
    "$COMPLETION_RETRY_FIELDS" != "normal" ]]; then
    exit 1
  fi
fi
```

A recognized candidate must be clean and validate completely; dirty,
malformed, mixed, or contradictory candidates exit before the router returns.
When the result is `route: "normal"`, follow the ordinary flow without
changing its existing dirty-worktree guarantees. When it is
`route: "recovery"`, the executable has already restored the final receipts.
Jump directly to Step 7.5 and skip every mutation in Steps 3.7 through 7. When
it is `route: "pin-source"`, the executable has validated the already-published
pin-source tree and PR artifact; preserve `PROJECT_LINKS_PIN_COMMIT`, jump
directly to Step 8.6, and skip Steps 3.7 through 7, including a duplicate
pin-source push. The executable transaction matrix must use this same router
for all configured and interactive interruption rows.

### Step 3.7: Project Log Completion Gate

Run the project-log status probe before any lifecycle mutation or archive work:

```bash
PROJECT_LOG_CHECK=$(oat project log check --project "$PROJECT_PATH" --json)
```

Route on the structured result. Check `status: "ambiguous"` first: its counts
are all zero and `sealed` is `false`, so every other row below would otherwise
read it as an empty, unsealed log and fall through to the roll-up and the seal.

- `status: "ambiguous"`: the log's structure has two readings, so none of its
  counts mean anything. Stop completion, report the result's `ambiguity` string
  verbatim as the reason, and repair the log before re-running. Do not run the
  summary hard gate, the roll-up, the seal append, or the retirement sweep. The
  zeroed counts are not evidence that there is nothing to roll up.
- `status: "absent"`: the feature is inert; proceed without a roll-up or seal
  append.
- `status: "synthesis_pending"` or `synthesisPending: true`: emit
  `Warning: Project-log end-of-run synthesis is pending. Complete it with oat project log synthesize.`
  Offer to invoke `oat project log synthesize`, but do not block completion if
  the synthesis remains pending. Synthesis is warn-only.
- `sealed: true`: this completion already sealed the log on an earlier run.
  Skip the summary hard gate below, the roll-up, and the seal append, and run
  the retirement sweep in report-only mode as described below. A sealed log is
  closed; re-entering any of those steps would either duplicate the seal or
  attempt an append the CLI now refuses.
- When entry counts are nonzero **and the log is not sealed**, require a
  current `summary.md`. This hard gate
  overrides Step 3.5's tolerance for declined, skipped, missing, or failed
  summary generation: load the current `oat-project-summary/SKILL.md` and follow
  it; only when skill loading is unavailable in the current host/runtime, author
  a complete summary inline before continuing.

**Absorbed-project retirement sweep.** Run this sweep here — after the status
probe above and before the roll-up below — so that every finding it produces is dispositioned in the project log while
appends are still allowed. Retiring an absorbed scaffold is a semantic claim
about the active planning surfaces, not the physical removal of a directory, so
this sweep checks the claim. It is advisory: a raw match is never a hard block
on closeout.

```bash
PJM_DOCTOR=$(oat pjm doctor --json 2>/dev/null || true)
```

Skip the sweep, record the single note
`Retirement sweep skipped: no PJM adoption.`, and continue when `PJM_DOCTOR` is
empty, is not parseable JSON, or reports an `adoption.state` other than
`declared` or `inferred-legacy`. This skill ships to repositories that never
adopted PJM and to repositories where the planning surfaces do not exist; a
missing surface degrades this sweep and never fails closeout.

Otherwise read `absorbed_projects` and `absorbed_backlog_ids` from
`"$PROJECT_PATH/state.md"` frontmatter. These two fields are the only inputs the
sweep takes. When both are absent or empty, nothing was consolidated: record
`Retirement sweep: no absorbed projects recorded.` and continue.

For each absorbed slug and each absorbed backlog ID, search the active planning
surfaces:

- `.oat/repo/pjm/roadmap.md` — the Now/Next/Later lanes and the sequencing map
- `.oat/repo/pjm/current-state.md`
- `.oat/repo/pjm/backlog/index.md` — the Curated Overview
- the `state.md` of projects that are still active. Project states are
  scope-nested as `<projects-root-parent>/<scope>/<project>/state.md`, so
  resolve the configured root first — `oat config get projects.root`, default
  `.oat/projects/shared` — and scan its sibling scope directories, which are
  `shared`, `local`, and `synced` under the default layout
  (`.oat/projects/*/*/state.md`). Skip the sibling `archived` tree, which holds
  durable evidence rather than an active claim, and skip any project whose own
  `state.md` already records a terminal `oat_lifecycle: complete` — a completed
  project left in an active scope directory is not a live ownership claim
  either

Match a slug or backlog ID only where it carries future-oriented ownership
language — an active surface that still claims the absorbed work as planned,
owned, scheduled, or in flight. A bare mention that makes no such claim is not a
finding. The completing project's own `absorbed_projects` and
`absorbed_backlog_ids` fields are the sweep's input, never a finding. Prose that
clearly describes past state is exempt: a dated history entry, a retro, a decision record, a changelog line,
or any sentence whose tense reports what already happened is evidence, not a
stale claim.

Each remaining hit becomes a named finding carrying a recorded disposition,
either fixed now — edit the stale surface in this run — or accepted as
historical with the reason it is exempt. An autonomous run records the third
disposition, `deferred advisory`, described below. Append the dispositions to the project
log before the roll-up runs, so the roll-up summarizes them and the seal remains
the final entry:

```bash
oat project log append \
  --project "$PROJECT_PATH" \
  --structural \
  --producer oat-project-complete \
  --ref retirement-sweep \
  --body "Retirement sweep: <surface>:<finding> — <fixed|accepted as historical>; <reason>."
```

If a disposition edits inputs that `summary.md` reflects, regenerate the summary
before the roll-up, exactly as this step already requires for a log with
entries.

Three bounded variations change where the dispositions land, never whether the
sweep runs:

- **Autonomous completion.** No new interactive gate may be opened here, so
  record every finding as an advisory warning entry with the disposition
  `deferred advisory` and continue, mirroring the warn-and-continue precedent
  for non-blocking completion warnings in
  `oat-project-implement/references/completion-and-closeout.md`.
- **No project log** (`status: "absent"` from the probe above). Record the
  findings and their dispositions in the Step 12 completion summary
  instead, and never create a project log for them.
- **Resumed completion whose log already carries a seal.** Route on the status
  probe: `sealed: true` in `PROJECT_LOG_CHECK` means the log is already sealed,
  and `seal` carries that entry's heading and date. `oat project log check`
  owns this claim — it reports the seal from the log's own structural entries,
  so a seal written before the seal append was keyed is recognized the same way
  as a keyed one. On a sealed log the
  sweep runs in report-only mode: surface the findings and dispositions in the
  Step 12 completion summary, append nothing to the sealed log, and never
  re-enter the roll-up or the seal. No project-log append may follow the seal,
  on a resume as much as on a first run. The CLI enforces this rather than
  trusting the routing: any non-seal append carrying new content onto a sealed
  log is refused with
  `status: "sealed"` and a non-zero exit, and a replayed seal reports
  `already-appended` instead of writing a second one. An append that
  `--idempotency-key` recognizes as its own earlier entry also reports
  `already-appended` and exits 0, because that entry predates the seal and
  nothing is written; that carve-out never adds content after the seal.

Skip this roll-up entirely when the probe reported `sealed: true`; a sealed log
has already been rolled up and sealed, and the seal must remain its final
entry.

For an unsealed log with entries, reuse the summary flow's structured roll-up
result only
when this completion run has that exact result in memory and it reports
`status: "ok"`. Otherwise run the idempotent enforcement surface:

```bash
PROJECT_LOG_ROLLUP=$(oat project log rollup --project "$PROJECT_PATH" --json)
```

Do not set lifecycle complete, seal, or archive unless the structured
`ProjectLogRollupResult` reports `status: "ok"`.

- `ledgerOutcome: "appended"` or `"deduplicated"` with `status: "ok"`:
  proceed.
- `ledgerOutcome: "skipped_permitted"` with `status: "ok"`: proceed and report
  the permitted skip; the absent default reference layer is not a block.
- `status: "ambiguous"`: the log's structure has two readings, so nothing was
  read and `summary.md` was not written. Stop, report the result's `ambiguity`
  string verbatim, and repair the log. Never continue to seal or archive.
- `status: "failed"`, `ledgerOutcome: "failed"`, malformed JSON, or a command
  error: stop and surface the roll-up failure. Never continue to seal or
  archive.

When the status probe found an existing project log and did not report
`sealed: true`, append the completion seal
as the final project-log entry before any lifecycle-complete mutation:

```bash
oat project log append \
  --project "$PROJECT_PATH" \
  --structural \
  --producer oat-project-complete \
  --ref seal \
  --idempotency-key "oat-seal:$PROJECT_NAME" \
  --body "Completion sealed at $(date -u +%Y-%m-%dT%H:%M:%SZ); project-log roll-up status: ok. oat-seal:$PROJECT_NAME"
```

The key makes a replayed seal a no-op: `oat project log append` reports
`already-appended` and leaves exactly one seal entry. It must stand alone as
its own whitespace-delimited word in `--body` — the command records the whole
word carrying the key, so a key glued to the varying timestamp would never
match its own earlier append, and the command rejects a key the body omits.

Then verify the seal landed, rather than trusting the append's exit status:

```bash
SEAL_CHECK=$(oat project log check --project "$PROJECT_PATH" --json)
```

Require `sealed: true` in `SEAL_CHECK`, and require the `heading` the append
returned to be a seal heading — a `### <date> · structural · oat-project-complete · seal`
line. A zero exit with either condition unmet means the log is still open: stop
and report it; do not set lifecycle complete or archive. Re-reading the file is
the stronger of the two checks and the reason both are required: it reports what
the log now contains rather than what the append said about it, so it also
catches a seal that was written but is unreachable to the parser. This
verification exists because a seal that is silently not written reads exactly
like a successful one from the completion flow's side.

Only append this seal after Step 3.7 has either confirmed there are no entries
to roll up or obtained `status: "ok"`. If the append fails for an existing log,
stop before setting lifecycle complete or archiving. No project-log append may follow the seal.

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
if [[ "$SHOULD_ARCHIVE" == "true" && "$IS_DURABLE_PROJECT" == "true" ]]; then
  COMPLETE_STATE_ARGS+=("--archived")
fi

oat project complete-state "${COMPLETE_STATE_ARGS[@]}"
```

For `synced`, keep this finalized lifecycle state in the project checkout until
Step 7.5 publishes it together with every later pre-archive artifact write. Do
not push here: Step 7 may still create or replace the PR-description artifact,
and the retained project ref must include that late artifact.

When archive is selected, the synced completion order is: finalize → generate
the PR artifact → project-ref pin-source push → project archive → render
`oat project links --durable-summary <path>` → update the open PR body. When
archive is declined, it is: finalize → generate the PR artifact →
project-ref pin-source push → render the final links → final artifact push →
exact discovery-record commit. The recap already travels in the final project
reference push.

The CLI command owns both the frontmatter completion fields and the canonical markdown body updates for `state.md`.
It must set `oat_lifecycle: complete`, completion timestamps, `**Status:** Complete`, `**Last Updated:**`, the canonical `## Current Phase` body, normalized `## Progress`, and `## Next Milestone`.

### Step 6: Clear or Defer the Active Project Pointer

Clearing the active project pointer is implicit and requires no confirmation.
For every completion that will actually archive — that is, every durable
(`shared` or `synced`) project with archive selected — defer the clear until
the archive receipt has been validated in Step 12. Every archive or
configured-S3 failure therefore exits with the original pointer intact and the
completion remains directly resumable.

The guard mirrors the `complete-state` and Step 8 gate exactly. Keying it on
`SHOULD_ARCHIVE` alone would strand the pointer for `local` projects, which are
never durable and therefore never archive; they keep the immediate clear, as do
all non-archive completions.

```bash
# active-pointer-guard:start
if [[ "$SHOULD_ARCHIVE" == "true" && "$IS_DURABLE_PROJECT" == "true" ]]; then
  echo "Active project pointer retained until durable archive receipt validation."
else
  oat config set activeProject ""
  echo "Active project pointer cleared."
fi
# active-pointer-guard:end
```

### Step 7: Generate PR Description

PR description generation is automatic — it always runs as part of project completion. This must happen **before** archiving so that project artifacts are still at their tracked paths and blob links resolve correctly.

Load the current `oat-project-pr-final/SKILL.md` and follow its Steps 0.5
through 4 as the authoritative source for the templates and policies this step
applies, then execute completion's adapted mapping below instead of pr-final's
own step sequence. Apply only pr-final's templates and content policies; apply
none of its gates, prompts, blocks, or state writes. Step 5 has already run
`oat project complete-state`, so blocking or re-deciding a gate here would
strand a completed project mid-lifecycle. When skill loading is unavailable in
the current host/runtime, the mapping below is the explicit inline fallback that
carries the same Steps 0.5 through 4 contract:

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

When no PR description artifact exists, write it before the final synced
project-ref publication, regardless of archive or recap selection.

Retain the one selected or written artifact as `PR_DESCRIPTION_PATH`. Resolve
`PR_DESCRIPTION_RELATIVE_PATH` from `ACTIVE_PROJECT_PATH`, require it to be a
normalized project-relative path, and reject zero, multiple, symlinked, or
outside-project candidates. Step 7.5 passes that exact relative path to the
receipt recovery surface.

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
- Do not add a durable reference for any `project-explainer` run. Only the selected final `project-recap` can enter the tracked completion export path.
- When a final project recap is selected, defer its summary and PR link until
  Step 8 returns `projectRecapExport.exportRoot`. Do not predict that path from
  the date or project name.

Anti-pattern: do not "rescue" a dropped artifact by linking to its archived path under `.oat/projects/archived/<name>/...`. That path is gitignored on every checkout and never reaches the remote.

#### Step 7.5: Publish Synced Project Pin Source

For `synced`, publish only after Step 7 has finished every pre-archive project
artifact write. This receipt is the immutable pin source used when Step 8.6
renders the final links. Keep it separate from the final non-archive artifact
receipt:

Preserve `PROJECT_LINKS_PIN_COMMIT` and `PROJECT_REF_COMMIT` when the Step 3.65
router restored them. A `pin-source` route skips this step entirely and resumes
at Step 8.6. Do not
initialize over a recovered value or run a second candidate-routing branch at
this step. The pre-mutation router owns candidate detection, exact PR-artifact
selection, pin-source retry validation, and `recoverCompletionReceipts`; its
read-only recovery must have validated the applicable receipt chain before
returning a receipt:

- a clean synced checkout and the retained local ref;
- the exact final-artifact subject;
- exactly the PR-description path in the final-artifact commit;
- single-parent pin-source → final-artifact ordering, with
  the pin source subject equal to the preliminary push message below;
- canonical `state.md` lifecycle fields in the pin-source tree, including
  `oat_lifecycle: complete` and equal valid UTC completion/update timestamps;
- when the pin source contains `project-log.md`, its final entry is the
  canonical `oat-project-complete` completion seal; an absent log remains the
  supported inert project-log configuration from Step 3.7;
- exactly one well-ordered links block pinned to the pin-source parent; and
- equal local and remote final-artifact receipts.

Restore the returned `projectLinksPinCommit` as
`PROJECT_LINKS_PIN_COMMIT` and `projectRefCommit` as `PROJECT_REF_COMMIT`. Any
candidate with a malformed
subject, path set, parent, links block, retained ref, or local/remote relation
fails closed. Do not fall through to a new pin-source publication after a
partial or contradictory candidate. This retry recognition is valid whether
the parent discovery record is still active or already complete.

Parse synced push receipts with:

```bash
parse_synced_push_receipt() {
  node -e '
const value = JSON.parse(process.argv[1]);
if (!["pushed", "up-to-date"].includes(value.status)) process.exit(1);
if (!/^[0-9a-f]{40}$/.test(value.sha) || typeof value.ref !== "string") process.exit(1);
process.stdout.write(`${value.ref}\t${value.sha}`);
' "$1"
}
```

When retry recognition did not set `PROJECT_REF_COMMIT`, publish the pin
source:

```bash
if [[ "$PROJECT_SCOPE" == "synced" && -z "$PROJECT_REF_COMMIT" ]]; then
  PROJECT_PUSH_OUTPUT=$(oat project push "$PROJECT_PATH" \
    --message "chore(oat): finalize project lifecycle" --json) || exit 1
  PROJECT_PUSH_FIELDS=$( \
    parse_synced_push_receipt "$PROJECT_PUSH_OUTPUT"
  ) || exit 1
  IFS=$'\t' read -r PROJECT_RETAINED_REF PROJECT_LINKS_PIN_COMMIT \
    <<< "$PROJECT_PUSH_FIELDS"
  printf '%s\n' "$PROJECT_PUSH_OUTPUT"
fi
```

Require the structured push result to report `status: "pushed"` or
`status: "up-to-date"`, the retained project ref, and a full `sha`. Capture the
exact structured receipt SHA as `PROJECT_LINKS_PIN_COMMIT`. Never infer this
receipt from the parent branch, a stale local ref, or an earlier push. Verify
the receipt commit contains the newly created PR-description artifact when
Step 7 started without one, as well as every other pre-archive project artifact
write.

Both configured and interactive archive-decline paths continue from this exact
pin-source receipt into Step 8.6. The later final artifact receipt and exact
parent-branch record commit finish the non-archive transaction. A selected
recap is already part of the project-ref content and requires no second
completion commit.

### Step 8: Archive Project (Conditional)

**Skip if `SHOULD_ARCHIVE` is false or `IS_DURABLE_PROJECT` is false.**

This conditional skips archive movement only; it does not skip the Step 3.7
seal append for an existing project log.

Archive happens after PR description generation. For a synced project, the
archive command owns the exact lifecycle commit that deletes the discovery
record together with tracked archive exports; later bookkeeping must reuse its
receipt rather than creating a second lifecycle commit.

The archive-side effects in this step are CLI-owned. Do not reimplement local archive movement, summary export, S3 sync, AWS credential handling, or worktree durability checks in the skill.

Archive refuses a dirty or unpushed synced checkout. The correction is
`oat project push "$PROJECT_PATH"`; never discard or bypass pending artifacts.

```bash
ARCHIVE_OUTPUT=""
ARCHIVE_ARGS=("$PROJECT_PATH")
if [[ -n "$SELECTED_PROJECT_RECAP_RUN" ]]; then
  ARCHIVE_ARGS+=("--project-recap-run" "$SELECTED_PROJECT_RECAP_RUN")
fi

if ! ARCHIVE_OUTPUT=$(oat project archive "${ARCHIVE_ARGS[@]}" --json 2>&1); then
  printf '%s\n' "$ARCHIVE_OUTPUT" >&2
  echo "Error: Project archive failed." >&2
  exit 1
fi

printf '%s\n' "$ARCHIVE_OUTPUT"
```

Parse `ARCHIVE_OUTPUT` as the `oat project archive --json` report. Require
`status: "ok"`, `mode: "apply"`, and a non-empty `archivePath`; use its
`s3Path`, `summaryExportFile`, `lifecycleCommit`, `completedRef`,
`verifiedSourceSha`, `activeAliasDisposition`, `recordRetired`, and `warnings`
fields for later reporting. Set
`ARCHIVE_PATH` from `archivePath`, set `SUMMARY_EXPORT_FILE` from
`summaryExportFile` (empty when null), then set `PROJECT_PATH="$ARCHIVE_PATH"`.

For a synced project, require a full `lifecycleCommit` SHA in the archive
report, require `completedRef` to equal
`refs/oat/completed/${PROJECT_NAME}`, require a full `verifiedSourceSha`,
require `activeAliasDisposition` to be `removed` or `retained`, and require
`recordRetired` to be exactly `true`. Set `LIFECYCLE_COMMIT` to the reported
commit. This is the parent-branch record-deletion and archive-export commit
owned by archive; do not replace it with `git rev-parse HEAD` and do not create
another lifecycle commit. `removed` is the completed-only terminal shape;
`retained` is the equally terminal same-SHA active alias shape. A differing-SHA
state is never a successful report.

When `SELECTED_PROJECT_RECAP_RUN` is non-empty, also require the report's
`projectRecapExport.sourceRunRoot`, `projectRecapExport.exportRoot`, and
`projectRecapExport.manifest.relativePath === "manifest.json"`. Confirm the
reported source is the selected run under the pre-archive project path and the
export root is inside the tracked
`.oat/repo/reference/project-recaps/` root. Record:

- `sourceRunRoot` as the relocation source;
- `exportRoot` as the final recap run root; and
- `exportRoot/manifest.relativePath` as the final manifest.

Do not infer or reconstruct the recap export root. The archive report is
authoritative. A missing, malformed, mismatched, outside-root, or gitignored
export report is an archive failure; stop before lifecycle bookkeeping.
Never use the gitignored archive as evidence or a link target.

SELECTED_PROJECT_RECAP_RUN must be project-relative. Never add `--project-recap-run` when `SELECTED_PROJECT_RECAP_RUN` is empty. The empty case remains the existing archive behavior. Because this step runs only for durable projects, local-scope projects never pass a recap archive argument.

The no-recap invocation remains `oat project archive "$PROJECT_PATH"` with
`--json` added only to select the machine-readable report.
Use `ARCHIVE_S3_CONTEXT` in Step 12 if the command reports profile/region details.

Only after every applicable synced terminal and recap-export field above has
passed validation may the workflow continue. Keep the pointer through the
required link, dashboard, bookkeeping, push, and PR-closeout work below for
every durable scope. For `synced`, a failure after record retirement retries
through the recordless archive path. For `shared`, the archive has already
removed the source directory, so a failure here retries through the
shared-scope post-archive checkpoint in Step 1, which validates the discovered
archive and clears the pointer without archiving again.

#### Step 8.5: Finalize Archive-Aware Recap Links

The recap-link rewrite in this subsection runs only when archive returned a
`projectRecapExport`. A synced archive resume with no recap export performs no
recap-link rewrite, then still continues at Step 8.6.

This is the explicit rejoin point when `SYNCED_ARCHIVE_RESUME="true"`. Use
`ARCHIVE_OUTPUT` and `PROJECT_RECAP_EXPORT_JSON` from the validated executor
result; use its `ARCHIVE_PATH`, `SUMMARY_EXPORT_FILE`, `LIFECYCLE_COMMIT`,
`ARCHIVE_S3_PATH`, and `SELECTED_PROJECT_RECAP_RUN` assignments for all later
steps. Do not infer any receipt from the deleted checkout and do not rerun the
Step 8 archive command—the executor already validated the terminal report.
Keep the active pointer until post-archive closeout succeeds, then run the
finalizer once before confirmation. Continue through Steps 8.5–12, including
final synced links,
dashboard refresh, the required bookkeeping push, tracked-PR closeout when
applicable, and final confirmation.

Rewrite recap links in the tracked summary export and the PR description body from `projectRecapExport.exportRoot`; do not derive them from the local archive.
Use a repository-relative path under
`.oat/repo/reference/project-recaps/` and a blob URL on the current head branch
while the PR is open. If `summaryExportFile` is non-null, update its concise
`Explainer Outcome` recap link. Update the archived PR-description artifact
used by Step 11 or 11.5 so its recap reference points to the same tracked root.
Omit either link when its containing artifact does not exist.

Use the current head branch for the blob URL while the PR is open. Never link to `.oat/projects/archived/`; it is gitignored and will return 404 remotely.

The final synced links block is rendered independently in Step 8.6. Do not
make pinned project links conditional on a recap export.

#### Step 8.6: Render Final Synced Project Links

Run this for every synced completion after the final project ref or archive SHA
is known. It is required even when no project recap was selected and
`summaryExportFile` is null.

Locate the PR-description artifact under the current `PROJECT_PATH` (which is
the archive path after Step 8). Render the canonical pinned block:

```bash
FINAL_LINK_ARGS=("$PROJECT_NAME" --format markdown)
if [[ -n "${SUMMARY_EXPORT_FILE:-}" ]]; then
  test -f "$SUMMARY_EXPORT_FILE" || exit 1
  git ls-files --error-unmatch -- "$SUMMARY_EXPORT_FILE" >/dev/null || exit 1
  git check-ignore --quiet -- "$SUMMARY_EXPORT_FILE" && exit 1
  SUMMARY_EXPORT_RELATIVE=$(git ls-files --full-name -- "$SUMMARY_EXPORT_FILE") || exit 1
  [[ -n "$SUMMARY_EXPORT_RELATIVE" ]] || exit 1
  FINAL_LINK_ARGS+=(--durable-summary "$SUMMARY_EXPORT_RELATIVE")
fi
FINAL_PROJECT_LINKS=$(oat project links "${FINAL_LINK_ARGS[@]}") || exit 1
```

Insert `FINAL_PROJECT_LINKS` when the body has no
`<!-- oat:project-links:start -->` block, or replace exactly the existing
delimited block through `<!-- oat:project-links:end -->`. Do not duplicate the
markers. The base invocation remains
`oat project links "$PROJECT_NAME" --format markdown`; add
`--durable-summary` only for the verified tracked export above.

For `PROJECT_SCOPE="synced"` with `SHOULD_ARCHIVE="false"`, render this block
in the active PR-description artifact before the push whose receipt becomes
`PROJECT_REF_COMMIT`. Skip the rewrite only when Step 7.5 recognized and
validated an already-finalized retry receipt. Otherwise publish the rendered
artifact with a distinct final push:

```bash
if [[ "$PROJECT_SCOPE" == "synced" && "$SHOULD_ARCHIVE" == "false" && \
  -z "$PROJECT_REF_COMMIT" ]]; then
  FINAL_PROJECT_PUSH_ARGS=("$PROJECT_PATH" \
    --message "chore(oat): publish final project links" --json)
  FINAL_PROJECT_PUSH_OUTPUT=$(oat project push \
    "${FINAL_PROJECT_PUSH_ARGS[@]}") || exit 1
  FINAL_PROJECT_PUSH_FIELDS=$( \
    parse_synced_push_receipt "$FINAL_PROJECT_PUSH_OUTPUT"
  ) || exit 1
  IFS=$'\t' read -r FINAL_PROJECT_PUSH_REF PROJECT_REF_COMMIT \
    <<< "$FINAL_PROJECT_PUSH_FIELDS"
  test "$FINAL_PROJECT_PUSH_REF" = "$PROJECT_RETAINED_REF" || exit 1
  printf '%s\n' "$FINAL_PROJECT_PUSH_OUTPUT"
fi
```

Require the structured result to report `status: "pushed"` or
`status: "up-to-date"`, the same retained project ref, and a full `sha`. Capture
that exact SHA as `PROJECT_REF_COMMIT`. Verify the checkout is clean, the
retained remote ref equals the receipt, and the receipt contains the final
PR-description artifact with exactly one links block pinned to
`PROJECT_LINKS_PIN_COMMIT`. When the final render produced a commit, require
its immediate parent to equal `PROJECT_LINKS_PIN_COMMIT` and require the commit
to contain exactly the PR-description artifact. Never substitute the
preliminary receipt for `PROJECT_REF_COMMIT` after the artifact changed.

Both PR paths consume this final body: when
`WAS_PR_OPEN_AT_START="false"`, Step 11 creates the new PR with it; when
`WAS_PR_OPEN_AT_START="true"`, Step 11.5 updates the already-open PR with it.
Neither path depends on `projectRecapExport` or a configured
`archive.summaryExportPath`.

#### Step 8.7: Non-Archive Synced Completion Transaction

Run this only when `PROJECT_SCOPE="synced"` and `SHOULD_ARCHIVE="false"`.
The configured and interactive decline paths converge here after the finalized
project tree has been pushed and `PROJECT_REF_COMMIT` has been captured.

Set `SYNCED_RECORD_PATH="${ACTIVE_PROJECT_PATH}.json"`; require it to be the
canonical direct-child discovery record under the configured synced root and
require its parsed `slug` and `ref` to match `PROJECT_NAME` and the project
target. Mark the discovery record `complete` with `completedAt` using a
structured JSON write that preserves the schema's other fields and the
formatter-stable trailing newline. Refuse symlinks, malformed records, and any
path outside that exact boundary before writing.

Snapshot unrelated staged state before this write. Step 10 must commit only
`SYNCED_RECORD_PATH` on the parent branch with
`chore(oat): complete synced project ${PROJECT_NAME}`, then verify the commit
contains exactly that path and verify the unrelated staged snapshot is
byte-for-byte unchanged. The retained project ref remains the artifact
authority after non-archive completion. Do not remove the checkout, delete the
ref, create archive exports, or set `PROJECT_PATH` to an archive location.

The final artifact push plus exact record commit completes this transaction,
whether or not `SELECTED_PROJECT_RECAP_RUN` is empty.

On retry, accept an already-complete record only after its exact-path commit is
verified and the final artifact push receipt still names the retained ref SHA.
If the final artifact push succeeded but the record commit did not, reuse the
validated `PROJECT_LINKS_PIN_COMMIT` and `PROJECT_REF_COMMIT` receipts and retry
only the record write/commit. Never create a second lifecycle record commit,
rerender the links against the final receipt, or rewrite either history.

### Step 9: Regenerate Dashboard

Regenerate the repo state dashboard so the completion status is reflected before committing.

```bash
oat state refresh
```

### Step 10: Commit + Push Bookkeeping (Required)

Completion is not done until lifecycle changes are committed and pushed. The
archive export made in Step 8 is the durable recap copy; there is no later recap
record commit.

Expected changes may include:

- `{PROJECT_PATH}/state.md`
- `{PROJECT_PATH}/implementation.md` (if touched earlier in the lifecycle closeout)
- `{PROJECT_PATH}/plan.md` (if review receive just ran)
- `{PROJECT_PATH}/pr/project-pr-*.md` (PR description artifact)
- `.oat/state.md` is regenerated locally in Step 9 but should not be staged; it is generated dashboard state and normally gitignored.
- `.oat/config.local.json` (if `activeProject` cleared)
- Shared-project deletions; synced archive record deletion is already sealed by
  the archive-owned lifecycle commit
- The complete tracked recap export and tracked summary export reported by
  archive (if present)

Run:

```bash
if [[ "$PROJECT_SCOPE" == "synced" ]]; then
  if [[ "$SHOULD_ARCHIVE" == "true" ]]; then
    test -n "$LIFECYCLE_COMMIT"
  else
    git add -- "$SYNCED_RECORD_PATH"
    if git diff --cached --quiet -- "$SYNCED_RECORD_PATH"; then
      LIFECYCLE_COMMIT=$(git log -1 --format=%H -- "$SYNCED_RECORD_PATH")
      node "$NONARCHIVE_LIFECYCLE_RECEIPT_SCRIPT" \
        "$SYNCED_RECORD_PATH" "$LIFECYCLE_COMMIT" "$PROJECT_NAME" || exit 1
    else
      git commit --only "$SYNCED_RECORD_PATH" \
        -m "chore(oat): complete synced project ${PROJECT_NAME}" &&
        LIFECYCLE_COMMIT=$(git rev-parse HEAD) &&
        node "$NONARCHIVE_LIFECYCLE_RECEIPT_SCRIPT" \
          "$SYNCED_RECORD_PATH" "$LIFECYCLE_COMMIT" "$PROJECT_NAME" || exit 1
    fi
  fi
else
  git status --short
  git add -- <exact completion and lifecycle paths>
  git commit -m "chore(oat): complete project lifecycle for ${PROJECT_NAME}"
  LIFECYCLE_COMMIT=$(git rev-parse HEAD)
fi
```

Rules:

- If there are unrelated unstaged/staged changes, stage and commit only the
  completion/bookkeeping files. Never use a repository-wide `git add -A` when
  unrelated changes exist.
- If there is nothing to commit, state that explicitly and verify whether the completion bookkeeping was already committed in a prior commit.
- A non-archive synced lifecycle receipt is valid only when it is an ancestor
  of current parent-branch `HEAD`, changes exactly `SYNCED_RECORD_PATH`, and
  contains the current byte-identical complete record for `PROJECT_NAME` with
  the canonical synced ref. Missing records, unrelated paths, stale content,
  cross-project receipts, and non-ancestor commits fail closed. Validate both
  recovered and freshly created lifecycle commit SHAs before continuing; a
  failed commit or hook must not reuse the prior `HEAD` as a receipt.
- The lifecycle bookkeeping commit must contain the tracked recap export when
  one was selected.
- Snapshot unrelated working-tree changes and verify they remain unchanged.

For every synced archive completion, including `SYNCED_ARCHIVE_RESUME="true"`,
push the parent branch exactly once after the lifecycle receipt is final.
Verify the pushed upstream contains that exact bookkeeping commit before
continuing to PR closeout or claiming completion:

```bash
if [[ "$PROJECT_SCOPE" == "synced" && "$SHOULD_ARCHIVE" == "true" ]]; then
  BOOKKEEPING_PUSH_COMMIT="$LIFECYCLE_COMMIT"
  test -n "$BOOKKEEPING_PUSH_COMMIT" || exit 1
  git push || exit 1
  BOOKKEEPING_UPSTREAM=$(git rev-parse --abbrev-ref \
    --symbolic-full-name '@{u}') || exit 1
  BOOKKEEPING_UPSTREAM_COMMIT=$(git rev-parse \
    "$BOOKKEEPING_UPSTREAM^{commit}") || exit 1
  test "$BOOKKEEPING_UPSTREAM_COMMIT" = \
    "$BOOKKEEPING_PUSH_COMMIT" || exit 1
  echo "Completion bookkeeping pushed: $BOOKKEEPING_PUSH_COMMIT"
fi
```

### Step 11: Open PR in GitHub (Conditional)

**Skip if `SHOULD_OPEN_PR` is false.**

**CRITICAL — Strip YAML frontmatter before submitting to GitHub.**
The local artifact file contains YAML frontmatter (`---` delimited block at the top) for OAT metadata. This frontmatter MUST NOT appear in the GitHub PR body. Before passing the file to `gh pr create`, strip everything from the start of the file through and including the closing `---` line. Verify the resulting body starts with the markdown heading (e.g., `# feat: ...`), not YAML keys.

Steps:

1. Locate the PR description artifact at `{PROJECT_PATH}/pr/project-pr-*.md`.
2. Write the stripped body to a temporary file (remove all lines from the opening `---` through the closing `---`, inclusive).
3. Verify the temp file does not start with YAML frontmatter keys.
4. Create the PR from the branch already pushed in Step 10:

```bash
gh pr create --base main --title "{title}" --body-file "$TMP_BODY"
```

5. Clean up the temp file.

Do not assume `gh` is installed; if missing, instruct manual PR creation using the file contents.

### Step 11.5: Sync Open-PR Description on GitHub (Conditional)

**Run only when `WAS_PR_OPEN_AT_START="true"` and either
`SHOULD_ARCHIVE="true"` or `PROJECT_SCOPE="synced"`.**

When the PR was already open at the start, push the final validated completion
body to the existing PR. Archive completion uses the regenerated archive-aware
body. Non-archive synced completion uses the exact PR artifact from
`PROJECT_REF_COMMIT`, whose canonical links block is owned by
`PROJECT_LINKS_PIN_COMMIT`; do not substitute the parent discovery-record
commit.

Skip this step when:

- The PR was not yet open at the start (`WAS_PR_OPEN_AT_START="false"`) — Step 11 already created the PR with the archive-aware body.
- No archive happened and the project is not synced — no final retained-ref
  body was published.
- `IS_DURABLE_PROJECT="false"` — local projects are not archived in this skill, so no link breakage.

Steps:

1. Locate the exact PR description artifact. After archive, use
   `{ARCHIVE_PATH}/pr/project-pr-*.md`. For non-archive synced completion, use
   `PR_DESCRIPTION_PATH`, require the retained remote ref to contain
   `PROJECT_REF_COMMIT`, and require
   `git show "$PROJECT_REF_COMMIT:$PR_DESCRIPTION_RELATIVE_PATH"` to equal the
   body on disk with exactly one links block pinned to
   `PROJECT_LINKS_PIN_COMMIT`.
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
   if ! command -v gh >/dev/null 2>&1; then
     echo "GitHub CLI is unavailable; update the tracked PR manually from $TMP_BODY." >&2
     if [[ "$PROJECT_SCOPE" == "synced" && "$SHOULD_ARCHIVE" == "true" ]]; then
       exit 1
     fi
   elif ! gh pr edit "$PR_REF" --body-file "$TMP_BODY"; then
     echo "PR description update failed; update it manually from $TMP_BODY." >&2
     if [[ "$PROJECT_SCOPE" == "synced" && "$SHOULD_ARCHIVE" == "true" ]]; then
       exit 1
     fi
   fi
   ```

5. Clean up the temp file.

Failure handling:

- If `gh` is missing or `gh pr edit` fails, always print the manual-update path.
  For a synced archive completion this tracked-PR update is required: stop
  before Step 12, retain the active pointer, and let the next invocation resume
  recordlessly. Other completion shapes retain their existing warning-only
  behavior and Step 12 summary guidance.
- A shared archive completion also reaches this step with the pointer still
  retained, but its sync failure stays warning-only. Its shared-scope resume
  goes straight to the Step 12 clear and would not retry this PR update, so
  Step 12 clears the pointer after the receipt validates and the user updates
  the tracked PR by hand from the printed artifact path.
- Never re-archive or re-commit on failure here — the lifecycle bookkeeping
  in Step 10 already shipped.

### Step 12: Confirm to User

Immediately before confirmation, clear the deferred durable archive pointer.
The clear always runs after a validated archive receipt, never before: the
synced finalizer re-validates the full terminal report, and every other durable
scope re-validates `ARCHIVE_OUTPUT` through the separate durable receipt
validator. Do not widen the synced finalizer to accept non-synced input. This
ordering keeps every failure before final confirmation directly retryable,
including a retry after record retirement:

```bash
# deferred-pointer-clear:start
if [[ "$SHARED_ARCHIVE_RESUME" == "true" ]]; then
  oat config set activeProject ""
  echo "Discovered shared archive already validated; active project pointer cleared without a second archive."
elif [[ "$SHOULD_ARCHIVE" == "true" && "$IS_DURABLE_PROJECT" == "true" ]]; then
  if [[ "$PROJECT_SCOPE" == "synced" ]]; then
    SYNCED_ARCHIVE_FINALIZATION=$(printf '%s\n' "$ARCHIVE_OUTPUT" | \
      node "$SYNCED_ARCHIVE_FINALIZE_SCRIPT" \
        --project-name "$PROJECT_NAME") || exit 1
    printf '%s\n' "$SYNCED_ARCHIVE_FINALIZATION"
    echo "Synced archive terminal receipt verified; active project pointer cleared."
  else
    VALIDATED_ARCHIVE_PATH=$(printf '%s\n' "$ARCHIVE_OUTPUT" | \
      node "$DURABLE_ARCHIVE_RECEIPT_SCRIPT" --mode receipt) || exit 1
    oat config set activeProject ""
    echo "Durable archive receipt verified for $VALIDATED_ARCHIVE_PATH; active project pointer cleared."
  fi
fi
# deferred-pointer-clear:end
```

Show user:

- "Project **{PROJECT_NAME}** marked as complete."
- If archived: "Archived location: **{PROJECT_PATH}**"
- If S3 archive sync ran: include `ARCHIVE_S3_CONTEXT` when the archive command reported profile/region details. If only `ARCHIVE_S3_PATH` is available, include the S3 destination and note that profile/region context was not reported by the command. Never echo raw credentials (`AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, etc.).
- Include the lifecycle bookkeeping commit hash and the single push result.
- Report the final recap outcome and tracked reference root.
- Report every absorbed-project retirement finding from the Step 3.7 sweep with
  its disposition. This is the required destination whenever the sweep could not
  append them to the project log — an absent log, or a resume whose log is
  already sealed — and it stays a report, never a completion failure.
- If PR was opened: include the PR URL.
- If `oat_pr_url` is present, show it in the completion summary even when PR creation was skipped because the project already tracked an open PR.
- If Step 11.5 ran, report whether the PR description was synced (e.g. `PR description synced: <PR URL>`) or warn that the sync failed and surface the artifact path so the user can update it manually.
