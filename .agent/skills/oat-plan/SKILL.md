---
name: oat-plan
description: Create implementation plan from design with bite-sized TDD tasks
---

# Planning Phase

Transform detailed design into an executable implementation plan with bite-sized tasks.

## Prerequisites

**Required:** Complete design document. If missing, run `/oat:design` first.

## Mode Assertion

**OAT MODE: Planning**

**Purpose:** Break design into executable tasks with exact files, signatures/test cases, and commands.

**BLOCKED Activities:**
- No implementation code
- No changing design decisions
- No scope expansion

**ALLOWED Activities:**
- Breaking design into phases
- Creating bite-sized tasks (2-5 minutes each)
- Specifying exact files and interface signatures
- Defining test cases and verification commands
- Planning test-first approach

**Self-Correction Protocol:**
If you catch yourself:
- Writing actual implementation → STOP
- Changing architecture decisions → STOP (send back to design)
- Adding new features → STOP (flag for next cycle)

**Recovery:**
1. Acknowledge the deviation
2. Return to planning language ("Task N will...")
3. Keep implementation details at pseudocode/interface level
4. Keep code blocks short (signatures/outlines only)

## Process

### Step 0: Resolve Active Project

OAT stores the active project path in `.oat/active-project` (single line, local-only).

```bash
PROJECT_PATH=$(cat .oat/active-project 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(cat .oat/projects-root 2>/dev/null || echo ".agent/projects")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

**If `PROJECT_PATH` is missing/invalid:**
- Ask the user for `{project-name}`
- Set `PROJECT_PATH` to `${PROJECTS_ROOT}/{project-name}`
- Write it for future phases:
  ```bash
  mkdir -p .oat
  echo "$PROJECT_PATH" > .oat/active-project
  ```

**If `PROJECT_PATH` is valid:** derive `{project-name}` as the directory name (basename of the path).

### Step 1: Check Design Complete

```bash
cat "$PROJECT_PATH/design.md" | head -10 | grep "oat_status:"
```

**Required frontmatter:**
- `oat_status: complete`
- `oat_ready_for: oat-plan`

**If not complete:** Block and ask user to finish design first.

### Step 2: Read Design Document

Read `"$PROJECT_PATH/design.md"` completely to understand:
- Architecture overview and components
- Data models and schemas
- API designs and interfaces
- Implementation phases from design
- Testing strategy
- Security and performance considerations

### Step 3: Read Knowledge Base for Context

Read for implementation context:
- `.oat/knowledge/repo/conventions.md` - Code patterns to follow
- `.oat/knowledge/repo/testing.md` - Testing patterns
- `.oat/knowledge/repo/stack.md` - Available tools and dependencies

### Step 4: Initialize Plan Document

Copy template: `.oat/templates/plan.md` → `"$PROJECT_PATH/plan.md"`

Update frontmatter:
```yaml
---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: {today}
oat_phase: plan
oat_phase_status: in_progress
oat_generated: false
oat_template: false
---
```

### Step 5: Define Phases

Break design implementation phases into plan phases.

**Phase structure:**
- Each phase delivers a complete, testable milestone
- Phases should be 1-3 days of work
- Later phases can depend on earlier phases
- End each phase with verification

### Step 6: Break Into Tasks

For each phase, create bite-sized tasks.

**Task characteristics:**
- 2-5 minutes to complete
- Single responsibility
- Clear verification
- Atomic commit

**No implementation code (important):**
- Prefer **pseudocode**, **interfaces**, and **bullet steps** over full implementations.
- If the task is a shell script, include **function names + responsibilities** and only minimal “shape” snippets (aim for <10 lines per code block).
- If a longer snippet would be useful, replace internals with `{...}` placeholders and document behavior/edge cases in prose.

**Task IDs:** Use stable IDs in format `p{phase}-t{task}` (e.g., `p01-t03`).

**Task template:**
```markdown
### Task p{NN}-t{NN}: {Task Name}

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
git commit -m "feat(p{NN}-t{NN}): {description}"
```
```

### Step 7: Apply TDD Discipline

For each task that involves code:

