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

**Purpose:** Break design into executable tasks with exact files, code, and commands.

**BLOCKED Activities:**
- No implementation code
- No changing design decisions
- No scope expansion

**ALLOWED Activities:**
- Breaking design into phases
- Creating bite-sized tasks (2-5 minutes each)
- Specifying exact files and code
- Defining verification commands
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

## Process

### Step 1: Check Design Complete

```bash
cat .agent/projects/{project-name}/design.md | head -10 | grep "oat_status:"
```

**Required frontmatter:**
- `oat_status: complete`
- `oat_ready_for: oat-plan`

**If not complete:** Block and ask user to finish design first.

### Step 2: Read Design Document

Read `.agent/projects/{project-name}/design.md` completely to understand:
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

Copy template: `.oat/templates/plan.md` → `.agent/projects/{project-name}/plan.md`

Update frontmatter:
```yaml
---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: {today}
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

**Task template:**
```markdown
### Task N: {Task Name}

**Files:**
- Create: `{path/to/new.ts}`
- Modify: `{path/to/existing.ts}`

**Step 1: {Action}**
{Detailed instructions}

**Step 2: {Action}**
{Detailed instructions}

**Step 3: Verify**
Run: `{command}`
Expected: {output}

**Step 4: Commit**
```bash
git add {files}
git commit -m "{message}"
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
- **Code:** Interface signatures, test cases (pseudocode OK)
- **Commands:** Exact verification commands
- **Commit:** Conventional commit message

**Avoid:**
- Vague instructions ("update the file")
- Missing verification steps
- Bundled unrelated changes

### Step 9: Update Requirement Index

Go back to spec.md and fill in the "Planned Tasks" column in the Requirement Index:

For each requirement (FR/NFR):
- List the task numbers that implement it
- Example: "Tasks 3, 5, 7"

This creates traceability: Requirement → Tasks → Implementation

### Step 10: Review Plan with User

Present plan summary:
- Number of phases
- Tasks per phase
- Key milestones

Ask: "Does this breakdown make sense? Any tasks missing?"

Iterate until user confirms.

### Step 11: Mark Plan Complete

Update frontmatter:
```yaml
---
oat_status: complete
oat_ready_for: oat-implement
oat_blockers: []
oat_last_updated: {today}
---
```

### Step 12: Update Project State

Update `.agent/projects/{project-name}/state.md`:

```yaml
---
oat_current_task: null
oat_last_commit: {commit_sha_from_step_13}
oat_blockers: []
oat_hil_completed: ["discovery", "spec", "design", "plan"]
oat_phase: plan
oat_phase_status: complete
---
```

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

### Step 13: Commit Plan

```bash
git add .agent/projects/{project-name}/
git commit -m "docs: complete implementation plan for {project-name}

Phases:
- Phase 1: {description} ({N} tasks)
- Phase 2: {description} ({N} tasks)

Total: {N} tasks

Ready for implementation"
```

### Step 14: Output Summary

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
