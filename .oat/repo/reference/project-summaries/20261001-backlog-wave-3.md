---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-01
oat_generated: true
oat_summary_last_task: p06-t03
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: backlog-wave-3

## Overview

Wave 3 of the backlog delivered 14 approved items as one PR on
`wave/2026-09-30-backlog-wave-3`. The lead item fixed a break that hit every
user-scope-only install: lifecycle skills copied templates from
`.oat/templates/`, which such installs do not have. The wave also taught
`oat docs nav sync` to write Fumadocs navigation and fixed the recon
packet-publication failure reported in GitHub issue #333. The rest were
closeout guards and small fixes.

## What Was Implemented

38 tasks in six sequential phases, with a Claude Opus 5.5 high implementer and
root reviewer and a Codex `codex-6-sol-xhigh` gate on every phase:

- **Template resolver (p01).** One resolver, in repository, user, bundle order,
  is shared by project scaffold, promote, PJM, backlog, and decision commands.
  A new `oat template resolve <name> [--json] [--output <path>]` command is the
  copy path for eleven lifecycle skills (fourteen skills changed). The
  Cursor-cloud skill's reversed order now matches.
- **Fumadocs navigation (p02).** `oat docs nav sync` detects the framework and,
  for Fumadocs, writes strict `meta.json` from each `index.md` Contents map.
  Cross-folder links become link entries, titles come from frontmatter or the
  first H1, and a second run writes nothing. `--check` reports drift and
  unlisted pages without writing. It runs in `apps/oat-docs` `prebuild`, so
  `build:docs` fails on stale navigation. `apps/oat-docs` now has 11 committed
  `meta.json` files.
