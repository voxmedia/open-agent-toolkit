---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-07-16
oat_generated: false
oat_template: false
---

# Specification: explainer-kit

## Problem Statement

The existing `oat-explainer-kit` 0.4.1 proved a useful production workflow:
reconcile contradictory sources into one cited fact base, review the narrative
before rendering, build a coherent visual artifact set, verify it structurally
and visually, and optionally publish it. That workflow is currently coupled to
one operator's destinations, vault conventions, Google Docs tooling, branding,
and installed helper skills. It cannot be safely distributed as a reusable OAT
capability without either leaking private assumptions or dropping behavior the
operator relies on.

This project must split that working material into a generic, config-blind core
and a thin OAT lifecycle adapter. The public core must expose stable,
machine-readable inputs and outputs so a separately maintained private wrapper
can preserve personal presets, vault authoring, Google Docs sync, and personal
destinations without adding those concerns to OAT. The public adapter must add
typed OAT configuration, project artifact placement, lifecycle intent, and
project-level explainer/recap recipes.

The result must remain usable when rendering or publishing fails. Autonomous
projects must always attempt a recap and durably record the outcome, while
project completion remains independent of recap success. Release acceptance is
stricter than runtime completion: the packaged release candidate must pass the
real private-wrapper E2E and one live S3/CDN publish smoke test.

## Goals

### Primary Goals

- Ship `explainer-kit` as a destination-blind core in the utility pack and
  `oat-explainer-kit` as its OAT adapter in the workflows pack.
- Preserve the proven fact-base, draft-first, verification, rendering, and
  publishing workflow while removing organization- and operator-specific
  assumptions from public production assets.
- Define versioned run-input, fact-base, resolved-theme, artifact-manifest,
  build-record, and publish-receipt contracts.
- Provide the canonical `project-explainer` and `project-recap` recipes and
  integrate their intent policy into the OAT project lifecycle.
- Preserve all personal functionality through a documented pre/post
  orchestration seam and prove it against the real private wrapper before
  release.

### Secondary Goals

- Include a small curated palette/profile set and natural-language art
  direction that compiles to a concrete, replayable theme bundle.
- Retain selected engineering-tour patterns as an optional generic recipe.
- Leave a composable source-set seam for later wave/program-close callers
  without making those integrations a v1 dependency.

## Non-Goals

- Shipping `personal-explainer-kit`, personal presets, vault conventions,
  Google account settings, or Google Docs mechanics in the public repository.
- Adding a general plugin registry or mid-pipeline hook system.
- Requiring deterministic HTML rendering in v1.
- Automatically publishing lifecycle artifacts; publish remains human-gated.
- Blocking discovery, design, or initial implementation on external wrapper or
  infrastructure acceptance. Those checks run against the release candidate.
- Promoting wave/program-close integration on behalf of their owning projects.
- Defining `program-recap` in v1. It is a distinct multi-project product owned
  by the wave project; `project-recap` must not be stretched to substitute for
  it.
- Migrating already-published flat-layout explainer URLs. V1 publishing is
  additive, so owners may consciously republish under the typed layout.
- Creating a dedicated communications pack or brand-pack system in v1.
- Replacing OAT's existing project summary or PR description artifacts.

## Requirements

### Functional Requirements

**FR1: Generic core invocation contract**

- **Description:** The core must run with no OAT installation or config files
  and accept all run settings through explicit invocation arguments,
  environment variables, or versioned input files.
- **Acceptance Criteria:**
  - A build-only run succeeds in a temporary directory with no `.oat` files.
  - Input validation rejects unknown schema versions, unsafe paths, incomplete
    publish settings, and unsupported recipe IDs with actionable errors.
  - The public contract documents required, optional, and mutually exclusive
    inputs and the version compatibility policy.
- **Priority:** P0

**FR2: Reconciled fact-base pipeline**

- **Description:** Every artifact set must build from one cited, reconciled
  fact base rather than independently re-deriving facts per artifact.
- **Acceptance Criteria:**
  - Raw-source runs synthesize one fact base, run an adversarial contradiction
    pass, and retain explicit operator overrides.
  - Caller-supplied fact bases skip re-federation but receive a lightweight
    consistency/freshness check.
  - Unresolved claims remain visibly classified as needing confirmation.
- **Priority:** P0

**FR3: Recipe-driven artifact production**

- **Description:** The core must execute versioned recipes that define source
  needs, narrative structure, artifact types, and template selection.
