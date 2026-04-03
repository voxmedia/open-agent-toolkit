---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-03
oat_generated: true
oat_summary_last_task: p04-t02
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: docs-readability-reorg

## Overview

This project reorganized the OAT docs and README surfaces to make the toolkit easier for new users to understand without removing technical depth. The main problem was not weak content, but that provider sync, workflows, docs tooling, CLI utilities, and reference material were presented too early as one broad user-facing bucket.

## What Was Implemented

The docs were restructured around canonical top-level adoption lanes: Provider Sync, Agentic Workflows, Docs Tooling, CLI Utilities, Reference, and Contributing. The homepage was kept as a calm overview page, while `/quickstart` was rewritten as the single Start Here decision surface so overview and routing no longer compete with each other.

The detailed guide-owned content was moved into the new canonical sections. Provider sync pages now live under `/provider-sync/*`; workflow, ideas, and skills content now live under `/workflows/*`; docs tooling content now lives under `/docs-tooling/*`; and CLI utility material now lives under `/cli-utilities/*`. `CLI Reference` was rewritten as a shallow command map under `Reference` instead of staying mixed into guide material.

The highest-density docs pages were given lighter-weight framing before their full technical detail. This included Quick Look or orientation blocks on lifecycle, provider-sync commands, manifest and drift, tool packs, state machine, repo analysis, bootstrap, and docs commands. The result preserves the underlying detail while making the first screen more approachable.

The repository README surface was also realigned. The root `README.md` became a concise monorepo overview with links to the deployed docs, and the package/tooling READMEs were tightened into package-local quick-start documents instead of acting as miniature docs sites. After review, the project also removed obsolete docs-contract wording around `overview.md` and cleaned up stale empty legacy guide directories.

## Key Decisions

- Keep `/` as the overview page and `/quickstart` as the only path-selection page. This preserves a short explanation of what OAT is and why it exists before asking users to choose an adoption lane.
- Replace the broad `User Guide` concept with adoption-lane sections that match how OAT is actually used: Provider Sync, Agentic Workflows, Docs Tooling, and CLI Utilities.
- Preserve documentation coverage. The project explicitly treated this as a reorganization and readability pass, not a documentation-reduction effort.
- Move dense documentation to the docs site and keep README files concise. The root README became a repo overview, and package READMEs became package-local orientation surfaces with links outward.
- Keep compatibility-oriented guide material where useful instead of forcing hard removals during the route migration.

## Design Deltas

The imported reference plan mentioned a canonical `/provider-sync/getting-started` page, but the implemented structure routes users through `cli-utilities/bootstrap` for the onboarding flow instead. This was judged acceptable during implementation and later deferred during review because the current flow works and the normalized implementation plan did not require a separate page.

## Tradeoffs Made

The project accepted some transitional compatibility structure rather than insisting on immediate hard-cut removals. In practice this meant keeping the remaining guide compatibility material while moving substantive content ownership to the new canonical sections.

The project also chose progressive disclosure over content compression. Dense pages were not simplified by deleting detail; instead, they gained framing and clearer routing. That kept the documentation technically complete at the cost of leaving some pages still quite deep once readers move past the intro layer.

## Integration Notes

The docs site now acts more clearly as the canonical home for deep documentation, while README files are intentionally lighter-weight entrypoints. Future work touching onboarding or package orientation should preserve that split rather than re-expanding README files into dense operational docs.

The docs contract no longer carries the obsolete `overview.md` deprecation note, so the current pattern of `index.md` section landings plus descriptive `overview.md` leaf pages is no longer in tension with the reference wording.

## Follow-up Items

- Deferred review item: no dedicated `/provider-sync/getting-started` page was added. The current bootstrap routing is acceptable, but this remains a possible future cleanup if the team wants tighter alignment between the imported reference plan and the final docs shape.
