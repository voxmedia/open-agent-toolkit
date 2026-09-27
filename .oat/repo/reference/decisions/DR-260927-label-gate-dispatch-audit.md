---
id: DR-260927-label-gate-dispatch-audit
title: Label gate dispatch audit stamp as policy view
date: 2026-09-27
status: accepted
legacy_id: null
---

# Label gate dispatch audit stamp as policy view

## Context

Gate-originated review artifacts carried a resolver dispatch audit line that could disagree with the model and effort the gate actually invoked, so the audit line misreported who reviewed (BL-260927-derive-or-label-the-dispatch, GitHub #325).

## Decision

Gate-originated reviews label the resolver stamp **Dispatch audit (policy view):** instead of building a second gate-derived stamp; the label keeps the Dispatch: token so there is one extraction path. oat gate review rejects an unlabeled audit stamp that disagrees with the gate frontmatter with gate_dispatch_audit_mismatched, recognizing the stamp by shape outside finding sections. Shipped in triage-correctness-wave p01-t03 through p01-t05 and p04-t04.

## Consequences

oat-project-review-provide 1.5.11 and oat-project-review-provide-remote 1.1.8 write the label. Once a released CLI includes the check, gate reviews from older installed review-provide copies can fail until oat tools update refreshes them. A blockquote stamp or a bullet under a flat High heading is still read as an audit line; this was deferred because a 137-artifact probe found no false failures.
