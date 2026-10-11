---
name: oat-project-brief
description: Use when one delivery needs a design-aligned interview, a single approved Project Brief with phases of intent and exit evidence instead of planned tasks, and resumable OAT implementation.
argument-hint: '<project-name> ["project description"]'
oat_gateable: true
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion, Task
metadata:
  version: 1.0.0
---

# Brief Project

Create or resume a project in **brief mode** and produce one reviewed,
approved Project Brief in `plan.md` for `oat-project-implement`.

## Hook-safe exact-path commits

Before a parent-branch commit, verify `oat internal commit-paths --help` succeeds. If unavailable, stop and update the OAT CLI; never fall back to a staged-index or pathspec-only commit. Set `COMMIT_IDENTITY` to a unique operation/artifact identity before the first attempt and retain it for every retry; use a new identity for a new operation. Pass only the exact produced file list, including tracked removals and both names of a rename. A blocked/failed result stops the workflow; retain its receipt and follow its diagnostics. Hooks remain enabled. Synced project artifacts continue through `oat project push`.

## Prerequisites

- A repository initialized for OAT (`.oat/` and `.agents/` exist).
- One delivery whose outcome can be agreed in conversation, without a
  separate discovery, spec, or design document.

## Mode Assertion

**OAT MODE: Brief**

**Purpose:** Reach design alignment through a conversational interview, write
one Project Brief in a single pass, take it through the standard
pre-implementation review ladder, and approve it once. Phases carry intent and
exit evidence; tasks are execution records created during implementation.

Read `references/brief-contract.md` before Step 2. It is the shared contract
for brief sections, phase and marker grammar, readiness, the review ladder,
execution records, anchors, and promotion.

When `OAT_AUTONOMOUS=1`, read `references/docs/autonomy-contract.md` and keep
`OAT_NON_INTERACTIVE=1` set for the run. Resolve every interactive decision
through its `BRIEF-NN` row and stop only where that row declares a boundary:

- `BRIEF-01`: inherited dirty tree;
- `BRIEF-02`: missing project name or description;
- `BRIEF-03`: alignment interview;
- `BRIEF-04`: workflow fit;
- `BRIEF-05`: dispatch-ladder scope;
- `BRIEF-06`: project dispatch policy;
- `BRIEF-07`: optional phase-gate setup;
- `BRIEF-08`: configured lifecycle gate posture;
- `BRIEF-09`: brief artifact-review findings;
- `BRIEF-10`: configured exit gate; and
- `BRIEF-11`: brief approval.

Record each autonomous resolution and its provenance in the artifact named by
the row. Never persist either autonomy environment signal.

**BLOCKED Activities:**

- No `discovery.md`, `spec.md`, or `design.md` authoring; agreed design lives
  in the brief's Approach and Decisions.
- No `### Task` headings in `plan.md` and no execution records in
  `implementation.md`; tasks are opened only when work starts.
- No implementation code changes.

**ALLOWED Activities:**

- Brief scaffolding and project metadata updates.
- A conversational interview in readiness rounds, with facts resolved by the
  agent and decisions put to the user.
- One Project Brief with concrete next phase and provisional later phases.
- Brief artifact review, dispatch policy resolution, configured gate review,
  and one approval.

**Self-Correction Protocol:**

- If the user wants an approved up-front task plan, offer promotion to quick
  instead of writing tasks into the brief.
- If a design question cannot be settled without a separate design artifact,
  apply the Step 2 workflow-fit check rather than inventing an answer.
- If implementation code is about to change, stop and hand off to
  `oat-project-implement`.

## Progress Indicators (User-Facing)

Print this banner once after entry:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ BRIEF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use these compact progress lines:

- `[0/8] Checking inherited git state…`
- `[1/8] Resolving the brief project…`
- `[2/8] Running the alignment interview…`
- `[3/8] Writing and committing the brief…`
- `[4/8] Resolving dispatch and gate setup…`
- `[5/8] Reviewing the brief artifact…`
- `[6/8] Running the configured gate…`
- `[7/8] Confirming brief approval…`
- `[8/8] Initializing the journal and handing off…`

