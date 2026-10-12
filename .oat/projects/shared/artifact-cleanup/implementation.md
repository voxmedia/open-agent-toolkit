---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-12
oat_current_task_id: p03-t11
oat_generated: false
---

# Implementation: artifact-cleanup

**Started:** 2026-10-12
**Last Updated:** 2026-10-12

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, fill the Final Summary (for PR/docs) section below with what was actually implemented.

## Progress Overview

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | complete    | 7     | 7/7       |
| Phase 2 | complete    | 12    | 12/12     |
| Phase 3 | in_progress | 13    | 10/13     |
| Phase 4 | pending     | 4     | 0/4       |

**Total:** 29/36 tasks completed

---

## Phase 1: Log and summary contract

**Status:** complete
**Started:** 2026-10-12
**Completed:** 2026-10-12

**Expected-red list (frozen 2026-10-12 before dispatch, plan "Expected-red policy"):**

- `pnpm run check:skill-bumps` — phase-crossing red until p04-t04 bumps the touched skills; owner p04-t04.
- In-phase re-pins, green again at the task that moves them: `rollup.test.ts` and `lifecycle.integration.test.ts` (`## Workflow Observations` output, p01-t03); `template-heading-literals.test.ts`, `skills-bundled-docs-contract.test.ts`, `project/new` scaffold tests (p01-t04); `skills.test.ts`, `named-skill-load-contract.test.ts`, `review-skill-contracts.test.ts` (summary/retro text, p01-t05).
- Nothing else may be red at the p01 review.

### Phase Summary

**Outcome (what changed):**

- Project-log judgment entries carry category, source, origin and recorded head fields (six categories, validated); `log append --category/--source/--origin`, `log check` reports `learnings: legacy` when the old learnings file exists.
- `workflow.projectLogDigest.{maxEntries,maxLines}` config (12/60) with a documented minimum useful `maxLines`.
- Roll-up writes a bounded observations digest (judgment entries only, ordered, capped with an omitted-count trailer, non-link `oat-project:<slug>#<entry-id>` locators) and omits the section when empty; ledger graduation untouched; `--json` exposes digest counts.
- Project-log template header is two lines; the summary template no longer seeds `## Workflow Observations` and previews `oat_summary_learnings_fingerprint`.
- Summary and retro skills read the unified log first and `oat-execution-learnings.md` second with proven-twin deduplication; summary gains the staged invocation contract (`staged: true` … `resume: roll-up`) and learning-driven freshness; docs updated.

**Key files touched:**

- `packages/cli/src/commands/project/log/{grammar,append,check,rollup}.ts` and tests; `packages/cli/src/config/{oat-config,resolve}.ts`; `packages/cli/src/commands/config/index.ts`
- `.oat/templates/{project-log,summary,project-retro}.md`; `.agents/skills/oat-project-summary/SKILL.md`; `.agents/skills/oat-project-retro/{SKILL.md,references/evidence-and-lanes.md}`
- `apps/oat-docs/docs/{reference/configuration,reference/cli-reference,workflows/projects/execution/project-log,workflows/projects/closeout/retro}.md`

**Verification:**

- Per-task scoped vitest under an isolated HOME (2673/2673 at the phase head, 864/864 for the fix tasks), `pnpm check` 0 (uncached), `pnpm type-check` 0, `oat:validate-skills` 0, `format:root` 0, `oat-docs check` 0; three named guards proven by the implementer and re-proven by the reviewer; real-artifact probes with the branch dist. Expected red only: `check:skill-bumps` (p04-t04).
- Review: round 1 (0/0/1/3) and round 2 on the fix delta (0/0/0/0), Fable 5.1 high.

**Notes / Decisions:**

- `entriesRolledUp` keeps counting every entry; digest counts live under `digest`. An empty digest removes any existing observations section (roll-up is its only writer).
- Twin detection requires exact recorded-head/category/title equality with the legacy record; p03-t01 producers should write the learning title as `--area`.
- Mechanical additions beyond the plan's file lists: `.oxfmtrc.jsonc` fixture ignore, `lifecycle.integration.test.ts` re-pin (p01-t04), `named-skill-load-contract.test.ts` row (p01-t05).

### Task p01-t01: Project-log judgment categories and source identity

**Status:** completed
**Commit:** 1619b49f6

**Outcome:**

- Judgment entries carry `**Category:**`/`**Source:**`/`**Origin:**`/`**Recorded:**` head fields with the six categories validated; `log append --category/--source/--origin`, `--category` without `--source` refused, `--idempotency-key` honored for judgment retries; `log check` exposes the fields and reports `learnings: legacy` when `oat-execution-learnings.md` exists. Guard `learning-category-validation` proven (neutralized → `--category bogus` appended; restored → refused).

**Files changed:**

- `packages/cli/src/commands/project/log/{grammar,append,check}.ts` + tests
- `log/__tests__/fixtures/lite-workflow-mode-project-log.md` (provenance: archived lite-workflow-mode log, byte-identical excerpt)
- `.oxfmtrc.jsonc` (mechanical: fixture directory ignored so the hook cannot rewrite captured bytes)

**Verification:**

- control-plane build 0; `HOME=$FH` vitest `src/commands/project/log` + help-snapshots 325/325 exit 0; type-check 0

---

### Task p01-t02: Digest configuration

**Status:** completed
**Commit:** 90db795fc

**Outcome:**

- `workflow.projectLogDigest.maxEntries` (12) and `.maxLines` (60) as a sibling object with local/shared/user/default precedence; non-integer refused by the reader; `config set … 2.5` exits 1; coexists with `workflow.projectLog: false`.

**Files changed:**

- `packages/cli/src/config/{oat-config,resolve}.ts`, `commands/config/index.ts` + tests
- `apps/oat-docs/docs/reference/configuration.md`

**Verification:**

- vitest `src/config src/commands/config` 633/633 exit 0; scratch probe with the branch dist: default 12, shared override 5

