---
oat_status: complete
oat_ready_for: oat-project-spec
oat_blockers: []
oat_last_updated: 2026-03-29
oat_generated: false
---

# Discovery: oat-project-next

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Add an `oat-project-next` skill that acts as an automatic router for the OAT project lifecycle. Instead of manually invoking `oat-project-spec`, `oat-project-design`, `oat-project-implement`, etc., the user types one command and the skill determines what phase/step the project is in and routes to the appropriate next action.

Key behaviors described:

- Wherever you are in the project, it just continues — shortcut to "whatever is next"
- If implementation is done, triggers subagent code review by default
- If reviews have passed, runs whatever is next in the post-implementation stage
- Basically a router for wherever you're at in the project

## Clarifying Questions

### Question 1: Relationship to oat-project-progress

**Q:** Does oat-project-next complement oat-project-progress (keeping both), or should it replace/absorb progress entirely?
**A:** Complement — keep both skills.
**Decision:** Progress remains the read-only diagnostic/status check. Next becomes the action router that invokes the appropriate next skill. They share state-reading logic but serve different purposes. No changes to oat-project-progress are needed.

### Question 2: Mid-phase behavior and boundary detection

**Q:** When a phase is in_progress, what should oat-project-next do — resume, advance, or ask?
**A:** Three-tier approach based on artifact state:

1. Artifact `oat_status: complete` + `oat_ready_for: X` → invoke X directly (clean boundary)
2. Phase `in_progress` but artifact has substantive content → invoke next phase skill (which handles completing current phase as part of its startup)
3. Phase `in_progress` and artifact is still template/empty → resume current phase skill (truly mid-work)
   **Decision:** Use artifact content state to distinguish "mid-work" from "at boundary." This avoids the double-tap problem where the user has to call next twice (once to finish feedback, once to advance). The downstream phase skill already handles marking the previous phase complete, so we lean on that existing mechanism.

### Question 3: Post-implementation routing chain

**Q:** How opinionated should the post-implementation routing be?
**A:** Auto-chain with defaults. Each invoked skill still has its own natural interaction/pause points, so there's no loss of user control. "Next" just removes the "which skill do I call?" decision at each boundary.
**Decision:** After implementation, the routing chain is: review-provide → (if findings: review-receive → implement revisions) → summary → pr-final → complete. The router picks the right next step based on review status, revision status, and artifact state. Each skill retains its own user interaction.

### Question 4: Execution mechanics

**Q:** How should oat-project-next invoke the target skill?
**A:** Direct skill invocation. Most skills have model invocation disabled, so the agent reads the skill content and follows it directly — still seamless. Additionally, before advancing from any phase, always check for unprocessed review artifacts so feedback doesn't get lost.
**Decision:** The skill instructs the agent to invoke the target skill (via Skill tool or direct read). The router includes a review-artifact safety check at every transition: if unprocessed reviews exist in `reviews/` (not marked passed/deferred in plan.md Reviews table), route to `oat-project-review-receive` before advancing to the next phase.

## Solution Space

Single clear approach: a self-contained skill file with a state-driven routing table that reads project state, determines the appropriate next skill, and invokes it. No alternative approaches warranted — the requirements are well-scoped and the pattern is consistent with existing OAT skills.

## Key Decisions

1. **Complementary to progress:** oat-project-next and oat-project-progress coexist. Progress = read-only status. Next = action router. No modifications to progress needed.
2. **Three-tier boundary detection:** Uses artifact content state (complete vs substantive vs template) to decide whether to resume current phase or advance to next. Avoids double-tap friction.
3. **Auto-chain post-implementation:** After implementation, next routes through: code review → review-receive (if findings) → summary → pr-final → complete. Each skill retains its own user interaction points.
4. **Direct skill invocation:** The router invokes the target skill directly (via Skill tool or agent read). Seamless single-command experience.
5. **Review safety check:** Before every phase transition, check for unprocessed review artifacts. Route to review-receive if unaddressed feedback exists, preventing lost review findings.

## Constraints

- Must work with all three workflow modes: spec-driven, quick, and import (each has different phase sequences)
- Must respect HiLL checkpoints — if a phase requires human approval and hasn't been approved, don't skip it
- Must respect execution mode (single-thread vs subagent-driven) when routing to implementation
- Skill file only — no CLI code changes, no new packages
- Must handle the "no active project" edge case gracefully

## Success Criteria

- User can call `oat-project-next` from any point in the lifecycle and be routed to the correct next action
- No double-tap friction: calling next at a phase boundary advances to the next phase in one invocation
- Unprocessed reviews are caught before advancing — no review feedback gets lost
- Works correctly for spec-driven, quick, and import workflow modes
- Post-implementation chain (review → summary → PR → complete) is navigable entirely via repeated `next` calls

## Out of Scope

- Modifying oat-project-progress — it stays as-is
- Adding new frontmatter fields or state tracking — reuses existing state.md and artifact frontmatter
- CLI-level routing — this is a skill-only solution
- Customizing the post-implementation chain order — uses opinionated defaults

## Deferred Ideas

- Configurable post-implementation chain order — could let users skip summary or reorder steps, but adds complexity for minimal value right now
- "next --dry-run" mode that shows what would be invoked without doing it — essentially what progress already does
- Integration with oat-project-progress to share a common state-evaluation module — worth considering once both skills stabilize

## Open Questions

- **Content detection heuristic:** How exactly to determine if an artifact has "substantive content" vs still being a template — needs design-phase definition (e.g., check for template placeholders like `{Project Name}`, or compare against template file)
- **Review artifact detection:** Exact mechanism for detecting unprocessed reviews — parse plan.md Reviews table? Check for files in reviews/ directory? Both?
- **Workflow mode routing tables:** The phase sequences differ per workflow mode. Need to define the explicit routing table for each mode during design.

## Assumptions

- Downstream phase skills already handle completing the previous phase as part of their startup (verified: oat-project-design marks spec complete, etc.)
- The Skill tool invocation works even when the target skill has model invocation disabled (agent reads and follows the skill content directly)
- Existing frontmatter fields (`oat_phase`, `oat_phase_status`, `oat_status`, `oat_ready_for`) provide sufficient signal for all routing decisions

## Risks

- **Stale state leading to wrong routing:** If state.md and artifact frontmatter get out of sync, the router could invoke the wrong skill
  - **Likelihood:** Low (existing skills maintain state consistently)
  - **Impact:** Medium (user would need to manually correct)
  - **Mitigation Ideas:** Add a consistency check at the start of the router (compare state.md phase with artifact statuses)

## Next Steps

Continue to `oat-project-spec` for formal specification of the routing table and behavior.
