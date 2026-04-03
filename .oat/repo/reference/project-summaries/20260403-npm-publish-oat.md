---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-02
oat_generated: true
oat_summary_last_task: p04-t01
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: npm-publish-oat

## Overview

This project replaced OAT's temporary public npm contract under
`@tkstang/oat-*` with a permanent `@open-agent-toolkit/*` namespace across the
existing four-package release surface. The work was driven by the need to ship
under a cleaner long-term scope without redesigning the repo's lockstep
release model or blocking on full trusted-publishing readiness.

## What Was Implemented

The implementation delivered the namespace cutover in four phases. Phase 1
made the canonical public contract authoritative in the CLI release registry,
renamed all four publishable package manifests, updated runtime imports in the
published docs packages, regenerated the lockfile, and kept release validation
driven by the contract layer. Phase 2 aligned the first-party docs app, the
checked-in Fumadocs scaffold templates, CLI docs-migration fixtures, package
READMEs, contributor guidance, and consumer install docs so repo-owned package
references consistently emitted `@open-agent-toolkit/*`.

Phase 3 updated the live and dry-run GitHub release workflows to the new scope
and refreshed maintainer-facing release guidance plus repo knowledge so the
first release is documented as a manual bootstrap followed by GitHub
trusted-publishing steady state. After final review, Phase 4 added the missing
lockstep version bump to `0.0.10` across `@open-agent-toolkit/cli`,
`@open-agent-toolkit/docs-config`, `@open-agent-toolkit/docs-theme`, and
`@open-agent-toolkit/docs-transforms`, restoring a passing
`pnpm release:validate`.

## Key Decisions

- Keep the public release surface bounded to the existing four packages rather
  than introducing new package shapes during the scope change.
- Treat the cutover as a hard replacement from `@tkstang/oat-*` to
  `@open-agent-toolkit/*` instead of maintaining a dual-scope migration
  bridge.
- Preserve lockstep versioning and contract-driven release validation rather
  than weakening the existing release policy for the rename.
- Keep the CLI as the primary public entry point and position the docs
  libraries as supported but secondary tooling surfaces.
- Support a one-time manual first publish while retaining GitHub workflow
  alignment for the intended trusted-publishing steady state.

## Design Deltas

The main implementation deviation was moving `apps/oat-docs/package.json` into
Phase 1 even though the original plan grouped docs-app work into Phase 2. That
change was necessary because contract tests and `pnpm install` both depended on
the docs app consuming the renamed workspace package names before the manifest
and lockfile work could complete.

The other notable delta was review-driven rather than design-driven: final code
review surfaced that the namespace rename counted as shipped functionality, so
the public package versions also needed a lockstep bump. That produced `p04-t01`
as a focused follow-up task after the initial implementation phases were done.

## Notable Challenges

The namespace change touched more than package manifests. It also affected the
docs app, scaffold templates, migration fixtures, README/install surfaces,
release workflows, and repo knowledge files, so the main challenge was keeping
all consumer-visible references synchronized through one cutover.

There was also a temporary verification false alarm during final review when
concurrent verification runs raced on `packages/cli/assets` and produced noisy
CLI asset-bundling failures. Serialized verification showed the underlying
builds were sound, which kept the project from taking on an unnecessary build
system fix.

The real end-of-project issue was the missing lockstep version bump. The repo's
publishable-package guardrail requires `pnpm release:validate` to pass, and the
manual final review correctly caught that the package rename had changed
shipped functionality without advancing package versions.

## Integration Notes

The release contract for public packages now centers on
`packages/cli/src/release/public-package-contract.ts`, and the repo's release
readiness gate still depends on `pnpm release:validate`. Future publishable
package changes in `packages/cli`, `packages/docs-config`,
`packages/docs-theme`, or `packages/docs-transforms` must continue to respect
the lockstep version policy.

The docs scaffolding path depends on the checked-in templates under
`.oat/templates/docs-app-fuma`, the first-party docs app under `apps/oat-docs`,
and the corresponding CLI tests staying aligned to the same public package
contract. The maintainer docs and refreshed repo knowledge now assume a manual
first publish for the new scope, followed by trusted-publishing enablement as
the desired steady state.
