---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-09
oat_generated: false
oat_template: false
---

# Lightweight Design: Recon rework

> Draft authored at the user's request. The manual plan artifact review completed
> on 2026-09-09 and its artifact-alignment corrections were applied here; design
> self-review and configured gates remain pending. Product intent is confirmed in
> discovery, while the concrete interfaces remain engineering proposals for the
> receiving agent to review.

## Overview

Recon is an inexpensive evidence-acquisition workflow for an intelligent caller.
Workers inventory, extract, cite, reopen evidence, seek counterexamples, and
assemble compact dossiers. Mechanical compilation groups/deduplicates findings
and retains contradictory claims with their sources. The caller evaluates
sufficiency and implications; a worker only receives deeper reconciliation when
that bounded assignment actually requires judgment.

Replace the run-wide maximum with independent per-wave exact selection under
one approval envelope. Existing provider guidance supplies qualification and
economy routes; existing dispatch skills supply live catalogs and launch
mechanics. Every required, redundant, and conditional wave is proposed before
approval. A stronger conditional wave never upgrades the inexpensive waves.

Use a versioned manifest extension, shared pure routing helpers, and the current
single validated graph. Keep ledger/review/source semantics and publication
safeguards. This is not a new launcher, price service, or receipt framework.

## Architecture

### System context and ownership

| Component              | Owns                                                                                       | Does not claim                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Calling agent          | Scope, decomposition, qualification judgment, user dialogue, final evidence assessment     | That validated citations guarantee correct conclusions            |
| Recon controller skill | Profile, economical defaults, per-wave proposal, bounded conditions, evidence pipeline     | A duplicate provider catalog or implementation of native dispatch |
| Subagent orchestration | Task-class definitions, provider-specific qualification/effort/economy guidance            | That a phase label dictates capability                            |
| Dispatch skill         | Available exact targets, invocation construction, acceptance/recovery                      | Packet proof of actual launch without a producer                  |
| Routing helpers        | Version normalization, exact target resolution, approval preview, structural constraints   | A model-string-to-capability oracle                               |
| Packet validator       | Approval integrity, approved lanes, conditional dispositions, existing evidence invariants | Billing, runtime identity, or final recommendation correctness    |

### Data flow

1. Root bounds the objective, source scope, destination, and required profile.
2. Root decomposes all ten possible modes into specific assignments.
3. Root starts with economical defaults; it documents any higher class or target.
4. Resolve the active harness's shared guidance and dispatch selection separately
   for each wave. Preserve provider-native selector/control values.
5. A pure proposal helper validates routing structure and renders the complete
   per-wave table and worst-case lane/concurrency/deadline/retry limits.
6. User approves the envelope's exact fingerprint or revises the proposal.
   Revisions before approval are cheap; declining launches nothing.
7. Before each launch, compare the constructed target to that wave's approved
   effective target. Dispatch through the existing dependency.
8. Root evaluates predeclared conditions against prior outcomes; conditional
   waves can run once inside approved scope/caps. Record condition disposition.
9. Compile evidence through the existing immutable `ValidatedRun` boundary,
   derive achieved profile/assurance, and render atomically.
10. Return compact evidence, disagreement, gaps, and intended routing to the caller.
    The caller judges whether the packet supports its downstream decision.

## Component Design

### 1. Assignment classification and economical defaults

Add a small provider-neutral default-mode policy in
`.agents/skills/recon/scripts/lib/routing.mjs`. The skill and proposal renderer
consume it; tests cover the mode set exhaustively so a new mode cannot inherit
an accidental expensive default.

| Mode                     | Bounded default assignment                                    | Default class    |
| ------------------------ | ------------------------------------------------------------- | ---------------- |
| map                      | Enumerate sources/files/routes from explicit criteria         | mechanical-recon |
| gather                   | Extract requested observations and exact citations            | mechanical-recon |
| redundant-gather         | Independently repeat bounded extraction                       | mechanical-recon |
| compile                  | Deduplicate/group dossiers; retain conflicting evidence       | mechanical-recon |
| semantic-verification    | Reopen named claims and check specific source support         | mechanical-recon |
| redundant-verification   | Independently repeat those bounded checks                     | mechanical-recon |
| adversarial              | Search for counterexamples to a specified claim               | mechanical-recon |
| coverage                 | Compare evidence to an explicit question/source inventory     | mechanical-recon |
| reconciliation           | Assemble agreement/disagreement without deciding implications | mechanical-recon |
| contradiction-resolution | Seek discriminating evidence for a named contradiction        | mechanical-recon |

