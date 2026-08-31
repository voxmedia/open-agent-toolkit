---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-08-30
oat_generated: false
---

# Specification: Remote Project Management

## Phase Guardrails (Specification)

This specification defines requirements and acceptance criteria. Concrete file
layouts, command signatures, schemas, and provider implementations belong in
`design.md` and `plan.md`.

## Problem Statement

OAT needs deliberate, safe integration with GitHub Issues, Linear, and Jira
Cloud without surrendering its complete, searchable, offline-capable local
project-management surface. One local backlog item or project may relate to
multiple remote records that serve different purposes and have different
schemas, authorities, lifecycle rules, and available transports.

A whole-record synchronization model cannot represent those boundaries safely.
The system needs durable per-binding identity, purpose, policy, reconciliation
state, operation evidence, and lifecycle handling while preserving the local
record as the complete agent working surface. Remote mutations must remain
explicit, policy-controlled, verifiable, and recoverable when their outcome is
uncertain.

## Goals

### Primary Goals

- Preserve fully useful local PJM workflows when remote providers, credentials,
  transports, or network access are unavailable.
- Support GitHub Issues, Linear, and Jira Cloud through one provider-neutral
  binding and reconciliation model without erasing provider-specific semantics.
- Permit multiple independently governed remote bindings on one local backlog
  item or OAT project.
- Make every remote mutation policy-controlled, previewable when required,
  verifiable, and recoverable after an uncertain outcome.
- Support explicit intake, publish, refresh, reconcile, and closeout lifecycle
  operations.
- Retain a bounded complete non-secret core-issue snapshot locally for offline use.
- Support verified, policy-authorized completion annotations and lifecycle
  transitions per binding.

### Secondary Goals

- Allow an uncommon binding to declare multiple explicit purposes without
  duplicating one remote record.
- Reconcile priority only when a binding advertises a safe mapping.
- Fetch remote discussions on demand as read-only evidence.
- Support user-configured external CLI fallbacks without bundling or installing
  provider tools.
- Preserve provider-native fields as extensions outside the shared field
  contract.

## Non-Goals

- Continuous daemons, webhooks, automatic polling, or background synchronization.
- Automatic or transitive provider-to-provider mirroring.
- Synchronization or default offline retention of comments, activity history,
  or assignees.
- Conversion of OAT plan tasks into remote subtasks by default.
- Jira Server or Jira Data Center support.
- Distributed locks, leases, shared coordination, or a designated-writer
  guarantee.
- Bundling or automatically installing `gh`, a community Linear CLI, or
  Atlassian `acli`.
- A first-party Linear GraphQL transport unless later capability analysis
  demonstrates that it is necessary.
- Autonomous destructive actions or complete-description replacement without
  fresh approval.
- Broad normalization of labels, due dates, estimates, provider-native types,
  or other fields outside the V1 shared contract.

## Requirements

### Functional Requirements

#### FR1: Multi-provider scope and coexistence

- **Description:** GitHub Issues, Linear, and Jira Cloud must all implement and
  validate the shared remote-binding model and may coexist on one local item or
  project.
- **Acceptance Criteria:**
  - The system supports zero, one, or several configured providers.
  - One local item can hold several bindings, including multiple bindings to
    the same provider.
  - GitHub can serve as source, planning tracker, or both without requiring
    Linear or Jira or duplicating an issue.
  - Shared conformance scenarios pass for all three providers.
  - Provider-native fields remain available as extensions rather than being
    discarded or forced into the common schema.
- **Priority:** P0

#### FR2: Local-first operation

- **Description:** Ordinary local backlog and project work must remain available
  without remote access.
- **Acceptance Criteria:**
  - Agents can search, create, enrich, promote, and execute local work with all
    remote transports unavailable.
  - Network or credential absence does not block local project lifecycle
    operations.
  - A requested remote mutation that cannot run becomes an explicit pending
    intent and is never represented as successful.
  - Detailed discovery, specification, design, planning, implementation, and
    deferred-work context remains local.
- **Priority:** P0

#### FR3: Binding purposes and independent policy

- **Description:** Every durable remote binding must carry one or more explicit
  purposes with independently governed behavior.
