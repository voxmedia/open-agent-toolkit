---
name: oat-project-discover
version: 2.2.2
description: Use when the user explicitly asks to continue discovery for an active spec-driven OAT project — e.g. "continue discovery", "run discovery", or confirms a previously offered discovery step. Do NOT auto-invoke for new ideas or quick-mode projects. Gathers requirements and context before spec/design.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Bash(oat:*), Bash(pnpm:*), Glob, Grep, AskUserQuestion
---

# Discovery Phase

Gather requirements and understand the problem space through natural collaborative dialogue.

## Prerequisites

**Required:** Knowledge base must exist. If missing, run the `oat-repo-knowledge-index` skill first.

**Required for model invocation:** An active spec-driven OAT project must already exist. If no active project exists, route to `oat-project-new` for spec-driven setup or `oat-project-quick-start` for quick workflow. If the active project is quick or import mode, decline this skill and route to the current mode's next step instead.

## Model Invocation Gate

This skill is model-invokable only for explicit discovery-continuation asks on an active spec-driven project. Do NOT auto-invoke when the user mentions a new idea, asks for a quick workflow, or has an active quick/import project.

Before acting:

1. Resolve `activeProject`.
2. Confirm `{PROJECT_PATH}/state.md` exists.
3. Confirm `oat_workflow_mode` is `spec-driven` or absent only in a legacy spec-driven project.

If any check fails, decline this skill. Offer `oat-project-new` for a new spec-driven project, `oat-project-quick-start` for a quick project, or `oat-project-open` for switching to an existing project. When the gate passes, summarize the active project and ask before continuing discovery.

## Mode Assertion

**OAT MODE: Discovery**

**Purpose:** Gather requirements and understand the problem space through structured dialogue.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ DISCOVERY
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print step indicators, e.g.:
  - `[1/5] Resolving project + checking knowledge base…`
  - `[2/5] Initializing discovery document…`
  - `[3/5] Running interactive discovery…`
  - `[4/5] Documenting decisions + boundaries…`
  - `[5/5] Updating state + committing…`

**BLOCKED Activities:**

- ❌ No code writing
- ❌ No design documents
- ❌ No implementation plans
- ❌ No technical specifications
- ❌ No concrete deliverables list (specific scripts, file paths, function names)

**ALLOWED Activities:**

- ✅ Asking clarifying questions
- ✅ Exploring approaches and trade-offs
- ✅ Documenting decisions and constraints
- ✅ Reading knowledge base for context

**Self-Correction Protocol:**
If you catch yourself:

- Writing code or implementation details → STOP
- Drafting technical designs → STOP
- Creating detailed plans → STOP

**Recovery:**

1. Acknowledge the deviation
2. Return to asking questions about requirements
3. Document the insight in discovery.md without implementation details (use "Open Questions" for design if needed)

## Process

### Step 1: Resolve Active Spec-Driven Project

OAT stores active project context in `.oat/config.local.json` (`activeProject`, local-only).

**Recommendation:** Prefer creating projects via the `oat-project-new` skill (scaffolds all artifacts up front). `oat-project-new` is the canonical "create project" step; this discovery skill should not be responsible for directory/template scaffolding.

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

**If `PROJECT_PATH` is set and valid (directory exists):**

- Derive `project-name` from the directory name (basename of the path)
- Read `{PROJECT_PATH}/state.md` (if it exists) and show current status
- Read `oat_workflow_mode` from `{PROJECT_PATH}/state.md`
- If `oat_workflow_mode` is present and not `spec-driven`, stop and route:
  - quick project: continue with `oat-project-quick-start` / `oat-project-progress`
  - import project: continue with `oat-project-import-plan` / `oat-project-progress`
- Ask user:
  - **Continue** with active project, or
  - **Switch projects**:
    - Existing project: run the `oat-project-open` skill
    - New project: run the `oat-project-new` skill
  - Stop here until the user has selected/created the intended project.

**If `PROJECT_PATH` is missing/invalid:**

- Tell the user an active project is required for discovery.
- Offer:
  - New project: run the `oat-project-new` skill with `{project-name}`
  - Existing project: run the `oat-project-open` skill
- Stop here until `activeProject` in `.oat/config.local.json` is set to a valid project directory.

### Step 2: Check Knowledge Base Exists

```bash
test -f .oat/repo/knowledge/project-index.md
```

**If missing:** Block and require the `oat-repo-knowledge-index` skill first.

### Step 3: Check Knowledge Staleness

