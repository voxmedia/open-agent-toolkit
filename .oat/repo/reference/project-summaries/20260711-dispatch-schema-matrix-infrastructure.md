---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-11
oat_generated: true
oat_summary_last_task: p06-t12
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: Dispatch Schema and Matrix Infrastructure

## Overview

This project consolidated duplicated dispatch-matrix behavior and introduced a
reusable, provenance-safe dispatch reporting contract. It also made Cursor
validation work reusable within one command pass and replaced inference about
GPT-5.6 subagent slugs with reproducible, fail-closed evidence.

## What Was Implemented

- A shared dispatch-matrix algebra, normalizer, and walker now handles legacy
  scalars, direct targets, fallback routes, modern candidate ladders, sparse
  project overrides, Codex model/effort pairs, and opaque Cursor strings. Config,
  project state, adoption, and doctor use adapters over that shared core while
  preserving their prior malformed-input compatibility.
- Dispatch Report V1 provides deterministic JSON and human output while keeping
  policy, candidate tier/index, named ceiling, exact selection, configured
  defaults, immutable gate invocation, and observed runtime identity separate.
  The legacy `Dispatch:` line is derived from the report.
- Config adoption and doctor share a command-scoped Cursor validation context.
  Broad catalog retrieval is lazy and memoized once per pass; each distinct
  exact candidate still receives at most one real Task probe.
- The recommendation's 13 GPT-5.6 Cursor candidates received a dated historical
  probe pass. A second structured pass ran positive and negative controls on
  Cursor CLI `2026.07.09-a3815c0`; the public stream exposed no Task events, so
  controls were inconclusive and candidate execution stopped at zero.
- The structured capture/verifier now binds recommendation metadata, derives
  outcomes from an allowlisted projection, requires exact call/session/terminal
  correlation, binds passed controls to exact model arguments, constrains all
  public field types/domains, rejects credentials and paths, and stores raw
  identifiers only in a gitignored private companion.
- The recommendation remains unchanged and all candidates remain explicitly
  `unvalidated`. The active follow-up uses a client-rollout or Cursor-support
  trigger with a 2026-08-08 review-by date.
- User documentation, PJM references, bundled assets, and all five public
  packages were updated; the lockstep public version is `0.1.50`.

## Key Decisions

- **Dispatch matrix remains source of provider targets.** Abstract policy names
  compile against configured candidate ladders; policy compilation does not
  hard-code model families.
- **Configured invocation is separate from runtime identity.** Exact selected
  targets and immutable gate invocation provenance are report inputs, while
  runtime identity remains `not-reported` unless trusted telemetry establishes
  it.
- **Cursor catalog presence is diagnostic only.** Catalog retrieval may help
  explain availability, but only an exact correlated Task result can establish
  candidate eligibility for the current account and client.
- **Cursor candidate probes require passed structured controls.** If the
  positive and negative controls cannot prove that the harness exposes exact
  Task-model evidence, the candidate pass stops without manufacturing model
  outcomes.

## Design Deltas

- The intended coordinator-to-task-worker execution topology was replaced for
  this project by one exact pinned phase subagent implementing tasks directly
  and sequentially. Nested provider initialization was blocked by the
  coordinator sandbox; product behavior was unchanged. Durable remediation is
  tracked by `BL-260711-add-root-owned-dispatch-broker`.
- The original text-mode Cursor evidence protocol was strengthened after the
  related max-depth project clarified that launcher-selected invocation and
  runtime-observed identity are different evidence classes. The approved p06
  revision added structured controls, private correlation evidence, and strict
  public-schema validation.

## Notable Challenges

- Restricted phase sessions could edit the worktree but not always create the
  parent repository's worktree `index.lock`. Root-owned commits and narrowly
  approved broader phase permissions preserved task boundaries without using
  nested workers.
- Cursor's public `stream-json` output contained only parent
  system/user/assistant/result envelopes in the control run. The protocol
  correctly treated that as a harness boundary rather than evidence for or
  against any candidate.
- Repeated adversarial reviews exposed several subtle trust gaps in the evidence
  verifier. Three bounded automated p06 review cycles plus one user-approved
  manual closeout produced a strict, independently verified schema.

## Tradeoffs Made

- Raw Cursor events and exact identifiers are retained only in gitignored local
  storage for support escalation. Tracked evidence uses hashes and a bounded
  projection, sacrificing public forensic detail to preserve privacy.
- Recommended Cursor values were retained rather than silently removed because
  the controls never established that the harness could observe Task selection.
  This leaves configuration useful but explicitly unvalidated.

## Integration Notes

- Consumers should use the shared matrix normalizer/walker rather than adding a
  new traversal.
- Treat named tiers as maximum ceilings; reports keep requested candidate,
  candidate tier, ceiling tier, and exact selected target distinct.
- Treat `Dispatch:` as a compatibility rendering of Dispatch Report V1, not as
  the schema or an authority for runtime identity.
- Cursor strings remain opaque and must be passed byte-for-byte through the
  resolver's provider dispatch arguments.

## Follow-up Items

- `BL-260708-verify-cursor-gpt-5-6-subagent` remains open until structured
  controls expose Task events or Cursor support confirms the private requests.
- `BL-260711-add-root-owned-dispatch-broker` tracks a durable exact-dispatch
  topology with launcher-owned provenance and restricted task workers.

## Associated Issues

- Completed: `BL-260709-add-dispatch-machine-schema`,
  `BL-260707-consolidate-dispatch-matrix`, and
  `BL-260707-cache-cursor-model-catalog`.
- Active: `BL-260708-verify-cursor-gpt-5-6-subagent` and
  `BL-260711-add-root-owned-dispatch-broker`.
