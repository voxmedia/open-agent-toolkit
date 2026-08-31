---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-08-30
oat_phase: plan
oat_phase_status: complete
oat_plan_source: spec-driven
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_plan_hill_phases: ['p08']
oat_auto_review_at_hill_checkpoints: true
---

# Implementation Plan: Remote Project Management

> Execute with oat-project-implement. Per-phase external review gates are
> disabled for this project. Implementation HiLL checkpoints and any actual
> parallel execution groups remain deferred to implementation kickoff.

**Goal:** Add safe, local-first remote bindings for GitHub Issues, Linear, and
Jira Cloud, with explicit lifecycle operations, policy-controlled mutations,
restart-safe reconciliation evidence, and no provider-to-provider mirroring.

**Architecture:** A provider-neutral domain, policy, reconciliation, operation,
and persistence core lives under oat pjm remote. Provider adapters preserve
native semantics, while transports execute only capability-matched operations
and return observations for core verification. Compact portable associations
remain separate from privacy-sensitive operational state.

**Tech Stack:** Node.js 22.17+, TypeScript ESM, Commander, Zod, YAML, Vitest,
canonical OAT Markdown skills, and injected process/filesystem/tool seams.

**Commit Convention:** {type}(pNN-tNN): {description}

## Planning Checklist

- [x] Discovery, specification, and design are complete.
- [x] Design received two external review loops; all returned findings were
      incorporated into the final design.
- [x] The implementation dependency topology distinguishes hard dependencies,
      peer lanes, and convergence work.
- [x] Per-phase external review gates are disabled by explicit user choice.
- [x] Defer HiLL checkpoint confirmation to oat-project-implement.
- [x] Leave oat_plan_parallel_groups unset until implementation kickoff
      explicitly confirms parallel execution.
- [x] Resolve and preserve the project dispatch policy at high.
- [x] Complete the structured plan self-review.
- [x] Pass a corroborated external fallback gate on
      cursor-gpt-5-6-sol-xhigh with zero findings.
- [x] Pass the user-selected cursor-fable-5-xhigh external plan gate and
      receive its corroborated artifact.

## Dependency Topology

1. p01 Domain/config/storage -> p02 Reconciliation/safety ->
   p03 Execution/lifecycle/skill.
2. p04 GitHub, p05 Linear, and p06 Jira are peer lanes after p03.
3. p07 Cross-provider convergence depends on all three provider lanes.
4. p08 Documentation and release validation depends on p07.

- **Hard dependencies:** p02 depends on p01; p03 depends on p01-p02; p07
  depends on p04-p06; p08 depends on p07.
- **Peer lanes:** p04, p05, and p06 may proceed independently after p03. Their
  numbering does not imply serial execution.
- **Shared-file coordination:** p04-p06 own distinct provider and transport
  modules. They import the immutable p03 conformance harness and supply fixtures
  in provider-local tests; changes to shared interfaces return to p03 ownership.
- **Execution setting:** no oat_plan_parallel_groups value is recorded. The
  implement workflow must confirm parallel execution separately before
  dispatching the peer lanes concurrently.

## Task Execution Contract

- For every code task, complete its failing-test step, then run that task's
  listed Run command and require a failure caused by the missing behavior.
- Complete the implementation outline, run the listed Format command, then run
  the same task-specific Run command again and require a pass before committing.
- For documentation, release, or repair-only tasks, author the listed changes,
  run Format before the listed verification command, and commit only when that
  command has the stated zero exit.
- Each commit stages only the exact Files paths named by that task. A task that
  produces no file change makes no empty commit.

## Phase 1: Domain, Configuration, and Persistence

### Task p01-t01: Define remote configuration types

**Implementation:** completed in
`6f5de98828e8b71c62014677cb7f4391cf0e8941`

**Files:** Modify packages/cli/src/config/oat-config.ts and
packages/cli/src/config/oat-config.test.ts.

1. Add failing parse tests for shared policy/storage and local/user transport
   shapes, including rejection of cross-surface keys.
2. Add OatPjmRemoteSharedConfig, OatPjmRemoteTransportConfig, provider,
   description, authority, and operation-class types to the appropriate config
   surfaces.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts
5. Commit: feat(p01-t01): define remote configuration types

### Task p01-t02: Resolve transport preferences by owning scope

**Implementation:** in progress

**Files:** Modify packages/cli/src/config/resolve.ts and
packages/cli/src/config/resolve.test.ts.

1. Add failing cases for local > user > built-in provider lists, replacement
   rather than concatenation, duplicate removal, and explicit empty disablement.
2. Implement resolvePjmRemoteTransportConfig() with defaults github: [gh],
   linear: [mcp], and jira: [mcp], preserving per-value source evidence.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/resolve.test.ts
5. Commit: feat(p01-t02): resolve remote transport preferences

### Task p01-t03: Expose remote configuration through config commands

**Files:** Modify packages/cli/src/commands/config/index.ts and
packages/cli/src/commands/config/index.test.ts.

1. Add failing get/list/dump/describe/set command cases for pjm.remote,
   including source attribution and owning-surface rejection.
2. Register closed descriptors for remote policy, storage, and transport keys;
   reject shared transport writes and local/user authority writes.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts
5. Commit: feat(p01-t03): expose remote configuration commands

### Task p01-t04: Define strict remote record schemas

**Files:** Create packages/cli/src/commands/pjm/remote/schema.ts and
packages/cli/src/commands/pjm/remote/schema.test.ts.

1. Add failing fixtures for binding metadata/state, snapshots, baselines,
   operations, substeps, batches, outcomes, aliases, redaction flags, and all
   independent schema-version and stable-ID checks.
2. Implement closed Zod schemas and inferred types matching the design, with
   adapter-extension allowlists and byte limits instead of raw payload fields.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/schema.test.ts
5. Commit: feat(p01-t04): define remote record schemas

### Task p01-t05: Resolve portable and operational storage locations

**Files:** Create packages/cli/src/commands/pjm/remote/storage-locator.ts and
packages/cli/src/commands/pjm/remote/storage-locator.test.ts.

1. Add failing cases for shared backlog, shared/synced project, local project,
   common-Git-dir state, shared-state opt-in, new clone, and worktree reuse.
2. Implement resolveRemoteStorageLocations() using stable repository
   fingerprints and reject shared operational storage for local projects.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/storage-locator.test.ts
5. Commit: feat(p01-t05): resolve remote storage locations

### Task p01-t06: Persist remote records atomically

**Files:** Create packages/cli/src/commands/pjm/remote/store.ts and
packages/cli/src/commands/pjm/remote/store.test.ts.

1. Add failing filesystem tests for unique temp files, restrictive modes,
   schema/filename validation, fsync/rename, expected-state transitions,
   duplicate step rejection, and exclusive operation creation.
2. Implement RemoteSyncStore and injected filesystem seams; keep portable
   metadata and operational records in their resolved storage classes.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/store.test.ts
5. Commit: feat(p01-t06): add restart-safe remote sync store

### Task p01-t07: Preserve simultaneous operation intents

