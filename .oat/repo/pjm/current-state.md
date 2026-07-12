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
- Managed Codex role materialization enforces an effective
  `agents.max_depth >= 2` without lowering higher project or inherited user
  values, enabling native coordinator-to-worker delegation. Doctor and managed
  preflight provide scope-correct remediation when effective depth is
  insufficient.
- Exact native Codex `agent_type` dispatch is primary for coordinators, workers,
  and reviewers. Launcher-owned configured invocation remains separate from
  runtime producer identity, and pinned fallback is allowed only after explicit
  pre-start role-selection rejection.
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
- Reusable OAT subagent dispatch is split into a provider-neutral utility
  engine and a project lifecycle adapter. The engine owns capability,
  authorization, catalog, route/model/effort selection, launch evidence, and
  recovery; the adapter adds project, phase/task, gate, write-boundary,
  commit, and worktree semantics without duplicating provider mechanics.

## What's Next

<!-- Track near-term follow-up work, known gaps, and active handoff context here.
Track concrete items in pjm/backlog/ and sequencing in pjm/roadmap.md; keep this
section to a short narrative pointer. -->

Continue the remaining dispatch work through the active backlog: recheck live
GPT-5.6 Cursor Task/subagent eligibility after a client rollout exposes Task in
headless mode or Cursor support confirms the private requests (review by
2026-08-08), add root-owned exact dispatch with launcher-owned provenance,
adopt the reusable dispatch contracts in analytical callers such as
`oat-repo-improve`, enable reviewer reconnaissance subagents, and structure
post-implementation sequencing. Review-efficiency follow-up also tracks skipping redundant
re-review after narrowly classified, deterministically validated
bookkeeping-only fixes across direct/subagent and gate-originated review flows.
