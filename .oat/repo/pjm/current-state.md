# OAT Current State

This file is the active operating picture and lives under `pjm/` (the
operational layer), not `reference/`. To reduce cross-worktree conflicts, keep
edits append-mostly and scoped to the section you own; avoid rewriting whole
sections another branch may also touch.

## Canonical References

<!-- List durable repo references, source-of-truth docs, dashboards, or processes here.
Decisions live in reference/decisions/ (one file per record); link them rather than
copying their content here. -->

- [Workflow Gates](../../../apps/oat-docs/docs/cli-utilities/workflow-gates.md)
  defines gate invocation provenance and declared-project corroboration.
- [Project Reviews](../../../apps/oat-docs/docs/workflows/projects/reviews.md)
  defines phase review gates and producer aggregation behavior.
- [Dispatch Policy](../../../apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md)
  defines candidate ladders, named ceilings, and exact task dispatch.

## What's Implemented

<!-- Summarize shipped capabilities and important repo conventions here. -->

- Gate reviews now declare and corroborate their project, bind an immutable
  configured invocation record to the review artifact, and fail closed on
  correlation or provenance mismatch.
- Final and contiguous-range reviews aggregate in-scope producer provenance
  without treating one latest stamp as the aggregate identity.
- Plan, quick-start, import-plan, and spec-driven plan paths can offer opt-in,
  non-pausing phase review gates when a qualifying target is available.
- Managed dispatch uses ordered provider candidate ladders with project/phase
  named maximum ceilings; Codex variants materialize by configuration ownership,
  while Claude and Cursor receive exact selected model values at invocation.
- Dispatch matrix normalization and provenance-rich traversal are shared across
  layered configuration, sparse project state, config adoption, and doctor.
- Dispatch Report V1 provides deterministic machine and human output while
  keeping policy, ceiling, requested candidate, exact selection, configured
  gate invocation, and observed runtime identity distinct. The legacy
  `Dispatch:` line is derived from that report.
- Config adoption and doctor share pass-scoped Cursor validation: each distinct
  candidate receives one Task probe and broad catalog retrieval is memoized for
  the command pass without treating catalog presence as eligibility evidence.
- Cursor GPT-5.6 verification now has a strict structured evidence schema,
  exact Task correlation, control-gated candidate execution, and private-only
  raw identifiers. The current headless client exposed no Task events, so the
  controls were inconclusive and the configured recommendation remains
  explicitly unvalidated.

## What's Next

<!-- Track near-term follow-up work, known gaps, and active handoff context here.
Track concrete items in pjm/backlog/ and sequencing in pjm/roadmap.md; keep this
section to a short narrative pointer. -->

Continue the remaining dispatch work through the active backlog: recheck live
GPT-5.6 Cursor Task/subagent eligibility after a client rollout exposes Task in
headless mode or Cursor support confirms the private requests (review by
2026-08-08), add root-owned exact dispatch with launcher-owned provenance,
enable reviewer reconnaissance subagents, and structure post-implementation
sequencing.
