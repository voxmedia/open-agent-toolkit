---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-07-10
oat_generated: false
---

# Discovery: gate-review-provenance-target-safety

## Phase Guardrails (Discovery)

Discovery captures the required outcomes and boundaries. Implementation details remain subject to lightweight design and planning.

## Initial Request

Make workflow gate reviews target-explicit and provenance-explicit before expanding phase-gate usage. Scope the project to:

- `BL-260707-record-gate-review-model` - stamp gate invocation target metadata on review artifacts.
- `BL-260707-declare-gate-review-target` - declare and corroborate the gate review target project.
- `BL-260707-support-producer-identity` - support producer identity aggregation for final and range review gates.
- Tail phase: `BL-260707-ask-to-enable-phase-review` - ask whether to enable phase review gates when gate configuration exists.

Lifecycle gate commands must remain provider-target-neutral. Do not implement the full dispatch machine schema except for minimal local structure needed by gate invocation metadata.

During implementation preflight, the managed Codex policy resolved as ready even though no model-plus-effort target or materialized role existed. The user confirmed this is a release regression and authorized a prerequisite phase before the gate-provenance work. That phase must restore fail-closed dispatch readiness, usable defaults, non-destructive adoption, and selected-role materialization without broadening into the deferred dispatch-machine schema.

## Clarifying Questions

No additional product clarification was required. The named backlog records define the behavior and acceptance criteria; live code reconnaissance established which portions are already present on `main`.

## Solution Space

Use one narrow safety sequence rather than introducing a general dispatch schema: first repair the dispatch preflight needed to execute this project deterministically, then make the selected gate invocation explicit, corroborate the declared review subject, preserve and finish producer aggregation behavior, and only afterward expose phase-review enablement during plan setup.

## Options Considered

### Minimal Gate-Local Invocation Metadata

**Description:** Extend the existing gate exec-target model with a small provider-neutral invocation metadata structure and carry it through prompt, artifact, parsing, and JSON output.

**Chosen:** Yes.

**Summary:** This satisfies provenance requirements without coupling the project to the broader dispatch-machine schema.

### General Dispatch Machine Schema

**Description:** Introduce the reusable route, policy, requested-controls, defaults, and runtime-confirmation schema as part of this project.

**Chosen:** No.

**Summary:** This exceeds the requested boundary and would add unrelated design and migration risk.

## Current Baseline

- `oat gate review --project <path-or-name>` already resolves an explicit project before ambient `activeProject`, injects the project into the reviewer prompt, and is used by the implementation phase gate without pinning `--target`.
- Final and contiguous-range review scopes already collect in-scope implementation/fix dispatch stamps and avoid the union of known producer families; exact single-scope behavior remains intact.
- Missing target-safety behavior is post-run corroboration of artifact `oat_project` against the declared project and explicit reporting of declared versus ambient project resolution.
- Missing invocation-provenance behavior includes exec-target invocation metadata, prompt instructions, artifact fields, parser compatibility, and gate JSON parity.
- Planning skills do not yet detect review-gate configuration or ask whether `oat_phase_review_gate` should be enabled.
- User-level config selects managed `high`, carries a complete Cursor matrix, and relies on the valid built-in Claude ladder (`high -> opus`, `frontier -> fable`), but contains no Codex model-plus-effort matrix targets. Codex and Claude entries under `workflow.gates.execTargets` are gate commands, not subagent dispatch targets.
- Dispatch preflight currently reports that incomplete Codex state as resolved with `dispatchArgs: null` and unresolved axes. The bundled recommendation still contains effort-only Codex cells, adoption replaces existing provider columns, and lower-than-cap Codex selection drops its matrix target.

## Key Decisions

1. **Identity separation:** Treat the provider execution target, configured invocation metadata, observed/self-reported producer identity, and review subject project as distinct concepts.
2. **Provider neutrality:** Reusable lifecycle gate commands declare the project subject but continue to omit provider/model `--target` pins.
3. **Declared and corroborated project:** When a project is declared, the produced artifact must carry matching `oat_project`; mismatch is a non-remediable launch/artifact-validation-class failure, never a green gate.
4. **Honest unknowns:** Unknown or provider-default invocation fields are explicit. OAT does not infer configured model or reasoning effort from reviewer self-identification.
5. **Aggregation preservation:** Retain the existing exact-scope fast path and final/range union avoidance, while making aggregated identity provenance explicit in JSON and tests where current output is insufficient.
6. **Expansion last:** Add the phase-review opt-in prompt only after target and provenance safeguards are implemented and verified.
7. **Existing behavior first:** Plan against the current `main` baseline and close missing acceptance gaps rather than reimplementing already-shipped routing and aggregation.
8. **Dispatch readiness is concrete:** A managed provider is runnable only when its native adapter can compile the selected target. Valid built-in compilation such as Claude remains accepted; incomplete Codex policy intent must prompt or block rather than fall back to an unpinned role.
9. **Defaults preserve intent:** Recommended matrix adoption fills missing provider/tier cells without overwriting explicit user choices such as the existing Cursor column.

