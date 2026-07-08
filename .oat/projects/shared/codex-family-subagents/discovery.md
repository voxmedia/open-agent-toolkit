---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-08
oat_generated: false
---

# Discovery: codex-family-subagents

## Initial Request

Add support for GPT-5.6 family dispatch in OAT subagent workflows. The current
Codex solution uses generated pinned variants for `oat-reviewer` and
`oat-phase-implementer` because Codex subagent dispatch has not reliably exposed
per-spawn tier or reasoning-effort control. With GPT-5.6, OAT needs to support
both model-family selection (`Sol`, `Terra`, `Luna`) and reasoning effort for
Codex and Cursor-oriented subagent flows.

The user pointed to prior projects as context:

- `.oat/projects/archived/dispatch-ceiling`
- `.oat/projects/archived/model-dispatch-improvements`
- `.oat/projects/archived/multi-family-dispatch`

## Current Evidence

- `dispatch-ceiling` added deterministic Codex effort-pinned variants:
  `oat-phase-implementer-{low,medium,high,xhigh}` and
  `oat-reviewer-{low,medium,high,xhigh}`.
- `model-dispatch-improvements` added the dispatch policy contract:
  `economy`, `balanced`, `high`, `frontier`, `uncapped`, and `inherit host
defaults`.
- `multi-family-dispatch` added sparse dispatch matrices, provider-family
  identity, Cursor model-argument routing, route targets, and family-aware gate
  behavior.
- The repo-local CLI supports the newer dispatch policy keys; the global `oat`
  binary in this environment is stale and reports those keys as unknown.
- The active local Codex model catalog currently advertises `gpt-5.5` but not
  `gpt-5.6-sol`, `gpt-5.6-terra`, or `gpt-5.6-luna`.
- Official OpenAI preview material identifies model IDs `gpt-5.6-sol`,
  `gpt-5.6-terra`, and `gpt-5.6-luna`, and says preview access is limited to
  approved API organizations and Codex workspaces.
- The GPT-5.6 launch notes introduce a new `max` reasoning effort for Sol and
  an `ultra` mode, but local Codex support for those controls is not yet
  visible from `codex debug models`.

## Clarifying Questions

### Question 1: Codex Modeling Strategy

**Q:** Should OAT represent GPT-5.6 Codex selection by generating concrete
model-plus-effort pinned role variants, or should it first try to route model
and effort through the dispatch matrix without expanding the pinned role set?
**A:** Pending.
**Decision:** Pending.

## Solution Space

This request is exploratory because the current system deliberately separates
Codex effort-pinned variants from model-argument providers, while GPT-5.6 adds a
second Codex selection axis.

### Approach 1: Matrix-Only Model Routing

**Description:** Extend dispatch matrices so Codex cells can name concrete
GPT-5.6 model/effort targets, then update implementer/reviewer dispatch to
compile those route targets without generating new pinned role files.

**When this is the right choice:** Best if current Codex subagent invocation can
reliably accept both model and reasoning effort per dispatched agent.

**Tradeoffs:** Minimal provider-view churn, but it reopens the reliability risk
that pinned variants were created to avoid. It also requires proving Codex
per-spawn model/effort behavior before implementation can trust it.

### Approach 2: Full Codex Pinned Variant Expansion

**Description:** Generate separate Codex role files for each supported GPT-5.6
model and effort combination for both `oat-phase-implementer` and
`oat-reviewer`, with role files setting `model` and `model_reasoning_effort`.

**When this is the right choice:** Best if Codex still cannot reliably accept
model/effort controls at spawn time, and deterministic subagent behavior matters
more than provider-view size.

**Tradeoffs:** Deterministic and conceptually close to the existing
dispatch-ceiling solution, but can create many generated roles and config
entries. It also requires a naming scheme and stray-detection updates so the
generated surface remains manageable.

### Approach 3: Hybrid Matrix-to-Pinned Generation (Recommended)

**Description:** Keep dispatch policy and sparse matrices as the source of
truth for abstract rungs and concrete model-family choices, but teach the Codex
sync/dispatch layer to materialize concrete pinned variants when a Codex route
target requires model-plus-effort controls. Cursor continues to use model-arg
routes and `.cursor/agents` markdown sync.

**When this is the right choice:** Best when OAT needs deterministic Codex
behavior now and still wants model-family choices to live in the provider-neutral
dispatch matrix instead of hardcoded caller branches.

**Tradeoffs:** More implementation work than either pure option, but it keeps
the OAT contract coherent: policy/matrix chooses the target; provider adapters
compile the reliable mechanism for each host.

### Chosen Direction

**Approach:** Pending user validation.
**Rationale:** I recommend Approach 3 because it preserves the recent
multi-family dispatch architecture while avoiding a regression to unreliable
Codex per-spawn controls.
**User validated:** No.

## Options Considered

### Option A: Treat GPT-5.6 as New Dispatch Matrix Values

**Description:** Add matrix entries for `gpt-5.6-sol`, `gpt-5.6-terra`, and
`gpt-5.6-luna`, with provider-specific route targets that may include effort.