---

### Task p01-t03: Bounded observations digest in roll-up

**Status:** completed
**Commit:** 93eb25e76

**Outcome:**

- Roll-up renders a bounded observations digest (judgment entries only, newest first then category priority, capped by `maxEntries`/`maxLines` with an omitted-count trailer, `oat-project:<slug>#<entry-id>` locator tokens, no links); `summarySection: 'omitted'` removes the section when the digest is empty; `--json` reports `digest.{rendered,omitted,omittedEntries,byProducer}`; ledger graduation untouched. Guards `digest-bounded-projection` and `digest-ledger-graduation-intact` proven.

**Files changed:**

- `packages/cli/src/commands/project/log/rollup.ts`, `rollup.test.ts`, `lifecycle.integration.test.ts` (re-pinned)

**Verification:**

- vitest `src/commands/project/log` 269/269 exit 0

---

### Task p01-t04: Summary and project-log templates

**Status:** completed
**Commit:** a954972bf

**Outcome:**

- Project-log template header reduced to two lines plus a docs link, sample entry dropped; summary template no longer carries `## Workflow Observations` and its learnings comment states the category-bearing rule; no tracked `packages/cli/assets/templates` copy affected (only three unrelated copies are tracked).

**Files changed:**

- `.oat/templates/project-log.md`, `.oat/templates/summary.md`
- `lifecycle.integration.test.ts` (mechanical: pinned the old template header)

**Verification:**

- CLI build 0; declared runner + log suite 1033/1033 exit 0; scratch probe (branch dist, `HOME=$FH`): 2-line header, empty-log roll-up `omitted`, no observations heading

---

### Task p01-t05: Summary and retro readers, staged closeout invocation, phase-1 docs

**Status:** completed
**Commit:** 819c6fe44

**Outcome:**

- Summary skill reads unified log entries first and `oat-execution-learnings.md` second, deduplicating by exact timestamp/category/title; staged invocation contract (`staged: true` … `resume: roll-up`) with the Step 2.5 promotion append deferred; export-safe non-link source identity; `oat_summary_learnings_fingerprint` frontmatter field; retro skill, `evidence-and-lanes.md` and retro template read unified first, legacy second; docs for categories, digest and `log` CLI bullets.

**Files changed:**

- `.agents/skills/oat-project-summary/SKILL.md`, `.agents/skills/oat-project-retro/{SKILL.md,references/evidence-and-lanes.md}`
- `.oat/templates/{summary,project-retro}.md`
- `apps/oat-docs/docs/{reference/cli-reference,workflows/projects/execution/project-log,workflows/projects/closeout/retro}.md`
- `retro-skill-contracts.test.ts`, `review-skill-contracts.test.ts`, `named-skill-load-contract.test.ts` (mechanical: non-executing row for the new `oat-project-complete` mention)

**Verification:**

- `oat:validate-skills` 0; `format:root` 0; `oat-docs check` 0; vitest `src/validation src/commands/init/tools/shared` 1070/1070 exit 0

---

### Review Received: p01

**Date:** 2026-10-12
**Review artifact:** reviews/archived/p01-review-2026-10-12T012710Z.md (round 1, Fable 5.1 high, auto)

**Findings:**

- Critical: 0
- High: 0
- Medium: 1
- Low: 3

**New tasks added:** p01-t06 (L1), p01-t07 (L2)

**Design drift / artifact alignment notes:**

- M1: plan drift, not a code defect. The complete skill's summary-status preflight must also honor `oat_summary_learnings_fingerprint` (design "Closeout prose and refresh"); p01-t05's summary-side rule is accepted as implemented and the plan is the artifact that was stale. Aligned now: one clause added to p02-t06's `oat-project-complete/SKILL.md` description. Source of truth: plan revision 5 as amended.
- L3: two p01-t05 reader controls (legacy-only consumption, proven twin emitted once) are prose-pinned; executable proof is agent-run and belongs to p04-t01. Aligned now: two named rows added to p04-t01's Verify.

**Next:** fix continuation `cont-ac-p01-fix-1` landed `0bce1f045` and `d905d0110`; round 2 (`reviews/archived/p01-review-2026-10-12T013544Z.md`, reviewed head `a359c4524`, narrowed to the fix delta) returned 0/0/0/0 and the p01 event is `passed`. Review artifacts are local-only (not archived to S3).

### Task p01-t06: (review) Add the learnings-fingerprint placeholder to the summary template

**Status:** completed
**Commit:** 0bce1f045

**Outcome:**

- Summary template placeholder frontmatter now includes `oat_summary_learnings_fingerprint: none`; no contract test enumerates those keys, so none moved.

**Files changed:**

- `.oat/templates/summary.md`

**Verification:**

- CLI build 0; vitest `project/new`, template-heading-literals, skills-bundled-docs-contract, review-skill-contracts 319/319 exit 0

---

### Task p01-t07: (review) Document the minimum useful projectLogDigest.maxLines

**Status:** completed
**Commit:** d905d0110

**Outcome:**

- Docs and the config catalog state the minimum useful `maxLines` (about 6); one `rollup.test.ts` case pins the edge (`maxLines: 5` → `rendered: 0`, only the two reserved lines, bound holds); bound semantics unchanged.

**Files changed:**

- `apps/oat-docs/docs/reference/configuration.md`
- `packages/cli/src/commands/config/index.ts`
- `packages/cli/src/commands/project/log/rollup.test.ts`

**Verification:**

- vitest `src/commands/project/log src/commands/config` 545/545 exit 0; `oat-docs check` 0; `pnpm check` 0 (uncached); `pnpm type-check` 0

---

## Phase 2: Journal and lifecycle enforcement

**Status:** complete
**Started:** 2026-10-12
**Completed:** 2026-10-12

**Expected-red list (frozen 2026-10-12 before dispatch):**

