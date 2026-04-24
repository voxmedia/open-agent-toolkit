---
name: oat-project-design
version: 1.2.0
description: Use when discovery and specification are complete and implementation-ready decisions are needed. Produces detailed technical design artifacts, including architecture and interfaces.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion
---

# Design Phase

Transform specification requirements into a detailed technical design with architecture, components, and implementation strategy.

## Prerequisites

**Required:** Completed discovery (`discovery.md` with `oat_status: complete`). Specification is optional — this skill folds requirements confirmation into its flow and produces `spec.md` as a byproduct (see Step 2). If the user already ran `oat-project-spec` standalone, that spec is reused.

## Principles

- **YAGNI ruthlessly** — remove unnecessary features from all designs.
  If a section drafts a capability the spec doesn't require, cut it.
  If a component boundary is there "in case we need it later", cut it.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ DESIGN
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print step indicators, e.g.:
  - `[1/5] Validating spec + reading context…`
  - `[2/5] Drafting architecture overview…`
  - `[3/5] Designing components + data models…`
  - `[4/5] Reviewing design with user…`
  - `[5/5] Updating state + committing…`

## Process

### Step 0: Resolve Active Project

OAT stores active project context in `.oat/config.local.json` (`activeProject`, local-only).

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

**If `PROJECT_PATH` is missing/invalid:**

- Ask the user for `{project-name}`
- Set `PROJECT_PATH` to `${PROJECTS_ROOT}/{project-name}`
- Write it for future phases:
  ```bash
  mkdir -p .oat
  oat config set activeProject "$PROJECT_PATH"
  ```

**If `PROJECT_PATH` is valid:** derive `{project-name}` as the directory name (basename of the path).

### Step 1: Check Specification Complete

Specification is OPTIONAL in the default workflow. This skill folds requirements confirmation into Step 2 below and produces `spec.md` as a byproduct.

If `"$PROJECT_PATH/spec.md"` already exists (e.g., the user ran the standalone `oat-project-spec` skill first), validate it and reuse it:

```bash
if [ -f "$PROJECT_PATH/spec.md" ]; then
  cat "$PROJECT_PATH/spec.md" | head -10 | grep "oat_status:"
fi
```

**If `spec.md` exists, required frontmatter:**

- `oat_status: complete`
- `oat_ready_for: oat-project-design`

**If `spec.md` exists but is incomplete:** Block and ask user to finish the standalone spec skill first, OR delete the draft and let this skill regenerate it from discovery.

**If `spec.md` does not exist:** That is the default path. Skip to Step 1.5 (mode resolution); Step 2 (Requirements Confirmation) will produce it from `discovery.md`.

### Step 1.5: Resolve Interaction Mode

Resolve whether to run the design phase in Collaborative (section-by-section) or Draft-and-review (full draft up front) mode. Argument precedes env var. Non-interactive context forces draft. Persisted config preference is consulted before prompting the user.

```bash
# 1. Check for explicit override (argument wins over env var — FR1)
DESIGN_MODE="${ARG_MODE:-${OAT_DESIGN_MODE:-}}"

# 2. If no override, check for non-interactive signals before anything else
if [ -z "$DESIGN_MODE" ]; then
  if [ "${OAT_NON_INTERACTIVE:-}" = "1" ] || [ ! -t 0 ]; then
    DESIGN_MODE="draft"
    echo "Non-interactive context detected. Falling back to draft-and-review mode."
  else
    # 3. Consult persisted preference (FR15 / Component 14) before prompting
    CONFIG_MODE=$(oat config get workflow.designMode 2>/dev/null || echo "")
    if [ "$CONFIG_MODE" = "collaborative" ] || [ "$CONFIG_MODE" = "draft" ]; then
      DESIGN_MODE="$CONFIG_MODE"
      echo "Using workflow.designMode = ${DESIGN_MODE} from config."
    else
      # 4. Interactive: prompt via AskUserQuestion
      #    Question: "How would you like to work through the design?"
      #    Multi-choice:
      #      1. Collaborative (recommended) — section-by-section, with one approach
      #         confirmation before drafting
      #      2. Draft-and-review — full draft up front, you review holistically
      # Result populates DESIGN_MODE
      :
    fi
  fi
fi

echo "Running in ${DESIGN_MODE} mode."
```

