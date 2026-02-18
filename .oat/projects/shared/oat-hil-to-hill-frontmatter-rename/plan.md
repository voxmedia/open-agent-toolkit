---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-02-18
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ["p03"]
oat_plan_source: imported
oat_import_reference: references/imported-plan.md
oat_import_source_path: /Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/2026-02-18-oat-hil-to-hill-frontmatter-rename.md
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: oat-hil-to-hill-frontmatter-rename

> Execute this plan using the `oat-project-implement` skill, task-by-task with phase checkpoints and review gates.

**Goal:** Rename `oat_hil_*` frontmatter keys to `oat_hill_*` across all active templates, skills, docs, CLI code, and repo references using a hard-cut migration with no backward compatibility.

**Architecture:** Global find-and-replace across active surfaces with preflight audit and post-rename verification sweep.

**Tech Stack:** TypeScript, Vitest, Biome, grep/sed-style replacements.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `refactor(p02-t01): rename hil to hill in templates`

## Planning Checklist

- [x] Imported external plan preserved at `references/imported-plan.md`
- [x] Generated canonical `pNN-tNN` task sequence
- [x] Marked plan ready for `oat-project-implement`

---

## Phase 1: Preflight & Audit

### Task p01-t01: Verify preconditions and enumerate old key usage

**Files:**
- Read-only audit (no files modified)

**Step 1: Verify preconditions**

Confirm that no other project implementation is actively in flight on the working branch. The imported plan requires `.oat/active-project` to be absent or pointing to this project. Since import mode sets the active project to this rename project, verify the pointer is correct.

Run: `cat .oat/active-project`
Expected: `.oat/projects/shared/oat-hil-to-hill-frontmatter-rename`

**Step 2: Enumerate old key usage**

Run grep to enumerate all occurrences of old keys and classify as active vs. archived/reference:

Run: `grep -rn "oat_hil_checkpoints\|oat_hil_completed\|oat_plan_hil_phases" --include="*.md" --include="*.ts" .`
Expected: Output listing all occurrences, separated into:
- **Active surfaces** (to rename): `.oat/templates/`, `.agents/skills/`, `docs/oat/`, `packages/cli/src/`, `.oat/projects/shared/*/state.md`, `.oat/projects/shared/*/plan.md`
- **Excluded surfaces** (no change): `references/imported-plan.md`, `.oat/repo/reference/external-plans/2026-02-18-oat-hil-to-hill-frontmatter-rename.md`

**Step 3: Verify**

Run: `echo "Preflight complete"`
Expected: Enumeration shows ~93 occurrences across ~19 files; active-surface rename targets identified.

**Step 4: Commit**

No commit for preflight audit (read-only).

---

## Phase 2: Hard-Cut Rename in Active Sources

### Task p02-t01: Rename keys in OAT templates

**Files:**
- Modify: `.oat/templates/plan.md`
- Modify: `.oat/templates/state.md`

**Step 1: Implement rename**

Replace all occurrences in template files:
- `oat_hil_checkpoints` -> `oat_hill_checkpoints`
- `oat_hil_completed` -> `oat_hill_completed`
- `oat_plan_hil_phases` -> `oat_plan_hill_phases`

**Step 2: Verify**

Run: `grep -n "oat_hil_" .oat/templates/plan.md .oat/templates/state.md`
Expected: Zero matches (all renamed to `oat_hill_`).

Run: `grep -n "oat_hill_" .oat/templates/plan.md .oat/templates/state.md`
Expected: Matches for new key names confirming replacement.

**Step 3: Commit**

```bash
git add .oat/templates/plan.md .oat/templates/state.md
git commit -m "refactor(p02-t01): rename hil to hill in OAT templates"
```

---

### Task p02-t02: Rename keys in skill files

**Files:**
- Modify: `.agents/skills/oat-project-discover/SKILL.md`
- Modify: `.agents/skills/oat-project-spec/SKILL.md`
- Modify: `.agents/skills/oat-project-design/SKILL.md`
- Modify: `.agents/skills/oat-project-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.agents/skills/oat-project-progress/SKILL.md`

**Step 1: Implement rename**

Replace all occurrences across skill files:
- `oat_hil_checkpoints` -> `oat_hill_checkpoints`
- `oat_hil_completed` -> `oat_hill_completed`
- `oat_plan_hil_phases` -> `oat_plan_hill_phases`

**Step 2: Verify**

Run: `grep -rn "oat_hil_" .agents/skills/oat-project-*/SKILL.md`
Expected: Zero matches.

