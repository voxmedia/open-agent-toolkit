---
id: BL-260706-front-load-recurring-gate
title: 'Front-load recurring gate-finding classes into implementer briefs'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: feature # idea | task | feature | initiative
scope_estimate: L # XS | S | M | L | XL | XXL
labels: [oat-project-implement, reviews]
assignee: null
created: '2026-07-06T14:39:33Z'
updated: '2026-07-06T14:39:33Z'
associated_issues: []
---

## Description

In a fully autonomous spec-driven run (~97 tasks, 8 phases) with a per-phase external gate, one defect class — "a UI surface renders a false negative (false zero / 'all clear' / 'no results' / 'healthy') from a query that actually failed or is still loading" — recurred as a Critical at a _new_ surface in nearly every phase, because each phase's implementer was never told it was a known recurring risk. The gate reliably caught each one, but the class kept being re-introduced, costing a fix + re-gate cycle every phase.

Injecting the class verbatim into subsequent implementer dispatch briefs ("apply this invariant proactively at new surfaces; here's the rule and where it bit") measurably reduced recurrence — later implementers built it right up front without the gate having to catch it.

Proposed change to `oat-project-implement` (+ `oat-project-review-receive`):

1. Maintain a per-project **recurring-invariants ledger** (a section in `implementation.md` or a small `invariants.md`). On each review-receive, classify findings as one-off vs. a class likely to recur; append recurring classes with the rule + where it bit.
2. Inject the ledger into every subsequent phase's implementer brief as an explicit "proactively design against these" block.
3. On project completion, promote the ledger to the durable repo/package `AGENTS.md` so the invariant outlives the project.
4. Pair with the final-scope review explicitly **sweeping each recorded invariant across the whole app**, not just the last phase's diff.

Honest limit to encode: front-loading only prevents _new_ recurrence — it can't retroactively fix surfaces built before the class was identified, which is why the final-scope whole-app sweep (step 4) is required alongside the ledger.

Source: field feedback from an autonomous run using the phase review gate (PR #128). Orthogonal to gate mechanics — this is about what goes into the next implementer's brief, not how the gate runs.

## Acceptance Criteria

- `oat-project-review-receive` classifies each finding as one-off vs. recurring-invariant and appends recurring classes (rule + where it bit) to a per-project ledger.
- `oat-project-implement` injects the ledger into each subsequent phase's implementer brief as a "proactively design against these" block.
- Project completion promotes the ledger to the durable `AGENTS.md` (repo or package).
- The final-scope review sweeps each recorded invariant across the whole app, not only the final phase diff.
- Behavior is documented in the implement/review skills and covered by skill-content validation.
