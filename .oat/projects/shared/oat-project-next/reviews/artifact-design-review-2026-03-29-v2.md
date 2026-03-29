---
oat_generated: true
oat_generated_at: 2026-03-29
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/oat-project-next
---

# Artifact Review: design

**Reviewed:** 2026-03-29
**Scope:** design.md artifact review (spec-driven mode)
**Upstream:** spec.md

## Summary

The design is well-structured, thorough, and directly addresses all spec requirements with clear component boundaries, explicit routing tables, and a well-reasoned three-tier boundary detection algorithm. The three open questions from the spec are resolved with sound design decisions. There are a few alignment gaps: the Tier 2 boundary detection behavior diverges significantly from the existing progress skill's routing without explicitly documenting the rationale for the divergence, the "deferred" Reviews table status referenced by both the spec and design does not exist in the canonical plan.md template status flow, and two edge cases in the boundary detection could lead to incorrect routing when state.md and artifact frontmatter disagree.

## Findings

### Critical

- **Tier 2 boundary detection: ambiguous state conflict resolution** (`design.md:137-153`)
  - Issue: The boundary detector defines Tier 2 as "artifact oat_status == 'in_progress' AND oat_template != true", which then routes to the NEXT phase skill. However, the routing tables (lines 206-251) key off `Phase Status` (from state.md `oat_phase_status`), not `artifact oat_status`. When `oat_phase_status: in_progress` (from state.md) but the artifact has `oat_status: complete` WITHOUT `oat_ready_for` set, the algorithm falls through all three tiers: Tier 1 requires `oat_ready_for` not null, Tier 2 requires `oat_status: in_progress`, and Tier 3 requires `oat_template: true` or placeholders. This leaves a gap where a complete artifact without `oat_ready_for` has no defined routing behavior.
  - Fix: Add explicit handling for the case where `oat_status: complete` but `oat_ready_for` is null. Recommended: treat it the same as Tier 2 (route to next phase skill), since the artifact IS complete. Alternatively, document this as an error case with a recovery path. Add a note in the Boundary Detector section: "If oat_status is complete but oat_ready_for is null, treat as Tier 2 (substantive, advance to next phase)."
  - Requirement: FR2 (Three-Tier Boundary Detection)

### Important

- **"deferred" is not a canonical Reviews table status** (`design.md:189-190`)
  - Issue: The Review Checker lists `"passed" or "deferred"` as processed statuses. The spec (FR4) also says `passed/deferred = processed`. However, the canonical plan.md template defines the status flow as `pending -> received -> fixes_added -> fixes_completed -> passed`. The value `deferred` does not appear in this flow. This means either: (a) no review will ever have status "deferred", making this a dead code path, or (b) there is an undocumented status value that some skill sets but the template doesn't describe.
  - Fix: Either (a) add `deferred` to the plan.md template's documented status values with clear semantics (e.g., "review findings acknowledged but intentionally not addressed"), or (b) remove `deferred` from both the design's Review Checker and the spec's FR4. Since this appears in the spec too, it may warrant a spec amendment. For the design, at minimum add a note that `deferred` is a status the review-receive skill can set when findings are intentionally skipped, and reference where in the review-receive flow this happens.
  - Requirement: FR4 (Review Safety Check)

- **Tier 2 routing diverges from progress skill without explicit rationale** (`design.md:147-148`)
  - Issue: The existing `oat-project-progress` skill (`.agents/skills/oat-project-progress/SKILL.md`) always recommends "Continue current phase skill" when `oat_phase_status: in_progress`, regardless of artifact content. The design's Tier 2 instead routes to the NEXT phase skill when the artifact has substantive content. This is intentional (discovery Q2 documents the "double-tap" avoidance rationale), but the design doesn't explicitly call out this divergence from the existing progress skill's behavior. Since both skills read the same state, a user running progress then next could get contradictory guidance (progress says "continue spec" while next invokes design).
  - Fix: Add a section or note under Phase Router (or in a new "Behavioral Differences from oat-project-progress" subsection) explicitly documenting: (1) progress always recommends the current phase skill for in_progress, (2) next uses content heuristics to advance earlier, (3) why this divergence is intentional (avoiding double-tap), and (4) that this means progress and next may give different recommendations for Tier 2 states.

