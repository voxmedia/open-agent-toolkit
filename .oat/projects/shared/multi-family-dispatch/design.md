---
oat_status: draft
oat_ready_for: revalidation
oat_blockers: []
oat_last_updated: 2026-07-05
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: multi-family-dispatch

> **Status: pre-project draft — revalidate at kickoff.** This lightweight design was
> written as a follow-on to `model-dispatch-improvements` (see
> `.oat/projects/shared/model-dispatch-improvements/design.md`) **before** that
> project's implementation landed. It grounds itself in that project's intended
> contract, not its shipped code. Every "grounds in the parent" claim and every
> Cursor-CLI surface fact below is an assumption to re-verify when this project is
> kicked off — the parent may have shifted key names or the resolver shape, and the
> Cursor facts derive from a stale (2026-06-19) docs snapshot. See
> **Revalidation Checklist** before writing a plan.

## Overview

`model-dispatch-improvements` reframes OAT dispatch as an explicit policy
(`Economy / Balanced / High / Frontier / Uncapped / Inherit Host Defaults`) compiled
by one resolver into provider-specific dispatch args, with adapters for Codex
(effort variants) and Claude (Task `model` arg). That contract assumes each provider
is a **single model family** with one ordered axis — Codex spans its range by effort,
Claude by model tier.

This project extends the same contract to **multi-family providers** — a single
provider whose executing model can belong to different families. Cursor
(`cursor-agent`) is the first: one CLI that can run Claude models, OpenAI/GPT models,
and Cursor's own Composer models. It is tracked as `bl-c3d8` (third-provider ceiling
adapter) and `bl-e6fc` (gate cross-target execution).

Multi-family breaks two assumptions the parent design bakes in, and this design
resolves both without changing the parent's policy ladder:

1. **No single ordered axis.** `min(preferred, ceiling)` and "escalate up the rungs"
   require a total order. `composer-2.5` and `gpt-5.5-xhigh` are two families with no
   natural order, so preferred-and-ceiling can be cross-family with only a discrete
   jump between them.
