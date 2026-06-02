---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-06-01
oat_generated: true
oat_summary_last_task: p07-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: pjm-init

## Overview

After installing the `project-management` tool pack, a repo got the template _sources_
but nothing instantiated the working repo-reference surface under `.oat/repo/reference/`,
and `decision-record.md` did not exist as a template at all (gap observed in `vox/voz`).
This project closed that gap by making repo-reference initialization a first-class,
discoverable step distinct from pack installation.

## What Was Implemented

- **`oat pjm init` command** — a new top-level `oat pjm` namespace with an `init`
  subcommand that idempotently, non-destructively scaffolds the full repo-reference
  surface: `current-state.md`, `roadmap.md`, `decision-record.md`, and the file-backed
  `backlog/` tree (`index.md`, `completed.md`, `items/`, `archived/`) under
  `.oat/repo/reference/`. Supports `--reference-root` for custom targets and `--json`
  for machine-readable success/error contracts (exit code 1 preserved on failure).
- **`initializeRepoReference()` scaffolder** — returns `{ referenceRoot, created[], skipped[] }`.
  Resolves flat reference docs from repo-local `.oat/templates/` first, then bundled CLI
  assets; strips template frontmatter on instantiation; writes only missing files. Backlog
  scaffolding is delegated to the existing `initializeBacklog()` (reused as-is, not
  refactored), with the void-return reporting gap solved by pre-detecting the known backlog
  paths via `access` before delegating, then classifying created vs skipped.
- **First-class templates** — `current-state.md` and `decision-record.md` promoted to
  first-class PM-pack template sources alongside `roadmap.md` and `backlog-item.md`, wired
  into the `PROJECT_MANAGEMENT_TEMPLATES` manifest, the `bundle-assets.sh` copy loop, and
  installer/bundle-consistency tests.
- **Documentation (first-class)** — `tool-packs.md` gained an "Install vs. initialize"
  section and the command surface; `cli-reference.md` added the `oat pjm` row;
  `config-and-local-state.md` cross-links `oat backlog init`; `oat-directory-structure.md`
  documents the canonical repo-reference surface. ADR-020 and the repo `current-state.md`
  record the decision internally.
- **Release** — five public packages bumped in lockstep (final `0.1.18` after the pre-PR
  rebase); `pnpm release:validate` and `release:check-versions` pass.

## Key Decisions

- **Dedicated `oat pjm init` instead of auto-instantiating during pack install** (ADR-020):
  pack install stays additive/non-destructive; a separate, discoverable command materializes
  working docs. This makes install-vs-initialize an explicit, documented lifecycle.
- **Reuse `initializeBacklog()` rather than re-implement backlog semantics.** Because it
  returns `void`, the scaffolder pre-detects known backlog paths before delegating to derive
  accurate created/skipped reporting — avoiding a risky refactor of shared backlog logic.
- **Template-source precedence (repo-local → bundled fallback)** with frontmatter stripping,
  mirroring existing template-instantiation conventions.

## Design Deltas

- **`I1` (final review v4) — stale base / merge readiness:** The branch was cut from an
  older base and fell behind `origin/main`; the shipped PJM code was accepted as source of
  truth and the lifecycle alignment was a pre-PR **rebase onto current `main`** rather than a
  code change. Resolved 2026-06-01: rebased onto `origin/main` (advanced to `0.1.17`), three
  Phase 5–6 "restore from main" commits auto-dropped as already-upstream (churn collapsed),
  public lockstep finalized at `0.1.18`, `index.md` regenerated with zero drift; release gates
  - 1766 CLI tests green. The version-bump check is now genuinely tip-relative.

## Notable Challenges

- **`initializeBacklog()` void-return contract gap:** it only writes missing files and
  returns nothing, so it cannot report what it created vs skipped. Solved with a pre-detect
  strategy (record existing backlog paths via `access` before delegating) for deterministic,
  idempotent reporting without changing shared backlog code.
- **Stale-base review finding:** the most material issue surfaced by final review was process,
  not code — caught by an independent `main..HEAD`-scoped review after a base-relative
  auto-review had passed clean. Resolved by the pre-PR rebase.

## Follow-up Items

- **`m2` (deferred):** `pjm` group help ("Manage project-management repo reference docs") vs
  the `cli-reference.md` row ("Initialize the project-management repo-reference surface…")
  use different verbs. Intentional register split, no user impact; revisit only on a docs-parity pass.
- **Legacy backlog references (out of scope, flagged):** non-canonical skill copies
  (`.agents/skills/update-repo-reference`, `review-backlog`, `oat-idea-summarize`) still
  reference the retired flat `backlog.md`/`deferred-phases.md` structure; worth a separate
  cleanup item (and would trip the skill-version-bump policy).

## Associated Issues

None.
