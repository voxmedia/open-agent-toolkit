---
name: oat-project-goal
description: Use when an outcome needs several deliveries over time - one approved Project Brief with a Milestones table, a milestone loop of activation, delivery and re-alignment, and a terminal declaration audited against the brief's outcomes.
argument-hint: '<project-name> ["project description"]'
oat_gateable: true
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion, Task
metadata:
  version: 1.0.0
---

# Goal Project

Create or resume a project in **goal mode**: one reviewed, approved Project
Brief in `plan.md` whose phases are grouped into milestones, delivered one
milestone at a time, re-aligned between milestones, and closed by an explicit
declaration audited against the brief's outcomes.

## Hook-safe exact-path commits

Before a parent-branch commit, verify `oat internal commit-paths --help` succeeds. If unavailable, stop and update the OAT CLI; never fall back to a staged-index or pathspec-only commit. Set `COMMIT_IDENTITY` to a unique operation/artifact identity before the first attempt and retain it for every retry; use a new identity for a new operation. Pass only the exact produced file list, including tracked removals and both names of a rename. A blocked/failed result stops the workflow; retain its receipt and follow its diagnostics. Hooks remain enabled. Synced project artifacts continue through `oat project push`.

## Prerequisites

- A repository initialized for OAT (`.oat/` and `.agents/` exist).
- An outcome that needs more than one delivery, whose first milestone can be
  agreed in conversation without a separate discovery, spec, or design
  document. One delivery is a brief project (`oat-project-brief`).

## Mode Assertion

**OAT MODE: Goal**

**Purpose:** Reach design alignment for the whole outcome, write one Project
Brief with a canonical Milestones table, take it through the standard
pre-implementation review ladder, approve it once, and then own each milestone's
activation, re-alignment and the terminal declaration. Phases carry intent and
exit evidence; tasks are execution records created during implementation.

Resolve the shared brief contract from the sibling `oat-project-brief` skill in
the same installed scope as this skill:
`BRIEF_CONTRACT="$(dirname "$GOAL_SKILL_DIR")/oat-project-brief/references/brief-contract.md"`,
where `GOAL_SKILL_DIR` is the directory this `SKILL.md` was loaded from. Read
sections 1–11 and section 12 (goal mode) before Step 2. A missing contract
stops the run with `oat tools install workflows --scope <user|project>`. The
contract wins wherever this skill restates a rule; this skill names the
section rather than repeating it.

When `OAT_AUTONOMOUS=1`, read `references/docs/autonomy-contract.md` and keep
`OAT_NON_INTERACTIVE=1` set for the run. Resolve every interactive decision
through its `GOAL-NN` row and stop only where that row declares a boundary:

- `GOAL-01`: inherited dirty tree;
- `GOAL-02`: missing project name or description;
- `GOAL-03`: alignment interview and milestone split;
- `GOAL-04`: workflow fit;
- `GOAL-05`: dispatch-ladder scope;
- `GOAL-06`: project dispatch policy;
- `GOAL-07`: optional phase-gate setup;
- `GOAL-08`: configured lifecycle gate posture;
- `GOAL-09`: brief or amendment artifact-review findings;
- `GOAL-10`: configured milestone plan gate;
- `GOAL-11`: brief or amendment approval;
- `GOAL-12`: re-alignment delta interview; and
- `GOAL-13`: terminal declaration, always a boundary.

Record each autonomous resolution and its provenance in the artifact named by
the row. Never persist either autonomy environment signal. Goal projects are
not run by `oat-project-autonomous`.

**BLOCKED Activities:**

- No `discovery.md`, `spec.md`, or `design.md` authoring; agreed design lives
  in the brief's Approach and Decisions.
- No `### Task` headings in `plan.md` and no execution records in
  `implementation.md`; tasks are opened only when work starts.
- No implementation code changes, no review production, no delivery
  registration, and no exit-gate carrier writes: those belong to
  `oat-project-implement`, the review skills, and `oat-project-pr-progress` /
  `oat-project-pr-final`.
- Never write `implementing` for a milestone whose previous delivery is not
  observed at its agreed endpoint, and never write `declared_met` without the
  user's explicit declaration.

**ALLOWED Activities:**

- Goal scaffolding, milestone state, and project metadata updates.
- A conversational interview in readiness rounds, with facts resolved by the
  agent and decisions put to the user.
- One Project Brief with its Milestones table, amended in place at each
  re-alignment.