**Files:** Modify packages/cli/src/commands/pjm/remote/store.ts and
packages/cli/src/commands/pjm/remote/store.test.ts.

1. Add a two-writer fixture proving both unique journals survive and a binding
   reread plus journal scan reports multiple active intents.
2. Add listActiveOperations(bindingId) and derived conflict detection without
   claiming a local or distributed lock.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/store.test.ts
5. Commit: feat(p01-t07): preserve concurrent remote intents

### Task p01-t08: Add backward-compatible association codec

**Files:** Create packages/cli/src/commands/pjm/remote/association.ts and its
test; modify packages/cli/src/commands/backlog/new.ts and new.test.ts.

1. Add failing cases for legacy scalars, reference objects, canonical
   {type, ref, binding} entries, unrelated-value preservation, and dangling
   references.
2. Implement parseAssociatedIssues() and serializeAssociatedIssues(); keep new
   backlog items compatible and association-only links non-authorizing.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/association.test.ts src/commands/backlog/new.test.ts
5. Commit: feat(p01-t08): add remote association codec

### Task p01-t09: Add foundational remote doctor checks

**Files:** Create packages/cli/src/commands/pjm/remote/doctor.ts and its test;
modify packages/cli/src/commands/pjm/doctor.ts and doctor.test.ts.

1. Add failing checks for schema/filename mismatch, dangling/duplicate IDs,
   metadata-state disagreement, forbidden storage content, invalid policy, and
   concurrent active intents.
2. Implement additive pjm:remote\_\* diagnostics that remain dormant when no
   remote records exist and never inspect credential values.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/doctor.test.ts src/commands/pjm/doctor.test.ts
5. Commit: feat(p01-t09): add remote doctor foundations

### Task p01-t10: Persist pre-create binding intent

**Files:** Modify packages/cli/src/commands/pjm/remote/schema.ts,
packages/cli/src/commands/pjm/remote/schema.test.ts,
packages/cli/src/commands/pjm/remote/store.ts, and
packages/cli/src/commands/pjm/remote/store.test.ts.

1. Add failing schemas and store cases for a reserved binding ID attached to an
   unbound local target, explicit publication projection, provider context,
   purposes, policy restrictions, provenance token, and operation ID before any
   remote identity exists. Reject materialized binding metadata without a
   verified durable remote identity.
2. Add PlannedBindingCreate and store methods createBindingIntent() and
   materializeVerifiedBinding(). Preserve an uncertain pre-create journal
   without creating portable metadata or a compact association.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/schema.test.ts src/commands/pjm/remote/store.test.ts
5. Commit: feat(p01-t10): persist pre-create binding intent

## Phase 2: Reconciliation and Safety Engine

### Task p02-t01: Compose binding-purpose policy by intersection

**Files:** Create packages/cli/src/commands/pjm/remote/purpose-policy.ts and
packages/cli/src/commands/pjm/remote/purpose-policy.test.ts.

1. Add the full single- and multi-purpose matrix for source, planning,
   delivery, and reference, including incompatible closeout choices.
2. Implement composePurposePolicies() as field/lifecycle set intersection;
   empty intersections are explicit no-ops and never grants.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/purpose-policy.test.ts
5. Commit: feat(p02-t01): compose remote purpose policies

### Task p02-t02: Project local backlog and project content safely

**Files:** Create packages/cli/src/commands/pjm/remote/local-projection.ts and
packages/cli/src/commands/pjm/remote/local-projection.test.ts.

1. Add failing cases for backlog title/priority/Description extraction,
   explicit project publication projections, source hashes, and exclusion of
   discovery/spec/design/plan/implementation/review content.
2. Implement resolveLocalProjection() with explicit target kinds and source
   evidence.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/local-projection.test.ts
5. Commit: feat(p02-t02): resolve safe local projections

### Task p02-t03: Redact and bound retained remote snapshots

**Files:** Create packages/cli/src/commands/pjm/remote/snapshot.ts and
packages/cli/src/commands/pjm/remote/snapshot.test.ts.

1. Add credential-shaped description fixtures, provider-extension size limits,
   core-field allowlists, redaction markers, and visibly incomplete snapshots.
2. Implement sanitizeRemoteSnapshot() before persistence or rendering; never
   retain raw auth headers, comments, activity, assignees, or payload dumps.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/snapshot.test.ts
5. Commit: feat(p02-t03): sanitize remote snapshots

### Task p02-t04: Implement managed Markdown boundaries

**Files:** Create packages/cli/src/commands/pjm/remote/managed-markdown.ts and
packages/cli/src/commands/pjm/remote/managed-markdown.test.ts.

1. Add round-trip cases for absent, unique, duplicated, nested, malformed, and
   user-edited OAT markers while preserving every surrounding byte.
2. Implement structural extraction/replacement that returns choice-required
   for ambiguous boundaries and never falls back to full replacement.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/managed-markdown.test.ts
5. Commit: feat(p02-t04): preserve managed markdown sections

### Task p02-t05: Classify three-way field reconciliation

**Files:** Create packages/cli/src/commands/pjm/remote/reconcile.ts and
packages/cli/src/commands/pjm/remote/reconcile.test.ts.

1. Add B/L/R fixtures for no-change, local-only, remote-only, converged,
   disjoint, conflict, remote anomaly, uncertain operation, description modes,
   and optional priority capability.
2. Implement pure reconcileBinding() over title, governed description, and
   safely mapped priority; keep status outside shared fields.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/reconcile.test.ts
5. Commit: feat(p02-t05): add three-way reconciliation engine

### Task p02-t06: Resolve effective remote authority exactly

**Files:** Create packages/cli/src/commands/pjm/remote/authority.ts and
packages/cli/src/commands/pjm/remote/authority.test.ts.

1. Add a truth table for built-in, repository default/operation, provider
   default/operation, binding default/operation clamps, invalid values, and
   immutable replacement/destructive/identity floors.
2. Implement resolveEffectiveRemotePolicy() with complete trace evidence and
   the order read-only < user-approved < user-authorized < autonomous.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/authority.test.ts
5. Commit: feat(p02-t06): resolve remote mutation authority

### Task p02-t07: Bind previews and approvals to load-bearing inputs

**Files:** Create packages/cli/src/commands/pjm/remote/preview.ts and
packages/cli/src/commands/pjm/remote/preview.test.ts.

1. Add deterministic digest fixtures and invalidation cases for binding,
   target, baseline, revision, capabilities, policy, projection, and field mask.
2. Implement buildBindingPreview() and validatePreviewApproval() with safe
   value rendering/hashing and non-secret actor/source evidence.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/preview.test.ts
5. Commit: feat(p02-t07): bind remote previews and approvals

### Task p02-t08: Implement operation and substep state reduction

**Files:** Create packages/cli/src/commands/pjm/remote/operation-state.ts and
packages/cli/src/commands/pjm/remote/operation-state.test.ts.

1. Add every valid/invalid parent and substep transition, including planned,
   authorized, attempt-started, verified, partial, uncertain, rejected,
   blocked, and failed.
