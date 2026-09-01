---
name: recon
version: 1.0.0
description: Use when a bounded investigation needs source-grounded evidence before analysis or implementation. Produces a validated evidence-packet directory through approved provider-neutral worker waves.
argument-hint: '<question-or-target> [--profile quick|standard|thorough] [--scope description] [--context path] [--output directory] [--strict]'
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Bash, AskUserQuestion, Agent, mcp__*
---

# Recon

Compile a bounded investigation into a durable, validated evidence-packet
directory. `recon` is a provider-neutral controller: it owns decomposition,
artifact boundaries, assurance, and user interaction while installed dispatch
dependencies own live catalogs, target selection, and launch mechanics.

## When to Use

Use `recon` when a downstream agent needs precise evidence, source locators,
contradictions, and gaps without loading every reconnaissance transcript.

Do not use it to make the final product or architecture decision, modify the
investigated system, perform an unbounded survey, or maintain a persistent
research workspace.

## Arguments

Parse from `$ARGUMENTS`:

- **question-or-target**: bounded objective or target (required).
- **--profile**: `quick`, `standard`, or `thorough`; default `standard`.
- **--scope**: included and excluded investigation boundaries.
- **--context**: stable caller-provided context path or resource identifier.
- **--output**: explicit packet parent or run directory.
- **--strict**: require provider-enforced read and write authority for every
  lane; default false.

Ask only for missing information required to make the objective, authority, or
destination safe. A calling skill may supply a fully resolved request.

## Progress Indicators (User-Facing)

Report these compact stage transitions:

- `[1/8] Resolving request and destination…`
- `[2/8] Preflighting sources and authority…`
- `[3/8] Planning profile and worker lanes…`
- `[4/8] Preparing exact dispatch manifest…`
- `[5/8] Awaiting approval…`
- `[6/8] Running approved artifact pipeline…`
- `[7/8] Validating and publishing packet…`
- `[8/8] Returning packet directory…`

Do not print worker transcripts or raw dossier content.

## Workflow

### Step 1: Complete the Request

Normalize the objective, explicit questions, included and excluded scope,
caller context references, requested profile, strictness, and destination.
Refuse requests whose read-only evidence boundary cannot be stated.

Resolve the destination in this precedence order:

1. explicit output override;
2. active project `references/evidence/` directory when supplied by a caller;
3. repository `.oat/repo/reference/evidence/` directory;
4. a caller-approved fallback.

Create a new topic-and-run directory. Never escape the confirmed parent or
overwrite an existing run. Create only the packet directory and its artifacts.

### Step 2: Preflight Sources and Authority

Inventory repository, file, URL, read-only command-output, and connected-system
sources that are actually available. Record unavailable or excluded sources as
gaps. Pin stable identities, observations, captures, revisions, and hashes
before dispatch.

Give every lane an explicit authority envelope containing:

- allowed inputs and excluded inputs;
- `readSources` and approved read-only tools;
- exactly one worker-owned output path; and
- enforcement level: `provider-enforced`, `contract-enforced`, or
  `unavailable`.

Mutation-capable source access is unavailable unless the interface enforces a
read-only operation. In strict mode, stop unless every lane is
provider-enforced. Otherwise, contract-enforced local reads are permitted only
with the audited leaf-worker contract. Never broaden authority silently.

Initialize `manifest.json` and the directory skeleton, but do not create
`packet.md`.

### Step 3: Expand the Profile

Read `references/profiles.md`. Partition the scope into non-overlapping,
adaptive lanes within the profile's hard caps. Classify every required and
conditionally allowed wave before selection. Record each wave's task class and
floor, then compute the run-wide maximum model-class floor.

All lanes within a launch are a homogeneous wave. All waves use the same
approved model and effort. Profiles change topology, redundancy, and
concurrency—not the target tier.

### Step 4: Prepare One Exact Dispatch Manifest

Before reading either installed dispatch dependency, resolve one shared utility
skills root. Probe these candidate roots in order: from this loaded skill use
`${SKILL_DIR}/..`, then `${HOME}/.agents/skills` at user scope, then
`<repo-root>/.agents/skills` at project scope. The first candidate containing
both `oat-dispatch-subagents/SKILL.md` and
`subagent-orchestration/SKILL.md` becomes `${UTILITY_SKILLS_ROOT}`; bind every
dependency read to that same scope. Never resolve the dependencies
independently or mix different scopes.

If no candidate contains both dependencies, name the missing dependency and
stop before preparing or launching workers. Give the recovery command for the
intended scope: `oat tools install utility --scope <user|project>` or, when the
pack is already installed, `oat tools update --pack utility --scope
<user|project>`.

