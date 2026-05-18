---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-18
oat_generated: false
---

# Discovery: oat-project-split

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details. Concrete
artifact shapes named below (e.g. `state.md` frontmatter fields) are recorded as
_decisions_, not as a task list — the design phase fleshes them out.

## Initial Request

Refine and implement backlog item **`bl-3a4a` — "Codified sub-project split escape
hatch."** When a brainstorm or discovery surfaces that a request is really N
loosely-related sub-projects, OAT has no codified hand-off: the workflow either
crams everything into one project, or the user manually creates separate projects
and loses the shared context. This project adds a graceful split capability.

The design was settled in a brainstorming session (2026-05-17 / 2026-05-18) that
refined `bl-3a4a`'s original "settled product direction." Several of that item's
original decisions were **changed** during the brainstorm — notably the parent
lifecycle model and the archive-recovery approach (see Key Decisions).

User-facing naming uses **split**; internal docs may use _decomposition_ for the
parent/child model.

## Clarifying Questions

### Question 1: Where does the split capability live, and what invokes it?

**Q:** Inline steps in `oat-project-discover`, a standalone skill invoked only by
discover, or a standalone skill reachable from multiple entry points?
**A:** A standalone `oat-project-split` skill, reachable from both
`oat-project-discover` and `oat-brainstorm`.
**Decision:** The split mechanics are identical regardless of where the
multi-project realization happens, so the logic lives in one standalone,
independently testable skill. This matches the settled `split` naming and lets
`oat-brainstorm` reuse it instead of re-solving multi-project promotion later.

### Question 2: How is the split triggered?