- `pnpm run check:skill-bumps` — phase-crossing red until p04-t04; owner p04-t04.
- In-phase re-pins, green again at the task that moves them: control-plane progress fixtures unchanged (p02-t01); `help-snapshots.test.ts` (p02-t02, p02-t04); `template-heading-literals.test.ts`, `skills-bundled-docs-contract.test.ts`, `project/new` scaffold tests, `promote.brief.test.ts`, `stamp.test.ts` (p02-t05); `skills.test.ts`, `named-skill-load-contract.test.ts`, `review-skill-contracts.test.ts`, `autonomy-gate-inventory.test.ts` (p02-t06, and p02-t07 if it re-keys prompts).
- Nothing else may be red at the p02 review.

### Phase Summary

**Outcome (what changed):**

- Shared heading-only journal record reader in the control plane (ownership, fence exclusion, identity normalization, raw duplicates) adopted by task-mode progress.
- `dispatch record --format line` one-line run records with terminal classification and a `--dispatch-stamp` flag.
- Journal evaluator and `oat project journal check` at `implement-preflight|review|completion` (task and brief/goal rules, placement across the whole journal, run-line terminality, override line grammar, status and `oat_ready_for` agreement, placeholder residue); `complete-state` rechecks the closeout invariant and the evaluator before its write, refuses `journal-missing` for a planned project without a journal, and writes nothing on refusal.
- Journal templates gain `## Reviews and Gates` and `## Deferred Findings`, drop the implementation log and test table; sixteen writer skills and roles target the slots; the complete skill runs summary staged → `journal check --at completion` → `resume: roll-up`, honors the learnings fingerprint, writes the override line and `oat_pr_status_observed_at`; completion posture docs agree with the evaluator.
- Eight docs pages describe the slots, run lines, override line and local-only review paths.

**Key files touched:**

- `packages/control-plane/src/state/{journal-records,tasks}.ts`; `packages/cli/src/commands/project/{dispatch,journal-check,complete-state}/**`; `packages/cli/src/providers/identity/generic-dispatch-record.ts`
- `.oat/templates/{implementation,implementation-brief}.md`; `.agents/skills/oat-project-{implement,complete,complete-auto,dispatch-subagents,pr-final,pr-progress,reconcile,review-provide,review-receive,review-receive-remote,revise,brief}/**`; `.agents/docs/autonomy-contract.md`
- `apps/oat-docs/docs/{reference/cli-reference,reference/project-artifacts,reference/project-state-machine,workflows/**}.md`

**Verification:**

- Per-task scoped vitest under an isolated HOME (phase suite 3188/3188 at the recovered head; fix round 1225/1225, then 1324/1324 at review), `pnpm check` 0 (uncached), `pnpm type-check` 0, validate-skills 0, format:root 0, oat-docs check 0, `sync --scope project --dry-run` clean; five named guards plus the four fix guards proven by the implementer and re-proven by the reviewer; clean walkthrough and failing staged-closeout probe reproduced on the branch dist. Expected red only: `check:skill-bumps` (p04-t04).
- Review: round 1 (0/0/2/3) and round 2 on the fix delta (0/0/0/0), Fable 5.1 high. Two recovery attempts (`ac-p02-recovery-1`, `-2`, both test re-pins), budget 2/10 used.

**Notes / Decisions:**

- See the Deviations table (p02-t02 `--dispatch-stamp`, p02-t04 evaluator scope and the journal-less branch now narrowed by p02-t10, p02-t05 `git add -f`).
- Backlog candidate for p04-t03: `oat internal commit-paths` should accept tracked files under ignored directories.

### Task p02-t01: Shared journal record reader

**Status:** completed
**Commit:** b99c55550

**Outcome:**

- Shared heading-only journal record reader in the control plane (`journal-records.ts`): explicit heading ownership, fenced/indented code excluded, phase/task identity normalization, raw duplicates retained, exactly-one-owned `**Status:**`/`**Commit:**` extraction; task-mode progress consumes it with unchanged results on the existing fixtures; barrel export. Guard `record-reader-ownership` proven (three neutralizations).

**Files changed:**

- `packages/control-plane/src/state/journal-records.ts` (+test)
- `packages/control-plane/src/state/tasks.ts`
- `packages/control-plane/src/index.ts`

**Verification:**

- control-plane vitest 287/287 exit 0; tsc 0; check 0

---

### Task p02-t02: One-line dispatch record projection

**Status:** completed
**Commit:** c79aa675a

**Outcome:**

- `dispatch record --format line` additive v1 projection (`·`-delimited, escaped, explicit nulls, terminal classification from the exported producer-to-outcome mapping); `--json` keeps `validated-only` and adds the projection; `--dispatch-stamp <line>` flag carries the resolver's stamp verbatim (deviation, see below). Guard `run-line-terminality` proven.

**Files changed:**

- `packages/cli/src/commands/project/dispatch/{record,index}.ts`, `run-line.test.ts`
- `packages/cli/src/providers/identity/generic-dispatch-record.ts` (+test)
- `help-snapshots.test.ts`, `apps/oat-docs/docs/reference/cli-reference.md`

**Verification:**

- dispatch, identity, help-snapshot vitest 693/693 exit 0; cli check 0; type-check 0; oat-docs check 0

---

### Task p02-t03: Journal evaluator and rules

**Status:** completed
**Commit:** bd6840307

**Outcome:**

- Pure journal evaluator with mode-aware rules at `implement-preflight|review|completion`, placement rules across the whole journal, run-line terminality at completion, override line grammar (code · decision id · scope · reason), `{status, reasons:[{code,path,line,owner}]}` output. Guards `journal-check-terminal-shape`, `journal-check-placement`, `journal-check-override-scope` proven; same-bytes comparison against real control-plane progress with hand-written expectations.

**Files changed:**

- `packages/cli/src/commands/project/journal-check/{types,rules,evaluator}.ts`, `evaluator.test.ts`, `__tests__/fixtures.ts`

