---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-03-29
oat_generated: false
---

# Design: oat-project-next

## Overview

`oat-project-next` is a single OAT skill file that acts as a stateful router for the project lifecycle. It reads project state from `state.md` frontmatter and per-phase artifact frontmatter, applies a three-tier boundary detection algorithm to determine whether the project is mid-phase or at a transition point, checks for unprocessed review artifacts, and then directly invokes the appropriate next skill.

The skill is purely a reader and dispatcher — it never mutates project state. All state mutations are handled by the target skill it invokes. This keeps the router simple and avoids duplication of state-management logic already present in each lifecycle skill.

The design resolves the three open questions from the spec: (1) content heuristic uses `oat_template: true` frontmatter as the primary signal with `{placeholder}` pattern as fallback, (2) review detection checks both the `reviews/` directory and plan.md Reviews table, and (3) summary.md uses the same `oat_status` frontmatter pattern as other artifacts.

## Architecture

### System Context

This skill fits into the OAT workflow artifact layer alongside `oat-project-progress`. While progress is a read-only diagnostic that outputs a status report and recommendation, `oat-project-next` reads the same state and then dispatches to the recommended skill directly.

**Key Components:**

- **State Reader:** Resolves active project, reads state.md frontmatter and the current phase's artifact frontmatter
- **Boundary Detector:** Three-tier algorithm that classifies whether an artifact is complete, substantive, or still a template
- **Review Checker:** Scans for unprocessed review artifacts that should be addressed before advancing
- **Phase Router:** Workflow-mode-specific routing tables that map current state to target skill
- **Post-Implementation Router:** Specialized routing for the review → summary → PR → complete chain
- **Dispatcher:** Announces the routing decision and invokes the target skill

### Component Diagram

```
User calls oat-project-next
        │
        ▼
┌─────────────────┐
│  State Reader    │──reads──▶ .oat/config.local.json (activeProject)
│                  │──reads──▶ {project}/state.md (phase, status, mode, HiLL, blockers)
│                  │──reads──▶ {project}/{artifact}.md (oat_status, oat_ready_for)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Boundary Detector│  Classifies: complete / substantive / template
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Review Checker   │──scans──▶ {project}/reviews/ (non-archived files)
│                  │──reads──▶ {project}/plan.md (Reviews table)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Phase Router     │  Routes based on workflow mode + phase + boundary tier
│ (or Post-Impl   │  Respects HiLL gates and execution mode
│  Router)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Dispatcher       │  Announces target (+ blocker warning) → Invokes skill
└─────────────────┘
```

Note: This diagram shows execution order. The Data Flow section below defines the same sequence with numbered steps.

### Data Flow

1. Read `activeProject` from `.oat/config.local.json` → resolve `PROJECT_PATH`
2. Read `state.md` frontmatter → extract `oat_phase`, `oat_phase_status`, `oat_workflow_mode`, `oat_execution_mode`, `oat_hill_checkpoints`, `oat_hill_completed`, `oat_blockers`
3. Map `oat_phase` to artifact file (`discovery` → `discovery.md`, `spec` → `spec.md`, etc.)
4. Read artifact frontmatter → extract `oat_status`, `oat_ready_for`, `oat_template`
5. Apply boundary detection: tier 1/1b (complete) / tier 2 (substantive) / tier 3 (template)
6. Apply HiLL gate check
7. Scan `reviews/` directory for non-archived review files; cross-reference plan.md Reviews table
8. Apply review safety check (if unprocessed reviews, override routing target)
9. Lookup target skill from routing table
10. Announce (with blocker warning if applicable) and invoke target skill

## Component Design

### State Reader

**Purpose:** Resolve the active project and extract all state needed for routing decisions.

**Responsibilities:**

- Resolve `activeProject` from `.oat/config.local.json`
- Validate the project path exists
- Read `state.md` frontmatter fields
- Map the current phase to its artifact file and read that artifact's frontmatter

**Input State Fields (from state.md):**

