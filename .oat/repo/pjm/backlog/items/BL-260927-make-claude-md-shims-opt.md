---
id: BL-260927-make-claude-md-shims-opt
title: Make CLAUDE.md shims opt-in now that Claude Code reads AGENTS.md
status: open
priority: high
scope: feature
scope_estimate: M
labels:
  - instructions
  - claude
  - config
  - sync
assignee: null
created: 2026-09-27T13:53:11.407Z
updated: 2026-09-27T13:53:11.407Z
associated_issues: []
external_plans: []
---

## Description

Claude Code now reads AGENTS.md natively through its built-in `agents-md` plugin (anthropics/claude-code `mods/agents-md`, tag v2.1.278). Its option `instructionFiles` defaults to `claude-md-or-agents-md`; the other values are `claude-md`, `claude-md-and-agents-md`, and `managed-only`. OAT still creates a CLAUDE.md shim beside every AGENTS.md by default, which is now redundant for Claude Code users on the default. Operator direction (2026-09-27): shim creation becomes opt-in through `.oat/config.json`; the default is no shims.

Plugin behavior that constrains the design (from the plugin README at v2.1.278):

- In the default mode the plugin stands down for the WHOLE project if any `CLAUDE.md`, `.claude/CLAUDE.md`, or `CLAUDE.local.md` exists in any directory from the root down to the working directory; the engine then loads only CLAUDE.md files. A repository with some shims but not others therefore loses every AGENTS.md that has no shim. Partial shim coverage is worse than all or none, so stopping shim creation without removing existing managed shims leaves new AGENTS.md files unloaded. A developer's own root `CLAUDE.local.md` also makes the plugin stand down.
- In `claude-md-and-agents-md` mode, an AGENTS.md that a CLAUDE.md already `@`-imports or links to is not loaded twice, so shims are harmless there.
- The option is read only from user settings (`~/.claude/settings.json`), `--settings`, or managed settings; a project's `.claude/settings.json` is not read. OAT cannot set it from the repository. Users on older Claude Code releases, or who chose `claude-md`, get no AGENTS.md without shims.
- Nested AGENTS.md attach on a text `Read` only (not on `@`-mentions, IDE selections, or notebook/image/PDF reads), and `--add-dir` directories contribute no AGENTS.md. These are documented gaps against CLAUDE.md.

Current OAT surface (mapped 2026-09-27):

- The only writer is `oat instructions sync`: `applySyncActions` in `packages/cli/src/commands/instructions/sync/sync.ts:207`; `planSyncActions` (`:121`) plans a create for every AGENTS.md without a CLAUDE.md (status `missing`). The strategy (`pointer` writes `@AGENTS.md\n` per `instructions.utils.ts:29`, `symlink`, `copy`) is a CLI flag only (`sync.ts:355-358`, default `pointer` at `instructions.utils.ts:30-31`); `.oat/config.json` has no key for it. Sync writes shims whether or not the Claude provider is enabled.
- Stray adoption (`sync.ts:250-290`): a CLAUDE.md with no AGENTS.md is copied into a new AGENTS.md and the CLAUDE.md is regenerated as a shim. With shims off, leaving that CLAUDE.md in place makes the plugin stand down.
- `oat instructions validate` treats `missing` as drift (exit 1, `validate/validate.ts:88`); `oat-doctor` treats `missing`/`content_mismatch` as an error and offers `oat instructions sync` (`.agents/skills/oat-doctor/SKILL.md:90,126,33`; pinned by `tests/doctor-contract.test.mjs`).
- `oat-agent-instructions-analyze` requires a "create CLAUDE.md with @AGENTS.md" recommendation for every AGENTS.md when Claude is active (`SKILL.md:262,309,317`); `oat-agent-instructions-apply` ensures the import (`SKILL.md:207,243`). `scripts/resolve-providers.sh` auto-detects Claude from a root `CLAUDE.md` (`:83`), which a no-shim repository may no longer have.
- `oat pjm init` prints a hint to run `oat instructions sync` (`pjm/init.ts:57-62`).
- Docs: `provider-sync/instruction-sync.md` (strategy table 163-167, statuses 179-182, adoption 186-198), `provider-sync/commands.md:211-239`, `cli-utilities/configuration.md:98`, `reference/oat-directory-structure.md:128`, `reference/troubleshooting.md:61-64`, `cli-utilities/config-and-local-state.md:259-262`, `provider-sync/scope-and-surface.md:126`.
- Existing related config key: `documentation.instructionPointerExcludes` (opt-out directory list, `config/oat-config.ts:49-54`).

