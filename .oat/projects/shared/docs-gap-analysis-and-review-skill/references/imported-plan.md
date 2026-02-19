# Documentation Gap Analysis + `docs-completed-projects-gap-review` Skill

## Context

OAT has been through a rapid development burst (9 projects completed, 18 PRs merged, 16 backlog items closed in ~3 weeks). Documentation has not kept pace with implementation. This plan addresses two things:

1. **Fix identified documentation gaps** — CLI commands, skills index, stale files
2. **Create a new internal skill** — `docs-completed-projects-gap-review` — to make this review process repeatable

The skill fits into the planned `oat-docs-*` family (from the `bootstrap-mkdocs` idea) and is scoped specifically to reviewing recently completed/archived projects. A separate general `docs-gap-review` skill can be created later for broader documentation audits.

---

## Part A: Documentation Gap Fixes

### P0 — Factual Inaccuracies / Entirely Missing

#### A1. Restructure CLI index to list all command groups
- **File:** `docs/oat/cli/index.md`
- **Problem:** Only lists 2 "additional command groups" (`oat project new`, `oat internal validate-oat-skills`). The CLI actually has 9 registered command groups.
- **Fix:** Restructure to list all commands: `init`, `status`, `sync`, `providers`, `doctor`, `index`, `project`, `state`, `internal`. Group provider-interop commands with a cross-reference to the existing detailed docs, and add entries for the new commands.

#### A2. Add `oat state refresh` command documentation
- **File:** `docs/oat/cli/index.md` (new entry) + `docs/oat/cli/provider-interop/commands.md` (add to "Other implemented namespaces" or new section)
- **Problem:** Added in PR #17 (oat-state-index-cli), zero docs coverage.
- **Fix:** Add command entry documenting purpose ("Regenerate the OAT repo state dashboard `.oat/state.md`"), key behavior, and invocation.

#### A3. Add `oat index init` command documentation
- **File:** `docs/oat/cli/index.md` (new entry) + `docs/oat/cli/provider-interop/commands.md`
- **Problem:** Added in PR #17, zero docs coverage.
- **Fix:** Add command entry documenting purpose ("Generate a thin `project-index.md` for quick repo orientation"), options (`--head-sha`, `--merge-base-sha`), and usage.

#### A4. Rewrite `.agents/README.md`
- **File:** `.agents/README.md`
- **Problem:** Severely stale. References:
  - `apps/honeycomb-docs/docs/ai/skills.md` (non-existent in this repo)
  - `npx tsx .agents/skills/new-agent-project/scripts/new-agent-project.ts` (migrated to CLI)
  - `/new-agent-project` slash-command notation (deprecated)
  - `planning.md` instead of `plan.md`
  - `.claude/agents/` for subagents instead of `.agents/agents/`
  - Non-existent subagents (`explore-gather`, `plan-reviewer`, `doc-validator`)
  - `cursor-rules-to-claude` tool (from a different project era)
  - Option 1/Option 2 project structure (not current OAT conventions)
- **Fix:** Complete rewrite. Replace with a concise guide that:
  - Points to canonical OAT docs (`docs/oat/index.md`)
  - Describes `.agents/skills/` and `.agents/agents/` structure
  - References `oat sync --apply` for provider sync
  - Points to `docs/oat/skills/index.md` for skill inventory
  - Points to `.agents/docs/` for detailed agent guidance
  - Removes all stale references

