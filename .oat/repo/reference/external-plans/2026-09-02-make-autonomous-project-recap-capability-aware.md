---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/triage/2026-09-02-program-intake-triage.md
  - .oat/repo/pjm/backlog/items/BL-260902-make-autonomous-project-recap.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260902-make-autonomous-project-recap
oat_issue_url: https://github.com/voxmedia/open-agent-toolkit/issues/230
created: '2026-09-02T23:59:00Z'
---

# Make the autonomous project recap capability-aware and non-blocking

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. Sequence after
> the W2 named-skill loading plan, which edits the same closeout, complete,
> and autonomous skills and bumps the same versions.

## Outcome

An unattended completion on a host with no explainer seams configured no
longer blocks. The autonomous recap tail probes the five seams an unattended
`project-recap` run requires (author, critic, browser session, visual critic,
and the set planner) before generation, records the probe, and when a seam is
**unavailable** (not configured at all) resolves a recordable
`skip / capability_probe` intent with a warning, which the terminal-outcome
guard accepts. A seam that is configured but invalid (unloadable module,
non-function export, both callback and module path supplied) is not a skip:
it is reported as a configuration error and the run fails closed exactly as
today. When all five seams resolve, generation, evidence requirements, and
the fail-closed `run.mjs` validation are byte-for-byte unchanged. Human and
JSON receipts state whether a recap was generated, skipped, or degraded and
why. Config keys that let a host opt in by naming seam modules are a separate
follow-up item (`BL-260904-add-recap-seam-config-keys`), not this plan.

## Source and live evidence

- Source backlog item:
  [BL-260902-make-autonomous-project-recap — Make autonomous project recap capability-aware and non-blocking](../../pjm/backlog/items/BL-260902-make-autonomous-project-recap.md)
