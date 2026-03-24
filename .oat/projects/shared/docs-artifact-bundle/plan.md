---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-23
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p02'] # phases to pause AFTER completing (empty = every phase)
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
---

# Implementation Plan: docs-artifact-bundle

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Add a docs-specific analyze/apply handoff contract that preserves recommendation-scoped detail for complex docs work without forcing a full bundle for every docs analysis run.

**Architecture:** Keep the markdown docs analysis artifact as the canonical review surface, add stable recommendation IDs, and introduce optional per-recommendation packs only for complex docs recommendations. `oat-docs-apply` should plan from the markdown artifact first and load packs only when a recommendation references one.

**Tech Stack:** Markdown skill docs, OAT project artifacts, optional recommendation-pack contract, docs-analysis/apply templates, contract/fixture tests in `packages/cli`

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Define Hybrid Docs Contract

### Task p01-t01: Add stable recommendation IDs and optional-pack metadata to docs analysis

**Files:**

- Modify: `.agents/skills/oat-docs-analyze/SKILL.md`
- Modify: `.agents/skills/oat-docs-analyze/references/analysis-artifact-template.md`
- Modify: `.agents/skills/oat-docs-apply/SKILL.md`
- Modify: `.agents/skills/oat-docs-apply/references/apply-plan-template.md`

**Step 1: Define the metadata contract**

- Add stable recommendation IDs to the docs analysis artifact contract.
- Define how a recommendation advertises that it has an optional companion pack.
- Update docs apply intake rules so it can distinguish inline-only recommendations from pack-backed ones.

**Step 2: Update planning guidance**

- Ensure the apply plan template carries recommendation IDs and optional pack references.
- Keep simple recommendations first-class in the markdown artifact so apply is not forced into pack mode globally.

**Step 3: Refactor**

- Align wording between docs analyze and docs apply so the hybrid contract is explicit and consistent.
- Remove any wording that implies a pack is required for every recommendation.

**Step 4: Verify**

Run: `pnpm format && pnpm lint`
Expected: No errors

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-analyze .agents/skills/oat-docs-apply
git commit -m "feat(p01-t01): add docs recommendation pack metadata"
```

---

### Task p01-t02: Add docs recommendation-pack template and apply-side validation rules

**Files:**

- Create or modify docs contract references under `.agents/skills/oat-docs-analyze/references/`
- Modify `.agents/skills/oat-docs-apply/SKILL.md`
- Modify `.agents/skills/oat-docs-apply/references/apply-plan-template.md`

**Step 1: Add pack template**

- Add a docs-specific recommendation-pack template for complex recommendations.
- Keep the pack shape lighter than the agent-instructions version and focused on docs editing needs.

**Step 2: Tighten apply validation**

- Define which recommendations require a pack and what apply must do when a referenced pack is missing.
- Make missing referenced packs a blocking condition instead of a soft fallback.

**Step 3: Refactor**

- Align terminology across the markdown artifact, pack template, and apply plan template.
- Ensure optional packs are described as additive context, not a replacement for the main artifact.

**Step 4: Verify**

Run: `pnpm format && pnpm lint`
Expected: No errors

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-analyze .agents/skills/oat-docs-apply
git commit -m "feat(p01-t02): add docs recommendation pack template"
```

---

## Phase 2: Add Mixed-Mode Verification Coverage

### Task p02-t01: Add contract fixtures for inline-only and pack-backed docs recommendations

**Files:**

- Modify: `packages/cli/src/**` test or fixture coverage relevant to docs analyze/apply contracts
- Modify: `.agents/skills/oat-docs-analyze/references/*` and `.agents/skills/oat-docs-apply/references/*` only as needed to support testable contract markers

**Step 1: Define fixture scenarios**

- Add one simple inline-only docs recommendation scenario.
- Add one complex pack-backed docs recommendation scenario.
- Add one mixed scenario where some recommendations have packs and others stay inline.

**Step 2: Implement expectations**

- Ensure the expected contract preserves recommendation IDs and optional-pack references.
- Ensure the mixed scenario proves that simple recommendations remain valid without packs.

**Step 3: Refactor**

- Keep the fixture expectations structural and stable rather than tightly coupling them to incidental prose.

**Step 4: Verify**

Run: `pnpm test`
Expected: Relevant contract tests pass

**Step 5: Commit**

```bash
git add packages/cli .agents/skills/oat-docs-analyze .agents/skills/oat-docs-apply
git commit -m "test(p02-t01): add docs hybrid bundle fixtures"
```

---

### Task p02-t02: Wire docs apply to optional pack loading and blocking failures

**Files:**

- Modify: `.agents/skills/oat-docs-apply/SKILL.md`
- Modify: `.agents/skills/oat-docs-apply/references/apply-plan-template.md`
- Modify: `packages/cli/src/**` tests that exercise docs apply contract consumption

**Step 1: Update apply flow**

- Make docs apply read the markdown artifact first and load packs only when a recommendation references one.
- Ensure inline-only recommendations still plan and apply cleanly.

**Step 2: Add blocking-failure coverage**

- Verify that a missing referenced pack stops apply cleanly.
- Verify that mixed runs do not degrade into all-pack or no-pack behavior.

**Step 3: Refactor**

- Remove stale wording that implies docs apply is either markdown-only forever or full-bundle-only.

**Step 4: Verify**

Run: `pnpm test && pnpm type-check`
Expected: All relevant checks pass

**Step 5: Commit**

```bash
git add packages/cli .agents/skills/oat-docs-apply
git commit -m "feat(p02-t02): wire docs apply to optional packs"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status  | Date | Artifact |
| ------ | -------- | ------- | ---- | -------- |
| p01    | code     | pending | -    | -        |
| p02    | code     | pending | -    | -        |
| final  | code     | pending | -    | -        |
| spec   | artifact | pending | -    | -        |
| design | artifact | pending | -    | -        |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - define the hybrid docs analyze/apply contract
- Phase 2: 2 tasks - add mixed-mode contract coverage and apply consumption rules

**Total: 4 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md` (required in spec-driven mode; optional in quick/import mode)
- Spec: `spec.md` (required in spec-driven mode; optional in quick/import mode)
- Discovery: `discovery.md`
- Imported Source: `references/imported-plan.md` (when `oat_plan_source: imported`)
