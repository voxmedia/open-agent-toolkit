---
id: BL-260906-persist-status-native-skill
title: Persist status native-skill adoption by setting manifestChanged
status: closed
priority: high
scope: task
scope_estimate: S
labels:
  - status
  - cli
  - wave-4-followup
assignee: null
created: 2026-09-06T19:21:29.824Z
updated: '2026-09-09T10:16:58Z'
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-08-persist-native-skill-adoption-in-status.md
---

## Description

In packages/cli/src/commands/status/index.ts the native-skill adopt path mutates the in-memory manifest without setting manifestChanged, so the adoption is never saved. Pre-existing; observed by the wave-4 p02 review round 1 while verifying the migrationAborted branches. Set the flag (so the new pre-save restamp advisory also fires) and add a test that the adoption persists.

## Planning note (2026-09-08)

Planning verified on the built CLI (`0.2.66`) that the description's premise is false: `adoptStrayToCanonical` returns the manifest object unmodified for every `nativeRead` mapping (`packages/cli/src/commands/shared/adopt-stray.ts:140-142`), and every candidate in the status native-skill loop is `nativeRead` by construction, so no adopted entry exists to be dropped. `adopt-stray.test.ts:148-225` already pins that neutrality on an empty manifest. What remains is a consistency defect — status is the only completed migration in the CLI that does not persist and restamp the manifest afterwards (`oat init` and `oat sync` both do) — plus the missing pins. The first two criteria below are superseded by the replacements recorded in the external plan; the third stands.

## Acceptance Criteria

- [ ] ~~The native-skill adoption loop in `status/index.ts` sets `manifestChanged` when it moves files, so the manifest save at `:1527-1534` runs and the adopted entry persists (re-read from disk in the test)~~ **Superseded:** both `adopt` success paths in the native loop set `manifestChanged`, so the save at `status/index.ts:1539-1542` runs; a disk-backed test re-reads `.oat/sync/manifest.json` and pins the restamped `oatVersion`, the surviving unrelated entry, and the absence of an entry for the natively read skill.
- [ ] ~~A control shows the pre-fix tree dropping the entry and reporting the skill as a stray on the next `oat status`~~ **Superseded:** the new status cases are observed red before the flag is set (`saveManifest` called 0 times, no advisory), and the `nativeRead` neutrality pin in `adopt-stray.test.ts` is observed red when its early return is neutralized.
- [ ] The restamp behavior around the save is unchanged and pinned