**Q:** Pure agent judgment, a codified signal self-check, or always ask the user?
**A:** A codified signal self-check with a threshold gate, plus convergence
checkpoints — and a third, explicit path.
**Decision:** Three trigger surfaces (see Key Decisions #2). Detection uses a
codified signal list evaluated silently; the user is only prompted when signals
cross threshold or at a deliberate convergence checkpoint.

### Question 3: Are "split and park" and "brainstorm broadly, execute one" two modes?

**Q:** `bl-3a4a` describes Option A (split early, thin seeds) and Option B
(broad cross-cutting discovery, then split) as two operating modes. Ship both as
a user-selectable mode switch, or collapse them?
**A:** Collapse them.
**Decision:** By the time the split skill runs, parent discovery depth is already
fixed by _when_ the split fired. Early trigger → thin context (A-like); late
convergence trigger → rich context (B-like). The skill needs no A/B selector — it
adapts to the context depth it is handed. One knob remains at split time:
"split now, or do one round of broad cross-cutting discovery first?"

### Question 4: How is an explicit "I know this is multiple projects" handled?

**Q:** Is a user declaring multi-project intent up front just "skip detection," or
something more?
**A:** A first-class declared mode.
**Decision:** Declared mode skips detection entirely and runs _umbrella framing_
from turn 1 — the conversation organizes around mapping and bounding the
sub-projects. It asks the sharper boundary question: _"Do you already know the
child projects, or should we decompose the scope together?"_ Children-known → light
parent-level capture (shared context, dependencies, sequencing, integration risks)
→ split. Children-unknown → brainstorm the boundaries first → split.

### Question 5: What is the parent?

**Q:** Is the parent always a normal implementable OAT project?
**A:** No — the parent is always a _coordination artifact_, never an executable
project.
**Decision:** See Key Decisions #4 and Options Considered. This **overrides**
`bl-3a4a`'s original "treat the original project as a parent/umbrella project"
language, which implied a normal project.

### Question 6: When is the parent archived?

**Q:** Archive immediately (bl-3a4a as written), archive once all children
complete, or something else?
**A:** Never relocate it.
**Decision:** See Key Decisions #5. This **overrides** `bl-3a4a`'s "archive it
immediately" direction and **deletes** its entire Archive Recovery section.

## Solution Space

The headline architectural question was _how the split capability is realized_.

### Approach 1: Standalone `oat-project-split` skill, multiple entry points _(Recommended — Chosen)_

**Description:** A dedicated skill owns the split mechanics (detect/confirm, create
N child scaffolds, seed child discovery, write the coordination parent). Both
`oat-project-discover` and `oat-brainstorm` get a thin "detect → offer → delegate"
hook into it.
**When this is the right choice:** When the multi-project realization can happen in
more than one workflow context (it can — mid-discovery _and_ mid-brainstorm).
**Tradeoffs:** One extra integration point to maintain (a handoff branch in
`oat-brainstorm`) versus discover-only. Worth it: avoids duplicating the logic.

### Approach 2: Standalone skill, invoked only by `oat-project-discover`

**Description:** Same standalone skill, but only discover knows about it.
**When this is the right choice:** If brainstorm → multi-project were considered out
of scope.
**Tradeoffs:** Cheaper now, but re-opens the problem when brainstorm needs it.

### Approach 3: Inline steps inside `oat-project-discover`

**Description:** No new skill; discover gains split steps directly.
**When this is the right choice:** If split were believed to only ever happen
mid-discovery.
**Tradeoffs:** Bakes the logic into one skill, not reusable, contradicts the
settled `oat-project-split` user-facing naming.

### Chosen Direction

**Approach:** Approach 1 — standalone `oat-project-split` skill with two entry
points.
**Rationale:** Identical mechanics across entry points; testable in isolation;
matches settled naming; the user's own framing ("brainstorm _or_ discovery")
confirmed multi-project realization happens in two places.
**User validated:** Yes — explicit buy-in during the brainstorm.

## Options Considered

### Parent topology — Option A: Parent _is_ the baseline implementation project

**Description:** When one project is the baseline everything else builds on, that
project becomes the parent and also carries the umbrella role.

**Pros:**

- Matches an intuition that "the thing everything depends on" feels parent-like.

**Cons:**

- One node, two jobs — its PR covers only the baseline slice, yet it has no clean
  terminal state until the children ship. "Done" is ambiguous.
- Requires a conditional, muddied lifecycle.

**Chosen:** Neither (rejected).

### Parent topology — Option B: Parent is coordination-only; baseline is a foundation child

**Description:** The parent never carries code. Shared/baseline implementation
becomes "Child A," a foundation child the siblings depend on and the parent
sequences first.

**Pros:**

- Every node has exactly one job; the parent has one shape and one terminal state.
- Late-discovered shared work is just another child — no resurrecting a completed
  parent.
- Decomposing the candidate "shared work" examples (migration sequencing,
  integration architecture, shared package changes, test harness) showed each is
  either coordination/design work (lives in the parent artifact anyway) or genuine
  code (a child) — no residue needs an executable parent.

**Cons:**

- The dependency "baseline goes first" must be expressed via parent sequencing +
  child `depends-on`, not via filesystem hierarchy.

**Chosen:** B.

**Summary:** The parent is a pure coordination artifact and is never executable;
"baseline implementation" is modeled as a foundation child.

### Parent archival timing

- **Archive immediately** (bl-3a4a original) — forces a `shared → archived → S3`
  recovery subsystem so children can still read parent context.
- **Archive once all children complete** — forces a cross-child "all complete"
  detector; an abandoned / `wont_do` child means it never fires.
- **Mark in place, never move** _(Chosen)_ — parent stays put, marked
  `complete-by-decomposition`, filtered from active views by status/kind. No
  recovery subsystem, no completion detector.

## Key Decisions

1. **Skill shape:** A standalone `oat-project-split` skill, invoked by both
   `oat-project-discover` and `oat-brainstorm`.
2. **Three trigger surfaces:**
   - **Declared** — explicit user intent ("this is multiple projects"); skip
     detection; run umbrella framing; ask the known-children-vs-decompose question.
   - **Detected mid-stream** — a silent codified signal self-check; surface a split
     offer when ≥2 signals fire. Signals: (1) ≥2 independently shippable
     deliverables, (2) no shared design surface, (3) a reviewer would expect
     separate PRs, (4) distinct subsystems/packages/layers. Signals 1 and 2 are
     load-bearing.
   - **Detected at convergence** — an always-visible scope-check confirmation at
     end-of-discovery; a conditional split option in the `oat-brainstorm`
     destination picker when accumulated scope is large.
3. **No A/B modes:** one context-adaptive flow; trigger timing sets discovery
   depth; a single "discover more first?" knob at split time.
4. **Parent = coordination artifact, never executable:** the parent is a project
   _record_ — a project directory with `kind: coordination` and **no**
   `spec/design/plan/implementation` files. Shared implementation work is a
   **foundation child**, never parent-level work.
5. **Parent archival — mark, don't move:** the parent stays in
   `.oat/projects/<scope>/` permanently, marked `complete-by-decomposition`;
   project listings filter/dim coordination parents by status/kind. The
   `bl-3a4a` Archive Recovery section is deleted; no recovery subsystem and no
   cross-child completion detector are built.
6. **Flat layout:** parent and children are sibling directories, never nested
   (children must outlive the parent's completion). The parent/child graph lives
   in `state.md` frontmatter — `parent` / `siblings` / `children` / `depends-on`.
7. **File placement (fold in):** the child registry lives in the parent's
   `state.md` frontmatter; the integration sketch is a section of the parent's
   `discovery.md`. Dedicated files only if the sketch becomes substantial.
8. **Non-interactive mode:** a _declared_ run proceeds (the human decision is
   already baked in). A _detected_ split with no user present must **record the
   detection and fail fast** — never silently decompose, never silently proceed as
   one project.
9. **Child ordering:** dependency order first → foundation child first if present →
   otherwise highest user value / lowest dependency risk. Exactly one child becomes
   active by default; siblings are scaffolded but parked.
10. **Child seeding:** each child gets a `discovery.md` seeded (distilled, never
    wholesale-copied) with the 7 sections — Origin, Inherited Context, Child Scope,
    Known Dependencies, Assumptions To Revalidate, Likely Workflow Mode, Sibling
    Projects — plus a mandatory requirement to revalidate discovery before moving
    past discovery/design.

## Constraints

- User-facing naming uses **split**; internal prose may use _decomposition_.
- Must integrate with existing `state.md` phase routing — the chosen active child
  resumes at an appropriate phase, not forced back to the start.
- Must extend `oat-project-discover` and `oat-brainstorm` without breaking their
  existing single-project flows.
- Skill changes must bump the SKILL.md `version:` frontmatter; per `AGENTS.md`,
  bundled-asset changes also require the lockstep public package version bump.
- The `bl-3a4a` backlog item must be reconciled with this project (updated or
  marked superseded).

## Success Criteria

- A standalone `oat-project-split` skill exists, is registered, and is invocable
  from both `oat-project-discover` and `oat-brainstorm`.
- The three trigger surfaces work: declared (skip detection + umbrella framing),
  detected mid-stream (codified signal threshold), detected at convergence
  (always-visible end-of-discovery confirmation; conditional brainstorm-picker
  option).
- The skill produces N child project scaffolds, each with a distilled, seeded
  `discovery.md` (7 sections) and a mandatory discovery-revalidation requirement.
- The skill produces a coordination parent — a `kind: coordination` project record
  with no executable-phase files — recording split rationale, child list, ordering,
  sibling relationships, shared constraints, and an integration-sketch section.
- The parent is marked `complete-by-decomposition` in place and is never relocated;
  listings filter/dim it by status/kind.
- Exactly one child is marked active; siblings are scaffolded and parked.
- Non-interactive behavior matches Key Decision #8 (declared proceeds; detected
  records + fails fast).
- The hand-off integrates with `state.md` phase routing.
- Test coverage includes at least one dogfooded run for the declared path and one
  for a detected path.

## Out of Scope

- Changing how ordinary single-project discovery works.
- Any archive-recovery machinery (`shared → archived → S3` resolution) — explicitly
  deleted with the "mark, don't move" decision.
- Cross-child "all children complete" detection and automatic family archival.
- The parent ever being an executable project.

## Deferred Ideas

- Archiving the whole decomposition family (parent + all children) as one unit —
  deferred as optional, manual housekeeping; not built, not triggered.
- A dedicated `integration-sketch.md` file — deferred unless/until the sketch
  outgrows a section of the parent `discovery.md`.

## Open Questions

- **Schema:** exact `state.md` frontmatter additions — `kind`, `parent`,
  `siblings`, `children`, `depends-on`, and the `complete-by-decomposition` phase
  value — and whether the scaffolder or the split skill writes them.
- **Discover wiring:** precisely where the codified detection check and the
  always-visible end-of-discovery confirmation slot into `oat-project-discover`'s
  existing steps.
- **Listings:** how `oat project list` (and the repo dashboard) filter/dim
  `kind: coordination` projects.
- **Split-time knob:** the exact shape of the "discover more first?" prompt.
- **bl-3a4a reconciliation:** update the backlog item in place to reflect the
  settled design, or mark it superseded by this project.

## Assumptions

- `oat-brainstorm` and `oat-project-discover` can host the new detection/handoff
  steps without major restructuring.
- `oat project new` can scaffold a directory that the split skill then re-flags as
  `kind: coordination` (removing executable-phase files), or the split skill
  creates the coordination parent directly.

## Risks

- **Detection miscalibration:** false positives interrupt routine discovery; false
  negatives cram N projects into one.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** codified signal threshold (≥2, load-bearing 1+2) for
    mid-stream; an always-visible convergence backstop catches accumulated scope.
- **Lifecycle scope creep:** the split feature drags changes into core project
  lifecycle machinery.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** parent-never-executable keeps the lifecycle model
    unchanged for children; the parent's only new state is `complete-by-decomposition`.

## Next Steps

Discovery is complete (carried over from the brainstorm). The design-depth decision
point follows; this discovery surfaced substantial architecture, so a lightweight
`design.md` is recommended before plan generation.
