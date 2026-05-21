---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-18
oat_generated: false
oat_template: false
---

# Design: oat-project-split

## Overview

`oat-project-split` is a new, standalone OAT skill that turns a single discovery or
brainstorm into N coordinated child projects when scope reveals itself to be a
decomposition rather than one feature. It owns the full split mechanics —
detecting or accepting the decomposition signal, writing a coordination parent
record, scaffolding the child projects, distilling parent context into each
child's seeded `discovery.md`, and selecting the initial active child by
dependency/value order while parking siblings. Two existing skills,
`oat-project-discover` and `oat-brainstorm`, get thin integration hooks that
detect or accept the signal and delegate; they never duplicate the split logic.

The central architectural move is that **the parent is a pure coordination
artifact and is never an executable project**. It lives as a project directory
under `.oat/projects/<scope>/` carrying `oat_kind: coordination` in its
`state.md`, holds the broad discovery + an integration sketch + the child
registry, and has no `spec` / `design` / `plan` / `implementation` files.
Children are flat siblings to the parent (never nested), linked back to it via
`state.md` frontmatter (`oat_parent` / `oat_siblings` / `oat_depends_on`). When
the split completes, the parent is **marked terminal in place — never
relocated** — and project listings filter/dim it by status. This deletes
`bl-3a4a`'s entire Archive Recovery section: no `shared → archived → S3`
resolution machinery exists or is needed.

Three trigger surfaces feed the skill: **declared** (the user states
multi-project intent up front; detection is skipped and umbrella framing runs
from turn 1), **detected mid-stream** (a silent codified signal self-check
inside `oat-project-discover`, backed by a shared CLI-accessible evaluator —
threshold ≥2 of four signals, with two load-bearing), and **detected at
convergence** (an always-visible scope-check confirmation at end-of-discovery,
plus a conditional split option in the `oat-brainstorm` destination picker when
accumulated scope is large).
Non-interactive behavior is asymmetric: a declared run proceeds; a detected
split with no user present records the detection and fails fast — never
silently deciding either way.

## Architecture

### System Context

`oat-project-split` is a peer skill in OAT's `oat-project-*` family. It
introduces no new storage, services, or external dependencies. It reads from
and writes to the standard OAT project tree at `.oat/projects/<scope>/`, and it
depends on existing scaffolding (`oat project new`) and dashboard refresh
(`oat state refresh`). Two existing skills become integration points —
`oat-project-discover` and `oat-brainstorm` — each gaining a small
detection-or-handoff hook that delegates to this skill rather than duplicating
its logic.

**Key Components:**

- **`oat-project-split` skill** — the standalone skill; owns split mechanics
  end-to-end.
- **Codified-signal evaluator** — small pure-logic module plus CLI adapter
  (`oat project split evaluate-signals`) that scores four signals
  (independently shippable deliverables, no shared design surface,
  separate-PRs expectation, distinct subsystems) against a threshold (≥2, with
  signals 1+2 load-bearing). The discover/brainstorm hooks invoke this shared
  evaluator; they own prompt timing and never duplicate threshold logic.
- **Coordination parent writer** — internal step of the split skill; produces
  the `oat_kind: coordination` parent record with broad discovery,
  integration-sketch section, child registry in `state.md` frontmatter, and the
  durable `references/split-plan.json` resume source.
- **Child scaffolder + seeder** — internal step of the split skill; calls
  `oat project new` per child and seeds each `discovery.md` with the
  7 distilled sections plus parent/sibling backlinks.
- **Listings filter** — small change in `oat project list` (and repo
  dashboard generation) to hide `oat_kind: coordination` projects in the
  `decomposition + complete` state from default views.
- **Integration hooks** — new steps in `oat-project-discover` (mid-stream
  detection + always-visible end-of-discovery scope-check) and `oat-brainstorm`
  (declared-mode handoff + conditional picker option). Hooks delegate to the
  split skill; they never duplicate its logic.

### Component Diagram

