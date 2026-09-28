---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-28
oat_generated: true
oat_summary_last_task: p05-t12
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: backlog-wave-2

## Overview

Wave 2 of the 2026-09-26 backlog review, delivered as one autonomous quick-mode
project and one PR. It bundled the approved wave items with a new item making
`CLAUDE.md` shims opt-in, because Claude Code now reads `AGENTS.md` natively and
any leftover `CLAUDE.md` makes its `agents-md` plugin stand down. The rest
closed refresh-loop, routing, validation, and CI gaps from earlier waves.

## What Was Implemented

Forty tasks across five sequential phases: 23 planned tasks and 17 review-fix
tasks. What shipped:

- **CLAUDE.md shims are opt-in.** `documentation.instructionSyncStrategy`
  (`none | pointer | symlink | copy`, default `none`) persists the strategy and
  `--strategy` overrides one run. Under `none`, `oat instructions sync` creates
  no `CLAUDE.md` and removes only exact OAT-created shims (pointer, sibling
  symlink, identical copy) after apply-time identity and content re-checks. It
  never removes a hand-written `CLAUDE.md` beside an `AGENTS.md`,
  `CLAUDE.local.md`, `.claude/CLAUDE.md`, excluded or docs trees, nested git
  checkouts, or any `CLAUDE.md` an `AGENTS.md` resolves to. A lone `CLAUDE.md`
  with no `AGENTS.md` is adopted into a new `AGENTS.md` and removed. A
  repository-wide warning names each remaining `CLAUDE.md` with two remedies.
  Validate, doctor, and the agent-instructions skills follow the same rules;
  this repository's 11 shims were removed.
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
- **Recon assignment validator.** `recon/scripts/validate-assignment.mjs`
  checks `recon.assignment` v1 envelopes before launch: every invalid field,
  one homogeneous wave per array, read sources bounded by allowed inputs and
  exclusions, a read-only tool allowlist, write paths inside the artifact
  kind's packet folder, and approved output-schema references. `oat-reviewer`
  runs it before launch.
- **Lifecycle skills.** Quick-mode discovery routes straight to quick-start in
  next and progress; Lite records `absorbed_projects` /
  `absorbed_backlog_ids`; implement commits the phase task ledger before
  dispatching the per-phase reviewer and keeps the phase row nonterminal until
  review fixes and gates settle.
- **Repairs and CI.** Five heading-swallowing bare fences fixed in agent roles
  and templates, with the fence scanner extended to `.agents/agents` and
  `.oat/templates`; `packages/control-plane` gains `check`, `check:fix`, and
  `lint:fix`; the agents-md unsafe-directory test race is fixed; ten uncached
  runs recorded for the collection-detach test.
- Lockstep public packages bumped 0.3.8 → 0.3.9. Fourteen backlog items
  archived: twelve shipped by this wave plus two closed as superseded by the
  pre-wave review-cap consolidation, whose six `DR-260927-*` records also ride
  on this branch.

## Key Decisions

- **CLAUDE.md shims are opt-in** (`DR-260927-claude-md-shims-are-opt`): the
  default strategy is `none`, OAT-managed shims are removed automatically,
  and any remaining `CLAUDE.md` produces a warning.
- **Persist the instruction sync strategy in project config:** the key
  `documentation.instructionSyncStrategy` sits beside
  `documentation.instructionPointerExcludes`, which governs the same commands.
  `BL-260830-persist-instruction-sync` was absorbed and its init prompt
  dropped, because opting in is one `oat config set`.
- **Commit the phase task ledger before per-phase review dispatch:** the
  pre-review commit covers task and phase completion, the resume pointer, and
  recovery-marker settlement; review-outcome bookkeeping stays post-review, and
  the phase row stays nonterminal until review fixes and selected gates settle.
- **Validate recon assignments before launch in the recon skill:** the
  validator lives beside `validate-packet.mjs` and reuses its contract library
  so it ships with the pack that launches workers. Tool authority is an
  allowlist, not a denylist, and the artifact kind fixes the output schema.
- **AGENTS.md guidance appends absent managed blocks:** writers append only
  missing blocks and never rewrite existing bytes, falling back to the manual
  patch whenever file identity cannot be proven.
- **Backlog archive rewrites inbound references:** the archive rewrites rather
  than only warns, touches only tokens that resolve to the moved item, and
  replaces files through an exclusive temporary file so hard links are never
  written through.
- **Defer the `oat tools where` command:** the scope-aware guidance block and
  `oat tools guidance` cover the reported confusion; `oat tools list --json`
  and `oat tools info` already report scope.

## Design Deltas

- **Pre-review bookkeeping widened** (discovery Key Decision 4): p03 review
  M1/M2 and gate M2 moved recovery-marker settlement into the pre-review commit
  and kept the phase row nonterminal until fixes and gates settle.
  Implementation is the source of truth; no follow-up.
