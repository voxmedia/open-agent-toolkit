---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-09-20
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_hill_phases: ['p05']
oat_auto_review_at_hill_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: claude-effort-levels

**Goal:** Let OAT select and apply Claude model-plus-effort targets for reviewers and phase implementers, teach Claude orchestrators to use them, ship consistent bundled recommendations, and avoid unrelated workflow-gate questions during planning.

**Architecture:** Extend the shared dispatch target/resolver and materialization extension patterns. Claude effort is definition-bound: generate named Markdown roles with `model` and `effort`, resolve an exact native variant, and launch that variant. Keep the canonical role prompt separate from provider projections and retain the model-only compatibility path.

**Tech stack:** TypeScript ESM, Vitest, Node test runner, YAML/Markdown agent definitions, OAT skills and config bundle.

**Scope authority:** This artifact plans implementation; no implementation has started. The user confirmed the requirements and requested straight-to-plan quick mode. Project setup and plan reviews do not authorize publishing or changing personal ladders.

## Planning Checklist

- [x] Discovery synthesized from the conversation and validated by `oat project complete-discovery`.
- [x] Adjacent phases evaluated for dependencies and overlapping files.
- [x] `oat_plan_parallel_groups` explicitly sequential.
- [x] Project ceiling: High (managed). Additional phase gate review: disabled by user; configured lifecycle gates retained.
- [x] Complete artifact review and configured quick-start exit gate.
- HiLL implementation checkpoints are deferred to implementation entry; no planning-time value is asserted.

## Parallelism

The phases remain sequential. Phase 1 owns target identity, variant generation, and resolver outputs. Phase 2's launch instructions and recommendation adoption depend on those outputs and share resolver/config contract tests. Phase 3 exercises their composed behavior and release bundle. Independent reconnaissance or bounded test execution may run concurrently inside a phase, but there is no file-disjoint phase group with independent verification.

## Compatibility and Selection Contract

- Explicit Claude targets use the existing `{harness: claude, model, effort}` route shape. Do not introduce a second config schema or infer effort by parsing a model name.
- Support the documented effort labels on models that support them. Keep validation provider-specific; do not reuse Codex eligibility solely because label spellings match. Model aliases can change their resolved version, so record capability/version evidence and fail clearly when exact support cannot be established.
- Keep legacy model-only targets as model-only launches. Do not silently add an effort default or rewrite stored cells. Explicit inherit mode leaves both axes to the host.
- Same-model/different-effort candidates are distinct; exact candidate selection compares both fields. Validate nondecreasing effort within a model and existing model-tier ordering, without claiming an economic total order across models.
- Capped implementer/fix selection admits configured candidates from all tiers at or below the maximum. Capped review targets the terminal candidate of the ceiling tier. Managed uncapped implementer selection may select an explicit model/effort; managed uncapped reviewer and inherit/default behavior retain the existing no-review-target fallback.
- Effort-pinned dispatch returns the native variant selector plus model/effort context. Native launch uses the variant, never an invented Agent effort argument. Any per-call model must match the variant's definition. Model-only dispatch retains its existing `dispatchArgs.model` behavior.
- Missing/mismatched managed variants cannot become silent base-role fallback. Preserve the existing proof-of-pre-start-rejection rule, exact-target fallback, and accepted-handle continuation rules.
- The resolver remains the dispatch-stamp producer. Requested controls, applied definition, and observed child metadata are separate evidence. Environment overrides or provider caps must not be mislabeled as verified selected effort; absence of telemetry remains unknown.

## Bundled Recommendation Change

The source is `packages/cli/config/dispatch-matrix-recommendation.json`; this project advances it to version `2026-09-21.1`. The adoption contract preserves explicit cells, so a new recommendation changes fresh adoption and missing cells; it does not upgrade an explicitly configured old Claude cell automatically.

Proposed Claude-only recommendation for this feature, subject to supported-pair verification during p02-t02:

| Tier     | Ordered candidates                                                  | Rationale                                                                                                                         |
| -------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Economy  | `haiku`, `claude-sonnet-5/medium`                                   | Preserve Haiku's effortless route and offer a bounded Sonnet route that meets current guidance.                                   |
| Balanced | `claude-sonnet-5/high`                                              | Preserve Sonnet as the tier's terminal reviewer with a substantive explicit effort.                                               |
| High     | `claude-opus-5/medium`, `claude-opus-5/high`                        | Express normal versus deeper reasoning inside the existing Opus tier.                                                             |
| Frontier | `claude-opus-5/xhigh`, `claude-opus-5/max`, `claude-fable-5-1/high` | Expose exceptional Opus depth while preserving the current Fable terminal family without making max the default for every review. |