```
   ┌──────────────────────┐   ┌──────────────────────┐
   │  oat-project-discover│   │   oat-brainstorm     │
   │  (entry path)        │   │   (entry path)       │
   └──────────┬───────────┘   └──────────┬───────────┘
              │ signal threshold +        │ declared mode +
              │ end-of-discovery confirm  │ conditional picker
              └────────────┬──────────────┘
                           ▼
                ┌──────────────────────┐
                │  oat-project-split   │
                │  (standalone skill)  │
                └──────────┬───────────┘
                           │ owns split mechanics
        ┌──────────────────┼───────────────────┐
        ▼                  ▼                   ▼
  ┌───────────┐   ┌────────────────┐  ┌─────────────────┐
  │ Coord     │   │ Child          │  │ oat project list│
  │ parent    │   │ scaffolder +   │  │ filter (kind =  │
  │ writer    │   │ seeder         │  │ coordination)   │
  └─────┬─────┘   └────────┬───────┘  └─────────────────┘
        ▼                  ▼
.oat/projects/<scope>/<parent>/   .oat/projects/<scope>/<child-N>/
  oat_kind: coordination            normal project
  no spec/design/plan/impl          seeded discovery.md (7 sections)
  integration-sketch section        parent/siblings/depends-on in state.md
  child registry in state.md
```

### Data Flow

1. **Trigger** fires (declared / mid-stream signal threshold crossed /
   end-of-discovery confirmation / brainstorm-picker option).
2. **Confirmation gate** — Interactive: a _detected_ split shows a confirmation
   prompt; a _declared_ intent counts as its own confirmation, so no extra
   prompt fires. Non-interactive: a declared run proceeds; a detected split
   records the detection in the active discovery and fails fast — never
   silently splits, never silently proceeds as one project.
3. **Optional broad discovery** — single user choice: split with the context
   we have, or run one round of broad cross-cutting discovery first. The skill
   proceeds once the choice is made.
4. **Payload normalization** — the split skill resolves the child list (from
   declared input, prior discovery, or the cross-cutting round), then writes a
   `SplitPlanDocument` containing trigger metadata (`origin`, `interactive`)
   plus the normalized `ChildPlan`.
5. **Coordination parent write** — scaffold the parent project, then normalize
   it as coordination-only: set `oat_kind: coordination` in `state.md`, ensure
   `spec` / `design` / `plan` / `implementation` files are absent, populate
   `discovery.md` with the broad context plus an integration-sketch section,
   write the child registry to `state.md` frontmatter, and persist the
   `SplitPlanDocument` at `references/split-plan.json` before any child writes.
6. **Children scaffold + seed** — for each child: `oat project new <child>`,
   write seeded `discovery.md` (7 distilled sections), set
   `oat_parent` / `oat_siblings` / `oat_depends_on` in `state.md`.
7. **Parent completion (in place)** — set parent
   `oat_phase: decomposition` and `oat_phase_status: complete`. The parent is
   never relocated; it remains at `.oat/projects/<scope>/<parent>/` for the
   lifetime of the repo.
8. **Activation** — choose initial active child by dependency/value order
   (foundation child first if present); set `activeProject` to the
   repo-relative child project path; siblings remain parked.
9. **Dashboard refresh** — `oat state refresh`.

## Component Design

### Component 1: `oat-project-split` skill

**Purpose:** Decompose a single discovery/brainstorm into N coordinated child
projects with a coordination-only parent.

**Responsibilities:**

- Accept a trigger payload from one of four origins.
- Run the optional broad-discovery round if the user requests it.
- **Normalize all inputs to a single `SplitPlanDocument` before any filesystem
  write.** Three sources funnel in — _declared children_ (provided by the user),
  _inferred children_ (worked out interactively after a detection trigger),
  and _post-broad-discovery children_ (when the optional cross-cutting round
  ran). Normalization distills inherited context per child, applies the
  ordering rules, marks the foundation child if present, and resolves the
  initial active child while preserving trigger metadata needed for
  non-interactive behavior. **Writes never happen against raw input — only
  against the normalized document.**
- Scaffold the parent and normalize it as coordination-only.
- Scaffold and seed each child with the 7-section distilled `discovery.md` +
  backlinks.
