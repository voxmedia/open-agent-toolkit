---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-20
oat_generated: false
oat_template: false
---

# Specification: oat-plugin

> **Paused 2026-08-20:** Design stopped before requirements approval because
> current Codex plugin packaging does not provide the required OAT agent
> experience. The user chose to prioritize user-scope support for every OAT
> tool pack instead. This draft remains in progress and unapproved.

## Phase Guardrails (Specification)

Specification is for requirements and acceptance criteria, not
design/implementation details.

- Avoid concrete deliverables such as specific scripts, file paths, or function
  names.
- Keep the High-Level Design section to architecture shape and component
  boundaries only.
- Record unresolved implementation choices under Open Questions for design.

## Problem Statement

OAT's reusable skills and agents are updated frequently, but direct
repository-scoped installation makes those updates expensive for users and for
the toolkit itself. Consumer repositories accumulate copied assets and routine
version-update commits, while users must repeat installation and maintenance
work across projects.

Provider plugin systems can remove much of that friction, but their package
formats, component models, installation scopes, marketplaces, and update
lifecycle differ. The portable Agent Plugins component floor is not sufficient
for OAT because it does not represent agents, which are central to OAT's
workflow and research capabilities. A skills-only package would therefore be
an incomplete and misleading OAT product.

V1 must deliver one logical `open-agent-toolkit` product as first-class native
Codex, Claude Code, and Cursor distributions. Those distributions must be
derived from OAT's canonical assets, preserve the agreed skill-and-agent
experience, use host-native lifecycle controls, coexist safely with existing
installation paths, and leave repository/project authority with a separately
installed compatible OAT CLI. The plugin is the full OAT distribution: it does
not offer a CLI-free subset.

## Goals

### Primary Goals

- Let users install one logical OAT plugin and receive all agreed
  self-contained, user-eligible capabilities without copying them into every
  consumer repository.
- Provide complete native skill-and-agent distributions for Codex, Claude Code,
  and Cursor from one canonical OAT capability model.
- Deliver releases through each host's native plugin lifecycle, with a verified
  manual update path and proactive, non-blocking version awareness.
- Preserve existing direct and provider-native installation paths, diagnose
  duplicate sources, and require explicit migration choices.
- Require every plugin capability to fail immediately and actionably when the
  compatible OAT CLI prerequisite is absent.
- Maintain one auditable release identity and prove every native distribution
  matches the canonical source.

### Secondary Goals

- Make provider support levels and material capability/lifecycle differences
  easy for users to understand.
- Preserve a clean future path to first-class Copilot support and broader
  standards compatibility without weakening v1.

## Non-Goals

- Make the `project-management` pack user-eligible in v1.
- Ship a skills-only Agent Plugins compatibility artifact in v1.
- Build an OAT-owned cross-provider marketplace, installer, or uniform updater.
- Bundle, install, update, or manage the OAT CLI from a provider plugin.
- Offer a reduced plugin mode when the OAT CLI is unavailable; users who want
  CLI-independent skills install them separately through existing direct paths.
- Require users to install or update pack-aligned sub-plugins.
- Guarantee identical host lifecycle controls when providers expose different
  capabilities.
- Remove or silently migrate existing direct or provider-native installations.
- Move OAT repository configuration, project state, templates, worktrees,
  synchronization, or provider-materialization authority into the plugin.
- Move v1 development into a dedicated plugin repository.
- Make Copilot or other secondary hosts a v1 acceptance gate.

## Requirements

### Functional Requirements

**FR1: Eligibility-Driven Content Boundary**

- **Description:** The v1 product must contain the core shared capabilities and
  every self-contained pack currently eligible for user installation, while
  excluding project-management and any capability whose required assets cannot
  operate self-contained.
- **Acceptance Criteria:**
  - The declared v1 set covers core, ideas, docs, workflows, utility, research,
    and brainstorm capabilities: a frozen baseline of 68 unique skills and four
    agents at requirements confirmation time.
  - Project-management is absent from every v1 distribution.
  - Package validation fails when an included capability or any of its required
    references, agents, templates, or scripts is missing.
- **Priority:** P0

**FR2: One Product, Three Native Distributions**

- **Description:** OAT must publish one logical `open-agent-toolkit` product as
  native Codex, Claude Code, and Cursor plugin distributions.
