---
name: oat-project-summary
description: Use when the user requests or confirms summarizing an active OAT project — e.g. "summarize the project", "generate the summary", "run oat-project-summary", or confirms a previously offered summary run. Do NOT auto-invoke when implementation completes. Generates summary.md from project artifacts as institutional memory.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Bash(jq:*), Bash(oat config:*), Bash(oat decision:*), Bash(oat pjm:*), Bash(oat project log:*), Bash(oat project push:*), Bash(oat project scope:*), Bash(oat template:*), Bash(oat tools:*), Glob, Grep, AskUserQuestion
metadata:
  version: 1.5.10
---

# Project Summary

Generate a durable project summary artifact from project lifecycle artifacts.

## Hook-safe exact-path commits

Before a parent-branch commit, verify `oat internal commit-paths --help` succeeds. If unavailable, stop and update the OAT CLI; never fall back to a staged-index or pathspec-only commit. Set `COMMIT_IDENTITY` to a unique operation/artifact identity before the first attempt and retain it for every retry; use a new identity for a new operation. Pass only the exact produced file list, including tracked removals and both names of a rename. A blocked/failed result stops the workflow; retain its receipt and follow its diagnostics. Hooks remain enabled. Synced project artifacts continue through `oat project push`.

## Purpose

Produce a `summary.md` that serves as institutional memory — capturing what was built, why decisions were made, what tradeoffs occurred, and what follow-up work was identified. This artifact is distinct from the PR description: summary.md is reflective and thorough; PR descriptions are reviewer-oriented and actionable.

## Prerequisites

**Required:** Active project with `implementation.md` that has meaningful progress (at least one completed task; in brief and goal modes, at least one accepted phase-unit).

## Mode Assertion

**OAT MODE: Summary Generation**

**Purpose:** Synthesize a structured summary from project artifacts, grounded in what actually happened.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what's happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ SUMMARY
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print step indicators, e.g.:
  - `[1/6] Resolving project + reading artifacts…`
  - `[2/6] Checking project log + existing summary…`
  - `[3/6] Generating / updating summary sections…`
  - `[4/6] Rolling up project observations…`
  - `[5/6] Promoting key decisions to reference/decisions/ (if PJM is available)…`
  - `[6/6] Committing…`

**BLOCKED Activities:**

- ❌ No implementation work
- ❌ No hand-editing project artifacts (other than summary.md)
- ❌ No creating tasks or modifying plan
- ❌ No hand-authoring decision files or editing `reference/decisions/index.md` inside its managed markers

**ALLOWED Activities:**

- ✅ Reading all project artifacts
- ✅ Creating or updating summary.md
- ✅ Using `oat project log append` and `oat project log rollup` as the only
  writers for project-log promotion and roll-up
- ✅ Offering follow-up-marked project-log entries to
  `oat-pjm-add-backlog-item`
- ✅ Committing summary.md changes
- ✅ Promoting the summary's Key Decisions into canonical `reference/decisions/` records via `oat decision new` (Step 7), gated on the PJM tool pack being available

**Self-Correction Protocol:**
If you catch yourself:

- Writing implementation code → STOP
- Modifying plan.md or implementation.md → STOP
- Adding speculative future work → STOP (summary captures what happened, not what should happen next — except Follow-up Items from deferred work)

**Recovery:**

1. Acknowledge the deviation
2. Return to summary generation
3. Keep content grounded in artifacts

## Artifact Hygiene

Artifact hygiene contract: Before finishing or committing, format every file you created or edited. Use the concrete write/fix formatting command supplied by the governing plan, task, or brief. If none is usable, discover the repository's documented write/fix command from applicable `AGENTS.md`/`CLAUDE.md` instructions and relevant package manifests; do not infer or hardcode a formatter. Prefer a file-scoped invocation when supported, and avoid rewriting unrelated files. If no command is discoverable, warn once with `no format command discovered in repo instructions; skipping`, then continue.

After formatting, run only repository checks relevant to the files changed;
writing prose artifacts does not imply unrelated full test suites.

## Process

### Step 0: Resolve Active Project

OAT stores active project context in `.oat/config.local.json` (`activeProject`, local-only).

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

**If `PROJECT_PATH` is missing/invalid:**

- Ask the user for `{project-name}`
- Set `PROJECT_PATH` to `${PROJECTS_ROOT}/{project-name}`
- Write it for future use:
  ```bash
  mkdir -p .oat
  oat config set activeProject "$PROJECT_PATH"
  ```

**If `PROJECT_PATH` is valid:** derive `{project-name}` as the directory name (basename of the path).

### Step 1: Validate Implementation State

```bash
test -f "$PROJECT_PATH/implementation.md"
```

**If missing:** Block and tell user: "No implementation.md found. Summary requires at least one completed task."

**If exists:** Read the file. Check for at least one task with `**Status:** completed`. If no completed tasks, warn: "No completed tasks found. Summary will be minimal."

In brief modes the prerequisite is one accepted phase-unit instead: a
`**Status:** completed` line directly under a `## Phase` heading of the
journal, before that phase's first `### Task` record (a completed execution
record is not an accepted unit). If no phase-unit is accepted, warn: "No
accepted phase-units found. Summary will be minimal."

### Step 2: Read Project Artifacts

