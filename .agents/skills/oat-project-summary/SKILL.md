---
name: oat-project-summary
version: 1.3.5
description: Use when the user requests or confirms summarizing an active OAT project — e.g. "summarize the project", "generate the summary", "run oat-project-summary", or confirms a previously offered summary run. Do NOT auto-invoke when implementation completes. Generates summary.md from project artifacts as institutional memory.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Bash(oat config:*), Bash(oat decision:*), Bash(oat project log:*), Bash(oat tools:*), Glob, Grep, AskUserQuestion
---

# Project Summary

Generate a durable project summary artifact from project lifecycle artifacts.

## Purpose

Produce a `summary.md` that serves as institutional memory — capturing what was built, why decisions were made, what tradeoffs occurred, and what follow-up work was identified. This artifact is distinct from the PR description: summary.md is reflective and thorough; PR descriptions are reviewer-oriented and actionable.

## Prerequisites

**Required:** Active project with `implementation.md` that has meaningful progress (at least one completed task).

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

### Step 2: Read Project Artifacts

Read all available artifacts for synthesis:

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
   - If `oat_summary_last_task == current_last_task` AND `oat_summary_revision_count == current_rev_count` AND learnings are absent or unchanged AND the project-log check reports no entries: **No changes detected. Skip update.** Report: "Summary is current. No updates needed."
   - If `current_rev_count > oat_summary_revision_count`: New revision phases exist. Update: Revision History, What Was Implemented, Follow-up Items.
   - If `current_last_task > oat_summary_last_task`: New tasks completed. Update: What Was Implemented, Notable Challenges, Tradeoffs Made.
   - If `learnings_changed`: update Autonomous Execution Learnings even when
     task and revision tracking fields are unchanged.

**If does not exist (first run):**

Copy template: `.oat/templates/summary.md` → `"$PROJECT_PATH/summary.md"`

### Step 4: Generate / Update Summary Sections

For each section, synthesize content from the relevant artifacts. Apply these rules:

**Grounding rule:** Prefer implementation.md outcomes over design.md plans. If the implementation diverged from the design, reflect what actually happened.

**Design delta rule:** Populate `Design Deltas` from both direct implementation deviations and review-received design drift decisions recorded in `implementation.md`. A review finding may decide that shipped implementation is defensible and the artifact is stale; when `implementation.md` records that acceptance, carry it forward as a design delta with the rationale and follow-up artifact disposition.

**Section omission rule:** If a section would have no meaningful content, omit it entirely (remove the heading). Do not leave empty sections or "N/A" placeholders.

**Conciseness constraint (NFR3):** Target under 200 lines total. If a draft exceeds this, trim narrative sections (What Was Implemented, Notable Challenges) to essential points. Revision History entries: 2-3 sentences per round max.

**Minimum viable summary:** Overview + What Was Implemented + Key Decisions. All other sections are included only when they have content worth preserving.

**Section sources:**

| Section                        | Primary Sources                                                        |
| ------------------------------ | ---------------------------------------------------------------------- |
| Overview                       | discovery.md initial request, spec.md problem statement                |
| What Was Implemented           | implementation.md task outcomes, plan.md phase structure               |
| Key Decisions                  | design.md decisions, implementation.md notes/decisions                 |
| Design Deltas                  | implementation.md deviations table; review-received design drift notes |
| Notable Challenges             | implementation.md issues/blockers in task notes                        |
| Tradeoffs Made                 | implementation.md decisions, design.md tradeoff sections               |
| Integration Notes              | implementation.md notes about cross-cutting concerns                   |
| Revision History               | plan.md p-revN phases, implementation.md revision notes                |
| Follow-up Items                | implementation.md deferred findings, plan.md deferred items            |
| Associated Issues              | state.md `associated_issues` field                                     |
| Workflow Observations          | project-log.md via `oat project log rollup` only                       |
| Autonomous Execution Learnings | oat-execution-learnings.md dated entries                               |
| Explainer Outcome              | project-recap `manifest.json` and `build-record.json`                  |

**Explainer Outcome (conditional):**

When a project-recap attempt exists, render this section:

```markdown
## Explainer Outcome

- **project-recap:** {outcome} — `{run path}`{optional warning or recovery note}
```

When a project-recap attempt exists, include exactly one concise outcome item with its recipe, outcome (`built-durable`, `built-not-durable`, or `failed`), run path, and warning or recovery note when applicable.

Use `manifest.json` and `build-record.json` as the source of truth; refresh the existing item instead of appending a duplicate.

Omit `Explainer Outcome` when no project-recap attempt exists. A failed or non-durable recap remains visible as its product outcome; do not reinterpret it as project implementation failure.

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

### Step 6: Roll Up Project Observations and Offer Backlog Graduation

Run this step after `summary.md` has been authored or refreshed, including the
distinct `## Autonomous Execution Learnings` section when its source artifact
exists.

When Step 2.5 found entries, run:

```bash
PROJECT_LOG_LEDGER_PATH=$(oat config get workflow.projectLogLedgerPath)
PROJECT_LOG_LEDGER_APPENDED="false"
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

Run this step **after** `summary.md` (including its `## Key Decisions` section) has been written/refreshed and its frontmatter updated. It promotes the project's Key Decisions out of per-project prose and into the canonical, repo-wide `reference/decisions/` log so they stop being siloed in `summary.md`. This step is **additive and non-interactive** — it never prompts.

**7.1 — PJM gate (auto, no prompt).** Check whether the PJM tool pack is effectively available:

```bash
PJM_ENABLED=$(oat tools has project-management 2>/dev/null || echo "")
```

- If `PJM_ENABLED` is `true` → perform the promotion automatically. Do NOT ask the user.
- Otherwise (any other value, empty, or unset) → **skip this entire step silently.** Do not print a warning or prompt.

**7.2 — Skip if nothing to promote.** If `summary.md` has no `## Key Decisions` section, or that section has no decision content, skip the step. There is nothing to promote.

**7.3 — Ensure the decisions surface exists.** The canonical decisions root is `.oat/repo/reference/decisions` (the `oat decision` default; pass `--decisions-root <path>` only for an explicit override). If its managed index is missing — i.e. `.oat/repo/reference/decisions/index.md` does not exist — initialize it first so `oat decision new` can succeed:

```bash
test -f .oat/repo/reference/decisions/index.md || oat decision init
```

`oat decision init` is idempotent; running it when the scaffold already exists is harmless.

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
     oat decision new "<title>" --status accepted --context "<context>" --decision "<decision>" --consequences "<consequences>"
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
git add "$PROJECT_PATH/summary.md"
if [ "$PROJECT_LOG_PROMOTION_APPENDED" = "true" ]; then
  git add "$PROJECT_PATH/project-log.md"
fi
if [ "$PROJECT_LOG_LEDGER_APPENDED" = "true" ]; then
  git add "$PROJECT_LOG_LEDGER_PATH"
fi
git commit -m "docs: generate summary for {project-name}"
```

These conditional paths are required: append-based promotion mutates
`project-log.md`, while `ledgerOutcome: "appended"` mutates the effective
repository ledger. A permitted skip or deduplicated ledger does not add a
ledger staging path.

If decision records were promoted in Step 7, also stage `.oat/repo/reference/decisions/` so the new `DR-*.md` records and the regenerated `index.md` land with the summary.

If this is a re-run (incremental update):

```bash
git commit -m "docs: update summary for {project-name}"
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
- A project-recap attempt appears once in a concise Explainer Outcome section
  sourced from its manifest and build record