Extract frontmatter values from `.oat/repo/knowledge/project-index.md`:

```bash
# Extract SHAs and generation date from frontmatter
SOURCE_HEAD_SHA=$(grep "^oat_source_head_sha:" .oat/repo/knowledge/project-index.md | awk '{print $2}')
SOURCE_MERGE_BASE_SHA=$(grep "^oat_source_main_merge_base_sha:" .oat/repo/knowledge/project-index.md | awk '{print $2}')
GENERATED_AT=$(grep "^oat_generated_at:" .oat/repo/knowledge/project-index.md | awk '{print $2}')

# Get current state
CURRENT_HEAD=$(git rev-parse HEAD)
CURRENT_MERGE_BASE=$(git merge-base HEAD origin/main 2>/dev/null || git rev-parse HEAD)
```

**Enhanced staleness check:**

1. **Age check:** Compare `$GENERATED_AT` vs today (warn if >7 days)

   ```bash
   # Skip age check if GENERATED_AT is missing or invalid
   if [ -n "$GENERATED_AT" ] && echo "$GENERATED_AT" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'; then
     # macOS: use date -j -f, Linux: use date -d
     if date -j -f "%Y-%m-%d" "$GENERATED_AT" +%s >/dev/null 2>&1; then
       GENERATED_TS=$(date -j -f "%Y-%m-%d" "$GENERATED_AT" +%s)
     else
       GENERATED_TS=$(date -d "$GENERATED_AT" +%s 2>/dev/null || echo "")
     fi

     if [ -n "$GENERATED_TS" ]; then
       DAYS_OLD=$(( ($(date +%s) - $GENERATED_TS) / 86400 ))
     else
       DAYS_OLD="unknown"
     fi
   else
     DAYS_OLD="unknown"
   fi
   ```

2. **Git diff check:** Compare recorded index HEAD to current HEAD
   ```bash
   # Use --numstat for reliable file count (one line per file)
   if [ -n "$SOURCE_HEAD_SHA" ]; then
     FILES_CHANGED=$(git diff --numstat "$SOURCE_HEAD_SHA..HEAD" 2>/dev/null | wc -l | tr -d ' ')
     # Also get summary for display
     CHANGES_SUMMARY=$(git diff --shortstat "$SOURCE_HEAD_SHA..HEAD" 2>/dev/null)
   else
     FILES_CHANGED="unknown"
     CHANGES_SUMMARY=""
   fi
   ```

**Staleness thresholds:**

- Age: >7 days old
- Changes: >20 files changed

**If stale (age or changes exceed thresholds):**

- Display prominent warning with specifics (days old, files changed)
- Show `$CHANGES_SUMMARY` if available
- Recommend the `oat-repo-knowledge-index` skill to refresh
- Ask user: "Continue with stale knowledge or refresh first?"

**If unable to determine staleness (missing SHAs/dates):**

- Warn that staleness could not be verified
- Recommend refreshing knowledge base to ensure accuracy

### Step 4: Initialize State

Copy template: `.oat/templates/state.md` → `"$PROJECT_PATH/state.md"`

Update frontmatter:

```yaml
---
oat_phase: discovery
oat_phase_status: in_progress
oat_project_state_updated: '{ISO 8601 UTC timestamp, e.g. 2026-03-10T14:30:00Z}'
---
```

Update content:

- Replace `{Project Name}` with actual project name
- Set **Started:** to today's date
- Update **Artifacts** section with actual project path

### Step 5: Initialize Discovery Document

Copy template: `.oat/templates/discovery.md` → `"$PROJECT_PATH/discovery.md"`

Update with user's initial request.

### Step 6: Read Relevant Knowledge

Read for context:

- `.oat/repo/knowledge/project-index.md`
- `.oat/repo/knowledge/architecture.md`
- `.oat/repo/knowledge/conventions.md`
- `.oat/repo/knowledge/concerns.md`

### Step 7: Infer Gray Areas

Based on the initial request and knowledge base context, infer 3-5 "gray areas" - topics that need clarification.

**Examples of gray areas:**

- **Scope:** What features are in/out of scope?
- **Integration:** How does this interact with existing systems?
- **Data:** What data needs to be stored/accessed?
- **Users:** Who will use this and how?
- **Performance:** What are the scale/latency requirements?
- **Security:** What are the auth/privacy requirements?
- **Testing:** What testing approach is needed?

Present as multi-select question using AskUserQuestion tool:

