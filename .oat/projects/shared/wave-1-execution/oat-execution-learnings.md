---
oat_generated: false
purpose: autonomous-execution-learnings
append_only: true
oat_last_updated: 2026-08-26
---

# Autonomous Execution Learnings: wave-1-execution

Append-only, UTC-dated entries from the autonomous run (categories: gotcha,
efficiency, documentation-gap, candidate-skill-content, decision,
environment-limited). No secrets, no autonomy signals.

## 2026-08-26T04:20:00Z - environment-limited - Configured plan gate blocked by Cursor usage limit

**Observation:** `oat gate review` selected `cursor-gpt-5-6-sol-xhigh` (highest priority after same-runtime avoidance); `cursor-agent` rejected two launches with a team usage-limit error while its availability probe (`cursor-agent --version`) kept passing.
**Impact:** Whole program blocked at a credential/quota boundary until the operator raised the limit; no integrity-preserving route existed without config or `--target` changes.
**Recommendation:** Gate target selection should probe entitlement (a cheap real invocation) or fall through to the next target on a pre-child provider rejection; wave skill rule 8 should classify pre-child rejections as launch defects.

## 2026-08-26T13:45:00Z - gotcha - Test-only changes under packages/cli trip the lockstep version guard

**Observation:** `versionPolicyIgnorePatterns` for `packages/cli` is `['assets/**']`, so plan-mandated test files under `packages/cli/src/release/` counted as a publishable change and `release:check-versions` demanded a five-package bump the lane could not make.
**Impact:** One direction-required recovery event; root-owned wave-level bump 0.2.32→0.2.33 at integration; discovery's "no bump expected" assumption was wrong.
**Recommendation:** Drift refresh should intersect each lane's write surface with the release change-detection roots and plan the bump up front; separately decide (policy) whether test paths should be version-policy-ignored.

## 2026-08-26T13:48:00Z - gotcha - Compound `cd` persisted the shell cwd across orchestrator calls

**Observation:** A verification call that began with `cd .worktrees/wave-1/p02 && …` left the cwd in the phase worktree; the next root bookkeeping commit landed on `wave-1/p02`.
**Impact:** Repair via cherry-pick + reset of the unreviewed misplaced commit; reviewed SHAs unaffected.
**Recommendation:** Orchestrator commands always use absolute paths / `git -C`; generalize wave-execute rule 5 beyond merges.

## 2026-08-26T14:05:00Z - candidate-skill-content - Reviewer-designed probes found what green gates missed

**Observation:** p01's Important (post-detach unsettleable reap) and the round-2 Medium (reorder mutation) were found only by reviewer probes; every implementer gate, pinned test, and codex pass was green. Delete-class mutations were insufficient; reorder-class caught the residual gap.
**Impact:** Two extra fix rounds, both cheap; no defect shipped.
**Recommendation:** Keep the mandatory reviewer-designed probe; reviewer briefs for ordering/containment claims should require both delete- and reorder-class mutations.

## 2026-08-26T14:30:00Z - efficiency - CPU contention between a timing lane and a build-heavy lane

**Observation:** p02's concurrent builds/tests (load avg 14+) made p01's 10s signal deadline intermittently red; the lane spent its bounded correction recalibrating to 60s/15s.
**Impact:** One diagnostic cycle; deadlines now carry ~35× headroom.
**Recommendation:** Group composition should weigh CPU contention for timing/signal lanes, not only write-surface disjointness.

## 2026-08-26T15:55:00Z - gotcha - Deterministic smoke tier can collide on shared-git worktrees

**Observation:** The exit-gate reviewer's `pnpm test` failed once in `tools/smoke/deterministic/deterministic.test.mjs` (`git worktree add … phase-p01` → failed to read `.git/worktrees/…`), passed on isolated rerun, and leaked run-scoped `smoke-automated-*` worktrees/branches into the shared git dir.
**Impact:** Root cleaned the leaked worktrees/branches; no wave code involved.
**Recommendation:** Backlog candidate — the deterministic smoke tier should namespace or clean its worktrees on failure and tolerate concurrent runs in linked worktrees.

## 2026-08-26T16:05:00Z - decision - Wave-level lockstep bump instead of exempting test paths

**Observation:** Two remedies existed for the release-gate contradiction: bump all five packages or exempt `src/**/*.test.ts` from version policy.
**Impact:** Chose the bump (repository guardrail; single commit after fan-in; exercises the new guard's green path); the exemption is a policy change outside the plan.
**Recommendation:** Record the version-policy question as a backlog item for the operator.
