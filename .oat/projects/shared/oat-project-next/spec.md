---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-03-29
oat_generated: false
---

# Specification: oat-project-next

## Phase Guardrails (Specification)

Specification is for requirements and acceptance criteria, not design/implementation details.

- Avoid concrete deliverables (specific scripts, file paths, function names).
- Keep the “High-Level Design” section to architecture shape and component boundaries only.
- If a design detail comes up, record it under **Open Questions** for `oat-project-design`.

## Problem Statement

The OAT project lifecycle has 15+ skills spanning discovery, specification, design, planning, implementation, review, revision, PR, and completion phases. Today, users must know which skill to invoke at each transition — memorizing the phase sequence, checking which workflow mode they're in, and knowing the post-implementation chain order. The `oat-project-progress` skill helps by recommending the next skill, but the user still has to manually invoke it.

This creates unnecessary friction. A user resuming work after a break must first run progress to see where they are, then manually invoke the recommended skill. At phase boundaries, they must remember to call the next phase skill. After implementation, the chain of review → receive → summary → PR → complete requires knowing the exact sequence and checking review status between steps.

The `oat-project-next` skill eliminates this by acting as a single entry point that reads project state, determines what should happen next, and directly invokes the appropriate skill — turning the manual phase-navigation problem into a one-command "just keep going" experience.

## Goals

### Primary Goals

- Provide a single command that routes to the correct next lifecycle skill from any project state
- Eliminate the need for users to memorize phase sequences or skill names
- Handle all three workflow modes (spec-driven, quick, import) with correct phase sequences
- Automatically detect and route through the post-implementation chain (review → summary → PR → complete)
- Prevent review feedback from being lost by checking for unprocessed review artifacts before advancing

### Secondary Goals

- Reduce cognitive load when resuming work after a context switch or break

## Non-Goals

- Modifying or replacing `oat-project-progress` — it remains the read-only diagnostic tool
- Adding new frontmatter fields or state tracking mechanisms — reuses existing state
- CLI-level routing or code changes — this is a skill-file-only solution
- Customizable post-implementation chain ordering
- Handling projects without an active project set in config

## Requirements

### Functional Requirements

**FR1: State Detection**

- **Description:** The skill must read project state from `state.md` frontmatter and per-phase artifact frontmatter to determine the current lifecycle position.
- **Acceptance Criteria:**
  - Reads `oat_phase`, `oat_phase_status`, `oat_workflow_mode`, `oat_execution_mode` from `state.md`
  - Reads `oat_status` and `oat_ready_for` from the current phase's artifact (discovery.md, spec.md, design.md, plan.md, implementation.md)
  - Reads `oat_hill_checkpoints` and `oat_hill_completed` from `state.md` for HiLL gate awareness
- **Priority:** P0

**FR2: Three-Tier Boundary Detection**

- **Description:** The skill must distinguish between three artifact states to decide whether to resume the current phase or advance to the next.
- **Acceptance Criteria:**
  - **Tier 1 (Complete):** If the current phase artifact has `oat_status: complete` and `oat_ready_for: <skill>`, invoke that skill directly
  - **Tier 2 (Substantive):** If `oat_phase_status: in_progress` and the artifact contains substantive content (beyond template placeholders), invoke the next phase's skill (which handles completing the current phase)
  - **Tier 3 (Template/Empty):** If `oat_phase_status: in_progress` and the artifact is still a template or has no substantive content, resume the current phase's skill
- **Priority:** P0

**FR3: Workflow-Mode-Aware Routing**

- **Description:** The skill must route through the correct phase sequence for each workflow mode.
- **Acceptance Criteria:**
  - **Spec-driven:** discovery → spec → design → plan → implement → post-implementation
  - **Quick:** discovery → plan → implement → post-implementation
  - **Import:** plan → implement → post-implementation
  - Respects `oat_execution_mode` when routing to implementation (single-thread → `oat-project-implement`, subagent-driven → `oat-project-subagent-implement`)
- **Priority:** P0

**FR4: Review Safety Check**

- **Description:** Before advancing from any phase, the skill must check for unprocessed review artifacts and route to `oat-project-review-receive` if any exist.
- **Acceptance Criteria:**
  - Checks `reviews/` directory for non-archived review files
  - Cross-references against plan.md Reviews table for status (passed/deferred = processed; anything else = unprocessed)
  - If unprocessed reviews exist, routes to `oat-project-review-receive` instead of the next phase skill
  - Reports to the user that unprocessed review feedback was detected