```
Which areas should we explore during discovery?
(Select all that apply)

□ {Gray area 1}
□ {Gray area 2}
□ {Gray area 3}
□ {Gray area 4}
□ {Gray area 5}
```

This focuses the conversation on what matters most to the user.

### Step 8: Ask Clarifying Questions

**For each selected gray area:**

- Ask targeted questions **one at a time** — let each answer inform the next question
- Prefer **multiple choice** questions when feasible to reduce cognitive load, with an "Other" escape hatch
- After each answer:
  1. Add to discovery.md "Clarifying Questions" section
  2. Update frontmatter: `oat_last_updated: {today}`
  3. Briefly acknowledge what the answer means for the project before asking the next question

**Question quality:**

- Open-ended where possible
- Domain-aware (reference knowledge base context)
- Focused on decisions, not implementation details
- **Lead with your perspective** — frame questions around what you think the answer should be and ask the user to confirm or redirect

### Step 9: Explore Solution Space

Before converging on an approach, invest in genuine divergent exploration. Simple projects are where unexamined assumptions cause the most wasted work.

**Step 9 Split Detection: Evaluate Multi-Project Signals**

During solution-space exploration, silently evaluate whether the current thread is really multiple loosely related projects. Re-evaluate after each user turn while approaches are being shaped; do not interrupt normal discovery unless the threshold is met.

Track the four codified signals:

1. `independently-shippable` — at least two deliverables can ship independently.
2. `no-shared-design-surface` — the work lacks a single shared design surface.
3. `expect-separate-prs` — a reviewer would reasonably expect separate PRs.
4. `distinct-subsystems` — the work spans distinct subsystems, packages, layers, or ownership areas.

Evaluate the current comma-separated signal list through the installed CLI:

```bash
oat project split evaluate-signals --fired "<comma-list>"
```

Use the local-development fallback only when the installed `oat` command is unavailable:

```bash
pnpm run cli -- project split evaluate-signals --fired "<comma-list>"
```

Parse the JSON output:

```json
{ "fired": [], "triggered": false, "confidence": "below" }
```

Branch on `confidence`:

- `high` — both load-bearing signals 1 and 2 fired. Use high-confidence wording and ask directly: "This looks like multiple independent projects. Split now, do one round of broad cross-cutting discovery first, or keep this as one project?"
- `soft` — at least two signals fired, but not both load-bearing signals. Use soft wording: "This may be multiple projects. Split, do one round of broad cross-cutting discovery first, or keep it as one project?"
- `below` — Below 2 signals, do not surface a split offer.

If the user confirms split, invoke the `oat-project-split` skill with a `SplitPayload` using `origin: "detected-mid-stream"`, `interactive: true`, the active discovery path as `priorDiscovery.path`, and any inferred children already named in the conversation. The discover hook only detects and hands off; it does not scaffold children or write the coordination parent itself.

**Non-interactive branch:** if `OAT_NON_INTERACTIVE=1` and detection triggers (`confidence` is `high` or `soft`), do not show an offer prompt and do not silently choose. Append this section to `"$PROJECT_PATH/discovery.md"` and exit non-zero:

```markdown
## Detected Split Recommendation

Discovery detected multi-project scope via `oat project split evaluate-signals`.

- Fired signals: <comma-list>
- Confidence: <high|soft>
- Recommendation: rerun discovery interactively and choose whether to invoke `oat-project-split`.
```

```bash
exit 1
```

**Step 9a: Propose Approaches**

Propose 2-3 **genuinely distinct** approaches (not minor variations). For each:

- Describe the approach concretely
- Explain tradeoffs — not just pros/cons, but _when_ each approach is the better choice
- **Lead with your recommendation and explain why**

Document in discovery.md `## Solution Space` section.

**Step 9b: Validate Before Converging**

Present the approaches to the user and get explicit buy-in on the chosen direction before moving to decisions and boundaries. Summarize:

- The recommended approach
- Why it's preferred over the alternatives
- Any tradeoffs the user should be aware of

When an approach is selected, document it in `## Options Considered` with a "Summary" line explaining the choice.

**Step 9c: Handle Scope Creep**

- If user suggests additional features during discussion → add to "Deferred Ideas"
- If uncertainty arises → add to "Open Questions"
- Keep discovery focused on the core problem

### Step 10: Document Decisions and Boundaries

Update discovery.md sections:

**Required:**

- **Key Decisions:** What was decided and why
- **Constraints:** Technical, business, timeline limits
- **Success Criteria:** How we'll know it's done
- **Out of Scope:** What we're explicitly not doing

