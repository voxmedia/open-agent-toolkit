---
oat_generated: true
oat_external_plan_index: false
oat_execution_program: true
oat_program_supersedes: .oat/repo/reference/external-plans/2026-08-19-execution-program.md
oat_program_indexes:
  - .oat/repo/reference/external-plans/2026-08-30-backlog-review-wave-1-plan-index.md
  - .oat/repo/reference/external-plans/2026-08-30-backlog-review-wave-2-plan-index.md
  - .oat/repo/reference/external-plans/2026-08-30-backlog-review-wave-3-plan-index.md
  - .oat/repo/reference/external-plans/2026-09-02-backlog-review-wave-4-plan-index.md
  - .oat/repo/reference/external-plans/2026-09-03-backlog-review-wave-5-plan-index.md
  - .oat/repo/reference/external-plans/2026-09-08-backlog-review-wave-7-plan-index.md
created: '2026-08-31T05:24:43Z'
---

# Execution Program: 2026-08-31 (revalidated backlog-review implementation corpus)

This artifact is the durable program map for the external-plan corpus listed in
`oat_program_indexes`. It records wave composition and status. It is not an
executable plan and is not an `oat-project-import-plan` target—each wave runs as
a wrapper OAT project via `oat-wave-execute`, and each plan's implementation
contract remains its immutable plan file.

This program supersedes the composition map in
[the 2026-08-19 execution program](./2026-08-19-execution-program.md), whose four
implementation waves are already merged. It does not absorb or resolve that
program's deferred human-gated completion tails; those remain owned by the
predecessor record and the operator.

## Status Ledger

Execution approval: operator approved the composition and autonomous execution
(including merges) on 2026-09-05. W1–W4 merged 2026-09-06; the Lite workflow PR #264 merged 2026-09-07; W5 merged 2026-09-07 (ten of eleven lanes; p09 parked); W6 merged 2026-09-08 (five lanes). The program is complete; the parked W5 p09 plan is carried by `BL-260907-make-the-completion-seal`. W7 (twenty corrective lanes from the 2026-09-08 post-program triage, PR #282) was composed on 2026-09-08 (PR #284) and merged 2026-09-09 (PR #286, CLI 0.2.67; nineteen lanes merged, p16 parked as a decision). Every composed wave is merged.

| Wave | Theme                                | Lanes | Status | Record                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---- | ------------------------------------ | ----- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1   | CLI resolution and asset correctness | 4     | merged | PR #262 → `6db0457c095e4384e5ac2f464ee1c4d5a47d0179` (squash, 2026-09-06T02:19:50Z); wrapper project `.oat/projects/shared/wave-1-execution` (lifecycle complete 2026-09-06; completion record `summary.md` + `implementation.md` § Final Summary; CLI 0.2.56); completion tail: done 2026-09-09 (sealed, lifecycle complete, archived locally and to S3 at the wave-7 close); recap: not run — pending `BL-260907-replace-the-default-project` (program close 2026-09-09).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| W2   | Skill contract truthfulness          | 5     | merged | PR #267 → `ca71c00a014a6eba00cb4cd4c46974fc6aa58139` (squash, 2026-09-06T10:47:59Z); wrapper project `.oat/projects/shared/wave-2-execution` (lifecycle complete 2026-09-06; completion record `summary.md` + `implementation.md` § Final Summary; CLI 0.2.57); completion tail: done 2026-09-09 (sealed, lifecycle complete, archived locally and to S3 at the wave-7 close); recap: not run — pending `BL-260907-replace-the-default-project` (program close 2026-09-09).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| W3   | Workflow durability and containment  | 3     | merged | PR #269 → `ed75370db9f7cf43cd884572bd58502aa71f22bd` (squash, 2026-09-06T16:06:38Z); wrapper project `.oat/projects/shared/wave-3-execution` (lifecycle complete 2026-09-06; completion record `summary.md` + `implementation.md` § Final Summary; CLI 0.2.58); completion tail: done 2026-09-09 (sealed, lifecycle complete, archived locally and to S3 at the wave-7 close); recap: not run — pending `BL-260907-replace-the-default-project` (program close 2026-09-09).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| W4   | Delivered-project follow-ups         | 3     | merged | PR #271 → `81b784c3d3660968291a00cfc814336a36786c74` (squash, 2026-09-06T20:45:35Z); wrapper project `.oat/projects/shared/wave-4-execution` (lifecycle complete 2026-09-06; completion tail done 2026-09-09 (sealed, lifecycle complete, archived locally and to S3 at the wave-7 close)); CLI 0.2.59.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| W5   | Program-intake follow-ups            | 11    | merged | PR #275 → `cc91a2d21077ada69f52775b87abedd451e48994` (squash, 2026-09-07T23:19:34Z); wrapper project `.oat/projects/shared/wave-5-execution` (lifecycle complete 2026-09-07; completion tail done 2026-09-09 (sealed, lifecycle complete, archived locally and to S3 at the wave-7 close)); CLI 0.2.63; ten of eleven lanes merged — p09 (defer activeProject clearing) parked on its plan's STOP condition (`BL-260907-make-the-completion-seal`); exit gate passed on the operator-authorized third attempt after two blocking rounds fixed as Phase 12.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| W6   | Truthfulness residue                 | 5     | merged | PR #278 → `0ba401b31b7fc435e323b98681a5934a5e81f823` (squash, 2026-09-08T07:40:03Z); wrapper project `.oat/projects/shared/wave-6-execution` (lifecycle complete 2026-09-08); CLI 0.2.64; all five lanes merged in two groups; program complete — every composed wave has landed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| W7   | Post-program corrective lanes        | 20    | merged | PR #286 → `f4c2dc4ef4d55a83be0cf7bfdc546f7b9fb23893` (squash, 2026-09-09T15:20:33Z); composed as PR #284 (`684bd3be3`); wrapper project `.oat/projects/shared/wave-7-execution` (lifecycle: final review passed on round 4 after a three-lane fix round and two bounded follow-ups, configured exit gate passed, `pr_open` → merged; completion record `summary.md` + `implementation.md` § Final Summary; CLI 0.2.67); nineteen of twenty lanes merged — p16 (dispatch baselines after journaling) parked on its plan's STOP condition (the recorder graph's no-process guard forbids the plan's git seam; `BL-260906-harden-dispatch-launch` returns to planning as a decision, partial work under the wrapper's `parked/wave-7-p16/`); fifteen `BL-260909-*` follow-ups filed; completion tail: done 2026-09-09 (sealed, lifecycle complete, archived locally and to S3; the active-project pointer cleared) — run for all seven wrappers at this close per the operator's standing decision (see below); recap: not run — pending `BL-260907-replace-the-default-project` |

## Wave Table (coverage: 51 plans = 51 index rows; verified 2026-09-08)

