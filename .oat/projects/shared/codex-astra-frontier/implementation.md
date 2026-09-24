---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-24
oat_current_task_id: null
oat_generated: false
---

# Implementation: codex-astra-frontier

**Started:** 2026-09-24
**Last Updated:** 2026-09-24

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

| Phase   | Status    | Tasks | Completed |
| ------- | --------- | ----- | --------- |
| Phase 1 | completed | 4     | 4/4       |

**Total:** 4/4 tasks completed; phase review finding fixed.

## Planning Review Received

The September 24 plan gate found one High gap (no explicit model-guidance
audit task) and one Medium gap (verification commands were not executable).
Both were resolved in the plan before implementation. The consumed review is
kept locally at
`reviews/archived/artifact-plan-review-2026-09-24T144531Z.md`; a new plan
review must verify the revised artifact before the plan is marked ready.

The second gate review found that the audit task depended on a PR that will
not exist until after implementation, and that its private source lookup and
verification were too vague. The plan now makes `implementation.md` the task
output, uses stable vault note titles, requires separate provider rows and
source-status checks, and defers PR-body read-back to the final PR handoff.
That review is archived locally at
`reviews/archived/artifact-plan-review-2026-09-24T145158Z.md`.

The third gate review required pre-edit Astra capability provenance, the
Fumadocs project-doc update sequence, row-level audit validation, and artifact
ledger metadata cleanup. Those requirements are now explicit in `plan.md`.
Its review is archived locally at
`reviews/archived/artifact-plan-review-2026-09-24T150001Z.md`.

The fourth configured gate exited successfully with no Critical or High
findings. Its two Medium findings requested executable format commands and an
inline audit-table validator; both were added to the plan. The preserved
review is `reviews/archived/artifact-plan-review-2026-09-24T150841Z.md`.

---

## Astra Capability Evidence

Recorded before the p01-t01 catalog edit on 2026-09-24:

- The official OpenAI model page identifies the exact model as `gpt-6-astra`
  and documents `low`, `medium`, `high`, `xhigh`, and `max` reasoning efforts.
- The local Codex model cache was fetched at `2026-09-24T15:13:11.243882Z` by
  client `0.155.1`. Its `gpt-6-astra` entry reports `low`, `medium`, `high`,
  `xhigh`, `max`, and `ultra`.
- The sources agree on every admitted pair: `gpt-6-astra` at `low`, `medium`,
  `high`, `xhigh`, and `max`. `ultra` remains excluded by the project's
  explicit five-level product contract.

---

## Documentation Delta Analysis

Recorded before the p01-t02 documentation edit:

- The bundled recommendation and copied planning table currently end Codex
  Frontier with `gpt-6-sol/xhigh`, `gpt-6-sol/max`. The approved delta is
  `gpt-6-sol/xhigh`, `gpt-6-astra/high`, `gpt-6-astra/xhigh`; no Claude,
  Cursor, Economy, Balanced, or High cell changes.
- The dispatch-policy page currently describes GPT-6 Sol through `max` across
  High and Frontier. It must distinguish retained Sol `max` catalog support
  from the new Frontier preference, name Astra's five admitted efforts, and
  preserve populated user-owned cells during adoption.
- The updating-model-guidance page currently cites only GPT-6 Sol and Luna.
  It must add the official Astra model page and local Codex cache as capability
  evidence, while stating that catalog presence does not measure task quality.
- The Codex provider and evidence references currently have no Astra route.
  They must document Astra as an exact selectable Frontier candidate whose
  local task advantage is unmeasured and whose inclusion is a user-directed
  preference, not acceptance by the separate model-selection policy.
- Both pages already appear in their parent `## Contents` lists and neither
  page has its own `## Contents` section. Those authored links remain
  unchanged; only the generated root index is regenerated.

---

## Model Guidance Audit

Read-only audit performed on 2026-09-24 against the stable vault notes `Model
Selection`, `Model Decision Matrix`, `CHANGELOG`, `September frontier releases:
early evidence pass`, and `GPT-6 Astra comparator addendum (Codex)`.