- Artifact review, dispatch policy resolution, the configured gate and one
  approval for the brief and for each amendment, and the milestone `plan`
  carrier those produce.
- `oat project delivery refresh`, learnings capture, milestone activation, and
  the terminal declaration with its outcome audit.

**Self-Correction Protocol:**

- If the outcome is one delivery, recommend `oat-project-brief` instead.
- If the user wants an approved up-front task plan, offer promotion to quick
  at a settled delivery boundary (brief contract section 11).
- If implementation code is about to change, stop and hand off to
  `oat-project-implement`.

## Progress Indicators (User-Facing)

Print this banner once after entry:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ GOAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use these compact progress lines for the entry:

- `[0/9] Checking inherited git state…`
- `[1/9] Resolving the goal project and entry…`
- `[2/9] Running the alignment interview…`
- `[3/9] Writing and committing the brief and milestones…`
- `[4/9] Resolving dispatch and gate setup…`
- `[5/9] Reviewing the brief artifact…`
- `[6/9] Running the configured gate…`
- `[7/9] Confirming approval and recording the plan carrier…`
- `[8/9] Initializing the journal and milestone state…`
- `[9/9] Activating the milestone and handing off…`

Re-alignment and declaration entries print `[realign mNN]` and
`[declare]` before their step lines.

## Artifact Persistence (Required)

- Save every change to `plan.md`, `state.md`, and `implementation.md`
  immediately. Never leave interview answers, agreed design, or milestone
  membership only in conversation.
- Commit the authored brief (or amendment) before any review dispatch. The
  reviewer and the gate read the committed brief, not the session.
- Commit the recorded review disposition before Gate Execution so the gate
  sees a committed core-artifact baseline.
- After a receive-eligible gate handoff, commit its receive bookkeeping. The
  approval, the `plan` carrier and milestone state are committed together
  after approval.
- Before each scoped commit, resolve the project scope. Scope resolution fails
  closed. A synced project uses `oat project push` with the same message;
  another scope uses `oat internal commit-paths --identity "${COMMIT_IDENTITY:?set once and retain for retries}:oat-project-goal:1" --message "$BOOKKEEPING_MESSAGE" -- "$PROJECT_PATH/plan.md" "$PROJECT_PATH/state.md" "$PROJECT_PATH/implementation.md"`
  (adding `"$PROJECT_PATH/project-log.md"` when it exists) and stops on a
  nonzero exit. Set the same bookkeeping message and a
  distinct operation identity for each lifecycle write; retain both for
  retries. Never include unrelated paths.

## Artifact Hygiene

Artifact hygiene contract: Before finishing or committing, format every file you created or edited. Use the concrete write/fix formatting command supplied by the governing plan, task, or brief. If none is usable, discover the repository's documented write/fix command from applicable `AGENTS.md`/`CLAUDE.md` instructions and relevant package manifests; do not infer or hardcode a formatter. Prefer a file-scoped invocation when supported, and avoid rewriting unrelated files. If no command is discoverable, warn once with `no format command discovered in repo instructions; skipping`, then continue.

After formatting, run only repository checks relevant to the files changed;
writing lifecycle artifacts does not imply unrelated full test suites.

## Project Log

Defer entry flags to `oat project log append --help`; never pre-check project
log configuration: the helper no-ops when logging is disabled.

- At each milestone activation (Step 7), append exactly one structural entry:
  `oat project log append --project "$PROJECT_PATH" --structural --producer oat-project-goal --ref <activated mNN> --idempotency-key "<goal-slug>-activate-<mNN>" --body "Activated <mNN> (<ordered phase ids>); <goal-slug>-activate-<mNN>"`.
- At each re-alignment entry (Step 8), append exactly one structural entry with
  `--ref <delivered mNN>` and the key `<goal-slug>-realign-<mNN>`.
- Learnings capture at re-alignment is a category-bearing judgment entry
  written through the learning write below (brief contract section 12.10).

Every learning this skill records uses one shared write. Give each observation
a stable, whitespace-free source id unique to this goal and observation (for
example `<goal-slug>-learning-<mNN>-<NN>`) and retain it for retries; it is
both `--source` and `--idempotency-key`, so a resumed step appends nothing.
Write the learning title as `--area` and the body as `Observation:`,
`Impact:`, `Recommendation:` and, when it applies, `Uncertainty:` lines.

