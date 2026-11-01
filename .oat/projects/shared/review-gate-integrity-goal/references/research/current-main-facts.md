# Verified facts on current main (2026-11-01)

Baseline: `origin/main` `1056ccb18` (lockstep 0.3.38). Gathered by read-only
exploration of code and skill text during the goal alignment interview. Line
numbers are as of this baseline.

## Re-review after fixes

- Phase review: Critical or High findings start a fix child, then one new
  root-owned reviewer round, until pass or retry exhaustion
  (`.agents/skills/oat-project-implement/references/phase-execution.md:936-950`).
  A blocked phase gate re-runs both root review and the gate (`:999-1001`).
- Final and receive path: `fixes_completed` means awaiting re-review; the
  receive skill re-runs review-provide and receive to reach `passed`
  (`.agents/skills/oat-project-review-receive/SKILL.md:658-660,702-705`).
- The only existing no-re-review exception is the passing-gate judgment sweep
  for address-now findings (`oat-project-review-receive/SKILL.md:369-372`).
- The review cycle cap counts non-gate review artifacts per scope token, cap 3
  (`oat-project-review-receive/SKILL.md:781-829`).
- The phase task ledger is committed before per-phase reviewer dispatch, and
  the reviewer brief names review-outcome bookkeeping out of scope
  (`phase-execution.md:838-875`; `DR-260928-commit-the-phase-task-ledger`).
- `.agents/agents/oat-reviewer.md` has no instruction about ledger or
  bookkeeping findings.

## Bookkeeping classification today

- `packages/cli/src/review-remote/narrowing.ts:259-289` classifies a diff range
  as `bookkeeping-only` by path prefix only, and is reporting-only: every
  classification still dispatches (`oat-project-review-provide/SKILL.md:801-810`).
- No skill or CLI classifies individual findings as bookkeeping or content.
  The `accepted-requirement` / `regression` / `new-hardening` classes exist only
  in the exhaustion-time complexity-review fallback
  (`.agents/docs/complexity-review-fallback.md:213-216`, vendored into
  implement, quick-start and review-receive).
- The goal-mode bookkeeping-successor evaluator
  (`packages/cli/src/commands/project/delivery/evidence.ts`) is content-aware,
  not path-only: it allowlists this project's `state.md`, `plan.md`,
  `implementation.md`, `project-log.md`, `summary.md` and evidence review
  artifacts, and judges each file's change (`judgeBookkeepingChange`, `:370`;
  plan frontmatter keys `:735-766`). It serves delivery check, refresh and the
  goal closeout boundary only (`DR-261011-bookkeeping-successors-keep`).

## Review event identity

- A review event is identified by Scope + Type + Artifact filename, append
  ordered (`DR-260714-append-ordered-review-event`;
  `oat-project-plan-writing/SKILL.md:646-649`). There is no separate event-id
  column. Control-plane `parseReviewTable` is parse-only
  (`packages/control-plane/src/state/reviews.ts:22-42`).
- `oat review latest --actionable-project` selects the newest top-level review
  whose ledger row is `received` with matching scope, type and artifact
  (`packages/cli/src/commands/review/latest.ts:258-372`).
- Review-provide Step 9 claims an unbound `pending` placeholder or appends a row
  (`oat-project-review-provide/SKILL.md:1548-1568`).
- `.oat/templates/plan.md:171-177` has no `plan` placeholder row and still seeds
  `spec` and `design` rows; `plan-lite.md:148-151` also seeds `spec`/`design`;
  `plan-brief.md:112-114` seeds `plan`.
- No CLI validates review-row consistency (duplicate rows for one event, stale
  `received` rows); all Reviews-table writes are skill prose.

## Gates

- `oat gate review` is single-shot (one `runId` per invocation,
  `packages/cli/src/commands/gate/index.ts:4315-4321`); `maxAttempts` and
  `onFailure` are applied by the calling skill. Attempts persist in state
  (`oat_implement_exit_gate.attempts_completed`) and are consumed only after a
  validated blocked receive (`completion-and-closeout.md:657-668,895-904`).
- The verdict carries aggregate severity counts only; there is no per-finding
  record, no stable finding key and no new/carried-over marking
  (`gate/review-verdict.ts:11-31`; `gate/index.ts:2848-2878`).
- The gate JSON result has no top-level schema version; `reviewed_head` is not
  in the CLI result (it is in state and artifact frontmatter).
- The verdict parser still counts every column-zero list line as a finding
  (`review-verdict.ts:271-289`), so unindented detail bullets overcount (#339).
  _Correction (brief artifact review, 2026-11-01):_ the parser already refuses
  an artifact whose declared counts and body tallies disagree
  (`assertAgreeingCounts`, `review-verdict.ts:847-866`, applied at `:904,927`),
  so the #339 shape with its declared `2 medium, 3 low` line is refused today
  (forcing a rerun), and the body-only variant is accepted as 6 Medium / 6 Low.
  #339's finding titles are bold lead-in paragraphs, which the shipped contract
  counts as zero (`FINDING_LIST_ITEM_CONTRACT_HINT`, `:831-832`, and the gate
  parsing contract in `.agents/agents/oat-reviewer.md`).
  _Capture source (2026-11-01):_ the original #339 reviewer artifact is not on
  this machine. Issue #339 holds a reproduction "abbreviated from the real
  artifact" (CLI 0.3.13, Claude Opus high, artifact mode). The only other
  bold-title capture found locally is the machine-local
  `t3-e32280d5/.oat/projects/archived/backlog-wave-5/analysis/implementation-exit-gate-r1.err`
  (one `**H1 — …**` title, a different shape from #339).
- Gate carriers follow `.agents/docs/gate-approval-record.md`: a disposition
  pairs only with `status: allowed` and is `null` when `blocked`; other pairs
  are malformed.
- No rule exempts a blocking gate whose findings are only bookkeeping: it
  consumes an attempt and the gate re-runs.
- `--avoid` defaults to `same-family` and falls back with a warning in
  `diversity`; there is no strict mode. Codex activity is `ambient-runtime`;
  there is no idle-kill (30-minute hard budget for artifact gates).

## Closeout freshness

- Goal mode: `oat project closeout-check` evaluates integrated-review and exit
  carrier freshness against observed member heads through the
  bookkeeping-successor evaluator.
- Non-goal modes: `closeout-check` and `complete-state` check only the
  `oat_post_implement_sequence` snapshot. Exit-gate effective-delta freshness is
  enforced in skill prose, not by the CLI. The final review row's Reviewed Head
  is recorded but never compared with the current head; summary, document and
  PR steps record no head.
- `oat-project-pr-final` requires the latest `final` code row `passed` but does
  not list other `pending` rows; `oat-project-pr-progress` warns and does not
  block.
- Deferred findings go to `implementation.md` `## Deferred Findings`; nothing
  files them to the backlog or issues at receive time.

## Open GitHub issues behind the candidate items

All open on 2026-11-01: #233, #344, #194, #305, #202, #201, #327, #207, #200,
#197, #354, #214, #339, #310, #206. PR #190 (ReviewPlan Stage A) is an open
draft, last updated 2026-09-02.