- **Acceptance Criteria:**
  - Supported purposes are `source`, `planning`, `delivery`, and `reference`.
  - `source` defaults to remote ownership of shared fields.
  - `planning` defaults to three-way reconciliation of allowed shared fields.
  - `delivery` and `reference` do not write shared planning fields by default.
  - Multiple purposes may be declared explicitly, but no purpose implicitly
    grants another purpose's field or lifecycle authority.
  - A multi-purpose binding still represents one remote record and produces one
    combined closeout action.
- **Priority:** P0

#### FR4: Explicit lifecycle operations

- **Description:** Remote interaction must occur only through deliberate intake,
  publish, refresh, reconcile, and closeout operations.
- **Acceptance Criteria:**
  - Intake creates or enriches local work from a remote issue.
  - Publish creates or updates a selected remote planning record.
  - Refresh reads current remote state without writing.
  - Reconcile compares baseline, local state, and remote state and previews
    proposed actions.
  - Closeout evaluates completion actions independently for eligible bindings.
  - No lifecycle operation automatically propagates a change to another provider.
- **Priority:** P0

#### FR5: Durable binding and synchronization evidence

- **Description:** Operational synchronization state must extend the portable
  human-facing issue association with sufficient durable identity and recovery
  evidence.
- **Acceptance Criteria:**
  - Each binding retains provider and account, workspace, or repository context.
  - Durable remote identity is stored separately from current and historical
    display aliases.
  - A binding can retain purposes, last-agreed normalized state, remote revision
    and freshness evidence, pending operations, approvals, attempts, receipts,
    uncertainty, lifecycle condition, and capability and adapter evidence.
  - A portable human-readable association remains available.
  - The storage boundary is defined by design without requiring one particular
    specification-level file layout.
- **Priority:** P0

#### FR6: Minimal shared planning-field contract

- **Description:** Cross-provider reconciliation must be limited to title and
  policy-governed description content, with only narrowly conditional expansion.
- **Acceptance Criteria:**
  - Title participates in the shared reconciliation contract.
  - Description participates only according to the effective content policy.
  - Priority participates only when the binding advertises a safe provider mapping.
  - Status is handled as lifecycle policy, not as an ordinary shared field.
  - Labels, due dates, estimates, provider-native types, comments, activity, and
    assignees are not silently normalized into the shared contract.
- **Priority:** P0

#### FR7: Remote-description content policy

- **Description:** Remote description writes must use one of three configured
  outcome modes with fail-closed precedence.
- **Acceptance Criteria:**
  - Supported modes are complete replacement, an explicit OAT-managed section,
    and no remote update.
  - An unconfigured repository fails closed to no remote description update
    while reads and intake remain available.
  - Repository policy supplies the default, provider policy may override it,
    and a binding may only tighten it.
  - Managed-section mode preserves all surrounding remote-owned content.
  - Complete replacement always requires a preview and fresh user approval,
    regardless of broader configured authority.
  - Full locally retained description content remains separate from the
    writable reconciliation baseline.
- **Priority:** P0

#### FR8: Remote-mutation authority modes

- **Description:** Mutation authority must be resolved by provider and operation
  class using four explicit modes.
- **Acceptance Criteria:**
  - Supported modes are `read-only`, `user-authorized`, `user-approved`, and
    `autonomous`.
  - The repository default is `read-only`.
  - Provider policy may broaden repository authority.
  - Binding policy may only tighten the resolved authority.
  - `user-authorized` requires an explicit user instruction.
  - `user-approved` requires fresh approval after preview.
  - `autonomous` applies only within an otherwise authorized active workflow
    and does not enable background sync or transitive propagation.
  - Destructive operations and complete-description replacement have a
    non-configurable `user-approved` floor.
- **Priority:** P0

#### FR9: Three-way, preview-first reconciliation

- **Description:** Reconciliation must compare the last-agreed baseline, current
  local normalized state, and current remote normalized state for one binding.
- **Acceptance Criteria:**
  - Results distinguish local-only change, remote-only change, non-overlapping
    changes, same-field conflict, no change, remote lifecycle anomaly, and an
    uncertain prior operation.
  - Non-overlapping changes may be proposed together in one preview.
  - Same-field conflicts always require an explicit resolution.
  - Uncertain writes and remote replacements are never silently resolved.
  - Reconciliation does not globally declare either local or remote state the winner.
- **Priority:** P0

#### FR10: Per-binding atomicity and batch behavior

