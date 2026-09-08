---
id: BL-260908-tighten-the-pr-final-ledger
title: Tighten the pr-final ledger guard's prose and escaped-pipe boundary
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - pjm
  - lifecycle
  - wave-6-followup
assignee: null
created: 2026-09-08T06:58:19.023Z
updated: 2026-09-08T06:58:19.023Z
associated_issues: []
external_plans: []
---

## Description

Wave-6 final review round 2 polish on the `oat-project-pr-final` ledger-path guard (Phase 06 p06-t04): (1) the escaped-pipe stops fire on any `\|` in a ledger header or row before the Artifact cell is read, so a `\|` in a column to the right of Artifact, or in a non-ledger table's header inside `## Reviews`, now stops where the round-1 guard exited 0 — fail-closed and with zero corpus impact (no escaped pipe exists in any of the 94 ledgers), so if it ever bites, exempt a `\|` strictly right of `artifact_column` on an already-recognized ledger row and pin the exemption with an acceptance case rather than reverting the stop; (2) the prose at `SKILL.md:412` still says the scan ends at the next level-two heading, while a second exact `## Reviews` re-enters the scan and a level-one heading does not end it (both scan more, the safe direction) — say "ends at the next level-two heading other than `## Reviews` itself; a `###` subsection and a level-one heading do not end it".

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