| Plan                                                                                                                                                                                   | Index                                                            | Wave | Ordering notes                                                                                                                                         | Status                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Use configured docs index paths](./2026-08-30-use-configured-docs-index-paths.md)                                                                                                     | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W1   | parallel group 1                                                                                                                                       | done                                                                                                                                                     |
| [Emit dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md)                                                                                       | [Wave 2 index](./2026-08-30-backlog-review-wave-2-plan-index.md) | W4   | group 2 after gate override (shared contract tests and pins); moved from W1 on 2026-09-02; READY since PR #255 merged; issue #211 is soft              | done                                                                                                                                                     |
| [Validate assets bundle structure](./2026-08-30-validate-assets-bundle-structure.md)                                                                                                   | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W1   | parallel group 1; merge before asset-error successor                                                                                                   | done                                                                                                                                                     |
| [Make asset errors override-aware](./2026-08-30-make-assets-errors-override-aware.md)                                                                                                  | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W1   | group 2 after dependency revalidation sets the plan READY                                                                                              | done                                                                                                                                                     |
| [Repair bundled skill contract drift](./2026-08-30-repair-bundled-skill-contract-drift.md)                                                                                             | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W2   | group 1; merge-first contract baseline                                                                                                                 | done                                                                                                                                                     |
| [Harden codex-skill anaphora guard](./2026-08-30-harden-codex-skill-anaphora-guard.md)                                                                                                 | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W2   | group 2 after bundled-skill repair revalidation                                                                                                        | done                                                                                                                                                     |
| [Guard docs-app mirrors of skill prose](./2026-08-30-guard-docs-app-mirrors-of-skill-prose.md)                                                                                         | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W2   | group 2 after bundled-skill repair revalidation                                                                                                        | done                                                                                                                                                     |
| [Require named lifecycle skills to be loaded](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md)                                                                             | [Wave 2 index](./2026-08-30-backlog-review-wave-2-plan-index.md) | W2   | group 2; revalidate if draft PR #190 changes first                                                                                                     | done                                                                                                                                                     |
| [Require repo-wide call-site sweeps](./2026-08-30-require-repo-wide-call-site-sweeps.md)                                                                                               | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W3   | parallel group 1                                                                                                                                       | done                                                                                                                                                     |
| [Journal deterministic smoke worktrees](./2026-08-30-journal-deterministic-smoke-worktrees-before-creation.md)                                                                         | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W3   | parallel group 1; dedicated safety review                                                                                                              | done                                                                                                                                                     |
| [Require executable backstops](./2026-08-30-require-executable-backstops-for-contract-claims.md)                                                                                       | [Wave 3 index](./2026-08-30-backlog-review-wave-3-plan-index.md) | W3   | group 2 after concrete guard examples and call-site sweep                                                                                              | done                                                                                                                                                     |
| [Disable configured gates per project](./2026-08-30-disable-configured-gates-per-project.md)                                                                                           | [Wave 2 index](./2026-08-30-backlog-review-wave-2-plan-index.md) | W4   | parallel group 1; preserve PR #246 contracts; owns the `oat-project-next` disposition consumer                                                         | done                                                                                                                                                     |
| [Warn on non-sync manifest restamps](./2026-08-30-warn-on-non-sync-manifest-restamps.md)                                                                                               | [Wave 1 index](./2026-08-30-backlog-review-wave-1-plan-index.md) | W4   | parallel group 1; READY since PR #255 merged (refreshed 2026-09-03 against Manifest V2); preserve PR #249 diagnostics                                  | done                                                                                                                                                     |
| [Recover committed review artifacts after post-selection gate failures](./2026-09-02-recover-committed-review-artifacts-after-post-selection-failures.md)                              | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 1; land before the index-lock plan                                                                                                               | done                                                                                                                                                     |
| [Retry gate project-log finalization across transient Git index locks](./2026-09-02-retry-gate-project-log-finalization-across-index-locks.md)                                         | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 2 after post-selection recovery                                                                                                                  | done                                                                                                                                                     |
| [Keep instruction-sync pointer files out of documentation content trees](./2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md)                                             | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 1; before `oat config unset`                                                                                                                     | done                                                                                                                                                     |
| [Add an exclusion mechanism to docs index generation](./2026-09-02-add-exclusions-to-docs-index-generation.md)                                                                         | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W1   | group 2 successor; READY only after the docs-index lane merges and step 1 passes                                                                       | done                                                                                                                                                     |
| [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md)                                  | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 2; before the readiness-contract lane                                                                                                            | done                                                                                                                                                     |
| [Add an oat config unset command](./2026-09-02-add-oat-config-unset-command.md)                                                                                                        | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 2 after instruction-sync pointers                                                                                                                | done                                                                                                                                                     |
| [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md)                                         | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 1                                                                                                                                                | done                                                                                                                                                     |
| [Document patch-and-restore recovery for lost child handles with staged work](./2026-09-02-document-patch-and-restore-for-lost-child-handles.md)                                       | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W2   | group 3 after the named-skill loading lane                                                                                                             | done                                                                                                                                                     |
| [Defer activeProject clearing on shared and local archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md)                                            | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 4 after the recap lane; before terminal-status and the consolidation plan                                                                        | parked (plan STOP; BL-260907-make-the-completion-seal)                                                                                                   |
| [Make consolidated-project retirement checks semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md)                                                                  | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 5 after active-pointer and quick-resume                                                                                                          | done                                                                                                                                                     |
| [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md)                                                  | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 3 after the readiness lane (shared pins file); no longer waits on `oat config unset`                                                             | done                                                                                                                                                     |
| [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md)                                                      | [Wave 4 index](./2026-09-02-backlog-review-wave-4-plan-index.md) | W5   | group 3 first, after the skill-script lane; before the recap lane (shared pins file)                                                                   | done                                                                                                                                                     |
| [Populate provider reachability evidence across pack and lifecycle surfaces](./2026-09-03-populate-provider-reachability-evidence.md)                                                  | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W6   | parallel group 1; one wave-level lockstep bump                                                                                                         | done                                                                                                                                                     |
| [Validate review-ledger paths and archive only terminal reviews before the final PR](./2026-09-03-validate-review-ledger-paths-before-final-pr.md)                                     | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W6   | parallel group 1; one wave-level lockstep bump                                                                                                         | done                                                                                                                                                     |
| [Preserve `__proto__`-named config keys through JSON parsing](./2026-09-03-preserve-proto-named-config-keys.md)                                                                        | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W6   | parallel group 1; one wave-level lockstep bump                                                                                                         | done                                                                                                                                                     |
| [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md)                                                                             | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W6   | group 2 after the pr-final lane (shared version pins)                                                                                                  | done                                                                                                                                                     |
| [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md)                                             | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W5   | group 4 after the active-pointer lane (shared pins file) and the quick-route lane (`next` skill)                                                       | done                                                                                                                                                     |
| [Diagnose canonical skills missing from a provider view at resolution time](./2026-09-04-diagnose-canonical-skills-missing-from-provider-views.md)                                     | [Wave 5 index](./2026-09-03-backlog-review-wave-5-plan-index.md) | W6   | group 2 after the provider-reachability lane (shared `info-tool.ts`)                                                                                   | done                                                                                                                                                     |
| [Read stdin with an fd-capable API in finalize-synced-archive.mjs](./2026-09-08-read-stdin-in-finalize-synced-archive.md)                                                              | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 1; first of the `oat-project-complete` pair and of the `validation/skills.test.ts` chain                                                         | done                                                                                                                                                     |
| [Let `oat config unset` remove a malformed value, and fold `adopt` onto the shared surface-flag resolver](./2026-09-08-fix-oat-config-unset-and-adopt.md)                              | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 1; first of the config chain (`commands/config/index.ts`, `config/resolve.ts`)                                                                   | done                                                                                                                                                     |
| [Guard repository Markdown against the formatter rewriting a bare prototype-key literal into bold](./2026-09-08-guard-bare-proto-in-markdown-records.md)                               | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 1; before the normalized-config-maps lane (repairs its source item title)                                                                        | done                                                                                                                                                     |
| [Guard a packed path under every required asset directory](./2026-09-08-guard-every-packed-asset-directory.md)                                                                         | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 1; never with the symlink-target lane (`configuration.md`)                                                                                       | done                                                                                                                                                     |
| [Make `oat status` persist and pin its native-skill adoption outcome](./2026-09-08-persist-native-skill-adoption-in-status.md)                                                         | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 1; sole writer of `commands/status/**`                                                                                                           | done                                                                                                                                                     |
| [Make `oat sync` report a failure summary instead of "No changes required." when a rejected collection leaves zero planned operations](./2026-09-08-fix-sync-apply-failure-summary.md) | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 1; sole writer of `commands/sync/apply.ts`                                                                                                       | done                                                                                                                                                     |
| [Harden the external-plan readiness contract and settle the wave-program ledger vocabulary](./2026-09-08-harden-the-external-plan-readiness-contract.md)                               | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 1; before the caller-model lane (shared `skills-bundled-docs-contract.test.ts`, `wave-workflows.md`); sole writer of `oat-wave-program/SKILL.md` | done                                                                                                                                                     |
| [Make the completion seal idempotent and unpark wave-5 p09](./2026-09-08-make-the-completion-seal-idempotent.md)                                                                       | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 2 after the stdin lane (shared completion skill and pins); unparks W5 p09                                                                        | done                                                                                                                                                     |
| [Harden normalized config maps against a preserved `__proto__` key](./2026-09-08-harden-normalized-config-maps.md)                                                                     | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 2 after the `unset`/`adopt` lane and the bare-proto guard (config chain, second)                                                                 | done                                                                                                                                                     |
| [Name the resolved target in the symlink inert-exclusion warning](./2026-09-08-name-the-resolved-symlink-target.md)                                                                    | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 2; never with the packed-asset lane (`configuration.md`); sole writer of `commands/instructions/**`                                              | done                                                                                                                                                     |
| [Converge copy-strategy skill projections so a synced copy reads in sync](./2026-09-08-converge-copy-strategy-skill-projections.md)                                                    | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 2; sole writer of `engine/compute-plan.ts` and `engine/execute-plan.ts`                                                                          | done                                                                                                                                                     |
| [Put skill-asset formatting and the worktree-init test inside the gates CI actually runs](./2026-09-08-cover-skill-and-script-tests-in-repo-gates.md)                                  | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 2; never with the validators, authoring-facts, or bare-proto lanes (`AGENTS.md`, `.lintstagedrc.mjs`)                                            | done                                                                                                                                                     |
| [Make the oat-doctor dashboard example describe a state the doctor can report](./2026-09-08-reconcile-the-oat-doctor-example.md)                                                       | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 3; `validation/skills.test.ts` chain (third writer); sole writer of `oat-doctor/SKILL.md`                                                        | done                                                                                                                                                     |
| [Warn on a wrong-typed `documentation.root` instead of dropping it in silence](./2026-09-08-warn-on-wrong-typed-documentation-root.md)                                                 | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 3 after the normalized-config-maps lane (config chain, third); before the docs-index lane                                                        | done                                                                                                                                                     |
| [Repair the stray fences that hide normative skill prose and widen the fence scanner across `.agents/skills`](./2026-09-08-repair-stray-fences-in-lifecycle-skills.md)                 | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 4; before the authoring-facts and caller-model lanes (shared `create-agnostic-skill` and `oat-repo-improve` bumps)                               | done                                                                                                                                                     |
| [Close the docs-index follow-ups from the wave-1 reviews](./2026-09-08-close-the-docs-index-follow-ups.md)                                                                             | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 4 after the config chain (last writer of `config/resolve.ts`)                                                                                    | done                                                                                                                                                     |
| [Close the version-validator gaps: agent roles, unresolvable versions, the alias promotion, and scripts-only skill changes](./2026-09-08-tighten-the-skill-version-validators.md)      | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 5; `validation/skills.test.ts` chain; never with the gates lane (`AGENTS.md`)                                                                    | done                                                                                                                                                     |
| [Resolve the accepted execution baseline after mandatory launch journaling, and make the ordering auditable](./2026-09-08-calculate-dispatch-baselines-after-journaling.md)            | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 6; `validation/skills.test.ts` chain; issue #266 half stays outside the program                                                                  | deferred — parked 2026-09-09 on the plan STOP (the recorder graph no-process guard forbids the Step 3 git seam; re-enters a later wave after a decision) |
| [Correct the factual skill-authoring claims and give each one a named backstop](./2026-09-08-correct-skill-authoring-facts.md)                                                         | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 7 after the fences lane (shared `create-agnostic-skill` bump)                                                                                    | done                                                                                                                                                     |
| [Keep external-plan writes on the caller's model class in oat-repo-improve](./2026-09-08-keep-plan-writes-on-the-callers-model.md)                                                     | [Wave 7 index](./2026-09-08-backlog-review-wave-7-plan-index.md) | W7   | group 8 (last) after the readiness and fences lanes (shared contract test and `oat-repo-improve` bump)                                                 | done                                                                                                                                                     |

## Program-wide integration rules

- Assume a concurrency ceiling of three implementation lanes. A numbered plan
  or row does not imply serial execution unless an ordering note says so.
- Create one wrapper OAT project and one integration PR per wave. Keep lane
  commits reviewable inside the wrapper branch and record all reconciliations in
  its orchestration log.
- Lockstep release files (the five public package manifests,
  `packages/cli/assets/public-package-versions.json`, and `pnpm-lock.yaml`)
  are owned exclusively by the wave fan-in step: no implementation lane edits
  them, so parallel lanes never share that write surface. PR-scoped skill
  `version:` bumps and their pins in `packages/cli/src/validation/skills.test.ts`
  stay in lane ownership.
- Three verification modes, so lane success and integrated release readiness
  are never confused (the execution skill requires integration gates after
  every group, and `tools/release/validate-public-packages.ts` rejects changed
  public packages whose lockstep versions did not move):
  - **Lane mode:** each lane runs its plan's focused tests plus `pnpm check`,
    `pnpm type-check`, and `pnpm run check:skill-bumps` (and `pnpm lint`,
    `pnpm format`, `pnpm oat:validate-skills` when it changes `.agents/skills`
    or `tools/smoke`). Lanes never run `pnpm release:check-versions` or
    `pnpm release:validate` and never edit lockstep release files.
  - **Group fan-in mode:** the fan-in owner establishes the wave's single
    lockstep bump above freshly fetched `origin/main` before the first group's
    integration gates, regenerates the version asset through the build, and
    retains that bump through later groups; then it runs the full
    definition-of-done sequence on the integrated wave branch after every
    group, to completion, before any group bookkeeping edit.
  - **Final-wave mode:** before the wave PR, fetch `origin/main` again,
    re-check that the retained bump is still strictly above main (advance it
    if main moved), and rerun the full sequence.
- Hidden shared write surfaces count when composing groups: the skill version
  pins in `packages/cli/src/validation/skills.test.ts` (every lane that bumps a
  pinned skill writes them), `review-skill-contracts.test.ts`, provider-sync
  outputs, and generated files. Compute intersections from implementation
  steps, test plans, and pins, not from Scope lists alone; at most one lane per
  parallel group may write each of those files.
- At every wave and group boundary, the drift refresh compares each plan's
  complete planned write set against the actual execution `HEAD` and the
  current head of draft PR #190 (`63161897dd4` as of 2026-09-05; 217 files),
  and records one SHA-bound result in the wrapper's Drift Refresh Record.
  Plan landing-event tables forecast which assumption to re-check; that record
  is the authoritative execution evidence.
- Revalidate every pending wave when main materially changes. Specifically
  re-sweep W4 dispatch behavior if issue #211 changes and W2 lifecycle loading
  if draft PR #190 changes before their lanes start.
- **External dependency (landed):** the `tool-pack-scope-provider-truthfulness`
  project merged as PR #255 (`a06e9713a`, CLI 0.2.52) on 2026-09-03, followed
  by PR #256 (0.2.53). The two W4 plans it blocked are now `READY` and
  refreshed. Before each remaining lane starts, apply its landing-event row: W2's named-skill
  lane re-sweeps `dispatch-and-dry-run.md` and the review-provide skills; W4's
  gate-override lane re-anchors `oat-project-plan-writing` and
  `user-sync-config.ts`; W3's smoke lane re-anchors `tools/smoke/CONTRACT.md`
  (an adjacent `runtimeObservation` section lands there). Its `p07-t04` also
  archives four backlog items and rewrites the backlog index, so any wave
  closeout after that merge must rebase its backlog bookkeeping.
- Stop at the operator checkpoint below before creating the W1 wrapper project
  or dispatching any implementation lane.

## Wave 1: CLI resolution and asset correctness

- **Parallel group 1:** Use configured docs index paths; validate asset-bundle
  structure. (The dispatch-stamp lane moved to W4 on 2026-09-02 because the
  in-flight truthfulness merge rewrites its cited skills.)
- **Group 2 status gate:** After structural asset validation completes and
  merges into the wave branch, revalidate the successor against that exact
  tree. The same gate applies to the docs-index exclusion successor: after the
  docs-index path lane merges into the wave branch, run that plan's step 1,
  set it `READY`, then implement it. Update or supersede its external plan and set `oat_execution_status` to
  `READY` only when the hard-dependency evidence and focused asset tests pass.
  Do not import or dispatch the successor while its source plan remains
  `BLOCKED`. Then implement the override-aware remedies and revalidate every
  pre-existing asset failure family plus the new structural branch.
- **Cross-wave prerequisites:** None beyond a fresh main baseline and operator
  approval. The docs-index lane carries the 2026-09-05 output-safety fix
  (default output is `<documentation.root>/index.md`; generation never writes
  the scaffold's authored `docs/index.md` or `mkdocs.yml`) and the canonical
  docs-root meaning (app root, with `<root>/docs` precedence as compatibility
  behavior); the exclusion successor and the W5 instruction-sync lane inherit
  that meaning rather than deriving their own.
- **Composition rationale:** The two first-group lanes are bounded CLI/runtime
  fixes with disjoint primary write surfaces. The third is a true ordered
  successor to the asset validator and remains in the same wrapper so its error
  matrix is tested against the exact delivered branch.

## Wave 2: Skill contract truthfulness

- **Group 1:** Repair the verified bundled-skill contract drift and merge it
  into the wave branch first.
- **Parallel group 2:** Harden the codex-skill anaphora guard; guard docs-app
  mirrors of contract-tested skill prose; require lifecycle orchestrators to
  load every named execution skill.
- **Group 3:** Document patch-and-restore recovery for lost child handles,
  after the named-skill lane, with one coordinated `oat-project-implement`
  bump. Draft PR #190 rewrites the same reference; apply that plan's
  landing-event row if #190 merges first.
- **Cross-wave prerequisites:** W1 merged (PR #262, 2026-09-06) — satisfied. Revalidate the lifecycle corpus if
  draft PR #190 changes before group 2 starts.
- **Composition rationale:** Group 1 establishes the corrected canonical prose
  baseline. The three guard/loading lanes can then run as peers against that
  baseline while coordinating canonical-skill versions, docs mirrors, shared
  contract tests, and release files once at fan-in.

## Wave 3: Workflow durability and containment

- **Parallel group 1:** Require repo-wide call-site sweeps for cross-cutting
  options; journal deterministic smoke worktrees before creation.
- **Group 2:** Require executable backstops for standing contract claims after
  the call-site sweep and W2 guard work provide current concrete examples.
- **Cross-wave prerequisites:** W2 merged (PR #267, 2026-09-06) — satisfied. The smoke lane receives a dedicated
  ownership and deletion-safety review before integration.
- **Composition rationale:** The first two lanes have write-disjoint workflow
  policy and smoke-tooling surfaces. The authoring-policy lane is not product-
  blocked by them, but ordering it second reduces prose churn and lets its
  examples cite freshly delivered executable contracts.

## Wave 4: Delivered-project follow-ups

- **Parallel group 1:** Disable configured lifecycle gates per project; warn
  on every non-sync manifest version restamp.
- **Group 2:** Emit the dispatch stamp with resolver JSON, after the
  gate-override lane: both write `review-skill-contracts.test.ts` and the
  version pins in `validation/skills.test.ts` (regrouped 2026-09-05).
- **Cross-wave prerequisites:** W3 merged (PR #269, 2026-09-06) — satisfied. The manifest-restamp and
  dispatch-stamp plans were refreshed and set `READY` on 2026-09-03 after
  PR #255 merged; re-anchor the gate-override plan's `oat-project-plan-writing` and
  `user-sync-config.ts` citations. Revalidate all three against live
  gate/status/dispatch surfaces because they follow freshly merged PRs #246,
  #249, and the truthfulness PR.
- **Composition rationale:** All three plans follow merged projects that own
  their surfaces. Their product surfaces (gate, status, dispatch) are
  independent, but the gate-override and dispatch-stamp lanes share two
  contract-test files, so they run in sequence; the gate-override lane also
  now owns the `oat-project-next` disposition consumer it previously omitted.

## Wave 5: Program-intake follow-ups

- **Parallel group 1:** Recover committed review artifacts after
  post-selection failures; keep instruction-sync pointers out of docs trees;
  route incomplete quick projects to quick-start.
- **Parallel group 2:** Retry gate project-log finalization across index
  locks (after group 1's gate plan); add `oat config unset` (after the
  instruction-sync plan so its family-coverage test includes the new
  `documentation.*` key); validate skill-to-script references.
- **Group 3 (sequential):** Enforce the external-plan readiness contract
  (after the skill-script lane, which shares a contract-test file), then make
  the autonomous recap capability-aware: both write
  `validation/skills.test.ts` (readiness adds contract cases and a pin; recap
  bumps two pinned skills). The recap lane no longer waits on `oat config
unset`; its optional seam keys live in `BL-260904-add-recap-seam-config-keys`.
- **Group 4 (sequential):** Defer activeProject clearing on archive
  completions, after the recap lane releases `oat-project-complete/SKILL.md`;
  then make terminal project status agree with completed revision plans,
  which now also edits `oat-project-next/SKILL.md` Step 5.2 and its pin (so it
  shares `validation/skills.test.ts` with the active-pointer lane and follows
  the group-1 quick-route lane on the `next` skill).
- **Group 5:** Make consolidated-project retirement semantic, after the
  active-pointer and quick-resume lanes; its sweep now runs before the
  project-log seal.
- **Cross-wave prerequisites:** W4 merged (PR #271, 2026-09-06) — satisfied; the Lite workflow PR #264 (new `oat-project-lite` skill; lifecycle skills, templates, control-plane, `commands/project/**`) lands between W4 and W5 and is part of the W5 drift refresh. Before dispatch, re-read every W5
  plan's `## Landing-event impact` table against the then-current state of
  `tool-pack-scope-provider-truthfulness` and PR #190 and apply the listed
  refreshes; the skill-script plan and the readiness plan re-anchor
  contract-test files the truthfulness merge rewrites.
- **Composition rationale:** Eleven lanes with five shared seams (the gate
  module; `OatDocumentationConfig`/`config/index.ts`; the completion skill,
  which three lanes edit in sequence; the `next` skill, which two lanes edit
  in sequence; and the skill contract-test files, above all the version pins
  in `validation/skills.test.ts`, which seven lanes write) arranged in five
  groups so each seam is touched by at most one lane at a time and the Wave 4
  index ordering (docs-index exclusions → instruction-sync → unset) is
  honored. Groups 3 and 4 are sequential pairs for that reason. The 2026-09-05
  review recommended splitting W5 after group 2; the operator kept one wrapper
  because every group ends in a full integration checkpoint and a split would
  renumber references across the corpus, indexes, and backlog links.

## Wave 6: Truthfulness residue

- **Parallel group 1:** Populate provider reachability evidence; validate
  review-ledger paths before the final PR; preserve `__proto__`-named config
  keys.
- **Group 2:** Honor `metadata.version` as the canonical skill version, after
  the pr-final lane releases the version pins in `validation/skills.test.ts`
  (its bulk-migration follow-up stays outside the program); diagnose
  canonical skills missing from a provider view in `oat tools info`, after
  the reachability lane releases `info-tool.ts`.
- **Cross-wave prerequisites:** W5 merged (PR #275, 2026-09-07; p09 parked and carried as `BL-260907-make-the-completion-seal`) — satisfied, so the shared contract-test seams
  the pr-final lane extends are settled. Apply the PR #190 landing-event rows
  in the pr-final and config-key plans if that draft merges first.
- **Composition rationale:** Three write-disjoint first-group lanes plus two
  ordered successors; the lanes share only the fan-in-owned lockstep files.
  Kept out of W5 because its five groups already allocate every contract-test
  seam.

## Wave 7: Post-program corrective lanes

- **Parallel group 1 (seven lanes):** read stdin with an fd-capable API in
  `finalize-synced-archive.mjs`; fix `oat config unset` and fold `adopt` onto
  the shared surface; guard bare `__proto__` literals in Markdown records;
  guard every packed asset directory; persist the native-skill adoption
  outcome in `oat status`; report a sync apply failure summary; harden the
  external-plan readiness contract and settle the wave-program ledger
  vocabulary (producer skill first, then `WAVE_STATUSES`).
- **Group 2 (five lanes):** make the completion seal idempotent and unpark W5
  p09, after the stdin lane releases `oat-project-complete`; harden normalized
  config maps, after the `unset`/`adopt` lane and the bare-proto guard; name
  the resolved symlink target (never beside the packed-asset lane:
  `configuration.md`); converge copy-strategy skill projections; put
  skill-asset formatting and the worktree-init test inside the CI gates (sole
  writer of root `package.json`, `.lintstagedrc.mjs`, `AGENTS.md` here).
- **Group 3 (two lanes):** reconcile the oat-doctor example; warn on a
  wrong-typed `documentation.root`, after the normalized-maps lane (config
  chain, third).
- **Group 4 (two lanes):** repair stray fences in lifecycle skills (takes the
  `create-agnostic-skill` and `oat-repo-improve` bumps the later lanes
  inherit); close the docs-index follow-ups, after the config chain (last
  writer of `config/resolve.ts`).
- **Groups 5–8 (one lane each, in order):** tighten the skill version
  validators (never beside the gates lane: root `AGENTS.md`); calculate
  dispatch baselines after journaling; correct the skill-authoring facts,
  after the fences lane; keep external-plan writes on the caller's model,
  after the readiness and fences lanes.
- **Cross-wave prerequisites:** W1–W6 merged and the program complete
  (2026-09-08) — satisfied; the bundled-skill migration (PR #280, CLI 0.2.65)
  and PR #273 (remote project management, `7d70ac307`) are the baseline every
  W7 plan was verified against. Draft PR #190 stays a landing event in every
  plan. The recon-intent project (`BL-260908-restore-recon-s-cheap-fan-out`)
  and the recap-simplification project (`BL-260907-replace-the-default-project`)
  run as their own projects, not as W7 lanes; the recap contract in
  `oat-wave-program` is unchanged by W7, so the program recap stays
  `not run — pending` until that project lands.
- **Composition rationale:** Twenty lanes, all written on the caller's model
  class (Fable) after delegated drafting, with the one dominant seam — eight
  lanes write `validation/skills.test.ts` — serialized across eight groups
  and every other lane placed beside exactly one of them; the config chain
  (`unset`/`adopt` → normalized maps → typed root → docs-index) and the two
  ordered skill-bump pairs (stdin → seal on `oat-project-complete`; fences →
  authoring-facts and fences → caller-model) fix the remaining order. Groups
  5–8 are singletons because the chain leaves nothing write-disjoint to place
  beside them; each fan-in there is small. The two high-priority items from
  the triage are deliberately outside the wave (own projects), and dispatch
  issue #266 waits for a producer.
- **Execution record (2026-09-09):** the wrapper ran the eight groups as six
  triples plus two solo lanes under the operator's concurrency ceiling of 3
  (group 1 p01–p03 … group 6 p16–p18, then p19, then p20 as the hill), with a
  root review of every lane (one to two rounds), eight fan-ins each gated by
  the full DoD sequence plus smoke, skills, scripts, and the root test with
  `Cached: 0`, and one lockstep bump 0.2.66 → 0.2.67 at the first fan-in. Five
  STOPs: p02, p05, p15, p17 closed by dated plan refreshes authored on the
  caller's model class and resumed the same day; p16 parked. The root final
  review (reconnaissance attempted) returned four Criticals — the closeout
  archival itself plus three product holes in the completion seal and the
  managed-copy digest — which ran as Phase 21 (three parallel fix lanes) and
  two bounded follow-ups on the project-log surface until every reader and
  writer sat behind one ambiguity predicate; round 4 passed and the configured
  exit gate passed. Twenty-three backlog items archived; fifteen `BL-260909-*`
  follow-ups filed; wave-close corrections written into fourteen plans.

## Revalidation record

- **2026-09-02 (intake)** — Added the Wave 4 index (12 plans) from the
  program-intake triage; coverage 25/25. Placed the docs-index exclusion plan
  as a W1 group-2 successor (`BLOCKED` until its predecessor merges),
  patch-and-restore in W2 group 3, and the other ten in a new W5. Every new
  plan carries a `## Landing-event impact` table for the truthfulness merge
  and PR #190. Ledger: W1 = 4 lanes, W2 = 5, W3 = 3, W4 = 3, W5 = 10.
- **2026-09-02 (review)** — Bugbot found two composition defects in W5:
  the active-pointer and recap lanes shared the completion skill in one
  group, and `oat config unset` ran before the instruction-sync pointer key
  it must cover. Recomposed W5 into five groups honoring the Wave 4 index
  ordering and added the recap → unset ordering neither document stated.
- **2026-09-03 (truthfulness landed)** — Rebased onto `origin/main`
  `cf0159893` (PR #255 truthfulness at `a06e9713a`, PR #256 duplicate-role
  sync fix). Re-ran all 25 drift checks from the repository root: drift
  matched every plan's landing-event forecast. Refreshed the manifest-restamp
  and dispatch-stamp plans against Manifest V2, the new engine save sites, the
  status collection-migration block, and the new `oat project dispatch record`
  surface; both are now `READY` (23 READY, 2 BLOCKED: the two ordered
  successors). Marked the event landed in every Wave 4 plan's impact table.
  PR #255 also created eight `BL-260903-*` items (residue, retro feedback, two
  pre-existing defects) and left `BL-260724` open by operator decision; none
  enter this program yet. No new GitHub issues since the intake triage.
- **2026-09-03 (residue planned)** — PR #253 merged (`dd41adb9b`) and the
  post-merge triage resume ran. Added the Wave 5 index (3 plans from the
  `BL-260903-*` residue) as a new W6; coverage 28/28 (26 READY, 2 BLOCKED).
  Filed `BL-260904-stabilize-the-collection` for the collection-detach test
  flake observed on #253's CI (main passed on identical code); unplanned
  until reproduced.
- **2026-09-04 (PR #248)** — Rebased onto `7c90b220a` (recon evidence
  packets, 113 files). Incremental drift for all 29 plans: adjacent only
  (`validation/skills.test.ts` recon pins, `oat-config.ts` `tools.requiredBy`
  leases, autonomy-contract inventory, bundle and bundled-docs contract
  tests) plus small anchor shifts re-applied in the manifest-restamp,
  provider-reachability, skill-version, and skill-script plans. PR #248 also
  added four backlog items; `BL-260901-make-terminal-project-status`
  (high/S) is plan-ready and unplanned, the recon-integration and
  corrective-revision items need discovery.
- **2026-09-04 (issue #258)** — Added the skill-versioning plan (Agent Skills
  spec `metadata.version`) as W6 group 2; coverage 29/29 (27 READY,
  2 BLOCKED). The bundled-skill migration is a separate backlog item outside
  the program.
- **2026-09-04 (status and diagnostic)** — Added the terminal
  project-status plan (root cause: the control-plane parser drops
  `## Phase p01:` and `## Revision Phase p-rev1:` headings, and the recommender
  never reads `lifecycle`) to W5 group 4 and the provider-view diagnostic
  (hosted in `oat tools info`, status untouched) to W6 group 2. Coverage
  31/31 (29 READY, 2 BLOCKED). Ledger: W5 = 11 lanes, W6 = 5.
- **2026-09-04 (independent review)** — Five independent review lanes (three
  Codex, two Claude) covered all 31 plans. Corpus-wide fixes: lockstep release
  files are now owned by the wave fan-in and no lane writes them; every
  2026-08-30 plan gained a landing-event table; reciprocal never-parallel rows
  now exist for every shared write surface. Substantive fixes: the
  active-pointer guard keys on `IS_DURABLE_PROJECT` (local scope never
  archives); the terminal-status plan normalizes heading dialect and task-id
  padding; the docs-index plan pins a derivation rule for the ambiguous
  `documentation.root` and propagates the `CliError` exit code; the recap plan
  moved its optional config step to `BL-260904-add-recap-seam-config-keys`;
  decision-record steps carry PJM preconditions; stale anchors from PRs #248
  and #255 were refreshed. Review record:
  `.oat/repo/reference/reviews/2026-09-04-external-plan-independent-review.md`.

- **2026-09-08 (program-close dispositions)** — Per the program contract's
  two program-close checkpoints: (1) **Program recap: not run —** the default
  `program-recap` path depends on the explainer-kit seam machinery that issue
  #230 shows cannot be relied on (`BL-260907-replace-the-default-project`,
  high, runs as its own spec-driven project); the program recap (W1–W6, and
  W7 once it lands) is generated after that project ships. Recorded here so
  discretion is distinguishable from oversight. (2) **Completion tail:
  standing deferral** — the operator decided on 2026-09-08 not to run
  `oat-project-complete`'s tail (archive, pointer clear) across the six wave
  wrapper projects now; owner: the wave-7 close, which runs the tail for all
  seven wrappers together after wave 7 lands the two completion-tail defects
  (`BL-260907-finalize-synced-archive-mjs`, `BL-260907-make-the-completion-seal`).
  The human-gated question has been asked once and answered; it is not
  repeated per wave. Post-program triage (PR #282) re-tiered the 42 follow-ups
  the program filed and scoped wave 7 (corrective lanes) plus two standalone
  projects (recon intent restoration `BL-260908-restore-recon-s-cheap-fan-out`;
  recap simplification).
- **2026-09-08 (W6 closed; program complete)** — Wave 6 executed as wrapper
  project `wave-6-execution` (five lanes in two groups, one lockstep bump to
  0.2.64 with the sync-manifest restamp in the same commit) and merged as
  PR #278 (`0ba401b31b7fc435e323b98681a5934a5e81f823`). All five W6 rows flip to `done`; the program's
  thirty-one plans are now thirty `done` and one `parked` (W5 p09, carried by
  `BL-260907-make-the-completion-seal`). Pre-dispatch, the wave-boundary recon
  found three false premises (the p04 plan's "eight callers" and pin
  inventory, the p03 plan's null-prototype consumer safety, the p05 plan's
  copy-drift assumption) and every plan received a dated
  `Refresh applied 2026-09-07` entry; the p03 lane later hit its own STOP
  (the plan's `getNodeValue` mechanism recursed where `parse` did not and a
  null-prototype object broke a `String()` coercion in `oat-config.ts`) and
  was resumed under a dated post-STOP refresh that replaced the mechanism
  with iterative materialization into plain objects — a STOP whose remedy
  lies within the plan's own file scope is closed by a refresh, not a park.
  Review economics: every lane had a root review; p01, p03, and p04 needed
  one fix round, p02 three (its first fix introduced a Critical — a
  `git check-ignore` acceptance the archived-directory rule replaced), p05
  two plus a rebase onto the merged p04 so its projected-copy reader could
  adopt the shared version resolver. The root final review and the
  configured exit gate ran after the group-2 fan-in (see the wrapper's
  `implementation.md` for the gate outcome). Plan corrections applied at
  this close: the p01 severity-matrix row for `provider-inactive`; the p02
  test-case labels and the review-receive citation; the p03 depth figure,
  the empty-content Test-plan bullet, and the `:1826→:1828` citation; the
  p04 Step 6 pin premise and the numeric-scalar narrowing. Follow-ups filed
  across the wave are listed in the wrapper's `implementation.md`; the bulk
  `metadata.version` migration (`BL-260904-migrate-bundled-skills-from`,
  raised to high on 2026-09-08) runs next as a standalone project.
- **2026-09-07 (W5 closed)** — Wave 5 executed as wrapper project
  `wave-5-execution` (eleven lanes in five groups, one lockstep bump to 0.2.63
  with the sync-manifest restamp in the same commit) and merged as PR #275
  (`cc91a2d21077ada69f52775b87abedd451e48994`). Ten W5 rows flip to `done`; the eleventh (defer activeProject
  clearing on archive completions) is `parked`: its plan's own STOP fired because
  the completion seal append is not idempotent and `oat project log check`
  cannot see a seal, so the plan's pre-archive resume premise is false
  (reproduced on the CLI); refresh or supersede it under
  `BL-260907-make-the-completion-seal` before a later wave runs it, and note
  the incidental pre-existing bug it found (`BL-260907-finalize-synced-archive-mjs`:
  the synced deferred clear from PR #254 always fails on a numeric-fd
  `readFile`). Pre-dispatch, the wave-boundary refresh was applied to eight
  plans as dated `Refresh applied 2026-09-07` entries in their Revalidation
  sections (the plan gate rejected wrapper-side addenda three times; this is
  the program's own mechanism from 2026-09-03/04 and stays the rule). Review
  economics: every merged lane had a root review; p02, p03, p06, p07, p08,
  p10 needed one fix round each and p01, p04, p05 an address-now sweep; the
  p08 review caught a red root `pnpm test` (a smoke-tier skill-version pin the
  CLI package filter never runs). Program-wide rules adopted: sweep old skill
  version literals repo-wide in plain and regex-escaped forms and run
  `pnpm test:smoke` whenever a skill is bumped; run gates sequentially in one
  worktree; paste commit SHAs from `git rev-parse`; a reviewer's "do not weaken
  — file and pin" ruling governs the fix round. Plan corrections applied in
  this refresh (execution records plus the artifact-alignment items the
  reviews found): the recover-review-artifacts plan's Done checkbox and two
  Test-plan bullets; the quick-start routing plan's `oat_template` reading
  (absent-or-false); the terminal-status plan's Step 2 Verify sentence; the
  stale BLOCKED dependency row in the docs-index exclusions plan; the
  gate-override (W4) plan's cross-wave rows already landed.
  Exit gate: after the root final review passed, the configured cross-family
  gate blocked attempt 1 on seven cross-lane composition gaps (gate-log
  concurrency and HEAD identity, the control-plane recommender bypassing the
  quick-plan readiness predicate because the p03 plan's out-of-scope note was
  false, `oat config unset` missing p02's key, stale-receipt classification,
  tab-indented fences, the backlink backstop, the pre-creation `PROJECT_PATH`)
  — fixed as Phase 12 (p12-t01..t07) in three parallel lanes and root-reviewed;
  a second launch's reviewer passed but the harness killed the gate for low
  memory before its receipt (superseded; p12-t08); the re-run blocked on a
  stale summary sentence plus two backlink-rule Mediums (p12-t09), exhausting
  the configured attempts; the operator authorized attempt 3, which passed
  (Mediums deferred as `BL-260907-harden-the-external-plan`); a post-gate
  Linux-only CI failure (case-mismatched content-root probe) was fixed and
  accepted by the operator without a further re-run. Program rules adopted
  from the gate: root final-review briefs enumerate sibling-plan dependency
  rows and every plan premise about another package; a wave-boundary premise
  probe executes each plan's current-state claims against the built CLI;
  filesystem-case tests run under a mocked probe or a case-sensitive image.
  Sixteen follow-ups filed across the wave are listed in the wrapper's
  `implementation.md`. W6 unblocked.
- **2026-09-06 (W4 closed)** — Wave 4 executed as wrapper project
  `wave-4-execution` (three lanes, two groups, one lockstep bump to 0.2.59 with
  the sync-manifest restamp in the same commit — that sync printed p02's new
  advisory on the repository manifest) and merged as PR #271 (`81b784c3d3660968291a00cfc814336a36786c74`).
  All three W4 rows flip to `done`. Review economics: the plan gate passed
  first time (zero findings) because the wrapper was authored from this
  section and the recon rather than from the previous wave's artifacts; p01
  and p02 each needed one fix round (Codex caught a Critical in p01
  pre-commit: a stored `project_disabled` transition was reusable after
  re-enable; the p02 root reviewer found a `No changes required.` line the
  pinned test could not see because the suite's injected formatter never
  emitted it); p03 passed with an address-now sweep; the final review found
  three prose contradictions outside the lanes' diff (discover/design gate
  steps and `autonomy.md` still teaching `null` ⇒ no gate) and record
  defects, all fixed on the root branch before the exit gate, which passed on
  its first run (one Medium deferred). Program-wide rules adopted: pin
  inventories by version literal (two lanes found more pins than briefed);
  reviewer briefs require a live probe of the built CLI for command-surface
  lanes and a re-run of implementer probes when Codex ran source-only; a
  docs or decision-record contradiction inside the integration diff's own
  rule is fixed in the wave. Plan corrections applied in this refresh: the
  gate-override plan's Dependencies table gains cross-wave rows for
  `apps/oat-docs/docs/contributing/skills.md` (W6 group 2) and
  `packages/cli/src/commands/project/complete-state/state-utils.test.ts` (W5
  group 4); execution records on all three plans. Follow-ups filed: sync-apply
  branch precedence on rejected collections; persist status native-skill
  adoption; the unused project-state frontmatter allowlist; per-scope
  restamp-only suppression; harden the dispatch-stamp contract helper.
  Decision records: `DR-260906-project-scoped-gate-overrides` (supersedes in
  part DR-260718), `DR-260906-manifest-restamp-advisories`,
  `DR-260906-the-dispatch-ceiling-resolver`. W5 unblocked after PR #264.
- **2026-09-06 (W3 closed)** — Wave 3 executed as wrapper project
  `wave-3-execution` (three lanes, two groups, one lockstep bump to 0.2.58 with
  the sync-manifest restamp in the same commit) and merged as PR #269
  (`ed75370db9f7cf43cd884572bd58502aa71f22bd`). All three W3 rows flip to `done`. Review economics: p01 and
  p02 each needed one fix round (the deletion-safety review found an
  undocumented residual the lane had labelled documented); p03 passed outright
  with an address-now sweep. Program-wide rules adopted: lanes sync
  `--scope project` only (`--scope all` rewrites the operator's user-scope
  provider views — every plan step that says `oat sync --scope all` is read as
  `--scope project`); probe restores use `mktemp -d` backups, never
  `git checkout --` on uncommitted work; reviewer briefs demand the exact
  documentation location for any "documented residual" and a probe of the
  residual itself. Plan corrections applied in this refresh: the call-site
  plan's In-scope list gains `packages/cli/src/validation/skills.test.ts`
  (its steps 4–5 move the agent pins) and records the reported owner decision
  for `phase-execution.md:608`; the sync-scope convention on all three plans.
  Follow-ups filed: extend `check:skill-bumps` to canonical agent files;
  negation-aware sweep-contract tests; project reservation state into the
  smoke evidence bundle; run `scripts/worktree/init.test.mjs` under a gate.
  W4 unblocked.
- **2026-09-06 (W2 closed)** — Wave 2 executed as wrapper project
  `wave-2-execution` (five lanes, three groups, one lockstep bump to 0.2.57)
  and merged as PR #267 (`ca71c00a014a6eba00cb4cd4c46974fc6aa58139`). All five W2 rows flip to `done`. Review
  economics: every lane needed at least one fix round (p05 two, plus two
  post-PR rounds), two Criticals were introduced by fixes and caught by
  disposition-verification rounds, the root final review took three rounds,
  Cursor Bugbot found a High ordering defect in the recover-mode contract that
  every earlier round had missed, and the configured exit gate ran three times
  (pass → stale → blocked → pass). Rules adopted for later waves: the fan-in
  bump commit restamps `.oat/sync/manifest.json`; lane and reviewer briefs
  carry forced-turbo gate forms, the real package filter, the scratch-hygiene
  rule, and a two-round cap on Codex pre-commit reviews; disposition rounds
  execute prose shell snippets verbatim and walk every failure sequence of a
  contract; `oat gate review` writes its own Reviews row, so receive moves it
  forward in place. Plan corrections applied in this refresh (from
  `BL-260906-wave-2-external-plan`): the bundled-skill plan's step-2 wording
  and `analyze` pin; the named-skill plan's thirteen-skill list and two ripple
  tests; the patch-and-restore plan's conditional step 5; the anaphora plan's
  accepted anaphor-only shape. Follow-ups filed:
  `BL-260906-repair-the-stray-fence-in-oat`,
  `BL-260906-cover-skill-test-files-under`,
  `BL-260906-reconcile-the-oat-doctor`. W3 unblocked.
- **2026-09-06 (W1 closed)** — Wave 1 executed as wrapper project
  `wave-1-execution` (four lanes, two groups, one lockstep bump to 0.2.56) and
  merged as PR #262 (`6db0457c095e4384e5ac2f464ee1c4d5a47d0179`). Two of the four plans' rows flip to `done`
  together with their two ordered successors; both successors were flipped
  `BLOCKED → READY` inside the wave after their readiness checks. Wave
  learnings adopted as program rules: flip successor plans in the fan-in
  bookkeeping commit with cited evidence; address-now sweeps for Medium/Minor
  findings go through the original implementer handle; record lane-commit SHA
  mappings at every rebase; file the follow-up ledger as backlog items before
  the final gate. Plan corrections applied in the wave: the docs-index plan's
  config-write clause and its dependency row; the two successors' status
  callouts. Still queued: the exclusions plan's PR #190 landing row
  under-reports three shared files (moot once W1 merged; PR #190 must rebase
  onto the new `index-generate`, `oat-config.ts`, and docs pages). Follow-ups
  `BL-260906-guard-packed-asset-directories`,
  `BL-260906-report-errno-for-asset-root`, and
  `BL-260906-docs-index-follow-ups-from` are unplanned candidates. W2 unblocked.
- **2026-09-05 (Astra review)** — An independent GPT 6 Astra review (three
  luna and one terra subagents) of all 31 plans at `6d5c11243` returned 3
  Critical, 19 Important, and 9 Medium findings; all were accepted except the
  W5 wave split (declined, see the W5 rationale) and the W2 repair split
  (recorded as an explicit policy exception). Corpus-wide: lane instructions
  that still bumped the five packages or ran release gates were replaced by
  the lane/fan-in/final verification modes above; the version-pin file
  `validation/skills.test.ts` was recognized as a hidden shared write and W4
  and W5 groups 3–4 were resequenced; PR #190 landing rows that claimed "No"
  for files the draft actually touches (my earlier file list stopped at 100 of 217) were corrected. Substantive: docs-index generation no longer defaults
  its output to the scaffold's authored `docs/index.md` or `mkdocs.yml`; the
  patch-and-restore recipe fails closed on unsupported dirt and captures
  binary-safe state; the retirement sweep moved before the project-log seal;
  the gate-override, terminal-status, and quick-route plans now own their
  `oat-project-next` consumers; the recap preflight includes the set planner;
  the active-pointer resume is narrowed to post-archive receipt failure; the
  readiness validator gains legacy-read mode and inspected-HEAD provenance;
  the metadata-version plan drops its false parser-reuse premise and the
  `check:skill-bumps` severity conflict. Review record with dispositions:
  `.oat/repo/reference/reviews/2026-09-05-external-plan-review-astra.md`.

- **2026-09-02** — Rebased the program branch onto `origin/main`
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` (PR #254, retire archived synced
  project records). Re-ran all 13 drift checks: only lockstep version bumps,
  test line shifts, `oat-project-complete` 1.7.6 (fallback citation moved
  406 → 465 in the named-skill plan), and unrelated docs prose. All 13 plans
  re-stamped to that baseline. Verified the in-flight
  `tool-pack-scope-provider-truthfulness` branch read-only at `27b978528`
  (190 files vs. the same merge-base): it implements neither the manifest
  restamp nor the dispatch stamp outcome, but rewrites both plans' surfaces,
  so both are now `BLOCKED` on its merge and the dispatch-stamp lane moved from
  W1 to W4. PR #190 (`81a51d2d`, draft) and issue #211 remain open soft
  triggers. Composition: W1 = 3 lanes, W2 = 4, W3 = 3, W4 = 3; coverage still
  13/13.

- **2026-09-08 (post-program triage; W7 composed)** — The program closed on
  2026-09-08 (W6 merged; 30 of 31 plans done, p09 parked). The post-program
  triage (`.oat/repo/pjm/triage/2026-09-08-post-program-triage.md`, PR #282)
  dispositioned the 42 open follow-ups the program created: two highs became
  their own projects (recon intent restoration, recap simplification), five
  items were closed, and twenty-two entered the Wave 7 index as twenty plans
  (two items split or merged during planning; the operator added the
  caller-model plan-write rule during composition). Every plan was drafted
  on Opus and then re-verified and rewritten by same-model (Fable) reviewers
  against `origin/main` `7d70ac307` (PR #273 merged); the readiness contract
  passes for all 51 dated plans. Added the Wave 7 index as W7 (eight groups);
  coverage 51/51 (20 new rows `pending`). Ledger: W7 = 20 lanes, `composed`,
  awaiting operator composition approval.
- **2026-09-08 (W7 approved; execution started)** — PR #284 merged
  (`684bd3be3`); the operator approved the wave-7 map and its autonomous
  execution. Wrapper `.oat/projects/shared/wave-7-execution` scaffolded at that
  base (drift 20 PASS / 0 / 0, mechanical); the plan gate's first attempt found
  the parked wave-5 p09 patch lost from disk — recovered from the implementer
  transcript into the wrapper's `parked/wave-5-p09/` — and a stale root
  `AGENTS.md` write attributed to the authoring-facts plan (corrected in the
  index and the Wave Table note). Ledger: W7 `in-progress`.

## Operator checkpoint

The four-wave composition is ready for review. Before W1 execution, the
operator must explicitly approve this program, its ordering, and its
concurrency assumptions. Approval to merge the program artifact does not by
itself authorize creation of a wave wrapper project, implementation dispatch,
or wave PR mutation.

The Wave 7 composition (2026-09-08) is a new checkpoint under the same rule:
the 2026-09-05 approval covered W1–W6, so W7 execution — its wrapper project,
dispatch, and PR mutation — waits for explicit operator approval of the
twenty-lane, eight-group map above and of its concurrency assumption (a single
`validation/skills.test.ts` writer per group).

**Wave 7 checkpoint answered 2026-09-08:** the operator approved the composition
and its autonomous execution after PR #284 presented the map (merged as
`684bd3be3`); the wrapper project `.oat/projects/shared/wave-7-execution` batches
the eight groups to the concurrency ceiling of 3 without changing any stated
ordering.

**Program completion checkpoint (2026-09-09):** with W7 merged every composed
wave is `merged`. The completion-tail question ("run the completion tail across
all seven wave wrapper projects now?") was answered in advance by the operator's
standing decision recorded at the W1–W6 close — the tail is a standing deferral
whose owner is the wave-7 close, to be run for all seven wrappers at that point
— so the wave-7 close ran `oat project complete-state` → `oat project archive`
→ active-project pointer clear → completion bookkeeping for `wave-1-execution`
through `wave-7-execution` on 2026-09-09 (each log sealed after its roll-up and
synthesis; seven archive receipts with S3 paths; summaries exported under
`.oat/repo/reference/project-summaries/`), and every ledger disposition above
reads `done`. The program recap stays `not run — pending
BL-260907-replace-the-default-project` until that standalone project lands.
