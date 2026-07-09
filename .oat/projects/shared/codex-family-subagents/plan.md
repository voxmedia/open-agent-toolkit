---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-08
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_hill_phases: ['p04']
oat_auto_review_at_hill_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: codex-family-subagents

> Execute this plan using `oat-project-implement`.

**Goal:** Replace the hard-coded Codex effort-pin special case with a generic
Codex role materialization path, then use it to support model-plus-effort
dispatch for GPT-5.6-family subagent workflows while keeping Cursor on
validated Task-level model dispatch.

**Architecture:** Dispatch policy and matrix configuration remain the source of
truth. Provider adapters compile the selected target into the reliable native
mechanism: Codex materialized roles, Cursor Task `model` arguments, and Claude
Task model arguments.

**Tech Stack:** TypeScript ESM CLI, Commander, Vitest, YAML/TOML codecs,
Oxfmt/Oxlint, Fumadocs documentation.

**Commit Convention:** `{type}({scope}): {description}`.

## Planning Checklist

- [x] Dispatch policy selected: managed `high`
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter
- [x] Added explicit prompt-safety work for canonical option rendering

---

## Parallelism

This plan remains sequential. The main phases share the same dispatch policy,
Codex codec, config validation, doctor, and docs surfaces. Running them in
parallel would create overlapping edits in `packages/cli/src/config`,
`packages/cli/src/providers`, `packages/cli/src/commands/project`, lifecycle
skills, and dispatch documentation. Keep the phases ordered so each later phase
can test against the APIs introduced by the previous one.

---

## Phase 1: Generic Codex Role Materialization

Create the reusable capability first: any canonical `.agents/agents/*.md`
subagent can become a deterministic Codex role when supplied a model and
reasoning effort string.

### Task p01-t01: Add Codex Materialization Codec

**Files:**

- Create: `packages/cli/src/providers/codex/codec/materialize.ts`
- Create: `packages/cli/src/providers/codex/codec/materialize.test.ts`
- Modify: `packages/cli/src/providers/codex/codec/export-to-codex.ts`
- Modify: `packages/cli/src/providers/codex/codec/export-to-codex.test.ts`
- Modify: `packages/cli/src/providers/codex/codec/shared.ts`

**Step 1: Write test (RED)**

Test cases:

- Given canonical `oat-reviewer.md`, model `gpt-5.6-sol`, and effort `xhigh`,
  the codec returns a managed role with deterministic role name, TOML
  `model = "gpt-5.6-sol"`, and
  `model_reasoning_effort = "xhigh"`.
- Role names normalize model IDs safely, e.g. dots and unsupported punctuation
  become hyphens.
- Missing model or effort throws `CliError`.
- Existing canonical `x_codex` extension values are preserved unless the
  explicit materialization model/effort override them.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/providers/codex/codec/materialize.test.ts
```

Expected: New tests fail because the materialization codec does not exist.

**Step 2: Implement (GREEN)**

Add a small codec API:

```typescript
interface CodexMaterializeRoleOptions {
  agent: CanonicalAgentDocument;
  model: string;
  effort: string;
  roleName?: string;
}
```

Implementation responsibilities:

- Parse and validate non-empty `model` and `effort`.
- Build a deterministic default role name from canonical agent name, model, and
  effort.
- Reuse `exportCanonicalAgentToCodexRole` after applying explicit Codex
  overrides.
- Preserve the OAT managed role header so stale detection still works.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/providers/codex/codec/materialize.test.ts
```

Expected: New codec tests pass.

**Step 3: Refactor**

Keep string normalization in one exported helper so sync, dispatch resolution,
and the CLI command never reimplement role naming.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/providers/codex/codec/export-to-codex.test.ts src/providers/codex/codec/materialize.test.ts
```

Expected: Codex codec tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/codex/codec
git commit -m "feat(p01-t01): add codex role materialization codec"
```

---

### Task p01-t02: Add Codex Materialize CLI Command

**Files:**