2. Implement transitionRemoteOperation() and composite parent reduction so
   verified substeps are never repeated after a later substep fails.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/operation-state.test.ts
5. Commit: feat(p02-t08): add remote operation state machine

### Task p02-t09: Verify postconditions and block blind retries

**Files:** Create packages/cli/src/commands/pjm/remote/verification.ts and
packages/cli/src/commands/pjm/remote/verification.test.ts.

1. Add exact, partial, rejected, ambiguous, missing-readback, revision-drift,
   and already-verified fixtures against requested field masks.
2. Implement verifyRemotePostconditions() so command exit alone never proves
   success and partial/uncertain results require reconciliation before retry or
   transport change.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/verification.test.ts
5. Commit: feat(p02-t09): verify remote mutation postconditions

## Phase 3: Execution Substrate and Lifecycle UX

### Task p03-t01: Define provider adapter and conformance contract

**Files:** Create packages/cli/src/commands/pjm/remote/provider.ts,
provider-conformance.ts, and provider-conformance.test.ts.

1. Add a fake adapter proving stable identity, aliases, normalization,
   capability discovery, operation planning, and verification field masks.
2. Define ProviderAdapter and reusable conformance cases without importing a
   provider-specific payload into the core domain.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/provider-conformance.test.ts
5. Commit: feat(p03-t01): define remote provider contract

### Task p03-t02: Select transports by semantic capability

**Files:** Create packages/cli/src/commands/pjm/remote/transport-registry.ts
and transport-registry.test.ts.

1. Add ordered probe cases for unavailable, auth-required, context-mismatched,
   capability-missing, equivalent fallback, explicit disablement, and no route.
2. Implement selectRemoteTransport() with provider/context/capability
   fingerprints and fallback only before an attempt starts.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/transport-registry.test.ts
5. Commit: feat(p03-t02): select capable remote transports

### Task p03-t03: Add a safe external-command runner

**Files:** Create packages/cli/src/commands/pjm/remote/safe-command-runner.ts
and safe-command-runner.test.ts.

1. Add fake executable cases for argv injection, stdin, environment allowlist,
   timeout, output caps, invalid JSON, nonzero exit, partial output, and redaction.
2. Implement injected spawn execution with argv arrays, no shell, bounded I/O,
   sanitized diagnostics, and executable identity/version evidence.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/safe-command-runner.test.ts
5. Commit: feat(p03-t03): add safe remote command runner

### Task p03-t04: Define the host-executor action protocol

**Files:** Create packages/cli/src/commands/pjm/remote/external-action.ts and
external-action.test.ts.

1. Add schema/digest tests for action and observation envelopes, stale steps,
   duplicates, mismatched provider/context, size limits, and sanitization.
2. Implement buildExternalAction() and acceptExternalObservation(); connector
   observations remain evidence and cannot directly set success.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/external-action.test.ts
5. Commit: feat(p03-t04): define host executor protocol

### Task p03-t05: Implement refresh and intake services

**Files:** Create packages/cli/src/commands/pjm/remote/lifecycle.ts and
lifecycle.test.ts.

1. Add injected-provider tests for refresh persistence, intake create/enrich,
   initial inbound baseline, redaction, freshness, no mutation, and offline
   failure that leaves local PJM unaffected.
2. Implement refreshBinding() and intakeRemoteIssue() with provider-neutral
   dependencies and atomic local transitions.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/lifecycle.test.ts
5. Commit: feat(p03-t05): add refresh and intake lifecycle

### Task p03-t06: Implement publish and reconcile services

**Files:** Modify packages/cli/src/commands/pjm/remote/lifecycle.ts and
lifecycle.test.ts.

1. Add preview-only, exact user-instruction-authorized, fresh-approved,
   conflict, read-only, stale-preview, and no-transitive-propagation cases.
   Prove autonomous mode is blocked without matching active-workflow authority
   evidence and allowed only while that evidence remains current.
2. Implement publishBinding() and reconcileRemoteBinding() using persisted
   intent, immediate pre-read, one attempt, pinned readback, and verification.
   Persist the instruction/workflow evidence in the preview and operation
   record so any caller, workflow, or revision change invalidates it.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/lifecycle.test.ts
5. Commit: feat(p03-t06): add publish and reconcile lifecycle

### Task p03-t07: Emit one command envelope and exit mapping

**Files:** Create packages/cli/src/commands/pjm/remote/output.ts and
output.test.ts.

1. Add human/JSON parity cases for ok, pending, needs-review, partial,
   uncertain, blocked, rejected, and failed, including stdout/stderr and exits.
2. Implement RemoteCommandEnvelope, safe human rendering, and the exact design
   mapping; pending with an external action remains a durable handoff.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/output.test.ts
5. Commit: feat(p03-t07): add remote command envelope

### Task p03-t08: Wire the oat pjm remote command family

**Files:** Create packages/cli/src/commands/pjm/remote/index.ts and index.test.ts;
modify packages/cli/src/commands/pjm/index.ts and index.test.ts.

1. Add command-factory tests for intake, publish, refresh, reconcile, operation
   continue, exact user-instruction evidence, active-workflow authority
   evidence, JSON dependencies, adoption checks, and help output.
2. Register the nested family with injected services; writes fail closed before
   mutation when PJM adoption is absent/partial or required caller authority
   evidence is absent, stale, or mismatched.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/index.test.ts src/commands/pjm/index.test.ts
5. Commit: feat(p03-t08): wire remote lifecycle commands

### Task p03-t09: Add the provider-neutral host skill

**Files:** Create .agents/skills/oat-pjm-remote/SKILL.md,
references/external-action-protocol.md, and tests/contract.test.mjs.

1. Add contract tests requiring oat pjm doctor --json, CLI-owned policy and
   verdicts, exact action/observation continuation, bounded discussion reads,
   and no direct skill-authored remote success.
2. Author version 1.0.0 skill guidance for host connector discovery or CLI
   lifecycle invocation, including schema-constrained stdin handoff.
3. Format: pnpm format:fix
4. Run: node --test .agents/skills/oat-pjm-remote/tests/\*.test.mjs && pnpm oat:validate-skills && pnpm lint && pnpm format
5. Commit: feat(p03-t09): add remote project management skill

### Task p03-t10: Add shared lifecycle integration fixtures

**Files:** Create
`packages/cli/src/commands/pjm/remote/__integration__/lifecycle-harness.ts` and
`packages/cli/src/commands/pjm/remote/__integration__/lifecycle.test.ts`.

1. Build reusable fake store, clock, IDs, provider, transport, and crash points.
2. Cover restart between every operation transition, stale approval, pinned
   transport, uncertain readback, and local-only continued operation.
