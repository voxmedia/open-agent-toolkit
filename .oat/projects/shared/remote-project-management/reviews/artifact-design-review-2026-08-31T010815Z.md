---
oat_generated: true
oat_generated_at: 2026-08-31T01:08:15Z
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/remote-project-management
oat_gate_headless: true
oat_gate_run_id: 4eea97e9-8e79-428a-a651-c185ddefb9b9
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: design

**Reviewed:** 2026-08-31T01:08:15Z
**Scope:** Complete specification and technical design against approved discovery and current repository architecture
**Files reviewed:** 28
**Commits:** N/A (artifact review)

## Summary

The specification is strongly aligned with the approved discovery, and the design covers most of the intended provider-neutral architecture. The design is not ready for planning, however: it does not define safe multi-purpose policy composition, durable representation of several required operation outcomes, or the required relink/detach/recreate lifecycle-resolution paths. Four additional Important gaps affect storage safety, configuration determinism, post-attempt transport pinning, and restart-safe batch behavior.

Blocking findings remain; this review does not approve the design for planning.

Findings: 3 critical, 4 important, 4 medium, 0 minor

## Review Execution

Gate route: `inline` (runtime=`cursor`, CLI root=`/Users/thomas.stang/Code/vox/open-agent-toolkit`)

Dispatch: scope=design action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high

The project-policy dispatch stamp above is an audit of the repository resolver. The immutable gate invocation is recorded separately and verbatim in frontmatter.

## Findings

### Critical

- **Multi-purpose bindings have no safe policy-composition rule** (`.oat/projects/shared/remote-project-management/design.md:650`)
  - Issue: The record stores `purposes[]` and one binding-wide `policyRestriction`, while the design only says that reconciliation runs “according to binding purposes.” It never defines how conflicting defaults compose. For example, `source` is remote-owned while `planning` is bidirectional; a naïve union would let one purpose grant authority that another purpose does not have. This leaves the P0 rule that “no purpose implicitly grants another purpose's field or lifecycle authority” unenforceable.
  - Fix: Define a per-purpose field/lifecycle policy model and a deterministic composition algorithm. Resolve every field and operation to the most restrictive applicable result, fail closed on incompatible purpose combinations, and specify how one deduplicated closeout action is built for a multi-purpose remote record.
  - Requirement: FR3, FR15

- **Required lifecycle-resolution operations are absent from the command and operation model** (`.oat/projects/shared/remote-project-management/design.md:593`)
  - Issue: The design can classify moved, missing, archived, deleted, inaccessible, and unavailable records, but the lifecycle command family and `lifecycleOperation` union expose no `relink`, `detach`, or `recreate` path. An anomalous binding can therefore be frozen but cannot be resolved through the explicit, policy-governed operations required by FR13.
  - Fix: Add explicit lifecycle-resolution commands and operation types for relink, detach, and recreate. Define authority/approval rules, durable identity and alias transitions, snapshot retention, duplicate search, association updates, and restart-safe receipts for each path.
  - Requirement: FR13

- **The operation journal cannot durably represent all required outcomes** (`.oat/projects/shared/remote-project-management/design.md:747`)
  - Issue: `OperationState` omits `pending`, `blocked`, and `failed`, even though `ProviderOutcome` and the command envelope return those outcomes and the prose says failed records are retained. A fresh process cannot reliably distinguish an offline pending intent, a capability block, a safe pre-attempt failure, and a terminal provider rejection from the durable record. This breaks the P0 pending-intent and restart-reconstruction contracts.
  - Fix: Define a single durable state/outcome model covering pending, blocked, failed/rejected, partial, uncertain, and verified results, with reason, retry disposition, last safe step, and transition rules. Show how every command-envelope outcome maps atomically to that record before returning.
  - Requirement: FR2, FR5, NFR3

### Important

- **Tracked storage for full remote descriptions has no scope or privacy boundary** (`.oat/projects/shared/remote-project-management/design.md:119`)
  - Issue: The design puts every binding and full remote description under `.oat/repo/pjm/remote/`, which is the repository's tracked operational PJM surface, even when `localTarget.scope` is `local`. Restrictive creation mode does not protect files after Git checkout and does not prevent sensitive Jira/Linear content from entering history. The design acknowledges sensitive descriptions but offers only access-policy documentation, and it does not reconcile “complete description” retention with the requirement that credential values never enter snapshots.
  - Fix: Define storage classes explicitly. Keep only intentionally portable metadata in tracked PJM state and place snapshots/journals in a gitignored, worktree-aware local store by default, or require explicit opt-in plus a concrete protection/redaction contract for shared storage. Specify behavior for `shared`, `local`, and `synced` targets and resolve the complete-description versus credential-redaction boundary.
  - Requirement: FR5, FR12, NFR1, NFR4

