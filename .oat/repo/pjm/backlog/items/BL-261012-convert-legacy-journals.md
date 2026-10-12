---
id: BL-261012-convert-legacy-journals
title: Convert legacy journals on a working copy
status: open
priority: low
scope: task
scope_estimate: M
labels:
  - artifact-cleanup
  - journal
assignee: null
created: 2026-10-12T04:48:58.434Z
updated: 2026-10-12T04:48:58.434Z
associated_issues: []
external_plans: []
---

## Description

Deferred idea from artifact-cleanup discovery. Legacy journals (task tables, checklists, an Implementation Log section, receipts after References) are shown tolerantly by the shared record reader but are never accepted as completion evidence (D5). A project resumed from an older journal must be fixed by hand before oat project journal check passes at completion. Offer a converter that rewrites a legacy journal into the canonical slots on a working copy for the operator to review, never in place on an archived or sealed artifact (D1).

## Acceptance Criteria

- A converter writes the canonical-slot journal for a legacy journal to a separate working-copy file and never modifies the source, an archive or a sealed log
- The converted output of a real legacy journal (captured fixture with provenance) passes oat project journal check at review, or reports every gap it could not convert
- Tables and checklists are still never accepted as completion evidence by the validator