- **Description:** A remote binding is the atomic unit for baselines, policy,
  mutation, receipts, and outcomes.
- **Acceptance Criteria:**
  - Item, project, repository, and reviewed-batch operations may consolidate
    previews across bindings.
  - Each binding advances, fails, or remains uncertain independently.
  - A successful binding is not rolled back because another provider binding failed.
  - The system never claims an all-or-nothing transaction across providers.
  - Batch results expose the outcome of every binding.
- **Priority:** P0

#### FR11: Guarded writes and accepted concurrency limitation

- **Description:** V1 must mitigate, but does not claim to prevent, rare
  simultaneous-writer races.
- **Acceptance Criteria:**
  - OAT refreshes authoritative remote state and revision evidence immediately
    before mutation.
  - It previews when required by effective policy.
  - It performs one write attempt and reads the remote record back to verify
    requested postconditions.
  - A command exit code alone cannot establish success.
  - An uncertain outcome blocks blind retry and requires authoritative reconciliation.
  - No test or user-facing claim promises locks, leases, shared coordination,
    or single-writer safety.
- **Priority:** P0

#### FR12: Bounded offline core snapshot

- **Description:** Sync-down must retain a bounded complete non-secret core-issue
  snapshot for useful offline work.
- **Acceptance Criteria:**
  - The snapshot includes durable identity and aliases, title, complete
    non-secret description, status and other core provider fields, and revision
    and freshness evidence.
  - High-confidence credential values are a hard exception: they are redacted
    before persistence and the snapshot is visibly marked incomplete by
    redaction rather than falsely reported as byte-complete.
  - Full description retention is independent of remote description-write authority.
  - Snapshot and journal content is local and gitignored by default while
    remaining available across worktrees on the same machine. Shared tracked
    retention requires explicit opt-in and previewed approval.
  - Comments, activity history, and assignees are excluded by default.
  - Excluded discussion data may be fetched on demand as read-only evidence
    while remote access exists.
- **Priority:** P0

#### FR13: Remote-record lifecycle preservation

- **Description:** Missing, moved, archived, deleted, inaccessible, and
  temporarily unavailable records must preserve local evidence and require
  explicit resolution.
- **Acceptance Criteria:**
  - The binding and last complete local core snapshot are retained for every
    listed condition.
  - A generic not-found result is not treated as proof of deletion.
  - Writes stop while identity or availability is unresolved.
  - Verified moves may retain durable identity while updating aliases.
  - Archived records become read-only.
  - Relink, detach, and recreate are explicit policy-governed operations and
    never automatic.
- **Priority:** P0

#### FR14: Creation provenance and duplicate recovery

- **Description:** Every remote create must begin with durable local intent and
  leave enough provenance for safe duplicate recovery.
- **Acceptance Criteria:**
  - Local intent exists before a create attempt.
  - Provider-native provenance is preferred when supported.
  - A visible origin link is used only when effective content policy permits it.
  - Hidden markers are not inserted into human content.
  - After an uncertain create, OAT searches and reconciles using available
    provenance before any retry.
- **Priority:** P0

#### FR15: Per-binding closeout and completion annotations

- **Description:** Local project completion must evaluate each binding
  independently for provider-valid transitions and one-way completion annotations.
- **Acceptance Criteria:**
  - `source` and `planning` bindings may propose evidence or transitions only
    when effective authority permits.
  - `delivery` normally defers to provider-native development automation.
  - `reference` remains unchanged.
  - Local phase change alone never causes a remote status transition.
  - Every transition and annotation is verified after the write.
  - Completion annotations remain distinct from discussion synchronization and
    do not require local retention of the remote thread.
  - Multi-binding closeout is a reviewed batch of independent outcomes.
- **Priority:** P0

#### FR16: Transport defaults, capability negotiation, and fallback

- **Description:** Providers must use configurable ordered transports selected
  by capability and effective mutation authority.
- **Acceptance Criteria:**
  - GitHub defaults to an installed `gh` CLI.
  - Linear and Jira default to MCP or connector OAuth.
  - An installed community Linear CLI and Atlassian `acli` may be configured as
    alternatives.
  - OAT does not bundle or install external provider CLIs.
  - The first available transport satisfying the requested capability and
    authority is selected.
  - Fallback is allowed before mutation.
  - After a write attempt or uncertain outcome, OAT reconciles before switching transports.
  - Transport-specific behavior does not define the shared domain contract.
