---
title: Dispatch Ceiling
description: "How OAT's provider-neutral dispatch ceiling works — presets, the compile/resolve flow, and how enforcement differs for Codex, Claude, and unsupported providers."
---

# Dispatch Ceiling

The **dispatch ceiling** is the most capable tier OAT is allowed to use when it dispatches subagents (phase implementers and reviewers) during `oat-project-implement`. It is a **provider-neutral OAT intent** — your declaration of "don't go above this," decoupled from which provider you happen to be running. OAT then applies that intent through whatever mechanism each provider actually exposes.

This page explains the model, the why, and — most importantly — how enforcement differs across providers. For the raw config keys see [Configuration](../../cli-utilities/configuration.md); for how dispatch runs at execution time see [Implementation Execution](implementation-execution.md).

## Two principles

1. **Presets are convenience only — they compile to concrete values at _write_ time.** A fuzzy label like `balanced` is never read at dispatch; it is expanded into concrete per-provider values the moment you set it.
2. **Enforcement capability is computed at dispatch, never stored.** Whether a ceiling is _enforced_, _advisory_, or _unsupported_ is a property of the provider × runtime, so OAT recomputes it on every run rather than persisting a value that would go stale.

## Setting a ceiling

Set it via `oat config set` (repo / user / local) or answer the planning/implementation preflight prompt. Three shapes:

| Choice                                                 | What gets written                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| **Preset** — `balanced` / `maximum` / `cost-conscious` | The preset label (provenance) **and** the compiled per-provider values |
| **Advanced** — set providers directly                  | `providers.*` only (no `preset` key)                                   |
| **No ceiling**                                         | Nothing — each provider runs at its normal/inherited behavior          |

The fixed preset table:

| Preset         | Codex    | Claude   |
| -------------- | -------- | -------- |
| Balanced       | `high`   | `sonnet` |
| Maximum        | `xhigh`  | `opus`   |
| Cost-conscious | `medium` | `sonnet` |

`cost-conscious` deliberately keeps Claude at `sonnet` (no `haiku` reviewers by default) so review quality stays trustworthy.

Config keys:

- `workflow.dispatchCeiling.preset`
- `workflow.dispatchCeiling.providers.codex` (`low` \| `medium` \| `high` \| `xhigh`)
- `workflow.dispatchCeiling.providers.claude` (`haiku` \| `sonnet` \| `opus`)

```bash
# A preset compiles immediately to concrete per-provider values:
oat config set workflow.dispatchCeiling.preset balanced --shared
# → stores preset: balanced AND providers: { codex: high, claude: sonnet }

# Or set providers directly (advanced — no preset key stored):
oat config set workflow.dispatchCeiling.providers.codex high --shared
```

Project state can persist the compiled answer as `oat_dispatch_ceiling` (`preset?` + `providers` + `source`) so a planning/preflight choice carries into implementation.

> The earlier flat `workflow.dispatchCeiling.codex` / `.claude` keys were removed. This was a clean break with no migration — set the new keys above.

## How it resolves at dispatch

Before dispatching a subagent, the orchestrator calls:

```bash
oat project dispatch-ceiling resolve --provider <provider> --role <implementer|reviewer> --preflight --json
```

The resolver:

1. reads the concrete `providers.<provider>` value (config precedence, then project state) — **never the preset label**;
2. looks up that provider's **adapter** in the provider ceiling registry;
3. returns a per-provider result: `{ value, mode, mechanism, dispatchArgs }`.

`mode` is the honest enforcement status, computed right there and never persisted:

- **enforced** — the provider has a real mechanism and OAT dispatched the requested control.
- **advisory** — the ceiling is recorded as intent, but the provider can't deterministically enforce it (or an above-orchestrator request couldn't be honored).
- **unsupported** — no adapter mechanism exists for that provider.

## Per-provider behavior

The same ceiling intent produces different — but honest — behavior per provider, because each adapter declares its own mechanism.

|                   | **Codex**                                                                                         | **Claude**                             | **Unsupported provider**   |
| ----------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------- |
| Can OAT enforce?  | Yes                                                                                               | Yes                                    | No (no adapter yet)        |
| Mechanism         | Pinned variant files                                                                              | Per-call Task `model` argument         | None                       |
| Where it lives    | Sync-time committed `.codex` role variants (`oat-phase-implementer-high`, `oat-reviewer-high`, …) | Passed at dispatch time — **no files** | —                          |
| Axis              | effort (`low < medium < high < xhigh`)                                                            | model tier (`haiku < sonnet < opus`)   | —                          |
| `dispatchArgs`    | `{ variant: "oat-reviewer-high" }`                                                                | `{ model: "sonnet" }`                  | `null`                     |
| `mode`            | `enforced`                                                                                        | `enforced`                             | `advisory` / `unsupported` |
| If no ceiling set | base/unpinned role (provider default)                                                             | inherits the orchestrator's model      | normal behavior            |

### Why the mechanisms differ

- **Codex** dispatches through **pinned, sync-time role variants**. Per-call reasoning-effort proved unreliable in practice, so OAT generates committed `oat-phase-implementer-{low..xhigh}` / `oat-reviewer-{low..xhigh}` role files and dispatches the variant matching the resolved effort.
- **Claude** uses the **per-call Task `model` parameter**, which is reliable and bidirectional (a Sonnet orchestrator can dispatch an Opus subagent and vice-versa) and overrides agent frontmatter — so OAT simply passes `model` at dispatch and needs no variant files.
- **Unsupported providers** (any without a registered adapter) resolve to `unsupported` with `dispatchArgs: null`. The resolve command **returns cleanly and never blocks** — the ceiling is recorded as intent and applied if/when an adapter ships, while the provider runs at its own capabilities.

A **provider adapter registry** is what lets these genuinely different mechanisms sit behind one resolver, so the lifecycle skills consume `dispatchArgs` without ever branching on provider.

## Cap vs target: implementer vs reviewer

The ceiling means slightly different things for the two dispatch roles:

- **Implementer** runs at `min(preferred, ceiling)` — the ceiling is a **cap**. A simple phase may run below it.
- **Reviewer** runs **at** the ceiling — a **target** — so quality gates are deterministic.

Both providers honor this distinction (Codex selects the matching variant; Claude passes the matching model).

## Verify-on-upgrade

Only a request for a tier **above** the orchestrator's current tier risks a silent plan/entitlement fallback. So the adapter verifies the actually-dispatched model **only** on that upgrade path; capping down or staying lateral needs no check. OAT never logs `enforced` unless the requested control was actually honored.

## Dispatch logs

OAT logs the honest enforcement state per dispatch, for example:

```text
Dispatch ceiling: high (codex, enforced — variant oat-reviewer-high)
Dispatch ceiling: sonnet (claude, enforced — Task model arg)
Dispatch ceiling: balanced (cursor, unsupported — no adapter; informational)
```

## Summary

You declare intent once (a preset, explicit per-provider values, or nothing). Under Codex it becomes deterministic pinned variants; under Claude it becomes a per-call Task `model` argument; under any other provider it is recorded as advisory and that provider runs normally. The logs tell you honestly whether the ceiling was `enforced`, `advisory`, or `unsupported` — one provider-neutral knob that enforces where it can and degrades gracefully where it can't.
