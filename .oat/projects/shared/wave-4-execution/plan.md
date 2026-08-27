---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-08-27
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p01'] # final (only) phase; workflow.hillCheckpointDefault=final
oat_auto_review_at_hill_checkpoints: true # from workflow.autoReviewAtHillCheckpoints
oat_plan_parallel_groups: [] # solo lane — one ungrouped phase (validate-plan rejects singleton groups)
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: wave-4-execution (Wave 4 external-plan wrapper)

> Execute this plan using `oat-project-implement` — one ungrouped phase
> executed sequentially. Concurrency ceiling: 3 worktrees (operator decision);
> this wave uses 1.

**Goal:** Execute the 1 Wave 4 external plan (route `codex-skill` through the
current Codex provider guidance and make the repository-check bypass
conditional) through the wave→project wrapper pattern
(DR-260713-wave-project-wrapper-over).

**Architecture:** Thin wrapper. The task's **entire and only implementation
contract** is its external plan under `.oat/repo/reference/external-plans/`. The
task below carries wrapper-owned metadata exclusively: the source-plan path,
ordering/dependencies, wrapper-level verification gates, the commit convention, and
review mapping. Nothing in this file restates, narrows, or overrides the source plan.

**Commit Convention:** `{type}(p{NN}-t{NN}): {description}` — the external plan
governs commit content and granularity; the wrapper adds the `pNN-tNN` scope.

**Wrapper execution contract (applies to every task):**

1. **Drift check first.** Run the source plan's `## Drift check` against current
   HEAD (plus the rule-1 addendum below). A material mismatch (per that plan's own
   definition) is a STOP. The wave-boundary drift refresh (see record below) does
   not replace the in-worktree re-check.
2. **Execute the source plan's `## Implementation steps`** in order with each
   step's embedded Verify gate; honor its `## STOP conditions` verbatim (the
   second condition is already reconciled by the operator — see the record).
3. **Confirm the source plan's `## Done criteria`**, then run the full DoD gates
   in this order, invoking each gate literally and capturing each exit code to a
   log file: `pnpm check`, `pnpm type-check`, `pnpm test`, `pnpm build`,
   `pnpm run check:skill-bumps`, `git fetch origin` then `pnpm release:check-versions`,
   `pnpm release:validate`, `pnpm build:docs`, then `pnpm lint` and `pnpm format`
   (required: this wave touches `.agents/skills`). Run `git fetch origin && pnpm
release:check-versions` again immediately after the task commit and record
   that exit code (the gate is committed-state-only — W3 rule). Toolchain:
   Node 22.17.0 / pnpm 10.13.1; `pnpm run worktree:init` already ran.
4. **STOP → BLOCKED at phase level.** A source-plan STOP parks the phase (record
   in `state.md` `oat_blockers` + `implementation.md`).
5. **Group-dependency rule:** not applicable (single phase).
6. **Merge serialization:** not applicable (the phase runs on the integration
   checkout; no phase worktree merges).
7. **Backlog archival is NOT part of the task** — once, serialized on the
   integration branch after the phase passes (DR-260713-shared-tracked-surfaces).
8. **Phase review checklist = the source plan's `## Review focus`, plus two
   bounded reviewer-run mutation probes on the focused contract test:**
   reintroduce the stale fixed model pair, and separately reintroduce the
   blanket repository-check bypass; each mutation must make the test fail;
   restore the intended content byte-exact and rerun the test green. A finding
   that names a regression class triggers a repository-wide sweep (W3 rule).
9. **Artifact hygiene:** every agent runs `pnpm exec oxfmt --write <file>` on
   markdown it writes and reports observations for `orchestration-log.md`
   (workers report; the root appends).
10. **Commit verification after ambiguous results:** inspect `git log`/HEAD before
    retrying; record the SHA in `implementation.md`.

## Parallelism

None — one phase, executed sequentially on the integration checkout.

> The recon observations below are **non-authoritative grouping evidence only** —
> they never constrain the source plan: its own live checks govern at execution
> time.

