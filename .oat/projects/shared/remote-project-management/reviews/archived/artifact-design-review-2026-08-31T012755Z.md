---
oat_generated: true
oat_generated_at: 2026-08-31T01:27:55Z
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/remote-project-management
oat_gate_headless: true
oat_gate_run_id: 66ce880f-fc6a-4bfb-80c5-41154f466ec5
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: design

**Reviewed:** 2026-08-31T01:27:55Z
**Scope:** Complete revised specification and technical design after first-gate findings
**Files reviewed:** 2
**Commits:** N/A (artifact review)

## Summary

The revised specification and design now substantively cover every concern from
the first gate: multi-purpose composition, lifecycle resolution, durable
outcomes and batches, storage/privacy, configuration surfaces, pinned
verification, discussion evidence, exit semantics, ADF preservation, and
concurrent-intent recovery. Two integration contracts remain incomplete:
operation-specific authority precedence is still ambiguous across layered
defaults and overrides, and a composite closeout cannot durably represent
per-substep authority and outcomes. No Critical findings remain, but the two
Important findings are blocking; the design is not yet approved for planning.

Findings: 0 critical, 2 important, 2 medium, 0 minor

## Review Execution

Gate route: `inline` (runtime=`cursor`, CLI root=`/Users/thomas.stang/Code/vox/open-agent-toolkit`)

Dispatch: scope=design action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high

The project-policy dispatch stamp above is derived from the repository
resolver. The immutable gate invocation is recorded separately and verbatim in
frontmatter.

## Findings

### Critical

None

### Important

- **Operation-specific authority precedence remains ambiguous** (`.oat/projects/shared/remote-project-management/design.md:439`)
  - Issue: The schemas allow `default` and `operations` authority values at
    repository, provider, and binding layers, but the precedence prose does not
    define how those six possible inputs resolve for one mutation class. In
    particular, it does not say whether a repository operation override or a
    provider default wins, or how binding-level default and operation
    restrictions compose. Implementations can therefore produce different—and
    potentially broader—effective authority from the same valid
    configuration, despite `EffectiveRemotePolicy` promising a concrete value
    per mutation class.
  - Fix: Define a per-operation resolution algorithm or truth table covering
    missing and present defaults/overrides at every layer, source attribution,
    tightening clamps, and the final immutable approval floor. Add ambiguous
    cross-layer combinations to the authority precedence test matrix.
  - Requirement: FR8, NFR2

- **Composite closeout substeps lack durable per-operation authority and outcome state** (`.oat/projects/shared/remote-project-management/design.md:293`)
  - Issue: Closeout may combine an annotation and a transition, order them, and
    become partial when only one verifies. Those substeps can have different
    operation-class authority modes, but `RemoteOperationRecord` has only one
    `mutationClass`, one `AuthorityDecision`, and one approval, with no
    durable substep model. The design therefore cannot reconstruct which
    authority governed each effect or which substep may safely continue after
    interruption.
  - Fix: Model closeout substeps explicitly—either as digest-bound child
    operations or durable substep records—with their own mutation class,
    authority decision, approval requirement, attempt state, verification, and
    retry disposition. Define parent/composite state reduction and test mixed
    annotation/transition authority plus crash recovery between substeps.
  - Requirement: FR3, FR8, FR15, NFR3

### Medium

- **The resolved storage decision still describes the superseded tracked layout** (`.oat/projects/shared/remote-project-management/design.md:44`)
  - Issue: The summary table says strict binding and operation records live
    under `.oat/repo/pjm/remote/`, while the detailed design correctly splits
    portable metadata from machine-local operational state and permits tracked
    operational state only after explicit opt-in. The prominent summary can
    steer planning back toward the privacy-unsafe layout rejected by the first
    review.
  - Fix: Update the resolved decision to state the portable/local split and
    explicit shared-storage opt-in, matching the persistence and security
    sections.
  - Requirement: FR12, NFR1

