---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-03-12
oat_generated: true
---

# Discovery: retroactive-project-capture

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

## Initial Request

Add an `oat-project-capture` skill that creates a full OAT project from an already-completed (or in-progress) branch where work happened outside the OAT project workflow. Common scenario: mobile/cloud sessions where the user works with an agent, then wants to open a PR and review later from their computer.

## Clarifying Questions

### Question 1: CLI Surface

**Q:** Should this have a CLI entry point (`oat project capture`) or be skill-only?
**A:** Skill-only — the skill requires conversation context that CLI can't provide.
**Decision:** Pure SKILL.md, no CLI command. The agent's conversation context is the primary input; commit analysis is supplementary.

## Solution Space

Well-understood request with a clear approach defined in the backlog. The skill follows a linear 6-step flow: name inference → branch analysis → project scaffold → discovery synthesis → implementation capture → lifecycle state.

### Chosen Direction

**Approach:** Conversation-context-first retroactive capture with commit analysis as supplementary input.
**Rationale:** The real value is capturing _intent_ from the conversation, not just _what_ from commits. Commit analysis fills gaps but conversation context is primary.
**User validated:** Yes

## Key Decisions

1. **Skill-only, no CLI command:** Requires conversation context that only the agent has. CLI can't provide this.
2. **Conversation context is primary input:** Commit/branch analysis supplements but doesn't replace the agent's understanding of intent, decisions, and alternatives considered.
3. **Quick-mode scaffold:** Uses `oat project new --mode quick` since we're retroactively capturing, not planning forward.
4. **No plan generation:** Capture populates discovery.md and implementation.md from existing work. A plan isn't needed since the work is already done (or in progress).
5. **Lifecycle state is user-chosen:** Default to `awaiting-review`, but ask the user whether work is complete or still in progress.

## Constraints

- Must work within existing OAT project structure (templates, state.md conventions, frontmatter).
- Must not overwrite existing projects — check for name collisions.
- Should ask the user for clarification rather than guessing when context is unclear.
- Implementation.md tasks should reference actual commits (SHAs) where possible.

## Success Criteria

- Agent can invoke `oat-project-capture` at end of a session to create a tracked project from untracked work.
- `discovery.md` captures the "why" from conversation context, not just the "what" from commits.
- `implementation.md` reflects actual work done with commit references.
- Project is set to `awaiting-review` (or user-chosen state) and is ready for `oat-project-review-provide` / `oat-project-pr-final`.
- Works naturally in the mobile/cloud session flow: brainstorm → implement → capture → PR → review at desk.

## Out of Scope

- CLI command (skill-only).
- Retroactive plan generation (the work is done; no need to reverse-engineer a plan).
- Automatic PR creation (that's `oat-project-pr-final`'s job, downstream).
- Multi-branch capture (single branch at a time).

## Deferred Ideas

- Auto-detection prompt ("It looks like you've done untracked work — want to capture it?") — could be added later as a hook or agent behavior.
- Batch capture of multiple branches — not needed for v1.

## Assumptions

- The agent has meaningful conversation context to draw from (not invoked cold with no prior discussion).
- The branch has at least one commit beyond the base branch.
- Git is available and the repo is in a clean or committable state.

## Risks

- **Thin conversation context:** If invoked late in a session or after context compression, conversation context may be sparse.
  - **Likelihood:** Medium
  - **Impact:** Low (falls back to commit-derived context; user can supplement)
  - **Mitigation:** Ask user to fill gaps rather than guessing.

## Next Steps

Scope is clear, no architecture decisions needed — straight to plan.