**Verification:**

- journal-check vitest 24/24 exit 0; check 0; tsc 0

---

### Task p02-t04: `oat project journal check` and lifecycle integration

**Status:** completed
**Commit:** d4e376ed5

**Outcome:**

- `oat project journal check` (`--project`, `--at`, `--scope`, `--json`, read-only) registered with help snapshots; `complete-state` rechecks the closeout invariant and the final evaluator immediately before its write and writes nothing on refusal; override line idempotent on code + scope + decision id. Delivery coverage and the goal sequence stay with `closeout-check` (deviation, see below); a project with no journal skips the evaluator (deviation).

**Files changed:**

- `packages/cli/src/commands/project/journal-check/index.ts` (+`index.test.ts`)
- `packages/cli/src/commands/project/{index,complete-state/index}.ts`, `complete-state/journal.test.ts`
- `closeout-check/goal-boundary.test.ts` (mechanical: goal fixture gains `oat_status` and `**Head:**` lines)
- `help-snapshots.test.ts`, `cli-reference.md`

**Verification:**

- journal-check, complete-state, closeout-check, help vitest 217/217 exit 0; `journal check --help` renders

---

### Task p02-t05: Journal templates with fixed slots

**Status:** completed
**Commit:** 29ba174eb

**Outcome:**

- Journal templates gain `## Reviews and Gates` and `## Deferred Findings` before `## Final Summary`, drop `## Implementation Log`, the per-phase test table and the Conventions blockquote; orchestration-runs markers kept; brief-contract §9 names the slots; tracked `implementation-brief` asset copy regenerated. Committed with `git add -f` by exact path because `commit-paths` refuses a tracked file under the ignored `packages/cli/assets/*` (deviation, see below).

**Files changed:**

- `.oat/templates/{implementation,implementation-brief}.md`
- `packages/cli/assets/templates/implementation-brief.md`
- `.agents/skills/oat-project-brief/references/brief-contract.md` §9
- `packages/cli/src/commands/project/new/scaffold.test.ts` (mechanical: slot scaffold test)

**Verification:**

- CLI build 0; declared runner 567/567 exit 0; validate-skills 0; format:root 0

---

### Task p02-t06: Writer skills and agent roles target the slots

**Status:** completed
**Commit:** b578602e2

**Outcome:**

- Sixteen writer skills and roles target the fixed slots: run line via `dispatch record --format line` updated in place, receipts/fix tasks/deferrals to their slots, `journal check --at implement-preflight` before Step 16, `state.md` owns gate transitions, the complete skill runs summary staged → `journal check --at completion` → `resume: roll-up`, honors `oat_summary_learnings_fingerprint` staleness, writes the override line and `oat_pr_status_observed_at`; project-scope projections unchanged (`sync --scope project --dry-run` clean); `rg` for retired headings finds nothing.

**Files changed:**

- `.agents/skills/oat-project-{implement,complete,complete-auto,dispatch-subagents,pr-final,pr-progress,reconcile,review-provide,review-receive,review-receive-remote,revise}/**`, `oat-worktree-bootstrap-auto/SKILL.md`
- `complexity-review-contracts.test.ts`, `post-implement-sequence-contracts.test.ts`, `review-skill-contracts.test.ts`, `named-skill-load-contract.test.ts` (re-pins; one new non-executing row)

**Verification:**

- `src/validation src/commands/init/tools/shared` 1070/1070 exit 0; validate-skills 0; format:root 0

---

### Task p02-t07: Phase-2 docs, autonomy re-keys and the scripted walkthrough

**Status:** completed
**Commit:** bd16db569

**Outcome:**

- Eight docs pages describe the slots, run lines, override line, local-only review paths and `oat_pr_status_observed_at`; no autonomy re-key needed (the one moved prompt site is byte-identical). Scripted walkthrough on a scratch quick project passed `journal check --at completion`; the failing staged-closeout probe (payload under Deferred Findings) refused at `journal check` and `complete-state` with the ledger, log tail, archive directory and `state.md` lifecycle fields byte-identical, while the accepted neighbor and a standalone summary ran through. Recovery `ac-p02-recovery-1` re-pinned one docs-wording string in `post-implement-sequence-contracts.test.ts` (7f95e2e3c).

**Files changed:**

- `apps/oat-docs/docs/{reference/project-artifacts,reference/project-state-machine,workflows/advanced/workflow-gates,workflows/projects/closeout/closeout-skills,workflows/projects/execution/implementation-execution,workflows/projects/execution/index,workflows/projects/lifecycle,workflows/projects/reviews/index}.md`

**Verification:**

- oat-docs check 0; docs:skills:check 0; autonomy-gate-inventory 5/5; phase suite 3188/3188 and control-plane 287/287 on the recovered head

---

### Review Received: p02

**Date:** 2026-10-12
**Review artifact:** reviews/archived/p02-review-2026-10-12T024507Z.md (round 1, Fable 5.1 high, auto)

**Findings:**

- Critical: 0
- High: 0
- Medium: 2
- Low: 3

**New tasks added:** p02-t08 (M1), p02-t09 (M2), p02-t10 (L1), p02-t11 (L2), p02-t12 (L3)

**Design drift / artifact alignment notes:**

- M2 is skill/docs drift against the design's status-agreement rule; the evaluator is right and the complete skill's Step 3.0 plus `lifecycle.md` are aligned by p02-t09. Source of truth: design revision 3 "Validator › Status agreement".
- L1 converts the recorded p02-t04 deviation ("no journal, no evaluation") into a fail-closed refusal for planned projects; the Deviations row stays as history.

**Next:** fix continuation `cont-ac-p02-fix-1` landed cbaaefbcb, cb94f4338, a81e58d09 (recovery), b1e44cfe6, f577f9ffd, 3607948f4; round 2 (`reviews/archived/p02-review-2026-10-12T030234Z.md`, reviewed head `b9f2f8050`) returned 0/0/0/0 and the p02 event is `passed`. Review artifacts are local-only.