```bash
# Learning write (shared by oat-project-autonomous, oat-cursor-cloud-projects
# and oat-project-goal): oat_record_learning <category> <source-id> <title> <body>
oat_record_learning() {
  local category="$1" source="$2" title="$3" body="$4" type result
  case "$category" in
    gotcha | environment-limited) type=friction ;;
    efficiency | candidate-skill-content) type=worked-well ;;
    documentation-gap | decision) type=feedback ;;
    *)
      echo "oat: unknown learning category '$category'" >&2
      return 1
      ;;
  esac
  result=$(oat project log append --json --project "$PROJECT_PATH" \
    --type "$type" --scope project --area "$title" \
    --category "$category" \
    --source "$source" \
    --origin "${LEARNING_ORIGIN:?set to the producer skill name}" \
    --idempotency-key "$source" \
    --body "$body") || {
    printf '%s\n' "$result" >&2
    return 1
  }
  if printf '%s' "$result" | grep -Eq '"status": *"skipped"'; then
    echo "oat: warning: project log disabled (workflow.projectLog=false); learning $source not recorded" >&2
  fi
}
```

Set `LEARNING_ORIGIN=oat-project-goal`. Use the six categories verbatim; the
write maps each to its judgment type (`gotcha`, `environment-limited` →
`friction`; `efficiency`, `candidate-skill-content` → `worked-well`;
`documentation-gap`, `decision` → `feedback`). Never create or append to
`oat-execution-learnings.md`.

The idempotency key makes a resumed step report `already-appended` instead of
duplicating the entry. Commit each append with the bookkeeping commit of the
step that owns it.

## Process

### Step 0 (Preflight): Inherited Git State

Before scaffolding or writing, surface the working tree state so unrelated
changes don't get carried into the project workflow's bookkeeping commits.

1. Run `git status --porcelain`. If empty, continue silently.
2. If `.oat/sync/manifest.json` is the only entry **and** its two-character
   status code is either `??` or made up solely of the letter `M` and blanks —
   a plain modification, staged, unstaged, or both — commit it without asking:
   `oat internal commit-paths --identity "${COMMIT_IDENTITY:?set once and retain for retries}:oat-project-goal:2" --message "chore: run sync" -- .oat/sync/manifest.json`.
   Report the commit and continue. Every other code falls through, including
   `MD`, `MT`, `AM`, `RM`, `CM`, and every unmerged state.
3. Otherwise, present the dirty list to the user and offer commit now, proceed
   anyway, or abort (`GOAL-01`). Note generated provider-view paths when they
   appear. Commit now stages only the paths the user selected.
4. When the response channel is unavailable and `OAT_NON_INTERACTIVE=1`, apply
   `GOAL-01`: proceed without staging unrelated files. Destructive cleanup is
   a stop boundary.

Once the dirty list has been presented, do not advance past this gate without
an explicit choice. The step 2 manifest-only auto-commit is not a choice point
and continues on its own.

### Step 0.5: Resolve the Goal Project and the Entry

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

When `PROJECT_PATH` names an existing project whose `state.md` records
`oat_workflow_mode: goal`, resume it and never re-scaffold. Read the router's
recommendation (`oat project status --json`, `recommendation.context`) and
choose the entry:

| Project state                                                                                  | Entry                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plan.md` not yet `oat_status: complete`                                                       | **Authoring**: the earliest step whose output is missing (no authored brief → Step 2; no disposition → Step 3.6; no gate outcome → Gate Execution; no approval → Step 3.7) |
| Reason `Active milestone membership invalid`                                                   | **Membership repair** (Step 3, Milestones table only)                                                                                                                      |
| `oat_milestone_status: aligning` (context `align mNN`)                                         | **Activation** (Step 7), after any missing `plan` carrier is produced through Steps 3.6–3.7 for that milestone                                                             |
| `oat_milestone_status: delivered` (context `realign mNN`)                                      | **Re-alignment** (Step 8), or the **terminal declaration** (Step 9) when the user declares the goal met                                                                    |
| `oat_goal_status: declared_met` with context `audit`                                           | **Audit repair** (Step 9, audit only)                                                                                                                                      |
| `implementing`, `reviewing`, `delivering`, a pending `oat_goal_recovery`, or terminal recovery | Not this skill's transition: report the router's recommended skill and stop                                                                                                |

Preserve every authored section, phase, milestone row, and `## Reviews` row;
never copy a template over an authored brief. A promoted goal is a quick
project and resumes through `oat-project-quick-start`.

