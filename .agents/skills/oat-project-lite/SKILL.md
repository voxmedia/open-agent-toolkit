---
name: oat-project-lite
version: 1.1.0
description: Use when a single-sitting change needs a critical interview, an approved single-phase plan, and resumable OAT implementation with minimal ceremony.
argument-hint: '<project-name> ["project description"]'
oat_gateable: true
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Lite Project

Create or resume a project in **lite mode** and produce one approved,
single-phase `plan.md` for `oat-project-implement`.

## Prerequisites

- A repository initialized for OAT (`.oat/` and `.agents/` exist).
- A change intended to fit one implementation sitting.

## Mode Assertion

**OAT MODE: Lite**

**Purpose:** Preserve a critical interview, explicit validation, approval,
resumable task commits, managed review, and a final gate while removing
multi-phase planning ceremony.

When `OAT_AUTONOMOUS=1`, read `references/docs/autonomy-contract.md` and keep
`OAT_NON_INTERACTIVE=1` set for the run. Resolve every interactive decision
through its `LITE-0N` row and stop only where that row declares a boundary:

- `LITE-01`: inherited dirty tree;
- `LITE-02`: missing project name or description;
- `LITE-03`: batched critical interview;
- `LITE-04`: escalation to quick;
- `LITE-05`: plan approval;
- `LITE-06`: dispatch-ladder scope;
- `LITE-07`: project dispatch policy;
- `LITE-08`: plan artifact-review findings; and
- `LITE-09`: configured exit gate.

Record each autonomous resolution and its provenance in the artifact named by
the row. Never persist either autonomy environment signal.

**BLOCKED Activities:**

- No `design.md` or `spec.md` authoring.
- No multi-phase plan or parallel group.
- No implementation code changes.

**ALLOWED Activities:**

- Lite scaffolding and project metadata updates.
- One batched critical interview and a conditional clarification round.
- One single-phase plan with executable validation criteria.
- Plan approval, artifact review, dispatch policy resolution, and gate review.

**Self-Correction Protocol:**

- If the work cannot fit one sitting, promote the authored plan to quick mode.
- If a design decision is not safely resolvable, promote rather than invent it.
- If implementation code is about to change, stop and hand off to
  `oat-project-implement`.

## Progress Indicators (User-Facing)

Print this banner once after entry:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ LITE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use these compact progress lines:

- `[0/7] Checking inherited git state…`
- `[1/7] Resolving the lite project…`
- `[2/7] Running the critical interview…`
- `[3/7] Authoring and checking the single-phase plan…`
- `[4/7] Confirming plan approval…`
- `[5/7] Resolving dispatch and reviewing the artifact…`
- `[6/7] Running the configured gate…`
- `[7/7] Marking the plan ready for implementation…`

## Artifact Persistence (Required)

- Save every change to `plan.md`, `state.md`, and `implementation.md`
  immediately. Never leave interview answers only in conversation.
- After Step 3 authoring, commit the scoped project artifacts before the Step
  3.5 escalation check and before the Step 4 approval gate. Promotion must
  consume a durable authored plan.
- After Step 6 records the structured review disposition, commit the same
  scoped artifacts before Gate Execution so the gate sees a committed
  core-artifact baseline.
- After a receive-eligible gate handoff, commit its receive bookkeeping. The
  Step 7 completion transition is a separate scoped commit and runs only after
  the gate passes or resolves.
- Before each scoped commit, resolve the project scope. Scope resolution fails
  closed. A synced project uses `oat project push` with the same message;
  another scope uses only `git add -- "$PROJECT_PATH/plan.md"
"$PROJECT_PATH/state.md" "$PROJECT_PATH/implementation.md"` followed by a
  commit when the index is non-empty. Never stage unrelated paths.

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
   `git add -- .oat/sync/manifest.json` then `git commit -m "chore: run sync"`.
   Report the commit and continue. Every other code falls through, including
   `MD`, `MT`, `AM`, `RM`, `CM`, and every unmerged state.
