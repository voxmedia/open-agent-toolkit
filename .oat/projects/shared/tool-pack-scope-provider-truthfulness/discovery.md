---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-08-30
oat_generated: false
---

# Discovery: Tool-Pack Scope, Provider Reachability, and Dispatch Truthfulness

> Discovery revalidated on 2026-08-30 against clean `origin/main` at
> `5d684ba9746cd91006524eb5a82f18078a3196ef`, authoritative GitHub state, the
> merged PR #227/#240/#242 code and tests, current backlog records, and archived
> project summaries. The repository knowledge index predates those merges and
> was used only for orientation.

> Boundary update after PR #242: canonical skill-to-agent reads are shipped and
> the completed `agent-provider-root` project is archived. This project consumes
> that contract while retaining ownership of canonical installation, provider
> materialization, catalog visibility, restart notices, picker truth, and
> dispatch-state reporting.

## Phase Guardrails (Discovery)

Discovery records requirements, evidence, decisions, boundaries, and questions.
It does not authorize implementation. Concrete source paths below are evidence
pointers; they are not a final deliverable list.

## Initial Request

Create the scope/provider workstream discussed during backlog triage. It must
make OAT truthful about where a tool pack was requested, where its canonical
assets were installed, which provider views were materialized, and whether the
active provider can actually discover the resulting skills and agents.

The scope includes the urgent finding from GitHub issue #228 and the related
follow-ups for provider-aware diagnostics, whole-directory provider symlink
adoption until divergence, native-agent visibility, project-level AGENTS.md
guidance, and tool-pack lifecycle/configuration edges:

- [`BL-260829-make-tool-pack-scope-selection` — Make tool-pack scope, provider
  reachability, and dispatch state truthful](../../../repo/pjm/backlog/items/BL-260829-make-tool-pack-scope-selection.md)
- [`BL-260827-correct-scope-and-adoption` — Correct scope and adoption
  diagnostics](../../../repo/pjm/backlog/items/BL-260827-correct-scope-and-adoption.md)
- [`BL-260724-support-provider-directory` — Support provider directory
  symlinks as full collection sync](../../../repo/pjm/backlog/items/BL-260724-support-provider-directory.md)
- [`BL-260826-populate-native-subagent` — Populate native subagent runtime
  identity from provider transcript metadata](../../../repo/pjm/backlog/items/BL-260826-populate-native-subagent.md)
- [`BL-260828-add-project-level-oat-guidance` — Add project-level OAT guidance
  prompt during init and workflow installation](../../../repo/pjm/backlog/items/BL-260828-add-project-level-oat-guidance.md)
- [`BL-260827-clean-up-tool-pack-lifecycle` — Clean up tool-pack lifecycle and
  config contracts](../../../repo/pjm/backlog/archived/BL-260827-clean-up-tool-pack-lifecycle.md)
- [`BL-260829-unified-agent-provider-root` — Unified AGENT_PROVIDER_ROOT binding
  for portable skill and agent references](../../../repo/pjm/backlog/items/BL-260829-unified-agent-provider-root.md)
- [`agent-provider-root` summary](../../../repo/reference/project-summaries/20260830-agent-provider-root.md)
  — completed dependency establishing canonical skill-to-agent reference
  resolution; the historical project is archived.

The umbrella owns one shared state vocabulary and end-to-end integration. Its
bounded child workstreams retain narrower ownership: directory-symlink adoption
(`BL-260724`), managed project `AGENTS.md` guidance (`BL-260828`), restart and
refresh diagnosis (owned directly by this umbrella), and dispatch provenance.
Configured selection, pre-start rejection, canonical fallback identity, and
fallback labeling stay in the umbrella; sanitized post-launch runtime
observation remains `BL-260826` and cannot authorize replacement or fallback.
These are currently backlog/design children inside one implementation project;
they are not yet formal OAT child projects.

## Problem Statement

OAT currently has several different meanings of “installed” and “available”:

1. A pack may be declared in project or user configuration.
2. Canonical assets may be present under a managed `.agents` or `.oat` root.
3. A provider view may or may not be projected from those canonical assets.
4. The provider process may or may not have loaded that view into its catalog.