**Pros:**

- Aligns with `multi-family-dispatch`.
- Lets Cursor stay model-argument based.
- Keeps policy rungs separate from model IDs.

**Cons:**

- Requires the Codex adapter to preserve both model and effort axes.
- Requires availability/validation behavior for preview-only model IDs.

**Chosen:** Pending.

**Summary:** Likely part of the recommended path.

### Option B: Add `max` Effort Now

**Description:** Extend Codex effort handling beyond `low|medium|high|xhigh`
to include `max`, at least for Sol.

**Pros:**

- Matches the GPT-5.6 launch notes.
- Avoids immediately under-modeling Sol's advertised control surface.

**Cons:**

- Local Codex has not advertised GPT-5.6 or `max` yet.
- `ultra` may be a mode rather than a simple reasoning-effort value, so it
  should not be collapsed into the same enum without CLI evidence.

**Chosen:** Pending.

**Summary:** Treat `max` as a likely supported value gated by provider evidence;
do not model `ultra` as effort unless Codex exposes it that way.

## Key Decisions

1. **Workflow:** Use quick-start discovery first; no implementation edits during
   discussion.
2. **Evidence:** Prefer official OpenAI release material and live local CLI
   behavior over stale assumptions.
3. **CLI Surface:** Use the repo-local CLI for current OAT behavior; global
   `oat` is stale in this checkout.

## Constraints

- Codex deterministic subagent dispatch must not depend on unproven inheritance
  from the parent session.
- Dispatch policy semantics from the archived projects must remain intact:
  capped managed, managed uncapped, and inherit/default are distinct.
- Cursor support should use the existing markdown-agent/provider-sync path where
  possible, and model selection should remain model-argument based for Cursor.
- Generated provider files must be managed by `oat sync` and not treated as
  custom stray agents.
- Public package lockstep/version/release policy applies if bundled provider
  assets or lifecycle skills change.

## Success Criteria

- OAT can select GPT-5.6 Sol, Terra, or Luna plus reasoning effort for Codex
  implementer and reviewer dispatch without relying on parent-session defaults.
- OAT can expose equivalent Cursor subagent markdown under `.cursor/agents/`
  when Cursor provider sync is active.
- Dispatch stamps/reporting preserve model axis, effort axis, policy, target,
  and provenance accurately.
- Local validation covers sync output, dispatch resolution, provider identity,
  generated-role stray detection, docs, and release validation.
- Preview-only or unavailable model IDs fail or warn clearly rather than being
  silently treated as host defaults.

## Out of Scope

- Changing Claude effort semantics.
- Replacing the dispatch policy model from `model-dispatch-improvements`.
- Treating GPT-5.6 availability as generally available before official or local
  provider evidence supports it.
- Modeling `ultra` as a standard OAT effort value without provider CLI evidence.

## Deferred Ideas

- Entitlement-aware GPT-5.6 preview detection per organization/workspace.
- User-level Codex role generation, which existing docs already mark as
  deferred.

## Open Questions

- **Codex Role Count:** Generate all model/effort combinations, only supported
  combinations from the live catalog, or only matrix-referenced combinations?
- **Policy Mapping:** Should the default recommendation map `balanced` to Terra,
  `frontier` to Sol, and `economy` to Luna, or should policy rungs remain
  effort-only with model family selected separately?
- **`max` Support:** Should implementation add `max` immediately behind a
  validation gate, or wait until Codex locally advertises GPT-5.6 support?
- **Cursor Agent Shape:** Is Cursor's `.cursor/agents/` markdown surface enough
  for this use case, or does it need extra frontmatter/model metadata beyond the
  canonical agent format?

## Assumptions

- `model = "<slug>"` in Codex role TOML is supported by the current codec path,
  but dispatch/runtime behavior still needs live verification.
- Cursor invalid-model behavior still hard-errors rather than silently falling
  back, as recorded by the archived `multi-family-dispatch` project.
- OpenAI model IDs from the preview material are the right initial slugs:
  `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna`.

## Risks

- **Provider Drift:** GPT-5.6 preview controls may change before broad
  availability.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep model/effort tables data-driven and validate
    against provider catalogs when available.
- **Role Explosion:** Full pinned generation may make provider views hard to
  inspect.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Generate only supported or matrix-referenced variants
    and document naming/staleness rules.
- **False Determinism:** If Codex ignores `model` inside role files, generated
  variants would look deterministic but not behave that way.
  - **Likelihood:** Unknown
  - **Impact:** High
  - **Mitigation Ideas:** Require a live Codex smoke once GPT-5.6 appears in the
    local model catalog or when preview access is available.

## References

- OpenAI launch announcement:
  https://openai.com/index/previewing-gpt-5-6-sol/
- OpenAI Help Center preview article:
  https://help.openai.com/en/articles/20001325-a-preview-of-gpt-56-sol-terra-and-luna
- GPT-5.6 preview system card:
  https://deploymentsafety.openai.com/gpt-5-6-preview

## Next Steps

Get user buy-in on the recommended hybrid strategy or select one of the other
approaches before moving to the design-depth decision.

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
