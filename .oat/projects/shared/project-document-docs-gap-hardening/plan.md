---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-14
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: []
oat_auto_review_at_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: project-document-docs-gap-hardening

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Harden `oat-project-document` so it reliably recommends documentation for newly shipped capability surfaces, including new docs files and directories when existing docs do not cover the work.

**Architecture:** Extend the project-document skill contract with an explicit capability coverage pass modeled on `oat-docs-analyze`, then update the OAT docs pages that describe project-document’s behavior.

**Tech Stack:** Markdown skill contracts, OAT docs content, focused shell-based verification.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `docs(p01-t01): harden project-document coverage detection`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Skill Hardening

### Task p01-t01: Add capability coverage discovery to `oat-project-document`

**Files:**

- Modify: `.agents/skills/oat-project-document/SKILL.md`

**Step 1: Analyze current gap**

Review the current `oat-project-document` contract and the corresponding coverage-gap logic in `oat-docs-analyze`.

Run: `rg -n "Step 3: Verify Against Code|Assess Documentation Delta|Analyze Content Coverage Opportunities" .agents/skills/oat-project-document/SKILL.md .agents/skills/oat-docs-analyze/SKILL.md`
Expected: The existing asymmetry is visible and the new pass can be anchored precisely.

**Step 2: Implement the hardening**

Update the skill so it:

- builds a capability inventory from project artifacts plus code-verified evidence
- compares those capabilities against the docs surface
- recommends `CREATE` actions for new docs files or directories when coverage is missing
- distinguishes when to create a new page versus expand an existing page

Run: `sed -n '150,420p' .agents/skills/oat-project-document/SKILL.md`
Expected: The new flow reads coherently and remains evidence-based.

**Step 3: Refactor**

Tighten duplicated or ambiguous wording so the skill remains scoped to documentation sync rather than general repo analysis.

**Step 4: Verify**

Run: `rg -n "CREATE|new docs file|new directory|capability" .agents/skills/oat-project-document/SKILL.md`
Expected: The updated rules are explicit.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-document/SKILL.md
git commit -m "docs(p01-t01): harden project-document coverage detection"
```

---

### Task p01-t02: Align the skill contract with skill-governance requirements

**Files:**

- Modify: `.agents/skills/oat-project-document/SKILL.md`

**Step 1: Update skill metadata**

Bump the skill frontmatter version because the canonical skill changed in this PR.

Run: `sed -n '1,40p' .agents/skills/oat-project-document/SKILL.md`
Expected: Version increment is present.

**Step 2: Verify cross-skill consistency**

Confirm the wording does not contradict `oat-docs-analyze` around evidence and coverage opportunity framing.

Run: `rg -n "coverage|evidence|content opportunity|no coverage|thin coverage" .agents/skills/oat-project-document/SKILL.md .agents/skills/oat-docs-analyze/SKILL.md`
Expected: Terminology is compatible even if the workflows differ.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-document/SKILL.md
git commit -m "docs(p01-t02): align project-document contract wording"
```

---

## Phase 2: Docs And Verification

### Task p02-t01: Update OAT docs that describe project-document behavior

**Files:**

- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md`
- Modify: `apps/oat-docs/docs/docs-tooling/workflows.md`

**Step 1: Refresh docs**

Update the lifecycle and docs-workflow pages so they say `oat-project-document` can identify missing docs coverage for newly shipped capability areas rather than only refreshing existing docs.

Run: `rg -n "oat-project-document|docs analysis|coverage" apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/docs-tooling/workflows.md`
Expected: Relevant passages are updated.

**Step 2: Verify**

Run: `sed -n '1,120p' apps/oat-docs/docs/workflows/projects/lifecycle.md`
Expected: Lifecycle text matches the new skill behavior.

**Step 3: Commit**

```bash
git add apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/docs-tooling/workflows.md
git commit -m "docs(p02-t01): document project-document coverage scanning"
```

---

### Task p02-t02: Run focused verification and record the implementation state

**Files:**

- Modify: `.oat/projects/shared/project-document-docs-gap-hardening/implementation.md`
- Modify: `.oat/projects/shared/project-document-docs-gap-hardening/state.md`

**Step 1: Run focused checks**

Run targeted search and diff checks to confirm the skill text, docs text, and project artifacts are internally consistent.

Run: `git diff -- .agents/skills/oat-project-document/SKILL.md apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/docs-tooling/workflows.md .oat/projects/shared/project-document-docs-gap-hardening`
Expected: Diff is limited to the intended workflow/docs/project files.

**Step 2: Update project artifacts**

Record what changed, what was verified, and the next task pointer in implementation/state.

**Step 3: Verify**

Run: `rg -n "p01-t01|p01-t02|p02-t01|p02-t02|oat_docs_updated|oat_phase" .oat/projects/shared/project-document-docs-gap-hardening/implementation.md .oat/projects/shared/project-document-docs-gap-hardening/state.md`
Expected: Tracking artifacts are consistent.

---

## Phase 3: Review Fixes

### Task p03-t01: (review) Bump lockstep public package versions

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Step 1: Understand the issue**

Review finding: The project changed `.agents/skills/**` and `apps/oat-docs/docs/**`, which triggers the AGENTS lockstep public-package release rule.
Location: `packages/*/package.json`

**Step 2: Implement fix**

Bump all five public packages from `0.0.35` to the next lockstep version in one change so the branch satisfies the publishable-package guardrail.

**Step 3: Verify**

Run: `rg -n '"version"' packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json`
Expected: All five packages show the same bumped version.

**Step 4: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
git commit -m "fix(p03-t01): bump lockstep public package versions"
```

