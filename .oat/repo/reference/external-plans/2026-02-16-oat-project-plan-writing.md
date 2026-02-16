# OAT Project Plan Writing Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce a shared `oat-project-plan-writing` skill and make all plan-writing workflows follow one canonical `plan.md` format across full, quick, and import modes.

**Architecture:** Add a dedicated plan-format contract skill under `.agents/skills/` and make existing plan producers/plan mutators explicitly invoke it. Refactor `oat-project-plan` to branch prerequisites by workflow mode (`full` vs `quick`) so quick projects can continue plan authoring without a completed design artifact.

**Tech Stack:** Markdown skill specs under `.agents/skills/`, OAT plan template under `.oat/templates/plan.md`, shell-based validation via `pnpm oat:validate-skills`, repository lint/type-check/test commands.

## Phase 1: Create Shared Plan-Writing Contract

### Task 1: Add the new shared skill scaffold

**Files:**
- Create: `.agents/skills/oat-project-plan-writing/SKILL.md`

**Step 1: Write the failing check (RED)**

Run: `test -f .agents/skills/oat-project-plan-writing/SKILL.md`
Expected: non-zero exit code (file missing)

**Step 2: Implement minimal skill frontmatter/body (GREEN)**

Create `.agents/skills/oat-project-plan-writing/SKILL.md` with:
- required OAT frontmatter keys (`disable-model-invocation`, `user-invocable`, `allowed-tools`)
- `## Progress Indicators (User-Facing)` section with `OAT ▸ PLAN WRITING` banner snippet
- a "Canonical Plan Format" section that defines mandatory invariants for `plan.md`:
  - stable task IDs (`pNN-tNN`)
  - required sections (`## Reviews`, `## Implementation Complete`, `## References`)
  - required frontmatter keys (`oat_plan_source`, `oat_plan_hil_phases`, `oat_status`, `oat_ready_for`)
  - review table preservation rules and status semantics

**Step 3: Verify**

Run: `pnpm oat:validate-skills`
Expected: `OK: validated ... oat-* skills`

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-plan-writing/SKILL.md
git commit -m "feat(oat-plan-writing): add canonical plan writing skill"
```

---

### Task 2: Define reusable mode-specific planning inputs in the new skill

**Files:**
- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`

**Step 1: Add mode matrix requirements**

Add a compact matrix that maps required inputs by mode:
- `full`: requires complete `design.md`
- `quick`: requires `discovery.md` + repo knowledge context, design optional
- `import`: requires preserved external source + normalized `plan.md`

**Step 2: Add resume/edit guardrails**

Document how to handle existing `plan.md` edits:
- resume/view/overwrite options
- never delete existing review rows
- restore missing required sections if absent

**Step 3: Verify**

Run: `rg -n "full|quick|import|resume|overwrite|## Reviews" .agents/skills/oat-project-plan-writing/SKILL.md`
Expected: one or more matches for each required invariant

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-plan-writing/SKILL.md
git commit -m "docs(oat-plan-writing): add mode matrix and resume guardrails"
```

---

## Phase 2: Make oat-project-plan Mode-Aware and Canonical

### Task 3: Refactor oat-project-plan prerequisites by workflow mode

**Files:**
- Modify: `.agents/skills/oat-project-plan/SKILL.md`

**Step 1: Write failing check (RED)**

Run: `rg -n "Required: Complete design document" .agents/skills/oat-project-plan/SKILL.md`
Expected: match exists (current full-mode-only assumption)

**Step 2: Implement mode-aware prerequisite section (GREEN)**

Replace single prerequisite with mode-aware logic:
- read `oat_workflow_mode` from `{PROJECT_PATH}/state.md` (default `full`)
- branch prerequisites:
  - `full` -> require complete `design.md`
  - `quick` -> allow planning from `discovery.md` (+ knowledge base), no design gate
  - `import` -> route to `oat-project-import-plan` for first normalization; allow edits of existing normalized plan

**Step 3: Verify**

Run: `rg -n "oat_workflow_mode|full|quick|import|design.md|discovery.md" .agents/skills/oat-project-plan/SKILL.md`
Expected: mode-branch language appears in prerequisites/process

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-plan/SKILL.md
git commit -m "feat(oat-project-plan): support full and quick planning modes"
```

---

### Task 4: Make oat-project-plan explicitly consume oat-project-plan-writing

**Files:**
- Modify: `.agents/skills/oat-project-plan/SKILL.md`

**Step 1: Add explicit dependency callout**

Add a short section near prerequisites/process:
- "When creating or editing `plan.md`, follow `oat-project-plan-writing` canonical format rules."