2. **One consumer, not one feature.** The same "what model/family is in play"
   primitive feeds two consumers: the **ceiling resolver** (map an abstract rung to a
   concrete model _within the running/chosen family_) and **cross-model gates** (pick
   a reviewer _outside_ the implementer's family). Build the primitive once.

The parent already reconciles two different axis shapes (Codex effort, Claude model)
under one resolver; this project extends that to **per-family axis shapes within one
provider**, plus a shared model-identity primitive.

## Architecture

Keep the parent's three layers (persisted policy → resolver → provider adapters) and
add a fourth cross-cutting concern.

**Model-identity primitive (new, shared).** A single resolver input answering "what
model/family is the current session/dispatch running as," with a strict precedence:

1. **Declaration** — a launcher-stamped value (e.g. `OAT_CURRENT_TARGET` / a stamped
   current model), preferred over any probe. Matches `bl-e6fc`'s declaration-over-
   introspection rule. There is **no** `CURSOR_MODEL` env var (checked and ruled out
   in `workflow-end-triggers`), so ambient detection is unavailable — it must be
   stamped or probed.
2. **Probe (best-effort fallback)** — read the model from `cursor-agent
--output-format json` (the `system`/`init` event carries a `model` field) or
   `cursor-agent --list-models` `(current)` marker. Both are best-effort with known
   fragility (below).
3. **Unknown** — degrade explicitly; never guess a family.

A **family classifier** maps a resolved model string to a family bucket
(`claude | openai | composer | …`) via an OAT-owned static map, with degrade-to-
`unknown`. This deliberately breaks the parent ecosystem's opacity principle
("OAT does not infer model family from names") **only here, as an explicit, tested
heuristic** — never silently.

**Precedence for a policy rung's concrete value** (this is the core rule):

1. **Explicit user policy value** wins — if the user pinned `cursor: composer-2.5` as
   their `Balanced` target, use it verbatim, no detection.
2. **Family-detected default** — only when the per-provider value is unpinned, map the
   abstract rung within the detected running family.
3. **Inherit** — when policy mode is `inherit`, select nothing.

Detection is thus a _default generator_, never on the critical path when the user has
expressed intent. This directly answers "I'm on Opus/GPT but want Composer 2.5 as my
Balanced": Balanced's `cursor` value is a user-set slug, independent of the
orchestrator's family; the dispatch provider need not equal the orchestrator provider
(cross-provider-exec already supports dispatching to a different runtime).

## Component Design

### Multi-Family Provider Adapter (Cursor)

A `cursorAdapter` registered in the ceiling adapter registry
(`packages/cli/src/providers/ceiling/registry.ts`), satisfying `bl-c3d8`:
`supportsCeiling: true`, `mechanism: 'model-arg'`, `compileToDispatchArgs → { model }`,
dispatched as `cursor-agent -p --model <slug>` (a fresh headless subprocess per
dispatch — confirmed in `bl-e6fc`, and the reason OAT is _not_ bound to the session's
family and can dispatch a different model per phase/gate).

Cursor's dispatch unit is a **flat opaque slug** where model and effort collapse into
one string (`composer-2.5` vs `composer-2.5-fast`; high-effort variants are their own
slugs). So the adapter's valid-value set is "slugs," not a tier enum — queried live via
`cursor-agent models` rather than hardcoded (no canonical enumerated list exists in the
docs, and slugs span families).

**Verify-on-upgrade: not-applicable for Cursor.** The parent's `isAboveOrchestrator`
uses a single `CLAUDE_TIER_ORDER`; cross-family Cursor has no total order. `bl-c3d8`
explicitly permits documenting verify-on-upgrade as N/A — take that exit.

### Two-Point (Cross-Family) Preferred/Ceiling

For single-family providers, preferred and ceiling live on one axis and `min()`
applies. For Cursor, represent a policy value that can span families as an **explicit
ordered list of slugs** (floor → escalation target(s)), e.g. `[composer-2.5,
gpt-5.5-xhigh]`. Escalation is a **discrete jump** between named points (not "step up an
enum"), triggered by the escalation condition. This makes "Composer for implementation,
escalate to gpt-5.5-xhigh when it needs it" expressible: floor `composer-2.5`, ceiling
`gpt-5.5-xhigh`. Because both are user-named, no detection is required for this case.

### Cross-Model Gate Selection

Today the built-in `cursor-default` target is `['cursor-agent', '-p']` with **no
`--model`** (confirmed in `oat-config.ts`), so gates inherit the user's
`~/.cursor/cli-config.json` default — which is why a session on `gpt-5.5-xhigh` gets
gates _also_ on `gpt-5.5-xhigh`. Two layers of fix:

- **Manual (works today, zero detection):** a gate execTarget that pins its own
  `--model <different-family-slug>`. Consistent with the shipped principle that gate
  model is explicit config (`workflow-gate-improvements` Key Decision #6), not inherited
  from dispatch policy. Static: only "cross" while the session is the other family.
- **Automatic cross-model (needs the primitive):** read the implementer/session model
  via the model-identity primitive, then select a reviewer in a **different family**,
  capped by the policy ceiling. This is strictly stronger than `bl-e6fc`'s
  `avoid: same-target`, which only avoids the _exact slug_ (gpt-5.5-xhigh →
  gpt-5.5-medium still "different target" but same family). Real review independence
  wants a different _family_, so this requires the family classifier.

**Reviewer-selection rule diverges for multi-family providers.** The parent's rule
"reviewers run at the ceiling" is safe for single-family providers (reviewer = ceiling,
still same family, accepted). Under Cursor it conflicts with cross-model gates: the
reviewer cannot be both `= ceiling` and `≠ implementer family` if the ceiling is in the
implementer's family. For multi-family providers the rule becomes **"reviewer = a
family diverse from the implementer, capped by the ceiling."**

## Data Models

Extend the parent's `oat_dispatch_policy.providers.*` map to carry multi-family values,
without breaking existing single-model Cursor config:

```yaml
oat_dispatch_policy:
  mode: managed | inherit
  policy: economy | balanced | high | frontier | uncapped
  providers:
    codex: <effort> # unchanged (effort axis)
    claude: <model> # unchanged (model axis)
    cursor: # multi-family: a per-rung slug or ordered slug list
      balanced: composer-2.5
      high: [composer-2.5, gpt-5.5-xhigh] # floor → escalation target
  source: project-state | repo-config | user-config | local-config | env
```

Semantics to preserve:

- A bare string `cursor: <slug>` remains valid (single pinned model, no escalation).
- A per-rung map / ordered list is the multi-family form; a list encodes floor →
  escalation.
- Absent `cursor` value = unpinned → family-detected default (or advisory/unsupported
  if detection is unavailable and no manual value exists). As in the parent, absent
  state must **not** silently become managed-uncapped.
- Slugs are opaque to storage; only the family classifier interprets them, and only for
  the default-generator and gate-diversity paths.

**Forward-compat for per-family effort axes (GPT 5.6 sol/terra/luna).** Cursor slugs are
flat _today_ (effort baked into the slug). Future OpenAI tiers may expose model **and**
effort separately — more analogous to Claude (model axis) + Codex (effort axis)
combined. Do not hard-assume flatness: structure the per-family value so a family can
later declare its own axis shape (bare slug now; `{model, effort}` later) without a
schema break. This is the same "one resolver, multiple axis shapes" pattern the parent
already uses across Codex and Claude — extended to per-family shapes inside one
provider.

## API Design

Reuse the parent resolver CLI; add role/identity inputs:

```bash
oat project dispatch-ceiling resolve \
  --provider cursor \
  --role <implementer|reviewer> \
  --preferred <slug> \
  --current-model <declared-or-probed model, optional> \
  --json
```

- `selection` must state which precedence branch produced `selectedValue`
  (`user-pinned | family-default | escalation-target | inherit`) and the classified
  family (or `unknown`).
- For reviewers, `selection` must expose the diversity decision (implementer family,
  chosen reviewer family, whether the ceiling constrained it).
- A small internal helper (e.g. `oat internal cursor-current-target`, per `bl-e6fc`)
  owns the probe + classifier so skills and gate resolution share one implementation
  and never inline shell `awk`.

## Error Handling

- **Detection failure → explicit unknown.** Never fabricate a family. On `unknown`,
  fall back to the user's manual value if present, else advisory/unsupported with
  `dispatchArgs: null` and an honest log — never claim an enforced tier.
- **Slug-vs-variant gotcha** (`bl-e6fc`): `--list-models` may report `composer-2.5`
  while the dispatch slug is `composer-2.5-fast`. Exact-match-or-degrade; no
  auto-normalization without a tested rule.
- **Invalid/unavailable `--model`:** behavior is **undocumented** in the snapshot and
  must be characterized empirically at kickoff (error vs silent fallback) before the
  resolver relies on it.
- **Frontier under Cursor:** as in the parent, a Frontier request that a family/account
  cannot honor is advisory, not enforced.
- **Cross-model gate must not weaken the gate.** Carry the shipped rule: no fallback
  _after_ dispatch — once the chosen reviewer target runs and exits nonzero, that is the
  gate result. Diversity selection happens pre-dispatch only.

## Escalation Trigger (Open Question — resolve before plan)

"Except when it needs xhigh" needs a defined trigger. Two candidates:

1. **Reuse the existing implicit escalation** (repeated review-failure bumps the
   implementer) — the discrete jump swaps to the next slug in the ordered list.
2. **Per-phase tagging** in `plan.md` (a phase declares it may reach the ceiling).

Also open: does "diverse" for gates mean _different family_ (recommended) or merely
_different slug_? And is the family taxonomy a static OAT-owned map, a live query, or
both? These are the load-bearing decisions to settle at kickoff.

## Testing Strategy

- Adapter unit tests mirroring codex/claude: valid slug → `{ model }`; unpinned +
  detected family → correct rung; unpinned + `unknown` → advisory/`null`; ordered-list
  escalation selects floor then target; verify-on-upgrade N/A.
- Precedence tests: user-pinned value beats detected family; detected family beats
  inherit; inherit selects nothing.
- Family classifier: representative slugs per family, and degrade-to-`unknown` for
  unrecognized strings; slug-vs-variant exact-match-or-degrade.
- Gate cross-model: implementer family X → reviewer family ≠ X, capped by ceiling;
  built-in `cursor-default` inheritance reproduced and the manual-pin fix asserted.
- Migration/compat: existing bare `cursor: <slug>` config still resolves; absent Cursor
  value is not treated as uncapped.
- Skill/docs + `pnpm release:validate` (bundled surfaces are shipped), same as parent.

## Revalidation Checklist (run at kickoff)

- [ ] Re-read the **shipped** `model-dispatch-improvements` code — confirm actual policy
      key names, resolver shape, and `CeilingCompileContext` fields; reconcile this
      design's assumed shapes with what landed.
- [ ] Re-verify Cursor CLI surface against **live** docs / the installed binary (snapshot
      is 2026-06-19, marked stale): `--model`, `--output-format json` init `model` field
      (display-name vs slug), `--list-models` `(current)` marker, `cursor-agent models`.
- [ ] Characterize invalid/unavailable `--model` behavior empirically.
- [ ] Confirm a reliable declaration path exists (launcher can stamp current model);
      if not, decide whether probe-only is acceptable given latency (~1.5–3s/probe).
- [ ] Decide the escalation trigger, the gate-diversity definition, and family-taxonomy
      source (the open questions above).
- [ ] Re-examine the GPT 5.6 (sol/terra/luna) axis question — if OpenAI tiers gain
      per-model effort, confirm the per-family axis-shape data model still holds or
      adjust before coding.

## References

- Parent design: `.oat/projects/shared/model-dispatch-improvements/design.md`
- `bl-c3d8` — third-provider dispatch-ceiling adapter (Cursor)
- `bl-e6fc` — gate same-target/cross-target execution (Cursor probe, declaration-first)
- Adapter registry: `packages/cli/src/providers/ceiling/registry.ts`
- Built-in Cursor target: `packages/cli/src/config/oat-config.ts` (`cursor-default`)