- Source issue: [#230](https://github.com/voxmedia/open-agent-toolkit/issues/230)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `.agents/skills/oat-explainer-kit/scripts/resolve-intent.mjs:6-17` —
    `ALLOWED_PAIRS.projectRecap` is exactly `generate:interactive`,
    `skip:interactive`, `generate:autonomous_policy`; an autonomous skip is
    structurally invalid (also stated at `lifecycle-contract.md:55`). This is
    the hard blocker.
  - `.agents/skills/oat-explainer-kit/scripts/check-terminal-outcome.mjs:11-24`
    — `skip` passes with no manifest; `generate` with no outcome throws
    `E_RECAP_OUTCOME`, which blocks approval. The exact block point.
  - `references/lifecycle-contract.md:21-23` — autonomous mode forces
    `generate / autonomous_policy`; `never` is overridden with a warning.
  - `references/lifecycle-contract.md:121-133`, `scripts/run.mjs:41-50`,
    `:301-353` — unattended recaps require one real browser session and one
    whole-set visual critic; `E_AUTHOR_REQUIRED` fails closed. Nothing in the
    repository provisions these modules (`pack-manifest.ts:273-284` ships
    skills only).
  - `scripts/run.mjs:170-175` and `:245-280` — `resolveLifecycleSetPlanner`
    is `required` when `recipe === 'project-recap' && mode === 'unattended'`
    and throws `E_SET_PLANNER_REQUIRED` when neither `planSet` nor
    `planSetModulePath` is supplied (`:264-270`); supplying both, a
    non-function callback, or an empty module path are distinct `TypeError`s
    (`:256-279`). A preflight that checks only author, critic, browser
    session, and visual critic therefore passes on a host with no planner and
    the runtime still throws, recreating the terminal-outcome failure.
  - `oat-project-implement/references/completion-and-closeout.md:771-793` —
    attempt the recap exactly once in autonomous mode; `failed` is a warning
    but the terminal-outcome guard blocks on missing records.
  - `packages/cli/src/config/oat-config.ts:181-183`, `:281`, `:867-881` and
    `resolve.ts:132-135` — only `projectExplainer`/`projectRecap`
    preferences exist; no seam-module keys.
  - `scripts/check-core.mjs:9-60` — an existing structured capability probe
    (`{ ok, code, message, guidance }`) to copy.
  - Contract tests pinning the prose: `review-skill-contracts.test.ts:194`,
    `:264` (with line-wrapped regexes at `:286-297`), `:311`;
    `oat-explainer-kit/tests/intent.test.mjs:129`, `:163` (asserts autonomous
    skip is rejected); `tests/completion.integration.test.mjs:131`, `:220`.
- Constraining decisions:
  - [DR-260729-unattended-recap-publication](../decisions/DR-260729-unattended-recap-publication.md)
    — never weaken evidence for a run that happens; gate whether the run is
    attempted.
  - [DR-260726-explainer-render-qa-is-opt](../decisions/DR-260726-explainer-render-qa-is-opt.md)
    — absent capability → recorded warning and continue; the model to copy.
  - [DR-260726-explainer-authoring-is-two](../decisions/DR-260726-explainer-authoring-is-two.md)
    — no content generator ships in core or adapter.
  - [DR-260720-autonomous-closeout-requires](../decisions/DR-260720-autonomous-closeout-requires.md).

## Dependencies

| Type              | Dependency                                                                                                                                                 | Required state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Current state                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Soft integration  | [Require named lifecycle skills to be loaded](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md)                                                 | Land first; both edit `completion-and-closeout.md`, `oat-project-complete`, and `oat-project-autonomous` and bump them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Pending (W2).                                                                                              |
| Soft ordering     | Sibling plan [Defer activeProject clearing](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md)                                           | Runs after this plan; both edit `oat-project-complete/SKILL.md` and bump its version, so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Pending (W5 group 4).                                                                                      |
| Related, distinct | `BL-260727-make-explainer-run-durability`, `BL-260817-run-the-rc-explainer-end`                                                                            | Untouched; they own durability and CI browser coverage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Open.                                                                                                      |
| Related, distinct | W1 group 2 plan [Add an exclusion mechanism to docs index generation](./2026-09-02-add-exclusions-to-docs-index-generation.md)                             | No shared write since the config-key work moved to `BL-260904-add-recap-seam-config-keys`; this plan no longer edits `packages/cli/src/config/oat-config.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Pending.                                                                                                   |
| Related, distinct | W5 group 1 plan [Keep instruction-sync pointer files out of documentation content trees](./2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md) | No shared write for the same reason; no ordering constraint remains.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Pending.                                                                                                   |
| Soft ordering     | W5 group 3 plan [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md)          | Runs before this plan; both write `packages/cli/src/validation/skills.test.ts` (readiness: its `:5330` pin and a contract case; this plan: the `oat-explainer-kit` `:1197` and `oat-project-complete` `:4002` version pins), so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Pending.                                                                                                   |
| Soft ordering     | W5 group 5 plan [Make consolidated-project retirement checks semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md)                      | Runs after this plan; both edit `oat-project-complete/SKILL.md` (and its single `version:` line) and `review-skill-contracts.test.ts`, so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Pending.                                                                                                   |
| Soft ordering     | Shared write: the skill version pins and contract cases in `packages/cli/src/validation/skills.test.ts` (2026-09-05 audit)                                 | Never in one parallel group with any other plan that writes this file; the program serializes them by group. The other writers are: W4 group 1 [Let one project disable configured lifecycle gates explicitly](./2026-08-30-disable-configured-gates-per-project.md); W4 group 2 [Emit the canonical dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md); W2 group 1 [Repair four bundled-skill truthfulness contracts](./2026-08-30-repair-bundled-skill-contract-drift.md); W3 group 2 [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md); W2 group 2 [Require lifecycle orchestrators to load every named execution skill](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md); W5 group 4 [Defer activeProject clearing on shared archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md); W2 group 3 [Document patch-and-restore recovery for lost child handles with staged work](./2026-09-02-document-patch-and-restore-for-lost-child-handles.md); W5 group 5 [Make consolidated-project retirement checks semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md); W5 group 1 [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md); W6 group 1 [Validate review-ledger paths and archive only terminal reviews before the final PR](./2026-09-03-validate-review-ledger-paths-before-final-pr.md); W6 group 2 [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md); W5 group 4 [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md); W5 group 3 [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md); W5 group 2 [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md). | Pending; the execution program orders every group so at most one of these lanes writes the file at a time. |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                | Affected | Files in common                                                                                                                             | Required update                                                                                                                                                                 |
| ------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | Minor    | `review-skill-contracts.test.ts` (+17), `.agents/docs/autonomy-contract.md` (inventory).                                                    | Rebase; re-anchor the `:195`, `:265`, `:312` cases; re-run the inventory test. Drift check on 2026-09-03 confirmed exactly these files changed; apply this row before dispatch. |
| `review-plan-workflow` (draft PR #190) merges                                        | Minor    | `review-skill-contracts.test.ts`, `oat-project-implement/SKILL.md` (not `completion-and-closeout.md`), `.agents/docs/autonomy-contract.md`. | Re-anchor the `:194`, `:264`, `:311` cases; confirm `completion-and-closeout.md:771-793` is unchanged.                                                                          |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- .agents/skills/oat-explainer-kit .agents/skills/oat-project-implement/references/completion-and-closeout.md .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-project-autonomous/SKILL.md .agents/skills/oat-project-summary/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts apps/oat-docs/docs/workflows/skills/explainer-kit.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

If `ALLOWED_PAIRS` or the terminal-outcome guard changed, re-anchor before
editing. `.agents/skills/explainer-kit/**` (the core) is out of scope; a
change there is not drift for this plan.

## Repository conventions

- Skill tests: `pnpm test:skills` (`node --test .agents/skills/*/tests/*.test.mjs`).
- Contract tests: from `packages/cli`,
  `pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/config`.
- Skill validation and bumps: `pnpm oat:validate-skills`,
  `pnpm run check:skill-bumps`, `pnpm format`.
- Implementation pattern: `check-core.mjs` failure envelope; DR-260726
  warn-and-continue.
- Shipped skills require the five-package lockstep bump, owned by the wave
  fan-in in lane mode (see Scope).

## Scope

### In scope

- New `oat-explainer-kit/scripts/probe-recap-seams.mjs` and
  `tests/probe-recap-seams.test.mjs`.
- `scripts/resolve-intent.mjs` — source `capability_probe`, pair
  `skip:capability_probe` for `projectRecap` only, `resolveAutonomous` accepts
  a `seamProbe` input.
- `scripts/check-terminal-outcome.mjs` — accept a skip reason.
- `references/lifecycle-contract.md` (§Resolution, allowed-pairs table,
  §Browser and visual-review execution) and `references/config-contract.md`.
- `completion-and-closeout.md:765-793`, `oat-project-complete/SKILL.md`
  Step 3.6, `oat-project-autonomous/SKILL.md:255-265`,
  `oat-project-summary/SKILL.md:232-248` (add `skipped`/`degraded`).
- Contract tests: `review-skill-contracts.test.ts:194/264/311`,
  `intent.test.mjs`, `completion.integration.test.mjs`.
- Skill `version:` bumps for every edited skill, and the version pin updates
  those bumps require in `packages/cli/src/validation/skills.test.ts`
  (`oat-explainer-kit` at `:1197`, `oat-project-complete` at `:4002`; add any
  other edited skill that is pinned there).

### Out of scope

- Config keys naming seam modules (`workflow.explainers.recapSeams.*`) and the
  `oat-config.ts`, `config/index.ts`, and `configuration.md` edits they need —
  moved to `BL-260904-add-recap-seam-config-keys` so this plan shares no config
  seam with other lanes.
- `.agents/skills/explainer-kit/**` — the separately versioned core.
- `run.mjs` seam validation — stays fail-closed; the fix is to not call it.
- `finalize-tracked-run.mjs`, durability, publish, archive paths.
- `tools/release/validate-explainer-visuals.mjs`.

## Current state

Autonomous kickoff persists `generate / autonomous_policy`. At closeout the
implement tail attempts the recap once; on a host with no seams the adapter
fails with `E_AUTHOR_REQUIRED`, produces no manifest, and the terminal-outcome
guard throws because `generate` has no outcome. The only exit today is a
human recording `skip / interactive`.

## Implementation steps

### 1. Add the seam probe

Create `probe-recap-seams.mjs` exporting a pure `probeRecapSeams({ mode,
author, critic, browserSession, visualCritic, planSet, ...modulePaths })`
returning `{ ok, missing, invalid, code, guidance }`; unattended requires all
five seams (author, critic, browser session, visual critic, set planner),
interactive requires author and critic. Resolve each seam with the same rules
`run.mjs` applies at runtime (`:245-280` for the planner: callback or module
path, never both; callback must be a function; module path must be a
non-empty string). Classify three outcomes and never conflate them:
`missing` (neither callback nor module path supplied → `code:
'seams-unavailable'`, the only outcome that becomes a skip); `invalid` (a
seam is supplied but violates a resolution rule → `code: 'seams-invalid'`,
which fails closed with the same message the runtime would raise); and
runtime failure, which the probe never observes because it does not load or
call modules — a failed generation after a passing probe stays `failed`.

**Verify:** `node --test .agents/skills/oat-explainer-kit/tests/probe-recap-seams.test.mjs` → pass.

### 2. Extend the intent matrix

Add `capability_probe` to `SOURCES` and `skip:capability_probe` to
`ALLOWED_PAIRS.projectRecap`; `resolveAutonomous` returns skip with a warning
only for `seams-unavailable`; `seams-invalid` propagates as an error, and a
passing probe leaves the result unchanged.

**Verify:** `node --test .agents/skills/oat-explainer-kit/tests/intent.test.mjs`
→ updated `:129`/`:163` cases pass; existing persisted
`generate/autonomous_policy` records still validate.

### 3. Carry the reason through the guard

`check-terminal-outcome.mjs` accepts `--skip-reason <code>` and returns
`{ ok: true, intent: 'skip', outcome: null, reason }`; `generate` with no
manifest still throws.

**Verify:** `node --test .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs` → pass.

### 4. Update normative prose and the pinned tests together

Edit the lifecycle contract, closeout reference, complete, autonomous, and
summary skills; update the literals and regexes in
`review-skill-contracts.test.ts:194/264/311` (line-wrapped regexes at
`:286-297`) in the same commit.

**Verify:** `pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts` → pass.

### 5. Bump and gate

Format.

**Verify (lane mode, the default under the execution program):** bump each
edited skill's `version:` field and update its pin in
`packages/cli/src/validation/skills.test.ts` where a pin exists (`:1197`,
`:4002`); run the focused tests above, `pnpm test:skills`, then `pnpm check`,
`pnpm type-check`, and `pnpm run check:skill-bumps` with captured exit codes,
plus `pnpm lint`, `pnpm format`, and `pnpm oat:validate-skills` because this
plan changes `.agents/skills`. Do not edit lockstep release files or run
`pnpm release:check-versions` / `pnpm release:validate`; the wave fan-in
owns the lockstep bump and the full definition-of-done sequence.
**Standalone mode only:** bump the five public packages above freshly
fetched `origin/main` and run the eight AGENTS.md gates in order.

## Test plan

- `probe-recap-seams.test.mjs` (pattern `check-core.test.mjs:111`): every
  missing unattended seam reported with guidance; ok when all five resolve;
  interactive does not require browser or planner seams. Controls: author,
  critic, browser session, and visual critic present with no planner → not
  ok, `missing: ['planSet']`, `seams-unavailable` (this is the case the
  runtime would have thrown `E_SET_PLANNER_REQUIRED` on); all five valid →
  ok; planner supplied as both callback and module path → `seams-invalid`,
  never a skip; planner callback that is not a function → `seams-invalid`.
- `intent.test.mjs`: autonomous recap resolves skip with `capability_probe`
  when a seam is unavailable; still forces generate when all five resolve;
  an invalid seam is an error, not a skip; `capability_probe` rejected for
  `projectExplainer`.
- `completion.integration.test.mjs`: both callers probe before attempting;
  the guard accepts a probe-driven skip with its reason.
- `review-skill-contracts.test.ts`: probe-first and non-prompting-skip
  literals; `skipped`/`degraded` receipt states.
- Regression proved: unconfigured hosts complete; configured hosts unchanged;
  a four-seam host without a planner is detected pre-flight rather than at
  `E_SET_PLANNER_REQUIRED`; the receipt explains why.

## Done criteria

- [ ] Probe exists, is pure, checks all five unattended seams with the
      runtime's resolution and exclusivity rules, and distinguishes missing
      from invalid.
- [ ] Autonomous skip is recordable and accepted by the guard; configured
      runs are unchanged.
- [ ] Prose and pinned tests updated together; summary shows the outcome.
- [ ] Lane mode: focused tests, `pnpm test:skills`, `pnpm check`,
      `pnpm type-check`, and `pnpm run check:skill-bumps` pass and no lockstep
      release file is edited. Standalone mode: one lockstep bump and all
      eight gates pass.
- [ ] `git status --short` is clean.

## STOP conditions

Stop and report instead of improvising when:

- a change would let a configured run finalize without browser evidence
  (DR-260729);
- the design requires bundling an author, critic, or browser generator
  (DR-260726);
- a mid-run seam failure, or a configured-but-invalid seam, would become a
  skip instead of `failed`;
- the named-skill loading plan has not landed and the same closeout prose is
  being edited concurrently; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, issue #230, the
four decision records, and the pinned contract tests when substantial time
passes, main advances materially from
`49aeb5075971180b48c131bbd2b21b82d455bfc9`, the named-skill loading plan or a
named landing event lands, cited contracts change, or a load-bearing claim
cannot be reproduced. Apply the landing-event table above.

## Review focus

- The skip is decided pre-flight by the probe, never by a failed run, and
  the probe's seam list matches `run.mjs`'s unattended requirements exactly
  (five, including the set planner).
- `ALLOWED_PAIRS` widening is additive and product-scoped.
- Line-wrapped regexes in the contract test are updated deliberately.