## Artifact Persistence (Required)

- Save every change to `plan.md`, `state.md`, and `implementation.md`
  immediately. Never leave interview answers or agreed design only in
  conversation.
- After Step 3 authoring, commit the scoped project artifacts before any review
  dispatch. The reviewer and the gate read the committed brief, not the
  session.
- After Step 3.6 records the review disposition, commit the same scoped
  artifacts before Gate Execution so the gate sees a committed core-artifact
  baseline.
- After a receive-eligible gate handoff, commit its receive bookkeeping and the
  `oat_brief_gate` record. The Step 6.5 completion commit runs only after the
  gate passes or resolves and the brief is approved.
- Before each scoped commit, resolve the project scope. Scope resolution fails
  closed. A synced project uses `oat project push` with the same message;
  another scope uses `oat internal commit-paths --identity "${COMMIT_IDENTITY:?set once and retain for retries}:oat-project-brief:1" --message "$BOOKKEEPING_MESSAGE" -- "$PROJECT_PATH/plan.md" "$PROJECT_PATH/state.md" "$PROJECT_PATH/implementation.md"` and stops on a nonzero exit. Set the same bookkeeping message and a distinct operation identity for each lifecycle write; retain both for retries. Never include unrelated paths.

## Artifact Hygiene

Artifact hygiene contract: Before finishing or committing, format every file you created or edited. Use the concrete write/fix formatting command supplied by the governing plan, task, or brief. If none is usable, discover the repository's documented write/fix command from applicable `AGENTS.md`/`CLAUDE.md` instructions and relevant package manifests; do not infer or hardcode a formatter. Prefer a file-scoped invocation when supported, and avoid rewriting unrelated files. If no command is discoverable, warn once with `no format command discovered in repo instructions; skipping`, then continue.

After formatting, run only repository checks relevant to the files changed;
writing lifecycle artifacts does not imply unrelated full test suites.

## Process

### Step 0 (Preflight): Inherited Git State

Before scaffolding, surface the working tree state so unrelated changes don't
get carried into the project workflow's bookkeeping commits.

1. Run `git status --porcelain`. If empty, continue silently.
2. If `.oat/sync/manifest.json` is the only entry **and** its two-character
   status code is either `??` or made up solely of the letter `M` and blanks —
   a plain modification, staged, unstaged, or both — commit it without asking:
   `oat internal commit-paths --identity "${COMMIT_IDENTITY:?set once and retain for retries}:oat-project-brief:2" --message "chore: run sync" -- .oat/sync/manifest.json`.
   Report the commit and continue. Every other code falls through, including
   `MD`, `MT`, `AM`, `RM`, `CM`, and every unmerged state.
3. Otherwise, present the dirty list to the user and offer commit now, proceed
   anyway, or abort (`BRIEF-01`). Note generated provider-view paths when they
   appear. Commit now stages only the paths the user selected.
4. When the response channel is unavailable and `OAT_NON_INTERACTIVE=1`, apply
   `BRIEF-01`: proceed without staging unrelated files. Destructive cleanup is
   a stop boundary.

Once the dirty list has been presented, do not advance past this gate without
an explicit choice. The step 2 manifest-only auto-commit is not a choice point
and continues on its own.

### Step 0.5: Resolve Active Project or Scaffold Brief

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

**Resume in place.** When `PROJECT_PATH` names an existing project whose
`state.md` records `oat_workflow_mode: brief`, resume it and never re-scaffold:

- `plan.md` reads `oat_status: complete` and
  `oat_ready_for: oat-project-implement` → nothing is left to author; load
  `oat-project-implement/SKILL.md` and follow it.
