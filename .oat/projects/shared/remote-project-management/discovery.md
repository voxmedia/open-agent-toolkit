---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-08-31
oat_generated: false
---

# Discovery: remote-project-management

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.
- Treat the model below as directional until it passes the discovery HiLL checkpoint. Working agreement does not make the architecture final.

## Initial Request

Integrate OAT and OAT PJM with GitHub Issues, Linear, and Jira Cloud while preserving OAT's local-first project-management strengths.

The providers are not mutually exclusive alternatives:

- GitHub Issues may receive user reports or serve as a team's primary tracker.
- Linear may provide personal or business planning for work that also has GitHub issues and pull requests.
- Jira provides workplace planning, ownership, approvals, and reporting.
- One OAT backlog item or project may therefore be associated with multiple remote records serving different purposes.

OAT must continue to work well without remote access. The local backlog remains fully searchable by agents and retains detailed discovery, specification, design, planning, implementation, and deferred-work context that does not belong in a remote ticket.

Parent discovery: `.oat/projects/shared/project-management-integration/discovery.md` — contains the full conceptual model, research findings, and foundational decisions.

**Prerequisite:** Remote integration layers on top of the local project-management and `associated_issues` linking model.

## Research Findings

Three provider dossiers and two repository case studies now inform this discovery:

- [GitHub Issues provider dossier](reference/github-issues-provider-dossier-gpt-5-6-luna.md)
- [Linear provider dossier](reference/linear-provider-dossier-gpt-5-6-luna.md)
- [Jira provider dossier](reference/jira-provider-dossier-gpt-5-6-luna.md)
- Vox Mobile App's Linear conventions and unmerged CLI export demonstrate typed associations, reference-only links, JSON issue export, and GitHub-driven completion behavior.
- The internal-skills Jira/ACLI skills and open bulk-recovery work demonstrate runtime schema discovery, explicit confirmation, immutable recovery evidence, uncertainty boundaries, and the danger of concurrent retries.

Cross-provider findings:

- **Identity differs from display references.** Jira keys, Linear identifiers, and GitHub issue numbers/URLs are useful aliases, but adapters need provider context plus durable remote identity.
- **Provider schemas are not interchangeable.** Jira is tenant-configurable and uses ADF; Linear is workspace/team-scoped and GraphQL-backed; GitHub Issues is repository-scoped with optional organization/project extensions.
- **Transports are capabilities, not the domain model.** REST, GraphQL, MCP, and CLI surfaces vary by provider and environment. The shared contract must describe semantic operations and negotiate available capabilities.
- **Current state alone is insufficient.** Safe reconciliation needs the last-agreed state, current local state, current remote state, and durable operation evidence.
- **Remote writes may have uncertain or partial outcomes.** A failed or interrupted command must not be blindly retried. Receipts and reconciliation must prevent duplicates and false success claims.
- **Concurrent writers can race.** V1 does not add locking or a shared coordinator for this uncommon case. It reduces risk through a fresh remote read, preview, one write attempt, post-write verification, and a hard stop after an uncertain outcome.
- **Comments and assignees are remote-only information.** They may improve an agent's understanding of a backlog item, but they are not synchronized OAT fields.
- **GitHub development automation is a separate authority.** Branch, pull-request, and merge activity may drive tracker status where a provider integration supports it; OAT should not duplicate those transitions by default.

## Directional Working Model

### Local-first, explicit synchronization

OAT's local backlog is the complete agent-searchable working surface. Remote access is optional for ordinary local discovery and project work.

Remote interaction occurs through explicit lifecycle operations:

1. **Intake** — create or enrich a local backlog item from a remote issue.
2. **Publish** — create or update a selected remote planning record from a local item.
3. **Refresh** — read current remote state without writing.
4. **Reconcile** — compare base, local, and remote state; preview conflicts and proposed actions.
5. **Close out** — attach concise completion evidence to the appropriate bindings when explicitly allowed.

The initial model does not require a continuously running synchronization daemon or webhooks.

