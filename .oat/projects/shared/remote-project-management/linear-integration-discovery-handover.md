# Linear Integration Discovery Handover

This document captures the complete context from a brainstorming session about integrating OAT with Linear. It should be fed directly into the existing `remote-project-management` project's discovery phase to resolve open questions and advance toward spec.

---

## Context

The `remote-project-management` project already exists at `.oat/projects/shared/remote-project-management/` with an in-progress discovery. The discovery has open questions about source of truth, auth, sync granularity, and sync triggers. This handover provides answers to those questions and significant additional design thinking that emerged from brainstorming.

The brainstorming session also produced a separate project scope for `summary.md` and post-PR revision workflow improvements. **Those are being handled in a separate project.** This handover covers only the Linear/remote-PM integration concerns.

---

## Answers to Existing Discovery Questions

### Question 1: Source of truth model

**Answer: (d) with nuance — dual system of record.**

- **Linear** is the system of record for: intent, ownership, approvals, status, and portfolio reporting.
- **OAT** is the system of record for: deeper artifacts and execution traces (discovery.md, spec.md, design.md, plan.md, implementation.md, summary.md).
- Mirror concise summaries and links back into Linear issue/project docs and updates rather than duplicating full specs in both places.
- Status transitions in Linear should be driven by **GitHub integration** (branch activity, PR state, merge), not by OAT directly. OAT does not manage Linear status.

### Question 2: Authentication and configuration

**Answer: Use the official Linear MCP server as the primary access layer.**