These are supported choices, not blanket permission to use a below-floor model for a task. Existing task-class guidance controls eligibility; Haiku remains inappropriate for semantic audits. Fable remains a qualified specialist route. Other supported effort pairs, including Fable xhigh/max, may be configured explicitly with a recognized versioned model ID or an authoritative family-pin capability declaration. Effort-pinned bare aliases fail closed because `availableModels` or organization policy can substitute a generation with different capabilities. Model-only aliases retain compatibility.

Synchronize the displayed recommendation with the authoritative JSON, including an already stale Cursor row in the plan-writing display; preserve the actual Codex/Cursor JSON values. Do not adopt the new bundle into this user's live configuration as an implementation side effect.

## Phase 1: Resolve and Materialize Claude Effort Targets

### Task p01-t01: Make Claude selection effort-aware while preserving legacy behavior

**Files:** `packages/cli/src/config/dispatch-matrix.ts`, `packages/cli/src/providers/ceiling/registry.ts`, `packages/cli/src/commands/project/dispatch-ceiling/index.ts`, their colocated tests; a small Claude target/effort helper under `packages/cli/src/providers/claude/` if needed.

**Work:** First reproduce current effort-insensitive matching with two candidates sharing a Claude model but differing in effort. Add provider-native pair validation, exact matching, ordering and ceiling handling, uncapped preferred-effort support, and selected effort axes. Extend adapter output for effort-pinned variants while retaining model-only argument output. Use one shared naming/target contract consumed by p01-t02. Expose task-effort classification inputs for Claude without changing Codex semantics. Ensure evidence and actual launch selectors cannot disagree.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/dispatch-matrix.test.ts src/providers/ceiling/registry.test.ts src/commands/project/dispatch-ceiling/index.test.ts`. Cases: same model/different effort, invalid and unsupported values, duplicate/reversed candidates, cross-tier eligible choice, deterministic reviewer terminal choice, explicit model-only, inherited and uncapped branches, and unchanged Codex/Cursor outputs. Preserve the pre-fix reproduction and the post-fix rejection/valid-control outcomes in implementation notes. At implementation entry, build the local CLI dependencies before source-CLI tests: the planning checkout's commit hook exposed a stale control-plane build missing the WORKFLOW_MODES export; installed oat commands worked.

**Format:** `pnpm exec oxfmt --write packages/cli/src/config/dispatch-matrix.ts packages/cli/src/config/dispatch-matrix.test.ts packages/cli/src/providers/ceiling/registry.ts packages/cli/src/providers/ceiling/registry.test.ts packages/cli/src/commands/project/dispatch-ceiling/index.ts packages/cli/src/commands/project/dispatch-ceiling/index.test.ts packages/cli/src/providers/claude/`.

**Commit:** `feat(p01-t01): resolve Claude model and effort targets`.

### Task p01-t02: Generate both Claude role variants and wire their managed lifecycle

**Files:** new `packages/cli/src/providers/claude/codec/` materialization and sync-extension modules/tests; `packages/cli/src/providers/shared/registry.ts` and sync integration; `packages/cli/src/commands/sync/`; applicable `packages/cli/src/commands/tools/{install,update,remove,shared}/` integration tests. Use Codex/Cursor codec implementations and `providers/shared/materialization-extension.ts` as patterns.

**Work:** Materialize only required configured Claude targets for `oat-reviewer` and `oat-phase-implementer`, with unique deterministic names, explicit model/effort frontmatter, canonical body and supported role metadata. Write project variants to `<project-root>/.claude/agents/<variant>.md` and user variants to `<injected-home>/.claude/agents/<variant>.md`, following the existing Claude mappings. Use the shared deterministic name pattern `<canonical-role>-claude-<model-slug>-<effort>` (for example `oat-reviewer-claude-opus-high` and `oat-phase-implementer-claude-opus-high`); one builder serves resolution and generation, with validation/collision refusal for normalized names. Preserve base roles. Register the extension in the existing common extension flow. Cover project and user scopes, pack-scoped install/update, dry-run, idempotent regeneration, collision/ownership rules, and removal of stale managed variants. Claude discovers Markdown definitions directly; do not invent Codex-style config registration. Never hand-edit generated files or overwrite unmanaged agents. Other hosts, including Cursor, may discover `.claude/agents/`; do not claim the directory is physically Claude-only. Mark the generated description as a Claude-native effort variant and keep OAT's provider target eligibility separate: Cursor's managed resolver must select only Cursor-approved mappings/variants, never a Claude-native variant merely because it is visible. Cursor's existing compatibility read of canonical base-role instructions remains valid and cannot serve as proof that a Claude effort pin is supported. Preserve cross-directory collision checks and fail if an unrelated host-owned name would be overwritten.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/claude/codec/materialize.test.ts src/providers/claude/codec/sync-extension.test.ts src/commands/sync/index.test.ts src/commands/tools/install/index.test.ts src/commands/tools/update/update-tools.test.ts src/commands/tools/remove/remove-tools.test.ts src/commands/tools/shared/in-process-sync.test.ts`. Use temporary scope roots and injected home directories. Assert both roles, exact names/fields, zero operations on a second sync, scoped removal, preserved unmanaged collisions, and rollback/failure reporting through the existing extension behavior. Include a mixed-host fixture with Claude variants present: Cursor resolution remains on its own approved variants, base-role compatibility still works, and cross-host name collisions are refused without overwrites. Materialize a Cursor variant from a real `claude-*` catalog ID alongside a Claude effort variant for the same role; assert distinct-name coexistence and refusal when normalized names coincide.