The current surfaces can collapse those states. The issue-#228 transcript
reported that four selections presented as “User scope” — ideas, utility,
research, and brainstorm — landed at project + user scope, while the picker
displayed “installed: project + user” before project installation occurred.
The same recon found that user-scope skills were visible through a provider
view while user-scope managed agents were not, causing a requested native role
such as `oat-phase-implementer` to be rejected and a generic-child fallback to
be used.

A second operational defect is provider collection churn: when a provider’s
entire managed skills directory is already an exact symlink to the canonical
OAT collection, individual-entry sync can fail on the existing link. The
desired behavior is to adopt the directory link as one collection while it is
identical, and fall back to per-entry projection only after unmanaged
divergence is detected.

## Evidence and Current Baseline

This is a verified starting map from `origin/main` after PR #242, not an
exhaustive implementation inventory:

- `packages/cli/src/commands/tools/shared/pack-manifest.ts` defines pack
  assets, allowed scopes, ownership, and canonical/provider destinations.
- `packages/cli/src/commands/tools/shared/pack-inventory.ts:33-75` models
  canonical intent, asset status, completeness, placement, and diagnostics. It
  does not model provider projection, runtime catalog visibility, restart
  state, or dispatch provenance.
- `pack-inventory.ts:99-183` now treats equal-version skill/agent content drift
  as `outdated`, compares the bundled skill tree without treating local extra
  files or normalized executable modes as drift, and validates source and
  installed paths. `pack-inventory.ts:237-299` distinguishes generated and
  source-backed seed state. These PR #240 contracts are accepted baseline, not
  work to redesign here.
- `pack-inventory.ts:302-312` defines completeness from managed-asset presence;
  `pack-inventory.ts:389-462` still treats either enabled intent or non-shared
  managed-asset presence as placement evidence and refuses to infer provider
  precedence from duplicate scope. Intent, health, placement, and reachability
  therefore remain distinct design inputs.
- `pack-inventory.ts:318-348` explicitly reports installed user agents omitted
  from provider materialization, proving canonical completeness can coexist
  with provider unreachability. The diagnostic still depends on the fixed
  `USER_SCOPE_MANAGED_AGENT_FILES` exception, so it is a compatibility seam,
  not the provider capability matrix or a runtime visibility probe.
- `packages/cli/src/commands/sync/index.ts:276-380` resolves concrete scopes,
  config-aware active adapters, canonical entries, and user-scope
  materialization extensions. Lines `386-418` emit non-interactive provider
  mismatch guidance.
- `packages/cli/src/providers/codex/codec/sync-extension.ts` and
  `packages/cli/src/providers/cursor/codec/sync-extension.ts` implement
  provider-specific managed-role materialization and stale-role cleanup. Their
  current contracts protect partial syncs and refuse unsafe stale cleanup, but
  they do not establish a universal provider × scope × content-type matrix.
- `packages/cli/src/commands/init/index.ts` and installers under
  `packages/cli/src/commands/init/tools/` own init-time scope selection and
  installation orchestration. The project-management installer has a guidance
  seam at `agents-guidance.ts`, but the desired init/install notice and
  project-level AGENTS.md choice are not yet one shared contract.
- Provider adapters and paths under `packages/cli/src/providers/` distinguish
  configured/detected adapters and provider destinations. The provider catalog
  is a runtime visibility boundary separate from filesystem inventory.
- Existing tests cover inventories, scoped intents, sync manifests, provider
  materialization, stale-role cleanup, and installers. The gap is cross-product
  coverage for placement truth, reachability, directory adoption/divergence,
  restart requirements, and native-dispatch provenance.

### Verified merged baselines

- PR #227 merged as `a3ac2a01982c02e8690d5016912917b7bf3307b7` on
  2026-08-29. It adds the `shared | local | synced` project-artifact axis, with
  `synced` as the effective default, and preserves sibling `projects` config
  fields during writes. That axis is not tool-pack `project | user` scope and
  proves nothing about provider reachability or dispatch.
- PR #240 merged as `cd07d72e51eaa3c50660612186a54550067d20e5` on
  2026-08-30. It completes lifecycle/config cleanup, content-aware inventory,
  same-version drift detection, seed classification, exact adoption reporting,
  unsupported false-intent rejection, and removal of inert per-pack `--force`.
  This project extends the post-#240 model; it does not reopen those contracts.
