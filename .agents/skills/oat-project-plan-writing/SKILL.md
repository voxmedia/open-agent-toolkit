---
name: oat-project-plan-writing
version: 1.2.6
description: Use when authoring or mutating plan.md in any OAT workflow. Defines canonical format invariants — stable task IDs, required sections, review table rules, and resume guardrails.
disable-model-invocation: true
user-invocable: false
allowed-tools: Read, Write, Glob, Grep
---

# Plan Writing Contract

Defines the canonical `plan.md` format that all OAT plan-producing and plan-mutating skills must follow.

## Progress Indicators (User-Facing)

When a skill invokes this contract during plan authoring, it should print a sub-banner:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ PLAN WRITING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is a sub-phase indicator; the calling skill owns the top-level banner.

- When invoked by a calling skill, print the sub-banner immediately before plan authoring begins.

## Auto Artifact-Review Loop

This is the canonical contract for bounded automated reviews of generated OAT artifacts. Calling skills own the concrete edits, progress indicators, and commits; this section defines the shared loop they must follow.

Use this loop after an artifact has been written and before the calling skill hands off to the downstream consumer. Current targets:

- `plan`: dispatch `oat-reviewer` with `type: artifact`, `scope: plan`, and `oat_output_mode: structured`.
- `analysis`: dispatch `oat-reviewer` with `type: analysis`, `scope: docs` or `agent-instructions`, `analysis_artifact`, and `oat_output_mode: structured`.

### Canonical Procedure

1. **Resolve the gate**
   - Read `workflow.autoArtifactReview.<target>` using the same config-resolution path as other `workflow.*` keys.
   - Missing config means enabled. Only an explicit `false` disables the loop.
   - If disabled, skip the review loop, note the skip in the calling skill's handoff/status output, and continue without pretending the artifact was reviewed.

2. **Resolve the retry bound**
   - Read `oat_orchestration_retry_limit` from the active project state.
   - If absent, invalid, or unavailable, use default `2`.
   - The bound controls rewrite/re-dispatch cycles after the initial review. A bound of `0` still permits the initial structured review, then surfaces residual findings without retrying.

3. **Dispatch `oat-reviewer` in structured mode**
   - Tier 1: use the configured `oat-reviewer` subagent when available and authorized.
   - Tier 2: if Tier 1 is unavailable or declined, run the same reviewer prompt inline with the same payload and checklist.
   - Always set `oat_output_mode: structured`; the loop consumes `StructuredFindings` in-memory and the reviewer writes no artifact.
   - Do not downgrade the checklist when falling back inline. The fallback changes only execution tier, not review requirements.

4. **Apply or offer fixes by severity**
   - If the structured review is clean, proceed to outcome recording.
   - Apply Critical and Important fixes by default when they are local to the reviewed artifact and the fix is unambiguous.
   - Offer Medium and Minor fixes to the user instead of applying them silently.
   - If a finding cannot be fixed within the artifact boundary, preserve it as residual and surface it before handoff.

5. **Rewrite and re-dispatch within the bound**
   - After applying fixes, rewrite the artifact and re-dispatch `oat-reviewer` with the same target payload.
   - Each rewrite/re-dispatch cycle consumes one retry.
   - Stop when the reviewer returns no findings or when the retry bound is exhausted.

6. **Record the outcome**
   - Record a clean pass or residual findings in the calling skill's lifecycle output before handoff.
   - For `plan`, update the `plan` artifact row in the Reviews table without deleting any existing rows. Use `passed` when clean; if residual findings remain, preserve enough detail in the handoff for the next skill/user to act.
   - For `analysis`, mark the analysis artifact as reviewed/verified using the calling skill's analysis-tracking convention, and surface any residual findings before the corresponding apply skill consumes it.

## Canonical Plan Format

Every `plan.md` produced or edited by any OAT skill **must** satisfy these invariants.

### Required Frontmatter Keys

```yaml
---
oat_plan_source: spec-driven | quick | imported # origin workflow mode
oat_status: in_progress | complete # plan lifecycle status
oat_ready_for: null | oat-project-implement # downstream consumer
# Optional after implementation confirmation:
# oat_plan_hill_phases: [] | ["p02"] # phases to pause AFTER completing ([] = every phase)
---
```

Planning-time default:

- Plan-producing skills should leave `oat_plan_hill_phases` unset during planning/import unless a user explicitly provided a confirmed value in the source artifact.
- The actual checkpoint choice is confirmed when `oat-project-implement` starts execution and then written into `plan.md`.

Runtime routing note:

- Keep `oat_ready_for` canonical as `oat-project-implement`.
- Declare parallelism via `oat_plan_parallel_groups` in plan.md frontmatter (empty = sequential; nested arrays of phase IDs = parallel groups). `oat-project-implement` reads this field to choose sequential vs worktree-isolated parallel execution.
- Dispatch policies are not stored in `plan.md`. Plan-producing skills resolve
  them from `workflow.dispatchPolicy.*`, compatibility
  `workflow.dispatchCeiling.*` keys, or project `state.md` frontmatter, then
  persist interactive answers back to `state.md` as `oat_dispatch_policy`.