### Task p02-t08: (review) Align receipt placement for task-scoped and revision reviews

**Status:** completed
**Commit:** cbaaefbcb

**Outcome:**

- Evaluator derives a receipt's owning phase from a task-id scope; review-receive Step 7 places `p-revN` receipts in `## Phase p-revN` or `## Reviews and Gates` and task-scoped receipts in the task's phase; two evaluator cases.

**Files changed:**

- `packages/cli/src/commands/project/journal-check/{rules.ts,evaluator.test.ts}`
- `.agents/skills/oat-project-review-receive/SKILL.md`

**Verification:**

- journal-check, validation, init/tools/shared vitest 1101/1101 exit 0; validate-skills 0; sync dry-run clean; guard neutralized → task-scoped case fails, restored byte-identical

---

### Task p02-t09: (review) Completion posture: in_progress is routed back, not accepted

**Status:** completed
**Commit:** cb94f4338

**Outcome:**

- Complete skill Step 3.0 ("Phase Status at Completion"): `in_progress` routes back to implement and is not override-eligible; `lifecycle.md` says completion accepts `pr_open` or `complete`. Recovery `ac-p02-recovery-2` (a81e58d09) re-keyed the moved prompt site in `autonomy-contract.md` and added a non-executing call-site row.

**Files changed:**

- `.agents/skills/oat-project-complete/SKILL.md`
- `apps/oat-docs/docs/workflows/projects/lifecycle.md`
- recovery: `.agents/docs/autonomy-contract.md`, `named-skill-load-contract.test.ts`

**Verification:**

- validate-skills 0; format:root 0; oat-docs check 0; focused 513/513 and phase suite 1222/1222 on the recovered head

---

### Task p02-t10: (review) Fail closed when a planned project has no journal at completion

**Status:** completed
**Commit:** b1e44cfe6

**Outcome:**

- `complete-state` refuses `journal-missing` and writes nothing when `plan.md` exists but `implementation.md` does not; plan-less projects keep the old behavior; reason code added to `types.ts`; one CLI-reference sentence.

**Files changed:**

- `packages/cli/src/commands/project/complete-state/{index.ts,journal.test.ts}`
- `packages/cli/src/commands/project/journal-check/types.ts` (mechanical: reason code)
- `apps/oat-docs/docs/reference/cli-reference.md` (mechanical: one sentence)

**Verification:**

- complete-state, closeout-check, journal-check, push vitest 192/192 exit 0; guard neutralized → refusal test fails, restored byte-identical

---

### Task p02-t11: (review) Evaluate oat_ready_for agreement at completion

**Status:** completed
**Commit:** f577f9ffd

**Outcome:**

- At `completion`, journal `oat_ready_for` must be `null` or a closeout skill, else `state-status-disagrees` naming the field.

**Files changed:**

- `packages/cli/src/commands/project/journal-check/{rules.ts,evaluator.test.ts}`

**Verification:**

- journal-check, complete-state vitest 69/69 exit 0; guard neutralized → stale-pointer case fails, restored byte-identical

---

### Task p02-t12: (review) Anchor the template-residue brace pattern to placeholder vocabulary

**Status:** completed
**Commit:** 3607948f4

**Outcome:**

- `BRACE_PLACEHOLDER` matches only the templates' placeholder words or a brace token that starts a list item or follows a `**Label:**` marker; `returns {status, reasons}` accepted, `{Task Name}` refused.

**Files changed:**

- `packages/cli/src/commands/project/journal-check/{rules.ts,evaluator.test.ts}`

**Verification:**

- journal-check, complete-state, project/new vitest 169/169 exit 0; old pattern fails the prose case; disabled pattern fails 3 residue cases; restored byte-identical

---

### Recovery Event ac-p02-recovery-1

- Phase/task: p02 / p02-t07
- Original request: ac-p02-implementation
- Original commit: bd16db569474ad13f0bbd7300d710a2f55e25891 (immutable)
- Defect class: test (docs wording pinned by `post-implement-sequence-contracts.test.ts`)
- Discovered by: phase-suite vitest under `HOME=$FH` (`src/commands/project src/providers/identity src/commands/help-snapshots.test.ts src/validation src/commands/init/tools/shared src/commands/state`)
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 1/10 (`used_attempts: 1` preserved; `pending_attempt` cleared by the root after validation)
- Dispatch target: oat-phase-implementer-claude-claude-opus-5-5-high (exact target, no route change)
- Recovery commit: 7f95e2e3c95e1c2c2f391396ca29ce6f4e8b4125 (append-only; ledger reservation plus one re-pinned string)
- Verification: focused 66/66 and phase suite 3188/3188 before the commit and on the committed head; control-plane 287/287
- Root validation: marker status `completed`, event id, original request/task/commit, target and reservation head all match the report; original history unchanged.

### Recovery Event ac-p02-recovery-2

- Phase/task: p02 / p02-t09 (fix continuation `cont-ac-p02-fix-1`)
- Original request: ac-p02-implementation
- Original commit: cb94f433817c3affd411de75be008dc16f017db8 (immutable)
- Defect class: test (stale autonomy prompt-site mapping after Step 3.0 was rewritten; new routing site needed a non-executing call-site row)
- Discovered by: `review-skill-contracts.test.ts` and `src/validation` under `HOME=$FH`
- Disposition: recovered
- Authorization: phase-standing
- Attempt: 2/10 (`used_attempts: 2` preserved; `pending_attempt` cleared by the root after validation)
- Dispatch target: oat-phase-implementer-claude-claude-opus-5-5-high (exact target, no route change)
- Recovery commit: a81e58d09ab38e4e419b13788eeedc8a2bb55af7 (append-only: `autonomy-contract.md`, `named-skill-load-contract.test.ts`, ledger reservation)
- Verification: focused 513/513 and phase suite 1222/1222 before the commit and on the committed head
- Root validation: marker status `completed`, ids, original commit, target and reservation head match the report; original history unchanged.