**Format:** `pnpm exec oxfmt --write packages/cli/src/providers/claude/ packages/cli/src/commands/sync/ packages/cli/src/commands/tools/` scoped further to the changed files before execution; include any changed shared extension registration file explicitly.

**Commit:** `feat(p01-t02): materialize managed Claude effort variants`.

## Phase 2: Teach Selection and Ship Consistent Recommendations

### Task p02-t01: Update the full selection-to-launch instruction path

**Files:** `.agents/skills/oat-dispatch-subagents/references/provider-claude.md`; `.agents/skills/subagent-orchestration/references/provider-claude.md`; `.agents/skills/oat-project-implement/references/{dispatch-and-dry-run,phase-execution,completion-and-closeout}.md`; relevant `.agents/skills/oat-project-{plan-writing,quick-start,lite,import-plan,plan,review-provide,review-receive,dispatch-subagents}/` and generic review consumers; `.agents/agents/oat-reviewer.md` and `.agents/agents/oat-phase-implementer.md` when their contracts change; `.oat/templates/{plan,state}.md` when existing Claude/model-axis guidance is present; contract tests in `packages/cli/src/validation/skills.test.ts` and `packages/cli/src/__tests__/skills/`.

**Work:** Inventory all Claude model-only/no-effort assertions and launcher call sites before editing. Update only applicable assertions; historical decision text and true model-only compatibility descriptions are not stale guidance. Teach the orchestrator to classify task depth, consult provider guidance, choose an eligible model/effort, resolve it, launch the exact generated variant, and retain it through fixes/continuations. Make clear that effort lives in frontmatter and there is no per-call Agent effort field. Review uses the configured terminal candidate rather than an independent reviewer choice. Update dry-run output, preferred-effort inputs, gates/fallback descriptions, and evidence stamps. Generic dispatch stays independent of project policy. Bump each changed skill's metadata version and each changed canonical role's version once per PR.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts` and `pnpm oat:validate-skills`. Add behavioral contract coverage for role selection with explicit effort, model-only compatibility, selected versus inherited axes, matching model arguments, missing variant refusal, and target-preserving retries. Avoid tests that simply assert an isolated new sentence exists; exercise the consuming dispatch contract where practical. Inventory findings and dispositions belong in implementation notes.

**Format:** `pnpm exec oxfmt --write .agents/skills/oat-dispatch-subagents/ .agents/skills/subagent-orchestration/ .agents/skills/oat-project-implement/` plus the exact additional changed skill/agent/template/test files identified by the inventory; do not format unrelated skills.

**Commit:** `feat(p02-t01): teach Claude workflow effort selection`.

### Task p02-t02: Update the bundled ladder and preserve explicit adoption choices

**Files:** `packages/cli/config/dispatch-matrix-recommendation.json`; `packages/cli/src/commands/config/index.ts` and `index.test.ts`; relevant preset/notices tests; `.agents/skills/oat-project-plan-writing/SKILL.md`; recommendation/config/docs examples discovered by searching the asset name, recommendation version, and displayed Claude ladder.

**Work:** Verify current supported Claude pairs and implement the proposed recommendation above, advancing its recommendation version. Preserve actual Codex and Cursor recommendation cells. Update every current display of the bundled recommendation from the authoritative asset so users are not offered a different matrix. Add a narrow parity test or derive presentation through an existing mechanism; avoid a new templating subsystem. Preserve adoption's missing-cell merge behavior: explicit model-only and model/effort cells survive all three scope choices. Explain that opting into a revised explicit cell requires an intentional config edit; no force-migration or new destructive overwrite command is part of this project.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts src/config/dispatch-matrix.test.ts src/config/dispatch-ceiling-preset.test.ts src/config/dispatch-notices.test.ts src/validation/skills.test.ts`. Add temporary-config scenarios for fresh adoption, partial adoption, explicit legacy and new cells, repeated adoption, unchanged provider cells, and recommendation/table parity. Assert the selected terminal reviewer pair for each Claude tier through the real resolver, not a fixture-only rank model.

