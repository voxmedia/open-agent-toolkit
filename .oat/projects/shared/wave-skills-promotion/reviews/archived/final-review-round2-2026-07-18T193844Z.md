---
oat_generated: true
oat_generated_at: 2026-07-18T19:38:44Z
oat_review_scope: final
oat_review_type: code
oat_review_round: 2
oat_review_invocation: manual
oat_project: .oat/projects/shared/wave-skills-promotion
oat_request_id: wave-skills-promotion-final-review-1
oat_commit_range: be312285..ae6c6a7f
oat_prior_review: reviews/final-review-2026-07-18T191920Z.md
oat_dispatch_stamp: 'Dispatch: scope=final action=review role=reviewer producer=oat-phase-implementer-gpt-5-6-sol-high provenance=declared model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high'
---

# Code Review: final (Round 2)

**Reviewed:** 2026-07-18T19:38:44Z
**Scope:** Bounded re-review of the round-1 findings (1 Critical, 3 Important, 1 Minor) against fix commits `6e246ea8`, `5c61a9c1`, and `ae6c6a7f`; the round-1-passed surface was not re-reviewed
**Files reviewed:** 9 changed files across the three fix commits, plus the fixture README and docs page for consistency checks
**Commits:** 3 new since `be312285`
**Verdict:** PASS
**Prior review:** `reviews/final-review-2026-07-18T191920Z.md` (FAIL: 1 Critical, 3 Important, 0 Medium, 1 Minor)

## Summary

All five round-1 findings are resolved and independently re-verified. The bundled execute assets are now repo-neutral (placeholders + conditional nvm + env hooks; `.stoa`/`SKIP_S3` removed entirely), which I confirmed by re-running the bootstrap script myself in both a non-pnpm-shaped fixture (clean skip STATUS lines, view-parity ok, `git_clean=pass`) and a hooks-set leg (custom commands executed). The program-skill introduction, Final Summary disclosure, Reviews-table reconciliation, and Deviations row all match their fix guidance, and no new inconsistency was introduced across the skill/script/README/docs seams.

Findings: 0 critical, 0 important, 0 medium, 0 minor

## Findings

### Critical

None.

### Important

None.

### Medium

None.

### Minor

None.

## Round-1 Finding Resolution

### C1 — Bundled execute assets hard-required the stoa toolchain → RESOLVED (`5c61a9c1`)

- **Templates:** `wrapper-plan-template.md` items 3 and 9 now use `{ curly-brace }` instantiation placeholders (`{ repo env setup commands, then repo test/lint/format/type gates }`, `{ repo formatter write command }`) with the stoa commands demoted to labeled source-program examples; the Step 3 wrapper gate references the contract instead of "the four DoD gates". `orchestration-log-template.md` line 21 makes the same placeholder+example move. This matches the templates' existing directive-hygiene convention (placeholders are substituted at instantiation).
- **Script:** `bootstrap-group.sh` sources nvm only when `~/.nvm/nvm.sh` exists (lines 98-101); the `.stoa/operator-hosts.local.json` copy and `SKIP_S3_ARCHIVE_SYNC` are removed entirely (`rg -n '\.stoa|SKIP_S3' .agents/skills/oat-wave-execute/` returns nothing); bootstrap/baseline resolve through `OAT_WAVE_BOOTSTRAP_CMD`/`OAT_WAVE_BASELINE_CMD` with pnpm-shaped detection (`pnpm-lock.yaml` + matching `package.json` script) defaulting to the original commands and any other repo skipping with an informational STATUS line. Remaining `pnpm`/`nvm` mentions in the script are detection defaults and conditional setup, not requirements.
- **Independent fixture spot-run (my call: load-bearing, since the non-pnpm path never existed before this fix):** materialized the fixture, removed `pnpm-lock.yaml` to make it non-pnpm-shaped, and ran the promoted script under `/bin/bash` 3.2.57. Leg A (hooks unset, non-pnpm): `bootstrap=skipped`/`baseline=skipped` STATUS lines emitted, `STATUS view-parity=ok`, terminal `status=success ... git_clean=pass`. Leg B (hooks set to custom commands): both hooks executed (init log contains the custom command output), view-parity ok, terminal success. Fixture cleaned up.
- **Bash 3.2:** `/bin/bash -n` passes under 3.2.57; zero `mapfile`/`declare -A`/`typeset -A`/case-modification constructs.
- **Checklist:** rows EX-A01..A06 exist (`references/equivalence-checklist.md:54-59`), each citing a real frozen-source location and accurately describing the corresponding shipped diff (I spot-checked all six against the actual `5c61a9c1` changes; EX-A05 correctly records outright removal rather than generalization).
- **SKILL.md Step 5** (lines 192-201) now describes the hook mechanism consistently with the script's actual behavior.

