---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-28
oat_generated: true
oat_summary_last_task: prev1-t09
oat_summary_revision_count: 1
oat_summary_includes_revisions: [p-rev1]
---

# Summary: backlog-wave-2

## Overview

Wave 2 of the 2026-09-26 backlog review, delivered as one autonomous quick-mode
project and one PR (#332). It bundled twelve approved backlog items with a new
one making `CLAUDE.md` shims opt-in: Claude Code now reads `AGENTS.md` natively,
and any `CLAUDE.md`, `CLAUDE.local.md`, or `.claude/CLAUDE.md` makes its
`agents-md` plugin stop reading `AGENTS.md`. The other items closed gaps in the
AGENTS.md refresh loop, lifecycle routing, and CI left by earlier waves.
Revision 1 changed the shim design after the PR opened.

## What Was Implemented

49 tasks across phases p01-p05 and p-rev1: 30 planned and revision tasks plus
19 review-fix tasks. What shipped:

- **CLAUDE.md shims are opt-in.** `instructions.claude.shims`
  (`none | pointer | symlink | copy`, default `none`) persists the strategy,
  `instructions.claude.excludes` lists directories sync leaves alone, and
  `--strategy` overrides one run. Under `none`, `oat instructions sync` creates
  no `CLAUDE.md` and removes only exact OAT-created shims (`@AGENTS.md` pointer,
  sibling symlink, identical copy) after apply-time identity and content
  re-checks. A lone `CLAUDE.md` with no `AGENTS.md` is adopted into a new
  `AGENTS.md` and removed. This repository's 11 shims were removed.
- **Shim removal is all or nothing.** While any `CLAUDE.md`,
  `CLAUDE.local.md`, or `.claude/CLAUDE.md` with its own content exists
  anywhere in the repository (excluded trees included), sync removes no shim,
  and `sync` and `validate` exit 1 with one `claude_md_blocks_shim_removal`
  finding. It names the files with content, the shims kept, why any
  `CLAUDE.md` matters (with a docs link), and the fixes: move the content into
  `AGENTS.md` and remove the file, or set a shim strategy. A blocker that an
  `AGENTS.md` links to gets replace-then-remove advice, and kept shims get no
  per-file "remove it" advice. Validate, `oat-doctor`, and the
  agent-instructions analyze and apply skills report the same finding.
- **Rules and provider sync are independent of the shim setting.** A test pins
  identical `oat sync` output for `.claude/rules`, skills, and agents under
  `none` and `pointer`, and `oat sync` never creates or removes a `CLAUDE.md`.
- **AGENTS.md guidance appends.** An absent managed block is appended with
  `O_WRONLY | O_APPEND | O_NOFOLLOW` after `fstat` identity checks; hard-linked,
  unwritable, swapped, or non-regular targets get the zero-write manual patch
  with the real cause. `oat pjm init` prints guidance once, every
  `--project-guidance` consumer acts or rejects, zero-pack guidance is skipped,
  a new read-only `oat tools guidance [--json]` prints the block, and the tools
  block names only the skills directories installed packs use.
- **Backlog archive rewrites inbound references.** `oat backlog archive`
  repoints `.oat/repo` Markdown links, repository-root path strings, and
  whole-span code citations to the moved item. URLs, symlinks, fenced code, and
  working links are left alone, unresolvable forms warn, and rewritten files
  are replaced atomically (temporary file plus rename).
- **Recon.** `oat-reviewer` no longer launches `recon-worker`; reviewer lanes
  use ordinary read-only sub-agents, and only the `recon` skill launches
  `recon-worker`. The recon skill is unchanged from `main`.
- **Lifecycle skills.** Quick-mode discovery routes straight to quick-start in
  next and progress; Lite records `absorbed_projects` /
  `absorbed_backlog_ids`; implement commits the phase task ledger before
  dispatching the per-phase reviewer and keeps the phase row nonterminal until
  review fixes and gates settle. New exit-gate generations fingerprint with
  `effective-delta-v2`, which ignores changes under `.oat/projects/**` and
  `.oat/repo/**`; stored v1 values keep v1 rules.
- **Repairs and CI.** Five heading-swallowing bare fences fixed in agent roles
  and templates, with the fence scanner extended to `.agents/agents` and
  `.oat/templates`; `packages/control-plane` gains `check`, `check:fix`, and
  `lint:fix`; the agents-md unsafe-directory test race is fixed; ten uncached
  runs recorded for the collection-detach test.
- Lockstep public packages bumped 0.3.8 → 0.3.9. Fourteen backlog items
  archived: twelve shipped by this wave (`BL-260927-validate-recon-worker`
  resolved by removing the reviewer's `recon-worker` path) plus two closed as
  superseded by the pre-wave review-cap consolidation, whose six `DR-260927-*`
  records also ride on this branch.

## Key Decisions

- **CLAUDE.md shims are opt-in** (`DR-260927-claude-md-shims-are-opt`): the
  default strategy is `none`, OAT-created shims are removed by sync, and any
  remaining `CLAUDE.md` produces a warning. Amended by the next two records.
- **Name the CLAUDE.md shim keys under instructions.claude**
  (`DR-260928-name-the-claude-md-shim-keys`): both keys govern Claude Code's
  `CLAUDE.md` handling, not documentation. The rename from
  `documentation.instructionSyncStrategy` and
  `documentation.instructionPointerExcludes` is clean, with no compatibility
  read or deprecation warning, because most repositories run on defaults.
- **Remove no CLAUDE.md shim while any CLAUDE.md has content**
  (`DR-260928-remove-no-claude-md-shim-while`): partial removal stranded
  directories whose shims carried their `AGENTS.md` into Claude Code sessions.
  No `keep` strategy value was added; keeping hand-written files means choosing
  `pointer`, `symlink`, or `copy`.
- **Persist the instruction sync strategy in project config**
  (`DR-260928-persist-the-instruction-sync`): `BL-260830-persist-instruction-sync`
  was absorbed and its init prompt dropped, because opting in is one
  `oat config set`.
- **Commit the phase task ledger before per-phase review dispatch**
  (`DR-260928-commit-the-phase-task-ledger`): the pre-review commit covers task
  and phase completion, the resume pointer, and recovery-marker settlement;
  review-outcome bookkeeping stays post-review.
- **AGENTS.md guidance appends absent managed blocks**
  (`DR-260928-agents-md-guidance-appends`): writers never rewrite existing
  bytes and fall back to the manual patch whenever file identity cannot be
  proven.
- **Backlog archive rewrites inbound references**
  (`DR-260928-backlog-archive-rewrites`): rewrite rather than only warn, touch
  only tokens that resolve to the moved item, and replace files through an
  exclusive temporary file so hard links are never written through.
- **Exclude project and repository records from exit-gate freshness**
  (`DR-260928-exclude-project-and-repository`): summaries, review artifacts,
  backlog items, and decision records cannot change shipped behavior, so they
  no longer stale a passed gate. The exclusion is the literal default
  `.oat/projects/` location, not the configured `projects.root`, which errs
  toward staleness.
- **Defer the oat tools where command** (`DR-260928-defer-the-oat-tools-where`):
  the scope-aware guidance block and `oat tools guidance` cover the reported
  confusion.

## Design Deltas

- **Revision 1 reshaped the shim design** (discovery Key Decisions 2-3,
  `DR-260927-claude-md-shims-are-opt`): the keys moved from the
  `documentation.*` namespace to `instructions.claude.*`, and unconditional
  removal of OAT-managed shims became all-or-nothing removal. Operator
  direction; implementation is the source of truth.
- **Recon validator withdrawn** (discovery Key Decision 5, plan p04-t02): p04
  built `recon/scripts/validate-assignment.mjs` and wired `oat-reviewer` to run
  it; four review and gate rounds grew it to about 1,900 lines of authority
  checks. Revision 1 withdrew it, restored the recon skill to `main`, and
  deleted its unshipped decision record.
- **Pre-review bookkeeping widened** (discovery Key Decision 4): p03 review
  M1/M2 and gate M2 moved recovery-marker settlement into the pre-review commit
  and kept the phase row nonterminal until fixes and gates settle.
- **p04 gate completed under operator override** after two blocked attempts
  exhausted the retry budget; the final review covered p04.
- **Case variants of `CLAUDE.md` are not warned about** (backlog AC4):
  case-insensitive matching flagged real provider docs such as
  `tools/smoke/protocols/claude.md`; documented and pinned.

## Notable Challenges

- **Shim removal nearly deleted hand-written files.** p02 review C1 reproduced
  default sync deleting a hand-written `CLAUDE.md` when `AGENTS.md` is a
  symlink to it (the copy check compared the file with itself). Fixes made any
  `CLAUDE.md` an `AGENTS.md` resolves to unmanaged, including cross-directory
  links checked at planning and apply time.
- **The recon validator kept growing.** Each p04 gate and review found a new
  authority gap (unbounded reads, arbitrary schemas, mutating tool names,
  unbounded write paths); the gate budget ran out, and the operator later
  withdrew the component rather than hardening it further.
- **The reference rewriter kept widening its blast radius.** Reviews found a
  symlink escape outside `.oat/repo`, URL and unrelated-path rewrites, broken
  code-span citations, footnote corruption, and finally (exit gate H1) in-place
  truncation writing through hard links. The rewriter now resolves every token,
  refuses symlinks and out-of-root paths, and replaces files atomically.
- **A p-rev1 gate run failed closed.** Run `b282ca69` wrote a 0-finding review
  but never ran the branch-local `gate route` step, so no route receipt existed;
  it was not accepted as evidence and a rerun passed.

## Tradeoffs Made

- **Five sequential phases instead of parallel worktrees:** shared write sets
  (`project-guidance.ts`, `oat-doctor/SKILL.md`, `pjm/init.ts`, help snapshots,
  the load-contract test, `oat-reviewer.md`, and skill version pins) made
  parallel lanes unsafe.
- **Clean key rename with no compatibility read:** simpler config and docs, at
  the cost of an upgrade notice for the few repositories that set the released
  exclusion list.
- **All-or-nothing removal:** a repository with one hand-written `CLAUDE.md`
  keeps every shim and sees exit 1 until someone resolves that file; nothing is
  removed silently.
- **Withdraw the recon validator instead of finishing it:** it also blocked
  Codex recon lanes, and only the `recon` skill should launch `recon-worker`.
- **Concurrent AGENTS.md appends left unserialized:** two simultaneous runs can
  append the same block twice; a correct fix needs a cross-process lock, and
  concurrent runs against one checkout are rare.
- **`BL-260829-order-phase-bookkeeping-before` shipped but stays open:** gates
  and lifecycle skills run the installed release, so live observation waits for
  the next multi-phase project.

## Integration Notes

- After upgrading, `oat instructions validate` exits 1 in a repository that
  still has old shims until `oat instructions sync` removes them, so CI that
  runs validate goes red until then. Opt back in with
  `oat config set instructions.claude.shims pointer` and rerun sync.
- Upgrade notice: a repository that set the released
  `documentation.instructionPointerExcludes` must re-set that list as
  `instructions.claude.excludes` before its first sync. The old key is ignored,
  so sync would otherwise adopt and remove a lone `CLAUDE.md` in the formerly
  excluded directories.
- A `claude_md_blocks_shim_removal` finding makes `sync` and `validate` exit 1
  until the named files are moved or removed or a shim strategy is set.
- Reviewer lanes never launch `recon-worker`; use the `recon` skill for
  evidence-packet reconnaissance.
- Final verification: full Definition of Done at `c95e17aad` after Revision 1,
  every gate exit 0 with 0 of 10 test tasks cached. Exit gate generation 2
  passed (run `d34bae3b`, 0 Critical/High); its two Mediums were the pending
  summary, recap, and PR refresh closeout steps.

## Revision History

- **Revision 1 (2026-09-28, operator feedback on PR #332; prev1-t01..t09):**
  renamed the shim keys to `instructions.claude.shims` and
  `instructions.claude.excludes`, made shim removal all or nothing, pinned
  rules-sync independence, and added `effective-delta-v2` exit-gate freshness.
  It also removed the reviewer's `recon-worker` path, restored the recon skill
  to `main` (withdrawing the p04 assignment validator), and corrected the recon
  records; two review-fix tasks closed p-rev1 and final review findings.

## Autonomous Execution Learnings

### Agent-instruction updates

- At batch approval, tell the operator to run `/oat-project-autonomous` next
  instead of trying the Skill tool first; lifecycle skills are
  user-invocation-only, so chaining costs a round trip.
  ([2026-09-27T14:35Z — efficiency — Lifecycle skills are user-invocation-only from the Skill tool](oat-execution-learnings.md#2026-09-27t1435z---efficiency---lifecycle-skills-are-user-invocation-only-from-the-skill-tool))
- Check the commit exit code and `git log -1` after every commit, and wrap
  commit bodies at 100 characters; tailing hook output hid a commitlint
  rejection and a fix landed in a bookkeeping commit.
  ([2026-09-28T01:45Z — gotcha — Commitlint rejects silently after lint-staged prints success](oat-execution-learnings.md#2026-09-28t0145z---gotcha---commitlint-rejects-silently-after-lint-staged-prints-success))

### Workflow issues

- Record the operator's disposition in the plan's Reviews notes when a
  configured gate exhausts its budget on already-resolved findings, until
  `BL-260818-distinguish-operator-directed` ships; this run spent an operator
  round trip on a one-flag fix.
  ([2026-09-27T15:25Z — decision — Plan gate exhausted on a one-flag finding](oat-execution-learnings.md#2026-09-27t1525z---decision---plan-gate-exhausted-on-a-one-flag-finding))
- Run complexity review after artifact review rounds and before the gate, so
  the gate sees the trimmed plan; review rounds added machinery a later
  complexity pass removed.
  ([2026-09-27T15:25Z — efficiency — Structured artifact review converged in three attempts](oat-execution-learnings.md#2026-09-27t1525z---efficiency---structured-artifact-review-converged-in-three-attempts))
- When a gate keeps widening one component across rounds, check whether the
  component should exist before a second fix round; the recon validator grew
  through gate rounds and was then withdrawn.
  ([2026-09-28T13:10Z — decision — Revision 1 resumed autonomously after operator feedback on PR #332](oat-execution-learnings.md#2026-09-28t1310z---decision---revision-1-resumed-autonomously-after-operator-feedback-on-pr-332))
- Persist exit-gate launch intent, verify it, then launch; never batch the two,
  and match YAML keys at line start. A substring guard failed on a commented
  template and the gate ran without persisted intent.
  ([2026-09-28T11:40Z — gotcha — Exit-gate intent persistence must be sequential, not parallel](oat-execution-learnings.md#2026-09-28t1140z---gotcha---exit-gate-intent-persistence-must-be-sequential-not-parallel))

## Explainer Outcome

- **project-recap:** generated — `explainers/backlog-wave-2-recap/` (run
  `def695e7-4da2-4fb9-97ff-9a2f10df0294`, built before Revision 1; closeout
  rebuilds it from this summary)

## Follow-up Items

- `BL-260928-serialize-concurrent-agents-md` — concurrent guidance appends can
  duplicate a managed block (p01 gate M1).
- `BL-260928-keep-instructions-sync-force` — with a shim strategy,
  `--strategy pointer --force` can overwrite the only `CLAUDE.md` in the
  `AGENTS.md -> CLAUDE.md` layout (pre-existing).
- `BL-260928-route-quick-mode-discovery` — the control-plane recommender and
  dashboard still route quick-mode discovery to `oat-project-plan` (p03 L1).
- `BL-260928-settle-codex-read-authority` — rescoped in Revision 1 to a live
  check that `/recon` launches Codex worker lanes as `contract-enforced` on the
  released CLI.
- `BL-260928-harden-the-backlog-reference` — atomic-replace edge cases:
  ownership change, same-inode concurrent edit, long temporary names.
- `BL-260829-order-phase-bookkeeping-before` stays open for live observation.
- Not filed: the pr-final ledger guard parses a prose line that starts with `|`
  under `## Reviews` as a malformed row (PRFINAL-05 false positive).

## Workflow Observations

### 2026-09-27 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:2,medium:1,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-2/reviews/artifact-plan-review-2026-09-27T150947Z.md run=8f69f414-ff48-4fc6-b22a-64dca2027e62

### 2026-09-27 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:1,medium:0,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-2/reviews/artifact-plan-review-2026-09-27T151608Z.md run=685e7775-8f4f-4c4e-b08d-bd172ad8f3d9

### 2026-09-28 · structural · oat gate review · p01

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:1,low:0 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-2/reviews/p01-review-2026-09-28T001719Z.md run=6da2a8cf-79c3-4fbd-96a2-01d7485a9e93

### 2026-09-28 · structural · oat-project-implement · p01

bw2-p01-outcome p01 pass after 2 fix rounds (p01-t07, p01-t08); gate codex-6-sol-xhigh ok, 1 Medium deferred to final; see implementation.md Orchestration Runs

### 2026-09-28 · structural · oat gate review · p02

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:1 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-2/reviews/p02-review-2026-09-28T013003Z.md run=c8b28cc4-1645-498f-9290-c5c34552a079

### 2026-09-28 · structural · oat-project-implement · p02

bw2-p02-outcome p02 pass after 1 recovery and 2 fix rounds (C1 symlink data-loss fixed); gate codex-6-sol-xhigh ok, 1 Low addressed now; see implementation.md

### 2026-09-28 · structural · oat gate review · p03

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:2,low:0 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-2/reviews/p03-review-2026-09-28T015614Z.md run=ab142cc6-10a3-44bb-b645-46ebd5561db5

### 2026-09-28 · structural · oat-project-implement · p03

bw2-p03-outcome p03 pass after 1 recovery, 1 review fix round, 1 gate sweep fix; gate codex-6-sol-xhigh ok; see implementation.md

### 2026-09-28 · structural · oat gate review · p04

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:1,medium:1,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-2/reviews/p04-review-2026-09-28T022315Z.md run=43f7cea9-d98d-4f4b-90e7-89537f0df389

### 2026-09-28 · structural · oat gate review · p04

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:1,medium:0,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-2/reviews/p04-review-2026-09-28T024124Z.md run=c9813e05-1215-4615-abcb-bef0fdfbf6d0

### 2026-09-28 · structural · oat-project-implement · p04

bw2-p04-stop-1 p04 gate attempt 2 blocked (1 High: read-only tool authority); retry limit exhausted; stopped for operator direction

### 2026-09-28 · structural · oat-project-implement · p04

bw2-p04-outcome p04 complete under operator override after 2 blocked gate attempts and 5 fix rounds; follow-ups filed; see implementation.md

### 2026-09-28 · structural · oat gate review · p05

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:1,medium:2,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-2/reviews/p05-review-2026-09-28T104612Z.md run=9dc0deb0-d3d9-4a35-9b5a-8c111634a460

### 2026-09-28 · structural · oat gate review · p05

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:1,low:1 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-2/reviews/p05-review-2026-09-28T111050Z.md run=138c0018-3da4-473a-ab58-e2a99ba608ab

### 2026-09-28 · structural · oat-project-implement · p05

bw2-p05-outcome p05 pass after 1 blocked gate attempt, 3 review-fix rounds, 1 sweep fix; all 38 tasks complete

### 2026-09-28 · structural · oat gate review · final

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:1,medium:0,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-2/reviews/final-review-2026-09-28T113721Z.md run=0415d270-2faa-4559-901c-65430d5c405d

### 2026-09-28 · structural · oat gate review · final

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-2/reviews/final-review-2026-09-28T114805Z.md run=0c5dbb3e-18a9-4059-a857-ca4209e3b9e4

### 2026-09-28 · structural · oat gate review · p-rev1

target=codex-6-sol-xhigh threshold=high exit=1 status=review_failed run=b282ca69-45c4-4d01-9b68-9b8e1a71d833

### 2026-09-28 · structural · oat gate review · p-rev1

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:1 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-2/reviews/p-rev1-review-2026-09-28T162038Z.md run=22b3f5cf-b81d-4d85-bc8d-766a6cb611e6

### 2026-09-28 · structural · oat gate review · final

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:2,low:2 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-2/reviews/final-review-2026-09-28T164247Z.md run=5c3729d3-0488-4ae1-84c5-fd7b86e49418

### 2026-09-28 · structural · oat gate review · final

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:2,low:0 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-2/reviews/final-review-2026-09-28T165830Z.md run=d34bae3b-fe9f-4259-b98b-18a6a4e91b5b