- Create: `packages/cli/src/commands/providers/codex/index.ts`
- Create: `packages/cli/src/commands/providers/codex/materialize.ts`
- Create: `packages/cli/src/commands/providers/codex/materialize.test.ts`
- Modify: `packages/cli/src/commands/providers/index.ts`
- Modify: `packages/cli/src/commands/providers/providers.types.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write test (RED)**

Test command behavior for:

- `oat providers codex materialize oat-reviewer --model gpt-5.6-sol --effort xhigh --dry-run --json`
  returns the role name, role path, config path, and TOML preview without
  writing files.
- The command resolves `oat-reviewer` to
  `.agents/agents/oat-reviewer.md`.
- `--agent-path .agents/agents/custom.md` also works for non-bundled agents.
- Missing `--model` or `--effort` exits with an actionable error.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/providers/codex/materialize.test.ts
```

Expected: Tests fail because the command does not exist.

**Step 2: Implement (GREEN)**

Add provider-scoped command shape:

```text
oat providers codex materialize <agent-name>
  --model <model>
  --effort <effort>
  [--role-name <role>]
  [--agent-path <path>]
  [--scope project|user]
  [--dry-run]
  [--json]
```

Implementation responsibilities:

- Use repo-local project root for project scope and home root for user scope.
- Read canonical agent markdown through `parseCanonicalAgentFile`.
- Produce human and JSON output.
- Do not use the global `oat` binary in tests.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/providers/codex/materialize.test.ts
```

Expected: Command tests pass.

**Step 3: Refactor**

Extract command output formatting into small helpers so the sync path can reuse
the same preview labels if needed.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/providers/codex/materialize.test.ts src/commands/help-snapshots.test.ts
```

Expected: Command and help snapshots pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/providers packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p01-t02): add codex materialize command"
```

---

### Task p01-t03: Write Materialized Roles and Merge Codex Config

**Files:**

- Modify: `packages/cli/src/commands/providers/codex/materialize.ts`
- Modify: `packages/cli/src/commands/providers/codex/materialize.test.ts`
- Modify: `packages/cli/src/providers/codex/codec/config-merge.ts`
- Modify: `packages/cli/src/providers/codex/codec/config-merge.test.ts`

**Step 1: Write test (RED)**

Test write mode:

- Creates `.codex/agents/<role>.toml`.
- Updates `.codex/config.toml` with `[features] multi_agent = true`.
- Adds `[agents.<role>]` with description and config file.
- Preserves unrelated user Codex config.
- Re-running is idempotent.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/providers/codex/materialize.test.ts src/providers/codex/codec/config-merge.test.ts
```

Expected: Write-mode tests fail.

**Step 2: Implement (GREEN)**

Use existing `mergeCodexConfig` and `ensureDir`/`writeFile` helpers to apply the
materialization plan.

**Step 3: Refactor**

Keep the command as a thin orchestrator over codec helpers and config merge.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/providers/codex/materialize.test.ts src/providers/codex/codec/config-merge.test.ts
```

Expected: Materialize write tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/providers/codex packages/cli/src/providers/codex/codec
git commit -m "feat(p01-t03): write materialized codex roles"
```

---

## Phase 2: Replace Hard-Coded Codex Effort Pins

Remove the current special-case generation of
`oat-phase-implementer-{low,medium,high,xhigh}` and
`oat-reviewer-{low,medium,high,xhigh}` as the primary mechanism. OAT-managed
Codex dispatch should instead materialize matrix-referenced model-plus-effort
roles through the generic path.

**Compatibility decision:** No legacy compatibility branch ships in the initial
implementation. Bare Codex effort-only targets (`low`, `medium`, `high`,
`xhigh`) remain accepted only as legacy configuration inputs, but they resolve
as unresolved for model-aware deterministic Codex dispatch until a matrix target
provides both `model` and `effort`. Full sync removes stale OAT-managed
effort-only roles. A future project can add a temporary compatibility flag if
real migration evidence requires it.

**Policy mapping decision:** This project does not ship a default
policy-to-GPT-5.6-family mapping such as `balanced -> Terra` or
`frontier -> Sol`. Policy rungs remain abstract caps; concrete Codex model
families come from dispatch matrix targets. The follow-up backlog item verifies
Cursor GPT-5.6 slugs before any recommended matrix maps Sol, Terra, or Luna.

### Task p02-t01: Model Codex Materialization Targets from Dispatch Matrix

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`

**Step 1: Write test (RED)**

Test that Codex route targets such as:

```yaml
workflow:
  dispatchCeiling:
    providers:
      codex:
        high:
          - harness: codex
            model: gpt-5.6-terra
            effort: xhigh
