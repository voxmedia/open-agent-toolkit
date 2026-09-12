---
title: Recon Evidence Packets
description: 'Use recon to gather and validate bounded evidence through approved worker waves, then hand off one durable packet directory.'
---

# Recon Evidence Packets

`recon` turns a bounded investigation into a durable evidence-packet directory.
It gathers source-grounded findings through approved worker waves, validates
their locators and assurance state, and gives the next consumer one compact
entry point instead of every worker transcript.

Recon controls the profile, routing proposal, and evidence flow. Shared
orchestration guidance classifies the concrete assignments, the dispatch skill
resolves and launches exact targets supported by the active harness, and the
calling agent owns scope, approval dialogue, sufficiency judgment, and final
conclusions.

The first release is standalone. It does not automatically run from project
discovery, quick start, `analyze`, or `deep-research`. Those workflows can
consume an explicitly supplied packet path without changing their own
invocation behavior.

## Choose the Right Research Skill

| Need                                                               | Use             |
| ------------------------------------------------------------------ | --------------- |
| Acquire and validate bounded evidence for another workflow         | `recon`         |
| Interpret a concrete artifact, codebase, document, system, or idea | `analyze`       |
| Research a broader external topic and produce a narrative artifact | `deep-research` |

Use `recon` when the evidence, exact source locators, contradictions, and gaps
are the deliverable. It does not make the final product, architecture,
security, or release decision, and it does not modify the investigated system.

## Install or Update the Research Pack

Install at user scope when you want `recon` available across repositories:

```bash
oat tools install research --scope user
oat tools update --pack research --scope user
```

Install at project scope when the repository should own the capability:

```bash
oat tools install research --scope project
oat tools update --pack research --scope project
```

The research pack acquires its two dispatch dependencies from the utility pack
at the same scope. You do not need to select a named model during installation.
At run time, OAT resolves each wave independently against its task class and
floor, then asks you to approve every wave's exact supported provider-native
axes, role, topology, rationale, conditions, authority, and finite execution
limits before any worker launches. Active provider guidance and the live
catalog own current qualification; recon does not maintain a second model list.

## Run a Recon

Provide a bounded question or target, then optionally choose a profile, scope,
context source, output directory, or strict authority:

```text
/recon "How is provider sync materialized?" --profile standard --scope packages/cli/src/providers
```

The default profile is `standard`. Each homogeneous wave has an independently
selected and approved exact target. Bounded mapping, extraction, citation
reopening, counterexample search, and mechanical dossier compilation start with
economical qualified routes. A wave that genuinely requires interpretation or
reconciliation judgment can use a stronger approved target without raising the
cost of unrelated evidence waves.

| Profile    | Use it for                                  | Required assurance work                                                                                            | Claim ceiling |
| ---------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------- |
| `quick`    | Bounded orientation                         | Mapping, gathering, compilation, schema validation, and locator validation; no independent semantic pass by design | `supported`   |
| `standard` | Load-bearing evidence                       | Quick work plus blind semantic verification, adversarial review, coverage, and reconcile                           | `verified`    |
| `thorough` | Expensive failure or correlated blind spots | Standard work plus required redundant gathering and redundant verification                                         | `verified`    |

A thorough run may additionally predeclare an optional, condition-bound
`contradiction-resolution` evidence wave. It runs only when its approved
predicate triggers and is not required when that branch is not triggered.

The approval manifest shows each wave's exact target, task class, class floor,
selection rationale, adaptive lane count, conditional rule, concurrency,
deadlines, retries, and source/write authority. An unsupported provider-native
control is shown explicitly as unavailable or null; recon never translates an
effort label across harnesses or infers capability from an opaque selector.
Declining approval launches nothing. Any target, topology, condition, or limit
change requires renewed approval; there is no silent substitution after
approval.

Before any worker launches, recon confirms that the live launch surface can run
the approved role, model, effort, and authority level. If it cannot, the run
stays at `awaiting-approval` with a provider/dispatch diagnostic and nothing is
launched. Deadlines are approved execution limits chosen for the task class,
not short watchdogs; an accepted lane is never interrupted by hand because a
displayed deadline elapsed.

### Preview and Check Routing