**Capture during conversation:**

- **Deferred Ideas:** Features/improvements for later (prevents scope creep)
- **Open Questions:** Unresolved questions (flag for spec phase)
- **Assumptions:** What we're assuming is true (needs validation)
- **Risks:** Potential problems identified (helps planning)

**Keep it outcome-level:**

- Avoid naming specific scripts/files/commands as deliverables in discovery.
- If you need to preserve an implementation thought, record it as an Open Question for design.

### Step 11: Human-in-the-Loop Lifecycle (HiLL) Gate (If Configured)

Before the HiLL gate or discovery completion, run the same split signal evaluation one final time.

**Non-interactive convergence branch:** if `OAT_NON_INTERACTIVE=1`, do not show the scope-check prompt and do not silently choose. Parse the final `oat project split evaluate-signals --fired "<comma-list>"` result:

- `high` or `soft` — append the same section to `"$PROJECT_PATH/discovery.md"` as the Step 9 non-interactive branch, using the final fired signal list and confidence, then exit non-zero.
- `below` — proceed as one cohesive project without prompting.

For interactive runs, show an always-visible scope-check confirmation. The prompt is required even when no mid-stream offer fired:

> "This reads as one cohesive project — proceed, or split into multiple?"

Pre-fill the recommendation from `oat project split evaluate-signals --fired "<comma-list>"`: recommend splitting for `high`, suggest considering a split for `soft`, and recommend proceeding as one cohesive project for `below`. If the user chooses split at this convergence point, invoke `oat-project-split` with `origin: "detected-convergence"` and `interactive: true`.

Read `"$PROJECT_PATH/state.md"` frontmatter:

- `oat_hill_checkpoints`
- `oat_hill_completed`

If `"discovery"` is in `oat_hill_checkpoints`, require explicit user approval before advancing.

**Approval prompt (required):**

- "Discovery artifact is ready. Approve discovery and unlock `oat-project-design`?"

**Optional independent review path:**

- If user wants fresh-context artifact review first, run:
  - `oat-project-review-provide artifact discovery`

**If user does not approve yet:**

- Keep discovery frontmatter as:
  - `oat_status: in_progress`
  - `oat_ready_for: null`
- Keep project state as in-progress for discovery.
- Do **not** append `"discovery"` to `oat_hill_completed`.
- Stop and report: "Discovery draft saved; awaiting HiLL approval."

If discovery is not configured as a HiLL checkpoint, or user explicitly approves, continue to Step 12.

### Step 12: Gate Execution

After artifact finalization and any configured HiLL approval, run the configured
gate as the last check before the completion boundary:

1. Resolve the gate for this skill:

   ```bash
   oat gate resolve <this-skill> --json
   ```

   If the command returns JSON `null`, no gate is configured; proceed directly
   to the completion steps in Step 13 below.

2. Export the resolved project path into the command shell:

   ```bash
   export PROJECT_PATH
   ```

   If the resolved command invokes `oat gate review`, the configured review
   command must already include `--project "$PROJECT_PATH"` as part of the
   structured-output contract. Its canonical form is:

   ```bash
   oat --json gate review --project "$PROJECT_PATH" ...
   ```

   This requires global `--json` before `gate review`. Reusable declarations
   must not include
   `--target <id>`. Reject `oat gate review ...` without the global `--json`
   placement. Stop and migrate an invalid stored declaration before execution;
   never inject or append execution-time argv.

3. Execute the resolved command exactly as configured. Capture stdout, stderr,
   the exit code, and the structured JSON result. A zero exit code means the
   review passed its threshold, but it does not by itself authorize artifact
   receipt or complete the handoff.

4. Review-artifact handoff:
   - Parse the structured gate result. An exit code or artifact path alone never
     authorizes `oat-project-review-receive`.
   - Invoke receive only when all three conditions hold: `status` is `ok` or
     `blocked`, the envelope explicitly sets `receiveEligible: true`, and a
     non-null `handoff` confirms the artifact was corroborated.
   - `receiveEligible: false` is a hard stop even when `artifactPath` is present.
     Never receive `targeting_correlation_failed`; correct the project/run
     routing and run a new gate.
   - Keep `artifact_validation_failed` outside receive until the artifact is
     corrected and the gate successfully revalidates it. Treat `review_failed`,
     unknown statuses, null handoffs, and contradictory eligibility fields as
     operational failures.
   - `blocked` exits nonzero but is receive-eligible; `ok` exits zero and still
     requires durable receive disposition. Route by structured status and
     eligibility, not by exit code.