For `oat_workflow_mode: lite`, use the reduced artifact contract and skip the
ordinary artifact list below. Read the five `plan.md` sections `Summary`,
`Decisions`, `Assumptions`, `Out of Scope`, and `Validation Criteria`, then read
`implementation.md` for task outcomes and the shipped results in `Final
Summary (for PR/docs)`. Read `state.md` only for routing metadata. A lite
project accepts `discovery.md`, `spec.md`, and `design.md` as absent; do not
read or require them. Ground the summary in what actually shipped, with
`implementation.md` taking precedence over the plan.

For `oat_workflow_mode: brief`, read the brief's sources instead of the
ordinary list below; `discovery.md`, `spec.md`, and `design.md` are absent by
design:

| Source                                                                             | Use                                                                                                   |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `plan.md` Goal, Outcomes, Approach                                                 | Overview and what the project set out to do; audit What Was Implemented against the numbered Outcomes |
| `plan.md` Decisions, Constraints and Out of Scope                                  | Key Decisions and Tradeoffs Made                                                                      |
| `plan.md` phases and `## Reviews`                                                  | Phase intent and review dispositions                                                                  |
| `implementation.md` phase sections                                                 | Accepted phases, anchors, execution records, verification evidence, deviations, and `Brief deltas`    |
| `implementation.md` Final Summary                                                  | Shipped results; takes precedence over the brief's plans                                              |
| `state.md`, `project-log.md`, `oat-execution-learnings.md`, `references/research/` | Same roles as below, when present                                                                     |

For `oat_workflow_mode: goal`, read the brief sources above, plus the
`## Milestones` table (organize What Was Implemented by milestone), the
`state.md` delivery registry (`oat_deliveries`: each delivery's scope, members
and endpoint observation are shipped results), and, after a declaration, the
outcome audit (`oat_goal_outcome_audit`) as the authoritative per-outcome
disposition, with deferred and retired obligations listed under Follow-up
Items.

For every other workflow mode, read all available artifacts for synthesis:

- `"$PROJECT_PATH/discovery.md"` — initial request, decisions, constraints
- `"$PROJECT_PATH/spec.md"` — requirements, goals (optional — may not exist in quick mode)
- `"$PROJECT_PATH/design.md"` — architecture, key decisions (optional — may not exist in quick mode)
- `"$PROJECT_PATH/plan.md"` — phases, tasks, reviews, deferred items
- `"$PROJECT_PATH/implementation.md"` — task outcomes, deviations, challenges, review notes
- `"$PROJECT_PATH/state.md"` — associated issues, workflow mode
- `"$PROJECT_PATH/project-log.md"` — optional append-only workflow
  observations; never hand-edit
- `"$PROJECT_PATH/oat-execution-learnings.md"` — optional append-only
  autonomous-run observations and recommendations

**Priority for content:** Implementation.md outcomes take precedence over design.md plans. Summary should reflect what actually happened, not what was planned.

If `oat-execution-learnings.md` is absent, do not infer autonomous learnings
from other artifacts and do not add an Autonomous Execution Learnings section.

### Step 2.5: Check Project Log and Offer Ledger Graduation

Run the read-only status probe before authoring or refreshing `summary.md`:

```bash
PROJECT_LOG_CHECK=$(oat project log check --project "$PROJECT_PATH" --json)
PROJECT_LOG_PROMOTION_APPENDED="false"
```

Route on the structured result. `status: "absent"` is inert. When the entry
counts show one or more entries, keep the log in the summary flow even if task,
revision, and autonomous-learning tracking fields are otherwise current.

`status: "ambiguous"` (exit 1, with an `ambiguity` reason) means the log's
section markers are readable two ways — or a seal is physically present outside
the parseable region — so the entry counts are not trustworthy. Stop the
project-log part of this skill there: report the `ambiguity` reason verbatim,
do not treat the log as empty, do not graduate the ledger, and do not append;
the operator repairs the file (the mutators refuse it for the same reason).
`summary.md` may still be authored from the other artifacts, with the log
named as unreadable.

`sealed: true` means the project log already carries its completion seal and is
closed to further entries. Skip the ledger graduation below entirely — do not
offer it, and append nothing. Report that the log is sealed and name the seal
heading from the probe's `seal` field, then continue with the rest of this
skill; `summary.md` is still authored or refreshed as normal. This is a real
refusal in the CLI, not a convention: `oat project log append` rejects any
non-seal append onto a sealed log with `status: "sealed"` and a non-zero exit,
so attempting the promotion would fail the step rather than skip it.

Before roll-up, inspect `project`-scoped judgments for observations that are
reusable across projects and offer ledger graduation. For every observation the
user selects, invoke `oat project log append` with the original judgment type
and area, `--scope general`, and a body that references the original entry's
exact heading. The new body may explain why the observation is reusable, but it
must not copy the full original entry. Request the append result as structured
JSON; whenever it reports `status: "appended"`, set
`PROJECT_LOG_PROMOTION_APPENDED="true"` so the commit step includes the mutated
project log.

Ledger graduation is append-only: never edit, annotate, strike through, or add
side metadata to the original entry. The newly appended `general` judgment is
the promotion, and the later `rollup` command naturally selects it for the
ledger.

### Step 3: Check for Existing Summary

```bash
test -f "$PROJECT_PATH/summary.md"
```

**If exists (re-run mode):**

1. Read summary.md frontmatter tracking fields:
   - `oat_summary_last_task` — last task ID when summary was generated
   - `oat_summary_revision_count` — revision phases at generation time
   - `oat_summary_includes_revisions` — which `p-revN` phases are reflected