- **Acceptance Criteria:**
  - Each primary host can install its distribution through a documented native
    plugin or marketplace path.
  - All three distributions present the same product name and release identity.
  - Provider-specific manifests and layout do not create separately maintained
    product definitions.
- **Priority:** P0

**FR3: Skill-and-Agent Capability Parity**

- **Description:** Every primary distribution must preserve the agreed OAT
  skills, agents, references, and dispatch relationships needed for the
  supported experience.
- **Acceptance Criteria:**
  - A generated capability inventory for each host matches the canonical v1
    inventory or records an explicit launch-blocking incompatibility.
  - Workflow and research agents are invocable with their intended names,
    instructions, and referenced skills on every primary host.
  - A host cannot be labeled first-class if an included skill or agent is
    silently dropped or materially degraded.
- **Priority:** P0

**FR4: Self-Contained Plugin Assets**

- **Description:** Installed plugins must contain their packaged capabilities
  and supporting assets without relying on an OAT source checkout or
  repository-local copies. The separately installed OAT CLI remains a required
  external runtime.
- **Acceptance Criteria:**
  - Clean-environment acceptance tests exercise included capabilities with a
    compatible installed CLI but no source checkout or repository-local skill
    copies available.
  - All packaged relative references resolve within the installed distribution
    or through an explicitly documented host-native facility.
  - No symlink or packaged reference escapes the installed distribution root.
- **Priority:** P0

**FR5: Native Installation Scope**

- **Description:** Each distribution must support user and project installation
  wherever its host exposes those scopes, with user scope recommended.
- **Acceptance Criteria:**
  - Provider documentation and acceptance evidence identify the supported
    scopes and exact installation outcome.
  - User scope is presented as the default recommendation without claiming a
    scope the host does not support.
  - Project-scoped installation remains available and isolated where the host
    supports it.
- **Priority:** P0

**FR6: Host-Native Update Lifecycle**

- **Description:** OAT releases must use each host's native plugin lifecycle
  rather than an OAT-owned cross-host updater.
- **Acceptance Criteria:**
  - Every primary host has a documented and exercised manual path that moves an
    installed older release to the current release.
  - Native automatic updates are exercised and documented where the host offers
    them; their absence is stated where it does not.
  - Refreshing a marketplace listing is not represented as updating an installed
    plugin unless acceptance evidence proves that behavior.
- **Priority:** P0

**FR7: Proactive Version Awareness**

- **Description:** An installed distribution must check for a newer OAT plugin
  release at the earliest reliable host-supported activation point and notify
  the user when it is outdated.
- **Acceptance Criteria:**
  - An older installation produces a non-blocking notice that identifies the
    installed and available versions.
  - The notice provides an accurate host-specific manual update action.
  - Current installations, disabled checks, network failures, and unavailable
    version sources do not produce false update instructions.
  - The check never silently changes the installed plugin.
- **Priority:** P0

**FR8: Coexistence and Explicit Migration**

- **Description:** Plugin installations must coexist with supported direct and
  provider-native capability installations without destructive or implicit
  migration.
- **Acceptance Criteria:**
  - Detectable duplicate capability sources produce a diagnostic naming the
    sources and the host's observed precedence behavior.
  - OAT does not uninstall, overwrite, merge, or disable another source without
    an explicit user action.
  - Any offered migration path previews its changes and preserves a supported
    rollback or reinstall path.
- **Priority:** P0

**FR9: Provider Support Transparency**

- **Description:** OAT must publish a provider capability matrix that separates
  first-class OAT support from standards conformance and best-effort
  compatibility.
- **Acceptance Criteria:**
  - The matrix reports skill support, agent support, user/project scope,
    installation, manual update, automatic update, disablement, removal, and
    rollback behavior for each primary host.
  - Every first-class claim is backed by current acceptance evidence.
  - Unknown or undocumented host behavior is labeled unknown rather than
    inferred from another host or from manifest acceptance.
- **Priority:** P0

**FR10: CLI Authority Preservation**

- **Description:** Plugin distribution must not assume or take ownership of OAT
  repository configuration or project lifecycle state.