| Field                  | Values                                             | Used For                                           |
| ---------------------- | -------------------------------------------------- | -------------------------------------------------- |
| `oat_phase`            | `discovery`, `spec`, `design`, `plan`, `implement` | Determine current lifecycle position               |
| `oat_phase_status`     | `in_progress`, `complete`, `pr_open`               | Determine if phase is done                         |
| `oat_workflow_mode`    | `spec-driven`, `quick`, `import`                   | Select routing table                               |
| `oat_execution_mode`   | `single-thread`, `subagent-driven`                 | Route to correct implementation skill              |
| `oat_hill_checkpoints` | Array of phase names                               | Check if current phase has a gate                  |
| `oat_hill_completed`   | Array of phase names                               | Check if gate has been passed                      |
| `oat_blockers`         | Array of strings                                   | Warn user if non-empty (informational, not a gate) |

**Input State Fields (from artifact):**

| Field           | Values                     | Used For                          |
| --------------- | -------------------------- | --------------------------------- |
| `oat_status`    | `in_progress`, `complete`  | Tier 1 detection                  |
| `oat_ready_for` | Skill name or `null`       | Direct routing target             |
| `oat_template`  | `true`, `false`, or absent | Tier 3 detection (primary signal) |

**Phase-to-Artifact Mapping:**

| Phase       | Artifact File       |
| ----------- | ------------------- |
| `discovery` | `discovery.md`      |
| `spec`      | `spec.md`           |
| `design`    | `design.md`         |
| `plan`      | `plan.md`           |
| `implement` | `implementation.md` |

**Error Cases:**

- No active project AND no projects exist in projects root → report error, suggest `oat-project-new`, `oat-project-quick-start`, or `oat-project-import-plan`
- No active project BUT projects exist in projects root → report error, suggest `oat-project-open` to select one
- Project path doesn't exist → report error
- `state.md` missing or unreadable → report error, suggest running the previous phase skill
- Artifact file missing → treat as template (tier 3)

### Boundary Detector

**Purpose:** Classify the current phase's artifact into one of three tiers to decide whether to resume or advance.

**Algorithm:**

```
Tier 1 (Complete with target):
  IF artifact oat_status == "complete" AND oat_ready_for is not null
  THEN → use oat_ready_for as target skill

Tier 1b (Complete without target):
  IF artifact oat_status == "complete" AND oat_ready_for is null
  THEN → route to the NEXT phase's skill (treat as Tier 2)
  Note: This handles the edge case where a phase skill completed the artifact
  but didn't set oat_ready_for. The artifact IS complete, so advance.

Tier 2 (Substantive):
  IF artifact oat_status == "in_progress"
  AND artifact oat_template != true (or field is absent/false)
  AND artifact does NOT contain template placeholder patterns (fallback check)
  THEN → route to the NEXT phase's skill (not the current one)

Tier 3 (Template/Empty):
  IF artifact oat_template == true
  OR artifact contains template placeholders like "{Project Name}", "{Copy of user's initial request}"
  OR artifact file does not exist
  THEN → route to the CURRENT phase's skill (resume)
```

**Content Heuristic Detail (resolves Open Question from spec):**

The primary signal is the `oat_template` frontmatter field:

- Templates copied from `.oat/templates/` include `oat_template: true`
- When a phase skill starts working on an artifact, it sets `oat_template: false` (or removes the field)
- This is a reliable, machine-readable signal that doesn't require content parsing

**Fallback heuristic** (if `oat_template` field is missing or unreliable):

- Check if the artifact title still contains `{Project Name}` (template placeholder pattern)
- Check if the "Initial Request" or "Problem Statement" section contains `{Copy of` or `{Clear description` placeholders
- If any template placeholder patterns are found, classify as tier 3

**Design Decision:** Using `oat_template` as the primary signal is preferred over content parsing because it's deterministic, fast, and doesn't break if artifact content happens to contain curly braces for other reasons. The fallback handles edge cases where the field is missing (e.g., artifacts created before this convention existed).

### Review Checker

