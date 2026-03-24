---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-03-24
oat_generated: false
---

# Specification: npm-publish

## Phase Guardrails (Specification)

Specification is for requirements and acceptance criteria, not
design/implementation details.

- Avoid concrete deliverables such as scripts, file paths, or function names.
- Keep the high-level design to package responsibilities, release flow shape,
  and verification boundaries.
- Record unresolved design and tooling details under **Open Questions**.

## Problem Statement

Open Agent Toolkit currently has a monorepo structure that looks publishable,
but its packages are still configured as internal workspace packages. The root
goal is to make the repository capable of publishing a clean public npm surface
for the OAT CLI and the reusable docs libraries.

The first public release must stay bounded to the existing four-package shape:
one CLI package and three docs-library packages. Those packages need public
names under the Vox Media npm scope, coordinated lockstep versioning, public
consumer metadata, and a GitHub-based release flow that can publish them
reliably together.

The resulting public surface must clearly communicate that the CLI is the main
entry point, while the docs packages are also public and supported for
documentation-site consumers. The work should avoid expanding into a broader
package redesign or independent-package release machinery in the first release.

## Goals

### Primary Goals

- Enable public npm publication for the four agreed packages under the
  `@voxmedia/oat-*` namespace.
- Define a lockstep release model that publishes all four packages together from
  GitHub.
- Establish a public consumer contract in which the CLI is the primary entry
  point and the docs libraries are supported secondary packages.
- Ensure each published package has clear, testable release-readiness criteria,
  including package metadata and package-surface validation.

### Secondary Goals

- Preserve compatibility with the current docs scaffolding assumption that the
  OAT packages share one coordinated version.
- Improve clarity of repo and package documentation for external consumers.

## Non-Goals

- Introduce an umbrella/meta package such as `@voxmedia/oat` in the first
  public release.
- Redesign the current package boundaries beyond what is required to publish the
  existing four-package surface.
- Introduce independent versioning for the four packages in the first release.
- Commit to a final trusted-publishing or token-based ownership model before the
  org-level publishing prerequisites are confirmed.

## Requirements

### Functional Requirements

**FR1: Public package identity**

- **Description:** The system must define and expose four public package
  identities for the initial release under the `@voxmedia/oat-*` namespace.
- **Acceptance Criteria:**
  - The first release surface is limited to four published packages.
  - The public names correspond to one CLI package and three docs-library
    packages under the Vox Media npm scope.
  - Internal references that define the public package contract align with those
    names.
- **Priority:** P0

**FR2: Coordinated multi-package publishing**

- **Description:** The release process must support publishing the four target
  packages together as one coordinated release.
- **Acceptance Criteria:**
  - The release flow treats the four packages as one lockstep unit.
  - The release flow is driven from the GitHub repository rather than requiring
    ad hoc local publishing steps as the source of truth.
  - Release verification covers all four packages before publish execution.
- **Priority:** P0

**FR3: Public package metadata readiness**

- **Description:** Each published package must provide the metadata and package
  surface expected of a public npm package.
- **Acceptance Criteria:**
  - Each target package has explicit public-package metadata sufficient for npm
    consumers to identify its purpose and source.
  - Each target package defines an intentional package surface rather than
    inheriting the full internal workspace tree by accident.
  - Package-surface validation can distinguish a correct release artifact from
    an internal-only artifact.
- **Priority:** P0

**FR4: Consumer-facing package positioning**

- **Description:** The published package set must communicate a clear consumer
  hierarchy and intended usage.
- **Acceptance Criteria:**
  - External-facing documentation identifies the CLI as the main consumer entry
    point.
  - External-facing documentation identifies the docs packages as supported
    library/tooling packages for docs-app consumers.
  - The package descriptions and release messaging do not imply an umbrella
    package exists in the first release.
- **Priority:** P1

**FR5: Internal reference and template alignment**

- **Description:** Repo-owned references that shape the public package contract
  must align with the published names and release model.
- **Acceptance Criteria:**
  - Repo-owned package references that affect consumers or generated consumers
    align with the public package naming contract.
  - Existing lockstep assumptions remain valid for generated docs-consumer
    experiences.
  - Public-package naming changes do not leave contradictory repo guidance.
- **Priority:** P0

**FR6: Release-path validation**

- **Description:** The system must support non-destructive validation of the
  release path before a real publish.
- **Acceptance Criteria:**
  - The release process can validate buildability and package readiness without
    publishing.
  - Validation covers the CLI package and the docs-library packages.
  - Validation output is sufficient to detect package-surface regressions before
    a public release.
- **Priority:** P0

### Non-Functional Requirements

**NFR1: Release simplicity**

- **Description:** The first public release model must minimize process
  complexity and avoid independent-package release orchestration.
- **Acceptance Criteria:**
  - The chosen release path supports one coordinated lockstep release for the
    four packages.
  - The first release does not depend on independent package version management.
- **Priority:** P0

**NFR2: Public artifact quality**

- **Description:** Public release artifacts must be intentionally scoped and fit
  for external consumption.
- **Acceptance Criteria:**
  - Package artifacts exclude clearly internal-only workspace clutter.
  - Public package metadata is complete enough for npm discovery and consumer
    support expectations.
- **Priority:** P0

**NFR3: Consumer clarity**

- **Description:** The public release must be understandable to external
  consumers without relying on tribal repo knowledge.
- **Acceptance Criteria:**
  - The CLI’s primary role is unambiguous in consumer-facing docs and metadata.
  - The docs libraries’ supported-but-secondary role is unambiguous in
    consumer-facing docs and metadata.
- **Priority:** P1