**Step 2: Align process steps with shared invariants**

Ensure step language references shared invariants instead of re-specifying them inconsistently.
Retain existing HiL checklist behavior and plan completion gates.

**Step 3: Verify**

Run: `rg -n "oat-project-plan-writing|canonical|## Reviews|## Implementation Complete|## References" .agents/skills/oat-project-plan/SKILL.md`
Expected: references to shared contract + required sections

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-plan/SKILL.md
git commit -m "docs(oat-project-plan): reference shared plan writing contract"
```

---

## Phase 3: Wire All Plan Writers/Editors to the Shared Contract

### Task 5: Update quick-start to reference shared plan-writing contract

**Files:**
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`

**Step 1: Add contract reference in plan generation step**

In "Generate Plan Directly", add instruction to apply `oat-project-plan-writing` invariants while creating/updating `plan.md`.

**Step 2: Verify**

Run: `rg -n "oat-project-plan-writing|Generate Plan Directly|pNN-tNN|## Reviews" .agents/skills/oat-project-quick-start/SKILL.md`
Expected: shared skill reference present

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-quick-start/SKILL.md
git commit -m "docs(oat-quick-start): use shared plan writing contract"
```

---

### Task 6: Update import-plan normalization to reference shared contract

**Files:**
- Modify: `.agents/skills/oat-project-import-plan/SKILL.md`

**Step 1: Add canonical-format linkage**

In normalization step, explicitly require `oat-project-plan-writing` invariants after imported-content mapping.

**Step 2: Verify**

Run: `rg -n "oat-project-plan-writing|Normalize Into Canonical OAT plan.md|## Reviews|Implementation Complete" .agents/skills/oat-project-import-plan/SKILL.md`
Expected: shared skill reference present

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-import-plan/SKILL.md
git commit -m "docs(oat-import-plan): enforce shared canonical plan format"
```

---

### Task 7: Update review-receive plan-edit workflow to reference shared contract

**Files:**
- Modify: `.agents/skills/oat-project-review-receive/SKILL.md`

**Step 1: Add contract reference where new review tasks are added**

In "Update Plan.md", add explicit rule to preserve/restore shared `plan.md` invariants via `oat-project-plan-writing`.

**Step 2: Verify**

Run: `rg -n "oat-project-plan-writing|Update Plan.md|fixes_added|Implementation Complete" .agents/skills/oat-project-review-receive/SKILL.md`
Expected: shared reference and invariant language present

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-review-receive/SKILL.md
git commit -m "docs(oat-review-receive): align plan edits with plan writing contract"
```

---

### Task 8: Update progress/router text to match mode-aware planning behavior

**Files:**
- Modify: `.agents/skills/oat-project-progress/SKILL.md`

**Step 1: Align wording with new plan behavior**

Update any text that implies `oat-project-plan` is design-only so it reflects full+quick compatibility.

**Step 2: Verify**

Run: `rg -n "oat-project-plan|design|quick" .agents/skills/oat-project-progress/SKILL.md`
Expected: routing text consistent with mode-aware prerequisites

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-progress/SKILL.md
git commit -m "docs(oat-progress): reflect mode-aware plan routing"
```

---

## Phase 4: End-to-End Validation and Cleanup

### Task 9: Validate OAT skill schema checks

**Files:**
- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md` (if fixes needed)
- Modify: any touched skill files above (if fixes needed)

**Step 1: Run validation**

Run: `pnpm oat:validate-skills`
Expected: successful validation for all `oat-*` skills

**Step 2: Fix any validation findings**

If errors appear, patch only the failing skill(s) and rerun until clean.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-*.md .agents/skills/oat-project-plan-writing/SKILL.md
git commit -m "chore(oat-skills): fix validation findings for plan writing unification"
```

---

### Task 10: Run repo quality checks for doc/skill changes

**Files:**
- Modify: any touched files only if command outputs require follow-up

**Step 1: Run quality commands**

Run: `pnpm lint && pnpm type-check && pnpm test`
Expected: no new failures attributable to this change set

**Step 2: Capture any known pre-existing failures**

If failures are unrelated/pre-existing, record them in the final implementation summary.

**Step 3: Commit (if needed)**

```bash
git add .
git commit -m "chore: finalize plan-writing contract integration"
```

---

## Implementation Complete

**Summary:**
- Phase 1 introduces `oat-project-plan-writing` as the canonical plan-format contract.
- Phase 2 upgrades `oat-project-plan` to be workflow-mode aware and consume the shared contract.
- Phase 3 wires all plan-producing and plan-mutating skills to the shared contract.
- Phase 4 validates skill quality and runs workspace checks.

**Total:** 10 tasks