- Otherwise re-enter at the earliest step whose output is missing: no authored
  brief → Step 2; an authored brief with no review disposition → Step 3.5; a
  recorded disposition with no gate outcome → Gate Execution; a resolved gate
  without approval → Step 3.7. Preserve every authored section, phase, and
  `## Reviews` row; never copy a template over an authored brief.

A project in another mode is not resumed here. A promoted brief is a quick
project and resumes through `oat-project-quick-start`.

If no valid active brief project exists, resolve a project name and
substantive description from `$ARGUMENTS`. A bare name is insufficient. Ask for
the missing startup input under `BRIEF-02`; in autonomous mode derive both only
from the explicit goal and stop if it is not substantive.

Create the project through the canonical scaffolder:

```bash
oat project new "{project-name}" --mode brief
PROJECT_PATH=$(oat config get activeProject)
```

Confirm `"$PROJECT_PATH/state.md"` exists and reports
`oat_workflow_mode: brief`, `oat_phase: plan`, and
`oat_phase_status: in_progress`, and that `plan.md` (from the `plan-brief`
template), `implementation.md` (from `implementation-brief`), and
`references/research/` exist. A missing file or a different mode stops the run
before any write. Do not create discovery, spec, or design artifacts.

**Consolidating earlier scaffolds.** When this brief project absorbs work that
earlier project scaffolds already started, record `absorbed_projects: [<slug>]`
and `absorbed_backlog_ids: [<BL-id>]` in `"$PROJECT_PATH/state.md"` as one
frontmatter write immediately after the scaffold, with the same shapes and
meaning that `oat-project-quick-start` and `oat-project-lite` record. Record
them only when a consolidation actually happened.

### Step 1: Set Metadata and Read Repository Knowledge

Update `"$PROJECT_PATH/state.md"` frontmatter:

- `oat_workflow_mode: brief`
- `oat_workflow_origin: native`
- `oat_phase: plan`
- `oat_phase_status: in_progress`
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

Read repository instructions and the minimum durable context the interview
needs. Start with root `AGENTS.md`/`CLAUDE.md`. If `.oat/repo/AGENTS.md`
exists, follow its routing into current state, decisions, and references.
Settle facts from code, docs, and research before asking about them.

### Step 2: Alignment Interview

Follow the readiness and design-strand rules in `references/brief-contract.md`
(`BRIEF-03`). In summary:

1. **Readiness rounds.** Ask in small rounds. Batch independent questions,
   sequence dependent ones, and ask one question alone when its answer
   reshapes the rest. Give each question a recommendation and its tradeoff,
   worded so accepting the recommendation is a one-word answer.
2. **Facts versus decisions.** Facts the agent can settle from code, docs, or
   research never become questions; resolve them yourself, using read-only
   subagents when that is faster, without blocking the round. Decisions go to
   the user.
3. **Design strand.** Cover, proportionally to the work, the architecture
   (components, boundaries, interfaces, data shapes), the observable behavior,
   the alternatives for each consequential design decision with a
   recommendation and its cost, and the risks. The user chooses; record the
   choice and the rejected alternatives.
4. **Known Unknowns.** A question that only matters inside one phase, or that
   needs evidence, becomes a Known Unknown with the phase that settles it
   (often a research or prototype phase), not an interview question.
5. **Stop criterion.** Stop when outcome, boundaries, approach, evidence, and
   remaining uncertainty are understood and the user has explicitly accepted
   the design. Readiness is design alignment, never a round count.

Persist interview results as you go: write agreed decisions and design into
the brief sections in `"$PROJECT_PATH/plan.md"` rather than holding them in
conversation.

**Workflow fit (`BRIEF-04`).** Change course only on content, never on
interview length:

- The work is several independent deliveries → recommend separate projects,
  or `oat-project-split` for a confirmed broad scope. Goal mode, for many
  milestones, is not registered yet.
- A design question cannot be settled without a separate design artifact →
  recommend quick with lightweight design, reached under the promotion
  precondition below.
