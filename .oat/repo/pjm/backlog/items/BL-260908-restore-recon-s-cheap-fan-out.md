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
updated: 2026-09-08T16:55:27.000Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/274
external_plans: []
---

## Description

GitHub issue #274. Recon's intent is inexpensive, high-volume evidence gathering for an intelligent calling agent: workers find, extract, cite, re-check citations, and search for counterexamples; bounded synthesis deduplicates and groups evidence and preserves disagreements with citations rather than settling them; the calling agent evaluates the packet and owns conclusions. The current contract drifted from that intent: the skill has no class-per-phase table (`recon/SKILL.md:119` classifies ad hoc against `subagent-orchestration`'s five classes), computes a run-wide MAXIMUM floor (`SKILL.md:119`, `references/profiles.md:54`), and binds one model/effort to every wave (`SKILL.md:121-123,152-153`), so one hard compile or adversarial pass prices every mapping and gathering lane at the top class (the operator's 2026-09-07 run: Sol medium for one map lane, four gather lanes, one compile lane). `DR-260831-approval-bound-homogeneous` codifies the run-scoped reading and `DR-260904` re-affirms it; `DR-260719-separate-recon-authority-from` (mixed floors cannot be flattened into one wave) states the intended model. Verified 2026-09-08 (post-program triage): the installed copy was functionally identical to the repo — a design defect, not a stale install. Run as its own decision-led project (Codex critique and the operator agree): not a wave lane.

## Acceptance Criteria

- [ ] The recon skill opens with the intent statement (inexpensive, high-volume evidence gathering for an intelligent calling agent; cheapest adequate workers by default; focused passes for citation checking, coverage, and counterexample search; escalation only for judgment the cheaper route cannot supply; the calling agent evaluates the evidence and owns conclusions) and states the responsibility split among recon, `subagent-orchestration`, `oat-dispatch-subagents`, and the caller
- [ ] Every worker wave resolves its own class floor independently; no run-wide maximum; challenge, verification, and coverage passes default to the cheapest qualified class; bounded synthesis is mechanical unless reconciliation demonstrably needs judgment, and it preserves disagreements with citations rather than settling them
- [ ] Escalation is per wave on a named trigger (a lane returns insufficient evidence; a contradiction cannot be reconciled mechanically), inside one fingerprinted approval envelope that shows each wave's assignment, lane count, exact model, effort, rationale, and permitted escalation; model and effort are chosen separately; escalation never authorizes replacing an accepted failed lane
- [ ] The guarantee is APPROVED per-wave selection (fingerprint-checkable); no self-attested launch provenance — actual-launch verification only where a harness supplies real evidence (`DR-260904` boundary)
- [ ] `references/packet-contract.md` gains per-wave `classFloor` and `target` with a schema version bump and v1 single-target normalization; `scripts/lib/contracts.mjs` validates per-wave targets, below-floor routing, target drift, and unapproved escalation; fixtures, `tests/skill-contract.test.mjs` (which today pins the run-wide-maximum prose), the docs page, and the bundled asset mirror follow
- [ ] A new decision supersedes `DR-260831-approval-bound-homogeneous` (homogeneity is a wave property; one envelope approves every target; independence still comes from separate passes, not model mix) and amends `DR-260904`'s singular-selection language; `DR-260719` is cited as restored
- [ ] The `quick` profile is documented as an evidence packet for an intelligent consumer (no independent semantic pass by design)
