---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-02-16
oat_phase: plan
oat_phase_status: complete
oat_plan_hil_phases: ["p05"]
oat_plan_source: quick
oat_generated: false
oat_template: false
---

# Implementation Plan: quick-oats

> Execute this plan using the `oat-project-implement` skill, task-by-task with phase checkpoints and review gates.

**Goal:** Ship an OAT quick/import workflow path where imported provider plans are normalized into canonical `plan.md`, quick/import projects can proceed without mandatory `spec.md`/`design.md`, and project routing/state remains coherent.

**Architecture:** Introduce explicit workflow metadata in `state.md` and `plan.md`, add new entry skills for quick/import/promotion flows, and make existing downstream skills (`progress`, `review`, `pr`) mode-aware while preserving full-workflow behavior.

**Tech Stack:** Markdown skill contracts, bash state generator script, OAT templates, existing repo validation commands (`pnpm oat:validate-skills`, `pnpm lint`, `pnpm type-check`).

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add workflow metadata to state template`

## Planning Checklist

- [x] Confirmed HiL checkpoints with user
- [x] Set `oat_plan_hil_phases` in frontmatter

---

## Phase 1: Metadata Contracts + Baseline Artifacts

### Task p01-t01: Add workflow metadata to state template

**Files:**
- Modify: `.oat/templates/state.md`

**Step 1: Write test (RED)**

Review current `state.md` template and verify it lacks mode/source fields.

Run: `rg -n "oat_workflow_mode|oat_workflow_origin" .oat/templates/state.md`
Expected: no matches (RED)

**Step 2: Implement (GREEN)**

Add frontmatter fields:
- `oat_workflow_mode: full`
- `oat_workflow_origin: native`

**Step 3: Refactor**

Add concise inline comments describing allowed enum values and intent.

**Step 4: Verify**

Run: `rg -n "oat_workflow_mode|oat_workflow_origin" .oat/templates/state.md`
Expected: both fields present (GREEN)

**Step 5: Commit**

```bash
git add .oat/templates/state.md
git commit -m "feat(p01-t01): add workflow mode/origin to state template"
```

---

### Task p01-t02: Add plan source/import traceability metadata to plan template

**Files:**
- Modify: `.oat/templates/plan.md`

**Step 1: Write test (RED)**

Run: `rg -n "oat_plan_source|oat_import_reference|oat_import_source_path|oat_import_provider" .oat/templates/plan.md`
Expected: no matches (RED)

**Step 2: Implement (GREEN)**

Add frontmatter fields:
- `oat_plan_source: full`
- `oat_import_reference: null`
- `oat_import_source_path: null`
- `oat_import_provider: null`

**Step 3: Refactor**

Adjust `## References` section text to clarify `spec.md`/`design.md` may be optional for quick/import mode.

**Step 4: Verify**

Run: `rg -n "oat_plan_source|oat_import_reference|oat_import_source_path|oat_import_provider" .oat/templates/plan.md`
Expected: all fields present (GREEN)

**Step 5: Commit**

```bash
git add .oat/templates/plan.md
git commit -m "feat(p01-t02): add plan source and import metadata to plan template"
```

---

### Task p01-t03: Seed quick-oats implementation log with project charter and decisions

**Files:**
- Modify: `.oat/projects/shared/quick-oats/implementation.md`

**Step 1: Write test (RED)**

Verify file is empty/missing required structure.

Run: `wc -l .oat/projects/shared/quick-oats/implementation.md`
Expected: near-empty (RED)

**Step 2: Implement (GREEN)**

Initialize with:
- Project objective
- decision log section
- execution log with timestamps
- planned commit map

**Step 3: Refactor**

Ensure content mirrors implementation template conventions for future PR generation.

**Step 4: Verify**

Run: `rg -n "Decision Log|Implementation Log|Final Summary" .oat/projects/shared/quick-oats/implementation.md`
Expected: key sections present (GREEN)

**Step 5: Commit**

```bash
git add .oat/projects/shared/quick-oats/implementation.md .oat/projects/shared/quick-oats/plan.md
git commit -m "docs(p01-t03): initialize quick-oats plan and implementation log"
```

---

## Phase 2: New Quick/Import/Promotion Entry Skills

### Task p02-t01: Create `oat-project-quick-start` skill contract

**Files:**
- Create: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `AGENTS.md`
- Modify: `docs/oat/skills/index.md`

**Step 1: Write test (RED)**

Run: `test -f .agents/skills/oat-project-quick-start/SKILL.md || echo "missing"`
Expected: missing (RED)

**Step 2: Implement (GREEN)**

Create skill using `create-oat-skill` conventions:
- phase banner
- active project resolution
- uses existing `discovery.md`
- generates/normalizes `plan.md`
- sets `oat_workflow_mode: quick`, `oat_workflow_origin: native`, `oat_plan_source: quick`

**Step 3: Refactor**

Keep language skill-first (`oat-project-*`) and avoid slash aliases.

**Step 4: Verify**

