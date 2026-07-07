---
oat_status: draft
oat_ready_for: revalidation
oat_blockers: []
oat_last_updated: 2026-07-06
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: multi-family-dispatch

> **Status: pre-project draft — revalidate at kickoff.** This lightweight design is a
> follow-on to `model-dispatch-improvements` (`.oat/projects/shared/model-dispatch-improvements/design.md`),
> written **before** that project's implementation landed. It grounds in the parent's
> intended contract, not its shipped code, and the Cursor-CLI facts derive from a stale
> (2026-06-19) docs snapshot. Every such claim is an assumption to re-verify — see the
> **Revalidation Checklist**.

## Overview

The parent reframed dispatch as an explicit policy (`Economy / Balanced / High / Frontier /
Uncapped / Inherit`) compiled by one resolver into provider-specific dispatch args, with
adapters for Codex (effort) and Claude (model). That contract assumes each provider is a
**single model family** with one ordered axis.

This project extends the contract to **multi-family providers** — a single harness whose
executing model can belong to different families. Cursor (`cursor-agent`) is the first: one
CLI that runs Claude, OpenAI/GPT, and Cursor's own Composer models. The spine of the work
is **model identity and family-aware dispatch**, not "Cursor ceiling support"; Cursor is
just the first provider that makes the identities below diverge.

Two concerns sit on a shared identity foundation and are joined at exactly one seam —
producer identity:

- **Implementation cross-model** — _absolute, preference-driven_ ("use X"): choose the
  producer model per task tier. Opt-in optimization. Per-tier model/effort selection
  already exists for single-family harnesses; the new part is **cross-family routing** and
  its generalization, **cross-harness routing**.
- **Gate cross-model** — _relational, producer-derived_ ("use not-X's-family"): choose a
  reviewer that differs from whoever produced the artifact. Always-on independence
  invariant, because a same-family gate is redundant with the automatic phase review.

## Model Identity Model

Identity is the organizing concept. Five roles, attached to dispatch **events** so a gate
can know who produced the artifact it reviews:

- **CurrentIdentity** — model/family running the orchestration harness.
- **ProducerIdentity** — model/family used for a specific implementation/fix dispatch.
- **ReviewerIdentity** — model/family selected for a gate/review.
- **DispatchPreference** — the user's preferred default family/model for implementation.
- **EscalationProfile** — the ordered allowed targets for higher-risk work.

The load-bearing principle: **gates diversify from `ProducerIdentity`, not `CurrentIdentity`.**
Today these coincide (producer = orchestrator), which is why the shipped runtime-avoidance
works; the moment implementation cross-model exists (orchestrate on Opus, produce on
Composer), they diverge and gate avoidance keyed on the orchestrator is wrong.

## Architecture

Keep the parent's layering (persisted policy → resolver → provider adapters) and add a
shared identity/catalog foundation plus the two concerns.

1. **Model-identity primitive (shared).** Resolves "what model/family is in play" for the
   current session and for each dispatch, with strict precedence:
   1. **Declaration** — a launcher-stamped value (e.g. `OAT_CURRENT_TARGET` / stamped
      current model), preferred over any probe (the `bl-e6fc` rule). No `CURSOR_MODEL` env
      var exists, so it must be stamped or probed.
   2. **Probe (best-effort)** — `cursor-agent --output-format json` `system`/`init` `model`
      field (a **display name**, not a slug) or `cursor-agent --list-models` `(current)`
      marker. Both are fragile (below).
   3. **Unknown** — degrade explicitly; never guess a family.

2. **Family classifier + semantic catalog (shared).** A curated `slug → family → rung/effort`
   catalog owns what tiers _mean_; the classifier maps a model string to a family bucket
   (`claude | openai | composer | …`) with degrade-to-`unknown`. This is the **one**
   sanctioned, tested exception to the ecosystem's "opaque model ids" principle — never a
   silent inference. Live `cursor-agent models` validates **availability** only; it never
   defines semantics.