```

normalize as valid matrix cells and produce a resolved target with both model
and effort preserved.

Also test that a Codex route target missing either model or effort is rejected
or reported unresolved with guidance to provide both fields.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/config/oat-config.test.ts src/commands/config/index.test.ts src/commands/project/dispatch-ceiling/index.test.ts
```

Expected: Codex model-plus-effort matrix tests fail.

**Step 2: Implement (GREEN)**

Implementation responsibilities:

- Keep `WorkflowDispatchRouteTarget` provider-neutral.
- Add Codex-specific validation where dispatch matrix cells are validated.
- Preserve existing non-Codex route target behavior.
- Treat bare Codex effort values as unresolved for model-aware deterministic
  dispatch. Do not let them silently imply a model-aware materialized role.

**Step 3: Refactor**

Extract target validation helpers so config, doctor, and dispatch resolution use
the same Codex model/effort rules.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/config/oat-config.test.ts src/commands/config/index.test.ts src/commands/project/dispatch-ceiling/index.test.ts
```

Expected: Matrix parsing and dispatch resolution tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/config packages/cli/src/commands/config packages/cli/src/commands/project/dispatch-ceiling
git commit -m "feat(p02-t01): preserve codex model effort matrix targets"
```

---

### Task p02-t02: Sync Materialized Codex Roles from Matrix Targets

**Files:**

- Modify: `packages/cli/src/providers/codex/codec/sync-extension.ts`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.test.ts`
- Modify: `packages/cli/src/commands/sync/index.ts`
- Modify: `packages/cli/src/commands/sync/index.test.ts`
- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/status/index.test.ts`

**Step 1: Write test (RED)**

Test sync output for a project with Codex matrix targets:

- Generates materialized implementer and reviewer roles with model and effort.
- Does not generate the old effort-only role set.
- Removes stale managed effort-only roles when full sync runs.
- Partial sync does not remove unrelated managed roles.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/providers/codex/codec/sync-extension.test.ts src/commands/sync/index.test.ts
```

Expected: Sync tests fail because generation is still hard-coded to four effort
variants.

**Step 2: Implement (GREEN)**

Implementation responsibilities:

- Replace `CODEX_EFFORT_VARIANTS`/`codexEffortVariantsFromBase` as the primary
  generation path.
- Build desired materialized roles from resolved matrix targets and canonical
  agents.
- Use the Phase 1 materialization codec for all generated role content.
- Keep stale detection keyed by OAT managed role headers and exact role names.

**Step 3: Refactor**

Keep sync planning pure: compute desired roles first, then diff/apply as it
does today.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/providers/codex/codec/sync-extension.test.ts src/commands/sync/index.test.ts src/commands/status/index.test.ts
```

Expected: Sync, dry-run/status, and stale-role tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/codex/codec packages/cli/src/commands/sync packages/cli/src/commands/status
git commit -m "feat(p02-t02): sync codex materialized role targets"
```

---

### Task p02-t03: Dispatch to Materialized Codex Role Names

**Files:**

- Modify: `packages/cli/src/providers/ceiling/registry.ts`
- Modify: `packages/cli/src/providers/ceiling/registry.test.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`
- Modify: `packages/cli/src/providers/identity/stamp.ts`
- Modify: `packages/cli/src/providers/identity/stamp.test.ts`

**Step 1: Write test (RED)**

Test Codex dispatch resolution:

- Matrix target `{harness:"codex", model:"gpt-5.6-sol", effort:"xhigh"}`
  compiles to the materialized role name from Phase 1.
- JSON output includes model axis `selected:gpt-5.6-sol`, effort axis
  `selected:xhigh`, target role name, policy, source, and selection branch.
- Reviewer dispatch uses the reviewer materialized role, not the implementer
  role.
- Bare legacy effort values do not claim model-aware deterministic dispatch.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/providers/ceiling/registry.test.ts src/commands/project/dispatch-ceiling/index.test.ts src/providers/identity/stamp.test.ts
```

Expected: Dispatch tests fail because Codex still compiles effort-only variants.

**Step 2: Implement (GREEN)**

Implementation responsibilities:

- Extend Codex ceiling adapter dispatch args to carry materialized role names.
- Use the shared role-name helper from Phase 1.
- Preserve cross-harness route behavior.
- Keep provider-default effort reporting only for inherit/base fallback paths.

**Step 3: Refactor**

