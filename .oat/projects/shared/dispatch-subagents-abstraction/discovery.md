---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-12
oat_generated: false
---

# Discovery: dispatch-subagents-abstraction

## Initial Request

Create two internal OAT skills that separate reusable provider-neutral subagent
dispatch from OAT project lifecycle policy:

- `oat-dispatch-subagents` — general dispatch engine for OAT skills and workflows.
- `oat-project-dispatch-subagents` — project lifecycle adapter that composes
  with the general engine.

The immediate consumer is `oat-repo-improve`, which needs economical,
read-only reconnaissance fan-out without importing phase/task/gate ceremony.
The existing `oat-dispatch-subagents` draft in the
`oat-project-fixture` worktree is the source abstraction to split and improve.

## Clarifying Questions

### Question 1: Ownership boundary

**Q:** Should repo-audit orchestration live inside `oat-repo-improve` or use a
shared OAT dispatch primitive?

**A:** Use a shared primitive. Improve owns lane decomposition, evidence
requirements, vetting, and plan generation; dispatch owns provider selection
and launch mechanics.

**Decision:** `oat-repo-improve` will eventually compose with the general
dispatch skill rather than copy provider logic.

### Question 2: Project lifecycle coupling

**Q:** Should the shared dispatch skill retain phase coordinators, task/fix
workers, project-state ceilings, and gate policy?

**A:** No. Move those concerns into a project-specific adapter.

**Decision:** The general layer accepts resolved policy/ceiling inputs but
never reads OAT project state. The project adapter resolves project context and
adds lifecycle semantics.

### Question 3: Workflow and history

**Q:** Should this work use the normal Quick plan → `oat-project-implement`
path?

**A:** No. Scaffold Quick discovery and lightweight design, author the skills
directly with Claude reviewing, then backfill plan and implementation artifacts
as a historical record.

**Decision:** The scaffolded plan remains untouched until implementation is
complete. `oat-project-implement` will not run.

## Solution Space

### Approach 1: Extend the existing dispatcher in place

**Description:** Add reconnaissance roles to the current fixture skill while
retaining project lifecycle policy in the same contract.

**When this is the right choice:** The dispatcher has only project lifecycle
consumers and no broader analytical workflows.

**Tradeoffs:** Minimal initial file movement, but every non-project consumer
inherits task IDs, gates, write semantics, and lifecycle-heavy records.

### Approach 2: General engine plus project adapter _(Recommended)_

**Description:** Extract generic dispatch axes, catalog evidence, selection,
launch evidence, provider references, and recovery into
`oat-dispatch-subagents`. Move project role policies and state-derived behavior
into `oat-project-dispatch-subagents`, which explicitly composes with the
engine.

**When this is the right choice:** Multiple OAT skills need subagents for
reconnaissance, analysis, documentation, generation, implementation, or review.

**Tradeoffs:** Introduces a two-skill loading chain and requires careful
anti-duplication boundaries, but provides a stable reusable substrate.

### Approach 3: Keep dispatch guidance inside each caller

**Description:** Give `oat-repo-improve` a small provider-neutral orchestration
reference and leave the fixture dispatcher project-specific.

**When this is the right choice:** The general dispatcher is far from landing
or caller needs are fundamentally incompatible.

**Tradeoffs:** Ships independently but creates parallel dispatch contracts and
a later convergence migration.

### Chosen Direction

**Approach:** General engine plus project adapter.

**Rationale:** The split follows the seam already present in the fixture skill,
supports future non-project OAT consumers, and makes the prerequisite small
enough to land before the improve rewrite.

**User validated:** Yes.

## Key Decisions

1. **Canonical layers:** `oat-dispatch-subagents` is workflow-neutral;
   `oat-project-dispatch-subagents` is the project lifecycle adapter.
2. **Dependency direction:** Project adapter loads and invokes the general
   engine. The general engine never imports project policy.
3. **Project-state isolation:** The general layer may receive a resolved policy
   or named ceiling, but it must not resolve active projects or read `state.md`.
4. **Generic reconnaissance:** The general layer includes a first-class
   read-only `recon` role and supports bounded dossier leads when one declared
   scope needs context-heavy reconciliation.
5. **Main-loop judgment:** Callers retain cross-lane synthesis, prioritization,
   user dialogue, plan writing, and verification of load-bearing worker claims.
6. **Provider mechanics:** Resolve the active provider and load exactly one
   bundled provider reference. Do not merge provider surfaces into one policy.
7. **Dispatch evidence:** Preserve model, effort, role, route, authority,
   deadline, catalog source, selection reason, launch acceptance, and child
   outcome as independent axes.