If no valid active goal project exists, resolve a project name and substantive
description from `$ARGUMENTS`. A bare name is insufficient. Ask for the missing
startup input under `GOAL-02`; in autonomous mode derive both only from the
explicit goal and stop if it is not substantive.

Create the project through the canonical scaffolder:

```bash
oat project new "{project-name}" --mode goal
PROJECT_PATH=$(oat config get activeProject)
```

Confirm `"$PROJECT_PATH/state.md"` reports `oat_workflow_mode: goal`,
`oat_phase: plan`, and `oat_phase_status: in_progress`; that `plan.md` carries
`oat_plan_source: goal` and the canonical `| Milestone | Phases |` header
under `## Milestones`; and that `implementation.md` and `references/research/`
exist. A missing file or a different mode stops the run before any write. Do
not create discovery, spec, or design artifacts.

**Consolidating earlier scaffolds.** When this goal project absorbs work that
earlier project scaffolds already started, record `absorbed_projects: [<slug>]`
and `absorbed_backlog_ids: [<BL-id>]` in `"$PROJECT_PATH/state.md"` as one
frontmatter write immediately after the scaffold, with the same shapes and
meaning that `oat-project-brief` records. Record them only when a
consolidation actually happened.

### Step 1: Set Metadata and Read Repository Knowledge

Update `"$PROJECT_PATH/state.md"` frontmatter (brief contract section 12.2):

- `oat_workflow_mode: goal`
- `oat_workflow_origin: native`
- `oat_phase: plan`
- `oat_phase_status: in_progress`
- `oat_milestone: m01` and `oat_milestone_status: aligning` (new → aligning)
- `oat_goal_status: active`, `oat_goal_outcome_audit: null`,
  `oat_goal_recovery: null`, `oat_milestone_gates: {}`, `oat_deliveries: []`
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`

Read repository instructions and the minimum durable context the interview
needs. Start with root `AGENTS.md`/`CLAUDE.md`. If `.oat/repo/AGENTS.md`
exists, follow its routing into current state, decisions, and references.
Settle facts from code, docs, and research before asking about them.

### Step 2: Alignment Interview

Follow the readiness and design-strand rules in brief contract section 4
(`GOAL-03`): readiness rounds with a recommendation and tradeoff per question,
facts settled by the agent, decisions put to the user, Known Unknowns for
phase-local questions, and a stop criterion of explicit design alignment.

Goal adds the **milestone split**: agree which outcomes each milestone
delivers, its ordered phases, and its agreed delivery endpoint (`open` or
`merged`, recorded once under Delivery endpoint and authority). The first
milestone must be concrete enough to activate; later milestones may be sketched
with provisional phases or left for re-alignment.

Persist interview results as you go in `"$PROJECT_PATH/plan.md"`.

**Workflow fit (`GOAL-04`).** Change course only on content, never on
interview length:

- One delivery → recommend `oat-project-brief` and abandon this scaffold.
- Several unrelated outcomes → recommend separate projects, or
  `oat-project-split` for a confirmed broad scope.
- A design question cannot be settled without a separate design artifact →
  recommend quick with lightweight design (before the brief is committed,
  abandon the scaffold and start `oat-project-quick-start`).
- The user wants a maintained, approved up-front task plan → quick; a goal
  promotes only at a settled delivery boundary (brief contract section 11).

Otherwise record in Decisions why goal fits and continue.

### Step 3: Write the Brief and Milestones in One Pass and Commit

Write `"$PROJECT_PATH/plan.md"` in one pass from the agreed interview, keeping
the scaffold frontmatter (`oat_plan_source: goal`, `oat_template: true`,
`oat_status: in_progress`, `oat_ready_for: null`) until Step 3.7. Keep
`oat_plan_hill_phases: []`, which means none for brief-family modes.

The brief follows brief contract section 1 in template order. The
`## Milestones` section holds the canonical table of section 12.1: the
scaffold's header and separator, then one row per milestone with its ordered,
comma-separated phase IDs. Every phase, revision phases included, belongs to
exactly one milestone. Each phase follows the strict grammar of section 2; the
first phase of the first milestone is concrete. Declare
`oat_plan_parallel_groups` only for concrete phases inside one milestone that
pass the independence test. Seed `## Reviews` with the `plan | artifact` row
and one `code` row per concrete phase; goal integrated reviews add rows whose
Scope cell is the milestone ID (section 12.6).