Make the resolver output unambiguous: `selectedValue` may remain the cap/effort
value, while `target` carries model and role identity.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/providers/ceiling/registry.test.ts src/commands/project/dispatch-ceiling/index.test.ts src/providers/identity/stamp.test.ts
```

Expected: Dispatch resolution and stamp tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/ceiling packages/cli/src/commands/project/dispatch-ceiling packages/cli/src/providers/identity
git commit -m "feat(p02-t03): dispatch codex materialized roles"
```

---

### Task p02-t04: Update Doctor and Stray Detection for Materialized Roles

**Files:**

- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`
- Modify: `packages/cli/src/commands/shared/codex-strays.ts`
- Modify: `packages/cli/src/commands/shared/codex-strays.test.ts`
- Modify: `packages/cli/src/commands/init/index.test.ts`

**Step 1: Write test (RED)**

Test that:

- `oat doctor` reports missing materialized Codex role files when config points
  at managed generated roles.
- Old hard-coded effort-only roles are treated as stale managed roles after the
  migration.
- Adoption prompts do not offer OAT-managed materialized roles as custom strays.
- Non-OAT user Codex roles are still adoptable.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/doctor/index.test.ts src/commands/shared/codex-strays.test.ts src/commands/init/index.test.ts
```

Expected: Tests fail until doctor/stray logic recognizes the new role naming.

**Step 2: Implement (GREEN)**

Implementation responsibilities:

- Reuse `isOatManagedCodexRoleFile`.
- Detect managed roles by header, not by the old four-effort naming pattern.
- Keep remediation messages specific: run `oat sync` or
  `oat providers codex materialize ...`.

**Step 3: Refactor**

Centralize Codex managed-role classification if more than one command needs it.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/doctor/index.test.ts src/commands/shared/codex-strays.test.ts src/commands/init/index.test.ts
```

Expected: Doctor, stray, and init tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/doctor packages/cli/src/commands/shared packages/cli/src/commands/init/index.test.ts
git commit -m "fix(p02-t04): recognize materialized codex roles"
```

---

### Task p02-t05: Rewrite Bundled Codex Dispatch Contracts

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/agents/oat-reviewer.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write test (RED)**

Test that shipped workflow contracts:

- No longer require `agent_type` values such as
  `oat-phase-implementer-low`, `oat-phase-implementer-high`,
  `oat-reviewer-low`, or `oat-reviewer-xhigh`.
- Instruct implementers to use the resolver-returned materialized role name for
  Codex dispatch when `dispatchArgs.variant` or equivalent role identity is
  present.
- Keep base/unpinned Codex fallback wording only for explicit inherit/default
  and unresolved cases.
- Require model axis and effort axis reporting from resolver output rather than
  inferring from old role names.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/init/tools/shared/review-skill-contracts.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/validation/skills.test.ts
```

Expected: Tests fail because the shipped skill and reviewer agent still name
the old effort-pinned roles.

**Step 2: Implement (GREEN)**

Implementation responsibilities:

- Rewrite Codex dispatch instructions in
  `.agents/skills/oat-project-implement/SKILL.md` to consume resolver-returned
  role names instead of reconstructing `oat-phase-implementer-<effort>`.
- Rewrite `.agents/agents/oat-reviewer.md` Dispatch Control guidance to refer
  to materialized reviewer roles selected by dispatch resolution.
- Bump the changed skill frontmatter `version:` once. If the agent frontmatter
  has a version field, bump it once as well.
- Preserve legacy/base fallback guidance for inherit/default behavior.

**Step 3: Refactor**

Keep the wording provider-neutral where possible: the skill should describe
`dispatchArgs` and resolver output, while Codex-specific text explains why the
role name is materialized.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/init/tools/shared/review-skill-contracts.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/validation/skills.test.ts
```