### Multiple bindings, independent policies

A local backlog item or OAT project may have multiple remote bindings. Each binding has its own purpose, field policy, synchronization baseline, capabilities, and operation receipts. OAT must not automatically mirror one provider into another.

Directional binding profiles:

| Profile     | Purpose                                              | Default behavior                                                                                   |
| ----------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `source`    | Originating user report or request                   | Selected issue content flows inward; an explicitly approved completion annotation may flow outward |
| `planning`  | Prioritization and human/team coordination           | Selected backlog fields may reconcile bidirectionally at intentional sync moments                  |
| `delivery`  | Branch, pull-request, merge, and completion evidence | Development evidence and provider-native automation; no general backlog-field synchronization      |
| `reference` | Contextual relationship only                         | Link is searchable but causes no synchronization or status transition                              |

Profiles are provider-independent. A GitHub Issue may be a `source` or `planning` binding. Linear and Jira commonly serve as `planning` bindings. GitHub pull-request activity commonly serves the `delivery` purpose.

The profile should supply safe defaults without preventing a later explicit per-binding policy.

### Association versus synchronization state

The existing `associated_issues` concept remains the portable human-facing link, but `{ type, ref }` alone is insufficient for operational synchronization.

The model needs to represent, conceptually:

- remote provider and account/workspace/repository context;
- durable remote identity plus current and historical display aliases;
- relationship or purpose (`source`, `planning`, `delivery`, `reference`);
- last-agreed normalized field state and remote revision evidence;
- pending operations, approvals, attempts, receipts, and uncertainty;
- missing, archived, moved, transferred, or relinked remote records;
- capability and adapter-version evidence used for the last operation.

The exact storage boundary between `associated_issues` and richer synchronization records remains a design question.

### Reconciliation behavior

Reconciliation is per binding and uses three inputs:

1. the last-agreed state;
2. current local normalized fields;
3. current remote normalized fields.

Expected classifications:

- local-only change;
- remote-only change;
- non-overlapping changes that can be merged in preview;
- same-field conflict requiring an explicit choice;
- no change;
- missing, moved, archived, deleted, or inaccessible remote record;
- uncertain prior operation requiring authoritative reconciliation before retry.

Reconciliation is preview-first. Conflicting edits, uncertain writes, and remote replacement must not be silently resolved.

## Representative Workflows

### GitHub report tracked in Linear

1. A user opens a GitHub Issue.
2. OAT intakes it into a local backlog item with a `source` binding.
3. The user deliberately publishes or links a Linear issue with a `planning` binding.
4. Detailed project work remains local to OAT.
5. GitHub branch/PR integration supplies delivery evidence and may drive Linear status.
6. Closeout updates only the bindings whose policies explicitly allow it.

### GitHub report tracked in Jira

The same flow applies with Jira as the `planning` binding. Jira-specific project fields, workflows, ADF, permissions, and transitions are discovered rather than assumed.

### GitHub Issues as the only remote tracker

A GitHub Issue may serve both the originating report and the planning record. The model must support this without requiring Linear or Jira and without duplicating the issue merely to satisfy profile separation.

### Offline local work

1. Agents search, create, enrich, and promote local work without remote access.
2. A requested remote write becomes an explicit pending intent rather than a claimed success.
3. On reconnect, OAT refreshes capabilities and remote state, checks duplicates and prior receipts, then previews the safe next action.

## Provider Deliverables

All three providers are required to validate the integration model:

1. **GitHub Issues adapter** — formalize existing retrospective issue reporting and support GitHub as source or planning tracker.
2. **Linear adapter** — support personal/business planning alongside GitHub issue reporting and delivery activity.
3. **Jira Cloud adapter** — support workplace planning against configurable projects, fields, workflows, and permissions.
4. **Shared local synchronization model** — bindings, profiles, normalization, baselines, receipts, reconciliation, offline behavior, and capability negotiation used by all three.
5. **Cross-provider workflows** — especially GitHub source → OAT → Linear planning and GitHub source → OAT → Jira planning.

