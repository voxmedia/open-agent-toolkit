---
id: BL-260909-reject-malformed-nested-values
title: Reject malformed nested values in the strict pjm.remote shared reader
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - config
  - pjm
  - wave-7-followup
assignee: null
created: 2026-09-09T08:35:36.324Z
updated: 2026-09-09T08:35:36.324Z
associated_issues: []
external_plans: []
---

## Description

Wave-7 p02 (`2026-09-08-make-config-unset-refuse-partial-sequences.md`) review found, pre-existing: the strict shared reader for `pjm.remote` accepts a malformed nested value (for example `authority.default: 5`), so `oat config unset` of a `pjm.remote` child raw-writes the malformed sibling back instead of refusing. Make the reader reject wrong-typed nested values with the same categorical error the top-level guard uses, and add the negative control (malformed nested value → refusal, the file untouched; a valid nested value → unset proceeds).

## Acceptance Criteria

- `oat config unset pjm.remote.<child>` on a file whose sibling nested value is wrong-typed refuses with a typed error and leaves the file byte-identical.
- A valid `pjm.remote` tree still unsets normally.
- Red-then-green control recorded in the test.