**Format:** `pnpm exec oxfmt --write packages/cli/config/dispatch-matrix-recommendation.json packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts .agents/skills/oat-project-plan-writing/SKILL.md` plus exact changed config tests/docs.

**Commit:** `feat(p02-t02): recommend Claude effort dispatch ladders`.

### Task p02-t03: Document the feature and reconcile the model-only decision

**Files:** `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md`, `apps/oat-docs/docs/workflows/projects/programmatic-execution.md`, `apps/oat-docs/docs/provider-sync/providers.md`, `apps/oat-docs/docs/cli-utilities/configuration.md`, `apps/oat-docs/docs/reference/oat-directory-structure.md`, relevant lifecycle/evidence docs; `.oat/repo/reference/decisions/`; release package manifests/lockfile as required.

**Work:** Read docs-app and decision-surface instructions. Document configuration examples, native variant selection, model-only compatibility, known version/override limitations, adoption semantics, and configured versus observed effort. Use `oat-pjm-decision`/CLI to create a superseding decision for `DR-260706-claude-remains-model-axis-only`, preserve historical context, and regenerate the decision index. Retain the Opus-first decision. Bump all five public packages together to a version strictly above current origin/main; do not guess the implementation-time next version from this plan. Review changed-skill/role bump coverage across the whole PR.

**Verify:** `pnpm --filter oat-docs docs:lint`. Run `pnpm docs:check-links`, `oat pjm doctor --json`, and inspect the generated decision index and feature examples. Full release/version gates run in p03-t03.

**Format:** `pnpm exec oxfmt --write` followed by the exact changed documentation, decision, manifest, and lockfile paths. Do not hand-edit generated docs indexes or provider output.

**Commit:** `docs(p02-t03): document Claude effort dispatch and compatibility`.

### Task p02-t04: Limit lifecycle-gate setup to the active workflow

**Files:** `.agents/skills/oat-project-plan-writing/SKILL.md`; applicable call-site prose in `.agents/skills/oat-project-{quick-start,lite,import-plan,plan}/SKILL.md`; focused contracts in `packages/cli/src/validation/skills.test.ts` and existing skill tests where relevant.

