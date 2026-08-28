---
title: Lifecycle
description: 'End-to-end phase flow from discovery through completion: spec-driven, quick, and import paths.'
---

# Lifecycle

This lifecycle is an optional OAT layer. Interop-only users can skip it.

OAT lifecycle order:

1. Discovery (`oat-project-discover`)
2. Spec (`oat-project-spec`)
3. Design (`oat-project-design`)
4. Plan (`oat-project-plan`)
5. Implement (`oat-project-implement`)
6. Review loop (`oat-project-review-provide` / `oat-project-review-receive`)
7. Summary (`oat-project-summary`) — generates `summary.md` as institutional memory; `oat-project-pr-final` and `oat-project-complete` auto-refresh it when missing or stale
8. PR (`oat-project-pr-progress` / `oat-project-pr-final`) — sets `pr_open` status
9. Revision loop (`oat-project-revise`) — optional; accepts post-PR feedback
10. Documentation sync (`oat-project-document`) — optional; reads project artifacts and code evidence to identify docs needing updates, checks for missing coverage of newly shipped capability areas, and auto-runs `oat-pjm-update-repo-reference` before scanning docs only when the PJM capability is available **and** this repository has adopted PJM
11. Complete (`oat-project-complete`)

**Shortcut:** `oat-project-next` reads project state and invokes the correct next skill automatically — use it instead of remembering which skill comes next. Complements `oat-project-progress` (which is read-only diagnostic).

Full spec-driven design supports three interaction modes: collaborative, selective collaborative, and draft-and-review. Selective collaborative drafts routine sections silently and presents high-risk or uncertain sections for live review. Quick-start lightweight design stays simpler and offers only collaborative or draft-and-review. See [Design Modes](design-modes.md) for details.

## Quick Look

- What it does: explains the end-to-end lifecycle for tracked OAT projects, including alternate quick and import lanes.
- When to use it: when you need the actual project execution model, not just a high-level overview of workflow mode.
- Primary entry points: `oat-project-new`, `oat-project-quick-start`, `oat-project-import-plan`, `oat-project-implement`

## Lifecycle Map

```mermaid
flowchart LR
  D["Discovery"] --> S["Spec"] --> G["Design"] --> P["Plan"]
  P --> I["Implement (oat-project-implement)"]
  I --> R["Review loop"] --> PR["PR flow"]
  PR --> DOC["Docs sync (optional)"]
  DOC --> C["Complete"]
```

## Post-implementation flow

Implementation closeout has one authoritative order:

1. Run final implementation verification.
2. Pass the mandatory final lifecycle review.
3. Resolve and disposition the configured `oat-project-implement` exit gate.
4. Run the configured pre-approval sequence.
5. Record final HiLL approval when the final phase is a checkpoint.
6. Run the configured post-approval sequence.
7. Mark implementation complete and emit the implementation success output.

The configured exit gate is independent from the mandatory lifecycle review,
root-owned phase reviews, and optional `oat_phase_review_gate`. It must reach an
allowed and fresh disposition before pre-approval work starts. A null
configuration is recorded explicitly as `allowed/no_gate`; it is not inferred
from missing state.

After implementation closeout finishes:

1. **Summary** (`oat-project-summary`) — generates `summary.md` as institutional memory from project artifacts; PR-final and completion will auto-refresh it if you have not already run it or if it is stale
2. **Documentation** (`oat-project-document`) — optional sync of project docs; decides whether repo-reference refresh should run before docs analysis using two independent checks, and should recommend new docs pages/directories when the shipped work introduces a capability area that the docs app does not already cover
3. **PR** (`oat-project-pr-final`) — creates PR description (auto-refreshes `summary.md` first when needed, then uses it as source), sets `oat_phase_status: pr_open`, and tracks actual PR existence with `oat_pr_status` / `oat_pr_url`
4. **Revision loop** (`oat-project-revise`) — accepts post-PR feedback:
   - Inline feedback creates `p-revN` revision phases with `prevN-tNN` task IDs
   - GitHub PR feedback delegates to `oat-project-review-receive-remote`
   - Review artifacts delegate to `oat-project-review-receive`
   - After revision tasks complete, state returns to `pr_open`
5. **Complete** (`oat-project-complete`) — accepts any phase status (`pr_open`, `complete`, `in_progress`), auto-refreshes `summary.md` before closeout when needed, and always archives the project locally

### Completion archive behavior

On completion, OAT now treats archive handling as part of the closeout lifecycle:

- Local archive is always written to `.oat/projects/archived/<project>/`.
- If `.oat/config.json` enables `archive.s3SyncOnComplete` and sets `archive.s3Uri`, completion also attempts an S3 upload for a dated snapshot such as `<archive.s3Uri>/<repo-slug>/projects/20260401-<project>/`.
- If `.oat/config.json` sets `archive.awsProfile` and/or `archive.awsRegion`, those values are forwarded to every `aws` invocation triggered by completion (preflight checks + `aws s3 sync`) and override any ambient shell `AWS_PROFILE` / `AWS_DEFAULT_PROFILE` / `AWS_REGION` / `AWS_DEFAULT_REGION` values. The repo's archive-scoped credentials are treated as deliberate intent so users don't have to unset shell env vars before running completion. See [`config-and-local-state.md`](../../cli-utilities/config-and-local-state.md) for the full precedence chain.
- If `.oat/config.json` sets `archive.summaryExportPath`, completion copies `summary.md` to `<archive.summaryExportPath>/20260401-<project>.md`.
- Missing or unusable AWS CLI configuration produces warnings during completion instead of blocking closeout.
- `oat repo archive sync` can later sync all archived projects, or one named archived project, back down from S3; it selects the latest dated remote snapshot and materializes it into the local bare archive tree.

### Phase status: `pr_open`

After `oat-project-pr-final` runs, `state.md` shows `oat_phase_status: pr_open`. This signals:

- The project is in its post-PR review posture
- The project is NOT done — agents should not start a new project
- Next steps: `oat-project-revise` (for feedback) or `oat-project-complete` (when approved)

Actual PR existence is tracked separately from `oat_phase_status`:

- `oat_pr_status` records whether the PR is merely ready to create, open, closed, or merged
- `oat_pr_url` records the tracked PR URL when a PR exists

This distinction matters during completion: `oat-project-complete` can skip the "Open a PR?" prompt when `oat_pr_status: open` is already present.

### Auto-review at HiLL checkpoints

### Approval-aware post-implementation sequencing

`workflow.postImplementSequence` can use the legacy string values or a structured
`{ preApproval, postApproval }` value. After final verification, final review,
and an allowed, fresh implementation exit-gate disposition, OAT snapshots the
effective sequence, runs ordered pre-approval steps, records final HiLL
approval, and only then runs post-approval steps. The snapshot is restart-safe:
an incomplete sequence routes back to implementation and resumes from its first
incomplete step.

Structured sequences accept `summary`, `document`, `pr`, and `retro`.
`retro` is post-approval only: placing it in `preApproval` invalidates the
structured value. This placement lets the retrospective include the final
approval and feedback tail while still running before project completion
freezes lifecycle artifacts. The legacy string mappings are unchanged and do
not add a retro step.

When a pending post-approval `retro` step runs, OAT dispatches
`oat-project-retro` in generate mode. Applying repo improvements and filing
tracker items remain separately consented through interactive confirmation or
`workflow.retro.*` configuration.

`oat-project-next` checks `oat_implement_exit_gate` before every normal
post-implementation route. Missing, pending, blocked, malformed, or stale state
routes back to `oat-project-implement` even when `oat_phase_status` is
`complete` or `pr_open`. Only an allowed, fresh disposition can continue to
summary, documentation, PR, or project completion.

### Retrospective completion safety net

Before an interactive completion archives the project,
`oat-project-complete` checks for
`{PROJECT_PATH}/references/project-retro.md`. If the artifact is missing, it
offers to generate one before completion. If the artifact exists, completion
does not offer another retro; it may note unsettled promotion or filing
registers. Non-interactive completion skips this offer, so autonomous
generation occurs only through an explicitly configured post-approval `retro`
step.

When `workflow.autoReviewAtHillCheckpoints` is enabled or `plan.md` frontmatter sets `oat_auto_review_at_hill_checkpoints`, completing a HiLL checkpoint automatically runs the extra lifecycle review scoped to every implementation phase not already covered by a passed whole-phase code review, through the just-completed checkpoint. Mid-implementation multi-phase reviews use inclusive phase-range scopes such as `p02-p03`; the final implementation checkpoint uses `code final`. The review uses auto-disposition mode (minors auto-converted to fix tasks, no user prompts). Disabled by default. Legacy `autoReviewAtCheckpoints` and `oat_auto_review_at_checkpoints` are still read as fallbacks. This does not control Tier 1 per-phase `oat-reviewer` gates.

