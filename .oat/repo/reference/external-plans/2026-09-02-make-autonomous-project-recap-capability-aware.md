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
longer blocks. The autonomous recap tail probes the four required seams
(author, critic, browser session, visual critic) before generation, records
the probe, and when a seam is unavailable resolves a recordable
`skip / capability_probe` intent with a warning, which the terminal-outcome
guard accepts. When all seams resolve, generation, evidence requirements, and
the fail-closed `run.mjs` validation are byte-for-byte unchanged. Human and
JSON receipts state whether a recap was generated, skipped, or degraded and
why. Optionally, config keys let a host opt in by naming seam modules.

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
    structurally invalid (also stated at `lifecycle-contract.md:56`). This is
    the hard blocker.
  - `.agents/skills/oat-explainer-kit/scripts/check-terminal-outcome.mjs:11-24`
    — `skip` passes with no manifest; `generate` with no outcome throws
    `E_RECAP_OUTCOME`, which blocks approval. The exact block point.
  - `references/lifecycle-contract.md:21-23` — autonomous mode forces
    `generate / autonomous_policy`; `never` is overridden with a warning.
  - `references/lifecycle-contract.md:121-133`, `scripts/run.mjs:41-50`,
    `:302-353` — unattended recaps require one real browser session and one
    whole-set visual critic; `E_AUTHOR_REQUIRED` fails closed. Nothing in the
    repository provisions these modules (`pack-manifest.ts:273-284` ships
    skills only).
  - `oat-project-implement/references/completion-and-closeout.md:771-793` —
    attempt the recap exactly once in autonomous mode; `failed` is a warning
    but the terminal-outcome guard blocks on missing records.
  - `packages/cli/src/config/oat-config.ts:174-179`, `:276`, `:862-877` and
    `resolve.ts:132-135` — only `projectExplainer`/`projectRecap`
    preferences exist; no seam-module keys.
  - `scripts/check-core.mjs:9-60` — an existing structured capability probe
    (`{ ok, code, message, guidance }`) to copy.
  - Contract tests pinning the prose: `review-skill-contracts.test.ts:195`,
    `:265` (with regexes at `:271-296`), `:312`;
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

| Type              | Dependency                                                                                                       | Required state                                                                                                                                 | Current state         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Soft integration  | [Require named lifecycle skills to be loaded](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md)       | Land first; both edit `completion-and-closeout.md`, `oat-project-complete`, and `oat-project-autonomous` and bump them.                        | Pending (W2).         |
| Soft ordering     | Sibling plan [Add an oat config unset command](./2026-09-02-add-oat-config-unset-command.md)                     | Land first; step 5's optional `workflow.explainers.recapSeams.*` keys must then be added to the unset family-coverage test in the same change. | Pending (W5 group 2). |
| Soft ordering     | Sibling plan [Defer activeProject clearing](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md) | Runs after this plan; both edit `oat-project-complete/SKILL.md` and bump its version, so never in one parallel group.                          | Pending (W5 group 4). |
| Related, distinct | `BL-260727-make-explainer-run-durability`, `BL-260817-run-the-rc-explainer-end`                                  | Untouched; they own durability and CI browser coverage.                                                                                        | Open.                 |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                          | Affected | Files in common                                                                                                           | Required update                                                                |
| ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `tool-pack-scope-provider-truthfulness` merges | Minor    | `review-skill-contracts.test.ts` (+17), `.agents/docs/autonomy-contract.md` (inventory).                                  | Rebase; re-anchor the `:195`, `:265`, `:312` cases; re-run the inventory test. |
| `review-plan-workflow` (draft PR #190) merges  | Minor    | `review-skill-contracts.test.ts`, `oat-project-implement/SKILL.md` (not `completion-and-closeout.md`), autonomy contract. | Same re-anchor; confirm `completion-and-closeout.md:771-793` is unchanged.     |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- .agents/skills/oat-explainer-kit .agents/skills/oat-project-implement/references/completion-and-closeout.md .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-project-autonomous/SKILL.md .agents/skills/oat-project-summary/SKILL.md packages/cli/src/config/oat-config.ts packages/cli/src/config/resolve.ts packages/cli/src/commands/config/index.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts apps/oat-docs/docs/cli-utilities/configuration.md apps/oat-docs/docs/workflows/skills/explainer-kit.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
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
- Shipped skills require the five-package lockstep bump.

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
- Contract tests: `review-skill-contracts.test.ts:195/265/312`,
  `intent.test.mjs`, `completion.integration.test.mjs`.
- Optional config opt-in: `workflow.explainers.recapSeams.*ModulePath` in
  `oat-config.ts`, `resolve.ts`, `config/index.ts`, and docs.
- Skill `version:` bumps for every edited skill; five package manifests.

### Out of scope

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
author, critic, browserSession, visualCritic, ...modulePaths })` returning
`{ ok, missing, code: 'seams-unavailable', guidance }`; unattended requires
all four, interactive requires author and critic.

**Verify:** `node --test .agents/skills/oat-explainer-kit/tests/probe-recap-seams.test.mjs` → pass.

### 2. Extend the intent matrix

Add `capability_probe` to `SOURCES` and `skip:capability_probe` to
`ALLOWED_PAIRS.projectRecap`; `resolveAutonomous` returns skip with a warning
when the probe fails, else unchanged.

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
`review-skill-contracts.test.ts:195/265/312` in the same commit.

**Verify:** `pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts` → pass.

### 5. Optional config opt-in

Add `workflow.explainers.recapSeams.*` keys with defaults unset, readable via
`oat config get`, and document them.

**Verify:** `pnpm exec vitest run src/config src/commands/config/index.test.ts` → pass.

### 6. Bump and gate

Bump each edited skill and the five packages; format.

**Verify:** `pnpm oat:validate-skills`, `pnpm run check:skill-bumps`,
`pnpm test:skills`, then the eight AGENTS.md gates in order.

## Test plan

- `probe-recap-seams.test.mjs` (pattern `check-core.test.mjs:111`): every
  missing unattended seam reported with guidance; ok when all resolve;
  interactive does not require browser seams.
- `intent.test.mjs`: autonomous recap resolves skip with `capability_probe`
  when a seam is unavailable; still forces generate when all resolve;
  `capability_probe` rejected for `projectExplainer`.
- `completion.integration.test.mjs`: both callers probe before attempting;
  the guard accepts a probe-driven skip with its reason.
- `review-skill-contracts.test.ts`: probe-first and non-prompting-skip
  literals; `skipped`/`degraded` receipt states.
- Regression proved: unconfigured hosts complete; configured hosts unchanged;
  the receipt explains why.

## Done criteria

- [ ] Probe exists, is pure, and names missing seams.
- [ ] Autonomous skip is recordable and accepted by the guard; configured
      runs are unchanged.
- [ ] Prose and pinned tests updated together; summary shows the outcome.
- [ ] Skill bumps, lockstep bump, `pnpm test:skills`, and all gates pass.
- [ ] `git status --short` is clean.

## STOP conditions

Stop and report instead of improvising when:

- a change would let a configured run finalize without browser evidence
  (DR-260729);
- the design requires bundling an author, critic, or browser generator
  (DR-260726);
- a mid-run seam failure would become a skip instead of `failed`;
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

- The skip is decided pre-flight by the probe, never by a failed run.
- `ALLOWED_PAIRS` widening is additive and product-scoped.
- Line-wrapped regexes in the contract test are updated deliberately.