**Work:** Replace the shared contract's instruction to probe every gate-aware skill with an explicit caller-scoped set. The planning entry point supplies its own skill name plus `oat-project-implement` as the downstream implementation gate: quick-start → quick-start + implement; lite → lite + implement; import-plan → import-plan + implement; spec-driven plan → plan + implement. A new workflow transition evaluates its newly relevant gates when actually entered, not speculatively during the current plan. Probe and offer Keep/Disable only for configured gates in that relevant set. Do not disable or alter other modes' gates, expand the config schema, write an enabled override, or touch user/shared config. Preserve explicit existing project override maps without re-prompting, keep only disabled choices in project state, and keep phase-gate review independent. Document the active-workflow relevance rule in the shared contract and make callers pass it consistently; do not duplicate a second gate-selection system in every caller. Preserve a single PR-scoped metadata bump for each changed skill.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts` and `pnpm oat:validate-skills`. Add a regression contract representing a quick project with all five lifecycle gates configured: expected offered set is exactly quick-start and implement, while lite/import-plan/plan are excluded. Check the corresponding relevant pairs for other planning entry points, explicit override preservation, and phase-gate independence. Assert these concrete prose invariants across the shared section and all four caller skills: (1) the shared setup takes a caller-supplied relevant set and probes only that set; (2) each caller supplies exactly its own planning entry point plus `oat-project-implement`; (3) no caller or shared setup retains the unconditional instruction to probe every gate-aware skill. The explicit-map preservation branch must still precede probing. Since the consumer is an agent reading prose, verify complete instruction/caller consistency rather than adding runtime machinery solely to test the prose. Neutralize the relevance clause and demonstrate that its regression test fails, then restore it. Review the actual resulting prompt flow for quick-start to ensure the repeated irrelevant-mode question is removed.

**Format:** `pnpm exec oxfmt --write .agents/skills/oat-project-plan-writing/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-lite/SKILL.md .agents/skills/oat-project-import-plan/SKILL.md .agents/skills/oat-project-plan/SKILL.md packages/cli/src/validation/skills.test.ts`, narrowed to files actually changed.

**Commit:** `fix(p02-t04): scope lifecycle gate prompts to active workflow`.

## Phase 3: Verify Real Dispatch and Release Readiness

### Task p03-t01: Add reproducible selection and launch negative controls

**Files:** new `tools/smoke/verification/claude-effort-dispatch.test.mjs` following existing smoke conventions; relevant `packages/cli/src/providers/identity/` tests and real-output fixture only where needed; project `implementation.md` evidence.

**Work:** Exercise config → resolver → generated definition → launch payload → dispatch record as one chain for both roles. Freeze an effort-mismatch reproduction showing the old behavior incorrectly treats different efforts as the same target, then demonstrate rejection/precise selection after the fix and a valid accepted control. Test an absent variant, conflicting model argument, unknown/unsupported effort, and model-only inheritance. Neutralize each new assurance-bearing guard temporarily and prove its test fails, then restore it. Reuse current transcript observation; do not invent external fields. Use only existing provenance-backed identity fixtures in p03-t01. Any new parser fixture must be derived from the live probe's captured output with provenance and redaction; create it and run its dependent observation assertions in p03-t02 after capture.

**Verify:** `pnpm build` followed by `node --test tools/smoke/verification/claude-effort-dispatch.test.mjs`, and `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/claude-runtime-observation.test.ts src/providers/identity/dispatch-validation.test.ts src/providers/identity/oat-dispatch-record.test.ts`. Record commands, categorical outcomes, and guard-neutralization evidence. Keep live API use out of ordinary CI.

**Format:** `pnpm exec oxfmt --write` with the exact new smoke files, changed identity tests/fixtures, and project evidence paths.

**Commit:** `test(p03-t01): verify Claude effort dispatch invariants`.

### Task p03-t02: Verify Claude orchestrator awareness and actual child effort

**Files:** `tools/smoke/verification/claude-effort-live.md` as the bounded manual probe recipe; sanitized captured fixture/evidence and `implementation.md`.

**Work:** Verify current `claude --help`, version, supported effort pairs, environment/cap precedence, and the official changelog. Use temporary project/config roots and generated definitions; do not install into real user scope. Before live execution, confirm the implementation session's route/spend authority; ambient CLI availability alone is not authority. If not already authorized, prepare the exact bounded prompts and commands for approval. This planning session does not launch probes.

Run two distinct controls. First, a deterministic wiring probe dispatches both reviewer and implementer roles with two explicit efforts on one supported model, verifying requested definitions and real child metadata. Second, an awareness probe gives the updated OAT guidance, an eligible fixture ladder with different efforts, and two tasks (a mechanical bounded edit and an ambiguous state-machine diagnosis) without telling the orchestrator which effort to select. The mechanical task operates only on a disposable fixture. Capture the orchestrator's selection/rationale, resolver result, actual Agent variant, child outcome, and observed effort. If choices do not distinguish task depth, record failure and investigate guidance instead of changing the expected result after the fact. Exercise a capped reviewer separately to confirm deterministic policy selection remains intact.

Also capture a default/inherit case and an override/cap case. An override must be reported as divergence or limitation, never claimed as exact effort enforcement. Do not mutate the user's global environment or settings. Keep each accepted run's handle; no automatic replacement after acceptance. Record provider-reported effort, not agent self-identification. If the runtime cannot expose reliable evidence, leave live acceptance unverified and stop short of claiming SC5/SC7 achieved.

**Verify:** Execute the finalized recipe on the installed runtime with explicit exit-code capture and transcript provenance. The required outcome is two distinct task-appropriate chosen efforts, correct variant launches, corroborated child effort, deterministic capped review, and honest override/inherit observations. Preserve sanitized fixtures and exact repeatable prompts/commands.

**Format:** `pnpm exec oxfmt --write` with the exact recipe, sanitized fixture, and project artifact paths.

**Commit:** `test(p03-t02): capture live Claude effort selection evidence`.

### Task p03-t03: Run release gates and close the implementation evidence

**Files:** project `implementation.md`, plan review rows, state, and only fixes justified by failed gates.

**Work:** Run the repository definition-of-done gates in order, capturing each exit code directly in its own log. Fetch origin/main before the version gate; review integration drift and adjust lockstep versions if needed. Run `pnpm lint` and `pnpm format` because skills/smoke surfaces changed. Distinguish cached output from execution. For fresh evidence, build first and run the isolated child-process recipe below. It creates a temporary test home for the test process without assigning or repurposing the shell HOME variable. Run the separate smoke, skill, script, and skill-validation suites after the forced Turbo suite. Preserve failures and test output before the temporary directory is removed. Resolve failures without widening scope, update evidence, and run the workflow's phase/final reviews and configured gates. Do not merge, publish, or globally install as part of this task.

**Verify, in CI order:** `pnpm check`; `pnpm type-check`; `pnpm test`; `pnpm build`; `pnpm run check:skill-bumps`; `git fetch origin main` then `pnpm release:check-versions`; `pnpm release:validate`; `pnpm build:docs`. Additionally `pnpm lint` and `pnpm format`. Each command must succeed on its own exit status. Live acceptance and negative-control evidence must also be present; green unit tests cannot replace them.

**Fresh execution recipe:** Run after `pnpm build`, capture its exit status directly, and record that Turbo reports actual execution rather than replayed cached logs. The temporary HOME belongs only to the child test environment; the invoking shell and real user configuration are unchanged.

```sh
node --input-type=module <<'JS'
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const testHome = mkdtempSync(join(tmpdir(), 'oat-claude-effort-test-'));
try {
  const result = spawnSync('pnpm', ['exec', 'turbo', 'run', 'test', '--force'], {
    stdio: 'inherit',
    env: { ...process.env, HOME: testHome },
  });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(testHome, { recursive: true, force: true });
}
JS
```

Then run each separately with its own captured exit code: `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:scripts`, and `pnpm oat:validate-skills`. These commands supplement the CI-order gates above; they are not inferred from a passing Turbo command.

**Format:** `pnpm exec oxfmt --write .oat/projects/shared/claude-effort-levels/discovery.md .oat/projects/shared/claude-effort-levels/plan.md .oat/projects/shared/claude-effort-levels/implementation.md .oat/projects/shared/claude-effort-levels/state.md` and exact files changed by gate fixes.

**Commit:** `chore(p03-t03): record Claude effort verification`.

## Phase 4: Resolve Final Review Findings

### Task p04-t01: Validate Claude effort against the resolved model capability

**Files:** `packages/cli/src/providers/claude/targets.ts`; resolver and materializer callers under `packages/cli/src/{config,commands/project/dispatch-ceiling,providers/claude,providers/ceiling}/`; their colocated tests; provider guidance or documentation only where the resolved-version contract must be exposed.

**Work:** Replace the alias-only effort allowlist with a version-aware Claude capability contract. Keep provider capability separate from task-routing eligibility. Accept each documented model/version effort pair that OAT can establish, including low effort for supported Opus/Fable generations and xhigh/max for Sonnet 5. Use recognized versioned IDs or authoritative family-pin declarations as capability evidence; fail effort-pinned bare aliases closed because runtime restrictions can substitute another generation. Preserve legacy model-only routes. Migrate bundled effort-pinned recommendations to explicit current Claude model IDs while retaining model-only Haiku and all existing Codex/Cursor cells.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/dispatch-matrix.test.ts src/providers/ceiling/registry.test.ts src/commands/project/dispatch-ceiling/index.test.ts src/providers/claude/codec/materialize.test.ts src/providers/claude/codec/sync-extension.test.ts`; `node --test tools/smoke/verification/claude-effort-dispatch.test.mjs`; `pnpm run cli -- sync --scope project --dry-run --json`. Include controls that accept Sonnet 5 `xhigh`, reject Sonnet 4.6 `xhigh`, accept the missing documented low/medium pairs, and reject an unresolved version-dependent capability without changing recommendation eligibility.

