---
name: oat-project-plan
version: 1.4.9
description: Use when design.md is complete and executable implementation tasks are needed. Breaks design into bite-sized TDD tasks in canonical plan.md format.
oat_gateable: true
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion
---

# Planning Phase

Transform detailed design into an executable implementation plan with bite-sized tasks.

## Prerequisites

This skill is the plan authoring path for **spec-driven** projects only. Quick,
import, and lite modes have dedicated entry skills that produce `plan.md`
directly.

Read `oat_workflow_mode` from `{PROJECT_PATH}/state.md` (default: `spec-driven`):

- **`spec-driven`**: Complete design document required (`design.md` with `oat_status: complete`). If missing, **Stop.** Tell the user: "Run the `oat-project-design` skill first, then return to planning." Otherwise proceed with planning.
- **`quick`**: **Stop.** Plan is already produced by the quick workflow. Tell the user: "Plan already produced by quick workflow. Run `oat-project-implement` to begin execution."
- **`import`**: **Stop.** If a normalized `plan.md` exists, tell the user: "Imported plan is ready. Run `oat-project-implement` to begin execution." If no `plan.md` exists, tell the user: "Run `oat-project-import-plan` to import and normalize the external plan first."
- **`lite`**: **Stop.** Tell the user: "Lite planning is owned by `oat-project-lite`; run it to author or resume the combined plan contract."

## Plan Format Contract

When creating or editing `plan.md`, load the current `oat-project-plan-writing/SKILL.md` and follow its canonical format rules. This includes stable task IDs (`pNN-tNN`), required sections (`## Reviews`, `## Implementation Complete`, `## References`), required frontmatter keys (`oat_plan_source`, `oat_status`, `oat_ready_for`), and review table preservation rules. `oat_plan_hill_phases` remains optional until `oat-project-implement` confirms the checkpoint selection.

## Mode Assertion

**OAT MODE: Planning**

**Purpose:** Break design into executable tasks with exact files, signatures/test cases, and commands. Spec-driven only — quick and import modes stop-and-route.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ PLAN
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work (drafting/finalizing/reviewing/committing), print 2–5 short step indicators, e.g.:
  - `[1/5] Reading design + context…`
  - `[2/5] Drafting phases + tasks…`
  - `[3/5] Finalizing plan + rollups…`
  - `[4/5] Running plan artifact review…`
  - `[5/5] Updating state + committing…`
- For any operation that may take noticeable time (e.g., reading large artifacts), print a start line and a completion line (duration optional).
- Keep it concise; don’t print a line for every shell command.

**BLOCKED Activities:**

- No implementation code
- No changing design decisions
- No scope expansion

**ALLOWED Activities:**

- Breaking design into phases
- Creating bite-sized tasks (2-5 minutes each)
- Specifying exact files and interface signatures
- Defining test cases and verification commands
- Planning test-first approach

**Self-Correction Protocol:**
If you catch yourself:

- Writing actual implementation → STOP
- Changing architecture decisions → STOP (send back to design)
- Adding new features → STOP (flag for next cycle)
- Needing implementation details that aren't covered by the design → STOP (ask the user whether to update the design, then re-run the `oat-project-plan` skill)

**Recovery:**

1. Acknowledge the deviation
2. Return to planning language ("Task N will...")
3. Keep implementation details at pseudocode/interface level
4. Keep code blocks short (signatures/outlines only)

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
- Write it for future phases:
  ```bash
  mkdir -p .oat
  oat config set activeProject "$PROJECT_PATH"
  ```

**If `PROJECT_PATH` is valid:** derive `{project-name}` as the directory name (basename of the path).

### Step 1: Determine Workflow Mode and Route

```bash
WORKFLOW_MODE=$(oat project status --field project.workflowMode 2>/dev/null || echo null)
```

**Mode: `quick`** — **STOP.** Print:

```
⚠️  This project uses quick mode. Plan is produced by the quick workflow.
    Run the `oat-project-implement` skill to begin execution.
```

Exit skill.

**Mode: `lite`** — **STOP.** Print:

```
⚠️  This project uses lite mode. Run `oat-project-lite` to author or resume
    its combined requirements and single-phase plan.
```