- **Recon publication and Codex recovery (p03, #333).** The brief generator,
  reconciler, and validator now agree. The validator rebuilds each brief with
  the production generator and compares. A material coverage gap downgrades its
  claims instead of failing publication. `unresolvedIssues` may be scoped to
  claim IDs, and `packet.md` gains a Review Downgrades section. Validation is
  linear in claim count. The Codex agent-limit note lives in the Codex provider
  reference, and `retryLimit` allows at most one admission retry per lane.
- **Lifecycle closeout guards (p04).** `oat-project-next` recomputes v2
  exit-gate fingerprints with implement's exclusions. A new
  `oat project closeout-check` reports the closeout invariant, and
  `oat project complete-state` refuses a missing or incomplete snapshot.
  Exit-gate waivers are append-only and operator-only, never under
  `OAT_AUTONOMOUS`, and are offered before a generation is persisted `stale`.
- **Small fixes (p05).** `instructions sync --force` no longer overwrites a
  `CLAUDE.md` that `AGENTS.md` resolves to, whether through a symlink, a chain,
  or a hard link. `oat project dispatch record` is validate-only. Test-only
  package changes skip the lockstep bump. Skill validation reports YAML error
  locations and key types. Quick-mode discovery routes to quick-start, and the
  packs redaction claim is narrowed.
- **Release fan-in (p06).** The five lockstep packages moved to 0.3.11. Thirteen
  backlog items were archived, including `BL-260829`, which closed on this
  wave's own run. `BL-260806` closes after this project's closeout. The full
  Definition of Done passed uncached at `6924afcf5`.

## Key Decisions

- **Fumadocs navigation is strict and generated from Contents maps.** Generated
  `meta.json` lists exactly the Contents-map entries, with no `"..."` rest
  entry. Unlisted pages are reported, not silently shown, and
  `nav sync --check` in `prebuild` keeps strictness from hiding new pages
  without warning.
- **Recon brief integrity uses rebuild-and-compare.** The validator rebuilds
  every brief type from the prior ledger with the production generator and
  rejects any difference. This replaced the field-by-field binding, which three
  review rounds showed could not converge. A claim a review omits stays
  `unresolved` and is listed "not reviewed" rather than forcing `partial`.
- **Recon coverage gaps downgrade claims instead of failing publication.** The
  forced downgrade stays, and the per-statement `gap` disposition check is
  dropped. `unresolvedIssues` become structured (claim IDs or global scope),
  and legacy string entries are read as global.
- **The CLI owns the closeout completeness check.** No skill script parsed
  `oat_post_implement_sequence`, and `complete-state` already owned the
  completed transition. A read-only CLI check is reachable from every skill and
  is testable at the transition level.
- **`oat template resolve` copies content for skills.** It returns a filesystem
  path only for the repository and user tiers. `--output` copies the resolved
  content, so skills never need a package-manager path.

## Design Deltas

- **Recon (p03-t09).** The plan's field-by-field brief binding and the
  omission-gap rule built in review rounds were replaced by rebuild-and-compare.
  The operator approved this after a complexity review. Production scripts net
  +172/-399. The deviation records a way back: reintroduce the forced `partial`
  if a consumer acts on a silently skipped claim.
- **Nav sync `--check` (p02-t05).** Added beyond the plan and wired into the
  docs `prebuild`. The loader test imports `fumadocs-core` through
  `apps/oat-docs`, so CLI tests need the docs app installed.
- **Closeout check placement (p04-t03).** It runs as `oat-project-complete`
  Step 1.5, before the upfront questions, rather than near Step 3.7, because
  earlier steps can already write. `complete-state` now refuses
  `claude-effort-levels`, whose snapshot is hand-written and malformed, and
  routes legacy `pr_open` projects with no snapshot back to implement.
- **Lockstep target 0.3.11 instead of 0.3.10.** PR #334 took 0.3.10 and two of
  this branch's skill versions mid-wave.

## Notable Challenges

- **p03 review non-convergence.** Each of three root review rounds found a new
  High in the same family: an unbound brief field (claims, then adversarial and
  coverage entries, then `questions` and `scope`). The operator extended a
  fourth fix round past the review cap. A requested complexity review then
  replaced the approach (net -672 lines). The Codex gate's one Medium,
  quadratic validation, was fixed: 800 claims went from 4,402 ms to 97 ms.
- **Mid-wave merge of `main`.** PR #334 merged during p03 and took the exact
  lockstep, `oat-dispatch-subagents`, and `oat-project-implement` versions this
  branch had bumped, which turned `check:skill-bumps` red. The branch merged
  `origin/main`, resolved two `skills.test.ts` pin hunks, and re-bumped the
  collided skills above `main`.
- **`bundle-assets.sh` under an isolated `HOME`.** Running `worktree:init` with
  a throwaway `HOME` made the script copy the repository into its own staging
  until the disk filled. Probes switched to `pnpm install --frozen-lockfile`.
  The DoD built with the real `HOME` and ran the isolated-`HOME` tests with
  `--only`.
- **p05 recovery.** Three test files outside p05-t02's verification set still
  used `--project`. A bounded test-only recovery fixed them (1/10 attempts).

## Tradeoffs Made

- **Exit-gate Mediums deferred.** The two Mediums from the exit gate went to
  backlog rather than being fixed. A fix would have made the exit-gate
  generation stale and required a new final review and gate, and no shipped
  docs page is affected.
- **Plan accepted without a third gate run.** The Codex plan gate blocked on
  both allowed attempts; the operator accepted the post-gate fixes without
  re-gating, relying on the per-phase and final gates.
- **Two suggestions kept out.** Two operator-gated complexity-review
  suggestions (dropping the explicit global issue shape, not wiring
  `oat-project-next`) were not applied, because each would drop an acceptance
  criterion.

## Integration Notes

- The updated lifecycle skills call `oat template resolve` and
  `oat project closeout-check`, so they need `oat` 0.3.11 or later. With an
  older CLI on PATH, `oat-project-complete` treats the missing command as an
  incomplete closeout. Update the CLI with the skills (`oat tools update`).
- Breaking: `oat project dispatch record --project` is removed. The
  `implementation.md` dispatch rows remain the record. Recon publication
  rejects any brief that differs from the production generator's output.

## Autonomous Execution Learnings

### Agent-instruction updates

- **Prefer recompute-and-compare for integrity checks**, and run a complexity
  review when two rounds raise a High in the same family. Rationale:
  field-by-field binding cost p03 four fix rounds
  (`BL-261001-run-a-complexity-review-when`). Source:
  [2026-10-01T16:40:26Z — candidate-skill-content — Recompute-and-compare beats field-by-field integrity checks](oat-execution-learnings.md#2026-10-01t164026z---candidate-skill-content---recompute-and-compare-beats-field-by-field-integrity-checks)

### Cloud-environment improvements

- **Refresh user-scope skills with `oat tools update` after each release.**
  Rationale: the run loaded implement 2.3.12 (no Step 7a) and had to follow
  the `origin/main` contract instead. Source:
  [2026-10-01T06:07:46Z — environment-limited — The run loads user-scope lifecycle skills older than main](oat-execution-learnings.md#2026-10-01t060746z---environment-limited---the-run-loads-user-scope-lifecycle-skills-older-than-main)

### Workflow issues

- **Pass `OAT_GATE_PRODUCER_IDENTITY` on every gate run, not `--target`.**
  Rationale: cross-family exclusion selects the Codex reviewer. Source:
  [2026-10-01T05:48:16Z — decision — Wave setup reused the Wave 2 reviewer routes](oat-execution-learnings.md#2026-10-01t054816z---decision---wave-setup-reused-the-wave-2-reviewer-routes)
- **Scaffold and write `oat_phase_review_gate` before the operator hand-off.**
  Rationale: quick-start and autonomous are user-invocable only. Source:
  [2026-10-01T05:48:16Z — gotcha — Quick-start and autonomous skills are user-invocable only](oat-execution-learnings.md#2026-10-01t054816z---gotcha---quick-start-and-autonomous-skills-are-user-invocable-only)
- **Expect an operator go-ahead after two plan-gate attempts on broad waves.**
  Rationale: Waves 2 and 3 both blocked twice with new, valid findings. Source:
  [2026-10-01T06:36:47Z — decision — Plan gate exhausted with every finding resolved in the plan](oat-execution-learnings.md#2026-10-01t063647z---decision---plan-gate-exhausted-with-every-finding-resolved-in-the-plan)
- **Fetch `main` and run `check:skill-bumps` before each phase review.**
  Rationale: bumps are relative to a moving base (#334 collided). Source:
  [2026-10-01T13:12:23Z — gotcha — Another PR took the same skill and lockstep versions mid-wave](oat-execution-learnings.md#2026-10-01t131223z---gotcha---another-pr-took-the-same-skill-and-lockstep-versions-mid-wave)

## Explainer Outcome

- **project-recap:** built at closeout (unattended, host-rung visual QA); the
  run ID, outcome, and QA verdict are recorded in the recap's own
  `manifest.json` and `qa/result.json` retained in the archived project
  (this section names no run, so the
  recap's inputs stay unchanged after it is built).
- Recap export: [`.oat/repo/reference/project-recaps/20261001-backlog-wave-3.html`](../project-recaps/20261001-backlog-wave-3.html)

## Follow-up Items

- `BL-261001-escape-directive-like` (high): nav sync writes a filename starting
  with `!` as an exclusion directive, so the page is hidden while `--check`
  reports clean (exit gate M1).
- `BL-261001-list-thorough-review-omissions` (medium): Review Downgrades omits
  claims a thorough-profile redundant review left undisposed (exit gate M2).
- `BL-261001-run-a-complexity-review-when` (high): run a complexity review when
  a review or gate budget is exhausted.
- `BL-261001-fail-closed-when-bundle-assets` (high): fail closed when
  `bundle-assets.sh` lookups come back empty.
- `BL-261001-resolve-the-summary-template` (low): `oat-wrap-up` still reads
  `.oat/templates/summary.md` directly.
- `BL-261001-route-quick-mode-plan` (low): route a quick-mode plan in progress
  consistently across the router and dashboards.
- Deferred from #333: `BL-261001-record-mixed-native-and-cli` and
  `BL-261001-make-recon-controller-setup`. Not filed: wiring
  `nav sync --check` into the `docs-app-fuma` scaffold.

## Workflow Observations

### 2026-10-01 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:1,medium:2,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-3/reviews/artifact-plan-review-2026-10-01T061917Z.md run=e44bde62-cfaa-45c8-9449-42b58de6090b

### 2026-10-01 · structural · oat-project-review-provide · plan

53c0bf7f-34ad-4728-b165-0dc580ac0db9 artifact=.oat/projects/shared/backlog-wave-3/reviews/artifact-plan-review-2026-10-01T063044Z.md recon=template-nav class=intelligent-recon target=gpt-6.1-sol/medium outcome=completed floor=satisfied fallback=unused reconciliation=primary-source-reopened

### 2026-10-01 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:1,medium:1,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-3/reviews/artifact-plan-review-2026-10-01T063044Z.md run=53c0bf7f-34ad-4728-b165-0dc580ac0db9

### 2026-10-01 · structural · oat gate review · p01

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:1,low:1 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-3/reviews/p01-review-2026-10-01T114001Z.md run=08df24f3-3c7a-477b-a7d8-cab4fb2cd12d

### 2026-10-01 · structural · oat-project-implement · p01

bw3-p01-outcome: phase p01 passed (root review 0 Critical/High; Codex gate ok); fix-loop count 2 (p01-t04 review fixes, p01-t05 gate fixes).

### 2026-10-01 · structural · oat-project-review-provide · p02

gate-3b53a413-p02-recon: completed one awaited read-only intelligent-recon docs lane; root reconciled evidence and wrote reviews/p02-review-2026-10-01T122403Z.md.

### 2026-10-01 · structural · oat gate review · p02

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:2,low:1 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-3/reviews/p02-review-2026-10-01T122403Z.md run=3b53a413-11e2-4d96-b358-9bd3307e60ad

### 2026-10-01 · structural · oat-project-implement · p02

bw3-p02-outcome: phase p02 passed (root review 0 Critical/High; Codex gate ok); fix-loop count 2 (p02-t05 review fixes, p02-t06 gate fixes).

### 2026-10-01 · structural · oat-project-implement · p03

bw3-p03-stop-1: p03 stopped at the review-cap boundary after three review rounds; round 3 found 1 High (unchecked brief questions/scope fields) and 2 Medium; awaiting operator decision.

### 2026-10-01 · structural · oat gate review · p03

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:1,low:0 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-3/reviews/p03-review-2026-10-01T165604Z.md run=c8db6062-c7e2-46d6-a6d0-bde81af2b63f

### 2026-10-01 · structural · oat-project-implement · p03

bw3-p03-outcome: phase p03 passed (Codex gate ok after the complexity-review simplification); fix-loop count 5 (p03-t06..t10), including an operator-extended round and an operator-approved simplification.

### 2026-10-01 · structural · oat gate review · p04

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:1,low:1 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-3/reviews/p04-review-2026-10-01T180727Z.md run=8c951355-42cc-421b-b4a8-126330068b4d

### 2026-10-01 · structural · oat-project-implement · p04

bw3-p04-outcome: phase p04 passed (root review 0 Critical/High; Codex gate ok); fix-loop count 2 (p04-t05 review fixes, p04-t06 gate fixes).

### 2026-10-01 · structural · oat-project-review-provide · p05

Gate review 669f8362-d6af-46ea-847b-c0a6baa86cbe reconciled three read-only consequential recon lanes; artifact .oat/projects/shared/backlog-wave-3/reviews/p05-review-2026-10-01T193643Z.md; findings 0 critical, 0 high, 1 medium, 0 low.

### 2026-10-01 · structural · oat gate review · p05

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:1,low:0 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-3/reviews/p05-review-2026-10-01T193643Z.md run=669f8362-d6af-46ea-847b-c0a6baa86cbe

### 2026-10-01 · structural · oat-project-implement · p05

bw3-p05-outcome: phase p05 passed (root review 0 Critical/High; Codex gate ok); fix-loop count 2 (p05-t07 review fixes, p05-t08 gate fix); one phase recovery (bw3-p05-recovery-1).

### 2026-10-01 · structural · oat gate review · p06

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-3/reviews/p06-review-2026-10-01T200536Z.md run=96320cb5-8127-42cd-adfd-6e1541bb4662

### 2026-10-01 · structural · oat-project-implement · p06

bw3-p06-outcome: phase p06 passed (root review findings fixed by root; Codex gate ok with 0 findings); fix-loop count 0.

### 2026-10-01 · structural · oat-project-review-provide · final

Gate review 99fcf137-4610-4d1c-985d-71c4e7bc9dce reconciled three completed read-only recon lanes in two task-class waves; artifact .oat/projects/shared/backlog-wave-3/reviews/final-review-2026-10-01T203319Z.md; findings 0 critical, 0 high, 2 medium, 0 low.

### 2026-10-01 · structural · oat gate review · final

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:2,low:0 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-3/reviews/final-review-2026-10-01T203319Z.md run=99fcf137-4610-4d1c-985d-71c4e7bc9dce
