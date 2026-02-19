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
oat_import_source_path: .oat/repo/reference/external-plans/2026-02-18-docs-gap-analysis-and-review-skill.md
oat_import_provider: claude
oat_generated: false
---

# Implementation Plan: docs-gap-analysis-and-review-skill

> Execute this plan using the `oat-project-implement` skill, task-by-task with phase checkpoints and review gates.

**Goal:** Fix identified documentation gaps across CLI docs, skills index, and stale files, then create the `docs-completed-projects-gap-review` skill to make this review process repeatable.

**Architecture:** Documentation-only changes across `docs/oat/`, `.agents/`, and skills directories, plus a new non-`oat-*` skill with SKILL.md and report template.

**Tech Stack:** Markdown, OAT skill conventions, OAT CLI (`sync`, `validate-skills`)

**Commit Convention:** `docs({scope}): {description}` - e.g., `docs(p01-t01): create docs-completed-projects-gap-review SKILL.md`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Create `docs-completed-projects-gap-review` Skill

### Task p01-t01: Create SKILL.md for docs-completed-projects-gap-review

**Files:**
- Create: `.agents/skills/docs-completed-projects-gap-review/SKILL.md`

**Step 1: RED**

Verify skill directory does not yet exist:
Run: `ls .agents/skills/docs-completed-projects-gap-review/ 2>&1`
Expected: Directory not found

**Step 2: Implement (GREEN)**

Create `.agents/skills/docs-completed-projects-gap-review/SKILL.md` with:
- Frontmatter: `name`, `description`, `argument-hint`, `disable-model-invocation: true`, `allowed-tools`, `user-invocable: true`
- Arguments: `--since`, `--output`, `--scope`, `--dry-run`
- Process steps: resolve arguments, build completed work inventory, build documentation surface map, cross-reference for gaps, classify/prioritize (P0/P1/P2), generate execution plan, write report, summarize for user
- Use `.agents/skills/review-backlog/SKILL.md` as structural reference

**Step 3: Refactor**

Ensure wording is consistent with other OAT skills.

**Step 4: Verify**