- **FR9 sub-cases not fully elaborated** (`design.md:378-381`)
  - Issue: Spec FR9 (P1) defines two distinct sub-cases: (a) no active project AND no projects exist at all -> suggest creation skills, (b) no active project but projects DO exist -> suggest `oat-project-open`. The design's Error Cases section (line 378) combines these into a single bullet: "No active project -> Display message suggesting `oat-project-new` or `oat-project-open`." This doesn't distinguish between the two sub-cases and always suggests both options, which doesn't match FR9's acceptance criteria that tailors the suggestion based on whether projects exist.
  - Fix: Split the "No active project" error case into two sub-cases matching FR9: (a) "No active project and no projects in projects root -> suggest `oat-project-new`, `oat-project-quick-start`, or `oat-project-import-plan`" and (b) "No active project but projects exist -> suggest `oat-project-open` to select one." This also needs a corresponding entry in the State Reader's error cases section.
  - Requirement: FR9 (No-Project-Needed Entry Points)

### Medium

- **Review Checker expands "processed" statuses beyond spec without noting the divergence** (`design.md:189-190`)
  - Issue: The spec (FR4) says `passed/deferred = processed; anything else = unprocessed`. The design adds `fixes_added` and `fixes_completed` as also processed. This is actually a beneficial improvement -- once `review-receive` has converted findings to tasks, re-routing to `review-receive` would be counterproductive. But the design should explicitly note this is an intentional expansion of the spec's definition and explain the rationale.
  - Fix: Add a "Design Decision" note under Step 2 of the Review Checker explaining: "The spec defines only passed/deferred as processed. This design expands processed to include fixes_added and fixes_completed because once review-receive has converted findings to plan tasks (fixes_added) or those tasks are implemented (fixes_completed), re-invoking review-receive would be redundant. Only reviews in pending, received, or in_progress states need processing."
  - Requirement: FR4 (Review Safety Check)

- **Missing: blocker awareness in routing** (`design.md:96-130`)
  - Issue: The state.md template includes `oat_blockers: []` as a standard field, and the existing progress skill checks and warns about blockers. The design's State Reader field table (lines 98-106) does not include `oat_blockers`. While the spec doesn't have an explicit "blocker handling" requirement, the constraint "Must reuse existing state.md" combined with the progress skill's blocker behavior suggests the router should at minimum warn when blockers exist, even if it still dispatches to the target skill.
  - Fix: Add `oat_blockers` to the State Reader's input fields table. Add a note in the Dispatcher section: "If `oat_blockers` is non-empty, include a warning in the announcement before dispatching. The router still dispatches (blockers are informational, not gates), but the user should be aware."

- **Post-implementation router step 3: "final code review" detection is fragile** (`design.md:288-291`)
  - Issue: The design checks for a Reviews table row with `Scope="final"` and `Type="code"`. But the plan.md template pre-populates `final | code | pending` by default. So a row WILL exist, but with status "pending". The design says "If no such row exists -> route to review-provide". Since the row always exists (just with status "pending"), this condition would never trigger, and the router would skip the final review step entirely.
  - Fix: Change the condition from "no such row exists" to "no such row exists, OR row exists with status 'pending'". Both conditions should trigger routing to `oat-project-review-provide`. This aligns with the intent: if the final review hasn't been performed yet (pending), trigger it.
  - Requirement: FR5 (Post-Implementation Routing)

### Minor

- **Implementation Phases section could clarify skill registration locations** (`design.md:441`)
  - Issue: Phase 1 says "Register skill in both `.claude/skills/` and `.agents/skills/`". The existing skill structure shows skills live in `.agents/skills/` with provider-specific views managed by sync tooling (per AGENTS.md: "Provider-linked views are managed by sync tooling"). The design should clarify whether manual registration in `.claude/skills/` is needed or if `oat sync` handles this.
  - Suggestion: Clarify: "Register skill in `.agents/skills/oat-project-next/SKILL.md` (canonical location). Run `oat sync --scope all` to generate provider-linked views (e.g., `.claude/skills/`)."