2. Compare to current state:

   ```
   current_last_task = highest completed task ID in implementation.md
   current_rev_count = count of p-revN phases in plan.md
   current_rev_list  = list of p-revN phase IDs in plan.md
   ```

3. Determine update scope:
   - If `oat-execution-learnings.md` exists, compare its dated entry
     identifiers (timestamp, category, and title) with the source pointers in
     the existing `## Autonomous Execution Learnings` section. Treat missing,
     added, or changed recommendations as `learnings_changed`.
   - If `oat_summary_last_task == current_last_task` AND `oat_summary_revision_count == current_rev_count` AND learnings are absent or unchanged AND the project-log check reports `status: "ok"` with no entries: **No changes detected. Skip update.** Report: "Summary is current. No updates needed."
   - If `current_rev_count > oat_summary_revision_count`: New revision phases exist. Update: Revision History, What Was Implemented, Follow-up Items.
   - If `current_last_task > oat_summary_last_task`: New tasks completed. Update: What Was Implemented, Notable Challenges, Tradeoffs Made.
   - If `learnings_changed`: update Autonomous Execution Learnings even when
     task and revision tracking fields are unchanged.

**If does not exist (first run):**

Copy template: `oat template resolve summary --output "$PROJECT_PATH/summary.md"`

**Brief modes (`oat_workflow_mode: brief` or `goal`): freshness by phase fingerprint.**
Replace the task and revision comparison above with
`oat_summary_phase_fingerprint`, a stable hash of the ordered accepted phase
IDs; for each accepted phase its `**Head:**`, its `**Status:**` line, and the
`Status` of the latest `## Reviews` `code` row for that phase; and the brief's
Goal, Outcomes, and Decisions sections with whitespace normalized. Compute it
in bash from the project root with `PROJECT_PATH` set:

````bash
brief_summary_marker() {
  awk -v id="$1" -v key="$2" '
    /^[ \t]*(```|~~~)/ { fence = !fence; next }
    fence { next }
    /^#/ { owner = (index($0, "## Phase " id ": ") == 1); next }
    !owner || found { next }
    index($0, "**" key ":** ") == 1 {
      v = substr($0, length("**" key ":** ") + 1); sub(/[ \t]+$/, "", v); print v; found = 1
    }
  ' "$PROJECT_PATH/implementation.md"
}

brief_summary_fingerprint() {
  local plan="$PROJECT_PATH/plan.md" id status head review section
  {
    for id in $(awk '
      /^[ \t]*(```|~~~)/ { fence = !fence; next }
      fence { next }
      /^## Phase (p[0-9]+|p-rev[0-9]+): / { id = $3; sub(/:$/, "", id); print id }
    ' "$plan"); do
      status=$(brief_summary_marker "$id" Status)
      [ "$status" = completed ] || continue
      head=$(brief_summary_marker "$id" Head)
      review=$(awk -v id="$id" '
        /^## Reviews[ \t]*$/ { in_reviews = 1; next }
        in_reviews && /^## / { exit }
        !in_reviews || !/^\|/ { next }
        {
          n = split($0, cells, "|")
          for (i = 2; i < n; i++) { c = cells[i]; gsub(/^[ \t]+|[ \t]+$/, "", c); cells[i] = c }
          if (!sc) { for (i = 2; i < n; i++) { if (cells[i] == "Scope") sc = i; if (cells[i] == "Type") ty = i; if (cells[i] == "Status") st = i }; next }
          if (cells[sc] == id && cells[ty] == "code") last = cells[st]
        }
        END { print (last == "" ? "-" : last) }
      ' "$plan")
      printf 'phase=%s head=%s status=%s review=%s\n' "$id" "${head:--}" "$status" "$review"
    done
    for section in Goal Outcomes Decisions; do
      printf 'section=%s ' "$section"
      awk -v heading="## $section" '
        /^## / { in_section = ($0 == heading); next }
        in_section { print }
      ' "$plan" | tr -s ' \t\n' '   ' | sed 's/^ //; s/ $//'
      printf '\n'
    done
  } | { command -v sha256sum >/dev/null 2>&1 && sha256sum || shasum -a 256; } | cut -d' ' -f1
}

CURRENT_PHASE_FINGERPRINT=$(brief_summary_fingerprint)
````

**Goal fragment.** In goal mode the fingerprint also covers the delivery IDs
at endpoint, so a delivery newly observed at its agreed endpoint requires a
refresh. Append one `delivery=<dNN>` line per registry entry with
`status: at_endpoint` or a recorded `endpoint_attainment`, in registry order,
to the hashed input:

```bash
goal_summary_deliveries() {
  oat project status --project-path "$PROJECT_PATH" --field project.deliveries 2>/dev/null |
    node -e 'let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      for (const d of JSON.parse(s.trim() || "null") ?? [])
        if (d.status === "at_endpoint" || d.endpoint_attainment) console.log(`delivery=${d.delivery_id}`);
    })'
}

if [ "$(oat project status --project-path "$PROJECT_PATH" --field project.workflowMode 2>/dev/null)" = goal ]; then
  CURRENT_PHASE_FINGERPRINT=$(
    { printf '%s\n' "$CURRENT_PHASE_FINGERPRINT"; goal_summary_deliveries; } |
      { command -v sha256sum >/dev/null 2>&1 && sha256sum || shasum -a 256; } | cut -d' ' -f1
  )
fi
```