5. If the command exits nonzero, use `description` to orient the next steps and
   handle `onFailure`:
   - `block`: read gate feedback, remediate, and re-run the gate up to
     `maxAttempts` attempts (default `2`). If attempts are exhausted, escalate
     to the human with accumulated feedback and append that feedback to
     `implementation.md`. Treat a launch failure, missing CLI, or no eligible
     runtime as escalation-biased and do not spend it as a remediation attempt.
   - `prompt`: surface the gate failure and ask the human how to proceed.
   - `warn`: record the gate failure and continue.

6. Runtime selection note (V1): the step runs the gate `command` as-is and reads
   no OAT runtime env var. By default, `oat gate review` and
   `oat gate cross-provider-exec` resolve the current host from built-in
   `hostDetectionCommand`s and avoid the same runtime when no exact target is
   supplied. Reusable lifecycle skill-gate commands must not include
   `--target <id>` so independent review stays provider-neutral. Use explicit
   targets only for manual/debug commands or deliberate local/user-specific
   overrides; do not hardcode provider/model targets in bundled skill guidance
   or shared lifecycle gate examples.

When `OAT_AUTONOMOUS=1`, perform eligible review receive immediately and apply
the autonomy contract's `onFailure` semantics without prompting: `warn`
continues with provenance, `block` stops after bounded attempts, and `prompt`
is a reported boundary. Unresolved Critical review findings always stop
autonomous discovery progression, regardless of a less restrictive gate
failure setting; record the blocker and leave the project resumable. Important
findings follow the configured gate policy. When autonomy is inactive, the
interactive behavior above is unchanged.

A gate that ends in `block` after attempts are exhausted, or at an unresolved
`prompt` boundary, means the completion steps below MUST NOT run; the phase
stays `in_progress` and resumable.

### Step 13: Mark Discovery Complete

Reach this completion boundary only after the configured gate passes or resolves
according to its `onFailure` policy.

Use the CLI completion boundary so split-created child discoveries cannot
complete until inherited context has been revalidated:

```bash
oat project complete-discovery "$PROJECT_PATH" --ready-for oat-project-design
```

### Step 14: Update Project State

Reach this state transition only after the configured gate passes or resolves
according to its `onFailure` policy.

Update `"$PROJECT_PATH/state.md"`:

**Frontmatter updates:**

- `oat_phase: discovery`
- `oat_phase_status: complete`
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`
- **If** `"discovery"` is in `oat_hill_checkpoints`: append `"discovery"` to `oat_hill_completed` array

**Note:** Only append to `oat_hill_completed` when the phase is configured as a HiLL gate. This keeps `oat_hill_completed` meaning "HiLL gates passed" rather than "phases completed" (which is tracked by `oat_phase` and `oat_phase_status`).

**Content updates:**

- Set **Last Updated:** to today
- Update **Artifacts** section: Discovery status to "complete"
- Update **Progress** section

### Step 15: Commit Discovery

Reach this commit step only after the configured gate passes or resolves
according to its `onFailure` policy.

**Note:** This shows what users will do when USING oat-project-discover.
During implementation of OAT itself, use standard commit format.

```bash
PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || { echo "oat: cannot resolve project scope for $PROJECT_PATH; refusing to commit artifacts" >&2; exit 1; }
# fail closed: never fall back to branch bookkeeping when scope resolution fails
if [ "$PROJECT_SCOPE" = "synced" ]; then
  oat project push "$PROJECT_PATH" --message "docs: complete discovery for {project-name}

Key decisions:
- {Decision 1}
- {Decision 2}

Ready for design phase" || { echo "oat: project push failed; run oat project pull, resolve the reported state, and retry" >&2; exit 1; }
else
  PROJECT_OUTPUT_PATHS=("$PROJECT_PATH/discovery.md" "$PROJECT_PATH/state.md")
  git add -- "${PROJECT_OUTPUT_PATHS[@]}"
  git commit -m "docs: complete discovery for {project-name}

Key decisions:
- {Decision 1}
- {Decision 2}

Ready for design phase"
fi
```

### Step 16: Output Summary

Report completion only after the configured gate passes or resolves according to
its `onFailure` policy.

```
Discovery phase complete for {project-name}.

Next: Create design with the oat-project-design skill (which will confirm
requirements automatically and produce both spec.md and design.md).

If you'd rather formalize requirements without designing yet, run
`oat-project-spec` as a standalone step.
```
