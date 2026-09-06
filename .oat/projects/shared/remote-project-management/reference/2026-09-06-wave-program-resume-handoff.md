# Resume handoff: remote-project-management after execution-program waves 1–4

**Written:** 2026-09-06 by the wave-program orchestrator (session `repo-improve-wave`), from a read-only reconnaissance of this branch at `cd47e72f7` against `origin/main` at `0af558db8` (post wave-3 close) and the wave-4 branch.
**Audience:** the agent that resumes this project. Read this before touching code.

## 1. Where this project stopped

- Spec-driven, sequential, dispatch policy managed/high; HiLL checkpoints discovery/spec/design all completed. Phase `implement`, status `in_progress` (`state.md:14-15`).
- Eight phases plus two revision phases, 84 tasks. p01–p06 and p-rev1/p-rev2 complete. **p07's ten tasks are committed (`390f21157`) but the phase is not complete**; p08 (docs, skill refs, lockstep bump, release gate) untouched.
- Blocker, verbatim from `state.md:5-8`: `Phase 7 production command routing requires operator-authorized recovery scope expansion into service.ts and service.test.ts`. Cause (`implementation.md:1072-1077`): `index.ts` registers closeout, discussion, resolution, doctor, and migration through `createProductionRemoteRunner()`, while `service.ts` dispatches only the pre-phase-7 operations; production store bridges are absent. Recovery event `p07-recovery-01-production-command-routing-20260905` is `direction-required`, attempt 0/10, no edit made (`implementation.md:1056-1080`, run record `:2148-2211`).
- Review ledger: 27 rows (`plan.md:1393-1419`); **the p07 row is `pending` with every column empty** (`plan.md:1414`). No fix tasks are queued.
- Next lifecycle action recorded in `state.md`: the operator authorizes or declines one bounded same-target phase-7 recovery adding production dispatch/store bridges plus tests in `service.ts` / `service.test.ts`; the phase-7 review (0/3) starts only after that recovery passes. Verification baseline at the stop: union 165/165, remote 665/665, smoke 141/141.

## 2. What landed on main underneath this branch

