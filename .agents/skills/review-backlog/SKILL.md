---
name: review-backlog
version: 1.2.0
description: Use when prioritizing backlog work or evaluating a roadmap. Produces value-effort ratings, dependency mapping, and execution recommendations.
argument-hint: '[backlog-path] [--roadmap=<path>] [--output=<path>]'
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, Bash(git:*), AskUserQuestion, Task
user-invocable: true
---

# Review Backlog

> Deprecated: Use `oat-pjm-review-backlog` instead.

Analyze a backlog document to produce a structured review with value/effort ratings, dependency graph, parallel work lanes, and a recommended execution sequence. Optionally cross-references a roadmap to identify alignment gaps.

## When to Use

- Periodic backlog grooming to re-prioritize work
- Before starting a new development wave or sprint
- When the backlog has grown and needs triage
- When you want to identify the best execution order and parallelism opportunities

## Arguments

Parse from `$ARGUMENTS`:

- **backlog-path**: (optional) Path to the backlog document. If not provided, prompt the user or look for common locations.
- **--roadmap=\<path\>**: (optional) Path to a roadmap document for alignment analysis.
- **--output=\<path\>**: (optional) Where to write the review. Defaults to sibling `reviews/` directory of the backlog.

## Process

### Step 1: Locate Inputs

**Backlog document:**

1. If `backlog-path` is provided, use it directly.
2. Otherwise, search for common locations:
   - `.oat/repo/reference/backlog.md`
   - `backlog.md` in the repo root
   - `docs/backlog.md`
3. If multiple candidates found, ask the user to pick.
4. If none found, ask the user for the path.

**Roadmap document (optional):**

1. If `--roadmap` is provided, use it directly.
2. Otherwise, check for common locations:
   - `.oat/repo/reference/roadmap.md`
   - `roadmap.md` in the repo root
   - `docs/roadmap.md`
3. Ask the user if they want to include the roadmap in the review. If not found or declined, skip roadmap alignment analysis.

**Output path:**

1. If `--output` is provided, use it directly.
2. Otherwise, default to a `reviews/` directory alongside the backlog:
   - If backlog is at `.oat/repo/reference/backlog.md`, output to `.oat/repo/reviews/backlog-and-roadmap-review.md`
   - Create the `reviews/` directory if it doesn't exist.

### Step 2: Read and Catalog Backlog Items

Read the backlog document and extract all items from every section (Inbox, Planned, In Progress, etc. — skip Done/Deferred).

For each item, capture:

- **ID**: Assign a sequential ID (B01, B02, ...) for reference throughout the review
- **Title**: The item title
- **Priority**: The existing priority (P0/P1/P2 or unmarked)
- **Area**: The area tag (workflow, skills, tooling, docs, etc.)
- **Section**: Which backlog section it's in (Inbox, Planned, In Progress)
- **Notes/context**: Key details from the item description

### Step 3: Understand Codebase Context

Before rating items, build enough context to assess effort accurately:

1. **Read relevant codebase areas** referenced by backlog items (e.g., if an item says "migrate X script", read that script to gauge size/complexity).
2. **Check the existing CLI/tooling** to understand what infrastructure already exists that items can build on.
3. **Note existing patterns** that items could follow (reduces effort for items that follow an established pattern).

Use the Explore agent for broad codebase exploration if needed. Use direct Read/Glob/Grep for targeted lookups.

### Step 4: Rate Each Item

For each backlog item, assess:

**Value** (High / Medium / Low):

- **High**: Unblocks other items, significant daily workflow impact, or prerequisite for a product milestone
- **Medium**: Improves quality/consistency but doesn't block other work
- **Low**: Nice-to-have, future-facing, or narrow audience

**Effort** (High / Medium / Low):

- **High**: > 3 days estimated, high complexity, or touches many files across the codebase
- **Medium**: 1-3 days, moderate complexity, well-scoped
- **Low**: < 1 day, straightforward, isolated change

**Quadrant** (derived from Value + Effort):

- **Quick Win**: High Value + Low Effort (do first)
- **Strategic**: High Value + High Effort (plan carefully)
- **Fill-in**: Low Value + Low Effort (slot into gaps)
- **Avoid / Defer**: Low Value + High Effort (skip or revisit later)

Provide a brief rationale for each rating.

### Step 5: Map Dependencies

For each item, identify:

- **Hard dependencies** (must complete first): Item X cannot start until Item Y is done
- **Soft dependencies** (beneficial but not required): Item X is easier or better if Item Y is done first
- **What it blocks**: Which other items are waiting on this one

Render a text-based dependency graph showing the relationships. Use arrows to indicate direction:

```
B01 ──▶ B08 (hard)
B02 - -▶ B08 (soft)
```

### Step 6: Identify Parallel Lanes

Group items into independent work streams (lanes) that can be tackled concurrently without conflicts:

For each lane:

- **Name**: A descriptive label for the work stream
- **Items**: The items in this lane, in recommended order
- **Internal sequencing**: Which items within the lane depend on each other
- **Cross-lane dependencies**: Any items that connect this lane to another

### Step 7: Recommend Execution Order

Organize items into **waves** — groups of work that can be started together:

For each wave:

- **Items**: What to work on
- **Effort**: Cumulative effort estimate
- **Rationale**: Why these items go together (dependencies resolved, natural grouping, etc.)
- **Parallelism notes**: Which items within the wave can run in parallel

Order waves so that:

1. Foundation/unblocking items come first
2. High-value quick wins are front-loaded
3. Strategic items follow once foundations are in place
4. Fill-in and deferred items come last

### Step 8: Roadmap Alignment (if roadmap provided)

If a roadmap document was provided:

1. **Map backlog items to roadmap phases**: Which items correspond to which phases?
2. **Identify gaps**: Roadmap items with no backlog coverage (work that's planned but not yet captured as actionable items)
3. **Identify orphans**: Backlog items not represented on the roadmap (new scope)
4. **Check status consistency**: Are roadmap phase statuses consistent with what backlog items show?

### Step 9: Write the Review Document

Use the template at `.agents/skills/review-backlog/references/backlog-review-template.md` as the structure for the output document.

Fill in all sections with the analysis from Steps 2-8. Ensure:

- Every active backlog item appears in the Item Catalog
- The dependency graph is complete
- Parallel lanes are clearly delineated
- Execution waves are actionable
- Roadmap alignment is included (if applicable)
- The Observations section includes strategic recommendations, risks, and quick wins

Write the document to the output path determined in Step 1.

### Step 10: Summarize for the User

After writing the review, provide a brief summary:

- Total items reviewed
- Distribution across quadrants (how many Quick Wins, Strategic, Fill-in, Defer)
- Top 3 recommended next actions
- Any notable risks or gaps discovered

## Success Criteria

- Every active backlog item has a value/effort rating with rationale
- Dependencies are explicitly mapped (hard and soft)
- Parallel lanes are identified with clear boundaries
- Execution waves provide an actionable sequence
- Roadmap alignment gaps are surfaced (if roadmap provided)
- Output document follows the template structure
- Summary is provided to the user after writing
