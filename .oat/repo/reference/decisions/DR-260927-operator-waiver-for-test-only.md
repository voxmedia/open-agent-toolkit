---
id: DR-260927-operator-waiver-for-test-only
title: Operator waiver for test-only gate staleness
date: 2026-09-27
status: accepted
legacy_id: null
---

# Operator waiver for test-only gate staleness

## Context

After a passing implementation exit gate, any descendant change outside
recognized closeout work, including a test-only edit, marks the gate generation
`stale` and requires a new configured gate run
(`oat-project-implement` `references/completion-and-closeout.md`, freshness
rules for `effective-delta-v1`). On synced-project-scope (PR #227) a four-line
test-harness mock forced this, and the maintainer waived a second gate by hand
with no structured record (GitHub #237). Tracked by
`BL-260902-decide-test-only-freshness`.

This question differs from release versioning
(`DR-260927-test-only-paths-skip`): versioning asks which bytes ship, while the
gate asks what reviewers verified. A test edit can weaken the evidence, for
example by making a failing-first test unable to fail.

## Decision

No automatic test-only freshness exception. Staleness stays the default for
every substantive descendant, tests included.

Add an explicit operator waiver to the exit-gate state. A waiver:

- is recorded only on an operator's instruction, never inferred by an agent;
- names who waived, the reason, and the exact descendant commit range it covers;
- keeps the generation `allowed` without rewriting the prior provenance (the
  original fingerprints and `freshness_head` stay intact; the waiver is an
  added record);
- appears in the project summary and the PR description's verification
  section;
- is void if any later substantive descendant lands after the covered range.

Rejected alternatives: an automatic test-only exception (lets a weakened test
merge unreviewed); declining both (keeps the undocumented manual waiver seen in
#237).

## Consequences

- `BL-260902-decide-test-only-freshness` becomes plan-eligible for the waiver
  field and loses `needs-discussion`.
- `BL-260820-track-pr-closeout-evidence` must treat a waived generation as
  fresh only within the waiver's recorded range.
- `BL-260719-evaluate-broader-final-gate` is unaffected; it concerns the
  final-review freshness policy, not exit-gate waivers.
- Autonomous closeout (`BL-260720-add-oat-project-complete-auto`) cannot
  self-issue a waiver; it stops and asks.