- Write surface: `.agents/skills/codex-skill/SKILL.md` (frontmatter `version`
  1.2.0 → next), new `.agents/skills/codex-skill/tests/codex-skill-contract.test.mjs`,
  the five public package manifests, `pnpm-lock.yaml` (likely no-op), and the
  build-generated `packages/cli/assets/public-package-versions.json`. Read-only
  authorities: `.agents/skills/subagent-orchestration/references/provider-codex.md`
  and live `codex --help`. `codex-skill` is repo-only (absent from
  `packages/cli/scripts/bundle-inputs.mjs`), so no bundled copy exists or is
  regenerated; the lockstep bump still applies because `.agents/skills` is a
  version-policy root. The skill is symlink-synced to `.claude/skills/codex-skill`.

## Dispatch Profile

_No per-phase overrides. Runtime selection applies, capped by the project's named
dispatch policy in `state.md` (managed / `high`); provider-specific model/effort
selection is owned by runtime resolution, not this plan. Cross-model review is
embedded in the lane: the Codex CLI itself reviews the diff (`codex review`) of
a Codex-facing skill contract._

## Drift Refresh Record (2026-08-27, vs `3c135e212dfb1d386650089e7d9f95263565ee82`)

**1 PASS / 0 MINOR-DRIFT / 0 STOP after operator reconciliation.** Non-authoritative
recon evidence (one bounded read-only recon agent, Sonnet 5, native dispatch,
run against `39cea801` and re-checked by the root against `3c135e212dfb1d386650089e7d9f95263565ee82`); the lane
re-runs its drift check in-worktree.

- Drift-check diff `6f443c08..3c135e212dfb1d386650089e7d9f95263565ee82` over the plan's listed paths touches only
  the `version` line of the five public manifests (0.2.32 → 0.2.35 via W1–W3);
  `.agents/skills/codex-skill/**`, `provider-codex.md`, `packages/cli/src/validation/**`,
  and `pnpm-lock.yaml` are byte-identical to the authoring commit. Plan evidence
  lines re-verified (`SKILL.md:13`, `:22`, `:35` vs `:41`; `provider-codex.md:16`,
  `:34–42`; frontmatter `version: 1.2.0`; `tests/` does not exist yet — closest
  prose-contract precedent
  `.agents/skills/oat-project-complete/tests/check-terminal-outcome.test.mjs`).
