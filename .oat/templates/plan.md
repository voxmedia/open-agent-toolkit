---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: YYYY-MM-DD
oat_generated: false
oat_template: true
oat_template_name: plan
---

# Implementation Plan: {Project Name}

> **Optional:** If using Claude Code with superpowers plugin, you can use `superpowers:executing-plans` to execute this plan. Otherwise, execute tasks step-by-step.

**Goal:** {Brief goal statement from spec}

**Architecture:** {1-2 sentence architecture summary from design}

**Tech Stack:** {Key technologies from design}

---

## Phase 1: {Phase Name}

### Task 1: {Task Name}

**Files:**
- Create: `{path/to/file.ts}`
- Modify: `{path/to/existing.ts}`

**Step 1: {Action description}**

{Detailed instructions}

**Step 2: {Action description}**

{Detailed instructions}

**Step 3: Verify**

Run: `{verification command}`
Expected: {Expected output}

**Step 4: Commit**

```bash
git add {files}
git commit -m "{conventional commit message}"
```

---

### Task 2: {Task Name}

**Files:**
- {File list}

**Step 1: {Action description}**

{Detailed instructions with code blocks if needed}

```typescript
// Example code to write
```

**Step 2: Write tests first (TDD)**

{Test file and test cases}

**Step 3: Implement**

{Implementation details}

**Step 4: Verify tests pass**

Run: `pnpm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add {files}
git commit -m "{message}"
```

---

## Phase 2: {Phase Name}

### Task 3: {Task Name}

{Continue pattern...}

---

## Implementation Complete

**Summary:**
- Phase 1: {N} tasks - {Description}
- Phase 2: {N} tasks - {Description}

**Total: {N} tasks**

Ready for code review and merge.

---

## References

- Design: `.agent/projects/{project-name}/design.md`
- Spec: `.agent/projects/{project-name}/spec.md`
- Discovery: `.agent/projects/{project-name}/discovery.md`