Exit skill.

**Mode: `import`** — **STOP.** Check if `"$PROJECT_PATH/plan.md"` exists:

- If yes: Print: "Imported plan is ready. Run `oat-project-implement` to begin execution."
- If no: Print: "Run `oat-project-import-plan` to import and normalize the external plan first."
  Exit skill.

**Mode: `spec-driven`** — Continue to Step 2.

### Step 2: Check Design Complete

```bash
cat "$PROJECT_PATH/design.md" | head -10 | grep "oat_status:"
```

Required frontmatter: `oat_status: complete`, `oat_ready_for: oat-project-plan`.
If not complete: Block and ask user to finish design first.

### Step 3: Read Design Document

Read `"$PROJECT_PATH/design.md"` completely to understand:

- Architecture overview and components
- Data models and schemas
- API designs and interfaces
- Implementation phases from design
- Testing strategy
- Security and performance considerations

### Step 4: Read Knowledge Base for Context

Read for implementation context:

- `.oat/repo/knowledge/conventions.md` - Code patterns to follow
- `.oat/repo/knowledge/testing.md` - Testing patterns
- `.oat/repo/knowledge/stack.md` - Available tools and dependencies

### Step 4.5: Resolve Project-Explainer Intent

Resolve `projectExplainer` intent before drafting the plan. Use the
`oat-explainer-kit` lifecycle intent resolver with interactive mode, the current
`oat_project_explainer` state value, and the source-aware
`workflow.explainers.projectExplainer` preference.

When resolution returns `needsPrompt: true`, ask exactly once whether to generate the project explainer, then resolve again with the answer and persist the returned `interactive` record.
A valid persisted `oat_project_explainer` decision prevents another prompt.
Persist through the adapter's optimistic-concurrency helper; on a stale write,
re-read state and resolve precedence again instead of retrying the old record.
Do not persist decisions derived only from `always` or `never` workflow
preferences.

### Step 4.9: Snapshot Explicit Phase-Review Setting Before Plan Overwrite

Before Step 5 can replace an existing `plan.md`, inspect the source text and
snapshot both the key presence and the complete explicit value of
`oat_phase_review_gate`. Presence is authoritative regardless of validity; it
is not a truthiness check and must distinguish a missing key from an explicit
`null` value.

Preserve the complete raw YAML entry exactly as written, including its nested
block when present. The snapshot must survive enabled, disabled,
selected-phase, `null`, and malformed values without normalizing, repairing, or
discarding them. Explicit presence remains authoritative and must not trigger a
target probe or re-prompt later in this workflow.

### Step 5: Initialize Plan Document

Check whether a plan already exists at `"$PROJECT_PATH/plan.md"`.

**If `"$PROJECT_PATH/plan.md"` exists:**

- Read it first (treat it as a draft).
- Ask the user:
  - **Resume** (default): continue editing the existing plan in place
  - **View**: show the existing plan and stop
  - **Overwrite**: replace with a fresh copy of the template (warn about losing draft edits). Restore the exact snapshot into the resulting `plan.md` frontmatter immediately after the template replacement and before any other plan write. Preserve the raw `oat_phase_review_gate` entry byte-for-byte; do not parse or normalize it.
- If resuming: ensure the document contains the required sections from the template (at minimum: `## Reviews`, `## Implementation Complete`, `## References`). If any are missing, add them using the template headings (do not delete existing content).

**If `"$PROJECT_PATH/plan.md"` does not exist:**

- Copy template: `.oat/templates/plan.md` → `"$PROJECT_PATH/plan.md"`

Update frontmatter:

```yaml
---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: { today }
oat_phase: plan
oat_phase_status: in_progress
oat_generated: false
oat_template: false
---
```

When Overwrite restored an explicit phase-review snapshot, keep that exact
entry in this first rewritten frontmatter. Do not let the generic frontmatter
update remove or replace it. The shared Phase gate review setup in Step 12.25 must
observe the restored key and preserve it without probing, prompting, or
mutation. When the key was absent from the overwritten plan, do not invent it
before the shared setup contract runs.

### Step 6: Define Phases

Break design implementation phases into plan phases.