- **Acceptance Criteria:**
  - Existing CLI-driven project, sync, template, worktree, and provider
    materialization workflows retain their current authority and precedence.
  - Plugin installation, activation, and prerequisite checks do not create or
    mutate repository OAT state; invoked capabilities may delegate documented
    state changes to the CLI under their existing contracts.
  - CLI capability queries invoked from the plugin recognize the plugin's
    included packs without recording them as direct repository or user installs.
  - Acceptance tests cover plugin-without-CLI failure, CLI-only operation, and
    plugin-plus-CLI coexistence.
- **Priority:** P0

**FR11: Unified Release Identity and Provenance**

- **Description:** One release identity must bind the canonical source and all
  three native distributions.
- **Acceptance Criteria:**
  - Every distribution exposes the same semantic product version and a
    traceable canonical source revision.
  - Release validation rejects missing distributions, version disagreement,
    inventory drift, or untraceable generated content.
  - A partially published three-host release is not advertised as a complete
    logical release, and rollback identifies a coherent prior release rather
    than an arbitrary mixture of provider versions.
  - A release can be reconstructed from the recorded canonical source using the
    documented build process.
- **Priority:** P0

**FR12: Hard OAT CLI Prerequisite**

- **Description:** Every plugin capability must require a separately installed,
  compatible OAT CLI and must not provide a CLI-free fallback mode.
- **Acceptance Criteria:**
  - Before any skill or agent performs capability-specific work, a common
    preflight confirms that the required CLI is executable and compatible.
  - If the `oat` executable is unavailable, the capability stops immediately
    without side effects and provides one accurate CLI installation action.
  - If the installed CLI is incompatible with the plugin release, the
    capability stops immediately and identifies the required compatible range
    and CLI update action.
  - The plugin never downloads, installs, updates, or replaces the CLI.
  - Documentation directs users seeking CLI-independent skills to the existing
    direct skill-installation paths instead of advertising partial plugin use.
- **Priority:** P0

### Non-Functional Requirements

**NFR1: Deterministic Generation**

- **Description:** Native packages must be reproducible from canonical inputs.
- **Acceptance Criteria:**
  - Repeated generation from the same source revision produces equivalent
    package contents and manifests.
  - Generated output is validated rather than manually repaired per provider.
- **Priority:** P0

**NFR2: Non-Destructive Safety**

- **Description:** Installation diagnostics, coexistence handling, and update
  awareness must preserve user data and existing supported installations by
  default.
- **Acceptance Criteria:**
  - Read-only inspection is the default for diagnostics.
  - Every destructive or precedence-changing action requires explicit user
    intent and names its target scope.
- **Priority:** P0

**NFR3: Offline and Failure Resilience**

- **Description:** Network-dependent lifecycle checks must not become a runtime
  dependency for OAT capabilities.
- **Acceptance Criteria:**
  - Plugin activation and capability invocation remain usable when the network,
    marketplace, or version source is unavailable.
  - Update-check failures are bounded, suppressed from repeated noise, and
    represented as non-fatal diagnostics.
- **Priority:** P0

**NFR4: Credential and Supply-Chain Safety**

- **Description:** Distributed packages and version checks must not embed user
  credentials or execute unverified remote content.
- **Acceptance Criteria:**
  - Generated artifacts contain no credentials or machine-specific paths.
  - Version metadata is retrieved from an authoritative release source and is
    treated as data, not executable instructions.
  - Package provenance and source revision are inspectable for every release.
- **Priority:** P0

**NFR5: Maintainable Canonical Ownership**

- **Description:** Provider differences must remain adapters over one canonical
  capability model rather than hand-maintained forks.
- **Acceptance Criteria:**
  - Shared content is authored once and provider-specific output is derived.
  - Adding or changing a canonical included capability either updates every
    applicable distribution or fails validation with an actionable reason.
- **Priority:** P0

**NFR6: Evidence-Based Compatibility**

- **Description:** Compatibility and lifecycle claims must remain verifiable as
  provider behavior changes.
- **Acceptance Criteria:**
  - Primary-host acceptance checks record host, plugin version, capability
    surface, and observed lifecycle outcome.
  - A stale or missing acceptance result cannot silently preserve a first-class
    support claim.
- **Priority:** P1

## Constraints