- **Priority:** P0

**FR5: Post-Implementation Routing**

- **Description:** After implementation completes, the skill must route through the post-implementation chain based on current state.
- **Acceptance Criteria:**
  - When `oat_phase: implement` and `oat_phase_status: complete`: routes to `oat-project-review-provide code final`
  - When final review exists and is passed (no unprocessed findings): routes to `oat-project-summary`
  - When summary.md exists with substantive content: routes to `oat-project-pr-final`
  - When `oat_phase_status: pr_open`: routes to `oat-project-complete`
  - When revision tasks exist (p-revN phases in plan.md) that are incomplete: routes to implementation for revisions
- **Priority:** P0

**FR6: HiLL Gate Respect**

- **Description:** The skill must not bypass HiLL checkpoints.
- **Acceptance Criteria:**
  - If the current phase is in `oat_hill_checkpoints` and not in `oat_hill_completed`, routes to the current phase skill (to capture explicit approval) rather than advancing
  - Reports to the user that a HiLL gate is pending
- **Priority:** P0

**FR7: Direct Skill Invocation**

- **Description:** The skill must invoke the target skill directly rather than just recommending it.
- **Acceptance Criteria:**
  - After determining the target skill, invokes it via the Skill tool (or instructs the agent to read and follow the skill directly if model invocation is disabled)
  - The user experiences a seamless transition — one command triggers the full next action
  - Announces which skill is being invoked and why before dispatching
- **Priority:** P0

**FR8: Active Project Resolution**

- **Description:** The skill must resolve the active project before routing.
- **Acceptance Criteria:**
  - Reads `activeProject` from `.oat/config.local.json`
  - If no active project is set, reports the error and suggests `oat-project-new` or `oat-project-open`
  - If the active project path doesn't exist, reports the error
- **Priority:** P0

**FR9: No-Project-Needed Entry Points**

- **Description:** When no active project exists and none is needed, the skill should provide useful guidance.
- **Acceptance Criteria:**
  - If no active project and no projects exist at all: suggests `oat-project-new`, `oat-project-quick-start`, or `oat-project-import-plan`
  - If no active project but projects exist: suggests `oat-project-open` to select one
- **Priority:** P1

### Non-Functional Requirements

**NFR1: Routing Announcement**

- **Description:** Before invoking a skill, the router must announce what it detected and where it's routing, so the user understands the decision.
- **Acceptance Criteria:**
  - Displays: current phase, phase status, detected artifact state, and target skill name
  - Uses the standard OAT progress banner format
  - Announcement is concise (3-5 lines max)
- **Priority:** P0

**NFR2: Consistent Skill Structure**

- **Description:** The skill file must follow OAT skill conventions.
- **Acceptance Criteria:**
  - Uses standard frontmatter (name, version, description, disable-model-invocation, user-invocable, allowed-tools)
  - Follows the same structural patterns as existing lifecycle skills
  - Includes progress indicators matching OAT style
- **Priority:** P1

## Constraints

- Skill file only — no CLI code changes, no new packages, no new commands
- Must reuse existing state.md and artifact frontmatter fields — no new fields
- Must work with all three workflow modes (spec-driven, quick, import)
- Must respect HiLL checkpoints and execution mode settings
- The skill cannot modify project state itself — it only reads state and dispatches to the appropriate skill (which handles state mutations)

## Dependencies

- Existing state.md frontmatter schema (`oat_phase`, `oat_phase_status`, `oat_workflow_mode`, `oat_execution_mode`, `oat_hill_checkpoints`, `oat_hill_completed`)
- Per-artifact frontmatter (`oat_status`, `oat_ready_for`)
- Plan.md Reviews table format for review status detection
- All existing lifecycle skills (discover, spec, design, plan, implement, review-provide, review-receive, summary, pr-final, complete, revise)

## High-Level Design (Proposed)

The skill is a single markdown file containing a deterministic routing algorithm. It reads project state in a fixed order: active project resolution → state.md frontmatter → current artifact frontmatter → review artifact check → routing decision → skill invocation.