3. Otherwise, present the dirty list to the user and offer commit now, proceed
   anyway, or abort (`LITE-01`). Note generated provider-view paths when they
   appear. Commit now stages only the paths the user selected.
4. When the response channel is unavailable and `OAT_NON_INTERACTIVE=1`, apply
   `LITE-01`: proceed without staging unrelated files. Destructive cleanup is
   a stop boundary.

Once the dirty list has been presented, do not advance past this gate without
an explicit choice. The step 2 manifest-only auto-commit is not a choice point
and continues on its own.

### Step 0.5: Resolve Active Project or Scaffold Lite

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

If no valid active lite project exists, resolve a project name and substantive
description from `$ARGUMENTS`. A bare name is insufficient. Ask for the
missing startup input under `LITE-02`; in autonomous mode derive both only from
the explicit goal and stop if it is not substantive.

Create the project through the canonical scaffolder:

```bash
oat project new "{project-name}" --mode lite
PROJECT_PATH=$(oat config get activeProject)
```

Confirm `state.md` reports `oat_workflow_mode: lite`, `oat_phase: plan`, and
`oat_phase_status: in_progress`. Do not create discovery or design artifacts.

### Step 1: Read Repository Knowledge

Read repository instructions and the minimum durable context needed for the
change. Start with root `AGENTS.md`/`CLAUDE.md`. If `.oat/repo/AGENTS.md`
exists, follow its routing into current state, decisions, and references.
Inspect only the code surfaces necessary to challenge the request and produce
an executable plan.

### Step 2: Batched Critical Interview

Present **one batched round** of critical questions covering behavior, scope,
constraints, decisions, assumptions, exclusions, and proof. Keep the batch
small and load-bearing. Wait for the complete response before proceeding
(`LITE-03`).

Use the interview to select exactly one plan content shape: `minimal`,
`product`, `technical`, or `both`. Product content is required whenever the
change alters user-visible behavior. Technical content is required when the
work crosses module boundaries, changes a data or state format, or changes a
contract consumed by another surface. Select `both` when both triggers apply.
Select `minimal` only when neither trigger applies.

Run a second round only for questions that the first round's answers created.
It may clarify those new ambiguities; it must not reopen the whole
interview. If the user says "just proceed", choose the most careful supported
interpretation of every open question and record those careful assumptions in
`plan.md`. Under autonomy, answer from repository evidence and stop on material
product ambiguity that the evidence cannot resolve.

### Step 3: Author the Single-Phase Plan

Write the interview result into `"$PROJECT_PATH/plan.md"` before any escalation
or approval decision. Preserve the lite scaffold frontmatter, including
`oat_template: true`, until Step 7.

The authored plan contains, in order:

1. `## Summary`
2. `## Decisions`
3. `## Product Behavior` when the selected shape is `product` or `both`
4. `## Technical Design` when the selected shape is `technical` or `both`
5. `## Assumptions`
6. `## Out of Scope`
7. `## Validation Criteria`
8. the required single-phase task list in the `oat-project-plan-writing`
   grammar

In Decisions, record the selected shape and a one-line rationale tied to the
triggers above. Product Behavior is a numbered list of testable outcomes, not
implementation steps. Technical Design describes current operation and the
proposed changes; include data flow only when state or data crosses a boundary.
Use file-and-symbol references instead of line numbers. A short snippet is
allowed only to establish a proposed interface shape.

`minimal` fits a typo or copy-only documentation edit, a version or pin update,
or a semantics-preserving mechanical rename. A configuration edit that changes
runtime behavior is not minimal. Keep each optional section to roughly one
screen. If either needs more space to remove ambiguity, promote to Quick.

Every validation criterion is one bullet and names its proof as a backticked
command or test name, or a `manual:` visual-proof instruction. A criterion
without one of those checks is a defect. The task graph has exactly one phase,
no parallel groups, stable task IDs, declared files, a task-level implementation
and proof strategy, verification commands, and one commit message per task.