3. Format: pnpm format:fix
4. Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/__integration__/lifecycle.test.ts`
5. Commit: test(p03-t10): add remote lifecycle integration harness

### Task p03-t11: Gate shared operational storage behind previewed approval

**Files:** Create packages/cli/src/commands/pjm/remote/shared-storage.ts and
shared-storage.test.ts; modify packages/cli/src/commands/pjm/remote/index.ts and
index.test.ts; modify packages/cli/src/commands/config/index.ts and index.test.ts.

1. Add failing preview/apply cases binding approval to repository fingerprint,
   config target, current storage mode, retained-data warning, and proposed
   shared paths. Reject stale/absent approval, local project targets, and direct
   config-set attempts that bypass this boundary.
2. Implement buildSharedStoragePreview() and applySharedStorageTransition().
   Write shared configuration only after fresh approval validation; never move
   or publish operational records implicitly.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/shared-storage.test.ts src/commands/pjm/remote/index.test.ts src/commands/config/index.test.ts
5. Commit: feat(p03-t11): gate shared remote storage

### Task p03-t12: Materialize a binding through initial publish

**Files:** Create packages/cli/src/commands/pjm/remote/create-binding.ts and
packages/cli/src/commands/pjm/remote/create-binding.test.ts; modify
packages/cli/src/commands/pjm/remote/lifecycle.ts,
packages/cli/src/commands/pjm/remote/lifecycle.test.ts,
packages/cli/src/commands/pjm/remote/association.ts,
packages/cli/src/commands/pjm/remote/association.test.ts,
packages/cli/src/commands/pjm/remote/index.ts, and
packages/cli/src/commands/pjm/remote/index.test.ts.

1. Add failing backlog and project-target cases for explicit publication
   projection, reserved IDs, persist-before-create intent, verified create
   readback, snapshot/baseline initialization, portable metadata, and compact
   association materialization. Inject crashes after each boundary and cover
   rejected and uncertain creates without blind retry.
2. Implement createAndBindRemoteIssue() as an ordered local transaction:
   reserve IDs and intent; execute one provider create; verify durable identity
   and requested fields; atomically materialize binding state/metadata; then
   write the compact association. Wire unbound publish through injected command
   services and a resumable external-action handoff.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/create-binding.test.ts src/commands/pjm/remote/lifecycle.test.ts src/commands/pjm/remote/association.test.ts src/commands/pjm/remote/index.test.ts
5. Commit: feat(p03-t12): materialize initial remote binding

## Phase 4: GitHub Adapter and gh Transport

> Peer lane after p03. Own only providers/github*, transports/gh*, and its
> additive conformance fixture entries.

### Task p04-t01: Normalize GitHub identity and snapshots

**Files:** Create packages/cli/src/commands/pjm/remote/providers/github.ts and
github.test.ts.

1. Add fixtures for database ID, node ID, repository context, owner/name/number
   aliases, transfer aliases, title/body/state/priority extension, and PR links.
2. Implement GitHub reference parsing and snapshot normalization with stable
   identity independent of display alias.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/providers/github.test.ts
5. Commit: feat(p04-t01): normalize github issues

### Task p04-t02: Probe gh identity and capabilities

**Files:** Create packages/cli/src/commands/pjm/remote/transports/gh.ts and
gh.test.ts.

1. Add fake gh cases for absence, auth/account mismatch, repo mismatch,
   version drift, JSON field support, rate limits, and capability fingerprints.
2. Implement read-only probe/read methods through the safe runner without
   persisting auth material.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/transports/gh.test.ts
5. Commit: feat(p04-t02): probe github gh capabilities

### Task p04-t03: Read and refresh GitHub issues

**Files:** Modify packages/cli/src/commands/pjm/remote/transports/gh.ts and
gh.test.ts.

1. Add current/renamed/transferred/archived/inaccessible/deleted/temporary
   failure fixtures with revision/freshness evidence.
2. Implement readIssue() and lifecycle classification, distinguishing ambiguous
   404 from authoritative deletion.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/transports/gh.test.ts
5. Commit: feat(p04-t03): read github issue state

### Task p04-t04: Plan GitHub create and field updates

**Files:** Modify packages/cli/src/commands/pjm/remote/providers/github.ts and
packages/cli/src/commands/pjm/remote/providers/github.test.ts.

1. Add operation-plan cases for create provenance, title, managed/full body,
   safe priority extension, unsupported masks, and exact postconditions.
2. Implement semantic plans using managed Markdown and supported field masks.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/providers/github.test.ts
5. Commit: feat(p04-t04): plan github issue mutations

### Task p04-t05: Execute and verify GitHub mutations

**Files:** Modify packages/cli/src/commands/pjm/remote/transports/gh.ts and
gh.test.ts.

1. Add one-attempt create/edit/close/reopen/comment fixtures, silently dropped
   fields, rejection, timeout-after-write, and pinned readback.
2. Implement mutation argv construction and adapter verification; never retry
   an uncertain create or update.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/transports/gh.test.ts
5. Commit: feat(p04-t05): execute github issue mutations

### Task p04-t06: Run GitHub adapter conformance

**Files:** Create
packages/cli/src/commands/pjm/remote/providers/github.conformance.test.ts.

1. Cover source-only, planning, combined source/planning, annotations,
   transitions, native extensions, and no duplicate planning issue.
2. Import the immutable p03 conformance harness and supply GitHub fixtures
   locally; keep all shared interfaces and shared files unchanged.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/providers/github.conformance.test.ts
5. Commit: test(p04-t06): cover github adapter conformance

### Task p04-t07: Add GitHub lifecycle integration

**Files:** Create
`packages/cli/src/commands/pjm/remote/__integration__/github.test.ts`.

1. Exercise intake, refresh, publish, reconcile, and closeout through fake gh.
2. Assert exact argv, persisted intent/receipt, readback verification, transfer
   history, rate-limit failure, and per-binding outcomes.
3. Format: pnpm format:fix
4. Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/__integration__/github.test.ts`
5. Commit: test(p04-t07): integrate github remote lifecycle

### Task p04-t08: Gate publication to public GitHub issues

**Files:** Create
packages/cli/src/commands/pjm/remote/providers/github-publication-safety.ts and
github-publication-safety.test.ts; modify
`packages/cli/src/commands/pjm/remote/__integration__/github.test.ts`.

1. Add private/public repository classification, unavailable visibility,
   prohibited private artifact content, credential-shaped content, safe
   projection, sanitized preview, and blocked-publication fixtures.
2. Implement assessGitHubPublicationSafety() before preview authorization.
   Public or ambiguously public targets fail closed unless the exact projected
   content passes the privacy and credential scan; readback verifies only the
   approved sanitized projection.