The routing logic is organized as a decision tree with three main branches: pre-implementation phases (workflow-mode-dependent), implementation phase, and post-implementation chain. Each branch applies the three-tier boundary detection (complete / substantive / template) and the review safety check before dispatching.

**Key Components:**

- State reader — resolves active project, reads state.md and artifact frontmatter
- Boundary detector — three-tier logic to classify artifact state
- Review checker — scans reviews/ directory and plan.md Reviews table
- Routing table — workflow-mode-specific phase sequences with post-implementation chain
- Dispatcher — announces target and invokes the skill

**Alternatives Considered:**

- Absorbing oat-project-progress into this skill — rejected because progress serves a different purpose (read-only diagnostic) and merging would complicate both
- Output-only guidance (like progress does) — rejected because the core value proposition is seamless invocation, not recommendation

_Design-related open questions are tracked in the [Open Questions](#open-questions) section below._

## Success Metrics

- User can navigate the entire project lifecycle (discovery through completion) using only `oat-project-next` calls
- No review artifacts are missed during phase transitions
- Zero cases where the router advances past a pending HiLL gate
- The router correctly handles all three workflow modes without the user specifying which mode they're in

## Requirement Index

| ID   | Description                          | Priority | Verification                               | Planned Tasks |
| ---- | ------------------------------------ | -------- | ------------------------------------------ | ------------- |
| FR1  | Read state.md + artifact frontmatter | P0       | manual: verify state reads in all phases   | p01-t02       |
| FR2  | Three-tier boundary detection        | P0       | manual: test complete/substantive/template | p01-t03       |
| FR3  | Workflow-mode-aware routing tables   | P0       | manual: test all three modes               | p01-t04       |
| FR4  | Review safety check before advancing | P0       | manual: test with pending review artifact  | p02-t01       |
| FR5  | Post-implementation routing chain    | P0       | manual: test each post-impl transition     | p02-t02       |
| FR6  | HiLL gate respect                    | P0       | manual: test with configured HiLL gates    | p01-t04       |
| FR7  | Direct skill invocation              | P0       | manual: verify seamless dispatch           | p01-t05       |
| FR8  | Active project resolution            | P0       | manual: test with/without active project   | p01-t02       |
| FR9  | No-project guidance                  | P1       | manual: test with no projects              | p01-t02       |
| NFR1 | Routing announcement before dispatch | P0       | manual: verify announcement format         | p01-t05       |
| NFR2 | Standard OAT skill structure         | P1       | manual: verify frontmatter and structure   | p01-t01       |

## Open Questions

- **Content heuristic:** How exactly should "substantive content" be detected for the three-tier boundary? Options: check for template placeholders like `{Project Name}`, compare file size against template, check for specific section content. Needs design-phase resolution.
- **Review detection mechanism:** Should the review check parse the plan.md Reviews table, scan the `reviews/` directory for non-archived files, or both? Need to define the exact algorithm in design.
- **Post-implementation state signals:** How to detect that summary.md is "done" vs "in progress" — does it use the same `oat_status` frontmatter pattern as other artifacts?

## Assumptions

- Downstream phase skills already handle completing the previous phase as part of their startup (verified for oat-project-design marking spec complete, etc.)
- The Skill tool invocation works correctly when the target skill has `disable-model-invocation: true` — the agent reads and follows the skill content directly
- Existing frontmatter fields provide sufficient signal for all routing decisions without needing new fields
- The plan.md Reviews table is the authoritative source for review status (not just the presence/absence of files in `reviews/`)

## Risks

- **Stale or inconsistent state:** If state.md and artifact frontmatter get out of sync, the router could invoke the wrong skill
  - **Likelihood:** Low
  - **Impact:** Medium (user would need to manually correct via the right skill)
  - **Mitigation:** The three-tier detection reads both state.md AND artifact frontmatter, providing redundancy. If they disagree, the artifact frontmatter (more specific) takes precedence.

- **Skill invocation failure:** If the target skill can't be loaded or found, the user gets stuck
  - **Likelihood:** Low
  - **Impact:** Low (user can fall back to invoking the skill manually)
  - **Mitigation:** Announce the target skill name before invoking, so the user knows what to run manually if needed.

## References

- Discovery: `discovery.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
- Progress skill routing tables: `.claude/skills/oat-project-progress/SKILL.md`
