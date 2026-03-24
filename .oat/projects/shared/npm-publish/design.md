---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-03-24
oat_generated: false
---

# Design: npm-publish

## Overview

This design keeps the repository's existing monorepo boundaries intact and
turns them into an intentional public npm release surface. The four target
packages remain separate artifacts, but they are treated as one coordinated
release unit with lockstep versioning, aligned naming under the `@voxmedia`
scope, and one GitHub-centered validation and publish path.

The technical work is organized around four concerns. First, each package needs
an explicit public package contract: stable public names, complete npm metadata,
and tightly scoped published files. Second, the repo needs release
orchestration that can build, validate, and publish all four packages together.
Third, the packaging flow needs artifact validation so the published tarballs
are intentional rather than incidental. Fourth, repo-owned docs, scaffolds, and
consumer-facing references must be updated so they reflect the public contract
consistently.

This approach is deliberately conservative. It avoids introducing independent
versioning, a new umbrella package, or a larger package refactor. That aligns
with the current architecture, the existing lockstep assumption in docs
scaffolding, and the goal of making the first public release operationally
simple.

## Architecture

### System Context

The existing architecture already separates concerns in a way that supports
public publication: the CLI is the operational core, the docs packages are
small reusable libraries, and the docs app is a first-party consumer of those
libraries. This design adds a release layer across those existing packages
rather than introducing new runtime components.

The change touches three existing architectural layers:

- the **workspace/package layer**, where package identities, metadata, internal
  dependencies, and publishable contents are defined
- the **workflow/automation layer**, where GitHub Actions and validation steps
  become the source of truth for release execution
- the **consumer contract layer**, where scaffolding, READMEs, and package
  descriptions define how external users understand and install the packages

**Key Components:**

- **Public Package Contract:** Defines the four publishable package identities,
  metadata, entrypoints, and intentional file surfaces.
- **Reference Alignment Layer:** Updates repo-owned consumer references,
  generated templates, and cross-package dependencies to use the public naming
  contract.
- **Artifact Validation Layer:** Verifies that each package builds, packs, and
  exposes the expected tarball contents before any publish step runs.
- **Release Orchestration Layer:** Runs coordinated lockstep version validation,
  dry-run checks, and publish execution for the four target packages from
  GitHub.

### Component Diagram

```
Canonical repo sources
  |
  v
Workspace package manifests + docs scaffolding references
  |
  +--> Public Package Contract
  |       |
  |       v
  |   npm-ready package artifacts
  |
  +--> Reference Alignment Layer
  |       |
  |       v
  |   consumer-facing docs + generated consumers
  |       |
  |       +--> included in validation scope
  |
  v
Artifact Validation Layer
  |
  v
Release Orchestration Layer (GitHub Actions)
  |
  +--> validation / dry-run path
  |
  +--> coordinated npm publish of 4 packages
```

### Data Flow

The release data flow is configuration-driven rather than request-driven. Public
package names, workspace dependencies, file inclusion rules, and release inputs
originate in package manifests and repo-owned templates. Validation commands
materialize those definitions into built outputs and `npm pack` tarballs, then
the publish workflow uses the same inputs to perform the real release.

```
1. Package manifests define public names, package metadata, entrypoints, and
   publishable files.
2. Repo-owned references and generated templates are aligned to the same public
   package names and lockstep version contract.
3. Validation builds the target packages and performs tarball inspection or
   equivalent readiness checks for each package.
4. GitHub Actions runs the coordinated dry-run path on pull requests or
   pre-release checks.
5. A release-triggered workflow performs the same validation, then publishes all
   four packages as one lockstep release unit.
6. External consumers install the CLI or docs libraries using the published
   `@voxmedia/oat-*` package names.
```

## Component Design

### Public Package Contract

**Purpose:** Define the externally visible package surface for the four
first-release packages.

**Responsibilities:**

- Rename the public package identities to the agreed `@voxmedia/oat-*` names.
- Add npm-facing metadata that makes each package discoverable and supportable.
- Define explicit `files`, entrypoints, exports, and publish configuration so
  tarballs include only intended release artifacts.
- Preserve the current package split: one CLI and three docs-library packages.

**Interfaces:**

```typescript
interface PublicPackageDefinition {
  workspaceName: string;
  publicName: string;
  packageRole: 'cli' | 'docs-library';
  versionStrategy: 'lockstep';
  filesPolicy: 'explicit';
}

interface PublishMetadataContract {
  repository: string;
  homepage: string;
  bugs: string;
  license: string;
  access: 'public';
}
```

**Dependencies:**