Expected: Contract tests pass and no bundled dispatch contract hard-requires
old effort-pinned role names.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md .agents/agents/oat-reviewer.md packages/cli/src/commands/init/tools/shared packages/cli/src/validation/skills.test.ts
git commit -m "fix(p02-t05): rewrite codex dispatch contracts"
```

---

## Phase 3: Model Validation and Canonical Prompts

Keep Cursor generic-agent dispatch, but validate against Cursor's subagent
model allow-list. Validate Codex matrix model IDs against the local Codex model
catalog when available. Also remove hand-authored dispatch-policy option lists
from workflow prompts.

**Cursor agent-shape deferral:** This project ships Cursor dispatch through
generic `.cursor/agents` files plus Task-level `model` arguments. Generating
Cursor `model` frontmatter for default/fallback behavior, and deriving
`readonly` or `is_background` from canonical/OAT role metadata, is deferred to a
separate Cursor provider-shape follow-up.

### Task p03-t01: Validate Cursor Subagent-Eligible Models

**Files:**

- Modify: `packages/cli/src/providers/identity/availability.ts`
- Modify: `packages/cli/src/providers/identity/availability.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`

**Step 1: Write test (RED)**

Test that Cursor validation:

- Does not treat `cursor-agent models` alone as proof that a model is usable for
  subagent Task dispatch.
- Can parse an invalid-subagent-model error that includes allowed model slugs.
- Marks `gpt-5.3-codex-low` as unknown when broad catalog includes it but the
  subagent allow-list rejects it.
- Marks `gpt-5.3-codex` as valid when the subagent probe accepts it.
- Uses `CURSOR_API_KEY` and supports `AGENT_CLI_CREDENTIAL_STORE=file` in the
  probe environment.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/providers/identity/availability.test.ts src/commands/config/index.test.ts src/commands/doctor/index.test.ts
```

Expected: Tests fail because validation currently trusts the broad model
catalog first.

**Step 2: Implement (GREEN)**

Implementation responsibilities:

- Add a Cursor subagent validation path that performs or simulates a minimal
  Task/subagent model probe.
- Treat the broad catalog as advisory context, not final validity.
- Surface allowed subagent slugs when Cursor returns them.
- Keep validation fast and mockable for unit tests.

**Step 3: Refactor**

Expose a reusable `validateCursorSubagentModel` helper so config, doctor, and
future preflight code do not duplicate command parsing.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/providers/identity/availability.test.ts src/commands/config/index.test.ts src/commands/doctor/index.test.ts
```

Expected: Cursor matrix validation tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/identity packages/cli/src/commands/config packages/cli/src/commands/doctor
git commit -m "fix(p03-t01): validate cursor subagent models"
```

---

### Task p03-t02: Generate Dispatch Policy Choice Text from Canonical Data

**Files:**

- Create: `packages/cli/src/config/dispatch-policy-options.ts`
- Create: `packages/cli/src/config/dispatch-policy-options.test.ts`
- Modify: `packages/cli/src/config/dispatch-ceiling-preset.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write test (RED)**

Test canonical prompt rendering:

- Includes every value from `VALID_MANAGED_DISPATCH_POLICIES`, including
  `frontier`.
- Includes `inherit host defaults`.
- Includes `leave unresolved` only as a planning/preflight deferral, not as a
  runtime policy.
- Describes `uncapped`, `inherit`, and `leave unresolved` with behavior-level
  wording.
- Fails if the enum gains a policy but the prompt metadata omits it.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/config/dispatch-policy-options.test.ts src/commands/project/dispatch-ceiling/index.test.ts src/commands/config/index.test.ts
```

Expected: Tests fail because prompt text is not generated from canonical data.

**Step 2: Implement (GREEN)**

Canonical descriptions:

- `uncapped`: OAT still manages dispatch selection, but stores no maximum cap.
  The implementer can choose the preferred model/effort for the task. This is
  not host default behavior.
- `inherit`: OAT does not choose model or effort. Subagents use the current
  host/provider default behavior, such as parent session model, base Codex role
  defaults, or provider config.
- `leave unresolved`: Planning records no policy. Implementation preflight must
  block until a policy is configured or explicitly selected.

Add a CLI-accessible rendering path, such as:

```text
oat project dispatch-ceiling choices --json
oat project dispatch-ceiling choices --format markdown
```

**Step 3: Refactor**

Have config describe/help and workflow-facing command output share the same
option metadata instead of copying policy names.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/config/dispatch-policy-options.test.ts src/commands/project/dispatch-ceiling/index.test.ts src/commands/config/index.test.ts
```

Expected: Prompt option tests pass and include `frontier`.

**Step 5: Commit**

```bash
git add packages/cli/src/config packages/cli/src/commands/project/dispatch-ceiling packages/cli/src/commands/config
git commit -m "feat(p03-t02): generate dispatch policy option text"
```

---

### Task p03-t03: Harden Workflow Skills Against Hand-Typed Option Lists

**Files:**

- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
- Modify: `packages/cli/scripts/bundle-assets.sh`

**Step 1: Write test (RED)**

Test that shipped workflow skills:

- Reference the canonical dispatch-policy choices command/helper.
- Do not contain stale hand-authored dispatch policy menus that omit
  `frontier`.
- Preserve the explicit behavior descriptions for `uncapped`, `inherit`, and
  `leave unresolved`.
- Assert that final-phase HiLL auto-review uses `code final` scope, not a
  duplicate final phase-only review, because Tier 1 already runs the standard
  per-phase reviewer.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/init/tools/shared/review-skill-contracts.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts
```