Run: `pnpm run cli -- internal validate-oat-skills 2>&1 | head -20`
Expected: No regressions (skill is non-`oat-*` so validator won't check it directly)

**Step 5: Commit**

```bash
git add .agents/skills/docs-completed-projects-gap-review/SKILL.md
git commit -m "docs(p01-t01): create docs-completed-projects-gap-review SKILL.md"
```

---

### Task p01-t02: Create report template

**Files:**
- Create: `.agents/skills/docs-completed-projects-gap-review/references/docs-gap-report-template.md`

**Step 1: RED**

Verify template does not yet exist:
Run: `ls .agents/skills/docs-completed-projects-gap-review/references/ 2>&1`
Expected: Directory not found or empty

**Step 2: Implement (GREEN)**

Create the report template with sections:
- Executive Summary
- Completed Work Inventory
- Gap Catalog (per-gap detail tables with priority P0/P1/P2)
- Recommended Execution Plan (waves by priority, grouped by affected file)
- Stale Reference Inventory
- Skills & CLI Completeness Check
- Observations

Use `.agents/skills/review-backlog/references/backlog-review-template.md` as structural reference.

**Step 3: Refactor**

Ensure template placeholders are consistent and clearly marked.

**Step 4: Verify**

Run: `ls .agents/skills/docs-completed-projects-gap-review/references/docs-gap-report-template.md`
Expected: File exists

**Step 5: Commit**

```bash
git add .agents/skills/docs-completed-projects-gap-review/references/docs-gap-report-template.md
git commit -m "docs(p01-t02): add docs gap report template"
```

---

## Phase 2: Fix Documentation Gaps (P0 items)

### Task p02-t01: Rewrite `.agents/README.md` (A4)

**Files:**
- Modify: `.agents/README.md`

**Step 1: RED**

Read current `.agents/README.md` and confirm stale references exist:
- `apps/honeycomb-docs/docs/ai/skills.md`
- `npx tsx .agents/skills/new-agent-project/scripts/new-agent-project.ts`
- `planning.md` instead of `plan.md`
- `.claude/agents/` instead of `.agents/agents/`
- Non-existent subagents

Run: `grep -c "honeycomb-docs\|npx tsx .agents/skills/new-agent-project\|planning.md\|.claude/agents" .agents/README.md`
Expected: Count > 0 (stale references present)

**Step 2: Implement (GREEN)**

Complete rewrite of `.agents/README.md`:
- Point to canonical OAT docs (`docs/oat/index.md`)
- Describe `.agents/skills/` and `.agents/agents/` structure
- Reference `oat sync --apply` for provider sync
- Point to `docs/oat/skills/index.md` for skill inventory
- Point to `.agents/docs/` for detailed agent guidance
- Remove all stale references

**Step 3: Refactor**

Ensure concise and consistent voice.

**Step 4: Verify**

Run: `grep -c "honeycomb-docs\|npx tsx .agents/skills/new-agent-project\|planning.md\|.claude/agents" .agents/README.md`
Expected: Count = 0 (no stale references)

**Step 5: Commit**

```bash
git add .agents/README.md
git commit -m "docs(p02-t01): rewrite .agents/README.md to remove stale references"
```

---

### Task p02-t02: Restructure CLI index + add state/index commands (A1, A2, A3)

**Files:**
- Modify: `docs/oat/cli/index.md`

**Step 1: RED**

Read current `docs/oat/cli/index.md`. Confirm it only lists 2 command groups and is missing `init`, `status`, `sync`, `providers`, `doctor`, `index`, `state`.

Run: `grep -c "oat state\|oat index\|oat doctor\|oat sync\|oat providers\|oat status\|oat init" docs/oat/cli/index.md`
Expected: Count is low / missing entries

**Step 2: Implement (GREEN)**

Restructure to list all 9 registered command groups: `init`, `status`, `sync`, `providers`, `doctor`, `index`, `project`, `state`, `internal`.

Add explicit entries for:
- `oat state refresh` — purpose: "Regenerate the OAT repo state dashboard `.oat/state.md`", key behavior, invocation
- `oat index init` — purpose: "Generate a thin `project-index.md` for quick repo orientation", options (`--head-sha`, `--merge-base-sha`), usage

Cross-reference provider-interop commands to existing detailed docs.

**Step 3: Refactor**

Group commands logically (core, provider-interop, project lifecycle, internal).

**Step 4: Verify**

Run: `grep -c "oat state\|oat index init\|oat doctor\|oat sync\|oat providers\|oat status\|oat init" docs/oat/cli/index.md`
Expected: All command groups present (count >= 7)

**Step 5: Commit**

```bash
git add docs/oat/cli/index.md
git commit -m "docs(p02-t02): restructure CLI index, add state refresh and index init docs"
```

---

### Task p02-t03: Add commands to provider-interop commands.md (A2, A3, A7)

**Files:**
- Modify: `docs/oat/cli/provider-interop/commands.md`

**Step 1: RED**

Read current file and confirm `oat providers set`, `oat state refresh`, and `oat index init` are missing or incomplete.

Run: `grep -c "oat providers set\|oat state refresh\|oat index init" docs/oat/cli/provider-interop/commands.md`
Expected: Count = 0 or incomplete

**Step 2: Implement (GREEN)**

Add sections for:
- `## oat providers set` — purpose: "Set provider enable/disable state for a scope", key behavior, options (`--scope`, `--enabled`, `--disabled`)
- `## oat state refresh` — purpose, key behavior, invocation
- `## oat index init` — purpose, options (`--head-sha`, `--merge-base-sha`), usage

**Step 3: Refactor**

Ensure consistent formatting with existing command sections.

**Step 4: Verify**

Run: `grep -c "oat providers set\|oat state refresh\|oat index init" docs/oat/cli/provider-interop/commands.md`
Expected: Count >= 3

**Step 5: Commit**

```bash
git add docs/oat/cli/provider-interop/commands.md
git commit -m "docs(p02-t03): add providers set, state refresh, index init to commands.md"
```

---

### Task p02-t04: Update skills index (A5, A6 + new skill)

**Files:**
- Modify: `docs/oat/skills/index.md`

**Step 1: RED**

Read current file and confirm `oat-project-plan-writing`, `review-backlog`, and `docs-completed-projects-gap-review` are missing.

Run: `grep -c "oat-project-plan-writing\|review-backlog\|docs-completed-projects-gap-review" docs/oat/skills/index.md`
Expected: Count = 0 or incomplete

**Step 2: Implement (GREEN)**

Add entries:
- `oat-project-plan-writing` under "Lifecycle skills" (shared contract used by multiple lifecycle skills)
- `review-backlog` under "Utility and maintenance skills"
- `docs-completed-projects-gap-review` under "Utility and maintenance skills"

**Step 3: Refactor**

Ensure descriptions are consistent with SKILL.md frontmatter descriptions.

**Step 4: Verify**

Run: `grep -c "oat-project-plan-writing\|review-backlog\|docs-completed-projects-gap-review" docs/oat/skills/index.md`
Expected: Count >= 3

**Step 5: Commit**

```bash
git add docs/oat/skills/index.md
git commit -m "docs(p02-t04): add plan-writing, review-backlog, gap-review to skills index"
```

---

## Phase 3: Fix Documentation Gaps (P1 items) + Sync & Verify

### Task p03-t01: Add worktree-bootstrap to quickstart (A8)

**Files:**
- Modify: `docs/oat/quickstart.md`

**Step 1: RED**

Read current file and confirm `oat-worktree-bootstrap` is not mentioned.

Run: `grep -c "worktree-bootstrap" docs/oat/quickstart.md`
Expected: Count = 0

**Step 2: Implement (GREEN)**

Add a brief mention under Path A's "Additional CLI commands" section (or a new "Worktree setup" subsection), noting that `oat-worktree-bootstrap` provides a guided OAT-aware setup flow for creating/resuming worktree checkouts.

**Step 3: Refactor**

Keep brief — this is a pointer, not full docs.

**Step 4: Verify**

Run: `grep -c "worktree-bootstrap" docs/oat/quickstart.md`
Expected: Count >= 1

**Step 5: Commit**

```bash
git add docs/oat/quickstart.md
git commit -m "docs(p03-t01): add worktree-bootstrap mention to quickstart"
```

---

### Task p03-t02: Expand `.oat/config.json` schema detail (A9)

**Files:**
- Modify: `docs/oat/reference/oat-directory-structure.md`

**Step 1: RED**

Read current file and confirm the "Config ownership" section lacks schema detail for `worktrees.root`, defaults, and precedence rules.

Run: `grep -c "worktrees.root\|precedence" docs/oat/reference/oat-directory-structure.md`
Expected: Count = 0 or minimal

**Step 2: Implement (GREEN)**

Expand the existing "Config ownership (phase-A)" section to include:
- Current schema keys (e.g., `worktrees.root`)
- Default values
- Full precedence model: `--path` explicit override > `OAT_WORKTREES_ROOT` env var > `.oat/config.json` `worktrees.root` > existing-directory checks > fallback default `.worktrees`

**Step 3: Refactor**

Align wording with `oat-worktree-bootstrap` SKILL.md precedence documentation.

**Step 4: Verify**

Run: `grep -c "worktrees.root\|precedence" docs/oat/reference/oat-directory-structure.md`
Expected: Count >= 2

**Step 5: Commit**

```bash
git add docs/oat/reference/oat-directory-structure.md
git commit -m "docs(p03-t02): expand config.json schema detail and precedence model"
```

---

### Task p03-t03: Sync provider views and final verification

**Files:**
- No direct file edits (CLI-driven)

**Step 1: RED**

TODO: Confirm pre-sync state.

Run: `pnpm run cli -- sync --scope all 2>&1 | tail -5`
Expected: May show drift from doc changes

**Step 2: Implement (GREEN)**

Run full sync and verification:

```bash
pnpm run cli -- sync --scope all --apply
```

**Step 3: Refactor**

N/A

**Step 4: Verify**

Run:
```bash
pnpm run cli -- internal validate-oat-skills 2>&1
pnpm build && pnpm lint && pnpm type-check
```
Expected: All pass, no regressions

**Step 5: Commit**

```bash
git add -A
git commit -m "chore(p03-t03): sync provider views after docs updates"
```

### Task p03-t04: (review) Fix implementation.md phase statuses and state.md commit pointer

**Files:**
- Modify: `.oat/projects/shared/docs-gap-analysis-and-review-skill/implementation.md`
- Modify: `.oat/projects/shared/docs-gap-analysis-and-review-skill/state.md`

**Step 1: Understand the issue**

Review finding (Medium): Phase-level status fields in `implementation.md` are marked `in_progress` while the Progress Overview table shows all phases complete (3/3). This conflicts with the resume contract.

Review finding (Minor): `state.md` `oat_last_commit` points to `329f83d` but the branch has a newer commit. Update to latest.

**Step 2: Implement fix**

In `implementation.md`:
- Set Phase 1 status to `complete`
- Set Phase 2 status to `complete`
- Set Phase 3 status to `complete`
- Ensure all three match the Progress Overview table

In `state.md`:
- Update `oat_last_commit` to the latest commit SHA after this task's commit

**Step 3: Verify**

Run: `grep "Status.*in_progress" .oat/projects/shared/docs-gap-analysis-and-review-skill/implementation.md`
Expected: No matches (all phases should be `complete`)

**Step 4: Commit**

```bash
git add .oat/projects/shared/docs-gap-analysis-and-review-skill/implementation.md .oat/projects/shared/docs-gap-analysis-and-review-skill/state.md
git commit -m "fix(p03-t04): fix phase statuses and state commit pointer"
```

---

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| p03 | code | pending | - | - |
| final | code | fixes_added | 2026-02-19 | reviews/final-review-2026-02-19.md |
| spec | artifact | pending | - | - |
| design | artifact | pending | - | - |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**
- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**
- Phase 1: 2 tasks - Create `docs-completed-projects-gap-review` skill (SKILL.md + report template)
- Phase 2: 4 tasks - Fix P0 documentation gaps (README rewrite, CLI index, commands.md, skills index)
- Phase 3: 4 tasks - Fix P1 documentation gaps (quickstart, config schema) + sync & verify + review fixes

**Total: 10 tasks**

Ready for code review and merge.

---

## References

- Imported Source: `references/imported-plan.md`
- Review-backlog skill (structural reference): `.agents/skills/review-backlog/SKILL.md`
- CLI commands source of truth: `packages/cli/src/commands/index.ts`
- Active backlog: `.oat/repo/reference/backlog.md`
- Completed backlog: `.oat/repo/reference/backlog-completed.md`
