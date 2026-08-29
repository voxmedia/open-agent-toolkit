---
oat_status: complete
oat_ready_for: oat-project-summary
oat_blockers: []
oat_last_updated: 2026-08-29
oat_current_task_id: null
oat_generated: false
---

# Implementation: portable-agent-references

**Started:** 2026-08-28
**Last Updated:** 2026-08-29 (both phases passed; final review passed)

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase   | Status   | Tasks | Completed |
| ------- | -------- | ----- | --------- |
| Phase 1 | complete | 6     | 6/6       |
| Phase 2 | complete | 2     | 2/2       |

**Total:** 8/8 tasks completed

---

## Phase 1: Global Ratchet and Portable Callers

**Status:** complete
**Started:** 2026-08-29

### Phase Summary (fill when phase is complete)

**Outcome (what changed):**

- The user-default portability ratchet is now manifest-driven: it derives skill
  and agent assets from `PACK_MANIFEST` and classifies cross-skill `SKILL.md`
  reads plus file- and directory-form targets at or below `references/`.
- All nine canonical callers (6 skills, 3 agents) resolve dependencies through
  installed roots: loaded → user → project for skills, user → project for agents.
- The `oat-phase-implementer` bare-path exemption in `skills.test.ts` is gone,
  replaced by the same positive portable assertions the skill consumers use.
- The temporary migration inventory was introduced with 21 exact entries and
  drained to zero; only the 6 pre-existing non-executable historical entries remain.

**Key files touched:**

- `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts` - the ratchet itself
- `packages/cli/src/validation/skills.test.ts` - caller contract assertions, exemption removal
- `packages/cli/src/commands/sync/index.test.ts` - provider materialization contract
- `.agents/skills/{oat-dispatch-subagents,oat-repo-improve,oat-review-provide-remote,analyze,compare,oat-project-review-provide}/SKILL.md` - ported callers
- `.agents/agents/{oat-phase-implementer,oat-reviewer,oat-codebase-mapper}.md` - ported agent references

**Verification:**

- Run: `pnpm check`, `pnpm type-check`, `pnpm test`, `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`
- Result: all exit 0 at the phase head `52745ef93`, independently re-run by the
  root orchestrator. Authoritative test evidence is uncached and HOME-isolated;
  see the Test Results footnote below for the exact command and the recorded
  host-HOME caveat.

**Notes / Decisions:**

- One in-phase recovery (`rec-p01-01`): a stale `oat-reviewer` version pin at
  `review-skill-contracts.test.ts:65` outside p01-t05's declared boundary,
  corrected `1.2.0` → `1.2.1` in append-only commit `f8a89ce9e`.
- Release gates (`release:check-versions`, `release:validate`, `build:docs`) and
  `oat sync` provider-view refresh are deliberately deferred to p02-t02.

### Task p01-t01: Generalize the user-default portability ratchet

**Status:** complete
**Commit:** `7ff15e66c` (+ review fix `7f7dd6cfc`)

---

### Task p01-t02: Port utility-pack cross-skill reads

**Status:** complete
**Commit:** `3c6d7ea57`

### Task p01-t03: Port research-pack cross-skill reads

**Status:** complete
**Commit:** `d545bcf51`

### Task p01-t04: Port workflow review-provider references

**Status:** complete
**Commit:** `032970a98`

### Task p01-t05: Port user-default agent references and remove the exemption

**Status:** complete
**Commit:** `97431c4ff` (+ recovery `f8a89ce9e`)

### Task p01-t06: Finalize the zero-debt portability invariant

**Status:** complete
**Commit:** `7025a7855`

---

## Phase 2: Documentation, Packaging, and Release Validation

**Status:** complete
**Started:** 2026-08-29

### Task p02-t01: Document the global skill-and-agent portability contract

**Status:** complete
**Commit:** `ac4612ae5` (+ review fixes `223b22159`, `fa9d6e37d`)

### Task p02-t02: Refresh shipped assets and validate the lockstep release

**Status:** complete
**Commit:** `69d011bbc`

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

### Run 1 {#run-1}

