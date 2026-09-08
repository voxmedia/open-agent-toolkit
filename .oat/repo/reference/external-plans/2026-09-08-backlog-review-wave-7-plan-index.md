---
oat_generated: true
oat_external_plan_index: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/triage/2026-09-08-post-program-triage.md
  - .oat/repo/pjm/backlog/index.md
oat_external_plan_commit: 1820d7504f4402583cf1d7ca7bf5258400de637a
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
oat_external_plan_date: '2026-09-08'
created: '2026-09-08T22:11:01Z'
---

# External Plan Index: Backlog review Wave 7 (post-program corrective wave)

This index records selection and ordering. It is not an executable plan and is
not an `oat-project-import-plan` target.

## Selection

- Selected: the corrective lanes the 2026-09-08 post-program triage (PR #282)
  approved from the follow-ups the 2026-08-31 execution program filed, plus the
  same-model plan-write rule the operator asked for during composition. Every
  claim was re-verified against `origin/main` `7d70ac307` (PR #273 merged) by
  same-model (Fable) reviewers with rewrite authority after delegated drafting.
- Deliberately not in the wave (own projects or backlog): recon intent
  restoration (`BL-260908-restore-recon-s-cheap-fan-out`, decision-led project);
  recap simplification (`BL-260907-replace-the-default-project`, spec-driven
  project); dispatch #266 (needs a producer and a terminal-outcome matrix);
  `BL-260907-type-check-cli-test-files`; `BL-260906-re-evaluate-universal-plan`;
  `BL-260907-recognize-phase-level`; `BL-260908-repair-or-exempt-archived`;
  `BL-260908-restructure-the-authoring`; `BL-260908-remove-the-top-level-skill`
  (release-gated); the low polish items.
- Unaudited or out of scope: implementation, plan import, PR creation, issue
  mutation.

## Recommended order

| Order | Plan                                                                                                                                                                                   | Source item                                                                                                                            | Execution    | Depends on                                                                                                                                                                                                                          | Rationale                                                                                                                                                                                                                                             |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | [Read stdin with an fd-capable API in finalize-synced-archive.mjs](./2026-09-08-read-stdin-in-finalize-synced-archive.md)                                                              | `BL-260907-finalize-synced-archive-mjs`                                                                                                | READY (S)    | None in the wave; first writer of `oat-project-complete/SKILL.md`, `finalize-synced-archive.mjs`, and the `validation/skills.test.ts` pins                                                                                          | PR #254 retro defect: the archive finalizer reads stdin through an API that drops piped input; small, releases the completion-skill seam for the seal lane.                                                                                           |
| 2     | [Let `oat config unset` remove a malformed value, and fold `adopt` onto the shared surface-flag resolver](./2026-09-08-fix-oat-config-unset-and-adopt.md)                              | `BL-260907-let-oat-config-unset-remove`, `BL-260907-fold-oat-config-adopt-onto`                                                        | READY (S)    | None in the wave; first writer of `commands/config/index.ts` and `config/resolve.ts`                                                                                                                                                | Two W5 follow-ups on one surface: `unset` cannot remove a malformed value and `adopt` bypasses the shared surface; opens the config chain.                                                                                                            |
| 3     | [Guard repository Markdown against the formatter rewriting a bare prototype-key literal into bold](./2026-09-08-guard-bare-proto-in-markdown-records.md)                               | `BL-260908-keep-a-bare-proto-in-markdown`                                                                                              | READY (S)    | None in the wave; must merge before the normalized-config-maps lane, whose source item title it repairs                                                                                                                             | W6 retro: the formatter rewrote a bare `__proto__` literal in three records; a contract test pins the corpus and repairs the titles.                                                                                                                  |
| 4     | [Guard a packed path under every required asset directory](./2026-09-08-guard-every-packed-asset-directory.md)                                                                         | `BL-260906-guard-packed-asset-directories`                                                                                             | READY (S)    | None in the wave; never grouped with the symlink-target lane (both write `cli-utilities/configuration.md`)                                                                                                                          | W1 review follow-up: the release contract probes one packed directory and would pass an empty bundle for the other six.                                                                                                                               |
| 5     | [Make `oat status` persist and pin its native-skill adoption outcome](./2026-09-08-persist-native-skill-adoption-in-status.md)                                                         | `BL-260906-persist-status-native-skill`                                                                                                | READY (XS–S) | None in the wave; sole writer of `commands/status/**` and `commands/shared/native-skill-disposition.ts`                                                                                                                             | W4 review follow-up, narrowed by the same-model review: `oat status` computes a native-skill adoption outcome it never persists or pins.                                                                                                              |
| 6     | [Make `oat sync` report a failure summary instead of "No changes required." when a rejected collection leaves zero planned operations](./2026-09-08-fix-sync-apply-failure-summary.md) | `BL-260906-fix-sync-apply-branch`                                                                                                      | READY (S)    | None in the wave; sole writer of `commands/sync/apply.ts` and `commands/sync/index.test.ts`                                                                                                                                         | W1 review follow-up: a rejected apply reports "No changes required."; the engine already carries the partial result the summary ignores.                                                                                                              |
| 7     | [Harden the external-plan readiness contract and settle the wave-program ledger vocabulary](./2026-09-08-harden-the-external-plan-readiness-contract.md)                               | `BL-260907-harden-the-external-plan`, `BL-260907-settle-the-oat-wave-program`                                                          | READY (M)    | None in the wave; must merge before the caller-model lane, which adds a case to the same `skills-bundled-docs-contract.test.ts` and `wave-workflows.md`                                                                             | W5 follow-ups: the readiness sweep has known blind spots and the wave-program ledger vocabulary (`composed`/`in-progress`/`merged`/`done`) is not the one the producer skill writes; settles both, producer first.                                    |
| 8     | [Make the completion seal idempotent and unpark wave-5 p09](./2026-09-08-make-the-completion-seal-idempotent.md)                                                                       | `BL-260907-make-the-completion-seal`                                                                                                   | READY (M–L)  | After the stdin lane (shared `oat-project-complete/SKILL.md`, `finalize-synced-archive.mjs`, `review-skill-contracts.test.ts`, and the pins); the parked W5 p09 patch in `.worktrees/wave-5/p09` is a soft prerequisite             | Unparks W5 p09 (issue #252): a re-run completion tail double-seals the project log; makes the seal idempotent and lands the parked deferral change behind it.                                                                                         |
| 9     | [Harden normalized config maps against a preserved `__proto__` key](./2026-09-08-harden-normalized-config-maps.md)                                                                     | `BL-260908-guard-normalized-config-maps`                                                                                               | READY (M)    | After the `unset`/`adopt` lane (shared `commands/config/index.ts`, `config/resolve.ts`) and the bare-proto guard; sole wave-7 writer of `commands/gate/index.ts:1220`                                                               | W6 follow-up of the preserved `__proto__` key: the normalizers that consume it index prototype state; `getOwnKey`/`setOwnKey` at every swept site with a pinned control.                                                                              |
| 10    | [Name the resolved target in the symlink inert-exclusion warning](./2026-09-08-name-the-resolved-symlink-target.md)                                                                    | `BL-260907-name-the-resolved-target`                                                                                                   | READY (XS)   | Never grouped with the packed-asset lane (both write `configuration.md`); sole writer of `commands/instructions/**`                                                                                                                 | W5 review polish: the inert-exclusion warning names the symlink, not the target the exclusion resolved to.                                                                                                                                            |
| 11    | [Converge copy-strategy skill projections so a synced copy reads in sync](./2026-09-08-converge-copy-strategy-skill-projections.md)                                                    | `BL-260908-make-copy-strategy-skill`                                                                                                   | READY (M)    | None in the wave; sole writer of `engine/compute-plan.ts` and `engine/execute-plan.ts`; the sync-apply lane reads them as evidence only                                                                                             | Migration retro: a copy-strategy projection of a skill reads as drifted immediately after sync because the plan and the diagnostic hash different renderings.                                                                                         |
| 12    | [Put skill-asset formatting and the worktree-init test inside the gates CI actually runs](./2026-09-08-cover-skill-and-script-tests-in-repo-gates.md)                                  | `BL-260906-cover-skill-test-files-under`, `BL-260906-run-scripts-worktree-init-test`                                                   | READY (XS)   | Never grouped with the validators lane or the authoring-facts lane (root `AGENTS.md`) or the bare-proto guard (`.lintstagedrc.mjs`); sole writer of root `package.json`                                                             | Two W2/W3 follow-ups: skill-asset formatting and the worktree-init test run in no gate CI executes; folds them into `pnpm check` and `pnpm test`.                                                                                                     |
| 13    | [Make the oat-doctor dashboard example describe a state the doctor can report](./2026-09-08-reconcile-the-oat-doctor-example.md)                                                       | `BL-260906-reconcile-the-oat-doctor`                                                                                                   | READY (XS)   | Serialized with the other `validation/skills.test.ts` writers; sole writer of `oat-doctor/SKILL.md`                                                                                                                                 | W2 review follow-up: the dashboard example in the doctor skill describes a state the doctor cannot report; one bump, one pin.                                                                                                                         |
| 14    | [Warn on a wrong-typed `documentation.root` instead of dropping it in silence](./2026-09-08-warn-on-wrong-typed-documentation-root.md)                                                 | `BL-260907-warn-when-documentation-root`                                                                                               | READY (S)    | After the normalized-config-maps lane and the `unset`/`adopt` lane (shared `config/oat-config.ts`, `commands/config/index.ts`); before the docs-index lane so its `DEFAULT_SHARED_CONFIG.documentation` defaults re-anchor once     | Split from the normalized-config-maps plan by the same-model review: a wrong-typed `documentation.root` is dropped in silence today; a warning instead of a drop.                                                                                     |
| 15    | [Repair the stray fences that hide normative skill prose and widen the fence scanner across `.agents/skills`](./2026-09-08-repair-stray-fences-in-lifecycle-skills.md)                 | `BL-260906-repair-the-stray-fence-in-oat`                                                                                              | READY (M)    | Serialized with the `validation/skills.test.ts` writers; must merge before the authoring-facts lane (shared `create-agnostic-skill` bump and `skill-template.md`) and before the caller-model lane (shared `oat-repo-improve` bump) | W2 follow-up: unclosed fences hide normative prose in five skill assets; repairs them and widens the fence scanner so the class cannot recur.                                                                                                         |
| 16    | [Close the docs-index follow-ups from the wave-1 reviews](./2026-09-08-close-the-docs-index-follow-ups.md)                                                                             | `BL-260906-docs-index-follow-ups-from`                                                                                                 | READY (S–M)  | After the config chain (shared `config/resolve.ts` with the `unset`/`adopt` and normalized-maps lanes; `DEFAULT_SHARED_CONFIG.documentation` with the typed-root lane); PR #190 soft                                                | W1 review follow-ups: canonicalized index-generate paths, null-vs-absent excludes, and the `docs init` config builder; last writer of `config/resolve.ts`.                                                                                            |
| 17    | [Close the version-validator gaps: agent roles, unresolvable versions, the alias promotion, and scripts-only skill changes](./2026-09-08-tighten-the-skill-version-validators.md)      | `BL-260906-extend-check-skill-bumps`, `BL-260908-report-a-changed-skill-with-no`, `BL-260908-retire-the-top-level-skill` (step 1 only) | READY (M+)   | Serialized with the `validation/skills.test.ts` writers; never grouped with the gates lane (root `AGENTS.md`) or the fences lane (`.agents/agents/*.md`); the alias retirement step 2 lands one release later                       | Migration follow-ups: the bump validator skips agent roles, an unresolvable version passes, and the top-level `version:` alias is still promoted; closes the gaps and starts the alias retirement.                                                    |
| 18    | [Resolve the accepted execution baseline after mandatory launch journaling, and make the ordering auditable](./2026-09-08-calculate-dispatch-baselines-after-journaling.md)            | `BL-260906-harden-dispatch-launch` (baseline half; issue #266 stays out)                                                               | READY (M)    | Serialized with the `validation/skills.test.ts` writers; no other seam                                                                                                                                                              | W3 review follow-up, narrowed: the accepted execution baseline is computed before the mandatory launch journal, so the record can cite a head that never dispatched; resolves after journaling and makes the ordering auditable (`oat.observedHead`). |
| 19    | [Correct the factual skill-authoring claims and give each one a named backstop](./2026-09-08-correct-skill-authoring-facts.md)                                                         | `BL-260908-correct-the-factual-skill`                                                                                                  | READY (M)    | After the fences lane (shared `create-agnostic-skill/SKILL.md`, `skill-template.md`; one bump); serialized with the `validation/skills.test.ts` writers (it edits references to `AGENTS.md` inside two skills, not the root file)   | Issue #277's factual half: the authoring guidance states claims the validators contradict; corrects each and gives it a named backstop. The redesign half is `BL-260908-restructure-the-authoring`, outside the wave.                                 |
| 20    | [Keep external-plan writes on the caller's model class in oat-repo-improve](./2026-09-08-keep-plan-writes-on-the-callers-model.md)                                                     | `BL-260908-keep-external-plan-writes`                                                                                                  | READY (S)    | After the readiness lane (shared `skills-bundled-docs-contract.test.ts`, `wave-workflows.md`) and the fences lane (shared `oat-repo-improve` bump); serialized with the `validation/skills.test.ts` writers                         | Operator ruling during composition: `oat-repo-improve` Step 2 reserves plan writes for the caller, but nothing stops a delegate on a weaker model class from writing them; pins the rule in the skill, the wave skill, and a contract case.           |

## Dependency notes

- **Eight groups, one seam per group.** Eight lanes write
  `packages/cli/src/validation/skills.test.ts` (version pins or its sweeps):
  the stdin, seal, doctor, fences, validators, dispatch, authoring-facts, and
  caller-model lanes. No two of them share a group, so the wave has eight
  sequential groups; every other lane is placed beside exactly one of them.
  Whichever writer merges later re-anchors its pins by the old literal.
- **Group 1 (seven lanes, write-disjoint):** stdin (1), `unset`/`adopt` (2),
  bare-proto guard (3), packed-asset guard (4), status adoption (5), sync
  apply summary (6), readiness contract (7). The readiness lane sweeps the
  corpus, so it runs once every wave-7 plan exists on the branch, which is
  already the case.
- **Group 2 (five lanes):** completion seal (8) after the stdin lane (one
  `oat-project-complete` bump, `finalize-synced-archive.mjs`,
  `review-skill-contracts.test.ts`); normalized config maps (9) after the
  `unset`/`adopt` lane and the bare-proto guard; symlink target (10), whose
  only seam is `configuration.md` with the group-1 packed-asset lane;
  copy-strategy projections (11), sole writer of the engine files the
  sync-apply lane cites as evidence; repo gates (12), sole writer of root
  `package.json`, `.lintstagedrc.mjs`, and `AGENTS.md` in this group.
- **Group 3 (two lanes):** doctor example (13) and the typed
  `documentation.root` warning (14), which closes the config chain
  (`unset`/`adopt` → normalized maps → typed root) before the docs-index lane
  re-anchors `DEFAULT_SHARED_CONFIG.documentation` once.
- **Group 4 (two lanes):** fences (15) and docs-index follow-ups (16). The
  fences lane merges before the authoring-facts lane (7) and the
  caller-model lane (8) because it takes the `create-agnostic-skill` and
  `oat-repo-improve` bumps those lanes would otherwise repeat; the docs-index
  lane is the last writer of `config/resolve.ts`.
- **Groups 5–8 (single lanes):** validators (17), dispatch baseline (18),
  authoring-facts (19), caller-model plan writes (20). The validators lane
  never shares a group with the gates lane (root `AGENTS.md`) or the fences
  lane (`.agents/agents/*.md`); the caller-model lane follows the readiness
  lane on `skills-bundled-docs-contract.test.ts` and `wave-workflows.md`.
- **One bump per skill in the PR diff.** `oat-project-complete` (stdin then
  seal), `create-agnostic-skill` (fences then authoring-facts), and
  `oat-repo-improve` (fences then caller-model) are each edited by two
  ordered lanes; the second lane inherits the first lane's bump and does not
  bump again. `oat-doctor`, `oat-wave-program`, `oat-wave-execute`,
  `oat-project-review-provide`, `oat-repo-knowledge-index`, and
  `oat-agent-instructions-apply` have one writer each.
- **Lockstep files belong to the fan-in.** The five `package.json` files and
  `packages/cli/assets/public-package-versions.json` are named "never edit"
  in every plan that lists them; the wave takes one lockstep bump
  (0.2.66 → 0.2.67 at the first fan-in, above `origin/main` at that time) with
  the `sync --scope project` manifest restamp.
- **Landing events.** Every plan carries a `## Landing-event impact` row for
  draft PR #190 (`ReviewPlan Stage A`); PR #273 (remote project management)
  is already the baseline (`7d70ac307`), and its rows are marked landed. The
  bare-proto guard asks the fan-in to regenerate `.oat/repo/pjm/backlog/index.md`
  after any lane closes or renames a backlog item.
- **Outside the wave, by decision.** Recon intent restoration and recap
  simplification are their own projects; dispatch issue #266 needs a
  producer; the alias-retirement step 2 (`BL-260908-remove-the-top-level-skill`)
  lands one release after the validators lane.

## Execution Programs

- This batch is scheduled as Wave 7 of
  [`2026-08-31-execution-program.md`](./2026-08-31-execution-program.md) by the
  `oat-wave-program` refresh of 2026-09-08.
