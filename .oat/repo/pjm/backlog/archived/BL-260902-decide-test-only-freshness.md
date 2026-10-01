---
id: BL-260902-decide-test-only-freshness
title: Decide test-only freshness exception for the implement exit gate
status: closed
priority: medium
scope: idea
scope_estimate: S
labels:
  - gate
  - freshness
  - policy
assignee: null
created: 2026-09-02T23:48:33.763Z
updated: '2026-10-01T19:47:55Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/237
external_plans: []
---

## Description

`oat-project-implement` closeout treats any test-file descendant as `stale` and demands a new configured exit-gate generation, even for a four-line test-harness mock with no shipped behavior change. Decide between a closeout-only or test-only freshness exception and an explicit human-waiver field that keeps `allowed` without rewriting provenance. This is a policy decision; do not plan implementation until it is made. Source: GitHub issue #237 (retro item UP-01 of synced-project-scope).

Decided 2026-09-27 in `DR-260927-operator-waiver-for-test-only`.

## Acceptance Criteria

Decision criteria (met 2026-09-27 by `DR-260927-operator-waiver-for-test-only`):
explicit operator waiver, no automatic test-only exception; the stale
classification path is the `effective-delta-v1` descendant rules in
`oat-project-implement` `references/completion-and-closeout.md`; relationships to
BL-260719, BL-260820-track-pr-closeout-evidence, and
BL-260826-decide-whether-test-only-paths are stated in the record.

Implementation criteria:

- The exit-gate state accepts an append-only waiver record: who waived, the
  reason, the covered descendant commit range, and a timestamp. The prior
  fingerprints and `freshness_head` are not rewritten.
- A waiver is written only on an explicit operator instruction; the skill never
  infers or self-issues one, including under `OAT_AUTONOMOUS=1`.
- A waived generation reads as `allowed` only while no substantive descendant
  lands after the covered range; a later substantive change makes it `stale`
  again (negative control).
- The waiver appears in the project summary and the PR description's
  verification section.
- Tests (or skill contract tests) cover: a waived test-only descendant stays
  allowed; an unwaived test-only descendant is stale; a waiver followed by a
  new substantive commit is stale; a malformed waiver fails closed.
- `oat-project-implement` (and any skill that reads the exit-gate state, such as
  `oat-project-next`) is version-bumped.