---

### Task p03-t02: (review) Add success criteria for capability coverage guarantees

**Files:**

- Modify: `.agents/skills/oat-project-document/SKILL.md`

**Step 1: Understand the issue**

Review finding: The body of the skill now guarantees capability inventory and coverage classification, but the `## Success Criteria` section does not reflect those guarantees.
Location: `.agents/skills/oat-project-document/SKILL.md`

**Step 2: Implement fix**

Update the `## Success Criteria` bullets so they explicitly mention capability coverage classification and the expectation to recommend `CREATE` actions when no existing docs surface fits.

**Step 3: Verify**

Run: `sed -n '520,560p' .agents/skills/oat-project-document/SKILL.md`
Expected: The success criteria mirror the new coverage-pass contract.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-document/SKILL.md
git commit -m "fix(p03-t02): align project-document success criteria"
```

---

### Task p03-t03: (review) Harmonize coverage-state terminology casing

**Files:**

- Modify: `.agents/skills/oat-project-document/SKILL.md`

**Step 1: Understand the issue**

Review finding: `oat-project-document` and `oat-docs-analyze` use the same coverage states with different casing.
Location: `.agents/skills/oat-project-document/SKILL.md`

**Step 2: Implement fix**

Normalize the coverage labels so cross-skill terminology matches the existing `oat-docs-analyze` form closely enough for consistent grepping and review.

**Step 3: Verify**

Run: `rg -n "adequately covered|thin coverage|no coverage" .agents/skills/oat-project-document/SKILL.md .agents/skills/oat-docs-analyze/SKILL.md`
Expected: The terms line up cleanly across both skills.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-document/SKILL.md
git commit -m "fix(p03-t03): harmonize coverage terminology"
```

---

### Task p03-t04: (review) Wire or remove the unused docs-audience field

**Files:**

- Modify: `.agents/skills/oat-project-document/SKILL.md`

**Step 1: Understand the issue**

Review finding: Step 3 asks the agent to capture docs-audience fields that are never consumed later in the contract.
Location: `.agents/skills/oat-project-document/SKILL.md`

**Step 2: Implement fix**

Either thread the audience signal into Step 5 recommendation rationale or remove the unused field so the skill contract stays symmetric.

**Step 3: Verify**

Run: `rg -n "audience|docs audience" .agents/skills/oat-project-document/SKILL.md`
Expected: Any audience field mentioned in Step 3 is accounted for downstream, or the unused field is removed.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-document/SKILL.md
git commit -m "fix(p03-t04): resolve unused docs-audience field"
```

---

### Task p03-t05: (review) Add lifecycle cross-link in docs workflows page

**Files:**

- Modify: `apps/oat-docs/docs/docs-tooling/workflows.md`

**Step 1: Understand the issue**

Review finding: The docs-workflows bullet for `oat-project-document` describes the behavior but does not point readers at its lifecycle position.
Location: `apps/oat-docs/docs/docs-tooling/workflows.md`

**Step 2: Implement fix**

Add a concise cross-link from the docs-workflows page to the lifecycle page’s post-implementation flow section.

**Step 3: Verify**

Run: `rg -n "project lifecycle|post-implementation flow" apps/oat-docs/docs/docs-tooling/workflows.md`
Expected: The cross-link is present and concise.

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/docs-tooling/workflows.md
git commit -m "fix(p03-t05): add lifecycle cross-link for project-document"
```

---

## Reviews

| Scope  | Type     | Status   | Date       | Artifact                              |
| ------ | -------- | -------- | ---------- | ------------------------------------- |
| p01    | code     | pending  | -          | -                                     |
| p02    | code     | pending  | -          | -                                     |
| p03    | code     | pending  | -          | -                                     |
| final  | code     | received | 2026-04-14 | reviews/final-review-2026-04-14-v2.md |
| spec   | artifact | pending  | -          | -                                     |
| design | artifact | pending  | -          | -                                     |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - harden `oat-project-document` so it detects undocumented capability surfaces and can recommend new docs files.
- Phase 2: 2 tasks - update OAT docs and verify the workflow/project artifacts.
- Phase 3: 5 tasks - address final review findings across package-version policy, skill contract polish, and docs discoverability.

**Total: 9 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md` (not used in this quick-mode project)
- Spec: `spec.md` (not used in this quick-mode project)
- Discovery: `discovery.md`