**Phase structure:**

- Each phase delivers a complete, testable milestone
- Phases should be 1-3 days of work
- Later phases can depend on earlier phases
- End each phase with verification

### Step 7: Break Into Tasks

For each phase, create bite-sized tasks.

**Task characteristics:**

- 2-5 minutes to complete
- Single responsibility
- Clear verification
- Atomic commit

**No implementation code (important):**

- Prefer **pseudocode**, **interfaces**, and **bullet steps** over full implementations.
- If the task is a shell script, include **function names + responsibilities** and only minimal “shape” snippets (aim for <10 lines per code block).
- If a longer snippet would be useful, replace internals with `{...}` placeholders and document behavior/edge cases in prose.

**Task IDs:** Use stable IDs in format `p{phase}-t{task}` (e.g., `p01-t03`).

**Task template:**

````markdown
### Task p{NN}-t{NN}: {Task Name}

**Files:**

- Create: `{path/to/new.ts}`
- Modify: `{path/to/existing.ts}`

**Step 1: Write test (RED)**
{Test code or test case description}

**Step 2: Implement (GREEN)**
{Interface signatures or implementation outline}

**Step 3: Refactor**
{Optional cleanup}

**Step 4: Verify**
Run: `{command}`
Expected: {output}

**Step 5: Commit**

```bash
git add {files}
git commit -m "feat(p{NN}-t{NN}): {description}"
```
````

### Step 8: Apply TDD Discipline

For each task that involves code:

1. **Test first:** Write test before implementation
2. **Red:** Verify test fails
3. **Green:** Implement minimal code to pass
4. **Refactor:** Clean up while tests pass

**Task order for features:**

1. Write test file
2. Run tests (red)
3. Write implementation
4. Run tests (green)
5. Commit

### Step 9: Specify Exact Details

For each task, include:

- **Files:** Exact paths for create/modify/delete
- **Signatures:** Interface definitions, function signatures, type declarations
- **Test cases:** Test file paths and test descriptions (pseudocode OK for test bodies)
- **Commands:** Exact verification commands that match the claimed scope. If the task says "run this file" or "run this test target," use the real runner invocation that actually scopes to that target rather than a shortcut that may execute the full package suite.
- **Commit:** Conventional commit message with task ID (e.g., `feat(p01-t03): ...`)

**Avoid:**

- Vague instructions ("update the file")
- Missing verification steps
- Verification shortcuts that claim file-scoped coverage but actually run a broader suite
- Bundled unrelated changes
- Full implementation code (leave that for oat-project-implement)

### Step 10: Update Requirement Index

Go back to spec.md and fill in the "Planned Tasks" column in the Requirement Index:

For each requirement (FR/NFR):

- List the stable task IDs that implement it
- Example: "p01-t03, p02-t01, p02-t05"

This creates traceability: Requirement → Tasks → Implementation

### Step 10.1: Keep Reviews Table Rows

Load the current `oat-project-plan-writing/SKILL.md` and follow its review table preservation rules:

- Include both **code** rows (p01/p02/…/final) and **artifact** rows (`spec`, `design`, `plan`)
- Add additional rows as needed (e.g., p03), but never delete existing rows

**Why stable IDs:** Using `p01-t03` instead of "Task 3" prevents broken references when tasks are inserted or reordered.

### Step 11: Defer Plan Phase Checkpoints To Implementation Start

Do **not** ask the user to choose HiLL checkpoints during planning.

Unless the source artifact or user already supplied a confirmed `oat_plan_hill_phases` value that should be preserved, leave `oat_plan_hill_phases` unset in `plan.md` during planning. `oat-project-implement` will confirm the checkpoint choice at implementation start and write the chosen value before task execution begins.

**Required plan body update (do not skip):**

- In `## Planning Checklist`, mark:
  - `[x] Defer HiLL checkpoint confirmation to oat-project-implement`
- If a legacy checklist item such as `Confirmed HiLL checkpoints with user` exists, replace it with:
  - `[x] Defer HiLL checkpoint confirmation to oat-project-implement`

If `## Planning Checklist` is missing (older plans), add it before finalizing with the items above.

