---
name: oat-project-plan-writing
version: 1.2.13
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

## Shared Subagent Dispatch Contract

Before every artifact self-review dispatch, read and follow
`.agents/skills/oat-project-dispatch-subagents/SKILL.md`, which then requires
`.agents/skills/oat-dispatch-subagents/SKILL.md`. This explicit two-skill load
is mandatory; do not rely on ambient skill discovery. Planning self-review
inherits the planning parent by default. The shared contracts own any
catalog-aware exception, launch acceptance boundary, and dispatch record; this
skill continues to own plan readiness and review disposition.

After resolving the review provider, read exactly one active-provider
reference from `.agents/skills/oat-dispatch-subagents/references/`
(`provider-cursor.md`, `provider-codex.md`, or `provider-claude.md`). Do not
merge provider mechanics.

## Planning-Time Artifact Formatting Contract

Resolve artifact formatting once while authoring the plan. Read the applicable
repository instructions (`AGENTS.md`/`CLAUDE.md`) and relevant package
manifests, then select the repository's documented write/fix formatting
command. Distinguish write/fix commands from check-only commands, prefer the
write/fix command, and never infer or hardcode a formatter executable. When the
documented command supports paths, use a file-scoped invocation covering only
the files that the task will create or edit.

Bake the concrete repository command into the `Format` step of every task that
creates or edits artifacts. Downstream agents execute that supplied command
without repeating discovery. Runtime discovery is fallback-only when the
supplied command is absent or unusable.

If no documented write/fix command can be discovered, put this exact
warn-once/no-op instruction into every artifact-writing task:
Warn once with `no format command discovered in repo instructions; skipping`,
then continue without formatting.

## Managed Dispatch Readiness and Review Contract

All plan-producing workflows and their artifact reviews use this contract:
spec-driven planning, quick-start, imported plans, and provider-plan-via-import.
The contract runs before a plan becomes implementation-ready and immediately
before each artifact review dispatch.

1. Resolve the active provider through the CLI source of truth. For artifact
   review, always request the reviewer contract:

   ```bash
   oat project dispatch-ceiling resolve --provider "$ACTIVE_PROVIDER" --role reviewer --preflight --json
   ```

### Complete Dispatch Ladder Adoption Contract

Before any plan becomes implementation-ready, query the merged effective
configuration exactly once:

```bash
oat config list --json
```

