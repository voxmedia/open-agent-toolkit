---
oat_generated: true
oat_generated_at: 2026-04-13
oat_summary_status: complete
oat_summary_source: implementation
oat_last_updated: 2026-04-13
---

# Project Summary: claude-instructions-sync

## Overview

This project expanded the `oat instructions` command family so OAT can manage project-scoped `AGENTS.md` and `CLAUDE.md` files throughout a repository tree instead of only validating a narrow pointer-file pattern.

The shipped workflow now supports recursive discovery, strategy-aware validation and repair, and safe adoption of Claude-only instruction files back into canonical `AGENTS.md`. The implementation stayed intentionally project-scoped for the first release and did not move instruction files into the broader provider-sync manifest engine.

## What Was Implemented

### Strategy-aware instruction sync

- Added a shared strategy model for `pointer`, `symlink`, and `copy`.
- Extended `oat instructions validate` and `oat instructions sync` to accept `--strategy`.
- Made validation treat file shape as part of correctness, not just file content.

### Recursive nested instruction discovery

- Reworked scanner state to discover directories containing `AGENTS.md`, `CLAUDE.md`, or both.
- Preserved nested traversal across the repository while still excluding `.git`, `.oat`, `.worktrees`, and `node_modules`.
- Normalized reporting so the same scan model powers validation, dry runs, and apply mode.

### Claude-only adoption

- Added Claude-only `stray` classification for readable `CLAUDE.md` files without sibling `AGENTS.md`.
- Implemented adoption in `oat instructions sync` by writing canonical `AGENTS.md` first, then regenerating `CLAUDE.md` with the chosen strategy.
- Added guardrails so adoption bails out safely if canonical `AGENTS.md` appears during sync.

### Hardening for unreadable and broken instruction paths

- Surfaced broken and unreadable `AGENTS.md` and `CLAUDE.md` symlink targets as explicit drift instead of silently losing them during scans.
- Ensured paired unreadable `CLAUDE.md` symlink targets still drift under `--strategy symlink`.
- Kept unreadable canonical or Claude-only instruction sources in manual-repair mode instead of attempting unsafe automated repair.

### Coverage and documentation

- Added integration coverage for mixed nested trees containing valid pairs, missing files, drift, strays, and excluded directories.
- Updated command, troubleshooting, and README documentation.
- Added a dedicated docs page for instruction sync behavior, strategy selection, adoption, and manual-repair cases.

## User-Facing Changes

- `oat instructions validate` now validates nested repo instruction files with `--strategy pointer|symlink|copy`.
- `oat instructions sync` now creates or repairs `CLAUDE.md` as a pointer file, file symlink, or hard copy.
- Claude-only instruction files can now be adopted into canonical `AGENTS.md`.
- Broken or unreadable instruction files are surfaced as drift with manual-repair guidance instead of being silently skipped.

## Key Files

- `packages/cli/src/commands/instructions/instructions.types.ts`
- `packages/cli/src/commands/instructions/instructions.utils.ts`
- `packages/cli/src/commands/instructions/validate/validate.ts`
- `packages/cli/src/commands/instructions/sync/sync.ts`
- `packages/cli/src/commands/instructions/*.test.ts`
- `apps/oat-docs/docs/provider-sync/instruction-sync.md`

## Verification

- Targeted CLI tests for instruction scanning, validation, sync, and integration flows passed throughout implementation.
- `pnpm --filter @open-agent-toolkit/cli lint`
- `pnpm --filter @open-agent-toolkit/cli type-check`
- `pnpm --filter @open-agent-toolkit/cli build`
- `pnpm release:validate`
- `pnpm build:docs`
- Final independent reviews passed, including the archived v9 and v10 final review artifacts.

## Workflow Notes

- Workflow mode: quick
- No `spec.md` or `design.md` were created by design for this quick-mode project.
- Final review artifacts passed, but the latest review row in `plan.md` was not fully reconciled before PR creation. PR generation proceeded on explicit user confirmation.
