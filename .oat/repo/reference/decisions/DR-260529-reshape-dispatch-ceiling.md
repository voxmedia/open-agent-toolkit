---
id: DR-260529-reshape-dispatch-ceiling
title: Reshape dispatch ceiling as a provider-neutral intent (presets + adapter
  registry); refines ADR-018
date: 2026-05-29
status: accepted
legacy_id: ADR-019
---

### ADR-019: Reshape dispatch ceiling as a provider-neutral intent (presets + adapter registry); refines ADR-018

- **Date:** 2026-05-29
- **Status:** accepted
- **Drivers:** Dogfooding ADR-018's surface showed the ceiling prompt was provider-prescriptive — it mixed provider selection with ceiling selection and made users feel the feature only worked under Codex or Claude. The two-provider config shape also couldn't express "this is an OAT intent that applies wherever the provider exposes a mechanism." Separately, empirical testing established that Claude's Task `model` parameter is a real, bidirectional enforcement point (downgrade, lateral, and upgrade above the orchestrator all work; precedence is Task `model` > agent frontmatter `model` > orchestrator inheritance), so Claude can be enforced too — not merely advisory.
- **Related:**
  - `.oat/projects/shared/dispatch-ceiling-ux/` (discovery, design, plan, implementation)
  - ADR-018 (refined here)
  - `packages/cli/src/config/dispatch-ceiling-preset.ts`, `packages/cli/src/providers/ceiling/registry.ts`, `packages/cli/src/commands/project/dispatch-ceiling/index.ts`

#### Context

ADR-018 made the ceiling authoritative but kept it Codex-centric in framing and shape (`workflow.dispatchCeiling.codex`/`.claude`). Users perceived the feature as Codex/Claude-only, and there was no low-friction way to express intent without reasoning about per-provider values. The reshape needed to stay deterministic for providers that can enforce, while reading as provider-neutral and degrading gracefully for providers that cannot.

#### Options Considered

1. **Copy-only rewrite** (reword the prompt, keep the flat per-provider keys). Rejected — does not give the "I don't want to reason about per-provider values" shortcut and leaves the schema two-provider-shaped.
2. **Presets + concrete per-provider compilation behind a provider adapter registry.** Chosen.

#### Decision

1. **Provider-neutral intent with presets.** Users choose a preset (`balanced`/`maximum`/`cost-conscious`), set per-provider values directly (advanced), or pick "no ceiling". Presets compile **at write time** to concrete per-provider values via a fixed table (balanced → codex `high`/claude `sonnet`; maximum → `xhigh`/`opus`; cost-conscious → `medium`/`sonnet`; never haiku reviewers by default). Runtime dispatch reads only the concrete `providers.*` values, never the preset label.
2. **Clean break, no migration.** Config keys are `workflow.dispatchCeiling.preset` and `workflow.dispatchCeiling.providers.codex`/`.claude`; the flat `workflow.dispatchCeiling.codex`/`.claude` keys are removed. `preset` is persisted only when a preset was chosen; advanced/manual stores only `providers` + `source`.
3. **Provider adapter registry.** Each adapter declares `supportsCeiling`, `validValues`, `mechanism` (`pinned-variant` | `model-arg` | `none`), and `compileToDispatchArgs(value, role, ctx)`. Codex → pinned variants (sync-time files); Claude → per-call Task `model` (no variant files); unknown providers → advisory.
4. **Mode computed at dispatch, never persisted.** The resolver joins stored intent × adapter capability and returns per-provider `{value, mode, mechanism, dispatchArgs}` where `mode` ∈ enforced/advisory/unsupported is computed fresh each run. Capability is a property of provider × runtime, so persisting it would go stale.
5. **Verify-on-upgrade.** Only an above-orchestrator request risks a silent plan/entitlement fallback, so the adapter verifies the actual model only on the upgrade path; cap-down/lateral need no verification. Never log `enforced` unless the requested control was honored.

#### Consequences

- Positive:
  - The ceiling reads as an OAT intent; copy no longer implies Codex/Claude-only; "no ceiling" is first-class.
  - Both Codex and Claude are enforceable (different mechanisms); a future Cursor/other adapter plugs in without schema changes.
  - Presets keep setting low-friction without letting a fuzzy label drive dispatch.
- Trade-offs:
  - A new adapter abstraction + preset table to maintain.
  - Clean break breaks existing flat-key config (accepted; no migration).

#### Follow-ups

- Implement a third-provider ceiling adapter (e.g. Cursor) using the registry extension point.
- Optional: allow `haiku` as an advanced Claude reviewer target (not a default).

---