Expected: Tests fail until skill guidance and bundle checks are updated.

**Step 2: Implement (GREEN)**

Implementation responsibilities:

- Update skill instructions to require generated/canonical dispatch option
  text.
- Keep `oat-project-implement` guidance explicit that when a HiLL checkpoint is
  the final implementation phase, auto-review scope is `final`.
- Bump each changed skill frontmatter `version:` once.
- Keep prompt wording concise but behaviorally explicit.
- Update bundle asset lists only if needed.

**Step 3: Refactor**

Avoid duplicating the full policy table in multiple skills. Prefer references
to the canonical command plus one short fallback rule.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/commands/init/tools/shared/review-skill-contracts.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts
```

Expected: Skill contract and bundle tests pass.

**Step 5: Commit**

```bash
git add .agents/skills packages/cli/src/commands/init/tools/shared packages/cli/scripts/bundle-assets.sh
git commit -m "docs(p03-t03): harden dispatch policy prompt guidance"
```

---

### Task p03-t04: Validate Codex Matrix Model Availability

**Files:**

- Modify: `packages/cli/src/providers/identity/availability.ts`
- Modify: `packages/cli/src/providers/identity/availability.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`

**Step 1: Write test (RED)**

Test Codex matrix model availability:

- A Codex target with `model: gpt-5.6-sol` and `effort: xhigh` reports
  `unknown-value` when `codex debug models` returns only `gpt-5.5`.
- A Codex target with `model: gpt-5.5` and supported effort reports `valid`
  when the model catalog includes `gpt-5.5`.
- If `codex debug models` is unavailable or unparsable, validation reports
  `unvalidated` and doctor emits a clear warning rather than claiming the
  materialized role is proven runnable.
- Effort validation remains separate from model validation.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/providers/identity/availability.test.ts src/commands/config/index.test.ts src/commands/doctor/index.test.ts
```

Expected: Tests fail because Codex validation currently checks only effort
variant files.

**Step 2: Implement (GREEN)**

Implementation responsibilities:

- Add a mockable Codex model-catalog probe using `codex debug models`.
- Validate route-target `model` and `effort` independently.
- Keep materialization writes permissive enough for preview IDs, but make
  config/doctor/preflight warning states explicit.
- Do not treat unavailable GPT-5.6 preview IDs as host defaults.

**Step 3: Refactor**

Share provider availability result shapes between Cursor and Codex so matrix
validation reports consistent `valid`, `unknown-value`, and `unvalidated`
states.

**Step 4: Verify**

Run:

```bash
pnpm --filter @open-agent-toolkit/cli test -- src/providers/identity/availability.test.ts src/commands/config/index.test.ts src/commands/doctor/index.test.ts
```

Expected: Codex and Cursor availability tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/identity packages/cli/src/commands/config packages/cli/src/commands/doctor
git commit -m "fix(p03-t04): validate codex matrix models"
```

---

## Phase 4: Documentation, Versions, and Release Validation

Document the new Codex materialization workflow, update public package versions
for shipped CLI/asset changes, and run the release validation surface.

### Task p04-t01: Document Materialized Codex and Cursor Dispatch Behavior

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/cli-utilities/config-and-local-state.md`
- Modify: `apps/oat-docs/docs/provider-sync/config.md`
- Modify: `apps/oat-docs/docs/provider-sync/providers.md`
- Modify: `apps/oat-docs/docs/provider-sync/manifest-and-drift.md`
- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Modify: `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md`
- Modify: `apps/oat-docs/docs/reference/oat-directory-structure.md`
- Modify: `apps/oat-docs/index.md` if regenerated by docs tooling

**Step 1: Write test (RED)**

Add or update docs assertions if an existing docs-link/index test covers these
files. Otherwise use the docs build as verification.

Required docs content:

- Codex role materialization command and expected inputs.
- OAT-managed Codex roles are generated from explicit model+effort targets, not
  the old hard-coded effort-only pins.
