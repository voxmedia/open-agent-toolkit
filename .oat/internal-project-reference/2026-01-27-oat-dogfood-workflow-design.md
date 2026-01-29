# OAT Dogfood Workflow Implementation - Design

**Date:** 2026-01-27
**Status:** Approved
**Purpose:** Design for implementing the OAT workflow system by dogfooding it to build itself

---

## Overview & Scope

We're implementing a two-phase system to dogfood the OAT workflow:

### Phase 1: Knowledge Generation

- Adapt GSD's map-codebase parallel mapper pattern
- Generate `knowledge/PROJECT_INDEX.md` (SuperClaude-style overview)
- Generate `knowledge/codebase/` with 7 files: ARCHITECTURE.md, STACK.md, STRUCTURE.md, INTEGRATIONS.md, TESTING.md, CONVENTIONS.md, CONCERNS.md
- Basic age-based staleness detection (warn if > 7 days old)
- Skill: `oat-index` orchestrates 5 agents:
  - 1 for PROJECT_INDEX (sequential, SuperClaude pattern)
  - 4 parallel GSD mappers for codebase files

### Phase 2: Workflow Skills

- Four core skills: `oat-discovery`, `oat-spec`, `oat-plan`, `oat-implement`
- Each skill updates `state.md` inline (no separate state-update skill)
- Full mode only (thorough questioning, detailed artifacts)
- No phase directory separation yet (single plan.md, single implementation.md)
- Atomic commits per task with conventional commit format

### Deferred for Later

1. Full git diff-based staleness detection (files/lines changed)
2. Parallel worktree support (phase reconciliation)
3. Quick mode toggle
4. Standalone `oat-state-update` skill
5. CLI template rendering service
6. Memory system (`.oat/memory/`)

---

## Architecture & File Structure

### Directory Model

```
.agent/
├── skills/
│   ├── oat-index/
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── templates/
│   │           └── (skill-specific if any)
│   ├── oat-discovery/
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── templates/
│   │           └── discovery.md
│   ├── oat-spec/
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── templates/
│   │           ├── spec.md
│   │           └── quick-spec.md
│   ├── oat-plan/
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── templates/
│   │           └── plan.md
│   └── oat-implement/
│       ├── SKILL.md
│       └── references/
│           └── templates/
│               └── implementation.md
├── agents/
│   └── (reuse GSD's gsd-codebase-mapper agents)
└── projects/
    └── (deprecated, moved to .oat/)

.oat/
├── knowledge/                          (repo-wide codebase knowledge)
│   ├── PROJECT_INDEX.md
│   └── codebase/
│       ├── ARCHITECTURE.md
│       ├── STACK.md
│       ├── STRUCTURE.md
│       ├── INTEGRATIONS.md
│       ├── TESTING.md
│       ├── CONVENTIONS.md
│       └── CONCERNS.md
├── projects/                           (feature/initiative work)
│   └── <project-name>/
│       ├── discovery.md
│       ├── spec.md
│       ├── quick-spec.md
│       ├── plan.md
│       ├── implementation.md
│       └── state.md
├── memory/                             (future: conversation context)
└── templates/
    └── state.md                        (shared across all skills)
```

### Naming Convention Rules

**SCREAMING_SNAKE (generated artifacts):**
- Signal: "Regenerate rather than edit"
- Files: `PROJECT_INDEX.md`, `ARCHITECTURE.md`, `STACK.md`, etc.
- Frontmatter includes: `oat_generated_at`, `oat_source_main_merge_base_sha`

**regular-case (working documents):**
- Signal: "Collaborative, iterative editing expected"
- Files: `discovery.md`, `spec.md`, `plan.md`, `state.md`, `implementation.md`
- Frontmatter includes: `oat_status`, `oat_ready_for`, `oat_blockers`

### Template Organization

**Skill-specific templates:** `.agent/skills/<skill>/references/templates/`
- Each skill owns its unique output templates
- Skills instantiate these when creating artifacts

**Shared templates:** `.oat/templates/`
- `state.md` - Used by all workflow skills for consistent state structure
- Future: other shared structures

### Skill Coordination

Skills pass data via **explicit file reads with conventional paths:**

