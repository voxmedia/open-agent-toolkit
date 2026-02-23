---
oat_generated: true
oat_generated_at: 2026-02-23
oat_pr_type: project
oat_pr_scope: final
oat_project: .oat/projects/shared/codex-toml-sync-universal-subagent-adoption
---

# PR: codex-toml-sync-universal-subagent-adoption

## Summary

This PR implements Codex TOML sync support and universal subagent stray adoption across providers, with canonical `.agents/agents` as the source of truth. It adds canonical subagent parsing/rendering, shared codec contracts, Codex import/export + config merge, and command-layer sync/status/doctor integration for Codex drift handling. It also closes final-review findings with expanded command-level integration coverage and refactors for duplicated conflict/regeneration logic.

> Note: this is an OAT `import`-mode project. `spec.md` and `design.md` are intentionally absent; goals and implementation assurances are sourced from the imported plan plus implementation/review artifacts.

## Goals / Non-Goals

- Goal: Generate project-scope Codex multi-agent artifacts (`.codex/agents/*.toml` and `.codex/config.toml`) from canonical subagents.
- Goal: Support universal subagent stray detection/adoption through existing `oat init` and `oat status` flows for Claude/Cursor/Copilot/Gemini/Codex.
- Goal: Preserve provider-specific semantics via canonical metadata + provider codecs while keeping sync idempotent.
- Non-goal: Add a new standalone `oat adopt` command.
- Non-goal: Add user-scope Codex agent generation (`~/.codex`) in this release.
- Non-goal: Auto-fanout adoption across all providers outside `oat sync --apply`.

## What Changed

- Added canonical subagent schema/parser/renderer under `packages/cli/src/agents/canonical/` with `yaml@2.8.2` frontmatter handling and extension-field preservation.
- Added shared provider codec interface + markdown codec helpers under `packages/cli/src/providers/shared/`.
- Added Codex codec modules under `packages/cli/src/providers/codex/codec/`:
  - import from Codex role TOML/config to canonical markdown
  - export canonical markdown to role TOML
  - safe `config.toml` merge with managed-role markers and unmanaged-key preservation
- Extended sync command pipeline with Codex extension planning/apply output, including aggregate config drift metadata (`aggregateConfigHash`) without changing manifest schema.
- Extended `init`/`status` stray detection + adoption paths to support Codex role strays and conflict-aware adoption behavior.
- Extended `status`/`doctor` diagnostics for Codex drift/misconfiguration checks (parseability, `features.multi_agent`, role file wiring).
- Updated provider interop/workflow docs to clarify Codex command-layer architecture and explicit user-scope deferral.
- Addressed final review findings with command-level integration coverage and minor dedup refactors (`m1`, `m2`, `m4`), with accepted deferrals for low-risk refactor/cosmetic items (`m3`, `m5`).

## Verification

- `pnpm --filter @oat/cli test -- --run`
- `pnpm --filter @oat/cli lint`
- `pnpm --filter @oat/cli type-check`
- `pnpm --filter @oat/cli build`
- Focused integration suites:
  - `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/status/index.test.ts`
  - `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/doctor/index.test.ts`
  - `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/init/index.test.ts`
  - `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/sync/index.test.ts`
  - `pnpm --filter @oat/cli test -- --run packages/cli/src/providers/codex/codec`

## Reviews

- Initial final review recorded with findings and converted into Phase 8 fix tasks: `reviews/final-review-2026-02-21.md`
- Final re-review passed with no Critical/Important/Medium/Minor findings: `reviews/final-review-2026-02-22.md`

Plan reviews table row:

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| final | code | passed | 2026-02-22 | reviews/final-review-2026-02-22.md |

## References

- Imported Source: [`references/imported-plan.md`](https://github.com/tkstang/open-agent-toolkit/blob/0c4215c610ae7a0414c3d1afd1f236d772212aab/.oat/projects/shared/codex-toml-sync-universal-subagent-adoption/references/imported-plan.md)
- Plan: [`plan.md`](https://github.com/tkstang/open-agent-toolkit/blob/0c4215c610ae7a0414c3d1afd1f236d772212aab/.oat/projects/shared/codex-toml-sync-universal-subagent-adoption/plan.md)
- Implementation: [`implementation.md`](https://github.com/tkstang/open-agent-toolkit/blob/0c4215c610ae7a0414c3d1afd1f236d772212aab/.oat/projects/shared/codex-toml-sync-universal-subagent-adoption/implementation.md)
- Reviews: [`reviews/`](https://github.com/tkstang/open-agent-toolkit/tree/0c4215c610ae7a0414c3d1afd1f236d772212aab/.oat/projects/shared/codex-toml-sync-universal-subagent-adoption/reviews)