- PR #242 merged as `ce7c3225da52508a123849cdd549f449651a5770`
  on 2026-08-30. It establishes dependency-owned canonical-agent roots,
  `loaded -> user -> project` candidate order, exact unsuffixed same-scope
  canonical Markdown identity, and fail-closed recovery. Provider-native role,
  model, effort, variant, and route selection remain authoritative; canonical
  role files are eligible only for direct reads or fallback after an explicit
  pre-start native-role rejection.

## Clarifying Questions

### Question 1: What is the authoritative state vocabulary?

**Q:** Should user-facing surfaces expose `requested`, `canonical-installed`,
`provider-projected`, `provider-visible`, and `restart-required` separately?

**A:** Unresolved; the incidents require these distinctions, but the exact
public vocabulary and compatibility shape need fresh design review.

**Decision:** Treat the layers as mandatory discovery concepts. A single
`installed` boolean cannot stand in for all of them.

### Question 2: What does a user-scope selection mean?

**Q:** Must a “User scope” answer write only user-scope intent/assets even when
a project already has a matching declaration or shared assets?

**A:** Yes. A user-scope selection must not silently become project + user, and
picker annotations must not claim project placement before verified evidence.

**Decision:** Preserve requested scope separately from observed placement.

### Question 3: Who owns provider reachability?

**Q:** Is reachability determined by canonical content, active provider config,
provider materialization, or a provider restart/catalog probe?

**A:** All are separate facts. A canonical install can succeed while a provider
view is absent or a running provider catalog is stale.

**Decision:** Model and report reachability as a matrix rather than infer it
from canonical installation.

### Question 4: How are existing provider directories adopted?

**Q:** Should exact whole-directory symlinks be preferred, with per-entry links
as a fallback after divergence?

**A:** Yes. The user explicitly prefers collection-level symlinks to reduce git
churn; divergence is the boundary that requires per-entry handling.

**Decision:** Directory adoption is the default safe representation when exact
canonical ancestry/content is proven. Divergence must be detected before
falling back, without deleting unmanaged content.

### Question 5: What should init/install do about AGENTS.md?

**Q:** When user-scope packs are installed, should init and standalone workflow
installation announce that project-level guidance is separate and ask whether
to add/update it?

**A:** Yes. The choice must be explicit, idempotent, and safe for existing
AGENTS.md content.

**Decision:** The guidance prompt is part of the user-facing installation
contract; exact ownership/merge boundaries remain design questions.

## Solution Space

### Approach 1: Shared layered state model with provider matrix _(Recommended)_

Define one provider-neutral state model for requested scope, canonical
installation, provider projection, provider catalog visibility, restart
requirement, directory-adoption mode, and dispatch availability. Provider
adapters contribute capability/materialization evidence; inventory, init/install,
sync, doctor, and dispatch consume the same model.

This is the right choice because the incidents cross lifecycle, sync, provider,
and dispatch boundaries. It costs more design and migration work, but avoids
patching separate booleans and provider-specific exceptions that disagree.

### Approach 2: Provider-specific reachability adapters

Keep canonical inventory mostly unchanged and add provider-specific checks for
agents, skills, directory links, restart requirements, and native roles. This
is appropriate only if providers have irreconcilably different catalog
semantics and an initial provider fix must land quickly. It reduces first-slice
coupling but repeats logic for every provider/content type and leaves picker
and diagnostics susceptible to disagreement.

### Approach 3: Diagnostics-only correction

Make doctor/status/dispatch explain canonical-versus-visible mismatches while
leaving installation and sync behavior unchanged. This is a useful emergency
observability patch, but it does not correct the reported scope misplacement or
whole-directory symlink failure and is therefore insufficient as the project
direction.

### Chosen Direction

**Approach:** Approach 1, confirmed by bounded revalidation.

**Rationale:** These are mismatches between intent, canonical content,
projection, runtime catalog state, and native dispatch. A shared vocabulary
with provider-specific adapters gives every surface one state model.