```
oat-index      → writes .oat/knowledge/PROJECT_INDEX.md + codebase/*
oat-discovery  → reads .oat/knowledge/*, writes discovery.md + state.md
oat-spec       → reads discovery.md, writes spec.md + quick-spec.md + state.md
oat-plan       → reads spec.md + quick-spec.md, writes plan.md + state.md
oat-implement  → reads state.md → plan.md → quick-spec.md, updates all three
```

No indirection through state for file locations (that comes later if structure changes).

---

## Data Model & Frontmatter

### Knowledge Artifacts (Generated)

**PROJECT_INDEX.md**
```yaml
---
oat_generated_at: 2026-01-27
oat_default_branch: origin/main
oat_source_main_merge_base_sha: abc123def456
oat_source_paths:
  - "apps/**"
  - "packages/**"
  - "src/**"
---
```

**Codebase files (ARCHITECTURE.md, STACK.md, etc.)**
```yaml
---
oat_generated_at: 2026-01-27
oat_default_branch: origin/main
oat_source_main_merge_base_sha: abc123def456
oat_source_paths:
  - "apps/**"
  - "packages/**"
  - "src/**"
---
```

**Staleness check (basic age-based for v1):**
```
if (now - oat_generated_at) > 7 days:
  warn("Knowledge may be stale. Consider regenerating with /oat:index")
```

### Workflow Artifacts (Working Docs)

**discovery.md, spec.md, quick-spec.md, plan.md**
```yaml
---
oat_status: draft # draft|in_review|approved|superseded
oat_ready_for: oat-spec # oat-spec|oat-plan|oat-implement|null
oat_blockers: [] # reference IDs; empty means unblocked
oat_last_updated: 2026-01-27
---
```

**Blocker format (reference IDs in frontmatter, details in body):**
```yaml
---
oat_blockers: [B1, B2]  # empty array = unblocked
---

## Blockers

**B1**: Need to decide between JWT vs session-based auth
- Options: JWT (stateless) vs Redis sessions (stateful)
- Impact: Affects horizontal scaling strategy
- Decision needed by: Phase 2 Task 5

**B2**: Waiting on API key from third-party service
- Service: Stripe payment integration
- Requested: 2026-01-26
- Blocking: Phase 3 Task 2
```

**plan.md (additional fields)**
```yaml
---
oat_status: approved
oat_ready_for: oat-implement
oat_blockers: []
oat_last_updated: 2026-01-27
oat_checkpoint_tasks: [p01-t03, p02-t05, p02-t08] # tasks requiring HiL gates
---
```

**state.md (routing + recovery)**
```yaml
---
oat_current_phase: 2
oat_current_task: p02-t03
oat_last_commit: abc123
oat_last_updated: 2026-01-27
oat_blockers: []
---

## Current Position
Phase 2: Implementation
Task: p02-t03 - Implement user authentication

## Next Actions
1. Complete auth middleware
2. Add tests for auth flow
3. Update API documentation

## Blockers
(none)
```

**implementation.md**
```yaml
---
oat_status: in_progress
oat_last_updated: 2026-01-27
---
```

---

## Skill Specifications

### Skill: `oat-index`

**Purpose:** Generate repo-wide knowledge base (PROJECT_INDEX + 7 codebase files)

**Inputs:**
- Current codebase
- Optional: existing `.oat/knowledge/` for refresh check

**Process:**
1. Check if `.oat/knowledge/` exists
   - If exists: offer Refresh/Skip
2. Generate PROJECT_INDEX.md (sequential, SuperClaude pattern)
   - Quick scan of repo structure
   - High-level overview (what/why/who)
   - Key technologies and patterns
3. Spawn 4 parallel `gsd-codebase-mapper` agents with `run_in_background=true`:
   - Agent 1 (tech): STACK.md + INTEGRATIONS.md
   - Agent 2 (arch): ARCHITECTURE.md + STRUCTURE.md
   - Agent 3 (quality): CONVENTIONS.md + TESTING.md
   - Agent 4 (concerns): CONCERNS.md
4. Collect confirmations (read agent output files for file paths + line counts)
5. Verify output (`ls -la`, `wc -l`)
6. Commit with `docs: generate knowledge base`
7. Basic staleness warning setup

**Outputs:**
- `.oat/knowledge/PROJECT_INDEX.md`
- `.oat/knowledge/codebase/*.md` (7 files)
- Git commit

**Exit criteria:**
- All 8 files exist and non-empty (>20 lines each)
- Frontmatter includes generation metadata
- User informed of next step: `/oat:discovery`

---

### Skill: `oat-discovery`

