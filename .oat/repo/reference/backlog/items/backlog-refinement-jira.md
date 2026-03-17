---
id: bl-ff5d
title: 'Backlog Refinement Flow (Jira ticket generation)'
status: open
priority: medium
scope: feature
scope_estimate: L
labels: ['workflow', 'jira']
assignee: null
created: '2026-01-29T00:00:00Z'
updated: '2026-01-29T00:00:00Z'
associated_issues: []
---

## Description

OAT needs a structured conversational flow for breaking larger initiatives into epics, stories, and tasks during planning, then creating those tickets in Jira with minimal manual handoff.

Proposed change:

- Add a backlog refinement skill that interviews the user and produces a structured backlog artifact covering epics, stories, and tasks.
- Add an integration step that can create the resulting items in Jira after explicit confirmation and iterative refinement.

Links:

- Skill idea source: this backlog entry
- Integration target: Atlassian CLI and/or existing `create-ticket` plumbing

## Acceptance Criteria

- A user can run a single flow from idea to structured backlog to Jira ticket creation.
- The flow supports iterative refinement before ticket creation.
- The generated backlog output uses a template-driven format for consistency.