### Phase-review setup during planning

Spec-driven, quick, and import planning run one shared setup after stable phase
IDs exist and before the plan artifact review. The target probe qualifies only
an explicitly configured, enabled, and available review target, then offers all
phases, selected phases, or disabled. Existing explicit
`oat_phase_review_gate` values are preserved unchanged without re-prompting.
Probe failure, no qualifying target, non-interactive execution, or user decline
leaves phase review disabled. Provider native plan mode inherits this behavior
through the import-plan lane.

## Implementation modes

`oat-project-implement` v2.0 dispatches one subagent per phase (not per task). Capability detection at skill start selects a tier, locked for the run:

- **Tier 1 (subagents):** native subagent dispatch via Claude Code, Cursor, or Codex with spawn authorization.
- **Tier 2 (guarded sequential execution):** orchestrator reads the agent files and uses a target-preserving route when native subagents are unavailable or authorization is declined.

A concrete managed reviewer remains bound across both tiers. Codex uses the
exact registered role or a child pinned to the resolved model and effort;
Claude passes the exact resolver-returned `dispatchArgs.model`; Cursor launches
the exact `providers.cursor.dispatchArgs.variant` native reviewer variant.
Retries preserve that complete target. Tier 2 does not authorize a target
downgrade. Inline review is allowed only with verified equivalent host
controls, or for explicit inherit/default behavior or the documented
managed-uncapped reviewer base-role exception; otherwise the review blocks.

Within either tier, parallelism is expressed as plan metadata:

- **Sequential (default):** plans with no `oat_plan_parallel_groups` field, or with an empty array. Phases run in plan order on the orchestration branch.
- **Parallel groups:** phases listed together in `oat_plan_parallel_groups` run concurrently in worktrees (Tier 1 only) and merge back to the orchestration branch in plan order. Groups themselves execute sequentially.

See [Implementation Execution](implementation-execution.md) for the full execution model — tier detection, bounded fix loop, fan-in, merge-conflict handling, dry-run, and resumption.

## Review receive behavior

- `oat-project-review-receive` now presents a findings overview before asking for any disposition decisions.
- Findings are shown with stable IDs by severity (`C*`, `I*`, `M*`, `m*`) so follow-up choices map clearly to specific items.
- For each finding, the receive step summarizes the reviewer note, adds agent analysis, and gives a recommendation (convert now vs defer with rationale).

## Alternate lifecycle lanes

### Quick lane diagram

1. `oat-project-quick-start` (adaptive discovery — provide a project name and optional description; if only the name is provided, quick-start asks for the missing description before discovery. Well-understood requests synthesize quickly, exploratory requests invest in solution space exploration. Before scaffolding, the skill checks inherited git state and asks whether to commit, proceed, or abort when the worktree is already dirty.)
2. Decision point: straight to plan, optional lightweight `design.md`, or promote to spec-driven
3. Implement: `oat-project-implement` (sequential by default; parallel when `oat_plan_parallel_groups` is declared)
4. `oat-project-review-provide` / `oat-project-pr-final`
5. Optional `oat-project-promote-spec-driven` to backfill spec-driven lifecycle artifacts in-place

### Import lane diagram

1. `oat-project-import-plan` (checks inherited git state before import scaffolding so sync-generated or unrelated dirty files do not silently roll into project bookkeeping)
2. Implement: `oat-project-implement` (sequential by default; parallel when `oat_plan_parallel_groups` is declared)
3. `oat-project-review-provide` / `oat-project-pr-final`
4. Optional `oat-project-promote-spec-driven` to switch project mode to spec-driven lifecycle

## Lane diagrams

### Spec-Driven workflow lane

```mermaid
flowchart LR
  D["Discover"] --> S["Spec"] --> G["Design"] --> P["Plan"]
  P --> I["Implement (oat-project-implement)"]
  I --> R["Review"] --> PR["PR"] --> Doc["Docs (optional)"] --> C["Complete"]
```

During the Design step, `oat-project-design` asks how to work through the document unless a mode was selected by argument, environment, or `workflow.designMode`. The three full-design choices are collaborative, selective collaborative, and draft-and-review.