- No existing summary, or `oat_summary_phase_fingerprint` differs from
  `CURRENT_PHASE_FINGERPRINT`: refresh. Update What Was Implemented from the
  newly accepted phases, Revision History when an accepted `p-revN` is new, and
  Follow-up Items from review dispositions.
- Fingerprint unchanged: no phase-driven update. The autonomous-learnings and
  project-log triggers above stay independent and can still require a refresh.
- A brief or goal summary never reads or writes `oat_summary_last_task`; execution
  records are not units. `oat-project-complete` recomputes the same
  fingerprint with this fragment to decide whether `summary.md` is stale.

### Step 4: Generate / Update Summary Sections

For each section, synthesize content from the relevant artifacts. Apply these rules:

**Grounding rule:** Prefer implementation.md outcomes over design.md plans. If the implementation diverged from the design, reflect what actually happened.

**Design delta rule:** Populate `Design Deltas` from both direct implementation deviations and review-received design drift decisions recorded in `implementation.md`. A review finding may decide that shipped implementation is defensible and the artifact is stale; when `implementation.md` records that acceptance, carry it forward as a design delta with the rationale and follow-up artifact disposition.

**Section omission rule:** If a section would have no meaningful content, omit it entirely (remove the heading). Do not leave empty sections or "N/A" placeholders.

**Conciseness constraint (NFR3):** Target under 200 lines total. If a draft exceeds this, trim narrative sections (What Was Implemented, Notable Challenges) to essential points. Revision History entries: 2-3 sentences per round max.

**Minimum viable summary:** Overview + What Was Implemented + Key Decisions. All other sections are included only when they have content worth preserving.

**Lite section sources:**

Use this table only for `oat_workflow_mode: lite`. It maps every canonical lite
plan section and shipped implementation results without requiring discovery,
spec, or design artifacts.

| Summary Section      | Primary Lite Sources                                          |
| -------------------- | ------------------------------------------------------------- |
| Overview             | plan.md `Summary`; implementation.md `Final Summary`          |
| What Was Implemented | implementation.md shipped results and task outcomes           |
| Key Decisions        | plan.md `Decisions`; implementation.md accepted decisions     |
| Tradeoffs Made       | plan.md `Assumptions`; implementation.md decisions            |
| Follow-up Items      | plan.md `Out of Scope`; implementation.md deferred results    |
| Integration Notes    | plan.md `Validation Criteria`; implementation.md test results |
| Exit-Gate Waivers    | state.md `oat_implement_exit_gate.waivers`                    |

**Non-lite section sources:**

| Section                        | Primary Sources                                                                |
| ------------------------------ | ------------------------------------------------------------------------------ |
| Overview                       | discovery.md initial request, spec.md problem statement                        |
| What Was Implemented           | implementation.md task outcomes, plan.md phase structure                       |
| Key Decisions                  | design.md decisions, implementation.md notes/decisions                         |
| Design Deltas                  | implementation.md deviations table; review-received design drift notes         |
| Notable Challenges             | implementation.md issues/blockers in task notes                                |
| Tradeoffs Made                 | implementation.md decisions, design.md tradeoff sections                       |
| Integration Notes              | implementation.md notes about cross-cutting concerns                           |
| Revision History               | plan.md p-revN phases, implementation.md revision notes                        |
| Follow-up Items                | implementation.md deferred findings, plan.md deferred items                    |
| Associated Issues              | state.md `associated_issues` field                                             |
| Workflow Observations          | project-log.md via `oat project log rollup` only                               |
| Autonomous Execution Learnings | oat-execution-learnings.md dated entries                                       |
| Explainer Outcome              | project-recap `manifest.json` and `qa/result.json`, or the recorded recap skip |
| Exit-Gate Waivers              | state.md `oat_implement_exit_gate.waivers`                                     |

**Explainer Outcome (conditional):**

When a project-recap attempt or a recorded recap skip exists, render this
section with exactly one item. A run that happened uses the first form:

```markdown
## Explainer Outcome

- **project-recap:** {generated | generated — needs review | failed} — `{run path}`{optional reason or cause}
```

A recap that did not run because persisted intent records a skip uses the
second form, which has a reason and no run path:

```markdown
## Explainer Outcome

- **project-recap:** skipped — {skip reason}
```

Include exactly one concise item with its recipe and run path or skip reason:

- `generated` for manifest outcome `built`;
- `generated — needs review` for `built-needs-review`, including the reason
  from `qa/result.json`;
- `failed` for `failed` or `incomplete`, including the sanitized cause; and
- `skipped` only when persisted recap intent resolves to skip.

Use `manifest.json` and `qa/result.json` as the source of truth for a run, and
the persisted recap intent for a skip. Refresh the existing item instead of
appending a duplicate.

Omit `Explainer Outcome` only when no project-recap attempt and no persisted
recap skip exist. A failed or skipped recap remains visible as its own product
outcome; do not reinterpret it as project implementation failure.

**Exit-Gate Waivers (conditional):**

When `oat_implement_exit_gate.waivers` in `state.md` is non-empty, render
`## Exit-Gate Waivers`. Render one item per entry in
`oat_implement_exit_gate.waivers`, in stored order; never merge, summarize
away, or drop an entry:

```markdown
## Exit-Gate Waivers

- `{from_commit short}..{to_commit short}` ({effective-delta-v1 | effective-delta-v2}) waived by {waived_by} at {waived_at}: {reason}
```