3. **Resolver + adapters.** The resolver joins persisted policy + identity + the catalog
   into dispatch args. Provider adapters translate: Codex → effort variants, Claude → Task
   `model`, Cursor → `--model` slug.

4. **Producer-identity stamp (interface from the parent).** The parent ships a minimal,
   semantics-free stamp recording the producer model/family on each dispatch event
   (decision "B"). This project _consumes_ it; without it, producer-anchored gate diversity
   cannot survive a session boundary.

**Value precedence for a policy rung's concrete value:** (1) explicit user-pinned value wins
verbatim, no detection; (2) family-detected default only when unpinned; (3) inherit selects
nothing. Detection is a _default generator_, never on the critical path when intent is
expressed — this is what makes "use Composer 2.5 as Balanced even while orchestrating on
Opus/GPT" work without any detection.

## Component Design

### Model-Identity Primitive and Family Classifier

A shared resolver input (declaration-first, probe fallback, `unknown`) plus a curated
classifier. Centralize the probe/classify behind one internal helper (e.g. `oat internal
cursor-current-target`, per `bl-e6fc`) so skills and gate resolution share one
implementation and never inline shell `awk`.

### Semantic Catalog / Harness Tree

The config surface is a **per-harness default tree** (tier → model/effort, or an ordered
route) with layered **per-project overrides** (harness default < project override <
local/user). That tree _is_ the curated catalog for the harness. For single-family harnesses
a tier maps to one effort/model; for Cursor a tier maps to a slug, and may be an ordered
route. Flat slugs are the **transport** to `cursor-agent --model`; the catalog carries the
semantics (`slug → family → rung/effort shape`), leaving room for future per-family effort
axes (GPT 5.6) without a schema break.

### Multi-Family Provider Adapter (Cursor)