- **The remote configuration schema and precedence are not implementation-deterministic** (`.oat/projects/shared/remote-project-management/design.md:239`)
  - Issue: Provider and operation override objects are placeholders, `BindingPolicyRestriction` is undefined, and the transport example is labeled “User or local configuration” without choosing a surface or defining user/local precedence. The current repository has separate normalized shared, repo-local, and user config types; neither repo-local nor user config currently accepts `pjm.remote`. Implementers cannot derive one authoritative merge contract from this design.
  - Fix: Specify the full versioned schemas for repository defaults, provider/operation overrides, binding restrictions, and transport lists. Name each owning config file, define precedence and unknown-value handling, and map the schema into the existing `OatConfig`, `OatLocalConfig`, `UserConfig`, and `oat config` discovery/set surfaces.
  - Requirement: FR7, FR8, FR16

- **Cross-transport read-back contradicts the post-attempt pinning contract** (`.oat/projects/shared/remote-project-management/design.md:170`)
  - Issue: Mutation step 6 permits verification through the pinned transport “or an equivalently authoritative read capability,” but the specification requires reconciliation before switching transports after any write attempt. A different account, workspace, visibility boundary, consistency model, or field projection could falsely verify or hide a partial write.
  - Fix: Require verification through the pinned transport for the in-flight operation. If that read is unavailable or ambiguous, persist `uncertain` and enter reconciliation; another transport may contribute evidence only through that separate reconciliation path after identity/context equivalence is re-established.
  - Requirement: FR11, FR16, NFR2

- **Reviewed batches have no durable aggregate contract** (`.oat/projects/shared/remote-project-management/design.md:50`)
  - Issue: The design promises one reviewed batch preview and independent outcomes, but models only per-binding operations plus an untyped `correlationId`. There is no durable batch digest, membership snapshot, approval binding, aggregate state, or restart algorithm. An interrupted closeout cannot prove which bindings were approved, attempted, skipped, or added after preview.
  - Fix: Add a versioned `RemoteBatchRecord`, or specify an equivalent canonical reconstruction contract, containing the preview digest, immutable member operation IDs, authorization evidence, per-member outcomes, and recovery rules. Define how batch approval remains bound to the exact membership and per-binding previews.
  - Requirement: FR10, FR15, NFR3, NFR6

### Medium

- **On-demand discussion evidence is specified but not designed** (`.oat/projects/shared/remote-project-management/design.md:430`)
  - Issue: The provider interface and command family correctly exclude comments, activity, and assignees from synchronized snapshots, but they expose no read-only operation for fetching discussion evidence on demand. The requirement is therefore neither implemented by the design nor explicitly deferred.
  - Fix: Add a bounded read-only discussion capability and semantic operation with pagination, sanitization, non-persistence by default, and optional explicit distillation into locally authored backlog content.
  - Requirement: FR12, FR18

- **Machine exit semantics are missing for non-success remote statuses** (`.oat/projects/shared/remote-project-management/design.md:822`)
  - Issue: The JSON envelope defines `pending`, `needs-review`, `partial`, `uncertain`, and `blocked`, but the design does not map them to the repository's established CLI exit contract (`0` success, `1` actionable/user condition, `2` system/runtime failure). Automation cannot know whether a durable pending result is a successful handoff or a failed command.
  - Fix: Define exit codes for every envelope status and distinguish successfully persisted handoffs from runtime/persistence failures. Add command-wiring and human/JSON parity tests.
  - Requirement: NFR6, NFR7

- **Byte-semantic ADF preservation is not a viable correctness test** (`.oat/projects/shared/remote-project-management/design.md:480`)
  - Issue: Jira APIs and connectors exchange parsed JSON and may legitimately canonicalize key order or representation. Requiring the surrounding ADF document to round-trip “byte-semantically” can reject safe updates or imply a guarantee the selected transports cannot observe.
  - Fix: Define structural preservation of all nodes/marks outside the managed container, using canonical JSON hashes or subtree equality, while allowing transport serialization differences. Retain the original observed representation only as evidence, not as the semantic equality rule.
  - Requirement: FR7, NFR5