**Purpose:** Gather requirements, constraints, open questions through interactive interview

**Inputs:**
- `.oat/knowledge/PROJECT_INDEX.md` (and codebase map if exists)
- Prior research/notes (optional)
- User responses to questions

**Process:**
1. Read knowledge base for context
2. Ask questions one at a time:
   - What problem are we solving?
   - Who are the users?
   - What are the constraints?
   - What does success look like?
   - What are the open questions?
3. Propose 2-3 approaches with tradeoffs
4. Synthesize into discovery.md (using template)
5. Update state.md with next action

**Template structure (discovery.md):**
- Problem Statement
- Target Users
- Constraints
- Success Criteria
- Approaches Considered (2-3 with tradeoffs)
- Open Questions / Blockers
- Recommended Approach

**Outputs:**
- `.oat/projects/<name>/discovery.md`
- `.oat/projects/<name>/state.md` (created/updated)

**Exit criteria:**
- `oat_status: approved` in discovery.md frontmatter
- `oat_ready_for: oat-spec`
- `oat_blockers: []` (or explicit blockers listed with IDs)

---

### Skill: `oat-spec`

**Purpose:** Transform discovery into stable requirements specification with explicit scope boundaries

**Inputs:**
- `.oat/projects/<name>/discovery.md`
- User clarifications on scope/priority

**Process:**
1. Read discovery.md
2. Structure requirements into:
   - Must have (MVP scope)
   - Should have (important but deferrable)
   - Could have (nice-to-have)
   - Won't have / Out of scope (explicit non-goals)
3. Define acceptance criteria for must-haves
4. List risks and unknowns
5. Generate both full spec.md and concise quick-spec.md
6. Update state.md

**Template structure (spec.md):**
- Overview (problem, solution, users)
- Requirements
  - Must Have (with requirement IDs: REQ-001, REQ-002...)
  - Should Have
  - Could Have
- Non-Goals (explicit out-of-scope)
- Success Criteria / Acceptance Checks
- Risks & Unknowns
- Dependencies

**Template structure (quick-spec.md):**
- 2-3 paragraph summary of MVP scope
- Key constraints
- Link to full spec.md for details

**Usage pattern:**
- **spec.md**: Complete requirements, read when need specific requirement details, writing acceptance tests, resolving ambiguity
- **quick-spec.md**: MVP scope summary, read when starting work, context refresh, agent needs quick orientation
- **oat-implement**: ALWAYS loads quick-spec.md first (cheap context), only loads spec.md if task references specific REQ-ID

**Outputs:**
- `.oat/projects/<name>/spec.md`
- `.oat/projects/<name>/quick-spec.md`
- `.oat/projects/<name>/state.md` (updated)

**Exit criteria:**
- `oat_status: approved` in both spec.md and quick-spec.md
- `oat_ready_for: oat-plan`
- Must/Should/Could and non-goals explicit
- Acceptance checks defined

---

### Skill: `oat-plan`

**Purpose:** Turn spec into executable implementation plan with tasks, checkpoints, and verification steps

**Inputs:**
- `.oat/projects/<name>/spec.md`
- `.oat/projects/<name>/quick-spec.md`
- Current codebase (for file path discovery)
- User input on HiL checkpoint placement

