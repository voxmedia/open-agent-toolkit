---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-08-20
oat_generated: false
---

# Discovery: oat-plugin

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Make OAT's reusable agent workflows substantially easier to install and keep
updated through provider plugin mechanisms, while reducing skill and version
churn in consumer repositories. For v1, package the broadly reusable,
user-eligible capabilities as one logical `open-agent-toolkit` plugin with
first-class native distributions for Codex, Claude Code, and Cursor. Support
both user and project installation where hosts allow it, and recommend user
scope for the lowest-friction update experience. Preserve the OAT CLI as the
authority for repository and project lifecycle state.

This work follows an earlier Agent Plugins v1 evaluation and a collaborative
brainstorm. It is an additive distribution path: native provider plugins and
direct skill installation remain supported rather than being silently
replaced.

## Clarifying Questions

### Question 1: Discovery Coverage

**Q:** Which remaining gray areas should discovery explore?
**A:** All three: the exact v1 content boundary, the install and update
lifecycle, and coexistence with native plugins and direct skill installs.
**Decision:** Discovery must establish an outcome-level contract for all three
areas before converging on a v1 approach.

### Question 2: V1 Content Boundary

**Q:** What rule should determine which capabilities belong in the umbrella
plugin for v1?
**A:** Include all currently user-eligible packs that can operate
self-contained.
**Decision:** V1 should be comprehensive across user-eligible capabilities,
with `project-management` explicitly excluded until its user-level authority
model is resolved. Self-contained native installability is a qualification
requirement, not a reason to arbitrarily narrow the product to a curated core.

### Question 3: Install and Update Lifecycle

**Q:** What lifecycle contract should v1 make when plugin hosts expose
different installation and update controls?
**A:** Use each host's native marketplace and update lifecycle.
**Decision:** OAT should hold the user-facing outcome constant—users no longer
copy and update skills in each repository—without taking ownership of a new
cross-host marketplace client. Host-specific differences in upgrade,
disablement, removal, and rollback controls must be made clear rather than
hidden.

### Question 4: Coexistence

**Q:** How should plugin installs coexist with provider-native plugins and
direct skill installs when the same capability is available from more than one
source?
**A:** Preserve every supported installation path, surface duplicate sources,
and require an explicit migration choice.
**Decision:** V1 must not silently uninstall another source, merge conflicting
copies, or invent precedence. Duplicate-source diagnostics and opt-in migration
are part of the coexistence contract; provider-specific precedence remains a
fact to expose, not behavior to rely on.

### Question 5: Decision-Driving Hosts

**Q:** Which plugin hosts should shape v1 product and lifecycle decisions?
**A:** Claude Code, Cursor, and Codex should drive the decisions. GitHub Copilot
should be an intentional secondary support target. Compatibility with other
Agent Plugins hosts remains desirable, but their behavior should not determine
the core direction.
**Decision:** Use Claude Code, Cursor, and Codex as the primary acceptance
surfaces. Track Copilot as a named secondary target, and treat other conformant
hosts as best-effort compatibility targets whose gaps do not veto the v1
contract.

### Question 6: Update Awareness

**Q:** How should users learn that an installed plugin is out of date when host
update behavior differs?
**A:** Check for a newer plugin version when the plugin starts and notify the
user when their installed version is outdated, similar to the existing OAT CLI
experience.
**Decision:** V1 requires proactive version-awareness at the earliest reliable
plugin or session activation point. The notification must identify that an
update is available and direct the user to the host-appropriate manual update
path without silently changing the installation. Native automatic updates
should still be used where the host supports them.

### Question 7: Earlier Portable Baseline Proposal _(Superseded)_

**Q:** Should v1 restrict itself to the components standardized by Agent
Plugins, or include richer pack components on primary hosts that can represent
them safely?
**A:** The initial preference was a portable baseline plus host-native
enhancements.
**Decision:** This proposal was superseded by Question 9 after clarifying that
agents are central to OAT. A portable skills-only baseline is not an acceptable
v1 product floor, so primary-host support now requires complete native
skill-and-agent distributions.

### Question 8: Provider Support Transparency