- **The single-pending-operation invariant exceeds the proposed concurrency primitive** (`.oat/projects/shared/remote-project-management/design.md:330`)
  - Issue: Compare-before-write followed by atomic rename does not prevent two processes from both observing the same binding state and installing different `pendingOperationId` values. Unique per-operation journals preserve some evidence, but the binding-level “at most one” invariant and sequencing claim are not enforceable without additional collision handling.
  - Fix: Keep the approved no-lock limitation, but state this invariant as best-effort unless a compatible local exclusion mechanism is added. Re-read after rename, preserve both operation journals, detect orphaned/concurrent intents in doctor/reconciliation, and add a two-process start fixture proving no intent is lost or blindly retried.
  - Requirement: FR11, NFR3

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `spec.md`, `design.md`, `state.md`, the scaffolded `plan.md`, all three provider dossiers, generated architecture/integration/testing references, repository and PJM guidance, current CLI/PJM/config/filesystem sources, config and directory-structure documentation, `.gitignore`, and `.oat/config.json`. No implementation artifact exists yet.

### Requirements Coverage

| Requirement | Status  | Notes                                                                                                                    |
| ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| FR1         | covered | Three providers, coexistence, stable bindings, and provider extensions are designed.                                     |
| FR2         | partial | Offline behavior is designed, but pending/blocked/failed durable states are incomplete (Critical finding 3).             |
| FR3         | partial | Purpose vocabulary exists; multi-purpose authority composition is missing (Critical finding 1).                          |
| FR4         | covered | Intake, publish, refresh, reconcile, and closeout are explicit and non-transitive.                                       |
| FR5         | partial | Identity, snapshots, baselines, and receipts exist; outcome persistence and storage scope remain incomplete.             |
| FR6         | covered | The shared field contract stays limited to title, governed description, and capability-gated priority.                   |
| FR7         | partial | Modes and tightening are present; exact config schema and tracked-content boundary remain incomplete.                    |
| FR8         | partial | Authority modes and floors are present; exact override schemas and composition are incomplete.                           |
| FR9         | covered | B/L/R field classifications, conflicts, previews, and baseline advancement are defined.                                  |
| FR10        | partial | Per-binding outcomes are clear; durable reviewed-batch membership and approval are not modeled.                          |
| FR11        | partial | Write-once and read-back are present; cross-transport verification and local concurrent starts need correction.          |
| FR12        | partial | Core snapshot retention is designed; storage privacy and on-demand discussion access are unresolved.                     |
| FR13        | missing | Anomalies are represented, but relink/detach/recreate operations are absent.                                             |
| FR14        | covered | Durable intent, provenance, duplicate search, and no-blind-retry behavior are designed.                                  |
| FR15        | partial | Per-binding closeout exists; multi-purpose and batch aggregation contracts are incomplete.                               |
| FR16        | partial | Defaults and capability selection exist; config precedence and post-attempt transport pinning are incomplete.            |
| FR17        | covered | GitHub→Linear, GitHub→Jira, and GitHub-only flows are included in phases and E2E coverage.                               |
| FR18        | partial | Artifact and sync-field boundaries are clear; on-demand discussion evidence lacks an interface.                          |
| NFR1        | partial | Auth handling and redaction are strong; tracked full descriptions and complete-versus-redacted semantics are unresolved. |
| NFR2        | covered | Ambiguity, capability gaps, stale previews, and uncertain outcomes fail closed.                                          |
| NFR3        | partial | Journals are durable, but outcome states, batch recovery, and concurrent-intent preservation are incomplete.             |
| NFR4        | covered | Offline local work, freshness, snapshots, and pending intents are intended.                                              |
| NFR5        | covered | Provider adapters retain identities, extensions, dynamic schema, and capability evidence.                                |
| NFR6        | partial | Preview/result content is defined; process exit behavior and durable batch visibility need completion.                   |
| NFR7        | covered | PJM adoption compatibility, legacy associations, migration, and regression coverage are addressed.                       |
| NFR8        | covered | Semantic adapters are separated from capability-negotiated CLI/MCP transports.                                           |

### Extra Work (not in declared requirements)

None. The additional migration, doctor, and host-executor details are appropriate enabling design for the declared requirements.

## Verification Commands

After revising the artifacts:

```bash
pnpm exec oxfmt --check ".oat/projects/shared/remote-project-management/spec.md" ".oat/projects/shared/remote-project-management/design.md"
pnpm check
```

Then rerun the gate-originated `artifact design` review and require zero Critical and Important findings before planning.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into design-fix tasks.