**Format:** `pnpm exec oxfmt --write` with the exact changed TypeScript, test, guidance, documentation, and project artifact paths.

**Commit:** `fix(p04-t01): validate Claude effort by resolved model version`.

### Task p04-t02: Correct the Claude ceiling mechanism description

**Files:** `packages/cli/src/providers/ceiling/registry.ts`.

**Work:** Update the provider-registry overview to describe effort-pinned Claude routes as materialized model-and-effort variants and legacy model-only routes as per-call model arguments. Keep executable behavior unchanged.

**Verify:** Run the focused provider registry test in p04-t01 and `git diff --check`.

**Format:** `pnpm exec oxfmt --write packages/cli/src/providers/ceiling/registry.ts`.

**Commit:** `docs(p04-t02): correct Claude variant registry guidance`.

## Phase 5: Align Claude Capability Documentation

### Task p05-t01: Document the fail-closed effort capability contract

**Files:** `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md`, `apps/oat-docs/docs/cli-utilities/configuration.md`, `apps/oat-docs/docs/provider-sync/providers.md`, `.agents/skills/oat-dispatch-subagents/references/provider-claude.md`, and focused documentation/skill validation tests when required.

**Work:** Replace the stale alias-plus-effort CLI example with a recognized versioned model ID. Explain recognized versioned IDs, `ANTHROPIC_DEFAULT_<FAMILY>_MODEL` pins, matching `_SUPPORTED_CAPABILITIES`, host-managed precedence, bare-alias refusal, and model-only compatibility in the user-facing dispatch and configuration docs plus the Claude provider reference. Clarify that legacy model-only routes report a non-applicable per-call effort axis because the Agent API carries no effort argument. Attribute the inherited Cursor recommendation behavior to its earlier recommendation version, and document the deterministic doubled `claude-` slug used when a versioned ID is embedded in a generated variant name rather than renaming existing managed roles.