Treat that output as the effective-config boundary across shared repository,
repo-local, user, and bundled-default precedence. Do not inspect or merge raw
config surfaces. Validate the resolved
`workflow.dispatchCeiling.providers` provider/tier cells and compare their
ordered candidate ladders with the bundled
`packages/cli/config/dispatch-matrix-recommendation.json` source (or the
installed bundle's `config/dispatch-matrix-recommendation.json` asset). A
complete custom ladder is allowed, but every supported provider must have valid
ordered `candidates` cells through the named project ceiling. A legacy scalar,
single fallback route, missing tier, empty candidates array, or malformed
ordering is not a complete ladder.

Keep effective ladder completeness separate from project-ceiling resolution.
When `dispatch-ceiling resolve` returns `matrix: null`, that can mean only that
the project policy or named ceiling is unresolved; it is not evidence that the
effective candidate ladders are absent. When every effective provider/tier cell
is complete, skip adoption and proceed directly to the separate project-ceiling
choice.

Only when effective provider/tier cells are missing or incomplete, show the
complete bundled recommendation before asking to write anything:

| Provider        | Economy                                                        | Balanced                                                                                                       | High                                                        | Frontier                               |
| --------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------- |
| Codex           | Luna/low, Luna/medium, Luna/high                               | Luna/xhigh, Terra/low, Terra/medium, Terra/high, Terra/xhigh                                                   | Sol/low, Sol/medium, Sol/high                               | Sol/xhigh, Sol/max                     |
| Claude          | haiku, sonnet                                                  | sonnet                                                                                                         | opus                                                        | fable                                  |
| Cursor (opaque) | `gpt-5.6-luna-low`, `gpt-5.6-luna-medium`, `gpt-5.6-luna-high` | `gpt-5.6-luna-xhigh`, `gpt-5.6-terra-low`, `gpt-5.6-terra-medium`, `gpt-5.6-terra-high`, `gpt-5.6-terra-xhigh` | `gpt-5.6-sol-low`, `gpt-5.6-sol-medium`, `gpt-5.6-sol-high` | `gpt-5.6-sol-xhigh`, `gpt-5.6-sol-max` |

Ask the user to select the owning scope explicitly before any adoption write:

1. **Shared repository** - team-owned `.oat/config.json`; run
   `oat config adopt dispatch-matrix --shared`.
2. **Repo-local checkout** - personal `.oat/config.local.json`; run
   `oat config adopt dispatch-matrix --local`.
3. **User** - cross-repository `~/.oat/config.json`; run
   `oat config adopt dispatch-matrix --user`.
4. **Do not adopt** - leave setup unresolved and block implementation
   readiness.

The selected ownership scope owns only the reusable ladder. The active
project's named ceiling is a separate project-state constraint. A
project-specific active policy or ceiling must not be written to user
`~/.oat/config.json`.

Adoption preserves explicit cells. After adoption, repeat the merged
effective-config query and re-check the full ladder before you re-run the
resolver. If preserved legacy or partial cells still leave effective cells
incomplete or missing, identify those cells and block; do not overwrite, infer,
or mark the plan implementation-ready. In non-interactive mode, incomplete or
missing effective cells block readiness without choosing an ownership scope.

### Reviewer Ceiling Contract

A managed active-provider result is runnable only when the resolver identifies
the final candidate of the configured review ceiling. Call `--role reviewer`
without an ephemeral implementer candidate request. Use that result as the
planning-parent capability threshold, not as an unconditional child pin.

The default planning auto-review route is deliberate parent inheritance:

1. Read launcher-owned evidence for the planning parent's configured model and
   effort.
2. Compare it with the resolved ceiling target on the provider's independent
   axes.
3. When the parent is known at or above the ceiling, omit the child model,
   record `selection_reason: inherit`, and preserve the parent evidence.
4. When the parent is unknown or below the ceiling, select the concrete ceiling
   target before launch as the fail-closed exception below.

Do not assume parent strength from self-report. Do not select a lower candidate
for an exception. A `## Dispatch Profile` row alone cannot authorize reviewer
lowering; only a separate reviewed contract may define a bounded lower
candidate exception.

For the exception route, bind every concrete managed reviewer target to the
actual provider invocation before probing generic reviewer availability or
selecting execution mechanics. A concrete managed Codex target takes precedence
over generic tier availability.

- Codex: when the resolver returns a materialized
  `providers.codex.dispatchArgs.variant`, first launch that exact registered
  reviewer variant as native `agent_type`. Only a recorded actual pre-start
  native role-selection rejection permits a fresh Codex child with the resolver
  target's explicit model, reasoning effort, and canonical role instructions
  from `.agents/agents/oat-reviewer.md`. A separately pre-selected CLI route is
  allowed only when native dispatch cannot express the complete target and no
  child has started. If another route cannot preserve the target, use only a
  verified-equivalent inline route or block the review.
- Claude: require a non-empty `providers.claude.dispatchArgs.model` and put
  that exact value in the actual provider invocation as its `model` argument.
- Cursor: treat `providers.cursor.dispatchArgs.model` as opaque and put that
  exact, unnormalized string in the actual provider invocation as its `model`
  argument.

If the host cannot apply, pass, or bind the required exception role/model
controls, fail closed or block unless verified equivalent inline controls are
already established.

Build the actual host invocation payload before declaring the exception target
enforced. If the accepted reviewer does not conclude, continue, poll, or nudge
the same child handle. A terminal timeout blocks or escalates without another
launch. Only explicit pre-start rejection permits a new recorded selection.
After an artifact rewrite following a completed review, the next review is a
new attempt and reuses the same deliberate inheritance or exact exception
policy. Never continue through a generic tier fallback.

Workflow correctness must not require provider restart or hot reload.
Runtime materialization may be best effort, but it is not the correctness
boundary. Never use a managed base role because an exact target is missing or
unavailable in the current session. Base Codex roles are allowed only for
explicit inherit/default behavior and the documented managed-uncapped reviewer
fallback.

Inline review of a concrete managed exception target is permitted only with
verified equivalent current-host model and effort controls. The default
inheritance route may review inline because the planning parent is the selected
reviewer context.

The Auto Artifact-Review Loop below consumes this reviewer dispatch contract.
Tier selection happens only after the target-preserving route is known and
changes execution mechanics, not the resolved model/effort contract.

## Shared Phase Gate Review Setup Contract

Every plan-producing workflow invokes this procedure after the complete plan
has stable phase IDs and before the plan artifact review begins. The calling
skill owns the prompt and the write to `plan.md`; this section owns the shared
eligibility, preservation, validation, and non-interactive behavior.

### 1. Preserve explicit plan state

Inspect `plan.md` frontmatter before probing configuration. If an explicit
existing `oat_phase_review_gate` key is present, preserve the complete value
unchanged. Do not probe targets, prompt, or mutate the setting. This applies to
enabled, disabled, resumed, and imported explicit values. Report:

```text
Phase gate review: preserved existing oat_phase_review_gate setting.
```

Implementation preflight remains responsible for rejecting a malformed
explicit value. Planning must not silently repair, replace, or disable it.

### 2. Probe qualifying targets

When no explicit setting exists, run the canonical read-only probe:

```bash
oat gate target list --json
```

If `oat` is not available directly, use the repository source CLI with the
same arguments. Do not select or execute a reviewer during this probe. A target
qualifies only when all three JSON fields are literal booleans with these
values:

```text
target.explicitlyConfigured === true
target.enabled === true
target.available === true
```

Built-in-only, disabled, unavailable, missing, or malformed entries do not
qualify. Never infer qualification from target origin, runtime, invocation
metadata, command text, or a merely non-empty target list.

If the probe fails, emit exactly this concise warning and continue planning
without adding the setting:

```text
Warning: Phase gate review target probe failed; Phase gate review remains disabled.
```

If no qualifying target exists, emit:

```text
Phase gate review: disabled (no qualifying target); Phase gate review remains disabled.
```

Do not invent enablement in either branch.

### 3. Offer the canonical choice

When at least one target qualifies and an interactive user-response channel is
available, offer exactly these outcomes:

1. **All phases** - enable the independent Phase gate review after every implementation phase.
2. **Selected phases** - enable the independent Phase gate review only after chosen stable phase IDs.
3. **Disabled** - leave Phase gate review disabled.

Phase gate review is non-pausing when it passes and is distinct from both HiLL
approval and final artifact review.

For all phases, write the existing plan frontmatter shape:

```yaml
oat_phase_review_gate:
  enabled: true
  phases: []
  review_type: code
  exit_nonzero_on: important
```

For selected phases, use the same shape with `phases` populated. Validate the
selected phase IDs against the actual stable phase IDs in the finished plan.
Reject unknown IDs and re-prompt instead of persisting them; de-duplicate valid
IDs and serialize them in plan order, regardless of selection order. Require at
least one valid phase for this choice.

If the user declines or chooses Disabled, do not add
`oat_phase_review_gate`; emit:

```text
Phase gate review: disabled (user declined); Phase gate review remains disabled.
```

### 4. Handle non-interactive planning

Non-interactive mode includes `OAT_NON_INTERACTIVE=1` and any environment with
no user-response channel. Never prompt in this mode. Even when the probe finds
a qualifying target, do not guess all phases or selected phases and do not
invent enablement. Leave the setting absent and emit:

```text
Phase gate review: disabled (non-interactive; no selection recorded); Phase gate review remains disabled.
```

### 5. Keep review gates independent from HiLL

This setup is independent from HiLL checkpoints. It must not read or change
`oat_plan_hill_phases`, `oat_auto_review_at_hill_checkpoints`, or
`oat_hill_completed`. The qualifying target only controls whether the setup
choice is offered; normal lifecycle gate commands remain provider-neutral.
They must not add a provider/model `--target` argument.

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
   - Default: after the parent-at-or-above-ceiling check succeeds, omit the child model deliberately and record `selection_reason: inherit`. Tier 1 uses the configured `oat-reviewer` subagent; Tier 2 runs the same structured prompt in the planning parent.
   - Exception: when the planning parent is unknown or below the ceiling, use the resolver's concrete ceiling target. Codex uses its exact registered reviewer or a fresh child pinned to the same model, effort, and canonical instructions after pre-start role rejection. Claude or Cursor requires the exact `providers.<provider>.dispatchArgs.model` value on the actual invocation; Cursor values remain opaque. If the host cannot preserve that target, block unless inline execution has verified equivalent controls.
   - If an accepted child does not conclude, continue only through its existing handle. A terminal timeout blocks or escalates and cannot launch a replacement child.
   - Always set `oat_output_mode: structured`; the loop consumes `StructuredFindings` in-memory and the reviewer writes no artifact.
   - Do not downgrade the selected inheritance/exception policy or checklist when changing execution mechanics.

4. **Apply or offer fixes by severity**
   - If the structured review is clean, proceed to outcome recording.
   - Apply Critical and Important fixes by default when they are local to the reviewed artifact and the fix is unambiguous.
   - Offer Medium and Minor fixes to the user instead of applying them silently.
   - If a finding cannot be fixed within the artifact boundary, preserve it as residual and surface it before handoff.

5. **Rewrite and re-dispatch within the bound**
   - After applying fixes, rewrite the artifact and start a new review attempt with the same deliberate inheritance policy or complete exception payload, including any exact Claude or Cursor `dispatchArgs.model` argument.
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
- Reusable candidate ladders are config-owned and are never copied into
  `plan.md` or project state. Plan-producing skills resolve them from
  `workflow.dispatchCeiling.*`.
- Project dispatch policy is a named maximum constraint. Persist interactive
  project answers to `state.md` as `oat_dispatch_policy`; never copy
  compiled provider/model targets into that project policy.

Additional frontmatter keys (`oat_phase`, `oat_phase_status`, `oat_blockers`, `oat_last_updated`, `oat_generated`, `oat_template`, `oat_import_reference`, `oat_import_source_path`, `oat_import_provider`) are set by calling skills as needed.

### Dispatch Profile Overrides

`## Dispatch Profile` is optional and should be omitted by default. A profile
may narrow a phase to a named ceiling at or below the project ceiling. The
named ceiling is a maximum candidate tier, not an exact model-family or effort
preference; the implementation root chooses one exact phase-implementer target
from the complete configured ladder. Optional nested work resolves separately
only when the phase implementer justifies and launches it.

Only include the section when the user has explicit constraints or preferences. Routine hand-tuning can be worse than runtime selection because the orchestrator has fresher phase context and host capability information at dispatch time.

If a user-authored override is needed, use this table shape:

```markdown
## Dispatch Profile

| Phase | Named ceiling                           | Rationale                     |
| ----- | --------------------------------------- | ----------------------------- |
| pNN   | economy\|balanced\|high\|frontier\|auto | why this constraint is needed |
```

Validation rules for explicit rows:

- `Phase` must match a real `pNN` phase in the plan.
- `Named ceiling` must be `economy`, `balanced`, `high`, `frontier`,
  `auto`, or blank, and it must not exceed the project named ceiling.
- Under a `High` ceiling, configured candidates from `Economy`, `Balanced`, and
  `High` remain eligible and available; the row does not pin Sol, a Claude
  family, a Cursor string, or an effort value.
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