- **Started:** 2026-08-29
- **Branch:** `feat/portable-agent-references`
- **Tier:** 1 (subagents)
- **Dispatch policy:** managed / high (claude → `opus`), source: project state
- **Phase base HEAD:** `d2db10afd61b81942004f1b550f2d9c39cad1836`
- **Schedule:** `[p01]` → `[p02]` (sequential; HiLL checkpoint after `p02`)
- **Phases planned:** 2 | passed: 0 | failed: 0 | stopped: 0

#### Dispatch Record `dispatch-par-run1-p01-impl`

```yaml
request_id: dispatch-par-run1-p01-impl
caller: oat-project-implement
scope: p01
objective: Implement Phase 1 (Global Ratchet and Portable Callers), tasks p01-t01..p01-t06
action: implementation
role_name: oat-phase-implementer
role_class: worker
provider: claude
dispatch_context: root-native
dispatch_policy: high
dispatch_ceiling: opus
catalog_snapshot:
  id: root-native-run1-1
  source: tool-schema
  observed_at: 2026-08-29T00:10:00Z
authority: write-repo-worktree
role_selector: oat-phase-implementer
model_selector: opus
model_selector_granularity: tier-alias
effort_selector: not-exposed
reasoning_mode_selector: null
service_tier_selector: standard
guidance_reference: subagent-orchestration/references/provider-claude.md
guidance_version: 2026-07-25
guidance_verified_at: 2026-07-25
guidance_status: fresh
selection_source: native-default
candidates_considered:
  - opus
  - sonnet
  - haiku
selection_reason: native-catalog
selected_route: native
task_class: default-implementation
model_class_floor: default-implementation
classification_source: caller
classification_reason: >-
  Phase 1 reconciles dispersed context (PACK_MANIFEST user-default assets,
  canonical skill/agent Markdown, historical baseline, and a new migration
  inventory) inside one independently bounded scope; the plan already resolved
  the design ambiguity, so reasoning difficulty does not dominate.
floor_satisfaction: satisfied
deadline_seconds: null
retry_limit: 2
payload:
  subagent_type: oat-phase-implementer
  model: opus
launch_status: pending
child_outcome: pending
configured_invocation_evidence:
  - resolver: oat project dispatch-ceiling resolve --provider claude --role implementer --ceiling-tier high --candidate-model opus --task-class default-implementation --orchestrator-tier high --escalation-level 0 --report-scope p01 --report-action implementation
  - selectionMode: candidate
  - selectionBranch: candidate-requested
runtime_confirmation: not-reported
diagnostics: []
continuation_events: []
```

**Dispatch stamp:** `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=opus`

#### Phase Outcomes

| Phase | Implementer | Tasks | Review                                         | Fix rounds      | Result     |
| ----- | ----------- | ----- | ---------------------------------------------- | --------------- | ---------- |
| p01   | opus        | 6/6   | r1 0C/2I/3M/4m; r2 0C/1I/2M/3m; r3 0C/0I/2M/1m | 1 (`7f7dd6cfc`) | **passed** |

#### Parallel Groups

None (sequential plan).

#### Review Rounds — p02

| Round | Artifact                                            | Head        | Findings          | Disposition                                                                                                |
| ----- | --------------------------------------------------- | ----------- | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| 1     | `reviews/archived/p02-review-2026-08-29T080559Z.md` | `69d011bbc` | 0C / 1I / 1M / 1m | I root-owned bookkeeping, fixed in `03db89f00`; M1+m1 docs accuracy, fixed in `223b22159` then `fa9d6e37d` |
| 2     | `reviews/archived/p02-review-2026-08-29T081859Z.md` | `fa9d6e37d` | 0C / 0I / 1M / 1m | **PASSED** at the Critical/Important threshold; residual bookkeeping closed in the following commit        |

