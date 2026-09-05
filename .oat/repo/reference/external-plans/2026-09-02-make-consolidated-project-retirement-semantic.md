---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/triage/2026-09-02-program-intake-triage.md
  - .oat/repo/pjm/backlog/items/BL-260902-make-consolidated-project.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260902-make-consolidated-project
oat_issue_url: https://github.com/voxmedia/open-agent-toolkit/issues/250
created: '2026-09-02T23:59:00Z'
---

# Make consolidated-project retirement checks semantic

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. Note that no
> consolidation concept exists in the quick-start skill today; this plan
> introduces it as recorded inputs plus an advisory sweep, not a hard block.
> Land the sibling active-pointer plan first because both edit the completion
> skill and bump its version. The sweep runs inside Step 3.7 before the
> project-log roll-up and seal, never after the seal.

## Outcome

When a quick-start project consolidates earlier scaffolds, the project records
the absorbed project slugs and backlog IDs, and completion runs a bounded
sweep over the active planning surfaces (roadmap, current state, curated
backlog overview, active project states) for those slugs, IDs, and
future-oriented ownership language. A hit produces a named finding or fix
task whose disposition is recorded in the project log **before** the Step 3.7
roll-up and completion seal, so the seal's "no append may follow" invariant
holds; clearly historical prose is exempt. Contract tests prove the fields
are recorded and that the ordering is sweep and dispositions → roll-up → seal
→ complete-state → archive, including on resume.

## Source and live evidence

- Source backlog item:
  [BL-260902-make-consolidated-project — Make consolidated-project retirement checks semantic](../../pjm/backlog/items/BL-260902-make-consolidated-project.md)
