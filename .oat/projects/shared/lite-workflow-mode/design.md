---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-04
oat_generated: false
oat_template: false
---

# Design: lite-workflow-mode

> Lightweight quick-mode design. Sections that belong to spec-driven design
> (security, performance, deployment, migration) are intentionally omitted.

## Overview

Lite becomes a fourth workflow mode value alongside `spec-driven`, `quick`,
and `import`. Its footprint is a project directory with three files: an
authored `plan.md` that carries spec sections (summary, decisions,
assumptions, out of scope, validation criteria) ahead of a single-phase task
list, plus machine-owned `state.md` and `implementation.md`. No discovery,
spec, or design file exists. The mode is registered like any other, so the
recommender, dashboard, progress, next, implement, review, and PR flows all
see it.

Three architectural decisions shape the work:

1. **One mode definition, consumed everywhere.** Today the mode union is
   declared independently in the control-plane types, the state parser, and
   the CLI scaffold, and mode-to-skill routing is hand-maintained in both the
   recommender and the dashboard generator. Lite is added to all of them, and
   the scaffold's local type is replaced by an import of the control-plane
   one so the union has a single declaration. The two routing tables stay
   separate (deduplicating them is out of scope) but each gains lite rows.
2. **A dedicated lite plan template, standard plan grammar.** The scaffold
   gains a source-to-destination mapping so `plan-lite.md` lands as
   `plan.md`. The template keeps every plan-writing invariant (task IDs,
   review table, required sections) and adds the spec sections above the task
   list. Parsers ignore unknown sections, so implement, validate-plan, and
   progress need no parser changes.
3. **Promotion as a CLI command driven by the skill.**
   `oat project promote <path> --to quick` does the mechanics: writes
   `discovery.md` from the lite plan's spec sections, preserves the lite plan
   under `references/`, flips the mode, and commits by scope. The lite skill
   calls it when the interview reveals oversized scope, and the existing
   quick-to-spec-driven skill remains a separate hop.

The new `oat-project-lite` skill owns the human flow: git preflight, batched
critical interview, plan authoring, one approval gate, ceiling resolution,
then handoff to implement, which already accepts a single-phase plan without
discovery or design files. Import-plan gains an offer to run single-phase
imported plans as lite projects, preserving import provenance.

## Architecture

### System Context

Lite sits between "no project" and quick in the mode ladder. Every
touchpoint is an existing surface gaining a lite branch. No new subsystem is
introduced. The one genuinely new runtime piece is the promote command;
everything else is enum values, table rows, a template, a skill, and docs.

**Key Components:**

- **Mode definition and parsing:** the control-plane `WorkflowMode` union
  gains `lite`; the parser's enum list becomes the single runtime source; the
  scaffold imports the control-plane type; `--mode` choices derive from the
  exported list.
- **Scaffold:** per-mode template map and state seed gain lite entries;
  template entries become source/target pairs so `plan-lite.md` lands as
  `plan.md`.
- **Routing:** recommender gains `LITE_ROUTES`; dashboard route map gains
  `lite:plan:*` rows.
- **Promote command:** `oat project promote <path> --to quick`.
- **Lite entry skill:** `oat-project-lite`, registered in the workflows pack.
- **Import-to-lite offer:** `oat-project-import-plan` offers lite for
  single-phase plans.
- **Mode-aware prose:** implement payload, plan-writing table, review-provide,
  pr-final, spec-driven planner stop branch, progress, next, brainstorm
  fold-back, template enum comments.
- **Docs and triage:** AGENTS.md triage plus five docs pages.

### Component Diagram

```
                    ┌──────────────────────────────┐
                    │ control-plane                │
                    │  WORKFLOW_MODES (+lite)      │
                    │  WorkflowMode = typeof[...]  │
                    └──────┬───────────────┬───────┘
                           │               │
              ┌────────────▼───┐    ┌──────▼─────────────┐
              │ state/parser   │    │ recommender/router │
              │ normalizeEnum  │    │ LITE_ROUTES        │
              └────────────────┘    └────────────────────┘
                           │
        ┌──────────────────┼──────────────────────┐
        │                  │                       │
┌───────▼────────┐ ┌───────▼─────────┐  ┌─────────▼──────────┐
│ project/new    │ │ state/generate  │  │ project/promote    │
│ scaffold.ts    │ │ lite:plan:* map │  │ lite → quick       │
│ TEMPLATES_BY_  │ └─────────────────┘  │ discovery.md write │
│ MODE (+lite,   │                      │ references/ move   │
│ src→target)    │                      └─────────▲──────────┘
└───────┬────────┘                                │
        │ copies                                  │ calls
┌───────▼────────────┐             ┌──────────────┴─────────┐
│ .oat/templates/    │             │ .agents/skills/        │
│  plan-lite.md      │◄── authors ─┤  oat-project-lite      │
│  state.md          │             │  oat-project-import-   │
│  implementation.md │             │   plan (lite offer)    │
└────────────────────┘             └────────────────────────┘
```