Before a plan is marked ready for implementation, planning resolves the current
provider's dispatch policy from `workflow.dispatchPolicy.mode` and
`workflow.dispatchPolicy.policy`, or from project `state.md` frontmatter. The
legacy `workflow.dispatchCeiling.providers.<provider>` config and
`oat_dispatch_ceiling` frontmatter remain compatibility inputs for capped
managed policies. If no policy is configured and the session is interactive,
planning asks once and stores the answer as `oat_dispatch_policy`;
non-interactive planning with an unresolved policy is not implementation-ready
and blocks at the planning boundary until the resolver succeeds. Implementation
preflight retains the same defensive check, but it is not the first place an
unresolved plan fails. `Uncapped` is explicit managed selection with no maximum
cap; `Inherit Host Defaults` is separate and means OAT does not select model or
effort controls.

### Quick lane

```mermaid
flowchart LR
  Q["Quick Start\n(adaptive discovery)"] --> D{"Design depth?"}
  D -->|Straight to plan| P["Plan"]
  D -->|Lightweight design| LD["Design (quick)"] --> P
  D -->|Promote| SD["→ Spec-Driven lane"]
  P --> QI["Implement (oat-project-implement)"]
  QI --> QR["Review / PR"]
```

Quick lane lightweight design intentionally keeps a smaller collaborative/draft choice. Selective collaborative becomes available only after promotion into the full spec-driven design lane.

Quick-start follows the same dispatch policy rule at the plan boundary: capture
the policy when interactive, persist `oat_dispatch_policy` to project state, and
avoid any mid-implementation policy prompt. Legacy dispatch-ceiling state is
still read as compatibility capped-policy input, but new quick-start selections
should use the dispatch-policy names, including explicit `Uncapped` and
`Inherit Host Defaults`.

### Import lane

```mermaid
flowchart LR
  I["Import Plan"] --> II1["Implement (oat-project-implement)"]
  II1 --> IR["Review / PR"]
```

### Capture lane

Retroactive project creation for work done outside the OAT project workflow. Common scenario: mobile/cloud sessions where you brainstorm and implement with an agent, then want to open a PR and review from your desktop.

```mermaid
flowchart LR
  W["Work on branch\n(no project)"] --> Cap["oat-project-capture"]
  Cap --> R["Review / PR"]
```

Entry point: `/oat-project-capture` (skill-only, no CLI command — requires agent conversation context).

Key differences from other lanes:

- **No plan generation** — the work is already done; the scaffold-created `plan.md` template is kept but not authored
- **Discovery from conversation** — `discovery.md` captures intent and decisions from the agent's conversation context, not from requirements analysis
- **Implementation from commits** — `implementation.md` is populated from commit history with SHAs, not from executing plan tasks
- **Lifecycle state is user-chosen** — user decides whether the project is ready for review or still in progress

## Artifact progression

`discovery.md` -> `spec.md` -> `design.md` -> `plan.md` -> `implementation.md` -> `summary.md`

Quick lane progression:

`discovery.md` -> [`design.md` (optional lightweight)] -> `plan.md` -> `implementation.md`

Import lane progression:

`references/imported-plan.md` -> `plan.md` -> `implementation.md` (`spec.md`/`design.md` optional)

Capture lane progression:

`discovery.md` (from conversation) + `implementation.md` (from commits) — no forward-looking artifacts

## Operational rules

- Keep `state.md`, `plan.md`, and `implementation.md` synchronized.
- Stop at configured HiLL checkpoints.
- Do not move lifecycle forward when required review gates are unresolved.
- Project entry skills (`oat-project-new`, `oat-project-quick-start`, and `oat-project-import-plan`) surface inherited dirty git state before scaffolding. If the dirty list includes `.oat/sync/manifest.json`, `.claude/`, `.cursor/`, or `.codex/`, the skill calls out that those paths are typically sync output and offers Commit now, Proceed anyway, or Abort.

## Reducing lifecycle friction with workflow preferences

The lifecycle has several interactive prompts that power users often answer the same way every time — HiLL checkpoint behavior, archive on complete, auto-create PR, post-implementation chaining, final review execution model, and re-review scope narrowing. These can be configured once via `workflow.*` preference keys and respected automatically by skills.