**Purpose:** Detect unprocessed review artifacts that must be addressed before advancing to the next phase.

**Algorithm (resolves Open Question from spec):**

Use **both** signals — directory scan plus Reviews table — for robustness:

```
Step 1: Scan reviews/ directory
  - List files in {PROJECT_PATH}/reviews/ (exclude archived/ subdirectory)
  - If no files found → no pending reviews, continue routing

Step 2: Cross-reference plan.md Reviews table
  - Parse the Reviews table from plan.md (if it exists)
  - For each review file found in Step 1:
    - Look up its status in the Reviews table
    - Status "passed" → considered processed (review completed successfully)
    - Status "fixes_added" or "fixes_completed" → considered processed (review-receive already converted findings to tasks)
    - Any other status (blank, "pending", "in_progress") → UNPROCESSED
    - File exists in reviews/ but has NO entry in Reviews table → UNPROCESSED

Step 3: Route decision
  - If any unprocessed reviews exist → route to oat-project-review-receive
  - Otherwise → continue normal routing
```

**Design Decision (dual-signal approach):** Using both directory presence AND table status prevents two failure modes: (1) a review file exists but isn't tracked in plan.md (directory-only would catch it), and (2) a review is tracked but the file was moved/renamed (table status still catches it). The combination is more resilient than either signal alone.

**Design Decision (expanded processed statuses):** The spec (FR4) defines only `passed` as processed. This design expands "processed" to include `fixes_added` and `fixes_completed` because once `review-receive` has converted findings to plan tasks (`fixes_added`) or those tasks are implemented (`fixes_completed`), re-invoking `review-receive` would be redundant — the findings have already been actioned. Only reviews in `pending`, `received`, or `in_progress` states need processing. Note: `deferred` was removed from processed statuses because it is not part of the canonical plan.md Reviews table status flow (`pending → received → fixes_added → fixes_completed → passed`). Individual findings may be deferred within `implementation.md`, but the Reviews table row status follows the canonical flow.

### Phase Router

**Purpose:** Map current state to target skill based on workflow mode.

**Routing Tables:**

**Spec-Driven Mode:**

| Current Phase | Phase Status | Boundary Tier        | Target Skill                 |
| ------------- | ------------ | -------------------- | ---------------------------- |
| discovery     | in_progress  | tier 3 (template)    | `oat-project-discover`       |
| discovery     | in_progress  | tier 2 (substantive) | `oat-project-spec`           |
| discovery     | complete     | tier 1               | `oat-project-spec`           |
| spec          | in_progress  | tier 3               | `oat-project-spec`           |
| spec          | in_progress  | tier 2               | `oat-project-design`         |
| spec          | complete     | tier 1               | `oat-project-design`         |
| design        | in_progress  | tier 3               | `oat-project-design`         |
| design        | in_progress  | tier 2               | `oat-project-plan`           |
| design        | complete     | tier 1               | `oat-project-plan`           |
| plan          | in_progress  | tier 3               | `oat-project-plan`           |
| plan          | in_progress  | tier 2               | `oat-project-implement` \*   |
| plan          | complete     | tier 1               | `oat-project-implement` \*   |
| implement     | in_progress  | —                    | `oat-project-implement` \*   |
| implement     | complete     | —                    | → Post-Implementation Router |
| implement     | pr_open      | —                    | → Post-Implementation Router |

\* When `oat_execution_mode: subagent-driven`, use `oat-project-subagent-implement` instead.

**Quick Mode:**

| Current Phase | Phase Status | Boundary Tier | Target Skill                 |
| ------------- | ------------ | ------------- | ---------------------------- |
| discovery     | in_progress  | tier 3        | `oat-project-discover`       |
| discovery     | in_progress  | tier 2        | `oat-project-plan`           |
| discovery     | complete     | tier 1        | `oat-project-plan`           |
| plan          | in_progress  | tier 3        | `oat-project-plan`           |
| plan          | in_progress  | tier 2        | `oat-project-implement` \*   |
| plan          | complete     | tier 1        | `oat-project-implement` \*   |
| implement     | in_progress  | —             | `oat-project-implement` \*   |
| implement     | complete     | —             | → Post-Implementation Router |
| implement     | pr_open      | —             | → Post-Implementation Router |