### Step 11.5: Resolve Dispatch Policy Before Implementation Readiness

Before marking the plan ready for implementation, invoke the
`Complete Dispatch Ladder Adoption Contract` from
`oat-project-plan-writing` — load the current
`oat-project-plan-writing/SKILL.md` and follow that contract as written — and
then resolve the project named ceiling.

#### A. Ensure a complete owned ladder

Inspect the effective candidate ladders and compare them with the complete
bundled recommendation. If the ladder is missing or incomplete, show that full
recommendation and ask the user to choose the owning scope before running
exactly one of:

```bash
oat config adopt dispatch-matrix --shared
oat config adopt dispatch-matrix --local
oat config adopt dispatch-matrix --user
```

Adoption fills missing cells but preserves explicit values. Re-run the resolver
and the completeness check. An incomplete or missing ladder after adoption
blocks readiness; do not overwrite explicit cells, infer a fallback, or mark
the plan ready. Ordinary non-interactive setup blocks on a missing or
incomplete ladder. When `OAT_AUTONOMOUS=1`, follow the shared contract's
deterministic user-first existing-scope resolution, run exactly one adoption
against the selected config scope, and block only if no authorized compatible
scope exists or the post-adoption ladder remains incomplete.

The owning scope stores only the reusable ladders. A project-specific active
policy or ceiling must not be written to user `~/.oat/config.json`.

#### B. Record the project named ceiling

Resolution order:

1. Project `state.md` frontmatter key `oat_dispatch_policy`
2. Legacy project `state.md` frontmatter key `oat_dispatch_ceiling`
3. Config defaults `workflow.dispatchPolicy.mode` /
   `workflow.dispatchPolicy.policy` as a proposed starting value
4. Interactive planning prompt
5. Unresolved non-interactive state blocks implementation readiness

Generate the canonical choice text with:

```bash
oat project dispatch-ceiling choices --format markdown
```

Do not abbreviate the menu. Include every managed named tier plus `Uncapped`,
`Inherit Host Defaults`, and `Leave Unresolved`. A managed named tier
is a maximum candidate tier, not an enduring exact model-family or effort
preference. For example, a named `High` ceiling leaves configured candidates
from `Economy`, `Balanced`, and `High` available at or below the
maximum. An optional phase `## Dispatch Profile` row may narrow that maximum.

```yaml
oat_dispatch_policy:
  mode: managed
  policy: high
  source: project-state
```

Persist this normalized shape only in `"$PROJECT_PATH/state.md"`. Never copy
compiled provider targets into project state, and do not persist the active
project ceiling to user config.

`Uncapped` persists explicit managed uncapped state. `Inherit Host
Defaults` persists explicit inherit/default state. `Leave Unresolved` is
a planning deferral and is not implementation-ready. Do not prompt when
`OAT_NON_INTERACTIVE=1` or no response channel exists; leave the ceiling
unresolved and block readiness.

### Step 12: Review Plan with User

Present plan summary:

- Number of phases
- Tasks per phase
- Key milestones

Also note that `oat-project-implement` will confirm the actual HiLL checkpoint selection at execution start and then write `oat_plan_hill_phases` into `plan.md`.

Ask: "Does this breakdown make sense? Any tasks missing?"

Iterate until user confirms.

### Step 12.1: Propose Parallel Groups (Optional)

After all phases are drafted, evaluate whether any phases have non-overlapping file boundaries:

1. For each pair of adjacent phases in the plan, check the `Files:` section of all tasks in each phase.
2. If no file appears in both phases' task files sections, they are candidates for a parallel group.
3. Propose to the user:

   ```
   I noticed phases p02 and p03 have disjoint file boundaries (no overlap).
   Declare them as a parallel group? This lets oat-project-implement run them
   concurrently in worktrees, cutting wall-clock time.
   ```

4. If the user confirms, update `oat_plan_parallel_groups` in the plan frontmatter.
5. If no phases are obviously independent, skip this step silently — do not invent parallelism.

Never silently infer parallelism without explicit user confirmation.

### Step 12.25: Configure Optional Phase Gate Review