- Cursor uses generic `.cursor/agents` plus Task-level `model` selection for
  OAT-controlled dispatch.
- Cursor model validation checks subagent eligibility, not only the broad model
  catalog.
- Dispatch policy descriptions clearly distinguish capped managed, managed
  uncapped, inherit host defaults, and unresolved deferral.
- Grep all docs for old effort-pinned role references and update or explicitly
  justify every remaining hit.

Run:

```bash
pnpm build:docs
```

Expected: Build or docs checks fail until docs are updated.

**Step 2: Implement (GREEN)**

Update docs using the same terminology as canonical dispatch-policy option
metadata.

**Step 3: Refactor**

Regenerate docs index only through the docs tooling if the navigation contract
requires it. Do not hand-edit generated index sections.

**Step 4: Verify**

Run:

```bash
grep -rnE "oat-phase-implementer-(low|medium|high|xhigh)|oat-reviewer-(low|medium|high|xhigh)" apps/oat-docs/docs
pnpm build:docs
```

Expected: Grep has no stale docs references, or every remaining reference is
explicitly labeled legacy/migration-only; docs build passes.

**Step 5: Commit**

```bash
git add apps/oat-docs/docs apps/oat-docs/index.md
git commit -m "docs(p04-t01): document codex materialized dispatch"
```

---

### Task p04-t02: Update Public Package Versions and Validate Release

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json` if generated
- Modify: `pnpm-lock.yaml`

**Step 1: Write test (RED)**

Run release validation before the version bump to confirm the guardrail catches
the lockstep requirement when applicable.

Run:

```bash
pnpm release:validate
```

Expected: If version bumps are required and not yet applied, validation reports
the package/version issue.

**Step 2: Implement (GREEN)**

Use the repo's existing version bump tooling if available. Bump the lockstep
public package set together because this project changes shipped CLI behavior,
bundled workflow skills, and docs.

**Step 3: Refactor**

Run formatting after generated asset changes settle. Do not run asset bundling
concurrently with tests that depend on `packages/cli/assets`.

**Step 4: Verify**

Run:

```bash
pnpm format
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm build:docs
pnpm release:validate
```

Expected: All checks pass.

**Step 5: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json pnpm-lock.yaml
git commit -m "chore(p04-t02): validate codex family subagents release"
```

---

## Reviews

| Scope     | Type     | Status      | Date       | Artifact                                                                                  |
| --------- | -------- | ----------- | ---------- | ----------------------------------------------------------------------------------------- |
| p01       | code     | passed      | 2026-07-08 | `reviews/p01-review-2026-07-08T224422Z.md`                                                |
| p02       | code     | fixes_added | 2026-07-09 | `reviews/p02-review-2026-07-09T013018Z.md` (blocked after explicit narrow retry override) |
| p03       | code     | pending     | -          | -                                                                                         |
| p04       | code     | pending     | -          | -                                                                                         |
| final     | code     | pending     | -          | -                                                                                         |
| discovery | artifact | passed      | 2026-07-08 | `discovery.md`                                                                            |
| spec      | artifact | passed      | 2026-07-08 | N/A quick mode                                                                            |
| design    | artifact | passed      | 2026-07-08 | N/A quick mode                                                                            |
| plan      | artifact | passed      | 2026-07-08 | `reviews/archived/artifact-plan-review-2026-07-08T215336Z.md`                             |

**Status values:** `pending` -> `received` -> `fixes_added` ->
`fixes_completed` -> `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - generic Codex materialization codec and CLI command.
- Phase 2: 5 tasks - replace hard-coded effort pins with matrix-driven
  materialized Codex roles.
- Phase 3: 4 tasks - Cursor/Codex model validation and canonical dispatch-policy
  prompt rendering.
- Phase 4: 2 tasks - docs, package versions, and release validation.

**Total: 14 tasks**

Ready for `oat-project-implement`.

---

## References

- Discovery: `discovery.md`
- Implementation tracker: `implementation.md`
- Follow-up backlog item:
  `.oat/repo/pjm/backlog/items/BL-260708-verify-cursor-gpt-5-6-subagent.md`
- Prior project: `.oat/projects/archived/dispatch-ceiling`
- Prior project: `.oat/projects/archived/model-dispatch-improvements`
- Prior project: `.oat/projects/archived/multi-family-dispatch`