| Provider | OAT route                                                                                                                                                                                                                        | Accepted route                                                                                                                                                                                | Source status                                                                                | Classification     |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------ |
| Codex    | Intelligent reconnaissance and default implementation use `gpt-6-sol/medium`; hard and consequential work use `gpt-6-sol/high`. The bundled Frontier ladder is now `gpt-6-sol/xhigh` → `gpt-6-astra/high` → `gpt-6-astra/xhigh`. | Intelligent reconnaissance uses GPT-5.6 Terra high, implementation uses Sol medium/high, and Astra medium/high remains evaluation-gated for hard reasoning, migration, and long-horizon work. | accepted 2026-09-08 baseline; review-pending 2026-09-23/24 release packet and Astra addendum | pending evidence   |
| Claude   | Intelligent reconnaissance uses `claude-opus-5-5/low`, default implementation uses `claude-opus-5-5/medium`, and hard or consequential work uses `claude-opus-5-5/high`.                                                         | Opus 5 medium covers intelligent reconnaissance and normal substantive work; Opus 5 high covers harder or consequential work.                                                                 | accepted 2026-09-08 baseline; review-pending 2026-09-23 release packet                       | separate follow-up |
| Cursor   | Intelligent reconnaissance can use `cursor-grok-4.5-medium`; normal implementation remains `gpt-5.6-sol-medium`; `cursor-grok-4.5-high` is a corroborated hard-reasoning alternative.                                            | Grok 4.6 medium is the provisional intelligent and normal Cursor-native route, with Grok 4.6 high for harder work and a live-selector requirement.                                            | accepted 2026-09-08 baseline; review-pending 2026-09-23 release packet                       | separate follow-up |

Bundled-tier reconciliation (twelve provider/tier rows):

- **Codex / Economy:** `gpt-6-luna/low`, `/medium`, `/high`. The accepted
  baseline uses GPT-5.6 Luna high only for bounded mechanical work; the GPT-6
  substitution is review-pending and classified as pending evidence.
- **Codex / Balanced:** `gpt-6-luna/xhigh`, `/max`. The accepted baseline has
  no corresponding Luna default above high; the GPT-6 release packet is
  review-pending, so this remains pending evidence.
- **Codex / High:** `gpt-6-sol/low`, `/medium`, `/high`. The accepted baseline
  uses GPT-5.6 Sol medium/high for implementation and harder work; the GPT-6
  family update is review-pending and classified as pending evidence.
- **Codex / Frontier:** `gpt-6-sol/xhigh`, `gpt-6-astra/high`,
  `gpt-6-astra/xhigh`. The accepted baseline permits Sol high/xhigh by depth
  and Astra medium/high only as evaluation-gated escalation. The Astra ladder
  is a user-directed exception, and its source status remains review-pending
  and pending evidence.
- **Claude / Economy:** `haiku`, `claude-sonnet-5/medium`. This matches the
  accepted Haiku mechanical route and conditional Sonnet throughput route;
  the accepted 2026-09-08 baseline makes the relationship intentional.
- **Claude / Balanced:** `claude-opus-5-5/low`. The accepted baseline starts
  intelligent work on Opus 5 medium. Opus 5.5 is review-pending, so the
  difference is a separate follow-up.
- **Claude / High:** `claude-opus-5-5/low`, `/medium`, `/high`. The accepted
  baseline uses Opus 5 medium/high for substantive and hard work. The 5.5
  family update is review-pending and remains a separate follow-up.
- **Claude / Frontier:** `claude-opus-5-5/xhigh`, `/max`,
  `claude-fable-5-1/high`. The accepted baseline keeps Opus 5 high primary,
  raises effort only for demonstrated depth, and treats Fable as an evaluated
  specialist. Opus 5.5 is review-pending; reconciliation is a separate
  follow-up.
- **Cursor / Economy:** `composer-2.5`, `gpt-5.6-luna-high`,
  `gpt-5.6-luna-xhigh`. Composer matches the accepted bounded operational
  route. Luna is not the accepted Cursor mechanical default, so exact native
  selectors need current verification; this is an intentional retained OAT
  tier with a selector-verification limit.
- **Cursor / Balanced:** `cursor-grok-4.5-high`, `gpt-5.6-terra-high`. The
  accepted baseline uses Grok 4.6 medium/high and permits live-verified Terra
  high. OAT's older Grok family is a separate follow-up under the accepted
  2026-09-08 baseline.
- **Cursor / High:** `gpt-5.6-sol-medium`, `gpt-5.6-sol-high`. This matches the
  accepted live-verified Sol implementation route and is intentional under the
  accepted 2026-09-08 baseline.
- **Cursor / Frontier:** `gpt-5.6-sol-xhigh`, `gpt-5.6-sol-max`,
  `claude-fable-5-thinking-high`. The accepted baseline permits Sol escalation
  by depth but requires live verification for cross-family selectors and does
  not infer Cursor Fable qualification from direct-provider availability. The
  remaining selector scope is a separate follow-up.

- Official Codex capability data and the local model cache establish Astra's
  exact selectable efforts; they do not establish a task-quality advantage.
  The user-directed Frontier preference is therefore an OAT product exception,
  not a change to the accepted vault policy.