- Set parent terminal (`oat_phase: decomposition`,
  `oat_phase_status: complete`) in place.
- Select the initial active child by dependency/value order; park siblings.
- Refresh the repo dashboard.

**Interfaces (conceptual):**

```typescript
interface SplitPayload {
  origin:
    | 'declared' //              user declared multi-project intent up front
    | 'detected-mid-stream' //   discover signal threshold crossed
    | 'detected-convergence' //  end-of-discovery confirmation
    | 'brainstorm-picker'; //    chosen from brainstorm destination picker
  parentSlug?: string;
  declaredChildren?: Array<{ slug: string; description?: string }>;
  priorDiscovery?: { path: string; brainstormSessionId?: string };
  interactive: boolean; // false → declared proceeds, detected fails fast
}

// All four origins funnel into the same downstream plan.
interface ChildPlan {
  parentSlug: string;
  children: Array<{
    slug: string; //              canonical id (kebab-case; also the directory name)
    description?: string;
    inheritedContext: string; //  distilled from parent context for this child
    knownDependencies: string[]; // sibling slugs this child depends on
    order: number; //             1-indexed sequencing
  }>;
  foundationChild?: string; //    slug; absent when no foundation child exists
  integrationSketch?: string; //  optional; lives as a section in parent discovery.md
  initialActiveChild: string; //  slug
}

interface SplitPlanDocument {
  origin: SplitPayload['origin'];
  interactive: boolean;
  plan: ChildPlan;
}
```

**Dependencies:** `oat project new`, `oat state refresh`,
`oat config set activeProject` (all existing internal CLIs).

**Design Decisions:**

- A single `SplitPayload` shape for all four origins keeps the skill's flow
  uniform; entry-point-specific quirks live in the caller's hook.
- **Not additive after successful completion.** Once a parent reaches
  `oat_phase: decomposition` + `oat_phase_status: complete`, re-invocation on
  it is an error — splits don't grow by re-running the skill.
  **Resume/retry is supported** when a prior split failed partway: the skill
  detects an incomplete prior run (parent created but not yet at the terminal
  state, or children incompletely scaffolded) and offers to resume from the
  failure point rather than re-running from scratch.
- **One write-time document, many input shapes.** `SplitPlanDocument` is the
  single source of truth for what gets written; `ChildPlan` remains the
  normalized child graph inside it, while `origin` and `interactive` remain
  available to command handlers that must enforce non-interactive behavior.
  This prevents partial/inconsistent writes when input shapes evolve and gives
  the skill a single checkpoint for validation before any project directory is
  touched.

### Component 2: Detection hook in `oat-project-discover`

**Purpose:** Detect multi-project scope inside ordinary discovery and hand off
to the split skill.

**Responsibilities:**

- **Mid-stream:** silently evaluate the four codified signals every user turn
  during solution-space exploration. **Threshold semantics:** any 2 or more
  signals firing triggers detection. When _both_ load-bearing signals — signal
  1 (_independently shippable deliverables_) and signal 2 (_no shared design
  surface_) — fire together, the recommendation is **high-confidence** and the
  prompt to the user is direct. When the threshold is met by any other
  combination, the recommendation is **soft** and the prompt is more
  tentative. Below 2, no prompt fires.
- **End-of-discovery:** always show a visible scope-check confirmation before
  discovery is marked complete — _"This reads as one cohesive project —
  proceed, or split into multiple?"_ The signal evaluation pre-fills the
  recommendation.
- On user confirmation → build a `SplitPayload` (`detected-mid-stream` or
  `detected-convergence`) and invoke `oat-project-split`.
- Non-interactive: never silently decide. Record the detection in
  `discovery.md` and fail fast.

**Interfaces (conceptual):**

```typescript
type Signal =
  | 'independently-shippable' //   load-bearing
  | 'no-shared-design-surface' //  load-bearing
  | 'expect-separate-prs'
  | 'distinct-subsystems';

interface SignalEvaluation {
  fired: Signal[];
  triggered: boolean; //                    fired.length >= 2
  confidence: 'high' | 'soft' | 'below'; // high  → both load-bearing fired
  //                                        soft  → triggered without both load-bearing
  //                                        below → fired.length < 2
}
```

