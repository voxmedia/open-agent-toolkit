---
id: BL-260718-document-execution-program
title: Document execution-program artifact as stable OAT contract
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - wave
  - contracts
  - docs
assignee: null
created: 2026-07-18T17:31:56.101Z
updated: 2026-07-18T17:31:56.101Z
associated_issues: []
external_plans: []
---

## Description

Promote the execution-program artifact format from descriptive documentation
to a documented stable OAT contract. Group this work with
BL-260718-add-oat-wave-lifecycle-cli. Trigger: a second consumer, either the
wave CLI family or the program-recap recipe. Evidence: discovery operator
decision to keep current documentation descriptive only.

**Owner:** the repo operator is the accountable owner for prioritizing and
scheduling this deferred work.

## Acceptance Criteria

- The execution-program format has a versioned, normative schema covering its
  required fields, lifecycle states, and invariants.
- Validation and compatibility behavior are documented and executable.
- Existing descriptive wave-workflow documentation points to the stable
  contract without duplicating it.
- Planning and delivery are coordinated with
  BL-260718-add-oat-wave-lifecycle-cli.