**Verify:** Reproduce refusal of `opus/medium` and successful resolution of `claude-opus-5/medium`; run docs lint/build, skill validation, skill-bump validation, `git diff --check`, and relevant guidance tests.

**Disposition:** Fix the gate review's Medium and wording-oriented Lows L1-L3 now. Defer L4's key-order-sensitive structural comparison cleanup because all current producers and schema parsing canonicalize field order, the launch path fails closed, and changing comparison machinery after a passing implementation review would add code churn without a demonstrated failure.

**Format:** `pnpm exec oxfmt --write` with the exact changed Markdown and test paths.

**Commit:** `docs(p05-t01): align Claude capability guidance`.

## Validation Coverage

| Success criterion                              | Owning tasks              |
| ---------------------------------------------- | ------------------------- |
| SC1 distinct selection and policy semantics    | p01-t01, p03-t01, p04-t01 |
| SC2 generated roles and managed lifecycle      | p01-t02, p04-t01          |
| SC3 exact native launch and refusal boundaries | p02-t01, p03-t01, p03-t02 |
| SC4 compatibility and other providers          | p01-t01, p01-t02, p02-t02 |
| SC5 awareness and actual task-based choice     | p02-t01, p03-t02          |
| SC6 recommendation and adoption                | p02-t02, p04-t01          |
| SC7 positive/negative/live evidence            | p03-t01, p03-t02          |
| SC8 decisions, docs, bumps, gates              | p02-t03, p03-t03, p05-t01 |
| SC9 relevant workflow-gate prompts             | p02-t04                   |

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target           |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | --------------------- |
| p01    | code     | fixes_completed | 2026-09-21 | reviews/p01-review-2026-09-21T005952Z.md                    | 10474030164d29fa52db1e367c9145c13a87ebb8 | phase      | -                     |
| p01    | code     | passed          | 2026-09-21 | reviews/p01-review-2026-09-21T012030Z.md                    | ad56e6c56c40f547c9ebf8519a4609d6ed787720 | phase      | -                     |
| p02    | code     | fixes_completed | 2026-09-21 | reviews/p02-review-2026-09-21T020650Z.md                    | fc986addb653930df9bae103750c01e07a6c1824 | phase      | -                     |
| p02    | code     | passed          | 2026-09-21 | reviews/p02-review-2026-09-21T022325Z.md                    | a7636eee4d53b0996b6813ea364dcb192706ff53 | phase      | -                     |
| final  | code     | fixes_added     | 2026-09-21 | reviews/final-review-2026-09-21T041719Z.md                  | 4710fa145506e0cbb474b97fd9e46d0ff45d11a5 | auto       | -                     |
| final  | code     | passed          | 2026-09-21 | reviews/final-review-2026-09-21T144805Z.md                  | 590a08ce2d0b4c7637a75dcaf36fb40b55ed1da1 | auto       | -                     |
| final  | code     | received        | 2026-09-21 | reviews/final-review-2026-09-21T153433Z.md                  | 1eb5bf6471288763cdbd9d4413af17794a9e5ef0 | auto       | -                     |
| spec   | artifact | pending         | -          | -                                                           | -                                        | -          | -                     |
| design | artifact | pending         | -          | -                                                           | -                                        | -          | -                     |
| p03    | code     | fixes_completed | 2026-09-21 | reviews/p03-review-2026-09-21T031442Z.md                    | f278335a77de048a616c3b77536fe21fcb41867b | phase      | -                     |
| p03    | code     | fixes_completed | 2026-09-21 | reviews/p03-review-2026-09-21T035607Z.md                    | 4bab859cc4239c2462c5b43b93b0501aa444572a | phase      | -                     |
| p03    | code     | passed          | 2026-09-21 | reviews/p03-review-2026-09-21T040439Z.md                    | 3a5d9904739284c6c660fae75118efeb651324a8 | phase      | -                     |
| p04    | code     | fixes_completed | 2026-09-21 | reviews/p04-review-2026-09-21T134100Z.md                    | 7ff3bb101d641f2e273679b68d44868ac97141fa | phase      | -                     |
| p04    | code     | fixes_completed | 2026-09-21 | reviews/p04-review-2026-09-21T140558Z.md                    | 431c845ead1f668089401772cb64326dde9e7a2c | phase      | -                     |
| p04    | code     | passed          | 2026-09-21 | reviews/p04-review-2026-09-21T143647Z.md                    | ee5c8ef6a34c11de56fd7363540d77fc5246a26c | phase      | -                     |
| p05    | code     | passed          | 2026-09-21 | reviews/p05-review-2026-09-21T152422Z.md                    | ce0cb2968a577c65fc74f185a65671e6401336e2 | phase      | -                     |
| plan   | artifact | passed          | 2026-09-20 | -                                                           | -                                        | -          | -                     |
| plan   | artifact | fixes_completed | 2026-09-20 | reviews/archived/artifact-plan-review-2026-09-20T235147Z.md | -                                        | -          | -                     |
| plan   | artifact | fixes_completed | 2026-09-21 | reviews/archived/artifact-plan-review-2026-09-21T000015Z.md | -                                        | -          | -                     |
| final  | code     | fixes_added     | 2026-09-21 | reviews/archived/final-review-2026-09-21T151012Z.md         | 20ccadb91af8dda2882035a6f026124fb50eb900 | gate       | cursor-fable-5-1-high |