### Data Flow

Happy path:

```
oat project new <slug> --mode lite
  → scaffold copies state.md, plan-lite.md→plan.md, implementation.md
  → state: mode=lite, phase=plan, in_progress
oat-project-lite
  → git preflight
  → batched interview (1 round, +1 conditional)
  → writes plan.md spec sections + single-phase task list
  → approval gate (one pause)
  → dispatch ceiling resolved into state.md
  → plan artifact review loop (existing shared contract)
  → plan: complete, ready_for implement; state: phase=plan complete
oat-project-implement
  → single phase, no phase-gate prompt
  → per-task commits, final review at ceiling
oat-project-pr-final
  → lite proceeds without spec/design, reduced-assurance note
```

Escalation path:

```
oat-project-lite interview → scope too large
  → oat project promote <path> --to quick
  → discovery.md written from plan spec sections
  → plan.md → references/lite-plan.md, fresh quick plan.md scaffolded
  → state: mode=quick, phase=discovery, complete
  → user runs oat-project-quick-start
```

Import path:

```
oat-project-import-plan → normalized plan has one phase, no parallel groups
  → offer "run as lite" (recommended)
  → accept: mode=lite, origin=imported, oat_import_* preserved
  → plan.md reshaped into lite template; spec sections lifted from
    external prose or marked as assumptions
  → lite routing from here on
```

## Component Design

### 1. Mode definition

**Purpose:** one declaration of the mode set.

**Responsibilities:**

- `WorkflowMode` gains `'lite'`.
- The parser's `WORKFLOW_MODES` list is exported and becomes the single
  runtime source.
- The scaffold's local `ProjectScaffoldMode` is replaced by the control-plane
  type.
- The `--mode` option builds its choices from the exported list.

**Interfaces:**

```typescript
export const WORKFLOW_MODES = [
  'spec-driven',
  'quick',
  'import',
  'lite',
] as const;
export type WorkflowMode = (typeof WORKFLOW_MODES)[number];
```

**Design Decisions:**

- Derive the type from the array rather than the reverse, so adding a mode is
  one edit and every `Record<WorkflowMode, ...>` table fails to compile until
  it has a lite entry. That compile error is the exhaustiveness check the
  codebase lacks today.

### 2. Scaffold

**Purpose:** create a lite project directory.

**Responsibilities:**

- Lite entry in the template map and the state seed map.
- Template entries become `{ source, target }` pairs; existing bare-string
  entries stay valid via a normalizer so spec-driven, quick, and import
  scaffolds are byte-identical to today.
- Lite state seed: phase `plan`, status `in_progress`, HiLL checkpoints `[]`,
  artifacts list naming plan and implementation only, next milestone "run
  oat-project-lite".

**Design Decisions:**

- No `references/` directory at scaffold time. The promote command creates it
  when needed.

### 3. Lite plan template

**Purpose:** the single authored artifact.

**Responsibilities:**

- Sections in order: title, goal line, `## Summary`, `## Decisions`,
  `## Assumptions`, `## Out of Scope`, `## Validation Criteria`,
  `## Parallelism` (one sentence: single phase, sequential), `## Phase 1`,
  tasks, `## Reviews`, `## Implementation Complete`, `## References`.
- Frontmatter: `oat_plan_source: lite`, `oat_plan_parallel_groups: []`,
  import fields null. The plan-writing enum for `oat_plan_source` gains
  `lite`.
- Reviews table keeps the `spec` and `design` rows for invariant
  compatibility. Lite adopts quick's carve-out: those rows are never required
  to pass.
- Lives at `.oat/templates/plan-lite.md` and is mirrored into the CLI assets.

**Design Decisions:**

- Validation criteria are first-class in the template because for small work
  they are most of the plan. Each criterion names its check command.

### 4. Routing

**Purpose:** progress, next, open, and the dashboard know what to run next.

**Responsibilities:**

- `LITE_ROUTES`: plan in-progress early tier to `oat-project-lite`, plan
  in-progress late tier and plan complete to `oat-project-implement`,
  implement to `oat-project-implement`. `getWorkflowRoutes` gains the case.
- Dashboard route map: `lite:plan:in_progress` to `oat-project-lite`,
  `lite:plan:complete` to `oat-project-implement`.