Validate with the goal profile:

```bash
oat project validate-plan --project-path "$PROJECT_PATH"
```

Resolve every error before continuing: the brief-profile codes of section 2 and
the goal-profile codes of section 12.1. Remove any `### Task` heading that
triggers `brief-task-headings-ignored`.

**Membership repair.** When the router reports invalid membership, edit only
the Milestones table. A repair that changes no milestone's ordered phase set
(formatting, ID normalization, a missing separator) re-validates and commits
as bookkeeping. A repair that changes membership is an amendment: it repeats
Steps 3.6, Gate Execution and 3.7 for the affected milestone. Never move a
phase frozen in a registered delivery.

Format the brief, resolve project scope, and create the scoped pre-review
commit required by Artifact Persistence. Only after that commit is durable may
Step 3.5 run.

### Step 3.5: Resolve Dispatch Ladder and Ceiling

Invoke the complete **Managed Dispatch Readiness and Review Contract** from
`oat-project-plan-writing`, including its `Complete Dispatch Ladder Adoption
Contract`. Load the current `oat-project-plan-writing/SKILL.md` and follow
that contract as written. Do not copy model names into the skill.

Apply `GOAL-05`, identical to `QS-08`, to the ladder ownership decision, and
`GOAL-06`, identical to `QS-09`, to the project policy (project
`oat_dispatch_policy`, legacy `oat_dispatch_ceiling`, config
`workflow.dispatchPolicy.*` as a proposed starting value, then an interactive
choice rendered by `oat project dispatch-ceiling choices --format markdown`).
Unresolved non-interactive state blocks implementation readiness. Persist the
policy only in `"$PROJECT_PATH/state.md"`.

```bash
oat project dispatch-ceiling resolve --provider "$ACTIVE_PROVIDER" --role reviewer --preflight --json
```

Re-alignment reuses the recorded policy; it re-runs this step only when the
policy is unresolved.

### Step 3.55: Configure Optional Phase Gate Review

Invoke the `Shared Phase Gate Review Setup Contract` from
`oat-project-plan-writing`: load the current
`oat-project-plan-writing/SKILL.md` and follow that contract as written
(`GOAL-07`). Preserve an explicit
`oat_phase_review_gate` without probing or mutation. Goal projects have no
HiLL setup. Re-alignment skips this step.

### Step 3.57: Configure Lifecycle Gate Posture

After the brief has stable phase IDs and before Step 3.6,
invoke the `Shared Lifecycle Gate Posture Setup Contract` from
`oat-project-plan-writing`: load the current
`oat-project-plan-writing/SKILL.md` and follow that contract as written.
Supply exactly this relevant set: `oat-project-goal` and
`oat-project-implement`.

Apply `GOAL-08` to the shared contract's interaction. When
`oat_skill_gate_overrides` already exists, preserve it through the shared
contract without probing, prompting, or mutation. Otherwise, in interactive
planning, offer Keep or Disable independently for each configured gate in the
relevant set. Persist only disabled choices to `"$PROJECT_PATH/state.md"`.
Never modify the shared, local, or user configuration layers. In
non-interactive planning, preserve configured gates and do not invent or write
an override. Re-alignment skips this step.

### Step 3.6: Run the Artifact Review Loop

Invoke the `Auto Artifact-Review Loop` from `oat-project-plan-writing`. Load
the current `oat-project-plan-writing/SKILL.md` and follow that loop as
written, with:

- `target: plan`
- `type: artifact`
- `scope: plan`
- `artifact_path: "$PROJECT_PATH/plan.md"`
- `oat_output_mode: structured`
- `artifact_paths: { brief_contract: "$BRIEF_CONTRACT" }`

For an amendment, the request names the milestone under review and its
ordered phase set, and the reviewer receives the committed amended brief and
the contract, never the interview session. Resolve
`workflow.autoArtifactReview.plan`; only explicit `false` skips the loop.

Disposition of findings (`GOAL-09`): fold minor, artifact-local findings
without changing intent; take a material finding (one that would change an
Outcome, the Approach, a Decision, a phase boundary, milestone membership, the
endpoint, or the authority) back to the user as a short, focused realignment
and re-run the loop on the new commit. Under autonomy apply only unambiguous
artifact-local fixes and stop on an unresolved Critical finding or material
ambiguity.

Record the review row in `## Reviews` (or the explicit skip
`Plan artifact review: skipped (workflow.autoArtifactReview.plan=false)`).
Format and validate again, then create the post-review scoped commit before
Gate Execution.

