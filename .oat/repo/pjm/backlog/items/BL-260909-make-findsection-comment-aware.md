---
id: BL-260909-make-findsection-comment-aware
title: Make findSection comment-aware in the bundled-docs contract test
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - testing
  - skills
  - wave-7-followup
assignee: null
created: 2026-09-09T08:35:46.265Z
updated: 2026-09-09T08:35:46.265Z
associated_issues: []
external_plans: []
---

## Description

Wave-7 p17 (`2026-09-08-harden-the-external-plan-readiness-contract.md`) review M1, out of that plan's scope: `findSection` in `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts` is a third, comment-unaware fence pass, so the class-(a) fix (comment-hidden fence shapes) does not reach document level — a fence hidden inside an HTML comment can still hide later `##` headings from section lookup. Route `findSection` through the shared block scanner (or a comment-aware fence pass) and pin it with the comment-hidden-fence witness from the p17 review. Related polish from the same reviews: `linkDefinitions` re-runs the block scanner per declaration; `hasUnresolvedDestination` sits between `linksToItsSource`'s JSDoc and its function; a whole-line comment terminated by `\r` is not counted as fully hidden, so widening (d) does not apply on CRLF input (fail-closed) — normalize CRLF before the scan or document the LF-only contract.

## Acceptance Criteria

- `findSection` uses the comment-aware scanner; a comment-hidden fence no longer hides later headings (red-then-green witness).
- The block scanner runs once per document for `linkDefinitions`.
- CRLF handling is either normalized or documented as LF-only with a control.