Read `${UTILITY_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md` and use its
selection-only `prepare` operation. From the same root, read
`subagent-orchestration/references/model-selection-principles.md`, exactly one
active-provider selection reference, and the matching
`oat-dispatch-subagents` provider mechanics reference. Do not copy provider
catalogs or exact launch construction into this skill.

Prepare every planned and conditional wave against one exact target satisfying
the run-wide floor. Prefer the canonical `recon-worker` role. If that role is
unavailable, prepare the generic role with the complete worker contract as a
visible generic role fallback before approval. A fallback after approval is
forbidden.

Assemble the exact approval envelope from the prepared records. It must bind:

- provider, route, role selector, model, effort, reasoning mode, and service
  tier;
- profile, wave classes and floors, lane identities, lane scopes, conditional
  lane caps, and concurrency;
- per-lane authority, writable path, deadlines, and retry limits; and
- live catalog observation identity and canonical approval fingerprint.

Present the exact provider, model and effort for explicit approval before any
worker launch. Also present the full topology and hard execution limits. Named
model examples are illustrative and non-normative; never route from an example.
Declining approval leaves the run at `awaiting-approval` and launches nothing.

### Step 5: Execute the Approved Waves

Submit only the approval-bound prepared records to the dispatch dependency's
`execute` operation. Before each launch, compare every approved selection and
execution axis plus relevant catalog identity. Any drift returns the complete
manifest for renewed approval.

Store immutable prepared, approval, launch-acceptance, and terminal receipts
under `raw/dispatch/`. Launch acceptance is distinct from worker completion.
After acceptance there is no replacement child, alternate route, target
substitution, or no silent retry. Continue the accepted handle only when the
dispatch contract authorizes continuation; otherwise record the pass failure.

Run the stages in this order:

1. `map` and `gather` workers write unique dossiers under `raw/dossiers/`.
2. `compile` writes a candidate canonical claim ledger.
3. deterministic validation reopens sources and validates locators.
4. profile-required `verify`, `adversary`, and `coverage` workers consume only
   immutable selectively blind briefs created by
   `scripts/create-review-brief.mjs` at unique paths.
5. `reconcile` writes a new candidate ledger without mutating the prior ledger.

Use `references/worker-contract.md` for every assignment. Never allow two
workers to share a write path.

Read `references/packet-contract.md` before creating any packet artifact. Run
`scripts/validate-artifact.mjs` on each candidate and record its canonical
digest before the next stage consumes it.

### Step 6: Preserve the Context Firewall

Treat `raw/` as worker-facing audit material, not normal consumer input. A
verification brief may contain only claim statements, display excerpts, typed
locators, and required source descriptors. An adversarial brief may contain
only declared scope, questions, and provisional statements.

Raw dossier content, dossier paths, compiler reasoning, synthesis prose,
provenance artifact references, prior review identifiers, and worker
transcripts must not enter review briefs, `packet.md`, or the parent handoff.
This selective blindness and context firewall are mandatory even when one
approved model performs every pass.

### Step 7: Validate and Publish

Run `scripts/validate-artifact.mjs` on every candidate, then
`scripts/validate-packet.mjs` on the complete directory. Quarantine invalid
candidates under `raw/`; never promote shared artifacts in place and never
overwrite the last valid ledger.

Derive the achieved profile from completed stages whose required typed,
digest-bound artifacts validate. Do not accept a worker or manifest assertion
of achievement. A `quick` run can reach `supported` but never `verified`.
`verified` claims require unique complete semantic, adversarial, and coverage
results bound to immutable briefs and correct claim dispositions. Unresolved
material challenge prevents verification.

Render `packet.md` with `scripts/render-packet.mjs` only from the final validated
manifest and ledger. Publish through a symlink-safe temporary sibling followed
by atomic promotion. A complete run meets the requested profile and has no
material gap. An honest partial records requested profile, achieved profile,
failed or omitted passes, material coverage gaps, and claim downgrades; a
same-profile partial is valid when a material gap remains. A structural failure
publishes no `packet.md` and leaves a safe failure record.

### Step 8: Return the Directory-Only Handoff

Return only the packet directory path plus a compact summary containing status,
requested and achieved profile, claim-state counts, unresolved gaps, and failed
or omitted passes. Do not inline raw dossiers, source bodies, or worker
reasoning. The consumer may open `packet.md` and selectively follow compact
references.

## Examples

### Basic Usage

```text
/recon "How is provider sync materialized?" --profile standard --scope packages/cli/src/providers
```

### Conversational

```text
Build a quick recon packet for the current repository's release version gates.
```

## Success Criteria

- No worker launches before exact manifest approval.
- Every worker reads only declared inputs and writes one unique artifact.
- Every published locator is independently validated against a pinned source.
- Stronger claim states require their recorded profile passes.
- Partial and failed runs never overstate assurance.
- The normal handoff contains a packet directory and compact status only.
