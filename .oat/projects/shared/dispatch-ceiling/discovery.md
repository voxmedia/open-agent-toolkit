---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-23
oat_generated: false
---

# Discovery: dispatch-ceiling

## Initial Request

Follow up on the merged subagent model-selection work from PR #87. Dogfooding showed that Codex base/unpinned roles, including `oat-reviewer` and base `oat-phase-implementer`, do not reliably inherit the live parent/orchestrator reasoning effort. In an xhigh parent session, a spawned unpinned reviewer resolved to `(gpt-5.5 high)` while OAT logged inherited effort. That invalidates the current contract that "inherited" means parent-session ceiling for Codex.

The follow-up should introduce an OAT-owned, user-declared dispatch ceiling and make normal Codex dispatch deterministic through pinned role variants capped by that ceiling. Provider default effort remains informational and describes base/unpinned Codex role behavior; it is not the OAT ceiling.

## Solution Space

The old project intentionally avoided a cross-provider ceiling because it assumed Codex inherited effort was a structural parent-session cap. That assumption is now disproven for unpinned roles. The viable designs are:

### Approach 1: Provider default as implicit ceiling

Use the Codex configured/provider default effort whenever OAT cannot infer the parent effort.

This is rejected. Provider default is not user-declared for the project, may differ from the user's live session intent, and would silently lower or raise dispatch behavior while OAT logs a false source of truth.

### Approach 2: Continue using base roles for reviewer inheritance

Keep base roles and improve log wording to say the effective effort is unknown/provider-default.

This is only acceptable as a fallback description. It does not solve deterministic review quality gates and keeps normal behavior dependent on host defaults.

### Approach 3: OAT-owned provider-aware ceiling with pinned variants

Add `workflow.dispatchCeiling.<provider>` plus project-state/frontmatter override. Resolve that ceiling before implementation starts, prompt only at planning/preflight interactive seams, block unresolved non-interactive implementation, and dispatch deterministic Codex variants capped by the resolved ceiling.

This is the chosen direction. It matches the user's policy goals: no silent dispatch above the intended ceiling, no pretending xhigh was used when Codex resolves unpinned roles to high, no mid-run ceiling prompts, and provider-aware behavior for Codex and Claude.

## Key Decisions

1. **Authoritative ceiling source:** OAT dispatch ceiling is user-declared and authoritative. Codex provider default effort is informational and only explains unpinned/base role behavior.
2. **Provider-aware schema:** Use per-provider values because Codex uses effort levels (`low`, `medium`, `high`, `xhigh`) while Claude uses model tiers (`haiku`, `sonnet`, `opus`).
3. **Resolution order:** Resolve repo config first, then project state/frontmatter. Planning and implementation preflight can prompt interactively; non-interactive unresolved implementation must block before work starts.
4. **Deterministic Codex dispatch:** Add Codex `xhigh` implementer variant and reviewer variants for `low`, `medium`, `high`, and `xhigh`. Normal review dispatch should use the resolved ceiling variant instead of the base reviewer role.
5. **Ceiling math:** Codex effort order is `low < medium < high < xhigh`; selected effort is `min(preferred, resolved_ceiling)`, with explicit capped logs.
6. **Claude preservation:** Claude ceiling remains model-based. Claude has no separate effort axis, so implementation guidance should keep `effort_axis=not-applicable` and avoid Codex terminology.

## Constraints

- Do not prompt during implementation after work starts.
- Never prompt in non-interactive terminals.
- Dry-run should report unresolved ceiling and planned behavior without mutating state.
- Base/unpinned Codex roles must no longer be described as inheriting the parent ceiling.
- Generated Codex role views must be refreshed through `pnpm run cli -- sync --scope project`.
- Skill/agent changes require frontmatter version bumps.
- Changes under bundled skills, agents, templates, docs, or CLI-shipped behavior require lockstep public package version bumps and `pnpm release:validate`.

## Success Criteria

- Repo config and project-state surfaces can represent provider-specific dispatch ceilings.
- Planning guidance asks for a ceiling once at the end of planning when unresolved and interactive, then persists it.
- Implementation preflight resolves and prints ceiling source and Codex provider default effort when possible.
- Unresolved non-interactive implementation blocks before phase work with actionable config instructions.
- Codex implementer and reviewer dispatch use pinned variants up to the resolved ceiling.
- Logs show preferred effort, dispatch ceiling, selected effort, source, provider default, dispatch target, and rationale.
- Claude behavior remains provider-aware and model-axis based.
- Docs, generated Codex views, tests, and lockstep package versions are updated.

## Out of Scope

- Reading or controlling the live Codex UI session effort directly.
- Treating provider default effort as an implicit OAT ceiling.
- Adding a separate runtime daemon or service for dispatch resolution.
- Changing non-Codex providers beyond preserving provider-aware semantics for Claude.

## Assumptions

- The Codex provider default effort can be read from `.codex/config.toml` when configured; otherwise logs can display `unknown`.
- Project-state frontmatter is the right project-local persistence surface for planning/preflight answers.
- Prompt-only lifecycle behavior is acceptable for planning and implementation skills where the CLI does not own subagent dispatch.

## Risks

- **Prompt-only enforcement drift:** Some dispatch behavior lives in skills rather than compiled CLI code.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Keep examples concrete, add generated role variants, update docs, and validate skill text with existing skill checks.
- **Generated role classification drift:** New variant roles may be misclassified as stray if managed-role lists are incomplete.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Extend Codex sync/stray tests to cover reviewer variants and xhigh implementer.
- **Config-surface ambiguity:** Repo config and project state have different ownership and precedence.
  - **Likelihood:** Low
  - **Impact:** Medium
  - **Mitigation:** Document resolution order and expose config keys through `oat config`.

## Next Steps

Proceed with lightweight design and the quick-mode implementation plan.