A `cursorAdapter` in the ceiling registry (`packages/cli/src/providers/ceiling/registry.ts`),
satisfying `bl-c3d8`: `supportsCeiling: true`, `mechanism: 'model-arg'`,
`compileToDispatchArgs → { model }`, dispatched as `cursor-agent -p --model <slug>` (a fresh
headless subprocess per dispatch — so OAT is not bound to the session's family). Valid values
are slugs validated against availability, not a hardcoded tier enum. **Verify-on-upgrade is
not-applicable** for Cursor: the parent's `isAboveOrchestrator` uses one `CLAUDE_TIER_ORDER`,
and cross-family Cursor has no total order (`bl-c3d8` permits documenting N/A).

### Concern 1 — Family-Aware Gate Avoidance

Today the built-in `cursor-default` target is `['cursor-agent', '-p']` with **no `--model`**
(`oat-config.ts`), so gates inherit the user's `~/.cursor/cli-config.json` default — the root
cause of "gates ran the producer's model." And `commands/gate/index.ts` defaults avoidance to
`same-runtime`, filtering targets whose runtime equals the current runtime. That works for
native harnesses **only because each native runtime is single-family** — runtime-avoidance is
family-avoidance by accident. Cursor is the first runtime where runtime ≠ family, so:

- **New axis: intra-target model variation.** Native cross-family gates switch the _binary_
  (`codex exec` / `claude -p`); Cursor stays on `cursor-agent` and switches `--model`. The
  current registry avoidance ranges over _targets_, not _models within a target_. Add
  model-level variation — either virtual Cursor targets (`cursor-composer` / `cursor-gpt` /
  `cursor-claude`) that avoidance ranges over, or exec targets gaining a model dimension so
  avoidance reasons over `(target, model) → family`. Either needs the classifier.
- **Producer-anchored, always-on, cross-family.** Diversify from `ProducerIdentity` (read
  from the stamp), not `CurrentIdentity`. Default `diversity: different-family`, on by
  default; `different-slug` is only an insufficient floor.
- **Structured achieved-diversity metadata.** Record the achieved level on the gate/review
  event — `different-family` / `degraded-to-different-slug` / `none-available` — so
  degradation is auditable, never a silently weaker review. Explicit gate config overrides.
- **No engineering around single-family accounts.** If no diverse family is available, warn
  and run (flagged non-independent). Keep the shipped "no fallback after dispatch" rule:
  diversity selection is pre-dispatch only.

### Concern 2 — Multi-Family Implementation Routing

`DispatchPreference` sets the default/floor producer per tier; `EscalationProfile` is the
ordered route above it. For a multi-family harness, a tier's value is an **ordered list of
targets** (floor → escalation), because families share no total order — escalation is a
**discrete jump** between named points, not `min()` over an enum. ("Ceiling"/`min()` stays
valid only for single-axis providers.)

**Cross-harness as the general form.** A tier maps to a dispatch target `(harness, model,
effort)`. The dispatch layer chooses a native subagent when the harness matches and an
exec-command (the existing gate cross-provider-exec plumbing) when it does not — unifying
"Cursor switches `--model`" and "a Claude orchestrator runs `codex exec gpt-5.5 xhigh`" under
one abstraction. Bake `(harness, model, effort)` into the data model now; implement
Cursor-native + same-harness first; defer cross-harness-exec for single-family harnesses (it
depends on the target CLI exposing an exec/`-p` entry).

## Data Models

Extend the parent's `oat_dispatch_policy.providers.*` map to carry multi-family values and
`(harness, model, effort)` targets, without breaking existing single-model config:

```yaml
oat_dispatch_policy:
  mode: managed | inherit
  policy: economy | balanced | high | frontier | uncapped
  providers:
    codex: <effort> # unchanged (effort axis)
    claude: <model> # unchanged (model axis)
    cursor: # multi-family harness tree: per-tier slug or ordered route
      balanced: composer-2.5
      high: # ordered route: floor → escalation target(s)
        - composer-2.5
        - { harness: cursor, model: gpt-5.5-xhigh }
  source: project-state | repo-config | user-config | local-config | env
```

Semantics to preserve:

- A bare string (`cursor: <slug>`) remains valid (single pinned model, no escalation).
- A route entry is an ordered list; a target may be a bare slug (same harness) or an explicit
  `(harness, model, effort)` object (enables cross-harness later).
- Absent `cursor` value = unpinned → family-detected default (or advisory/unsupported if
  detection is unavailable and no manual value exists). As in the parent, absent state must
  **not** silently become managed-uncapped.
- Slugs are opaque to storage; only the classifier/catalog interpret them, for the
  default-generator and gate-diversity paths.

Identity is recorded on dispatch **events** (producer stamp + reviewer identity + achieved
diversity level). Persistence location is an open question (commit trailer / `implementation.md`
dispatch log / state).

## API Design

Reuse the parent resolver CLI; add identity/role inputs:

```bash
oat project dispatch-ceiling resolve \
  --provider cursor \
  --role <implementer|reviewer> \
  --preferred <slug> \
  --current-model <declared-or-probed, optional> \
  --json
```

- `selection` states which precedence branch produced `selectedValue`
  (`user-pinned | family-default | escalation-target | inherit`) and the classified family
  (or `unknown`).
- For reviewers, `selection` exposes the diversity decision: producer family, chosen reviewer
  family, achieved level, whether config or the ceiling constrained it.
- The `oat internal cursor-current-target` helper owns probe + classify so gate resolution and
  skills share one implementation.

## Error Handling

- **Detection failure → explicit `unknown`.** Fall back to a user's manual value if present,
  else advisory/unsupported with `dispatchArgs: null` and an honest log — never claim an
  enforced tier.
- **Slug-vs-variant gotcha** (`bl-e6fc`): `--list-models` may report `composer-2.5` while the
  dispatch slug is `composer-2.5-fast`. Exact-match-or-degrade; no auto-normalization.
- **Invalid/unavailable `--model`:** undocumented in the snapshot; characterize empirically at
  kickoff (error vs silent fallback) before relying on it.
- **Frontier under Cursor:** advisory, not enforced, when a family/account cannot honor it.
- **Gate integrity:** keep "no fallback after dispatch"; diversity selection is pre-dispatch.

## Phasing

1. **Shared foundation** — model-identity primitive + family classifier + semantic
   catalog/harness tree; consume the parent's producer-identity stamp.
2. **Family-aware gate avoidance** — the intra-target model-variation upgrade,
   producer-anchored, always-on cross-family, with achieved-diversity metadata. Small,
   shippable first.
3. **Multi-family implementation routing** — DispatchPreference + EscalationProfile over the
   tree, with `(harness, model, effort)` targets. Larger; revisit after GPT 5.6.

## Open Questions (resolve before/at plan)

- **Escalation trigger:** reuse the implicit review-failure escalation, or add per-phase plan
  tagging?
- **Producer-identity persistence location:** commit trailer vs `implementation.md` dispatch
  log vs state.
- **Intra-target avoidance representation:** virtual Cursor targets vs `(target, model)` axis.
- **Harness-tree home:** built here, or as a generalization extending the parent's config
  model?
- **Detection without a declaration path:** is probe-only acceptable given latency and the
  undocumented `(current)` marker?

## Testing Strategy

- Adapter unit tests mirroring codex/claude: valid slug → `{ model }`; unpinned + detected
  family → correct rung; unpinned + `unknown` → advisory/`null`; ordered-route escalation
  selects floor then target; verify-on-upgrade N/A.
- Precedence tests: user-pinned beats detected family beats inherit.
- Family classifier: representative slugs per family, degrade-to-`unknown`, slug-vs-variant
  exact-match-or-degrade.
- Gate cross-model: producer family X → reviewer family ≠ X, capped by ceiling; the
  `cursor-default` inheritance bug reproduced and the fix asserted; achieved-diversity metadata
  recorded; `none-available` warns and runs.
- Cross-harness data model: `(harness, model, effort)` target parses and (when implemented)
  dispatches via the exec path.
- Migration/compat: existing bare `cursor: <slug>` still resolves; absent Cursor value is not
  treated as uncapped.
- Skill/docs + `pnpm release:validate` (bundled surfaces are shipped), same as the parent.

## Revalidation Checklist (run at kickoff)

- [ ] Re-read the **shipped** `model-dispatch-improvements` code — confirm actual policy key
      names, resolver shape, `CeilingCompileContext` fields, and that the producer-identity
      stamp exists; reconcile this design's assumed shapes with what landed.
- [ ] Re-verify the Cursor CLI against **live** docs / the installed binary (snapshot is
      2026-06-19, stale): `--model`, `--output-format json` init `model` field (display name
      vs slug), `--list-models` `(current)` marker, `cursor-agent models`.
- [ ] Characterize invalid/unavailable `--model` behavior empirically.
- [ ] Confirm a reliable declaration path exists (launcher can stamp current model); if not,
      decide whether probe-only is acceptable given ~1.5–3s/probe latency.
- [ ] Confirm the gate avoidance surface in `commands/gate/index.ts` still defaults to
      `same-runtime` and decide the intra-target representation (virtual targets vs
      `(target, model)`).
- [ ] Settle the escalation trigger, producer-identity persistence location, and family-taxonomy
      source (curated map vs live).
- [ ] Re-examine the GPT 5.6 (sol/terra/luna) axis question — if OpenAI tiers gain per-model
      effort, confirm the per-family axis-shape data model still holds.

## References

- Parent design: `.oat/projects/shared/model-dispatch-improvements/design.md`
- Discovery: `discovery.md`
- `bl-c3d8` — third-provider dispatch-ceiling adapter (Cursor)
- `bl-e6fc` — gate same-target/cross-target execution (Cursor probe, declaration-first)
- Adapter registry: `packages/cli/src/providers/ceiling/registry.ts`
- Gate avoidance: `packages/cli/src/commands/gate/index.ts`
- Built-in Cursor target: `packages/cli/src/config/oat-config.ts` (`cursor-default`)
