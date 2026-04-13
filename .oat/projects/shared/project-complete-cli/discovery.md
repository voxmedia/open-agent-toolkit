---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-13
oat_generated: false
---

# Discovery: project-complete-cli

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

The user wants to execute the remaining `bl-0ace` feature work now: move the canonical `oat-project-complete` `state.md` completion mutations out of the skill shell logic and into CLI-owned code, then have the skill delegate to that CLI path.

This request follows recent backlog triage where we established that:

- PR `#12` (`archive-sync-closeout-config`) already moved archive, S3 sync, summary export, and related closeout side effects into `packages/cli/src/commands/project/archive/archive-utils.ts`
- `bl-0ace` remains open as the follow-on to make the actual completion-state mutation (`state.md` frontmatter and body updates) canonical in the CLI as well
- this project should focus on the real `bl-0ace` behavior, not on backlog bookkeeping or the separate `bl-af93` config-unset feature

## Clarifying Questions

### Question 1: Which "number one" should this project cover?

**Q:** Does "do this work now" mean backlog bookkeeping cleanup or the actual `bl-0ace` functionality?
**A:** The user asked what the functionality was, then explicitly started a quick project named `project-complete-cli`.
**Decision:** Scope this project to the actual feature: CLI-owned completion-state mutation for `oat-project-complete`.

### Question 2: Should this be combined with the small config-unset work?

**Q:** Earlier discussion considered combining the tiny `bl-0ace` backlog cleanup with `bl-af93`. Does this project include `bl-af93`?
**A:** The chosen project name and latest request are centered on project-complete CLI work.
**Decision:** Keep this project focused on `bl-0ace`. `bl-af93` stays separate unless implementation reveals an accidental overlap.

## Solution Space

This is a well-understood quick project. The chosen direction is to add a narrow CLI-owned completion-state mutator and make `oat-project-complete` call it, while leaving archive/S3/summary side effects in the archive helper layer that already shipped.

## Options Considered

### Option A: Keep the skill as the source of truth

**Description:** Leave the `sed`/`awk`-based state mutation in `.agents/skills/oat-project-complete/SKILL.md` and only make small polish edits around it.

**Pros:**

- Smallest immediate code change
- No new CLI surface required

**Cons:**

- Leaves canonical completion-state behavior encoded in shell text instead of tested TypeScript
- Keeps drift risk between skill guidance, archived examples, and cleanup utilities

**Chosen:** No

### Option B: Add a CLI-owned completion-state mutator and delegate from the skill

**Description:** Move `state.md` completion mutation into a CLI-owned module plus a shell-callable command surface, then update the skill to call that path instead of mutating `state.md` inline.

**Pros:**

- Makes the completion-state contract explicit, testable, and reusable
- Matches the direction already started by PR `#12`, which moved archive side effects into CLI ownership

**Cons:**

- Requires choosing and wiring a command surface the skill can call
- May require minor alignment work with existing cleanup helpers

**Chosen:** Yes

**Summary:** Choose CLI ownership for the canonical completion-state mutation. Keep the public scope narrow and reuse existing project/archive helpers where practical.

## Key Decisions

1. **Feature scope:** This project covers only the remaining `state.md` completion mutation gap from `bl-0ace`, not backlog bookkeeping or `bl-af93`.
2. **Ownership boundary:** Archive, S3 sync, summary export, and archive-path resolution remain in `archive-utils`; the new work owns only canonical completion-state mutation and skill delegation.
3. **Execution mode:** Quick mode is sufficient. The scope is narrow and does not require a separate design artifact before planning.

## Constraints

- Preserve the completion-time archive behavior already shipped in PR `#12`
- Do not expand this project into broader lifecycle automation (`bl-fb3f`) or config-surface work (`bl-af93`)
- The end state must let the shell-based `oat-project-complete` skill delegate to a CLI path instead of encoding the completion-state mutation itself

## Success Criteria

- A CLI-owned helper or command updates project completion state in the canonical shape, including both `state.md` frontmatter and markdown body mutations
- `oat-project-complete` delegates that state mutation work to the CLI instead of hardcoding the contract in the skill
- Focused tests cover the resulting completion-state format and guard against drift

## Out of Scope

- Backlog status cleanup for `bl-0ace`
- `oat config unset <key>` (`bl-af93`)
- Broader autonomous follow-through or PR-ordering policy work from `bl-fb3f`
- Reworking archive/S3 behavior already owned by `packages/cli/src/commands/project/archive/archive-utils.ts`

## Deferred Ideas

- Revisit whether the completion-state command should become part of a broader public `oat project complete` CLI surface after this narrower extraction lands
- Fold more cleanup/project drift-repair logic into the same shared mutator module if that consolidation becomes natural during implementation

## Open Questions

- **CLI surface:** Should the skill delegate to an internal-only command or a narrow project subcommand?
- **Shared utility reuse:** Should `packages/cli/src/commands/cleanup/project/project.utils.ts` reuse the new mutator directly, or is test-level contract alignment sufficient for the first pass?

## Assumptions

- The current `oat-project-complete` skill text remains the best source of truth for the required `state.md` body updates
- There is no existing CLI command that already performs the full canonical completion-state mutation end to end

## Risks

- **Contract drift during extraction:** The new CLI path could miss a body mutation currently performed by the skill
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Codify the current skill contract in focused tests before extracting the logic
- **Over-expanding the feature:** It is easy to pull archive or lifecycle-policy work into this change because the closeout flow touches those surfaces
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep the plan explicitly centered on `state.md` mutation and skill delegation only

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Quick mode → straight to plan:** scope is clear and no additional design artifact is needed before planning.