- **Priority:** P0

#### FR17: Representative cross-provider workflows

- **Description:** The shared model must support GitHub-source-to-Linear-planning,
  GitHub-source-to-Jira-planning, and GitHub-only tracking.
- **Acceptance Criteria:**
  - A GitHub source issue can be intaken locally, linked or published to Linear,
    worked locally, and closed out according to each binding's policy.
  - The same flow works with Jira while discovering rather than assuming Jira
    fields, workflows, ADF, permissions, and transitions.
  - GitHub-only use does not require duplicate issues to represent multiple purposes.
  - Provider-native delivery automation can remain authoritative where configured.
- **Priority:** P0

#### FR18: Local and remote information boundaries

- **Description:** Detailed OAT execution artifacts must remain local while
  remote discussion and ownership data remain informational rather than
  synchronized fields.
- **Acceptance Criteria:**
  - OAT discovery, specifications, designs, plans, implementation records, and
    deferred work are not copied wholesale into remote tickets.
  - Agent-level plan tasks do not become remote subtasks by default.
  - Remote comments, discussion history, and assignees do not become synchronized fields.
  - On-demand discussion evidence may be distilled into locally authored backlog content.
- **Priority:** P1

### Non-Functional Requirements

#### NFR1: Credential and secret safety

- **Description:** Core and synchronization evidence must never persist credential values.
- **Acceptance Criteria:**
  - No credential value appears in local or tracked configuration, snapshots, logs,
    previews, receipts, or error output.
  - Provider authentication remains transport-managed.
  - Automated secret scans over representative operations report no leaked credentials.
- **Priority:** P0

#### NFR2: Fail-closed mutation safety

- **Description:** Ambiguity, uncertainty, permission gaps, unsupported
  capability, and schema drift must prevent unsafe mutation.
- **Acceptance Criteria:**
  - Each enumerated unsafe condition produces no remote write.
  - User-visible output identifies the blocking condition and safe reconciliation path.
  - No mutation is reported successful without verified postconditions.
- **Priority:** P0

#### NFR3: Durable auditability and restart safety

- **Description:** Correctness must survive ephemeral agent sessions and interrupted operations.
- **Acceptance Criteria:**
  - A new process can reconstruct pending, attempted, successful, failed, and
    uncertain operation state from durable evidence.
  - Receipts retain provider, target, revision, capability, and outcome evidence
    sufficient for authoritative reconciliation.
  - Recovery does not depend on one agent's in-memory state.
- **Priority:** P0

#### NFR4: Offline usefulness

- **Description:** Local PJM must remain useful with all remote capabilities unavailable.
- **Acceptance Criteria:**
  - The local-only workflow suite passes with network and provider transports disabled.
  - Previously refreshed items expose freshness and the complete non-secret
    bounded core snapshot plus any redaction status.
  - Pending remote actions are visibly distinguished from completed work.
- **Priority:** P0

#### NFR5: Provider-semantic preservation

- **Description:** The shared model must avoid a lowest-common-denominator abstraction.
- **Acceptance Criteria:**
  - Provider-specific identity, fields, workflow rules, formatting, and
    capabilities remain representable.
  - Unsupported common mappings fail closed or remain provider extensions.
  - Jira ADF, tenant-specific schema, and transitions are discovered rather than assumed.
- **Priority:** P0

#### NFR6: User-visible clarity

- **Description:** Previews and results must make authority, freshness,
  conflict, uncertainty, and per-binding outcomes understandable.
- **Acceptance Criteria:**
  - Mutation previews identify provider, target binding, operation, affected
    fields, effective authority, and observed revision.
  - Reconciliation output explicitly labels each classification.
  - Reviewed batches show every binding's independent result.
  - Stale snapshots and uncertain operations are visibly marked.
- **Priority:** P1

#### NFR7: Existing-PJM compatibility

- **Description:** Remote integration must not break or weaken existing local PJM behavior.
- **Acceptance Criteria:**
  - Existing local-only PJM regression tests pass unchanged.
  - Repositories with no remote configuration retain their current behavior.
  - Existing human-facing issue associations remain usable.
- **Priority:** P0

#### NFR8: Replaceable transport capability layer

- **Description:** Transport evolution must not alter provider-neutral lifecycle
  and reconciliation semantics.