- Source issue: [#250](https://github.com/voxmedia/open-agent-toolkit/issues/250)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `.agents/skills/oat-project-quick-start/SKILL.md` and
    `oat-project-new/SKILL.md` — zero occurrences of consolidate, absorb,
    supersede, or retire; no consolidation concept exists.
  - `oat-project-quick-start/SKILL.md:120-138` — Step 0.5 only branches on
    "no valid active project"; the natural home for a consolidation
    declaration.
  - `oat-project-complete/SKILL.md:966-975` — retirement is single-project
    and physical (`recordRetired`), not a prose sweep.
  - `oat-project-complete/SKILL.md:594-648` — Step 3.7 runs
    `oat project log rollup` and then appends the completion seal; `:648`
    states "No project-log append may follow the seal." Any finding recorded
    in the project log must therefore be appended before the roll-up, not
    "before Step 8", which is after the seal.
  - `.oat/projects/archived/gate-execution-contract-hardening/state.md:5-9` —
    the analogue: `associated_issues` holds `type: backlog` refs generally; no
    field records absorbed project slugs.
  - `.oat/projects/archived/gate-execution-contract-hardening/references/project-retro.md:206-227`,
    `:253-268` — "Project retirement is semantic"; the prescribed sweep by
    slug, backlog ID, and ownership language; retro item UP-01 filed as #250
    after two extra review passes.
  - Sweep surfaces exist: `.oat/repo/pjm/roadmap.md` (Now/Next/Later/Sequencing
    map), `.oat/repo/pjm/current-state.md`, `.oat/repo/pjm/backlog/index.md`
    (Curated Overview), `.oat/projects/*/state.md`.
  - `oat-pjm-update-repo-reference/SKILL.md:141,167` — a stale-reference sweep
    pattern scoped to legacy paths; reusable shape, wrong keys.
- Constraining decisions:
  [DR-260831-durability-before-retirement](../decisions/DR-260831-durability-before-retirement.md)
  (the sweep is a pre-closeout gate) and
  [DR-260831-terminal-discovery-exclusion](../decisions/DR-260831-terminal-discovery-exclusion.md)
  (historical evidence is exempt).

## Dependencies

| Type             | Dependency                                                                                                                                            | Required state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Current state                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Soft ordering    | Sibling plan [Defer activeProject clearing](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md)                                      | Land first; it edits the same skill (Step 6 → 8 → 12 spine and the resume entry) and bumps the same `version:` line and `skills.test.ts:4002` pin; never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Pending.                                                                                                   |
| Soft ordering    | Sibling plan [Route incomplete quick projects to quick-start](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md)                         | Land first; both edit quick-start Step 0.5 and bump the same `version:` line.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Pending.                                                                                                   |
| Soft integration | [Require named lifecycle skills to be loaded](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md)                                            | Write any "run skill X" prose with an explicit load-and-follow clause so its corpus test stays green.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Pending (W2).                                                                                              |
| Soft ordering    | W5 group 3 plan [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md) | Runs before this plan; both edit `oat-project-complete/SKILL.md` (and its single `version:` line) and `review-skill-contracts.test.ts`, so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Pending.                                                                                                   |
| Soft ordering    | Shared write: the skill version pins and contract cases in `packages/cli/src/validation/skills.test.ts` (2026-09-05 audit)                            | Never in one parallel group with any other plan that writes this file; the program serializes them by group. The other writers are: W4 group 1 [Let one project disable configured lifecycle gates explicitly](./2026-08-30-disable-configured-gates-per-project.md); W4 group 2 [Emit the canonical dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md); W2 group 1 [Repair four bundled-skill truthfulness contracts](./2026-08-30-repair-bundled-skill-contract-drift.md); W3 group 2 [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md); W2 group 2 [Require lifecycle orchestrators to load every named execution skill](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md); W5 group 4 [Defer activeProject clearing on shared archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md); W2 group 3 [Document patch-and-restore recovery for lost child handles with staged work](./2026-09-02-document-patch-and-restore-for-lost-child-handles.md); W5 group 3 [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md); W5 group 1 [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md); W6 group 1 [Validate review-ledger paths and archive only terminal reviews before the final PR](./2026-09-03-validate-review-ledger-paths-before-final-pr.md); W6 group 2 [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md); W5 group 4 [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md); W5 group 3 [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md); W5 group 2 [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md). | Pending; the execution program orders every group so at most one of these lanes writes the file at a time. |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                | Affected | Files in common                                                                                                                              | Required update                                                                                                                                                                              |
| ------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | Minor    | `review-skill-contracts.test.ts` (+17 lines) and `.agents/docs/autonomy-contract.md` (only if a gate row is added).                          | Re-anchor the `:1134` ordering case; re-run the inventory test if the contract was touched. Drift check on 2026-09-03 confirmed exactly these files changed; apply this row before dispatch. |
| `review-plan-workflow` (draft PR #190) merges                                        | Yes      | `review-skill-contracts.test.ts`, `.agents/docs/autonomy-contract.md`, `apps/oat-docs/docs/workflows/projects/lifecycle.md` (in scope here). | Re-anchor the test case and re-read `lifecycle.md` before editing; neither event edits the quick-start or complete skills.                                                                   |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-pjm-update-repo-reference/SKILL.md .agents/docs/autonomy-contract.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/validation/autonomy-gate-inventory.test.ts apps/oat-docs/docs/workflows/projects/lifecycle.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

If Step 0.5 or the Step 3.7 roll-up/seal block moved, re-anchor before
editing.

## Repository conventions

- Skill validation: `pnpm oat:validate-skills`; bump gate:
  `pnpm run check:skill-bumps`; format: `pnpm format`.
- Focused tests: from `packages/cli`,
  `pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/validation/autonomy-gate-inventory.test.ts`.
- Implementation pattern: indexOf ordering assertions as in
  `review-skill-contracts.test.ts:1134`; load-and-follow wording as in
  `oat-project-next/SKILL.md:418-441`.
- Shipped skills require the five-package lockstep bump, owned by the wave
  fan-in in lane mode (see Scope).

## Scope

### In scope

- `oat-project-quick-start/SKILL.md` Step 0.5 — record `absorbed_projects`
  and `absorbed_backlog_ids` in `state.md` frontmatter when consolidating;
  `version:` bump.
- `oat-project-complete/SKILL.md` — advisory retirement sweep inside Step
  3.7, after the status probe and before `oat project log rollup` and the
  seal; `version:` bump.
- `packages/cli/src/validation/skills.test.ts` — `oat-project-complete`
  (`:4002`) and `oat-project-quick-start` (`:5071`) version pin updates.
- `review-skill-contracts.test.ts` — three new cases.
- `apps/oat-docs/docs/workflows/projects/lifecycle.md` — sweep description.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- A new interactive prompt or gate row — the finding is advisory with a
  recorded disposition, not a question; if a prompt becomes necessary, STOP.
- `.oat/projects/archived/**` — durable evidence, read-only.
- `oat-pjm-update-repo-reference` — reuse the pattern, do not extend it.
- Any CLI command; #250 proposes guidance, not code.

## Current state

Quick-start has no consolidation vocabulary; the completion skill retires one
project physically. The sweep needs two recorded inputs and four target
surfaces. Historical exemption is judgment, so the sweep output is an
advisory finding that must be dispositioned (fixed or explicitly accepted as
historical) before the log is rolled up and sealed, never a mechanical hard
block on a grep hit.

## Implementation steps

### 1. Record consolidation inputs at quick-start

In Step 0.5 add the branch: when the new project absorbs prior scaffolds,
write `absorbed_projects: [<slug>]` and `absorbed_backlog_ids: [<BL-id>]` to
`state.md` frontmatter and name the retired scaffold directories.

**Verify:** `pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts` → green.

### 2. Add the retirement sweep before the roll-up and seal

In Step 3.7, after the `oat project log check` status probe and before the
`oat project log rollup` block (`SKILL.md:594-634`), add: run
`oat pjm doctor --json` and skip the sweep with a one-line note when
`adoption.state` is not `declared` or `inferred-legacy` (this skill ships to
repositories without PJM); otherwise read the two fields; grep the four
surfaces for each slug and ID and for future-oriented ownership language
tied to them; exempt prose that clearly describes past state; each remaining
hit becomes a named finding with a required disposition (fix now or accept
as historical) appended to the project log with `oat project log append`
before the roll-up runs, so the roll-up summarizes the dispositions and the
seal remains the final entry. If a disposition changes `summary.md` inputs,
regenerate the summary before the roll-up as Step 3.7 already requires. In
autonomous completion, where no prompt is allowed, record every finding as
an advisory warning entry and continue, mirroring the warn-and-continue
precedent at `completion-and-closeout.md:773`. When the status probe reports
`status: "absent"` (no project log), record the dispositions in the
completion report instead and never create a log. On a resumed completion
whose log already carries a seal, the sweep must not append: run it in
report-only mode and never re-enter the roll-up or seal.

**Verify:** same command → green; ordering holds.

### 3. Add the contract tests

`records absorbed project slugs and backlog IDs at quick-start consolidation`;
`sweeps and dispositions absorbed ownership before the project-log roll-up and seal`
asserting `sweepIndex < rollupIndex < sealIndex < completeStateIndex <
archiveIndex` on the existing anchors (`oat project log rollup`, the seal
append block at `:636-646`, the `complete-state` invocation, and
`ARCHIVE_OUTPUT=$(oat project archive`); and
`never appends retirement findings after an existing seal on resume`
asserting the report-only clause sits inside the sweep and that
`'No project-log append may follow the seal'` is still present. Prove red
two ways: revert step 2 (sweep absent), and move the sweep paragraph to just
before the Step 8 archive block (the bad late-append placement) and confirm
the ordering case fails before restoring it.

**Verify:** `pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts -t 'absorbed'` → pass.

### 4. Inventory check, docs, bump

Run the inventory test (no gate row expected); update `lifecycle.md`; format.

**Verify:** `pnpm exec vitest run src/validation/autonomy-gate-inventory.test.ts`
→ 4 passed. **Lane mode (default under the execution program):** bump both
skill `version:` fields and update their pins in
`packages/cli/src/validation/skills.test.ts` (`:4002`, `:5071`); run the
focused tests above, then `pnpm check`, `pnpm type-check`, and
`pnpm run check:skill-bumps` with captured exit codes, plus `pnpm lint`,
`pnpm format`, and `pnpm oat:validate-skills` because this plan changes
`.agents/skills`. Do not edit lockstep release files or run
`pnpm release:check-versions` / `pnpm release:validate`; the wave fan-in
owns the lockstep bump and the full definition-of-done sequence.
**Standalone mode only:** bump the five public packages above freshly
fetched `origin/main` and run the eight AGENTS.md gates in order.

## Test plan

- Pattern: `review-skill-contracts.test.ts:1134`.
- Cases as in step 3; regression proved: a physically retired scaffold whose
  active prose still claims ownership is caught before the log is sealed, the
  sweep cannot drift after the seal or the archive step, and a resumed
  completion never appends after an existing seal.

## Done criteria

- [ ] Consolidation records absorbed slugs and IDs.
- [ ] Completion sweeps the four surfaces inside Step 3.7 before the roll-up
      and seal, with the historical exemption and a recorded disposition per
      finding; no project-log append follows the seal, including on resume.
- [ ] All three contract tests fail on revert (and the ordering case fails on
      the late-append placement) and pass on the change.
- [ ] No new prompt site; inventory test green.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is
      edited. Standalone mode: one lockstep bump and all eight gates pass.

## STOP conditions

Stop and report instead of improvising when:

- the executing repository has no PJM adoption and the sweep cannot be skipped
  cleanly (the skill must degrade, never fail closeout for a missing surface);
- the sweep design requires a user prompt (new autonomy gate row);
- the sibling active-pointer plan has not landed and the same skill is
  being edited concurrently;
- the sweep cannot be placed before the roll-up (for example a disposition
  needs archive-time information), which would force an append after the
  seal;
- the sweep would become a hard block on raw grep hits; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, issue #250, the
gate-execution-contract-hardening retro, and the contract tests when
substantial time passes, main advances materially from
`49aeb5075971180b48c131bbd2b21b82d455bfc9`, either sibling plan or a named
landing event lands, cited contracts change, or a load-bearing claim cannot
be reproduced. Apply the landing-event table above.

## Review focus

- Advisory-with-disposition, not a mechanical block.
- The two recorded fields are the only inputs the sweep needs.
- Ordering relative to the roll-up, seal, complete-state, and archive is
  test-pinned, and the bad placement was proven to fail.
