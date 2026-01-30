# OAT Backlog (Internal / Dogfood)

Capture tasks and ideas that come up while dogfooding but aren’t ready to implement yet.

## How to Use

- Add new items to **Inbox** as you notice them.
- Promote items from **Inbox** → **Planned** once there’s clear scope/acceptance criteria.
- When an item is ready to implement, create (or link) an OAT project and move it to **In Progress**.
- Close items by moving to **Done** (or **Deferred**) with a short rationale.

## Conventions

- **Priority:** P0 (must), P1 (should), P2 (nice-to-have)
- **Area:** workflow | skills | templates | scripts | docs | tooling
- **Linking:** Prefer linking to the source note (e.g., `workflow-user-feedback.md`) and/or commits/PRs.

## Inbox

- [ ] **(P?) [area] {Title}**
  - Context:
  - Proposed change:
  - Success criteria:
  - Links:
  - Created: YYYY-MM-DD

- [ ] **(P2) [workflow] Visual progress indicators during workflow execution**
  - Context: During dogfooding, it’s hard to tell what the agent is doing after a user “yes/confirm” (e.g., finalizing plan, updating state/frontmatter, verifying clean working tree, committing). GSD-style “phase banners” and short progress indicators provide reassurance and reduce perceived “silent work”.
  - Proposed change:
    - Add a lightweight, consistent “progress indicator” pattern across OAT skills (especially on multi-step finalize/commit paths), e.g. a phase banner plus 2-5 short step indicators.
    - Focus on user-relevant milestones (e.g., “Finalizing plan”, “Updating state”, “Committing”), not every internal check.
  - Success criteria:
    - When a skill performs follow-up actions, the user sees a clear “what’s happening now” indicator before/while the actions run.
    - Output remains concise (no wall-of-text), consistent across skills, and doesn’t leak unnecessary internal details.
    - Dogfooding feedback indicates reduced confusion about “did it do the thing?”.
  - Links:
    - Workflow feedback: `.oat/internal-project-reference/temp/workflow-user-feedback.md`
    - Inspiration: GSD “phase banners” / progress indicators (see workflow research notes)
  - Created: 2026-01-30

- [ ] **(P2) [workflow] Backlog Refinement Flow (Jira ticket generation)**
  - Context: Need a structured, conversational way to break large initiatives into epics/stories/tasks during planning, then create them in Jira with minimal manual effort.
  - Proposed change:
    - Add a “Backlog Refinement Flow” skill that interviews the user and produces a structured backlog artifact (epics/stories/tasks) using templates.
    - Add an integration step that can create the resulting items in Jira (via Atlassian CLI) after user confirmation and iterative refinement.
  - Success criteria:
    - User can run a single flow to go from “idea” → “structured backlog” (epics/stories/tasks) → “Jira tickets created”.
    - Supports iterative refinement before ticket creation (multiple passes).
    - Uses a template-driven output format for consistency.
  - Links:
    - Skill idea source: this backlog entry
    - Integration: Atlassian CLI (and/or existing `create-ticket` plumbing if applicable)
  - Created: 2026-01-29

## Planned

- [ ] **(P?) [area] {Title}**
  - Target milestone/phase:
  - Notes:

## In Progress

- [ ] **(P?) [area] {Title}**
  - Project: `.oat/projects/shared/{project-name}/`
  - Current phase:
  - Notes:

## Deferred

- [ ] **(P?) [area] {Title}**
  - Why deferred:
  - Revisit trigger:

## Done

- [x] **(P?) [area] {Title}**
  - Outcome:
  - Links:
