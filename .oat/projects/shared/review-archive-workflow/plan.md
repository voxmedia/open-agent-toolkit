---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-11
oat_phase: plan
oat_phase_status: complete
oat_plan_source: imported
oat_import_reference: references/imported-plan.md
oat_import_source_path: .oat/repo/reference/external-plans/review-archive-workflow-2026-03-11.md
oat_import_provider: codex
oat_generated: false
---

# Implementation Plan: review-archive-workflow

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Make active review artifacts tracked in `reviews/`, archive consumed reviews into local-only `reviews/archived/`, and align receive/finalization/init flows with that contract.

**Architecture:** Review lifecycle behavior stays skill-driven for project and ad-hoc workflows, while CLI-managed gitignore/localPaths defaults shift from ignoring all reviews to ignoring only archived reviews. Archive moves must keep project bookkeeping truthful by rewriting artifact references to archived paths.

**Tech Stack:** OAT markdown skills, TypeScript CLI init/local path tooling, repository gitignore/config defaults

**Commit Convention:** `chore({scope}): {description}` - e.g., `chore(p01-t01): archive consumed review artifacts`

## Planning Checklist

- [ ] Confirmed HiLL checkpoints with user
- [ ] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Review Lifecycle Archiving

### Task p01-t01: Update review receive workflows to archive consumed artifacts

**Files:**

- Modify: `.agents/skills/oat-project-review-receive/SKILL.md`
- Modify: `.agents/skills/oat-review-receive/SKILL.md`

**Steps:**

1. Update both receive skills so they only select active review artifacts from top-level `reviews/` locations and explicitly ignore `reviews/archived/`.
2. Add a post-receive archive step that moves the consumed review artifact into the matching `archived/` directory and reports the archived location in the skill output.
3. For project receive, rewrite plan/implementation/state references produced during the receive flow so artifact paths point at `reviews/archived/...` before committing bookkeeping.
4. Verify the written instructions are internally consistent for both project-scoped and ad-hoc receive flows.
5. Commit with `chore(p01-t01): archive consumed review artifacts`.

---

### Task p01-t02: Add residual-review archive guards to project PR and completion flows

**Files:**

- Modify: `.agents/skills/oat-project-pr-progress/SKILL.md`
- Modify: `.agents/skills/oat-project-pr-final/SKILL.md`
- Modify: `.agents/skills/oat-project-complete/SKILL.md`

**Steps:**

1. Add a preflight step to each skill that detects any remaining top-level `reviews/*.md` files and archives them before PR generation or lifecycle completion continues.
2. Require any plan/implementation/state references touched during that preflight to be rewritten to archived review paths so artifact links remain truthful.
3. Update PR reference-link rules so only `reviews/archived/` is treated as local-only; active `reviews/` paths should remain eligible for tracked references when they still exist.
4. Verify the completion flow still handles local-only archive destinations safely when running from a worktree.
5. Commit with `chore(p01-t02): archive residual project reviews`.

---

### Task p01-t03: Align review-provider and review-path documentation with the new contract

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `.agents/skills/oat-review-provide/SKILL.md`
- Modify: `.oat/repo/reference/current-state.md`

**Steps:**

1. Update provider skills to describe `reviews/` as the tracked active location and `reviews/archived/` as the local-only historical location.
2. Remove any guidance that assumes project `reviews/` directories are gitignored or should be omitted solely because they are review artifacts.
3. Update repo reference docs so the durable review-storage contract matches the workflow instructions and local-path policy.
4. Verify terminology is consistent across project-scoped and repo-scoped review flows.
5. Commit with `chore(p01-t03): document active vs archived review paths`.

---

## Phase 2: Init Defaults And Verification

### Task p02-t01: Change init and local-path defaults to ignore only archived reviews

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/gitignore.ts`
- Modify: `.oat/config.json`
- Modify: `.gitignore`

**Steps:**

1. Change the default local path pattern from `.oat/**/reviews` to `.oat/**/reviews/archived` while leaving `.oat/**/pr` unchanged.
2. Update guided init prompt copy so it no longer recommends local-only `reviews/`; instead it should describe tracked active reviews and local-only archived reviews.
3. Ensure the managed `.gitignore` guidance and repository defaults match the new path policy exactly.
4. Verify the resulting defaults keep active review artifacts tracked while archived reviews remain local-only.
5. Commit with `chore(p02-t01): update review archive gitignore defaults`.

---

### Task p02-t02: Update tests and cleanup utilities for archived-review behavior

**Files:**

- Modify: `packages/cli/src/commands/init/gitignore.test.ts`
- Modify: `packages/cli/src/commands/local/status.test.ts`
- Modify: `packages/cli/src/commands/local/apply.test.ts`
- Modify: cleanup/review-path tests affected by local-path assumptions

**Steps:**

1. Update existing init/local-path tests so they assert `reviews/archived` is gitignored and top-level `reviews/` is not.
2. Review cleanup/review-path tests for any assumptions that all review directories are local-only, and update fixtures or expectations accordingly.
3. Add coverage for tracked active review directories coexisting with gitignored archived subdirectories.
4. Verify no test still encodes the old `.oat/**/reviews` local-path default.
5. Commit with `test(p02-t02): cover archived review path policy`.

---

### Task p02-t03: Run end-to-end verification for import, receive, and init defaults

**Steps:**

1. Run targeted automated checks for the CLI init/local-path changes:
   - `pnpm --filter @oat/cli test -- --runInBand src/commands/init/gitignore.test.ts src/commands/local/status.test.ts src/commands/local/apply.test.ts`
2. Run broader static verification:
   - `pnpm --filter @oat/cli type-check`
3. Manually validate the documented workflow behavior against the updated skill instructions:
   - project review provide → receive → archived
   - ad-hoc review receive → archived
   - progress/final/complete archive residual reviews before continuing
4. Record any verification deltas directly in `implementation.md` during execution.
5. Commit with `chore(p02-t03): verify review archive workflow`.

---

## Reviews

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

- Phase 1: 3 tasks - archive consumed reviews and align review workflow contracts
- Phase 2: 3 tasks - update init/gitignore defaults and verify the new policy

**Total: 6 tasks**

Ready for implementation.

---

## References

- Imported Source: `references/imported-plan.md`
- Repo State: `.oat/repo/reference/current-state.md`
- Init Tooling: `packages/cli/src/commands/init/`