Spec and design rows are retained from the scaffold for compatibility and are not required in this quick workflow. Native structured artifact review passed after one revision. The final configured gate passed its High threshold with 0 Critical, 0 High, 0 Medium, and 2 Low findings. Root received the corroborated artifact and resolved both Low findings in-place: a realistic Cursor `claude-*` collision fixture and fixture-provenance sequencing. The latest row remains `fixes_completed`, not a claim of an independent zero-finding re-review; local plan validation and formatting verify these clarifications. The second gate independently confirmed resolution of all first-gate findings. No unresolved planning findings remain.

Phase p02 passed with 0 Critical, 0 High, 0 Medium, and 1 Low after all five first-round findings were resolved. Phase p03 closed that reporting drift, added the shipped launch/record boundary and durable live evidence, and passed its third review cycle with zero findings after two bounded fix rounds.

## Implementation Complete

All twelve planned tasks are implemented, and phases p01 through p05 passed independent review. Fresh final verification, final lifecycle review, and configured exit-gate attempt 2 remain before closeout.

- Phase 1: 2 tasks — resolver and generated-role lifecycle.
- Phase 2: 4 tasks — awareness, recommendations, documentation/decision alignment, and relevant lifecycle-gate prompts.
- Phase 3: 3 tasks — negative controls, live acceptance, release verification.
- Phase 4: 2 tasks — version-aware Claude effort validation and provider-registry guidance.
- Phase 5: 1 task — align shipped docs and orchestrator guidance with the fail-closed capability contract.

**Total: 12 tasks; 12 implemented.**

## References

- [Discovery](discovery.md)
- [Implementation tracker](implementation.md)
- Canonical role sources: `.agents/agents/oat-reviewer.md`, `.agents/agents/oat-phase-implementer.md`.
- Existing materializers: `packages/cli/src/providers/{codex,cursor}/codec/`.
- Recommendation and adoption: `packages/cli/config/dispatch-matrix-recommendation.json`, `packages/cli/src/commands/config/index.ts`.
- Provider selection/mechanics: `.agents/skills/subagent-orchestration/references/provider-claude.md`, `.agents/skills/oat-dispatch-subagents/references/provider-claude.md`.
- [Claude subagents](https://code.claude.com/docs/en/sub-agents), [model configuration](https://code.claude.com/docs/en/model-config), [changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md).
- Existing decisions: `DR-260706-claude-remains-model-axis-only`, `DR-260723-opus-first-claude-routing`, `DR-260906-the-dispatch-ceiling-resolver`.