#### A5. Add `oat-project-plan-writing` to skills index
- **File:** `docs/oat/skills/index.md`
- **Problem:** Skill exists in `.agents/skills/oat-project-plan-writing/` and is referenced in README.md under "Shared workflow options", but missing from skills index.
- **Fix:** Add under "Lifecycle skills" section (it's a shared contract used by multiple lifecycle skills).

#### A6. Add `review-backlog` to skills index
- **File:** `docs/oat/skills/index.md`
- **Problem:** Skill exists in `.agents/skills/review-backlog/`, is user-invocable, but missing from skills index.
- **Fix:** Add under "Utility and maintenance skills" section.

### P1 — Significant Omissions

#### A7. Add `oat providers set` as explicit command entry
- **File:** `docs/oat/cli/provider-interop/commands.md`
- **Problem:** Documented in `config.md` but not listed as a command in the commands reference. Users scanning commands.md won't discover it.
- **Fix:** Add `## oat providers set` section with purpose ("Set provider enable/disable state for a scope"), key behavior, and options (`--scope`, `--enabled`, `--disabled`).

#### A8. Add `oat-worktree-bootstrap` to quickstart docs
- **File:** `docs/oat/quickstart.md`
- **Problem:** The skill is mentioned in README.md but not in the quickstart. Users following the quickstart path won't discover the worktree workflow.
- **Fix:** Add a brief mention under Path A's "Additional CLI commands" section (or create a new "Worktree setup" subsection under Path A if the anchor doesn't exist), noting that `oat-worktree-bootstrap` provides a guided OAT-aware setup flow for creating/resuming worktree checkouts.

#### A9. Expand `.oat/config.json` schema detail
- **File:** `docs/oat/reference/oat-directory-structure.md`
- **Problem:** The existing "Config ownership (phase-A)" section in `oat-directory-structure.md` and `file-locations.md` document ownership and the relationship to `.oat/sync/config.json`, but lack schema detail — the current keys (`worktrees.root`), their defaults, and precedence rules are not spelled out.
- **Fix:** Expand the existing section in `oat-directory-structure.md` to include the current schema keys, default values, and the full precedence model. For worktree root specifically, align with the precedence documented in `oat-worktree-bootstrap` SKILL.md (`--path` explicit override > `OAT_WORKTREES_ROOT` env var > `.oat/config.json` `worktrees.root` > existing-directory checks > fallback default `.worktrees`).

---

## Part B: Create `docs-completed-projects-gap-review` Skill

### Skill Overview

An internal (non-`oat-*`) skill that reviews recently completed/archived OAT projects, completed backlog items, and recent merged PRs to identify documentation gaps. Produces a structured gap report with prioritized fixes.

Complements the planned `docs-gap-review` (general, future) and `oat-project-document` (per-project execution, backlog item).

### Files to Create

```
.agents/skills/docs-completed-projects-gap-review/
  SKILL.md
  references/
    docs-gap-report-template.md
```

### Skill Contract Design

Based on `review-backlog` as structural reference (multi-step analysis, structured output, argument parsing).

**Frontmatter:**
```yaml
---
name: docs-completed-projects-gap-review
description: Use when documentation may be behind recent implementation. Analyzes completed projects, merged PRs, and backlog changes to produce a structured docs gap report.
argument-hint: "[--since=<date|count>] [--output=<path>] [--scope=docs|all] [--dry-run]"
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, Bash(git:*), AskUserQuestion, Task
user-invocable: true
---
```

**Arguments:**
- `--since=<date|count>` — Time window. ISO date or count of recent items. Default: all available.
- `--output=<path>` — Report destination. Default: `.oat/repo/reviews/docs-gap-report-YYYY-MM-DD.md`.
- `--scope=docs|all` — `docs` checks only `docs/oat/**`. `all` also checks README, AGENTS.md, `.agents/README.md`, skills index, CLI docs. Default: `all`.
- `--dry-run` — Print findings to console without writing report file.

**Process Steps:**

1. **Resolve arguments and time window**
2. **Build completed work inventory** — Read archived projects (`state.md`, `implementation.md`), completed backlog items, recent merged PRs/commits
3. **Build documentation surface map** — Scan all doc files, extract topics/headings, note last modified dates
4. **Cross-reference for gaps** — Apply detection rules:
   - New CLI commands not in CLI docs (compare `packages/cli/src/commands/index.ts` vs `docs/oat/cli/`)
   - Skills not in skills index (compare `.agents/skills/*/` vs `docs/oat/skills/index.md`)
   - Completed backlog items still listed as planned
   - New concepts (config files, workflows) not documented
   - Stale references (renamed skills, moved paths, deprecated patterns)