**Resolution order (FR1 + FR15):**

1. `--mode` argument (`ARG_MODE`)
2. `OAT_DESIGN_MODE` env var
3. `OAT_NON_INTERACTIVE=1` or no TTY → forces `draft`
4. `workflow.designMode` from effective config
5. Interactive prompt (default: Collaborative)

Runtime/context signals always outrank persisted preferences.

### Step 2: Requirements Confirmation (folded spec authoring)

<!--
Requirements-confirmation sub-step.
The authoring logic below duplicates oat-project-spec Steps 6-16.
When updating the requirements-authoring prose, update BOTH files.
-->

**If `spec.md` already exists with `oat_status: complete`** (produced by the optional standalone `oat-project-spec` skill): read it to understand Problem Statement, FRs/NFRs, Constraints, Dependencies, High-Level Design, Success Metrics, Requirement Index. Then skip to Step 2.5 (Approach Reaffirmation).

**Otherwise** (default path — no `spec.md` yet): author `spec.md` inline by formalizing requirements from `discovery.md`, following the steps below (ported from `oat-project-spec` Steps 6-16).

**Step 2a: Read discovery**

Read `"$PROJECT_PATH/discovery.md"` and extract:

- **Initial Request** → Core problem
- **Clarifying Questions** → Context and nuances
- **Key Decisions** → Scope boundaries, FR seeds
- **Success Criteria** → Goals and NFR seeds
- **Constraints** → Constraints section
- **Out of Scope** → Non-Goals

**Step 2b: Initialize spec.md from template**

Copy `.oat/templates/spec.md` → `"$PROJECT_PATH/spec.md"`. Update frontmatter:

```yaml
---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: { today }
oat_generated: false
oat_template: false
---
```

**Step 2c: Draft Problem Statement**

Transform from discovery: Initial Request → Core problem; Clarifying Questions → Context; Key Decisions → Scope boundaries. Write 2-4 paragraphs clearly describing the problem being solved.

**Step 2d: Define Goals and Non-Goals**

**Primary Goals:** Must-have outcomes (from Key Decisions + Success Criteria).
**Secondary Goals:** Nice-to-have outcomes (Success Criteria marked optional).
**Non-Goals:** Copy from discovery "Out of Scope", adding explicit boundaries and related work intentionally excluded.

**Step 2e: Draft Requirements**

Transform Key Decisions and Success Criteria into structured requirements.

**Functional Requirements (FR):**

```markdown
**FR1: {Requirement Name}**

- **Description:** {What the system must do}
- **Acceptance Criteria:**
  - {Testable criterion 1}
  - {Testable criterion 2}
- **Priority:** P0 / P1 / P2
```

**Non-Functional Requirements (NFR):**

```markdown
**NFR1: {Requirement Name}**

- **Description:** {Performance, security, usability requirement}
- **Acceptance Criteria:**
  - {Measurable criterion}
- **Priority:** P0 / P1 / P2
```

**Priorities:**

- **P0:** Must have — blocks launch
- **P1:** Should have — important but not blocking
- **P2:** Nice to have — future enhancement

**Step 2f: Iterate with user (collaborative mode only)**

```
IF DESIGN_MODE == "collaborative":
  Present draft requirements list to user.
  Ask (AskUserQuestion): "Are these requirements complete? Anything missing or unclear?"
  Update spec.md with refinements; update oat_last_updated.
  Repeat until user confirms completeness.

IF DESIGN_MODE == "draft":
  Commit the drafted requirements as part of the one-pass draft.
  The user reviews them holistically at the user-review gate (Step 6).
```

**Focus areas:** Acceptance criteria testable; priorities clear; edge cases covered; dependencies identified.

**Step 2g: Document Constraints and Dependencies**

Copy from discovery "Constraints" and enrich with technical constraints from knowledge base (architecture.md, concerns.md), business/timeline/resource constraints. Identify dependencies: external systems (integrations.md), existing components (architecture.md), third-party libraries, infrastructure.

**Step 2h: Draft High-Level Design in spec.md**

Transform discovery "Options Considered" into design proposal:

```markdown
## High-Level Design (Proposed)

{2-3 paragraph overview of chosen approach}

**Key Components:**

- {Component 1} — {Brief description}

**Alternatives Considered:**

- {Alternative 1} — {Why rejected}

**Open Questions:**

- {Question needing resolution}
```

Keep high-level — detailed design comes in `design.md` below.

**Guardrail:** Do not name specific scripts/files/functions here. Describe components and responsibilities only.

**Step 2i: Define Success Metrics**

Transform "Success Criteria" into measurable metrics (performance, quality, user, business).

**Step 2j: Populate Requirement Index**

Create traceability matrix in spec.md "Requirement Index" section:

| Column        | Content                                       |
| ------------- | --------------------------------------------- |
| ID            | FR1, FR2, NFR1, etc. (sequential)             |
| Description   | Brief 1-sentence summary                      |
| Priority      | P0/P1/P2 from requirement                     |
| Verification  | `method: pointer` — how this will be verified |
| Planned Tasks | Leave as "TBD - see plan.md"                  |

**Verification column format:** `method: pointer` — method is `unit` / `integration` / `e2e` / `manual` / `perf`; pointer is a brief scope hint (e.g., `unit: auth token validation`).

**Step 2k: Quality Gate (merged into Component 6 self-review)**

The prior standalone-spec quality gate (completeness / quality / boundary checks) now merges into Step 5 (Design Self-Review) — those checks run once against both `spec.md` and `design.md` together rather than twice.

**Step 2l: Mark spec.md complete and commit**

Update spec.md frontmatter:

```yaml
oat_status: complete
oat_ready_for: oat-project-design
oat_last_updated: { today }
```

Commit separately (keeps history clean; lets reviewers fetch spec independently):

```bash
git add "$PROJECT_PATH/spec.md"
git commit -m "docs: confirm requirements for {project-name}"
```

### Step 2.5: Approach Reaffirmation (one divergent moment)

This is the sole divergent-thinking moment in the skill. After requirements are confirmed and before drafting begins, reaffirm the approach-level direction. Do this exactly once per run.

```
Read "$PROJECT_PATH/discovery.md" — look for "## Solution Space" section
with a "### Chosen Direction" sub-section.

IF Chosen Direction exists:
  Present to user:
    "Based on discovery, we're designing around [Approach N — one-line summary].
     Confirming this is still the right direction before I draft the design?"
  Use AskUserQuestion:
    1. Yes — proceed with this approach
    2. Revisit — I want to explore alternatives again
  If "Revisit": invoke the 2-3-approaches block below.

IF no Chosen Direction (or Solution Space section absent):
  Invoke the 2-3-approaches pattern inline:

    > Propose 2-3 different approaches with trade-offs.
    > Present options conversationally with your recommendation and reasoning.
    > Lead with your recommended option and explain why.

  Ask user to choose. Document the chosen approach in design.md's
  Overview section before section drafting begins.

Record confirmed approach in design.md §Overview before Step 4 (section iterator).
```

**Key points:**

- One divergent moment per run — not per section. Section-level divergence happens organically when the user pushes back on a drafted section (see Step 4).
- Reaffirmation, not re-derivation: if discovery already chose a direction, confirm and move on.
- The 2-3-approaches block handles the case where discovery skipped solution-space exploration (well-understood request).

### Step 3: Read Knowledge Base for Design Context

Read for architectural context and conventions:

- `.oat/repo/knowledge/project-index.md` - Overview
- `.oat/repo/knowledge/architecture.md` - Existing patterns
- `.oat/repo/knowledge/stack.md` - Technologies available
- `.oat/repo/knowledge/conventions.md` - Code patterns to follow
- `.oat/repo/knowledge/integrations.md` - External services
- `.oat/repo/knowledge/concerns.md` - Issues to avoid

**Purpose:** Ensure design aligns with existing architecture and follows established patterns.

### Step 4: Section Iterator

Draft `design.md` section-by-section (Collaborative mode) or in a single pass (Draft-and-review mode). The section list and per-section templates are shared between both branches.

**Shared section list (in order):**

