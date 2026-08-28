---
name: oat-project-complete
version: 1.7.1
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
ACTIVE_PROJECT_PATH="$PROJECT_PATH"

# Set SKILL_DIR to the absolute directory containing this loaded SKILL.md.
COMPLETION_RECEIPT_SCRIPT="$SKILL_DIR/scripts/recover-completion-receipts.mjs"
COMPLETION_RETRY_SCRIPT="$SKILL_DIR/scripts/resolve-completion-retry.mjs"
COMPLETION_RETRY_FIELDS_SCRIPT="$SKILL_DIR/scripts/parse-completion-retry-fields.mjs"
test -f "$COMPLETION_RECEIPT_SCRIPT" || {
  echo "oat: completion receipt recovery script is missing" >&2
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

PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || { echo "oat: cannot resolve project scope for $PROJECT_PATH; refusing completion" >&2; exit 1; }
PROJECT_RETAINED_REF=""
if [[ "$PROJECT_SCOPE" == "synced" ]]; then
  PROJECT_RETAINED_REF="refs/oat/projects/${PROJECT_NAME}"
fi
IS_DURABLE_PROJECT="false"
if [[ "$PROJECT_SCOPE" == "shared" || "$PROJECT_SCOPE" == "synced" ]]; then
  IS_DURABLE_PROJECT="true"
fi
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

- **If `ARCHIVE_PREF` is `true`:** Set `SHOULD_ARCHIVE="true"`. Skip the archive question. Print `Archive on complete: enabled (from workflow.archiveOnComplete).`
- **If `ARCHIVE_PREF` is `false`:** Set `SHOULD_ARCHIVE="false"`. Skip the archive question. Print `Archive on complete: disabled (from workflow.archiveOnComplete).`
- **If unset:** Include the archive question in the batched prompt as normal (backward compatible).
- **If `PR_ON_COMPLETE` is `true` AND no tracked open PR exists:** Set `SHOULD_OPEN_PR="true"`. Skip the Open PR question. Print `PR on complete: enabled (from workflow.createPrOnComplete).`
- **If `PR_ON_COMPLETE` is `false`:** Set `SHOULD_OPEN_PR="false"`. Skip the Open PR question. Print `PR on complete: disabled (from workflow.createPrOnComplete).`
- **If `PR_ON_COMPLETE` is unset:** Include the Open PR question in the batched prompt as normal (backward compatible).
- The existing tracked-PR skip still applies: if `oat_pr_status` is `open`, do not ask the Open PR question and do not honor `PR_ON_COMPLETE=true` — the PR already exists.

The "Ready to mark complete?" confirmation is always asked — it is a meaningful "are you sure" moment, not a preference.

The configured-decline case is `workflow.archiveOnComplete=false`. When the
preference is unset and the user declines the batched archive question, the
interactive archive answer is `false`. Both cases select the same explicit
non-archive transaction below; declining archive never means skipping synced
record durability.

Route either source through
`scripts/recover-completion-receipts.mjs#resolveCompletionArchiveDecision`
before assigning `SHOULD_ARCHIVE`. Pass `configuredPreference` only when
`workflow.archiveOnComplete` is set; otherwise pass the accepted batched
`interactiveAnswer`. Require the result's `source` to be `configured` or
`interactive` as appropriate and use its `shouldArchive` boolean. An absent or
non-boolean decision fails closed instead of silently selecting a lifecycle
path. The executable completion transaction tests must use this same resolver;
scenario labels alone are not decision coverage.

After the configured preference or accepted interactive answer is available,
invoke the resolver rather than assigning `SHOULD_ARCHIVE` directly:

```bash
ARCHIVE_DECISION_ARGS=()
if [[ "$ARCHIVE_PREF" == "true" || "$ARCHIVE_PREF" == "false" ]]; then
  ARCHIVE_DECISION_ARGS+=(--archive-preference "$ARCHIVE_PREF")
else
  test "$ARCHIVE_INTERACTIVE_ANSWER" = "true" \
    || test "$ARCHIVE_INTERACTIVE_ANSWER" = "false" \
    || exit 1
  ARCHIVE_DECISION_ARGS+=(--interactive-archive "$ARCHIVE_INTERACTIVE_ANSWER")
fi
ARCHIVE_DECISION_JSON=$(node "$COMPLETION_RECEIPT_SCRIPT" \
  "${ARCHIVE_DECISION_ARGS[@]}") || exit 1
ARCHIVE_DECISION_FIELDS=$(node -e '
const value = JSON.parse(process.argv[1]);
if (typeof value.shouldArchive !== "boolean" || !["configured", "interactive"].includes(value.source)) process.exit(1);
process.stdout.write(`${value.shouldArchive}\t${value.source}`);
' "$ARCHIVE_DECISION_JSON") || exit 1
IFS=$'\t' read -r SHOULD_ARCHIVE ARCHIVE_DECISION_SOURCE \
  <<< "$ARCHIVE_DECISION_FIELDS"
```

Require `ARCHIVE_DECISION_SOURCE` to match the source selected above. Store an
unconfigured batched answer as `ARCHIVE_INTERACTIVE_ANSWER` until this resolver
returns; only then assign `SHOULD_ARCHIVE`.

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

Also preflight summary status using the same freshness rules as `oat-project-summary`:

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
2. **Archive** (only if `IS_DURABLE_PROJECT` is `true`): "Archive the project after completion?"
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

After the user accepts the completion confirmation, store the answers as
`SHOULD_ARCHIVE`, `SHOULD_GENERATE_SUMMARY`, `SHOULD_GENERATE_RETRO`,
`SHOULD_GENERATE_RECAP`, and `SHOULD_OPEN_PR` for use in later steps. Set
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
- Prefer running the `oat-project-summary` skill when skill-to-skill invocation is available in the current host/runtime.
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
mode before any lifecycle mutation. Apply and filing behavior remains
config-gated inside that skill.

Use the host's skill-to-skill invocation when available. Do not assume
`oat-project-retro` is a shell command on `PATH`. If dispatch is unavailable or
generation fails, warn with the reason and continue completion; this offer is a
safety net, not a completion gate. Never leave a partial retro artifact.

When `SHOULD_GENERATE_RETRO="false"`, do not dispatch the skill.

### Step 3.6: Select Final Project Recap

Run this gate after the optional summary refresh and before any lifecycle
mutation. Initialize `SELECTED_PROJECT_RECAP_RUN=""`.

When `SHOULD_GENERATE_RECAP="true"`, inspect manifests under
`{PROJECT_PATH}/explainers/` before generating. A fresh `project-recap` manifest for the current completed implementation is reused without invoking the adapter again. Fresh means the manifest identifies recipe `project-recap`, belongs to this project, has a terminal outcome, and its recorded source hashes match the current approved implementation inputs, including the refreshed summary when present.

If no fresh recap exists, invoke `scripts/run.mjs#runOatExplainer` exactly once with recipe `project-recap`, project invocation, the active project, and unattended lifecycle mode so approved OAT artifacts do not trigger a second content prompt. A returned `failed` outcome warns but does not block completion. An invocation that returns no terminal outcome blocks lifecycle mutation. Use a returned valid terminal `project-recap` manifest as the selected run; do not rerun to improve its outcome.
Before that invocation, construct exactly one brief-aware, provider-neutral
author seam as documented by
`oat-explainer-kit/references/author-callback.md`. In-process callers pass
`author`; JSON/CLI callers pass a validated `authorModulePath`. Supply it
alongside the existing `critic` callback (or validated
`criticModulePath`), and invoke the recap with `mode: unattended`.

The author seam is the recap's quality mechanism, so derive its output from the
request rather than from ambient context or a stock recap shape. Cover every
`floor.requiredNarrative` section, ground each claim in the supplied `factBase`,
and follow the inlined `brief` for structure — evidence tables for the
implementation and validation sections, at least one high-level architecture
diagram, and lists where material is enumerable. A recap whose warnings include
`guideline-narrative-coverage-missing`, `guideline-structured-depth-missing`, or
`guideline-architecture-diagram-missing` is thin: it still completes, but treat
those warnings as the signal that the authored content did not use the evidence
it was given.

Set `SELECTED_PROJECT_RECAP_RUN` only to the final selected `project-recap` run. The value must be project-relative in the form `explainers/<run-slug>` so it can be passed safely to the archive CLI. An incomplete, stale, wrong-project, or `project-explainer` manifest is never selected as the final recap.

Before any lifecycle mutation, invoke the shared
`oat-explainer-kit/scripts/check-terminal-outcome.mjs` guard with the resolved
intent and, for `generate`, the selected or attempted manifest. The only
terminal generated outcomes are `built-durable`, `built-not-durable`,
`built-needs-review`, and `failed`. Missing records and `incomplete` block
completion; do not substitute a warning or infer an outcome from filesystem
presence. A `skip` intent requires no manifest.

When recap intent resolves to `skip`, leave `SELECTED_PROJECT_RECAP_RUN` empty
and complete without a recap. A terminal `failed` recap attempt is recorded as
a warning rather than changing project completion status.

`project-explainer` runs are active-project working artifacts, not durable post-completion reference products. Do not export, re-attest, or add archive-aware PR or summary reference links for a `project-explainer` run.

For `IS_DURABLE_PROJECT="false"`, never export a tracked project recap and never construct or pass `--project-recap-run`. This is the local scope. A local-scope recap remains `built-not-durable` unless its manifest already contains independently verified publish evidence. Do not treat local filesystem presence as durability. Shared and synced recaps are exported and attested through the later durability stage.

### Step 3.65: Recover a Recognizable Completion Receipt Before Mutation

Initialize `PROJECT_LINKS_PIN_COMMIT=""`, `PROJECT_REF_COMMIT=""`,
`EVIDENCE_COMMIT=""`, `RECOVERED_EVIDENCE_COMMIT=""`,
`EVIDENCE_PUSH_REQUIRED=""`, `PR_DESCRIPTION_RELATIVE_PATH=""`, and
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
  if [[ -n "$SELECTED_PROJECT_RECAP_RUN" ]]; then
    COMPLETION_RETRY_ARGS+=(
      --evidence-path "$SELECTED_PROJECT_RECAP_RUN/manifest.json"
      --evidence-path "$SELECTED_PROJECT_RECAP_RUN/build-record.json"
    )
  fi
  COMPLETION_RETRY_JSON=$(node "$COMPLETION_RETRY_SCRIPT" \
    "${COMPLETION_RETRY_ARGS[@]}") || exit 1
  COMPLETION_RETRY_FIELDS=$(node "$COMPLETION_RETRY_FIELDS_SCRIPT" \
    "$COMPLETION_RETRY_JSON") || exit 1
  IFS=$'\t' read -r COMPLETION_RETRY_ROUTE _ \
    <<< "$COMPLETION_RETRY_FIELDS"
  if [[ "$COMPLETION_RETRY_ROUTE" == "recovery" ]]; then
    IFS=$'\t' read -r COMPLETION_RETRY_ROUTE PROJECT_LINKS_PIN_COMMIT \
      PROJECT_REF_COMMIT RECOVERED_EVIDENCE_COMMIT EVIDENCE_PUSH_REQUIRED \
      PR_DESCRIPTION_RELATIVE_PATH <<< "$COMPLETION_RETRY_FIELDS"
    if [[ "$RECOVERED_EVIDENCE_COMMIT" != "-" ]]; then
      EVIDENCE_COMMIT="$RECOVERED_EVIDENCE_COMMIT"
    fi
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
`route: "recovery"`, the executable has already restored the receipts. Jump
directly to Step 7.5 and skip every mutation in Steps 3.7 through 7. The
executable transaction matrix must use this same router for all configured and
interactive interruption rows.

### Step 3.7: Project Log Completion Gate

Run the project-log status probe before any lifecycle mutation or archive work:

```bash
PROJECT_LOG_CHECK=$(oat project log check --project "$PROJECT_PATH" --json)
```

Route on the structured result:

- `status: "absent"`: the feature is inert; proceed without a roll-up or seal
  append.
- `status: "synthesis_pending"` or `synthesisPending: true`: emit
  `Warning: Project-log end-of-run synthesis is pending. Complete it with oat project log synthesize.`
  Offer to invoke `oat project log synthesize`, but do not block completion if
  the synthesis remains pending. Synthesis is warn-only.
- When entry counts are nonzero, require a current `summary.md`. This hard gate
  overrides Step 3.5's tolerance for declined, skipped, missing, or failed
  summary generation: invoke `oat-project-summary` when available or author a
  complete summary inline before continuing.

For a log with entries, reuse the summary flow's structured roll-up result only
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
- `status: "failed"`, `ledgerOutcome: "failed"`, malformed JSON, or a command
  error: stop and surface the roll-up failure. Never continue to seal or
  archive.

When the status probe found an existing project log, append the completion seal
as the final project-log entry before any lifecycle-complete mutation:

```bash
oat project log append \
  --project "$PROJECT_PATH" \
  --structural \
  --producer oat-project-complete \
  --ref seal \
  --body "Completion sealed at $(date -u +%Y-%m-%dT%H:%M:%SZ); project-log roll-up status: ok."
```

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
exact discovery-record commit → optional active-recap evidence commit and
project push.

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

Preserve `PROJECT_LINKS_PIN_COMMIT`, `PROJECT_REF_COMMIT`, `EVIDENCE_COMMIT`,
and `EVIDENCE_PUSH_REQUIRED` when the Step 3.65 router restored them. Do not
initialize over a recovered value or run a second candidate-routing branch at
this step. The pre-mutation router owns candidate detection, exact PR-artifact
selection, and `recoverCompletionReceipts`; its read-only recovery must have
validated all of the following before returning a receipt:

- a clean synced checkout and the retained local ref;
- the exact final-artifact and optional evidence subjects;
- exactly the PR-description path in the final-artifact commit and exactly the
  two supplied recap record paths in an evidence commit;
- single-parent pin-source → final-artifact → optional evidence ordering, with
  the pin source subject equal to the preliminary push message below;
- canonical `state.md` lifecycle fields in the pin-source tree, including
  `oat_lifecycle: complete` and equal valid UTC completion/update timestamps;
- a pin-source `project-log.md` whose final entry is the canonical
  `oat-project-complete` completion seal;
- exactly one well-ordered links block pinned to the pin-source parent; and
- either equal local/remote final-artifact receipts, equal local/remote evidence
  receipts, or the one allowed unpublished-evidence state where checkout HEAD
  is the exact evidence child while both retained refs remain at its exact
  final-artifact parent.

Restore the returned `projectLinksPinCommit` as
`PROJECT_LINKS_PIN_COMMIT`, `projectRefCommit` as `PROJECT_REF_COMMIT`, and a
non-null `evidenceCommit` as `EVIDENCE_COMMIT`. Any candidate with a malformed
subject, path set, parent, links block, retained ref, or local/remote relation
fails closed. Do not fall through to a new pin-source publication after a
partial or contradictory candidate. This retry recognition is valid whether
the parent discovery record is still active or already complete.

Build the recovery arguments only for post-push revalidation of an unpublished
evidence receipt:

```bash
RECOVERY_ARGS=(
  --project-path "$ACTIVE_PROJECT_PATH"
  --retained-ref "$PROJECT_RETAINED_REF"
  --pr-artifact "$PR_DESCRIPTION_RELATIVE_PATH"
)
if [[ -n "$SELECTED_PROJECT_RECAP_RUN" ]]; then
  RECOVERY_ARGS+=(
    --evidence-path "$SELECTED_PROJECT_RECAP_RUN/manifest.json"
    --evidence-path "$SELECTED_PROJECT_RECAP_RUN/build-record.json"
  )
fi

parse_completion_receipts() {
  node -e '
const value = JSON.parse(process.argv[1]);
const sha = /^[0-9a-f]{40}$/;
if (value.status !== "recovered" || !sha.test(value.projectLinksPinCommit) || !sha.test(value.projectRefCommit)) process.exit(1);
if (value.evidenceCommit !== null && !sha.test(value.evidenceCommit)) process.exit(1);
if (typeof value.evidencePushRequired !== "boolean") process.exit(1);
process.stdout.write([
  value.projectLinksPinCommit,
  value.projectRefCommit,
  value.evidenceCommit ?? "-",
  String(value.evidencePushRequired),
].join("\t"));
' "$1"
}

```

Use this block only after the Step 3.65 router restored a candidate. Require
`EVIDENCE_PUSH_REQUIRED` to be `true` or `false`; no other output is accepted.

When the recovery result reports `evidencePushRequired: true`, publish the
existing checkout HEAD with `oat project push "$PROJECT_PATH" --json` before
continuing. Require `status: "pushed"` or `status: "up-to-date"`, the same
retained ref, and a receipt SHA exactly equal to `EVIDENCE_COMMIT`. This push
must not create a commit, rerender the PR artifact, or rewrite any receipt.
Re-run the recovery surface after the push and require the exact same pin,
final-artifact, and evidence SHAs with `evidencePushRequired: false`.

```bash
if [[ "$EVIDENCE_PUSH_REQUIRED" == "true" ]]; then
  RECOVERED_EVIDENCE_PUSH_OUTPUT=$(oat project push \
    "$PROJECT_PATH" --json) || exit 1
  RECOVERED_EVIDENCE_PUSH_FIELDS=$(node -e '
const value = JSON.parse(process.argv[1]);
if (!["pushed", "up-to-date"].includes(value.status)) process.exit(1);
if (!/^[0-9a-f]{40}$/.test(value.sha) || typeof value.ref !== "string") process.exit(1);
process.stdout.write(`${value.ref}\t${value.sha}`);
' "$RECOVERED_EVIDENCE_PUSH_OUTPUT") || exit 1
  IFS=$'\t' read -r RECOVERED_PUSH_REF RECOVERED_PUSH_SHA \
    <<< "$RECOVERED_EVIDENCE_PUSH_FIELDS"
  test "$RECOVERED_PUSH_REF" = "$PROJECT_RETAINED_REF" || exit 1
  test "$RECOVERED_PUSH_SHA" = "$EVIDENCE_COMMIT" || exit 1
  PUBLISHED_RECOVERY_JSON=$(node "$COMPLETION_RECEIPT_SCRIPT" \
    "${RECOVERY_ARGS[@]}") || exit 1
  PUBLISHED_RECOVERY_FIELDS=$( \
    parse_completion_receipts "$PUBLISHED_RECOVERY_JSON"
  ) || exit 1
  IFS=$'\t' read -r PUBLISHED_PIN_COMMIT PUBLISHED_REF_COMMIT \
    PUBLISHED_EVIDENCE_COMMIT PUBLISHED_EVIDENCE_PUSH_REQUIRED \
    <<< "$PUBLISHED_RECOVERY_FIELDS"
  test "$PUBLISHED_PIN_COMMIT" = "$PROJECT_LINKS_PIN_COMMIT" || exit 1
  test "$PUBLISHED_REF_COMMIT" = "$PROJECT_REF_COMMIT" || exit 1
  test "$PUBLISHED_EVIDENCE_COMMIT" = "$EVIDENCE_COMMIT" || exit 1
  test "$PUBLISHED_EVIDENCE_PUSH_REQUIRED" = "false" || exit 1
fi
```

When retry recognition did not set `PROJECT_REF_COMMIT`, publish the pin
source:

```bash
if [[ "$PROJECT_SCOPE" == "synced" && -z "$PROJECT_REF_COMMIT" ]]; then
  PROJECT_PUSH_OUTPUT=$(oat project push "$PROJECT_PATH" \
    --message "chore(oat): finalize project lifecycle" --json) || exit 1
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
parent-branch record commit finish the non-archive transaction when no recap is
selected. With a selected recap, the evidence commit in Step 10.6 must remain
the immediate child of the final artifact receipt, never the preliminary pin
source.

### Step 8: Archive Project (Conditional)

**Skip if `SHOULD_ARCHIVE` is false or `IS_DURABLE_PROJECT` is false.**

This conditional skips archive movement only; it does not skip the Step 3.7
seal append for an existing project log.

Archive happens after PR description generation (so artifacts are readable at tracked paths) but before commit+push (so the archive deletion is included in the commit).

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
`s3Path`, `summaryExportFile`, `lifecycleCommit`, and `warnings` fields for later reporting. Set
`ARCHIVE_PATH` from `archivePath`, set `SUMMARY_EXPORT_FILE` from
`summaryExportFile` (empty when null), then set `PROJECT_PATH="$ARCHIVE_PATH"`.

For a synced project, require a full `lifecycleCommit` SHA in the archive
report and set `LIFECYCLE_COMMIT` to it. This is the parent-branch record and
summary-export commit owned by archive; do not replace it with
`git rev-parse HEAD` and do not create another lifecycle commit.

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

#### Step 8.5: Finalize Archive-Aware Recap Links

Run this only when archive returned a `projectRecapExport`.

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
if [[ -z "$PROJECT_REF_COMMIT" ]]; then
  FINAL_PROJECT_PUSH_ARGS=("$PROJECT_PATH" \
    --message "chore(oat): publish final project links" --json)
  FINAL_PROJECT_PUSH_OUTPUT=$(oat project push \
    "${FINAL_PROJECT_PUSH_ARGS[@]}") || exit 1
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

When `SELECTED_PROJECT_RECAP_RUN is empty`, the final artifact push plus exact
record commit completes this transaction. When
`SELECTED_PROJECT_RECAP_RUN is non-empty`, Steps 10.5 and 10.6 additionally
attest the active recap within the project-ref history.

On retry, accept an already-complete record only after its exact-path commit is
verified and the final artifact push receipt still names the retained ref SHA.
If the final artifact push succeeded but the record commit did not, reuse the
validated `PROJECT_LINKS_PIN_COMMIT` and `PROJECT_REF_COMMIT` receipts and retry
only the record write/commit. If the record commit succeeded but recap evidence
did not, reuse both receipts and retry only recap finalization. Never create a
second lifecycle record commit, rerender the links against the final receipt,
or rewrite either history.

### Step 9: Regenerate Dashboard

Regenerate the repo state dashboard so the completion status is reflected before committing.

```bash
oat state refresh
```

### Step 10: Commit + Push Bookkeeping (Required)

Completion is not done until lifecycle changes are committed. This commit also
anchors commit durability for a selected durable-project recap. Do not push yet
when recap attestation is pending.

Expected changes may include:

- `{PROJECT_PATH}/state.md`
- `{PROJECT_PATH}/implementation.md` (if touched earlier in the lifecycle closeout)
- `{PROJECT_PATH}/plan.md` (if review receive just ran)
- `{PROJECT_PATH}/pr/project-pr-*.md` (PR description artifact)
- `.oat/state.md` is regenerated locally in Step 9 but should not be staged; it is generated dashboard state and normally gitignored.
- `.oat/config.local.json` (if `activeProject` cleared)
- Shared-project deletions or synced-project record updates (if archived)
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
    else
      git commit --only "$SYNCED_RECORD_PATH" \
        -m "chore(oat): complete synced project ${PROJECT_NAME}"
      LIFECYCLE_COMMIT=$(git rev-parse HEAD)
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
- The lifecycle bookkeeping commit is the artifact commit for final recap
  durability. It must contain the final run's immutable paths.
- Snapshot unrelated working-tree changes before finalization so the shared
  finalizer can verify they remain unchanged.

### Step 10.5: Re-attest Final Project Recap

Skip when no final recap was selected, for local-scope projects, when the
selected recap is already durable solely through independently verified publish
evidence, or when Step 7.5 restored an exact `EVIDENCE_COMMIT`. In the recovered
evidence case, verify the selected run's manifest and build record are the two
exact paths in that commit and continue without re-attesting or rewriting them.

For an archived recap, consume the exact `projectRecapExport` values recorded
in Step 8. Plan finalization through
`oat-explainer-kit/scripts/finalize-tracked-run.mjs#planTrackedRunFinalization`
with:

- `runRoot`: `projectRecapExport.exportRoot`;
- `manifestPath`:
  `projectRecapExport.exportRoot/projectRecapExport.manifest.relativePath`;
- commitMode: `completion-bookkeeping`;
- relocatedFrom: `sourceRunRoot`; and
- context `artifactCommit`: the full `LIFECYCLE_COMMIT` SHA.

For a durable project that was not archived, use the selected active run and
omit `relocatedFrom`, but keep the same `completion-bookkeeping` mode. Resolve
the finalizer repository root as `ACTIVE_PROJECT_PATH`, not the parent
checkout. Use `PROJECT_REF_COMMIT`, not the parent-branch `LIFECYCLE_COMMIT`,
as the active recap artifact commit. Its immutable paths must be present in
that exact project-ref commit. The parent record commit is separate durability
evidence for discovery and must never be substituted into the project-ref
history.

When the finalization plan is `complete` with `built-needs-review` or `failed`,
preserve that exact outcome and skip both attestation and the evidence commit.
These evidence-only plans are already complete for lifecycle retention and
remain unpublishable. Call `verifyTrackedRunFinalization(...)` on the complete
plan; it must not promote either outcome to `built-durable`.

For archive completion, the lifecycle bookkeeping commit is the artifact
commit. For non-archive synced completion, `PROJECT_REF_COMMIT` is the artifact
commit. Call the compatible
core's `recordDurability(...)` with the finalizer's planned request. Submit only immutable paths under `projectRecapExport.exportRoot` as commit evidence for an archived recap; `manifest.json` and `build-record.json` are mutable records and
must not appear in that evidence path list. The successful exported-path
attestation supersedes the prior active-path evidence. Verify the resulting
manifest records the old evidence in `supersedes` and reports the final
tracked export path.

Never submit the gitignored archive path as commit evidence. Local archive
presence cannot make a recap durable.

A failed exported recap attestation does not fail project completion. Preserve
the tracked export, report `built-not-durable`, retain actionable recovery
details, and continue to the evidence commit.

### Step 10.6: Commit Evidence + Push

When Step 10.5 ran and Step 7.5 did not restore `EVIDENCE_COMMIT`, create the evidence update. Commit only the exported `manifest.json` and `build-record.json` as the evidence update, including warning-bearing records from a failed attestation. On failure, commit the warning-bearing `manifest.json` and `build-record.json`. Run
`verifyTrackedRunFinalization(...)` with the artifact commit, immediate evidence
commit parent/order, exact evidence paths, attestation outcome, and unchanged
unrelated-change snapshots.

Archive completion is exactly two commits when recap attestation runs:

1. lifecycle bookkeeping, including the tracked recap export; then
2. final recap evidence records.

Push once after both commits exist so they travel together. If no attestation
ran, push the lifecycle bookkeeping commit once. If verification detects
contamination or wrong commit order, do not push. If push fails, report the
failure and do not claim completion is fully recorded.

The evidence update remains a direct, exact-path Git commit. Stage only the
reported exported `manifest.json` and `build-record.json` under tracked
`.oat/repo/reference/project-recaps/`:

```bash
UNRELATED_STAGED_PATCH_BEFORE=$(git diff --cached --binary)
git add -- "$EXPORTED_MANIFEST_PATH" "$EXPORTED_BUILD_RECORD_PATH"
git commit --only -m "chore(oat): attest final project recap" -- \
  "$EXPORTED_MANIFEST_PATH" "$EXPORTED_BUILD_RECORD_PATH"
EVIDENCE_COMMIT=$(git rev-parse HEAD)
test "$(git rev-parse "$EVIDENCE_COMMIT^")" = "$LIFECYCLE_COMMIT"
test "$(git diff --cached --binary)" = "$UNRELATED_STAGED_PATCH_BEFORE"
```

Verify the evidence commit contains exactly those two paths, the lifecycle
commit is its immediate parent, unrelated-change snapshots remain unchanged,
and then push once. The archive command does not own this evidence transition;
use the direct exact-path commit above.

For a non-archive synced recap, stage and commit only the active run's reported
`manifest.json` and `build-record.json` from inside `ACTIVE_PROJECT_PATH`. The
non-archive recap evidence commit must be the immediate child of
`PROJECT_REF_COMMIT` in the project checkout. Verify exact commit containment
and the unchanged unrelated-state snapshot, then publish the evidence commit
with `oat project push`, retaining the custom ref and checkout. Require the
push receipt SHA to equal the evidence commit. Recovery reuses the existing
project-ref artifact commit and parent-branch record commit; it never moves
active recap files into archive-export paths.

Use the same path-confined commit inside the synced checkout:

```bash
ACTIVE_MANIFEST_RELATIVE_PATH="$SELECTED_PROJECT_RECAP_RUN/manifest.json"
ACTIVE_BUILD_RECORD_RELATIVE_PATH="$SELECTED_PROJECT_RECAP_RUN/build-record.json"
UNRELATED_PROJECT_STAGE_BEFORE=$(git -C "$ACTIVE_PROJECT_PATH" diff --cached --binary)
git -C "$ACTIVE_PROJECT_PATH" add -- \
  "$ACTIVE_MANIFEST_RELATIVE_PATH" "$ACTIVE_BUILD_RECORD_RELATIVE_PATH"
git -C "$ACTIVE_PROJECT_PATH" commit --only \
  -m "chore(oat): attest final project recap" -- \
  "$ACTIVE_MANIFEST_RELATIVE_PATH" "$ACTIVE_BUILD_RECORD_RELATIVE_PATH"
EVIDENCE_COMMIT=$(git -C "$ACTIVE_PROJECT_PATH" rev-parse HEAD)
test "$(git -C "$ACTIVE_PROJECT_PATH" rev-parse "$EVIDENCE_COMMIT^")" = \
  "$PROJECT_REF_COMMIT"
test "$(git -C "$ACTIVE_PROJECT_PATH" diff --cached --binary)" = \
  "$UNRELATED_PROJECT_STAGE_BEFORE"
```

When Step 7.5 restored `EVIDENCE_COMMIT`, do not stage or commit recap records
again. Require the retained remote ref to equal that exact evidence SHA, keep
its immediate parent equal to `PROJECT_REF_COMMIT`, and preserve the recovered
`PROJECT_LINKS_PIN_COMMIT`. The parent discovery-record commit remains confined
to its one canonical path, and all unrelated staged-state snapshots must remain
byte-for-byte unchanged.

### Step 11: Open PR in GitHub (Conditional)

**Skip if `SHOULD_OPEN_PR` is false.**

**CRITICAL — Strip YAML frontmatter before submitting to GitHub.**
The local artifact file contains YAML frontmatter (`---` delimited block at the top) for OAT metadata. This frontmatter MUST NOT appear in the GitHub PR body. Before passing the file to `gh pr create`, strip everything from the start of the file through and including the closing `---` line. Verify the resulting body starts with the markdown heading (e.g., `# feat: ...`), not YAML keys.

Steps:

1. Locate the PR description artifact at `{PROJECT_PATH}/pr/project-pr-*.md`.
2. Write the stripped body to a temporary file (remove all lines from the opening `---` through the closing `---`, inclusive).
3. Verify the temp file does not start with YAML frontmatter keys.
4. Create the PR from the branch already pushed in Step 10.6:

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
commit or the optional evidence child.

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
   gh pr edit "$PR_REF" --body-file "$TMP_BODY"
   ```

5. Clean up the temp file.

Failure handling:

- If `gh` is missing, warn and print the path to the regenerated artifact body so the user can paste it into the PR manually. Do not fail the skill.
- If `gh pr edit` fails (e.g. PR was merged between Step 2 and now, or the auth token lacks edit permission), warn and continue. Step 12's completion summary should call out that the PR body was not updated and surface the artifact path so the user can update it manually.
- Never re-archive or re-commit on failure here — the lifecycle bookkeeping
  and any recap evidence update in Step 10.6 already shipped.

### Step 12: Confirm to User

Show user:

- "Project **{PROJECT_NAME}** marked as complete."
- If archived: "Archived location: **{PROJECT_PATH}**"
- If S3 archive sync ran: include `ARCHIVE_S3_CONTEXT` when the archive command reported profile/region details. If only `ARCHIVE_S3_PATH` is available, include the S3 destination and note that profile/region context was not reported by the command. Never echo raw credentials (`AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, etc.).
- Include both lifecycle bookkeeping and recap evidence commit hashes when
  attestation ran, plus the single push result.
- Report the final recap outcome and tracked reference root. A failed
  attestation is a warning with `built-not-durable`, not a project-completion
  failure.
- If PR was opened: include the PR URL.
- If `oat_pr_url` is present, show it in the completion summary even when PR creation was skipped because the project already tracked an open PR.
- If Step 11.5 ran, report whether the PR description was synced (e.g. `PR description synced: <PR URL>`) or warn that the sync failed and surface the artifact path so the user can update it manually.