Implementation may be incremental, but the project is not complete until all three adapters pressure-test the shared model. Shared behavior must not force providers into a lowest-common-denominator schema.

## Clarified Questions

### Source of truth

**Working answer:** There is no single whole-record source of truth. Authority is scoped by binding purpose, field, and operation. OAT owns local discovery and execution artifacts; remote planning systems own human/team coordination; provider automation may own delivery-driven transitions, while OAT may also perform a transition when the user explicitly requests one.

**Status:** Confirmed; the shared-field and mutation-authority policies below define the remaining boundaries.

### Offline behavior

**Working answer:** Local OAT workflows must remain useful without remote access. Network absence cannot block local backlog or project work, and pending remote intent must never be presented as completed remote work.

**Status:** Confirmed.

### Provider scope

**Working answer:** GitHub Issues, Linear, and Jira Cloud are all deliverables. They may coexist on one local item or project.

**Status:** Confirmed.

### Comments and assignees

**Working answer:** OAT backlog items do not synchronize comments, discussion history, or assignees, and the default offline snapshot does not retain them. Remote discussion may be fetched on demand as informational evidence and distilled into better backlog content. An outbound completion annotation is a separate, explicitly governed operation rather than comment synchronization.

**Status:** Confirmed.

### Synchronization trigger

**Working answer:** Start with explicit intake, publish, refresh, reconcile, and closeout operations. Automatic background synchronization and webhooks are not initial requirements.

**Status:** Confirmed at the lifecycle-operation level; exact command and skill UX is a design concern.

### Authentication and transport

**Working answer:** OAT core must not store credentials in version-controlled files. Every provider has a user-configurable ordered transport preference, and OAT chooses the first available transport that satisfies the requested capability and effective mutation authority. GitHub defaults to the installed `gh` CLI. Linear and Jira default to MCP/connector OAuth because that is the easiest setup; users may prefer an already-installed community Linear CLI or official Atlassian `acli`. OAT supports external CLIs without bundling or installing them. Fallback is allowed before mutation, but after a write attempt or uncertain outcome OAT must reconcile before changing transports. Transport-specific behavior cannot define the shared domain contract.

**Status:** User confirmed the provider-specific defaults and configurable fallback order on 2026-08-30. A first-party Linear GraphQL transport is not an initial baseline and remains deferred unless later capability analysis proves it necessary.

### Remaining discovery scope

**Working answer:** Resolve all five remaining policy areas before the discovery checkpoint: normalized fields and authority, binding semantics, baselines and concurrent recovery, remote lifecycle and reconciliation scope, and transport and approval policy. Work through them in that order, beginning with the smallest viable shared field contract.

**Status:** User confirmed on 2026-08-30.

### Planning field contract

**Working answer:** The v1 shared reconciliation contract is intentionally small: title and explicitly governed description content. Priority may participate only when a binding advertises a safe mapping. Status is governed separately as lifecycle policy; labels, due dates, estimates, and provider-native types remain local or provider-specific extensions.

**Status:** User confirmed on 2026-08-30.

### Shared-field authority

**Working answer:** Binding purpose supplies safe authority defaults with explicit per-binding overrides. A `source` binding defaults to remote ownership for shared fields; a `planning` binding uses three-way reconciliation; `delivery` and `reference` bindings do not write shared fields by default. Neither local nor remote state wins globally.

**Status:** User confirmed on 2026-08-30.

### Binding purposes

**Working answer:** One durable remote binding may declare multiple purposes when the same record genuinely serves more than one role. This is supported as an uncommon, explicit case; ordinary flows should default to one purpose per binding. Each purpose retains independently governed behavior, and combining purposes must not create implicit synchronization or lifecycle authority.

**Status:** User confirmed on 2026-08-30 and noted that multi-purpose bindings should not be treated as common.

### Remote description ownership

