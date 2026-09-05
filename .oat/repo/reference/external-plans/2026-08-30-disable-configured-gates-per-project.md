---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260712-per-project-override.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260712-per-project-override
oat_issue_url: null
created: '2026-08-30T23:49:30Z'
---

# Let one project disable configured lifecycle gates explicitly

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** The consolidated gate project completed and
> merged as PR #246. Revalidation against its delivered structured-command and
> missing-artifact contracts found no project-override implementation and
> preserved the additive project-aware resolution seam used by this plan.

## Outcome

Interactive project setup can preserve or disable each configured lifecycle
gate for that project without changing shared/user configuration. Overrides
live in `state.md`, non-interactive runs never invent them, gate resolution
reports configured-but-disabled distinctly from absent or passed, and project
progress makes the deliberate posture visible to reviewers.

## Source and live evidence

- Source backlog item:
  [BL-260712-per-project-override — Per-project override to disable configured external gates](../../pjm/backlog/items/BL-260712-per-project-override.md)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `packages/cli/src/config/oat-config.ts:181-214` models configured skill gates
    only at config layers.
  - `packages/cli/src/config/resolve.ts:240-257` returns only the effective raw
    `GateConfig | null`, without source or project state.
  - `packages/cli/src/commands/gate/index.ts:2948-2958` still makes
    `oat gate resolve` read only effective config; its command registration at
    `:3747-3756` still has no project option.
  - `.oat/templates/state.md:1-79` has phase/implementation gate fields but no
    `oat_skill_gate_overrides` map.
  - `.agents/skills/oat-project-plan-writing/SKILL.md:271-392` is the shared
    phase-gate setup precedent for interactive, preserved, and non-interactive
    choices.
  - Quick-start, plan, and import-plan already own setup/persistence boundaries;
    current gate execution calls appear in
    `.agents/skills/oat-project-quick-start/SKILL.md:721-787`,
    `.agents/skills/oat-project-plan/SKILL.md:536`, and
    `.agents/skills/oat-project-import-plan/SKILL.md:452`.
  - The persisted exit-gate transition is consumed downstream by
    `.agents/skills/oat-project-next/SKILL.md:303-316`, which accepts
    `allowed/configured` only with `disposition: passed`, `warned`, or
    `prompt_approved` plus configured gate-run provenance, and by
    `.agents/skills/oat-project-implement/references/completion-and-closeout.md:307-320`,
    which defines the `disposition` enum as
    `null | passed | warned | prompt_approved | no_gate`. A repo-wide search for
    `no_gate`, `prompt_approved`, and `allowed/configured` across
    `.agents/skills` and `.agents/agents` finds exactly those two consumers.
    Without changes there, a `project_disabled` closeout is malformed to the
    router and loops back to `oat-project-implement`.