3. Format: pnpm format:fix
4. Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/providers/github-publication-safety.test.ts src/commands/pjm/remote/__integration__/github.test.ts`
5. Commit: feat(p04-t08): gate public github publication

### Task p04-t09: Plan GitHub duplicate searches

**Files:** Modify packages/cli/src/commands/pjm/remote/providers/github.ts and
github.test.ts.

1. Add failing provider-plan cases for provenance token, reserved binding ID,
   historical aliases, exact repository context, unsupported search, ambiguous
   matches, one verified match, and no match.
2. Implement planDuplicateSearch() with explicit semantic capability and
   bounded query/result contracts; a match is evidence until stable identity
   and context verification completes.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/providers/github.test.ts
5. Commit: feat(p04-t09): plan github duplicate searches

### Task p04-t10: Execute GitHub duplicate searches through gh

**Files:** Modify packages/cli/src/commands/pjm/remote/transports/gh.ts,
packages/cli/src/commands/pjm/remote/transports/gh.test.ts, and
`packages/cli/src/commands/pjm/remote/__integration__/github.test.ts`.

1. Add failing fake-gh cases for exact-repository provenance/alias search,
   unavailable capability, result bounds, ambiguity, transferred aliases,
   no-match, and stable-identity verification.
2. Implement searchDuplicates() through the safe runner and advertise the
   capability only when the installed gh surface can return the required
   identity/context evidence.
3. Format: pnpm format:fix
4. Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/transports/gh.test.ts src/commands/pjm/remote/__integration__/github.test.ts`
5. Commit: feat(p04-t10): search github duplicates

### Task p04-t11: Read bounded GitHub discussion evidence

**Files:** Modify packages/cli/src/commands/pjm/remote/providers/github.ts,
packages/cli/src/commands/pjm/remote/providers/github.test.ts,
packages/cli/src/commands/pjm/remote/transports/gh.ts,
packages/cli/src/commands/pjm/remote/transports/gh.test.ts, and
`packages/cli/src/commands/pjm/remote/__integration__/github.test.ts`.

1. Add planDiscussionRead(), pagination, limit, sanitization, rate-limit,
   permission, and non-persistence fixtures for issue comments and activity
   evidence.
2. Implement a bounded gh discussion read whose cursor and normalized page are
   returned to the provider-neutral service but never enter binding snapshots
   or journals.
3. Format: pnpm format:fix
4. Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/providers/github.test.ts src/commands/pjm/remote/transports/gh.test.ts src/commands/pjm/remote/__integration__/github.test.ts`
5. Commit: feat(p04-t11): read github discussion evidence

## Phase 5: Linear Adapter and Transports

> Peer lane after p03. Own only providers/linear*, transports/linear-cli*,
> Linear action codecs, and its additive conformance fixture entries.

### Task p05-t01: Normalize Linear identity and snapshots

**Files:** Create packages/cli/src/commands/pjm/remote/providers/linear.ts and
linear.test.ts.

1. Add UUID, workspace/team context, current/historical identifier, moved-team,
   title/description/state/priority, archive, and native extension fixtures.
2. Implement Linear reference parsing and normalization keyed by durable issue
   identity rather than the mutable human identifier.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/providers/linear.test.ts
5. Commit: feat(p05-t01): normalize linear issues

### Task p05-t02: Map Linear MCP read actions

**Files:** Create
packages/cli/src/commands/pjm/remote/providers/linear-actions.ts and its test.

1. Add captured catalog cases for available/missing operations, workspace/team
   ambiguity, auth-required, partial responses, and catalog fingerprints.
2. Implement external-action schemas for probe, lookup, refresh, and bounded
   discussion reads without a first-party GraphQL client.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/providers/linear-actions.test.ts
5. Commit: feat(p05-t02): map linear connector reads

### Task p05-t03: Map Linear MCP mutation actions

**Files:** Modify
packages/cli/src/commands/pjm/remote/providers/linear-actions.ts and its test.

1. Add create/update/transition/comment action and observation fixtures,
   missing capability, stale catalog, partial error, and verification masks.
2. Implement connector action plans that keep approval, journaling, and verdicts
   in the CLI core.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/providers/linear-actions.test.ts
5. Commit: feat(p05-t03): map linear connector mutations

### Task p05-t04: Probe optional linear-cli

**Files:** Create
packages/cli/src/commands/pjm/remote/transports/linear-cli.ts and its test.

1. Add installed/unavailable/version/schema/auth/context/capability fixtures
   against a fake executable.
2. Implement opt-in probe and read methods through the safe runner; never
   install the community CLI or treat it as the default transport.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/transports/linear-cli.test.ts
5. Commit: feat(p05-t04): probe optional linear cli

### Task p05-t05: Execute optional linear-cli mutations

**Files:** Modify
packages/cli/src/commands/pjm/remote/transports/linear-cli.ts and its test.

1. Add create/update/transition/comment, invalid JSON, rejected operation,
   timeout-after-write, and pinned readback fixtures.
2. Implement only capability-demonstrated semantic operations and leave gaps
   unavailable for fallback selection.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/transports/linear-cli.test.ts
5. Commit: feat(p05-t05): execute optional linear cli operations

### Task p05-t06: Run Linear adapter conformance

**Files:** Create
packages/cli/src/commands/pjm/remote/providers/linear.conformance.test.ts.

1. Cover priority mapping, moved-team aliases, MCP default, optional CLI
   equivalence, unavailable transition, and provider extensions.
2. Import the immutable p03 conformance harness and supply Linear fixtures
   locally; keep all shared interfaces and shared files unchanged.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/providers/linear.conformance.test.ts
5. Commit: test(p05-t06): cover linear adapter conformance

### Task p05-t07: Add Linear lifecycle integration

**Files:** Create
`packages/cli/src/commands/pjm/remote/__integration__/linear.test.ts`.

1. Exercise intake, refresh, publish, reconcile, closeout, and external-action
   continuation through fake MCP observations and optional CLI fallback.
2. Assert no GraphQL transport, context equivalence before fallback, pinned
   readback, archived lifecycle, and independent outcomes.
3. Format: pnpm format:fix
4. Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/__integration__/linear.test.ts`
5. Commit: test(p05-t07): integrate linear remote lifecycle

### Task p05-t08: Search Linear duplicates through MCP actions

**Files:** Modify packages/cli/src/commands/pjm/remote/providers/linear.ts,
packages/cli/src/commands/pjm/remote/providers/linear.test.ts,
packages/cli/src/commands/pjm/remote/providers/linear-actions.ts,
packages/cli/src/commands/pjm/remote/providers/linear-actions.test.ts, and
`packages/cli/src/commands/pjm/remote/__integration__/linear.test.ts`.

1. Add planDuplicateSearch() and connector action/observation cases for
   provenance, historical identifiers, workspace/team context, unavailable
   search, bounded ambiguous matches, one verified match, and no match.
2. Implement MCP duplicate-search planning with catalog fingerprinting and
   stable UUID/context verification before a result can be adopted.
3. Format: pnpm format:fix
4. Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/providers/linear.test.ts src/commands/pjm/remote/providers/linear-actions.test.ts src/commands/pjm/remote/__integration__/linear.test.ts`
5. Commit: feat(p05-t08): search linear duplicates through mcp

### Task p05-t09: Search Linear duplicates through optional CLI

**Files:** Modify
packages/cli/src/commands/pjm/remote/transports/linear-cli.ts,
packages/cli/src/commands/pjm/remote/transports/linear-cli.test.ts, and
`packages/cli/src/commands/pjm/remote/__integration__/linear.test.ts`.

1. Add fake CLI cases for provenance/alias queries, missing search semantics,
   version drift, bounded ambiguity, one stable UUID/context match, and no
   match.
2. Implement searchDuplicates() only when capability probing demonstrates
   semantic equivalence with the adapter plan.
3. Format: pnpm format:fix
4. Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/transports/linear-cli.test.ts src/commands/pjm/remote/__integration__/linear.test.ts`
5. Commit: feat(p05-t09): search linear duplicates through cli