**Working answer:** Remote description writes are configurable rather than governed by one universal ownership rule. The policy has three outcome modes: (1) OAT may replace the complete remote description, but every such write always requires previewed user approval; (2) OAT may update only an explicit OAT-managed section while preserving surrounding remote content; or (3) OAT never updates the remote description. The policy belongs in the PJM remote configuration surface. Exact setting names and representation remain design questions.

**Status:** User confirmed on 2026-08-30.

### Unconfigured description policy

**Working answer:** When no PJM remote description policy is configured, OAT fails closed and never updates the remote description. Read and intake behavior remain available. A description write requires an explicit configured policy, and complete replacement still requires user approval for every write.

**Status:** User confirmed on 2026-08-30.

### Description-policy precedence

**Working answer:** The PJM remote configuration supplies a repository default and optional provider-specific overrides. An individual remote binding may only tighten the effective policy toward less authority: complete replacement may become managed-section or no-update, and managed-section may become no-update. A binding cannot loosen repository or provider policy. Complete replacement always requires previewed user approval regardless of configuration scope.

**Status:** User confirmed on 2026-08-30.

### Remote description retention

**Working answer:** Local retention is independent from remote write authority. A sync-down retains the complete last-observed remote description so agents have the ticket context locally and can continue useful work offline. In managed-section mode, content outside the OAT-managed section remains locally available but remote-owned and is never written back by OAT. The full remote snapshot and the writable reconciliation baseline are therefore distinct concepts.

**Status:** User corrected and confirmed this requirement on 2026-08-30.

### Offline read depth

**Working answer:** Sync-down retains a bounded core issue snapshot: durable identity and aliases, title, complete description, status and other core provider fields, and revision/freshness evidence. Comments, activity history, and assignees are not part of the default offline snapshot; they may be fetched on demand as read-only evidence when remote access is available.

**Status:** User selected the simpler core-issue scope on 2026-08-30.

### Remote mutation safety

**Working answer:** V1 uses a simple guarded write flow: refresh remote state, preview the proposed change against the observed revision, perform one write attempt, and read the record back to verify the result. An uncertain outcome blocks blind retry and requires reconciliation. V1 does not add locks, leases, a shared coordinator, or a designated-writer system; truly simultaneous writers remain an accepted risk rather than a claimed prevention guarantee.

**Status:** User confirmed the simpler policy on 2026-08-30 after rejecting proactive coordination as overkill.

### Remote status transitions

**Working answer:** V1 supports policy-governed status transitions across GitHub, Linear, and Jira when the provider exposes a valid transition. Status is never propagated automatically between bindings or changed merely because local project phase changed. The effective authority mode determines whether a transition is forbidden, directly user-authorized, previewed for user approval, or permitted autonomously within an active workflow. Every transition is verified against resulting remote state. Existing provider automation may continue to operate.

**Status:** Superseded on 2026-08-30 by the configurable remote-mutation authority model below.

### Remote mutation authority

**Working answer:** Remote mutation authority is configured by provider and operation class under the PJM remote policy surface. The repository default is `read-only`. Provider policy may broaden authority to `user-authorized` (an explicit user instruction is sufficient), `user-approved` (fresh approval is required after preview), or `autonomous` (standing authority within an otherwise authorized active workflow). An individual binding may only tighten the effective mode. Autonomous authority does not enable background synchronization, webhooks, or transitive provider-to-provider propagation. Complete-description replacement and destructive operations such as deletion retain a non-configurable `user-approved` floor.

**Status:** User confirmed on 2026-08-30.

### Reconciliation scope

**Working answer:** Each remote binding is the atomic unit for baselines, conflicts, authority, receipts, and outcomes. Item-, project-, repository-, or reviewed-batch operations may orchestrate multiple bindings and present a consolidated preview, but every binding advances or remains uncertain independently. OAT does not claim an all-or-nothing transaction across providers.

**Status:** User confirmed on 2026-08-30.

### Missing and changed remote records