After the confirmed plan has stable phase IDs and before Step 12.5 starts the
plan artifact review, invoke the `Shared Phase Gate Review Setup Contract` from
`oat-project-plan-writing`: load the current
`oat-project-plan-writing/SKILL.md` and follow that contract as written.

When that contract offers a choice, render its required question verbatim:
"Should an additional cross-runtime phase gate review run after implementation
phases? Built-in per-phase root reviews and the final review run regardless of
this choice." Do not add a bare `(Recommended)` option label.

If `plan.md` already contains an explicit `oat_phase_review_gate`, preserve it
through the shared contract without probing, prompting, or mutation. Otherwise
let the contract probe qualifying targets and offer all phases, selected
phases, or disabled. If the probe fails, no target qualifies, or the user
declines, leave Phase gate review disabled and continue with the contract's concise
status output.

This Phase gate review setup is independent from HiLL checkpoints. Do not read or
change HiLL fields here, and do not add a provider/model `--target` to any
lifecycle command.

### Step 12.35: Configure Lifecycle Gate Posture

After the confirmed plan has stable phase IDs and before Step 12.5 starts the
plan artifact review, invoke the `Shared Lifecycle Gate Posture Setup Contract` from
`oat-project-plan-writing`: load the current
`oat-project-plan-writing/SKILL.md` and follow that contract as written. This
runs adjacent to, but independently from, the phase gate review setup above.

If `"$PROJECT_PATH/state.md"` already contains an explicit
`oat_skill_gate_overrides` map, preserve it through the shared contract without
probing, prompting, or mutation. Otherwise let the contract probe the configured
gate-aware skills and offer a keep-or-disable choice for each configured gate
independently.

Persist only disabled choices, and only in `"$PROJECT_PATH/state.md"`. Keeping
every gate leaves the map absent. Never modify the shared, local, or user
configuration layers, and never prompt or write a new map in non-interactive
mode.

### Step 12.5: Run Plan Artifact Review Loop

Before dispatching the artifact reviewer, invoke the `Managed Dispatch
Readiness and Review Contract` from `oat-project-plan-writing` — load the
current `oat-project-plan-writing/SKILL.md` and follow that contract as
written:

```bash
oat project dispatch-ceiling resolve --provider "$ACTIVE_PROVIDER" --role reviewer --preflight --json
```

If managed resolution or the complete ladder is unresolved, return to Step
11.5, adopt the recommendation in the selected ownership scope, and re-run the
resolver. Do not mark the spec-driven plan ready while either contract is
unresolved.

Invoke the shared `Auto Artifact-Review Loop` from `oat-project-plan-writing` with target `plan` before setting `plan.md` to implementation-ready. Load the current `oat-project-plan-writing/SKILL.md` and follow that loop as written.

Required payload:

- `target: plan`
- `type: artifact`
- `scope: plan`
- `artifact_path: "$PROJECT_PATH/plan.md"`
- `oat_output_mode: structured`

Apply the shared loop exactly:

- Resolve `workflow.autoArtifactReview.plan`; only an explicit `false` skips the loop.
- Resolve `oat_orchestration_retry_limit` from project state, defaulting to `2`.
- Review in the current planning parent by deliberate inheritance by default.
  Do not launch a managed child unless launcher-owned evidence identifies that
  parent as unknown or below the resolved reviewer ceiling.
- For that exception only, apply the shared concrete target contract. A Codex
  materialized variant must first be launched as the exact native `agent_type`;
  only a recorded actual pre-start role-selection rejection permits a fresh
  child pinned to the resolved model and effort. Claude uses the exact
  resolver-returned `providers.claude.dispatchArgs.model` value. Cursor
  launches the exact resolver-returned
  `providers.cursor.dispatchArgs.variant` native reviewer variant first;
  Cursor model strings remain opaque inside the mapping and resolver. Only a
  pre-start native role-selection rejection permits another route.
- After acceptance, poll, nudge, or continue only through the existing reviewer
  handle. A terminal timeout blocks or escalates without another launch.
  Replacement eligibility is limited to explicit pre-start rejection.
- Run an exception inline only with verified equivalent current-host model and
  effort controls. Default inherited review runs in the planning parent. If
  neither route applies, fail closed before artifact review.
