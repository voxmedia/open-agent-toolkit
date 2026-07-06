---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-05
oat_generated: false
---

# Discovery: model-dispatch-improvements

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Revise OAT dispatch policy language and behavior after discovering that the
current "No ceiling" option conflates two distinct intents:

- "uncapped but still managed" dispatch selection, where OAT chooses preferred
  model/effort per phase and escalation can go higher when provider controls
  allow it
- "do not select models/effort," where subagents inherit the host/provider
  default behavior

The project should introduce clearer user-facing policy names and update the
resolver, lifecycle skills, docs, and tests so dispatch behavior matches the
new contract.

## Clarifying Questions

### Question 1: Naming ladder

**Q:** What policy names should replace the current balanced/maximum/cost-conscious/no-ceiling wording?
**A:** Use `Economy`, `Balanced`, `High`, and `Frontier` for managed capability tiers. Avoid `Maximum` because a separate Frontier tier means it would no longer be literally maximum.
**Decision:** The managed tier ladder should be `Economy < Balanced < High < Frontier`, with `Frontier` explicitly representing SOTA/frontier models such as Claude Fable and future GPT 5.6 SOL-class models.

### Question 2: No-ceiling semantics

**Q:** Should "no ceiling" mean no OAT dispatch control, or preferred selection with no cap?
**A:** Desired behavior is uncapped preferred selection: if no explicit cap is set, OAT should still optimize the model/effort used where the provider exposes reliable controls.
**Decision:** Introduce an explicit `Uncapped` managed policy. It should still use preferred selections and escalation, but store no maximum tier cap.

### Question 3: Host-default semantics

**Q:** How should users request no OAT model/effort selection at all?
**A:** Use a separate option named `Inherit Host Defaults` or equivalent. In this mode, dispatch behavior is entirely up to the executing harness/provider.
**Decision:** Add a distinct inherit/default mode rather than overloading absent ceiling state.

### Question 4: Claude effort control

**Q:** Should OAT create Claude pinned variants to control reasoning effort?
**A:** No. Claude Task dispatch exposes a reliable per-call `model` parameter, but not a per-call effort parameter. Leave effort at each model's default for now.
**Decision:** Keep Claude dispatch model-axis based (`haiku`, `sonnet`, `opus`, `fable`) and continue logging `effort_axis=not-applicable` for Task-based dispatch. Defer Claude effort pins until real usage shows a need.

## Solution Space

### Approach 1: Split Selection Mode from Capability Policy _(Recommended)_

**Description:** Model the user choice as two concepts: whether OAT should manage dispatch selection at all, and which managed capability policy should constrain managed selection.

**When this is the right choice:** Best when the UI and persisted config need to distinguish "uncapped managed selection" from "inherit host defaults" without relying on ambiguous absence.

**Tradeoffs:** Requires schema/resolver updates and migration-compatible handling of existing absent ceiling values.

### Approach 2: Keep a Flat Ceiling Menu

**Description:** Keep a single list of choices and add `Uncapped` plus `Inherit Host Defaults` as additional options beside the tier presets.

**When this is the right choice:** Simpler prompt implementation if the underlying config must remain shallow.

**Tradeoffs:** The list mixes managed caps, uncapped managed behavior, and unmanaged inheritance, which is the ambiguity that caused the current bug-prone wording.

### Approach 3: Copy-Only Update

**Description:** Rename the prompt options while leaving resolver semantics unchanged.

**When this is the right choice:** Only appropriate if the team wants no behavioral change.

**Tradeoffs:** Does not meet the desired behavior. `Uncapped` would still behave like provider-default fallback rather than preferred selection.

### Chosen Direction

**Approach:** Split selection mode from capability policy, with `Managed` policies of `Economy`, `Balanced`, `High`, `Frontier`, and `Uncapped`, plus an unmanaged `Inherit Host Defaults` mode.
**Rationale:** This makes each user choice behaviorally precise and avoids silently changing existing absent-ceiling projects.
**User validated:** Yes. The user said this model "sounds good" and invoked `oat-project-quick-start model-dispatch-improvements`.

## Options Considered

### Option A: Explicit `uncapped` State

**Description:** Store an explicit uncapped policy rather than relying on the absence of `oat_dispatch_ceiling`.

**Pros:**

- Avoids silently changing existing projects where the key is absent.
- Lets the resolver distinguish "unresolved/needs prompt" from "managed but uncapped."
- Produces clearer logs and docs.

**Cons:**

- Requires schema/config updates and compatibility handling.

**Chosen:** A

**Summary:** Use explicit persisted state for managed uncapped behavior. Existing absent state should not be reinterpreted silently.