Copy `waived_by` and `reason` exactly as recorded. A waiver is an operator's
recorded decision, not something this skill infers or adds. Omit the section
only when the list is absent or empty.

**Autonomous Execution Learnings (conditional):**

When `"$PROJECT_PATH/oat-execution-learnings.md"` exists, synthesize
`## Autonomous Execution Learnings` as actionable recommendations grouped
under exactly these categories:

- **Agent-instruction updates** — durable skill, agent-rule, or instruction
  changes;
- **Cloud-environment improvements** — image, setup, credentials,
  provisioning, tool-availability, or environment-readiness changes;
- **Code follow-ups** — concrete product or toolkit code changes not completed
  by this project;
- **Workflow issues** — lifecycle, gate, review, dispatch, or orchestration
  process changes.

For each source entry:

1. Use its `Observation`, `Impact`, and `Recommendation` fields to decide
   whether it contains an actionable recommendation. Do not copy raw run notes
   that have no durable action.
2. Place each recommendation in the single best-fit category above. The source
   taxonomy (`gotcha`, `efficiency`, `documentation-gap`,
   `candidate-skill-content`, `decision`, `environment-limited`) is evidence,
   not a one-to-one output mapping.
3. Write a concise action plus one-line rationale. Preserve uncertainty and
   environment-limited status; do not claim an unverified fix.
4. End the item with a relative link to `oat-execution-learnings.md` and the
   exact source entry identifier (`timestamp — category — title`). Link to the
   entry heading anchor when one exists; otherwise link to the file and include
   the identifier in the link text so the entry remains traceable.
5. Deduplicate recommendations that describe the same action, while retaining
   pointers to every supporting source entry.

Omit empty category subheadings. If the learnings file contains no actionable
entries, omit the entire section. If the file is absent, this behavior is inert:
remove the template placeholder during a first render and make no
learnings-driven update on a re-run.

**Workflow Observations coexistence contract:**

Keep `## Workflow Observations` and `## Autonomous Execution Learnings` as
distinct summary sections. Author the autonomous-execution section first, then
perform the project-log roll-up in Step 6. Because the roll-up command writes
every project-log entry, keep the project-log observation in Workflow
Observations and represent any overlap from Autonomous Execution Learnings with
a one-line cross-reference instead of copying it there. The roll-up command
remains the only writer of Workflow Observations—never hand-implement its
section or ledger writes.

**For incremental updates (re-run):**

Only update sections affected by the new content. Do not rewrite the entire summary. Preserve existing section content and append/modify as needed.

### Step 5: Update Summary Frontmatter

After generating/updating sections:

```yaml
---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: { today }
oat_generated: true
oat_summary_last_task: { highest completed task ID }
oat_summary_revision_count: { count of p-revN phases }
oat_summary_includes_revisions: [{ list of p-revN IDs reflected }]
---
```

In brief and goal modes write `oat_summary_phase_fingerprint: {CURRENT_PHASE_FINGERPRINT}`
(Step 3) and omit `oat_summary_last_task`; keep `oat_summary_revision_count`
and `oat_summary_includes_revisions` as informational fields.

### Step 6: Roll Up Project Observations and Offer Backlog Graduation

Run this step after `summary.md` has been authored or refreshed, including the
distinct `## Autonomous Execution Learnings` section when its source artifact
exists.

**Goal terminal deferral.** When `oat_workflow_mode` is `goal` and this run
comes before `pr` in the post-implement sequence (`oat_post_implement_sequence`
lists `pr` but not yet among its completed steps), write only files under
`$PROJECT_PATH`: skip the `oat project log rollup` call below (it appends to
the repository ledger) and all of Step 7 (decision-record promotion and the
regenerated decisions index), and report them as deferred until `pr` has
registered the terminal delivery. A repo-level commit after the terminal
milestone's reviewed revision is not bookkeeping (brief contract 12.8), so it
would make the terminal subject undeliverable for the terminal registration in
the PR skill's Step 1.5. Perform the deferred writes in the summary run that
follows `pr`: a `summary` step configured after `pr`, or the summary refresh at
completion, which the goal fingerprint fragment (Step 3) requires once the
terminal delivery reaches its endpoint. Both writes are idempotent, so the
later run needs no extra state. Registered deliveries are unaffected: they are
judged against their observed member revisions.

Before the roll-up or decision promotion mutates repository-wide outputs,
preflight the owned paths and snapshot unrelated staged state:

```bash
DECISIONS_ROOT=".oat/repo/reference/decisions"
DECISION_INDEX_PATH="$DECISIONS_ROOT/index.md"
PROMOTED_DECISION_PATHS=()
DECISION_INDEX_CHANGED="false"
PROJECT_LOG_LEDGER_APPENDED="false"
PROJECT_LOG_LEDGER_PATH=$(oat config get workflow.projectLogLedgerPath 2>/dev/null || true)
OWNED_STAGE_PATHS=("$PROJECT_PATH/summary.md" "$PROJECT_PATH/project-log.md" "$DECISIONS_ROOT")
if [ -n "$PROJECT_LOG_LEDGER_PATH" ]; then
  OWNED_STAGE_PATHS+=("$PROJECT_LOG_LEDGER_PATH")
fi
git diff --cached --quiet -- "${OWNED_STAGE_PATHS[@]}" || {
  echo "oat: summary-owned output is already staged; refusing to mix staged state" >&2
  exit 1
}
UNRELATED_STAGED_PATCH_BEFORE=$(git diff --cached --binary)
```