Overlap: absorbs `BL-260830-persist-instruction-sync` (persist the strategy in config and init); that item's "migration preserves existing installations" criterion conflicts with the new default and must be resolved here. Adjacent: `BL-260830-add-per-claude-md-adoption-opt` (per-file adoption opt-out, same sync area).

Decided 2026-09-27 in `DR-260927-claude-md-shims-are-opt`. Scheduled into
Wave 2 by the operator.

## Acceptance Criteria

- A persisted `.oat/config.json` setting (for example an instruction-sync strategy with values `none`, `pointer`, `symlink`, `copy`; the exact key is settled in planning and replaces the CLI-flag-only strategy) controls shim creation. The default when the key is absent is `none`: `oat instructions sync` creates no CLAUDE.md. The `--strategy` flag still works as a one-run override. `oat config set` and the docs cover the key.
- With `none`, `missing` is no longer drift: `oat instructions validate` exits 0 for an AGENTS.md without a CLAUDE.md, and `oat-doctor` does not report it as an error. With a shim strategy configured, today's behavior is unchanged (negative control: a configured `pointer` repository still reports `missing`).
- No partial-coverage state is reachable through OAT. Under `none`, a non-dry-run sync removes OAT-managed shims (exact `@AGENTS.md` pointer content, a symlink to the sibling AGENTS.md, or a byte-identical copy) automatically; `--dry-run` lists them; hand-written or modified CLAUDE.md files are reported, never deleted; the release notes call out the removal (decided in `DR-260927-claude-md-shims-are-opt`).
- Under `none`, when any `CLAUDE.md`, `.claude/CLAUDE.md`, or `CLAUDE.local.md` remains in the repository after sync (hand-written, modified, adopted-but-kept, or a personal local file), sync reports each path with a warning that Claude Code's default `agents-md` mode ignores every AGENTS.md in the project while such a file exists. The warning suggests the two fixes: configure a shim strategy in `.oat/config.json` and rerun `oat instructions sync` (so every AGENTS.md gets a shim), or fold the file's content into AGENTS.md and delete it. The same finding appears in `--json` output as a structured warning, in `oat instructions validate`, and in `oat-doctor`'s instructions check. It is a warning, not a failure; a repository with no remaining CLAUDE.md prints nothing (negative control). Operator direction 2026-09-27.
- Stray adoption under `none` moves a lone CLAUDE.md's content into AGENTS.md and does not leave a CLAUDE.md behind (or reports why it kept one), so adoption does not make Claude Code's plugin stand down.
- `oat-agent-instructions-analyze` and `oat-agent-instructions-apply` recommend or ensure the `@AGENTS.md` import only when shims are configured; `resolve-providers.sh` still detects Claude in a no-shim repository (for example from `.claude/` or sync config, not only a root CLAUDE.md). Skill versions are bumped.
- Docs explain the new default and when to opt in: Claude Code releases before the built-in `agents-md` plugin, users who set `instructionFiles` to `claude-md`, and the nested-file gaps the plugin documents. They note that a project cannot set `instructionFiles` (user or managed settings only) and that any root `CLAUDE.md` or `CLAUDE.local.md` makes the default mode ignore AGENTS.md.
- `BL-260830-persist-instruction-sync` is closed as absorbed (or re-scoped to only what remains), with its migration criterion resolved explicitly.
- This repository drops its own shims in the same PR (operator decision 2026-09-27), and its sync runs clean under the default.
- Lockstep public package bump; tests cover the default `none`, each configured strategy, managed-shim removal, hand-written CLAUDE.md preservation, and stray adoption, all with an isolated `HOME`.