**User validated:** Directionally yes through the project-grouping discussion
and the 2026-08-30 request to complete bounded revalidation before design.

## Options Considered

### Option A: Extend the fixed special-role diagnostic versus provider capability declaration

PR #240 made the fixed `USER_SCOPE_MANAGED_AGENT_FILES` behavior an explicit
compatibility diagnostic, but it cannot become the authority for reachability.
A capability declaration can expose missing Claude roles, support the full
matrix, and make intentional provider limitations distinct from failed
materialization.

**Provisional choice:** capability declaration, pending schema design.

### Option B: Directory symlink adoption versus per-entry projection

Directory adoption minimizes git churn and matches the user’s existing setup,
but needs exact ancestry/content checks, divergence detection, and unmanaged
content protection. Always using per-entry links is simpler locally but causes
the reported failure and unnecessary churn.

**Choice:** directory adoption until divergence, with an observable fallback.

### Option C: Restart notice versus automatic restart

Notice-only preserves user control and works across GUI/CLI providers;
automatic restart is provider-specific and an unexpected process mutation.

**Provisional choice:** explain restart/reload requirements; do not auto-restart.

## Key Decisions

1. This is the urgent/highest-priority scope/provider initiative, not a
   diagnostics-only cleanup.
2. Requested project/user scope, observed placement, and verified install
   evidence remain distinct; picker annotations cannot infer placement.
3. Canonical installation, provider projection, provider catalog visibility,
   and restart requirement are separate states.
4. Evaluate provider × scope × content type, including skills, agents, rules,
   and directories where packs declare them.
5. Missing Claude managed roles must be reported; the current special-role
   exception must not hide them.
6. Adopt an exact provider collection directory where safe; use per-entry
   projection only after unmanaged divergence is detected.
7. Native-role rejection and generic-child fallback are distinct events. A
   fallback record preserves the exact rejection, resolver target, route,
   model/effort controls, and authorization basis.
8. Init and standalone workflow installation announce the distinction between
   user-scope assets and project-level OAT guidance and ask whether to add it.
9. PR #227's merged project-artifact `synced` scope must not leak into
   tool-pack project/user scope; tool-pack writes preserve the full `projects`
   configuration object.
10. PR #240's lifecycle, seed, content-drift, and adoption contracts are
    completed baseline. This project extends their state model rather than
    duplicating or weakening them.
11. PR #242's dependency-owned canonical-role contract is authoritative for
    fallback instructions. This project adds reachability and dispatch
    provenance around it without changing native provider selection.
12. The umbrella and four named child workstreams share one state vocabulary;
    each child retains its established mutation and evidence boundary.

## Constraints

- Preserve user-owned provider directories and unmanaged files; no broad
  delete/recreate fallback is acceptable.
- Preserve explicit scope choices and existing configuration unless the user
  selects a supported migration/reconciliation action.
- Keep provider-specific selectors and role names exact; do not erase the
  distinction between native-role rejection and generic fallback.
- Do not infer runtime catalog visibility solely from filesystem presence.
- Maintain managed-root containment and home-path redaction guarantees.
- Shipped CLI, provider adapters, bundled skills/agents, and docs require the
  repository’s lockstep package-version/release validation.
- Existing `scope-adoption-diagnostics` remains a narrower diagnostic project;
  completed `tool-pack-lifecycle-config-cleanup` and `agent-provider-root`
  projects are archived dependencies, not active siblings.

## Success Criteria

- Picker/install output reports requested scope and verified placement
  separately; a user-scope choice cannot silently install at project scope.
- Inventory distinguishes canonical installation from provider projection and
  runtime visibility for every applicable provider, scope, and content type.
- Diagnostics name all unavailable managed roles for the active provider,
  including Claude, without the fixed-role false-negative behavior.
- Sync safely adopts exact provider collection directories and preserves
  unmanaged divergence by falling back to explicit per-entry mode.
- Init and standalone workflow installation provide an idempotent project-level
  AGENTS.md guidance choice with clear consequences.
- Sync/doctor/dispatch explain provider restart requirements when the filesystem
  is updated but the provider catalog is stale.
- Native-role rejection and generic-child fallback appear as separate,
  source-qualified events with exact provenance.
