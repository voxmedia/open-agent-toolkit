---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-28
oat_generated: false
---

# Discovery: dispatch-ceiling-ux

## Phase Guardrails (Discovery)

Requirements and decisions captured here; mechanism/architecture detail (adapter
registry shape, schema, dispatch wiring) is deferred to the lightweight `design.md`.

## Initial Request

The shipped `dispatch-ceiling` project works, but dogfooding surfaced a UX problem:
the dispatch-ceiling prompt is **provider-prescriptive**. When asked about the
ceiling, Claude assumes Codex and offers Codex options; Codex assumes Claude and
offers Claude options. The prompt mixes provider selection with ceiling selection
(`Codex high`, `Codex xhigh`, `Claude opus`), which makes users feel the feature
**only works under Codex or Claude**.

Goals stated by the user:

- Define the ceiling generically so it works regardless of provider (Cursor, others).
- Don't imply "this won't work unless you use one of these two providers."
- Keep setting it low-friction; allow "don't set it / let the model decide."
- A ceiling is still useful even when a provider already self-selects models
  (e.g. running Opus but wanting to cap at Sonnet).

## Clarifying Questions

### Question 1: One pass or two?

**Q:** Should the quick UX fix and the deeper provider-neutral model ship separately?
**A:** One pass, not two.
**Decision:** Single project covers preset UX + concrete per-provider compilation +
adapter abstraction + provider-neutral copy.

### Question 2: Presets vs copy-only fix?