- Workspace package manifests
- Existing build outputs in `dist/`
- npm package metadata conventions
- The current CLI/docs package boundaries

**Design Decisions:**

- Keep the four-package shape instead of introducing an umbrella package, which
  avoids bundling CLI and docs-library concerns into one install surface.
- Use explicit publish surfaces rather than relying on npm defaults, because the
  current repo contains tests, source files, and internal artifacts that should
  not leak into public tarballs.
- Preserve lockstep versioning because docs scaffolding already assumes shared
  `@oat/*` versions today.

### Reference Alignment Layer

**Purpose:** Ensure internal references that shape external consumer behavior
stay consistent with the public package contract.

**Responsibilities:**

- Update docs scaffolding and any generated consumer dependencies to point at
  `@voxmedia/oat-*`.
- Align docs, install guidance, and repo messaging with the CLI-primary package
  story.
- Preserve lockstep version assumptions in generated docs-consumer output.
- Prevent contradictory package naming guidance from surviving in templates or
  public docs.

**Interfaces:**

```typescript
interface ConsumerReferenceUpdate {
  location: 'readme' | 'template' | 'scaffold' | 'package-manifest';
  oldReference: string;
  newReference: string;
  versionPolicy: 'workspace' | 'lockstep-public';
}

interface DocsConsumerDependencySet {
  cliPackage?: string;
  docsConfigPackage: string;
  docsThemePackage: string;
  docsTransformsPackage: string;
  version: string;
}
```

**Dependencies:**

- `packages/cli` docs scaffolding code
- Root and package-level READMEs
- Example docs app dependencies
- Public package naming decisions from the package contract

**Design Decisions:**

- Treat scaffolding and documentation as part of the release contract, not
  after-the-fact cleanup, because stale names would create broken consumer
  installs immediately.
- Keep the docs packages public and supported, but secondary in product
  positioning relative to the CLI.

### Artifact Validation Layer

**Purpose:** Detect packaging mistakes before a real public publish occurs.

**Responsibilities:**

- Build each target package in a release-like mode.
- Inspect tarball contents or equivalent package output for the CLI and docs
  packages.
- Fail validation when internal-only files, missing built assets, or incorrect
  metadata appear in a candidate release.
- Provide one dry-run entry point the release workflow can reuse.

**Interfaces:**

```typescript
interface PackageValidationTarget {
  packageName: string;
  expectedArtifacts: string[];
  forbiddenArtifacts: string[];
}

interface PackageValidationResult {
  packageName: string;
  buildPassed: boolean;
  packPassed: boolean;
  metadataPassed: boolean;
  issues: string[];
}
```

**Dependencies:**

- pnpm workspace build/test commands
- npm packing behavior
- CLI bundled asset output
- GitHub Actions job steps

**Design Decisions:**

- Use `npm pack` or an equivalent tarball-level check because build success
  alone cannot detect over-publishing or missing files.
- Validate all four packages through one reusable flow so release jobs and local
  verification share the same definition of readiness.

### Release Orchestration Layer

**Purpose:** Publish the four public packages from GitHub as one coordinated
lockstep release.

**Responsibilities:**

- Define the validation sequence for non-destructive release readiness checks.
- Define the publish sequence for all four packages in one release unit.
- Ensure the release path uses repo state as the source of truth rather than ad
  hoc local commands.
- Surface release failures early enough to prevent partial or low-quality
  publication.

**Interfaces:**

```typescript
interface ReleaseWorkflowInputs {
  releaseVersion: string;
  packages: string[];
  publishMode: 'dry-run' | 'publish';
}

interface ReleaseWorkflowOutputs {
  validatedPackages: string[];
  publishedPackages: string[];
  releaseNotesSource: 'git-tag' | 'github-release';
}
```

**Dependencies:**

- GitHub Actions
- npm registry credentials or trusted publishing configuration
- Workspace build, test, and package validation steps

**Design Decisions:**

- Prefer one straightforward coordinated workflow over early adoption of a more
  complex release-management tool, because the first goal is reliable public
  publication rather than sophisticated version orchestration.
- Treat npm org ownership and GitHub permissions as deployment prerequisites
  rather than logic the repo itself should automate.

## Data Models

### Public Release Manifest

**Purpose:** Represent the set of packages and release properties that must stay
aligned for each public release.

**Schema:**

