---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-19
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p02'] # phases to pause AFTER completing ([] = every phase)
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
---

# Implementation Plan: agent-instructions-artifact-bundle

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with
> phase checkpoints and review gates.

**Goal:** Add an artifact-bundle handoff for `oat-agent-instructions-analyze` and
`oat-agent-instructions-apply` so apply can consume recommendation-scoped context without losing behavioral guidance.

**Architecture:** Keep the human-readable analysis artifact, then add a bundle consisting of a summary, a manifest,
and per-recommendation packs. Apply reads the manifest and packs as its primary contract while the summary remains
review context.

**Tech Stack:** Markdown skill docs, OAT project artifacts, YAML manifest contract, markdown recommendation packs

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

## Planning Checklist

- [x] Confirmed quick-mode execution with no phase checkpoints
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Define Bundle Contract

### Task p01-t01: Define bundle schema and output layout

**Files:**

- Modify: `.agents/skills/oat-agent-instructions-analyze/SKILL.md`
- Modify: `.agents/skills/oat-agent-instructions-analyze/references/analysis-artifact-template.md`
- Modify: `.agents/skills/oat-agent-instructions-analyze/references/*` as needed for bundle output guidance
- Modify: `.agents/skills/oat-agent-instructions-apply/SKILL.md`

**Step 1: Define the contract**

- Define the bundle directory structure, manifest format, and pack structure.
- Decide which fields live in the summary artifact, manifest, and recommendation packs.
- Record validation rules for missing or inconsistent pack references.

**Step 2: Update analyze/apply guidance**

- Update analyze guidance so bundle output is required beside the human summary.
- Update apply guidance so the bundle becomes the primary generation contract.

**Step 3: Refactor**

- Remove wording that assumes one markdown artifact is the only apply boundary.
- Keep the human review artifact concise and explicitly cross-linked to the bundle.

**Step 4: Verify**

Run: `pnpm format && pnpm lint`
Expected: No errors

**Step 5: Commit**

```bash
git add .agents/skills/oat-agent-instructions-analyze .agents/skills/oat-agent-instructions-apply
git commit -m "feat(p01-t01): define artifact bundle contract"
```

---

### Task p01-t02: Add recommendation-pack templates and validation guidance

**Files:**

- Create or modify bundle template/reference files under `.agents/skills/oat-agent-instructions-analyze/references/`
- Modify `.agents/skills/oat-agent-instructions-apply/references/` templates as needed

**Step 1: Add templates**

- Add the bundle summary, manifest, or pack templates needed to make the contract concrete.
- Ensure pack sections cover evidence, behavioral conventions, anti-patterns, workflow steps, and claim corrections.

**Step 2: Validate generation inputs**

- Update apply planning inputs so pack fields map cleanly into generation steps and templates.
- Ensure missing required pack fields are treated as blockers instead of silent omissions.

**Step 3: Refactor**

- Align terminology across analyze, bundle templates, and apply references.

**Step 4: Verify**

Run: `pnpm format && pnpm lint`
Expected: No errors

**Step 5: Commit**

```bash
git add .agents/skills/oat-agent-instructions-analyze .agents/skills/oat-agent-instructions-apply
git commit -m "feat(p01-t02): add recommendation pack templates"
```

---

## Phase 2: Add Verification Coverage

### Task p02-t01: Add regression fixtures for bundle fidelity

**Files:**

- Modify relevant fixture or test assets under `packages/cli/src/**` if bundle behavior is covered there
- Modify skill-adjacent test or docs fixtures as needed

**Step 1: Define regression cases**

- Add fixture scenarios that previously lost behavioral guidance, counter-examples, workflow steps, or claim
  corrections.
- Include at least one glob-scoped rule case and one scoped `AGENTS.md` case.

**Step 2: Implement fixture expectations**

- Ensure the expected bundle output preserves recommendation-scoped detail.
- Ensure missing bundle fields or broken pack references surface as failures.

**Step 3: Refactor**

- Minimize duplicate fixture text while keeping the expectations readable.

**Step 4: Verify**

Run: `pnpm test`
Expected: All relevant tests pass

**Step 5: Commit**

```bash
git add packages/cli .agents/skills
git commit -m "test(p02-t01): add artifact bundle regression fixtures"
```

---

### Task p02-t02: Validate apply consumption end to end

**Files:**

- Modify apply-side test coverage and any supporting references

**Step 1: Add apply coverage**

- Verify apply reads the manifest and pack files instead of depending on the summary artifact alone.
- Verify pack fields survive into apply planning inputs and generated content decisions.

**Step 2: Implement missing wiring**

- Fill any gaps discovered while exercising end-to-end bundle consumption.

**Step 3: Refactor**

- Remove stale apply assumptions that still describe a single-artifact-only workflow.

**Step 4: Verify**

Run: `pnpm test && pnpm type-check`
Expected: All checks pass

**Step 5: Commit**

```bash
git add packages/cli .agents/skills
git commit -m "feat(p02-t02): wire apply to artifact bundle inputs"
```

---

## Phase 3: Review Fixes

### Task p03-t01: (review) Reduce prose coupling in bundle contract test

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts`

**Step 1: Understand the issue**

Review finding: Contract tests assert exact prose strings from skill docs, creating high editorial coupling.
Location: `packages/cli/src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts:74-88`

**Step 2: Implement fix**

Replace the fourth test's exact prose assertions with structural markers that still prove the bundle-first apply
contract without locking sentence wording. Prefer stable section markers, code-path markers, or grouped semantic
signals over full-sentence string matches.

**Step 3: Verify**

Run: `pnpm test`
Expected: Bundle contract tests still enforce the apply-side contract and the full test suite passes.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts
git commit -m "fix(p03-t01): reduce prose coupling in bundle contract test"
```

---

### Task p03-t02: (review) Make bundle contract test repo-root resolution robust

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts`

**Step 1: Understand the issue**

Review finding: `repoFilePath` relies on a fragile seven-level parent traversal to reach the repo root.
Location: `packages/cli/src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts:6-8`

**Step 2: Implement fix**

Replace the hard-coded parent traversal with a more robust repo-root or workspace-root resolution strategy so the test
fails clearly if the root cannot be found and remains stable if the file moves.

**Step 3: Verify**

Run: `pnpm test && pnpm type-check`
Expected: The bundle contract test resolves repo paths reliably and all checks pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts
git commit -m "fix(p03-t02): stabilize repo root resolution in contract test"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`
/ `design`.}

| Scope  | Type     | Status   | Date       | Artifact                                           |
| ------ | -------- | -------- | ---------- | -------------------------------------------------- |
| p01    | code     | pending  | -          | -                                                  |
| p02    | code     | pending  | -          | -                                                  |
| final  | code     | received | 2026-03-20 | reviews/archived/final-review-2026-03-20-pre-pr.md |
| spec   | artifact | pending  | -          | -                                                  |
| design | artifact | pending  | -          | -                                                  |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: review findings were converted into fix tasks
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical or Important findings)

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - define the artifact bundle contract and recommendation-pack templates
- Phase 2: 2 tasks - add regression fixtures and end-to-end apply consumption coverage
- Phase 3: 2 tasks - address final review findings in bundle contract tests

**Total: 6 tasks**

Review-fix tasks complete. Ready for final re-review.

---

## References

- Design: `design.md` (used in this quick-mode project because the bundle contract changes the analyze/apply boundary)
- Spec: `spec.md` (required in spec-driven mode; optional in quick/import mode)
- Discovery: `discovery.md`
- Imported Source: `references/imported-plan.md` (when `oat_plan_source: imported`)
