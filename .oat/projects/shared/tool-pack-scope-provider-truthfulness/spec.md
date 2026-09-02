---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-08-30
oat_generated: false
oat_template: false
---

# Specification: Tool-Pack Scope, Provider Reachability, and Dispatch Truthfulness

## Phase Guardrails (Specification)

This specification defines observable requirements and acceptance boundaries.
Detailed component shapes, interfaces, and implementation sequencing belong in
`design.md` and `plan.md`.

## Problem Statement

OAT currently exposes several facts under overloaded labels such as
"installed" or "available": declared pack intent, realized canonical assets,
provider-view materialization, running-session catalog visibility, and native
dispatch outcome. Those facts can disagree. A user can select user scope while
the picker and completion summary imply project placement; canonical agents can
be complete while the active provider cannot discover them; and generic-child
fallback can be mistaken for native-role success.

The project must establish one evidence model shared by picker, installation,
inventory, synchronization, diagnostics, and dispatch reporting. It must also
integrate four bounded child workstreams without erasing their ownership: safe
collection-directory symlink adoption, repository-local `AGENTS.md` guidance,
provider restart/refresh guidance, and dispatch provenance plus optional
runtime observation.

The design starts from three shipped baselines. PR #227 owns the separate
project-artifact `shared | local | synced` axis. PR #240 owns content-aware
canonical inventory and lifecycle/config cleanup. PR #242 owns exact,
dependency-local canonical role resolution while leaving provider-native
selection authoritative.

## Goals

### Primary Goals

- Make requested tool-pack scope and realized placement separately observable
  and consistent across interactive, human-readable, and JSON surfaces.
- Represent canonical health, provider capability/materialization, runtime
  visibility, restart state, and dispatch outcome as source-qualified facts.
- Make supported user-scope agents reachable through every active configured
  provider, or fail closed with an exact unsupported or missing-view reason.
- Integrate the directory-symlink, `AGENTS.md`, restart, and dispatch-provenance
  child contracts through the same evidence vocabulary.
- Preserve the accepted PR #227, #240, and #242 contracts.

### Secondary Goals

- Permit child workstreams to ship independently once the shared state contract
  is stable and their compatibility boundaries are maintained.
- Leave room for future provider catalog probes without requiring one for the
  first truthful filesystem/materialization release.

## Non-Goals

- Reimplementing or changing project-artifact synced scope from PR #227.
- Reopening PR #240's seed classification, same-version drift detection,
  adoption reporting, false-intent rejection, or removed per-pack `--force`.
- Replacing PR #242's canonical-role resolution or changing native provider,
  model, effort, variant, route, or authority selection.
- Automatically restarting provider applications or changing authentication.
- Replacing provider-native catalogs with a universal OAT runtime catalog.
- Treating a generic child with copied instructions as native-role success.
- Reworking PJM migration/adoption eligibility, shared-owner attribution, or
  doctor/status fault-tolerance already owned by `scope-adoption-diagnostics`.
- Designing the broader review/gate receipt schema.

## Requirements

### Functional Requirements

**FR1: Layered Truth Model**

- **Description:** OAT must represent declared scope intent, canonical asset
  health, realized placement, provider capability, provider materialization,
  session visibility, restart requirement, and dispatch outcome as distinct,
  source-qualified facts.
- **Acceptance Criteria:**
  - Each fact carries an explicit known, unknown, supported, unsupported, or
    observed state appropriate to its layer; absence of evidence is never
    rendered as success.
  - Canonical completeness does not imply provider projection or session
    visibility, and declared intent does not imply physical placement.
  - Human-readable and JSON outputs derive from the same normalized facts.
- **Priority:** P0

**FR2: Truthful Scope Selection and Realization**

- **Description:** Interactive and non-interactive installation must preserve
  the user's selected project/user scope and report the verified realized end
  state without inferring placement from stale declarations.
- **Acceptance Criteria:**
  - A user-scope selection with no verified project installation creates and
    reports user placement only.
  - Existing verified placement remains additive only when already realized or
    explicitly selected; declared-but-absent state cannot silently add a scope.
  - The four issue-#228 selections—ideas, utility, research, and brainstorm—have
    regression coverage for pre-install labels, applied scope, auto-sync scope,
    and completion output.
  - Partial writes or failed verification preserve unrelated content and emit
    a diagnosable incomplete result.
- **Priority:** P0

**FR3: Consistent Inventory and Lifecycle Surfaces**

- **Description:** Tool listing, picker state, install/update/remove/reconcile,
  sync planning, status, and doctor must agree on intent, canonical health,
  placement, and provider reachability.