```typescript
interface PublicReleaseManifest {
  releaseVersion: string;
  // First release target names:
  // @voxmedia/oat-cli
  // @voxmedia/oat-docs-config
  // @voxmedia/oat-docs-theme
  // @voxmedia/oat-docs-transforms
  packages: Array<{
    workspaceName: string;
    publicName: string;
    role: 'cli' | 'docs-library';
  }>;
  versionStrategy: 'lockstep';
  publishAccess: 'public';
}
```

**Validation Rules:**

- Exactly four packages are included for the first release boundary.
- Every package shares the same release version.
- Every public name uses the `@voxmedia/oat-` prefix.

**Storage:**

- **Location:** Distributed across package manifests, workflow configuration, and
  docs/scaffold references
- **Persistence:** Stored in repo-controlled files and re-materialized on every
  build/validation run

### Package Artifact Policy

**Purpose:** Define what a valid public tarball must include or exclude.

**Schema:**

```typescript
interface PackageArtifactPolicy {
  packageName: string;
  requiredPaths: string[];
  forbiddenPathPatterns: string[];
  requiredMetadataFields: string[];
}
```

**Validation Rules:**

- Required paths include built runtime/library outputs and package-level docs.
- Forbidden paths exclude obvious internal-only sources such as tests,
  development-only build artifacts, and unrelated repo files.
- Required metadata must be present before a release candidate can pass.

**Storage:**

- **Location:** Encoded in release validation logic and package manifests
- **Persistence:** Evaluated during dry-run and publish workflows rather than
  stored in an external system

### Consumer Package Reference Set

**Purpose:** Capture the package names a generated or documented consumer must
use.

**Schema:**

```typescript
interface ConsumerPackageReferenceSet {
  cli: '@voxmedia/oat-cli';
  docsConfig: '@voxmedia/oat-docs-config';
  docsTheme: '@voxmedia/oat-docs-theme';
  docsTransforms: '@voxmedia/oat-docs-transforms';
  version: string;
}
```

**Validation Rules:**

- No reference may remain on `@oat/*` in public-facing install guidance.
- Generated docs consumers must use the same lockstep version for all docs
  packages.
- The CLI may be absent from a docs-library-only consumer, but the docs package
  trio must remain aligned.

**Storage:**

- **Location:** Docs scaffolding code, READMEs, example apps, and workflow docs
- **Persistence:** Maintained in repo source and regenerated through scaffolding
  outputs as needed

## API Design

### Package Publish Contract

**Method:** Internal workflow interface
**Path:** `package.json` / npm manifest surface

**Request:**

```typescript
interface PackagePublishContractInput {
  name: string;
  version: string;
  files: string[];
  exports?: Record<string, string | Record<string, string>>;
  publishConfig?: {
    access: 'public';
  };
}
```

**Response:**

```typescript
interface PackagePublishContractOutput {
  isPubliclyPublishable: boolean;
  missingFields: string[];
  artifactPolicyStatus: 'pass' | 'fail';
}
```

**Error Handling:**

- `missing-metadata`: required public metadata is absent
- `invalid-files-surface`: tarball content does not match intended package scope
- `name-misalignment`: public name does not match the release contract

**Authorization:** Controlled by repo maintainers through source changes and
release review; no runtime authorization model inside the package itself

### Release Validation Workflow

**Method:** Internal CI workflow interface
**Path:** GitHub Actions validation job

**Request:**

```typescript
interface ReleaseValidationRequest {
  ref: string;
  packages: string[];
  checks: Array<'build' | 'test' | 'pack' | 'metadata'>;
}
```

**Response:**

```typescript
interface ReleaseValidationResponse {
  status: 'pass' | 'fail';
  packageResults: PackageValidationResult[];
}
```

**Error Handling:**

- `build-failure`: package failed to compile in release mode
- `test-failure`: required verification failed
- `artifact-regression`: packed contents diverged from policy
- `workflow-misconfiguration`: release job inputs are incomplete or inconsistent

**Authorization:** GitHub Actions execution with repo-controlled secrets or
trusted publishing setup

### Coordinated Publish Workflow

**Method:** Internal CI workflow interface
**Path:** GitHub Actions publish job

**Request:**

```typescript
interface CoordinatedPublishRequest {
  releaseVersion: string;
  packages: string[];
  publishRegistry: 'npm';
}
```

**Response:**

```typescript
interface CoordinatedPublishResponse {
  status: 'published' | 'aborted';
  publishedPackages: string[];
  releaseReference?: string;
}
```

**Error Handling:**

- `prepublish-validation-failed`: publish is blocked because dry-run checks did
  not pass
- `credential-failure`: npm or GitHub release permissions are not available
- `partial-publish-risk`: workflow detects a condition that could lead to an
  incomplete coordinated release