- **Component diagram could show Review Checker placement more precisely** (`design.md:36-68`)
  - Issue: The component diagram shows Review Checker running between State Reader and Boundary Detector, but the Data Flow (lines 72-81) shows review checking at step 5, after boundary detection has already happened (step 6). The diagram implies review checking happens before boundary detection, while the data flow says it happens after state reading but the boundary detection happens after review checking.
  - Suggestion: Reorder the component diagram to match the Data Flow ordering, or add a note that the diagram shows logical components (not execution order) while the Data Flow section defines the actual sequence.

- **Testing strategy is entirely manual** (`design.md:389-426`)
  - Issue: All 11 requirement-to-test mappings use `manual` verification. While this is understandable for a skill file (not executable code), some test scenarios could be partially automated using synthetic project fixtures (e.g., create a temp project directory with specific state.md frontmatter, run the skill, verify the announced target).
  - Suggestion: Consider noting in the testing strategy that future automation could use fixture-based testing if the routing logic is ever extracted into a testable module. This is informational only and not blocking.

## Spec/Design Alignment

### Requirements Coverage

| Requirement                         | Status      | Notes                                                                                                                                                      |
| ----------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1 (State Detection)               | Implemented | State Reader component covers all required fields. Phase-to-artifact mapping is explicit.                                                                  |
| FR2 (Three-Tier Boundary Detection) | Partial     | Well-designed with oat_template primary signal + fallback heuristic. Gap: no handling for oat_status:complete + oat_ready_for:null (see Critical finding). |
| FR3 (Workflow-Mode-Aware Routing)   | Implemented | All three routing tables (spec-driven, quick, import) are complete and match spec phase sequences. Execution mode routing is handled.                      |
| FR4 (Review Safety Check)           | Implemented | Dual-signal approach (directory + table) is robust. "deferred" status issue noted. Beneficial expansion of processed statuses beyond spec.                 |
| FR5 (Post-Implementation Routing)   | Partial     | All transitions covered. Step 3 has a detection bug where pre-populated "pending" rows prevent final review triggering (see Medium finding).               |
| FR6 (HiLL Gate Respect)             | Implemented | Override logic is clear, applied before routing table lookup. Phase-to-skill mapping provided.                                                             |
| FR7 (Direct Skill Invocation)       | Implemented | Dispatcher component handles announcement + invocation. Invocation method is well-described.                                                               |
| FR8 (Active Project Resolution)     | Implemented | Reads from config.local.json, error cases defined.                                                                                                         |
| FR9 (No-Project Guidance)           | Partial     | Error cases mention suggesting skills but don't distinguish the two sub-cases from FR9 (no projects vs. projects exist but none active).                   |
| NFR1 (Routing Announcement)         | Implemented | 4-line announcement format defined. Matches OAT banner style from progress skill.                                                                          |
| NFR2 (Consistent Skill Structure)   | Implemented | Phase 1 tasks include standard frontmatter. Registration in both locations noted.                                                                          |

### Open Questions Resolution

| Open Question (from spec)                               | Resolved? | Design Decision                                                                                                                                                  |
| ------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content heuristic for "substantive content" detection   | Yes       | Uses `oat_template: true` frontmatter as primary signal (deterministic, fast). Fallback to `{placeholder}` pattern detection for older artifacts. Well-reasoned. |
| Review detection mechanism (table vs directory vs both) | Yes       | Uses both directory scan AND Reviews table cross-reference for resilience against two failure modes. Sound dual-signal approach.                                 |
| Post-implementation state signals for summary.md        | Yes       | Uses same `oat_status` frontmatter pattern. Confirmed: summary.md template includes `oat_status` field.                                                          |

### Extra Work (not in requirements)

- **Revision task detection in post-implementation router (step 1):** The design adds checking for incomplete p-revN revision tasks before other post-implementation routing. This is not explicitly called out in FR5's acceptance criteria but is a reasonable extension -- FR5 does mention "When revision tasks exist (p-revN phases in plan.md) that are incomplete: routes to implementation for revisions." So this is actually covered by the spec, just not as the first priority step. The design's ordering (revisions first) is a sound design choice.

- **`fixes_added` / `fixes_completed` as processed review statuses:** Expands beyond spec FR4's `passed/deferred` definition. Beneficial -- avoids redundant review-receive invocations.

## Recommended Next Step

Run the `oat-project-review-receive` skill to process findings.