1. **Overview + Architecture** — System context (how this fits into existing architecture, components it interacts with, boundaries of this change); Key Components (main components, responsibilities, relationships); Data Flow (how data moves through the system, entry/exit points, transformation steps).
2. **Component Design** — For each component: Purpose (single responsibility), Responsibilities (specific tasks), Interfaces (code signatures following `conventions.md`), Dependencies, Design Decisions (why this approach). Follow patterns from `conventions.md`; use `stack.md` technologies.
3. **Data Models** — For each entity/model: Schema (fields, types, validation, storage from `architecture.md`); Considerations (align with existing models; follow naming from `conventions.md`; address NFRs).
4. **API Design** — For each API/interface: Method and path, Request/response schemas, Error handling, Authorization; Considerations (follow API patterns from `architecture.md`; align with `integrations.md`; address security NFRs).
5. **Security Considerations** — Authentication, Authorization, Data protection (encryption, PII), Input validation, Threat mitigation. Reference `conventions.md` and `concerns.md`.
6. **Performance Considerations** — Scalability, Caching, Database optimization, Resource limits. Reference `concerns.md`.
7. **Error Handling** — Error categories and handling, Retry logic, Logging approach (follow `conventions.md`).
8. **Testing Strategy (with Requirement-to-Test Mapping)** —
   - **Step a (Requirement-to-Test Mapping):** Pull from spec.md Requirement Index and expand into a table with `ID | Verification | Key Scenarios`. For each requirement: copy the ID, copy the **method** (left side of `method: pointer`) into Verification, use the **pointer** (right side) to seed Key Scenarios, expand scenarios based on component design decisions, note if multiple test levels apply.
   - **Step b (Test Levels):** Unit tests (scope and coverage target), Integration tests (key scenarios and test environment), E2E tests (critical user paths). Follow `testing.md`.
   - **Why mapping matters:** Every requirement gets a verification plan; feeds `oat-project-plan` task breakdown; prevents untested-requirement gaps.
9. **Deployment Strategy** — Build process (from `stack.md`), Deployment steps, Rollback plan, Configuration, Monitoring and alerts.
10. **Migration Plan** — Database migrations, Data migrations, Breaking changes handling, Rollback strategy. If not applicable, state as a single sentence.
11. **Implementation Phases** — Break work into manageable phases (1-3 days each). Per-phase structure: Goal, Tasks (high-level), Verification.
12. **Risks and Mitigation** — For each significant risk: Probability | Impact; Mitigation; Contingency.

**YAGNI check per section:** If the section would draft a capability `spec.md` doesn't require, cut it. If a component boundary is speculative ("in case we need it later"), cut it.

**Before iterating: Initialize `design.md`**

Copy `.oat/templates/design.md` → `"$PROJECT_PATH/design.md"`. Update frontmatter:

```yaml
---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: { today }
oat_generated: false
oat_template: false
---
```

**Collaborative branch:**

```
IF DESIGN_MODE == "collaborative":
  Read spec.md for requirements context; read knowledge base.
  For SECTION in [
    "Overview + Architecture",
    "Component Design",
    "Data Models",
    "API Design",
    "Security Considerations",
    "Performance Considerations",
    "Error Handling",
    "Testing Strategy (with Requirement-to-Test Mapping)",
    "Deployment Strategy",
    "Migration Plan",
    "Implementation Phases",
    "Risks and Mitigation"
  ]:
    Draft section content from spec.md + knowledge base. Scale each section
      to its complexity: a few sentences if straightforward, up to 200-300
      words if nuanced.
    Not-applicable sections: state as a single sentence, not empty (e.g.,
      "No database migrations required.").

    Present (AskUserQuestion — free-text or multi-choice with refinement):
      "Here's what I have for [section]: [content].
       Does this look right, or should we adjust before continuing?"

    On feedback: revise inline. Be ready to go back and clarify if
      something doesn't make sense. Re-present if substantive.
    Mark section approved. Move to next.

  Track which sections have been approved so re-runs don't redo finalized
  sections. Divergent thinking during sections happens organically in
  response to user feedback — there is no scripted per-section "present
  2-3 options" step (that happened once at Step 2.5 Approach Reaffirmation).
```

**Draft-and-review branch:**