- The user wants a maintained, approved up-front task plan → offer quick under
  the same precondition. Execution-time lookahead does not need it.
- The change fits one sitting with no phase structure → `oat-project-lite`
  remains available.

Otherwise record in Decisions why brief fits and continue.

**Promotion precondition.** Promotion to quick through
`oat project promote "$PROJECT_PATH" --to quick --json` is offered only after
Step 3 has written, validated, and committed the brief, because promotion
migrates the committed brief's phases. Before that point, abandon the brief
scaffold and start `oat-project-quick-start` instead.

### Step 3: Write the Brief in One Pass and Commit

Write `"$PROJECT_PATH/plan.md"` in one pass from the agreed interview, keeping
the `plan-brief` scaffold frontmatter (`oat_plan_source: brief`,
`oat_template: true`, `oat_status: in_progress`, `oat_ready_for: null`) until
Step 3.7. Keep `oat_plan_hill_phases: []`, which means none for brief modes.

The brief contains, in template order: Goal; Outcomes (numbered, each naming
its intended evidence); Approach (agreed architecture, with an optional
`### Design` subsection); Constraints and Out of Scope; Decisions (one line and
rationale each, including rejected alternatives); Known Unknowns (each with the
phase that settles it); Delivery endpoint and authority (recorded once and
reused, never re-asked per command); the empty `## Milestones` section, which
brief projects leave empty; Phases; Parallelism; Reviews; Implementation
Complete; References. Planned proof lives here; observed evidence goes in
`implementation.md`.

Each phase follows the strict grammar in `references/brief-contract.md`:
`## Phase pNN: <name>`, a blank line, then `**Intent:**`, `**Exit evidence:**`,
and `**Provisional:** yes|no`. The first phase is concrete
(`**Provisional:** no`); later phases may stay provisional until they are made
concrete. Phase IDs are stable and never reused, and document order governs
execution. Declare `oat_plan_parallel_groups` only for concrete phases that
pass the independence test. Seed `## Reviews` with the `plan | artifact` row,
one `code` row per concrete phase, and the `final` row.

Validate the brief with the brief profile:

```bash
oat project validate-plan --project-path "$PROJECT_PATH"
```

Resolve every error (`brief-no-phases`, `brief-duplicate-phase`,
`brief-phase-missing-intent`, `brief-phase-missing-exit-evidence`,
`brief-provisional-invalid`, `brief-first-phase-provisional`,
`brief-malformed-phase-heading`) before continuing. Remove any
`### Task` heading that triggers the `brief-task-headings-ignored` warning.

Format the brief, resolve project scope, and create the scoped pre-review
commit required by Artifact Persistence. Only after that commit is durable may
Step 3.5 run.

### Step 3.5: Resolve Dispatch Ladder and Ceiling

Invoke the complete **Managed Dispatch Readiness and Review Contract** from
`oat-project-plan-writing`, including its `Complete Dispatch Ladder Adoption
Contract`. Load the current `oat-project-plan-writing/SKILL.md` and follow
that contract as written. Resolve and, when necessary, adopt the dispatch
ladder before selecting a project policy. Do not copy model names into the
skill.

For the ladder ownership decision, apply `BRIEF-05`, which is identical to
`QS-08`: check existing user, local, then authorized shared configuration in
that fixed order; skip scalar-blocked candidates; adopt once; re-run the
preflight resolver. Stop before writing if none is compatible.

Resolve the project policy through `BRIEF-06`, identical to `QS-09`, in this
order: project `oat_dispatch_policy`, legacy `oat_dispatch_ceiling`, config
`workflow.dispatchPolicy.*` as a proposed starting value, then an interactive
choice rendered by `oat project dispatch-ceiling choices --format markdown`.
Unresolved non-interactive state blocks implementation readiness. Persist the
policy only in `"$PROJECT_PATH/state.md"`; it remains a named ceiling,
uncapped managed selection, or host inheritance, never a pinned provider
target.