**Working answer:** OAT preserves the binding and complete local core-issue snapshot when a remote record is archived, moved, deleted, inaccessible, or temporarily unavailable. It records the observed condition and stops writes rather than treating a generic not-found response as proof of deletion. Verified moves may retain durable identity and update aliases; archived records become read-only. Relink, detach, or recreate is an explicit policy-governed resolution, never an automatic response.

**Status:** User confirmed on 2026-08-30.

### Creation provenance and duplicate recovery

**Working answer:** Every remote create begins with a durable local intent. OAT prefers provider-native provenance metadata when the provider and permissions support it. Otherwise it may include a visible OAT origin link only when the effective remote-content policy permits that write. It never hides markers in human content or bypasses description ownership. After an uncertain create, OAT searches and reconciles using the available provenance before any retry.

**Status:** User confirmed the capability-layered policy on 2026-08-30.

### Project closeout

**Working answer:** Local project completion evaluates every remote binding independently. `source` and `planning` purposes may propose completion evidence or provider-valid transitions when the effective mutation authority permits them; `delivery` normally defers to provider-native development automation; `reference` remains untouched. A multi-purpose binding produces one combined action for its remote record. Multi-binding closeout is a reviewed batch of independent outcomes rather than an all-or-nothing transaction.

**Status:** User confirmed the per-binding policy on 2026-08-30.

### Completion annotations

**Working answer:** V1 includes one-way outbound completion annotations as a distinct closeout operation. An annotation is permitted only when the binding's effective mutation authority allows it, is verified after the write, and does not imply comment synchronization or local retention of the remote discussion thread.

**Status:** User confirmed inclusion with policy on 2026-08-30.

## Solution Space

### Approach 1: Treat providers as alternatives

**Description:** Configure one remote tracker per repository and synchronize OAT only with that provider.
**When this is the right choice:** A repository has one durable tracker and no cross-provider intake or delivery requirements.
**Tradeoffs:** Simpler cardinality, but it cannot represent GitHub user reports that are planned in Linear or Jira. It would also make provider choice an architectural constraint rather than a binding-level policy.

### Approach 2: Multi-provider bindings with explicit profiles

**Description:** One local item or project may bind to several remote records. Each binding declares its purpose and reconciles independently through explicit operations.
**When this is the right choice:** GitHub, Linear, and Jira serve complementary reporting, planning, and delivery roles.
**Tradeoffs:** Requires richer identity, per-binding baselines, explicit authority, and loop prevention. It preserves local-first operation and avoids forcing one provider to replace another.

### Approach 3: Provider-to-provider mirroring

**Description:** OAT automatically propagates changes among associated GitHub, Linear, and Jira records.
**When this is the right choice:** A future continuously running integration service has strict event identity, ordering, loop prevention, and administrative controls.
**Tradeoffs:** High risk of feedback loops, unexpected public/team-visible writes, authority confusion, and offline divergence. It is not appropriate for the initial ephemeral-agent model.

### Directional Preference

**Approach:** Multi-provider bindings with explicit profiles and deliberate OAT-mediated operations.
**Rationale:** The user needs GitHub issue reporting, Linear personal/business planning, and Jira workplace planning to coexist. Per-binding policies preserve those roles without automatic transitive mirroring.
**User validated:** Yes; approved at the discovery HiLL checkpoint on 2026-08-30.

## Key Decisions