The p02 minor finding `m1` took two attempts and is worth recording as
evidence. Round 1 asserted that only the `workflows` pack ships agents, citing
`pack-manifest.ts:225-229`. The first fix (`223b22159`) verified the cited half
of that claim — that `utility` is skills-only — and wrote "shipped by
`workflows`" into the docs. That replaced a vague claim with a precise false
one: the `research` pack also ships `agent('skeptical-evaluator.md')` at
`pack-manifest.ts:320`. The root caught it during fix validation by sweeping
every `agent(` call site rather than reading the cited range, and `fa9d6e37d`
corrected it to cover any agent-shipping pack. Exhaustiveness is now
established structurally: `kind: 'agent'` occurs exactly once in non-test
source, inside the `agent()` helper, so its two call sites are the only
construction path.

#### Review Rounds

| Round | Artifact                                            | Head        | Findings          | Disposition                                                             |
| ----- | --------------------------------------------------- | ----------- | ----------------- | ----------------------------------------------------------------------- |
| 1     | `reviews/archived/p01-review-2026-08-29T000007Z.md` | `f8a89ce9e` | 0C / 2I / 3M / 4m | I2 fixed in `7f7dd6cfc`; I1 resolved by root bookkeeping in `de611286a` |
| 2     | `reviews/archived/p01-review-2026-08-29T040642Z.md` | `7f7dd6cfc` | 0C / 1I / 2M / 3m | all root-owned bookkeeping; resolved in `52745ef93`                     |
| 3     | `reviews/archived/p01-review-2026-08-29T074543Z.md` | `52745ef93` | 0C / 0I / 2M / 1m | **PASSED** at the Critical/Important threshold                          |

Round 2's Important and both Mediums were defects in root-owned project
artifacts, not in phase code:

- `state.md` still read `oat_current_task: p01-t01` / `oat_last_commit: null`
  while `implementation.md` read `p02-t01`. Two authoritative resume pointers
  disagreed and the stale one aimed at a completed task. Corrected.
- The review fix commit `7f7dd6cfc` appeared in no ledger. Now recorded on the
  p01-t01 row and in the Review Rounds table above.
- The Phase 1 Test Results row asserted a clean `pnpm test` that had in fact
  been read off a Turborepo cache replay. Corrected with authoritative uncached
  evidence and an explicit caveat.

#### Phase 2 Summary

**Outcome (what changed):**

- The portability contract is documented for contributors: the two distinct
  candidate orders, independent dependency roots, exact historical baselines,
  and pack-specific fail-closed recovery.
- Shipped provider assets were regenerated through `oat sync --scope all`,
  so 29 Codex and 36 Cursor materialized role views now carry the portable
  two-step resolver instead of bare `.agents/skills/...` reads.
- The five lockstep public packages were released together, `0.2.39` → `0.2.41`.
  (Originally `0.2.40`; re-bumped after PR #229 merged and claimed `0.2.40`
  on `main` first — see the release-version note below.)

**Key files touched:**

- `apps/oat-docs/docs/contributing/skills.md`, `apps/oat-docs/docs/cli-utilities/tool-packs.md` - contributor documentation
- `.codex/agents/*.toml`, `.cursor/agents/*.md` - regenerated materialized role views
- `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `.oat/sync/manifest.json` - lockstep release

**Verification:**

- Run: the plan's ordered 11-gate sequence, plus root re-verification under an
  isolated `HOME` with `pnpm exec turbo run test --force`.
- Result: all gates exit 0. The test run was genuinely uncached
  (`replay markers: 0`, `Cached: 0 cached, 10 total`). Independently, all 66
  generated agent view files scanned with the ratchet's own matcher yielded
  0 non-portable cross-skill reads.

**Notes / Decisions:**

- `tool-packs.md` was modified under the plan's explicit conditional. The
  reviewer independently judged the condition met: the pre-existing mixed-scope
  paragraph states one three-step order, and `workflows` ships agents through
  that same install path which cannot use the loaded-scope step.
- Release version: originally `0.2.40`, following PR #226's precedent for the
  same class of change. During final closeout `origin/main` advanced when
  PR #229 merged carrying `bf84fdcac chore(release): bump lockstep public
