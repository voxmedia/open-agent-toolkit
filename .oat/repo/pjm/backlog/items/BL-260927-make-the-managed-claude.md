---
id: BL-260927-make-the-managed-claude
title: Make the managed Claude dispatch-record input producible and self-describing
status: open
priority: high
scope: feature
scope_estimate: M
labels:
  - dispatch
  - cli
  - skills
assignee: null
created: 2026-09-27T03:35:36.101Z
updated: 2026-09-27T03:35:36.101Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/326
external_plans: []
---

## Description

Since PR #315, `oat-project-implement` requires `oat project dispatch record --event-file … --json` to return `status: validated-only` before every managed effort-pinned Claude implementer or reviewer launch (`references/dispatch-and-dry-run.md`), but documents the input only with placeholders. The derived-field check throws on the first protected field it finds (`packages/cli/src/providers/claude/dispatch-envelope.ts`), validation stages run one after another (`commands/project/dispatch/record.ts`), the canonical-role-resolution event fields (`canonicalPath`, `selectedPath`, `contentDigest`, `candidateMisses`) appear in no skill or doc, and path pattern failures report a bare `Invalid`. No production code emits the canonical-role evidence (`resolveCanonicalRole` has no production caller); a valid input exists only in `record.test.ts`. An operator needed about nine validation rounds to reach a valid record, which invites skipping or improvising the check. Errors inside one schema stage are already reported together. Related: `BL-260909-give-the-dispatch-record`. Source: GitHub issue #326.

## Acceptance Criteria

- A published minimal managed-Claude example for the implementer and reviewer roles, including the canonical-role-resolution event, validates as-is and is pinned by a test so it cannot drift.
- One validation run reports every derived-field, missing-field, forbidden-field, and unredacted-path violation across all stages.
- Pattern failures state the expected form, for example `expected <loaded|user|project>/agents/<name>.md`.
- A CLI path produces the record base or the canonical-role-resolution evidence from resolver output and the generated definition, so callers never hand-assemble derived fields or content digests.
- The implement skill points to the example or the producer instead of placeholders.
