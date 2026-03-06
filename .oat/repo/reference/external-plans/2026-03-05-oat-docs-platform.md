# Prioritize Docs Platform: `oat docs` + MkDocs Bootstrap + OAT Dogfood

## Summary

Make the docs feature family the top-priority initiative and execute it in three phases under a single design:

1. Build a first-class `oat docs` CLI family, starting with deterministic bootstrap and nav generation.
2. Dogfood it on this repository by scaffolding an OAT docs app and migrating current markdown docs into it.
3. Add `oat-docs-analyze` and `oat-docs-apply` to mirror the agent-instructions analyze/apply workflow on top of the new docs structure.

The governing model is: CLI for deterministic operations, skills for analysis and editorial judgment. `MkDocs + Material` is the standard stack. `index.md` becomes the required directory entrypoint; `overview.md` is deprecated and converted.

## Key Changes

### CLI surface and defaults

- Add a new top-level command group: `oat docs`.
- Implement `oat docs init` in v1.
- Implement `oat docs nav sync` in v1 so navigation can be regenerated from directory indexes.
- Reserve `oat docs analyze` and `oat docs apply` as later phase entrypoints that wrap the docs skill workflow and shared deterministic helpers.

`oat docs init` should be interactive in TTY mode and accept non-interactive flags:
- `--app-name <name>`
- `--target-dir <path>`
- `--lint <markdownlint|none>`
- `--format <prettier|none>`
- `--yes`

Default placement rules:
- Monorepo/workspace repo: scaffold to `apps/<app-name>`
- Single-package repo: scaffold to `<app-name>/` at repo root
- Single-package repos must not be forced to become a workspace

Repo-shape detection should use existing signals such as `pnpm-workspace.yaml`, package-manager workspaces, and/or existing `apps/` + `packages/` layout.

### Scaffolded docs app contract

The generated app should include:
- `mkdocs.yml`
- `package.json` with `docs:dev`, `docs:build`, `docs:lint`, `docs:format`, `docs:format:check`, `docs:setup`
- `requirements.txt`
- `setup-docs.sh`
- `docs/index.md`
- `docs/getting-started.md`
- `docs/contributing.md`

The default MkDocs stack should mirror the Honeycomb setup closely:
- Material theme
- search
- git revision date
- macros
- glightbox
- callouts
- Material-compatible markdown extensions already proven in Honeycomb
- `navigation.indexes` and code-copy enabled

`docs/contributing.md` must explicitly document every enabled plugin/extension, what it does, and a short usage example or reference link so agents know what features are available.

### `index.md` standard and nav generation

Adopt a single directory convention:
- Every docs directory must contain `index.md`
- `overview.md` is replaced with `index.md`
- Even single-file directories still use `index.md` as the entrypoint

`index.md` remains a normal prose page, but must contain one reserved section:
- `## Contents`

`oat docs nav sync` should parse only the `## Contents` section to build/update `mkdocs.yml` navigation. Everything else in the file remains editorial and unconstrained.

Required behavior for `## Contents`:
- Map sibling markdown files and immediate child directories
- Briefly describe what each linked file/subtree covers
- Serve as the local discovery map for both humans and agents

### Skills and migration flow

Phase 2/3 should add:
- `oat-docs-analyze`
- `oat-docs-apply`

These should mirror the agent-instructions workflow:
- Analyze produces a structured artifact with severity-rated findings
- Apply presents recommendations, gets approval, makes changes on a branch, and supports PR creation
- Delta mode should be supported using tracked commit state, analogous to agent-instructions analysis

Docs-specific scope:
- Existing markdown docs trees
- MkDocs sites
- `README.md`-style docs surfaces when no docs app exists
- Structural conformance to the `index.md` contract
- Coverage, drift, staleness, verbosity, and navigation/index gaps

Use `oat-docs-analyze` + `oat-docs-apply` for legacy conversion work rather than adding a separate migration command. If needed, they can call CLI helpers like `oat docs nav sync`.

## OAT Dogfood Plan

### Phase 1: Foundation

- Promote the backlog docs initiative to the top active priority and rewrite it around the new `oat docs` family instead of “MkDocs later”.
- Implement `oat docs init` and `oat docs nav sync`.
- Add templates/assets for the docs app scaffold and plugin-aware contributing guide.
- Add docs standards/reference content for the `index.md` + `## Contents` contract.

### Phase 2: Dogfood on this repo

- Scaffold an OAT docs app inside this repo as a monorepo app.
- Migrate current `docs/oat/**` content into the new app’s `docs/` tree.
- Flatten the OAT docs site so the app root is the documentation root; do not preserve a redundant `oat/` directory inside the site.
- Convert remaining `overview.md` pages to `index.md`.
- Add `## Contents` sections where missing.
- Regenerate nav from the new index contract.
- Update root links and references to point to the new docs app paths.

### Phase 3: Analyze/apply

- Build `oat-docs-analyze` from the agent-instructions analysis pattern.
- Build `oat-docs-apply` from the agent-instructions apply pattern.
- Dogfood analyze/apply against the newly migrated OAT docs app.
- Use findings from dogfooding to refine templates, defaults, and the index contract before broader rollout.

## Test Plan

- Unit tests for repo-shape detection and default target-directory selection.
- Unit tests for interactive prompt flows and non-interactive flag behavior.
- Scaffold integration test for a monorepo fixture.
- Scaffold integration test for a single-package repo fixture with no workspace.
- Snapshot/help-output tests for the new `oat docs` command family.
- Nav-sync tests covering:
  - valid `## Contents` parsing
  - freeform prose preserved outside the reserved section
  - nested directory trees
  - missing or malformed `## Contents` sections reported clearly
- Analyze/apply tests covering:
  - full vs delta mode
  - finding severity output
  - apply approval/skip flow
  - branch/PR summary generation
  - legacy `overview.md` to `index.md` conversion recommendations

## Assumptions and defaults

- “MakeDocs” is treated as `MkDocs + Material`.
- The default docs stack is intentionally opinionated; custom plugin selection is deferred.
- GitHub Pages/CI scaffolding is deferred from MVP unless it falls out naturally from the template work.
- Theme customization beyond the default curated stack is deferred.
- The single source of truth for navigation is the docs tree plus each directory’s `index.md` `## Contents` section, not hand-maintained `mkdocs.yml` entries.
- Existing Honeycomb docs are the reference implementation to mirror, but the new OAT standard replaces `overview.md` with `index.md`.