Merge base `2c6005d64` (PR #249). Since then main merged the execution program's waves 1–3 (PRs #262, #267, #269 plus close PRs #263, #268, #270) and #255/#256/#261. The branch is 224 commits ahead and 15 behind.

Files this branch changes that main also changed (8), with the dry-run merge result:

| File                                               | Main (which wave)                                                                                       | This branch                                                              | Result                                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `.oat/sync/manifest.json`                          | Manifest **V2** (`version: 2`, `collections: []`, reordered keys), `oatVersion` 0.2.58 (W1–W3 restamps) | adds the `oat-pjm-remote` symlink entry, `oatVersion` 0.2.50             | **CONFLICT** (3 hunks) — do not hand-merge, see §4                                                    |
| `packages/cli/src/config/oat-config.ts`            | W1 #262: `documentation.excludes`, `OatToolPackName`/`requiredBy`, unknown-sibling preservation         | +351 lines of `OatPjmRemote*` types and the `normalizePjmConfig` rewrite | **CONFLICT** — adjacent insert right after `OatToolsRequiredByConfig`, semantically disjoint; trivial |
| `packages/cli/src/commands/config/index.ts`        | W1: `documentation.excludes` catalog entry and set-path                                                 | `pjm.remote.*` keys, catalog entries, formatters                         | auto-merges (both append)                                                                             |
| `packages/cli/src/commands/config/index.test.ts`   | W1 excludes coverage                                                                                    | pjm.remote describe/set                                                  | auto-merges                                                                                           |
| `packages/cli/src/commands/help-snapshots.test.ts` | #255 tool-pack scope / provider reachability                                                            | pjm remote help                                                          | text merges, **snapshots will drift**                                                                 |
| `packages/cli/src/commands/pjm/index.ts`           | #255                                                                                                    | import + `cmd.addCommand(createPjmRemoteCommand())`                      | auto-merges                                                                                           |
| `packages/cli/src/commands/pjm/index.test.ts`      | #255                                                                                                    | +4                                                                       | auto-merges                                                                                           |
| `packages/cli/src/config/oat-config.test.ts`       | W1                                                                                                      | pjm.remote tests                                                         | auto-merges                                                                                           |

`git merge-tree --write-tree origin/main HEAD` reports exactly two conflicting files today.

## 3. Repository rules from waves 1–3 that now bind this project

1. **Lockstep bump must exceed live main.** This branch is at 0.2.50; main is 0.2.58 and rises with every wave (wave 4 ships 0.2.59, the Lite workflow PR #264 is expected to land at 0.2.60 right after it). `p08-t05` (`plan.md:1357-1366`) already says "strictly greater than origin/main", so the step survives; any recorded 0.2.5x evidence is stale. Gates: `pnpm release:check-versions`, `pnpm release:validate`.
2. **Every canonical skill needs a valid semver `version:`** (`packages/cli/src/validation/skills.test.ts:1218-1240`). `oat-pjm-remote/SKILL.md:3` is `version: 1.0.0` and has no explicit pin, so nothing to move — but `pnpm run check:skill-bumps` (CI-gated, PR-scoped) requires one bump per changed skill per PR; since this PR _adds_ the skill, no bump is needed until a later PR edits it.
3. **Named-skill load clauses (W2).** `named-skill-load-contract.test.ts` binds `.agents/skills/oat-project-*` prose only and fails on any sentence pairing an execution verb with a named `oat-project-*` skill without a load clause. `oat-pjm-remote` is outside the surface and names no `oat-project-*` skill; it will not trip.
4. **Executable backstops for standing claims (W3).** Any standing claim added to `oat-pjm-remote/SKILL.md` must name its executable owner and ship its backstop in the same PR (`skills.test.ts:7279-7720` pins the authoring rule in `create-oat-skill` 1.5.1). The skill already has `tests/contract.test.mjs`; keep new claims backed there.
5. **Cross-cutting option sweep and the acceptance boundary (W3).** `oat-phase-implementer` 1.1.3 and `oat-project-implement` 2.3.3 (2.3.4 after wave 4) require a repository-wide sweep for every consumer of a changed cross-cutting option and define the acceptance boundary as the declared files **plus mechanical additions permitted by, and reported under, the sweep**; expansions that cross another owner stop and report. **This changes the meaning of your p07 blocker:** the `service.ts` / `service.test.ts` expansion was recorded as a hard stop under 2.3.2; under 2.3.3 it may be a reportable mechanical expansion. Re-read the current skill before re-dispatching the recovery, and expect the sweep duty to apply to whatever the recovery changes.
6. **Sync at project scope only.** Never run `oat sync --scope all` from a project lane: it rewrites the operator's user-scope provider views and restamps `~/.oat/sync/manifest.json`. Use `pnpm run cli -- sync --scope project` with the branch-built CLI (the global `oat` trails main).
7. **W1 docs-index paths and fail-closed asset bundles** touch only the `OatDocumentationConfig` seam and `validateAssetsBundle`; no product overlap beyond the `oat-config.ts` merge above.
8. **Gate evidence conventions adopted by the program** (apply if you run the lifecycle skills): Turbo replays caches, so evidence runs are `HOME=$(mktemp -d) pnpm exec turbo run <gate> --force` with `Cached: 0`; capture each gate's exit code; `pnpm test --force` hits the wrong script.

## 4. Recommended resume sequence

1. **Update from main before any phase-7 work.** Prefer `git merge origin/main` over a rebase so the 27 `Reviewed Head` SHAs in the ledger stay reachable; if you rebase, record the pre-rebase → post-rebase SHA map (patch-id equality) in `implementation.md` first.
2. **Timing.** Wave 4 merges within hours of this note, and the Lite workflow PR #264 lands immediately after it (lockstep 0.2.60), before wave 5 dispatches. The cheapest single update is after both land; if you must resume sooner, merge now and merge once more before opening the PR.
3. **`.oat/sync/manifest.json`:** take main's file wholesale (it is V2; the branch entry is V1-shaped), then regenerate the `oat-pjm-remote` entry with `pnpm run cli -- sync --scope project` after `pnpm build`. Expect the wave-4 restamp advisory to print if the manifest's `oatVersion` differs from the built CLI's version; that is the new feature, not an error.
4. **`config/oat-config.ts`:** keep both inserts (main's `documentation.excludes` / `requiredBy` block and this branch's `OatPjmRemote*` block); they are adjacent, not overlapping.
5. **Re-anchor tests that will go red after the merge:** `commands/help-snapshots.test.ts` (main rewrote the tool-pack help under #255), and this branch's `config/resolve.test.ts` (23 new assertions that `pjm.remote.transports.github` is absent from `result.resolved`) — wave 4 rewrote `config/resolve.ts` (+37/−9, adds `resolveGateWithSource`; `resolveGate` now delegates to it), so re-check what appears in `resolved`. Re-establish the 165/665/141 baseline before trusting it.
6. **Then** re-read `oat-project-implement` (2.3.4) and decide the p07 recovery under the new boundary rule; run the phase-7 review; finish p08 with the lockstep bump chosen against the then-current main.
7. **Plan text needs no re-anchoring:** `plan.md` cites no `file:line` locations, only paths and step prose.

## 5. What waves 4–6 change that touches this project

**Wave 4 (merging now, lockstep 0.2.59).** Shipped per-project gate overrides (`oat_skill_gate_overrides` in project `state.md`, `oat gate resolve --project` with a `configured` / `configured_disabled_by_project` / `not_configured` envelope, a `project_disabled` closeout disposition; null or malformed gate resolutions now fail closed and are never "no gate"), pre-save manifest restamp advisories in init / remove-skill / interactive status (`manifestVersionRestamps` in init and remove-skill JSON; restamp-only sync apply says `Manifest version refreshed; no content changes required.`), and `dispatchStamp` beside `dispatchReport` in `dispatch-ceiling resolve --json`. Product-file overlap with this branch: **none** except the manifest and the `config/resolve.ts` ↔ `config/resolve.test.ts` seam above. This project touches no `saveManifest` call site, no gate resolution, no `state.md` frontmatter writer, and no dispatch-ceiling output, so the new behaviors are inert here. If you run the lifecycle skills after updating, the gate steps now require `--project "$PROJECT_PATH"`.

**Wave 5 (eleven lanes, five groups) — plans that name files this branch changes:**

- `2026-09-02-add-oat-config-unset-command` (group 2) — **highest collision.** Names `commands/config/index.ts`, `index.test.ts`, `config/oat-config.ts`, `config/resolve.ts`. `unset` must handle your `pjm.remote.*` keys and its family-coverage test enumerates the catalog; whichever lands second re-anchors. If this project merges first, the wave-5 drift refresh will pick up your keys; if it merges second, add `unset` coverage for `pjm.remote.*`.
- `2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees` (group 1) — names `commands/pjm/doctor.ts` and the `OatDocumentationConfig` seam in `oat-config.ts`; this branch owns `pjm/doctor.ts` and its test.
- The other wave-5 plans (gate finalization retries, review-artifact recovery, skill-script references, plan readiness, recap, active-pointer clearing, terminal status, consolidated retirement) have **no file overlap**; their only indirect effect is that seven of them move version pins in `validation/skills.test.ts`, which this branch does not edit.

**Wave 6 — plans that touch this project's surface:**

- `2026-09-03-preserve-proto-named-config-keys` — changes config JSON parsing in `config/oat-config.ts` so `__proto__`-named keys survive; will re-enter the region around your `normalizePjmConfig`.
- `2026-09-04-honor-metadata-version-for-skills` — makes `metadata.version` the canonical skill version; `oat-pjm-remote/SKILL.md` uses top-level `version:` and will need the new shape (the plan's bulk migration is outside the program, so expect a follow-up rather than a break).
- `2026-09-04-diagnose-canonical-skills-missing-from-provider-views` — adds diagnostics in `oat tools info` for canonical skills absent from a provider view; `oat-pjm-remote` currently has only a `claude` view entry in the manifest and may surface as a diagnostic.
- Populate provider reachability evidence, validate review-ledger paths: no overlap.

**Also landing before wave 5:** PR #264 (Lite workflow) — new `oat-project-lite` skill, changes across lifecycle skills, templates, `control-plane`, and `packages/cli/src/commands/project/**`; no overlap with this branch's files.

## 6. Open questions for the operator (not decided here)

- Whether the p07 `service.ts` / `service.test.ts` expansion is now a reported mechanical expansion under `oat-project-implement` 2.3.3/2.3.4 or still needs explicit authorization — the resuming agent should re-read the boundary rule and state its reading before dispatching.
- Merge order versus the wave-5 `oat config unset` lane (§5); the wave orchestrator will re-run the wave-5 drift refresh against whatever main holds at dispatch time, so merging this project before wave 5 costs the program nothing and saves this branch a second re-anchor.
