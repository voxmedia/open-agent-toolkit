---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-20
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: claude-effort-levels

**Goal:** Let OAT select and apply Claude model-plus-effort targets for reviewers and phase implementers, teach Claude orchestrators to use them, and ship consistent bundled recommendations.

**Architecture:** Extend the shared dispatch target/resolver and materialization extension patterns. Claude effort is definition-bound: generate named Markdown roles with `model` and `effort`, resolve an exact native variant, and launch that variant. Keep the canonical role prompt separate from provider projections and retain the model-only compatibility path.

**Tech stack:** TypeScript ESM, Vitest, Node test runner, YAML/Markdown agent definitions, OAT skills and config bundle.

**Scope authority:** This artifact plans implementation; no implementation has started. The user confirmed the requirements and requested straight-to-plan quick mode. Project setup and plan reviews do not authorize publishing or changing personal ladders.

## Planning Checklist

- [x] Discovery synthesized from the conversation and validated by `oat project complete-discovery`.
- [x] Adjacent phases evaluated for dependencies and overlapping files.
- [x] `oat_plan_parallel_groups` explicitly sequential.
- [ ] Resolve project dispatch ceiling and review posture.
- [ ] Complete artifact review and configured quick-start exit gate.
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

The source is `packages/cli/config/dispatch-matrix-recommendation.json`, currently version `2026-07-27.1`. The adoption contract preserves explicit cells, so a new recommendation changes fresh adoption and missing cells; it does not upgrade an explicitly configured old Claude cell automatically.

Proposed Claude-only recommendation for this feature, subject to supported-pair verification during p02-t02:

| Tier     | Ordered candidates                     | Rationale                                                                                                                         |
| -------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Economy  | `haiku`, `sonnet/low`, `sonnet/medium` | Preserve Haiku's effortless route and offer bounded lower-cost Sonnet choices.                                                    |
| Balanced | `sonnet/high`                          | Preserve Sonnet as the tier's terminal reviewer with a substantive explicit effort.                                               |
| High     | `opus/medium`, `opus/high`             | Express normal versus deeper reasoning inside the existing Opus tier.                                                             |
| Frontier | `opus/xhigh`, `opus/max`, `fable/high` | Expose exceptional Opus depth while preserving the current Fable terminal family without making max the default for every review. |

These are supported choices, not blanket permission to use a below-floor model for a task. Existing task-class guidance controls eligibility; Haiku remains inappropriate for semantic audits. Fable remains a qualified specialist route. Other supported effort pairs, including Fable xhigh/max, may be configured explicitly without being bundled as routine defaults. Confirm exact aliases/efforts and runtime constraints before finalizing; if support differs, adjust only the affected pair with evidence, and escalate any material model-family or reviewer-ceiling change.

Synchronize the displayed recommendation with the authoritative JSON, including an already stale Cursor row in the plan-writing display; preserve the actual Codex/Cursor JSON values. Do not adopt the new bundle into this user's live configuration as an implementation side effect.

## Phase 1: Resolve and Materialize Claude Effort Targets

### Task p01-t01: Make Claude selection effort-aware while preserving legacy behavior

**Files:** `packages/cli/src/config/dispatch-matrix.ts`, `packages/cli/src/providers/ceiling/registry.ts`, `packages/cli/src/commands/project/dispatch-ceiling/index.ts`, their colocated tests; a small Claude target/effort helper under `packages/cli/src/providers/claude/` if needed.

**Work:** First reproduce current effort-insensitive matching with two candidates sharing a Claude model but differing in effort. Add provider-native pair validation, exact matching, ordering and ceiling handling, uncapped preferred-effort support, and selected effort axes. Extend adapter output for effort-pinned variants while retaining model-only argument output. Use one shared naming/target contract consumed by p01-t02. Expose task-effort classification inputs for Claude without changing Codex semantics. Ensure evidence and actual launch selectors cannot disagree.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/dispatch-matrix.test.ts src/providers/ceiling/registry.test.ts src/commands/project/dispatch-ceiling/index.test.ts`. Cases: same model/different effort, invalid and unsupported values, duplicate/reversed candidates, cross-tier eligible choice, deterministic reviewer terminal choice, explicit model-only, inherited and uncapped branches, and unchanged Codex/Cursor outputs. Preserve the pre-fix reproduction and the post-fix rejection/valid-control outcomes in implementation notes.

**Format:** `pnpm exec oxfmt --write packages/cli/src/config/dispatch-matrix.ts packages/cli/src/config/dispatch-matrix.test.ts packages/cli/src/providers/ceiling/registry.ts packages/cli/src/providers/ceiling/registry.test.ts packages/cli/src/commands/project/dispatch-ceiling/index.ts packages/cli/src/commands/project/dispatch-ceiling/index.test.ts packages/cli/src/providers/claude/`.

**Commit:** `feat(p01-t01): resolve Claude model and effort targets`.

### Task p01-t02: Generate both Claude role variants and wire their managed lifecycle

**Files:** new `packages/cli/src/providers/claude/codec/` materialization and sync-extension modules/tests; provider extension registry and sync integration; `packages/cli/src/commands/sync/`; applicable `packages/cli/src/commands/tools/{install,update,remove,shared}/` integration tests. Use Codex/Cursor codec implementations and `providers/shared/materialization-extension.ts` as patterns.

**Work:** Materialize only required configured Claude targets for `oat-reviewer` and `oat-phase-implementer`, with unique deterministic names, explicit model/effort frontmatter, canonical body and supported role metadata. Preserve base roles. Register the extension in the existing common extension flow. Cover project and user scopes, pack-scoped install/update, dry-run, idempotent regeneration, collision/ownership rules, and removal of stale managed variants. Claude discovers Markdown definitions directly; do not invent Codex-style config registration. Never hand-edit generated files or overwrite unmanaged agents.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/claude/codec/materialize.test.ts src/providers/claude/codec/sync-extension.test.ts src/commands/sync/index.test.ts src/commands/tools/install/index.test.ts src/commands/tools/update/update-tools.test.ts src/commands/tools/remove/remove-tools.test.ts src/commands/tools/shared/in-process-sync.test.ts`. Use temporary scope roots and injected home directories. Assert both roles, exact names/fields, zero operations on a second sync, scoped removal, preserved unmanaged collisions, and rollback/failure reporting through the existing extension behavior.

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

