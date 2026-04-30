---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-30
oat_generated: true
oat_summary_last_task: p04-t16
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: collaborative-design-workflow

## Overview

This project reworked OAT's spec-driven design workflow around a more collaborative, Superpowers-aligned interaction model. The default path now folds requirements confirmation into `oat-project-design`, produces `spec.md` and `design.md` in one design conversation, presents design sections for review before writing the final artifact, and keeps draft-and-review available for unattended or explicitly selected one-pass drafting.

The branch also updates companion workflow skills so discovery routes to design by default, standalone spec authoring remains available as an optional utility, and quick-start has a lightweight design branch with a clear promotion path to full spec-driven design.

## What Was Implemented

- `oat-project-design` v2: mode choice, folded spec authoring, approach reaffirmation, YAGNI guardrail, collaborative section iterator, draft-and-review branch, self-review, commit-first user-review gate, and folded spec/design HiLL behavior.
- `oat-project-quick-start` v2 companion updates: requirements gate, lightweight design choice, collaborative/draft lightweight design branches, and promotion routing to full design.
- `oat-project-spec` repositioning as a standalone optional utility rather than a required default pipeline phase.
- `oat-project-discover` routing updates so default discovery moves to `oat-project-design`.
- `workflow.designMode` config support for persisted design-mode preference, with `collaborative`, `selective`, and `draft` values.
- Selective Collaborative mode for full `oat-project-design`: Section Review Plan, conservative `routine` vs `needs-eyes` classification, reference-file heuristic, final recap for silently drafted sections, and prose-contract validation.
- Public package lockstep version bumps, shipped docs updates, and Superpowers attribution in `NOTICES.md`. After the PR branch rebase onto `origin/main`, the current public package/manifest version is `0.0.54`.

## Key Decisions

- Spec generation is folded into full design by default, but `oat-project-spec` remains available as a standalone utility when a user explicitly wants a separate spec pass.
- Collaborative mode writes `design.md` only after sections are approved in conversation, avoiding a committed artifact the user has not read.
- Missing structured `AskUserQuestion` support is not treated as non-interactive when normal chat is available.
- Selective Collaborative mode is offered only in full spec-driven design; quick-start keeps the smaller collaborative/draft choice because its lightweight section set already limits review overhead.
- Selective classification is conservative: any one needs-eyes signal triggers live review, and Overview + Architecture is always shown at minimum.

## Notable Challenges

- A post-rebase staleness review was required after PR #58 changed the implementation contract from the removed `oat-project-subagent-implement` flow to `oat-project-implement` v2 with phase-subagent execution and plan-declared parallelism.
- Dogfood surfaced a real interaction bug: an agent treated missing `AskUserQuestion` as non-interactive even though chat was available. The fix clarified that tool availability and interactivity are separate.
- The Selective Collaborative revision was added late in the branch, so it was folded into Phase 4 with a second lockstep package bump instead of becoming a separate project/PR.
- The final p04-tA-tF re-review surfaced one Minor-only NFR5 issue: `oat-project-design/SKILL.md` had reached 701 lines against the 700-line ceiling. p04-t16 removed one redundant picker-taxonomy line, restored the 700-line ceiling, and the user approved lifecycle completion without a separate final-review pass.

## Verification

- Targeted config tests for `workflow.designMode` passed.
- Skill validation tests passed, including the Selective Review Pass contract checks.
- Docs build passed after documentation sync.
- Post-rebase validation passed: `pnpm release:validate`, selective skill validation (`28/28`), `pnpm lint`, `pnpm type-check`, `pnpm format`, pre-push version checks, and GitHub `ci` + `release-dry-run`.
- Artifact-only Selective Collaborative classification dogfood was recorded in `references/selective-review-pass.md`.

## Follow-up Items

- Run live Selective Collaborative dogfood for picker taxonomy paths: `Recommended`, `Available / not recommended`, and `Unavailable`.
- Verify mid-flight "walk me through every remaining section" behavior in a real provider-skill run.
- Verify the final user-review recap lists sections drafted without live confirmation in a real provider-skill run.