## Constraints

- Keep lifecycle gate commands target-neutral with respect to provider/model selection.
- Use only minimal gate-local invocation metadata; do not implement the full dispatch-machine schema.
- Preserve legacy/manual ambient project resolution when `--project` is omitted, but label that resolution source explicitly.
- Preserve existing single-phase producer identity behavior and existing gate review artifact compatibility.
- Phase review gates remain opt-in and disabled when no qualifying configuration exists or the user declines.
- Any changed canonical skill must receive one frontmatter version bump in the final PR diff.
- Shipped CLI, skills, templates, or docs changes require lockstep version bumps for the five public packages and `pnpm release:validate` before completion.
- The prerequisite is limited to dispatch readiness, defaults/adoption, selected-target resolution, and materialization required to run this project. General dispatch reporting and schema consolidation remain deferred.

## Success Criteria

- Gate exec targets support explicit provider-neutral invocation model and reasoning-effort metadata with explicit unknown/provider-default semantics.
- `oat gate review` injects resolved target ID, runtime, invocation values, and source into the prompt; review artifacts and JSON output carry the same values.
- Review guidance distinguishes configured invocation target metadata from observed or self-reported producer identity.
- Explicit review projects are injected into the prompt and corroborated against artifact `oat_project`; mismatch cannot pass. Ambient legacy resolution remains supported and is identified as ambient.
- Final and range gates resolve relevant producer stamps, avoid the known producer-family union, and identify aggregated stamp provenance in JSON; single-scope behavior is unchanged.
- Plan setup detects qualifying review-gate configuration and offers all phases, selected phases, or disabled, writing valid `oat_phase_review_gate` frontmatter.
- Tests cover configured Codex and Claude invocation metadata, default/unknown targets, parser compatibility, declared-project mismatch, ambient fallback, exact and aggregated producer stamps, and phase-review prompt outcomes.
- Workflow-gate, review, artifact, and planning documentation describes the resulting contracts.
- Managed Codex preflight flags a missing or non-compilable model-plus-effort target, offers valid defaults, and blocks non-interactive execution until resolved; Claude's valid built-in policy compilation remains runnable.
- Default adoption preserves existing explicit provider/tier values, complete Codex targets materialize deterministic roles, and lower-than-cap preferred efforts resolve the matching configured target rather than silently losing the variant.

## Out of Scope

- The full dispatch machine schema, generalized renderer, or reusable route/policy/default/runtime-confirmation contract.
- Provider/model pins in bundled lifecycle gate commands.
- Treating model self-identification as authoritative invocation metadata.
- Removing manual `--producer-identity` support or changing existing exact single-scope producer behavior.
- Auto-enabling phase review gates without a qualifying gate configuration or after user decline.
- Removing legacy ambient project resolution for manual gate review invocations.
- General dispatch-machine schemas, renderers, or unrelated provider-routing redesign beyond the bounded prerequisite repair.

## Deferred Ideas

- General dispatch-machine metadata and renderer work remains in its separate backlog scope.
- Runtime-confirmed model identity can be layered separately from configured invocation metadata.

## Open Questions

- **Invocation source vocabulary:** Lightweight design should define the smallest stable source enum that clearly represents configured, provider-default, and unknown values.
- **Gate configuration detection:** Lightweight design should choose a canonical read-only CLI/config probe that distinguishes a usable review target from merely having built-in target definitions.
- **Project mismatch envelope:** Lightweight design should align the failure outcome with existing launch/artifact-validation failure reporting without spending a remediation attempt.

## Assumptions

- The existing `--project` routing and producer aggregation on `main` are intentional foundations to extend, not behavior to replace.
- Phase selection semantics should reuse the structure already consumed by `oat-project-implement`.

## Risks

- **Identity conflation:** Similar terms can cause invocation target, producer, runtime, and project subject to overwrite one another. Mitigate with explicit field names and contract tests.
- **False-green target mismatch:** A reviewer can write into the declared reviews directory while stamping the wrong project. Mitigate by parsing and corroborating frontmatter before verdict success.
- **Configuration false positive:** Built-in exec targets may make every environment appear configured. Mitigate by defining and testing the exact eligibility probe before prompting.
- **Distributed skill drift:** Planning behavior spans several canonical skills and bundled views. Mitigate with shared plan-writing guidance, version bumps, sync validation, and release validation.
- **False-ready dispatch:** Policy intent can appear resolved while the active provider has no executable controls. Mitigate by deriving readiness from adapter compilation and testing interactive and non-interactive preflight outcomes.
- **Destructive remediation:** Adopting defaults can erase custom provider columns. Mitigate with fill-missing merge semantics and preservation tests.

## Next Steps

Produce a focused lightweight design for the metadata shape, project corroboration flow, aggregation source semantics, and shared phase-review prompt contract, then generate the executable quick plan.