See the [Workflow preferences section in the Configuration guide](../../cli-utilities/configuration.md#workflow-preferences-workflow) for the full list of keys and how to set them. Preferences resolve through a three-layer chain (`env > repo-local > repo-shared > user > default`), so you can set personal defaults at user scope once and override per-repo only when needed.

## Active project resolution

- Active project state is stored in `.oat/config.local.json` (`activeProject`, repo-relative path).
- Projects root is stored in `.oat/config.json` (`projects.root`) and can be read via `oat config get projects.root`.
- Workflow skills prefer `oat config get activeProject` / `oat config get projects.root` rather than reading pointer files directly.

## Capability availability versus repository adoption

Lifecycle skills that touch repository project-management state make two
separate checks, and both must hold before any PJM write:

1. **Capability availability** — `oat tools has project-management` answers
   whether the PJM skills and templates are installed and complete at project or
   user scope. Since packs default to user scope, this is usually satisfied by a
   user-scope install with no repository footprint.
2. **Repository adoption** — `oat pjm doctor --json` answers whether _this_
   repository adopted PJM. Branch on its `adoption.state` field: `declared` and
   `inferred-legacy` allow repository PJM writes; `partial-initialization` and
   `none` stop with `oat pjm init` as the recovery.

Pack presence is never treated as evidence of repository adoption. A skill that
finds the capability available but the repository unadopted reports the
actionable `oat pjm init` stop instead of scaffolding implicitly. See
[Install vs. initialize](../../cli-utilities/tool-packs.md#install-vs-initialize).

## Brainstorming integration with the project lifecycle

`oat-brainstorm` (in the `brainstorm` tool pack) interacts with the project lifecycle in two distinct ways: it can **seed a brand new project** from a brainstorming conversation when no project is active, or **fold back into an active project** when one is.

### Seeding a new project from a brainstorm

When the brainstorming destination is "promote to a new OAT project", the dispatcher confirms a project slug and a mode (`quick` vs `spec-driven`) with the user, runs `oat project new <slug> --mode <mode>` to scaffold the project, and writes the new project's `discovery.md` directly from the brainstorming payload — Initial Request, Solution Space with approaches considered, Chosen Direction, Key Decisions, Open Questions. It writes `discovery.md` only (never a partial `design.md`), so the design phase keeps its full collaborative cadence and consumes the brainstorm's architectural intent from discovery's Solution Space and Chosen Direction sections during approach reaffirmation. The dispatcher stops with a pointer to `oat-project-quick-start` or `oat-project-design` — it deliberately does not auto-chain into the next phase, so the user makes that transition consciously.

This is a parallel entry path into the Spec-Driven and Quick lanes, not a new lane: the resulting project follows the normal lane it was scaffolded into. The brainstorm-as-seed step is what changes — the user arrives at `oat-project-quick-start` (or `oat-project-design`) with discovery already populated rather than starting from a blank discovery template.

### Folding back into an active project

When `oat-brainstorm` fires while a project is active, it offers a 3-way picker before any pack-filtered destination shows up:

- **Related to the project** → fold the synthesized brainstorming content back into the most-specific upstream artifact (`design.md` if it exists, otherwise `discovery.md`), commit immediately, and print a handoff prompt for the right plan-authoring skill (`oat-project-plan` for spec-driven, `oat-project-quick-start` for quick, `oat-project-revise` when an open PR exists). The fold-back commit is safety-gated: a preflight `git status --porcelain -- "$ARTIFACT_PATH"` checks for dirty state, staging is exactly `git add -- "$ARTIFACT_PATH"` (never `-A`, never globs), and the handoff prompt only prints after the scoped commit succeeds.
- **Independent of the project** → the active project is acknowledged but doesn't constrain the picker; brainstorm routes through its standard pack-filtered terminal-state options (new project, backlog item, idea, doc-to-path, inline).
- **Related but supplementary** → write a brainstorming reference file at `.oat/projects/<scope>/<project>/brainstorming/YYYY-MM-DD-<topic>.md`, alongside `pr/` and `reviews/`. No lifecycle artifact is touched.

The fold-back path is what makes "we got to plan and realized the design missed something" recoverable mid-project: the upstream artifact gets updated and committed cleanly, then the user re-runs plan authoring with a "don't refresh, integrate" context that preserves review-table state.

## Reference artifacts

- `.oat/projects/<scope>/<project>/spec.md`
- `.oat/projects/<scope>/<project>/design.md`
- `.oat/projects/<scope>/<project>/plan.md`
- `.oat/projects/<scope>/<project>/implementation.md`
