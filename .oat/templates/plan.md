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

# Implementation Plan: {Project Name}

> **Optional:** If using Claude Code with superpowers plugin, you can use `superpowers:executing-plans` to execute this plan. Otherwise, execute tasks step-by-step.

**Goal:** {Brief goal statement from spec}

**Architecture:** {1-2 sentence architecture summary from design}

**Tech Stack:** {Key technologies from design}

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

---

## Phase 1: {Phase Name}

### Task p01-t01: {Task Name}

**Files:**
- Create: `{path/to/file.ts}`
- Modify: `{path/to/existing.ts}`

**Step 1: Write test (RED)**

```typescript
// {path/to/file.test.ts}
describe('{feature}', () => {
  it('{test case}', () => {
    // Test implementation
  });
});
```

Run: `pnpm test {path/to/file.test.ts}`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

```typescript
// {path/to/file.ts}
// Implementation code or interface signatures
```

Run: `pnpm test {path/to/file.test.ts}`
Expected: Test passes (GREEN)

**Step 3: Refactor**

{Any cleanup or improvements while tests stay green}

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add {files}
git commit -m "feat(p01-t01): {description}"
```

---

### Task p01-t02: {Task Name}

**Files:**
- {File list}

**Step 1: Write test (RED)**

{Test code}

**Step 2: Implement (GREEN)**

{Implementation code or signatures}

**Step 3: Refactor**

{Optional cleanup}

**Step 4: Verify**

Run: `{verification command}`
Expected: {output}

**Step 5: Commit**

```bash
git add {files}
git commit -m "feat(p01-t02): {description}"
```

---

## Phase 2: {Phase Name}

### Task p02-t01: {Task Name}

{Continue TDD pattern...}

---

## Reviews

{Track reviews here after running /oat:request-review and /oat:receive-review.}

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| final | code | pending | - | - |
| spec | artifact | pending | - | - |
| design | artifact | pending | - | - |

**Status values:** `pending` → `received` → `fixes_added` | `passed`

---

## Implementation Complete

**Summary:**
- Phase 1: {N} tasks - {Description}
- Phase 2: {N} tasks - {Description}

**Total: {N} tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
