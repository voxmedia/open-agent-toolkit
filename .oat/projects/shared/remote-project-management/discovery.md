---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-30
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
- **Concurrency matters.** Durable state alone is insufficient if concurrent agents can advance stale recovery state. Receipt advancement needs a single-writer or compare-and-swap guarantee.
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

**Working answer:** There is no single whole-record source of truth. Authority is scoped by binding purpose, field, and operation. OAT owns local discovery and execution artifacts; remote planning systems own human/team coordination; GitHub integrations may own delivery-driven status transitions.

**Status:** Directionally agreed; exact field ownership remains open.

### Offline behavior

**Working answer:** Local OAT workflows must remain useful without remote access. Network absence cannot block local backlog or project work, and pending remote intent must never be presented as completed remote work.

**Status:** Directionally agreed.

### Provider scope

**Working answer:** GitHub Issues, Linear, and Jira Cloud are all deliverables. They may coexist on one local item or project.

**Status:** Directionally agreed.

### Comments and assignees

**Working answer:** OAT backlog items do not synchronize comments, discussion history, or assignees. Remote discussion may be read as informational evidence and distilled into better backlog content. An outbound completion annotation is a separate, explicitly governed operation rather than comment synchronization.

**Status:** Directionally agreed.

### Synchronization trigger

**Working answer:** Start with explicit intake, publish, refresh, reconcile, and closeout operations. Automatic background synchronization and webhooks are not initial requirements.

**Status:** Directionally supported; exact command/skill UX remains open.

### Authentication and transport

**Working answer:** OAT core must not store credentials in version-controlled files. Adapters may use configured MCP, provider APIs/SDKs, or installed CLIs according to capabilities and policy, but transport-specific behavior cannot define the shared domain contract.

**Status:** Directionally supported; provider-specific precedence and credential configuration remain open.

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
**User validated:** Directionally yes; final approval remains the discovery HiLL checkpoint.

## Working Agreements

1. **All three providers are deliverables:** GitHub Issues, Linear, and Jira Cloud must each validate the shared model.
2. **Local-first operation:** Local search, capture, promotion, and project work must remain useful without remote access.
3. **Multiple bindings:** A local item or project may link to several remote records serving different purposes.
4. **Provider-independent profiles:** `source`, `planning`, `delivery`, and `reference` are the initial role vocabulary.
5. **Independent reconciliation:** Baselines, conflicts, capabilities, and receipts are scoped per binding.
6. **No transitive mirroring:** A change in one provider does not automatically write to another provider.
7. **No comment or assignee synchronization:** Discussion may inform local content, but it remains remote-only.
8. **Preview-first remote writes:** Conflicts, lifecycle transitions, closeout annotations, and uncertain retries require explicit policy and evidence.

These are discovery working agreements, not finalized design decisions.

## Constraints

- Must not break or weaken existing local PJM workflows.
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

## Open Questions

### Normalized fields and authority

- Which exact fields participate in a `planning` reconciliation: title, description, status, priority, labels, due date, estimate, or a smaller set?
- Which fields have fixed ownership defaults, and which are configurable per binding?
- Are provider-native labels, types, and statuses retained only as extensions or projected into normalized OAT values?
- Is OAT `scope_estimate` always local, optionally mapped, or part of the normalized contract?

### Binding semantics

- Are `source`, `planning`, `delivery`, and `reference` the right profile names and complete enough?
- Can one binding have multiple purposes, or should purposes be separate policy facets?
- Does relationship metadata belong directly in `associated_issues`, or should that remain a compact index into richer binding records?
- How should a reference-only association be prevented from triggering PR-title linkage, closeout, or remote status changes?

### Baselines, receipts, and concurrency

- Where do last-agreed snapshots, hashes, provider revisions, pending intents, and receipts live?
- Which normalized values must be stored in full versus by stable hash?
- What single-writer, lock, or compare-and-swap mechanism prevents concurrent agents from replaying an uncertain operation?
- How are partial multi-item and multi-binding failures resumed without advancing successful or uncertain bindings incorrectly?

### Remote lifecycle and reconciliation

- How are remote deletion, archival, transfer, move, permission loss, and provider outage distinguished?
- What duplicate markers or searches are reliable for each provider before intake and publish?
- How much remote content must be copied locally to support useful offline search without mirroring discussion history?
- When one project satisfies several remote issues, which bindings receive completion evidence and which may transition?
- Should one reconcile operation target a binding, backlog item, project, repository, or reviewed batch?

### Transport and approval policy

- What is the precedence between MCP, direct API/SDK, and CLI when several transports are available?
- Which capabilities require a stable API even if an interactive MCP or CLI can perform them?
- What approval is required for create, update, transition, close, comment/annotation, relink, and retry operations?
- Should completion annotations be part of the first release or deferred until core reconciliation is proven?

## Assumptions

- Users may have zero, one, or several configured providers.
- Remote issues may originate outside OAT and local backlog items may remain permanently local.
- Humans continue to collaborate directly in GitHub, Linear, and Jira.
- Remote access is intermittent rather than guaranteed.
- GitHub Issues may serve as source, planning tracker, or both.
- Linear and Jira may coexist with GitHub reporting and delivery integrations.

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
  - **Mitigation ideas:** Persist uncertainty before mutation, use deterministic payload identity, reconcile authoritatively, and make receipt advancement concurrency-safe.

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

Discovery remains **in progress**. Before specification:

1. Define a candidate normalized field set and default authority policy for each binding profile.
2. Sketch the conceptual binding, baseline, pending-operation, receipt, and capability records without committing to storage layout.
3. Pressure-test those concepts against the representative GitHub-only, GitHub-to-Linear, GitHub-to-Jira, offline, conflict, deletion, and uncertain-write scenarios.
4. Decide the minimum approval and postcondition-verification policy for every remote mutation class.
5. Review the resulting choices with the user and complete the discovery HiLL checkpoint before moving to specification.

Spec-driven mode: continue to `oat-project-spec` only after the discovery questions are resolved and the discovery checkpoint is explicitly approved.