**Dependencies:** `oat-project-split` skill (delegation target) and
`oat project split evaluate-signals` (shared evaluator adapter).

**Design Decisions:**

- Silent mid-stream + always-visible convergence pairs zero-friction detection
  with a non-skippable backstop for false negatives.
- Signal evaluation is shared pure logic with a thin CLI adapter. The hook
  still owns when to prompt and how to word the prompt; the adapter only
  prevents threshold drift across discover and brainstorm entry paths.

### Component 3: Brainstorm integration in `oat-brainstorm`

**Purpose:** Provide two entry paths from brainstorming into the split skill.

**Responsibilities:**

- **Declared path:** on multi-project declaration at brainstorm start, skip
  detection, run umbrella framing from turn 1, ask the boundary question
  (_"do you already know the children, or should we decompose together?"_),
  gather child list + shared context, then invoke `oat-project-split` with
  `origin: "declared"`.
- **Picker path:** at convergence, when accumulated scope is large (codified
  check), surface "Promote to N projects" as an option in the destination
  picker alongside "Promote to new OAT project." Selecting it builds a
  `SplitPayload` (`origin: "brainstorm-picker"`) and invokes the split skill.

**Interfaces:** SKILL.md additions — new destination case in handoff Step 9
(alongside 9a–9j) and new activation behavior when declared intent is detected
at brainstorm entry.

**Dependencies:** `oat-project-split` skill.

**Design Decisions:**

- Declared is a first-class mode (not a hidden flag) — the user's intent is
  materially different from "explore one thing" brainstorming.
- The picker option is conditional on scope; an obvious single-project
  brainstorm does not see it.

### Component 4: Project listings filter

**Purpose:** Keep `oat_kind: coordination` parents from cluttering
active-project views once they reach `oat_phase: decomposition` +
`oat_phase_status: complete`.

**Responsibilities:**

- **Default:** `oat project list` **hides** coordination parents in the
  terminal state — they do not appear in default output.
- **Dashboard:** `oat state refresh` **will** render a separate
  `## Decompositions` section listing coordination parents in the terminal
  state — distinct from the Active projects section.
- **Opt-in:** `oat project list --include-coordination` reveals them in list
  output for explicit lookup.

**Interfaces:** Internal changes to `oat project list` argument parsing +
render logic and to the dashboard generator's section grouping.

**Dependencies:** None new; reads existing `state.md` frontmatter.

**Design Decisions:**

- Filtering by **status + kind**, not by location, is what allows the parent
  to stay in `shared/` permanently without polluting active views.
- Coordination parents stay queryable (just not in the default list) —
  preserving discoverability for archive-recovery-style needs without building
  a recovery subsystem.

## Data Models

Four new/modified data shapes land on disk; `ChildPlan` and `SplitPayload`
remain conceptual inputs/outputs in Component Design above, while the
persisted `SplitPlanDocument` is the durable resume source.

### Model 1: Coordination parent `state.md` frontmatter

**Purpose:** Distinguish a coordination-only parent from a normal
implementation project, and carry the child registry.

**Schema (additions/modifications; all other `oat_*` fields unchanged):**

```typescript
interface CoordinationParentStateAdditions {
  oat_kind: 'coordination'; //                     new field; "implementation" is the default
  oat_phase: 'discovery' | 'decomposition'; //                          new phase value (parent-only)
  oat_phase_status: 'in_progress' | 'complete'; // terminal = decomposition + complete
  oat_children: string[]; //                       child slugs, in dependency/value order
  oat_workflow_mode: 'quick'; //                   coordination parents are always quick mode
}
```

**Validation Rules:**

- Terminal state is `oat_phase == "decomposition" && oat_phase_status == "complete"`.
- The `decomposition` phase value is valid ONLY when `oat_kind == "coordination"`.
- `oat_children` MUST be non-empty whenever `oat_phase == "decomposition"`
  (whether in_progress or complete).
- A `coordination`-kind project MUST NOT contain `spec.md`, `design.md`,
  `plan.md`, or `implementation.md`.