The installed proposal helper renders the complete envelope in Markdown or
JSON without recording approval or launching work. From a project-scoped
installation:

```bash
node .agents/skills/recon/scripts/prepare-routing.mjs --manifest draft-manifest.json --format markdown
node .agents/skills/recon/scripts/prepare-routing.mjs --manifest draft-manifest.json --format json
```

Immediately before a launch, the controller uses the same production logic to
compare the constructed target with that wave's approved exact target:

```bash
node .agents/skills/recon/scripts/prepare-routing.mjs --manifest manifest.json --wave gather-1 --check-target candidate-target.json
```

These commands validate structure, approval integrity, and exact identity. They
do not launch a worker, rank model names, attest actual runtime identity, or
measure cost.

### Bounded Conditional Evidence

Standard and thorough may predeclare finite conditional
`contradiction-resolution` evidence waves. A completed predecessor can trigger
one such wave to seek discriminating evidence; accepted failure, cancellation,
timeout, or missing output cannot trigger a replacement. Triggered,
not-triggered, and unresolved dispositions remain visible. Both branches feed
the same single mandatory terminal reconciliation.

A triggered condition must cite complete, digest-bound evidence from an approved
predecessor in the same run. Evidence copied from another run cannot activate
the destination wave and fails packet validation with
`CONDITION_EVIDENCE_RUN_MISMATCH`.

If a need for stronger reconciliation judgment is foreseeable, select that one
terminal target before approval. If it appears only after approval, recon
preserves completed evidence and returns an unresolved, out-of-envelope gap for
renewed approval or a new run. It never mutates the target, silently retries,
or launches a second reconciliation.

## Destination Precedence

`recon` always creates a new topic-and-run directory. It never overwrites an
existing run. The packet parent is selected in this order:

1. an explicit `--output` override;
2. the active project's `references/evidence/` directory when a caller supplies
   that project context;
3. the repository's `.oat/repo/reference/evidence/` directory;
4. a fallback destination that the caller approves.

An OAT project is optional. Standalone recon remains available when no project
or repository evidence directory exists.

## Packet Layout and Consumption

Every structurally publishable run uses this top-level layout; a
non-publishable candidate generation withdraws any existing `packet.md`:

```text
<topic>-<run-id>/
├── packet.md
├── manifest.json
├── claims.json
├── reviews/
└── raw/
```

- `packet.md` is the compact consumer view and is published last.
- `claims.json` is the canonical claim ledger.
- `manifest.json` records request, source, approved execution envelope, and
  gap provenance.
- `reviews/` contains compact semantic, adversarial, coverage, and
  reconciliation evidence.
- `raw/` contains worker dossiers, candidate artifacts, and safe failure
  diagnostics. It is not normal consumer input.

The `recon.packet-manifest` contract accepts version 2 only. Evidence artifact
kinds remain independently versioned at version 1. Approval is session-local
and records only `{ type, approvedAt }`: resuming, reloading, or changing the
proposal requires a fresh preview and explicit approval before launch.

Every valid packet renders a compact Intended Routing section from the already
validated normalized view. It labels exact targets and condition dispositions
as approved intent, not proof of the native process that ran, launcher receipts,
token or billing totals, or universal correctness. A valid packet continues to
reference version 1 evidence artifacts. Evidence, claims, contradictions, and
gaps remain the packet's main consumer context.

Every dossier and review result identifies the approved wave and lane that wrote
it. Primary and redundant gather artifacts therefore satisfy only their owning
waves; lanes from one gather wave cannot impersonate the other pass. In a
thorough run, redundant gathering finishes before compilation, and the compiled
ledger must reference every completed primary and redundant gather dossier by
exact path and digest before review briefs are created. Missing provenance fails
with `MISSING_THOROUGH_GATHER_LEDGER_INPUT`.

The ledger compiler and packet validator enforce categorical referential
integrity on `synthesis.keyClaimIds` and `synthesis.unresolvedQuestionIds`. Any
reference to an unknown claim or question ID fails validation with
`SYNTHESIS_REFERENCE_MISSING`.

The normal handoff is the packet directory path plus a compact status summary.
Open `packet.md` first and follow machine-readable or review links only when you
need an audit trail. Do not copy `raw/` dossiers or worker reasoning into the
next model's context by default.

