# Usage Pattern: Simple Parallel Phases

Two independent phases execute in parallel, then merge cleanly.

## Plan Excerpt

```yaml
---
oat_plan_hil_phases: ["p03"]
---
```

```markdown
## Phase 1: API Endpoints

### Task p01-t01: Create user endpoint
**Files:**
- Create: `src/routes/user.ts`
- Create: `src/routes/user.test.ts`

### Task p01-t02: Create settings endpoint
**Files:**
- Create: `src/routes/settings.ts`
- Create: `src/routes/settings.test.ts`

## Phase 2: UI Components

### Task p02-t01: Create user profile component
**Files:**
- Create: `src/components/UserProfile.tsx`
- Create: `src/components/UserProfile.test.tsx`

### Task p02-t02: Create settings panel component
**Files:**
- Create: `src/components/SettingsPanel.tsx`
- Create: `src/components/SettingsPanel.test.tsx`

## Phase 3: Integration

### Task p03-t01: Wire API to UI
**Files:**
- Modify: `src/routes/user.ts`
- Modify: `src/components/UserProfile.tsx`
```

## Orchestration Flow

1. **Dispatch manifest** identifies p01 and p02 as parallel-safe (no overlapping files).
2. **Bootstrap** creates two worktrees:
   - `project-name/p01` (branch from orchestration base)
   - `project-name/p02` (branch from orchestration base)
3. **Subagents** execute concurrently:
   - Subagent A: implements p01-t01 and p01-t02 in worktree p01
   - Subagent B: implements p02-t01 and p02-t02 in worktree p02
4. **Review gate** runs per unit:
   - p01: spec compliance (pass) -> code quality (pass) -> eligible for merge
   - p02: spec compliance (pass) -> code quality (pass) -> eligible for merge
5. **Reconciliation** merges in deterministic order:
   - Merge p01 (order 1) -> integration verification passes
   - Merge p02 (order 2) -> integration verification passes
6. **HiL checkpoint** at p03: orchestrator pauses, reports progress, waits for user.
7. After user approval, p03 executes sequentially (it modifies files from both p01 and p02).

## Expected Artifact Output

In `implementation.md` under `## Orchestration Runs`:

```markdown
### Run 1 — 2026-02-17 14:30

**Branch:** autonomous-orchestration-impl
**Policy:** baseline=strict, merge=merge, retry-limit=2
**Units:** 2 dispatched, 2 passed, 0 failed, 0 conflicts

#### Unit Outcomes

| Unit | Status | Commits | Tests | Review | Disposition |
|------|--------|---------|-------|--------|-------------|
| p01 | pass | abc1234 | pass | pass | merged |
| p02 | pass | def5678 | pass | pass | merged |

#### Review Interaction Log

**p01:**
- **Spec compliance:** pass (0 findings)
- **Code quality:** pass (0 findings)
- **Verdict:** pass
- **Disposition:** merged

**p02:**
- **Spec compliance:** pass (0 findings)
- **Code quality:** pass (0 findings)
- **Verdict:** pass
- **Disposition:** merged

#### Merge Outcomes

| Order | Unit | Strategy | Result | Integration |
|-------|------|----------|--------|-------------|
| 1 | p01 | merge | clean | tests pass |
| 2 | p02 | merge | clean | tests pass |

#### Outstanding Items
- None
```