**Q:** How should OAT communicate differences in plugin support between
providers?
**A:** Be explicit with users about which providers offer full plugin support.
**Decision:** V1 must publish provider-specific support levels and the material
capability or lifecycle gaps behind them. Conformance with the portable package
format alone must not be presented as full OAT plugin support.

### Question 9: Agents as a Required Capability

**Q:** Should v1 optimize for the portable Agent Plugins component floor when
that standard does not include agents?
**A:** No. Agents are central to OAT, so v1 should focus on first-class native
plugins for Codex, Claude Code, and Cursor.
**Decision:** The primary product is one logical `open-agent-toolkit` plugin
delivered through first-class native distributions for the three decision-driving
hosts. Each primary distribution must preserve OAT's agreed skills and agents;
an Agent Plugins–compatible skills-only package cannot qualify as the supported
v1 experience.

### Question 10: Portable V1 Artifact

**Q:** Should v1 also ship a skills-only Agent Plugins artifact for secondary
compatibility?
**A:** No. Omit it from v1.
**Decision:** V1 release and acceptance work focuses on the native Codex,
Claude Code, and Cursor plugins. Revisit a standards-based artifact when it can
preserve OAT's central agent experience; do not ship an intentionally incomplete
OAT package in the meantime.

### Question 11: Project Scope

**Q:** Should the native Codex, Claude Code, and Cursor distributions remain one
cohesive OAT project or be split into provider-specific projects?
**A:** Keep them in one project.
**Decision:** Treat the three distributions as provider-specific delivery
surfaces of one logical OAT plugin product. They share one canonical
skill-and-agent model, release identity, lifecycle contract, and acceptance
boundary; provider-specific implementation work does not warrant separate
projects.

## Solution Space

### Approach 1: Generated First-Class Native Distributions _(Selected)_

**Description:** Keep OAT's reusable assets under their existing canonical
ownership and derive self-contained native distributions for Codex, Claude
Code, and Cursor under one logical umbrella-plugin identity. Providers own
installation and update lifecycle; OAT preserves the shared skill-and-agent
experience, validates package completeness, reports coexistence issues, and
provides proactive update awareness.
**When this is the right choice:** When the priority is to remove consumer-repo
churn without creating a second hand-maintained copy of the toolkit or turning
OAT into a cross-provider marketplace manager.
**Tradeoffs:** Release quality depends on strong generation, drift detection,
and cross-provider acceptance checks. Provider lifecycle differences remain
visible.

### Approach 2: Independently Maintained Plugin Product

**Description:** Maintain the umbrella plugin as a separately authored product
surface alongside the existing canonical assets, allowing its contents and
release cadence to diverge.
**When this is the right choice:** When plugin users need materially different
workflows or compatibility behavior from direct-install and repository users.
**Tradeoffs:** It duplicates ownership, creates synchronization work, and risks
reintroducing the same version churn and drift this project is intended to
remove.

### Approach 3: Core Plugin as Pack Manager

**Description:** Ship a small core plugin that discovers, installs, and updates
individual capability packs on the user's behalf.
**When this is the right choice:** When per-pack selection is more important
than installation simplicity and target hosts provide dependable composition
and dependency lifecycle primitives.
**Tradeoffs:** It adds another lifecycle layer, produces uneven behavior across
hosts, and makes the core plugin responsible for update orchestration beyond
the portable plugin standard.

### Chosen Direction

**Approach:** Generated First-Class Native Distributions
**Rationale:** This direction best matches the accepted goals: one
installation, provider-delivered updates, proactive version awareness, less
repository churn, preservation of OAT's central agent capabilities, and no
expansion of OAT's runtime authority into a cross-provider marketplace manager.
**User validated:** Yes

## Options Considered

### Distribution Ownership

**Chosen:** Derive three first-class native distributions from OAT's existing
canonical assets under one logical plugin identity.

**Alternatives:** Maintain a separate plugin product by hand, or make a core
plugin manage independently installed packs.

**Summary:** Generated native distributions remove consumer-repository churn
without reducing OAT to the portable standard's skills-only component floor,
creating a second source of truth, or introducing a cross-host dependency
manager.

### Portable Skills-Only Package

**Chosen:** Do not ship one in v1.

