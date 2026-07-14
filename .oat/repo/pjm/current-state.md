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
- [Orchestration Model](../../../apps/oat-docs/docs/workflows/projects/orchestration-model.md)
  defines root-owned phase implementation, independent review, and optional
  isolated nesting.
- [Smoke Testing](../../../apps/oat-docs/docs/contributing/smoke-testing.md)
  defines deterministic verification and opt-in live-provider operator runs.

## What's Implemented

<!-- Summarize shipped capabilities and important repo conventions here. -->

- The CLI passively reports newer stable npm releases during eligible ordinary
  commands. Before `init`, `tools install`, or `tools update` mutates bundled
  tools, a known newer CLI triggers a default-no freshness guard explaining
  that the running CLI can only install its older bundled versions. Acceptance
  updates the exact CLI version and requires a shell-aware rerun. Daily
  best-effort checks and three-day same-version notice cadence are cached under
  `~/.oat`; automation and opted-out invocations remain silent.
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
- Root-owned phase-agent execution is the default: one phase implementer owns
  direct sequential task execution, while the root independently owns review
  and bounded fix routing. Codex depth 1 is sufficient for this topology; depth
  2 is required only when optional nested work is selected.
- Exact native Codex `agent_type` dispatch is primary for phase implementers,
  reviewers, and optional workers. Launcher-owned configured invocation remains
  separate from runtime producer identity, and pinned fallback is allowed only
  after explicit pre-start role-selection rejection.
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
- The live workflow smoke surface provides a disposable three-phase fixture,
  deterministic and authenticated runner paths, failure-preserving evidence,
  canonical report assertions, and safe cleanup. The retained Codex
  implementation packet passes 10/10 assertions; normal root verification
  includes direct smoke lint, formatting, and 123 tests.
- `oat-repo-improve` now owns external-plan generation across repo audits,
  maintainability reviews, backlog reviews, backlog directories, and individual
  backlog items. It composes broad reconnaissance with the reusable dispatch
  engine, writes only durable external plans, maintains backlog reverse links,
  and leaves OAT project import optional.

## What's Next

<!-- Track near-term follow-up work, known gaps, and active handoff context here.
Track concrete items in pjm/backlog/ and sequencing in pjm/roadmap.md; keep this
section to a short narrative pointer. -->

Run the documented post-ship Claude, Cursor IDE, Cursor CLI, cross-harness, and
interactive smoke matrix when operator capacity allows. Active backlog work
also covers activity-aware gate timeouts, a per-project external-gate override,
trimming the largest implementation reference, rechecking Cursor GPT-5.6
eligibility by 2026-08-08, optional root-owned exact dispatch, reviewer
reconnaissance, and avoiding redundant bookkeeping-only re-reviews.