Run the reviewer readiness check:

```bash
oat project dispatch-ceiling resolve --provider "$ACTIVE_PROVIDER" --role reviewer --preflight --json
```

### Step 3.55: Configure Optional Phase Gate Review

After the brief has stable phase IDs and before Step 3.6, invoke the
`Shared Phase Gate Review Setup Contract` from `oat-project-plan-writing`:
load the current `oat-project-plan-writing/SKILL.md` and follow that contract
as written (`BRIEF-07`). Preserve an explicit `oat_phase_review_gate` without
probing or mutation. The optional phase gate is independent from the built-in
per-phase reviews and the final review, which run regardless. Brief projects
have no HiLL setup.

### Step 3.57: Configure Lifecycle Gate Posture

After the brief has stable phase IDs and before Step 3.6,
invoke the `Shared Lifecycle Gate Posture Setup Contract` from
`oat-project-plan-writing`: load the current
`oat-project-plan-writing/SKILL.md` and follow that contract as written.
Supply exactly this relevant set: `oat-project-brief` and
`oat-project-implement`.

Apply `BRIEF-08` to the shared contract's interaction. When
`oat_skill_gate_overrides` already exists, preserve it through the shared
contract without probing, prompting, or mutation. Otherwise, in interactive
planning, offer Keep or Disable independently for each configured gate in the
relevant set. Persist only disabled choices to `"$PROJECT_PATH/state.md"`.
Never modify the shared, local, or user configuration layers. In
non-interactive planning, preserve configured gates and do not invent or write
an override.

### Step 3.6: Run Brief Artifact Review Loop

Invoke the `Auto Artifact-Review Loop` from `oat-project-plan-writing`. Load
the current `oat-project-plan-writing/SKILL.md` and follow that loop as
written, with:

- `target: plan`
- `type: artifact`
- `scope: plan`
- `artifact_path: "$PROJECT_PATH/plan.md"`
- `oat_output_mode: structured`
- `artifact_paths: { brief_contract: "$BRIEF_SKILL_DIR/references/brief-contract.md" }`,
  where `BRIEF_SKILL_DIR` is the directory this `SKILL.md` was loaded from

The review dispatch includes the committed brief and the brief contract through
that payload, never the interview session. Resolve `workflow.autoArtifactReview.plan`; only
explicit `false` skips the loop. Keep review at the current planning parent
unless the shared managed-dispatch contract proves the exception route is
required. Accepted handles are never replaced.

Disposition of findings (`BRIEF-09`):

- Fold minor, artifact-local findings into the brief without changing intent.
- A material finding (one that would change an Outcome, the Approach, a
  Decision, a phase boundary, or the authority) goes back to the user as a
  short, focused realignment; the agreed answer is written into the brief and
  the loop re-runs on the new commit.
- Under autonomy, apply only unambiguous artifact-local fixes, never rewrite
  agreed intent, and stop on an unresolved Critical finding or material
  ambiguity.

Record the review row in `## Reviews` (or the explicit skip
`Plan artifact review: skipped (workflow.autoArtifactReview.plan=false)`).
Format and validate again, then create the post-review scoped commit before
Gate Execution. The brief stays `in_progress` and resumable.

### Gate Execution

The brief exit-gate review scope is the committed `plan.md`, `state.md`, and
`implementation.md` bundle. It runs after Step 3.6 and before Step 3.7, so the
user approves the brief the gate has already reviewed.

1. Resolve the gate for this skill with project context:

   ```bash
   oat gate resolve <this-skill> --project "$PROJECT_PATH" --json
   ```

   Handle all three `resolution` values explicitly:
   - `not_configured`: no gate is configured; write no record and proceed directly to the approval in Step 3.7 below.
   - `configured_disabled_by_project`: the operator disabled this configured gate for this project. Do not launch any process. Emit `configured but disabled by project override`, including the project path and the `projectOverride` source from the envelope, write `oat_brief_gate` as `allowed/project_disabled` with `reviewed_head: null` per **Persist the gate outcome** below, then proceed directly to the approval in Step 3.7 below. A project-disabled gate never enters the passed, missing, or failed branches, and its `configuredGate` is evidence only, never executed.
   - `configured`: continue with the steps below, executing `effectiveGate` exactly as configured.

   A null, missing, malformed, or unrecognized result is an operational failure
   that fails closed as unresolved. Never treat it as "no gate configured."