**Summary:** Agent Plugins compatibility remains relevant research and future
work, but its current skills-and-MCP floor omits OAT's central agent model. A
degraded compatibility artifact would confuse the support promise and distract
from the three first-class distributions.

## Key Decisions

1. **Distribution shape:** Use one umbrella `open-agent-toolkit` plugin, with
   packs retained as internal organization. This avoids requiring users to
   manage a large collection of pack-aligned plugin installations.
2. **Installation scope:** Support both user and project installation where a
   host exposes those scopes, with user scope recommended for reuse and easier
   updates.
3. **Authority boundary:** Plugin distribution does not replace OAT CLI
   ownership of repository configuration, project lifecycle state, templates,
   worktrees, synchronization, or provider materialization.
4. **Adoption model:** Keep existing provider-native and direct skill installs
   as supported paths; the new generated native distributions are additive.
5. **Repository topology:** Produce v1 from the main OAT repository; a dedicated
   plugin repository may become worthwhile after the packaging contract
   stabilizes.
6. **Project-management pack:** Exclude it from the user-level v1 package and
   track making it user-eligible as follow-up work.
7. **Capability boundary:** Include all self-contained, user-eligible packs and
   the shared capabilities they require; do not reduce v1 to a curated starter
   subset.
8. **Required components:** Skills and agents are both part of the supported
   OAT experience; portable skills alone do not constitute a first-class v1
   plugin.
9. **Target hosts:** Build first-class native plugins for Claude Code, Cursor,
   and Codex. Treat GitHub Copilot as a secondary compatibility target and
   other conformant hosts as best effort.
10. **Update lifecycle:** Use each host's native installation and update
    mechanisms. Require a documented, tested manual update path for every
    primary host and use native automatic updates where available.
11. **Update awareness:** Proactively notify users when their installed plugin
    is outdated and direct them to the appropriate host-native update path.
12. **Coexistence:** Preserve native and direct installation paths, diagnose
    duplicate sources, and make migration explicit rather than inventing
    precedence.
13. **Support transparency:** Clearly distinguish first-class OAT support from
    Agent Plugins compatibility and best-effort compatibility for each
    provider.
14. **Portable artifact:** Do not ship a skills-only Agent Plugins package in
    v1; compatibility work must not weaken or delay the first-class native
    plugins.

## Constraints

- Agent Plugins v1 standardizes a portable package and component floor, not
  installation scope, marketplaces, update controls, or precedence.
- A skills-only package is not an acceptable substitute for OAT's central
  agent-driven workflows and is not part of the v1 release.
- The installed plugin must be self-contained and must not depend on an OAT
  source checkout or repository-local skill copies.
- Provider-native lifecycle and extension differences must remain visible; v1
  cannot promise capabilities a host does not expose.
- Provider support claims must be backed by demonstrated capability and
  lifecycle behavior, not manifest acceptance alone.
- Plugin distribution must not mutate or take ownership of OAT repository
  configuration or project lifecycle state.
- Existing native-plugin and direct-install users must retain a supported,
  non-destructive path.
- Update awareness must not block normal use, silently mutate installations, or
  undermine offline use and host policy.

## Success Criteria

- A user can install one umbrella plugin and receive every agreed
  user-eligible capability without checking copies of those skills into each
  consumer repository.
- User and project installation scopes work wherever a primary host supports
  them, with user scope presented as the default recommendation.
- The complete agreed skill-and-agent experience works through native plugins
  on Claude Code, Cursor, and Codex, with material host gaps made explicit.
- Users can see which providers qualify for first-class OAT plugin support and
  which provide only standards-based or best-effort compatibility, including
  the reasons.
- New OAT plugin releases can reach users through host-native lifecycle
  mechanisms without recurring consumer-repository update commits.
- Each primary host has a verified manual update path, and native automatic
  update behavior is exercised where the host offers it.
- An outdated installation produces a non-blocking version notification with
  an accurate host-specific update action.
- Duplicate capabilities from plugin, native, or direct sources are surfaced;
  no supported path is silently removed and no undocumented precedence is
  treated as reliable.
- The distributed plugin is self-contained, versioned, and demonstrably in
  sync with its canonical source.
