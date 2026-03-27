---
oat_status: complete
oat_ready_for: oat-project-spec
oat_blockers: []
oat_last_updated: 2026-03-24
oat_generated: false
---

# Discovery: npm-publish

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Add public npm publishing for the OAT packages in this monorepo, including the
CLI and the reusable docs libraries. The current working direction is to publish
separate lockstep packages under the Vox Media npm scope, with candidate names
such as `@tkstang/oat-cli`, `@tkstang/oat-docs-config`,
`@tkstang/oat-docs-theme`, and `@tkstang/oat-docs-transforms`.

Discovery should clarify the public package surface, release/versioning model,
consumer expectations, and the boundaries of the first publishing milestone.

## Clarifying Questions

### Question 1: First-release scope

**Q:** Should the first release stay bounded to publishing the four existing
packages in lockstep, or also include an umbrella/meta package or broader
package-surface cleanup?
**A:** The first release should stay bounded to the four existing packages in
lockstep. No umbrella/meta package is needed for the initial release.
**Decision:** Discovery and follow-on work should optimize for a clean public
release of the current four-package surface, while deferring larger packaging
changes and API reshaping.

### Question 2: Public package names

**Q:** Which public package names should define the first-release contract?
**A:** Use `@tkstang/oat-cli`, `@tkstang/oat-docs-config`,
`@tkstang/oat-docs-theme`, and `@tkstang/oat-docs-transforms`.
**Decision:** Discovery should treat the public package rename from `@oat/*` to
`@tkstang/oat-*` as part of the required release work and update internal
references, generated templates, and consumer documentation accordingly.

### Question 3: Versioning model

**Q:** Should the first public release use lockstep versioning across all four
packages or independent per-package versions?
**A:** Use lockstep versioning for now.
**Decision:** Discovery should optimize for a coordinated multi-package release
model rather than independent package release management.

### Question 4: Consumer surface priority

**Q:** Should the docs packages be treated as first-class public surfaces in the
same way as the CLI, or as supported but secondary library/tooling packages?
**A:** The CLI should be the primary public surface. The docs packages should be
public and supported, but positioned as secondary library/tooling packages for
docs-app consumers.
**Decision:** Discovery should assume release quality and public documentation
for all four packages, while centering external messaging and install guidance
on the CLI as the main entry point.

## Solution Space

Discovery identified two viable release approaches for the first public launch.
The recommended path is to keep release operations simple and aligned with the
repo's current lockstep assumptions.

### Approach 1: Simple coordinated release workflow _(Recommended)_

**Description:** Keep the existing monorepo package boundaries, rename the
public packages to `@tkstang/oat-*`, and publish all four packages together
through one coordinated GitHub Actions release flow.
**When this is the right choice:** Best when the first goal is a bounded public
launch, the repo already assumes lockstep versions, and the team wants low
release-process overhead.
**Tradeoffs:** Less flexible if the packages later need independent versioning
or more formal release orchestration.

### Approach 2: Managed multi-package release system

**Description:** Introduce a more structured release-management layer up front,
such as release PR orchestration and more formal version automation, while also
publishing the four packages.
**When this is the right choice:** Better when frequent public releases,
independent package evolution, or automated release bookkeeping are immediate
requirements.
**Tradeoffs:** More process and tooling complexity in the very first public
release.

### Chosen Direction

**Approach:** Simple coordinated release workflow
**Rationale:** It matches the current repository shape, preserves the bounded
first-release scope, and avoids introducing independent-package release
machinery before the public package surface is validated.
**User validated:** Yes

## Options Considered

### Option A: Publish only the CLI first

**Description:** Release `@tkstang/oat-cli` now and defer the docs libraries to
later.

**Pros:**

- Smaller first-release surface
- Fewer package metadata and release concerns initially

**Cons:**

- Conflicts with the requirement to publish the docs packages
- Delays public validation of the reusable docs toolkit

**Chosen:** Neither

**Summary:** Rejected because the agreed goal is to publish both the CLI and the
docs libraries in the first public release.

### Option B: Publish the current four packages together in lockstep