## Claim States

Claims use categorical evidence states rather than generated confidence
percentages:

- `provisional`: compiled but not mechanically validated;
- `supported`: cited evidence and locators validate, without completed
  independent semantic verification;
- `verified`: required independent review reopened and affirmed the sources,
  with no unresolved material challenge;
- `contested`: credible counterevidence or incompatible interpretations remain;
- `unresolved`: available evidence cannot settle the claim; and
- `unsupported`: valid supporting evidence is absent or verification failed.

A quick packet is an evidence packet for an intelligent consumer and has no
independent semantic pass by design. It never promotes a claim to `verified`;
the caller assesses sufficiency and conclusions. Stronger profiles can promote
claims only when their required independent review artifacts validate and were
written by approved lanes.

When an independent semantic review rejects a proposed claim, the reconciler
transitions it to `unsupported` rather than deleting it. This preserves the
claim statement, cited evidence, and transition history in `claims.json`, and
renders the finding under Contradictions and Qualifications.

An adversarial challenge transitions a claim to `contested`. A run with
contested claims may publish as `complete` when all declared questions and
claims are resolved or characterized; contested claims are rendered under
Contradictions and Qualifications. If an unresolved challenge represents an
unanswered question or missing source evidence that leaves investigation
incomplete, it is recorded as a material gap in `manifest.gaps` and the run
publishes as `partial`.

## Selective Blindness and Authority

Gatherers write separate dossiers. Verifiers receive only claim statements,
display excerpts, typed locators, and the source descriptors required to reopen
them. Adversarial reviewers receive the declared scope, questions, and
provisional statements. Neither pass receives gatherer reasoning, synthesis
prose, dossier paths, or earlier review conclusions.

Each lane receives one explicit authority envelope and one unique output path.
Its enforcement is recorded as:

- `provider-enforced`: the host or tool technically restricts reads and writes;
- `contract-enforced`: an audited leaf-worker contract restricts local reads
  and the sole packet write path; or
- `unavailable`: a safe read-only boundary cannot be established.

By default, local repository and file work may use contract enforcement. Pass
`--strict` to require provider enforcement for every lane. Mutation-capable
source tools are unavailable unless their interface enforces a read-only
operation.

## Partial and Failed Runs

A structurally valid run can publish an honest `partial` packet. The manifest
and `packet.md` then identify the requested and achieved profiles, failed or
omitted passes, material gaps, affected claims, and required assurance
downgrades. A run may be partial even when it achieved the requested profile if
a material evidence gap remains. The achieved profile is derived from the
complete typed artifacts in the packet; each required pass without a complete
result needs a material `PASS_FAILED` or `PASS_OMITTED` gap. Each approved lane
must likewise have a complete artifact or a material outcome gap carrying its
exact `waveId` and `laneId`; legacy mode-only gaps remain valid only when the mode
unambiguously identifies one single-lane wave.

A complete artifact and material failure or omission for the same exact wave and
lane are contradictory, so validation fails closed with
`CONTRADICTORY_PASS_OUTCOME`. Complete evidence from one lane and exact failure
evidence from a different lane are not contradictory: the completed lane can
preserve the achieved pass while the failed lane makes the published run an
honest `partial` packet at that achieved profile.

Status updates and the final handoff label each failure as `worker`,
`provider/dispatch`, `contract validation`, or `source availability`, and
say whether every accepted lane reached a terminal result. Workers that
completed are never reported as failed because the controller could not
publish.

Before assurance or publication, candidate runs are normalized into a deeply
immutable `ValidatedRun`. To prevent premature or invalid promotion,
`ValidatedRun` is only constructed and exposed when a candidate generation is
structurally valid and publishable (`complete` or `partial`). Non-publishable
runs (`failed`, `running`, `preparing`, `awaiting-approval`) withdraw any
existing `packet.md` under the unchanged-root guard, leave no `ValidatedRun`,
and cause the exported renderer to fail closed with `PACKET_NOT_PUBLISHABLE`.

If the manifest, ledger, approval envelope, source identities, or publication
boundary cannot be validated, the run is `failed`. It may retain safe raw
diagnostics, but it does not publish a misleading `packet.md`.