- **Acceptance Criteria:**
  - V1 exposes canonical recipe IDs `project-explainer` and `project-recap`.
  - `project-recap` includes the original request, key agent decisions,
    as-built architecture, implementation record, validation evidence, and
    outcome.
  - `project-recap` accepts one project source set. A future `program-recap`
    recipe may use the same registry and supplied fact-base contract without
    changing v1 core schemas.
  - Recipe source sets are parameterized so future callers can supply
    non-project fact bases without changing the recipe contract.
  - An optional engineer-tour recipe can reuse generic sticky navigation,
    scroll highlighting, and expandable-code patterns without adding a skill
    dependency.
- **Priority:** P0

**FR4: Resolved theme system**

- **Description:** Selection inputs must compile into one validated resolved
  theme bundle consumed by every artifact in a set.
- **Acceptance Criteria:**
  - Selection supports a named semantic palette, a named visual profile, an
    optional supplied theme bundle, and optional natural-language art
    direction.
  - The core ships one neutral default, 3–5 curated palettes, and 2–3 curated
    profiles.
  - The resolved bundle covers color roles, typography, spacing, geometry,
    motion, and diagram treatment and is persisted with the artifact set.
  - Every resolved palette defines validated light and dark modes. A render
    strategy can commit output to the default mode or expose both modes.
  - Public records retain a derived flag and hashes, not raw natural-language
    art direction by default.
  - Palette/profile/template combinations meet AA contrast and render-QA
    acceptance.
- **Priority:** P0

**FR5: Artifact manifest and honest durability**

- **Description:** Every run must produce a versioned manifest and privacy-safe
  build record that describe artifacts, provenance, freshness, rebuildability,
  stage outcomes, and recovery instructions.
- **Acceptance Criteria:**
  - Each rendered artifact is classified `rebuildable: true|false`.
  - Rebuildable claims include an argv-form rebuild command and input hashes.
  - A successful non-rebuildable artifact is `built-durable` only after commit
    or verified publish; otherwise it is `built-not-durable`.
  - Fact base, content model, resolved theme, manifest, and build record are
    retained when later rendering or publishing stages fail.
  - Artifact freshness binds to source commit and artifact hashes.
  - Commit durability uses caller-created commits followed by core verification
    and a separately committed evidence update; the core never creates commits.
  - If archival relocates an artifact package, prior path evidence is superseded
    by evidence for the tracked export path before completion reports the recap
    as durable at its final location.
- **Priority:** P0

**FR6: S3 static publishing connector**

- **Description:** A public `s3-static` connector must publish a manifest
  artifact tree using corresponding S3 and public URL roots.
- **Acceptance Criteria:**
  - For relative path `P`, upload targets `<s3Uri>/P` and verification targets
    `<publicBaseUrl>/P`.
  - Roots are normalized without trailing slashes and `P` cannot start with a
    slash or escape the artifact root.
  - The connector verifies a sentinel before bulk upload, preserves explicit
    MIME types, verifies public artifact URLs, and emits a versioned receipt.
  - Publishing is additive and idempotent outside the current manifest set:
    the connector never deletes or overwrites undeclared objects and never
    performs root-wide destructive synchronization.
  - Sentinel paths are unique per run so concurrent publishes cannot collide.
  - Explicit `index.html` URLs are the portable default.
  - Authentication failures never expose credentials and never trigger unsafe
    automatic reauthentication.
- **Priority:** P0

**FR7: Typed OAT configuration adapter**

- **Description:** `oat-explainer-kit` must resolve typed `explainers.*` build
  and publish settings plus `workflow.explainers.*` lifecycle preferences
  through `oat config`.
- **Acceptance Criteria:**
  - `oat config get/set/list/describe` recognizes every public key, allowed
    scope, scalar type, enum, and default.
  - Resolution order is runtime input, local, shared, user, built-in default,
    subject to each key's allowed scopes.
  - The CLI owns scalar/scope validation; the adapter owns cross-field checks,
    theme precedence, and conversion into core inputs.
  - Runtime inputs override config without mutating stored config.
  - Private wrapper concerns do not appear in public OAT config.
- **Priority:** P0

**FR8: Scope-derived OAT artifact placement**

- **Description:** The adapter must choose canonical output roots from OAT
  context rather than a configurable artifact-root key.
- **Acceptance Criteria:**
  - Project artifact sets live under
    `<resolved-project-path>/explainers/`.
  - Before a shared project is archived, the archive command copies its entire
    `explainers/` subtree to
    `.oat/repo/explainers/_projects/<archive-snapshot>/`, verifies manifest
    hashes, and only then removes the active project path.
  - `_projects` is a reserved internal namespace that cannot collide with a
    valid kebab-case run slug.
  - Archive exports are tracked, collision-safe, and used by summary/PR links;
    gitignored archive paths are never treated as durable link targets.
  - Local-scope projects are not exported because the completion workflow does
    not archive them; their explainer packages inherit the local project's
    untracked durability posture.
  - Non-project OAT artifact sets live under `.oat/repo/explainers/`.
  - Direct core callers must provide an explicit output root.
  - Paths remain within their resolved root after symlink and traversal checks.