These are **assignment defaults, not proof that all work bearing those names is
mechanical**. Open-ended semantic interpretation or deciding between competing
explanations can require intelligent recon. Security verdicts, foundational
decisions, and final consequential review stay with an appropriately capable
caller. The caller must narrow, escalate, or return an explicit gap when cheap
workers cannot adequately perform the actual assignment.

Every wave records a substantive `selectionReason`: bounded assignment,
qualification source, and why its model/effort is economical and adequate. A
higher task class needs a reason describing the required judgment. Provider
guidance remains authoritative for genuinely required floors. Do not claim
deterministic completeness of counterexample searches.

Narrowly clarify `subagent-orchestration/SKILL.md` and
`references/model-selection-principles.md`: "adversarial analysis" means the
judgment-bearing task, not every bounded counterexample search; "reconciling
dispersed context" does not automatically turn dossier assembly into
implementation. Add recon-specific examples without weakening final-review
requirements or changing unrelated workflow ceilings.

### 2. Per-wave selection and approval presentation

Reuse the same-scope dependency resolution already in recon. Read only the
active harness's provider selection and dispatch mechanics references. Resolve
each wave using the live catalog; do not infer Claude controls from Codex effort
or parse Cursor's opaque selector strings.

Proposed new script: `scripts/prepare-routing.mjs`. It accepts a draft manifest,
checks only proposal shape through routing helpers, and prints Markdown or JSON:
wave ID/mode, concise assignment, class/floor, lane count, exact effective target,
selection reason, conditional rule, and aggregate worst-case limits. It emits the
canonical approval fingerprint input/digest but **does not record approval,
spawn, or make the packet publishable**. The controller owns the actual user
approval and writes the existing approval evidence.

A pure comparator checks the selected/constructed target against the approved
wave target immediately before dispatch. Expose it through the same script's
check mode so prose does not invent a second comparison implementation. This
checks intended invocation axes, not the native arguments' undocumented meaning
or actual runtime identity. Native invocation construction stays dependency-owned.

### 3. Version boundary and legacy behavior

Version artifacts by `kind`, not by globally replacing `SCHEMA_VERSION = 1`.

- New `recon.packet-manifest` writers emit schemaVersion 2.
- Valid manifest v1 remains accepted with its original closed fields and
  fingerprint projection. Its one target is inherited by all normalized waves.
- Claim ledger, raw dossier, review brief, and review result remain v1 because
  their wire shape does not need to change. Explicitly document/test the supported
  combination: manifest v2 referencing those v1 evidence artifacts.
- Unknown kind/version combinations and v2-only keys inside a v1 manifest fail
  closed. Do not rewrite a legacy packet or recompute its approval to "upgrade" it.
- Review-brief and reconciliation producers keep their v1 output contract.
  Audit their consumers; a manifest-version change must not accidentally force
  evidence-version changes.
- Validate original shape and original approval fingerprint first; normalize
  into an immutable internal effective routing view afterward. Retain original
  bytes/digests for publication revalidation.

This is a draft compatibility choice requiring review, not a completed migration.

### 4. Conditional escalation with fixed identities

Prefer **predeclared conditional waves with exact targets** over mutating the
target of a wave after approval. A cheap completed gather can expose insufficient
evidence that triggers a separately approved, stronger reconciliation wave.
Every such wave already has unique lane IDs, scopes, output paths, and limits.

A condition references earlier waves and one approved destination wave.
Conditions form a forward-only acyclic graph. Each destination activates at most
once; multiple allowed escalation steps must be separate predeclared waves.
Profile hard caps include every possible conditional lane, not just likely work.

Three initial predicates are proposed:

- `insufficient-evidence`: completed source evidence exposes a specific gap;
- `unresolved-material-challenge`: a completed challenge result identifies a
  material unresolved claim;
- `reconciliation-needs-judgment`: the root cites completed evidence that cannot
  be assembled adequately without interpretation.

Predicate qualification includes caller judgment. The validator can check
approved identities, existing evidence/digests, typed dispositions, and caps;
it cannot prove that an LLM really needed a stronger model.

