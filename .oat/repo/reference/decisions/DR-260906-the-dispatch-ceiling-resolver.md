---
id: DR-260906-the-dispatch-ceiling-resolver
title: The dispatch-ceiling resolver is the only dispatch stamp producer
date: 2026-09-06
status: accepted
legacy_id: null
---

# The dispatch-ceiling resolver is the only dispatch stamp producer

## Context

Wave 4 p03: oat project dispatch-ceiling resolve returned a DispatchReportV1 when report context was requested but no formatted stamp, so lifecycle skills told orchestrators to run an out-of-tree TypeScript shim or assemble the canonical Dispatch: line by hand.

## Decision

When report scope and action are supplied, the resolver JSON carries dispatchStamp beside dispatchReport, computed once by the existing formatDispatchStamp; the field is absent without report context and on error envelopes; canonical lifecycle and review skills read and validate the returned field (schemaVersion 1, Dispatch: prefix) and never hand-assemble it or require a shim on the normal path.

## Consequences

Stamp grammar and DispatchReportV1 are unchanged; skill contract tests pin the field-based route inside each skill's owning section; unknown producer and provenance remain explicit until runtime identity evidence exists.
