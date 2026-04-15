---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-14
oat_generated: true
oat_summary_last_task: p03-t02
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: install-sync

## Overview

This project fixed the remaining install-triggered sync leak in `oat tools install <pack>`. The previous repair stopped stale manifest entries from deleting unrelated provider views, but `oat tools install docs` could still create unrelated provider entries and Codex config changes for canonical content outside the selected pack.

## What Was Implemented

The fix made the install-triggered canonical path list the authoritative scope for the full sync plan rather than only the stale-removal pass. `computeSyncPlan` now filters both planned provider-view entries and stale-manifest removals against the canonical paths explicitly passed by the installer.

The same scope now flows through sync orchestration into Codex extension planning. Partial install-triggered sync no longer treats unrelated managed Codex roles as stale, and zero-role partial sync is a true no-op for both fresh projects and projects that already have a user-managed `.codex/config.toml`.

The project also added focused regression coverage at the engine, sync-command, install-command, and Codex extension layers. The rebased branch carries the required lockstep public-package release bump to `0.0.39` across the five publishable packages, with `pnpm release:validate` passing on top of `origin/main`.

## Key Decisions

- Keep the fix centered in sync orchestration instead of adding pack-specific logic to install commands.
- Treat install canonical paths as the authoritative scope for all install-triggered sync side effects.
- Preserve ordinary `oat sync` behavior for non-install runs; the narrower scoping only applies when install explicitly passes canonical paths.
- Treat zero desired Codex roles in partial sync as no work to apply, even when `.codex/config.toml` already exists.

## Design Deltas

The quick-mode discovery targeted planner scoping, provider-view scoping, Codex extension scoping, and regression coverage. The implemented branch matched that shape closely. The only notable delta came after rebasing onto a newer `main`: the lockstep public package version advanced to `0.0.39` instead of the originally planned `0.0.37`.

## Tradeoffs Made

The project chose a narrow fix instead of revisiting sync architecture or manifest schema. That kept the behavioral change easy to reason about and reduced regression risk, but it intentionally left broader scoped-sync workflows for future work.

The branch also accepted OAT tracking churn from repeated review cycles and the rebase onto `main`. Those artifacts were kept accurate rather than collapsed away, because the review history explains why the Codex partial-sync no-op ended up with both fresh-config and existing-config coverage.

## Integration Notes

Future work that adds install-triggered side effects should thread `installedCanonicalPaths` all the way through the affected planner path instead of treating install scope as a removal-only filter. The Codex extension planner is now part of that contract.

Because public package versions already moved on `main`, follow-up branches in this area should bump from `0.0.39` rather than reusing the pre-rebase `0.0.37` numbers recorded in earlier review artifacts.

## Follow-up Items

- Open the final project PR and route any human feedback through `oat-project-revise`.
- If the team wants broader partial-sync support outside install flows, treat that as a new project rather than extending this fix opportunistically.