- Existing OAT CLI project and repository workflows continue to behave with
  their current ownership and precedence rules.

## Out of Scope

- Making the project-management pack user-eligible in v1.
- Building an OAT-owned cross-provider marketplace or uniform plugin updater.
- Shipping a skills-only Agent Plugins compatibility package in v1.
- Requiring users to install or update many pack-aligned plugins.
- Requiring identical native-enhancement support from every plugin host.
- Removing or deprecating existing native or direct-install paths solely
  because the new native distributions ship.
- Moving v1 into a dedicated plugin repository.
- Moving OAT project state, configuration, templates, worktrees, or sync
  authority into the plugin.

## Deferred Ideas

- **Dedicated plugin repository:** Reconsider after the package, release, and
  provider compatibility contracts stabilize.
- **User-level project management:** Tracked separately because it needs a safe
  authority and migration model before joining the umbrella plugin.
- **Per-pack installation controls:** Reconsider only if real usage shows the
  umbrella is too broad; v1 optimizes for one-step installation.
- **Agent Plugins artifact:** Reconsider when the standard or a compatible
  extension can preserve OAT's agent-centered experience.
- **First-class GitHub Copilot support:** Desirable follow-up work, but not a v1
  acceptance surface or decision driver.

## Open Questions

- **Native activation:** What is the earliest reliable activation point for
  version checks in each primary host's native plugin lifecycle?
- **Update source:** What authoritative version source and failure behavior can
  support a low-noise update check without weakening offline use or host
  policy?
- **Manual Codex update:** What verified native refresh or reinstall sequence
  provides a dependable manual installed-plugin update until Codex exposes a
  dedicated update action?
- **Agent representation:** How can each primary host preserve OAT's shared
  agent definitions, dispatch behavior, and namespacing without creating
  divergent product behavior?
- **Coexistence diagnostics:** Which layer can observe plugin, native, and
  direct sources reliably enough to warn without taking ownership of them?
- **Release identity:** How should one release identity bind the canonical
  source, three native distributions, and their marketplace versions?

## Assumptions

- Users prefer one comprehensive installation over selecting individual OAT
  packs.
- Primary hosts will continue exposing a marketplace or equivalent distribution
  surface that can carry versioned plugin releases.
- A non-blocking version check can be implemented without requiring credentials
  or making network availability a prerequisite for using the plugin.
- Provider-native packaging can preserve one shared OAT capability model even
  where native manifests and lifecycle controls differ.
- Host lifecycle behavior is changeable external state and will be reverified
  during design and release acceptance.

## Risks

- **Lifecycle mismatch:** Marketplace refresh may not update installed copies
  consistently across primary hosts.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation Ideas:** Verify installation, manual update, automatic update,
    disablement, removal, and rollback behavior per primary host.
- **Canonical/package drift:** Generated and native surfaces could diverge from
  the canonical capabilities users expect.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Make release identity and source-to-package parity
    explicit acceptance conditions.
- **Noisy version checks:** Frequent, failing, or unactionable update notices
  could erode trust and slow startup.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep checks non-blocking, failure-tolerant, and tied
    to an accurate host-specific action.
- **Duplicate activation:** Existing direct or native copies may cause
  ambiguous capability resolution after plugin installation.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation Ideas:** Detect duplicate sources, explain actual host
    precedence, and require opt-in migration.
- **Native divergence:** Provider-specific enhancements may create materially
  different OAT behavior between primary hosts.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep one shared OAT skill-and-agent capability model
    authoritative and test every native representation against it.

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Spec-driven mode:** continue to `oat-project-design` (which confirms
  requirements and produces both `spec.md` and `design.md`).
- **Spec-driven mode → formalize-only:** use `oat-project-spec` standalone
  if you want a formalized requirements artifact but aren't ready to
  design yet.
- **Quick mode → straight to plan:** proceed directly to `plan.md` when
  scope is clear and no architecture decisions remain.
- **Quick mode → optional lightweight design:** produce a focused
  `design.md` (architecture, components, data flow, testing) before
  planning. Choose this when discovery surfaced architecture choices
  or component boundaries.
- **Quick mode → promote:** escalate to spec-driven if discovery revealed
  the scope is larger or more complex than expected.