- **Priority:** P0

**FR9: Lifecycle intent and policy**

- **Description:** OAT must resolve project explainer/recap intent from mode,
  project state, workflow preference, and built-in defaults.
- **Acceptance Criteria:**
  - `workflow.explainers.projectExplainer` and `.projectRecap` accept
    `always | ask | never`.
  - `state.md` can persist independent explainer and recap decisions with
    decision, source, and timestamp.
  - Precedence is mode policy, project state, workflow preference, built-in
    default.
  - Autonomous kickoff persists recap generation as non-suppressible and only
    persists explainer generation when explicitly requested.
  - Interactive intent can be recorded through planning; an unresolved `ask`
    preference prompts once at its lifecycle gate.
- **Priority:** P0

**FR10: Non-blocking mandatory autonomous recap**

- **Description:** Autonomous project completion must attempt a recap but must
  not depend on successful build, durability, or publishing.
- **Acceptance Criteria:**
  - The attempt and structured outcome record cannot be disabled by config.
  - Render/build failure warns, records cause and regeneration instructions,
    preserves successful intermediates, and allows project completion.
  - Recap status is independently classified as `built-durable`,
    `built-not-durable`, or `failed`.
  - Publishing remains optional and human-gated.
- **Priority:** P0

**FR11: Packaged dependency contract**

- **Description:** The workflows adapter must require a compatible packaged
  core and fail closed when it is missing or too old.
- **Acceptance Criteria:**
  - `explainer-kit` is listed in the utility pack and installs successfully at
    user scope with all required templates, schemas, scripts, and references.
  - `oat-explainer-kit` is listed in the workflows pack.
  - Missing/incompatible core errors include the exact utility-pack
    install/update guidance.
  - Release tests exercise installed packaged paths, never source-tree-only
    paths.
- **Priority:** P0

**FR12: Private-wrapper extension compatibility**

- **Description:** The public contract must let the external private wrapper
  retain personal presets, vault authoring, companion notes, Google Docs sync,
  and personal destinations through pre/post orchestration.
- **Acceptance Criteria:**
  - An in-repo compatibility fixture exercises wrapper-style input resolution,
    core invocation, manifest consumption, and post-run linking.
  - The migration runbook documents the contract freeze and rollback path.
  - A packaged release candidate is not promoted until the real private
    wrapper passes an operator-executed E2E with durable run evidence.
- **Priority:** P0

**FR13: Neutral templates and leak prevention**

- **Description:** Public production assets must be organization-neutral while
  allowing intentional caller branding through validated inputs.
- **Acceptance Criteria:**
  - Production templates contain no organization-specific URLs, buckets,
    account names, or hardcoded branding.
  - Examples use RFC 2606 domains and live outside production output paths.
  - Validation rejects unresolved tokens and denylisted leaked strings; a
    seeded-leak fixture proves the guard.
  - Adapted external patterns are attributed in `NOTICES.md`.
- **Priority:** P0

**FR14: Release acceptance evidence**

- **Description:** V1 release must be supported by packaged and live acceptance
  evidence without blocking earlier development phases.
- **Acceptance Criteria:**
  - The private-wrapper E2E runs against a frozen packaged release candidate.
  - One live S3/CDN run verifies the sentinel, publishes a real artifact,
    verifies its public URL, and retains the publish receipt.
  - Either acceptance failure blocks release promotion until corrected.
  - Wave/program-close hooks do not gate v1.
- **Priority:** P0

### Non-Functional Requirements

**NFR1: Portability and configuration isolation**

- **Description:** The generic core must work across supported agent providers
  and outside OAT without reading ambient config.
- **Acceptance Criteria:**
  - Core behavior is determined only by explicit inputs and bundled assets.
  - No absolute operator path or provider-specific command is required for a
    build-only run.
- **Priority:** P0

**NFR2: Security and privacy**

- **Description:** Inputs, logs, manifests, templates, and publish operations
  must avoid secret disclosure and unsafe filesystem/network behavior.
- **Acceptance Criteria:**
  - Raw AWS credentials are never accepted as config fields or persisted.
  - Public records omit raw art-direction text by default.
  - Paths, URLs, template values, subprocess arguments, and publish roots are
    validated before use.
  - Logs and receipts contain no credential material.