- The review-pending Astra comparator is exposed author analysis, not an
  independent result. Its disposition retains Astra as an evaluation-gated
  escalation and makes no global or default-route promotion.
- The Claude and Cursor differences are recorded without changing either
  provider's ladder. Cursor's direct-provider model names do not establish
  Cursor selector syntax or resolved identity; each mapping still requires a
  current native-catalog or hook probe that detects silent fallback.

---

## Phase 1: Codex Astra Frontier

**Status:** completed
**Started:** 2026-09-24

**Outcome:** Codex now supports five exact Astra effort pins and recommends
Sol xhigh, Astra high, and Astra xhigh in Frontier. Sol max remains selectable.
Generated agent views, bundled assets, versions, tests, and docs were updated.
The read-only vault audit above records the intentionally divergent policy.

**Verification:** All prescribed gates exited 0. The evidence-grade test run
executed 10/10 Turbo tasks without cache replay, including 7,532 CLI tests.
The later `pnpm test` and docs build replayed successful cached results. Sync
dry-run reported zero planned operations. `git diff --check` passed for the
phase range. The independent p01 review had no Critical or High findings; its
one Medium docs/test alignment finding was corrected in `b8834e1fa`.

### Task p01-t01: Admit Astra to the Codex supported catalog

**Status:** completed
**Commit:** `6e0732f55`

The catalog and resolver tests cover Astra low through max, reject ultra, and
retain Sol max. Official model documentation and the local runtime cache were
recorded above before the catalog edit. Focused tests: 172 passed.

### Task p01-t02: Update the Frontier recommendation and guidance

**Status:** completed
**Commit:** `bb46093d5`

The bundled order and human guidance now reflect the user-directed Astra
Frontier choice. Claude and Cursor ladders stayed unchanged; populated user
cells remain preserved. Focused tests: 423 passed; skill validation and docs
checks passed.

### Task p01-t03: Regenerate projections and validate the release

**Status:** completed
**Commit:** `297610e4c`

Ten generated Astra roles and registration entries match the exact model and
effort pairs. The five public packages were bumped together to 0.3.3.
Release, build, lint, format, sync parity, and test gates passed. Mechanical
count/version test and configuration-doc updates followed the expanded
catalog; stale expectations were corrected before the task commit.

### Task p01-t04: Record the model-guidance alignment audit

**Status:** completed
**Commit:** `b00fa8d38`; bounded recovery `645312b46`

The audit distinguishes accepted guidance, review-pending research, and OAT's
user-directed exception. A post-commit root audit found that the first version
omitted explicit Economy/Balanced/High/Frontier reconciliation. Recovery
attempt 1/10 added all twelve provider/tier comparisons. The exact table
validator and formatting checks passed before and after the recovery commit.

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

### Run 1 — 2026-09-24, feat/codex-astra-frontier

- Phase p01 implementer request: `astra-p01-20260924`; base
  `f03834c1d`, terminal phase head `645312b46`; four task commits plus one
  recovered audit-completeness correction.
- Tier 1 native role: `oat-phase-implementer-gpt-5-6-sol-high`, under the
  project's managed High ceiling. Classification: default implementation,
  preferred effort high, because the phase spans catalog, recommendation,
  generated roles, release validation, and policy reconciliation.
- Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high
- Phase outcome: implementation verified; independent p01 review received and
  its single Medium finding corrected.
- Phase review: `reviews/archived/p01-review-2026-09-24T155712Z.md` reviewed
  head `4440e2cb22b81693dc7016e432ae51383af8098a`; 0 Critical, 0 High,
  1 Medium. The stale provider-sync catalog description and count assertion
  were fixed in `b8834e1fa`. Focused 242-test suite, `pnpm check`, and
  `pnpm build:docs` exited 0 after the correction.
- Root-inline phase review correction: p01; the original phase implementer
  had completed its run, and the Medium finding was a two-file docs/test
  correction within the approved scope. Root Codex GPT-6 applied the bounded
  fix and left the final independent review to cover its new commit.
- Recovery: `astra-p01-20260924-p01-t04-recovery-01` completed in
  `645312b46`, attempt 1/10; root validated the original and recovery commits,
  completed marker, clean worktree, and task-local check evidence before
  clearing the pending marker.
- Outstanding: final review and configured final gate, PR handoff.

<!-- orchestration-runs-end -->

---

## Implementation Log

### 2026-09-24

- `6e0732f55` — admitted five exact Astra efforts to the Codex catalog and
  verified role expansion and lower preferred effort resolution.
- `bb46093d5` — changed only Codex Frontier recommendations and updated
  provider guidance and docs.