**Import Mode:**

| Current Phase | Phase Status | Boundary Tier | Target Skill                 |
| ------------- | ------------ | ------------- | ---------------------------- |
| plan          | in_progress  | tier 3        | `oat-project-import-plan`    |
| plan          | in_progress  | tier 2        | `oat-project-implement` \*   |
| plan          | complete     | tier 1        | `oat-project-implement` \*   |
| implement     | in_progress  | —             | `oat-project-implement` \*   |
| implement     | complete     | —             | → Post-Implementation Router |
| implement     | pr_open      | —             | → Post-Implementation Router |

**Behavioral Divergence from oat-project-progress:**

The `oat-project-progress` skill always recommends "Continue current phase skill" when `oat_phase_status: in_progress`, regardless of artifact content. This design's Tier 2 instead routes to the **next** phase's skill when the artifact has substantive content. This divergence is intentional — it avoids the "double-tap" problem described in discovery Q2, where calling `next` at a phase boundary would re-enter the current phase to ask "any more feedback?" before the user could advance. Since progress is read-only (diagnostic) and next is action-oriented (dispatch), a user running progress then next may see contradictory guidance for Tier 2 states: progress says "continue spec" while next invokes design. This is expected and by design.

**HiLL Gate Override (applied before table lookup):**

If `oat_phase` is in `oat_hill_checkpoints` AND NOT in `oat_hill_completed`:
→ Route to the current phase's skill regardless of boundary tier or phase status.
→ The phase skill will present the HiLL approval prompt.

**Phase-to-Skill Mapping (for HiLL override):**

| Phase     | Skill                  |
| --------- | ---------------------- |
| discovery | `oat-project-discover` |
| spec      | `oat-project-spec`     |
| design    | `oat-project-design`   |
| plan      | `oat-project-plan`     |

### Post-Implementation Router

**Purpose:** Route through the post-implementation chain based on current state signals.

**Decision Tree:**

```
Entry: oat_phase == "implement" AND (oat_phase_status == "complete" OR "pr_open")

1. Check for incomplete revision tasks:
   - Grep plan.md for p-revN phases
   - If any p-revN tasks exist with status != completed in implementation.md
   → Route to oat-project-implement (or subagent variant)
   → Announce: "Revision tasks pending — continuing implementation"

2. Check for unprocessed reviews (Review Checker):
   → If unprocessed reviews exist
   → Route to oat-project-review-receive
   → Announce: "Unprocessed review feedback detected"

3. Check if final code review has passed:
   - Parse plan.md Reviews table for a row with Scope="final" and Type="code"
   - If no such row exists, OR row exists with Status="pending"
   → Route to oat-project-review-provide (with scope hint: "code final")
   → Announce: "Implementation complete — triggering final code review"
   - If row exists with Status != "passed" (e.g., "fixes_added", "fixes_completed")
   → Route to oat-project-review-receive (review cycle not yet complete)
   → Announce: "Final review in progress — continuing review cycle"

4. Check if summary exists:
   - Read {PROJECT_PATH}/summary.md
   - If file doesn't exist OR oat_status != "complete"
   → Route to oat-project-summary
   → Announce: "Final review passed — generating project summary"

5. Check if PR has been created:
   - If oat_phase_status != "pr_open"
   → Route to oat-project-pr-final
   → Announce: "Summary complete — creating final PR"

6. If oat_phase_status == "pr_open":
   → Route to oat-project-complete
   → Announce: "PR is open — ready to complete project"
```

**Design Decision:** The post-implementation chain is ordered to catch the most common "forgot to do this" case first (incomplete revisions), then review feedback, then proceeds through the happy path. Each step checks a concrete state signal rather than relying on ordering alone.

### Dispatcher

**Purpose:** Announce the routing decision and invoke the target skill.

