---
id: DR-260525-make-oat-dispatch-ceiling
title: Make OAT dispatch ceiling authoritative and treat Codex provider default
  as informational
date: 2026-05-25
status: accepted
legacy_id: ADR-018
---

### ADR-018: Make OAT dispatch ceiling authoritative and treat Codex provider default as informational

- **Date:** 2026-05-25
- **Status:** accepted
- **Drivers:** Dogfooding after PR #87 showed that Codex base/unpinned subagent roles do not reliably inherit the live parent/orchestrator reasoning effort. In an `xhigh` orchestrator session, an unpinned reviewer resolved to `high`, so the old "inherited means parent-session ceiling" contract was misleading and could make OAT claim a stronger effort than the provider actually used.
- **Related:**
  - `.oat/projects/shared/dispatch-ceiling/`
  - `packages/cli/src/config/oat-config.ts` (`workflow.dispatchCeiling`)
  - `packages/cli/src/commands/project/dispatch-ceiling/` (`oat project dispatch-ceiling resolve`)
  - `packages/cli/src/providers/codex/codec/sync-extension.ts` (generated Codex role variants)
  - `.agents/skills/oat-project-plan/SKILL.md`
  - `.agents/skills/oat-project-implement/SKILL.md`
  - `.agents/agents/oat-phase-implementer.md`
  - `.agents/agents/oat-reviewer.md`
  - `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
  - `apps/oat-docs/docs/cli-utilities/configuration.md`

#### Context

PR #87 improved Codex implementer dispatch by using effort-specific implementer variants instead of relying on per-call `reasoning_effort`. The remaining gap was the base/unpinned role contract: OAT expected roles like `oat-reviewer` and base `oat-phase-implementer` to inherit the live parent session effort, but real Codex dispatch resolved an unpinned reviewer to provider/configured default effort instead.

That behavior created two correctness risks:

1. OAT could silently dispatch above or below the user's intended ceiling.
2. OAT logs could claim `xhigh` or "inherited parent ceiling" when the provider actually resolved an unpinned role through its default.

The fix needed to preserve Claude's model-axis behavior, avoid Codex terminology leaking into Claude, and avoid mid-implementation prompts.

#### Options Considered

1. **Treat Codex provider default as the implicit OAT ceiling.** Rejected because provider default is not project/user-declared dispatch intent and may not match the live session ceiling.
2. **Keep base roles and only improve log wording.** Rejected for normal dispatch because it still leaves review quality gates dependent on provider defaults. Acceptable only as a fallback description.
3. **Introduce an OAT-owned provider-aware dispatch ceiling and deterministic pinned Codex variants.** Chosen. This gives OAT an explicit source of truth and makes normal Codex dispatch predictable.

#### Decision

1. **Add provider-aware dispatch ceiling config.** `workflow.dispatchCeiling.codex` accepts `low`, `medium`, `high`, or `xhigh`; `workflow.dispatchCeiling.claude` accepts `haiku`, `sonnet`, or `opus`. Project state can persist a local answer as:

   ```yaml
   oat_dispatch_ceiling:
     provider: codex
     value: high
     source: project-state
   ```

2. **Resolve ceiling before work starts.** Planning asks at the end when unresolved and interactive. Implementation preflight resolves before phase work and never asks mid-run. Unresolved non-interactive implementation blocks with actionable config/state instructions.

3. **Expose compiled resolver behavior.** `oat project dispatch-ceiling resolve --provider <provider>` resolves effective config first and project state second. With `--preflight --json`, unresolved output can remain machine-readable for an interactive-capable orchestrator. Explicit `--non-interactive` or `OAT_NON_INTERACTIVE=1` produces the blocking path.

4. **Keep Codex provider default informational.** The resolver reports `providerDefaultEffort` when known, but provider default is not treated as the OAT ceiling. Base/unpinned Codex role logs must say `provider-default`, not inherited parent ceiling.

5. **Make normal Codex dispatch deterministic.** Sync generates `oat-phase-implementer-{low,medium,high,xhigh}` and `oat-reviewer-{low,medium,high,xhigh}`. Implementation/fix work selects `min(preferred, resolved_ceiling)`. Review dispatch uses the reviewer variant matching the resolved ceiling.

6. **Preserve Claude semantics.** Claude ceiling is model-based and capped through the model axis. Claude has no separate per-dispatch effort axis, so `effort_axis=not-applicable`.

#### Consequences

- Positive:
  - OAT no longer claims Codex parent-effort inheritance for unpinned roles.
  - Users can set an explicit dispatch ceiling at repo/user/local config or project state.
  - Codex implementer and reviewer dispatch can be deterministic through pinned variants, including `xhigh` only when the resolved OAT ceiling allows it.
  - Non-interactive runs fail before work starts instead of silently choosing a default.
  - Provider default effort remains visible where it matters, without becoming an implicit ceiling.
- Trade-offs:
  - Workflow skills still own some dispatch orchestration, so the compiled resolver is necessary but not the entire runtime policy.
  - Projects now need a resolved dispatch ceiling before non-interactive implementation can proceed.
  - The generated Codex role surface is larger because every deterministic effort variant is explicit.

#### Follow-ups

- Continue moving prompt-only dispatch contracts into compiled CLI surfaces where doing so reduces orchestrator duplication.
- Watch dogfood for whether reviewer variant discovery in Codex spawn metadata catches up with generated role availability; base reviewer remains only a provider-default fallback.

---