**Description:** Release the CLI and the three docs packages together under the
`@tkstang/oat-*` namespace.

**Pros:**

- Matches the agreed public package surface
- Aligns with current docs scaffolding assumptions and release simplicity goals

**Cons:**

- Requires coordinated manifest, docs, and workflow updates across multiple
  packages

**Chosen:** B

**Summary:** This is the selected direction because it satisfies the release
goal while keeping versioning and release coordination simple.

## Key Decisions

1. **First-release boundary:** Publish the four existing packages in lockstep
   for the initial release, rather than introducing an umbrella package or
   larger package-surface redesign.
2. **Public naming:** The published package surface should use the Vox Media npm
   scope with the `@tkstang/oat-*` naming pattern.
3. **Versioning model:** The first public release should use lockstep versions
   across the four published packages.
4. **Consumer hierarchy:** `@tkstang/oat-cli` is the primary consumer entry
   point; the docs packages are public and supported, but secondary library
   surfaces.

## Constraints

- The release model should stay simple enough to support a coordinated first
  public launch without independent package version orchestration.
- The work must preserve the current four-package shape rather than expanding
  into a larger package redesign.
- Public package naming must move to the Vox Media npm scope.

## Success Criteria

- The repo can publish the four target packages publicly under the
  `@tkstang/oat-*` namespace using a lockstep release model.
- External consumers can clearly understand that the CLI is the main entry
  point and that the docs packages are supported libraries for docs-app usage.
- The release path depends on GitHub as the source of truth for coordinated
  publishing rather than ad hoc local publishing.

## Out of Scope

- Introduce an umbrella/meta package such as `@voxmedia/oat` in the first
  release.
- Perform broader package-surface redesign beyond what is needed to publish the
  current four-package shape publicly.

## Deferred Ideas

{Ideas that came up during discovery but are intentionally out of scope for now}

- Umbrella/meta package for convenience installs - deferred to avoid expanding
  the first-release scope before the public multi-package surface is validated.

## Open Questions

- **Ownership and permissions:** Which npm ownership model will Vox Media use
  for the `@voxmedia` scope, and will publishing rely on an npm token or
  GitHub/npm trusted publishing?
- **Consumer documentation shape:** How much package-specific README and docs
  surface should each published docs library carry versus relying on the main
  repo docs?
- **Release trigger UX:** Should releases be tag-driven, release-PR-driven, or
  another coordinated GitHub workflow pattern within the chosen simple release
  model?

## Assumptions

{Assumptions we're making that need validation}

- Vox Media can provision and grant publish access for the `@voxmedia` npm
  scope before release work is completed.
- The current docs scaffolding assumption that OAT packages share one version is
  acceptable for the first public release.

## Risks

- **Package rename drift:** Renaming from `@oat/*` to `@tkstang/oat-*` can
  leave stale internal references in manifests, templates, and docs.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation Ideas:** Audit workspace references, generated templates, and
    consumer docs as one coordinated change.
- **Release permissions blocker:** npm scope ownership or GitHub publishing
  permissions may not be ready when implementation finishes.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Validate org ownership and publishing credentials
    early in the specification and implementation flow.
- **Packaging surface regressions:** Public packages may initially expose the
  wrong files or omit required metadata.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation Ideas:** Define package-surface expectations explicitly and
    validate them with pack/publish-dry-run checks before release.
- **Docs library support ambiguity:** If the docs packages are published without
  clear consumer positioning, adopters may misunderstand their stability or
  intended use.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Document the CLI as the primary surface and the docs
    packages as supported secondary library surfaces.

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Quick mode → straight to plan:** proceed directly to `plan.md` when scope is clear and no architecture decisions remain.
- **Quick mode → optional lightweight design:** produce a focused `design.md` (architecture, components, data flow, testing) before planning. Choose this when discovery surfaced architecture choices or component boundaries.
- **Quick mode → promote:** escalate to spec-driven if discovery revealed the scope is larger or more complex than expected.
- **Spec-driven mode:** continue to `oat-project-spec` (after HiLL approval if configured).