**NFR4: Compatibility with current repo architecture**

- **Description:** The release solution must fit the current monorepo and docs
  scaffolding architecture rather than forcing a package redesign.
- **Acceptance Criteria:**
  - The release model preserves the current four-package shape.
  - The release model remains compatible with the current lockstep package
    assumption in docs scaffolding.
- **Priority:** P0

## Constraints

- The release model must remain simple enough for a bounded first public launch.
- The first release must preserve the existing four-package structure.
- Public package naming must use the Vox Media npm scope.
- The docs packages must be publishable in the same release, not deferred.
- Final implementation must fit the current monorepo architecture and current
  lockstep docs-scaffolding expectation.

## Dependencies

- Vox Media npm scope ownership and permission setup for `@voxmedia`
- GitHub repository permissions sufficient for the chosen release workflow
- Existing monorepo build, test, and docs build flows
- Current docs libraries and docs scaffolding behavior that already assume
  lockstep OAT package versions

## High-Level Design (Proposed)

The proposed solution keeps the repository’s current package boundaries and
formalizes them as a coordinated public release surface. The CLI package and the
three docs-library packages become the only first-release public artifacts, all
versioned together and published through one GitHub-centered release path.

The public release contract has three layers. First, each package must expose a
clean public identity and intentionally scoped artifact. Second, the repo must
provide a coordinated verification and publish path that treats all four
packages as one release unit. Third, consumer-facing metadata and docs must
clearly position the CLI as the primary entry point while documenting the docs
libraries as supported secondary packages.

**Key Components:**

- **Public package contract** - the package naming, metadata, and consumer
  positioning for the four target packages
- **Coordinated release flow** - the GitHub-based lockstep publish and
  validation path for the four packages
- **Reference alignment layer** - consumer-facing docs, templates, and internal
  references that define or imply the public package contract

**Alternatives Considered:**

- **CLI-only first release** - rejected because the agreed scope includes the
  docs libraries in the initial public release
- **Managed independent-package release system** - rejected for the first
  release because it adds unnecessary process complexity before the public
  package surface is validated

_Design-related open questions are tracked in the [Open Questions](#open-questions) section below._

## Success Metrics

- All four target packages satisfy the public-package contract for the first
  release.
- The repository can validate a coordinated release of all four packages
  without publishing.
- The repository can publish a coordinated lockstep release of all four
  packages from GitHub once org-level permissions are in place.
- Consumer-facing package guidance clearly distinguishes the CLI’s primary role
  from the docs libraries’ secondary role.

## Requirement Index

| ID   | Description                                        | Priority | Verification                                 | Planned Tasks                      |
| ---- | -------------------------------------------------- | -------- | -------------------------------------------- | ---------------------------------- |
| FR1  | Define four public `@voxmedia/oat-*` package IDs   | P0       | manual: package identity contract            | p01-t02, p01-t03, p01-t04          |
| FR2  | Publish all four packages together from GitHub     | P0       | integration: coordinated release workflow    | p03-t02, p03-t03                   |
| FR3  | Provide complete public metadata and package scope | P0       | manual + integration: package artifact check | p01-t01, p01-t02, p01-t03, p04-t01 |
| FR4  | Document CLI-primary consumer positioning          | P1       | manual: consumer-facing package guidance     | p04-t01, p04-t02                   |
| FR5  | Align references and generated consumer contract   | P0       | integration: public-name reference audit     | p02-t01, p02-t02, p02-t03, p04-t02 |
| FR6  | Support release dry-run validation                 | P0       | integration: release validation path         | p03-t01, p03-t02                   |
| NFR1 | Keep the first release flow operationally simple   | P0       | manual: release model review                 | p03-t01, p03-t02, p03-t03          |
| NFR2 | Keep public artifacts clean and intentional        | P0       | integration: package surface verification    | p01-t01, p03-t01, p04-t01          |
| NFR3 | Preserve consumer clarity across packages          | P1       | manual: docs and metadata review             | p04-t01, p04-t02                   |
| NFR4 | Preserve compatibility with current repo shape     | P0       | integration: lockstep and scaffold fit       | p01-t04, p02-t01, p02-t02, p02-t03 |

## Open Questions

- **Ownership model:** Will the final release path use npm tokens, GitHub/npm
  trusted publishing, or another approved Vox Media publishing model?
- **Per-package docs depth:** How much package-specific README and npm-page
  guidance should each docs library carry versus relying on the main repo docs?
- **Release trigger style:** Should the coordinated release be triggered by tags,
  a release PR flow, or another GitHub-native mechanism within the chosen simple
  release model?

## Assumptions

- Vox Media can provision and grant publish access for the `@voxmedia` npm
  scope.
- The current lockstep version assumption in docs scaffolding is acceptable for
  the first public release.
- The current monorepo package split is sufficient for the initial public
  release without adding an umbrella package.

## Risks

- **Package rename drift:** Renaming from `@oat/*` to `@voxmedia/oat-*` may
  leave stale references in docs, templates, or package metadata.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation:** Treat public naming updates as one coordinated requirement
    across manifests, docs, and generated-consumer references.
- **Release permissions blocker:** npm scope or GitHub permissions may lag the
  repo changes.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Validate org-level prerequisites early and keep them visible
    as an open question through design.
- **Artifact-quality regressions:** Published artifacts may expose internal
  workspace contents or omit required public metadata.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation:** Require release validation and package-surface checks as P0
    requirements.
- **Consumer ambiguity:** External users may misread the role of the docs
  packages if consumer messaging is weak.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Make consumer hierarchy explicit in requirements, metadata,
    and release docs.

## References

- Discovery: `discovery.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
