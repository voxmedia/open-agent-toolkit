---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-18
oat_generated: true
oat_summary_last_task: p03-t09
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: orchestration-run-log

## Overview

Operational observations from OAT lifecycle runs were being lost in chat history or sealed inside gitignored project archives. This project added a durable, append-only per-project log that captures structural events and agent judgments, then rolls useful observations into tracked summary and repository-reference surfaces before archival. The feature retained quick-mode's low-ceremony behavior while making the loss-prevention boundary executable and testable.

## What Was Implemented

- Added layered `workflow.projectLog` (`true | false | auto`, default `auto`) and `workflow.projectLogLedgerPath` configuration.
- Added and bundled the canonical `project-log.md` template with machine-parseable heading grammars, a self-teaching logging contract, secret-redaction guidance, and an end-of-run synthesis marker.
- Added `oat project log append`, `check`, `synthesize`, and `rollup`. The commands validate taxonomy and serialization boundaries, preserve append-only history, expose structured status, and own all log, synthesis, summary-section, and ledger mutations.
- Extended `oat project new` with explicit project-log scaffold controls and integrated once-only structural appends into all six `oat gate review` terminal outcomes without changing gate results when logging fails.
- Integrated dispatch, phase, STOP/park, graduation, roll-up, synthesis-warning, seal, and archive-ordering contracts into `oat-project-implement`, `oat-project-summary`, and `oat-project-complete`.
- Added command documentation, provider-synced and bundled assets, lockstep public-package version `0.1.73`, focused command and contract tests, and an end-to-end lifecycle test covering archive durability.

## Key Decisions

- **General-purpose project log.** The source observations included tooling and workflow lessons beyond orchestration, so `project-log.md` accepts bugs, friction, worked-wells, and feedback while v1 integrations focus on orchestration lifecycle events. This avoids suppressing reusable observations without expanding the initial integration scope.
- **CLI-owned log mutations.** Agents and skills invoke `oat project log`; they do not hand-edit entries, synthesis, summary roll-up, or ledger output. Centralized validation and structured outcomes keep append-only and archival guarantees testable.
- **Automatic create-on-first-append.** `workflow.projectLog` defaults to `auto`, so a project gets no new artifact until a lifecycle append point fires. Explicit scaffold flags and config overrides remain available, and an existing artifact continues accepting appends regardless of later config.
- **Append-based ledger graduation.** A reusable project-scoped judgment is promoted by appending a new `general` judgment that references the original heading. The original remains immutable, and roll-up naturally selects the promoted entry for the repository ledger.
- **Roll-up before archive.** Completion treats a failed roll-up of a populated log as blocking because archival can hide the source artifact, while pending synthesis remains a warning and a missing default reference layer is a permitted skip. This preserves durable observations without making every incomplete synthesis halt closeout.

## Design Deltas

- The initial coexistence wording implied that roll-up could exclude observations already represented in Autonomous Execution Learnings. The shipped `rollup` command intentionally writes every project-log entry and exposes no filtering contract, so Workflow Observations remains complete and Autonomous Execution Learnings must use a one-line cross-reference for overlap. This executable contract was accepted during implementation, reflected in the summary skill, and aligned back into `design.md`; no follow-up remains.

## Notable Challenges

- Plan review exposed that markdown skill prose alone could not prove roll-up-before-archive enforcement. After two gate attempts, the operator selected an executable `oat project log rollup` surface with a structured failure outcome; the design and plan were updated before implementation.
- Phase 1 verification found incompatible append/roll-up dependency signatures, which were unified before the full suite was rerun. Phase 2 test expectations also had to be corrected to use the fixture's resolved review scope rather than a hardcoded phase.
- The final review found four issues: serialization collisions, incomplete staging of summary-flow mutations, a missing implement-skill permission, and duplicate first-batch ledger candidates. Tasks p03-t06 through p03-t09 fixed all four, 73 focused tests and the 3,083-test CLI suite passed, and the final re-review reported zero findings at every severity.

## Tradeoffs Made

- v1 limits automatic appenders to the highest-value lifecycle surfaces; broader review-receive, bootstrap, and planning coverage remains follow-up work.
- Concurrent appends are not serialized. Current root-checkout lifecycle writers run serially, avoiding added locking complexity until a concrete parallel-writer need appears.
- Structural entries are constrained to one-line artifact references and judgment entries receive concise guidance rather than hard size caps, favoring useful evidence over premature policy.

## Integration Notes

- `project-log.md` is command-owned. Integrations should use live `oat project log --help` contracts and reference artifacts by path rather than duplicating their contents.
- Roll-up sends all entries to `## Workflow Observations`; only `general` judgments enter the configured repository ledger, deduplicated by entry date and area.
- Verification completed across formatting, lint, type-check, skill validation, release validation, 3,083 CLI tests, workspace and docs builds, and 64 generated documentation pages.

## Follow-up Items

- `BL-260713-root-agent-judgment-logging`: define root-agent responsibility for recording judgment entries.
- Add structural appenders for review-receive disposition maps, worktree bootstrap status, and quick-start/plan gates after v1 proves the pattern.
- Revisit hard size checks and concurrent-append serialization only if real project logs demonstrate those needs.