This preflight intentionally leaves unrelated staged paths in place. Step 8
must reproduce their staged patch byte-for-byte after its exact-path commits.

When Step 2.5 found entries, run:

```bash
test -n "$PROJECT_LOG_LEDGER_PATH" || exit 1
PROJECT_LOG_ROLLUP=$(oat project log rollup --project "$PROJECT_PATH" --json)
```

`PROJECT_LOG_LEDGER_PATH` must be the effective resolved path, including the
default when no override exists. If it cannot be resolved, stop before roll-up
because a later `ledgerOutcome: "appended"` could not be staged safely.

Route only on the structured `ProjectLogRollupResult`:

- `status: "ok"` with `ledgerOutcome: "appended"`: set
  `PROJECT_LOG_LEDGER_APPENDED="true"` and proceed.
- `status: "ok"` with `ledgerOutcome: "deduplicated"`: proceed without staging
  the unchanged ledger.
- `status: "ok"` with `ledgerOutcome: "skipped_permitted"`: proceed and report
  that the ledger was permissibly skipped because the default reference layer
  is absent.
- `status: "ambiguous"`: the log's structure has two readings, so nothing was
  read and `summary.md` was not written. Surface the result's `ambiguity`
  string to the user and stop before commit. Do not describe the summary as
  rolled up, and do not treat the absent observations as "no entries".
- `status: "failed"` or `ledgerOutcome: "failed"`: surface the failure to the
  user and stop before commit. Do not describe the summary as fully rolled up.

The command mechanically writes or updates `## Workflow Observations` and
appends/deduplicates eligible `general` judgments in the configured ledger. Do
not reproduce either write by hand.

Separately inspect follow-up-marked project-log entries and offer backlog
graduation through `oat-pjm-add-backlog-item`. Backlog graduation creates a
tracked work item; it is not ledger graduation and must not replace the
append-based `project` → `general` promotion in Step 2.5.

### Step 7: Promote Key Decisions to Canonical Decision Records

Under the goal terminal deferral (Step 6), skip this step and report it deferred.

Run this step **after** `summary.md` (including its `## Key Decisions` section) has been written/refreshed and its frontmatter updated. It promotes the project's Key Decisions out of per-project prose and into the canonical, repo-wide `reference/decisions/` log so they stop being siloed in `summary.md`. This step is **additive and non-interactive** — it never prompts.

**7.1 — PJM capability and adoption gate (auto, no prompt).** Check capability
availability, then inspect repository adoption read-only:

```bash
PJM_ENABLED=$(oat tools has project-management 2>/dev/null || echo "")
PJM_ADOPTION_STATE=""
if [ "$PJM_ENABLED" = "true" ]; then
  PJM_ADOPTION_STATE=$(oat pjm doctor --json 2>/dev/null | jq -r '.adoption.state // ""')
fi
```

- If `PJM_ADOPTION_STATE` is `declared` or `inferred-legacy` → perform the
  promotion automatically. Do NOT ask the user.
- If capability is absent → skip this entire step silently.
- If adoption is `none` or `partial-initialization` → skip every PJM write and
  report that `oat pjm init` is required before decision promotion.
- If capability is present but `PJM_ADOPTION_STATE` is empty or holds any value
  other than the four documented states (`declared`, `inferred-legacy`, `none`,
  `partial-initialization`) → treat adoption as unverified: skip every PJM
  write, do not fall through to the promotion branch, and report that adoption
  could not be determined (usually `jq` missing from `PATH` or a failing
  `oat pjm doctor`).

**7.2 — Skip if nothing to promote.** If `summary.md` has no `## Key Decisions` section, or that section has no decision content, skip the step. There is nothing to promote.

**7.3 — Verify the decisions surface exists.** The canonical decisions root is
`.oat/repo/reference/decisions` (the `oat decision` default; pass
`--decisions-root <path>` only for an explicit override). If its managed index
is missing, stop decision promotion and recommend `oat pjm init`. Never use
`oat decision init` as an alternate repository-adoption path.

**7.4 — Idempotent, date-independent promotion (critical).** For each decision in `## Key Decisions`:

1. **Derive title + complete sections.** Ground every value in the Key Decision and its project artifacts:
   - The bold lead-in / first clause becomes the **title** (a short noun phrase).
   - The problem, constraint, or motivating rationale becomes **context**.
   - The choice that was made becomes the **decision**.
   - The resulting tradeoffs, follow-on effects, or operational implications become **consequences**.
     Each section must contain concrete grounded prose; do not pass placeholder content.
2. **Compute the slug the CLI would use.** The CLI generates the record ID as `DR-<YYMMDD>-<slug>`, where `<slug>` is the lowercased, ASCII-folded, hyphen-collapsed form of the title, capped at 30 characters at the last whole-word boundary with trailing stop-words (`a, an, the, of, for, and, to, in, on, as, with`) trimmed (the same slug rule the CLI applies). Compute that `<slug>` for the title.
3. **Dedup on the exact slug, ignoring only the date prefix.** A record ID is `DR-<YYMMDD>-<slug>`, where the date is exactly six digits. Check whether a record for this slug already exists by stripping that fixed `DR-<6 digits>-` prefix from existing record IDs and comparing the remaining slug for **exact equality**. Anchor the date to exactly six characters so the slug must match in full:

   ```bash
   # the six '?' pin the YYMMDD date, so <slug> must match exactly (not as a suffix)
   ls .oat/repo/reference/decisions/DR-??????-"<slug>".md 2>/dev/null
   ```

   Do **not** use a loose `DR-*-<slug>.md` glob: the greedy `*` would let a short slug (e.g. `layers`) falsely match a longer record (`DR-260623-two-layers.md`) and wrongly skip it. (Equivalently, scan the `ID` column of `reference/decisions/index.md`, strip each `DR-<6 digits>-` prefix, and compare the slug exactly.) This date-independent, exact-slug match is essential: the `DR-YYMMDD-` date prefix changes across re-runs, so a naive full-ID `DR-YYMMDD-<slug>` check would never dedup, while a loose suffix match would over-dedup.