### Gate Execution

The gate reviews the committed `plan.md`, `state.md`, and `implementation.md`
bundle after Step 3.6 and before Step 3.7, so the user approves what the gate
already reviewed. Its outcome becomes the milestone's `plan` carrier (brief
contract section 12.4), written at Step 3.7, never `oat_brief_gate`.

1. Resolve the gate for this skill with project context:

   ```bash
   oat gate resolve <this-skill> --project "$PROJECT_PATH" --json
   ```

   Handle all three `resolution` values explicitly:
   - `not_configured`: no gate is configured; launch nothing and proceed to the approval in Step 3.7 below with resolution `no_gate`.
   - `configured_disabled_by_project`: the operator disabled this configured gate for this project. Do not launch any process. Emit `configured but disabled by project override`, including the project path and the `projectOverride` source from the envelope, and proceed to the approval in Step 3.7 below with resolution `project_disabled`. A project-disabled gate never enters the passed, missing, or failed branches, and its `configuredGate` is evidence only, never executed.
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
6. For a validated, receive-eligible `blocked` result, apply `GOAL-10`:
   - `block`: remediate and re-run the gate up to `maxAttempts` attempts
     (default `2`);
   - `prompt`: surface the failure and ask the human how to proceed; under
     `OAT_AUTONOMOUS=1` it is a reported boundary;
   - `warn`: record the validated gate failure and continue.

Operational, validation, targeting, launch, and receive failures never inherit
`onFailure` continuation semantics.

A gate that ends in `block` after attempts are exhausted, or at an unresolved
`prompt` boundary, means Step 3.7 MUST NOT run: write the milestone's `plan`
carrier as `status: blocked`, `disposition: null`, commit it with the receive
bookkeeping, and stop resumable. A blocked carrier is never approval.

Hold an allowed outcome (`passed`, `warned`, `prompt_approved`,
`project_disabled`, or `no_gate`) for Step 3.7. If the session ends before
approval, the resumed entry re-runs Gate Execution: a rerun replaces the
outcome.

### Step 3.7: Single Approval, Then the Plan Carrier

Reach this boundary only after the gate passes or resolves according to its
`onFailure` policy. The write order is fixed by brief contract section 12.4:
artifact review, gate, approval, and only then the `allowed` carrier.

1. Confirm the `plan` artifact row in `## Reviews` carries the Step 3.6
   outcome.
2. This is the only approval for the brief or this amendment. Use
   `AskUserQuestion` exactly once to offer:
   1. Approve the reviewed brief (or amendment).
   2. Revise: run a focused realignment, write the change, commit it, and
      re-run Step 3.6 and Gate Execution before returning here. An editorial
      fix that changes no Outcome, Approach, Decision, phase boundary,
      milestone membership, endpoint, or authority does not re-run the ladder.
   3. Promote to quick, only at a settled delivery boundary
      (`oat project promote "$PROJECT_PATH" --to quick --json`; brief contract
      section 11), then stop.

   Under `OAT_AUTONOMOUS=1`, apply `GOAL-11`: approve the recorded brief or
   amendment and write the approval evidence; contradictory or materially
   incomplete outcomes stop at a product-judgment boundary.

3. Record the approval as one line under `## Delivery endpoint and authority`:
   `- **Brief approved:** {YYYY-MM-DD} by {user | autonomous run (GOAL-11)} at {reviewed commit SHA}`
   for the first approval, or
   `- **Milestone {mNN} approved:** {YYYY-MM-DD} by {…} at {reviewed commit SHA}`
   for an amendment.
4. **First approval only:** atomically update the `plan.md` frontmatter once:
   `oat_status: complete`, `oat_ready_for: oat-project-implement`,
   `oat_phase_status: complete`, `oat_template: false`. A later amendment never
   rewrites these fields.
5. Write `oat_milestone_gates[mNN].plan` for the milestone this approval
   covers, with the core fields defined in
   `references/docs/gate-approval-record.md` and the carrier fields:
   - `status: allowed`; `disposition` the held outcome (`passed`, `warned`,
     `prompt_approved`, `project_disabled`, or `no_gate`);
   - `resolution`: `configured`, `project_disabled`, or `no_gate`;
   - `config_fingerprint`: the stable hash of the resolved declaration, or
     `null` when no gate is configured;
   - `reviewed_head`: the commit the gate reviewed, or `null` for
     `project_disabled` and `no_gate`;
   - `subject: { kind: plan, scope: [the milestone's ordered phase set],
ref: <reviewed commit SHA> }`;
   - `decided_at`: the decision time.

