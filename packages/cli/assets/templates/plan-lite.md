---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: YYYY-MM-DD
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: []
oat_plan_parallel_groups: []
oat_plan_source: lite
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
oat_template_name: plan-lite
---

# Lite Plan: {Project Name}

**Goal:** [State the outcome this single-sitting change must achieve.]

## Summary

[Summarize the requested behavior and the smallest coherent implementation.]

## Decisions

- [Record the decisions made during the critical interview.]

## Assumptions

- [Record assumptions the implementation and validation depend on.]

## Out of Scope

- [Name adjacent work intentionally excluded from this change.]

## Validation Criteria

- [ ] [Observable criterion] — Check: `[exact verification command]`
- [ ] [Observable criterion] — Check: `[exact verification command]`

## Parallelism

This plan has one phase and executes sequentially.

## Phase 1: [Phase Name]

### Task p01-t01: [Task Name]

**Files:**

- Create: `[path/to/file.ts]`
- Modify: `[path/to/existing.ts]`

**Step 1: Write test (RED)**

[Describe the failing test and its expected failure.]

Run: `[exact focused test command]`
Expected: Test fails for the intended missing behavior (RED)

**Step 2: Implement (GREEN)**

[Describe the smallest implementation that satisfies the test.]

Run: `[exact focused test command]`
Expected: Test passes (GREEN)

**Step 3: Refactor and format**

[Describe bounded cleanup and name the exact write-mode formatting command.]

**Step 4: Verify**

Run: `[exact task verification command]`
Expected: No errors

**Step 5: Commit**

```bash
git add [task files]
git commit -m "feat(p01-t01): [description]"
```

---

### Task p01-t02: [Task Name]

**Files:**

- Modify: `[path/to/existing.ts]`

**Step 1: Write test (RED)**

[Describe the failing test and its expected failure.]

Run: `[exact focused test command]`
Expected: Test fails for the intended missing behavior (RED)

**Step 2: Implement (GREEN)**

[Describe the smallest implementation that satisfies the test.]

Run: `[exact focused test command]`
Expected: Test passes (GREEN)

**Step 3: Refactor and format**

[Describe bounded cleanup and name the exact write-mode formatting command.]

**Step 4: Verify**

Run: `[exact task verification command]`
Expected: No errors

**Step 5: Commit**

```bash
git add [task files]
git commit -m "feat(p01-t02): [description]"
```

---

## Reviews

| Scope  | Type     | Status  | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | ------- | ---- | -------- | ------------- | ---------- | ----------- |
| p01    | code     | pending | -    | -        | -             | -          | -           |
| final  | code     | pending | -    | -        | -             | -          | -           |
| spec   | artifact | pending | -    | -        | -             | -          | -           |
| design | artifact | pending | -    | -        | -             | -          | -           |

## Implementation Complete

**Summary:**

- Phase 1: [N] tasks — [Description]

**Total: [N] tasks**

Ready for final code review and PR preparation.

## References

- Imported Source: `references/imported-plan.md` (when imported provenance applies)
