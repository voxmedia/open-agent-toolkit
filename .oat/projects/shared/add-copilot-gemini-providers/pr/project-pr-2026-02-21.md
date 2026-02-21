---
oat_generated: true
oat_generated_at: 2026-02-21
oat_pr_type: project
oat_pr_scope: final
oat_project: .oat/projects/shared/add-copilot-gemini-providers
---

# feat: add GitHub Copilot and Gemini CLI provider support

## Summary

Adds GitHub Copilot and Gemini CLI as supported OAT sync providers, bringing the total from 3 to 5. Also enables user-scope agent sync for all providers (previously user mappings were skills-only). Both new providers follow existing declarative `ProviderAdapter` patterns — Gemini uses `nativeRead: true` (like Codex), Copilot uses `nativeRead: false` with symlink sync (like Claude/Cursor).

## What Changed

### Phase 1: New Provider Adapters

- **Gemini CLI** (`packages/cli/src/providers/gemini/`) — `nativeRead: true` for both skills and agents. Detects via `.gemini/` directory. Default strategy: `auto`.
- **GitHub Copilot** (`packages/cli/src/providers/copilot/`) — `nativeRead: false`, syncs to `.github/skills` + `.github/agents` (project) and `.copilot/skills` + `.copilot/agents` (user). Detects via `.copilot/`, `.github/copilot-instructions.md`, `.github/agents/`, or `.github/skills/`. Default strategy: `symlink`.

### Phase 2: User-Scope Agents + Registration

- **User-scope agent mappings** added to Claude (`.claude/agents`), Cursor (`.cursor/agents`), and Codex (`.agents/agents` nativeRead). Contract test relaxed to allow `agent` content type in user mappings.
- **Command registration** — both new adapters registered in all 7 command files: init, sync, status, doctor, providers list/inspect/set.
- **Contract test coverage** — `copilotAdapter` and `geminiAdapter` added to shared `ADAPTERS` array.

### Review Fix

- **Codex agent mappings** — added `nativeRead: true` agent mappings to Codex project and user scope (same pattern as Gemini), closing the gap identified in final review.

## Behavioral Changes (User-Facing)

- `oat providers list` shows 5 providers instead of 3
- `oat sync` syncs skills and agents to Copilot paths when detected
- User-scope sync now includes agents for Claude, Cursor, Copilot, Codex, and Gemini
- Gemini CLI detected when `.gemini/` exists (no sync needed — nativeRead)

## Verification

- 546 tests passing (70 test files), up from 517 baseline
- `pnpm lint` — clean
- `pnpm type-check` — clean
- `pnpm build` — clean
- `pnpm run cli -- providers list` — shows all 5 providers

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| final | code | passed | 2026-02-21 | reviews/final-review-2026-02-21.md |
| plan | artifact | passed | 2026-02-21 | reviews/artifact-plan-review-2026-02-21.md |

## Deviations

- Added `.copilot/` as detection marker for Copilot (not in original plan; needed for contract test's generic `.${name}` detection pattern)

## References

- Plan: [plan.md](https://github.com/tkstang/open-agent-toolkit/blob/add-copilot-gemini-providers/.oat/projects/shared/add-copilot-gemini-providers/plan.md)
- Implementation: [implementation.md](https://github.com/tkstang/open-agent-toolkit/blob/add-copilot-gemini-providers/.oat/projects/shared/add-copilot-gemini-providers/implementation.md)
- Imported Source: [references/imported-plan.md](https://github.com/tkstang/open-agent-toolkit/blob/add-copilot-gemini-providers/.oat/projects/shared/add-copilot-gemini-providers/references/imported-plan.md)
- Reviews: [reviews/](https://github.com/tkstang/open-agent-toolkit/tree/add-copilot-gemini-providers/.oat/projects/shared/add-copilot-gemini-providers/reviews)

> **Note:** This project used `import` mode (plan imported from Claude Code). Spec and design artifacts were not required.