- Agent Plugins v1 does not standardize agents, installation scope,
  marketplaces, updates, or precedence and is not the v1 product floor.
- The primary host set is Codex, Claude Code, and Cursor; Copilot and broader
  hosts must not drive v1 architecture or acceptance.
- Provider-native lifecycle and component differences must remain visible.
- The existing canonical asset tree remains the product source of truth.
- The OAT CLI remains authoritative for repository and project operations.
- A compatible OAT CLI is a hard runtime prerequisite for every plugin
  capability and remains independently installed and updated.
- Existing direct and provider-native installation paths remain supported.
- V1 ships from this repository and participates in its existing version and
  release guardrails.

## Dependencies

- Canonical OAT skills, agents, references, templates, and pack eligibility
  inventory.
- Existing provider adapter, synchronization, validation, and smoke-test
  infrastructure.
- Native plugin package and marketplace facilities in Codex, Claude Code, and
  Cursor.
- An authoritative public OAT release-version source for update awareness.
- Existing OAT release automation and package provenance controls.
- The separately distributed OAT CLI and an explicit plugin-to-CLI
  compatibility contract.
- Provider-local authentication and policy for marketplace installation; the
  plugin must not own provider credentials.

## High-Level Design (Proposed)

Keep OAT's existing canonical capability sources authoritative and add a
deterministic plugin assembly boundary that selects the approved v1 inventory,
resolves its transitive assets, and emits a provider-neutral release model.
Three thin native adapters translate that model into Codex, Claude Code, and
Cursor package layouts without forking shared instructions or capabilities.

A shared validation and release boundary proves inventory parity, common
release identity, self-contained packaging, and provider-specific acceptance
before publication. Runtime lifecycle behavior remains host-native; a small
shared version-awareness contract supplies release metadata and maps an
outdated installation to the correct host action. Coexistence diagnostics
inspect existing sources but do not take ownership of them.

**Key Components:**

- Canonical inventory resolver — selects eligible v1 capabilities and required
  transitive assets.
- Provider-neutral plugin release model — carries common identity, inventory,
  provenance, and lifecycle metadata.
- Native provider adapters — render complete Codex, Claude Code, and Cursor
  distributions.
- Validation and acceptance boundary — verifies parity, self-containment,
  lifecycle behavior, and support claims.
- Version-awareness and coexistence contracts — report stale versions and
  duplicate sources without mutating installations.

**Alternatives Considered:**

- Portable skills baseline plus native enhancements — rejected because agents
  are central and cannot be an optional enhancement.
- Independently maintained native plugin products — rejected because they
  duplicate ownership and invite drift.
- Core plugin that installs pack-aligned sub-plugins — rejected because it adds
  a cross-provider dependency manager and installation overhead.

