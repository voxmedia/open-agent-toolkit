---
id: BL-260909-restamp-a-stale-copy-strategy
title: Restamp a stale copy-strategy contentHash on skip and retire the
  pre-framing digest bridge
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - sync
  - drift
  - wave-7-followup
assignee: null
created: 2026-09-09T11:56:51.284Z
updated: 2026-10-02T22:53:49.000Z
associated_issues: []
external_plans: []
---

## Description

Wave-7 Phase 21 (lane p21b, final review C4) length-framed the managed-copy digest with a domain tag and added a pre-framing bridge in packages/cli/src/drift/detector.ts so existing copy-strategy installs (recorded legacy contentHash values) keep reading in_sync. Two residuals sit outside that lane's file list: (1) ensureSkipEntryManaged (packages/cli/src/engine/execute-plan.ts:379-392) returns the manifest untouched for an entry it already owns, so oat sync never restamps a stale contentHash — tamper a directory-copy hash and oat status says drifted/modified while oat sync answers skip and keeps the tampered value; fix it to restamp on skip (with a control), which then lets the legacy digest path and the bridge be retired; (2) classifyObsoleteMappingRetirement (packages/cli/src/engine/compute-plan.ts:340-373) compares the framed managed digest against a possibly-legacy stored hash, so an obsolete mapping with a pre-framing manifest classifies detach instead of remove — non-destructive, but it leaves a stale unmanaged provider tree; route it through the same bridge or restamp first.

## Shipped in backlog wave 4 (2026-10-02)

- p03-t01: `oat sync` restamps a faithful copy-strategy tree whose recorded
  `contentHash` is stale (legacy or tampered) with the framed digest, and a
  second run is a no-op. An obsolete copy-strategy mapping with a legacy
  manifest classifies `remove` when the tree matches canonical and `detach`
  otherwise.
- p03-t02: `validateOatSkills` reports a missing `SKILL.md` for every
  canonical skill directory, not only `oat-*` ones.
- p03-t03: a `skill` / `agent` provider directory with no marker file plans a
  non-repeating `error` operation naming the missing marker instead of
  `update_copy` on every run.

## Acceptance Criteria

Remaining scope: retire the compatibility bridge once field installs restamp.

- The pre-framing bridge in `packages/cli/src/drift/detector.ts` and the legacy
  digest encoder are removed once every manifest on the reference installs is
  restamped (the wave 4 restamp-on-skip makes that possible), with the
  detector's fused-forgery and collision controls still green.

## Notes

- 2026-09-09 (final review round 3, M4): the deferral of the marker-less-directory loop rests on "unreachable from this repository", true today (83/83 skills, 75/75 bundled assets carry `SKILL.md`) but not gate-enforced — `validateOatSkills` raises `Missing SKILL.md` only for `oat-*` directories (`packages/cli/src/validation/skills.ts:1544`, `:1552`), so deleting a non-`oat-` skill's marker would make the repository reachable with no gate saying so.