- **Acceptance Criteria:**
  - Equivalent semantic conformance scenarios pass through each supported
    transport for the capabilities it advertises.
  - Unavailable capability is reported before mutation.
  - Transport version and capability evidence is retained with operation evidence.
- **Priority:** P1

## Constraints

- Existing local PJM workflows and portable issue-association metadata must remain intact.
- `associated_issues` is currently a human-facing, unvalidated metadata
  convention rather than an executable synchronization subsystem; design must
  introduce the richer validated domain model explicitly.
- Repository-derived implementation assumptions from the 2026-08-19 knowledge
  snapshot require current-code revalidation before implementation.
- Agent sessions are ephemeral.
- Full remote snapshots and operation journals are machine-local by default;
  cross-machine portability is an explicit sensitive-data opt-in, not an
  implicit consequence of PJM adoption.
- Remote access, credentials, MCP tools, and provider CLIs may be absent.
- Jira scope is Jira Cloud only.
- One item may bind to several records, including several from one provider.
- No cross-provider all-or-nothing transaction is available.
- V1 accepts rare concurrent-writer races and must describe that limitation honestly.

## Dependencies

- Existing local project-management commands, records, and project lifecycle.
- GitHub Issues, Linear, and Jira Cloud provider capabilities.
- GitHub `gh`, Linear and Jira MCP connectors, and optionally user-installed external CLIs.
- Provider authentication managed outside tracked project files.
- Provider capability, schema, permission, revision, and transition discovery.
- Provider-native branch, pull-request, merge, and tracker automation where teams use it.

## High-Level Design (Proposed)

The selected approach is a local-first PJM core surrounded by explicit remote
bindings. Each binding identifies one remote record and carries purposes,
effective policy, a complete non-secret offline snapshot, a narrower writable baseline,
revision evidence, pending operations, receipts, capabilities, and lifecycle
condition. The binding—not the item, project, repository, or provider—is the
reconciliation and outcome boundary.

A provider-neutral lifecycle layer exposes intake, publish, refresh, reconcile,
and closeout. It resolves repository, provider, and tightening-only binding
policy; negotiates a capable configured transport; compares base, local, and
remote state; produces a preview; and executes guarded writes with durable
evidence and read-back verification. GitHub, Linear, and Jira adapters translate
semantic operations without defining the shared contract or erasing
provider-native capabilities.

Higher-level item, project, repository, and reviewed-batch workflows may
orchestrate many bindings, but aggregate independent outcomes rather than
simulating a distributed transaction.

**Key Components:**

- **Local PJM core:** Complete searchable local work and project artifacts.
- **Remote binding model:** Identity, purposes, policies, snapshots, baselines,
  receipts, capabilities, and lifecycle state.
- **Policy resolver:** Description policy and mutation authority with precedence
  and immutable approval floors.
- **Reconciliation engine:** Per-binding three-way classification and preview.
- **Lifecycle orchestrator:** Explicit remote operations across independent bindings.
- **Provider adapters:** GitHub Issues, Linear, and Jira Cloud semantic translation.
- **Transport capability layer:** Ordered configurable transport selection and guarded fallback.
- **Durable operation journal:** Intent, attempts, receipts, uncertainty, and verification evidence.

**Alternatives Considered:**

- **One provider per repository:** Rejected because GitHub reporting, Linear
  planning, and Jira workplace workflows may coexist for the same local work.
- **Automatic provider mirroring:** Rejected because it creates feedback-loop,
  authority, unexpected-write, ordering, and offline-divergence risks.
- **Distributed coordination in V1:** Rejected as disproportionate to the
  accepted rare simultaneous-writer case; guarded write-once-and-verify is the
  approved boundary.
- **First-party Linear GraphQL baseline:** Deferred because MCP or connector
  OAuth and configurable external CLI options are the approved initial path.

## Success Metrics

- 100% of shared binding, authority, snapshot, reconciliation, receipt, and
  closeout conformance scenarios pass for GitHub Issues, Linear, and Jira Cloud.
- 100% of existing local-only PJM tests pass with no providers configured and
  with all remote access disabled.
- 100% of sync-down fixtures retain the bounded core snapshot; none retain
  comments, activity, or assignees by default.
- 100% of same-field conflict and uncertain-operation fixtures require explicit
  resolution; none silently choose a winner.