- The official MCP endpoint is `https://mcp.linear.app/mcp` (not `/sse`, which is deprecated as of Feb 2026).
- Linear's MCP server supports Claude, Claude Code, Cursor, VS Code, Windsurf, Zed, Codex, v0, and others natively.
- For authentication, defer to whatever the MCP server requires (typically Linear API key or OAuth token configured in the agent's MCP settings).
- Credentials managed via MCP config, not stored in OAT files.
- For supplemental CLI use (human developer ergonomics, not agent-critical), consider `schpet/linear-cli` for its issue→branch→PR loop, or `Finesssee/linear-cli` for broader automation. But the CLI choice is secondary — MCP covers the agent path.

### Question 3: Sync granularity

**Answer: Backlog items ↔ Linear issues, with project-level summary feedback. No plan task sync.**

- **Backlog items ↔ Linear issues**: Bidirectional. A Linear issue can create a backlog item. A backlog item can create a Linear issue.
- **Project status**: OAT does NOT sync phase transitions to Linear. Linear gets status from GitHub integration (branch push = in progress, PR = in review, merge = done).
- **Plan tasks → Linear sub-issues**: No. Plan tasks are implementation-granularity (agent work), not ticket-worthy. If someone wants decomposition in Linear, they create sub-issues manually at the feature level.
- **Summary feedback**: When a project completes, `summary.md` content is posted back to the associated Linear issue(s) as a comment/update. This is the primary "evidence of completion" payload.
- **Exception**: If a plan phase maps to a meaningful deliverable milestone, that could optionally become a Linear project milestone. But individual tasks within phases should not.

### Question 4: Sync direction and trigger

**Answer: Primarily manual/skill-driven, not event-driven.**

- **Backlog → Linear**: On-demand (`oat-pjm-publish-to-linear` or similar) + on promotion (when a backlog item is promoted to a project, create the Linear issue if one doesn't exist). Not every backlog item should auto-create a Linear issue — some are internal notes or "maybe someday" items.
- **Linear → Backlog**: Manual intake skill (`oat-linear-intake`) that creates a backlog item from a Linear issue.
- **Summary → Linear**: Triggered by `oat-project-complete` or a dedicated closeout skill — posts summary.md content to the Linear issue(s).
- **No webhooks or event-driven bridge** for v1. Agent sessions are ephemeral; a running webhook service is overkill.
- **No automatic sync on every mutation**. Sync happens at intentional lifecycle moments: intake, promotion, closeout.

---

## Cardinality Model

The relationship between Linear issues, backlog items, and OAT projects is NOT 1:1:1:

- **Linear issue : backlog item** → 1:1 (the intake link; `associated_issues` handles this)
- **Backlog items : OAT project** → many:1 (multiple related backlog items can be grouped into a single project)
- **OAT project : Linear issues** → 1:many (one project satisfies multiple Linear issues; completion should close/update all of them)

The `associated_issues` array on both `backlog-item.md` and `state.md` already supports multiple refs. The key change is making those links **do work** — currently they're inert metadata.

---

## Bidirectional Backlog ↔ Linear Issue Sync

### Linear → Backlog (intake)

- A skill (`oat-linear-intake` or similar) reads a Linear issue via MCP and creates a backlog item.
- Sets `associated_issues: [{type: linear, ref: "TEAM-123"}]` on the backlog item.
- Populates description and acceptance criteria from the Linear issue content.
- Runs `oat backlog regenerate-index` after creation.

### Backlog → Linear (publish)

- Not automatic for every item. Triggered:
  - On-demand via a publish skill
  - On promotion to project (if no Linear issue exists yet)
- Creates a Linear issue from the backlog item's title, description, and acceptance criteria.
- Updates the backlog item's `associated_issues` with the new Linear ref.
- Should check for duplicates before creating (Linear issue may already exist).

### Provenance tracking

The backlog item template needs a new field to track where items originate:

```yaml
origin: null  # manual | project:<name> | linear:<id> | intake
```

This prevents re-creating a Linear issue for something that originated from Linear, and enables tracing the pipeline (this item was spawned during project X, or came in from Linear issue Y).

---

## Deferred Work Capture

During project execution, deferred work is currently captured as free-text in `implementation.md` follow-up sections, then retroactively extracted by `oat-pjm-update-repo-reference`. This should become first-class:

### `oat-pjm-capture-deferred` (lightweight, mid-implementation)

- Takes a one-liner description + optional context
- Creates a backlog item with sensible defaults (`scope: task`, `priority: medium`)
- Sets `associated_issues: [{type: project, ref: "current-project-name"}]`
- Sets `origin: project:<current-project-name>`
- Logs the capture in `implementation.md` under the current task's follow-ups
- Returns immediately so implementation continues (no interactive triage ceremony)
- Optionally publishes to Linear if configured

Then `oat-pjm-update-repo-reference` at closeout becomes a **review and enrich** pass over already-captured items rather than the primary extraction step.

---

## Branch Naming and Linear GitHub Integration

Linear's GitHub integration automatically links branches/PRs to issues when the branch name contains the issue identifier (format: `TEAM-NUMBER`, e.g., `ENG-42`).

Key details:
- Issue ID can appear **anywhere** in the branch name (case-insensitive)
- Linear's "Copy git branch name" produces: `username/team-number-slugified-title` (configurable in settings)
- Multiple identifiers in one branch name are supported
- Automatic status transitions: branch created → In Progress, PR opened → In Review, PR merged → Done

**Integration point**: When `oat-pjm-promote-to-project` creates a project branch, it should incorporate the Linear issue ID if the backlog item has an associated Linear issue. This gives the GitHub integration everything it needs — no OAT-side status management required.

---

## What OAT Should NOT Do (Let GitHub/Linear Handle)

- **Status transitions**: Don't move Linear issues between states from OAT. GitHub integration handles: branch push → In Progress, PR → In Review, merge → Done.
- **Plan task decomposition to Linear**: Don't create Linear sub-issues from plan tasks. Plan tasks are agent-granularity work, not team-visible tickets.
- **Phase-level status updates**: Don't sync OAT phases to Linear. Start without it. If after using it you find you need "in design" vs "in implementation" visibility, it's easy to add later.

---

## What OAT SHOULD Do

1. **Bidirectional backlog ↔ issue sync** — the core data bridge
2. **Branch naming with Linear issue IDs** — makes GitHub integration work for free
3. **Summary posted as comment on closeout** — the evidence trail back to Linear
4. **Deferred work capture** — first-class backlog item creation during implementation
5. **Provenance tracking** — `origin` field on backlog items to prevent duplicate creation and enable pipeline tracing

---

## Proposed Skill Suite

Listed in recommended build order:

1. **`oat-pjm-promote-to-project`** (no Linear dependency — purely local)
   - Takes backlog item ID(s) — supports grouping multiple items
   - Asks which workflow mode (spec-driven / quick / import)
   - Runs `oat project new` under the hood
   - Seeds `discovery.md` from backlog item description + acceptance criteria
   - Sets `associated_issues` on `state.md` (backlog refs + any Linear refs from the items)
   - Flips backlog item(s) to `in_progress`
   - Creates branch with Linear issue ID in name if available
   - Regenerates backlog index

2. **`oat-pjm-capture-deferred`** (no Linear dependency — purely local)
   - Lightweight mid-implementation deferred work capture
   - Creates backlog item with defaults + project provenance
   - Logs in implementation.md
   - Returns immediately

3. **`oat-linear-intake`** (first Linear touchpoint)
   - Reads Linear issue via MCP
   - Creates backlog item with `associated_issues: [{type: linear, ref: "TEAM-123"}]`
   - Sets `origin: linear:TEAM-123`

4. **`oat-linear-publish`** (backlog → Linear)
   - Creates Linear issue from backlog item
   - Updates backlog item with Linear ref
   - Duplicate detection before creation

5. **`oat-linear-post-summary`** (closeout feedback)
   - Reads `summary.md` from completed project
   - Posts structured comment to associated Linear issue(s)
   - Does NOT change Linear issue status (merge handles that)

6. **`oat-linear-link`** (manual association)
   - Links an existing backlog item to an existing Linear issue (or vice versa)
   - Updates `associated_issues` on the backlog item
   - Bidirectional — can start from either side

---

## Linear-Specific Context for Discovery

### Linear's Current AI/MCP Surface (as of March 2026)

- **Feb 5, 2026**: MCP expanded to initiatives, project milestones, project updates, project labels, URL/image loading. Deprecated `/sse` in favor of `/mcp`.
- **Feb 26, 2026**: Added direct deeplinks from issues into coding tools with customizable prompt templates.
- **Mar 24, 2026**: Launched Linear Agent with reusable skills and automations.
- Linear's MCP also improved documentation and reduced token usage in Feb 2026.

**Implication**: Don't build custom CRUD. The official MCP covers the access layer. OAT's custom skills should encode workflow rules (discovery-before-creation, artifact mapping, delegation readiness, progress reporting, closeout) — not replace basic Linear operations.

### Linear Data Model Notes (for mapping design)

- Issue identifiers: `TEAM-NUMBER` format (e.g., `ENG-42`)
- Issues belong to exactly one team
- Issues can belong to at most one project at a time
- Sub-issues inherit project/cycle context from parent
- Projects support milestones, docs, updates (health/progress)
- Initiatives group multiple projects under one objective
- Custom views are filter-based, shareable, support list/board layouts
- Triage is the intake buffer — supports Triage Intelligence for auto-routing
- Agent guidance can be set at workspace and team level

### Status Mapping (for Open Question in existing discovery)

| OAT backlog status | Linear status category |
|---|---|
| `open` | Backlog or Triage (unstarted) |
| `in_progress` | Started (In Progress) |
| `closed` | Completed (Done) |
| `wont_do` | Canceled |

Linear has 5 categories: Triage, Backlog, Unstarted, Started, Completed, Canceled. OAT's 4 statuses map cleanly. The nuance is Triage vs Backlog vs Unstarted — all three are "not started yet" from OAT's perspective (`open`).

### Priority Mapping

| OAT priority | Linear priority |
|---|---|
| `urgent` | 1 (Urgent) |
| `high` | 2 (High) |
| `medium` | 3 (Medium) |
| `low` | 4 (Low) |
| `none` | 0 (No priority) |

---

## Relationship to Other In-Progress Work

### Summary.md Project (separate, being handled independently)

A separate project is handling:
- `summary.md` as a new first-class project artifact
- `oat-project-summary` skill (standalone, re-runnable)
- `oat-project-revise` skill (post-PR revision workflow)
- `pr_open` phase status
- Integration of summary into pr-final and complete

**The Linear integration depends on summary.md existing** — `oat-linear-post-summary` reads summary.md to post back to Linear. So the summary project should complete first or in parallel.

### Backlog Promote to Project (shared dependency)

`oat-pjm-promote-to-project` is needed by both the summary/revision project (as a general workflow improvement) and the Linear integration (for Linear-aware branch naming). It should be built as part of whichever project starts first.

---

## Constraints (Updated from Existing Discovery)

- Must not break existing local PM workflows
- Credentials managed via MCP config, not stored in OAT files
- Agent sessions are ephemeral — no long-running processes or webhooks for v1
- Should accommodate future providers beyond Linear (GitHub Issues, Jira, Notion) via the existing polymorphic `associated_issues` model
- Linear MCP is the access layer — don't build custom GraphQL/REST clients for v1
- Status transitions owned by GitHub integration, not OAT
- Branch naming must include Linear issue ID for GitHub integration to work

---

## Risks (Updated)

- **MCP surface may not cover all needed operations**: The official MCP is broad but may lack specific operations (e.g., posting a structured comment with specific formatting). Mitigation: test the MCP surface early in implementation; fall back to a thin SDK wrapper only if needed.
- **Bidirectional sync complexity**: Even with manual triggers, syncing backlog items ↔ Linear issues can produce conflicts if both are edited independently. Mitigation: start with clear ownership (intake = Linear wins, publish = OAT wins) and add conflict detection later.
- **Branch naming convention enforcement**: If users don't use promote-to-project, branches won't have Linear IDs. Mitigation: make it the recommended path, but don't hard-enforce it.

---

## Recommended Next Steps for Discovery

1. Resolve the existing discovery questions using the answers above
2. Validate the cardinality model (many backlog items : 1 project : many Linear issues)
3. Validate the "no plan task sync" decision
4. Validate the "no status management from OAT" decision
5. Design the `associated_issues` extensions needed (provenance/origin field)
6. Design the branch naming convention for promote-to-project
7. Move to spec once discovery questions are resolved
