---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-06-24
oat_generated: true
oat_summary_last_task: prev3-t05
oat_summary_revision_count: 3
oat_summary_includes_revisions: [p-rev1, p-rev2, p-rev3]
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

- **Post-PR hardening.** Follow-up review and dogfood rounds renamed the decision
  index verb to `regenerate-index`, promoted project Key Decisions into canonical
  `DR-` records from `oat-project-summary`, finalized uppercase `DR-`/`BL-` IDs
  with 30-character word-boundary slugs, fixed real-world decision migration
  parsing, made `pjm migrate --apply` atomic, made index regeneration content-
  idempotent, stripped template frontmatter during migration, handled absent
  legacy decision files cleanly, allowed top-level `.oat/repo/README.md`, and
  corrected the migration prompt's sequence and version-gate guidance.

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
- **p03-t02 → p-rev1:** `oat-project-summary` and `oat-project-pr-final` were first
  audited and left unedited because neither wrote decisions at that point. PR
  feedback later made the missing Key Decisions promotion a real product gap, so
  p-rev1 added PJM-gated, idempotent promotion from `oat-project-summary` into
  `reference/decisions/`; `oat-project-pr-final` still delegates through summary
  refresh rather than creating decisions directly.

No design artifact is left stale; all deltas are recorded in `implementation.md`.

## Revision History

- **p04-t04:** Final-review v2 found that the bundled migration prompt still taught
  a plural decision-index marker and 4-column table. The asset was corrected to the
  CLI's singular `<!-- OAT DECISION-INDEX -->` marker pair and 5-column `Legacy`
  header, with bundle-consistency coverage pinned to the live renderer.
- **p-rev1:** PR feedback aligned the decision index rebuild verb with backlog
  (`oat decision regenerate-index`) and added PJM-gated Key Decisions promotion from
  `oat-project-summary`, deduped by exact slug after stripping the fixed
  `DR-<6 digits>-` prefix.
- **p-rev2:** Dogfooding the real repo migration surfaced uppercase/slug contract
  propagation gaps and tooling bugs. The fix set finalized uppercase IDs, fixed the
  real ADR/DR parser shape, made `pjm migrate --apply` atomic before moves, widened
  doctor template-frontmatter checks, and made both index regenerators content-
  idempotent.
- **p-rev3:** Corrected dogfood found migration polish gaps. The final pass strips
  template markers from migrated backlog records, excludes trailing ADR template
  boilerplate from the last decision record, turns absent legacy decision files into
  a clean no-op, allows top-level `.oat/repo/README.md`, and updates the migration
  prompt sequence to avoid stale pinned-SHA/tooling mistakes.
- **Range/doc-gap cleanup:** A holistic range review over `619b9234..HEAD` passed
  after the stale brainstorm backlog handoff wording was corrected. A final
  documentation-gap pass also aligned backlog template/review examples and the
  generated completed-backlog scaffold with `BL-YYMMDD-slug`.

## Verification

Per-phase focused Vitest + type-check + targeted lint throughout, then a full-suite
gate at p04-t02: `pnpm test` (1907 tests, 0 failures), `pnpm lint`, `pnpm type-check`,
`pnpm build`, `pnpm build:docs`, and `pnpm release:validate` (all five public packages
at 0.1.31) — all passing. Each phase passed an independent code review (p04 after one
docs-accuracy fix cycle); the final holistic review passed with no Critical/Important
findings. After the final documentation-gap cleanup, the focused CLI/validation suite
passed (88 tests), `pnpm release:validate` passed, and push hooks passed version bump
checks, skill version validation, type-check, lint, and format.

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
