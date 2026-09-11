---
id: BL-260908-restore-recon-s-cheap-fan-out
title: Restore recon's cheap-fan-out intent with per-wave routing under one
  approval envelope
status: open
priority: high
scope: feature
scope_estimate: L
labels:
  - recon
  - dispatch
  - decisions
  - routing
assignee: null
created: 2026-09-08T16:54:21.407Z
updated: 2026-09-11T16:05:00.000Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/274
external_plans: []
---

## Description

GitHub issue #274. Recon's intent is inexpensive, high-volume evidence gathering for an intelligent calling agent: workers find, extract, cite, re-check citations, and search for counterexamples; bounded synthesis deduplicates and groups evidence and preserves disagreements with citations rather than settling them; the calling agent evaluates the packet and owns conclusions. The current contract drifted from that intent: the skill has no class-per-phase table (`recon/SKILL.md:119` classifies ad hoc against `subagent-orchestration`'s five classes), computes a run-wide MAXIMUM floor (`SKILL.md:119`, `references/profiles.md:54`), and binds one model/effort to every wave (`SKILL.md:121-123,152-153`), so one hard compile or adversarial pass prices every mapping and gathering lane at the top class (the operator's 2026-09-07 run: Sol medium for one map lane, four gather lanes, one compile lane). `DR-260831-approval-bound-homogeneous` codifies the run-scoped reading and `DR-260904` re-affirms it; `DR-260719-separate-recon-authority-from` (mixed floors cannot be flattened into one wave) states the intended model. Verified 2026-09-08 (post-program triage): the installed copy was functionally identical to the repo — a design defect, not a stale install. Run as its own decision-led project (Codex critique and the operator agree): not a wave lane.

## Acceptance Criteria

- [x] The recon skill opens with the intent statement (inexpensive, high-volume evidence gathering for an intelligent calling agent; cheapest adequate workers by default; focused passes for citation checking, coverage, and counterexample search; escalation only for judgment the cheaper route cannot supply; the calling agent evaluates the evidence and owns conclusions) and states the responsibility split among recon, `subagent-orchestration`, `oat-dispatch-subagents`, and the caller
- [x] Every worker wave resolves its own class floor independently; no run-wide maximum; challenge, verification, and coverage passes default to the cheapest qualified class; bounded synthesis is mechanical unless reconciliation demonstrably needs judgment, and it preserves disagreements with citations rather than settling them
- [x] Escalation is per wave on a named trigger (a lane returns insufficient evidence; a contradiction cannot be reconciled mechanically), and one session-local approval preview shows every wave's assignment, lane count, exact model, effort, rationale, condition, and limit; proposal changes or session resume require fresh approval, and escalation never authorizes replacing an accepted failed lane
- [x] The guarantee is approved exact per-wave selection with immediate launch; no persisted approval fingerprint or self-attested launch provenance is treated as proof, and actual-launch verification exists only where a harness supplies real evidence (`DR-260904` boundary)
- [x] `references/packet-contract.md` defines manifest v2 per-wave `classFloor` and complete `target`; `scripts/lib/contracts.mjs` validates per-wave targets, below-floor routing, target drift, profile modes and caps, singleton cardinality, conditional escalation, and packet publication; fixtures, contract tests, public docs, and the bundled asset mirror follow. Legacy manifest v1 support is intentionally removed while evidence formats remain independently versioned
- [x] `DR-260910-restore-economical-recon` supersedes the homogeneous run-wide selection rule and restores `DR-260719`'s separate task-class floors; `DR-260911-use-session-local-recon` records the simplified approval contract and partially supersedes the remaining legacy approval clauses
- [x] The `quick` profile is documented as an evidence packet for an intelligent consumer (no independent semantic pass by design)