**Design Decisions:**

- Leave the two tables duplicated. Merging them is a separate refactor and
  would widen this diff into unrelated modes.

### 5. Promote command

**Purpose:** mechanical lite-to-quick escalation.

**Interfaces:**

```
oat project promote <project-path> --to quick [--json]
```

**Responsibilities:**

1. Read and validate `state.md` mode is `lite` (origin may be native or
   imported).
2. Parse the lite plan's Summary, Decisions, Assumptions, Out of Scope,
   Validation Criteria.
3. Render `discovery.md` from the discovery template: Initial Request from
   Summary, Key Decisions from Decisions, Assumptions, Out of Scope, Success
   Criteria from Validation Criteria.
4. Move `plan.md` to `references/lite-plan.md`.
5. Scaffold a fresh quick `plan.md`.
6. Set `state.md` mode `quick`, phase `discovery`, status `complete`, ready
   for quick-start, and stamp `oat_project_state_updated`.
7. Commit by scope with the fail-closed resolver, or push for synced projects.

**Design Decisions:**

- Only `lite` to `quick` is accepted in this project. Other pairs error with
  a pointer to the spec-driven promotion skill.
- Refuses if `references/lite-plan.md` already exists or the mode is not
  lite. Runs no git operations before every file write has succeeded.
- A CLI command because every step is mechanical and the skill-level
  spec-driven promotion has shown that prose mechanics drift.

### 6. Lite entry skill

**Purpose:** the human flow from intent to a runnable single-phase plan.

**Responsibilities:**

- `.agents/skills/oat-project-lite/SKILL.md`, version 1.0.0, registered in
  the workflows pack manifest.
- Steps: git preflight by reference to quick-start's contract; resolve active
  project or scaffold with `--mode lite`; read repo knowledge; batched
  critical interview, one round plus one conditional round, "just proceed"
  records careful assumptions; escalation check, calling promote if the task
  list will not fit one sitting or a design decision is unresolvable; author
  `plan.md`; single approval gate; dispatch ceiling resolution by reference
  to the shared contract, no phase-gate setup; plan artifact review loop by
  reference; mark complete and commit; hand off to implement.
- Blocked: no design or spec authoring, no multi-phase plans, no
  implementation code.

### 7. Mode-aware prose updates

One line or branch each:

- Implement phase payload `workflow_mode` enum.
- Plan-writing mode table row (lite: `plan.md` only, no design gate) and
  `oat_plan_source` enum.
- Review-provide plan case (lite: `plan.md` only).
- Pr-final (lite proceeds with reduced-assurance note).
- Spec-driven planner stop branch (lite: "run oat-project-lite").
- Discover skill mode router (lite: continue with `oat-project-lite` or
  `oat-project-progress`).
- Progress and next routing tables.
- Brainstorm fold-back (lite with no PR: `oat-project-lite`; open PR:
  `oat-project-revise`).
- Promote-spec-driven eligibility stays quick or import, so lite reaches
  spec-driven via quick.
- State and plan template enum comments.

### 8. Hardening

- The split detector's blind append to `discovery.md` gains an existence
  check so it never conjures a discovery file for import or lite projects.

### 9. Docs and triage

- AGENTS.md triage gains a "Lite workflow" option and heuristic line.
- Workflows index, lifecycle lanes with a lite lane diagram, artifacts table,
  PR flow, and directory-structure page each gain a lite entry.

### 10. Import-to-lite offer

**Purpose:** let single-phase external plans run under lite.

**Responsibilities:**

- After normalization, `oat-project-import-plan` checks the plan shape. If it
  has exactly one phase and no declared parallel groups, it offers "run as
  lite" with a recommendation. Multi-phase plans keep import mode.
- Accepting sets `oat_workflow_mode: lite`, keeps `oat_workflow_origin:
imported` and the `oat_import_*` fields, and reshapes `plan.md` into the
  lite template: Summary, Decisions, Assumptions, and Out of Scope are lifted
  from the external plan's prose where present, otherwise marked as
  assumptions. Validation Criteria are derived from the tasks' verification
  steps.
- From that point the project is a lite project: lite routing, lite review
  carve-out, single-phase implement, lite-to-quick promotion available.

**Design Decisions:**

- Offer rather than force, because a single-phase external plan can still be
  multi-session work the author chose not to split.

## Data Models

### Project state (lite)

```yaml
oat_workflow_mode: lite # spec-driven | quick | import | lite
oat_workflow_origin: native # native | imported (imported when routed from import-plan)
oat_phase: plan # lite starts at plan; never discovery/spec/design
oat_hill_checkpoints: []
```

