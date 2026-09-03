---
id: BL-260903-project-document-should-prompt
title: project-document should prompt a re-run when review fixes change a
  shipped contract
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - oat-upstream
  - workflow
  - project-document
  - retro
assignee: null
created: 2026-09-03T17:54:40.692Z
updated: 2026-09-03T17:54:40.692Z
associated_issues: []
external_plans: []
---

## Description

OAT workflow feedback from the tool-pack-scope-provider-truthfulness retrospective (UP-02). Filed as a repo backlog item because no upstream GitHub destination is configured.

`oat-project-document` was run twice in that project: once after implementation completed, and again after the gate review rounds. The second run found two genuine caller-facing contract errors the first could not have seen, because the contract changed between them. One was material: `record-schema.md` told callers to store paths in dispatch records, which the shipped identity-field rejection refuses, so a caller following the documented contract would have their record rejected.

A single mid-project documentation sync can therefore encode a contract that later review-driven fixes supersede, and nothing prompts a re-run.

Suggested direction: have the skill recommend a re-run when a shipped contract changed after the last sync — detectable from `oat_docs_updated` predating the most recent review-fix commits, or from a Deviations-table entry added after that timestamp.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
