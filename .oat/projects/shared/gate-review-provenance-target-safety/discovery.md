---
oat_status: in_progress
oat_ready_for: null
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

## Clarifying Questions

No additional product clarification was required. The named backlog records define the behavior and acceptance criteria; live code reconnaissance established which portions are already present on `main`.

## Solution Space

Use one narrow safety sequence rather than introducing a general dispatch schema: first make the selected gate invocation explicit, then corroborate the declared review subject, preserve and finish producer aggregation behavior, and only afterward expose phase-review enablement during plan setup.

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

## Key Decisions

1. **Identity separation:** Treat the provider execution target, configured invocation metadata, observed/self-reported producer identity, and review subject project as distinct concepts.
2. **Provider neutrality:** Reusable lifecycle gate commands declare the project subject but continue to omit provider/model `--target` pins.
3. **Declared and corroborated project:** When a project is declared, the produced artifact must carry matching `oat_project`; mismatch is a non-remediable launch/artifact-validation-class failure, never a green gate.
4. **Honest unknowns:** Unknown or provider-default invocation fields are explicit. OAT does not infer configured model or reasoning effort from reviewer self-identification.
5. **Aggregation preservation:** Retain the existing exact-scope fast path and final/range union avoidance, while making aggregated identity provenance explicit in JSON and tests where current output is insufficient.
6. **Expansion last:** Add the phase-review opt-in prompt only after target and provenance safeguards are implemented and verified.
7. **Existing behavior first:** Plan against the current `main` baseline and close missing acceptance gaps rather than reimplementing already-shipped routing and aggregation.

## Constraints

- Keep lifecycle gate commands target-neutral with respect to provider/model selection.
- Use only minimal gate-local invocation metadata; do not implement the full dispatch-machine schema.
- Preserve legacy/manual ambient project resolution when `--project` is omitted, but label that resolution source explicitly.
- Preserve existing single-phase producer identity behavior and existing gate review artifact compatibility.
- Phase review gates remain opt-in and disabled when no qualifying configuration exists or the user declines.
- Any changed canonical skill must receive one frontmatter version bump in the final PR diff.
- Shipped CLI, skills, templates, or docs changes require lockstep version bumps for the five public packages and `pnpm release:validate` before completion.

## Success Criteria

- Gate exec targets support explicit provider-neutral invocation model and reasoning-effort metadata with explicit unknown/provider-default semantics.
- `oat gate review` injects resolved target ID, runtime, invocation values, and source into the prompt; review artifacts and JSON output carry the same values.
- Review guidance distinguishes configured invocation target metadata from observed or self-reported producer identity.
- Explicit review projects are injected into the prompt and corroborated against artifact `oat_project`; mismatch cannot pass. Ambient legacy resolution remains supported and is identified as ambient.
- Final and range gates resolve relevant producer stamps, avoid the known producer-family union, and identify aggregated stamp provenance in JSON; single-scope behavior is unchanged.
- Plan setup detects qualifying review-gate configuration and offers all phases, selected phases, or disabled, writing valid `oat_phase_review_gate` frontmatter.
- Tests cover configured Codex and Claude invocation metadata, default/unknown targets, parser compatibility, declared-project mismatch, ambient fallback, exact and aggregated producer stamps, and phase-review prompt outcomes.
- Workflow-gate, review, artifact, and planning documentation describes the resulting contracts.

## Out of Scope

- The full dispatch machine schema, generalized renderer, or reusable route/policy/default/runtime-confirmation contract.
- Provider/model pins in bundled lifecycle gate commands.
- Treating model self-identification as authoritative invocation metadata.
- Removing manual `--producer-identity` support or changing existing exact single-scope producer behavior.
- Auto-enabling phase review gates without a qualifying gate configuration or after user decline.
- Removing legacy ambient project resolution for manual gate review invocations.

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

## Next Steps

Produce a focused lightweight design for the metadata shape, project corroboration flow, aggregation source semantics, and shared phase-review prompt contract, then generate the executable quick plan.
