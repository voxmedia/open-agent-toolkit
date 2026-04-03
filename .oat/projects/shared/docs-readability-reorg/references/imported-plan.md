---
title: OAT Docs Readability Reorganization
source: codex
date: 2026-04-03
---

# OAT Docs Readability Reorganization

## Goal

Reorganize OAT documentation so new users can understand what OAT is, choose the right adoption path quickly, and reach dense detail only when they need it.

This work is intentionally a reorganization and readability improvement, not a documentation-reduction effort.

## Guardrails

- Do not remove documentation or information wholesale as part of this reorganization.
- Do not heavily revise or rewrite dense technical content unless the change is needed for clarity and has clear behavioral equivalence.
- Any proposed removal of content, substantive narrowing of coverage, or major revision beyond restructuring/progressive disclosure requires explicit user approval.
- Prefer moving, reframing, and linking over deleting.

## Desired Information Architecture

- `/` remains the overview page.
- `/quickstart` becomes the canonical Start Here decision page.
- `User Guide` is retired as a primary IA concept.
- Canonical top-level sections become:
  - `/provider-sync`
  - `/workflows`
  - `/docs-tooling`
  - `/cli-utilities`
  - `/reference`
  - `/contributing`

## Key Decisions

### Homepage and Start Here

- Keep `/` as a concise overview page that explains:
  - what OAT is
  - why it exists
  - the three capability layers
  - the source-of-truth hierarchy
- Add strong CTA links from `/` to `/quickstart` near the top and bottom.
- Keep the actual path-selection logic on `/quickstart`, not on `/`.

### Section Model

Each top-level section should use the same landing-page template:

- What this section is
- Who it is for
- Start here
- Common tasks
- Go deeper

Each dense page should use progressive disclosure:

- short overview intro
- Quick Look block
- detailed reference content below

## Scope of Reorganization

### Provider Sync

Canonical pages:

- `/provider-sync`
- `/provider-sync/overview`
- `/provider-sync/getting-started`
- `/provider-sync/scope-and-surface`
- `/provider-sync/commands`
- `/provider-sync/providers`
- `/provider-sync/manifest-and-drift`
- `/provider-sync/config`

### Agentic Workflows

Canonical pages:

- `/workflows`
- `/workflows/overview`
- `/workflows/skills`
- `/workflows/ideas`
- `/workflows/ideas/lifecycle`
- `/workflows/projects`
- `/workflows/projects/lifecycle`
- `/workflows/projects/hill-checkpoints`
- `/workflows/projects/artifacts`
- `/workflows/projects/state-machine`
- `/workflows/projects/reviews`
- `/workflows/projects/pr-flow`
- `/workflows/projects/repo-analysis`

### Docs Tooling

Canonical pages:

- `/docs-tooling`
- `/docs-tooling/overview`
- `/docs-tooling/add-docs-to-a-repo`
- `/docs-tooling/commands`
- `/docs-tooling/workflows`

### CLI Utilities

Canonical pages:

- `/cli-utilities`
- `/cli-utilities/overview`
- `/cli-utilities/bootstrap`
- `/cli-utilities/tool-packs`
- `/cli-utilities/configuration`
- `/cli-utilities/config-and-local-state`

### Reference and Contributing

- Keep `Contributing` structurally intact.
- Keep `Reference` as durable facts/contracts.
- Move CLI Reference under `/reference/cli-reference`.

## README Strategy

Dense documentation belongs on the docs site, not in README files.

### Root README

Rewrite the repo `README.md` so it becomes:

- concise monorepo overview
- brief explanation of OAT and its major capability layers
- one high-level diagram at most
- very short repo-development quickstart
- clear links to the deployed docs site and key section entrypoints

Remove or sharply compress:

- long mode-by-mode walkthroughs
- dense command inventories
- detailed config/archive explanations
- workflow-lane deep detail better suited to docs pages

### Package READMEs

Each package should have a package-specific README that acts as a quick-start/orientation document for that package.

- `packages/cli/README.md` should focus on install, a few representative commands, and links to full docs.
- docs packages should stay concise and package-local.
- tooling READMEs should follow the same principle.

## Implementation Phases

### Phase 1: Establish IA and project scaffolding

- Rebase/update the worktree against the latest `origin/main`.
- Ensure this work is done on a named branch, not detached `HEAD`.
- Import this plan into a new OAT import-mode project named `docs-readability-reorg`.
- Backfill `discovery.md` with the full reasoning and constraints behind the reorganization.

### Phase 2: Restructure docs navigation and routes

- Update top-level navigation to the new section model.
- Rewrite `/` and `/quickstart` to enforce overview-vs-routing separation.
- Move existing guide content into the new canonical routes.
- Retire `/guide/concepts` as a canonical destination.

### Phase 3: Add progressive disclosure

- Add Quick Look blocks to the highest-density pages first:
  - lifecycle
  - provider-sync commands
  - manifest and drift
  - tool packs
  - state machine
  - repo analysis
  - bootstrap
  - docs commands

### Phase 4: Reframe cross-cutting surfaces

- Rework `Skills` for task-oriented discovery.
- Extract utility command detail from CLI Reference into CLI Utilities.
- Rewrite the root README and tighten package READMEs.

### Phase 5: Audit

- Run a full cross-link audit.
- Confirm README links point to the deployed docs and canonical docs sections.
- Confirm no documentation was removed or materially narrowed without approval.

## Success Criteria

- New users can understand OAT from `/` and choose a path from `/quickstart`.
- The docs no longer present provider sync, workflows, docs tooling, and CLI utilities as one undifferentiated user bucket.
- Dense pages have clear overview framing before detailed content.
- CLI Reference is shallow and points outward to owning sections.
- Root and package READMEs are concise and link to fuller docs.
- Reorganization preserves information rather than deleting it.