Run: `pnpm oat:validate-skills`
Expected: skill passes validation

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-quick-start/SKILL.md AGENTS.md docs/oat/skills/index.md
git commit -m "feat(p02-t01): add oat-project-quick-start skill"
```

---

### Task p02-t02: Create `oat-project-import-plan` skill contract

**Files:**
- Create: `.agents/skills/oat-project-import-plan/SKILL.md`
- Modify: `AGENTS.md`
- Modify: `docs/oat/skills/index.md`

**Step 1: Write test (RED)**

Run: `test -f .agents/skills/oat-project-import-plan/SKILL.md || echo "missing"`
Expected: missing (RED)

**Step 2: Implement (GREEN)**

Define flow:
- validate local markdown source path
- copy to `references/imported-plan.md`
- normalize into canonical `plan.md`
- set `oat_workflow_mode: import`, `oat_workflow_origin: imported`, `oat_plan_source: imported`

**Step 3: Refactor**

Include explicit fallback rules when imported plan lacks test/commit details.

**Step 4: Verify**

Run: `pnpm oat:validate-skills`
Expected: validation passes

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-import-plan/SKILL.md AGENTS.md docs/oat/skills/index.md
git commit -m "feat(p02-t02): add oat-project-import-plan skill"
```

---

### Task p02-t03: Create `oat-project-promote-full` skill contract

**Files:**
- Create: `.agents/skills/oat-project-promote-full/SKILL.md`
- Modify: `AGENTS.md`
- Modify: `docs/oat/skills/index.md`

**Step 1: Write test (RED)**

Run: `test -f .agents/skills/oat-project-promote-full/SKILL.md || echo "missing"`
Expected: missing (RED)

**Step 2: Implement (GREEN)**

Define in-place promotion flow:
- detect quick/import project
- backfill missing `discovery/spec/design` artifacts without replacing active plan history
- set `oat_workflow_mode: full`
- keep provenance (`oat_plan_source`) unless a new full plan is generated

**Step 3: Refactor**

Clarify when artifacts are generated vs refreshed.

**Step 4: Verify**

Run: `pnpm oat:validate-skills`
Expected: validation passes

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-promote-full/SKILL.md AGENTS.md docs/oat/skills/index.md
git commit -m "feat(p02-t03): add oat-project-promote-full skill"
```

---

## Phase 3: Make Existing Routing/Review/PR Skills Mode-Aware

### Task p03-t01: Update project progress router for quick/import modes

**Files:**
- Modify: `.agents/skills/oat-project-progress/SKILL.md`

**Step 1: Write test (RED)**

Run: `rg -n "oat_workflow_mode|quick|import" .agents/skills/oat-project-progress/SKILL.md`
Expected: missing/insufficient coverage (RED)

**Step 2: Implement (GREEN)**

Add mode-aware next-step table:
- full: existing lifecycle
- quick: discover -> plan -> implement
- import: plan -> implement

**Step 3: Refactor**

Ensure available-skill section includes new entry skills.

**Step 4: Verify**

Run: `pnpm oat:validate-skills`
Expected: pass

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-progress/SKILL.md
git commit -m "feat(p03-t01): make oat-project-progress mode-aware"
```

---

### Task p03-t02: Update dashboard generator routing + command labels to oat-project naming

**Files:**
- Modify: `.oat/scripts/generate-oat-state.sh`

**Step 1: Write test (RED)**

Run: `rg -n "/oat:|oat:pr-project|/oat:new-project" .oat/scripts/generate-oat-state.sh`
Expected: matches found (RED)

**Step 2: Implement (GREEN)**

Replace legacy slash/old names with `oat-project-*` recommendations, and add mode-aware mapping in `compute_next_step`.

**Step 3: Refactor**

Keep backward-compatible text where needed as alias notes only.

**Step 4: Verify**

Run: `rg -n "oat-project-" .oat/scripts/generate-oat-state.sh`
Expected: routing and quick commands use new naming

**Step 5: Commit**

```bash
git add .oat/scripts/generate-oat-state.sh
git commit -m "feat(p03-t02): update dashboard routing to oat-project names and modes"
```

---

### Task p03-t03: Update review + PR skills to treat spec/design as optional in quick/import mode

**Files:**
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `.agents/skills/oat-project-pr-progress/SKILL.md`
- Modify: `.agents/skills/oat-project-pr-final/SKILL.md`

**Step 1: Write test (RED)**

Run:
- `rg -n "Required:.*spec|Required:.*design|ls \"\$PROJECT_PATH/spec.md\"" .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-pr-progress/SKILL.md .agents/skills/oat-project-pr-final/SKILL.md`
Expected: hard requirements found (RED)

**Step 2: Implement (GREEN)**

Add mode-aware contract:
- full mode: require spec/design as before
- quick/import: require plan + implementation (if present), use spec/design when available
- include reduced-assurance note in review/PR output when spec/design are absent

**Step 3: Refactor**

Normalize references language to avoid implying mandatory spec/design for all modes.

