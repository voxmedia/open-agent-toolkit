---
oat_generated: true
oat_generated_at: 2026-04-14
oat_summary_source: project-pr-final
oat_last_updated: 2026-04-14
---

# Project Summary: tool-install-ux

## Overview

This quick-mode project fixed `oat tools install` scope-selection and install-location UX problems for user-eligible packs. The shipped changes make pack scope detection reflect the actual canonical content on disk, treat scope changes as migrations instead of accidental double-installs, and improve the install prompts and summaries so users can see where packs are installed before they submit.

## What Was Implemented

- Added install-state aggregation across project and user scopes so packs can resolve to `project`, `user`, `both`, or `not-installed`.
- Changed `oat tools install` migrations so user-eligible packs clean up the old canonical copy when the user switches scopes.
- Passed affected scope metadata into the `oat tools install` auto-sync hook so migrations sync both the removed scope and the destination scope.
- Updated the interactive installer to show current install location, prepopulate follow-up defaults from the installed state, and require an explicit keep-both vs. user-only decision for packs already installed in both scopes.
- Replaced the old coarse install summary with final per-pack scope reporting.
- Removed the duplicate post-install scope scan by deriving persisted tool config from the initial scan plus the selected pack set.
- Added focused regression coverage, including direct agent-only install-state aggregation.
- Updated the CLI docs page for tool packs so the both-scope prompt and final `project + user` summary behavior are documented.

## Verification

- `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/install-state.test.ts src/commands/init/tools/index.test.ts src/commands/tools/install/index.test.ts`
- `pnpm --filter @open-agent-toolkit/cli lint`

Full-package `test` and `type-check` remain blocked by unrelated `@open-agent-toolkit/control-plane` resolution failures already recorded in implementation tracking.