2. Export `PROJECT_PATH`. If the stored command invokes lifecycle gate review,
   its canonical form is:

   ```bash
   oat --json gate review --project "$PROJECT_PATH" ...
   ```

   Use global `--json` before `gate review`. Reject `oat gate
review ...` without the global `--json` placement. Reusable declarations
   must not contain `--target <id>` or add it at runtime. Stop and migrate an invalid stored
   declaration before execution; never inject or append execution-time argv.

3. When the current planning parent's model identity is available and the
   command is `oat gate review`, export
   `OAT_GATE_PRODUCER_IDENTITY=<model>:declared` only for that invocation.
   Otherwise ensure it is unset. Do not persist it or alter the command.
4. Execute the resolved command exactly as configured. Capture stdout, stderr,
   exit code, and structured JSON. Exit code alone never authorizes receipt.
5. Invoke receive only when all three conditions hold: status is `ok` or
   `blocked`, `receiveEligible: true`, and a non-null `handoff` corroborates
   the artifact. `receiveEligible: false` is a hard stop.
   `targeting_correlation_failed` is never receivable. Correct and revalidate
   `artifact_validation_failed` before receipt. Unknown, contradictory, or
   malformed results stop.
6. For a validated, receive-eligible `blocked` result, apply `BRIEF-10`:
   - `block`: remediate and re-run the gate up to `maxAttempts` attempts
     (default `2`);
   - `prompt`: surface the failure and ask the human how to proceed; under
     `OAT_AUTONOMOUS=1` it is a reported boundary;
   - `warn`: record the validated gate failure and continue.

Operational, validation, targeting, launch, and receive failures never inherit
`onFailure` continuation semantics.

A gate that ends in `block` after attempts are exhausted, or at an unresolved
`prompt` boundary, means Step 3.7 and the completion steps MUST NOT run; the
project stays `in_progress` and resumable. Persist eligible receive bookkeeping
in its own scoped commit.

**Persist the gate outcome.** For a configured gate, including one disabled by
project override, write `oat_brief_gate` to `$PROJECT_PATH/state.md` with
exactly the core fields defined in `references/docs/gate-approval-record.md`
(`status`, `disposition`, `config_fingerprint`, `reviewed_head`,
`decided_at`) once the gate reaches its outcome, and commit it with the next
brief bookkeeping commit or before stopping:

- passed: `allowed/passed`;
- `warn` failure: `allowed/warned`;
- a `prompt` failure the operator explicitly continues past: `allowed/prompt_approved`;
- a `prompt` failure declined or deferred (every `prompt` failure under
  `OAT_AUTONOMOUS=1`), `block` exhausted after `maxAttempts`, or a launch,
  validation, or receive failure: `blocked` with `disposition: null`;
- `configured_disabled_by_project`: `allowed/project_disabled` with `reviewed_head: null` and no launch.

`not_configured` writes no record, so the field is absent. `reviewed_head` is
the brief commit the gate reviewed and `decided_at` the decision time. A rerun
replaces the record. Nothing reads the record back to route; it is provenance
only, and Step 3.7 stays gated by the control flow above.

### Step 3.7: Record Review Disposition and Single Approval

Reach this boundary only after the configured gate passes or resolves
according to its `onFailure` policy.

1. Confirm the `plan` artifact row in `## Reviews` carries the Step 3.6
   outcome. Use `passed` only for a clean result; keep a non-passed status with
   a concise residual-finding disposition otherwise.