## Phase 6: Jira Cloud Adapter and Transports

> Peer lane after p03. Own only providers/jira*, transports/acli*, Jira
> action/ADF codecs, and its additive conformance fixture entries.

### Task p06-t01: Normalize Jira Cloud identity and snapshots

**Files:** Create packages/cli/src/commands/pjm/remote/providers/jira.ts and
jira.test.ts.

1. Add stable issue ID, site/project context, current/historical key, moved
   project, title/ADF/status/priority/type, lifecycle, and extension fixtures.
2. Implement Jira reference parsing and normalization keyed by issue ID rather
   than mutable issue key.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/providers/jira.test.ts
5. Commit: feat(p06-t01): normalize jira cloud issues

### Task p06-t02: Preserve Jira ADF managed content

**Files:** Create packages/cli/src/commands/pjm/remote/jira-adf.ts and its test.

1. Add structural round trips for unique/absent/duplicate/malformed OAT nodes,
   unknown surrounding nodes, rich text, lossy conversion, and byte limits.
2. Implement structural extraction/replacement that preserves remote-owned
   nodes and fails closed when exact preservation is unproven.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/jira-adf.test.ts
5. Commit: feat(p06-t02): preserve managed jira adf content

### Task p06-t03: Map Jira MCP read and metadata actions

**Files:** Create
packages/cli/src/commands/pjm/remote/providers/jira-actions.ts and its test.

1. Add captured catalog cases for site/project ambiguity, lookup, create/edit
   metadata, transition discovery, comments, auth-required, and partial errors.
2. Implement external-action schemas for probe/read/metadata/discussion with
   catalog fingerprints and no bundled REST client.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/providers/jira-actions.test.ts
5. Commit: feat(p06-t03): map jira connector reads

### Task p06-t04: Map Jira MCP mutation actions

**Files:** Modify
packages/cli/src/commands/pjm/remote/providers/jira-actions.ts and its test.

1. Add create/update/transition/comment actions, schema drift, unavailable
   transition, unknown create result, and exact postcondition masks.
2. Implement connector mutation plans using discovered metadata while keeping
   the core authoritative for approval, state, and verification.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/providers/jira-actions.test.ts
5. Commit: feat(p06-t04): map jira connector mutations

### Task p06-t05: Probe optional Atlassian ACLI

**Files:** Create packages/cli/src/commands/pjm/remote/transports/acli.ts and
acli.test.ts.

1. Add official CLI availability/version/auth/site/project/schema/capability
   fixtures through a fake executable.
2. Implement opt-in probe and read methods with exact context evidence; do not
   bundle or install ACLI.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/transports/acli.test.ts
5. Commit: feat(p06-t05): probe optional atlassian cli

### Task p06-t06: Execute optional ACLI mutations

**Files:** Modify packages/cli/src/commands/pjm/remote/transports/acli.ts and
acli.test.ts.

1. Add create/update/transition/comment, ADF, invalid JSON, rejection,
   timeout-after-write, and pinned readback fixtures.
2. Implement only capability-demonstrated operations, preserving discovered
   metadata and uncertainty boundaries.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/transports/acli.test.ts
5. Commit: feat(p06-t06): execute optional atlassian cli operations

### Task p06-t07: Run Jira adapter conformance

**Files:** Create
packages/cli/src/commands/pjm/remote/providers/jira.conformance.test.ts.

1. Cover ADF, safe priority, changed keys, transition discovery, MCP default,
   ACLI equivalence, revision weakness, and provider extensions.
2. Import the immutable p03 conformance harness and supply Jira fixtures
   locally; keep all shared interfaces and shared files unchanged.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/providers/jira.conformance.test.ts
5. Commit: test(p06-t07): cover jira adapter conformance

### Task p06-t08: Add Jira lifecycle integration

**Files:** Create
`packages/cli/src/commands/pjm/remote/__integration__/jira.test.ts`.

1. Exercise intake, refresh, publish, reconcile, closeout, and external-action
   continuation through fake MCP observations and optional ACLI fallback.
2. Assert ADF preservation, key history, metadata drift, unavailable transition,
   unknown create, pinned readback, and independent outcomes.
3. Format: pnpm format:fix
4. Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/__integration__/jira.test.ts`
5. Commit: test(p06-t08): integrate jira remote lifecycle

### Task p06-t09: Search Jira duplicates through MCP actions

**Files:** Modify packages/cli/src/commands/pjm/remote/providers/jira.ts,
packages/cli/src/commands/pjm/remote/providers/jira.test.ts,
packages/cli/src/commands/pjm/remote/providers/jira-actions.ts,
packages/cli/src/commands/pjm/remote/providers/jira-actions.test.ts, and
`packages/cli/src/commands/pjm/remote/__integration__/jira.test.ts`.

1. Add planDuplicateSearch() and connector action/observation cases for
   provenance, historical keys, site/project context, unavailable JQL/search,
   lag, bounded ambiguity, one stable issue-ID match, and no match.
2. Implement MCP duplicate-search planning with catalog fingerprinting and
   stable issue-ID/context verification before adoption.
3. Format: pnpm format:fix
4. Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/providers/jira.test.ts src/commands/pjm/remote/providers/jira-actions.test.ts src/commands/pjm/remote/__integration__/jira.test.ts`
5. Commit: feat(p06-t09): search jira duplicates through mcp

### Task p06-t10: Search Jira duplicates through optional ACLI

**Files:** Modify packages/cli/src/commands/pjm/remote/transports/acli.ts,
packages/cli/src/commands/pjm/remote/transports/acli.test.ts, and
`packages/cli/src/commands/pjm/remote/__integration__/jira.test.ts`.

1. Add fake ACLI cases for provenance/JQL search, unavailable semantic fields,
   changed keys, result lag, bounded ambiguity, one stable issue-ID/context
   match, and no match.
2. Implement searchDuplicates() only when capability probing demonstrates
   semantic equivalence with the adapter plan.
