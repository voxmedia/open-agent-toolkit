---
id: BL-260907-decode-entity-and-percent
title: Decode entity and percent escapes before matching external-plan backlinks
status: wont_do
priority: medium
scope: task
scope_estimate: XS
labels:
  - testing
  - skills
  - wave-5-followup
assignee: null
created: 2026-09-07T18:28:15.428Z
updated: '2026-09-08T16:55:33Z'
associated_issues: []
external_plans: []
---

## Description

The readiness contract's source-backlink matcher (skills-bundled-docs-contract.test.ts, wave-5 p12-t07..t09) compares raw label and destination text, so `[BL-123&#52;](...)` (renders BL-1234) and `.../BL-123%34.md` (resolves to BL-1234.md) both satisfy a declared `BL-123`; a definition inside a raw HTML block such as `<script type="text/plain">` also still resolves. Closing these needs entity/percent decoding with fail-closed handling of malformed escapes (false-rejection risk on legitimate `%20` URLs) or a CommonMark AST; declined inside the wave as a new capability (Codex Important on the p12-t09 round; no live plan carries an encoded identifier).

## Acceptance Criteria

- [ ] Labels and destinations are entity- and percent-decoded before identifier matching; malformed escapes fail closed with a control
- [ ] A definition inside a raw HTML block does not resolve a reference link (control added)
- [ ] The 44-plan corpus sweep classification is unchanged
