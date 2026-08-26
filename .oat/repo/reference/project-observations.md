# Project Observations

## Entries

### 2026-07-18 · general · friction · same-worktree dispatch logging

Promoted from . Reusable lesson: root-owned writes created after a same-worktree child captures its clean baseline can be erased by child cleanup, so lifecycle orchestration must coordinate write ownership, preserve files the child did not create, or isolate the child in a separate worktree. (observed on open-agent-toolkit 0.1.73)

### 2026-07-18 · general · friction · same-worktree dispatch ownership

Correction to `### 2026-07-18 · general · friction · same-worktree dispatch logging`, whose source heading was dropped by shell quoting. Promoted from `### 2026-07-18 · project · friction · same-worktree dispatch logging`: root-owned writes created after a same-worktree child captures its clean baseline can be erased by child cleanup, so lifecycle orchestration must coordinate write ownership, preserve files the child did not create, or isolate the child in a separate worktree. (observed on open-agent-toolkit 0.1.73)

### 2026-07-19 · general · feedback · Cursor parent-inline fallback

Promoted from "### 2026-07-19 · project · feedback · Cursor parent-inline fallback" because the behavior applies to any Cursor review using nested reconnaissance: delegate mechanical lanes only when advertised capability satisfies the floor, and keep stronger unsatisfied lanes with the primary reviewer instead of downgrading.

### 2026-07-24 · general · friction · Concurrent asset generation during verification

Running repository formatting concurrently with the full CLI suite caused a transient scaffold-test failure while the asset bundler rewrote assets/templates/state.md. Isolating the full-suite rerun after asset generation completed produced a clean pass; verification lanes that mutate bundled assets should not overlap readers. (observed on OAT 0.2.14)

### 2026-07-29 · general · friction · Generated autonomy inventory coupling

Promotes the original entry "2026-07-28 · project · friction · Phase 3 autonomy inventory boundary": prompt-path edits that change autonomy gates must preserve or regenerate the associated inventory evidence, with focused inventory tests run before cleanup.

### 2026-08-07 · general · bug · configured post-implementation sequence was skipped

Promotes : configured closeout must persist its sequence snapshot and fail closed until ordered children are durably complete; the dedicated backlog item remains the implementation follow-up. (observed on OAT CLI 0.2.30)

### 2026-08-07 · general · bug · configured closeout promotion correction

Correction to "### 2026-08-07 · general · bug · configured post-implementation sequence was skipped", whose source heading was dropped during command serialization. Promoted from "### 2026-08-06 · project · bug · configured post-implementation sequence was skipped": configured closeout must persist its sequence snapshot and fail closed until ordered children are durably complete; the dedicated backlog item remains the implementation follow-up. (observed on OAT CLI 0.2.30)

### 2026-08-26 · general · friction · gate exec-target selection

Observation: the configured plan gate selected cursor-gpt-5-6-sol-xhigh twice while cursor-agent rejected launches with a team usage-limit error; the availability probe (cursor-agent --version) kept passing and the gate has no post-selection fallback. Impact: the whole wave blocked at a quota boundary until the operator raised the limit. Recommendation: probe entitlement or fall through to the next target on a pre-child provider rejection; classify pre-child rejections as launch defects (see orchestration-log.md). (observed on oat 0.2.32)

### 2026-08-26 · general · friction · release gate vs test-only changes

Observation: files under packages/cli/src/**/\*.test.ts count as publishable changes (versionPolicyIgnorePatterns is only assets/**), so a test-only lane forced a five-package lockstep bump (Recovery Event p02-rec-001). Impact: root-owned wave-level bump 0.2.32 to 0.2.33 after fan-in. Recommendation: drift refresh should intersect lane write surfaces with the release change-detection roots and plan the bump up front; decide separately whether test paths should be version-policy-ignored. (observed on oat 0.2.32)

### 2026-08-26 · general · worked-well · reviewer-designed adversarial probes

Observation: the p01 Important (post-detach unsettleable reap) and a round-2 Medium (reorder mutation) were found only by reviewer probes and mutation runs; every implementer gate, pinned test, and codex pass was green. Impact: two cheap fix rounds, no defect shipped. Recommendation: keep the mandatory reviewer-designed probe for logic-bearing lanes and require delete- and reorder-class mutations for ordering/containment claims.

### 2026-08-26 · general · bug · orchestrator cwd drift

Observation: a compound cd into a phase worktree persisted across orchestrator shell calls, so one root bookkeeping commit landed on the phase branch. Impact: repaired by cherry-pick plus reset of the unreviewed misplaced commit; reviewed SHAs untouched. Recommendation: every root command uses absolute paths or git -C; generalize the wave skill's absolute-path merge guard to all root commands.

### 2026-08-26 · general · friction · deterministic smoke tier in linked worktrees

Observation: the exit-gate reviewer's pnpm test failed once in tools/smoke/deterministic (git worktree add collided in the shared git dir), passed on isolated rerun, and leaked run-scoped smoke-automated worktrees and branches. Impact: root cleanup of the leaked refs; no wave code involved. Recommendation: the deterministic tier should namespace or clean its worktrees on failure and tolerate concurrent runs in linked worktrees.