- **Acceptance Criteria:**
  - Absent, declared-only, partial, current, drifted, newer, duplicate-scope,
    and provider-unreachable cases have unambiguous, compatible renderings.
  - PR #240 canonical health and seed semantics remain unchanged.
  - Duplicate scope reports both realized scopes without inferring provider
    precedence.
- **Priority:** P0

**FR4: Provider Capability and Materialization Matrix**

- **Description:** OAT must evaluate active providers by scope and managed
  content type rather than infer universal reachability from path presence or a
  fixed role allowlist.
- **Acceptance Criteria:**
  - Provider activation follows configured authority: enabled beats detection,
    disabled suppresses detection, and unset follows detection.
  - Provider activation and capability evidence are resolved outside
    deterministic canonical inventory and injected without internal provider
    re-detection.
  - The matrix covers skills, agents, rules, and declared managed directories,
    with explicit unsupported states.
  - Every active supported provider with a user-agent destination materializes
    supported managed roles, including Claude reviewer and implementer roles.
  - Unsupported or failed materialization emits the provider, scope, content
    type, affected assets, and an actionable recovery path.
- **Priority:** P0

**FR5: Collection-Directory Symlink Child Contract**

- **Description:** Provider collection-directory aliases must be preferred when
  exact and safe, while unmanaged divergence falls back to per-entry sync
  without mutating canonical or user-owned content.
- **Acceptance Criteria:**
  - Exact-target aliases, including safe relative links, can be adopted as one
    inherited collection with explicit manifest ownership.
  - Broken, foreign, nested, mismatched, race-swapped, or divergent aliases
    fail closed or use per-entry sync without deleting or hiding unmanaged data.
  - Exact collection proof rejects provider-only divergence even though PR
    #240's bounded canonical skill comparison intentionally ignores local extras.
  - Repeated sync, canonical additions/removals, and provider disablement remain
    deterministic and cannot delete canonical content through the alias.
- **Priority:** P0

**FR6: Project AGENTS.md Guidance Child Contract**

- **Description:** Capability installation and repository-local OAT guidance
  must remain independent choices surfaced consistently by init and standalone
  workflow installation.
- **Acceptance Criteria:**
  - Interactive flows explicitly offer repository guidance. When root
    `AGENTS.md` is absent, accepted guidance may create it exclusively; when it
    already exists or is a symlink, OAT emits an actionable managed-block patch
    and never automatically replaces the file.
  - Existing user-authored content is preserved by zero-write manual fallback,
    repeated runs are idempotent, and ownership is shared across all entry
    points without duplicate blocks.
  - Non-interactive flows do not mutate `AGENTS.md` without explicit opt-in.
    Explicit opt-in may create an absent file, but an existing file always
    yields the same actionable manual patch instead of automatic mutation.
  - The guidance choice never changes tool-pack scope or implies PJM adoption.
- **Priority:** P0

**FR7: Restart and Refresh Truthfulness Child Contract**

- **Description:** OAT must distinguish missing/unsupported provider views from
  a materialized catalog that requires provider restart or refresh.
- **Acceptance Criteria:**
  - Post-materialization output reports restart/refresh requirements only for
    providers whose session catalog can be stale after filesystem changes.
  - The notice names the affected provider/content and never claims restart can
    repair absent or unsupported materialization.
  - When runtime visibility cannot be probed, the state is reported as unknown
    or restart-required based on source-qualified provider capability, not as
    visible.
  - No provider process is restarted automatically.
- **Priority:** P0

**FR8: Native Dispatch and Fallback Provenance Child Contract**

- **Description:** Dispatch reporting must preserve native selection, explicit
  pre-start rejection, canonical fallback identity, and generic-child fallback
  as separate events.
- **Acceptance Criteria:**
  - The configured provider, exact role/variant, model, effort, route, authority,
    tool/sandbox controls, and selection source remain immutable evidence.
  - Only explicit rejection before any child starts can authorize the recorded
    fallback route; accepted or post-start failures cannot trigger replacement.
  - Fallback records include rejection evidence, fallback reason, exact
    canonical role-file identity/version, and approximation labeling.
  - PR #242's dependency-owned root order and exact unsuffixed canonical
    Markdown identity remain authoritative.
- **Priority:** P0

**FR9: Runtime Observation Boundary**

- **Description:** Optional provider transcript metadata may corroborate
  post-launch runtime identity without becoming configured selection evidence
  or a fallback trigger.