packages to 0.2.40`, so `0.2.40` was no longer strictly greater than main
  and `release:check-versions` correctly failed. Re-bumped all five packages
  to `0.2.41`. `packages/cli/assets/public-package-versions.json` was
  regenerated by `bundle-assets.sh` rather than hand-edited, and the CLI was
  rebuilt before re-running `oat sync` so `.oat/sync/manifest.json`
  `oatVersion` picked up `0.2.41` from `OAT_VERSION`.
  `origin/main` was merged rather than rebased, deliberately: a rebase would
  rewrite every commit SHA this ledger records as reviewed heads, task
  commits, and recovery provenance.
- PR #226's precedent for the same class of
  change. The bump was mandatory, not discretionary: AGENTS.md counts
  `.agents/skills` and `.agents/agents` changes as shipped CLI functionality.
- The lockfile was correctly left untouched; internal deps use `workspace:*`.

#### Outstanding Items

- None blocking. Phase 1 passed code review at the Critical/Important
  threshold on round 3 (`reviews/archived/p01-review-2026-08-29T074543Z.md`).
- Round 3's remaining 2 Medium / 1 Minor were root-owned artifact alignment
  (stale `state.md` prose, a gate attribution naming `f8a89ce9e` instead of the
  phase head, and a stale `Last Updated`); all closed in the bookkeeping commit
  that follows round 3.
- Deferred to p02 (recorded, non-blocking): Medium — provider materialization
  proven for Codex only; Medium — bare `.agents/agents/*.md` reads surviving in
  `oat-project-review-provide/SKILL.md:892`; Medium — sibling paths outside
  `references/` unenforced.
- Follow-up candidate (Minor, round 2): `packages/cli/src/validation/skills.test.ts:4695`
  carries a duplicate of the pre-fix matcher and still has the single-`../`
  blind spot closed in `7f7dd6cfc`. Harmless today because all four canonical
  agents sit in `defaultScope: 'user'` packs and are covered by the widened
  canonical matcher, but the duplicate will drift.

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-08-28

- Quick-workflow discovery, lightweight design, and eight-task plan prepared.
- High managed dispatch policy selected.
- Additional implementation phase-gate review explicitly disabled.
- No implementation tasks executed yet; `p01-t01` remains the next task.

### Artifact Review Received: plan

**Date:** 2026-08-28
**Review artifact:**
`reviews/archived/artifact-plan-review-2026-08-28T223052Z.md`

**Findings:** 0 Critical, 1 Important, 1 Medium, 5 Minor

**Disposition:** All seven findings were resolved directly in lifecycle
artifacts with user confirmation. No implementation tasks were added.

- I1: provider verification now materializes canonical agents into a temporary
  sync-harness root before inspecting generated roles.
- M1: the ratchet now includes file-form and directory-form `references/`
  targets.
- m1-m5: root-bound short forms, ledger provenance, state metadata, the
  disabled phase-gate choice, and conditional version-pin creation are now
  explicit.

**Next:** Run the single authorized Claude Fable artifact re-review.

### Artifact Re-review Received: plan

**Date:** 2026-08-28
**Review artifact:**
`reviews/archived/artifact-plan-review-2026-08-28T224908Z.md`

**Gate result:** Passed at the Important threshold with 0 Critical,
0 Important, 1 Medium, and 2 Minor findings.

**Disposition:** With user confirmation, all three non-blocking findings were
resolved in the design and plan without another review cycle.

- M1: temporary materialization now copies canonical agent sources into the
  temporary project/assets root and forbids direct reads from the gitignored
  bundled-agent directory.
- m1: artifact-review ledger cells use `-` for code-only invocation fields.
- m2: the artifacts now state that caller-contract assertions, not the scanner,
  enforce short-form anchoring.

**Next:** Execute `p01-t01` through `oat-project-implement`.

---

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact | Planned / Documented | Actual / Accepted | Reason | Source of Truth | Follow-up |
| ------------- | --------------- | -------------------- | ----------------- | ------ | --------------- | --------- |
| -             | -               | -                    | -                 | -      | -               | -         |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | 290 files | 290    | 0\*    | n/a      |
| 2     | 290 files | 290    | 0\*\*  | n/a      |

\*\* Phase 2 row measured at the p02 head `fa9d6e37d` under the same
authoritative method, and again at `b4c71f790` for final verification:
`HOME=$(mktemp -d) pnpm exec turbo run test --force` → exit 0,
`Cached: 0 cached, 10 total`, 0 replay markers. The same host-HOME caveat
below applies unchanged.

\* Authoritative uncached, HOME-isolated run at `7f7dd6cfc`:
`HOME=$(mktemp -d) pnpm exec turbo run test --force` → exit 0,
`Cached: 0 cached, 10 total`, 290/290 CLI test files passed.

Caveat, recorded deliberately: on a host whose real `$HOME` contains
`~/.oat/templates/` (any maintainer with a user-scope OAT install), `pnpm test`
additionally fails 3 tests across `src/commands/backlog/new.test.ts` and
`src/commands/pjm/init.test.ts`. Those are pre-existing and unrelated to p01 —
this phase's commit range touches nothing under `backlog/`, `pjm/`, or
`assets/` — and they are fixed separately on PR #229 against `main`. An earlier
revision of this row claimed a clean `pnpm test` with no caveat; that reading
came from a Turborepo cache replay (`>>> FULL TURBO`) rather than an executed
run, and is corrected here.

## Final Summary (for PR/docs)

**What shipped:**

- A manifest-driven portability ratchet covering the entire user-default asset
  surface. It derives skill _and_ agent assets from `PACK_MANIFEST` and
  classifies cross-skill `SKILL.md` reads plus file- and directory-form targets
  at or below `references/`, across backticked, plain, Markdown-link, `./`,
  `../`, and repeated-parent spellings.
- All nine canonical callers ported to installed-scope resolution: six skills
  use loaded → user → project, and three agents use user → project, because no
  provider exposes a stable loaded-agent source directory.
- The `oat-phase-implementer` bare-path exemption removed and replaced with the
  same positive portable assertions its consumers use.
- Zero portable-reference debt as an enforced invariant: a temporary migration
  inventory of 21 exact entries was introduced and drained to zero, leaving only
  the six pre-existing non-executable historical entries.
- The contract documented for contributors, shipped provider views regenerated,
  and the five public packages released together as `0.2.41`.

**Behavioral changes (user-facing):**

- Cross-skill and agent-to-skill references in shipped assets now resolve when
  a pack is installed at user scope, instead of dangling on a repo-relative
  path.
- Generated Codex and Cursor role views carry the portable two-step resolver
  with independent per-dependency root bindings and pack-specific fail-closed
  recovery commands.
- A new non-portable reference added to any user-default skill or agent now
  fails the contract test with exact `source -> target` evidence.

**Key files / modules:**

- `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts` - the ratchet: matcher, manifest-derived surface, historical baseline, zero-debt invariant
- `packages/cli/src/validation/skills.test.ts` - caller contract assertions; exemption removal
- `packages/cli/src/commands/sync/index.test.ts` - provider materialization contract (Codex surface)
- `.agents/skills/{oat-dispatch-subagents,oat-repo-improve,oat-review-provide-remote,analyze,compare,oat-project-review-provide}/SKILL.md` - ported skill callers
- `.agents/agents/{oat-phase-implementer,oat-reviewer,oat-codebase-mapper}.md` - ported agent callers
- `apps/oat-docs/docs/contributing/skills.md`, `apps/oat-docs/docs/cli-utilities/tool-packs.md` - contract documentation
- `.codex/agents/*.toml`, `.cursor/agents/*.md`, `.oat/sync/manifest.json`, five `package.json` files, `packages/cli/assets/public-package-versions.json` - regenerated views and the lockstep release

**Verification performed:**

- Full CI gate list in CI's order, uncached and HOME-isolated at the final head:
  `pnpm check`, `pnpm type-check`, `pnpm exec turbo run test --force`,
  `pnpm build`, `pnpm run check:skill-bumps`, `pnpm release:check-versions`,
  `pnpm release:validate`, `pnpm build:docs` — all exit 0, with
  `Cached: 0 cached, 10 total` and zero cache-replay markers.
- Mutation testing of the ratchet, twice and independently: reverting a ported
  agent file, and injecting a bare read into `oat-codebase-mapper.md`, each
  failed the suite with exact `source -> target` evidence; worktree restored
  clean both times.
- End-to-end confirmation on the shipped artifact: all tracked generated agent
  views scanned with the ratchet's own matcher yield 0 non-portable reads.
- Historical-baseline honesty: `PINNED_HISTORICAL_CROSS_SKILL_READS` verified
  byte-identical to the base commit across every phase commit, proving live debt
  was drained rather than reclassified into the baseline.

**Design deltas (if any):**

- `plan.md` p01-t05 and `design.md` originally implied per-provider
  materialization coverage. Shipped coverage gates the Codex surface only;
  Claude and Cursor views rely on manual regeneration plus the
  `oat sync --scope all --dry-run` drift check. Accepted as artifact alignment
  (final review M1): the implementation is defensible and the shipped
  documentation already disclosed the limit honestly, so both artifacts were
  corrected to match. Broadening the sync contract test to a second adapter is a
  recorded follow-up.
- `tool-packs.md` was edited under the plan's explicit conditional. The reviewer
  independently confirmed the condition was met.

### Review Received: final

**Date:** 2026-08-29
**Review artifact:** `reviews/archived/final-review-2026-08-29T082359Z.md`

**Findings:** 0 Critical, 0 Important, 3 Medium, 5 Minor

**Disposition:** No fix tasks added. Zero Critical/Important. With user
approval at the final HiLL checkpoint:

- **M1 — artifact_alignment_required, resolved now.** `plan.md` p01-t05 and
  `design.md` implied per-provider materialization coverage while shipped
  coverage gates Codex only. The implementation is defensible and
  `apps/oat-docs/docs/contributing/skills.md` already disclosed the limit
  honestly, so both lifecycle artifacts were corrected to match rather than
  changing code. Implementation is source of truth.
- **M2, M3 — explicit_deferral.** See Deferred Findings (Medium) below.
- **m1, m2 — explicit_deferral.** See Deferred Findings (Minor) below.
- **m3, m4 — resolved in flight** in `7c3ebf496`, after the reviewed head.
- **m5 — converted and resolved:** the Final Summary above is now filled.

**Review cycle:** 1 of 3.

**Next:** Final review marked `passed`; continue to closeout.

## Deferred Findings (Medium)

Dispositioned at final review with user approval; none blocking.

- **M2 — bare `.agents/agents/*.md` reads in user-default skills.** Nine sites
  across five skills in two packs, four executable. The ratchet structurally
  cannot see this path shape. Deferred: nothing breaks while `.agents/agents/`
  exists at project scope, and a correct fix requires inventing a portable
  agent-read convention that does not yet exist. Captured as
  `BL-260829-unified-agent-provider-root` plus a scaffolded project at
  `.oat/projects/shared/agent-provider-root` with seeded discovery.
  Follow-up trigger: any new bare agent read, or the first report of a
  user-scope resolution failure.
- **M3 — sibling paths outside `SKILL.md` and `references/` unenforced.**
  Deferred: the reviewer re-derived with a broadened matcher and found zero live
  cross-skill violations. This is missing enforcement breadth, not a live defect.
  Follow-up trigger: first live instance, or the `BL-260829` matcher work.

## Deferred Findings (Minor)

- **m1 — duplicate weaker matcher at `packages/cli/src/validation/skills.test.ts:4695`.**
  Deferred: redundant, since the canonical ratchet already scans those same four
  agent files with the stronger pattern. No coverage hole today.
- **m2 — matcher cannot see prefixed skills-root spellings** such as
  `$PWD/.agents/skills/...` or `$REPO_ROOT/.agents/skills/...`. The negative
  lookbehind that lets portable `${HOME}/.agents/skills` pass also suppresses
  these non-portable forms. Zero live instances. Deferred and folded into
  `BL-260829`, whose suggested fix — an allowlist of accepted root variables
  instead of a blanket lookbehind — is the same matcher work.

Resolved in flight, after the reviewed head `b4c71f790`: **m3** (stale
`Last Updated` header) and **m4** (unattributed Phase 2 test-results row) were
both corrected in `7c3ebf496`. **m5** (template Final Summary) is resolved by
this section.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