- **The rejected durable outcome has no command-envelope or exit mapping** (`.oat/projects/shared/remote-project-management/design.md:1081`)
  - Issue: `rejected` is a terminal `OperationState` and `ProviderOutcome`, but
    `RemoteCommandEnvelope.status` and the exit-semantics table omit it.
    Implementers must either misclassify a provider-declared non-commit as a
    system failure or invent an undocumented mapping.
  - Fix: Add a `rejected` envelope status and explicit exit meaning, or specify
    an exact lossless mapping to an existing status. Extend command-wiring and
    human/JSON parity tests for the durable rejected state.
  - Requirement: NFR3, NFR6

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `spec.md`, `design.md`, `state.md`,
the scaffolded `plan.md` and `implementation.md`, the first gate review, and
the artifact revision diff that resolved its findings.

### Requirements Coverage

| Requirement | Status  | Notes                                                                                                   |
| ----------- | ------- | ------------------------------------------------------------------------------------------------------- |
| FR1         | covered | Three providers, coexistence, stable bindings, and provider extensions are designed.                    |
| FR2         | covered | Offline local work and durable pending intent are represented without false success.                    |
| FR3         | partial | Purpose intersection is explicit; composite closeout persistence remains incomplete.                    |
| FR4         | covered | Intake, publish, refresh, reconcile, and closeout remain explicit and non-transitive.                   |
| FR5         | covered | Identity, snapshots, baselines, operations, receipts, capabilities, and outcomes are durable.           |
| FR6         | covered | Shared fields remain title, governed description, and capability-gated priority.                        |
| FR7         | covered | Description modes, managed content, binding tightening, and replacement floors are defined.             |
| FR8         | partial | Modes and hard floors exist, but cross-layer per-operation precedence is ambiguous.                     |
| FR9         | covered | Three-way classifications, conflicts, previews, and baseline advancement are defined.                   |
| FR10        | covered | Durable batches bind immutable membership and preserve independent member outcomes.                     |
| FR11        | covered | Fresh reads, pinned one-attempt mutation, read-back, and uncertainty handling are explicit.             |
| FR12        | covered | Non-secret snapshots, local-first storage, redaction, and shared-storage opt-in are designed.           |
| FR13        | covered | Relink, detach, and recreate preserve evidence and require explicit resolution.                         |
| FR14        | covered | Create intent, provenance search, duplicate recovery, and blind-retry prevention are defined.           |
| FR15        | partial | Binding-level closeout behavior is clear, but heterogeneous substep state is not durable.               |
| FR16        | covered | Ordered transport selection and pre-attempt-only fallback are defined.                                  |
| FR17        | covered | GitHub-to-Linear, GitHub-to-Jira, and GitHub-only workflows remain planned.                             |
| FR18        | covered | Project artifacts stay local and discussion evidence is bounded, read-only, and non-persisted.          |
| NFR1        | covered | Operational data is local by default, shared storage is gated, and credentials are redacted.            |
| NFR2        | partial | Safety is fail-closed except for the unresolved layered authority precedence contract.                  |
| NFR3        | partial | Restart records and batch recovery are strong; closeout substeps and rejected output mapping need work. |
| NFR4        | covered | Offline snapshots, freshness, and pending-state visibility are designed.                                |
| NFR5        | covered | Provider extensions, discovered semantics, and structural ADF preservation are explicit.                |
| NFR6        | partial | Preview and per-binding result UX are designed; rejected exit semantics are missing.                    |
| NFR7        | covered | Legacy associations, migration, lazy adoption, and local-PJM regression coverage are retained.          |
| NFR8        | covered | Provider semantics remain separate from replaceable capability-negotiated transports.                   |

### Extra Work (not in declared requirements)

None

## Verification Commands

After revising the artifacts:

```bash
pnpm exec oxfmt --check ".oat/projects/shared/remote-project-management/spec.md" ".oat/projects/shared/remote-project-management/design.md"
pnpm check
```

Then rerun the gate-originated `artifact design` review and require zero
Critical and Important findings before planning.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into design-fix
tasks.
