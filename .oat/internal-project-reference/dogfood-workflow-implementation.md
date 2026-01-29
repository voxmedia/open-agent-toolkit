# OAT Dogfood Workflow Implementation

> Comprehensive documentation of the Open Agent Toolkit (OAT) workflow system implementation for deep understanding review.

**Implementation Date:** January 2026
**PR:** https://github.com/tkstang/open-agent-toolkit/pull/1
**Commits:** 40 commits, 5,626 lines added

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Source of Truth](#source-of-truth)
3. [Contracts](#contracts)
4. [System Architecture](#system-architecture)
5. [Workflow Phases](#workflow-phases)
6. [Skills Reference](#skills-reference)
7. [Templates Reference](#templates-reference)
8. [State Management](#state-management)
9. [Human-in-the-Loop (HiL) System](#human-in-the-loop-hil-system)
10. [Traceability System](#traceability-system)
11. [Key Design Decisions](#key-design-decisions)
12. [Directory Structure](#directory-structure)
13. [Usage Guide](#usage-guide)

---

## Executive Summary

The Open Agent Toolkit (OAT) is a structured workflow system for AI-assisted software development. It enforces a disciplined approach through:

- **Knowledge-first enforcement** - Requires codebase analysis before starting work
- **Phased workflow** - Discovery → Spec → Design → Plan → Implement
- **Human-in-the-loop gates** - Configurable checkpoints for review and approval
- **TDD discipline** - Red-green-refactor pattern in implementation
- **Full traceability** - Requirements linked to tasks linked to commits

### Implementation Scope

This implementation delivered:
- **7 skills** - oat-index, oat-progress, oat-discovery, oat-spec, oat-design, oat-plan, oat-implement
- **8 templates** - state.md, discovery.md, spec.md, design.md, plan.md, implementation.md, plus knowledge templates
- **State management** - YAML frontmatter-based workflow state tracking
- **Two HiL systems** - Workflow gates and plan phase checkpoints
- **Traceability infrastructure** - Stable task IDs linking requirements to implementation

---

## Source of Truth

| Artifact | Location | Purpose |
|----------|----------|---------|
| Skills | `.agent/skills/*/SKILL.md` | Skill definitions with mode assertions and process steps |
| Templates | `.oat/templates/*.md` | Document templates copied to projects |
| Scripts | `.oat/scripts/*` | Utility scripts (e.g., thin index generation) |
| Skill Registry | `AGENTS.md` | Skills registered for tool discovery |
| Router Contract | `state.md` frontmatter | Fields used by oat-progress for routing |
| Knowledge Contract | `project-index.md` frontmatter | Fields for staleness detection |

### Skill Registration and Discovery

Skills are registered in `AGENTS.md` so tools can load them. They can be invoked:

- **Via slash command:** `/oat:discovery`, `/oat:plan`, etc. (Claude Code, Cursor)
- **Via CLI:** `npx openskills read oat-discovery`, `npx openskills read oat-plan`

---

## Contracts

### state.md Required Fields

| Field | Type | Purpose |
|-------|------|---------|
| `oat_phase` | string | Current phase: discovery \| spec \| design \| plan \| implement |
| `oat_phase_status` | string | Status: in_progress \| complete |
| `oat_hil_checkpoints` | array | Configured HiL gates (e.g., `["discovery", "spec"]`) |
| `oat_hil_completed` | array | HiL gates passed |
| `oat_blockers` | array | Current blockers |
| `oat_current_task` | string\|null | Reserved for router display (not actively updated per-task; see implementation.md's `oat_current_task_id`) |
| `oat_last_commit` | string\|null | Last commit SHA |
| `oat_parallel_execution` | boolean | Whether parallel execution is enabled |

### plan.md Required Fields

| Field | Type | Purpose |
|-------|------|---------|
| `oat_status` | string | Document status: in_progress \| complete |
| `oat_ready_for` | string\|null | Next skill (e.g., `oat-implement`) |
| `oat_plan_hil_phases` | array | Which plan phases require HiL (empty = all) |

### implementation.md Required Fields

| Field | Type | Purpose |
|-------|------|---------|
| `oat_status` | string | Document status: in_progress \| complete |
| `oat_current_task_id` | string | Current task being executed (e.g., `p01-t03`) |
| `oat_blockers` | array | Task-level blockers |

### project-index.md Required Fields (Knowledge)

| Field | Type | Purpose |
|-------|------|---------|
| `oat_generated` | boolean | Whether file was generated |
| `oat_generated_at` | string | Generation date (YYYY-MM-DD) |
| `oat_source_head_sha` | string | Git HEAD SHA at generation |
| `oat_source_main_merge_base_sha` | string | Merge base SHA for diff checks |
| `oat_index_type` | string | `thin` or `full` |

### Task ID Format

**Format:** `p{NN}-t{NN}` (e.g., `p01-t03` = Phase 1, Task 3)

Used in:
- plan.md task headers
- implementation.md task tracking
- Commit messages (scope position)
- spec.md Requirement Index

---

## System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OAT Workflow                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  /oat:index → /oat:discovery → /oat:spec → /oat:design → /oat:plan → /oat:implement
│       │              │             │            │            │            │
│       ▼              ▼             ▼            ▼            ▼            ▼
│  .oat/knowledge/  discovery.md  spec.md    design.md    plan.md    implementation.md
│                                                                             │
│  ◄──────────────────── /oat:progress (Router) ─────────────────────────►   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Concepts

#### 1. Knowledge-First Enforcement

The system requires codebase knowledge generation before any project work begins. The `/oat:index` skill generates knowledge in two stages:

**Stage 1: Thin Index (Deterministic)**
- Generated via `generate-thin-index.sh`
- Contains: package manager, scripts, entry points, project structure, config files
- Fast, reliable, script-based extraction
- Output: `.oat/knowledge/repo/project-index.md` with `oat_index_type: thin`

**Stage 2: Enrichment (Mapper-Dependent)**
- Parallel mapper agents analyze entrypoints
- Synthesizes: architecture, conventions, stack, testing patterns
- Depends on mapper completion
- Outputs: `stack.md`, `architecture.md`, `structure.md`, `integrations.md`, `testing.md`, `conventions.md`, `concerns.md`

**Note:** The thin index is always available; enrichment files are created as mappers complete and synthesis runs.

#### 2. Mode Assertions

Each phase declares explicit boundaries through Mode Assertions:

```markdown
**OAT MODE: {Phase Name}**

**Purpose:** {What this phase accomplishes}

**BLOCKED Activities:**
- {Things explicitly forbidden}

**ALLOWED Activities:**
- {Things explicitly permitted}

**Self-Correction Protocol:**
If you catch yourself:
- {Deviation} → STOP ({action})

**Recovery:**
1. Acknowledge the deviation
2. Return to {proper activity}
3. Document in {relevant file}
```

Mode Assertions prevent scope creep and ensure each phase stays focused on its purpose.

#### 3. Document-Driven State

State is tracked in document frontmatter across two types:

**Project State (state.md):**
```yaml
---
oat_phase: discovery
oat_phase_status: in_progress
oat_hil_checkpoints: ["discovery", "spec", "design"]
oat_hil_completed: []
oat_blockers: []
oat_current_task: null
oat_last_commit: null
oat_parallel_execution: false
---
```

**Phase Documents (discovery.md, spec.md, etc.):**
```yaml
---
oat_status: in_progress | complete
oat_ready_for: oat-{next-phase} | null
oat_blockers: []
oat_last_updated: YYYY-MM-DD
---
```

This separation enables:
- **Resumability** - Work can be resumed after session breaks
- **Visibility** - Progress is human-readable
- **Routing** - `/oat:progress` reads state.md for next steps
- **Phase Isolation** - Each phase document tracks its own completion

---

## Workflow Phases

### Phase 1: Knowledge Generation (`/oat:index`)

**Purpose:** Generate comprehensive codebase analysis.

**Process:**
1. Run `generate-thin-index.sh` to create deterministic thin index
2. Identify entrypoints (main files, API endpoints, CLI commands)
3. Launch parallel mapper agents to analyze each entrypoint
4. Synthesize results into enrichment files
5. Update project-index.md with full overview

**Output Location:** `.oat/knowledge/repo/`

**Key Files:**
- `project-index.md` - Main knowledge index (thin initially, enriched after mappers)
- `entrypoints/*.md` - Individual entrypoint analyses (after mapper completion)
- `stack.md` - Technology stack (after synthesis)
- `architecture.md` - System design and patterns (after synthesis)
- `structure.md` - Directory layout (after synthesis)
- `integrations.md` - External services (after synthesis)
- `testing.md` - Test structure and practices (after synthesis)
- `conventions.md` - Code style and patterns (after synthesis)
- `concerns.md` - Technical debt and issues (after synthesis)

**Staleness Detection:**
- Age check: Warns if knowledge >7 days old (from `oat_generated_at`)
- Git diff check: Warns if >20 files changed since `oat_source_main_merge_base_sha` (merge base)

### Phase 2: Discovery (`/oat:discovery`)

**Purpose:** Gather requirements through structured dialogue. Understand the problem, explore constraints, and capture decisions.

**Process:**
1. Create project directory: `.agent/projects/{project-name}/`
2. Initialize state.md from template
3. Conduct structured Q&A with user
4. Capture requirements, constraints, and decisions
5. Document open questions and assumptions

**Mode Assertion:**
```
BLOCKED: Implementation, design decisions, architecture planning
ALLOWED: Questions, clarification, requirement exploration, constraint discovery
```

**Output:** `.agent/projects/{project-name}/discovery.md`

**Key Sections:**
- Problem Statement
- Goals and Non-Goals
- Requirements (functional and non-functional)
- Constraints
- Assumptions
- Open Questions
- Key Decisions

### Phase 3: Specification (`/oat:spec`)

**Purpose:** Create formal requirements with acceptance criteria from discovery insights.

**Process:**
1. Read discovery.md completely
2. Initialize spec.md from template
3. Extract and formalize requirements
4. Define acceptance criteria for each requirement
5. Create Requirement Index with stable IDs
6. Review with user for completeness

**Mode Assertion:**
```
BLOCKED: Implementation, code, architecture decisions
ALLOWED: Requirement formalization, acceptance criteria, testable specifications
```

**Output:** `.agent/projects/{project-name}/spec.md`

**Key Sections:**
- Overview
- Functional Requirements (FR-01, FR-02, etc.)
- Non-Functional Requirements (NFR-01, NFR-02, etc.)
- Acceptance Criteria
- **Requirement Index** (table linking requirements to planned tasks)

**Requirement Index Format:**
```markdown
| ID | Description | Acceptance Criteria | Planned Tasks |
|----|-------------|---------------------|---------------|
| FR-01 | User authentication | AC-01, AC-02 | p01-t03, p02-t01 |
```

### Phase 4: Design (`/oat:design`)

**Purpose:** Create detailed technical design from specification. Document architecture, interfaces, and implementation approach.

**Process:**
1. Read spec.md and knowledge base
2. Initialize design.md from template
3. Design architecture and components
4. Define data models and schemas
5. Specify API interfaces
6. Plan implementation phases
7. Document security and performance considerations

**Mode Assertion:**
```
BLOCKED: Implementation code, changing requirements
ALLOWED: Architecture decisions, interface design, technical planning
```

**Output:** `.agent/projects/{project-name}/design.md`

**Key Sections:**
- Architecture Overview
- Component Design
- Data Models
- API Design
- Implementation Phases
- Security Considerations
- Performance Considerations
- Testing Strategy

### Phase 5: Planning (`/oat:plan`)

**Purpose:** Break design into bite-sized TDD tasks with stable IDs, verification commands, and commit messages.

**Process:**
1. Read design.md completely
2. Initialize plan.md from template
3. Define implementation phases
4. Break phases into bite-sized tasks (2-5 minutes each)
5. Apply TDD format to each task
6. Assign stable task IDs (p01-t01 format)
7. Update spec.md Requirement Index with task mappings
8. Configure plan phase checkpoints
9. Review with user

**Mode Assertion:**
```
BLOCKED: Implementation code, changing design decisions
ALLOWED: Task breakdown, TDD planning, verification commands
```

**Output:** `.agent/projects/{project-name}/plan.md`

**Task Format:**
```markdown
### Task p01-t03: {Task Name}

**Files:**
- Create: `{path/to/new.ts}`
- Modify: `{path/to/existing.ts}`

**Step 1: Write test (RED)**
{Test code or test case description}

**Step 2: Implement (GREEN)**
{Interface signatures or implementation outline}

**Step 3: Refactor**
{Optional cleanup}

**Step 4: Verify**
Run: `{command}`
Expected: {output}

**Step 5: Commit**
```bash
git add {files}
git commit -m "feat(p01-t03): {description}"
```
```

**Task Characteristics:**
- 2-5 minutes to complete
- Single responsibility
- Clear verification
- Atomic commit
- Stable ID for traceability

### Phase 6: Implementation (`/oat:implement`)

**Purpose:** Execute plan tasks with state tracking, TDD discipline, and configurable phase checkpoints.

**Process:**
1. Read plan.md completely
2. Check/initialize implementation.md
3. Execute tasks in order
4. Follow TDD discipline (RED → GREEN → REFACTOR)
5. Commit after each task with task ID in message
6. Update implementation.md progress
7. At phase boundaries, check `oat_plan_hil_phases` configuration
8. Run final verification when complete

**Mode Assertion:**
```
BLOCKED: Skipping tasks, changing plan structure, scope expansion
ALLOWED: Task execution, minor adaptations, blocker logging
```

**Output:** `.agent/projects/{project-name}/implementation.md`

**Progress Tracking:**
```markdown
## Progress

| Phase | Status | Tasks | Completed |
|-------|--------|-------|-----------|
| Phase 1: Setup | Complete | 5/5 | abc123..def456 |
| Phase 2: Core | In Progress | 2/8 | ghi789 |

## Task Log

- [x] p01-t01: Create project structure - abc123
- [x] p01-t02: Add configuration - bcd234
- [ ] p02-t01: Implement core logic - in progress
```

---

## Skills Reference

### Staleness Checks by Skill

| Skill | What It Checks | Threshold | Action |
|-------|----------------|-----------|--------|
| oat-progress | Knowledge age | >7 days | Warn, suggest reindex |
| oat-progress | Knowledge git diff | >20 files changed | Warn, suggest reindex |
| oat-discovery | Knowledge exists | Missing | Block, require oat-index |
| oat-discovery | Knowledge age | >7 days | Warn, allow continue |
| oat-spec | discovery.md complete | `oat_status != complete` | Block |
| oat-design | spec.md complete | `oat_status != complete` | Block |
| oat-plan | design.md complete | `oat_status != complete` | Block |
| oat-implement | plan.md complete | `oat_status != complete` | Block |

### oat-index

**Location:** `.agent/skills/oat-index/SKILL.md`

**Purpose:** Generate comprehensive codebase analysis.

**Prerequisites:** None (first skill to run)

**Key Features:**
- Two-stage generation (thin index → enrichment)
- Parallel entrypoint analysis via mapper agents
- Staleness detection with age and git diff checks

**Output:** `.oat/knowledge/repo/` directory

---

### oat-progress

**Location:** `.agent/skills/oat-progress/SKILL.md`

**Purpose:** Router skill that checks status and routes to the appropriate next phase.

**Key Features:**
- Reads state.md frontmatter to determine current phase
- Checks HiL gate configuration
- Detects knowledge staleness
- Provides guidance on next steps
- Detects blockers and incomplete prerequisites

**Usage:** Run this when unsure what to do next

---

### oat-discovery

**Location:** `.agent/skills/oat-discovery/SKILL.md`

**Purpose:** Gather requirements through structured dialogue.

**Prerequisites:** Knowledge base generated (oat-index complete)

**Key Steps:**
1. Check knowledge base exists and is fresh
2. Create project directory
3. Initialize state.md
4. Conduct structured Q&A
5. Document findings in discovery.md
6. Mark complete and update state

**State Updates:**
```yaml
# In state.md:
oat_phase: discovery
oat_phase_status: complete
# If "discovery" in oat_hil_checkpoints:
oat_hil_completed: [..., "discovery"]

# In discovery.md:
oat_status: complete
oat_ready_for: oat-spec
```

---

### oat-spec

**Location:** `.agent/skills/oat-spec/SKILL.md`

**Purpose:** Create formal requirements with acceptance criteria.

**Prerequisites:** Discovery complete (`oat_ready_for: oat-spec` in discovery.md)

**Key Steps:**
1. Read discovery.md completely
2. Initialize spec.md from template
3. Formalize requirements with IDs (FR-01, NFR-01)
4. Define acceptance criteria
5. Create Requirement Index (tasks filled later)
6. Review with user
7. Mark complete and update state

**Requirement Index:** Creates traceability table linking requirements to tasks (tasks column filled by oat-plan)

---

### oat-design

**Location:** `.agent/skills/oat-design/SKILL.md`

**Purpose:** Create detailed technical design from specification.

**Prerequisites:** Specification complete (`oat_ready_for: oat-design` in spec.md)

**Key Steps:**
1. Read spec.md and knowledge base
2. Initialize design.md from template
3. Design architecture and components
4. Define data models and APIs
5. Plan implementation phases
6. Document security/performance considerations
7. Review with user
8. Mark complete and update state

**Knowledge Base Usage:** References knowledge base files (stack.md, architecture.md, conventions.md, testing.md, etc.) for codebase context (if enrichment complete)

---

### oat-plan

**Location:** `.agent/skills/oat-plan/SKILL.md`

**Purpose:** Create implementation plan with bite-sized TDD tasks.

**Prerequisites:** Design complete (`oat_ready_for: oat-plan` in design.md)

**Key Steps:**
1. Read design.md completely
2. Initialize plan.md from template
3. Define implementation phases
4. Break into tasks with stable IDs (p01-t01)
5. Apply TDD format (RED/GREEN/REFACTOR)
6. Specify exact files, signatures, commands
7. Update spec.md Requirement Index with task mappings
8. Configure plan phase checkpoints (oat_plan_hil_phases)
9. Review with user
10. Mark complete and update state

**Plan Phase Checkpoint Configuration:**
```yaml
# Empty = stop at every phase boundary (default)
oat_plan_hil_phases: []

# Specific = only stop at listed phases
oat_plan_hil_phases: ["p01", "p04"]
```

---

### oat-implement

**Location:** `.agent/skills/oat-implement/SKILL.md`

**Purpose:** Execute plan tasks with state tracking and TDD discipline.

**Prerequisites:** Plan complete (`oat_ready_for: oat-implement` in plan.md)

**Key Steps:**
1. Read plan.md completely
2. Check/initialize implementation.md
3. For each task:
   - Announce task start
   - Follow TDD steps exactly
   - Run verification commands
   - Commit with task ID
   - Update implementation.md
4. At phase boundaries:
   - Check oat_plan_hil_phases configuration
   - Stop if configured (or always if empty)
   - Get user approval before continuing
5. When complete:
   - Run final verification (tests, lint, types, build)
   - Update state.md
   - Output summary

**Blocker Handling:**
```yaml
oat_blockers:
  - task_id: p01-t03
    reason: "Missing dependency X"
    since: 2026-01-27
```

---

## Templates Reference

All templates live in `.oat/templates/` and are copied to project directories when phases begin.

### state.md

**Purpose:** Track overall project workflow state

**Actual Frontmatter:**
```yaml
---
oat_current_task: null
oat_last_commit: null
oat_blockers: []
oat_hil_checkpoints: ["discovery", "spec", "design"]
oat_hil_completed: []
oat_parallel_execution: false
oat_phase: discovery
oat_phase_status: in_progress
oat_generated: false
oat_template: true
oat_template_name: state
---
```

**Note:** `oat_status` and `oat_ready_for` are in phase documents, not state.md.

### discovery.md

**Purpose:** Capture requirements gathering conversation

**Key Sections:**
- Problem Statement
- Goals and Non-Goals
- Requirements
- Constraints
- Assumptions
- Open Questions
- Key Decisions

### spec.md

**Purpose:** Formal requirements specification

**Key Sections:**
- Overview
- Functional Requirements
- Non-Functional Requirements
- Acceptance Criteria
- **Requirement Index** (traceability table)

**Requirement Index:**
```markdown
| ID | Description | Acceptance Criteria | Planned Tasks |
|----|-------------|---------------------|---------------|
| FR-01 | ... | AC-01 | p01-t03, p02-t01 |
```

### design.md

**Purpose:** Technical design document

**Key Sections:**
- Architecture Overview
- Component Design
- Data Models
- API Design
- Implementation Phases
- Security Considerations
- Performance Considerations
- Testing Strategy

### plan.md

**Purpose:** Executable implementation plan

**Key Frontmatter:**
```yaml
---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: YYYY-MM-DD
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hil_phases: []
oat_generated: false
oat_template: true
oat_template_name: plan
---
```

**Key Sections:**
- Goal and Architecture summary
- Phases with tasks
- Each task in TDD format

### implementation.md

**Purpose:** Track implementation progress

**Key Frontmatter:**
```yaml
---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: YYYY-MM-DD
oat_current_task_id: p01-t01
oat_generated: false
oat_template: true
oat_template_name: implementation
---
```

**Key Sections:**
- Progress Overview (table)
- Task Log (checklist with stable IDs)
- Implementation Log (chronological)
- Deviations from Plan
- Test Results

### Knowledge Templates

**project-index.md** - Main knowledge index (generated by script and enriched)

---

## State Management

### Frontmatter Split

OAT uses two categories of state tracking:

**Project-Level State (state.md):**
- `oat_phase` - Current workflow phase
- `oat_phase_status` - Phase completion status
- `oat_hil_checkpoints` - Configured gates
- `oat_hil_completed` - Gates passed
- `oat_current_task` - Task during implementation
- `oat_last_commit` - Last commit SHA

**Phase-Level State (discovery.md, spec.md, etc.):**
- `oat_status` - Document status
- `oat_ready_for` - Next skill to run
- `oat_blockers` - Phase-specific blockers
- `oat_last_updated` - Last modification date

### State Transitions

```
discovery.md:
  oat_status: in_progress
    → oat_status: complete, oat_ready_for: oat-spec

spec.md:
  oat_status: in_progress
    → oat_status: complete, oat_ready_for: oat-design

design.md:
  oat_status: in_progress
    → oat_status: complete, oat_ready_for: oat-plan

plan.md:
  oat_status: in_progress
    → oat_status: complete, oat_ready_for: oat-implement

implementation.md:
  oat_status: in_progress
    → oat_status: complete
```

### Current Task Tracking

During implementation, tracking happens in two places:

```yaml
# state.md - for router visibility
oat_current_task: p01-t03

# implementation.md - for implementation skill
oat_current_task_id: p01-t03
```

### Blocker Management

```yaml
oat_blockers:
  - task_id: p01-t03
    reason: "External API not available"
    since: 2026-01-27
```

---

## Human-in-the-Loop (HiL) System

OAT implements two distinct HiL mechanisms:

### 1. Workflow HiL Gates

**Purpose:** Gates between major workflow phases (discovery → spec → design → plan → implement)

**Configuration:** `oat_hil_checkpoints` in state.md

```yaml
# In state.md
oat_hil_checkpoints: ["discovery", "spec", "design"]
oat_hil_completed: ["discovery"]
```

**Behavior:**
- When a phase completes, check if it's in `oat_hil_checkpoints`
- If yes: Require user approval before proceeding to next phase
- If yes: Append phase to `oat_hil_completed` after user approves
- `oat_hil_completed` represents "HiL gates passed" (not just "phases completed")

**Example Flow:**
1. Discovery completes
2. Check: Is "discovery" in oat_hil_checkpoints? → Yes
3. Stop and ask user: "Discovery complete. Ready to proceed to spec?"
4. User approves
5. Append "discovery" to oat_hil_completed
6. Proceed to spec phase

### 2. Plan Phase Checkpoints

**Purpose:** Gates at plan phase boundaries during implementation (between p01, p02, etc.)

**Configuration:** `oat_plan_hil_phases` in plan.md

```yaml
# In plan.md

# Option 1: Stop at every phase boundary (default)
oat_plan_hil_phases: []

# Option 2: Stop only at specific phases
oat_plan_hil_phases: ["p01", "p04"]
```

**Behavior:**
- At end of each plan phase (e.g., p01 complete)
- Check `oat_plan_hil_phases`:
  - If empty: Always stop for review (default)
  - If has values: Only stop if current phase is listed
- Stop means: Show summary, ask user to continue

**Configuration Prompt (oat-plan Step 10):**
```
Ask user: "During implementation, should I stop for review at every
phase boundary, or only at specific phases?"
```

### Why Two Systems?

| Aspect | Workflow HiL | Plan Phase Checkpoints |
|--------|--------------|------------------------|
| Scope | Between major phases | Within implementation |
| Configured in | state.md | plan.md |
| Granularity | 5 checkpoints max | Many phases possible |
| Purpose | Approve phase outputs | Review implementation progress |

### Semantic Clarity

**oat_hil_completed meaning:** "HiL gates that have been passed"

This is why we only append to `oat_hil_completed` when the phase IS in `oat_hil_checkpoints`. The array tracks gates passed, not phases completed. A phase can be complete without being a HiL gate.

---

## Traceability System

OAT provides full traceability from requirements to implementation through stable IDs.

### Stable Task IDs

**Format:** `p{NN}-t{NN}` (e.g., `p01-t03` = Phase 1, Task 3)

**Why Stable:**
- IDs don't change when tasks are reordered
- References remain valid across documents
- Commit messages link to specific tasks

### Traceability Chain

```
Requirement (FR-01)
    ↓ (spec.md Requirement Index)
Tasks (p01-t03, p02-t01)
    ↓ (commit messages)
Commits (feat(p01-t03): ...)
    ↓ (implementation.md)
Implementation Status
```

### Requirement Index

In spec.md:
```markdown
| ID | Description | Acceptance Criteria | Planned Tasks |
|----|-------------|---------------------|---------------|
| FR-01 | User authentication | AC-01, AC-02 | p01-t03, p02-t01 |
| FR-02 | Session management | AC-03 | p02-t05 |
```

**Populated by:** oat-plan (Step 9)

### Commit Message Convention

**Format:** `{type}({task-id}): {description}`

```bash
git commit -m "feat(p01-t03): add user authentication endpoint"
```

**Convention Details:**
- Compatible with [Conventional Commits](https://www.conventionalcommits.org/)
- Task ID goes in the scope position
- **Required** for agent commits during oat-implement
- **Optional** for human commits (but recommended for traceability)

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `test` - Adding tests
- `refactor` - Code change that neither fixes nor adds

### Implementation Log

In implementation.md:
```markdown
- [x] p01-t01: Create project structure - abc123
- [x] p01-t02: Add configuration - bcd234
- [x] p01-t03: Add user auth endpoint - cde345
```

### Querying Traceability

**"What tasks implement FR-01?"**
→ Check spec.md Requirement Index → p01-t03, p02-t01

**"What commits relate to FR-01?"**
→ Get tasks from index → Search commits for those task IDs: `git log --grep="p01-t03\|p02-t01"`

**"What requirement does commit abc123 implement?"**
→ Extract task ID from commit message → Check Requirement Index

---

## Key Design Decisions

### Decision 1: Document-Driven State Over Database

**Choice:** Use YAML frontmatter in markdown files for all state

**Rationale:**
- Human-readable and editable
- Git-trackable (full history)
- No external dependencies
- Portable across AI tools

**Trade-off:** Less query-able than a database, but benefits outweigh for this use case.

### Decision 2: Mode Assertions for Scope Control

**Choice:** Each phase explicitly declares BLOCKED and ALLOWED activities

**Rationale:**
- Prevents AI scope creep
- Clear boundaries for each phase
- Self-correction protocol when deviating

**Trade-off:** More verbose skill definitions, but much better discipline.

### Decision 3: Two HiL Systems

**Choice:** Separate workflow HiL (state.md) from plan phase checkpoints (plan.md)

**Rationale:**
- Different granularities serve different needs
- Workflow HiL for major phase transitions
- Plan checkpoints for implementation progress
- Configurable based on project needs

**Trade-off:** More complex than single system, but more flexible.

### Decision 4: Stable Task IDs

**Choice:** Use `p{NN}-t{NN}` format instead of sequential numbers

**Rationale:**
- IDs remain valid when tasks reordered
- Clear phase grouping
- Grep-able in commits
- Traceability preserved through changes

**Trade-off:** Slightly more verbose than "Task 1, Task 2".

### Decision 5: TDD Format in Plan

**Choice:** Every task follows RED/GREEN/REFACTOR structure

**Rationale:**
- Enforces test-first discipline
- Clear verification at each step
- Consistent task structure
- Catches issues early

**Trade-off:** More planning overhead, but better implementation quality.

### Decision 6: Knowledge-First Enforcement

**Choice:** Require `/oat:index` before any project work

**Rationale:**
- AI understands codebase before making decisions
- Consistent context across phases
- Catches stale knowledge
- References available to all phases

**Trade-off:** Upfront time investment, but prevents costly mistakes.

### Decision 7: Conditional oat_hil_completed Append

**Choice:** Only append to `oat_hil_completed` when phase IS in `oat_hil_checkpoints`

**Rationale:**
- `oat_hil_completed` means "HiL gates passed"
- Not just "phases completed"
- Semantic clarity for routing logic
- Avoids confusion about what the array represents

**Trade-off:** Requires conditional logic in each skill, but clearer semantics.

### Decision 8: Two-Stage Knowledge Generation

**Choice:** Deterministic thin index + async enrichment

**Rationale:**
- Thin index always available immediately
- No blocking on slow mapper agents
- Enrichment quality depends on codebase complexity
- Clear separation of reliable vs best-effort data

**Trade-off:** Enrichment may be incomplete, but thin index is always usable.

---

## Directory Structure

```
.oat/
├── knowledge/repo/           # Generated codebase analysis
│   ├── project-index.md      # Main knowledge index (thin → enriched)
│   ├── stack.md              # Technology stack (after enrichment)
│   ├── architecture.md       # System design (after enrichment)
│   ├── structure.md          # Directory layout (after enrichment)
│   ├── integrations.md       # External services (after enrichment)
│   ├── testing.md            # Testing patterns (after enrichment)
│   ├── conventions.md        # Code patterns (after enrichment)
│   ├── concerns.md           # Technical debt (after enrichment)
│   └── entrypoints/          # Per-entrypoint analyses (after mappers)
├── templates/                # Document templates
│   ├── state.md
│   ├── discovery.md
│   ├── spec.md
│   ├── design.md
│   ├── plan.md
│   └── implementation.md
└── scripts/                  # Utility scripts
    └── generate-thin-index.sh

.agent/
├── skills/                   # OAT skill definitions (registered in AGENTS.md)
│   ├── oat-index/
│   │   └── SKILL.md
│   ├── oat-progress/
│   │   └── SKILL.md
│   ├── oat-discovery/
│   │   └── SKILL.md
│   ├── oat-spec/
│   │   └── SKILL.md
│   ├── oat-design/
│   │   └── SKILL.md
│   ├── oat-plan/
│   │   └── SKILL.md
│   └── oat-implement/
│       └── SKILL.md
└── projects/                 # Project-specific documents
    └── <project-name>/
        ├── state.md          # Workflow state
        ├── discovery.md      # Requirements gathering
        ├── spec.md           # Formal specification
        ├── design.md         # Technical design
        ├── plan.md           # Implementation tasks
        └── implementation.md # Progress tracking
```

---

## Usage Guide

### Starting a New Project

1. **Generate knowledge base:**
   ```
   /oat:index
   ```

2. **Start discovery:**
   ```
   /oat:discovery
   ```
   - Provide project name when prompted
   - Answer questions about requirements

3. **Check progress anytime:**
   ```
   /oat:progress
   ```

### Progressing Through Phases

Each phase skill:
1. Checks prerequisites
2. Initializes document from template
3. Guides through the phase
4. Updates state when complete
5. Indicates next phase

### Configuring HiL Gates

In state.md (created by discovery):
```yaml
oat_hil_checkpoints: ["discovery", "spec", "design"]
```

Modify to add/remove gates as needed.

### Configuring Plan Phase Checkpoints

During `/oat:plan`, you'll be asked:
- "Stop at every phase?" → `oat_plan_hil_phases: []`
- "Stop at specific phases?" → `oat_plan_hil_phases: ["p01", "p04"]`

### Handling Blockers

If blocked during implementation:
1. Skill marks task as blocked in implementation.md
2. Adds to oat_blockers array
3. Presents options:
   - Resolve and continue
   - Skip (defer)
   - Modify plan

### Resuming Work

Run `/oat:progress` to:
- See current state
- Get guidance on next steps
- Resume interrupted work

---

## Appendix: Implementation Statistics

**PR #1:** https://github.com/tkstang/open-agent-toolkit/pull/1

| Metric | Value |
|--------|-------|
| Total Commits | 40 |
| Lines Added | 5,626 |
| Skills Created | 7 |
| Templates Created | 8 |
| Design Documents | 2 |
| Codex Review Rounds | 3 |

**Files Changed:**
- README.md (complete rewrite)
- 7 skill SKILL.md files
- 8 template files
- Knowledge directory structure
- Scripts directory

**Key Iterations:**
1. Initial implementation (Tasks 1-19)
2. Codex Review 1: HiL semantics, plan phase checkpoints
3. Codex Review 2: Contradictions, stable IDs in templates
4. README accuracy and formatting

---

*Documentation generated for OAT Dogfood Workflow implementation review.*
