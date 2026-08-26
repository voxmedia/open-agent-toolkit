---
id: BL-260820-emit-source-qualified
title: Emit source-qualified provenance envelopes for review and gate receipts
status: open
priority: high
scope: feature
scope_estimate: M
labels:
  - provenance
  - reviews
  - gates
  - structured-output
assignee: null
created: 2026-08-20T00:51:38.943Z
updated: 2026-08-20T00:51:38.943Z
associated_issues: []
external_plans: []
---

## Description

Review and gate receipts expose outcome data without a stable source-qualified
provenance envelope, forcing lifecycle callers to infer producer identity and
evidence origin from ambient context. Emit structured provenance that identifies
the producer, invocation, target, artifact, and relevant source head across
review and gate paths. Source:
[GitHub issue #202](https://github.com/voxmedia/open-agent-toolkit/issues/202).

## Acceptance Criteria

- Define one versioned provenance-envelope schema shared by direct review,
  project review, and gate receipt outputs.
- The envelope identifies producer kind and command, invocation/run identity,
  declared target, resulting artifact identity/path, source head when relevant,
  and outcome without requiring callers to parse prose or ambient state.
- JSON and persisted lifecycle receipts expose the same source-qualified fields;
  legacy consumers receive an explicit compatibility path or schema version.
- Corroboration rejects contradictory producer, target, artifact, or revision
  claims with structured diagnostics.
- Contract tests cover every producing command family and validate round-trip
  persistence through the project lifecycle ledger.