**Verify:** `pnpm exec markdownlint-cli2 'apps/oat-docs/docs/**/*.md'` where available from the docs workspace's installed toolchain; otherwise use its exact documented markdownlint invocation discovered before execution. Run `pnpm docs:check-links`, `oat pjm doctor --json`, and inspect the generated decision index and feature examples. Full release/version gates run in p03-t03.

**Format:** `pnpm exec oxfmt --write` followed by the exact changed documentation, decision, manifest, and lockfile paths. Do not hand-edit generated docs indexes or provider output.

**Commit:** `docs(p02-t03): document Claude effort dispatch and compatibility`.

## Phase 3: Verify Real Dispatch and Release Readiness

### Task p03-t01: Add reproducible selection and launch negative controls

**Files:** new focused tests/probe documentation under `tools/smoke/` following its existing conventions; relevant `packages/cli/src/providers/identity/` tests and real-output fixture only where needed; project `implementation.md` evidence.

**Work:** Exercise config → resolver → generated definition → launch payload → dispatch record as one chain for both roles. Freeze an effort-mismatch reproduction showing the old behavior incorrectly treats different efforts as the same target, then demonstrate rejection/precise selection after the fix and a valid accepted control. Test an absent variant, conflicting model argument, unknown/unsupported effort, and model-only inheritance. Neutralize each new assurance-bearing guard temporarily and prove its test fails, then restore it. Reuse current transcript observation; do not invent external fields. Any new parser fixture must be derived from the live probe's captured output with provenance and redaction.

**Verify:** `pnpm build` followed by the exact new Node smoke test path using `node --test`, and `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/claude-runtime-observation.test.ts src/providers/identity/dispatch-validation.test.ts src/providers/identity/oat-dispatch-record.test.ts`. Record commands, categorical outcomes, and guard-neutralization evidence. Keep live API use out of ordinary CI.

**Format:** `pnpm exec oxfmt --write` with the exact new smoke files, changed identity tests/fixtures, and project evidence paths.

**Commit:** `test(p03-t01): verify Claude effort dispatch invariants`.

### Task p03-t02: Verify Claude orchestrator awareness and actual child effort

**Files:** a bounded manual probe recipe under `tools/smoke/` or existing provider-verification docs; sanitized captured fixture/evidence and `implementation.md`.

**Work:** Verify current `claude --help`, version, supported effort pairs, environment/cap precedence, and the official changelog. Use temporary project/config roots and generated definitions; do not install into real user scope. Before live execution, confirm the implementation session's route/spend authority; ambient CLI availability alone is not authority. If not already authorized, prepare the exact bounded prompts and commands for approval. This planning session does not launch probes.

Run two distinct controls. First, a deterministic wiring probe dispatches both reviewer and implementer roles with two explicit efforts on one supported model, verifying requested definitions and real child metadata. Second, an awareness probe gives the updated OAT guidance, an eligible fixture ladder with different efforts, and two tasks (a mechanical bounded edit and an ambiguous state-machine diagnosis) without telling the orchestrator which effort to select. The mechanical task operates only on a disposable fixture. Capture the orchestrator's selection/rationale, resolver result, actual Agent variant, child outcome, and observed effort. If choices do not distinguish task depth, record failure and investigate guidance instead of changing the expected result after the fact. Exercise a capped reviewer separately to confirm deterministic policy selection remains intact.

Also capture a default/inherit case and an override/cap case. An override must be reported as divergence or limitation, never claimed as exact effort enforcement. Do not mutate the user's global environment or settings. Keep each accepted run's handle; no automatic replacement after acceptance. Record provider-reported effort, not agent self-identification. If the runtime cannot expose reliable evidence, leave live acceptance unverified and stop short of claiming SC5/SC7 achieved.

**Verify:** Execute the finalized recipe on the installed runtime with explicit exit-code capture and transcript provenance. The required outcome is two distinct task-appropriate chosen efforts, correct variant launches, corroborated child effort, deterministic capped review, and honest override/inherit observations. Preserve sanitized fixtures and exact repeatable prompts/commands.

**Format:** `pnpm exec oxfmt --write` with the exact recipe, sanitized fixture, and project artifact paths.

**Commit:** `test(p03-t02): capture live Claude effort selection evidence`.

### Task p03-t03: Run release gates and close the implementation evidence

**Files:** project `implementation.md`, plan review rows, state, and only fixes justified by failed gates.

**Work:** Run the repository definition-of-done gates in order, capturing each exit code directly in its own log. Fetch origin/main before the version gate; review integration drift and adjust lockstep versions if needed. Run `pnpm lint` and `pnpm format` because skills/smoke surfaces changed. Distinguish cached output from execution. For fresh evidence, first build and then run `pnpm exec turbo run test --force`; inject temporary home into template-dependent tests through their supported harness rather than repurposing the shell HOME variable. Separately execute smoke, skill, and script suites when using the direct Turbo invocation. Resolve failures without widening scope, update evidence, and run the workflow's phase/final reviews and configured gates. Do not merge, publish, or globally install as part of this task.

**Verify, in CI order:** `pnpm check`; `pnpm type-check`; `pnpm test`; `pnpm build`; `pnpm run check:skill-bumps`; `git fetch origin main` then `pnpm release:check-versions`; `pnpm release:validate`; `pnpm build:docs`. Additionally `pnpm lint` and `pnpm format`. Each command must succeed on its own exit status. Live acceptance and negative-control evidence must also be present; green unit tests cannot replace them.

**Format:** `pnpm exec oxfmt --write .oat/projects/shared/claude-effort-levels/discovery.md .oat/projects/shared/claude-effort-levels/plan.md .oat/projects/shared/claude-effort-levels/implementation.md .oat/projects/shared/claude-effort-levels/state.md` and exact files changed by gate fixes.

**Commit:** `chore(p03-t03): record Claude effort verification`.

## Validation Coverage

| Success criterion                              | Owning tasks              |
| ---------------------------------------------- | ------------------------- |
| SC1 distinct selection and policy semantics    | p01-t01, p03-t01          |
| SC2 generated roles and managed lifecycle      | p01-t02                   |
| SC3 exact native launch and refusal boundaries | p02-t01, p03-t01, p03-t02 |
| SC4 compatibility and other providers          | p01-t01, p01-t02, p02-t02 |
| SC5 awareness and actual task-based choice     | p02-t01, p03-t02          |
| SC6 recommendation and adoption                | p02-t02                   |
| SC7 positive/negative/live evidence            | p03-t01, p03-t02          |
| SC8 decisions, docs, bumps, gates              | p02-t03, p03-t03          |

## Reviews

| Scope  | Type     | Status  | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | ------- | ---- | -------- | ------------- | ---------- | ----------- |
| p01    | code     | pending | -    | -        | -             | -          | -           |
| p02    | code     | pending | -    | -        | -             | -          | -           |
| final  | code     | pending | -    | -        | -             | -          | -           |
| spec   | artifact | pending | -    | -        | -             | -          | -           |
| design | artifact | pending | -    | -        | -             | -          | -           |
| p03    | code     | pending | -    | -        | -             | -          | -           |
| plan   | artifact | pending | -    | -        | -             | auto       | -           |

Spec and design rows are retained from the scaffold for compatibility and are not required in this quick workflow. Plan readiness remains false until review disposition and configured gate receipt are durable.

## Implementation Complete

Implementation has not started.

- Phase 1: 2 tasks — resolver and generated-role lifecycle.
- Phase 2: 3 tasks — awareness, recommendations, documentation/decision alignment.
- Phase 3: 3 tasks — negative controls, live acceptance, release verification.

**Total: 8 tasks; 0 complete.** This section is a planned rollup, not a completion claim.

## References

- [Discovery](discovery.md)
- [Implementation tracker](implementation.md)
- Canonical role sources: `.agents/agents/oat-reviewer.md`, `.agents/agents/oat-phase-implementer.md`.
- Existing materializers: `packages/cli/src/providers/{codex,cursor}/codec/`.
- Recommendation and adoption: `packages/cli/config/dispatch-matrix-recommendation.json`, `packages/cli/src/commands/config/index.ts`.
- Provider selection/mechanics: `.agents/skills/subagent-orchestration/references/provider-claude.md`, `.agents/skills/oat-dispatch-subagents/references/provider-claude.md`.
- [Claude subagents](https://code.claude.com/docs/en/sub-agents), [model configuration](https://code.claude.com/docs/en/model-config), [changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md).
- Existing decisions: `DR-260706-claude-remains-model-axis-only`, `DR-260723-opus-first-claude-routing`, `DR-260906-the-dispatch-ceiling-resolver`.