Additional frontmatter keys (`oat_phase`, `oat_phase_status`, `oat_blockers`, `oat_last_updated`, `oat_generated`, `oat_template`, `oat_import_reference`, `oat_import_source_path`, `oat_import_provider`) are set by calling skills as needed.

### Dispatch Profile Overrides

`## Dispatch Profile` is optional and should be omitted by default. Runtime selection chooses the lowest available tier/model/effort that can confidently complete each phase.

Only include the section when the user has explicit constraints or preferences. Routine hand-tuning can be worse than runtime selection because the orchestrator has fresher phase context and host capability information at dispatch time.

If a user-authored override is needed, use this table shape:

```markdown
## Dispatch Profile

| Phase | Claude model                     | Codex effort                   | Rationale                     |
| ----- | -------------------------------- | ------------------------------ | ----------------------------- |
| pNN   | haiku\|sonnet\|opus\|fable\|auto | low\|medium\|high\|xhigh\|auto | why this constraint is needed |
```

Validation rules for explicit rows:

- `Phase` must match a real `pNN` phase in the plan.
- `Claude model` must be `haiku`, `sonnet`, `opus`, `fable`, `auto`, or blank.
- `Codex effort` must be `low`, `medium`, `high`, `xhigh`, `auto`, or blank. In Codex, explicit effort values are preferred controls. `oat-project-implement` caps them when a capped managed policy exists, selects them directly under managed `Uncapped`, and maps selected efforts to pinned implementer variants when available. Provider default effort is informational only for explicit inherit/default behavior or base/unpinned fallback paths.
- Blank or `auto` means no explicit constraint for that provider.
- `Rationale` is recommended and should explain why runtime selection should not decide on its own.

### Stable Task IDs

- Format: `pNN-tNN` (e.g., `p01-t03`, `p02-t12`).
- IDs are monotonically increasing within a phase and never reused.
- Review-generated fix tasks continue the sequence (e.g., after `p03-t08`, fixes start at `p03-t09`).
- Heading format: `### Task pNN-tNN: {Task Name}`.

### Required Sections

Every `plan.md` must contain these sections (order may vary):

1. **`## Reviews`** - Table tracking review status per phase/scope.
2. **`## Implementation Complete`** - Summary with phase counts and total task count.
3. **`## References`** - Links to related artifacts (design, spec, discovery, etc.).

If any required section is missing when a skill edits `plan.md`, it must be restored using the template headings without deleting existing content.

### Review Table Preservation Rules

- The `## Reviews` table includes both **code** rows (`p01`, `p02`, …, `final`) and **artifact** rows (`spec`, `design`, `plan`).
- Skills must **never delete** existing review rows.
- New rows may be appended (e.g., `p03` for a newly added phase).
- Status semantics: `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`.
  - `received`: review artifact exists but findings have not yet been converted into fix tasks.

### Implementation Complete Section

- Must reflect accurate phase counts and total task count.
- When review-fix tasks are added, update totals immediately.
- Phase rollup counts in headings (if present) must stay consistent.

## Mode-Specific Planning Inputs

Required inputs vary by workflow mode. The calling skill reads `oat_workflow_mode` from `{PROJECT_PATH}/state.md` (default: `spec-driven`).

| Mode          | Required Inputs                                  | Design Gate |
| ------------- | ------------------------------------------------ | ----------- |
| `spec-driven` | Complete `design.md` (`oat_status: complete`)    | Yes         |
| `quick`       | `discovery.md` + repo knowledge context          | No          |
| `import`      | Preserved external source + normalized `plan.md` | No          |

- **`spec-driven`**: Plan is derived from a complete design document. All design components must be covered by tasks.
- **`quick`**: Plan is generated directly from discovery decisions and repo knowledge. No design artifact is required.
- **`import`**: External plan is preserved in `references/imported-plan.md` and normalized into canonical format. Subsequent edits follow this contract.

## Resume and Edit Guardrails

When a calling skill encounters an existing `plan.md`:

### Resume Options

Offer the user three choices:

- **Resume** (default): continue editing the existing plan in place.
- **View**: show the existing plan and stop.
- **Overwrite**: replace with a fresh copy of the template (warn about losing draft edits).

### Edit Rules

- **Never delete existing review rows** in the `## Reviews` table.
- **Restore missing required sections** (`## Reviews`, `## Implementation Complete`, `## References`) using template headings if absent — do not delete existing content.
- **Preserve existing task IDs** — new tasks continue the sequence, never reuse or renumber.
- **Keep frontmatter consistent** — update `oat_last_updated` on every edit; do not clear `oat_plan_source`.