- Apply Critical and Important artifact-local fixes when unambiguous; offer Medium and Minor fixes instead of silently applying them.
- Re-dispatch after rewrites until clean or the retry bound is exhausted.
- Update the `plan` artifact row in the `## Reviews` table to `passed` when clean. If residual findings remain, preserve the row and surface the residual findings before downstream handoff.

### Gate Execution

After the plan artifact is finalized and reviewed, run the configured gate as
the last check before the completion boundary:

1. Resolve the gate for this skill with project context:

   ```bash
   oat gate resolve <this-skill> --project "$PROJECT_PATH" --json
   ```

   Handle all three `resolution` values explicitly:
   - `not_configured`: no gate is configured; proceed directly to the completion steps in Step 13 below.
   - `configured_disabled_by_project`: the operator disabled this configured gate for this project. Do not launch any process. Emit `configured but disabled by project override`, including the project path and the `projectOverride` source from the envelope, then proceed directly to the completion steps in Step 13 below. A project-disabled gate never enters the passed, missing, or failed branches, and its `configuredGate` is evidence only, never executed.
   - `configured`: continue with the steps below, executing `effectiveGate` exactly as configured.

   A null, missing, malformed, or unrecognized result is an operational failure
   that fails closed as unresolved. Never treat it as "no gate configured."

2. Export the resolved project path into the command shell:

   ```bash
   export PROJECT_PATH
   ```

   If the resolved command invokes `oat gate review`, the configured review command must already include `--project "$PROJECT_PATH"` as part of the structured-output contract. Its canonical form is:

   ```bash
   oat --json gate review --project "$PROJECT_PATH" ...
   ```

   This requires global `--json` before `gate review`. Reusable declarations must not include `--target <id>`. Reject `oat gate review ...` without the global `--json` placement. Stop and migrate an invalid stored declaration before execution; never inject or append execution-time argv.

3. Resolve the current planning parent's model identity from session context.
   When that identity is non-empty and the resolved configured command invokes
   `oat gate review`, export
   `OAT_GATE_PRODUCER_IDENTITY=<model>:declared` for that command invocation.
   For a non-review configured command or unavailable current identity, ensure
   `OAT_GATE_PRODUCER_IDENTITY` is unset. Do not persist the value or alter the
   configured command.

4. Execute the resolved command exactly as configured and unchanged. Capture
   stdout, stderr, the exit code, and the structured JSON result. A zero exit
   code means the review passed its threshold, but it does not by itself
   authorize artifact receipt or complete the handoff.

5. Review-artifact handoff:
   - Parse the structured gate result. An exit code or artifact path alone never authorizes `oat-project-review-receive`.
   - Invoke receive only when all three conditions hold: `status` is `ok` or `blocked`, the envelope explicitly sets `receiveEligible: true`, and a non-null `handoff` confirms the artifact was corroborated.
   - `receiveEligible: false` is a hard stop even when `artifactPath` is present. Never receive `targeting_correlation_failed`; correct the project/run routing and run a new gate.
   - Keep `artifact_validation_failed` outside receive until the artifact is corrected and the gate successfully revalidates it. Treat `review_failed`, unknown statuses, null handoffs, and contradictory eligibility fields as operational failures.
   - `blocked` exits nonzero but is receive-eligible; `ok` exits zero and still requires durable receive disposition. Route by structured status and eligibility, not by exit code.

6. If the command exits nonzero, use `description` to orient the next steps and handle `onFailure`:
   - `block`: read gate feedback, remediate, and re-run the gate up to `maxAttempts` attempts (default `2`). If attempts are exhausted, escalate to the human with accumulated feedback and append that feedback to `implementation.md`. Treat a launch failure, missing CLI, or no eligible runtime as escalation-biased and do not spend it as a remediation attempt.
   - `prompt`: surface the gate failure and ask the human how to proceed.
   - `warn`: record the gate failure and continue.