**Storage:**

- **Location:** `.oat/projects/<scope>/<parent-slug>/state.md` (YAML
  frontmatter).
- **Persistence:** Updated by `oat-project-split` at parent creation, again
  after all children are scaffolded (status → `complete`), and thereafter by
  ambient metadata maintenance (timestamps, dashboard refresh). **Normal
  lifecycle skills MUST NOT advance coordination parents into `spec` / `design`
  / `plan` / `implement` phases** — only the `discovery` → `decomposition`
  transition is permitted on a coordination parent.

### Model 2: Child project `state.md` frontmatter additions

**Purpose:** Link a child back to its parent and capture sibling dependencies.
Only present on children produced by a split.

**Schema (additions; other `oat_*` fields are the standard child-project
schema):**

```typescript
interface ChildProjectStateAdditions {
  oat_parent: string; //         slug of the coordination parent
  oat_siblings: string[]; //     slugs of co-children, excluding self
  oat_depends_on: string[]; //   slugs of sibling children this depends on (often [foundationChild])
}
```

**Validation Rules:**

- `oat_parent` MUST reference an existing project directory with
  `oat_kind == "coordination"`.
- `oat_siblings` MUST equal `parent.oat_children` minus self.
- Every slug in `oat_depends_on` MUST appear in `oat_siblings`.
- `oat_depends_on` across all children MUST form a DAG (no cycles).

**Storage:**

- **Location:** `.oat/projects/<scope>/<child-slug>/state.md` (YAML
  frontmatter).
- **Persistence:** Written once by `oat-project-split` at child creation.
  `oat_parent` is **strictly immutable** thereafter. `oat_siblings` and
  `oat_depends_on` are **immutable by default** but MAY be corrected through
  an explicit repair/reconcile command (or manual artifact edit) when the
  original split plan needs fixing — for example, when a sibling is renamed
  or a dependency was missed. V1 ships **no** automated repair/reconcile
  command; manual edits are the supported path.

### Model 3: Seeded child `discovery.md`

**Purpose:** Standardize the structure of distilled parent context that each
child receives at scaffold time, and make the partial/stale-prone nature
explicit.

**Schema (frontmatter additions + section layout):**

```typescript
// On each child's discovery.md frontmatter (in addition to standard fields)
interface ChildDiscoveryFrontmatterAdditions {
  oat_inherited_context_revalidated: boolean; // false at seed time; child sets true after revalidation
}

type SeededChildDiscoverySection =
  | 'Origin' //                       backlink + decomposition rationale referencing parent
  | 'Inherited Context' //            distilled slice of parent context relevant to this child
  | 'Child Scope' //                  what this child specifically delivers
  | 'Known Dependencies' //           sibling and external dependencies
  | 'Assumptions To Revalidate' //    assumptions inherited from parent that must be re-checked
  | 'Likely Workflow Mode' //         "quick" | "spec-driven" — best-guess hint; child can override
  | 'Sibling Projects'; //            pointers to co-children
```

**Validation Rules:**

- `oat_inherited_context_revalidated` MUST be `false` at seed time.
- All seven sections MUST be present at seed time, in the declared order.
- Child `discovery.md` cannot reach `oat_status: complete` while
  `oat_inherited_context_revalidated == false` — this is the
  mandatory-revalidation gate, codified as a frontmatter field rather than
  an implicit status correlation.
- `Inherited Context` MUST be a _distillation_ of parent `discovery.md`, not
  a wholesale copy.

**Storage:**

- **Location:** `.oat/projects/<scope>/<child-slug>/discovery.md`.
- **Persistence:** Written once by `oat-project-split` at child creation. The
  child is the owner thereafter — subsequent lifecycle skills may edit
  freely.

### Model 4: Persisted split plan document

**Purpose:** Preserve the exact normalized plan needed for write execution,
non-interactive origin handling, and resume after partial filesystem writes.

**Schema:**

```typescript
interface SplitPlanDocument {
  origin:
    | 'declared'
    | 'detected-mid-stream'
    | 'detected-convergence'
    | 'brainstorm-picker';
  interactive: boolean;
  plan: ChildPlan;
}
```