### Option B: Claude Pinned Effort Variants

**Description:** Generate Claude role variants to control effort in addition to model.

**Pros:**

- Would allow a future distinction like "opus at default effort" vs "opus at max effort."

**Cons:**

- Adds a matrix of near-duplicate agent files across providers.
- Creates recurring sync/versioning overhead.
- Model tier escalation already provides the primary Claude capability ladder.

**Chosen:** Neither for now.

**Summary:** Do not add Claude effort pins in this project. Use Task `model` selection and leave effort to model defaults.

## Key Decisions

1. **Policy names:** Use `Economy`, `Balanced`, `High`, and `Frontier` for managed capability tiers.
2. **Frontier tier:** Add an explicit top tier for SOTA/frontier models such as Claude Fable and future GPT 5.6 SOL-class models.
3. **Uncapped behavior:** Add explicit managed `Uncapped` behavior where preferred selection still applies and no maximum cap is stored.
4. **Host defaults behavior:** Add distinct `Inherit Host Defaults` behavior where OAT does not select model/effort.
5. **Claude control:** Use Claude Task `model` parameter for model selection; do not add Claude effort pinned variants.
6. **Migration safety:** Do not silently reinterpret existing absent ceiling state as new uncapped behavior.

## Constraints

- Keep the change provider-neutral while preserving honest provider-specific enforcement.
- Codex continues to enforce effort through pinned role variants.
- Claude continues to enforce model tier through Task `model` arguments and treats effort as not applicable in OAT dispatch logs.
- User-facing copy must not imply Frontier access is guaranteed when provider/account access may be gated.
- Existing projects with no dispatch ceiling must not silently shift into managed uncapped selection without an explicit choice or migration path.

## Out of Scope

- Adding Claude effort pinned variants.
- Implementing provider-specific account/entitlement detection beyond existing verify-on-dispatch behavior.
- Fleet-wide migration of existing projects.
- Implementing support for future GPT 5.6 SOL by name unless the current provider registry already exposes such a value.

## Success Criteria

- Planning/preflight prompts describe dispatch policy without conflating uncapped selection and host-default inheritance.
- Resolver semantics support managed uncapped preferred selection where provider controls allow it.
- Resolver semantics support an explicit inherit/default mode that produces base/unpinned or inherited behavior.
- Docs and bundled skills explain cap vs target behavior for implementers, fix loops, reviews, escalation, Uncapped, and Inherit Host Defaults.
- Tests cover configured capped selection, uncapped preferred selection, inherit/default behavior, Frontier/Fable mapping for Claude, and migration compatibility for absent state.

## Deferred Ideas

- Add Claude pinned effort variants if real usage shows that the gap between
  default-effort `opus` and `fable` matters enough to justify the maintenance
  cost.
- Add provider-specific entitlement detection for Frontier access if
  verify-on-dispatch and clear errors are not sufficient.

## Open Questions

- **Codex upward selection:** Confirm in implementation whether pinned Codex
  variants can select an effort above the current provider default/session
  setting, and document any runtime caveats.
- **Persisted shape:** Decide the exact config/frontmatter shape for managed
  policy vs inherit mode while preserving compatibility with current
  `workflow.dispatchCeiling.providers.*` values.

## Assumptions

- Existing resolver tests are the best starting point for codifying the new
  semantics.
- `Frontier` can map to Claude `fable` now, while any future GPT 5.6 SOL-class
  mapping should wait until the Codex provider exposes a concrete value.

## Risks

- **Silent behavior change:** Existing projects with absent ceiling state could
  unexpectedly start using managed uncapped selection if absence is redefined.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Store `Uncapped` explicitly and keep absence as
    unresolved/legacy/default behavior until an explicit choice is made.
- **Provider promise mismatch:** Frontier naming could imply guaranteed access
  when account/provider access is gated.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Log requested vs honored behavior and document
    access-gating caveats.

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Spec-driven mode:** continue to `oat-project-design` (which confirms
  requirements and produces both `spec.md` and `design.md`).
- **Spec-driven mode → formalize-only:** use `oat-project-spec` standalone
  if you want a formalized requirements artifact but aren't ready to
  design yet.
- **Quick mode → straight to plan:** proceed directly to `plan.md` when
  scope is clear and no architecture decisions remain.
- **Quick mode → optional lightweight design:** produce a focused
  `design.md` (architecture, components, data flow, testing) before
  planning. Choose this when discovery surfaced architecture choices
  or component boundaries.
- **Quick mode → promote:** escalate to spec-driven if discovery revealed
  the scope is larger or more complex than expected.
