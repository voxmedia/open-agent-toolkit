---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-29
oat_generated: true
oat_summary_last_task: p05-t02
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: dispatch-ceiling-ux

## Overview

This project reshaped the dispatch-ceiling surface (shipped by the prior `dispatch-ceiling` project, ADR-018) from a **provider-prescriptive** prompt into a **provider-neutral OAT intent**. Dogfooding showed the ceiling prompt mixed provider selection with ceiling selection and made users feel the feature only worked under Codex or Claude. The reshape keeps deterministic enforcement where a provider supports it, while reading as provider-neutral and degrading gracefully where it does not. Captured as **ADR-019** (refines ADR-018).

## What Was Implemented

- **Provider-neutral schema + preset compiler.** Config accepts a `preset` (`balanced`/`maximum`/`cost-conscious`) and/or explicit `providers.codex`/`.claude`. A fixed preset table compiles **at write time** to concrete per-provider values (balanced → codex `high`/claude `sonnet`; maximum → `xhigh`/`opus`; cost-conscious → `medium`/`sonnet`; never haiku reviewers by default). Clean break: the old flat `workflow.dispatchCeiling.codex`/`.claude` keys were removed (no migration); new keys are `workflow.dispatchCeiling.preset` and `workflow.dispatchCeiling.providers.codex`/`.claude`.
- **Provider adapter registry.** `packages/cli/src/providers/ceiling/registry.ts` declares per-provider enforcement: Codex → pinned variant files (`oat-phase-implementer-{low..xhigh}` / `oat-reviewer-{low..xhigh}`); Claude → per-call Task `model` parameter (bidirectional, verified; no variant files); unknown providers → advisory no-op.
- **Adapter-aware resolver.** `oat project dispatch-ceiling resolve` joins stored intent × adapter and returns per-provider `{value, mode, mechanism, dispatchArgs}` where `mode` (enforced/advisory/unsupported) is computed at dispatch and **never persisted**, plus a `verifyOnDispatch` flag for above-orchestrator requests. The existing `--preflight`/`--json`/non-interactive contract is preserved; the result is a backward-compatible superset.
- **Lifecycle skills.** `oat-project-quick-start`, `oat-project-implement`, and `oat-project-plan` carry the provider-neutral preset prompt and enforced/advisory/unsupported dispatch logs; implementer dispatches at `min(preferred, ceiling)`, reviewer at the ceiling.
- **Docs + reference.** `apps/oat-docs` (configuration, implementation-execution, lifecycle, directory-structure) updated to the new model; repo reference updated (ADR-019, current-state, backlog `bl-c3d8` for a future third-provider adapter).
- **Release.** Five lockstep public packages bumped to `0.1.12`; `release:validate` green.

## Key Decisions

- Ceiling is an OAT intent, not a provider selection; copy must not imply Codex/Claude-only (ADR-019).
- Presets are convenience only and compile to concrete values at write time; runtime reads only `providers.*`, never the label.
- Enforcement `mode` is computed from the adapter registry at dispatch and never persisted (capability is a property of provider × runtime).
- Verify-on-upgrade: only above-orchestrator requests risk a silent fallback, so the adapter verifies the actual model only on that path; never log `enforced` unless the request was honored.
- Clean break of the old flat config shape; no migration.

## Design Deltas

- Adapter interface refined to `compileToDispatchArgs(value, role, ctx)` + explicit `verifyOnDispatch(value, ctx)` (design sketch was `(value, ctx)`).
- Resolver returns a backward-compatible superset (existing per-provider command fields + the design's `preset`/`providers.<provider>.{...}` shape).
- p04-t00 folded in 3 p03 review nits; one final-review docs-drift fix aligned `reference/oat-directory-structure.md` + `lifecycle.md`.

## Verification

- `pnpm check`, `pnpm test` (**1635/1635**), `pnpm lint`, `pnpm type-check`, `pnpm build:docs`, `oat sync --scope project --dry-run` (clean), `validate-skill-version-bumps` (3 skills), `pnpm release:validate` (5 packages @ 0.1.12, re-run after p05).
- **Review history:** per-phase reviews + an auto final review passed; a second **manual** final review (v2) then found 2 Important gaps the run's own reviews missed — (1) `oat config set ...preset` stored the preset raw without compiling, so the documented recommended path resolved no ceiling; (2) `dispatch-ceiling resolve --provider <unknown>` threw instead of returning advisory. Both were fixed in **p05** and confirmed by a final re-review that **exercised the documented commands** (not just unit tests).

## Follow-up Items

- **bl-c3d8** — implement a third-provider dispatch-ceiling adapter (e.g. Cursor) via the registry extension point (currently advisory).
- Optional: allow `haiku` as an advanced Claude reviewer target (not a default).
- Process: final/user-facing reviews should exercise the actual documented commands, not only happy-path unit tests — the v2 review caught real gaps precisely because it ran them.