**Authorization:** Restricted to authorized GitHub workflow executions against
the repository

## Security Considerations

### Authentication

There is no application-level auth model in this design. Authentication applies
only to release infrastructure: GitHub Actions must authenticate to npm through
either an npm token or trusted publishing, and maintainers authenticate through
GitHub when approving or triggering releases.

### Authorization

Authorization is enforced through repository permissions and npm package
ownership rather than runtime code. Only authorized maintainers and GitHub
workflow executions should be able to publish the `@voxmedia/oat-*` packages.
Public package metadata and release workflow definitions should remain
repo-controlled and reviewable.

### Data Protection

- **Encryption:** Release credentials rely on GitHub-hosted secret handling or
  trusted publishing; npm traffic occurs over HTTPS.
- **PII Handling:** This change should not introduce new user PII. Package
  metadata should avoid unnecessary personal data and point to org-managed
  support locations.
- **Input Validation:** Package names, version alignment, metadata presence, and
  tarball contents must be validated in CI before publishing.

### Threat Mitigation

- **Accidental over-publication:** Mitigated by explicit publish surfaces and
  tarball validation.
- **Unauthorized publish:** Mitigated by GitHub workflow permissions and npm org
  ownership controls.
- **Broken consumer installs from stale references:** Mitigated by coordinated
  reference alignment in scaffolding, manifests, and docs.

## Performance Considerations

### Scalability

The release design scales to the current bounded four-package surface. It is
not optimized for independently versioned packages or a large release matrix,
which is acceptable for the first public launch. Keeping the publish scope fixed
avoids introducing orchestration overhead the repo does not yet need.

### Caching

- **Layer:** pnpm dependency cache and Turborepo task cache within CI
- **Strategy:** Reuse existing workspace build caching where possible while
  still forcing pack/publish validation on the final candidate outputs
- **TTL:** Managed by GitHub Actions cache retention rather than repo logic

### Database Optimization

- **Indexes:** Not applicable; no database is introduced
- **Query Optimization:** Not applicable; this is a filesystem- and CI-driven
  workflow

### Resource Limits

- **Memory:** Dominated by workspace builds and CLI asset packaging
- **CPU:** Dominated by TypeScript compilation, test execution, and docs build
  steps where included
- **Network:** Limited to package installation, npm registry publication, and
  GitHub Actions artifact/log transfer

## Error Handling

### Error Categories

- **User Errors:** Incorrect package metadata, stale public references, or
  misconfigured release inputs should fail validation with actionable messages.
- **System Errors:** Build failures, missing assets, and workspace command
  failures should stop the release flow immediately.
- **External Service Errors:** npm auth problems, registry publish failures, or
  GitHub workflow permission issues should abort publish without masking which
  package or step failed.

### Retry Logic

Build and packaging failures should not be retried automatically because they
usually represent deterministic configuration problems. Transient registry or
GitHub transport failures may be retried conservatively at the workflow step
level, but only after validation has already passed and without bypassing the
coordinated release checks.

### Logging

- **Info:** Target packages, release mode, validation phases, and successful
  artifact checks
- **Warn:** Non-blocking release-environment concerns such as deprecated config
  or incomplete docs metadata that is not yet fatal
- **Error:** Validation failures, tarball regressions, publish failures, or
  permission/authentication problems

## Testing Strategy

### Requirement-to-Test Mapping

| ID   | Verification         | Key Scenarios                                                                                                    |
| ---- | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| FR1  | manual + integration | Public names are `@voxmedia/oat-*`; only four target packages are exposed                                        |
| FR2  | integration          | GitHub workflow validates and publishes all four packages as one unit                                            |
| FR3  | integration + manual | Each package has public metadata and intentional tarball contents                                                |
| FR4  | manual               | Root README and package docs list the CLI first; docs packages are described as supported secondary libraries    |
| FR5  | integration + manual | Scaffolds, READMEs, and package references all use the public names                                              |
| FR6  | integration          | Dry-run path builds, packs, and reports readiness without publishing                                             |
| NFR1 | manual               | Release flow stays lockstep, uses one coordinated GitHub path, and avoids independent per-package version inputs |
| NFR2 | integration          | Tarballs exclude internal clutter and include required public assets                                             |
| NFR3 | manual               | npm descriptions and install guidance are understandable without reading repo internals                          |
| NFR4 | integration + manual | Release model preserves current package shape and lockstep scaffold usage                                        |

### Unit Tests

- **Scope:** Helper logic that computes package validation targets, release
  target lists, or scaffolded dependency declarations
- **Coverage Target:** No new repo-wide numeric threshold; add focused coverage
  for new packaging and reference-alignment logic
- **Key Test Cases:**
  - Docs scaffolding emits `@voxmedia/oat-*` package names with one shared
    version
  - Package validation helpers detect missing metadata fields or forbidden
    tarball paths

### Integration Tests

- **Scope:** Release validation commands, `npm pack` checks, and scaffold/build
  behavior across the four target packages
- **Test Environment:** Existing pnpm workspace plus CI job execution and local
  dry-run commands
- **Key Test Cases:**
  - All four packages build and produce expected pack artifacts
  - CLI package tarball includes built runtime and bundled assets but excludes
    tests and workspace-only files
  - Docs packages pack cleanly and remain consumable by the docs app or
    generated docs consumers
  - Release workflow blocks publish when one package fails validation

### End-to-End Tests

- **Scope:** Human-verified release rehearsal and install-path confirmation for
  the published package contract
- **Test Scenarios:**
  - Dry-run a coordinated release from GitHub Actions without publishing
  - Install the CLI via the published package name and confirm the `oat`
    executable contract
  - Install docs libraries into a consumer docs app and verify documented import
    paths remain correct

## Deployment Strategy

### Build Process

The release build process should reuse the existing pnpm/Turbo workspace tasks
and package-local build steps. The CLI package continues bundling assets before
TypeScript compilation, while docs packages compile their library outputs as
they do today. Release validation adds pack-level inspection on top of those
existing build outputs.

### Deployment Steps

1. Prepare package manifests, references, and docs for the public
   `@voxmedia/oat-*` contract.
2. Run workspace build/test and package artifact validation for the four target
   packages.
3. Execute the non-destructive release workflow in GitHub to confirm readiness.
4. On an approved release trigger, run the coordinated publish workflow from
   GitHub.
5. Optionally create or update the corresponding GitHub release metadata after
   npm publish succeeds.

### Rollback Plan

If validation fails before publish, no rollback is required because no public
artifact was released. If publish fails mid-release, the immediate response is
to stop further publishes, assess which packages were successfully published,
and either complete the coordinated release with the same version if possible or
advance to a corrective follow-up version. The workflow should prefer failing
before the first publish step rather than attempting complex automated rollback.

### Configuration

- **Environment Variables:** npm auth configuration (`NPM_TOKEN` if token-based
  publishing is used), GitHub workflow-provided release context, and existing
  Node/pnpm runtime configuration
- **Feature Flags:** None required for the first release model

### Monitoring

- **Metrics:** Release workflow success/failure, package validation failures,
  and publish completion per release
- **Alerts:** GitHub Actions workflow failures and npm publish failures
- **Dashboards:** GitHub Actions run history is sufficient for the initial
  release model

## Migration Plan

This is a packaging and consumer-contract migration rather than a data
migration. The main migration work is renaming public package identities,
aligning internal references, and introducing release automation without
breaking the current workspace or docs scaffolding behavior.

### Migration Steps

1. Rename the public package identities and align internal workspace references.
2. Define intentional publish surfaces and public metadata for all four
   packages.
3. Update scaffolds, READMEs, and consumer-facing guidance to the new public
   package names.
4. Introduce artifact validation and the coordinated GitHub release workflow.
5. Rehearse the dry-run path before the first real public publication.

### Rollback Strategy

Before the first publish, rollback is simply reverting the package identity,
metadata, and workflow changes in git. After the first publish, rollback should
be handled through forward fixes and deprecation messaging rather than trying to
erase already-published package versions.

## Open Questions

- **Ownership model:** The design assumes GitHub-driven publishing, but the repo
  still needs a final Vox Media-approved choice between npm token-based
  publishing and GitHub/npm trusted publishing. The implementation should keep
  the workflow compatible with either until org policy is confirmed.
- **Per-package docs depth:** Each published package should have enough
  package-level README and npm metadata to stand on its own, but the repo can
  still treat the main README/docs site as the canonical deep documentation
  surface. The exact README depth for the three docs libraries remains a
  product/documentation decision for planning.
- **Release trigger style:** The design requires one coordinated GitHub-native
  release path, but it does not yet commit to whether that path is tag-driven,
  release-PR-driven, or another simple GitHub trigger. Planning should choose
  one trigger mechanism and keep the validation/publish flow single-path.

## References

- Specification: `spec.md`
- Discovery: `discovery.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
- Architecture Docs: `.oat/repo/knowledge/architecture.md`
- Conventions: `.oat/repo/knowledge/conventions.md`
