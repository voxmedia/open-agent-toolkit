---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-03-15
oat_generated: false
---

# Discovery: remote-project-management

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Add remote project management integration to OAT, enabling backlog items and projects to sync with external PM tools (Jira, Linear). This builds on top of the local project management system (see sibling project `local-project-management`).

Parent discovery: `.oat/projects/shared/project-management-integration/discovery.md` — contains the full conceptual model, research findings, and foundational decisions.

**Prerequisite:** The local project management system must be solidified first (project: `local-project-management`). Remote integration layers on top of the local `associated_issues` linking model.

## Research Findings

Comparative research on Jira Cloud REST API and Linear GraphQL API has been completed (see parent discovery for full report). Key findings:

- **Jira** uses REST, transition-based workflows (3 status categories), ADF for descriptions (but supports Markdown in UI), type-based hierarchy
- **Linear** uses GraphQL, free-move states (5 categories), Markdown descriptions, relationship-based hierarchy
- **Common fields**: id, title, description, status/category, priority, assignee, labels, parent, dates, estimate
- The local `associated_issues` format already accommodates remote references (`type: jira`, `type: linear`)

## Clarifying Questions

### Question 1: Source of truth model

**Q:** When Jira/Linear is connected, which system is the source of truth?

- (a) OAT is always the source of truth, external tools get synced outward
- (b) External tool is the source of truth, OAT pulls state inward
- (c) Bidirectional sync with conflict resolution
- (d) OAT artifacts are the working surface for agents; external tool is the record of truth for humans/teams

**A:** {Awaiting user input}
**Decision:** {Pending}

### Question 2: Authentication and configuration

**Q:** How should credentials for Jira/Linear be managed?

- (a) Environment variables (JIRA_API_TOKEN, LINEAR_API_KEY)
- (b) Stored in `.oat/config.local.json` (gitignored)
- (c) Delegated to system keychain / credential helpers
- (d) Use existing CLI tools (jira-cli, linear-cli) if available

**A:** {Awaiting user input}
**Decision:** {Pending}

### Question 3: Sync granularity

**Q:** What should sync between OAT and the remote tool?

- (a) Backlog items only (local items ↔ remote issues)
- (b) Backlog items + project status (project phase/state reflected in remote epic/project)
- (c) Full sync including plan tasks ↔ remote subtasks
- (d) Configurable per-project

**A:** {Awaiting user input}
**Decision:** {Pending}

### Question 4: Sync direction and trigger

**Q:** How is sync initiated?

- (a) Manual CLI command (`oat pjm sync`)
- (b) Automatic on backlog item create/update
- (c) Periodic (agent checks on session start)
- (d) Event-driven (webhooks from remote)

**A:** {Awaiting user input}
**Decision:** {Pending}

## Solution Space

### Approach 1: CLI-driven batch sync

**Description:** Manual `oat pjm sync` command that pushes/pulls changes between local backlog and remote PM tool. No real-time sync.
**When this is the right choice:** When integration needs are occasional and agent sessions are the natural sync point.
**Tradeoffs:** State can drift between syncs. Manual burden.

### Approach 2: Skill-driven sync on mutation

**Description:** The `oat-pjm-add-backlog-item` and related skills automatically sync to remote when `associated_issues` includes a remote reference.
**When this is the right choice:** When you want seamless integration without separate sync steps.
**Tradeoffs:** Requires network access during skill execution. More complex error handling.

### Approach 3: Event-driven bridge

**Description:** Webhooks from Jira/Linear push changes into OAT, OAT CLI hooks push outward.
**When this is the right choice:** When real-time sync matters and teams need immediate visibility.
**Tradeoffs:** Requires a running service. Overkill for session-based agent workflows.

### Chosen Direction

**Approach:** {Awaiting user input}
**Rationale:** {Pending}
**User validated:** No

## Key Decisions

1. **`associated_issues` is the integration point:** Remote references use the same polymorphic format as local references (`type: jira`, `type: linear`). No separate sync model needed.
2. **Local system is prerequisite:** Remote integration depends on the local backlog/roadmap system being in place.

## Constraints

- Must not break existing local PM workflows
- Credentials must never be stored in version-controlled files
- Agent sessions are ephemeral — cannot assume a long-running process
- Should accommodate future providers beyond Jira/Linear (GitHub Issues, Notion, etc.)
- Jira Cloud (not Server/Data Center) is the target for Jira integration

## Open Questions

- **Status mapping:** How do OAT backlog statuses (open / in_progress / closed / wont_do) map to Jira's 3 categories and Linear's 5 categories?
- **Priority mapping:** OAT uses urgent/high/medium/low/none. Jira uses configurable names. Linear uses integers 0-4. What's the mapping?
- **Conflict resolution:** If both OAT and the remote tool are modified between syncs, how are conflicts resolved?
- **Team visibility:** When an agent creates/updates items via OAT, how should attribution work in Jira/Linear? (bot user? acting-as user?)
- **Scope estimate mapping:** Does `scope_estimate` (XS-XXL) map to remote estimate fields? Or is it OAT-internal only?

## Assumptions

- Users who want Jira/Linear integration already have accounts and API access configured
- The agent (Claude/Codex/etc.) will be the primary user of the integration, not humans directly
- Network access is available during agent sessions when sync is needed

## Risks

- **Abstraction leakage:** Jira and Linear have very different data models; forcing them into a common interface may be leaky
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Design around OAT's own concepts. Let each provider map its model to OAT's.

- **Sync complexity:** Bidirectional sync between markdown files and external APIs is notoriously hard
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation Ideas:** Start with unidirectional sync (OAT → external). Add bidirectional later.

## Next Steps

This discovery is **incomplete** — pending resolution of clarifying questions above. This project is intentionally not active; it will be picked up after `local-project-management` is complete.

Spec-driven mode: continue to `oat-project-spec` after resolving all clarifying questions (after HiLL approval if configured).
