---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-06-23
oat_generated: true
oat_summary_last_task: p04-t03
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: pjm-refresh

## Overview

OAT's project-management (PJM) repo-reference layer mixed live operational state
(backlog, roadmap, current-state) and durable history (decisions, summaries,
external plans) in a single flat `.oat/repo/reference/` tree, used non-deterministic
hash+scan IDs, and kept decisions in one monolithic `decision-record.md`. That made
the surface conflict-prone in multi-agent and multi-machine use and hard to migrate.
This project restructured the layer into a two-layer model with deterministic IDs,
file-per-record decisions, migration tooling, and refreshed shipped assets.

## What Was Implemented

The repo reference surface is now split into an **operational** layer under
`.oat/repo/pjm/` (backlog, current-state, roadmap) and a **durable** append-mostly
layer under `.oat/repo/reference/` (decisions, brainstorms, research, external-plans,
project-summaries).

- **Deterministic IDs and indexes.** Added shared `slugify` (NFKD-normalized, ASCII,
  ≤30 chars truncated at a whole-word boundary with trailing stop-words trimmed,
  `untitled` fallback) and UTC `yymmdd` helpers. Backlog IDs moved from
  hash-and-local-scan to allocator-free `BL-YYMMDD-slug`; direct filename collisions
  are now a surfaced ambiguity rather than a silent re-probe. Backlog and decision
  index regeneration are deterministic — entries are sorted before reading and
  compared with locale-independent string comparison plus an ID tie-break.

- **Decision command group.** New `oat decision` with `init`, `new`,
  `regenerate-index`, and `migrate`. Decisions are file-per-record
  (`DR-YYMMDD-slug`) under
  `reference/decisions/`, created from a `decision.md` template with a committed,
  marker-managed generated index. `oat decision migrate` converts the legacy
  monolith into per-record files, preserving each old `ADR-NNN`/`DR-NNN` as
  `legacy_id`; it applies by default with `--dry-run` to preview and a guarded
  `--delete-legacy` that refuses to delete when zero legacy sections parse.

- **Two-layer scaffold and diagnostics.** `oat pjm init` scaffolds the `pjm/` +
  `reference/` layout plus three AGENTS guides, idempotently and non-destructively.
  `oat pjm doctor` (shared with project-scope `oat doctor` when `.oat/repo` exists)
  reports missing canonical files, leftover template frontmatter, and
  legacy/loose/second-roadmap drift, with `--json` output.

- **Path move and repo migration.** Live backlog defaults and cleanup guards moved
  to `pjm/`, while `reference/external-plans` and `reference/project-summaries`
  stayed protected. `oat pjm migrate` performs safe, idempotent, lossless repo
  restructuring with `--dry-run` and a bundled `--print-prompt` migration asset.

- **Skills and lifecycle destinations.** Rewrote the PJM skills and added a new
  `oat-pjm-decision` skill; repointed lifecycle and content skills (document,
  complete, brainstorm → `reference/brainstorms/`, deep-research →
  `reference/research/`, import-plan stays `reference/external-plans/`); retired
  the deprecated `update-repo-reference` and `review-backlog` skills with redirect
  banners. `oat-project-summary` now closes the decision-consistency loop: when
  the PJM pack is installed, it auto-promotes each `## Key Decisions` entry into a
  canonical `DR-` record (idempotent — exact-slug dedup, date-prefix-independent —
  so regenerations never duplicate).

- **Assets, docs, and release.** Registered the new templates, migration asset, and
  `oat-pjm-decision` skill across the bundle script, PM skill manifest, and public
  package contract; refreshed `apps/oat-docs/docs` and templates for the new
  taxonomy; refreshed provider views via `oat sync`; and applied the lockstep
  public-package version bump `0.1.30 → 0.1.31` across all five public packages.

## Key Decisions

- **Two physical layers, not one.** Separating volatile operational state (`pjm/`)
  from append-mostly durable history (`reference/`) is the core anti-conflict move;
  it lets cleanup guards and migration treat the two lifecycles differently.
- **Allocator-free deterministic IDs.** `BL-`/`DR-YYMMDD-slug` avoids directory
  scans and hashing so two machines generate the same ID for the same input; same-day
  same-slug collisions surface as an explicit ambiguity instead of a silent counter.
- **File-per-record decisions with a generated index.** Each decision is its own
  file with a marker-managed index, so an index merge conflict is resolved by
  re-running `oat decision regenerate-index` rather than hand-merging a 60KB
  monolith.
- **Migration is lossless and guarded.** Body text is preserved, old IDs become
  `legacy_id`, and destructive `--delete-legacy` only runs after migrated records
  verify and refuses zero-section deletes.
- **Lockstep release bump batched to the final phase.** Skill/template/asset changes
  count as shipped CLI functionality, so all five public packages bump together in
  p04-t02 after the full suite and `release:validate` pass.

## Design Deltas

- **p02-t03 → p03-t01:** `oat-pjm-decision` PM-manifest registration was deferred
  from asset registration to skill creation because the canonical skill did not yet
  exist; resolved in p03-t01 (added to the manifest, bundle script, and consuming
  tests).
- **p04-t01 docs accuracy:** Corrected drifted docs — the `oat pjm init` flag is
  `--repo-root` (not `--reference-root`), and `oat decision migrate` applies by
  default (docs had claimed dry-run-default; the CLI is correct, the docs were fixed).
- **p03-t02:** `oat-project-summary` and `oat-project-pr-final` were audited and left
  unedited — they reference no `.oat/repo` operational paths and create no decision
  records today, so editing them would have forced unnecessary version bumps.

No design artifact is left stale; all deltas are recorded in `implementation.md`.

## Verification

Per-phase focused Vitest + type-check + targeted lint throughout, then a full-suite
gate at p04-t02: `pnpm test` (1907 tests, 0 failures), `pnpm lint`, `pnpm type-check`,
`pnpm build`, `pnpm build:docs`, and `pnpm release:validate` (all five public packages
at 0.1.31) — all passing. Each phase passed an independent code review (p04 after one
docs-accuracy fix cycle); the final holistic review passed with no Critical/Important
findings.

## Follow-up Items

- **Migrate this repo's own `.oat/repo/` with the fixed tooling.** The
  open-agent-toolkit repo still uses the legacy flat `reference/` layout (legacy
  `decision-record.md`, `reference/backlog`, `reference/current-state.md`). A
  dogfood run (worktree `pjm-refresh-2`) validated the flow end-to-end but had to
  hand-roll the decision mapping because `oat decision migrate`'s parser was broken
  — now fixed in p-rev2 (`prev2-t03`). Redo the migration with the working tool
  (it now parses the real `### ADR/DR` format, 0→21 sections) as a deliberate,
  separate change once PR #118 merges.
- **Broaden decision promotion to user-scoped/quick-mode projects (optional).**
  The Key Decisions → `DR-` promotion shipped in `oat-project-summary` (PR #118
  review suggestion #2) is gated on the PJM pack being installed and on a
  `## Key Decisions` section existing. A future enhancement could surface
  promotion in additional lifecycle entry points or for quick-mode projects that
  skip a full summary; not required for the core loop, which is now closed.