## Phase 3: Learning producers and archive identity

**Status:** in_progress
**Started:** 2026-10-12

**Expected-red list (frozen 2026-10-12 before dispatch):**

- `pnpm run check:skill-bumps` — phase-crossing red until p04-t04; owner p04-t04.
- In-phase re-pins, green again at the task that moves them: `skills.test.ts`, `named-skill-load-contract.test.ts`, `review-skill-contracts.test.ts`, `autonomy-gate-inventory.test.ts`, `scaffold.test.ts` (p03-t01); the `archive` suite and `help-snapshots.test.ts` (p03-t02, p03-t03).
- Nothing else may be red at the p03 review.

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- (pending)

**Key files touched:**

- (pending)

**Verification:**

- (pending)

**Notes / Decisions:**

- (pending)

### Task p03-t01: Unified learning producers and the disabled-log rule (D14)

**Status:** completed
**Commit:** f0334271a

**Outcome:**

- The autonomous, cloud and goal producers share one byte-identical shell function `oat_record_learning` that maps the category to the judgment type and calls `project log append --json` with `--category/--source/--origin` and the source id as `--idempotency-key`; a disabled log yields one warning line and the run continues (D14); no producer creates `oat-execution-learnings.md`; brief-contract §12.3 row and §12.10 replaced; docs updated. Guard `learning-source-identity` proven (category and source arguments removed in turn → contract and real-CLI tests fail; restored).

**Files changed:**

- `.agents/skills/oat-project-autonomous/SKILL.md`, `oat-cursor-cloud-projects/{SKILL.md,references/cursor-cloud-mechanics.md}`, `oat-project-goal/SKILL.md`, `oat-project-brief/references/brief-contract.md`
- `apps/oat-docs/docs/workflows/advanced/{autonomy,cursor-cloud}.md`, `workflows/projects/closeout/closeout-skills.md`
- `project/new/scaffold.test.ts`; mechanical: `init/tools/shared/learning-producer-contracts.test.ts` (guard surface), `validation/synced-bookkeeping-sites.json` (anchor moved)

**Verification:**

- validate-skills 0; format:root 0; oat-docs check 0; scoped vitest green; branch-CLI probes: categorized append head lines, replay byte-identical, unknown category exit 1, disabled log one warning / no file / fingerprint `none`

---

### Task p03-t02: Archive retry identity and locator finalization

**Status:** completed
**Commit:** ed330bbab

**Outcome:**

- One read-only `evaluateArchiveRetryIdentity` used by apply and dry-run; archives identified by a manifest hash over retained files (exclusions `reviews/`, `.git`, archive-owned metadata listed once); metadata gains `manifestHash` and `generation`; identical retries reuse snapshot, export identity, S3 destination and receipt across dates and after source removal; conflicting or ambiguous candidates refuse before any side effect; summary export rewrites `oat-project:` tokens to `oat-archive:<snapshot>#<id>` and neutralizes relative log/learning links. Guard `archive-retry-identity` proven (discovery neutralized → timestamp-suffixed twin); dry-run/apply parity proven with a negative control on the old date derivation.

**Files changed:**

- `packages/cli/src/commands/project/archive/{archive-utils.ts,push-runner.ts,archive-utils.test.ts}`, new `archive-retry-identity.test.ts`
- `apps/oat-docs/docs/reference/{cli-reference,project-artifacts}.md`

**Verification:**

- `src/commands/project/archive src/commands/project/log` vitest 487/487 exit 0; synced guards (49aeb5075 recordless retry, completed-ref, stale-source, exact-root) still green

---

### Task p03-t03: Explicit archive generations

**Status:** completed
**Commit:** 587539d06

**Outcome:**