**Process:**
1. Read spec + quick-spec
2. Scan codebase for relevant patterns/conventions
3. Break work into phases (logical groupings)
4. Within each phase, define tiny tasks (2-5 minutes each)
5. For each task:
   - Task ID (p01-t01, p01-t02...)
   - Clear description
   - Exact file paths involved
   - Verification step (how to confirm it's done)
   - Link to spec requirement (REQ-XXX) if applicable
6. **Ask user where they want HiL checkpoints:**
   ```
   I've outlined X phases with Y total tasks.

   Where do you want Human-in-the-Loop checkpoints?

   Checkpoints pause implementation for your review/approval before continuing.

   Options:
   A) After each phase (conservative, max control)
   B) After major milestones only (I recommend: phases 2, 4, 7)
   C) Only at the end (fast, minimal interruption)
   D) Custom - you specify which phases

   What works for you?
   ```
7. Mark checkpoint tasks in frontmatter based on user choice
8. Update state.md

**Template structure (plan.md):**
```markdown
---
oat_checkpoint_tasks: [p01-t03, p02-t05]
---

## Phase 1: <name>

**Goal:** <1-2 sentence phase goal>

**Tasks:**
- [ ] p01-t01: <description>
  - Files: `path/to/file.ts`
  - Verify: <test command or manual check>
  - Spec: REQ-001

- [ ] p01-t02: <description>
  - Files: `path/to/other.ts`
  - Verify: `pnpm test`
  - Spec: REQ-002

- [ ] p01-t03: <description> 🚧 CHECKPOINT
  - Files: `path/to/config.ts`
  - Verify: Manual review of approach
  - Decision: Choose between option A vs B
```

**Outputs:**
- `.oat/projects/<name>/plan.md`
- `.oat/projects/<name>/state.md` (updated)

**Exit criteria:**
- `oat_status: approved` in plan.md
- `oat_ready_for: oat-implement`
- Each task has file paths + verification
- Checkpoints marked in frontmatter and inline (based on user input)

---

### Skill: `oat-implement`

**Purpose:** Execute plan tasks in batch mode until hitting a checkpoint, with atomic commits and state recovery

**Inputs:**
- `.oat/projects/<name>/state.md` (ALWAYS read first)
- `.oat/projects/<name>/plan.md`
- `.oat/projects/<name>/quick-spec.md` (always loaded)
- `.oat/projects/<name>/spec.md` (loaded only if task references REQ-ID)

**Process:**

#### 1. State Recovery & Position Detection

```
1. Read state.md → get current_task (e.g., p02-t03) and last_commit
2. Read git log -1 → parse scope for task ID
3. Compare:
   - If commit task > state task → state is stale, update state.md first
   - If commit has no OAT pattern → prompt user to confirm position
   - If aligned → proceed
4. Determine current position in plan.md
```

#### 2. Batch Execution

```
1. Load quick-spec.md for context
2. Starting from current_task, execute tasks sequentially:

   For each task:
   a. Execute the work (write code, run commands, etc.)
   b. Run verification step from plan
   c. Commit with pattern: feat(pXX-tYY): description
   d. Update plan.md checkbox with commit hash
   e. Check if this task is a checkpoint:
      - If YES → stop, update state.md, prompt user
      - If NO → continue to next task

3. Stop conditions:
   - Reached checkpoint task (from oat_checkpoint_tasks)
   - Encountered unplanned decision point
   - Verification failed
   - All tasks complete
```

#### 3. Artifact Updates

```
After each task:
- plan.md: - [x] pXX-tYY: description (abc123)
- implementation.md: append session entry
- state.md: update current_task, last_commit

Before stopping:
- state.md: update next actions, blockers if any
```

**Commit Pattern:**
```bash
# Task-level work
feat(p02-t03): implement user authentication

- Added login endpoint
- Created JWT validation middleware

# Verification passed: pnpm test (all green)
```

**State Recovery Example:**
```
# Scenario: Process crashed after completing p02-t03 but before updating state

1. oat-implement starts → reads state.md (says p02-t02)
2. Reads git log -1 → sees feat(p02-t03): ...
3. Detects mismatch → "State shows p02-t02 but last commit is p02-t03"
4. Updates state.md to p02-t03, last_commit: abc123
5. Continues from p02-t04
```

**Human Commit Handling:**
```
# Scenario: Human made commits without OAT pattern

1. oat-implement starts → reads state.md (says p02-t03)
2. Reads git log -1 → "fix: typo in readme" (no pXX-tYY pattern)
3. Warns: "Last commit doesn't match OAT pattern. State may be out of sync."
4. Prompts: "Confirm current position: [p02-t03] or specify:"
5. User confirms or corrects
6. Updates state.md with confirmed position
7. Continues execution
```

**Outputs:**
- Code changes + git commits (one per task)
- `.oat/projects/<name>/plan.md` (checkboxes updated with commit hashes)
- `.oat/projects/<name>/implementation.md` (session log appended)
- `.oat/projects/<name>/state.md` (position + blockers updated)

**Exit criteria:**
- Stopped at planned checkpoint OR
- Stopped at unplanned decision point OR
- All tasks complete
- State accurately reflects position
- All completed tasks committed

---

## Commit Conventions

### OAT Commit Format

All commits follow conventional commits with OAT-specific scoping:

```
<type>(<scope>): <description>

<body>

<footer>
```

### Scope Patterns

**Task-level work (most common):**
```
feat(p02-t03): implement user authentication
docs(p01-t05): add API documentation
test(p03-t02): add integration tests
fix(p02-t08): handle edge case in validation
```

**Phase-level work (no specific task):**
```
feat(p02): complete authentication phase
docs(p02): update phase documentation
chore(p02): refactor phase structure
```

**Cross-phase work (exceptional):**
```
feat(px): update shared utilities
refactor(px): extract common patterns
chore(px): update dependencies
```

**Pre-phase work (no scope):**
```
feat: scaffold project structure
docs: generate knowledge base
chore: configure tooling
```

### Parsing Rules

**Regex for task extraction:** `\(p(\d+)-t(\d+)\)`
**Regex for phase extraction:** `\(p(\d+)\)(?!-)`
**Cross-phase:** `\(px\)`
**No scope:** Pre-phase or general work

### State/Plan Integration

**plan.md task format:**
```markdown
- [x] p02-t03: Implement user authentication (abc123)
      ↑ Task ID    ↑ Description              ↑ Commit hash
```

**state.md tracking:**
```yaml
---
oat_current_task: p02-t03
oat_last_commit: abc123def456
---
```

### Recovery Algorithm

```
1. Parse git log -1 for scope pattern
2. Extract task ID (pXX-tYY) if present
3. Compare to state.md current_task
4. If mismatch:
   - Commit ahead of state → update state
   - State ahead of commit → verify with user
   - No pattern in commit → prompt user confirmation
```

---

## Deferred Improvements & Future Work

### Tracked for Later Implementation

1. **Full git diff-based staleness detection**
   - Current: Basic age check (> 7 days warns)
   - Future: Track files changed, lines changed since generation
   - Benefit: More accurate staleness detection

2. **Parallel worktree support**
   - Current: Serial execution, single branch
   - Future: Phase-level parallelization with per-phase logs
   - Includes: `oat-reconcile` skill, phase directories, merge coordination

3. **Quick mode toggle**
   - Current: Full mode only (thorough questioning)
   - Future: Quick mode for small features (3-5 questions vs 8-12)
   - Benefit: Faster for trivial work

4. **Standalone `oat-state-update` skill**
   - Current: Each skill updates state inline
   - Future: Utility skill for manual state corrections
   - Benefit: Easier to fix misaligned state

5. **CLI template rendering service**
   - Current: Skills read/write templates directly
   - Future: `oat template render <name>` helper
   - Benefit: Centralized template logic, easier testing

6. **Memory system**
   - Current: `.oat/knowledge/` and `.oat/projects/` only
   - Future: `.oat/memory/` for conversation context, learned patterns
   - Benefit: Better cross-session continuity

---

## Implementation Approach

### Phase 1: Knowledge Generation (oat-index)

1. Create `.oat/knowledge/` directory structure
2. Adapt SuperClaude's index-repo pattern for PROJECT_INDEX.md generation
3. Integrate GSD's gsd-codebase-mapper agents (reuse existing)
4. Implement basic age-based staleness check
5. Create `oat-index` skill orchestrator
6. Test on OAT codebase itself

### Phase 2: Workflow Skills

**Order of implementation:**
1. `oat-discovery` - Foundation for all other skills
2. `oat-spec` - Depends on discovery
3. `oat-plan` - Depends on spec
4. `oat-implement` - Most complex, depends on all above

**For each skill:**
1. Create skill directory + SKILL.md
2. Create templates in references/templates/
3. Implement frontmatter validation
4. Implement state.md updates
5. Test on a small feature
6. Document lessons learned

### Dogfooding Strategy

Use the OAT workflow to build the OAT workflow:
1. Start with `oat-index` to map current codebase
2. Use manual discovery/spec/plan for first skill implementation
3. Once first skill works, use it to build the next
4. Iterate: each new skill helps build the next

---

## Success Criteria

### Phase 1 Complete When:
- `.oat/knowledge/` populated with 8 files (PROJECT_INDEX + 7 codebase)
- All files have proper frontmatter
- Age-based staleness check working
- Successfully run on OAT codebase

### Phase 2 Complete When:
- All 4 workflow skills implemented and tested
- Can run complete workflow: index → discovery → spec → plan → implement
- State recovery works (can resume after interruption)
- Commit conventions followed and parseable
- Successfully dogfooded on at least one feature

### Overall Success:
- OAT workflow successfully used to build itself
- Documentation complete and accurate
- Templates validated and reusable
- Ready to use for next feature development