Run: `grep -rn "oat_hill_" .agents/skills/oat-project-*/SKILL.md`
Expected: Matches for new key names in all 8 skill files.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-*/SKILL.md
git commit -m "refactor(p02-t02): rename hil to hill in skill files"
```

---

### Task p02-t03: Rename keys in docs

**Files:**
- Modify: `docs/oat/workflow/hil-checkpoints.md`
- Discover/modify: Any additional `docs/oat/**` files with old key references

**Step 1: Discover additional doc targets**

Run: `grep -rn "oat_hil_" docs/oat/`
Expected: Matches in `docs/oat/workflow/hil-checkpoints.md` (5 occurrences); potentially others.

**Step 2: Implement rename**

Replace all occurrences in doc files:
- `oat_hil_checkpoints` -> `oat_hill_checkpoints`
- `oat_hil_completed` -> `oat_hill_completed`
- `oat_plan_hil_phases` -> `oat_plan_hill_phases`

**Step 3: Verify**

Run: `grep -rn "oat_hil_" docs/oat/`
Expected: Zero matches.

**Step 4: Commit**

```bash
git add docs/oat/
git commit -m "refactor(p02-t03): rename hil to hill in docs"
```

---

### Task p02-t04: Rename keys in CLI code and tests

**Files:**
- Modify: `packages/cli/src/commands/state/generate.ts`
- Modify: `packages/cli/src/commands/state/generate.test.ts`

**Step 1: Write test expectation (RED)**

Update test fixtures/assertions in `generate.test.ts` to expect `oat_hill_*` keys instead of `oat_hil_*`.

Run: `pnpm --filter @oat/cli exec vitest run src/commands/state/generate.test.ts`
Expected: Test fails because production code still uses old keys.

**Step 2: Implement (GREEN)**

Update `generate.ts` to read/write `oat_hill_*` keys instead of `oat_hil_*`.

Run: `pnpm --filter @oat/cli exec vitest run src/commands/state/generate.test.ts`
Expected: Tests pass.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli lint && pnpm --filter @oat/cli type-check`
Expected: No errors.

Run: `grep -n "oat_hil_" packages/cli/src/commands/state/generate.ts packages/cli/src/commands/state/generate.test.ts`
Expected: Zero matches.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/state/generate.ts packages/cli/src/commands/state/generate.test.ts
git commit -m "refactor(p02-t04): rename hil to hill in CLI state generation"
```

---

### Task p02-t05: Rename keys in active project artifacts

**Files:**
- Modify: `.oat/projects/shared/oat-hil-to-hill-frontmatter-rename/state.md`
- Modify: `.oat/projects/shared/oat-hil-to-hill-frontmatter-rename/plan.md`
- Modify: `.oat/projects/shared/oat-cleanup-project-and-artifacts/state.md`
- Modify: `.oat/projects/shared/oat-cleanup-project-and-artifacts/plan.md`

**Step 1: Implement rename**

Replace old keys in this project's own state.md and plan.md, plus the completed cleanup project's state.md and plan.md.

Do **not** modify:
- `references/imported-plan.md` (preserved source)
- `.oat/repo/reference/external-plans/2026-02-18-oat-hil-to-hill-frontmatter-rename.md` (source plan)

**Step 2: Verify**

Run: `grep -rn "oat_hil_" .oat/projects/shared/`
Expected: Only matches in `references/imported-plan.md` (preserved, read-only).

**Step 3: Commit**

```bash
git add .oat/projects/shared/oat-hil-to-hill-frontmatter-rename/state.md .oat/projects/shared/oat-hil-to-hill-frontmatter-rename/plan.md .oat/projects/shared/oat-cleanup-project-and-artifacts/state.md .oat/projects/shared/oat-cleanup-project-and-artifacts/plan.md
git commit -m "refactor(p02-t05): rename hil to hill in active project artifacts"
```

---

## Phase 3: Verification & Validation

### Task p03-t01: Assert zero old-key matches in active surfaces and run full test suite

**Files:**
- Read-only verification (no files modified unless fixes needed)

**Step 1: Assert zero old-key matches in active surfaces**

Run grep sweep across all active directories:

Run: `grep -rn "oat_hil_checkpoints\|oat_hil_completed\|oat_plan_hil_phases" .agents/ .oat/templates/ packages/cli/src/ docs/oat/`
Expected: Zero matches.

Run: `grep -rn "oat_hil_" .oat/projects/shared/ --include="state.md" --include="plan.md" | grep -v "references/"`
Expected: Zero matches (only `references/imported-plan.md` excluded files may contain old keys).

**Step 2: Confirm new keys present**

Run: `grep -rn "oat_hill_checkpoints\|oat_hill_completed\|oat_plan_hill_phases" .agents/ .oat/templates/ packages/cli/src/ docs/oat/`
Expected: Matches across all renamed surfaces (templates, skills, docs, CLI code).

**Step 3: Run full test suite**

Run: `pnpm test`
Expected: All tests pass.

Run: `pnpm type-check`
Expected: No errors.

Run: `pnpm lint`
Expected: No errors (pre-existing warnings acceptable).

**Step 4: Commit**

No commit if verification-only. If any fixes were needed, commit them:

```bash
git commit -m "fix(p03-t01): fix remaining old-key references found during verification"
```

---

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| p03 | code | pending | - | - |
| final | code | pending | - | - |
| spec | artifact | pending | - | - |
| design | artifact | pending | - | - |

**Status values:** `pending` -> `received` -> `fixes_added` -> `fixes_completed` -> `passed`

---

## Implementation Complete

**Summary:**
- Phase 1: 1 task - preflight safety check and old-key enumeration
- Phase 2: 5 tasks - hard-cut rename across templates, skills, docs, CLI code, and project artifacts
- Phase 3: 1 task - verification sweep and full test suite

**Total: 7 tasks**

Ready for implementation with `oat-project-implement`.

---

## References

- Imported Source: `references/imported-plan.md`
- External Source Path: `/Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/2026-02-18-oat-hil-to-hill-frontmatter-rename.md`