1. **Test first:** Write test before implementation
2. **Red:** Verify test fails
3. **Green:** Implement minimal code to pass
4. **Refactor:** Clean up while tests pass

**Task order for features:**
1. Write test file
2. Run tests (red)
3. Write implementation
4. Run tests (green)
5. Commit

### Step 8: Specify Exact Details

For each task, include:
- **Files:** Exact paths for create/modify/delete
- **Signatures:** Interface definitions, function signatures, type declarations
- **Test cases:** Test file paths and test descriptions (pseudocode OK for test bodies)
- **Commands:** Exact verification commands
- **Commit:** Conventional commit message with task ID (e.g., `feat(p01-t03): ...`)

**Avoid:**
- Vague instructions ("update the file")
- Missing verification steps
- Bundled unrelated changes
- Full implementation code (leave that for oat-implement)

### Step 9: Update Requirement Index

Go back to spec.md and fill in the "Planned Tasks" column in the Requirement Index:

For each requirement (FR/NFR):
- List the stable task IDs that implement it
- Example: "p01-t03, p02-t01, p02-t05"

This creates traceability: Requirement → Tasks → Implementation

### Step 9.1: Keep Reviews Table Rows

When updating `plan.md`, keep the full `## Reviews` table from the template:
- Include both **code** rows (p01/p02/…/final) and **artifact** rows (`spec`, `design`)
- Add additional rows as needed (e.g., p03), but do not delete the artifact rows

**Why stable IDs:** Using `p01-t03` instead of "Task 3" prevents broken references when tasks are inserted or reordered.

### Step 10: Configure Plan Phase Checkpoints

Ask user: "During implementation, should I stop for review at every phase boundary, or only at specific phases?"

**Options:**
- **Every phase** (default): Leave `oat_plan_hil_phases: []` - stop at end of every plan phase
- **Only the end**: Set `oat_plan_hil_phases` to the **last plan phase ID** (e.g., `["p03"]`) - stop only at the end of implementation
- **Specific phases**: Set `oat_plan_hil_phases: ["p01", "p04"]` - only stop at listed phases

Update plan.md frontmatter with user's choice.

### Step 11: Review Plan with User

Present plan summary:
- Number of phases
- Tasks per phase
- Key milestones
- HiL checkpoints configured

Ask: "Does this breakdown make sense? Any tasks missing?"

Iterate until user confirms.

### Step 12: Mark Plan Complete

Update frontmatter:
```yaml
---
oat_status: complete
oat_ready_for: oat-implement
oat_blockers: []
oat_last_updated: {today}
---
```

### Step 13: Update Project State

Update `"$PROJECT_PATH/state.md"`:

**Frontmatter updates:**
- `oat_current_task: null`
- `oat_last_commit: {commit_sha_from_step_14}`
- `oat_blockers: []`
- `oat_phase: plan`
- `oat_phase_status: complete`
- **If** `"plan"` is in `oat_hil_checkpoints`: append `"plan"` to `oat_hil_completed` array

**Note:** Only append to `oat_hil_completed` when the phase is configured as a HiL gate.

Update content:
```markdown
## Current Phase

Planning - Ready for implementation

## Progress

- ✓ Discovery complete
- ✓ Specification complete
- ✓ Design complete
- ✓ Plan complete
- ⧗ Awaiting implementation
```

### Step 14: Commit Plan

```bash
git add "$PROJECT_PATH/"
git commit -m "docs: complete implementation plan for {project-name}

Phases:
- Phase 1: {description} ({N} tasks)
- Phase 2: {description} ({N} tasks)

Total: {N} tasks

Ready for implementation"
```

### Step 15: Output Summary

```
Planning phase complete for {project-name}.

Phases:
- Phase 1: {description} ({N} tasks)
- Phase 2: {description} ({N} tasks)

Total: {N} tasks

Next: Start implementation with /oat:implement
```

## Success Criteria

- All design components covered by tasks
- Tasks are bite-sized (2-5 minutes)
- TDD discipline applied to code tasks
- Each task has clear verification
- Requirement Index updated with task mappings
- User confirmed plan is complete
