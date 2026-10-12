---
title: Project Artifacts
description: 'Project artifact contracts: state.md, spec.md, design.md, plan.md, and implementation.md.'
---

# Project Artifacts

Project artifacts use one of three active scopes:

- `shared` artifacts live directly on the feature branch under
  `.oat/projects/shared/<project>/`.
- `synced` artifacts live in a gitignored nested worktree at
  `.oat/projects/synced/<project>/`, backed by
  `refs/oat/projects/<project>` on `origin`. The feature branch tracks only
  `.oat/projects/synced/<project>.json`.
- `local` artifacts stay untracked on the current machine under
  `.oat/projects/local/<project>/`.

`projects.defaultScope` controls creation when a command does not pass
`--scope`; its default is `synced`.

## Synced artifact bookkeeping

Lifecycle skills write the same project files in every scope. After a synced
write, they use `oat project push` instead of staging the artifact path on the
parent branch. The command makes an artifact commit in the nested checkout,
rebases it on the fetched project ref, and pushes only that ref. Arrival skills
run `oat project pull` before reading artifacts so a record or remote ref can
materialize the checkout first.

The tracked JSON record is active routing metadata, not a copy of the project.
It identifies the slug, `origin`, active ref, and status. The active project ref
remains the source of truth for active artifact content and history.

Archived closeout transitions terminal identity to
`refs/oat/completed/<project>`, deletes the active record and checkout, and
persists source-ref identity in local archive metadata. Arrival and pull flows
never rematerialize a completed project as active state: the completed ref and
archive metadata own terminal reachability and retry identity.

## Core artifacts