- **Priority:** P0

**NFR3: Accessibility and visual quality**

- **Description:** Shipped themes and templates must be readable,
  self-contained, responsive, and accessible.
- **Acceptance Criteria:**
  - Curated palette combinations satisfy WCAG AA contrast.
  - Structural checks cover self-containment, link form, unresolved tokens,
    heading readability, and balanced markup.
  - Browser QA covers viewport overflow, inner-container clipping, reduced
    motion, keyboard navigation where applicable, and representative widths.
- **Priority:** P0

**NFR4: Traceability and reproducibility**

- **Description:** Requirements, sources, artifacts, build stages, and
  acceptance evidence must be traceable without claiming determinism the
  implementation cannot provide.
- **Acceptance Criteria:**
  - Manifests use versioned schemas and cryptographic hashes for material
    inputs/outputs.
  - Rebuildability spot checks fail any unsupported `rebuildable: true` claim.
  - The 0.4.1 operational-wisdom trace remains complete.
- **Priority:** P0

**NFR5: Failure transparency**

- **Description:** Partial failure must be explicit, recoverable, and correctly
  separated from OAT project completion.
- **Acceptance Criteria:**
  - Every stage records status, warnings/errors, and recovery guidance.
  - Partial output is never reported as durable success.
  - Autonomous recap failure is top-line visible in the project summary or
    equivalent completion report.
- **Priority:** P0

**NFR6: Release integrity**

- **Description:** Shipped skill assets and public package versions must follow
  repository release policy.
- **Acceptance Criteria:**
  - Canonical skill versions increase for changed skills.
  - All five lockstep public packages receive the required version bump.
  - `pnpm release:validate` passes against bundled assets before release
    candidate promotion.
- **Priority:** P0

## Constraints

- The three reference drafts are starting material; implementation evolves them
  rather than replacing the proven workflow.
- Core reads no OAT, user, vault, or destination config files.
- Public config excludes personal lanes, vault paths, Google Docs accounts, and
  destination presets.
- Templates remain self-contained and retain battle-tested component/render-QA
  patterns unless a change is explicitly justified.
- The private wrapper remains externally owned and outside this project's
  implementation scope, despite being a release acceptance dependency.
- The existing `oat-explainer-kit` 0.4.1 stays installed until release-candidate
  acceptance succeeds.
- Public package and bundled-asset changes follow lockstep release policy.

## Dependencies

- OAT CLI config registry/resolution and `oat config get/set/list/describe`.
- OAT project state parsing/validation and lifecycle skills.
- Utility/workflows pack manifests and bundled-asset validation.
- Node.js 22 runtime and existing shell/browser QA capabilities.
- AWS CLI credentials supplied by the operator for the live `s3-static` test.
- Operator-provisioned S3/CloudFront corresponding roots.
- Externally maintained private wrapper for release-candidate E2E.
- MIT-licensed `visual-explainer` patterns with attribution in `NOTICES.md`.

## High-Level Design (Proposed)

The design uses a neutral engine/adapter split. `explainer-kit` owns versioned
contracts, fact-base reconciliation, recipe execution, theme resolution,
content/render orchestration, QA, manifest/build records, and the generic
`s3-static` connector. It receives a complete run request and writes one
artifact package; it never discovers OAT config or personal destinations.

`oat-explainer-kit` resolves OAT config with source metadata, derives the
canonical artifact root, validates cross-field constraints, resolves lifecycle
intent, binds OAT project artifacts into the generic recipe source set, and
invokes the core. OAT lifecycle skills call this adapter at the plan and
completion gates. Private integrations use the same core request and consume
the same manifest/receipt after the run.

**Key Components:**

- Core run contract and schema validators
- Fact-base/content pipeline and recipe registry
- Theme resolver and neutral production templates
- Artifact manifest, build record, and publish receipt
- `s3-static` publishing connector
- OAT config/state/lifecycle adapter
- Packaged-layout, compatibility, leak, render, and release acceptance tests

**Alternatives Considered:**

- Keep one OAT-specific monolith — rejected because it preserves private
  coupling and prevents run-anywhere reuse.
- Ship the personal wrapper publicly — rejected because personal accounts,
  vault mechanics, and destinations are not public OAT concerns.
- Add a plugin registry — rejected as unnecessary; stable pre/post
  orchestration covers the demonstrated extension needs.
- Create a communications pack — deferred until the family has at least three
  coherent public skills or an independent asset/release cadence.

## Success Metrics

