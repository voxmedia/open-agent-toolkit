---
id: BL-261012-complete-state-json-refusals
title: complete-state --json refusals carry structured reason codes
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - artifact-cleanup
  - cli
assignee: null
created: 2026-10-12T04:48:59.287Z
updated: 2026-10-12T04:48:59.287Z
associated_issues: []
external_plans: []
---

## Description

Observed in the artifact-cleanup p04-t01 lifecycle probes. oat project journal check --json returns reasons as structured {code, path, line, owner} objects, but when oat project complete-state refuses for the same journal reasons its --json output is {status: error, message} with the codes only inside the message text (and a goal closeout refusal such as audit-phase-not-accepted is likewise embedded in prose). Callers and probes have to regex the message to route on a code. Add the structured reasons (journal and closeout) to the complete-state --json error payload without changing the text output.

## Acceptance Criteria

- oat project complete-state --json refusals include a structured reasons array with code, path, line and owner for journal and closeout refusals
- The text output and the refusal-writes-nothing behavior are unchanged
- A test asserts the structured codes for one journal refusal and one goal closeout refusal