### I1 — Program skill intro contradicted the composition boundary → RESOLVED (`ae6c6a7f`)

The introduction (`.agents/skills/oat-wave-program/SKILL.md:13-17`) now says the skill "records and maintains the orchestrator-composed, operator-approved mapping of WHICH plans form each wave." This is consistent with the Ownership Boundary (lines 26-29, unchanged) and uses the same formulation as the docs page (`apps/oat-docs/docs/workflows/wave-workflows.md:16`). The `[JUDGMENT]` process labels and the operator-approval checkpoint in mode `new` step 4 are unchanged.

### I2 — Undisclosed 24-role generated surface → RESOLVED (`6e246ea8`)

The Final Summary's "What shipped" now carries an explicit "Also in this branch (disclosed)" bullet naming the 24 cursor dispatch-variant roles, their path pattern, size (~9k generated lines), producing commit `08d7b205`, provenance (supported-catalogue materialization by `oat sync --scope all` on CLI 0.1.73), and verification rationale (sync idempotent-clean re-run; generated managed views).

### I3 — Regressed p05 review rows → RESOLVED (`6e246ea8`)

The two duplicate `received` rows for the p05 gate artifacts are removed from `plan.md`; the latest status per artifact identity is now terminal (`fixes_completed` for `p05-review-...184321Z`, `passed` for `p05-review-...185045Z`), monotonic per the table's declared lifecycle. The removed rows were byte-identical double-appends of earlier events for the same artifacts, so no distinct review event was lost — this satisfies review-table preservation while fixing the routing hazard.

### Minor — Deviation pointer inaccuracy → RESOLVED (`6e246ea8`)

`implementation.md` Deviations table now contains the p02-t09 row (verified no-op, symlinked views, source-of-truth Phase 2 notes), making the Final Summary's "recorded in Deviations" claim accurate.

## No-New-Inconsistency Check

- SKILL.md Step 5 hook description, script header comment, and script behavior agree (hook names, pnpm-shaped default, skip-with-STATUS semantics).
- Fixture README bootstrap assertions (`STATUS view-parity=ok`, `status=success .*git_clean=pass`) remain valid: the fixture repo is pnpm-shaped (`pnpm-lock.yaml` + `worktree:init`/`type-check` scripts), so defaults run and the terminal STATUS format is unchanged; the new informational `bootstrap=skipped` lines cannot collide with the `status=` greps.
- Skill versions unchanged (execute 1.5.0 / program 1.1.0) — appropriate since these are pre-release fixes to the not-yet-published 0.2.0 delta.
- All seven changed markdown files pass `pnpm exec oxfmt --check`. `pnpm lint` was not re-run (my call): the fix commits touch only markdown and one bash script, neither covered by oxlint; the implementer's recorded run plus the file-scoped format checks cover the changed surface.
- `git status --short` clean before this artifact.

## Requirements Alignment Delta

| Requirement | Round 1 | Round 2     | Notes                                                                                               |
| ----------- | ------- | ----------- | --------------------------------------------------------------------------------------------------- |
| FR3         | missing | implemented | No shipped asset requires a stoa-specific tool; stoa commands survive only as examples or defaults. |
| FR4         | partial | implemented | Program intro, Ownership Boundary, and docs page now state the same composition ownership.          |
| NFR3        | —       | unchanged   | Script re-verified under bash 3.2.57 after the hook changes (syntax + construct + live run).        |

All other rows passed in round 1 and were not re-reviewed.

## Verification Commands

```bash
rg -n '\.stoa|SKIP_S3' .agents/skills/oat-wave-execute/   # expect no matches
/bin/bash -n .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh
rg -n 'mapfile|declare -A|typeset -A' .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh   # expect no matches
rg -n 'EX-A0' .oat/projects/shared/wave-skills-promotion/references/equivalence-checklist.md   # expect 6 rows
rg -n 'orchestrator-composed, operator-approved' .agents/skills/oat-wave-program/SKILL.md apps/oat-docs/docs/workflows/wave-workflows.md
rg -n 'received' .oat/projects/shared/wave-skills-promotion/plan.md   # expect no p05 review rows
pnpm exec oxfmt --check .agents/skills/oat-wave-execute/SKILL.md .agents/skills/oat-wave-execute/assets/*.md .agents/skills/oat-wave-program/SKILL.md
```

## Recommended Next Step

Record this round-2 pass in the plan Reviews table (`final` → `passed`) via `oat-project-review-receive`, then proceed to the PR for the phases 1–5 delta.