- **Acceptance Criteria:**
  - Runtime observation is source-qualified and separately represents matching,
    missing, mismatching, and not-reported evidence.
  - Sanitized metadata excludes prompts and message content.
  - A mismatch or absent observation cannot authorize replacement, retry, or
    fallback.
  - Providers that do not expose a field report `not-reported` rather than
    copying requested values into observed state.
- **Priority:** P1

**FR10: Baseline Compatibility**

- **Description:** The feature must compose with the merged PR #227, #240, and
  #242 contracts without conflating adjacent scope axes or weakening accepted
  safety behavior.
- **Acceptance Criteria:**
  - Tool-pack writes preserve `projects.defaultScope`, `projects.root`, and
    future sibling project fields.
  - Project-artifact `shared | local | synced` never appears as tool-pack or
    provider scope.
  - Canonical inventory continues to detect equal-version drift, preserve owner
    overrides, normalize expected file modes, and validate managed roots.
  - Provider-native dispatch remains authoritative before canonical fallback.
- **Priority:** P0

### Non-Functional Requirements

**NFR1: Filesystem and Ownership Safety**

- **Description:** All reconciliation must preserve unmanaged and user-owned
  content and enforce managed-root containment across aliases and real paths.
- **Acceptance Criteria:**
  - No broad delete/recreate fallback is used for provider directories or
    `AGENTS.md`.
  - Broken, escaping, foreign, or apply-time-swapped paths fail closed before
    mutation.
  - Home paths and user-specific absolute paths remain redacted in durable
    output.
- **Priority:** P0

**NFR2: Idempotence and Failure Atomicity**

- **Description:** Repeated init, install, sync, diagnostics, refresh, and
  dispatch-report operations must converge without duplicating ownership or
  silently broadening scope.
- **Acceptance Criteria:**
  - Repeating a successful operation produces no semantic changes.
  - Partial failure retains unrelated config, canonical assets, provider views,
    custom agents, and guidance content.
  - Recovery output identifies the failed layer and safe next action.
- **Priority:** P0

**NFR3: Provenance and Explainability**

- **Description:** Every reported state transition must identify its evidence
  source and avoid collapsing requested, configured, filesystem, provider, and
  runtime facts.
- **Acceptance Criteria:**
  - Human and JSON outputs can explain why a pack or agent is unavailable.
  - Unknown and unsupported states are stable, explicit values rather than
    inferred booleans.
  - Generic fallback is never labeled as native-role equivalence.
- **Priority:** P0

**NFR4: Compatibility and Release Discipline**

- **Description:** Shipped CLI, provider, skill, agent, and documentation
  changes must preserve backward-compatible config reading where safe and meet
  the repository's lockstep release contract.
- **Acceptance Criteria:**
  - Legacy state is migrated only through an explicit, tested compatibility
    path or left unchanged with actionable diagnostics.
  - Every affected public package version advances in lockstep and all required
    release/skill/docs gates pass before completion.
- **Priority:** P0

**NFR5: Bounded Local Evaluation**

- **Description:** Inventory and reachability evaluation must remain a bounded
  local operation and must not launch providers merely to determine basic
  filesystem/materialization state.
- **Acceptance Criteria:**
  - Static inventory performs bounded filesystem/config inspection with no
    provider process launch or network requirement.
  - Optional runtime catalog probes or transcript observation remain separate,
    capability-gated operations with explicit unknown/not-reported fallbacks.
- **Priority:** P1

## Constraints

- The repository knowledge index predates PR #227/#240/#242; current merged
  source, tests, decisions, and project summaries are authoritative where they
  differ.
- Existing provider directories may contain valuable unmanaged content.
- Provider-native catalogs and reload behavior differ; filesystem presence
  alone cannot prove runtime visibility.
- PR #240 inventory health and placement are related but not interchangeable:
  completeness counts managed presence, while placement currently also admits
  enabled intent.
- The directory-symlink and `AGENTS.md` workstreams retain their existing
  backlog acceptance boundaries even when implemented as child slices.
- PR #249 (`scope-adoption-diagnostics`) is the accepted implementation
  predecessor at merge SHA
  `2c6005d64f45a19e8b9eedbc977959b066d3eda0`. Its inventory, doctor/status,
  shared-owner, and diagnostic-fault-tolerance corrections are current-main
  baseline behavior, not work for this project to repeat.
- Changes to bundled skills, agents, docs, or CLI behavior are shipped
  functionality and trigger lockstep package/release validation.

## Dependencies

- Merged PR #227 project-artifact scope and config-preservation contracts.
- Merged PR #240 canonical inventory and lifecycle/config contracts.
- Merged PR #242 canonical-agent root, identity, and native-first contracts.
- Existing provider adapters, canonical scanner, sync planner/executor,
  materialization extensions, manifest ownership, and CLI output conventions.
