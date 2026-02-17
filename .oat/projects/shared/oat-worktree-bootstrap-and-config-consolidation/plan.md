---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-02-17
oat_phase: plan
oat_phase_status: complete
oat_plan_hil_phases: ["p05"]
oat_plan_source: imported
oat_import_reference: references/imported-plan.md
oat_import_source_path: /Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/2026-02-17-oat-worktree-bootstrap-and-config-consolidation.md
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: oat-worktree-bootstrap-and-config-consolidation

> Execute this plan using the `oat-project-implement` skill, task-by-task with review gates.

**Goal:** Add an OAT-native worktree bootstrap skill and introduce phase-A config consolidation with `.oat/config.json` for new non-sync settings.

**Architecture:** Implement one dedicated skill (`oat-worktree-bootstrap`) with deterministic root resolution and baseline verification, then update docs/reference artifacts to establish `.oat/config.json` as the new home for non-sync settings while keeping existing pointer contracts stable.

**Tech Stack:** Markdown skill contracts, shell commands (`git`, `pnpm`, existing OAT scripts), OAT reference docs/backlog/ADRs.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): scaffold oat-worktree-bootstrap skill`

## Planning Checklist

- [x] Imported source plan snapshot preserved at `references/imported-plan.md`
- [x] Canonical `pNN-tNN` task structure generated
- [x] Import-mode metadata populated in frontmatter

---

## Phase 1: Worktree Skill Scaffold and Flow

### Task p01-t01: Create `oat-worktree-bootstrap` skill scaffold

**Files:**
- Create: `.agents/skills/oat-worktree-bootstrap/SKILL.md`
- Create: `.agents/skills/oat-worktree-bootstrap/references/worktree-conventions.md`
- Modify: `docs/oat/skills/index.md`

**Step 1: Write test (RED)**

Run: `test -f .agents/skills/oat-worktree-bootstrap/SKILL.md`
Expected: non-zero exit code (skill does not exist yet)

**Step 2: Implement (GREEN)**

Add skill frontmatter and execution contract:
- explicit invocation (`disable-model-invocation: true`)
- progress banner + step indicators
- inputs: `branch-name`, `--base`, `--path`, `--existing`

**Step 3: Refactor**

Move long examples/policies into `references/worktree-conventions.md` and keep `SKILL.md` focused on execution flow.

**Step 4: Verify**

Run: `pnpm oat:validate-skills`
Expected: validation passes including new skill.

**Step 5: Commit**

```bash
git add .agents/skills/oat-worktree-bootstrap docs/oat/skills/index.md
git commit -m "feat(p01-t01): scaffold oat-worktree-bootstrap skill"
```

---

### Task p01-t02: Implement deterministic root and creation/reuse rules

**Files:**
- Modify: `.agents/skills/oat-worktree-bootstrap/SKILL.md`
- Modify: `.agents/skills/oat-worktree-bootstrap/references/worktree-conventions.md`

**Step 1: Write test (RED)**

Run: `rg -n "OAT_WORKTREES_ROOT|worktrees.root|--existing|--base" .agents/skills/oat-worktree-bootstrap/SKILL.md`
Expected: missing one or more required contract points.

**Step 2: Implement (GREEN)**

Define root precedence:
1. `--path`
2. `OAT_WORKTREES_ROOT`
3. `.oat/config.json -> worktrees.root`
4. discovered existing roots (`.worktrees`, `worktrees`, `../<repo>-worktrees`)
5. fallback `../<repo>-worktrees`

Define creation behavior:
- existing branch -> attach worktree
- missing branch -> create from `--base` (default `origin/main`)

**Step 3: Refactor**

Normalize error/recovery messages for collisions, invalid branch names, and missing refs.

**Step 4: Verify**

Run: `rg -n "precedence|fallback|origin/main|branch" .agents/skills/oat-worktree-bootstrap/SKILL.md`
Expected: all required rules present.

**Step 5: Commit**

```bash
git add .agents/skills/oat-worktree-bootstrap
git commit -m "feat(p01-t02): add deterministic worktree root and creation rules"
```

---

## Phase 2: Baseline Verification and Safety Gate

### Task p02-t01: Add strict baseline verification gate

**Files:**
- Modify: `.agents/skills/oat-worktree-bootstrap/SKILL.md`
- Modify: `.agents/skills/oat-worktree-bootstrap/references/worktree-conventions.md`

**Step 1: Write test (RED)**

Run: `rg -n "pnpm run worktree:init|pnpm run cli -- status --scope project|pnpm test|git status --porcelain" .agents/skills/oat-worktree-bootstrap/SKILL.md`
Expected: missing one or more required baseline checks.

**Step 2: Implement (GREEN)**

Require this order before reporting ready:
1. `pnpm run worktree:init`
2. `pnpm run cli -- status --scope project`
3. `pnpm test`
4. `git status --porcelain` clean

On test failure:
- show details
- prompt abort/proceed
- if proceed, record baseline-failure note in active project `implementation.md`

**Step 3: Refactor**

Make baseline-failure logging template consistent and timestamped.

**Step 4: Verify**

Run: `rg -n "baseline|abort|proceed|implementation.md" .agents/skills/oat-worktree-bootstrap/SKILL.md`
Expected: explicit failure-handling path present.

**Step 5: Commit**

```bash
git add .agents/skills/oat-worktree-bootstrap
git commit -m "feat(p02-t01): enforce baseline verification and failure override logging"
```

---

### Task p02-t02: Add active-project pointer guard and recovery

**Files:**
- Modify: `.agents/skills/oat-worktree-bootstrap/SKILL.md`

**Step 1: Write test (RED)**

Run: `rg -n "active-project|oat-project-clear-active|oat-project-open" .agents/skills/oat-worktree-bootstrap/SKILL.md`
Expected: guard logic missing or incomplete.

**Step 2: Implement (GREEN)**

Add guard for invalid/missing `.oat/active-project`:
- detect broken pointer
- route to `oat-project-clear-active` or `oat-project-open`
- require explicit confirmation before continuing

**Step 3: Refactor**

Keep this non-destructive; no silent pointer rewrites.

**Step 4: Verify**

Run: `rg -n "non-destructive|explicit confirmation|active-project" .agents/skills/oat-worktree-bootstrap/SKILL.md`
Expected: recovery contract documented.

**Step 5: Commit**

```bash
git add .agents/skills/oat-worktree-bootstrap/SKILL.md
git commit -m "feat(p02-t02): add active-project recovery guard to worktree skill"
```

---

## Phase 3: `.oat/config.json` Phase-A Consolidation

### Task p03-t01: Introduce `.oat/config.json` for new non-sync settings

**Files:**
- Create: `.oat/config.json`
- Modify: `.agents/skills/oat-worktree-bootstrap/SKILL.md`

**Step 1: Write test (RED)**

Run: `test -f .oat/config.json`
Expected: non-zero exit code (missing)

**Step 2: Implement (GREEN)**

Create `.oat/config.json` with schema version and `worktrees.root`.
Update skill docs to read `worktrees.root` as part of root-resolution precedence.

**Step 3: Refactor**

Document that `.oat/config.json` is currently for new non-sync settings only.

**Step 4: Verify**

Run: `cat .oat/config.json`
Expected: valid JSON with `version` and `worktrees.root`.

**Step 5: Commit**

```bash
git add .oat/config.json .agents/skills/oat-worktree-bootstrap/SKILL.md
git commit -m "feat(p03-t01): add .oat/config.json phase-A worktrees root setting"
```

---

### Task p03-t02: Preserve compatibility with existing pointer/sync files

**Files:**
- Modify: `docs/oat/reference/oat-directory-structure.md`
- Modify: `docs/oat/reference/file-locations.md`

**Step 1: Write test (RED)**

Run: `rg -n "\.oat/config.json|\.oat/sync/config.json|active-project|projects-root" docs/oat/reference/oat-directory-structure.md docs/oat/reference/file-locations.md`
Expected: docs do not yet describe phased ownership clearly.

**Step 2: Implement (GREEN)**

Document ownership split:
- `.oat/config.json` -> new non-sync settings
- `.oat/sync/config.json` -> sync/provider settings (unchanged)
- pointer files remain compatible during phased migration

**Step 3: Refactor**

Add concise migration note and avoid contradictory guidance.

**Step 4: Verify**

Run: `rg -n "phase|compatibility|non-sync|sync config" docs/oat/reference/oat-directory-structure.md docs/oat/reference/file-locations.md`
Expected: consistent phased wording across both docs.

**Step 5: Commit**

```bash
git add docs/oat/reference/oat-directory-structure.md docs/oat/reference/file-locations.md
git commit -m "docs(p03-t02): document phase-A config ownership and compatibility"
```

---

## Phase 4: Backlog + Decision Record Alignment

### Task p04-t01: Update backlog for worktree skill and config consolidation

**Files:**
- Modify: `.oat/repo/reference/backlog.md`

**Step 1: Write test (RED)**

Run: `rg -n "worktree workflow skill|Consolidate OAT runtime config" .oat/repo/reference/backlog.md`
Expected: entries missing required phase-A specifics.

**Step 2: Implement (GREEN)**

Add details for:
- worktree root precedence and baseline gate
- explicit config-consolidation phased item

**Step 3: Refactor**

Link backlog entries to external plan artifact.

**Step 4: Verify**

Run: `rg -n "2026-02-17-oat-worktree-bootstrap-and-config-consolidation" .oat/repo/reference/backlog.md`
Expected: cross-link present.

**Step 5: Commit**

```bash
git add .oat/repo/reference/backlog.md
git commit -m "docs(p04-t01): align backlog with worktree skill and config phases"
```

---

### Task p04-t02: Add ADR for phase-A config decision

**Files:**
- Modify: `.oat/repo/reference/decision-record.md`

**Step 1: Write test (RED)**

Run: `rg -n "ADR-010|\.oat/config.json" .oat/repo/reference/decision-record.md`
Expected: ADR entry missing.

**Step 2: Implement (GREEN)**

Add ADR describing:
- why no new pointer file
- why phase-A `.oat/config.json` now
- phased migration follow-ups

**Step 3: Refactor**

Ensure decision index and body stay in sync.

**Step 4: Verify**

Run: `rg -n "ADR-010" .oat/repo/reference/decision-record.md`
Expected: index and full section present.

**Step 5: Commit**

```bash
git add .oat/repo/reference/decision-record.md
git commit -m "docs(p04-t02): record phase-A .oat config consolidation decision"
```

---

## Phase 5: Final Validation and Closeout

### Task p05-t01: Validate artifacts and refresh dashboard state

**Files:**
- Modify: `.oat/projects/shared/oat-worktree-bootstrap-and-config-consolidation/implementation.md`
- Modify: `.oat/projects/shared/oat-worktree-bootstrap-and-config-consolidation/state.md`

**Step 1: Write test (RED)**

Run: `pnpm oat:validate-skills`
Expected: may fail before final fixes.

**Step 2: Implement (GREEN)**

Resolve any validation findings and finalize project metadata:
- state remains import mode and plan-complete
- implementation frontmatter points to first task (`p01-t01`)

**Step 3: Refactor**

Refresh repo dashboard and confirm project discoverability.

**Step 4: Verify**

Run:
- `pnpm oat:validate-skills`
- `bash .oat/scripts/generate-oat-state.sh`

Expected: validation passes; dashboard reflects active imported project.

**Step 5: Commit**

```bash
git add .oat/projects/shared/oat-worktree-bootstrap-and-config-consolidation .oat/state.md
git commit -m "chore(p05-t01): finalize imported project artifacts and validation"
```

---

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| p03 | code | pending | - | - |
| p04 | code | pending | - | - |
| p05 | code | pending | - | - |
| final | code | received | 2026-02-16 | reviews/final-review-2026-02-16.md |
| spec | artifact | pending | - | - |
| design | artifact | pending | - | - |

**Status values:** `pending` -> `received` -> `fixes_added` -> `fixes_completed` -> `passed`

---

## Implementation Complete

**Summary:**
- Phase 1: 2 tasks - create and shape the new worktree skill contract.
- Phase 2: 2 tasks - enforce baseline safety and pointer guards.
- Phase 3: 2 tasks - add `.oat/config.json` phase-A model and compatibility docs.
- Phase 4: 2 tasks - align backlog and decision record.
- Phase 5: 1 task - validate and finalize project state.

**Total: 9 tasks**

Ready for implementation using `oat-project-implement`.

---

## References

- Imported Source: `references/imported-plan.md`
- External Plan Source Path: `/Users/thomas.stang/Code/open-agent-toolkit/.oat/repo/reference/external-plans/2026-02-17-oat-worktree-bootstrap-and-config-consolidation.md`
- Skills Guide: `.agents/docs/skills-guide.md`
- Current Backlog: `.oat/repo/reference/backlog.md`
- Decision Record: `.oat/repo/reference/decision-record.md`
