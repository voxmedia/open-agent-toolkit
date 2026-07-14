---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-13
oat_generated: true
oat_summary_last_task: p03-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: agent-artifact-hygiene-contract

## Overview

OAT artifact writers repeatedly produced tracked Markdown that failed consuming repositories' format gates, forcing orchestrators to add formatter instructions to individual dispatch briefs. This project made output hygiene a repository-aware lifecycle contract and also corrected planning preflight behavior that could mistake an unresolved project ceiling for missing dispatch ladders.

## What Was Implemented

- Added planner-first formatter resolution to `oat-project-plan-writing`: plans now select the repository's documented write/fix command, prefer file-scoped execution, and embed the concrete command in every artifact-writing task.
- Added one equivalent, greppable `Artifact hygiene contract:` to the phase implementer, reviewer, six lifecycle writing skills, and CLI gate-review context. Runtime writers execute supplied commands first, fall back to repository-owned instructions only when needed, avoid unrelated rewrites, and warn once rather than fail when no formatter is documented.
- Hardened dispatch preflight to inspect merged effective configuration through `oat config list --json`, distinguish ladder completeness from project-ceiling selection, and avoid false ladder-adoption prompts when a resolver returns `matrix: null`.
- Added regression coverage for complete contract equivalence, role-specific definition-of-done behavior, assembled gate-review prompts, skill versions, and effective dispatch configuration.
- Regenerated provider projections with the repository-source CLI and released the bundled changes through lockstep public package version `0.1.64`, including synchronized generated package-version metadata.

All five implementation tasks completed. Independent p01, p02, p03, and final reviews passed with zero findings; final verification covered skill validation, 216 focused contract/prompt tests, provider-sync drift, workspace format/lint/type-check/test/build gates, and release validation for all five public packages.

## Key Decisions

- **Self-contained contracts at writing boundaries:** The approved runtime paragraph is duplicated at every dispatch or lifecycle boundary because referenced shared files may not be loaded or available in another runtime. A stable lead-in and full-copy regression tests make the intentional duplication auditable.
- **Planner-first formatter resolution:** Normal implementation resolves a repository-owned write/fix command once during planning and supplies a concrete, file-scoped invocation to downstream tasks. Runtime discovery remains a bounded fallback for direct lifecycle work and stale or incomplete plans.
- **Tracked artifacts remain formatted:** Ignore patterns were rejected as the upstream solution because project summaries, reviews, and other lifecycle artifacts are tracked, reviewed content across multiple locations. Consumers may add local exclusions, but OAT writers remain responsible for valid output.
- **Graceful missing-formatter behavior:** Writers emit `no format command discovered in repo instructions; skipping` once and continue when repository instructions and relevant manifests expose no usable write/fix command. This surfaces configuration gaps without making missing formatter documentation a lifecycle failure.
- **Effective ladders precede project ceilings:** Planning uses merged effective configuration as the authority for provider-tier ladder completeness and treats project ceiling selection as a separate decision. A resolver's `matrix: null` is therefore not evidence that ladder adoption is required.

## Design Deltas

- Provider projection initially used a PATH-installed OAT `0.1.51`, which emitted stale provenance and content. The accepted implementation regenerated projections with the repository-source `0.1.61` CLI and recorded that source as authoritative.
- Phase p03 added `packages/cli/assets/public-package-versions.json` to its owned files after release verification showed that this tracked generated asset must match the lockstep package manifests. The plan was aligned before p03 review, and the final review accepted both corrections as bounded.
- The configured documentation closeout added shipped docs content after the initial final review. Current main advanced to public package `0.1.63` before approval, so the published branch merged main and finalized the lockstep package set at `0.1.64`.

## Notable Challenges

- The quick-start plan gate timed out twice without producing findings or a receive-eligible artifact. An operator-authorized non-interactive recovery produced the blocking review, whose findings were incorporated before a clean passing gate review.
- Provider synchronization appeared complete until provenance exposed the stale PATH CLI. Re-running sync and bundle generation from repository source restored deterministic projections and generated release metadata; the subsequent dry run reported no pending operations.

## Tradeoffs Made

- The runtime contract is deliberately duplicated instead of centralized. This increases the number of synchronized copies but preserves self-contained behavior across provider and dispatch boundaries; exact-text tests control drift.
- Formatting failures are prevented through agent contracts and regression tests rather than a new hard enforcement mechanism. This keeps the change repository-agnostic while relying on each writing boundary to honor its completion contract.
- Lifecycle prose changes run only checks relevant to changed files, while phase implementation retains the repository's applicable gate set over its full produced diff. This avoids unrelated test cost without exempting artifacts from definition-of-done checks.

## Integration Notes

- Canonical roles and skills remain under `.agents/`; provider views are generated and must not be hand-edited.
- Plans should carry a concrete repository command such as this project's file-scoped `pnpm exec oxfmt --write <paths>` behavior. Runtime writers should rediscover formatting only when that supplied instruction is absent or unusable.
- Changes to bundled roles, skills, templates, scripts, or docs remain shipped CLI functionality and require the repository's lockstep public-package release policy and `pnpm release:validate`.