4. **Skip or create.**
   - If a matching record already exists (same slug) → **skip it.** It was already promoted on a prior run.
   - Otherwise → create it:

     ```bash
     DECISION_CREATE=$(oat decision new "<title>" --status accepted --context "<context>" --decision "<decision>" --consequences "<consequences>" --json)
     DECISION_ID=$(printf '%s\n' "$DECISION_CREATE" | jq -er '.id') || exit 1
     DECISION_RECORD_PATH="$DECISIONS_ROOT/${DECISION_ID}.md"
     test -f "$DECISION_RECORD_PATH" || exit 1
     PROMOTED_DECISION_PATHS+=("$DECISION_RECORD_PATH")
     DECISION_INDEX_CHANGED="true"
     ```

     The command generates the deterministic `DR-YYMMDD-slug` ID, fills every decision body section, and regenerates the managed index automatically — do not hand-edit `index.md`. Optionally pass `--created-at "<project completion date>"` when a project completion date is available, so the record's date reflects when the decision was made.

Because of the date-independent slug dedup, this step is **safe to run every time `summary.md` is (re)generated** — including the pr-final refresh and revision re-runs — without ever creating duplicate decision records. Already-promoted decisions are skipped; only genuinely new Key Decisions become new records.

**Status value:** use `--status accepted`. The decision template's status field (`.oat/templates/decision.md`) is free-form, and the canonical accepted/decided value in the decision vocabulary (`proposed` → `accepted` → `superseded`) is `accepted`. A Key Decision in a completed project's summary represents a decision that was made and shipped, so `accepted` is the correct status.

**7.5 — Report, don't prompt.** After processing all Key Decisions, print a short informational summary, e.g.:

```
Promoted N key decision(s) to reference/decisions/:
  - created: DR-YYMMDD-<slug> ("<title>")
  - skipped (already promoted): <slug>
```

This is informational only. There is no interactive prompt anywhere in this step.

### Step 8: Commit

```bash
PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || { echo "oat: cannot resolve project scope for $PROJECT_PATH; refusing to commit artifacts" >&2; exit 1; }
# fail closed: never fall back to branch bookkeeping when scope resolution fails

PARENT_OUTPUT_PATHS=()
if [ "$PROJECT_LOG_LEDGER_APPENDED" = "true" ]; then
  PARENT_OUTPUT_PATHS+=("$PROJECT_LOG_LEDGER_PATH")
fi
if [ "${#PROMOTED_DECISION_PATHS[@]}" -gt 0 ]; then
  PARENT_OUTPUT_PATHS+=("${PROMOTED_DECISION_PATHS[@]}")
fi
if [ "$DECISION_INDEX_CHANGED" = "true" ]; then
  PARENT_OUTPUT_PATHS+=("$DECISION_INDEX_PATH")
fi

PARENT_DURABILITY_COMMIT=""
if [ "$PROJECT_SCOPE" = "synced" ] && [ "${#PARENT_OUTPUT_PATHS[@]}" -gt 0 ]; then
  OWNED_COMMIT_PATHS=("${PARENT_OUTPUT_PATHS[@]}")
  if [ "$PROJECT_LOG_LEDGER_APPENDED" = "true" ] && [ "$DECISION_INDEX_CHANGED" = "true" ]; then
    PARENT_COMMIT_MESSAGE="docs: update project log ledger and decisions for {project-name}"
  elif [ "$PROJECT_LOG_LEDGER_APPENDED" = "true" ]; then
    PARENT_COMMIT_MESSAGE="docs: update project log ledger for {project-name}"
  else
    PARENT_COMMIT_MESSAGE="docs: promote summary decisions for {project-name}"
  fi
  oat internal commit-paths --identity "${COMMIT_IDENTITY:?set once and retain for retries}:oat-project-summary:1" --message "$PARENT_COMMIT_MESSAGE" -- "${OWNED_COMMIT_PATHS[@]}" || exit 1
  PARENT_DURABILITY_COMMIT=$(git rev-parse HEAD)
  PARENT_COMMIT_PATHS=$(git diff-tree --no-commit-id --name-only -r "$PARENT_DURABILITY_COMMIT")
  # Inspect the complete output and require exact set equality with the
  # de-duplicated PARENT_OUTPUT_PATHS array before continuing.
fi
```

Define this fail-closed parser before either synced summary push. On rejection,
print the full CLI JSON, run `oat project pull "$PROJECT_PATH"`, resolve its
reported conflict, and retry the original push.

```bash
parse_synced_push_receipt() {
  node -e '
let value;
try { value = JSON.parse(process.argv[1]); } catch { process.exit(1); }
if (!["pushed", "up-to-date"].includes(value.status) || !/^[0-9a-f]{40}$/.test(value.sha)) process.exit(1);
process.stdout.write(value.sha);
' "$1"
}
```