If dispatch remains unresolved, review fails closed, or the outcome cannot be
recorded, leave the pre-review values unchanged and commit them before
stopping. Never expose an unreviewed or unapproved brief or amendment to
`oat-project-implement`.

### Step 4: Sync Project State

Update `"$PROJECT_PATH/state.md"`: `oat_workflow_mode: goal`,
`oat_phase: plan`, `oat_phase_status: complete`, `oat_current_task: null`,
`oat_hill_checkpoints: []`, and `oat_project_state_updated`. Keep
`oat_milestone_status: aligning` until activation.

### Step 5: Initialize or Extend the Journal

Prepare `"$PROJECT_PATH/implementation.md"` from the `implementation-brief`
scaffold as brief Step 5 does: frontmatter `oat_status: in_progress`,
`oat_template: false`; one Progress Overview row per authored phase; one
`## Phase pNN: <name>` section per authored phase containing only
`**Status:** pending`. At re-alignment, append sections and rows only for the
newly authored phases; never rewrite an existing phase section.

### Step 6: Refresh Repo Dashboard and Commit

```bash
oat state refresh
```

Format the scoped artifacts, resolve project scope, and commit the approval,
the `plan` carrier, milestone state and journal through the Artifact
Persistence rule with a new operation identity. The repo dashboard
`.oat/state.md` is generated; do not stage it.

### Step 7: Activate the Milestone

Activation is the write to `implementing` (brief contract section 12.3). Check
every prerequisite against persisted state; `oat project status --json`
reports `Milestone mNN is ready to activate` only when they hold:

- `plan.md` `oat_status: complete` (the brief is approved);
- `oat_milestone_gates[mNN].plan` is `allowed`, not stale, and its subject binds
  exactly the milestone's ordered phase set;
- every earlier non-superseded delivery is observed at its agreed endpoint
  (run `oat project delivery refresh --project "$PROJECT_PATH" --json` first
  when deliveries exist);
- the milestone's next phase, and every member of its next dispatched parallel
  group, is concrete (later provisional phases are permitted);
- `oat_goal_status` is `active`.

A failed prerequisite stops with the router's reason; never write
`implementing` around it. When every prerequisite holds:

1. write `oat_milestone_status: implementing` and `oat_phase_status:
in_progress`, project `oat_pr_status` and `oat_pr_url` from the latest
   delivery member's observed status (`merged`, `closed`, or `open`; both
   `null` when no delivery exists yet), so a merged previous delivery no
   longer reads as a live PR, and set `oat_current_task_id` in
   `implementation.md` to the milestone's first incomplete phase ID;
2. append the activation structural log entry (Project Log);
3. commit through the Artifact Persistence rule (adding
   `"$PROJECT_PATH/project-log.md"` when the append wrote it).

### Step 8: Re-alignment Entry (at `delivered`)

`delivered` means the milestone's delivery is registered, open and
review-ready; activation of the next milestone waits for the delivery's
agreed endpoint (brief contract sections 12.3 and 12.10).

1. **Refresh.** `oat project delivery refresh --project "$PROJECT_PATH" --json`.
   Commit the persisted observations as bookkeeping. Refresh never writes
   milestone status or recovery; when it reports stale evidence for the
   delivered milestone, stop and report `oat-project-pr-progress` as the owner.
2. **Log the entry.** Append the re-alignment structural entry (Project Log).
3. **Capture learnings.** Call `oat_record_learning` (Project Log) at least
   once for what the delivered milestone taught. This write is the
   `delivered → aligning` prerequisite "learnings captured"; reflection without
   the write does not satisfy it. Never pre-check log configuration: when the
   project log is disabled the append no-ops, the write prints one warning
   line, and the attempt satisfies the prerequisite. Nothing is written to any
   other file.
4. **Delta interview (`GOAL-12`).** Ask only what changed: what the delivered
   milestone taught, the next milestone's outcomes, phases and endpoint, and
   any material change, which gets a focused realignment.