**Validation Rules:**

- `origin` and `interactive` MUST be present.
- `plan` MUST pass `ChildPlan` validation before any parent or child write.
- `interactive == false` with `origin` beginning `detected-` MUST fail before
  split writes and record `## Detected Split Recommendation` in the active
  discovery.

**Storage:**

- **Location:** `.oat/projects/<scope>/<parent-slug>/references/split-plan.json`.
- **Persistence:** Written before the first child scaffold. Resume reads this
  file as the durable source for child inherited context, dependencies, order,
  foundation child, and initial active child. If the file is missing or fails
  validation, resume aborts with a user-actionable error instead of guessing
  from `oat_children` alone.

## Error Handling

### Error Categories

**User Errors (input validation, surfaced before any write).** `ChildPlan`
validation is the single pre-write checkpoint; failures abort cleanly and
never leave partial state on disk.

- **Slug collision** — a declared or inferred child slug matches an existing
  project under `.oat/projects/<scope>/`, the parent slug, or another child
  slug. Surface the colliding slug(s); ask the user to rename. **No split
  writes.**
- **Invalid `oat_depends_on`** — a slug in `oat_depends_on` is not in the
  sibling set, or the cross-child graph contains a cycle. Surface the
  offending edge; ask the user to fix the plan. **No split writes.**
- **Foundation / active mismatch** — `foundationChild` or `initialActiveChild`
  references a slug not in `children`. **No split writes.**
- **Re-invocation on a completed parent** — the target parent already has
  `oat_phase: decomposition` and `oat_phase_status: complete`. Splits don't
  grow by re-running; surface the existing parent and its children; recommend
  creating a fresh parent if further decomposition is needed. **No split
  writes.**
- **Non-interactive detected split with no user.** Per the fail-fast rule:
  **no split writes** occur, but the detection is deliberately recorded in
  the active `discovery.md` (a `## Detected Split Recommendation` section
  listing the signals that fired and the recommended children if inferrable),
  and the skill exits with non-zero status. The record is the audit trail —
  without it, "fail fast" would be silent.

**System Errors (partial-state detection, recoverable).**

- **Partial split in progress** — parent exists (with `oat_kind: coordination`)
  but `oat_phase: decomposition` and `oat_phase_status: in_progress`, OR
  `oat_children` lists slugs that don't yet exist on disk. On re-invocation
  against this parent, the skill enters **resume mode** and reads
  `references/split-plan.json` as the durable reconstruction source (see Retry
  Logic).
- **Filesystem write failure** mid-write (disk full, permission denied,
  etc.). The skill halts at the failed write, leaves partial state in place,
  surfaces the OS error verbatim, and offers resume.
- **Dashboard refresh failure** (`oat state refresh` returns non-zero) —
  non-blocking. The split is considered successful if all artifact writes
  succeeded; the user is shown the refresh error and instructed to re-run
  `oat state refresh` manually.
- **Frontmatter parse error** on an existing parent or child encountered
  during resume — abort the resume; surface the file and parser error;
  require the user to fix the artifact before re-running.

**External Service Errors:** N/A. The skill has no external service
dependencies.

### Retry Logic

The skill does _not_ auto-retry individual operations — every failure halts
and surfaces to the user. **What the skill provides is idempotent resume**,
not retry:

- On invocation, the skill checks for a partial prior run against the target
  parent.
- If a partial state is detected, it reads `references/split-plan.json`, diffs
  the persisted `ChildPlan` against on-disk reality, identifies
  missing/incomplete children, and offers to continue from the failure point —
  but only after the user confirms the recovered plan matches their original
  intent.
- If the persisted split plan is missing or invalid, resume aborts. The skill
  never reconstructs child seed content from `oat_children` slugs alone.
- Resume is a deliberate choice; the user must approve the recovered plan
  before any further writes resume.
- The cross-child `oat_depends_on` manual-edit flow (per Data Models, Model 2
  persistence rules) is the fallback when a resume cannot auto-recover the
  plan.

### Logging