For each task, name the strategy, the observable risk it covers, why the
evidence is proportionate, and the exact command or `manual:` proof. Supported
strategies include test-first development, characterization-first work,
implementation followed by a focused regression, static or build checks, and
manual or computer-use visual proof. Apply these tiebreakers:

- Static or build checks alone are sufficient only when the change cannot alter
  runtime behavior.
- Every behavioral change has at least one proof that fails without the change.
  For reusable skill, template, or agent wording, a lightweight assertion in
  the existing `skills.test.ts` suite is proportionate when removing the
  contract makes it fail; do not create a prose-only fixture or harness.
- A bug fix preserves a pre-fix reproduction. Waive this only after a bounded
  attempt proves the original environment or state unavailable; record that
  evidence, use the strongest alternate regression control, and require
  reviewer acceptance.
- A user-interface change requires visual proof. Under autonomy, use available
  computer-use capability or stop at the `IMPLEMENT-20` proof boundary.
- Security, provenance, approval, receipt, publication, and other
  assurance-sensitive contracts require reproduction-grade negative and valid
  controls.
- Refactors default to characterization-first unless existing tests already
  cover the preserved behavior. Documentation-only work may use link, spelling,
  formatting, or build proof. Behavior-changing configuration requires
  behavioral proof. Deletions require a negative search plus the relevant build
  or composition check.

`oat project validate-plan` enforces proof syntax for Validation Criteria, not
semantic adequacy. Artifact review challenges the selected shape and strategy;
code review verifies that the declared evidence exists and can prove the claim.

Initialize or update `implementation.md` with the first task pointer while
keeping implementation in progress. Run:

```bash
oat project validate-plan --project-path "$PROJECT_PATH"
```

Format the authored artifacts, resolve project scope, and create the scoped
pre-approval commit required by Artifact Persistence. Only after that commit is
durable may Step 3.5 or Step 4 run.

### Step 3.5: Escalation Check

Read the now-populated and committed `plan.md`. Apply `LITE-04`:

- Promote if the task list will not fit one sitting.
- Promote if an implementation-affecting design decision remains unresolvable.
- Otherwise record why lite remains appropriate and continue.

Promotion must invoke the real command against the authored project:

```bash
oat project promote "$PROJECT_PATH" --to quick --json
```

On success, stop lite execution and point to `oat-project-quick-start`. The
promotion consumes the authored sections, so interview content is preserved.
Never simulate the promotion with direct file edits.

### Step 4: Single Approval Gate

This is the only approval gate. Use `AskUserQuestion` exactly once to offer:

1. Approve the recorded requirement set and plan.
2. Revise the plan, then return to Step 3 and persist it again.
3. Promote to quick mode through Step 3.5.

Under `OAT_AUTONOMOUS=1`, apply `LITE-05`: auto-confirm the recorded
requirement set and write the approval decision and evidence into `plan.md`.
Contradictory or materially incomplete requirements stop at a product-judgment
boundary. Do not add another approval pause later.

### Step 5: Resolve Dispatch Ceiling

Invoke the complete **Managed Dispatch Readiness and Review Contract** from
`oat-project-plan-writing`. Load the current `oat-project-plan-writing/SKILL.md`
and follow that contract as written. Resolve and, when necessary, adopt the
dispatch ladder before selecting a project policy. Do not copy model names into
the skill.

For the ladder ownership decision, apply `LITE-06`, which is identical to
`QS-08`: check existing user, local, then authorized shared configuration in
that fixed order; skip scalar-blocked candidates; adopt once; re-run the
preflight resolver. Stop before writing if none is compatible.

Resolve the project policy through `LITE-07`, identical to `QS-09`: preserve an
explicit or configured policy; unresolved non-interactive state blocks. The
project policy remains a named ceiling, uncapped managed selection, or host
inheritance, never a pinned provider target.

Run the reviewer readiness check:

```bash
oat project dispatch-ceiling resolve --provider "$ACTIVE_PROVIDER" --role reviewer --preflight --json
```