- Backlog children `BL-260724`, `BL-260828`, and `BL-260826`; restart/refresh
  diagnosis remains directly owned by the umbrella.
- PR #249 supplies the narrow landed diagnostic baseline. This project expands
  provider materialization and end-to-end scope truth from its accepted
  current-main interfaces.

## High-Level Design (Proposed)

Introduce one provider-neutral evidence projection above the existing canonical
inventory and provider adapters. Canonical inventory remains responsible for
intent, asset health, completeness, and realized placement. Provider adapters
contribute capability, materialization, catalog/restart semantics, and evidence
sources. Picker, lifecycle, sync, status, doctor, and dispatch render compatible
views of the same facts rather than maintaining independent booleans.

The umbrella defines the shared vocabulary and integration rules. The
directory-symlink and `AGENTS.md` children own their safe mutations; the restart
child owns provider refresh interpretation and notices; the dispatch child owns
configured/native/fallback provenance while optional runtime observation stays
strictly post-launch. Child delivery may be staged, but no child may invent a
different state vocabulary or weaken PR #227/#240/#242 baselines.

**Key Components:**

- **Canonical inventory evidence** — Existing intent, asset health,
  completeness, placement, and ownership facts.
- **Provider capability and reachability evidence** — Provider/scope/content
  support, materialization, visibility confidence, and restart semantics.
- **Lifecycle projection** — Shared facts consumed by picker, installation,
  sync, list/status, and diagnostics.
- **Bounded mutation children** — Directory alias adoption and managed project
  guidance with separate safety ownership.
- **Dispatch evidence** — Native selection, pre-start rejection, fallback, and
  optional post-launch observation without equivalence collapse.

**Alternatives Considered:**

- **Provider-specific reachability logic** — Rejected as the primary model
  because lifecycle surfaces would continue to disagree and every provider
  would duplicate state semantics.
- **Diagnostics-only correction** — Rejected because it cannot repair scope
  realization, user-agent materialization, collection aliases, or fallback
  provenance.

_Detailed schemas, interfaces, and ownership transitions are resolved in
`design.md` after requirements confirmation._

## Success Metrics

- Every issue-#228 scope choice is rendered and realized exactly as selected in
  focused end-to-end regression tests.
- Every applicable provider/scope/content combination yields an explicit
  supported/materialized/visible-or-unknown state with no silent omission.
- Directory alias tests cover exact adoption, divergence fallback, unsafe links,
  repeated sync, provider disablement, and canonical add/remove behavior with
  zero unmanaged-content loss.
- Guidance tests cover exclusive absent-file creation and existing/symlinked
  zero-write patch output, opt-in/decline, non-interactive behavior, and
  repeated runs with unrelated content preserved byte-for-byte.
- Dispatch tests prove native-first selection, rejection-only fallback,
  immutable target controls, canonical identity, approximation labeling, and
  post-acceptance no-replacement behavior.
- Focused PR #227/#240/#242 regression suites and the repository's complete
  Definition-of-Done gate sequence pass uncached where evidence requires it.

## Requirement Index

