---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260712-per-project-override.md
oat_external_plan_commit: 845462e78468265c7e2e2b2f6c64731472731ecb
oat_external_plan_date: '2026-08-30'
oat_execution_status: BLOCKED
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

> [!CAUTION]
> **Execution status: BLOCKED. Do not import or execute this plan** until the
> consolidated `gate-execution-contract-hardening` project has completed, its
> implementation is merged into `origin/main`, and its structured gate-command
> contract has been revalidated. That project combines the headless/no-yield and
> structured-output predecessors and changes the same CLI/lifecycle surfaces.

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
  `845462e78468265c7e2e2b2f6c64731472731ecb` on `2026-08-30`.
- Verified evidence:
  - `packages/cli/src/config/oat-config.ts:181-214` models configured skill gates
    only at config layers.
  - `packages/cli/src/config/resolve.ts:240-257` returns only the effective raw
    `GateConfig | null`, without source or project state.
  - `packages/cli/src/commands/gate/index.ts:2906-2917` makes `oat gate resolve`
    read only effective config; `:3680-3688` has no project option.
  - `.oat/templates/state.md:1-79` has phase/implementation gate fields but no
    `oat_skill_gate_overrides` map.
  - `.agents/skills/oat-project-plan-writing/SKILL.md:271-392` is the shared
    phase-gate setup precedent for interactive, preserved, and non-interactive
    choices.
  - Quick-start, plan, and import-plan already own setup/persistence boundaries;
    current gate execution calls appear in
    `.agents/skills/oat-project-quick-start/SKILL.md:721-770`,
    `.agents/skills/oat-project-plan/SKILL.md:536`, and
    `.agents/skills/oat-project-import-plan/SKILL.md:452`.
- Consolidated predecessor:
  - `gate-execution-contract-hardening` owns
    [BL-260726-validate-structured-output](../../pjm/backlog/items/BL-260726-validate-structured-output.md)
    and [BL-260826-gate-targets-must-not-yield](../../pjm/backlog/items/BL-260826-gate-targets-must-not-yield.md).
  - The retained project ref is
    `refs/oat/projects/gate-execution-contract-hardening`; do not plan from the
    older separate project dossiers after the consolidated implementation lands.

## Dependencies

| Type              | Dependency                                                                                                                                             | Required state                                                                                                                                        | Current state                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Hard              | `gate-execution-contract-hardening`, including [BL-260726-validate-structured-output](../../pjm/backlog/items/BL-260726-validate-structured-output.md) | Project completed; final review passed; implementation merged into `origin/main`; delivered gate resolve/execute and lifecycle contracts revalidated. | In flight outside this baseline; authoritative tracker has not reached durable completion on main. |
| Soft coordination | [BL-260826-gate-targets-must-not-yield](../../pjm/backlog/items/BL-260826-gate-targets-must-not-yield.md)                                              | Preserve its headless terminal behavior when adding a pre-launch disabled resolution.                                                                 | Consolidated into the same in-flight project.                                                      |

The hard dependency is unsatisfied, so execution remains blocked.

## Drift check

After the dependency is satisfied and before editing:

```bash
git fetch origin main
git diff --stat 845462e78468265c7e2e2b2f6c64731472731ecb..origin/main -- packages/cli/src/config packages/cli/src/commands/gate packages/cli/src/commands/shared/frontmatter.ts .oat/templates/state.md .agents/skills/oat-project-plan-writing .agents/skills/oat-project-quick-start .agents/skills/oat-project-plan .agents/skills/oat-project-import-plan .agents/skills/oat-project-implement .agents/skills/oat-project-progress packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts apps/oat-docs/docs/cli-utilities/workflow-gates.md
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
- Git/PR convention: CLI, templates, docs, and skills require one lockstep bump
  of all five public packages plus changed skill-version bumps; do not push or
  open a PR unless instructed.

## Scope

### In scope

- State schema/template and a strict
  `oat_skill_gate_overrides: {<gate-aware-skill>: disabled}` map.
- A backward-compatible project-aware `oat gate resolve` mode with explicit
  configured, project-disabled, and not-configured outcomes.
- Shared interactive setup contract plus quick-start, plan, and import-plan
  callers before plan writing.
- Gate-aware lifecycle callers that must pass resolved project context.
- Explicit configured-but-disabled evidence in implementation closeout/status.
- `oat-project-progress` visibility and workflow/project-config docs.
- Contract/unit tests, skill versions, managed views, package versions, and lockfile.

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

**Verify:** shared frontmatter/project-state tests pass for absent, valid,
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

**Verify:** gate command tests cover all config layers, absent state, each
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

**Verify:** skill contract tests prove prompt eligibility, per-gate choices,
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

**Verify:** lifecycle contract tests prove no launch, distinct disposition,
durable source, configured command preservation, and unchanged no-gate/passed/
failed paths.

### 5. Surface overrides and document boundaries

Have `oat-project-progress` report active overrides from `state.md`, including
the gate-aware skill keys. Update workflow-gates and project configuration docs
with precedence, interactive/non-interactive behavior, evidence vocabulary,
and the explicit phase/autonomous exclusions.

**Verify:** focused progress/skill contracts and `pnpm build:docs` pass.

### 6. Refresh views, version, and run complete gates

Bump every changed canonical skill exactly once, run managed provider sync,
bump all five public packages together, and update `pnpm-lock.yaml`. Run focused
tests independently, then the repository Definition of Done in order with a
fresh `origin/main` fetch before version validation.

## Test plan

- Strict state-frontmatter parser and preservation tests.
- Gate resolve tests for layer precedence, project resolution, all three
  outcomes, malformed state, and legacy output compatibility.
- Quick-start/plan/import contract tests for prompt, preservation, per-gate
  choices, no-config, and non-interactive behavior.
- Closeout tests for distinct project-disabled evidence and zero launch.
- Progress/status contract tests for visible overrides.
- Full skills, CLI, build, release, and docs gates.

## Done criteria

- [ ] Overrides persist only in project `state.md` and never mutate config.
- [ ] Choices are per configured gate-aware skill.
- [ ] Non-interactive runs never invent or silently apply an override.
- [ ] Project-aware resolution distinguishes configured, project-disabled, and
      not-configured while legacy no-project output remains compatible.
- [ ] Disabled gates do not launch and cannot appear passed or missing.
- [ ] Project progress and durable closeout evidence show the override source.
- [ ] Phase review/HiLL/autonomous design-gate behavior is unchanged.
- [ ] Changed skills and all five public packages have required version bumps.
- [ ] Focused and full gates pass with no unexplained files.

## STOP conditions

Stop and report instead of improvising when:

- the consolidated gate project is not completed and merged;
- import or execution is attempted while `oat_execution_status` is `BLOCKED`;
- its delivered resolver/envelope makes this opt-in compatibility design stale;
- project resolution cannot use the established active/name/path contract;
- a disabled gate would need to masquerade as passed, missing, or failed;
- requirements expand into phase review or autonomous design-gate policy; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidation is mandatory after the hard dependency lands. Compare this plan
with current `origin/main`, both predecessor backlog items, the consolidated
project/ref, source item, config/state schemas, every gate-aware lifecycle call,
and focused tests. Revalidate again when substantial time passes, main advances
materially, cited contracts or intent change, another PR implements part of the
outcome, or a load-bearing current-state claim cannot be reproduced.

Refresh or supersede this plan and verify the exact unblock state before import.

## Review focus

- Scrutinize backward compatibility of `oat gate resolve` without `--project`.
- Verify disabled is explicit, durable, and never conflated with gate outcome.
- Confirm setup preserves existing state and non-interactive safety.
- Confirm the gate-project merge was reconciled rather than overwritten.