- **Recon validator enforces authority, not only envelope shape** (plan
  p04-t02): four review and gate rounds added read, write, tool, and schema
  authority checks and dropped inline output schemas. Residual gaps are in
  `BL-260928-settle-codex-read-authority`.
- **p04 gate completed under operator override** after two blocked attempts
  exhausted the retry budget; the final review covered p04.
- **Case variants of `CLAUDE.md` are not warned about** (backlog AC4):
  case-insensitive matching flagged real provider docs such as
  `tools/smoke/protocols/claude.md`; documented and pinned.

## Notable Challenges

- **Shim removal nearly deleted hand-written files.** p02 review C1 reproduced
  default sync deleting a hand-written `CLAUDE.md` when `AGENTS.md` is a
  symlink to it (the copy check compared the file with itself). Round 1 made
  any `CLAUDE.md` that the sibling `AGENTS.md` resolves to unmanaged; round 2
  extended this to cross-directory links scanned at planning and apply time.
- **Each recon validator gate found a new authority gap.** Gate attempt 1
  found unbounded read sources and arbitrary schemas; attempt 2 found
  mutation-capable tool names accepted; the operator-authorized re-review found
  unbounded write paths. Each was fixed, but the gate budget ran out.
- **The reference rewriter kept widening its blast radius.** Reviews found a
  symlink escape outside `.oat/repo`, URL and unrelated-path rewrites, broken
  code-span citations, footnote corruption, and finally (exit gate H1) in-place
  truncation writing through hard links. The rewriter now resolves every token,
  refuses symlinks and out-of-root paths, and replaces files atomically.

## Tradeoffs Made

- **Five sequential phases instead of parallel worktrees:** shared write sets
  (`project-guidance.ts`, `oat-doctor/SKILL.md`, `pjm/init.ts`, help snapshots,
  the load-contract test, `oat-reviewer.md`, and skill version pins) made
  parallel lanes unsafe.
- **Concurrent AGENTS.md appends left unserialized:** two simultaneous runs can
  append the same block twice; a correct fix needs a cross-process lock, larger
  than a sweep fix, and concurrent runs against one checkout are rare.
- **Codex recon lanes fall back to inline coverage:** Codex reads through its
  command-execution tool, which the read-only allowlist rejects; accepted over
  weakening the allowlist.
- **`BL-260829-order-phase-bookkeeping-before` shipped but stays open:** gates
  and lifecycle skills run the installed release, so live observation waits for
  the next multi-phase project.

## Integration Notes

- After upgrading, `oat instructions validate` exits 1 in a repository that
  still has old shims until `oat instructions sync` removes them. Opt back in
  with `oat config set documentation.instructionSyncStrategy pointer` and rerun
  sync.
- Recon launchers must pass `validate-assignment.mjs`; write paths outside the
  artifact kind's packet folder and non-allowlisted tools are refused.
- Final verification: full Definition of Done at `f0901755c` (and again at
  `ba69e2052` after `p05-t12`), all gates exit 0 with 0 of 10 test tasks
  cached; the exit gate passed on attempt 2 with 0 findings.

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
- Persist exit-gate launch intent, verify it, then launch; never batch the two,
  and match YAML keys at line start. A substring guard failed on a commented
  template and the gate ran without persisted intent.
  ([2026-09-28T11:40Z — gotcha — Exit-gate intent persistence must be sequential, not parallel](oat-execution-learnings.md#2026-09-28t1140z---gotcha---exit-gate-intent-persistence-must-be-sequential-not-parallel))

## Explainer Outcome

- Project recap: `built` (recipe `project-recap` v2, run
  `def695e7-4da2-4fb9-97ff-9a2f10df0294`); all browser-free checks passed and
  the host browser capture was inspected at 320, 768, and 1440 px.
- Run: `explainers/backlog-wave-2-recap/` (page `site/index.html`).

## Follow-up Items

- `BL-260928-serialize-concurrent-agents-md` — concurrent guidance appends can
  duplicate a managed block (p01 gate M1).
- `BL-260928-keep-instructions-sync-force` — with a shim strategy,
  `--strategy pointer --force` can overwrite the only `CLAUDE.md` in the
  `AGENTS.md -> CLAUDE.md` layout (pre-existing).
- `BL-260928-route-quick-mode-discovery` — the control-plane recommender and
  dashboard still route quick-mode discovery to `oat-project-plan` (p03 L1).
- `BL-260928-settle-codex-read-authority` — Codex recon read authority plus
  weaker `writePath` form checks, web tools without URL sources, and mode not
  checked against artifact kind (p04 re-review M2, L1-L3).
- `BL-260928-harden-the-backlog-reference` — atomic-replace edge cases:
  ownership change, same-inode concurrent edit, long temporary names.
- `BL-260829-order-phase-bookkeeping-before` stays open for live observation.

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