**Q:** Is a `balanced/maximum/cost-conscious` preset layer worth the maintenance
burden, or is a prompt-copy rewrite enough?
**A:** Keep the presets — users shouldn't have to reason about per-provider values;
they can presume what "balanced" means. Pair it with honest copy ("OAT applies this
where the provider exposes a mechanism").
**Decision:** Presets are user-facing convenience; they must compile immediately to
concrete per-provider values.

### Question 3: Can presets cause the wrong effort/model to run?

**Q:** If we store `balanced`, could the fuzzy label end up driving dispatch?
**A:** That must not happen.
**Decision:** Runtime dispatch reads **only** concrete per-provider values. The
preset/label is provenance only and is never read at dispatch time.

### Question 4: Does the Claude Task `model` parameter actually enforce a ceiling?

**Q:** Claude subagents are not pinned in frontmatter — can OAT enforce a Claude
ceiling at all, and in which directions?
**A:** Verified empirically (see Key Decisions / verified-facts below).
**Decision:** The Task `model` parameter is a real, bidirectional enforcement point.

### Question 5: Migration of existing ceiling config?

**Q:** Do we need a read path for the old `oat_dispatch_ceiling: {provider, value,
source}` shape?
**A:** Not worried about migration.
**Decision:** Clean break. The resolver only knows the new shape; no legacy read path.

## Solution Space

The request was exploratory at the outset but converged through collaborative design
across three peer sessions (this Claude session, a Codex session, and Sonnet/Opus test
sessions) plus empirical verification.

### Approach 1: Preset + compiled per-provider values + adapter abstraction _(Recommended, chosen)_

**Description:** User picks a generic preset (or per-provider advanced, or none).
The choice compiles immediately to concrete per-provider ceiling values stored in
project state. A provider adapter layer declares each provider's enforcement
capability and mechanism; the resolver joins stored intent with adapter capability at
dispatch time.
**When this is the right choice:** When the goal is provider-neutral UX without
losing deterministic enforcement for providers that support it.
**Tradeoffs:** Introduces a preset→values mapping table and a new adapter abstraction
to maintain; in exchange, UX is low-friction and provider-neutral.

### Approach 2: Copy-only rewrite (no presets)

**Description:** Just rewrite prompt/log copy to be provider-neutral; keep
per-provider keys; make "skip / not applicable" first-class.
**When this is the right choice:** If the only problem were wording and we wanted the
absolute smallest change.
**Tradeoffs:** Doesn't give users the "I don't want to reason about per-provider
values" shortcut the user explicitly asked for; leaves the schema two-provider-shaped.

### Chosen Direction

**Approach:** Approach 1 — presets compile to concrete per-provider values, behind a
provider adapter abstraction, with honest enforcement copy.
**Rationale:** Directly fixes the reported "feels Codex/Claude-only" problem, keeps
setting low-friction, and preserves deterministic enforcement. The adapter layer is
what makes the model genuinely provider-neutral rather than two-provider-with-good-copy.
**User validated:** Yes — one-pass scope, presets retained, runtime reads concrete
values only.

## Options Considered

### Option A: `cost-conscious` maps Claude to `haiku`

**Description:** Lowest-cost preset uses Haiku for Claude implementer/reviewer.

**Pros:**

- Cheapest possible runs.

**Cons:**

- Haiku produces weak reviews/implementation; erodes trust in the workflow.

**Chosen:** Neither (rejected for the default). `cost-conscious` holds Claude at
`sonnet`; Haiku stays available only via advanced per-provider selection.

### Option B: Store enforcement `mode` (enforced/advisory) in project state

**Description:** Persist per-provider `mode` alongside the value.

**Pros:**

- State carries the full picture.

**Cons:**

- Enforcement capability is a property of `provider adapter × runtime`, not the
  project. Stored mode goes stale the moment adapter capabilities change (new Cursor
  adapter, verified Claude path), making state lie.

**Chosen:** B rejected. **State stores intent only; the resolver computes mode from the
adapter registry at dispatch time.**

**Summary:** Presets compile to concrete values at write time; capability/mode is
resolved fresh at dispatch. State encodes _what the user wants_, the registry encodes
_what's possible_, the resolver joins them.

## Key Decisions

1. **Provider-neutral intent:** The ceiling is an OAT intent, not a provider
   selection. Copy must not imply the feature only works under Codex/Claude.
2. **Presets are convenience only:** `balanced` / `maximum` / `cost-conscious`
   (+ advanced per-provider + no-ceiling). They compile immediately to concrete
   per-provider values. Runtime never reads the label.
3. **Preset mapping (fixed table):** Balanced → Codex `high`, Claude `sonnet`;
   Maximum → Codex `xhigh`, Claude `opus`; Cost-conscious → Codex `medium`, Claude
   `sonnet`; No ceiling → unset/inherit. No Haiku reviewers by default.
4. **Both providers are enforceable, via different mechanisms (verified):**
   - Codex: sync-time **pinned variant files** (per-call effort is unreliable).
   - Claude: per-call **Task `model` parameter** — needs **no variant files**.
   - Others: advisory until an adapter declares a real mechanism.
5. **Claude Task `model` is bidirectional (verified):** downgrade, lateral, and
   **upgrade above the orchestrator** all work. Precedence: Task `model` param >
   agent frontmatter `model:` > orchestrator inheritance.
6. **Reviewer runs AT the ceiling; implementer runs at min(preferred, ceiling).**
   This target/cap split now holds for both providers (Claude can raise to the target).
7. **State stores intent only; resolver computes enforcement mode** (enforced /
   advisory / unsupported) from the adapter registry at dispatch. Mode never persisted.
8. **Verify-on-upgrade:** Only when the requested tier is **above** the orchestrator
   does entitlement risk exist (silent plan fallback). The adapter verifies the
   subagent's actual model only on the upgrade path; capping down needs no check.
   Never log "enforced" unless the requested model was actually honored.
9. **Leave Claude agent frontmatter unpinned (inherit):** so "no ceiling" = inherit
   orchestrator = the pre-existing behavior that already worked. Resolver passes
   `model` only when a cap/target actually applies.
10. **Founding principle:** Provider capability is **verified at dispatch, never
    assumed** — the recursion of dispatch-ceiling's original thesis (Codex effort
    inheritance was an assumed behavior that proved false).