7. Runtime selection note: the review-only declaration carries producer
   identity, not reviewer runtime identity. By default, `oat gate review` and
   `oat gate cross-provider-exec` resolve the current host from built-in
   `hostDetectionCommand`s and avoid the same runtime when no exact target is
   supplied. Reusable lifecycle skill-gate commands must not include
   `--target <id>` so independent review stays provider-neutral. Use explicit
   targets only for manual/debug commands or deliberate local/user-specific
   overrides; do not hardcode provider/model targets in bundled skill guidance
   or shared lifecycle gate examples.

A gate that ends in `block` after attempts are exhausted, or at an unresolved
`prompt` boundary, means the completion steps below MUST NOT run; the phase
stays `in_progress` and resumable.

### Step 13: Mark Plan Complete

Reach this completion boundary only after the configured gate passes or resolves
according to its `onFailure` policy.

Before setting `oat_status: complete`, verify:

- `## Planning Checklist` exists
- the checklist records that checkpoint confirmation is deferred to implementation
- if `oat_plan_hill_phases` is already present, it is intentionally preserved and valid
- the `plan` artifact review row has been recorded by Step 12.5, unless `workflow.autoArtifactReview.plan` was explicitly disabled

Update frontmatter:

```yaml
---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: { today }
---
```

### Step 14: Update Project State

Update `"$PROJECT_PATH/state.md"`:

**Frontmatter updates:**

- `oat_current_task: null`
- `oat_last_commit: {commit_sha_from_step_15}`
- `oat_blockers: []`
- `oat_phase: plan`
- `oat_phase_status: complete`
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`
- **If** `"plan"` is in `oat_hill_checkpoints`: append `"plan"` to `oat_hill_completed` array

**Note:** Only append to `oat_hill_completed` when the phase is configured as a HiLL gate.

Update content:

```markdown
## Current Phase

Planning - Ready for implementation

## Progress

- ✓ Discovery complete
- ✓ Specification complete
- ✓ Design complete
- ✓ Plan complete
- ⧗ Awaiting implementation
```

### Step 15: Commit Plan

```bash
PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || { echo "oat: cannot resolve project scope for $PROJECT_PATH; refusing to commit artifacts" >&2; exit 1; }
# fail closed: never fall back to branch bookkeeping when scope resolution fails
if [ "$PROJECT_SCOPE" = "synced" ]; then
  oat project push "$PROJECT_PATH" --message "docs: complete implementation plan for {project-name}

Phases:
- Phase 1: {description} ({N} tasks)
- Phase 2: {description} ({N} tasks)

Total: {N} tasks

Ready for implementation" || { echo "oat: project push failed; run oat project pull, resolve the reported state, and retry" >&2; exit 1; }
else
  PROJECT_OUTPUT_PATHS=("$PROJECT_PATH/plan.md" "$PROJECT_PATH/state.md")
  git add -- "${PROJECT_OUTPUT_PATHS[@]}"
  git commit -m "docs: complete implementation plan for {project-name}

Phases:
- Phase 1: {description} ({N} tasks)
- Phase 2: {description} ({N} tasks)

Total: {N} tasks

Ready for implementation"
fi
```

### Step 15.5: Generate the Project Explainer When Selected

Generate only after plan artifact review, the configured plan gate, and the plan commit have completed successfully.
When the resolved project-explainer decision is `generate`, invoke
`oat-explainer-kit` for the `project-explainer` recipe using the approved
project artifacts and report its outcome and run path. A `skip` decision ends
this step without invoking the adapter.
Supply the provider-neutral critic callback (or validated critic module entry point for JSON/CLI invocation) on every federated adapter run.

Explainer failure must not roll back, amend, or invalidate the valid committed plan.
Preserve the adapter's failure outcome and recovery guidance, warn the user,
and continue to the planning summary. This post-plan product does not replace
or reorder plan artifact review, dispatch resolution, the configured plan gate,
or HiLL handling.

### Step 16: Output Summary

```
Planning phase complete for {project-name}.

Phases:
- Phase 1: {description} ({N} tasks)
- Phase 2: {description} ({N} tasks)

Total: {N} tasks

Next: Run oat-project-implement to begin execution.
```

## Success Criteria

- All design components covered by tasks
- Tasks are bite-sized (2-5 minutes)
- TDD discipline applied to code tasks
- Each task has clear verification
- Requirement Index updated with task mappings
- User confirmed plan is complete