- Consolidated predecessor:
  - [PR #246 — Harden gate execution contracts](https://github.com/voxmedia/open-agent-toolkit/pull/246)
    completed `gate-execution-contract-hardening`, including
    [BL-260726-validate-structured-output](../../pjm/backlog/archived/BL-260726-validate-structured-output.md)
    and [BL-260826-gate-targets-must-not-yield](../../pjm/backlog/archived/BL-260826-gate-targets-must-not-yield.md).
  - The retained project ref is
    [`gate-execution-contract-hardening.json`](../../../projects/synced/gate-execution-contract-hardening.json),
    and its delivered summary is
    [Gate Execution Contract Hardening](../project-summaries/20260831-gate-execution-contract-hardening.md).

## Dependencies

| Type                   | Dependency                                                                                                                                          | Required state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Current state                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Satisfied predecessor  | [PR #246](https://github.com/voxmedia/open-agent-toolkit/pull/246) / `gate-execution-contract-hardening`                                            | Project completed; final review passed; implementation merged into `origin/main`; delivered gate resolve/execute and lifecycle contracts revalidated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Satisfied at merge `511ffff3822cebdc81e4380452652fe801e2bfb8`; revalidated on the current planning baseline. |
| Preserved contract     | [BL-260826-gate-targets-must-not-yield](../../pjm/backlog/archived/BL-260826-gate-targets-must-not-yield.md) / `artifact_missing` terminal behavior | Preserve synchronous headless completion and cause-specific fail-closed behavior when adding a pre-launch disabled resolution.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Delivered by PR #246; this plan does not alter launch or artifact-result semantics.                          |
| Soft ordering          | W4 group 2 plan [Emit the canonical dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md)                      | Runs after this plan; both write `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts` and the version pins in `packages/cli/src/validation/skills.test.ts` (this plan bumps `oat-project-implement`, which that plan also bumps), so never in one parallel group; dispatch stamp lands after gate override.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Pending.                                                                                                     |
| Satisfied revalidation | `tool-pack-scope-provider-truthfulness` merged as PR #255 (`a06e9713a`, 2026-09-03)                                                                 | Re-anchor `oat-project-plan-writing/SKILL.md:271-392` (now bumped to 1.2.21 with a dispatch-lineage paragraph) and `config/user-sync-config.ts` (+16 lines) before editing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Landed; drift confirmed 2026-09-03 and re-run 2026-09-04.                                                    |
| Soft ordering          | Shared write: the skill version pins and contract cases in `packages/cli/src/validation/skills.test.ts` (2026-09-05 audit)                          | Never in one parallel group with any other plan that writes this file; the program serializes them by group. The other writers are: W4 group 2 [Emit the canonical dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md); W2 group 1 [Repair four bundled-skill truthfulness contracts](./2026-08-30-repair-bundled-skill-contract-drift.md); W3 group 2 [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md); W2 group 2 [Require lifecycle orchestrators to load every named execution skill](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md); W5 group 4 [Defer activeProject clearing on shared archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md); W2 group 3 [Document patch-and-restore recovery for lost child handles with staged work](./2026-09-02-document-patch-and-restore-for-lost-child-handles.md); W5 group 3 [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md); W5 group 5 [Make consolidated-project retirement checks semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md); W5 group 1 [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md); W6 group 1 [Validate review-ledger paths and archive only terminal reviews before the final PR](./2026-09-03-validate-review-ledger-paths-before-final-pr.md); W6 group 2 [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md); W5 group 4 [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md); W5 group 3 [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md); W5 group 2 [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md). | Pending; the execution program orders every group so at most one of these lanes writes the file at a time.   |
| Soft ordering          | Shared write: `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts` (2026-09-05 Bugbot finding on PR #260)        | Never in one parallel group with any other plan that writes this file; wave order lands them in sequence (W2 group 2, W3 group 1, W4 group 1, W5 group 4). The other writers are: W2 group 2 [Require lifecycle orchestrators to load every named execution skill](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md); W3 group 1 [Require repo-wide call-site sweeps for cross-cutting options](./2026-08-30-require-repo-wide-call-site-sweeps.md); W5 group 4 [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Pending; the execution program keeps each of these lanes in a different group.                               |
| Soft ordering          | Shared write: `.agents/skills/oat-project-next/SKILL.md` (2026-09-05 Bugbot finding on PR #260)                                                     | Never in one parallel group with any other plan that writes this file; wave order lands them in sequence (W2 group 2, W4 group 1, W5 group 1, W5 group 4). The other writers are: W2 group 2 [Require lifecycle orchestrators to load every named execution skill](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md); W5 group 1 [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md); W5 group 4 [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Pending; the execution program keeps each of these lanes in a different group.                               |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                | Affected         | Files in common                                                                                                                                                                                                                                                                       | Required update                                                                                                                                                                    |
| ------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | See dependencies | Recorded in the Dependencies and Revalidation sections.                                                                                                                                                                                                                               | Drift re-run 2026-09-03 and 2026-09-04; anchors refreshed where noted.                                                                                                             |
| `review-plan-workflow` (draft PR #190) merges                                        | Yes              | `packages/cli/src/commands/gate/*` (resolve/execute), `apps/oat-docs/docs/cli-utilities/configuration.md`, `workflow-gates.md`, `packages/cli/src/validation/skills.test.ts` (pins), `review-skill-contracts.test.ts`, and `oat-project-implement/SKILL.md` (#190 head `63161897dd4`) | If #190 merges first: re-anchor the gate resolve/execute seam, both docs pages, the pin tuples, and the two contract-test files before editing; if this lands first, #190 rebases. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- packages/cli/src/config packages/cli/src/commands/gate packages/cli/src/commands/shared/frontmatter.ts .oat/templates/state.md .agents/skills/oat-project-plan-writing .agents/skills/oat-project-quick-start .agents/skills/oat-project-plan .agents/skills/oat-project-import-plan .agents/skills/oat-project-implement .agents/skills/oat-project-next .agents/skills/oat-project-progress packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/commands/init/tools/shared/project-start-preflight-contracts.test.ts apps/oat-docs/docs/cli-utilities/workflow-gates.md
```

Re-run all current gate resolve/execute focused tests on the delivered baseline.
Any changed command envelope or lifecycle integration is a STOP condition until
this plan is refreshed.

## Repository conventions

- Build: `pnpm build` and `pnpm build:docs` → workspace and docs builds pass.
- Typecheck: `pnpm type-check` → all TypeScript packages pass.
- Focused tests: gate config/resolve command tests, shared frontmatter tests,
  lifecycle sequence contracts, and skill validation all pass.
- Lint/format: `pnpm lint && pnpm format` → canonical skill coverage passes.
- Provider refresh: `oat sync --scope all` → managed views match canonical
  skills; do not edit provider copies.
- Implementation pattern: preserve raw `oat gate resolve <skill> --json`
  compatibility unless the caller explicitly supplies project context.
- Git/PR convention: changed skills require one PR-scoped `version:` bump each
  plus their pin updates; release bookkeeping is mode-dependent (see step 6):
  the wave fan-in owns the lockstep five-package bump, and only a standalone
  execution bumps the five public packages and `pnpm-lock.yaml` itself. Do not
  push or open a PR unless instructed.

## Scope

### In scope

- State schema/template and a strict
  `oat_skill_gate_overrides: {<gate-aware-skill>: disabled}` map.
- A backward-compatible project-aware `oat gate resolve` mode with explicit
  configured, project-disabled, and not-configured outcomes.
- Shared interactive setup contract plus quick-start, plan, and import-plan
  callers before plan writing.
- Gate-aware lifecycle callers that must pass resolved project context.
- Explicit configured-but-disabled evidence in implementation closeout/status:
  `oat-project-implement/references/completion-and-closeout.md:307-320`
  (the `disposition` enum and persisted transition contract).
- The downstream router `oat-project-next/SKILL.md:303-316`, which must accept
  the new disposition, its contract cases in
  `review-skill-contracts.test.ts` and
  `post-implement-sequence-contracts.test.ts`, and its pin.
- `oat-project-progress` visibility and workflow/project-config docs.
- The project-state frontmatter allowlist and preserve-on-write path
  (`packages/cli/src/commands/shared/frontmatter.ts:17`
  `PROJECT_STATE_FRONTMATTER_FIELDS`, its predicate, and `frontmatter.test.ts`),
  so state writers never drop the new key.
- Contract/unit tests: `frontmatter.test.ts`, gate command tests,
  `project-start-preflight-contracts.test.ts`,
  `post-implement-sequence-contracts.test.ts`,
  `review-skill-contracts.test.ts`, and
  `packages/cli/src/validation/skills.test.ts`.
- Skill versions and their pins in `packages/cli/src/validation/skills.test.ts`
  for every bumped skill that is pinned there: `oat-project-plan-writing`,
  `oat-project-quick-start`, `oat-project-plan`, `oat-project-import-plan`,
  `oat-project-implement`, and `oat-project-next` (`oat-project-progress` has
  no pin). Managed views.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- Changing shared/local/user gate configuration.
- Disabling all gates with one project boolean; granularity remains per skill.
- Phase review gates (`oat_phase_review_gate`) or HiLL policy.
- Future autonomous design-gate disable semantics.
- Treating disabled as passed, failed, or not configured.
- Prompting or silently disabling in non-interactive mode.

## Current state

The effective-config resolver knows whether a gate exists but not which project
is executing. Project setup already persists phase-gate posture, and every
gate-aware skill has a project path before launching its lifecycle gate. The
least disruptive CLI extension is therefore opt-in project context:

PR #246 added conservative validation for recognized direct lifecycle review
commands and cause-specific `artifact_missing` handling. It did not add
project state to `oat gate resolve`, change its legacy `GateConfig | null`
output, or add an override field to `state.md`; this plan composes with those
delivered contracts rather than replacing them.

- without `--project`, preserve the existing raw `GateConfig | null` JSON;
- with `--project <path-or-name>`, resolve the project using the same canonical
  active/name/path rules used by gate review and return a discriminated envelope;
- retain the configured gate in that envelope even when an override makes the
  effective gate null, so evidence cannot be mistaken for absent configuration.

Use this project-aware envelope:

```json
{
  "skill": "oat-project-implement",
  "resolution": "configured_disabled_by_project",
  "configuredGate": { "command": "..." },
  "effectiveGate": null,
  "configSource": "shared",
  "projectOverride": {
    "value": "disabled",
    "source": "state.md:oat_skill_gate_overrides"
  }
}
```

The other `resolution` values are `configured` and `not_configured`. This is an
additive opt-in envelope, not a silent change to existing external consumers.

## Implementation steps

### 1. Define and validate project override state

Add the commented map to `.oat/templates/state.md`. Implement one typed parser
using the repository's YAML frontmatter utilities: keys are non-empty
gate-aware skill names and the only allowed value is literal `disabled`.
Reject arrays, booleans, unknown values, duplicate YAML keys, and malformed
maps with an actionable project/state path; absence means follow configuration.

Add focused parser tests and preserve unknown unrelated frontmatter fields on
writes.

**Verify:** from `packages/cli`, `pnpm exec vitest run src/commands/shared/frontmatter.test.ts src/commands/project` → shared frontmatter/project-state tests pass for absent, valid,
malformed, duplicate, and round-trip cases.

### 2. Add backward-compatible project-aware gate resolution

Extend `oat gate resolve` with `--project <path-or-name>`. Reuse the existing
project resolver and effective config precedence. Add a source-aware gate
resolver that identifies `local`, `shared`, or `user` without changing
precedence. When project context is supplied, emit the exact discriminated
envelope above; otherwise preserve current raw JSON byte shape.

For a project-disabled configured gate, preserve `configuredGate`, set
`effectiveGate: null`, and emit `configured_disabled_by_project`. For absent
configuration, emit `not_configured`; an override without a configured gate is
still visible in project progress but does not fabricate configuration.

**Verify:** from `packages/cli`, `pnpm exec vitest run src/commands/gate` → gate command tests cover all config layers, absent state, each
resolution, malformed state, explicit path/name/active project, and legacy
no-project compatibility.

### 3. Add one shared gate-posture setup contract

Beside the shared phase-gate setup in `oat-project-plan-writing`, add a lifecycle
gate-posture procedure used by quick-start, plan, and import-plan before plan
writing. Probe configured gate-aware skills without executing them. When at
least one exists and a response channel is available, present each gate and let
the user keep or disable it independently. Persist only disabled overrides;
keeping all gates leaves the map absent/empty.

Preserve an explicit existing map on resume/import. In non-interactive mode,
do not prompt or write a new map. Never modify config layers. Run this procedure
adjacent to, but independently from, phase-gate setup.

**Verify:** from `packages/cli`, `pnpm exec vitest run src/commands/init/tools/shared/project-start-preflight-contracts.test.ts src/validation/skills.test.ts` → skill contract tests prove prompt eligibility, per-gate choices,
preservation, no-config suppression, and non-interactive no-write behavior.

### 4. Consume the project-aware resolution at gate boundaries

Update gate-aware lifecycle skill commands to pass their resolved project path.
Handle all three envelope values explicitly. A project-disabled gate must not
launch a process and must emit/persist `configured but disabled by project
override`, including project and source. It must never enter the passed,
missing, or failed branches.

For implementation closeout, extend the durable gate disposition with a
specific `project_disabled` value while retaining configured resolution and a
not-launched launch state. Keep completion allowed because the operator chose
the project override; preserve all other closeout freshness and snapshot rules.

Specify the persisted shape for the disabled transition in
`completion-and-closeout.md:307-320` and teach the router to accept it:

- `status: allowed`, `resolution: configured`,
  `disposition: project_disabled`, `resolved_command` set to the configured
  command (evidence, never executed), null gate-run and artifact provenance
  (nothing launched, so none can exist), and a `project_override` sub-record
  with `value: disabled` and `source: state.md:oat_skill_gate_overrides`.
- `config_fingerprint` must cover the resolved override state as well as the
  configured declaration, so removing the override from `state.md` changes
  the fingerprint and a stale `project_disabled` transition can never be
  reused as a fresh `allowed` result once the gate is re-enabled.
- In `oat-project-next/SKILL.md:303-316`, add `allowed/configured` with
  `disposition: project_disabled` as a third valid combination: null launch
  provenance is required (not merely tolerated), `config_fingerprint`,
  `reviewed_head`, and `implementation_fingerprint` must match, and the same
  rolling-freshness rules apply. Every other combination keeps its current
  fail-closed routing.

**Verify:** from `packages/cli`, `pnpm exec vitest run src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts` → lifecycle contract tests prove no launch, distinct disposition,
durable source, configured command preservation, unchanged no-gate/passed/
failed paths, the router's acceptance of `project_disabled` with null launch
provenance, and the enabled→disabled→enabled transition: a
`project_disabled` transition recorded under an override is routed as stale
after the override is removed, and a fresh configured run is required.

### 5. Surface overrides and document boundaries

Have `oat-project-progress` report active overrides from `state.md`, including
the gate-aware skill keys. Update workflow-gates and project configuration docs
with precedence, interactive/non-interactive behavior, evidence vocabulary,
and the explicit phase/autonomous exclusions.

**Verify:** from `packages/cli`, `pnpm exec vitest run src/validation/skills.test.ts` and, from the root, `pnpm build:docs` → pass.

### 6. Refresh views, version, and run the mode-appropriate gates

Bump every changed canonical skill exactly once, update the pins listed in
Scope, and run managed provider sync.

**Lane mode (default under the execution program):** bump changed skill
`version:` fields and update their pins in
`packages/cli/src/validation/skills.test.ts` where a pin exists; run the
focused tests above, then `pnpm check`, `pnpm type-check`, and
`pnpm run check:skill-bumps` with captured exit codes, plus `pnpm lint`, `pnpm format`, and
`pnpm oat:validate-skills` because this plan changes `.agents/skills`. Do not edit
lockstep release files or run `pnpm release:check-versions` /
`pnpm release:validate`; the wave fan-in owns the lockstep bump and the full
definition-of-done sequence. **Standalone mode only:** bump the five public
packages above freshly fetched `origin/main` and run the eight AGENTS.md gates
in order.
Run the focused tests independently so Turbo cache replay is not the only
evidence.

## Test plan

- Strict state-frontmatter parser and preservation tests.
- Gate resolve tests for layer precedence, project resolution, all three
  outcomes, malformed state, and legacy output compatibility.
- Quick-start/plan/import contract tests for prompt, preservation, per-gate
  choices, no-config, and non-interactive behavior.
- Closeout tests for distinct project-disabled evidence and zero launch.
- Router tests: `oat-project-next` accepts `allowed/configured` with
  `project_disabled` and null launch provenance; rejects it with non-null
  provenance; and routes an override-era transition as stale after the
  override is removed (enabled→disabled→enabled).
- Progress/status contract tests for visible overrides.
- Docs build, then the lane-mode or standalone gate set from step 6.

## Done criteria

- [ ] Overrides persist only in project `state.md` and never mutate config.
- [ ] Choices are per configured gate-aware skill.
- [ ] Non-interactive runs never invent or silently apply an override.
- [ ] Project-aware resolution distinguishes configured, project-disabled, and
      not-configured while legacy no-project output remains compatible.
- [ ] Disabled gates do not launch and cannot appear passed or missing.
- [ ] Project progress and durable closeout evidence show the override source.
- [ ] `oat-project-next` routes a fresh `project_disabled` closeout forward and
      a post-override-removal one as stale.
- [ ] Phase review/HiLL/autonomous design-gate behavior is unchanged.
- [ ] Changed skills have required version bumps and pin updates.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is edited.
      Standalone mode: one lockstep bump and all eight gates pass.
- [ ] `git status --short` contains no unexplained file.

## STOP conditions

Stop and report instead of improvising when:

- PR #246's structured-command or `artifact_missing` contracts cannot be
  preserved by the project-aware resolution design;
- its delivered resolver/envelope makes this opt-in compatibility design stale;
- project resolution cannot use the established active/name/path contract;
- a disabled gate would need to masquerade as passed, missing, or failed;
- requirements expand into phase review or autonomous design-gate policy; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

The prerequisite-merge revalidation was completed against PR #246 and current
`origin/main`. Revalidate again against the source item, config/state schemas,
every gate-aware lifecycle call, and focused tests when substantial time
passes, main advances materially, cited contracts or intent change, another PR
implements part of the outcome, or a load-bearing current-state claim cannot
be reproduced.

Run the drift check and confirm this plan remains `READY` before import. Refresh
or supersede it if a revalidation trigger fires.

## Review focus

- Size: this plan spans state schema, gate resolution, several lifecycle
  skills, the next-step router, closeout visibility, and docs. Every consumer
  is named in Scope before dispatch; do not leave consumer discovery to a
  nested import decision. If the executing lane finds the pieces cannot ship
  as one reviewable change, import it with `oat-project-import-plan` and split
  by contract rather than trimming scope.
- Scrutinize backward compatibility of `oat gate resolve` without `--project`.
- Verify disabled is explicit, durable, and never conflated with gate outcome.
- Confirm setup preserves existing state and non-interactive safety.
- Confirm the gate-project merge was reconciled rather than overwritten.
