---
name: oat-pjm-review-backlog
version: 1.0.0
description: Use when prioritizing the file-backed repo backlog or evaluating roadmap alignment. Produces value-effort ratings, dependency mapping, and execution recommendations.
argument-hint: '[backlog-root] [--roadmap=<path>] [--output=<path>]'
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, Bash(git:*), AskUserQuestion, Task
user-invocable: true
---

# Review Backlog

Analyze the file-backed backlog under `.oat/repo/reference/backlog/` to produce a structured review with value-effort ratings, dependency graph, parallel work lanes, and a recommended execution sequence. Optionally cross-reference a roadmap to identify alignment gaps.

## Mode Assertion

**OAT MODE: Backlog Review**

**Purpose:** Review active backlog item files, evaluate roadmap alignment, and recommend a practical execution order.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ REVIEW BACKLOG
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print short step indicators, e.g.:
  - `[1/5] Resolving backlog inputs…`
  - `[2/5] Cataloging backlog items…`
  - `[3/5] Reading codebase context…`
  - `[4/5] Writing review document…`
  - `[5/5] Summarizing recommendations…`

## Arguments

Parse from `$ARGUMENTS`:

- **backlog-root**: (optional) Path to the backlog root directory. Defaults to `.oat/repo/reference/backlog/`.
- **--roadmap=\<path\>**: (optional) Path to a roadmap document for alignment analysis.
- **--output=\<path\>**: (optional) Where to write the review. Defaults to `.oat/repo/reviews/backlog-and-roadmap-review.md`.

## Process

### Step 1: Locate Inputs

**Backlog root:**

1. If `backlog-root` is provided, use it directly.
2. Otherwise, default to `.oat/repo/reference/backlog/`.
3. Confirm these inputs exist:
   - `backlog/index.md`
   - `backlog/items/*.md`
   - `backlog/completed.md`
4. If multiple candidate roots are found, ask the user to pick.

**Roadmap document (optional):**

1. If `--roadmap` is provided, use it directly.
2. Otherwise, look for `.oat/repo/reference/roadmap.md`.
3. Ask the user whether to include roadmap alignment if a roadmap is available.

**Output path:**

1. If `--output` is provided, use it directly.
2. Otherwise, default to `.oat/repo/reviews/backlog-and-roadmap-review.md`.

### Step 2: Read and Catalog Backlog Items

Read all active backlog item files from `backlog/items/*.md`.

For each item, capture:

- **ID**: Use the item frontmatter `id` when present; if missing, assign a stable sequential review ID (`B01`, `B02`, ...)
- **Title**: Frontmatter `title`
- **Priority**: Frontmatter `priority`
- **Scope**: Frontmatter `scope`
- **Status**: Frontmatter `status`
- **Labels / assignee / linked issues**: Any relevant frontmatter context
- **Notes/context**: Key details from `## Description` and `## Acceptance Criteria`

Also read:

- `backlog/index.md` for curated overview notes
- `backlog/completed.md` for recent completions
- `backlog/archived/*.md` only when historical context is needed for an active item

### Step 3: Understand Codebase Context

Before rating items, build enough context to assess effort accurately:

1. Read relevant codebase areas referenced by backlog item files.
2. Check existing CLI, skills, templates, and reference docs to understand reusable patterns.
3. Note dependencies implied by current implementation state.

Use the Explore agent for broad codebase exploration if needed. Use direct Read/Glob/Grep for targeted lookups.

### Step 4: Rate Each Item

For each active backlog item, assess:

**Value** (High / Medium / Low):

- **High**: Unblocks other items, significant workflow impact, or roadmap-critical
- **Medium**: Improves consistency or quality but does not block other work
- **Low**: Nice-to-have, speculative, or narrow audience

**Effort** (High / Medium / Low):

- **High**: > 3 days, broad or cross-cutting work
- **Medium**: 1-3 days, moderate complexity, well-scoped
- **Low**: < 1 day, isolated and straightforward

**Quadrant** (derived):

- **Quick Win**
- **Strategic**
- **Fill-in**
- **Avoid / Defer**

Provide a brief rationale for each rating.

### Step 5: Map Dependencies and Parallel Lanes

For each item, identify:

- Hard dependencies
- Soft dependencies
- What it blocks

Then group items into independent parallel lanes and organize them into recommended execution waves.

### Step 6: Roadmap Alignment

If a roadmap was provided:

1. Map backlog item files to roadmap horizons or phases.
2. Identify roadmap work with no backlog coverage.
3. Identify backlog items not represented on the roadmap.
4. Check whether roadmap status wording is consistent with active backlog reality.

### Step 7: Write the Review Document

Use the template at `.agents/skills/oat-pjm-review-backlog/references/backlog-review-template.md`.

Ensure:

- Every active backlog item file appears in the item catalog
- Dependency graph and parallel lanes are explicit
- Execution waves are actionable
- Roadmap alignment is included when applicable

### Step 8: Summarize for the User

After writing the review, provide:

- Total active items reviewed
- Distribution across quadrants
- Top 3 recommended next actions
- Key risks or gaps discovered

## Success Criteria

- Every active backlog item file has a value-effort rating with rationale
- Dependencies are explicitly mapped
- Parallel lanes and execution waves are actionable
- Roadmap alignment gaps are surfaced when roadmap input is present
- Output document follows the review template structure
