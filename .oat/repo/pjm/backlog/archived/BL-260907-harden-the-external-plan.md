---
id: BL-260907-harden-the-external-plan
title: 'Harden the external-plan backlink matcher: full extension consumption
  and comments before fences'
status: closed
priority: medium
scope: task
scope_estimate: XS
labels:
  - testing
  - skills
  - wave-5-followup
assignee: null
created: 2026-09-07T21:49:05.406Z
updated: '2026-09-09T10:17:05Z'
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-08-harden-the-external-plan-readiness-contract.md
---

## Description

Exit gate attempt 3 of wave 5 (passing, judgment-sweep deferrals): (1) `BACKLOG_ID_MATCH_END` in skills-bundled-docs-contract.test.ts accepts as soon as the declared ID is followed by `-[A-Za-z0-9]` and never consumes the extension or checks its final boundary, so `BL-123` accepts `BL-123-other_more`, `BL-123-otheré`, `BL-123-other--tail`; (2) `linkDefinitions()` and `sourceDeclarations()` call `withoutFences()` before removing HTML comments, so a fence opener inside a comment changes parser state and can hide a valid declaration or definition after it (control: `<!--` / ` ```markdown ` / `-->` then a linked declaration → declaration lost). Both contradict the p12-t09 contract; deferred because fixing them after the passing gate would stale it.

## Merged at the 2026-09-08 triage

Absorbs `BL-260907-decode-entity-and-percent` (decode entity and percent escapes before matching backlink identifiers; definitions inside raw HTML blocks) and `BL-260907-fail-closed-on-unparsable` (an unparsable `created` fallback for `kind: program` falls to `legacy` and is accepted — `skills-bundled-docs-contract.test.ts:849-870`). Broader than first written: `linkDefinitions()` at `:342` never strips HTML comments at all. Resolve the `oat-wave-program` `merged`/`done` vocabulary (`BL-260907-settle-the-oat-wave-program`) before tightening consumers.

## Acceptance Criteria

- [ ] The matcher consumes the complete `(?:-[A-Za-z0-9]+)+` extension before enforcing a Unicode-aware boundary, with negative controls for malformed suffixes after an initially valid segment and the multi-segment accepted case retained
- [ ] HTML comments are removed before fence scanning in both definition and declaration extraction, with controls for fence-looking lines inside terminated and unterminated comments followed by valid source content
- [ ] Entity- and percent-encoded backlink identifiers and definitions inside raw HTML blocks are decoded or rejected consistently, with separate controls
- [ ] An unparsable `created` date on a `kind: program` document fails closed, with a control
- [ ] Separate controls for suffix boundaries, comment/fence order, decoding, and malformed readiness dates, followed by the corpus control
- [ ] The 44-plan corpus sweep classification is unchanged