- `state.md`: lifecycle state and checkpoint metadata
- `discovery.md`: problem framing, constraints, solution space exploration (for exploratory requests), and discovery outcomes
- `spec.md`: requirements + acceptance criteria
- `design.md`: architecture and implementation approach (full in spec-driven mode; optional lightweight version in quick mode covering architecture, components, and testing strategy)
- `plan.md`: phase/task breakdown and review tracking
- `implementation.md`: the execution journal — phase sections with task blocks, run lines, review and gate receipts, deferred findings, deviations, and the final summary (see [The implementation journal](#the-implementation-journal))
- `summary.md`: institutional memory artifact — generated from project artifacts at closeout, used as PR description source and archive cover page

Mode-sensitive notes:

- `state.md` includes workflow mode metadata (`spec-driven`, `quick`, `import`, `lite`, `brief`, `goal`) for routing.
- `plan.md` remains the canonical execution artifact across all modes.

| Mode          | Core authored artifacts                                                                                                                | Optional artifacts                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `spec-driven` | `discovery.md`, `spec.md`, `design.md`, `plan.md`                                                                                      | -                                          |
| `quick`       | `discovery.md`, `plan.md`                                                                                                              | Lightweight `design.md`, `spec.md`         |
| `import`      | `references/imported-plan.md`, `plan.md`                                                                                               | `spec.md`, `design.md`                     |
| `lite`        | Single-phase `plan.md` with Summary, Decisions, Assumptions, Out of Scope, Validation Criteria, and an explicit adaptive content shape | `summary.md` and documentation at closeout |
| `brief`       | `plan.md` as a Project Brief (phases with Intent and Exit evidence) and `implementation.md` as the per-phase journal                   | `references/research/`, `project-log.md`   |
| `goal`        | The brief artifacts, with a `## Milestones` table in `plan.md` and the goal fields in `state.md`                                       | `references/research/`, `project-log.md`   |

Every Lite plan keeps Summary, Decisions, Assumptions, Out of Scope, and
Validation Criteria. User-visible changes add numbered, testable Product
Behavior. Changes that cross module boundaries, alter data or state formats,
or change a contract consumed by another surface add Technical Design. That
section covers current operation, proposed changes, and data flow when data or
state crosses a boundary. The Decisions section records the selected shape and
why it fits.

Each Lite task also records an implementation and proof strategy: the risk it
covers, why the evidence is proportionate, and the exact command or manual
proof. Strategies may be test-first, characterization-first,
implementation-then-regression, static/build, or manual/visual. Static or build
checks alone fit only changes that cannot affect runtime behavior; every
behavioral change needs evidence that fails without the change.

In brief mode, `plan.md` is the Project Brief: Goal, numbered Outcomes (each
naming its intended evidence), Approach with an optional `### Design`,
Constraints and Out of Scope, Decisions, Known Unknowns, Delivery endpoint and
authority, an empty `## Milestones` section reserved for goal mode, and
`## Phase pNN:` blocks with `**Intent:**`, `**Exit evidence:**`, and
`**Provisional:**` lines instead of tasks. `implementation.md` is the
per-phase journal: each phase section carries exact `**Status:**`,
`**Base:**`, `**Head:**`, and `**Executor:**` marker lines, followed by
`### Task pNN-tNN` execution records opened as work happens. Progress counts
phase-units, and `**Status:** completed` under a phase heading is what accepts
it. The journal's Final Summary adds an `**Outcomes audit:**` block with one
line per numbered Outcome. When a brief artifact gate is configured,
`state.md` records its outcome as `oat_brief_gate`, with the same core fields
as `oat_quick_start_gate`.

In goal mode, `plan.md` is the same Project Brief with a filled
`## Milestones` table: one `| Milestone | Phases |` row per milestone listing
its ordered phase IDs, every phase (revision phases included) in exactly one
milestone. Later milestones are appended at re-alignment, and a phase frozen in
a registered delivery is never removed or reassigned. `state.md` adds the
goal fields:

- `oat_milestone` and `oat_milestone_status` (`aligning`, `implementing`,
  `reviewing`, `delivering`, `delivered`), the active milestone;
- `oat_goal_status` (`active` or `declared_met`) and
  `oat_goal_outcome_audit`, the exhaustive per-phase and per-outcome audit
  written at the terminal declaration;
- `oat_goal_recovery`, the record of an interrupted recovery, which may target
  an older milestone without moving the active one;
- `oat_milestone_gates`, one `plan` and one `exit` gate carrier per
  milestone; and
- `oat_deliveries`, the delivery registry: one entry per delivery (`dNN`) with
  its milestone, frozen phase scope, agreed endpoint, status, member pull
  requests and their observed revisions, the integrated review it was
  delivered on, its exit-gate binding and the first observed endpoint
  attainment. A delivery's `status` is `registering`, `open`, `at_endpoint`,
  or `superseded`, and its agreed `endpoint` is `open` or `merged`. A
  replacement delivery names its one direct predecessor in `covers_scope_of`,
  and the predecessor's `superseded_by` points back; only a delivery that never
  reached its agreed endpoint may be replaced. A correction of a delivery that
  did reach it is additive (`corrects_delivery_id`, new phase IDs, no inherited
  coverage). `oat_pr_status` and `oat_pr_url` project the latest member pull
  request.

Delivery evidence stays fresh across later commits that change only bookkeeping:
`state.md`, `plan.md` (outside its approved content), `implementation.md`,
`project-log.md` appends, `summary.md`, and the review artifacts of the
delivery and of any delivery sharing its pull request.

A delivery's evidence identity is set once: its `exit_gate`, its
`integrated_review` identity (`artifact`, `scope`, `bound_revisions`), and each
member's `reviewed_head`. They change only in a commit that records a new
review artifact of that delivery, one its own `## Reviews` rows name and never
a sharing delivery's; any other change to them is not bookkeeping. A bound
revision that disagrees with its member's `reviewed_head` is not fresh
(`bound-revision-mismatch`).

`oat project delivery refresh` writes only observations and derived staleness
into `oat_deliveries` and the milestone carriers. The terminal declaration is
recorded as one `**Goal declared met:**` line in the journal's Final Summary.

Extraction of goal work into another project is manual. A phase moved to a
linked project gets `**Extracted to:** <slug>` in the brief and the marker pair
`**Status:** extracted` / `**Extracted to:** <slug>` in the journal, and the
child project records `oat_extracted_from: <goal slug>` in its `state.md`. The
brief and journal targets must match. The outcome audit requires the child to
be complete or its outstanding obligation to carry an approved deferral, and
promotion of the goal to quick refuses any extracted phase.

## The implementation journal

`implementation.md` has fixed slots, and every writer targets them:

- **Phase sections** (`## Phase …`) hold each phase's `**Status:**`, one
  `### Task pNN-tNN:` block per plan task with exactly one `**Status:**` and,
  once completed, one `**Commit:**` SHA (brief and goal: execution records and
  the phase's `**Base:**`/`**Head:**` anchors), one free-text verification
  line, and the phase's review receipt. Tables and checklists are display,
  never completion evidence.
- `## Orchestration Runs` holds one run line per dispatch request ID, rendered
  by `oat project dispatch record --format line` (`run/v1 · request=… · stamp=Dispatch: … · launch=… · outcome=… · terminal=…`)
  and updated in place with the terminal outcome. Record and event JSON is
  never pasted into the journal.
- `## Reviews and Gates` holds final and multi-phase review receipts and one
  terminal line per gate run (`**Gate:** … · **Scope:** … · **Outcome:** …`).
  `state.md` owns gate transitions; the journal keeps the outcome, waivers and
  operator choices.
- `## Deferred Findings` holds one line per approved deferral, excluded
  parallel phase, and unmerged worktree.
- `## Deviations from Plan / Design` holds deviations, exception blocks, and
  override lines:
  `**Override:** <scope-disposition-approved|evidence-lost|operator-accepted-gap> · **Authorized by:** <decision id> · **Scope:** <pNN-tNN|pNN> · <reason>`.
- `## Final Summary (for PR/docs)` is rewritten at closeout from observed
  facts, and `## References` is always the last section.

A receipt carries the finding identity and substance, the disposition and its
rationale, the fix task or approved deferral it links to, and the final
outcome, so the journal and plan stand without the review file. Review paths
are local-only citations: reviews are not archived, so an unresolved review
path is never a completion defect. `oat project journal check` validates these
slots at implement's pre-Step-16 boundary, at review with an explicit phase
scope, and at completion; see the [CLI reference](cli-reference.md).

`oat-project-complete` writes `oat_pr_status_observed_at` (UTC) beside
`oat_pr_status` before archive: in an archived `state.md`, `oat_pr_status` and
`oat_pr_url` are observations at that time, not live PR state.

## Archive identity

`oat project archive` (and completion's archive step) records each archive's
identity in `.oat-archive-source.json` inside the local snapshot: the project
name, its originating scope, the dated export identity `<YYYYMMDD>-<project>`
(the summary export file stem and the S3 key), the synced source-ref SHA where
one applies, the generation (`1` for the first archive), and `manifestHash`.
The manifest hash covers every retained file of the project as sorted
`<sha256>  <path>` lines; it excludes the top-level `reviews/` directory (reviews
are never archived), a synced checkout's `.git`, and the archive-owned
`.oat-archive-source.json` itself, so a project and its archive hash equal.

A retry resolves to that identity before anything is written:

- an identical retry (the source's manifest matches exactly one archive of the
  same project and scope) reuses its local snapshot, dated export identity, S3
  destination and receipt, on a later date too;
- a retry whose source is gone resumes the single archive of that project and
  scope;
- changed content, more than one matching archive, or a non-empty directory at
  the project's archive path that does not identify itself refuses before any
  export, copy, overwrite or S3 upload, and points reopened work at a
  follow-up project;
- the same slug from a different scope is a separate identity; when the other
  archive already holds the project's archive path or the dated export
  identity, the new one is qualified with the scope in both: local path
  `<project>-<scope>` and export identity `<YYYYMMDD>-<project>-<scope>`. An
  empty directory at the archive path is reused. Local paths always derive
  from the identity, never from the clock.

Reopened work can instead be archived as a new generation with
`oat project archive --new-generation <reason>` (shared and local projects).
The option needs exactly one latest generation of the same project and scope as
its predecessor and refuses otherwise. The new generation lives at
`<project>-gN` with export identity `<YYYYMMDD>-<project>-gN`, and its
metadata records `predecessor`, `generationReason` and `generationRequest`, the
`sha256` of the project, scope, predecessor snapshot and manifest. That
metadata is written with `allocation: pending` before any export, copy or S3
upload, so an interrupted run resumes the same generation; the marker is
removed once the copy completes. Running the request again with the same
content resolves to the same generation, while changed content after it
completes becomes the next generation. Without the option, changed content
still refuses.

`--dry-run` runs the same read-only evaluation and reports the identity an
apply would use, so a retry previews the persisted snapshot rather than
today's date. The synced protections (recordless retry by completed ref,
stale-source refusal, exact project-root checks) are unchanged.

Every refusal fails closed before any write. Its message starts with a stable
reason code, and `--json` reports the same code as `code` in the error object:

| Code                                       | Refused when                                                                                                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `archive-retry-ambiguous`                  | more than one same-scope archive matches the retry, or a persisted snapshot resolves to several local archives                                                                                                |
| `archive-retry-conflict`                   | the retained artifacts differ from the project's archive                                                                                                                                                      |
| `archive-occupant-unverifiable`            | a non-empty directory at the archive path does not identify itself as this project; if it is a partial copy left by an interrupted archive, inspect and remove it, then retry                                 |
| `archive-generation-synced`                | `--new-generation` was given for a synced project                                                                                                                                                             |
| `archive-generation-reason`                | the `--new-generation` reason is empty, multi-line or longer than 200 characters                                                                                                                              |
| `archive-generation-source-absent`         | `--new-generation` was given but the project directory is absent                                                                                                                                              |
| `archive-generation-no-predecessor`        | `--new-generation` found no archive of the project and scope                                                                                                                                                  |
| `archive-generation-ambiguous-predecessor` | more than one archive holds the latest generation                                                                                                                                                             |
| `archive-generation-pending`               | the latest generation is still allocated but not copied                                                                                                                                                       |
| `archive-generation-path-occupied`         | the `<project>-gN` path is held by something else                                                                                                                                                             |
| `archive-synced-recordless-unbound`        | a synced project without a record has no archive whose identity matches its authoritative completed ref                                                                                                       |
| `archive-synced-recordless-ambiguous`      | a synced project without a record has several archives matching its completed ref                                                                                                                             |
| `archive-retry-candidate-damaged`          | the matched archive's current bytes no longer match the manifest recorded when it was written (or the project it would replace); restore it from S3 (`oat repo archive sync <project>`) or backup, then retry |

When `--new-generation` content is identical to an existing archive, the
command resolves to that generation and warns that no new generation was
allocated, naming the persisted reason when that archive was itself an
explicit generation (otherwise the warning says the reason was not recorded).

The exported summary finalizes source locators: each
`oat-project:<project>#<entry-id>` token becomes
`oat-archive:<YYYYMMDD>-<project>#<entry-id>`, and a relative link to the
archived-only `project-log.md` or legacy `oat-execution-learnings.md` becomes
plain text naming the archive identity. A relative link into `reviews/`
becomes its label plus the review file name, marked local to the project and
not archived, since reviews are never archived; external links are kept. The
summary inside the archive keeps its original bytes.

## Blockers in state.md

`oat_blockers` accepts legacy reason strings and structured workflow records:

```yaml
oat_blockers:
  - task_id: p01-t03
    reason: Waiting on API contract
    since: '2026-10-03'
  - waiting on review
```

The control plane exposes `ProjectBlocker` as
`string | { task_id: string; reason: string; since: string }`.
`oat project status --json` preserves the three literal fields. Human status
shows the task, reason and date for records, and the reason for legacy strings.
`--field project.blockers` emits JSON; `--shell BLOCKERS=project.blockers`
emits a shell-quoted JSON assignment. Select a single field such as
`--field project.blockers.0.reason` to read a structured reason alone.

Empty lists remain empty. Mixed lists retain entries in order, with
legacy string normalization unchanged. Records missing any nonempty string
field, nested lists and non-string scalars become diagnostic legacy strings:
`Malformed blocker entry: <JSON>`. They remain visible to blocker checks and
human output without `[object Object]` coercion. The parser also accepts
JSON-encoded blocker lists for compatibility. These representations do not change workflow recommendations
or the state refresh command's existing raw-frontmatter handling.

## Supporting artifacts

- `summary.md`: generated by `oat-project-summary` — re-runnable, tracks its own state via frontmatter for incremental updates after revisions. Its `## Workflow Observations` section is written only by `oat project log rollup`: a bounded digest of judgment entries, omitted when none qualifies
- `project-log.md`: the append-only observation log, written only with `oat project log append`. Learnings from autonomous, cloud and goal runs are judgment entries whose body opens with `**Category:**`, `**Source:**`, `**Origin:**` and `**Recorded:**` lines (see [Project Log](../workflows/projects/execution/project-log.md)). A legacy `oat-execution-learnings.md` from an older project is still read by summary and retro after the log, and no new run creates one; with the log disabled, learnings are not recorded
- `reviews/*.md`: phase/final review files
- `pr/*.md`: generated PR descriptions
- `references/imported-plan.md`: preserved source plan for import mode
- `references/split-plan.json`: persisted split plan for a coordination parent, used as the durable resume source when `oat-project-split` is interrupted
- `references/project-retro.md`: optional post-approval retrospective with
  machine-scannable repo-improvement (`RP-NN`) and upstream-feedback (`UP-NN`)
  registers. Promotion and filing rollups let the retro skills resume approved
  applications and tracker filing without repeating settled work. See
  [Project Retrospectives](../workflows/projects/closeout/retro.md).

### Explainer artifacts

[Explainer Kit](../skills/explainer-kit.md) writes project runs under
`<resolved-project-path>/explainers/<slug>/`. The two project products have
different retention contracts:

- A `project-explainer` is a working artifact. In a shared project it can be
  tracked while the project is active, but project completion removes it from
  the tracked branch with the active project tree. It remains only in the local
  archived project.
- A selected final `project-recap` is a durable completion record. Before a
  shared project is removed, archive verifies the complete selected run and
  exports one self-contained HTML page to
  `.oat/repo/reference/project-recaps/<YYYYMMDD-project-slug>.html`. The
  report identifies the run, original page/hash, exported hash, and verified
  artifact count. The full original run, manifest, source, and QA evidence
  remain in the archived project. Summary
  and PR links use this export, never the gitignored local archive. Lifecycle
  callers identify the selected project-relative run with:

  ```bash
  oat project archive <project-path> \
    --project-recap-run explainers/<recap-slug>
  ```

The archive exports at most one selected recap page, with local assets embedded
and unavailable project-source links removed. It adopts a byte-identical dated
page on retry and refuses a differing existing destination without overwriting
it. It creates no tracked manifest, fact-base, QA, or hash sidecar and requires the selected path to stay under the project's
`explainers/` directory with a `project-recap` manifest. Verification checks
the manifest version's exact inventory and raw immutable file-byte hashes before
deleting the active project. Direct CLI archive also accepts legacy v1 recaps:
the v1 contract verifies canonical fact-base and resolved-theme JSON identities
and build-record run/outcome agreement. The v2 contract additionally requires
ledger and QA evidence coverage. Project completion selects v2 recap runs.

Both `built` and `built-needs-review` are complete, archivable outcomes.
`built-needs-review` means the browser rung was unavailable or found an issue;
the archive retains that visible human-review signal. `failed`, `incomplete`,
stale, mismatched, or tampered packages fail the export guard.

Local-scope projects are not archived through this export path. Their explainer
packages remain local working artifacts. Non-project OAT explainer runs use
`.oat/repo/reference/explainers/<slug>/`; direct core callers provide an
explicit output root.

### Gate review frontmatter

Review artifacts produced by `oat gate review` use the normal review fields plus
an exact copy of the gate-owned configured invocation:

```yaml
oat_review_invocation: gate
oat_project: .oat/projects/shared/example
oat_gate_run_id: 00000000-0000-0000-0000-000000000000
oat_gate_target: codex-sol-max
oat_gate_runtime: codex
oat_invocation_model: gpt-5.6-sol
oat_invocation_reasoning_effort: max
oat_invocation_source: exec-target-config
```

`oat_invocation_model` and `oat_invocation_reasoning_effort` may be
`provider-default` when OAT deliberately leaves a control to the provider, or
`unknown` when the target does not declare it. These fields are configured
invocation metadata, not runtime-confirmed or self-reported model identity.
Manual and auto review artifacts do not require the gate-only fields.

## Contract

Artifacts are the project system of record; automation and routing should derive from these files, not memory.

### Formatting and verification hygiene

Tracked artifacts are part of the repository diff, so artifact writers format
them before finishing or committing. During plan authoring, OAT resolves the
repository's documented write/fix command from applicable `AGENTS.md` /
`CLAUDE.md` instructions and relevant package manifests. Each task that writes
an artifact receives a concrete invocation, scoped to that task's files when
the command supports paths.

Downstream implementers execute that supplied command without repeating
discovery. Roles and lifecycle skills that write outside a planned task,
including reviewers and documentation, summary, PR, and quick-start flows, use
the same discovery procedure as a fallback. Gate-originated review prompts also
carry the contract so review artifacts follow the same rule across runtimes.

Writers must:

- prefer a documented write/fix command over a check-only command;
- avoid inferring or hardcoding a formatter;
- scope the write to created or edited files when supported;
- avoid whole-tree rewrites that could absorb unrelated changes; and
- warn once with
  `no format command discovered in repo instructions; skipping` when no command
  is discoverable, then continue.

Formatting supplements the applicable verification contract. Phase
implementation runs repository gates over its produced diff, including
artifact writes. Prose-only lifecycle work runs only checks relevant to the
files it changed.

## Coordination parents

Project splitting introduces a coordination-only parent artifact. It records shared context and child relationships, but it is not an executable lifecycle project.

A coordination parent uses:

- `oat_kind: coordination`
- `oat_phase: decomposition`
- `oat_phase_status: complete`

Coordination parents do not contain executable phase files. `spec.md`, `design.md`, `plan.md`, and `implementation.md` are removed from the parent and represented in state prose as not applicable.

The parent still keeps `state.md`, `discovery.md`, and `references/split-plan.json`. Child projects are flat siblings and link back to the parent through state metadata. Each child starts from a distilled discovery seed and must revalidate inherited context before moving beyond discovery/design.

See [Project Splitting](../workflows/projects/planning/splitting.md) for the full parent/child model.

### plan.md frontmatter

`plan.md` carries frontmatter that the implementation skill consumes. Notable fields:

- `oat_plan_hill_phases` — list of phase IDs to pause at for HiLL checkpoints.
- `oat_plan_parallel_groups` — declares which phases may execute concurrently in worktrees. See below.
- `oat_phase_review_gate` — opt-in non-pausing external review gate that runs after a phase's standard reviewer passes. See below.

#### oat_plan_parallel_groups

Declare phase groups that run in parallel during `oat-project-implement`:

```yaml
oat_plan_parallel_groups: [['p02', 'p03'], ['p04', 'p05']]
```

Each inner array is a group of phases that execute concurrently in their own worktrees and merge back to the orchestration branch in plan order. Phases not listed in any group run sequentially.

**Semantics:**

- Empty or missing field → fully sequential, no worktrees created (default).
- Each group must contain **2 or more** phases — singleton groups are rejected.
- Every phase ID must exist in the plan body.
- No phase may appear in more than one group.
- Parallelism is only honored at Tier 1 (native subagents). Tier 2 degrades parallel groups to sequential target-preserving execution, not unconditional inline review. Concrete managed Claude reviewers use the exact generated `providers.claude.dispatchArgs.variant` for effort-pinned targets and retain `providers.claude.dispatchArgs.model` only for legacy model-only targets; Cursor reviewers retain the exact `providers.cursor.dispatchArgs.variant` native agent type; Codex retains its exact role or pinned child. Every retry preserves the complete target. Inline review requires verified equivalent host controls or an explicit inherit/default or managed-uncapped base-role exception, and otherwise blocks.

**Authoring responsibility:**

- `oat-project-plan` proposes parallel groups when phases have file-disjoint task sets; it never infers parallelism silently.
- Phases listed in a group should have no file-level overlap. Overlap will produce merge conflicts during fan-in that stop the run.

**Validation:**

Before dispatching, `oat-project-implement` invokes `oat project validate-plan --project-path "${PROJECT_PATH}"`. Non-zero exit blocks the run. See [CLI Reference](cli-reference.md) and [Implementation Execution](../workflows/projects/execution/implementation-execution.md) for details.

#### oat_phase_review_gate

Enable an optional, non-pausing external review gate that runs after each selected phase's standard reviewer passes and its bookkeeping is committed:

Planning offers this setting after stable phase IDs exist and before the plan
artifact review. The read-only target probe qualifies only an explicitly
configured, enabled, and available target, then offers all phases, selected
phases, or disabled. An explicit `oat_phase_review_gate` value from a resumed or
imported plan is preserved unchanged without re-prompting. If the probe fails,
no target qualifies, the run is non-interactive, or the user declines, planning
leaves phase review disabled.

```yaml
oat_phase_review_gate:
  enabled: true
  phases: [] # empty or omitted = every implementation phase
  review_type: code
  exit_nonzero_on: high
```

**Semantics:**

- Missing, `null`, or `enabled: false` → disabled (default). `enabled: true` activates the gate.
- `phases` → optional. Empty or missing runs the gate after every implementation phase; a populated list restricts it to those phase IDs, each of which must exist in the plan body.
- `review_type` → optional, defaults to `code`. Only `code` is supported for phase gates.
- `exit_nonzero_on` → optional, defaults to `high`. One of `critical`, `high`, `medium`, `low`. This is the blocking threshold: findings at or above it stop the phase; sub-threshold findings are dispositioned by the judgment sweep rather than ignored.

A malformed gate stops the run before task execution rather than being silently disabled. The gate is independent of HiLL checkpoints and reuses the existing `oat gate review` target config — it does not hardcode a `--target`. See [Reviews → Phase review gate](../workflows/projects/reviews/index.md#phase-review-gate) for the runtime behavior and disposition rules.

## Reference artifacts

- `.oat/templates/*.md`
- `.oat/projects/<scope>/<project>/spec.md`
- `.oat/projects/<scope>/<project>/design.md`
- `.oat/projects/<scope>/<project>/plan.md`
- `.oat/projects/<scope>/<project>/implementation.md`
- `.oat/projects/<scope>/<project>/summary.md`
