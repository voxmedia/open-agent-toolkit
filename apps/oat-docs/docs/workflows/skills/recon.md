---
title: Recon Evidence Packets
description: 'Use recon to gather and validate bounded evidence through approved worker waves, then hand off one durable packet directory.'
---

# Recon Evidence Packets

`recon` turns a bounded investigation into a durable evidence-packet directory.
It gathers source-grounded findings through approved worker waves, validates
their locators and assurance state, and gives the next consumer one compact
entry point instead of every worker transcript.

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
At run time, OAT resolves a currently available target that meets the planned
work's task-class floor and asks you to approve the exact provider, model,
effort, role, topology, authority, and execution limits before any worker
launches.

## Run a Recon

Provide a bounded question or target, then optionally choose a profile, scope,
context source, output directory, or strict authority:

```text
/recon "How is provider sync materialized?" --profile standard --scope packages/cli/src/providers
```

The default profile is `standard`. Every run uses one approved model and effort
for every pass. Profiles change pass topology, redundancy, lane caps, and
maximum concurrency; they do not silently choose a different model tier.

| Profile    | Use it for                                  | Required assurance work                                                                  | Claim ceiling |
| ---------- | ------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------- |
| `quick`    | Bounded orientation                         | Mapping, gathering, compilation, schema validation, and locator validation               | `supported`   |
| `standard` | Load-bearing evidence                       | Quick work plus blind semantic verification, adversarial review, coverage, and reconcile | `verified`    |
| `thorough` | Expensive failure or correlated blind spots | Standard work plus redundant gathering and verification and contradiction resolution     | `verified`    |

The approval manifest shows the exact adaptive lane count, concurrency, pass
topology, conditional lane caps, deadlines, retries, and source/write authority.
Declining approval launches nothing. A material change to a provider, model,
effort, route, role, service tier, or execution cap requires renewed approval;
there is no silent substitution after approval.

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
- `manifest.json` records request, source, dispatch, topology, stage, and gap
  provenance.
- `reviews/` contains compact locator, semantic, adversarial, coverage, and
  reconciliation evidence.
- `raw/` contains worker dossiers, dispatch receipts, candidate artifacts, and
  safe failure diagnostics. It is not normal consumer input.

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

A quick packet never promotes a claim to `verified`. Stronger profiles can do
so only when their required review artifacts and receipts validate.

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
a material evidence gap remains.

If the manifest, ledger, topology, receipts, source identities, or publication
boundary cannot be validated, the run is `failed`. It may retain safe raw
diagnostics, but it does not publish a misleading `packet.md`.