### Lite plan frontmatter

```yaml
oat_plan_source: lite # spec-driven | quick | imported | lite
oat_plan_parallel_groups: []
oat_import_reference: null # set when routed from import-plan
```

### Promote transitions

| Before                                   | After                                              |
| ---------------------------------------- | -------------------------------------------------- |
| mode `lite`, phase `plan`                | mode `quick`, phase `discovery`, status `complete` |
| `plan.md` (lite shape)                   | `references/lite-plan.md` + fresh quick `plan.md`  |
| no `discovery.md`                        | `discovery.md` rendered from lite spec sections    |
| `oat_workflow_origin` native or imported | unchanged                                          |

## Error Handling

- **Unknown mode value in state.md:** parser normalizes to null and callers
  default to spec-driven, as today. Lite is added to the list so it is never
  unknown; no new error path.
- **Promote refusals:** mode is not lite; `references/lite-plan.md` already
  exists; scope resolution fails; `--to` is anything other than `quick`. Each
  refusal exits non-zero with a categorical message and mutates no file. With
  `--json`, the refusal reason is a stable `status` string.
- **Promote partial failure:** file writes happen before any git operation.
  If a write fails midway, the command reports which files were written and
  leaves the tree for the user; it never commits a half-promoted project.
- **Import-to-lite reshape with missing prose:** sections that cannot be
  lifted from the external plan are written as explicit assumptions rather
  than left as placeholders, so the lite plan is never approved with template
  text in it.

## Testing Strategy

Three levels, all inside the existing vitest suites. No new test
infrastructure.

### Unit Tests

- **Scope:** control-plane parser and router; CLI scaffold, dashboard
  generator, promote command, split detector.
- **Key Test Cases:**
  - `lite` parses; an unknown value still normalizes to null.
  - Recommender covers every lite phase-and-tier key; dashboard generator
    covers `lite:plan:in_progress` and `lite:plan:complete` including the
    mode cell.
  - Scaffold per-mode artifact list gains lite (no discovery); placeholder
    render test iterates lite; `plan.md` provably came from `plan-lite.md`;
    the three existing modes' outputs are unchanged.
  - Help snapshot regenerated once for the new choice and reviewed by eye.
  - Promote: sections land in the correct discovery fields;
    `references/lite-plan.md` matches the original; state flips; refuses on
    non-lite mode, existing `references/lite-plan.md`, and scope failure with
    no file mutated.
  - Split detector creates no `discovery.md` for a project that lacks one.

### Integration Tests

- **Scope:** `commands.integration.test.ts` with isolated HOME.
- **Key Test Cases:**
  - `oat project new x --mode lite`, `oat state refresh`, dashboard shows
    lite and routes to `oat-project-lite`.
  - Scaffold lite, author a plan, `oat project promote x --to quick`, quick
    expectations hold and the dashboard routes to quick-start.
  - Bundle-tier tests inject an isolated HOME so user-scope templates cannot
    leak in.

### Skill Contract Tests

- Progress and next mode-section slicing is rewritten to locate all four mode
  markers by position, then asserts lite routing text.
- Review-provide and pr-final assert that lite proceeds without spec or
  design and carries the reduced-assurance note.
- The new skill passes `pnpm oat:validate-skills` and the skill-bump gate;
  the pack-manifest test sees it in the workflows pack.
- Import-plan's lite-offer text and the origin-preserving state write are
  asserted.

### Negative Controls

- Each promote refusal case is a preserved fixture with its expected
  categorical outcome.
- For the split-detector fix, the pre-fix behavior (stray discovery file
  created) is captured as a failing test before the guard lands.

### Manual Verification

- One real lite run in this repository from `--mode lite` through
  `oat-project-implement` on a trivial change, with the transcript noted in
  `implementation.md`. A green suite proves the code matches its fixtures,
  not that the workflow is pleasant to use.

## Open Questions

- **Template mirror (resolved by plan review):** the CLI bundle is an explicit
  inventory, not a directory copy. `plan-lite.md` must be listed in
  `packages/cli/scripts/bundle-inputs.mjs` and the pack-manifest template
  list, and `oat-project-lite` in the bundle skills list; the
  bundle-consistency tests enforce both. Captured in plan tasks p01-t02 and
  p04-t01.
- **Recommender tier semantics (resolved):** tier 3 is template or empty,
  tier 2 is in-progress with content, tier 1 is complete. Lite routes use
  tier 3 for the entry skill and tier 2 or 1 for implement.

## References

- Discovery: `discovery.md`
- Backlog: `BL-260904-make-quick-the-default-oat` (companion rename, out of
  scope here)
