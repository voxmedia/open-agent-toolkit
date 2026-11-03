---
id: BL-261102-provide-a-supported-closeout
title: Provide a supported closeout path for legacy-shaped projects
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - lifecycle
  - closeout
assignee: null
created: 2026-11-02T14:07:17.028Z
updated: 2026-11-02T00:00:00.000Z
associated_issues: []
external_plans: []
---

## Description

Projects whose implementation finished before current closeout formats existed cannot complete through oat-project-complete: oat project closeout-check refuses a missing or malformed oat_post_implement_sequence snapshot, and oat project journal check refuses journals written before the current implementation.md slot format. oat-project-complete states there is no override for a missing snapshot. In PR #394 four shipped projects (backlog-wave-5, recon-rework, claude-effort-levels, cursor-cloud-autonomous-projects) therefore had to be archived with oat project archive directly, without lifecycle completion: no completion seal, no oat_lifecycle: complete, and no completion summary refresh. The repository has no documented, validated route that brings such a project to a completed, archived state.

## Acceptance Criteria

- A documented, supported route brings a shipped legacy-shaped project (missing or malformed closeout snapshot, or a pre-journal-format `implementation.md`) to `oat_lifecycle: complete` and archived, either through `oat-project-complete` or through a named CLI command.
- The route records why the project was legacy-shaped and who authorized the closeout, so the archived `state.md` distinguishes it from a normal completion.
- The route refuses a project that is not shipped, for example one whose tracked PR is not merged and that has no other delivery evidence.
- Projects with a current closeout snapshot and journal format keep the existing strict refusals; the closeout invariant is not weakened for them.
- Running the route on a fixture that reproduces one of the four PR #394 project shapes completes and archives it; a test proves the strict path still refuses the same fixture.

## Merged from BL-261012-convert-legacy-journals (2026-11-02 triage)

A legacy-journal converter is one candidate route for the legacy-journal case above.

#### Description

Deferred idea from artifact-cleanup discovery. Legacy journals (task tables, checklists, an Implementation Log section, receipts after References) are shown tolerantly by the shared record reader but are never accepted as completion evidence (D5). A project resumed from an older journal must be fixed by hand before oat project journal check passes at completion. Offer a converter that rewrites a legacy journal into the canonical slots on a working copy for the operator to review, never in place on an archived or sealed artifact (D1).

#### Acceptance Criteria

- A converter writes the canonical-slot journal for a legacy journal to a separate working-copy file and never modifies the source, an archive or a sealed log
- The converted output of a real legacy journal (captured fixture with provenance) passes oat project journal check at review, or reports every gap it could not convert
- Tables and checklists are still never accepted as completion evidence by the validator
