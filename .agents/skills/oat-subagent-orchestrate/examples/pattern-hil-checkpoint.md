# Usage Pattern: Mixed Parallel with HiLL Checkpoint

Parallel phases run before a checkpoint, then user reviews before continuing.

## Plan Excerpt

```yaml
---
oat_plan_hill_phases: ["p03"]
---
```

```markdown
## Phase 1: Data Layer

### Task p01-t01: Create database schema
**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/migrations/001.sql`

## Phase 2: Business Logic

### Task p02-t01: Create validation rules
**Files:**
- Create: `src/validation/rules.ts`
- Create: `src/validation/rules.test.ts`

## Phase 3: API Layer (HiLL checkpoint)

### Task p03-t01: Create REST endpoints using schema + validation
**Files:**
- Create: `src/api/endpoints.ts`
- Modify: `src/db/schema.ts` (import types)
- Modify: `src/validation/rules.ts` (wire to endpoints)
```

## Orchestration Flow

1. **Dispatch manifest** identifies p01 and p02 as parallel-safe.
2. p03 is the HiLL checkpoint — orchestrator will pause before dispatching p03.
3. **Parallel execution** of p01 and p02 proceeds as in the simple pattern.
4. **Reconciliation** merges p01 and p02.
5. **HiLL pause** — orchestrator reports:

```
Orchestration paused at HiLL checkpoint: Phase 3

Completed:
- Phase 1: Data Layer (2 tasks, all passed, merged)
- Phase 2: Business Logic (1 task, passed, merged)

Next: Phase 3 — API Layer (1 task)
Note: Phase 3 modifies files from both Phase 1 and Phase 2.

Continue? (y/n)
```

6. After user approval, p03 executes (may run as single-thread since it touches files from prior phases).

## Key Behaviors

- **Checkpoint boundary is a hard barrier.** All units in the pre-checkpoint run must complete and reconcile before the checkpoint fires.
- **Post-checkpoint phases** may resume with either parallel or sequential execution depending on file dependencies.
- **User approval** is interactive (`AskUserQuestion`) — this is the one allowed interaction point during orchestration.
- **State persistence:** If the session ends at the checkpoint, `state.md` reflects the pause state and can be resumed.

## Expected Artifact Output

In `implementation.md`, the orchestration run shows completion up to the checkpoint:

```markdown
### Run 1 — 2026-02-17 14:30

**Branch:** project-impl
**Policy:** baseline=strict, merge=merge, retry-limit=2
**Units:** 2 dispatched, 2 passed, 0 failed, 0 conflicts

... (unit outcomes as in simple pattern) ...

#### Outstanding Items
- HiLL checkpoint reached: Phase 3 awaiting user approval
```

After user approves and p03 executes:

```markdown
### Run 2 — 2026-02-17 15:00

**Branch:** project-impl
**Policy:** baseline=strict, merge=merge, retry-limit=2
**Units:** 1 dispatched, 1 passed, 0 failed, 0 conflicts

#### Unit Outcomes

| Unit | Status | Commits | Tests | Review | Disposition |
|------|--------|---------|-------|--------|-------------|
| p03 | pass | ghi9012 | pass | pass | merged |

#### Outstanding Items
- None
```