1. **All three providers validate one shared model:** GitHub Issues, Linear, and Jira Cloud are complementary deliverables rather than mutually exclusive tracker choices.
2. **Local-first with bounded remote snapshots:** Local PJM remains fully useful offline. Sync-down retains the complete core issue, including the full description, but not comments, activity history, or assignees by default.
3. **Bindings carry explicit purposes:** `source`, `planning`, `delivery`, and `reference` are the initial vocabulary. Multiple purposes on one binding are supported as an uncommon explicit case.
4. **The shared planning-field contract stays small:** Title and policy-governed description content reconcile across providers. Priority participates only when a safe mapping is advertised; other provider concepts remain extensions or lifecycle policy.
5. **Description ownership is configurable:** The effective mode is complete replacement, managed section, or no remote update. The unconfigured default is no update; complete replacement always requires previewed user approval.
6. **Remote mutation authority is configurable by operation:** The repository default is `read-only`; provider policy may broaden to `user-authorized`, `user-approved`, or `autonomous`; a binding may only tighten authority. Destructive actions and complete-description replacement retain a `user-approved` floor.
7. **Synchronization is deliberate:** Intake, publish, refresh, reconcile, and closeout are explicit lifecycle operations. V1 has no background synchronization, webhooks, or automatic provider-to-provider propagation.
8. **A binding is the atomic reconciliation unit:** Item, project, repository, and batch operations may orchestrate bindings, but each binding retains its own baseline, authority, receipt, and outcome.
9. **V1 accepts rare simultaneous-writer races:** Remote mutations refresh, preview as required by policy, write once, and verify by read-back. Uncertain outcomes stop and reconcile; V1 adds no locking or shared coordinator.
10. **Remote disappearance preserves evidence:** Missing, moved, archived, deleted, inaccessible, and unavailable records keep their binding and local snapshot until an explicit relink, detach, or recreate decision.
11. **Creation provenance is capability-layered:** OAT always retains a local intent, prefers provider-native provenance, and uses a visible origin link only when content policy permits it.
12. **Closeout is per binding:** Purpose and mutation authority determine annotations and transitions. V1 includes policy-authorized completion annotations but does not synchronize discussion threads.
13. **Transport defaults optimize setup and remain configurable:** GitHub defaults to `gh`; Linear and Jira default to MCP/connector OAuth. Users may prefer installed external Linear or Atlassian CLIs through provider-specific ordered fallbacks. OAT does not bundle provider CLIs or switch transports blindly after a write attempt.

## Constraints

- Must not break or weaken existing local PJM workflows.
- Discovery is proceeding against the repository knowledge snapshot generated on 2026-08-19 despite exceeding the configured freshness thresholds; current-code claims derived from that snapshot require revalidation before implementation.
- Must work well when remote access, credentials, MCP tools, or provider CLIs are unavailable.
- Credentials and credential values must never enter tracked artifacts, logs, receipts, or previews.
- Agent sessions are ephemeral; correctness cannot depend on one long-running in-memory process.
- Synchronization must fail closed on ambiguous targets, uncertain writes, permission gaps, and schema drift.
- A successful command exit is not sufficient evidence of a complete remote write; requested fields must be re-read or otherwise verified.
- Comments, discussion history, and assignees remain remote-only information.
- Agent-level plan tasks do not become remote subtasks by default.
- Provider-native concepts and extension fields must remain available without contaminating the common schema.
- Jira scope is Jira Cloud, not Jira Server or Data Center.
- One local item may have multiple bindings, including multiple bindings to the same provider.
- Provider-to-provider propagation must be an explicit OAT-mediated operation, never an automatic transitive side effect.

## Success Criteria

- Users can configure zero, one, or several providers without weakening local-only PJM workflows.
- GitHub Issues, Linear, and Jira Cloud each pressure-test the same binding, authority, snapshot, reconciliation, receipt, and closeout concepts.
- Sync-down leaves agents with a complete core-issue snapshot for useful offline work while excluding discussion history and assignees by default.
- Shared fields reconcile per binding without erasing provider-native semantics or silently choosing a winner for same-field conflicts.
- Description ownership and every remote mutation class obey the resolved repository, provider, and tightening-only binding policies.
- Reads and writes use an available, configured transport with the required capability; external CLIs remain optional and separately installed.
- Remote writes never report success from command exit alone, never retry an uncertain outcome blindly, and retain enough evidence for authoritative reconciliation.
- Missing or changed remote identities preserve local evidence and require explicit resolution rather than automatic deletion or recreation.
- Project closeout can produce verified, policy-authorized transitions and completion annotations independently for the appropriate bindings.

## Out of Scope