_Design-related open questions are tracked in the [Open Questions](#open-questions)
section below._

## Success Metrics

- All three primary distributions pass clean-environment skill-and-agent
  inventory and invocation acceptance for the approved v1 capability set.
- A release cannot pass validation with a missing distribution, content drift,
  version disagreement, or unresolved package reference.
- Every primary host has current evidence for installation, manual update,
  disablement, removal, and rollback; automatic update is reported only where
  demonstrated.
- An outdated release produces one accurate, non-blocking update notice while
  offline and current installations remain fully usable and quiet.
- Duplicate-source scenarios are diagnosed without modifying either source.
- Existing CLI-only acceptance scenarios continue to pass unchanged.
- Every capability fails before substantive work when the CLI is absent or
  incompatible, while direct CLI-independent skill installs remain available.

## Requirement Index

| ID   | Description                                      | Priority | Verification                                  | Planned Tasks     |
| ---- | ------------------------------------------------ | -------- | --------------------------------------------- | ----------------- |
| FR1  | Select complete user-eligible v1 content         | P0       | unit + integration: inventory and closure     | TBD - see plan.md |
| FR2  | Emit one product for three native hosts          | P0       | integration: native package manifests         | TBD - see plan.md |
| FR3  | Preserve skill-and-agent parity                  | P0       | e2e: cross-host capability invocation         | TBD - see plan.md |
| FR4  | Package self-contained capability assets         | P0       | e2e: clean-environment execution              | TBD - see plan.md |
| FR5  | Support available native installation scopes     | P0       | e2e + manual: user and project installs       | TBD - see plan.md |
| FR6  | Use verified host-native update lifecycle        | P0       | e2e + manual: installed-version upgrade       | TBD - see plan.md |
| FR7  | Notify proactively when installed version is old | P0       | unit + e2e: version-awareness states          | TBD - see plan.md |
| FR8  | Diagnose duplicates and require migration intent | P0       | integration: coexistence scenarios            | TBD - see plan.md |
| FR9  | Publish evidence-backed provider support levels  | P0       | integration + manual: support matrix evidence | TBD - see plan.md |
| FR10 | Preserve OAT CLI authority                       | P0       | integration: plugin and CLI coexistence       | TBD - see plan.md |
| FR11 | Bind releases to one identity and source         | P0       | integration: release provenance and parity    | TBD - see plan.md |
| FR12 | Require a compatible separately installed CLI    | P0       | unit + e2e: common CLI preflight              | TBD - see plan.md |
| NFR1 | Generate native packages deterministically       | P0       | integration: repeated-build equivalence       | TBD - see plan.md |
| NFR2 | Keep diagnostics and migration non-destructive   | P0       | integration: mutation boundary                | TBD - see plan.md |
| NFR3 | Remain usable offline and on check failure       | P0       | e2e: offline and timeout behavior             | TBD - see plan.md |
| NFR4 | Protect credentials and package provenance       | P0       | integration: artifact and metadata safety     | TBD - see plan.md |
| NFR5 | Maintain one canonical capability source         | P0       | integration: source-to-distribution drift     | TBD - see plan.md |
| NFR6 | Keep compatibility claims evidence-based         | P1       | integration + manual: acceptance evidence age | TBD - see plan.md |

## Open Questions

- **Native agent model:** How should common OAT agent definitions map into each
  primary host while preserving names, instructions, tools, dispatch behavior,
  and references?
- **Canonical inventory:** Should plugin eligibility be expressed by existing
  pack metadata, a plugin-specific allowlist, or a richer shared capability
  manifest?
- **Activation:** What is the earliest reliable non-blocking activation point
  for version checks in each host?
- **Version source:** Which authoritative release endpoint and cache policy bind
  the common plugin version to all native distributions?
- **Codex lifecycle:** What native refresh or reinstall sequence provides a
  dependable installed-plugin update until a dedicated update action exists?
- **Coexistence visibility:** Which duplicate sources can each host expose
  reliably, and where must OAT report that detection is unavailable?
- **Release publication:** How should one validated release be published to
  three host marketplaces without creating independent source ownership?
- **CLI compatibility:** Which version relationship binds a plugin release to
  compatible CLI releases, and which install action is authoritative on each
  supported platform?

## Assumptions

- Users prefer one comprehensive OAT installation over per-pack selection.
- Primary hosts expose stable native packaging for skills and some form of
  reusable agents or agent-equivalent behavior.
- A public, credential-free release metadata source can support low-noise
  version awareness.
- A common capability preflight can resolve the external CLI consistently from
  all three native host environments.
- Provider-specific layouts can be generated from one common capability model.
- Host behavior will continue changing and therefore requires release-time
  revalidation rather than permanent assumptions.

## Risks

- **Native agent mismatch:** A host may not represent OAT agents with equivalent
  dispatch or tool semantics.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation:** Make semantic agent parity a first-class acceptance gate and
    refuse first-class labeling for silent degradation.
- **Lifecycle mismatch:** Marketplace refresh may not update installed copies
  consistently across hosts.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation:** Test installed-version transitions and document only
    observed host behavior.
- **Canonical/package drift:** Native distributions may diverge from included
  canonical capabilities.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Generate from one release model and block on parity or
    provenance disagreement.
- **Duplicate activation:** Direct and plugin copies may both activate and
  create ambiguous resolution.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation:** Diagnose observable sources, document actual precedence,
    and require explicit migration.
- **Noisy update awareness:** Repeated or unactionable notices may erode trust.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Cache checks, suppress failures, and require an accurate
    host-specific action before notifying.

## References

- Discovery: `discovery.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
- Architecture: `.oat/repo/knowledge/architecture.md`
- Integrations: `.oat/repo/knowledge/integrations.md`