Lite has no workflow-preference prompt, no phase review setup step, and no
HiLL setup. Built-in implementation review remains unchanged.

### Step 6: Run Plan Artifact Review Loop

Invoke the `Auto Artifact-Review Loop` from `oat-project-plan-writing`. Load
the current `oat-project-plan-writing/SKILL.md` and follow that loop as written,
with:

- `target: plan`
- `type: artifact`
- `scope: plan`
- `artifact_path: "$PROJECT_PATH/plan.md"`
- `oat_output_mode: structured`

The loop is structured and adds no user pause. Resolve
`workflow.autoArtifactReview.plan`; only explicit `false` skips it. Keep review
at the current planning parent unless the shared managed-dispatch contract
proves the exception route is required. Accepted handles are never replaced.

Apply `LITE-08`, using the same shape as `IMPORT-08`: apply only unambiguous
artifact-local canonicalization fixes, never rewrite source intent, and stop
on unresolved Critical findings or material ambiguity. Record the actual plan
review row or explicit skip in `plan.md`.

Format and validate the artifacts again. Resolve scope and create the required
post-review scoped commit before Gate Execution. Do not mark the plan complete
yet; the committed baseline remains resumable and `in_progress`.

### Gate Execution

The lite exit-gate review scope is the committed `plan.md`, `state.md`, and
`implementation.md` bundle. It runs after Step 6 and before Step 7.

1. Resolve the gate for this skill with project context:

   ```bash
   oat gate resolve <this-skill> --project "$PROJECT_PATH" --json
   ```

   Handle all three `resolution` values explicitly:
   - `not_configured`: no gate is configured; proceed directly to the completion steps in Step 7 below.
   - `configured_disabled_by_project`: the operator disabled this configured gate for this project. Do not launch any process. Emit `configured but disabled by project override`, including the project path and the `projectOverride` source from the envelope, then proceed directly to the completion steps in Step 7 below. A project-disabled gate never enters the passed, missing, or failed branches, and its `configuredGate` is evidence only, never executed.
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
6. For a validated, receive-eligible `blocked` result, apply `LITE-09`:
   - `block`: remediate and retry up to the configured limit;
   - `prompt`: report an unresolved human boundary;
   - `warn`: record the validated gate failure and continue.

Operational, validation, targeting, launch, and receive failures never inherit
`onFailure` continuation semantics.

A gate that ends in `block` after attempts are exhausted, or at an unresolved
`prompt` boundary, means the completion steps below MUST NOT run; the project
stays `in_progress` and resumable. Persist eligible receive bookkeeping in its
own scoped commit. A no-gate result is not success output; it continues to
Step 7.

### Step 7: Mark Plan Complete and Hand Off

Run only after the configured gate passes or resolves according to its
validated `onFailure` policy.

Update `plan.md` atomically:

- `oat_status: complete`
- `oat_ready_for: oat-project-implement`
- `oat_phase_status: complete`
- `oat_template: false`

Update `state.md`:

- `oat_workflow_mode: lite`
- `oat_phase: plan`
- `oat_phase_status: complete`
- `oat_current_task: null`
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

Ensure `implementation.md` is present and points to the plan's first task with
status `in_progress`. Run `oat state refresh`, format the scoped artifacts,
resolve project scope, and create the separate completion commit. Then report:

```text
Lite plan approved and ready. Next: oat-project-implement
```

## Success Criteria

- Exactly one batched interview ran, with only a causally created conditional
  clarification round.
- The plan contains Summary, Decisions, Assumptions, Out of Scope, executable
  Validation Criteria, and exactly one sequential phase.
- The authored plan was committed before escalation and approval.
- Exactly one approval gate ran.
- No spec, design, phase review setup, or HiLL setup was added.
- Reviewer dispatch readiness and the structured artifact-review loop resolved.
- The configured gate saw a committed core-artifact baseline and used canonical
  global `--json` placement without `--target`.
- Completion state was committed separately and routes to
  `oat-project-implement`.