8. **Recon wave records:** Homogeneous read-only fan-out may share one dispatch
   wave record with a lane manifest; differing routes or authorities require
   separate records.
9. **No silent downgrade:** Authorization-required is not unavailable. Ask
   once, lock the selected tier, and make every coverage/route downgrade
   explicit.
10. **Internal utility posture:** Both skills are internal dependencies with
    `disable-model-invocation: true` and `user-invocable: false`.
11. **OAT authoring conventions:** Follow `create-agnostic-skill` progressive
    disclosure and apply `create-oat-skill` conventions where appropriate for
    internal, non-standalone helpers.
12. **Cross-worktree convergence:** Codex authors here, Claude reviews here,
    and the fixture worktree adopts the reviewed files from an exact commit.

## Constraints

- Keep each `SKILL.md` under 500 lines and move provider mechanics or detailed
  schemas to one-level `references/` files.
- Use imperative workflow language and `Use when…` descriptions.
- Include `version: 1.0.0` for both new canonical skills.
- Avoid nested user-facing mode banners when an internal helper is loaded by a
  calling workflow; the caller owns the primary progress UI.
- Do not hard-code a Codex `agent_type` unless guaranteed by the active host.
- Preserve exact provider selector strings from live catalogs.
- Do not launch diagnostic children solely to discover hidden catalogs.
- Accepted launches are not eligible for automatic route replacement.
- Keep project task IDs, gates, commits, worktrees, and state-derived policy out
  of the general layer.
- Do not duplicate provider references or generic selection/recovery logic in
  the project adapter.
- Treat the fixture skill as reference material, not as a second canonical copy.

## Success Criteria

- General skill supports OAT workflows without requiring an active project.
- Project adapter composes with the general skill and owns all lifecycle-only
  policy.
- Generic records use neutral scope/action/role/authority fields.
- Read-only reconnaissance can use economical bounded workers with per-wave
  evidence and no expensive-root inheritance.
- Exactly one provider reference is loaded per dispatch context.
- Capability, authorization, fallback, and acceptance behavior are explicit.
- Claude review finds no Critical or Important structural/architectural gaps.
- OAT skill validation passes.
- Provider views and distribution assets are synchronized.
- The fixture worktree can adopt the reviewed files without semantic rewriting.

## Out of Scope

- Rewriting `oat-repo-improve` in this prerequisite project.
- Modifying `oat-repo-maintainability-review` or other future callers.
- Adding new provider runtime APIs or CLI commands.
- Running the implementation through `oat-project-implement`.
- Maintaining two independently edited canonical copies across worktrees.
- Finalizing the Session Observer Collaboration skill; that remains a separate
  end-of-run synthesis deliverable.

## Deferred Ideas

- Add callers such as docs analysis and deep research after the dispatch layers
  stabilize.
- Consider a deterministic validator for dispatch request/record schemas if
  prose contracts prove insufficient.
- Evaluate whether generic review and generation roles need specialized policy
  rows after real consumers adopt the engine.

## Open Questions

- **Distribution:** Confirm both internal skills should ship in the OAT utility
  pack and bundled CLI assets.
- **Record schema:** Decide whether the generic action/role taxonomy is closed
  or extensible with required baseline classes.
- **Project adapter:** Decide which current fixture fields remain general inputs
  versus project-resolved metadata.
- **Retrospective tracking:** Choose the exact metadata used when backfilling a
  plan that was not the source of implementation execution.

## Assumptions

- The general dispatch skill will land before or with the improve rewrite.
- Calling OAT skills remain responsible for their own artifact writes and
  lifecycle sequencing.
- Active harness instructions may override bundled provider examples when more
  specific or newer.
- The current fixture provider references are useful starting points but may be
  revised by the fixture authoring agent before adoption.

## Risks

- **Abstraction leakage:** Project concepts could drift back into the general
  layer.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Static review for project-state/task-ID terms and explicit
    dependency-direction tests.
- **Cross-worktree drift:** Both copies could evolve independently.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Adopt from an exact reviewed commit and compare file hashes.
- **Dispatch ceremony:** Full lifecycle evidence could make cheap recon fan-out
  unwieldy.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Per-wave records for homogeneous read-only lanes.
- **Provider drift:** Model catalogs and dispatch surfaces can change.
  - **Likelihood:** High
  - **Impact:** Medium
  - **Mitigation:** Live catalog evidence, exact selector preservation, and
    active-instruction precedence.

## Next Steps

1. Review and approve the lightweight design.
2. Author the two internal skills and supporting references directly.
3. Ask Claude to review the concrete files.
4. Address review findings and validate/sync/distribute the skills.
5. Backfill `plan.md` and `implementation.md` as historical records.
6. Hand the reviewed commit to the fixture worktree for review and adoption.