- `--new-generation <reason>` ships for shared and local projects: non-empty single-line reason, exactly one latest generation as predecessor, identity and predecessor binding persisted (`allocation: pending`) before any export/copy/S3 side effect so a retry reuses it; `generationRequest` (camelCase; deviation from the plan's `generation_request`) distinguishes a replay from a new generation; dry-run reports without persisting; synced refused. Guard `archive-generation-authorization` proven (predecessor check neutralized → allocation with two candidates).

**Files changed:**

- `packages/cli/src/commands/project/archive/{archive-utils,push-runner,index}.ts`, `index.test.ts`, `archive-retry-identity.test.ts`
- `apps/oat-docs/docs/reference/{cli-reference,project-artifacts}.md`

**Verification:**

- archive + help-snapshots vitest 291/291 exit 0; phase-3 docs gate `oat-docs check` 0

---

### Review Received: p03

**Date:** 2026-10-12
**Review artifact:** reviews/archived/p03-review-2026-10-12T035735Z.md (round 1, Fable 5.1 high, auto)

**Findings:**

- Critical: 0
- High: 0
- Medium: 3
- Low: 5

**New tasks added:** p03-t04 (M1), p03-t05 (M2), p03-t06 (M3), p03-t07 (L2), p03-t08 (L3), p03-t09 (L4), p03-t10 (L5)

**Design drift / artifact alignment notes:**

- L1: the plan and design said a replay is distinguished by a persisted `generation_request` id; the shipped mechanism is the manifest-hash match, with `generationRequest` recorded as the request witness. Implementation accepted (deterministic witness of the same facts; docs already describe it). Plan p03-t03 wording and design.md aligned now; source of truth: code and `project-artifacts.md`.
- Deliberate changes (a)–(d) from p03-t02/t03 judged design intent or defensible narrowing by the reviewer; (d) stays with the warning p03-t04 adds; (b) keeps the refusal with the corrected hint from p03-t06.

**Next:** fix continuation `cont-ac-p03-fix-1` landed 60d10eb8b..a6a9950a5; round 2 (`reviews/archived/p03-review-2026-10-12T042217Z.md`, reviewed head `1f5601c3f`) returned 0/0/0/3 and the p03 event is `passed`. The three round-2 Lows are converted to p03-t11..p03-t13 (replay-reason wording, two more refusal codes, empty scope-qualified directory); their fix delta is root-verified and covered by the final integrated review instead of a third p03 round (review cycle 2 of 3). Review artifacts are local-only.

### Task p03-t04: (review) Warn when --new-generation resolves to an existing generation

**Status:** completed
**Commit:** 60d10eb8b

**Outcome:**

- Apply and dry-run warn when `--new-generation` resolves to an existing generation (`newGenerationReplayWarning`); the reason is reported as not recorded.

**Files changed:**

- `archive-utils.ts`, `push-runner.ts`, `archive-retry-identity.test.ts`

**Verification:**

- archive + help runner 292/292; control: warning helper neutralized → test fails; restored byte-identical

---

### Task p03-t05: (review) Deterministic local archive path for scope-qualified and empty-base identities

**Status:** completed
**Commit:** 186ef8752

**Outcome:**

- Local archive path derives from the identity (`<project>-<scope>` when another archive holds the base path, regardless of date; an empty base directory counts as absent); never a clock suffix. Three re-pins replace clock-suffixed paths.

**Files changed:**

- `archive-utils.ts`, `archive-retry-identity.test.ts`; re-pins `archive-utils.test.ts` (2), `push-runner.test.ts` (1); `project-artifacts.md` bullet

**Verification:**

- runner 293/293; control: old `target.archivePath` → `demo-2026…` twins

---

### Task p03-t06: (review) Reason codes on archive refusals and the occupant recovery hint

**Status:** completed
**Commit:** 8047d32a4

**Outcome:**

- `ArchiveIdentityError` with ten stable reason codes (nine from the review plus `archive-generation-source-absent`), surfaced as `code` in the push-runner JSON error; the occupant refusal tells the operator to inspect and remove a partial copy and retry; codes tabled in `project-artifacts.md`.

**Files changed:**

- `archive-utils.ts`, `push-runner.ts`, `archive-retry-identity.test.ts`, `apps/oat-docs/docs/reference/project-artifacts.md`

**Verification:**

- runner 295/295; oat-docs check 0; control: prefix and JSON code removed → 2 tests fail

---

### Task p03-t07: (review) Content-conflict refusal names the latest generation

**Status:** completed
**Commit:** 4c138a9cc

**Outcome:**

- Content-conflict refusal names the latest generation and mentions a pending allocation.

**Files changed:**

- `archive-utils.ts`, `archive-retry-identity.test.ts`

**Verification:**

- runner 296/296; control: first candidate → names `20260901-demo` instead of `20260905-demo-g5`

---

### Task p03-t08: (review) Recordless synced dry-run resolves identity through the completed ref

**Status:** completed
**Commit:** 5a975c474

**Outcome:**

- `resolveRecordlessSyncedArchiveIdentity` exported and used by the push runner in both modes (injectable), so a recordless synced dry-run reports the identity the apply binds through the completed ref, or both refuse.

**Files changed:**

- `archive-utils.ts`, `push-runner.ts`, `push-runner.test.ts`, `archive-retry-identity.test.ts`

**Verification:**

- runner 298/298; control: resolution off → preview reports a new dated identity while apply refuses

---

### Task p03-t09: (review) Test the .git exclusion for shared-scope archives

**Status:** completed
**Commit:** 03242c88b

**Outcome:**

- Shared-scope `.git` exclusion control: nested `.git/HEAD` absent from the archive, source and archive manifest hashes equal.

**Files changed:**

- `archive-retry-identity.test.ts`

**Verification:**

- archive runner 232/232; control: `.git` dropped from exclusions → reaches the archive

---

### Task p03-t10: (review) Autonomous learning commit identity uses the written source id

**Status:** completed
**Commit:** a6a9950a5

**Outcome:**

- The autonomous skill assigns `LEARNING_SOURCE` at the call site so the commit identity suffix is the id just written; cloud and goal commit through their normal bookkeeping and had no gap; `oat_record_learning` stays byte-identical.

**Files changed:**

- `.agents/skills/oat-project-autonomous/SKILL.md`, `learning-producer-contracts.test.ts`

**Verification:**

- validate-skills 0; vitest 435/435; control: assignment removed → "the source id is assigned" fails

---

### Task p03-t11: (review) Replay warning states the persisted generation reason

**Status:** pending
**Commit:** -

---

### Task p03-t12: (review) Reason codes on the recordless synced and persisted-path refusals

**Status:** pending
**Commit:** -

---

### Task p03-t13: (review) Treat an empty scope-qualified directory as free

**Status:** pending
**Commit:** -

---

## Phase 4: Acceptance, documentation audit, records and release

**Status:** pending
**Started:** -

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- (pending)

**Key files touched:**

- (pending)

**Verification:**

- (pending)

**Notes / Decisions:**

- (pending)

### Task p04-t01: Fresh lifecycle probes per mode

**Status:** pending
**Commit:** -

**Notes:**

- (pending)

---

### Task p04-t02: Documentation audit and root AGENTS.md

**Status:** pending
**Commit:** -

**Notes:**

- (pending)

---

### Task p04-t03: Decision records and backlog

**Status:** pending
**Commit:** -

**Notes:**

- (pending)

---

### Task p04-t04: Version bumps and the full gate run

**Status:** pending
**Commit:** -

**Notes:**

- (pending)

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

### Run 1 — 2026-10-12 — branch `feat/artifact-cleanup` — Tier 1 (subagents) — dispatch policy frontier (claude, managed capped, pinned-variant) — implementers Opus 5.5 high via exact-candidate branch, reviewers at the cap (Fable 5.1 high)

**Dispatch records:**

- `ac-p01-implementation` — accepted 2026-10-12, native agent type `oat-phase-implementer-claude-claude-opus-5-5-high`; selection candidate-requested beneath frontier (operator run rule); managed record `validated-only`; canonical role resolved (tier loaded, role 1.1.7); base `df988e4315fb567c8a6890237237b169707c2b61`; outcome `DONE_WITH_CONCERNS`, range `df988e431..819c6fe44`, 5/5 tasks, 0 recovery attempts. Stamp: `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=frontier dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high`

**Phase Outcomes:**

| Phase | Verdict | Task commits                                                                                                                                                                               | Review                                                                                                     | Fix rounds              | Reviewer dispatches                                                                                                                                                                                                                                                                                                                                                                 |
| ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p01   | pass    | 1619b49f6, 90db795fc, 93eb25e76, a954972bf, 819c6fe44; review fixes 0bce1f045, d905d0110                                                                                                   | round 1 0/0/1/3 (`p01-review-2026-10-12T012710Z.md`), round 2 0/0/0/0 (`p01-review-2026-10-12T013544Z.md`) | 1 (`cont-ac-p01-fix-1`) | `ac-p01-review-1`, `ac-p01-review-2`: native `oat-reviewer-claude-claude-fable-5-1-high`, managed record validated-only; stamp `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-fable-5-1 effort_axis=selected:high dispatch_policy=frontier dispatch_ceiling=high target=oat-reviewer-claude-claude-fable-5-1-high` |
| p02   | pass    | b99c55550, c79aa675a, bd6840307, d4e376ed5, 29ba174eb, b578602e2, bd16db569; recovery 7f95e2e3c; review fixes cbaaefbcb, cb94f4338 (+ recovery a81e58d09), b1e44cfe6, f577f9ffd, 3607948f4 | round 1 0/0/2/3 (`p02-review-2026-10-12T024507Z.md`), round 2 0/0/0/0 (`p02-review-2026-10-12T030234Z.md`) | 1 (`cont-ac-p02-fix-1`) | `ac-p02-implementation` (Opus 5.5 high, candidate-requested, validated-only); `ac-p02-review-1`, `ac-p02-review-2`: native `oat-reviewer-claude-claude-fable-5-1-high`, validated-only; stamps as p01 with scope=p02                                                                                                                                                                |

**Parallel Groups:** none (sequential plan)

**Outstanding Items:** none after p02.

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-10-11

**Session Start:** {time}

- [x] p01-t01: {Task name} - {commit sha}
- [ ] p01-t02: {Task name} - in progress

**What changed (high level):**

- {short bullets suitable for PR/docs}

**Decisions:**

- {Decision made and rationale}

**Follow-ups / TODO:**

- {anything discovered during implementation that should be captured for later}

**Blockers:**

- {Blocker description} - {status: resolved/pending}

**Session End:** {time}

---

### 2026-10-11

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan / Design

| Date       | Phase/Task  | Deviation                                                                                                                                                                                                                                                                                                     | Reason                                                                                                                 | Source of truth now                              | Follow-up                                                                                         |
| ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 2026-10-12 | p02-t02     | `dispatch record --format line` takes a `--dispatch-stamp <line>` flag; the generic record carries no `Dispatch:` stamp                                                                                                                                                                                       | The caller owns the resolver's stamp; the record producer validates the canonical prefix and format, null when omitted | Code and `cli-reference.md`                      | p02-t06 writers pass the stamp; docs updated in p02-t07                                           |
| 2026-10-12 | p02-t04     | The pure journal evaluator does not re-check delivery coverage or the goal sequence                                                                                                                                                                                                                           | Those remain `closeout-check`'s invariant; `complete-state` runs both side by side                                     | Code (`complete-state/index.ts`)                 | None                                                                                              |
| 2026-10-12 | p02-t04     | `complete-state` skips the journal evaluator when the project has no `implementation.md`                                                                                                                                                                                                                      | Existing completion tests depend on journal-less projects                                                              | Code                                             | p04-t01 probes exercise journal-bearing projects only                                             |
| 2026-10-12 | p02-t05     | Task committed with `git add -f` by exact path instead of `oat internal commit-paths`                                                                                                                                                                                                                         | `commit-paths` exits 1 on `git add` of a tracked file under the ignored `packages/cli/assets/*`; hooks still ran       | Commit 29ba174eb                                 | Backlog candidate for p04-t03: commit-paths should accept tracked files under ignored directories |
| 2026-10-12 | p03-t03     | Snapshot metadata key is `generationRequest` (camelCase) rather than the plan's `generation_request`                                                                                                                                                                                                          | Matches the other metadata keys                                                                                        | Code and `project-artifacts.md`                  | None                                                                                              |
| 2026-10-12 | p03-t02     | Same-day archives of one slug from two scopes get a scope-qualified dated identity; a non-empty metadata-less occupant at the archive path refuses instead of creating a twin; `.git` excluded from shared/local copies; `--new-generation` with unchanged content resolves to the existing latest generation | Retry identity must be unambiguous (D11); re-pins two #254 tests                                                       | Code and `project-artifacts.md#archive-identity` | Reviewer to confirm; p04-t01 probes                                                               |
| 2026-10-12 | p03-t05/t06 | Scope qualification applies to the local path and export name whenever another archive holds the base path (not only same-day); a tenth reason code `archive-generation-source-absent`                                                                                                                        | Local names must match what `repo archive sync` restores; the missing-directory refusal needed a code                  | Code and `project-artifacts.md#archive-identity` | None                                                                                              |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |

## Final Summary (for PR/docs)

**What shipped:**

- {capability 1}
- {capability 2}

**Behavioral changes (user-facing):**

- {bullet}

**Key files / modules:**

- `{path}` - {purpose}

**Verification performed:**

- {tests/lint/typecheck/build/manual steps}

**Design deltas (if any):**

- {what changed vs design.md and why}

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
