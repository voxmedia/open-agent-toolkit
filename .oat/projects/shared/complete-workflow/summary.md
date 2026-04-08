---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-08
oat_generated: true
oat_summary_last_task: p01-t12
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: complete-workflow

## Overview

This project tightened the OAT project close-out workflow by making installed tool packs a first-class shared-config concept instead of something inferred from filesystem heuristics. The main goal was to let downstream workflows, especially `oat-project-document`, make decisions from explicit repo state while also closing related close-out gaps around archive hygiene and documentation accuracy.

## What Was Implemented

The shipped change added `tools` support to `.oat/config.json` so OAT can persist repo-level pack state for `core`, `ideas`, `docs`, `workflows`, `utility`, `project-management`, and `research`. `oat tools install` now records selected packs in shared config, `oat tools update --pack/--all` rebuilds the full tools map from installed-pack scans, and `oat tools remove --pack/--all` rewrites that same map after removals so stale `true` values are cleared.

The `oat config` command surface was extended to expose `tools.*` keys through `get`, `set`, `list`, and `describe`, including default `false` reads when a pack is unset. That made the new state both scriptable and inspectable from normal CLI workflows.

The project also switched `oat-project-document` to check `tools.project-management` instead of treating `.oat/repo/reference/` as a proxy for PJM infrastructure. In parallel, the close-out flow improvements already present on the branch were carried through documentation and review: project-document now auto-invokes repo-reference refresh when the project-management pack is installed, and archive sync excludes `reviews/*` and `pr/*` process artifacts from S3 uploads.

Implementation coverage was reinforced with config normalization tests, config command tests, and command-level install/update/remove config-write tests. Because the change affected shipped CLI behavior in a publishable package, all four public packages were bumped in lockstep to `0.0.19` and validated with the release contract.

## Key Decisions

- Store tool-pack state in shared repo config, not repo-local config, because installed pack availability is meant to be a repo-wide signal.
- Model `tools` as a partial boolean record keyed by known pack names so the schema stays explicit and normalization can discard invalid values.
- Rebuild the `tools` map from filesystem scans during update and remove flows rather than merging into prior config, because correctness depends on clearing stale enabled flags.
- Keep `oat-project-document` on an explicit config signal (`tools.project-management`) instead of directory heuristics so documentation flows can distinguish PJM infrastructure from unrelated reference content.
- Preserve other shared config keys when rewriting `tools` so archive, documentation, and other repo settings survive pack reconciliation unchanged.

## Tradeoffs Made

- The project intentionally did not add a retroactive migration for older repos. Instead, `oat tools update --all` and `oat tools update --pack` serve as the reconciliation path for previously installed packs.
- Single-tool removals do not rewrite pack state, because removing one asset does not necessarily mean the entire pack is no longer installed.
- One minor review finding was explicitly deferred: a remove-command test still seeds a `tools` config value that the scan-based reconciliation overwrites. That setup is slightly noisy, but it does not reduce correctness or coverage.

## Integration Notes

- Workflows and operators can now rely on `oat config get tools.<pack>` as the canonical installed-capability signal.
- `oat-project-document` uses that signal before auto-running `oat-pjm-update-repo-reference`.
- Documentation describing `oat tools` and shared config was updated to include the new `tools.*` behavior so docs stay aligned with the CLI surface.

## Follow-up Items

- Deferred minor review item `m3`: simplify the pre-seeded config fixture in `packages/cli/src/commands/tools/remove/config-write.test.ts` when that test area is next touched.