- **Live Codex reread (program requirement):** `codex-cli 0.149.1`. `-m/--model`,
  `-C/--cd`, `-s/--sandbox`, `--skip-git-repo-check` (on `exec` and `exec resume`,
  not on bare `resume`); effort only via `-c model_reasoning_effort="…"` (no
  `--effort` flag) — consistent with the configured gate target
  `codex exec --model gpt-5.6-sol -c model_reasoning_effort="xhigh"`. The live
  models page lists GPT-5.6 Sol/Terra/Luna (matches `provider-codex.md`,
  `guidance_version 2026-07-25`, `review_after 2026-09-08`), plus an `ultra`
  effort tier the reference lacks, and notes GPT-5.4 / 5.4-mini retire from
  Codex on 2026-08-31. The reference is a consumed authority and stays out of
  scope; every task class still has an eligible route (STOP #1 clear).
- **STOP #2 reconciliation (operator-approved 2026-08-27, non-narrowing):**
  `codex exec --help` has no `--full-auto` (live approval flags are
  `--approve-for-me` and `--dangerously-bypass-approvals-and-sandbox`), while
  `SKILL.md` uses `--full-auto` at `:19`, `:33`, `:34`, `:47`. The plan's own
  step 2 requires every command example to agree and to use flags in valid
  positions, and Done criterion 4 requires mutually consistent examples; the
  operator directed that replacing the dead flag with the live documented
  approval flag is part of that step — same file, no behavior change, no
  undocumented flags, sandbox and high-impact authorization rules retained (the
  high-impact list at `:47` names the live flag). WHERE the fix lands changes;
  WHAT must be true (consistent, valid, authorization-gated examples) does not.
  Recorded once here; pointer-only elsewhere.
- **Rule-1 addendum (coverage gaps):** the source plan's drift command omits
  surfaces the lane writes or depends on. The in-worktree drift check MUST
  additionally run, before editing:
  1. `git fetch origin && git diff --stat 3c135e212dfb1d386650089e7d9f95263565ee82..origin/main -- packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml packages/cli/assets/public-package-versions.json`
     (release surfaces vs the recorded wave baseline on a freshly fetched
     `origin/main`) — any advance of the public-package baseline after planning
     is a material mismatch: STOP and report the new baseline. Run
     `git fetch origin` immediately before every `pnpm release:check-versions`.
  2. `codex --version && codex exec --help && codex exec resume --help` —
     re-confirm the live flag set recorded above; a CLI upgrade that removes or
     renames `-m`, `-C`, `-s`, `--skip-git-repo-check`, or the approval flags is
     a material mismatch against the plan's second STOP condition.
  3. `git diff --stat 6f443c08..HEAD -- package.json packages/cli/scripts/bundle-inputs.mjs`
     (the `test:skills` invocation and the bundle allowlist that establish
     `codex-skill` as repo-only; a change is a material mismatch to compare
     against the plan).
- **Release-root intersection (W1 rule):** `.agents/skills` is a
  `versionPolicyAdditionalRoots` entry of the `packages/cli` contract
  (`public-package-contract.ts:113`), so the lane's skill edit is a publishable
  change; the plan's step 3 lockstep bump **0.2.35 → 0.2.36** is required and
  pre-planned as part of the lane, together with the single `codex-skill`
  frontmatter bump (`pnpm run check:skill-bumps`). `origin/main` = `3c135e212dfb1d386650089e7d9f95263565ee82`
  at 0.2.35, so the strict-greater guard passes at 0.2.36.
- Implementer notes (non-narrowing): `pnpm test:skills` runs
  `node --test .agents/skills/*/tests/*.test.mjs`; `pnpm lint`/`pnpm format`
  cover `.agents/skills/**/*.md`; `pnpm-lock.yaml` records workspace links
  (unchanged lockfile is not a failure); `public-package-versions.json` is
  regenerated by `pnpm build`.

---

## Phase 01: refresh-codex-skill-routing (solo)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p01-t01: Execute external plan — Route codex-skill through current model guidance and preserve repository checks

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-08-19-refresh-codex-skill-routing.md`

**Ordering:** solo; runs on the integration checkout (`wave-4-execution`).

**Step 1: Drift check** — per the source plan's `## Drift check`, plus the rule-1
addendum above.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the full DoD gates from
the wrapper execution contract.
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent
cross-model review of the uncommitted diff via the runtime-configured reviewer
(provider/model/effort owned by dispatch configuration, not this plan);
disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "feat(p01-t01): route codex-skill through provider guidance and make repo-check bypass conditional"
```

---

## Reviews

| Scope  | Type     | Status      | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target              |
| ------ | -------- | ----------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | ------------------------ |
| p01    | code     | fixes_added | 2026-08-27 | reviews/archived/p01-review-2026-08-27T043458Z.md           | 39121c35e3ee07d8b7785d783565ae89e087d337 | auto       | -                        |
| final  | code     | pending     | -          | -                                                           | -                                        | -          | -                        |
| plan   | artifact | passed      | 2026-08-27 | reviews/archived/artifact-plan-review-2026-08-27T020212Z.md | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| spec   | artifact | pending     | -          | -                                                           | -                                        | -          | -                        |
| design | artifact | pending     | -          | -                                                           | -                                        | -          | -                        |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

## Implementation Complete

Strictly ordered — each item depends on the one before it (wave-execute Step 6
closeout sequence):

1. [ ] 1/1 phases, 1/1 tasks complete; the source plan's `## Done criteria`
       confirmed (recorded in `implementation.md` § Done-criteria confirmation)
2. [ ] Full DoD gates green on the integration branch (exit codes captured per
       gate, including `pnpm lint` and `pnpm format`, plus the post-commit
       `release:check-versions` re-run)
3. [ ] Orchestration-log end-of-run synthesis written and rolled up into
       `summary.md` — before any archive step of the project
4. [ ] **Serialized backlog bookkeeping:** `oat backlog archive
BL-260819-refresh-codex-skill-model` with a real outcome summary, one commit

## References

- Source plan: `.oat/repo/reference/external-plans/2026-08-19-refresh-codex-skill-routing.md`
- Program artifact: `.oat/repo/reference/external-plans/2026-08-19-execution-program.md`
- Program index: `.oat/repo/reference/external-plans/2026-08-19-backlog-review-plan-index.md`
- Pattern: `DR-260713-wave-project-wrapper-over`; prior wave summaries
  `.oat/projects/shared/wave-1-execution/summary.md`,
  `.oat/projects/shared/wave-2-execution/summary.md`,
  `.oat/projects/shared/wave-3-execution/summary.md`