3. Format: pnpm format:fix
4. Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/transports/acli.test.ts src/commands/pjm/remote/__integration__/jira.test.ts`
5. Commit: feat(p06-t10): search jira duplicates through acli

## Phase 7: Cross-Provider Convergence and Recovery

### Task p07-t01: Persist immutable reviewed batches

**Files:** Create packages/cli/src/commands/pjm/remote/batch.ts and batch.test.ts.

1. Add deterministic membership/digest, approval invalidation, restart,
   independent verified/blocked/uncertain results, and no global rollback cases.
2. Implement buildReviewedBatch() and per-member outcome reduction over the
   existing store.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/batch.test.ts
5. Commit: feat(p07-t01): add reviewed remote batches

### Task p07-t02: Implement composite closeout

**Files:** Create packages/cli/src/commands/pjm/remote/closeout.ts and its test;
modify packages/cli/src/commands/pjm/remote/index.ts and index.test.ts.

1. Add purpose/policy cases for annotation then transition, deduplication,
   provider automation, per-substep authority, incompatible choice, and partial;
   add command-factory and invocation cases for remote closeout --project.
2. Implement closeoutBindings() as one binding-level composite action with
   independently journaled substeps and a reviewed batch preview, then wire it
   through injected command services and the shared envelope.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/closeout.test.ts src/commands/pjm/remote/index.test.ts
5. Commit: feat(p07-t02): add per-binding closeout

### Task p07-t03: Recover interrupted closeout substeps

**Files:** Modify packages/cli/src/commands/pjm/remote/closeout.ts and its test.

1. Inject crashes before/after annotation and transition and restart with one
   verified substep plus one pending/uncertain/rejected substep.
2. Resume only unfinished safe steps; never repeat a verified annotation or
   collapse a partial composite into all-success.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/closeout.test.ts
5. Commit: feat(p07-t03): recover composite closeout operations

### Task p07-t04: Add bounded discussion evidence reads

**Files:** Create packages/cli/src/commands/pjm/remote/discussion.ts and
packages/cli/src/commands/pjm/remote/discussion.test.ts; modify
packages/cli/src/commands/pjm/remote/index.ts and
packages/cli/src/commands/pjm/remote/index.test.ts.

1. Add pagination, page limit, sanitization, non-persistence, unavailable
   provider, and separate local-only distillation cases.
2. Implement readRemoteDiscussion() and the discussion command; never place
   comments/activity into snapshots or tracked artifacts automatically.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/discussion.test.ts src/commands/pjm/remote/index.test.ts
5. Commit: feat(p07-t04): add bounded discussion evidence

### Task p07-t05: Resolve remote anomalies by relink or detach

**Files:** Create packages/cli/src/commands/pjm/remote/resolution.ts and
packages/cli/src/commands/pjm/remote/resolution.test.ts; modify
packages/cli/src/commands/pjm/remote/index.ts and
packages/cli/src/commands/pjm/remote/index.test.ts.

1. Add stable replacement verification, duplicate rejection, history/snapshot
   retention, tombstoning, compact-link repair, crash recovery, and mandatory
   fresh approval cases.
2. Implement relinkBinding() and detachBinding() plus nested resolve commands;
   association changes occur only after durable binding transitions.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/resolution.test.ts src/commands/pjm/remote/index.test.ts
5. Commit: feat(p07-t05): add relink and detach recovery

### Task p07-t06: Resolve uncertain creates and recreate safely

**Files:** Modify packages/cli/src/commands/pjm/remote/resolution.ts,
packages/cli/src/commands/pjm/remote/resolution.test.ts,
packages/cli/src/commands/pjm/remote/index.ts, and
packages/cli/src/commands/pjm/remote/index.test.ts.

1. Add capability-aware found-existing, search-unavailable, ambiguous, and
   no-match outcomes plus approval, verified replacement, uncertain create
   freeze, restart, and recreate command-factory/invocation cases.
2. Implement recreateBinding() by consuming provider duplicate-search
   capabilities with immutable approval floor, durable create intent, identity
   history, and no blind retry.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/resolution.test.ts src/commands/pjm/remote/index.test.ts
5. Commit: feat(p07-t06): add duplicate-safe recreate recovery

### Task p07-t07: Complete remote doctor and local migration

**Files:** Modify packages/cli/src/commands/pjm/remote/doctor.ts,
doctor.test.ts, index.ts, and index.test.ts; create
packages/cli/src/commands/pjm/remote/migrate.ts and migrate.test.ts.

1. Add remaining diagnostics for stale/pending/partial/uncertain records,
   missing verification, identity/context drift, retention breaches, and
   transport availability; add idempotent check/apply migration fixtures and
   command-factory cases for remote doctor and migrate --check/--apply.
2. Implement doctor and local-only migrate --check/--apply; never infer provider
   context, identity, purpose, authority, or contact a provider.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/doctor.test.ts src/commands/pjm/remote/migrate.test.ts src/commands/pjm/remote/index.test.ts
5. Commit: feat(p07-t07): complete remote doctor and migration

### Task p07-t08: Cover representative cross-provider workflows

**Files:** Create
`packages/cli/src/commands/pjm/remote/__integration__/cross-provider.test.ts`.

1. Build GitHub-only source/planning, GitHub-source-to-Linear-planning, and
   GitHub-source-to-Jira-planning scenarios with same-provider bindings.
2. Assert no transitive mirroring, explicit publication, combined purposes,
   independent closeout, and provider-native extension retention.
3. Format: pnpm format:fix
4. Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/__integration__/cross-provider.test.ts`
5. Commit: test(p07-t08): cover cross-provider workflows

### Task p07-t09: Cover offline, security, and recovery guarantees

**Files:** Create
`packages/cli/src/commands/pjm/remote/__integration__/safety.test.ts` and
tools/smoke/pjm-remote/no-secret-output.test.mjs.

1. Exercise all transports disabled, worktree restart, interrupted operation,
   concurrent intents, secret fixtures, shared-storage refusal, and visible
   freshness/redaction/uncertainty UX.
2. Assert existing local operations pass and no credential value appears in
   files, stdout, stderr, or diagnostics.
