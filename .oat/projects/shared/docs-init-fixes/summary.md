---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-05
oat_generated: true
oat_summary_last_task: p04-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: docs-init-fixes

## Overview

Fixed friction points in `oat docs init` and related docs commands identified during hands-on bootstrapping of Fumadocs documentation in both monorepo and single-package repos. Testing revealed 10 friction points; 2 were already resolved in the template, leaving 7 issues addressed across 4 implementation phases (9 tasks). This project unblocks the `docs-bootstrap-skill` project which depends on a clean CLI experience.

## What Was Implemented

### Phase 1: Core Fixes (CWD + Index Consistency)

- **Repo root resolution:** `generate-index` now resolves the git repo root via `resolveProjectRoot()` before writing `.oat/config.json`, fixing spurious config creation in docs app subdirectories when run from package scripts.
- **Index path consistency:** Config (`documentation.index`) and AGENTS.md now both point to `<app>/docs/index.md` — the actual content index with the `## Contents` navigation contract.
- **Silent failure removal:** Scaffold scripts no longer wrap `generate-index` in `|| true`. Since `@open-agent-toolkit/cli` is already a devDependency, failures should be visible.

### Phase 2: Setup Completeness

- **Post-scaffold next steps:** After scaffolding, the CLI prints actionable install/build commands tailored to repo shape (single-package: `cd <app> && pnpm install`; monorepo: `pnpm --filter <app> build`).
- **Preflight checks:** `oat docs init` now detects existing `.oat/config.json` documentation config before scaffolding. Interactive mode prompts for confirmation; `--yes` mode warns but proceeds; non-interactive without `--yes` exits with error.

### Phase 3: Polish

- **Non-default app name guidance:** Monorepo scaffolds with non-default app names trigger a note about updating root scripts or CI filters.
- **Partial local package detection:** `resolveOatDepContext` now checks each OAT package individually. Repos with only some packages locally get per-package `workspace:*` wiring instead of all-or-nothing.
- **tsconfig preseed:** Fumadocs template tsconfig updated with `jsx: "react-jsx"` and `.next/types/**/*.ts` includes to prevent first-build rewrites.

## Key Decisions

1. **Fix at CLI level, not skill workaround:** All friction points were addressed in the CLI source code rather than worked around in the bootstrap skill.
2. **Per-package local detection over all-or-nothing:** Changed from boolean `isOatRepo` to per-package `localPackages` set, allowing mixed local/published dependencies.
3. **Preflight checks are additive:** New checks warn without blocking `--yes` mode, preserving backward compatibility for automated workflows.
4. **Repo root resolution scoped to config ops:** Only `readOatConfig`/`writeOatConfig` calls use repo root resolution. File operations (docsDir, outputPath) remain CWD-relative.

## Follow-up Items

- **`init/index.ts` still uses `context.cwd` for config in `runDocsInit`:** The default dependency wires `readOatConfig(context.cwd)` which works when run from repo root but has the same CWD assumption as the original generate-index bug. Low risk since `oat docs init` is always run from repo root.
- **Preflight doesn't cover non-empty target directories interactively:** `ensureTargetWritable` still throws rather than prompting. The existing error message is clear but could be friendlier.
- **Resume `docs-bootstrap-skill` project:** This project was split from docs-bootstrap-skill, which is blocked on these CLI fixes and should now be resumed for hands-on testing with the improved CLI.