5. **Classify and prioritize** — P0 (factual), P1 (significant), P2 (polish) with effort estimates
6. **Generate execution plan** — Waves by priority, grouped by affected file
7. **Write report** — Using template
8. **Summarize for user** — Console summary with top 3 recommendations

**Output Template:** Structured markdown with sections for Executive Summary, Completed Work Inventory, Gap Catalog (per-gap detail tables), Recommended Execution Plan (waves), Stale Reference Inventory, Skills & CLI Completeness Check, and Observations.

### Registration

- Add to `docs/oat/skills/index.md` under "Utility and maintenance skills"
- Run `pnpm oat:validate-skills` (skill is non-`oat-*` so validator won't check it, but confirm no regressions)
- Run `pnpm run cli -- sync --scope all --apply` to propagate to provider views

---

## Execution Order

| Step | Action | Files |
|---|---|---|
| 0 | Copy this plan to external-plans | `.oat/repo/reference/external-plans/2026-02-18-docs-gap-analysis-and-review-skill.md` |
| 1 | Create skill directory and SKILL.md | `.agents/skills/docs-completed-projects-gap-review/SKILL.md` |
| 2 | Create report template | `.agents/skills/docs-completed-projects-gap-review/references/docs-gap-report-template.md` |
| 3 | Rewrite `.agents/README.md` (A4) | `.agents/README.md` |
| 4 | Restructure CLI index (A1) + add `oat state refresh` (A2) + `oat index init` (A3) | `docs/oat/cli/index.md` |
| 5 | Add `oat providers set` to commands.md (A7) + add `oat state refresh` / `oat index init` entries | `docs/oat/cli/provider-interop/commands.md` |
| 6 | Update skills index — add `oat-project-plan-writing` (A5), `review-backlog` (A6), `docs-completed-projects-gap-review` | `docs/oat/skills/index.md` |
| 7 | Add worktree-bootstrap to quickstart (A8) | `docs/oat/quickstart.md` |
| 8 | Expand `.oat/config.json` docs (A9) | `docs/oat/reference/oat-directory-structure.md` |
| 9 | Sync provider views | `pnpm run cli -- sync --scope all --apply` |

---

## Verification

1. **Skill validation:** `pnpm oat:validate-skills` — passes with no regressions
2. **Provider sync:** `pnpm run cli -- sync --scope all` — no unexpected drift
3. **Build check:** `pnpm build && pnpm lint && pnpm type-check` — all pass (docs changes are non-code but sync may touch provider views)
4. **Manual review:** Read through each modified doc file to confirm accuracy and internal link consistency
5. **Smoke test the skill:** Run `docs-completed-projects-gap-review` to verify it produces a well-structured report (this also validates that the gaps identified in Part A have been addressed)

---

## Critical File Paths

**Files to modify:**
- `docs/oat/cli/index.md`
- `docs/oat/cli/provider-interop/commands.md`
- `docs/oat/skills/index.md`
- `docs/oat/quickstart.md`
- `docs/oat/reference/oat-directory-structure.md`
- `.agents/README.md`

**Files to create:**
- `.agents/skills/docs-completed-projects-gap-review/SKILL.md`
- `.agents/skills/docs-completed-projects-gap-review/references/docs-gap-report-template.md`

**Reference files (read for context, do not modify):**
- `.agents/skills/review-backlog/SKILL.md` — Structural template for the new skill
- `.agents/skills/review-backlog/references/backlog-review-template.md` — Report template reference
- `.agents/skills/create-oat-skill/SKILL.md` — OAT skill creation conventions
- `.agents/skills/create-skill/SKILL.md` — General skill creation conventions
- `packages/cli/src/commands/index.ts` — Source of truth for CLI commands
- `.oat/repo/reference/backlog.md` — Active backlog
- `.oat/repo/reference/backlog-completed.md` — Completed backlog archive