3. Format: pnpm format:fix
4. Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/remote/__integration__/safety.test.ts && pnpm test:smoke`
5. Commit: test(p07-t09): verify remote safety guarantees

### Task p07-t10: Add end-to-end command workflows

**Files:** Create packages/cli/src/e2e/pjm-remote.test.ts; modify
packages/cli/src/commands/help-snapshots.test.ts.

1. Exercise JSON/human flows, external-action continuation, reviewed closeout,
   partial/uncertain outcomes, relink, detach, recreate, discussion, and doctor.
2. Update help snapshots and assert exit/status parity for every outcome.
3. Format: pnpm format:fix
4. Run: pnpm --filter @open-agent-toolkit/cli exec vitest run src/e2e/pjm-remote.test.ts src/commands/help-snapshots.test.ts
5. Commit: test(p07-t10): add remote pjm end-to-end workflows

## Phase 8: Documentation, Packaging, and Release Validation

### Task p08-t01: Document remote PJM configuration and safety

**Files:** Create apps/oat-docs/docs/cli-utilities/remote-project-management.md;
modify cli-utilities/index.md, cli-utilities/configuration.md, and the generated
apps/oat-docs/index.md.

1. Document lifecycle operations, repository policy, user/local transport
   order, fail-closed defaults, binding tightening, storage, previews, approval
   floors, uncertainty, and offline behavior with non-secret examples.
2. Link the guide from the CLI utilities index and configuration reference.
3. Regenerate apps/oat-docs/index.md through pnpm build:docs (or oat docs
   generate-index); do not hand-edit the generated index.
4. Format: pnpm format:fix
5. Run: pnpm check && pnpm build:docs
6. Commit: docs(p08-t01): document remote project management

### Task p08-t02: Update CLI and file-location references

**Files:** Modify apps/oat-docs/docs/reference/cli-reference.md,
file-locations.md, oat-directory-structure.md, and troubleshooting.md.

1. Add the command family, portable/operational paths, common-Git-dir behavior,
   clone refresh, shared-storage warning, and recovery guidance.
2. Verify all examples against CLI help and JSON fixtures.
3. Format: pnpm format:fix
4. Run: pnpm check && pnpm build:docs
5. Commit: docs(p08-t02): add remote pjm references

### Task p08-t03: Document and validate the host skill

**Files:** Modify apps/oat-docs/docs/workflows/skills/index.md; modify
.agents/skills/oat-pjm-remote/SKILL.md only if docs review exposes a contract
mismatch, with one final-PR frontmatter version bump if changed.

1. Document the connector action loop, CLI fallbacks, capability boundaries,
   and that the skill cannot independently declare remote success.
2. Run skill contracts and all skill-specific lint/format/version gates.
3. Format: pnpm format:fix
4. Run: node --test .agents/skills/oat-pjm-remote/tests/\*.test.mjs && pnpm oat:validate-skills && pnpm lint && pnpm format && pnpm run check:skill-bumps
5. Commit: docs(p08-t03): document remote host execution

### Task p08-t04: Run evidence-grade focused and full verification

**Files:** Always modify
.oat/projects/shared/remote-project-management/implementation.md; modify only
in-scope implementation files when a gate exposes a project defect.

1. Run focused remote suites, pnpm test:smoke, pnpm test:skills,
   pnpm test:release, and pnpm oat:validate-skills separately.
2. Run HOME=$(mktemp -d) pnpm exec turbo run test --force for live package tests.
3. Run pnpm check, pnpm type-check, and pnpm build with explicit exit capture;
   record every command, exit, and cache/live-evidence distinction in
   implementation.md. Fix only in-scope defects.
4. Format: always run pnpm format:fix, then rerun every affected focused and
   full verification command to a recorded zero exit.
5. Commit: use docs(p08-t04): record verification evidence when no repair was
   needed; otherwise use fix(p08-t04): resolve verification defects. Both
   branches include the formatted implementation evidence.

### Task p08-t05: Apply the lockstep public-package version bump

**Files:** Modify packages/cli/package.json, packages/control-plane/package.json,
packages/docs-config/package.json, packages/docs-theme/package.json,
packages/docs-transforms/package.json, and pnpm-lock.yaml.

1. Fetch origin/main, read its live versions, and select one version strictly
   greater than main for all five public packages.
2. Update all five package versions and lockfile entries together.
3. Format: pnpm format:fix
4. Run: pnpm run check:skill-bumps && pnpm release:check-versions && pnpm release:validate
5. Commit: chore(p08-t05): bump public package versions

### Task p08-t06: Run the complete CI-equivalent release gate

**Files:** Always modify
.oat/projects/shared/remote-project-management/implementation.md; modify only
in-scope implementation files when a gate exposes a project defect.

1. Fetch origin/main immediately before the version gate.
2. Run in CI order with explicit exits: pnpm check; pnpm type-check; pnpm test;
   pnpm build; pnpm run check:skill-bumps; pnpm release:check-versions;
   pnpm release:validate; pnpm build:docs.
3. Also run pnpm lint and pnpm format because canonical skills change; record
   every command, exit, and Turbo cache/live-evidence distinction in
   implementation.md. Fix only in-scope defects.
4. Format: always run pnpm format:fix, then rerun the complete step 2 and step 3
   gate sequence with explicit zero exits.
5. Commit: use docs(p08-t06): record release gate evidence when no repair was
   needed; otherwise use fix(p08-t06): resolve release gate defects. Both
   branches include the formatted implementation evidence.

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head | Invocation        | Gate Target              |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ------------- | ----------------- | ------------------------ |
| p01    | code     | pending         | -          | -                                                           | -             | -                 | -                        |
| p02    | code     | pending         | -          | -                                                           | -             | -                 | -                        |
| p03    | code     | pending         | -          | -                                                           | -             | -                 | -                        |
| p04    | code     | pending         | -          | -                                                           | -             | -                 | -                        |
| p05    | code     | pending         | -          | -                                                           | -             | -                 | -                        |
| p06    | code     | pending         | -          | -                                                           | -             | -                 | -                        |
| p07    | code     | pending         | -          | -                                                           | -             | -                 | -                        |
| p08    | code     | pending         | -          | -                                                           | -             | -                 | -                        |
| final  | code     | pending         | -          | -                                                           | -             | -                 | -                        |
| spec   | artifact | pending         | -          | -                                                           | -             | -                 | -                        |
| design | artifact | fixes_completed | 2026-08-31 | reviews/artifact-design-review-2026-08-31T010815Z.md        | -             | manual-1          | cursor                   |
| design | artifact | fixes_completed | 2026-08-31 | reviews/artifact-design-review-2026-08-31T012755Z.md        | -             | manual-2          | cursor                   |
| plan   | artifact | passed          | 2026-08-31 | -                                                           | -             | structured-auto-3 | codex:sol-high           |
| plan   | artifact | fixes_completed | 2026-08-31 | reviews/archived/artifact-plan-review-2026-08-31T021338Z.md | -             | gate              | cursor-gpt-5-6-sol-xhigh |
| plan   | artifact | passed          | 2026-08-31 | reviews/archived/artifact-plan-review-2026-08-31T022727Z.md | -             | gate              | cursor-gpt-5-6-sol-xhigh |
| plan   | artifact | passed          | 2026-08-31 | reviews/archived/artifact-plan-review-2026-08-31T025155Z.md | -             | -                 | -                        |

**Status values:** pending -> received -> fixes_added -> fixes_completed ->
passed.

## Implementation Complete

This is the planned execution rollup; all implementation phases remain pending.

- Phase 1: 10 tasks - domain, configuration, persistence, compatibility, doctor
- Phase 2: 9 tasks - policy, projection, reconciliation, authority, verification
- Phase 3: 12 tasks - provider/transport contracts, lifecycle, commands, skill
- Phase 4: 11 tasks - GitHub adapter, gh, publication safety, search, discussion
- Phase 5: 9 tasks - Linear MCP actions, duplicate search, optional linear-cli
- Phase 6: 10 tasks - Jira MCP actions, ADF, duplicate search, optional ACLI
- Phase 7: 10 tasks - batches, closeout, recovery, doctor, E2E, security
- Phase 8: 6 tasks - docs, skill references, versions, CI/release gates

**Total: 77 tasks**

## References

- Design: design.md
- Specification: spec.md
- Discovery: discovery.md
- Linear handoff: reference/linear-integration-discovery-handover.md
- GitHub dossier: reference/github-issues-provider-dossier-gpt-5-6-luna.md
- Linear dossier: reference/linear-provider-dossier-gpt-5-6-luna.md
- Jira dossier: reference/jira-provider-dossier-gpt-5-6-luna.md