An accepted failed/cancelled/timed-out lane stays failed and material. It cannot
trigger a disguised replacement through these predicates. Preconditions for a
conditional follow-up require completed source evidence; provider rejection,
missing output, elapsed wall time, and accepted terminal failure are not
escalation triggers. Outside-envelope work requires renewed user direction and
must preserve the earlier run/failed evidence; no automatic new run or retry.

### 5. Conditional outcomes and unchanged assurance

A finalized v2 manifest records an explicit disposition for each conditional
wave: triggered, not-triggered, or unresolved. Triggered waves must have their
approved artifacts or material failure/omission gaps. Non-triggered waves supply
no artifacts and do not count as completed passes. Unresolved conditions cannot
be used to suppress a material missing pass.

Root-authored dispositions describe control decisions, not launch receipts.
References reuse normal artifact digests and approved identities. Validate those
references inside packet/source trust roots. Required profile passes remain
required regardless of any conditional annotation. Preserve typed review
independence, prior-ledger identity, transition rules, and reconciliation.

Quick's supported ceiling remains unchanged. Standard/thorough may reach existing
derived verified assurance only when their actual evidence satisfies existing
rules. This is evidence assurance, not an autonomous final decision. Lower worker
prices never relax those validators.

### 6. Distribution and decisions

Supersede `DR-260831-approval-bound-homogeneous` through the normal decision
workflow after planning review. Amend both the singular-selection Decision
paragraph and the "remains in force" sentence in
`DR-260904-remove-dispatch-receipt-chain`. Preserve the receipt-removal decision
and `DR-260719-separate-recon-authority-from`; also cite
`DR-260719-keep-final-judgment`.

Canonical source changes cover recon scripts/references/tests, narrowly scoped
shared guidance, the canonical recon worker if its assignment description changes,
and public docs. Existing generic dispatch already separates unlike waves;
no launcher or dispatch-engine rewrite is planned. Bundle via the build script,
never by editing `packages/cli/assets` or provider projections manually.

Bump changed canonical skill `metadata.version` once per PR, roles under their
current role-version convention, and all five public packages in lockstep for
shipped assets. Resolve exact release numbers against main at implementation
time; no speculative version bumps during planning.

## Data Models

The following is the proposed v2 delta; existing source/artifact/gap fields remain.

```typescript
type TaskClass =
  | 'mechanical-recon'
  | 'intelligent-recon'
  | 'default-implementation'
  | 'hard-reasoning'
  | 'consequential';

interface ExactTarget {
  provider: string;
  route: string;
  role: string;
  model: string;
  effort: string | null;
  reasoningMode: string | null;
  serviceTier: string | null;
}

interface WaveV2 {
  waveId: string;
  mode: WaveMode; // the existing ten-mode union
  taskClass: TaskClass;
  classFloor: TaskClass;
  selectionReason: string;
  target?: ExactTarget; // whole-target override; absent inherits execution.target
  lanes: Array<{ laneId: string; scope: string; writeRoot: string }>;
  conditional: boolean;
}

interface ConditionV2 {
  conditionId: string;
  destinationWaveId: string;
  afterWaveIds: string[];
  predicate:
    | 'insufficient-evidence'
    | 'unresolved-material-challenge'
    | 'reconciliation-needs-judgment';
  maxActivations: 1;
}

interface ExecutionV2 {
  target: ExactTarget; // inexpensive inherited default
  authority: 'provider-enforced' | 'contract-enforced';
  maxConcurrency: number;
  deadlineSeconds: number;
  retryLimit: number;
  waves: WaveV2[];
  conditions: ConditionV2[];
  approval: {
    type: 'explicit-user-approval';
    approvedAt: string;
    fingerprint: string;
  };
}

interface ConditionOutcomeV2 {
  conditionId: string;
  disposition: 'triggered' | 'not-triggered' | 'unresolved';
  reason: string;
  evidence: Array<{ path: string; digest: string }>;
}
```

The manifest adds `conditionOutcomes` outside immutable `execution`, analogous
to other observed outcomes outside approval. Each conditional wave requires
exactly one condition; nonconditional destinations are invalid. Field/key sets
remain closed. Full target replacement avoids partial-axis merging errors.
Version 1 flat target fields are legacy-only and normalized internally.