- 100% of description modes, authority modes, precedence combinations, and
  immutable approval-floor cases yield the expected permitted or blocked action.
- 100% of reported-success mutations have verified postconditions; no uncertain
  outcome is blindly retried.
- 100% of lifecycle-anomaly fixtures preserve the binding and local snapshot
  until explicit resolution.
- 100% of multi-binding operations report an independent outcome for every
  binding and never claim cross-provider atomicity.
- No credential values appear in tracked artifacts, previews, receipts, logs,
  test snapshots, or error output.

## Requirement Index

| ID   | Description                                                         | Priority | Verification                                            | Planned Tasks                                                                                     |
| ---- | ------------------------------------------------------------------- | -------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| FR1  | Support coexisting GitHub, Linear, and Jira bindings                | P0       | integration + e2e: three-provider conformance           | p03-t01, p03-t12, p04-t06, p05-t06, p06-t07, p07-t08                                              |
| FR2  | Preserve complete local-first operation without remote access       | P0       | e2e: offline local PJM workflow                         | p01-t05, p03-t05, p07-t09                                                                         |
| FR3  | Govern bindings through explicit purposes                           | P0       | unit + integration: binding-purpose policy matrix       | p02-t01, p07-t02                                                                                  |
| FR4  | Expose deliberate remote lifecycle operations                       | P0       | integration: lifecycle operation contract               | p03-t05, p03-t06, p03-t08, p03-t12, p07-t02                                                       |
| FR5  | Retain durable binding identity and synchronization evidence        | P0       | unit + integration: binding persistence and recovery    | p01-t04, p01-t06, p01-t07, p01-t10, p03-t12                                                       |
| FR6  | Limit the shared planning-field contract                            | P0       | unit: normalized-field contract                         | p02-t02, p02-t05, p04-t04, p05-t01, p06-t01                                                       |
| FR7  | Enforce description modes and fail-closed precedence                | P0       | unit + integration: description-policy matrix           | p01-t01, p02-t04, p02-t06, p06-t02                                                                |
| FR8  | Enforce four mutation-authority modes                               | P0       | unit + integration: mutation-authority matrix           | p01-t01, p02-t06, p02-t07, p03-t06                                                                |
| FR9  | Perform preview-first three-way reconciliation                      | P0       | unit + integration: reconciliation classification suite | p02-t05, p02-t07, p03-t06                                                                         |
| FR10 | Treat each binding as the atomic outcome unit                       | P0       | integration: reviewed batch and partial failure         | p01-t04, p07-t01, p07-t02                                                                         |
| FR11 | Refresh, write once, verify, and stop after uncertainty             | P0       | integration: guarded mutation and race fixtures         | p02-t08, p02-t09, p03-t06                                                                         |
| FR12 | Retain the bounded complete non-secret core issue                   | P0       | integration: sync-down snapshot contract                | p01-t05, p02-t03, p03-t05, p03-t11, p07-t04                                                       |
| FR13 | Preserve evidence across remote lifecycle anomalies                 | P0       | integration: lifecycle anomaly suite                    | p01-t04, p07-t05, p07-t06, p07-t07                                                                |
| FR14 | Persist create intent and reconcile uncertain creates               | P0       | integration: duplicate-create recovery                  | p01-t10, p02-t08, p03-t06, p03-t12, p04-t09, p04-t10, p05-t08, p05-t09, p06-t09, p06-t10, p07-t06 |
| FR15 | Close out and annotate eligible bindings independently              | P0       | e2e: multi-binding project completion                   | p02-t01, p02-t08, p07-t01, p07-t02, p07-t03                                                       |
| FR16 | Select capable configured transports with guarded fallback          | P0       | integration: transport capability and fallback matrix   | p01-t02, p03-t02, p03-t03, p03-t04, p04-t02, p05-t02, p05-t04, p06-t03, p06-t05                   |
| FR17 | Support GitHub-to-Linear, GitHub-to-Jira, and GitHub-only workflows | P0       | e2e: representative provider workflows                  | p04-t06, p05-t06, p06-t07, p07-t08                                                                |
| FR18 | Keep detailed OAT artifacts local and discussion informational      | P1       | integration + manual: information-boundary review       | p02-t02, p04-t11, p07-t04, p07-t08                                                                |
| NFR1 | Prevent credentials from entering durable or displayed evidence     | P0       | integration + security scan: credential leakage         | p01-t05, p02-t03, p03-t03, p04-t08, p07-t09                                                       |
| NFR2 | Fail closed on ambiguous or unsafe mutation conditions              | P0       | integration: safety-failure matrix                      | p02-t06, p02-t07, p02-t09, p03-t11, p04-t08, p07-t07                                              |
| NFR3 | Recover safely across ephemeral sessions and interruptions          | P0       | integration: restart and uncertain-operation recovery   | p01-t06, p01-t07, p01-t10, p02-t08, p03-t12, p07-t03, p07-t09                                     |
| NFR4 | Keep local PJM useful while offline                                 | P0       | e2e: disconnected operation                             | p01-t05, p03-t05, p07-t09                                                                         |
| NFR5 | Preserve provider-specific semantics and capabilities               | P0       | integration: provider extension conformance             | p03-t01, p04-t01, p05-t01, p06-t01, p06-t02                                                       |
| NFR6 | Clearly expose previews, freshness, conflicts, and outcomes         | P1       | manual + e2e: preview and result UX                     | p02-t07, p03-t07, p07-t01, p07-t10                                                                |
| NFR7 | Preserve compatibility with existing local PJM                      | P0       | integration: local regression suite                     | p01-t08, p01-t09, p07-t09, p07-t10                                                                |
| NFR8 | Keep transports replaceable behind semantic capabilities            | P1       | integration: multi-transport semantic conformance       | p03-t01, p03-t02, p04-t06, p05-t06, p06-t07                                                       |

