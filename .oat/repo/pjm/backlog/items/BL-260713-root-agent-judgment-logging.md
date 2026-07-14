---
id: BL-260713-root-agent-judgment-logging
title: 'Root-agent judgment logging responsibility for project log'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: feature # idea | task | feature | initiative
scope_estimate: S # XS | S | M | L | XL | XXL
labels: [project-log, orchestration, fast-follow]
assignee: null
created: '2026-07-13T20:24:00Z'
updated: '2026-07-13T20:24:00Z'
associated_issues: [{ type: project, ref: 'orchestration-run-log' }]
external_plans: [] # repo-relative .oat/repo/reference/external-plans/*.md paths
oat_template: false
oat_template_name: backlog-item
---

## Description

Fast-follow to the `orchestration-run-log` project (v1 ships the CLI append helper plus structural appends at the core orchestration points: implement dispatches, gate review, completion roll-up). The next step is making the **top-level root agent** — not phase implementers or other subagents — explicitly responsible for triggering `oat project log append` judgment entries as observations surface during a run. Rationale (operator): orchestration is effectively always happening (subagents are always in use), and the root agent is the one that sees the issues being run into — subagent reports, workarounds, surprises, worked-wells — and can surface them as they're fed back, regardless of whether the triggering observation came from an orchestration mechanism. This extends judgment-entry coverage beyond v1's structural appends without asking every dispatched agent to carry logging duties.

## Acceptance Criteria

- Root-agent / orchestrator role guidance (e.g. `oat-project-implement` orchestration prose and any root-agent role definition) instructs logging judgment entries via `oat project log append` when observations surface — including observations relayed from subagent reports.
- Phase implementers and other dispatched subagents are explicitly NOT given logging duties; their reports feed the root agent, which logs.
- Guidance covers the log-worthiness trigger (breaks, surprises, workarounds, notable successes) and defers entry format to the helper's self-teaching `--help`.
- No-op behavior preserved: instructions apply only when the project log exists or `workflow.projectLog` resolves to `auto`/`true`.
