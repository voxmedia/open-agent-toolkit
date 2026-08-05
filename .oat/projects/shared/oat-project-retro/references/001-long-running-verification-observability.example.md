---
title: Reconcile Four Signals for Long-Running Verification
status: accepted
date: 2026-08-03
project: reliable-local-e2e-tests
---

# Reconcile Four Signals for Long-Running Verification

## Context

This project encountered three different orchestration failures that initially
looked similar:

1. A phase subagent returned `BLOCKED`, no process remained active, and the
   project was still described as running.
2. A phase subagent returned `BLOCKED`, but a detached tmux Playwright chain
   continued for hours.
3. Reliability commands emitted healthy 30-second progress heartbeats and then
   finished, but the root agent did not promptly publish the terminal result.

Runner heartbeats improved observability but did not resolve handle state,
detached process ownership, or terminal notification. A terminal subagent
return also did not prove that background descendants had stopped.

## Decision

Long-running verification must reconcile four independent signals:

1. **Subagent handle liveness** — whether the accepted child handle is still
   active. A terminal result clears this signal immediately.
2. **Process liveness** — whether the exact tmux pane, command, or descendant
   process tree remains active.
3. **Runner and lease liveness** — whether progress events and lease renewals
   remain current. These signals prove activity or mutation authority, not test
   health.
4. **Terminal health and evidence** — whether the exact process exited and
   produced a valid final event, identity-bearing report, baseline result,
   residue result, and consecutive-run accounting.

The monitoring owner must poll these signals on a bounded cadence until they
reconcile at a terminal boundary. It must not assume that a status-file write
wakes the monitoring agent.

After a terminal subagent return, the root must:

1. clear handle liveness;
2. inspect exact tmux and process descendants;
3. adopt or stop any detached work through its exact session or process ID;
4. preserve and validate terminal evidence;
5. update durable project state and the user; and
6. avoid launching replacement work until the prior invocation is accounted
   for.

## Consequences

- Agent and project lifecycle status updates distinguish `running`, `blocked`,
  and `idle-awaiting-root`. These are reporting terms, not the reliability
  runner's `outcome` enum.
- A current heartbeat is not reported as a health verdict.
- A missing heartbeat triggers investigation, not an automatic code-defect
  classification.
- Detached work cannot become ownerless when a child exits.
- Long-run instrumentation is implemented, tested, formatted, committed, and
  pushed before the run starts.
- Partial cohorts and standalone controls remain diagnostic evidence; they do
  not advance complete acceptance.
- Cancellation targets exact tmux panes or process IDs. Broad name-based
  termination is prohibited.

## Alternatives Rejected

### Treat a terminal child result as proof that all work stopped

Rejected because the Phase 3 child returned `BLOCKED` while a separate tmux
test chain and Playwright descendants remained active.

### Treat a heartbeat as proof that monitoring is complete

Rejected because the runner emitted current heartbeats while the root still
missed terminal completion.

### Treat a quiet process as failed and launch a replacement

Rejected because a measured host-suspension interval produced a large
wall-clock heartbeat gap without proving a repository defect. Replacement work
must wait for exact process and evidence reconciliation.

### Rely on console output only

Rejected because long output can truncate, terminals can disconnect, and a
malformed reporter may not produce parseable JSON. The durable JSONL stream and
retained report are required.

## Evidence

- [project-log.md](../../project-log.md), especially the entries titled
  `Terminal subagent liveness reporting`, `Orphaned Phase 3 background gate`,
  `Complete sequential verification passed`, and `Phase 5 code review findings
resolved`.
- [oat-execution-learnings.md](../../oat-execution-learnings.md), especially
  `Phase blockers lacked durable status reporting`, `Correction: Phase 3
entered an idle terminal state`, `Correction: terminal subagent left
orphaned test work`, and `Long-gate observability resolution`.
- [implementation.md](../../implementation.md), especially `Phase 3 status
correction`, `Orphaned Phase 3 gate correction`,
  `p05-t01 - Complete-run orchestration`, and the Phase 5 code-review notes.
- [full-reliability.md](../../evidence/full-reliability.md), especially the
  `Channel closed`, standalone sequential, heartbeat, and final acceptance
  records.
- [p05 review](../../reviews/p05-review-2026-08-03.md), which required
  attempt-wide lease coverage and actual command/artifact binding.