- `297610e4c` — generated ten Astra roles, synchronized the bundle, bumped
  all five public packages, and completed the full gate set.
- `b00fa8d38` and `645312b46` — recorded the provider audit and completed its
  twelve-tier reconciliation through the bounded recovery ledger.
- `b8834e1fa` — corrected the provider-sync count and max-effort documentation
  found by the p01 review; focused tests and docs checks passed.
- Final independent review found no Critical or High product findings. Its
  single Medium lifecycle-artifact consistency finding is resolved in the
  closeout bookkeeping before the configured exit gate.
- The configured cross-runtime exit gate passed with zero Critical, High, or
  Medium findings. Its two Low wording findings were addressed in the plan
  review note and Codex provider guidance without another review run; see
  `reviews/archived/final-review-2026-09-24T162937Z.md`.

### Review Received: final configured gate

**Date:** 2026-09-24

**Review artifact:** `reviews/archived/final-review-2026-09-24T162937Z.md`

**Findings:** 0 Critical, 0 High, 0 Medium, 2 Low.

**Disposition:** Both Low findings addressed now. The plan note names the
fourth plan artifact gate explicitly, and the Codex guidance lead distinguishes
routine Sol/Luna routing from Astra's supported Frontier candidacy. No fix
tasks or deferred findings were added.

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review    | Source Artifact | Planned / Documented                      | Actual / Accepted                                                         | Reason                      | Source of Truth             | Follow-up |
| ---------------- | --------------- | ----------------------------------------- | ------------------------------------------------------------------------- | --------------------------- | --------------------------- | --------- |
| p01-t04 recovery | `plan.md`       | Audit every bundled tier                  | First audit summarized task classes; recovery added all twelve tier cells | Complete the declared audit | `implementation.md`         | None      |
| p01 review       | `plan.md`       | Generated provider guidance stays current | Provider-sync count and max-effort prose corrected in `b8834e1fa`         | Align a copied consumer     | Catalog and generated roles | None      |

## Test Results

Track test execution during implementation.

| Phase          | Tests Run                     | Passed                                 | Failed | Coverage                                                 |
| -------------- | ----------------------------- | -------------------------------------- | ------ | -------------------------------------------------------- |
| p01            | Fresh uncached Turbo test run | 10/10 tasks, including 7,532 CLI tests | 0      | Workspace suites; later cached replays stated separately |
| p01 review fix | Focused skill validation      | 242 tests                              | 0      | Provider-sync docs contract                              |

## Final Summary (for PR/docs)

**What shipped:**

- Added `gpt-6-astra` at `low`, `medium`, `high`, `xhigh`, and `max` to both
  Codex phase-implementer and reviewer catalogs.
- Changed only the Codex Frontier recommendation to Sol `xhigh`, Astra `high`,
  and Astra `xhigh`, with exact terminal order and user-cell preservation.
- Generated and registered the ten Astra role variants, refreshed bundled
  recommendation assets, and advanced the public package set to `0.3.3`.
- Updated model-guidance and provider-sync documentation, corrected its
  catalog-count contract test, and recorded all twelve bundled-tier comparisons
  against accepted and review-pending vault guidance.

**Behavioral changes (user-facing):**

- Codex dispatch can now bind exact Astra model/effort pairs for phase
  implementation and review, while recommendation adoption preserves every
  populated user-owned cell.

**Key files / modules:**

- `packages/cli/src/providers/codex/codec/shared.ts` - canonical Astra effort
  catalog entries.
- `packages/cli/config/dispatch-matrix-recommendation.json` - canonical
  Frontier recommendation.
- `.codex/agents/` and `.codex/config.toml` - generated Astra roles and project
  registrations.
- `.agents/skills/subagent-orchestration/` - dated capability and routing
  guidance.
- `apps/oat-docs/docs/` - approved public model-guidance updates.

**Verification performed:**

- Focused Codex catalog, recommendation, generated-bundle, and documentation
  checks passed, including 242 tests after the provider-sync review fix.
- The repository check, type-check, test, build, skill-version, release-version,
  release-validation, docs-build, lint, and format gates passed. A full test run
  executed 10/10 Turbo tasks uncached and passed 7,532 CLI tests; later
  reruns included cache replay and were not counted as fresh evidence.
- Project sync dry-run reported zero pending changes after generation.

**Design deltas (if any):**

- This quick project has no separate design artifact. Astra `ultra` remains
  excluded by the explicit five-level product contract, and accepted vault
  guidance remains unchanged pending independent evaluation.

## References

- Plan: `plan.md`
- Discovery: `discovery.md`
- Spec and design: not applicable to this quick workflow