- Tests exercise project-only, user-only, both, missing, partial, provider
  disabled/detected, enabled/undetected, alias, divergent, missing-role,
  restart-required, native-reject, and generic-fallback cases.
- Behavior remains compatible with PR #227's config preservation and project
  scope without overwriting `config.projects` data.
- Existing PR #240 inventory behavior remains stable: equal-version drift,
  seeded overrides, executable normalization, and lifecycle/config choices keep
  their accepted semantics while new provider facts remain separately visible.
- Canonical fallback reads obey PR #242's exact identity, per-dependency root,
  and native-first selection contract.

## Out of Scope

- Implementing PR #227's synced-project-scope feature itself.
- Reopening PR #240's completed lifecycle/config, seed classification,
  same-version drift, adoption-reporting, or per-pack `--force` decisions.
- Replacing PR #242's shipped canonical-agent resolver contract or changing
  provider-native model, effort, variant, and route selection.
- Automatically restarting provider applications or changing authentication.
- Replacing provider-native catalogs with a universal OAT runtime catalog.
- Rewriting all existing quick projects into this project.
- Designing the complete review/gate receipt schema; that belongs to
  `review-gate-integrity` and its structured-output follow-up.
- Treating generic-child fallback as native-role success.

## Deferred Ideas

- A user-confirmed one-command repair mode for provider divergence.
- Provider-specific automatic reload integrations where a stable API exists.
- A persisted catalog handshake proving that a running provider reloaded a
  synced directory.
- Consolidating the remaining scope/adoption diagnostic project after its plan
  is compared with this accepted design.

## Open Questions

- **State model:** What exact versioned schema represents requested scope,
  canonical installation, provider projection, provider visibility,
  restart-required, divergence, and native-role availability?
- **Authority:** Which command owns each transition, and how do inventory,
  sync, doctor, init, and dispatch consume shared evidence without cycles?
- **Content types:** What is the complete supported set per pack, and are
  rules/directories treated like skills/agents for placement and reachability?
- **Provider matrix:** Which providers support user-scope skills, user-scope
  agents, project-scope agents, directory aliases, and runtime catalog probes?
- **Claude:** What counts as a managed Claude role, where does its missing-role
  diagnostic appear, and how is intentional lack distinguished from failure?
- **Canonical health versus placement:** How does the new layered state expose
  `current`, `outdated`, `newer`, `partial`, and declared-only state without
  changing PR #240's accepted inventory semantics?
- **Shared owners:** How do assets shared by multiple packs affect placement,
  adoption, removal, and duplicate-scope warnings?
- **Scope selection:** How are defaults, repeated selections, existing
  declarations, and “project + user” annotations represented?
- **Directory adoption:** What proves an existing provider directory is the
  exact canonical collection, and what constitutes unmanaged divergence?
- **Divergence recovery:** Does sync leave an alias and project individual
  entries, or replace the alias only after an explicit prompt?
- **Symlink safety:** How are relative/absolute, broken, foreign, and ancestor
  links handled?
- **Restart semantics:** Which providers need restart notices, how is evidence
  derived, and how should non-interactive sync communicate it?
- **AGENTS.md ownership:** What marker/block owns shared guidance, how are
  existing edits preserved, and what if AGENTS.md is a symlink or absent?
- **Init/install sequencing:** Is the guidance question once per invocation,
  repository, or only when a workflow pack is present?
- **PR #227 boundary:** Which tests prove tool-pack install/reconcile preserve
  `projects.defaultScope`, `projects.root`, and future sibling fields while
  keeping project-artifact and pack scope axes separate?
- **Dispatch fallback:** What exact pre-start rejection qualifies for fallback,
  and how are post-acceptance failures prevented from becoming replacements?
- **Restart versus dispatch:** Can a stale provider catalog cause native-role
  rejection, and should dispatch advise restart before a generic child?
- **Compatibility:** Which legacy manifests/configs are migrated, warned on,
  or left unchanged, and what schema/version signal is persisted?
- **Release shape:** Must adapters, lifecycle, diagnostics, and guidance ship
  together or can they be staged behind compatibility behavior?

## Assumptions