**Step 4: Verify**

Run: `pnpm oat:validate-skills`
Expected: pass

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-pr-progress/SKILL.md .agents/skills/oat-project-pr-final/SKILL.md
git commit -m "feat(p03-t03): support quick/import projects in review and pr skills"
```

---

## Phase 4: Docs + Internal Reference Updates

### Task p04-t01: Document quick/import workflows in public docs

**Files:**
- Modify: `README.md`
- Modify: `docs/oat/quickstart.md`
- Modify: `docs/oat/workflow/lifecycle.md`
- Modify: `docs/oat/projects/artifacts.md`

**Step 1: Write test (RED)**

Run: `rg -n "quick workflow|import plan|oat-project-import-plan|oat-project-quick-start|oat-project-promote-full" README.md docs/oat`
Expected: missing/incomplete coverage (RED)

**Step 2: Implement (GREEN)**

Add concise, user-facing docs for:
- quick path
- import path
- promotion path
- mode metadata behavior

**Step 3: Refactor**

Ensure wording stays skill-first and consistent with renamed namespace.

**Step 4: Verify**

Run: `rg -n "oat-project-(quick-start|import-plan|promote-full)" README.md docs/oat`
Expected: references present

**Step 5: Commit**

```bash
git add README.md docs/oat/quickstart.md docs/oat/workflow/lifecycle.md docs/oat/projects/artifacts.md
git commit -m "docs(p04-t01): document quick and import workflow paths"
```

---

### Task p04-t02: Update internal project reference artifacts for dogfood consistency

**Files:**
- Modify: `.oat/internal-project-reference/decision-record.md`
- Modify: `.oat/internal-project-reference/roadmap.md`
- Modify: `.oat/internal-project-reference/backlog.md`

**Step 1: Write test (RED)**

Run: `rg -n "quick mode|import plan|workflow mode|plan source" .oat/internal-project-reference`
Expected: stale/partial references (RED)

**Step 2: Implement (GREEN)**

Record decisions and follow-up tasks for quick/import rollout.

**Step 3: Refactor**

Ensure ADR language uses final naming (`full|quick|import`, `full|quick|imported`).

**Step 4: Verify**

Run: `rg -n "oat_workflow_mode|oat_plan_source|imported" .oat/internal-project-reference`
Expected: consistent decision records

**Step 5: Commit**

```bash
git add .oat/internal-project-reference/decision-record.md .oat/internal-project-reference/roadmap.md .oat/internal-project-reference/backlog.md
git commit -m "docs(p04-t02): record quick/import workflow decisions internally"
```

---

## Phase 5: End-to-End Verification + Finalization

### Task p05-t01: Run validation and fix remaining drift

**Files:**
- Modify: any touched files as needed for validation fixes

**Step 1: Write test (RED)**

Run validation suite:
- `pnpm oat:validate-skills`
- `pnpm lint`
- `pnpm type-check`

Expected: identify any failures (RED)

**Step 2: Implement (GREEN)**

Apply minimal fixes for any reported issues.

**Step 3: Refactor**

Ensure no unrelated files are modified.

**Step 4: Verify**

Re-run:
- `pnpm oat:validate-skills`
- `pnpm lint`
- `pnpm type-check`

Expected: all pass (GREEN)

**Step 5: Commit**

```bash
git add <fixed-files>
git commit -m "chore(p05-t01): resolve validation and lint drift"
```

---

### Task p05-t02: Final implementation summary + readiness for project completion

**Files:**
- Modify: `.oat/projects/shared/quick-oats/implementation.md`

**Step 1: Write test (RED)**

Run: `rg -n "Final Summary|Decision Log|Verification performed" .oat/projects/shared/quick-oats/implementation.md`
Expected: missing/incomplete final sections (RED)

**Step 2: Implement (GREEN)**

Finalize detailed record:
- per-commit outcomes
- decisions made and rationale
- verification output summary
- known limitations / deferred follow-ups

**Step 3: Refactor**

Align structure with downstream PR generation expectations.

**Step 4: Verify**

Run: `rg -n "What shipped|Behavioral changes|Verification performed|Design deltas" .oat/projects/shared/quick-oats/implementation.md`
Expected: complete sections present

**Step 5: Commit**

```bash
git add .oat/projects/shared/quick-oats/implementation.md
git commit -m "docs(p05-t02): finalize quick-oats implementation record"
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

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**
- Phase 1: metadata contracts + project tracking setup
- Phase 2: new quick/import/promotion skills
- Phase 3: mode-aware routing/review/PR updates
- Phase 4: public/internal documentation updates
- Phase 5: validation hardening + final implementation log

**Total:** 13 tasks

Ready for review and merge after execution.

---

## References

- State template: `.oat/templates/state.md`
- Plan template: `.oat/templates/plan.md`
- Implementation log: `.oat/projects/shared/quick-oats/implementation.md`
- Skill conventions: `.agents/skills/create-oat-skill/SKILL.md`