Logging follows the OAT skill convention (stdout/stderr captured by the
orchestrator).

- **Info:** trigger origin and confirmed payload; each major step (parent
  scaffolded, child N scaffolded, parent finalized as
  `decomposition + complete`, active child selected, dashboard refreshed).
  Includes the resolved `ChildPlan` summary for traceability.
- **Debug / verbose:** per-turn signal-evaluation results, emitted **only
  when the fired-signal set changes** from the previous turn (so the log
  doesn't fire once per discovery turn). Useful for tuning the threshold
  over time without polluting normal output.
- **Warn:** user declined a surfaced split offer (with the signals that
  fired at offer time); dependency reordering applied because
  `foundationChild` was set.
- **Error:** any User Error category above; any System Error including the
  recovered partial-state diff on resume; non-interactive detected-split
  fail-fast (with the recorded `discovery.md` section title for follow-up).

## Testing Strategy

(Quick mode skips the formal requirement-to-test mapping; key test levels
and scenarios only.)

### Unit Tests

**Scope:** Pure logic — no filesystem writes, no OAT CLI calls. Targets the
deterministic transformations the skill depends on.

**Coverage Target:** high coverage on the pure-logic modules (signal
evaluator, `ChildPlan` normalization, dependency graph validator). The repo
does not enforce per-module coverage; adding coverage gates is out of scope
for this project.

**Key Test Cases:**

- **Signal evaluator** — given synthetic discovery contexts, returns the
  expected `fired` set, `triggered` flag, and `confidence` level. Cases:
  zero signals → `below`; both load-bearing fired → `high`; threshold met
  without load-bearing → `soft`; edge cases at exactly threshold.
- **`ChildPlan` normalization** — the four `SplitPayload` origins (declared
  / detected-mid-stream / detected-convergence / brainstorm-picker), given
  equivalent input contexts, produce _equivalent_ `ChildPlan` outputs
  (slugs, ordering, distilled inherited context, `foundationChild`,
  `initialActiveChild`). Confirms the "one write-time plan, many input
  shapes" invariant.
- **DAG validation** — accepts valid `oat_depends_on` graphs; rejects direct
  cycles (A→A), transitive cycles (A→B→A), longer cycles; rejects edges to
  non-sibling slugs; treats empty graphs as valid.
- **Slug-collision detection** — given a candidate `ChildPlan` and a
  project-tree snapshot, identifies collisions across (a) parent vs existing
  projects, (b) children vs existing projects, (c) children vs each other,
  (d) any new slug vs the parent slug.
- **Foundation / active reference checks** — `foundationChild` and
  `initialActiveChild` MUST resolve to slugs in `children`; mismatches are
  flagged.

### Integration Tests

**Scope:** The skill running end-to-end against a temporary OAT-initialized
fixture repo (real filesystem, real CLI). Asserts artifact contents and
frontmatter against fixtures.

**Test Environment:** Each test sets up a clean `.oat/` directory (templates
copied, `oat config` initialized), runs the skill against synthetic
prior-discovery fixtures, and asserts the resulting project tree.

**Key Test Cases:**

- **Declared happy path** — declared `SplitPayload` with 3 children including
  a foundation child → produces 1 coordination parent (`oat_kind: coordination`,
  `oat_phase: decomposition`, `oat_phase_status: complete`, populated
  `oat_children`) + 3 child projects (each with `oat_parent`, `oat_siblings`,
  `oat_depends_on`, seeded discovery containing all 7 sections,
  `oat_inherited_context_revalidated: false`).
- **Coordination-parent file invariant** — after every successful split
  (across all four origins, and after resume), the parent project directory
  MUST NOT contain `spec.md`, `design.md`, `plan.md`, or `implementation.md`.
  This invariant is asserted in **every** integration test case that produces
  a coordination parent, since "no executable-phase files" is what
  `oat_kind: coordination` structurally means.
- **Detected mid-stream (skill-simulation / transcript fixture)** — the
  detection lives partly in skill prose (`oat-project-discover` evaluates
  signals turn-by-turn during solution-space exploration). The integration
  test simulates this by feeding a synthetic discover transcript through the
  signal evaluator plus a stubbed offer/confirm interaction, and asserts the
  resulting split delegation produces the same project tree as the declared
  path. End-to-end validation lives in the dogfood — detected path scenario,
  not in the automated integration suite.
- **Detected at convergence** — end-of-discovery confirmation always appears,
  with the recommendation pre-filled based on signal evaluation
  (high-confidence wording when both load-bearing signals fired; soft wording
  otherwise).
- **Brainstorm picker option** — brainstorm convergence with large
  accumulated scope → destination picker includes "Promote to N projects";
  selection delegates correctly to the split skill.
- **Resume mode** — fixture with parent created but only 2 of 3 children
  scaffolded → re-invocation enters resume, reconstructs `ChildPlan`,
  surfaces the missing child, completes it, finalizes the parent
  (`oat_phase_status: in_progress → complete`).
- **Non-interactive detected** — `OAT_NON_INTERACTIVE=1` with a discover
  session that triggers detection → no split writes;
  `## Detected Split Recommendation` section appended to active `discovery.md`;
  skill exits non-zero.
- **Re-invocation on completed parent** — already-complete parent → User
  Error; no writes; existing parent and children listed.
- **`oat project list` filtering** — coordination parent in
  `decomposition + complete` is absent from default `oat project list`;
  visible with `--include-coordination`; `oat state refresh` produces a
  `## Decompositions` section in the dashboard.
- **Post-manual-mutation validation** — a child whose `oat_depends_on` has
  been **manually** edited (e.g., to correct a missed dependency) continues
  to pass validation on subsequent skill operations and on resume runs. V1
  ships **no** automated repair/reconcile command; this case verifies that
  manual artifact correction remains a supported recovery path.

### End-to-End Tests

**Scope:** Manual dogfood runs against the actual project repo (or a clean
clone), exercising the skill through real provider invocations rather than
fixtures.

**Test Scenarios:**

- **Dogfood — declared path.** A real session opens with multi-project
  intent declared up front; runs the boundary question; produces a real
  coordination parent and N child projects in the working repo. Verifies the
  lived experience matches the design (umbrella framing fires, foundation
  child ordering happens, picker is not surfaced redundantly). Satisfies
  `bl-3a4a` AC.
- **Dogfood — detected path.** A real `oat-project-discover` session whose
  solution-space exploration accumulates ≥2 signals; verifies the mid-stream
  offer appears, the convergence confirmation appears regardless, and the
  final tree matches the integration-test outcome. Satisfies `bl-3a4a` AC.
- **Dogfood — resume.** Deliberately interrupt a split partway (abort during
  child seeding) and re-invoke the skill on the same parent; verify the
  resume path detects the partial state, surfaces the recovered `ChildPlan`,
  and completes cleanly without manual cleanup.

## Open Questions

- **`bl-3a4a` reconciliation.** Update the backlog item in place to reflect
  the settled design, or mark it superseded by this project. Either way,
  `bl-3a4a` cannot continue to claim "archive immediately" or describe the
  parent as a normal implementable project — those positions were reversed
  in the brainstorm.
- **Exact prompt wording.** The "discover more first?" knob at split time and
  the always-visible end-of-discovery confirmation both need final user-facing
  copy. Recommendation: pin during implementation as part of the split skill's
  SKILL.md.
- **Listings flag name.** `oat project list --include-coordination` is the
  working name; confirm during implementation that this is consistent with
  existing OAT CLI flag conventions.
- **Interaction with `oat-project-revise`.** Coordination parents are
  presumed not to interact with the revise flow (they have no plan/impl), but
  this should be explicitly handled — either by `oat-project-revise` rejecting
  `oat_kind: coordination` projects or by them being filtered out of the
  revise candidate set.

## References

- Discovery: `discovery.md`
- Backlog item being implemented: `.oat/repo/reference/backlog/items/sub-project-split-escape-hatch.md`
- Brainstorm session: 2026-05-17 / 2026-05-18 (decisions captured in
  `discovery.md`)
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
- Conventions: `.oat/repo/knowledge/conventions.md`