- PR #227's shipped synced-project-scope artifacts are authoritative only for
  the adjacent project-artifact axis.
- PR #240's current inventory semantics and PR #242's canonical-agent contract
  remain stable dependencies during this design.
- The issue-#228 transcript is accurate as an incident report; the exact
  interactive incident was not reproduced during this bounded source/PR
  revalidation.
- Provider adapters can expose enough evidence to distinguish projection from
  runtime catalog visibility.
- Existing provider directories may contain unmanaged content and are valuable.
- The fixed user managed-role allowlist is a compatibility artifact, not the
  final reachability model.

## Risks

- **Scope expansion:** The initiative becomes an all-provider rewrite.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation Ideas:** Freeze the state vocabulary and acceptance matrix in
    design; stage adapters behind it.
- **Unsafe symlink adoption:** A near-match hides user content or escapes the
  managed root.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Require exact ancestry/digest evidence and test
    broken/foreign/divergent links before mutation.
- **False provider confidence:** Filesystem presence is reported as runtime
  visibility.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation Ideas:** Keep projection, visibility, and unknown states
    distinct.
- **PR config regression:** Tool-pack writes overwrite PR #227 project config.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Add preservation tests around install, reconcile,
    migrate, and sync after merge.
- **Fallback misclassification:** An accepted-child failure authorizes an
  unapproved replacement.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Persist pre-start rejection evidence and forbid
    fallback after acceptance.

## Dependencies and Related Work

- [`review-plan-workflow` — ReviewPlan-first reviewer workflow](../review-plan-workflow/)
  remains the ReviewPlan QA baseline and is not duplicated here.
- [`scope-adoption-diagnostics` — Scope and Adoption Diagnostics](../scope-adoption-diagnostics/)
  is a narrower quick project to compare and reconcile.
- [`tool-pack-lifecycle-config-cleanup` summary](../../../repo/reference/project-summaries/20260830-tool-pack-lifecycle-config-cleanup.md)
  is the completed PR #240 baseline; its historical project is archived.
- [`agent-provider-root` summary](../../../repo/reference/project-summaries/20260830-agent-provider-root.md)
  is the completed PR #242 canonical-role dependency; its historical project
  is archived.
- [PR #227 — add synced project scope](https://github.com/voxmedia/open-agent-toolkit/pull/227)
  is the merged adjacent project-scope baseline.
- [PR #240 — clean up tool-pack lifecycle and config handling](https://github.com/voxmedia/open-agent-toolkit/pull/240)
  is the merged inventory/lifecycle baseline.
- [PR #242 — make canonical agent reads provider-aware](https://github.com/voxmedia/open-agent-toolkit/pull/242)
  is the merged canonical-role resolution baseline.

## References

- [GitHub issue #228 comment](https://github.com/voxmedia/open-agent-toolkit/issues/228#issuecomment-5459103358)
- [PR #227 — add synced project scope](https://github.com/voxmedia/open-agent-toolkit/pull/227)
- [PR #240 — clean up tool-pack lifecycle and config handling](https://github.com/voxmedia/open-agent-toolkit/pull/240)
- [PR #242 — make canonical agent reads provider-aware](https://github.com/voxmedia/open-agent-toolkit/pull/242)
- `../../../repo/reference/decisions/DR-260830-dependency-owned-provider.md`
- `../../../repo/reference/decisions/DR-260830-exact-canonical-identity.md`
- `../../../repo/reference/decisions/DR-260830-typed-portability-classifier.md`
- `packages/cli/src/commands/tools/shared/pack-inventory.ts`
- `packages/cli/src/commands/tools/shared/pack-manifest.ts`
- `packages/cli/src/commands/sync/index.ts`
- `packages/cli/src/providers/codex/codec/sync-extension.ts`
- `packages/cli/src/providers/cursor/codec/sync-extension.ts`
- `packages/cli/src/commands/init/index.ts`

## Next Steps

1. Confirm the umbrella/child convergence boundary and approve discovery.
2. Use `oat-project-design` to formalize the shared state vocabulary and the
   child contracts for directory symlinks, `AGENTS.md`, restart guidance, and
   dispatch/runtime provenance.
3. Keep implementation planning gated on the design HiLL checkpoint.
