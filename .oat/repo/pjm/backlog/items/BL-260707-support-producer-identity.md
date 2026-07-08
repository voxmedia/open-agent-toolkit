---
id: BL-260707-support-producer-identity
title: 'Support producer identity aggregation for final and range review gates'
status: open # open | in_progress | closed | wont_do
priority: low # urgent | high | medium | low | none
scope: task # idea | task | feature | initiative
scope_estimate: M # XS | S | M | L | XL | XXL
labels: [workflow-gates, provenance, review-followup]
assignee: null
created: '2026-07-07T21:16:23Z'
updated: '2026-07-07T21:16:23Z'
associated_issues: [BL-260707-record-gate-review-model]
oat_template: true
oat_template_name: backlog-item
---

## Description

Final review for `multi-family-dispatch` found that producer-stamp lookup is an
exact single-scope match. Phase gates resolve `scope=pNN` stamps correctly, but
final and range review scopes do not aggregate per-phase stamps and therefore
degrade to `unknown-producer`. The degradation is honest and can be mitigated by
the same-runtime floor fix, but the design expected multi-scope reviews to
diversify against the relevant phase producers.

## Acceptance Criteria

- Final and contiguous range review gates can resolve producer identity from the
  relevant in-scope phase/task dispatch stamps.
- Gate avoidance can avoid the union of known producer families for the selected
  review scope, or a documented deterministic subset if union avoidance is not
  feasible.
- The gate JSON diversity metadata states when producer identity came from
  aggregated stamps.
- Existing single-scope phase gate behavior remains unchanged.
- Docs either describe the aggregation behavior or explicitly document any
  remaining requirement to pass `--producer-identity` for final/range gates.
