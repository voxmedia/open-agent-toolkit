---
name: recon
version: 1.1.0
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

When a run stops early or publishes a partial, label every failure with one of
these categories so a controller problem is never reported as a worker
problem:

- `worker`: an accepted lane failed, was cancelled, or wrote an invalid
  artifact;
- `provider/dispatch`: the launch surface could not satisfy the approved
  envelope, or a launched axis drifted from approval;
- `contract validation`: artifacts were produced but the packet or a
  candidate failed deterministic validation;
- `source availability`: a declared source was unavailable, stale, or lacked
  a read-only boundary.

State whether every accepted lane reached a terminal result.

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

Read `${UTILITY_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md` and perform
only the selection steps of its Full-Information Selection: observe the
catalog, resolve one exact target, and record the selection. Stop before its
launch step; nothing launches until Step 5 runs after approval. From the same
root, read
`subagent-orchestration/references/model-selection-principles.md`, exactly one
active-provider selection reference, and the matching
`oat-dispatch-subagents` provider mechanics reference. Do not copy provider
catalogs or exact launch construction into this skill.

Resolve every planned and conditional wave against one exact target satisfying
the run-wide floor. Prefer the canonical `recon-worker` role. If that role is
unavailable, plan the generic role with the complete worker contract as a
visible generic role fallback before approval. A fallback after approval is
forbidden.

Write the approval envelope into `manifest.execution`. It binds:

- provider, route, role, model, effort, reasoning mode, and service tier;
- authority level, maximum concurrency, per-lane deadline, and retry limit; and
- every wave with its mode, task class, and conditional flag, and every lane
  with its identity, read scope, and worker-owned write root.

Its canonical fingerprint covers every field above.

Present the exact provider, model and effort for explicit approval before any
worker launch, together with the full topology and hard execution limits. Named model examples are
illustrative and non-normative; never route from an example. Declining approval
leaves the run at `awaiting-approval` and launches nothing. Approval records
`explicit-user-approval`, the approval time, and the fingerprint.

**Deadlines.** Choose the per-lane deadline from the expected task class and
scope, and show it in the approval envelope; it is an approved execution limit,
not a short watchdog. A deadline authorizes the provider to end a lane and
report a terminal timeout. It never authorizes the controller to interrupt an
accepted lane by hand: elapsed display time is not a failure. If the provider
cannot enforce the deadline, wait or poll and report elapsed time, or obtain
renewed approval before any cancellation.

### Step 5: Preflight the Launch Surface, Then Execute

Before any worker launch, confirm that the live launch surface can run the
approved role, model, effort, and authority level, and can return each lane's
result. If any approved axis cannot be satisfied, stop with a
`provider/dispatch` diagnostic, leave the run at `awaiting-approval`, and
launch nothing. Never substitute a different axis to make the launch fit.

Launch each wave through the dispatch dependency with exactly the approved
axes. Immediately before each launch, compare the axes that will actually run
against the approval fingerprint. Any drift returns the complete manifest for
renewed approval. Launch acceptance is distinct from worker completion. After
acceptance there is no replacement child, alternate route, target
substitution, or no silent retry. If an accepted lane fails, is cancelled, or
times out, record that pass as failed with a material `PASS_FAILED` gap
naming the pass.

Run the passes in this order:

1. `map` and `gather` workers write unique dossiers under `raw/dossiers/`.
2. `compile` writes a candidate canonical claim ledger.
3. Source preflight: run `scripts/validate-artifact.mjs` on the candidate
   manifest and ledger, then reopen every declared source and evidence locator
   with the checks in `scripts/validate-packet.mjs`. Resolve source roots to
   canonical realpaths, pin one observation time per source, capture URLs or
   mark them unavailable, and add a material gap for every ineligible source
   and each affected claim. Do not create review briefs until the candidate
   manifest and ledger pair validates.
4. profile-required `verify`, `adversary`, and `coverage` workers consume only
   immutable selectively blind briefs created by
   `scripts/create-review-brief.mjs` at unique paths.
5. `reconcile` writes a new candidate ledger without mutating the prior ledger.

Use `references/worker-contract.md` for every assignment. Never allow two
workers to share a write path. Every dossier records its approved wave and lane;
every review result records its approved lane.

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
overwrite the last valid ledger. Candidate packet validation is
non-destructive for the canonical diagnostic artifacts: when it fails, do not
invoke the renderer, withdraw any existing `packet.md`, and report the
candidate failure separately. Only a publishable candidate proceeds to
`scripts/render-packet.mjs`; failure leaves no consumer entry point that could
refer to a different canonical generation.

Derive the achieved profile from complete, typed, digest-bound same-run
artifacts written by approved lanes. Do not accept a worker or manifest
assertion of achievement. A `quick` run can reach `supported` but never `verified`.
`verified` claims require unique complete semantic, adversarial, and coverage
results bound to immutable briefs and correct claim dispositions. Unresolved
material challenge prevents verification. A run with contested claims may
publish as `complete` when all declared questions and claims are resolved or
characterized; contested claims are rendered under "Contradictions and
Qualifications". If an unresolved challenge represents an unanswered question
or missing source evidence that leaves investigation incomplete, it must be
recorded as a material gap in `manifest.gaps` and the run published as
`partial`.

Render `packet.md` with `scripts/render-packet.mjs` only from the final validated
manifest and ledger. Publish through a symlink-safe temporary sibling followed
by atomic promotion. A complete run meets the requested profile and has no
material gap. An honest partial records requested profile, achieved profile,
failed or omitted passes, material coverage gaps, and claim downgrades; a
same-profile partial is valid when a material gap remains. Structural failure
leaves no `packet.md`. Renderer promotion failure also withdraws that consumer
entry point. Both retain the canonical manifest, ledger, reviews, raw
diagnostics, and safe failure record for diagnosis.

### Step 8: Return the Directory-Only Handoff

Return only the packet directory path plus a compact summary containing status,
requested and achieved profile, claim-state counts, unresolved gaps, failed or
omitted passes, and each failure's category from the list above. Do not inline
raw dossiers, source bodies, or worker reasoning. The consumer may open `packet.md` and selectively follow compact
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