- Continuously running synchronization daemons, webhooks, or automatic background polling.
- Automatic transitive mirroring among GitHub, Linear, and Jira.
- Comment-thread, activity-history, or assignee synchronization and default offline retention.
- Turning OAT plan tasks into remote subtasks by default.
- Jira Server or Data Center support.
- Distributed locking, leases, or a shared coordinator for independent-machine writers in V1.
- Bundling or automatically installing `gh`, community Linear CLIs, or Atlassian `acli`.
- Bypassing configured mutation authority, including autonomous destructive actions or complete-description replacement.

## Deferred Ideas

- A first-party Linear GraphQL transport if later capability analysis proves MCP and external CLI coverage insufficient.
- Optional broader offline retention for remote comments, activity, and assignees.
- Broader normalized planning fields after all three providers demonstrate stable mappings.
- Provider-neutral distributed coordination if real concurrent-writer demand justifies the infrastructure.
- Background or webhook-driven synchronization after event identity, ordering, loop prevention, and administrative controls are proven.

## Open Questions

The outcome-level discovery questions are resolved. Design must determine:

- the storage boundary between compact `associated_issues` links and richer binding, snapshot, receipt, and capability records;
- the exact PJM remote configuration schema for description ownership, mutation authority, provider transport order, and tightening-only binding overrides;
- the representation and retention of full remote snapshots, writable baselines, provider revisions, hashes, pending intents, attempts, and receipts;
- safe managed-section boundaries for Markdown providers and Jira ADF;
- provider-specific priority, status, and extension mappings without broadening the common field contract;
- live capability probing and equivalent-safety fallback checks for MCP and external CLI transports;
- the preview, batch, partial-failure, and reconciliation user experience.

## Assumptions

- Users may have zero, one, or several configured providers.
- Remote issues may originate outside OAT and local backlog items may remain permanently local.
- Humans continue to collaborate directly in GitHub, Linear, and Jira.
- Remote access is intermittent rather than guaranteed.
- GitHub Issues may serve as source, planning tracker, or both.
- Linear and Jira may coexist with GitHub reporting and delivery integrations.
- Provider connectors and external CLIs may be unavailable or expose different capabilities across users and environments.
- Independent machines may race on the same remote record in V1; the product does not claim a distributed single-writer guarantee.

## Risks

- **Lowest-common-denominator abstraction:** A common model could erase provider-native semantics.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation ideas:** Keep the normalized field set small, expose capabilities and extensions, and validate every concept across all three providers.

- **Cross-provider feedback loops:** A GitHub change could be propagated to Linear, then read back as another local change.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation ideas:** Reconcile per binding, retain operation provenance, and prohibit automatic transitive mirroring.

- **Duplicate remote writes:** Network loss, partial bulk results, stale agents, or concurrent retries could create duplicate issues.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation ideas:** Persist uncertainty before mutation, use deterministic payload identity, reconcile authoritatively, never retry an uncertain operation blindly, and document simultaneous writers as an accepted v1 limitation.

- **Accidental lifecycle changes:** A reference-only issue ID in a PR title or an incorrect status mapping could close the wrong work.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation ideas:** Model binding purpose explicitly, preview closeout effects, and let provider-native GitHub integrations own delivery transitions when configured.

- **Offline divergence:** Local and remote records may evolve independently for long periods.
  - **Likelihood:** High
  - **Impact:** Medium
  - **Mitigation ideas:** Show freshness, retain a last-agreed baseline, and make refresh/reconcile explicit and preview-first.

- **Transport drift:** MCP tools, CLI flags/output, API schemas, and provider permissions change independently.
  - **Likelihood:** High
  - **Impact:** Medium
  - **Mitigation ideas:** Probe capabilities and versions, use structured output, validate postconditions, and keep transports replaceable.

## Next Steps

Outcome-level discovery questions are resolved. The remaining lifecycle steps are the required project-scope confirmation, discovery HiLL approval, configured discovery gate, and transition to design/specification.