### Verified Facts (empirical, this session)

Orchestrator was Opus; a second test ran from Sonnet. Subagent self-reported model:

| Dispatch                                             | Result                                             |
| ---------------------------------------------------- | -------------------------------------------------- |
| `model="haiku"`                                      | Haiku 4.5 — downgrade works                        |
| `model="sonnet"`                                     | Sonnet 4.6 — lateral works                         |
| no override                                          | inherits orchestrator (Opus / Sonnet respectively) |
| `model="opus"` from a **Sonnet** session             | Opus 4.8 — **upgrade above orchestrator works**    |
| custom agent frontmatter `model: haiku`, no override | Haiku — frontmatter pins                           |
| custom agent, `model="sonnet"` override              | Sonnet — **Task param beats frontmatter**          |

Also verified: **agent registry does not hot-reload** — new `.claude/agents/*.md`
files are only picked up on a fresh session. Therefore OAT must not generate Claude
agent files at runtime; per-call `model` is the right mechanism, and Codex variants
must remain sync-time (committed before the session starts).

## Constraints

- Single pass (no two-phase split).
- No migration of the old `oat_dispatch_ceiling` shape.
- Publishable-package lockstep version bump applies (bundled-asset changes count).
- Codex pinned variants stay sync-time; no runtime agent-file generation.
- Quick-mode artifacts and dashboard committed at lifecycle boundaries.

## Success Criteria

- Ceiling prompt/copy reads as a provider-neutral OAT intent; never implies
  Codex/Claude-only; "no ceiling / not applicable" is first-class.
- A preset choice compiles to concrete per-provider values; the post-selection
  confirmation prints the exact compiled result.
- Runtime dispatch resolves only concrete per-provider values, never the preset label.
- Codex enforces via pinned variants; Claude enforces via per-call Task `model`.
- Logs distinguish enforced / advisory / unsupported, computed at dispatch.
- Upgrade requests that the provider can't honor are logged honestly (not "enforced").
- Existing verification suite (config, dispatch-ceiling resolver, Codex sync,
  skill-version validation) passes; `pnpm release:validate` passes.

## Out of Scope

- Migration / legacy ceiling-shape read path.
- Cursor adapter implementation (registry leaves a clean extension point only).
- Haiku as a default implementer/reviewer target (advanced-only).
- More than two providers in the preset table.
- Runtime reading of preset labels.
- Designing a formal third-party-author adapter contract (kept internal for now).

## Open Questions

- **Plan entitlement:** On an account **without** Opus access, does a Sonnet session
  requesting `model="opus"` error or silently fall back? Unknown — handled defensively
  by verify-on-upgrade rather than blocked on.
- **Advanced mode shape:** Does "advanced" let the user set a preset _plus_ per-provider
  overrides, or replace the preset entirely? (Resolve in design.)

## Assumptions

- The resolver (`oat project dispatch-ceiling resolve`) remains the single compilation
  point; skills call it rather than re-implementing preset→value mapping.
- The existing `oat-reviewer` / `oat-phase-implementer` Claude agents can be dispatched
  with a per-call `model` without new variant files.

## Risks

- **Surface area:** Touches config schema, resolver, adapter registry, two dispatch
  skills, two prompt surfaces, logging, docs, Codex sync regen, lockstep version bump.
  - **Likelihood:** Medium · **Impact:** Medium
  - **Mitigation:** Lightweight design.md to lock the adapter boundary before planning.
- **False "enforced" claim on constrained plans.**
  - **Likelihood:** Medium · **Impact:** Medium
  - **Mitigation:** Verify-on-upgrade; log honestly on un-honored requests.

## Next Steps

Quick mode → optional lightweight design: produce a focused `design.md` covering the
adapter registry boundary, schema shape, resolver compilation, and dispatch wiring,
then generate the plan.
