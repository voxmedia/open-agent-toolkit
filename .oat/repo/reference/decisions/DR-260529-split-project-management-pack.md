---
id: DR-260529-split-project-management-pack
title: Split project-management pack install from repo-reference instantiation
  via `oat pjm init`
date: 2026-05-29
status: accepted
legacy_id: ADR-020
---

### ADR-020: Split project-management pack install from repo-reference instantiation via `oat pjm init`

- **Date:** 2026-05-29
- **Status:** accepted
- **Drivers:** Installing the `project-management` tool pack should make skills and template sources available without overwriting or materializing a repo's working reference documents. Users still need a discoverable, repeatable way to instantiate `.oat/repo/reference/` after installation.
- **Related:**
  - `.oat/projects/shared/pjm-init/`
  - `packages/cli/src/commands/pjm/index.ts`
  - `packages/cli/src/commands/pjm/init.ts`
  - `apps/oat-docs/docs/cli-utilities/tool-packs.md`
  - `apps/oat-docs/docs/reference/oat-directory-structure.md`

#### Context

The project-management pack already installs `oat-pjm-*` skills and template sources, but that install step does not create the live repo-reference documents. Before `pjm-init`, users had to know which lower-level files to create or rely on existing repository state. The workflow needed a clear separation between installing reusable assets and instantiating working repo-local documentation.

#### Options Considered

1. **Have `oat init tools project-management` create `.oat/repo/reference/` automatically.** Rejected because pack install should stay additive and non-destructive; materializing working docs during install could surprise repos that already curate reference files.
2. **Tell users to run lower-level backlog/template commands manually.** Rejected because it leaves the canonical repo-reference surface under-documented and easy to instantiate incompletely.
3. **Add a dedicated `oat pjm init` command.** Chosen. It gives project-management a first-class initialize step while preserving install as template/skill provisioning.

#### Decision

`oat pjm init` is the canonical instantiate step for the project-management repo-reference surface:

- At the time of this decision, the command created the now-preserved
  `.oat/repo/reference/legacy-pjm/current-state.md`, `roadmap.md`, and
  `backlog/` surfaces plus the monolithic decision record that was later
  migrated into `.oat/repo/reference/decisions/`.
- Flat reference docs resolve from repo-local `.oat/templates/` first, then bundled CLI assets.
- Template frontmatter is stripped from instantiated docs.
- Existing files are never overwritten; reruns report created/skipped paths.
- Backlog scaffolding delegates to the existing `initializeBacklog()` path rather than duplicating backlog semantics.
- `--reference-root` supports custom targets, and `--json` preserves machine-readable success/error contracts.

The project-management pack now treats `current-state.md` and `decision-record.md` as first-class template sources alongside `roadmap.md` and `backlog-item.md`.

#### Consequences

- Positive:
  - Clear lifecycle: install the pack to get reusable skills/templates; run `oat pjm init` to instantiate working repo-reference docs.
  - Non-destructive behavior protects curated reference docs.
  - Fresh repos can create the full repo-reference surface from bundled assets.
  - Docs can point users to one command instead of a sequence of lower-level file operations.
- Trade-offs:
  - Project-management now has a dedicated `oat pjm` CLI namespace to maintain.
  - Template source updates and instantiated reference docs remain separate concepts that docs must keep explaining.

#### Follow-ups

- Watch dogfood for whether `oat pjm init` should gain a safe reset/force path. Do not add one until there is a concrete overwrite convention for curated repo-reference docs.
- Consider whether other tool packs need the same explicit install-vs-initialize lifecycle split.

---