5. **Amend in place.** Append the next milestone's phases with new, never
   reused IDs and its `## Milestones` row; amend Outcomes, Decisions or the
   Approach only as agreed. Never reorder, remove, or reassign a phase frozen
   in a registered delivery. Extraction of a phase to a child project is
   recorded here (brief contract section 12.11). Validate (Step 3) and commit.
   Do not push amendment commits onto a still-open delivery member's head
   branch: its observed head would advance with a substantive change and
   refresh would mark that delivery's evidence stale (section 12.8).
6. **Ladder.** Run Step 3.6, Gate Execution and Step 3.7 for the amendment.
   This may complete while the previous delivery awaits its endpoint; it
   writes the next milestone's `plan` carrier but neither `oat_milestone` nor
   `implementing`.
7. **Advance and activate.** Once refresh observes the previous delivery at
   its agreed endpoint (for an `open` endpoint the same observation suffices),
   write `oat_milestone: m(N+1)` and `oat_milestone_status: aligning`, extend
   the journal (Step 5), then run Step 7. Until then, stop and report that
   activation waits for the endpoint.

### Step 9: Terminal Declaration and Outcome Audit

Only this skill writes `oat_goal_status: declared_met` and
`oat_goal_outcome_audit`, and only after the user's explicit declaration
(`GOAL-13`; under autonomy this is always a `product-judgment` boundary).
Declare at `delivered` with no pending `oat_goal_recovery`. Brief contract
section 12.9 is the audit contract.

1. Ask once whether the user declares the goal met; record the declaration as
   one line in `implementation.md` under `## Final Summary (for PR/docs)`:
   `**Goal declared met:** {YYYY-MM-DD} by user at {brief commit SHA}`. Never
   record it in `plan.md`: an edit under `## Delivery endpoint and authority`
   is a substantive change (brief contract section 12.8) and stales every
   delivery whose member head carries it, such as the terminal deliveries
   `oat-project-pr-final` registers after the declaration.
2. Run `oat project delivery refresh --project "$PROJECT_PATH" --json`.
3. Author the exhaustive audit over the full phase inventory and every
   numbered outcome: each phase `accepted`, `extracted`, `deferred` or
   `retired`, with non-empty `reason` and `scope_decision_ref` for deferred,
   retired and deferred-child extracted phases; each outcome keyed by its
   number with its exact text and `met`, `extracted`, `deferred` or `retired`;
   `disposition: met` only when nothing is deferred or retired, otherwise
   `met_with_deferrals`; `decided_at`, `declaration_ref` (the declaration
   line in `implementation.md`), and `brief_identity` (the approved brief
   commit). Every deferral or retirement is a scope decision the user approved
   in this step.
4. Write `oat_goal_status: declared_met` and `oat_goal_outcome_audit` in one
   `state.md` write and commit.
5. Check the declaration read-only:
   `oat project closeout-check "$PROJECT_PATH" --json`. A refusal with
   `not-declared` or `audit-invalid` (or the router's `audit` context) is this
   skill's to repair; refusals naming implement, the review owners,
   `oat-project-pr-progress` or `oat-project-pr-final` are terminal recovery
   for those owners. Implement consumes the declaration and never declares the
   goal met.

**Audit repair** (context `audit`): re-read the router's audit error codes,
correct only the audit (never the brief's outcome text to fit the audit), and
re-run step 5.

### Step 10: Output Next Action

Report the workflow mode (`goal`), the brief path, the milestones with their
ordered phases, the active milestone and its status, the review, gate and
approval records, any registered deliveries and their endpoint observations,
and the next skill from the router (`oat-project-implement` after activation;
the terminal recovery owner after a declaration).

```text
Goal milestone m01 activated. Next: oat-project-implement
```

## Success Criteria

- The interview reached explicit design alignment, including the milestone
  split; facts were settled by the agent and decisions by the user.
- `plan.md` passes `oat project validate-plan` with the goal profile: a
  canonical Milestones table in which every executable phase belongs to
  exactly one milestone.
- The brief and every amendment were committed before artifact review, the
  disposition was committed before the gate, and exactly one approval ran per
  brief or amendment, after review and gate.
- `plan.md` `oat_status: complete` was written once, at the first approval;
  each milestone's `plan` carrier was written `allowed` only after that
  milestone's review, gate and approval, bound to its ordered phase set.
- No milestone was activated before the previous delivery was observed at its
  agreed endpoint; learnings were written (or, with the project log disabled,
  attempted with its warning) before re-alignment advanced.
- One structural log entry per activation and per re-alignment entry.
- `declared_met` and the audit were written only after the user's explicit
  declaration, and the audit is exhaustive.