```bash
if [ "$PROJECT_SCOPE" = "synced" ]; then
  SUMMARY_PUSH=$(oat project push "$PROJECT_PATH" --message "docs: generate summary for {project-name}" --json) || { echo "oat: project push failed; run oat project pull, resolve the reported state, and retry" >&2; exit 1; }
  SUMMARY_COMMIT_SHA=$(parse_synced_push_receipt "$SUMMARY_PUSH") || { printf '%s\n' "$SUMMARY_PUSH" >&2; echo "Recovery: run oat project pull \"$PROJECT_PATH\", resolve conflicts, then retry this push." >&2; exit 1; }
else
  PROJECT_OUTPUT_PATHS=("$PROJECT_PATH/summary.md")
  if [ "$PROJECT_LOG_PROMOTION_APPENDED" = "true" ]; then
    PROJECT_OUTPUT_PATHS+=("$PROJECT_PATH/project-log.md")
  fi
  if [ "${#PARENT_OUTPUT_PATHS[@]}" -gt 0 ]; then
    PROJECT_OUTPUT_PATHS+=("${PARENT_OUTPUT_PATHS[@]}")
  fi
  OWNED_COMMIT_PATHS=("${PROJECT_OUTPUT_PATHS[@]}")
  oat internal commit-paths --identity "${COMMIT_IDENTITY:?set once and retain for retries}:oat-project-summary:2" --message "docs: generate summary for {project-name}" -- "${OWNED_COMMIT_PATHS[@]}" || exit 1
  SUMMARY_COMMIT_SHA=$(git rev-parse HEAD)
fi

UNRELATED_STAGED_PATCH_AFTER=$(git diff --cached --binary)
[ "$UNRELATED_STAGED_PATCH_AFTER" = "$UNRELATED_STAGED_PATCH_BEFORE" ] || {
  echo "oat: unrelated staged state changed during summary persistence" >&2
  exit 1
}
```

These conditional paths are required: append-based promotion mutates
`project-log.md`, while `ledgerOutcome: "appended"` mutates the effective
repository ledger. A permitted skip or deduplicated ledger does not add a
ledger staging path.

For a synced project, repository-wide decision and ledger outputs are committed
on the parent branch before the summary is pushed to its project ref. A new
decision with no ledger append therefore receives the dedicated guarded parent
commit above. Record `PARENT_DURABILITY_COMMIT` and the verified exact paths in
the output summary. Never stage the whole decisions directory.

If this is a re-run (incremental update):

```bash
if [ "$PROJECT_SCOPE" = "synced" ]; then
  SUMMARY_PUSH=$(oat project push "$PROJECT_PATH" --message "docs: update summary for {project-name}" --json) || { echo "oat: project push failed; run oat project pull, resolve the reported state, and retry" >&2; exit 1; }
  SUMMARY_COMMIT_SHA=$(parse_synced_push_receipt "$SUMMARY_PUSH") || { printf '%s\n' "$SUMMARY_PUSH" >&2; echo "Recovery: run oat project pull \"$PROJECT_PATH\", resolve conflicts, then retry this push." >&2; exit 1; }
else
  OWNED_COMMIT_PATHS=("${PROJECT_OUTPUT_PATHS[@]}")
  oat internal commit-paths --identity "${COMMIT_IDENTITY:?set once and retain for retries}:oat-project-summary:3" --message "docs: update summary for {project-name}" -- "${OWNED_COMMIT_PATHS[@]}" || exit 1
  SUMMARY_COMMIT_SHA=$(git rev-parse HEAD)
fi
```

### Step 9: Output Summary

```
Summary generated for {project-name}.

Sections: {list of non-empty sections included}
Lines: {line count}
Mode: {fresh | incremental update}
Decisions promoted: {N created, M skipped as already promoted | skipped (PJM unavailable)}

Summary tracks: last task {task_id}, {N} revision phases
```

## Success Criteria

- Summary.md exists in the project directory with valid frontmatter
- Content is grounded in implementation outcomes, not plans
- Sections with no content are omitted
- Frontmatter tracking fields are current
- Summary is under 200 lines for typical projects
- Re-run after revisions updates only affected sections
- Re-run with no changes produces no modifications
- When `oat-execution-learnings.md` exists, actionable recommendations are
  grouped under Agent-instruction updates, Cloud-environment improvements, Code
  follow-ups, and Workflow issues with source-entry pointers
- When `oat-execution-learnings.md` is absent, no Autonomous Execution
  Learnings section is rendered and normal summary behavior is unchanged
- Project-log ledger graduation appends a new referencing `general` judgment
  before roll-up and never mutates the original `project` judgment
- `oat project log rollup --json` owns the distinct Workflow Observations
  section and ledger writes; `failed` stops the summary flow while
  `skipped_permitted` proceeds with a note
- Follow-up-marked project-log entries use backlog graduation separately from
  ledger graduation
- When the PJM tool pack is available, each Key Decision is promoted to a canonical `reference/decisions/DR-YYMMDD-slug` record via `oat decision new` (status `accepted`), deduped on the date-independent slug so re-runs never create duplicate records
- When the PJM tool pack is unavailable, decision promotion is skipped silently with no prompt
- A project-recap attempt or recorded skip appears once in a concise Explainer
  Outcome section sourced from `manifest.json` and `qa/result.json`, or from the
  persisted recap intent
