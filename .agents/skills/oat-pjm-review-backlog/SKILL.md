---
name: oat-pjm-review-backlog
version: 1.2.0
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

## Reference Format Convention

Whenever a backlog item is referenced — in the written review document, in chat output, or in the inline summary at the end — it **must include both the ID and a human-readable title**. Bare IDs like `bl-281c` are not acceptable in user-facing output, because readers do not have a board lookup in front of them.

Use one of these formats:

- **Inline / prose:** `` `bl-281c` (control-plane state-read migration) ``
- **Tables / lists:** `**bl-281c** — Control-plane state-read migration`
- **Compact lists where space is tight (e.g., dependency graphs):** an ID-only token is acceptable **only if** a legend in the same section maps every ID to its title.

This convention applies equally to:

- The "Top recommended next actions" summary
- Risks, gaps, and quick-wins callouts
- Any chat-level commentary about specific items
- All tables and item references in the written review document

If a title is missing from frontmatter, derive a short noun phrase from the item filename or `## Description` heading rather than falling back to a bare ID.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ REVIEW BACKLOG
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print short step indicators, e.g.:
  - `[1/6] Resolving backlog inputs…`
  - `[2/6] Cataloging backlog items…`
  - `[3/6] Reading codebase context…`
  - `[4/6] Writing review document…`
  - `[5/6] Summarizing recommendations…`
  - `[6/6] (Optional) Priority-alignment walkthrough…` — only print after the operator accepts the offer in Step 9

## Arguments

Parse from `$ARGUMENTS`:

- **backlog-root**: (optional) Path to the backlog root directory. Defaults to `.oat/repo/reference/backlog/`.
- **--roadmap=\<path\>**: (optional) Path to a roadmap document for alignment analysis.
- **--output=\<path\>**: (optional) Where to write the living review. Defaults to `.oat/repo/reference/backlog/reviews/backlog-and-roadmap-review.md`.
- **--archive-dated**: (optional) Also write a dated snapshot alongside the living review at `.oat/repo/reference/backlog/reviews/backlog-and-roadmap-review-YYYY-MM-DD.md`. Default: off.

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
2. Otherwise, default to `.oat/repo/reference/backlog/reviews/backlog-and-roadmap-review.md` (the living, single-file review co-located with the backlog).
3. If the `backlog/reviews/` directory does not exist yet, create it before writing. Do not fall back to `.oat/repo/reviews/` — backlog review artifacts now live under the file-backed backlog, not the repo-wide reviews directory.

**Dated snapshot (optional):**

If `--archive-dated` is passed, also write a copy to `.oat/repo/reference/backlog/reviews/backlog-and-roadmap-review-YYYY-MM-DD.md` in the **same directory** as the living review. Do not write dated snapshots to `.oat/repo/reviews/`.

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

Write the **living** review to the resolved output path (default `.oat/repo/reference/backlog/reviews/backlog-and-roadmap-review.md`). If `--archive-dated` was passed, also write a dated snapshot alongside it (`backlog-and-roadmap-review-YYYY-MM-DD.md` in the same directory). Never split living and dated outputs across different directories — they must live together under `backlog/reviews/`.

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

When listing specific items in this summary, follow the **Reference Format Convention** above — every backlog item must appear as `` `bl-XXXX` (human-readable title) `` (or the bold-with-em-dash variant in tables). Do not emit bare IDs.

### Step 9: Offer Priority Alignment Walkthrough (Optional, Collaborative)

The full review answers "what's in the backlog and how is each item rated." Operators still have to mentally extract "what should I actually do next, and in what order, with what parallelism." `priority-alignment.md` is the one-page execution companion that makes that extraction explicit.

This step is **optional** and **collaborative** — it requires operator context (recent ships, capacity, calendar, ongoing initiatives) that the skill alone does not have. Do not produce or refresh `priority-alignment.md` without operator participation.

**Decision: should we run the walkthrough?**

After the summary, ask the operator:

> Want to walk through the review together and produce a one-page execution view at `backlog/reviews/priority-alignment.md`? It captures phased order, parallelism, and a recommended kickoff stack — a faster reference than the full review.

If `.oat/repo/reference/backlog/reviews/priority-alignment.md` already exists, frame it as an **update** to the existing document rather than a fresh create. Read the existing file first so the walkthrough builds on it.

If the operator declines, stop after the summary. Do not silently write or modify `priority-alignment.md`.

**If the operator accepts, run the walkthrough:**

1. **Propose a phase breakdown** based on the review's quadrants and dependency graph:
   - "Finishing / in flight" — items already started or in code review
   - One or more execution phases that group items by initiative, parallel lane, or sequencing constraint
   - Surface the natural parallelism boundaries from Step 5 as parallel tracks within a phase
2. **Solicit operator context** that the review alone cannot capture:
   - What just shipped or changed since the last alignment? (Goes in the **Status** line and **Changelog**.)
   - What's the operator's capacity / appetite for parallel work this cycle?
   - Are there calendar constraints (freezes, releases, time off) that affect ordering?
   - Does the operator want an optional axis like "planning investment" or "design effort" as a column? (Some repos find this useful; many don't. Default: omit unless operator opts in.)
3. **Iterate on phase names, ordering, and the kickoff stack** until the operator is satisfied. Phase names should reflect the repo's actual initiatives, not generic placeholders.
4. **Write or update** `.oat/repo/reference/backlog/reviews/priority-alignment.md` using the template at `.agents/skills/oat-pjm-review-backlog/references/priority-alignment-template.md`. Add a new Changelog entry summarizing what shifted in this pass.
5. **Confirm the result** with the operator: file path, top-of-doc Status line, and the kickoff stack.

When referencing backlog items inside the priority-alignment doc, the **Reference Format Convention** still applies — link to the item file and pair the ID with a human-readable title.

## Success Criteria

- Every active backlog item file has a value-effort rating with rationale
- Dependencies are explicitly mapped
- Parallel lanes and execution waves are actionable
- Roadmap alignment gaps are surfaced when roadmap input is present
- Output document follows the review template structure
- Living review is written to `.oat/repo/reference/backlog/reviews/backlog-and-roadmap-review.md` (unless `--output` is explicitly overridden); dated snapshots, when emitted, live in the same `backlog/reviews/` directory and never under `.oat/repo/reviews/`
- The operator is offered (but never forced into) a collaborative walkthrough that produces or updates `backlog/reviews/priority-alignment.md`; if the operator accepts, the file is written using the priority-alignment template and includes a Changelog entry for this pass; if the operator declines, no file is created or modified
- Every user-facing reference to a backlog item pairs the ID with a human-readable title (per the Reference Format Convention)
