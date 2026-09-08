---
id: BL-260908-align-the-provider-view-json
title: Align the provider-view JSON, evidence states, and docs with the human row
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - cli
  - tools
  - wave-6-followup
assignee: null
created: 2026-09-08T06:58:17.586Z
updated: 2026-09-08T17:36:27.000Z
associated_issues: []
external_plans: []
---

## Description

Wave-6 final review round 2 polish on the p05/p06 provider-view diagnostic (`oat tools info <skill>`): (1) the human row suppresses the qualifier and path for `inactive`/`unsupported`/`excluded`, but `--json` still serializes `providerPath` for those rows while the JSDoc at `drift/skill-view-diagnostic.ts:129` says it is `null` when no view is expected — apply `NO_PROJECTION` in `diagnoseSkillViews` or scope the JSDoc and `manifest-and-drift.md` to the human row, and pin a `--json` assertion; (2) an escaping tracked path deliberately skips the version read but serializes `versionEvidence: 'absent'` (which elsewhere means the view declares no version) — add a `not-read` state or omit the field; (3) `projectedVersionNote` blames the copy for a conflicting `metadata.version`/`version` pair even when the canonical file carries the identical conflict because `getSkillVersion` drops the resolver's conflict field — name the canonical file when it carries the same conflict (round-1 m12); (4) the redaction sentence in `manifest-and-drift.md:139` overclaims: `BARE_ABSOLUTE_PATH` excludes `[A-Za-z0-9_~.>-]` before the slash by design (so relative and already-redacted paths survive) — say so.

## Acceptance Criteria

- [ ] `--json` `providerViews` rows for `inactive`, `unsupported`, and `excluded` carry `providerPath: null` (or the JSDoc at `skill-view-diagnostic.ts:129` is scoped to the human row), pinned by a `--json` assertion
- [ ] An escaping tracked path reports a distinct `versionEvidence` state (`not-read`) or omits the field; never `absent`
- [ ] A conflicting `metadata.version` / `version` pair present in the canonical file is named as the canonical file's conflict in the detail
- [ ] `manifest-and-drift.md`'s redaction sentence matches `BARE_ABSOLUTE_PATH`'s actual delimiter exclusions