Nullable effort means the adapter genuinely exposes no independent requested
effort control. It must not mean unknown or silently dropped effort. Existing
v1 non-empty effort strings are preserved as originally approved. A requested
non-null axis that a live harness cannot bind blocks that target before launch.
Cross-harness examples are resolved on their respective harnesses; this project
does not add remote multi-harness execution.

`classFloor` records required capability, not a new global model rank.
Deterministic checks validate its enum and consistency with the task class.
They also validate exact approved-versus-constructed target identity before
dispatch. Together, those checks are this project's concrete interpretation of
"below-floor routing" validation: the manifest must carry a valid, internally
consistent floor and the constructed target must match the independently
qualified target that the user approved. Model qualification still comes from
the active provider guidance/catalog and root selection. Do not add a misleading
`BELOW_CLASS_FLOOR` model-name heuristic or infer capability from a model string.

## API Design

Proposed script commands, implemented and documented in phase 2:

```bash
node .agents/skills/recon/scripts/prepare-routing.mjs --manifest draft-manifest.json --format markdown
node .agents/skills/recon/scripts/prepare-routing.mjs --manifest draft-manifest.json --format json
node .agents/skills/recon/scripts/prepare-routing.mjs --manifest manifest.json --wave gather-1 --check-target candidate-target.json
```

Preview accepts a structurally valid proposal before `approval` exists.
Check-target requires approved execution with a valid fingerprint and a known wave.
These modes never invoke a provider or write approval. The check compares exact
nullable axes without normalizing opaque selector strings.

Existing `validate-artifact.mjs`, `validate-packet.mjs`, and
`render-packet.mjs` entrypoints remain. Their output must distinguish invalid
schema, approval drift, conditional evidence failures, and source/evidence errors.
Do not expose an option that bypasses full validation during packet publication.

## Error Handling

Preserve existing categories and codes where applicable. Proposed additions
identify invalid target shape, missing selection rationale, invalid/recursive
condition topology, unapproved condition references, missing conditional
disposition, and constructed-target mismatch. Keep
`APPROVAL_FINGERPRINT_MISMATCH`, unsupported schema, unapproved lane, and
`PASS_FAILED`/`PASS_OMITTED` semantics.

Declined approval launches nothing. An unavailable exact route blocks before
launch. Changes to any approved axis need renewed approval. A provider-emitted
terminal failure is preserved and cannot become successful escalation. An
invalid packet remains unpublished; stale output withdrawal still applies.

## Testing Strategy

Use focused Node tests and existing packet fixture helpers, with immutable v1
control fixtures retained. Test pure helpers through their CLI consumers as well
as directly. Synthetic fixture selectors test preservation and control flow;
they are not evidence of live provider qualification.

Key scenarios:

- All ten modes receive bounded economical defaults; higher-class selection
  requires a substantive reason and never modifies another wave.
- A v2 standard run uses cheap map/gather/check/challenge targets plus one
  stronger conditional reconciliation. Test the condition both firing and not.
- Change model, effort, reasoning mode, service tier, class, scope, condition,
  concurrency, deadline, retry limit, or lane membership after approval; reject.
- Preserve valid v1 approval bytes/fingerprint/rendering; reject v2 keys under v1
  and unknown versions; explicitly accept v2 manifest with v1 evidence.
- Reject activated work with missing output/no gap, non-triggered work with
  artifacts, cyclic/unknown/duplicate condition references, and cap overflow.
- An accepted failed lane cannot be replaced through escalation; conditional
  omission cannot satisfy a required profile pass.
- Claude-shaped absent effort, Codex separate effort, and Cursor opaque selectors
  survive preview, approval, target check, and validated rendering unchanged.
- Secret, symlink, digest, source freshness, independent review, reconciliation,
  and atomic-rendering controls remain intact.

For new approval/conditional guards, preserve reproduction-grade bad-state and
valid-control probes. When a v2 state cannot exist on the old schema, test the
semantic legacy vulnerability with a valid v1 conditional fixture, and separately
prove the new v2 guard fails when neutralized; do not describe old-schema rejection
as proof of the new invariant. Evidence-producing live runs are separate,
user-approved acceptance work, not a dependency of draft planning.

## References

- Product decisions and scope: [discovery.md](discovery.md).
- Concrete sequence and verification: [plan.md](plan.md).
- Current source map and historical input precedence: [references/source-context.md](references/source-context.md).
- Receiving-agent instructions: [handoff.md](handoff.md).
