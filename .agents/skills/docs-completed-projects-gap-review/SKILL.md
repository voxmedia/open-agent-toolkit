---
name: docs-completed-projects-gap-review
version: 1.2.0
description: Audit documentation for gaps left by completed OAT projects. Cross-references shipped work against the docs surface and produces a prioritized fix plan.
argument-hint: "[--since=<date>] [--output=<path>] [--scope=<area>] [--dry-run]"
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, Bash(git:*), AskUserQuestion, Task
user-invocable: true
---

# Docs Completed-Projects Gap Review

Audit the documentation surface for gaps left by completed OAT projects. Builds an inventory of shipped work, maps it against existing docs, and produces a prioritized report of missing or stale documentation.

## When to Use

- After one or more OAT projects have been completed and merged
- Periodic documentation hygiene checks
- Before a release or milestone to ensure docs are current
- When onboarding new contributors and suspecting docs are incomplete

## Arguments

Parse from `$ARGUMENTS`:
- **--since=\<date\>**: (optional) ISO date (`YYYY-MM-DD`). Only consider projects completed after this date. If omitted, review all completed projects.
- **--output=\<path\>**: (optional) Path to write the gap report. Defaults to `.oat/repo/reviews/docs-gap-report-{date}.md`.
- **--scope=\<area\>**: (optional) Limit review to a specific documentation area. Values: `cli`, `skills`, `reference`, `quickstart`, `all`. Defaults to `all`.
- **--dry-run**: (optional) Print the gap catalog to the console without writing a report file.

## Process

### Step 1: Resolve Arguments

1. Parse `--since`, `--output`, `--scope`, and `--dry-run` from `$ARGUMENTS`.
2. Resolve output path:
   - If `--output` is provided, use it directly.
   - Otherwise, default to `.oat/repo/reviews/docs-gap-report-{today}.md`.
   - Create the `reviews/` directory if it does not exist.
3. Resolve scope filter (default: `all`).

### Step 2: Build Completed Work Inventory

Scan for completed OAT project artifacts:

1. Resolve projects root via `oat config get projects.root` (fallback to `.oat/projects/shared` if unset).
2. List all project directories under the projects root.
3. For each project, read `state.md` frontmatter:
   - Include if `oat_phase_status: complete` or if the project has a merged PR.
   - If `--since` is set, filter by `oat_last_updated` date.
4. For each included project, extract:
   - Project name
   - Completion date
   - Key files changed (from `implementation.md` Final Summary or PR description)
   - Capabilities shipped (from `implementation.md` Final Summary)
   - Skills created or modified
   - CLI commands added or changed

### Step 3: Build Documentation Surface Map

Catalog the current documentation surface:

1. **CLI docs:** `apps/oat-docs/docs/cli/index.md`, `apps/oat-docs/docs/cli/**/*.md`
2. **Skills index:** `apps/oat-docs/docs/skills/index.md`
3. **Reference docs:** `apps/oat-docs/docs/reference/**/*.md`
4. **Quickstart:** `apps/oat-docs/docs/quickstart.md`
5. **README files:** `.agents/README.md`, `apps/oat-docs/docs/index.md`
6. **Skill SKILL.md files:** `.agents/skills/*/SKILL.md` (as authoritative source for skill descriptions)

For each doc file, extract:
- Topics/commands/skills covered
- Last modified date (via `git log -1 --format=%ci`)
- Section headings (as a proxy for coverage)

### Step 4: Cross-Reference for Gaps

For each completed project's shipped capabilities:

1. **Check CLI coverage:** Are new or modified CLI commands documented in `apps/oat-docs/docs/cli/`?
2. **Check skills coverage:** Are new or modified skills listed in `apps/oat-docs/docs/skills/index.md` with accurate descriptions?
3. **Check reference coverage:** Are new config keys, directory structures, or conventions documented in `apps/oat-docs/docs/reference/`?
4. **Check quickstart coverage:** Are new user-facing workflows mentioned in `apps/oat-docs/docs/quickstart.md`?
5. **Check for stale references:** Do existing docs reference files, commands, or patterns that no longer exist?

### Step 5: Classify and Prioritize

For each identified gap, assign:

- **Priority:**
  - **P0 (Critical):** Docs reference something that no longer exists, or a core command/skill is entirely undocumented
  - **P1 (Important):** New capability is shipped but not mentioned in relevant docs
  - **P2 (Minor):** Docs exist but are incomplete, outdated wording, or missing cross-references
- **Affected file(s):** Which doc files need changes
- **Source project:** Which completed project introduced the gap
- **Suggested fix:** Brief description of what the doc change should be

### Step 6: Generate Execution Plan

Group gaps into recommended fix waves:

1. **Wave 1 (P0):** Critical fixes — stale references, missing core docs
2. **Wave 2 (P1):** Important additions — new capabilities coverage
3. **Wave 3 (P2):** Minor improvements — wording, cross-references, completeness

Within each wave, group by affected file to minimize context switching.

### Step 7: Write Report

Use the template at `.agents/skills/docs-completed-projects-gap-review/references/docs-gap-report-template.md`.

Fill in all sections:
- Executive Summary (total gaps, breakdown by priority)
- Completed Work Inventory (projects reviewed)
- Gap Catalog (per-gap detail with priority, affected files, suggested fix)
- Recommended Execution Plan (waves by priority)
- Stale Reference Inventory (docs pointing to removed content)
- Skills & CLI Completeness Check (cross-reference table)
- Observations (patterns, systemic issues, recommendations)

If `--dry-run` is set, print the gap catalog to console instead of writing a file.

### Step 8: Summarize for User

After writing the report, provide:
- Total gaps found (by priority)
- Top 3 most impactful gaps
- Estimated effort for each wave
- Location of the report file

## Success Criteria

- Every completed project in scope is included in the inventory
- Every gap has a priority, affected file, and suggested fix
- Execution plan groups gaps into actionable waves
- Report follows the template structure
- No false positives (gaps are verified against actual file contents)
