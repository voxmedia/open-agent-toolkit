---
id: BL-260909-show-the-brainstorm-pack
title: Show the brainstorm pack in the oat-doctor dashboard example and pack
  enumeration
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - docs
  - skills
  - wave-7-followup
assignee: null
created: 2026-09-09T08:35:39.236Z
updated: 2026-10-31T21:08:00Z
associated_issues: []
external_plans: []
---

## Description

Wave-7 p07 cross-model review found, pre-existing: `.agents/skills/oat-doctor/SKILL.md`'s dashboard example omits the `brainstorm` pack from both sections, and the pack enumeration near `SKILL.md:90` omits it too. Align both with the live pack list. Separately noted, not a defect: the example's pack-level current/outdated has no stated derivation rule from per-skill status — decide and document it (all-current → current, any-outdated → outdated, or something else) in the same edit.

**Delivery status (2026-10-31):** Landed: oat-doctor 2.0 (#300, `4a9ee6a12`)
dropped the hardcoded pack enumeration; the pack list now comes from the
`pack` field of `oat tools list`, and "the skill carries no pack manifest"
(`.agents/skills/oat-doctor/SKILL.md:276`). Remaining: the Installed Packs
example table (`SKILL.md:257-262`, which shows only `core` and `workflows`)
and the unstated pack-level status rule.

## Acceptance Criteria

- The dashboard example lists every bundled pack including `brainstorm`.
- The pack-level status derivation rule is stated once in the skill.
- `metadata.version` bumped; pins re-pointed.