2. This is the only approval. Use `AskUserQuestion` exactly once to offer:
   1. Approve the reviewed brief.
   2. Revise: run a focused realignment, write the change into the brief,
      commit it, and re-run Step 3.6 and Gate Execution before returning
      here. An editorial fix that changes no Outcome, Approach, Decision,
      phase boundary, or authority does not re-run the ladder.
   3. Promote to quick for an approved up-front task plan, through
      `oat project promote "$PROJECT_PATH" --to quick --json` (the Step 2
      promotion precondition holds here; see `references/brief-contract.md`
      for refusals), then stop; the project is now quick and resumes through
      `oat-project-quick-start`.

   Under `OAT_AUTONOMOUS=1`, apply `BRIEF-11`: approve the recorded brief and
   write the approval evidence; contradictory or materially incomplete
   outcomes stop at a product-judgment boundary.

3. Record the approval as one line under `## Delivery endpoint and authority`:
   `- **Brief approved:** {YYYY-MM-DD} by {user | autonomous run (BRIEF-11)} at {reviewed brief commit SHA}`.
4. Only after those writes succeed, atomically update the `plan.md`
   frontmatter:
   - `oat_status: complete`
   - `oat_ready_for: oat-project-implement`
   - `oat_phase_status: complete`
   - `oat_template: false`

If dispatch remains unresolved, review fails closed, or the outcome cannot be
recorded, leave the pre-review values unchanged and commit them before
stopping. Never expose an unreviewed or unapproved brief to
`oat-project-implement`.

### Step 4: Sync Project State

Update `"$PROJECT_PATH/state.md"`:

- `oat_workflow_mode: brief`
- `oat_phase: plan`
- `oat_phase_status: complete`
- `oat_current_task: null`
- `oat_hill_checkpoints: []` (none for brief modes)
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

### Step 5: Initialize the Journal

Prepare `"$PROJECT_PATH/implementation.md"` from the `implementation-brief`
scaffold:

- frontmatter `oat_status: in_progress`, `oat_template: false`, and
  `oat_current_task_id: p01` (the first phase ID in document order; a phase ID
  is a valid pointer in brief modes);
- one Progress Overview row per authored phase (`pending`, `1` unit, `0/1`
  accepted) and the total phase count;
- one `## Phase pNN: <name>` section per authored phase containing only
  `**Status:** pending`. Remove the template's placeholder `**Base:**`,
  `**Head:**`, and `**Executor:**` lines and the example execution record:
  implementation records anchors when a phase starts and is accepted, and opens
  execution records only when work starts.

### Step 6: Refresh Repo Dashboard

```bash
oat state refresh
```

### Step 6.5: Commit Brief Artifacts

Format the scoped artifacts, resolve project scope, and create the completion
commit through the Artifact Persistence rule with a new operation identity.
The repo dashboard `.oat/state.md` is generated; do not stage it.

### Step 7: Output Next Action

Report:

- workflow mode (`brief`) and the brief path;
- the phases, which are concrete and which provisional, and any declared
  parallel groups;
- the review and gate outcomes and the approval record;
- next: `oat-project-implement`.

```text
Brief approved and ready. Next: oat-project-implement
```

## Success Criteria

- The interview reached explicit design alignment; facts were settled by the
  agent and decisions by the user.
- `plan.md` is a Project Brief that passes `oat project validate-plan` with the
  brief profile, with a concrete first phase and no task headings.
- The authored brief was committed before artifact review, and the reviewed
  disposition was committed before the gate.
- The configured gate saw a committed core-artifact baseline, used canonical
  global `--json` placement without `--target`, and its outcome is recorded as
  `oat_brief_gate` with exactly the core fields, or absent when no gate is
  configured.
- Exactly one approval ran, after review and gate, and is recorded in the
  brief.
- No discovery, spec, design, HiLL setup, or execution records were created.
- Completion state was committed and routes to `oat-project-implement`.