**Announcement Format:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ NEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: {project-name}
Current: {oat_phase} ({oat_phase_status}) — {boundary tier description}
Routing: → {target-skill-name}
Reason: {one-line explanation}

Invoking {target-skill-name}…
```

**Blocker Warning (if applicable):**

If `oat_blockers` is non-empty, include a warning line in the announcement before dispatching:

```
⚠️  Blockers: {blocker descriptions}
```

The router still dispatches (blockers are informational, not gates), but the user should be aware.

**Invocation Method:**

The skill instructs the agent to invoke the target skill using the Skill tool. Since most lifecycle skills have `disable-model-invocation: true`, the Skill tool will load the skill content and the agent follows it directly. This is the standard behavior — no special handling needed.

## Data Models

### State Read Model (No Mutation)

The skill reads but never writes these data structures. All structures are existing — no new fields are introduced.

**state.md frontmatter (YAML):**

```yaml
oat_phase: string # discovery | spec | design | plan | implement
oat_phase_status: string # in_progress | complete | pr_open
oat_workflow_mode: string # spec-driven | quick | import
oat_execution_mode: string # single-thread | subagent-driven
oat_hill_checkpoints: string[] # e.g., ["discovery", "spec"]
oat_hill_completed: string[] # e.g., ["discovery"]
oat_blockers: string[] # Informational warnings, not routing gates
```

**Artifact frontmatter (YAML):**

```yaml
oat_status: string # in_progress | complete
oat_ready_for: string # skill name or null
oat_template: boolean # true if still a template (primary tier 3 signal)
```

**summary.md frontmatter (YAML):**

```yaml
oat_status: string # in_progress | complete
oat_template: boolean # true if still a template
```

**plan.md Reviews table (Markdown):**

```markdown
| Scope | Type | Status | Date | Artifact |
```

Status values: `pending`, `received`, `fixes_added`, `fixes_completed`, `passed`

## Error Handling

### Error Cases

- **No active project, no projects exist:** Display message suggesting `oat-project-new`, `oat-project-quick-start`, or `oat-project-import-plan`. Do not attempt routing.
- **No active project, projects exist:** Display message suggesting `oat-project-open` to select an existing project. Do not attempt routing.
- **Project path missing:** Display error with the path that was expected. Suggest re-running `oat-project-new`.
- **state.md unreadable:** Display error. Suggest running the relevant phase skill directly.
- **Artifact file missing:** Treat as tier 3 (template) — route to the current phase skill, which will create the artifact.
- **Unknown phase/status combination:** Display the raw state values and suggest running `oat-project-progress` for a full diagnostic.

No retry logic needed — each error case has a clear recovery path for the user.

## Testing Strategy

### Requirement-to-Test Mapping

| ID   | Verification | Key Scenarios                                                                                                                                         |
| ---- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1  | manual       | Verify state reads with spec-driven, quick, and import mode projects at various phases                                                                |
| FR2  | manual       | Test with artifact in each tier: complete+ready_for set, in_progress with real content and oat_template:false, in_progress with template placeholders |
| FR3  | manual       | Run next at each phase boundary for all three workflow modes; verify correct target skill                                                             |
| FR4  | manual       | Create a review file in reviews/, verify next routes to review-receive; verify it skips when review status is passed                                  |
| FR5  | manual       | Test each post-impl transition: implement complete → review, review passed → summary, summary complete → pr-final, pr_open → complete                 |
| FR6  | manual       | Configure HiLL checkpoint on a phase, verify next routes to current phase skill instead of advancing                                                  |
| FR7  | manual       | Verify skill invocation loads the target skill and agent proceeds to follow it                                                                        |
| FR8  | manual       | Test with no activeProject set, with invalid path, and with valid project                                                                             |
| FR9  | manual       | Test with no projects in projects root directory                                                                                                      |
| NFR1 | manual       | Verify announcement format matches the 4-line template                                                                                                |
| NFR2 | manual       | Verify skill frontmatter, structure, and progress indicators match OAT conventions                                                                    |

### Manual Test Scenarios

Since this is a skill file (not code), verification is through manual testing against real or synthetic project states. If the routing logic is ever extracted into a testable module, fixture-based automation could create temp project directories with specific state.md frontmatter and verify announced targets.

**Scenario Group 1: Phase Boundaries (Spec-Driven)**

- Project at discovery complete → should route to spec
- Project at spec with substantive content → should route to design
- Project at design complete → should route to plan
- Project at plan complete → should route to implement

**Scenario Group 2: Mid-Phase Resume**

- Project at discovery with template artifact → should route to discover (resume)
- Project at implement in_progress → should route to implement (continue)

**Scenario Group 3: Post-Implementation Chain**

- Implement complete, no final review → should route to review-provide
- Final review passed, no summary → should route to summary
- Summary complete, no PR → should route to pr-final
- PR open → should route to complete

**Scenario Group 4: Safety Checks**

- Unprocessed review in reviews/ → should route to review-receive
- HiLL gate pending on spec → should route to spec (not design)

## Implementation Phases

### Phase 1: Core Skill File

**Goal:** Create the `oat-project-next` skill file with the full routing algorithm covering pre-implementation phases for all three workflow modes.

**Tasks:**

- Create skill file with standard frontmatter
- Implement state reader (active project resolution, state.md parsing, artifact frontmatter parsing)
- Implement boundary detector (three-tier algorithm)
- Implement phase router with all three workflow-mode routing tables
- Implement HiLL gate override logic
- Implement dispatcher with announcement format
- Register skill in `.agents/skills/oat-project-next/SKILL.md` (canonical location), then run `oat sync --scope all` to generate provider-linked views

**Verification:** Run the skill against a project at various phase boundaries and verify correct routing.

### Phase 2: Review Safety Check + Post-Implementation Router

**Goal:** Add the review artifact checker and the post-implementation routing chain.

**Tasks:**

- Implement review checker (directory scan + plan.md Reviews table parsing)
- Implement post-implementation decision tree (revision check → review check → final review → summary → PR → complete)
- Integrate review safety check into the main routing flow (runs before every phase transition)

**Verification:** Create a project with review artifacts and verify the safety check catches them. Walk through the full post-implementation chain.

## Dependencies

### Internal Dependencies

- **All existing lifecycle skills:** The router dispatches to these — they must exist and follow the current frontmatter conventions
- **state.md frontmatter schema:** The router depends on the existing fields; no new fields needed
- **Per-artifact frontmatter schema:** The router reads `oat_status`, `oat_ready_for`, and `oat_template`
- **plan.md Reviews table format:** The router parses this table for review status

### Development Dependencies

- **Skill registration in `.agents/skills/` (canonical):** Author the skill in `.agents/skills/oat-project-next/SKILL.md`. Run `oat sync --scope all` to propagate provider-linked views (e.g., `.claude/skills/`). Do not manually duplicate into provider directories.

## Risks and Mitigation

- **State inconsistency:** Low probability | Medium impact
  - **Mitigation:** The three-tier detection reads both state.md and artifact frontmatter; if they disagree, artifact frontmatter (more specific) takes precedence
  - **Contingency:** User can always invoke the target skill directly, bypassing the router

- **oat_template field missing on older artifacts:** Medium probability | Low impact
  - **Mitigation:** Fallback to `{placeholder}` pattern detection when `oat_template` field is absent
  - **Contingency:** Worst case, the router routes to the current phase skill (resume), which is a safe default

- **Post-implementation state ambiguity:** Low probability | Low impact
  - **Mitigation:** The post-implementation router checks concrete state signals in priority order
  - **Contingency:** If routing is wrong, the invoked skill will detect the mismatch and report it

## References

- Specification: `spec.md`
- Discovery: `discovery.md`
- Progress skill (routing tables reference): `.agents/skills/oat-project-progress/SKILL.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
- Architecture: `.oat/repo/knowledge/architecture.md`
- Conventions: `.oat/repo/knowledge/conventions.md`