```
IF DESIGN_MODE == "draft":
  Read spec.md for requirements context; read knowledge base.
  Draft all applicable sections in one pass using the same section list
    above. Apply the same "scale each section to its complexity"
    principle. Not-applicable sections get a single-sentence statement.
  Do NOT fire per-section validation prompts — this is a one-pass draft.
  Append a banner to design.md when non-interactive:
    "Ran in draft-and-review mode — no interactive user present.
     Review manually before plan generation." (FR9 — applies when the
    mode was selected via non-interactive fallback, not when the user
    explicitly chose draft mode interactively.)
  Write the complete design.md.
  Continue to Step 5 (Self-Review) and Step 6 (User-Review Gate).
  The user-review gate is the sole point of user interaction in draft mode.
```

### Step 5: Design Self-Review

Silent agent-side quality pass — no user prompt fires here. After all sections are drafted (in either mode), look at `design.md` and `spec.md` with fresh eyes and run four named checks. Fix issues inline; do not recurse on self-review.

1. **Placeholder scan** — Search `design.md` and `spec.md` for `TBD`, `TODO`, `FIXME`, `...`, and placeholder sections that just say "Not applicable" without elaboration. Fix inline.
2. **Internal consistency** — Does the architecture description match the component design? Do the API request/response shapes match the data models? Does the testing strategy cover the requirements? Fix inline.
3. **Scope check** — Did the design grow beyond what discovery scoped? If out-of-scope items crept in, move them to discovery.md "Deferred Ideas". If genuine multi-subsystem scope surfaces, escalate to the user — they may want to split into multiple projects (follow-up split-escape-hatch work, not this skill's responsibility).
4. **Ambiguity check** — Could any requirement or design statement be interpreted two ways? Pick one and make it explicit.

Apply fixes inline. Do not re-run self-review. Continue to Step 6 (User-Review Gate).

### Step 19: Human-in-the-Loop Lifecycle (HiLL) Gate (If Configured)

Read `"$PROJECT_PATH/state.md"` frontmatter:

- `oat_hill_checkpoints`
- `oat_hill_completed`

If `"design"` is in `oat_hill_checkpoints`, require explicit user approval before advancing.

**Approval prompt (required):**

- "Design artifact is ready. Approve design and unlock `oat-project-plan`?"

**Optional independent review path:**

- If user wants fresh-context artifact review first, run:
  - `oat-project-review-provide artifact design`

**If user does not approve yet:**

- Keep design frontmatter as:
  - `oat_status: in_progress`
  - `oat_ready_for: null`
- Keep project state as in-progress for design.
- Do **not** append `"design"` to `oat_hill_completed`.
- Stop and report: "Design draft saved; awaiting HiLL approval."

If design is not configured as a HiLL checkpoint, or user explicitly approves, continue to Step 20.

### Step 20: Mark Design Complete

Update frontmatter:

```yaml
---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: { today }
---
```

### Step 21: Update Project State

Update `"$PROJECT_PATH/state.md"`:

**Frontmatter updates:**

- `oat_current_task: null`
- `oat_last_commit: {commit_sha_from_step_22}`
- `oat_blockers: []`
- `oat_phase: design`
- `oat_phase_status: complete`
- `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`
- **If** `"design"` is in `oat_hill_checkpoints`: append `"design"` to `oat_hill_completed` array

**Note:** Only append to `oat_hill_completed` when the phase is configured as a HiLL gate.

Update content:

```markdown
## Current Phase

Design - Ready for implementation planning

## Progress

- ✓ Discovery complete
- ✓ Specification complete
- ✓ Design complete
- ⧗ Awaiting implementation plan
```

### Step 22: Commit Design

**Note:** This shows what users will do when USING oat-project-design.
During implementation of OAT itself, use standard commit format.

```bash
git add "$PROJECT_PATH/"
git commit -m "docs: complete design for {project-name}

Architecture:
- {N} components
- {Key architectural decision}

Implementation:
- {N} phases planned
- {Estimated complexity}

Ready for implementation planning"
```

### Step 23: Output Summary

```
Design phase complete for {project-name}.

Architecture:
- {N} components defined
- {N} data models specified
- {N} API endpoints designed

Next: Create implementation plan with the oat-project-plan skill
```

## Success Criteria

- Architecture aligns with existing patterns (from architecture.md)
- Components follow conventions (from conventions.md)
- All functional requirements addressed
- All non-functional requirements addressed
- Testing strategy covers success metrics
- Implementation phases are clear and manageable
- Risks identified with mitigation strategies
- User confirmed design is complete