| ID   | Description                                   | Priority | Verification                                 | Planned Tasks                                                                                              |
| ---- | --------------------------------------------- | -------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| FR1  | Layered source-qualified truth model          | P0       | unit + integration: normalized evidence      | p02-t01, p02-t04, p02-t06, p03-t05, p06-t02, p07-t03                                                       |
| FR2  | Truthful scope selection and realization      | P0       | e2e: issue-228 picker and install flow       | p02-t04, p02-t05                                                                                           |
| FR3  | Consistent inventory and lifecycle surfaces   | P0       | integration: CLI human and JSON parity       | p02-t01, p02-t05, p02-t06, p02-t07                                                                         |
| FR4  | Provider capability/materialization matrix    | P0       | unit + integration: provider state matrix    | p02-t02, p02-t03, p03-t01, p03-t02, p03-t03, p03-t04                                                       |
| FR5  | Safe collection-directory symlink child       | P0       | integration: alias adoption and divergence   | p04-t01, p04-t02, p04-t03, p04-t04, p04-t05                                                                |
| FR6  | Safe project AGENTS.md guidance child         | P0       | integration: prompt and managed block        | p05-t01, p05-t02, p05-t03, p05-t04                                                                         |
| FR7  | Truthful restart and refresh guidance child   | P0       | unit + integration: provider restart notices | p03-t05                                                                                                    |
| FR8  | Native and fallback dispatch provenance child | P0       | unit + integration: dispatch event lineage   | p06-t01, p06-t02, p06-t03, p06-t04                                                                         |
| FR9  | Sanitized runtime observation boundary        | P1       | integration: transcript metadata evidence    | p07-t01, p07-t02, p07-t03                                                                                  |
| FR10 | PR #227/#240/#242 baseline compatibility      | P0       | integration: baseline regression contracts   | p01-t01, p02-t01, p02-t05, p06-t01, p06-t02, p07-t04                                                       |
| NFR1 | Filesystem and ownership safety               | P0       | integration: containment and race fixtures   | p04-t02, p04-t03, p04-t04, p05-t01, p06-t03, p07-t01, p07-t02                                              |
| NFR2 | Idempotence and failure atomicity             | P0       | integration: rerun and partial failure       | p02-t04, p02-t05, p02-t07, p03-t02, p03-t03, p04-t01, p04-t03, p04-t04, p05-t01, p05-t03, p06-t02, p06-t03 |
| NFR3 | Provenance and explainability                 | P0       | unit + integration: source-qualified output  | p02-t01, p02-t06, p03-t05, p06-t01, p06-t02, p06-t03, p06-t04, p07-t03                                     |
| NFR4 | Compatibility and release discipline          | P0       | manual + integration: release gates          | p01-t01, p02-t06, p02-t07, p04-t01, p06-t04, p07-t04                                                       |
| NFR5 | Bounded local evaluation                      | P1       | unit: no-launch static inventory boundaries  | p02-t02, p02-t03, p03-t01, p03-t05, p07-t01, p07-t02, p07-t03                                              |

## Open Questions

- What exact discriminated schema represents layer state, evidence source,
  confidence, and recovery without persisting transient provider catalog state?
- Which provider/content combinations are supported, unsupported, restart-only,
  or not probeable at user and project scope?
- Should PR #240's existing `user-agent-unmaterialized` diagnostic remain as a
  compatibility fallback after provider-matrix evidence exists?
- What exact proof allows collection-directory adoption while rejecting all
  provider-only divergence and preserving apply-time path safety?
- How is one managed `AGENTS.md` section owned across init and standalone pack
  installation when the file is absent, symlinked, or already customized?
- Which provider refresh requirements are static capabilities versus observed
  runtime facts, and how long may any observation remain valid?
- What is the smallest dispatch provenance envelope that preserves configured
  target, pre-start rejection, canonical fallback identity, runtime observation,
  and strict no-replacement boundaries?
- Can the four child slices share one release while retaining independent
  implementation/review ownership, or should planning stage them across PRs?
- No open predecessor-SHA question remains: PR #249 merge SHA
  `2c6005d64f45a19e8b9eedbc977959b066d3eda0` is the umbrella implementation
  base. Its landed interfaces require adaptation notes but no requirement or
  stable-task remap.

## Assumptions

- The issue-#228 transcript is accurate as incident evidence, though this
  bounded revalidation did not reproduce the interactive run.
- Provider adapters can declare filesystem/materialization and restart
  capabilities even where live catalog visibility remains unknown.
- Existing configuration and manifests can be extended compatibly or migrated
  explicitly without silently reinterpreting old values.
- The shared evidence model is stable enough to let child implementations land
  separately after design approval.

## Risks

- **State-model overreach:** One schema attempts to become a universal provider
  runtime catalog.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Keep configured, filesystem, materialization, restart, and
    runtime observation layers separate and permit explicit unknown states.
- **Unsafe alias adoption:** Near-match or race-swapped directory links hide or
  mutate user content.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Require exact collection identity, pre-apply and apply-time
    containment checks, and non-destructive divergence fallback.
- **Provider false confidence:** Static files are rendered as runtime-visible.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation:** Never promote materialization evidence to visibility;
    report unknown/restart-required unless corroborated.
- **Scope regression:** New lifecycle projection overwrites PR #227 config or
  reintroduces issue-#228 project placement.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Preserve sibling config fields and add exact picker/apply
    regressions for declared-only and user-only cases.
- **Fallback misclassification:** A post-start failure or observed mismatch
  authorizes an unapproved replacement.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Make pre-start rejection the sole transition to fallback
    and keep runtime observation non-authoritative.

## References

- Discovery: `discovery.md`
- `BL-260829-make-tool-pack-scope-selection`
- `BL-260724-support-provider-directory`
- `BL-260828-add-project-level-oat-guidance`
- `BL-260826-populate-native-subagent`
- PR #227, PR #240, PR #242, and PR #249 merged contracts
- Knowledge Base: `.oat/repo/knowledge/project-index.md` (orientation only;
  generated before the merged baselines)