## Open Questions

- **Storage:** How should portable human-facing associations relate to durable
  binding, snapshot, baseline, journal, and receipt records?
- **Configuration:** What exact `pjm.remote` schema expresses repository,
  provider, and tightening-only binding policy?
- **Managed content:** How should OAT-owned section boundaries work safely for
  GitHub and Linear Markdown and Jira ADF?
- **Provider mapping:** Which provider-specific priority and status mappings can
  advertise safe shared capabilities?
- **Transport equivalence:** What evidence establishes that a fallback transport
  can perform the requested operation with equivalent safety?
- **Interaction:** How should previews, reviewed batches, partial failures, and
  reconciliation choices be rendered in CLI and agent workflows?

## Assumptions

- Every provider exposes or permits a durable identity distinct from its current display alias.
- At least one supported read transport can expose revision or freshness
  evidence sufficient for guarded reconciliation, even when no strong compare-
  and-swap primitive exists.
- Existing local PJM record formats can evolve compatibly to reference richer
  remote state without requiring remote setup.
- Provider connectors and installed CLIs can advertise availability and
  operation capabilities without exposing credential values.
- Completion annotations can be implemented as a distinct operation even when
  the provider surface represents them as comments.

## Risks

- **Provider schema drift:** Jira fields and workflows and transport-level schemas may change.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation:** Discover capabilities and schema at operation time, retain
    evidence, and fail closed when mappings are no longer safe.
- **Uncertain mutation outcomes:** Interrupted or ambiguous calls may have committed remotely.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Persist intent before the call, write once, verify by
    read-back, and require reconciliation before retry or transport change.
- **Authority confusion:** Multiple purposes, bindings, and provider automation
  can make ownership unclear.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Resolve effective policy per binding and operation, display
    it in previews, and retain hard approval floors.
- **Managed-section corruption:** Formatting translation may damage surrounding
  remote-owned content.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Parse explicit boundaries, preserve the full observed body,
    reject malformed or duplicate markers, preview, and verify exact postconditions.
- **Lowest-common-denominator adapters:** Shared abstractions may erase useful provider semantics.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Keep the common contract small, advertise capabilities, and
    retain provider extensions.
- **Scope size:** A shared model plus three providers may produce an
  implementation too large for one safe lane.
  - **Likelihood:** High
  - **Impact:** Medium
  - **Mitigation:** Design one contract, then plan bounded shared-core and
    provider lanes with explicit dependencies and integration checkpoints.

## References

- Discovery: `discovery.md`
- GitHub dossier: `reference/github-issues-provider-dossier-gpt-5-6-luna.md`
- Linear dossier: `reference/linear-provider-dossier-gpt-5-6-luna.md`
- Jira dossier: `reference/jira-provider-dossier-gpt-5-6-luna.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