- Build-only packaged-core smoke succeeds with no OAT files present.
- Both canonical recipes produce schema-valid tracked artifact packages.
- All curated themes pass contrast, structural, and representative render QA.
- OAT config keys are fully discoverable and reject invalid scopes/values.
- Autonomous recap failures produce durable records while project completion
  still succeeds.
- Packaged adapter correctly fails on absent/incompatible core and succeeds
  against the utility-pack artifact.
- In-repo compatibility fixture, real private-wrapper E2E, and live S3/CDN
  acceptance all pass against the same release candidate.
- Production-template leak scan and seeded negative fixture pass.
- `pnpm release:validate` passes with required skill and package versions.

## Requirement Index

| ID   | Description                             | Priority | Verification                                     | Planned Tasks |
| ---- | --------------------------------------- | -------- | ------------------------------------------------ | ------------- |
| FR1  | Generic core invocation contract        | P0       | integration: config-free packaged core           | See plan.md   |
| FR2  | Reconciled fact-base pipeline           | P0       | integration: raw and supplied fact-base paths    | See plan.md   |
| FR3  | Recipe-driven artifact production       | P0       | integration: canonical recipe outputs            | See plan.md   |
| FR4  | Resolved theme system                   | P0       | unit + visual: theme validation and matrix QA    | See plan.md   |
| FR5  | Artifact manifest and honest durability | P0       | unit + integration: evidence and relocation      | See plan.md   |
| FR6  | S3 static publishing connector          | P0       | integration + e2e: root mapping and live publish | See plan.md   |
| FR7  | Typed OAT configuration adapter         | P0       | unit + integration: key registry and resolution  | See plan.md   |
| FR8  | Scope-derived OAT artifact placement    | P0       | integration: active roots and archive exports    | See plan.md   |
| FR9  | Lifecycle intent and policy             | P0       | unit + integration: precedence and prompts       | See plan.md   |
| FR10 | Non-blocking mandatory autonomous recap | P0       | integration: forced failure completion path      | See plan.md   |
| FR11 | Packaged dependency contract            | P0       | integration: installed utility/workflows layout  | See plan.md   |
| FR12 | Private-wrapper extension compatibility | P0       | fixture + manual e2e: wrapper migration          | See plan.md   |
| FR13 | Neutral templates and leak prevention   | P0       | structural: token, denylist, seeded leak         | See plan.md   |
| FR14 | Release acceptance evidence             | P0       | manual e2e: RC wrapper and S3/CDN receipts       | See plan.md   |
| NFR1 | Portability and configuration isolation | P0       | integration: empty-environment smoke             | See plan.md   |
| NFR2 | Security and privacy                    | P0       | unit + security: validation and redaction        | See plan.md   |
| NFR3 | Accessibility and visual quality        | P0       | visual + manual: AA and browser QA               | See plan.md   |
| NFR4 | Traceability and reproducibility        | P0       | integration: hashes and rebuild spot checks      | See plan.md   |
| NFR5 | Failure transparency                    | P0       | integration: partial-stage outcome records       | See plan.md   |
| NFR6 | Release integrity                       | P0       | release: bundled validation and version policy   | See plan.md   |

## Open Questions

No requirement-level questions remain. Detailed schema fields, spot-check
selection, lifecycle call sites, and implementation sequencing are resolved in
`design.md`.

## Assumptions

- OAT config JSON output continues to expose both resolved value and source.
- Skills may bundle Node/shell validators and static templates in their own
  directories.
- The operator can provision the S3/CloudFront destination before release
  acceptance.
- The external wrapper can migrate against a packaged release candidate before
  public release.
- Wave/program callers can later supply the versioned fact-base contract
  without changing canonical recipe IDs.

## Risks

- **External release dependency:** Wrapper migration is outside project scope
  but blocks promotion.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Freeze contracts in an RC, provide fixture/runbook, and
    separate development completion from release promotion.
- **Theme/template matrix growth:** Curated combinations can multiply render
  QA cost.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Keep palette/profile sets intentionally small and test a
    risk-based matrix.
- **False rebuildability claims:** Agent-assisted output may be mislabeled
  deterministic.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Default to non-rebuildable unless a replay spot check proves
    otherwise.
- **Config/state drift:** New keys span layered config and project frontmatter.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Closed schemas, source-aware resolution, precedence tests,
    and control-plane validation.
- **Publish topology mismatch:** S3 keys and served CDN paths can diverge.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Corresponding roots, sentinel-first verification, and
    explicit receipt evidence.

## References

- Discovery: `discovery.md`
- Reference drafts: `references/skill-drafts/`
- Knowledge base: `.oat/repo/knowledge/project-index.md`
- Repository guidance: `AGENTS.md`
