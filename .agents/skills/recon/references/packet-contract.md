# Recon Packet Contract

Every JSON artifact carries a `kind` discriminator and integer
`schemaVersion`. Versions are dispatched by artifact kind: packet manifests
accept version 2, while claim ledgers, raw dossiers, review briefs, and review
results remain version 1. Unknown kind/version combinations fail closed; extend
a kind through a new version rather than accepting untyped fields.

## Directory

```text
<topic>-<run-id>/
├── packet.md
├── manifest.json
├── claims.json
├── reviews/
│   ├── briefs/
│   ├── semantic/
│   ├── adversarial/
│   ├── coverage/
│   └── reconciliation.json
└── raw/
    ├── dossiers/
    ├── drafts/
    ├── quarantine/
    └── failure.json
```

`manifest.json` and `claims.json` are canonical. `packet.md` is a generated
consumer view. Each worker owns one unique path; candidates are immutable and
never promoted over the last valid canonical artifact in place.

## Artifact References

An artifact reference is `{ "path": "packet-relative/path", "digest":
"sha256:<64 lowercase hex>" }`. Paths must remain inside the packet directory.
Digests cover the exact bytes on disk.

## One Validation Boundary

Validation compiles persisted packet inputs exactly once into one non-persisted,
deeply immutable `ValidatedRun`. This value is an internal normalized graph,
not an artifact kind, schema version, file, cache, or caller-selectable profile.
Assurance derivation and rendering accept only `ValidatedRun`; they never
reopen or independently reinterpret raw manifest, ledger, review, or
reconciliation artifacts.

The validator checks the original wire shape before it creates the normalized
routing view. A wave inherits the complete execution target unless it supplies
a complete replacement target. The
`ValidatedRun` retains both the original manifest and its exact byte digest plus
the immutable effective routing view. Consumers do not reparse raw routing data.

Construction is all-or-nothing. A valid graph contains:

- one execution envelope with recorded explicit user approval;
- complete typed same-run artifacts, each written by an approved wave and lane,
  from which the achieved profile is derived;
- exactly one terminal reconciliation for standard or thorough runs and one
  immutable canonical prior-ledger identity used by all review, transition,
  addition, and removal checks;
- exact byte digests for `manifest.json`, `claims.json`, and every validated
  referenced packet artifact, retained from the same reads that constructed
  the normalized graph;
- canonical absolute realpaths for the packet, repository, file, capture,
  command-output, and publication trust roots, rechecked before use;
- only secret-safe persisted evidence and diagnostics, including ineligible
  audit evidence;
- material gaps derived from stale, invalid, or unavailable canonical sources,
  with exact affected-claim coverage and legal assurance downgrades; and
- derived claim assurance, achieved profile, material gaps, and publication
  status.

Reject unsupported manifest versions, unknown execution fields, artifacts from
unapproved lanes, duplicate or shadow reconciliation results, symlink root
aliases, retargeted roots, raw secret-bearing stale excerpts, and
caller-downgraded gap materiality. Equivalent-looking inputs do not excuse a
failed invariant.

## Manifest

`recon.packet-manifest` version 2 contains:

- `run`: stable ID, topic, status, requested and achieved profile, timestamps;
- `request`: objective, questions, included/excluded scope, stable context
  references, confirmed output path;
- discriminated `sources`;
- `execution`: the approved execution envelope described below;
- `artifacts`: direct references; and
- `gaps`: categorical omitted, unavailable, stale, or failed work, each with an
  explicit boolean `material` classification and affected source, claim, and
  coverage-finding IDs when applicable.

The manifest also carries root-recorded `conditionOutcomes`. They are
control dispositions, not launcher receipts. Every declared condition has one
closed `triggered`, `not-triggered`, or `unresolved` outcome with a non-empty
reason and exact digest-bound predecessor artifact references.

The manifest records approved routing intent. Effective targets, selection
rationales, and condition outcomes do not attest which native process ran, its
runtime identity, token usage, cost, or the correctness of its conclusions.
Those claims require evidence from an actual producer outside this contract.

### Execution Envelope

Execution uses a required closed `target` object:
`provider`, `route`, `role`, and `model` are non-empty strings; `effort`,
`reasoningMode`, and `serviceTier` are each explicitly a non-empty string or
`null`. A null axis means the adapter exposes no independently requested control;
it is not an unknown-value fallback.

The other execution fields include `authority` as `provider-enforced` or
`contract-enforced`; integer `maxConcurrency` and `deadlineSeconds` values of
at least 1; and an integer `retryLimit` of at least 0. Each closed wave adds:

- `classFloor`, from the same durable task-class order and not above
  `taskClass`;
- a non-empty `selectionReason`; and
- optional `target`, which must be a complete exact-target replacement. If it
  is absent, the complete execution target is inherited without partial-axis
  merging.

The execution object also requires a closed `conditions` array. Each structural
condition contains `conditionId`, `destinationWaveId`, `afterWaveIds`, one of
`insufficient-evidence` or `unresolved-material-challenge`, and
`maxActivations: 1`. Each conditional destination is a uniquely identified
`contradiction-resolution` evidence wave, has exactly one condition, appears
after every named predecessor and before the one terminal reconciliation, and
owns unique lane IDs and write roots. Conversely, every wave marked
`conditional: true` must be the destination of exactly one activating condition;
dead conditional waves are invalid. Quick permits no conditional wave;
standard permits one and thorough two. The profile's 4/10/20 adaptive-lane cap
counts `gather`, `semantic-verification`, `adversarial`, `coverage`,
`redundant-gather`, `redundant-verification`, and
`contradiction-resolution` when those modes are permitted by the profile.
Every permitted mode outside that counted set is fixed at exactly one lane:
`map` and `compile` for quick, plus terminal `reconciliation` for standard and
thorough. The resulting total lane maxima are 6/13/23, and concurrency remains
capped at 4/6/8.

Triggered dispositions require exact complete same-run artifacts from every
approved predecessor and concrete typed predicate evidence from those same-run
artifacts. A triggered destination must produce its approved output or a
material `PASS_FAILED`/`PASS_OMITTED` gap with exact `waveId` and `laneId`
fields. The gap message is explanatory prose and is never parsed for identity.
Not-triggered and unresolved destinations publish no artifacts and contribute
no achieved pass. Accepted failed, cancelled, timed-out, or missing predecessor
work cannot activate replacement work. Required profile passes remain required
regardless of conditional annotations.

`reconciliation-needs-judgment` is a controller escalation outcome, never a
condition predicate. Foreseeable judgment changes the one terminal target before
approval. A need discovered later preserves completed work and records an
unresolved out-of-envelope gap until renewed approval or a new run; it never
mutates the approved target or launches a second reconciliation.

The controller maps the ten manifest wave modes onto the worker contract's
seven assignment modes: redundant gathering uses `gather`; semantic and
redundant verification use `verify`; adversarial and contradiction-resolution
use `adversary`; and only terminal reconciliation uses `reconcile`. This mapping
does not change the approved manifest mode used for artifact and pass checks.

Approval is `{ type: "explicit-user-approval", approvedAt }`. It is valid only
for the exact proposal shown in the same uninterrupted controller flow. Resume,
reload, or any pre-launch proposal change returns the run to
`awaiting-approval`, removes the recorded approval, and requires a fresh preview
and explicit approval. The exact-target check immediately before launch still
refuses a candidate whose provider-native axes differ from the current wave.
The manifest may reference version 1 evidence artifacts.

### Passes and Achieved Profile

Run status is `preparing`, `awaiting-approval`, `running`, `complete`, `partial`,
or `failed`. The validator, not a worker, derives the achieved profile from
complete typed artifacts of the same run:

| Pass                       | Complete artifact                                                         |
| -------------------------- | ------------------------------------------------------------------------- |
| `map`                      | a `recon.raw-dossier` with mode `map`                                     |
| `gather`                   | a complete `gather` dossier owned by the approved primary `gather` wave   |
| `semantic-verification`    | a `recon.review-result` with kind `semantic`                              |
| `adversarial`              | a `recon.review-result` with kind `adversarial`                           |
| `coverage`                 | a `recon.review-result` with kind `coverage`                              |
| `reconciliation`           | a `recon.review-result` with kind `reconciliation`                        |
| `redundant-gather`         | a complete `gather` dossier owned by the approved `redundant-gather` wave |
| `redundant-verification`   | a `recon.review-result` with kind `redundant-verification`                |
| `contradiction-resolution` | a `recon.review-result` with kind `contradiction-resolution`              |

`quick` requires `map` and `gather`; the canonical ledger itself is the
compile result, so an approved `compile` lane needs no separate artifact, and
locator validation is performed by the validator.
`standard` adds `semantic-verification`, `adversarial`, `coverage`, and
`reconciliation`. `thorough` adds `redundant-gather` and
`redundant-verification`. A predeclared conditional
`contradiction-resolution` evidence pass may feed the same mandatory terminal
reconciliation when its predicate triggers; it is not a second terminal pass.

Thorough routing completes `redundant-gather` before `compile`. The compiled
ledger must directly reference by exact path and digest at least one complete
dossier from every approved primary and redundant gather lane. This makes both
independent gathering outputs part of the immutable ledger consumed to create
review briefs. Omitting one fails with
`MISSING_THOROUGH_GATHER_LEDGER_INPUT`.

Every dossier records the approved `waveId` and `laneId` that wrote it; every
review result records its approved `reviewerLane`. The lane must belong to a
wave whose mode matches the artifact (a semantic result to a
`semantic-verification` wave, a gather dossier to a `gather` or
`redundant-gather` wave, and so on); otherwise the artifact is
`UNAPPROVED_LANE`. The artifact path must equal or sit under the lane's
approved `writeRoot`; otherwise it is `LANE_WRITE_PATH_VIOLATION`. Every
primary and redundant gathering pass is derived from this exact approved wave
ownership, not from aggregate dossier mode or lane cardinality. Multiple
complete lanes from one gathering wave cannot satisfy the other wave's pass.
Every non-conditional approved lane must either have written an artifact or be
covered by a material `PASS_FAILED` or `PASS_OMITTED` gap naming its wave
mode; otherwise the packet fails with `MISSING_LANE_OUTCOME`. Each required
pass of the requested profile that has no complete artifact must likewise be
named by such a gap, or the packet fails with
`MISSING_PASS_OUTCOME_EVIDENCE`.

## Source Descriptors and Locators

All source descriptors carry `kind`, stable `id`, `available`, `authority`,
`observedAt`, and `validationState`. Every declared path trust root must be an
absolute canonical realpath, not a symlink alias, and its filesystem identity is
rechecked before reads, hashes, or publication.

Validation state is closed to `pinned`, `unpinned`, `stale`, `invalid`, or
`unavailable`. Only an available `pinned` source is assurance-eligible;
everything else requires an explicit affected-source/claim gap. A stale,
invalid, or unavailable source used by the canonical ledger deterministically
creates a material gap and forces `partial`. It may remain as auditable
non-exact evidence only when that gap names the source and every affected claim,
all affected claims are below `supported`, and every persisted excerpt and
diagnostic is secret-safe. Caller-declared non-materiality, missing coverage,
or a stronger claim state is invalid.

- `repository`: canonical `root`, revision, dirty state, and per-path content
  hashes. Locator: relative path, matching revision, line start/end.
- `file`: canonical path and content hash. Locator: path and optional line
  start/end.
- `url`: canonical URL plus persisted capture path/digest or explicit validator
  state containing an ETag or last-modified value and a pinned validation
  snapshot path/digest. Locator: URL, retrieval time, optional fragment, and
  the canonical validator-state token when that alternative is used.
- `command-output`: canonical argv, cwd, exit status, output path/digest, and
  names-only environment metadata. Locator: output path, line range, command
  digest.
- `connected-resource`: system, resource ID, resource version or retrieval
  token, and capture path/digest. Locator: matching system/resource/version,
  retrieval time, and optional field or section.

Missing minimum provenance makes evidence ineligible for `supported` or
`verified`. Path escape, digest change, version drift, shifted lines, or excerpt
mismatch invalidates the locator. Only `exact` and `redacted-exact` states are
assurance-eligible. Managed packet, capture, repository, and output paths reject
both ancestor and final-component symlinks before reads, hashes, or writes.

Source preflight runs these checks on the candidate manifest and ledger before
any review brief is created, so ineligible sources and broken locators are
found before the expensive review passes rather than at publication.

## Claim Ledger

`recon.claim-ledger` version 1 contains run ID, monotonic revision, direct input
references, synthesis, evidence, claims, unresolved questions, and explicit
claim transitions.

Every claim evidence link is a closed `{ evidenceId, relation }` object whose
`evidenceId` resolves to an evidence record in the same ledger and whose
`relation` is `supports`, `contradicts`, `qualifies`, or `context`. A claim
links each evidence record at most once. String links, open objects, unknown
relations, unresolved IDs, and duplicates fail `validate-artifact.mjs` before
any review brief can consume the ledger.

Claim states are categorical:

- `provisional`: compiled, not mechanically validated;
- `supported`: supporting evidence and exact locators validate;
- `verified`: independent semantic review affirmed the claim without unresolved
  material challenge;
- `contested`: credible counterevidence or incompatible interpretations remain;
- `unresolved`: available evidence cannot settle the claim; and
- `unsupported`: no valid support remains.

A revision-one claim may honestly begin as `provisional`: that genesis is
represented by the claim itself and has no transition entry. Revision one
rejects any incoming or self-transition used to manufacture provisional
genesis. In later revisions, `provisional` must result from an explicit legal
incoming transition; the genesis exception cannot be reused.

Quick packets never contain `verified` claims. Standard and thorough claims need
recorded independent semantic, adversarial, and coverage reviews. Every review
ID resolves to a unique, complete, typed, hashed result from an approved lane,
bound to the exact immutable brief digest and the claim's required disposition.
An incomplete or unapproved result cannot contribute assurance or
reconciliation. A material unresolved challenge or coverage finding prevents
verification. A run with contested claims may publish as `complete` when all
declared questions and claims are resolved or characterized; contested claims
are rendered under "Contradictions and Qualifications". If an unresolved
challenge represents an unanswered question or missing source evidence that
leaves investigation incomplete, it must be recorded as a material gap in
`manifest.gaps` and the run published as `partial`. Review workers propose;
only a reconciler writes a new ledger candidate. Reconciliation binds the prior
ledger reference and revision, the next revision, the exact complete
assurance-review set, and the exact canonical claim transitions. Standard and
thorough output is exactly the next revision of the bound prior ledger;
revision one cannot bypass reconciliation. It also binds additions, removals,
and every prior/current state change; preserves statement, evidence-link, and
qualification continuity; accepts new evidence only when an incorporated review
supplied the exact record plus a closed `{ evidenceId, claimId, relation }`
association to one of that review's disposition claims; preserves every
unaffected evidence link byte-for-byte; and requires a typed rejection
disposition from a complete review before removing a prior claim.

## Evidence and Secret Redaction

Evidence records bind a stable ID and source ID to one typed locator, a minimal
display excerpt, observation time, locator-validation state, and provenance
reference. States are `exact`, `redacted-exact`, `stale`, or `invalid`.

Validate a sensitive source span transiently, redact before persistence, and
store `redaction.applied: true`, categories, and
`redaction.originalPersisted: false`. `redacted-exact` stores neither the secret
nor a digest of the sensitive span. Diagnostics must never echo the span.
Secret scanning precedes every assurance, ineligible-audit, gap, and render
branch; source ineligibility never bypasses persistence safety.

## Other Artifacts

- `recon.raw-dossier`: assignment identity, approved wave and lane, mode,
  inputs/exclusions, findings, uncertainty, contradictions, gaps, and outcome.
- `recon.review-brief`: immutable selective-blind projection and digest.
- `recon.review-result`: review kind, approved lane, exact brief reference,
  permitted/excluded inputs, dispositions, new evidence, closed typed
  claim/evidence associations, coverage findings, unresolved issues, and
  completion status. Every new evidence record has at least one exact
  association, and an association cannot name evidence absent from that result
  or a claim without a disposition in that result. Reconciliation results
  replace the brief reference with prior-ledger/revision, additions/removals,
  exact transitions, and coverage-disposition bindings. Coverage findings are
  closed records bound to affected claims and exact manifest gaps. Accepted
  material gaps require a legal downgrade for every affected claim; a resolved
  finding instead names exact typed evidence. Non-material coverage gaps
  downgrade verified claims and transition provisional claims to unresolved,
  while existing supported claims remain supported without verified promotion.
  Thorough redundant verification and contradiction resolution are
  claim-bearing typed review results, not raw dossiers: they bind immutable
  briefs, claim dispositions, and explicit affected-contradiction dispositions.

Create immutable mode-specific review projections with
`scripts/create-review-brief.mjs`. Verification briefs expose only claim
statements, display excerpts, typed locators, and required source descriptors.
Adversarial briefs expose only scope, questions, and provisional statements.
Coverage briefs expose only scope, questions, and claim ID/statement pairs.
All reject dossier paths, compiler reasoning, synthesis prose, provenance
references, and prior review IDs.

## Validation and Publication

Run `scripts/validate-artifact.mjs` on every candidate. Use
`--quarantine-root <packet-dir>` to move an invalid candidate and a safe failure
record under `raw/quarantine/`. Never promote invalid output.

Run `scripts/validate-packet.mjs <packet-dir>` before rendering or publication.
It delegates to the single validation boundary, which validates schemas, IDs,
references, containment, hashes, source reopening, locators, the approval
presence, approved lanes, pass outcomes, the one terminal reconciliation,
legal transitions, secret-safe persistence, derived gaps, assurance, and
requested vs achieved profile. Candidate validation is non-destructive for
canonical diagnostic artifacts, but a non-publishable candidate withdraws any
existing `packet.md` and does not authorize rendering. Only a valid `complete`
or honest `partial` candidate is publishable, so a rejected canonical
generation cannot retain a consumer entry point from another generation.

`complete` requires the requested profile and no material gap. `partial` is
valid when either a lower profile was achieved or at least one material gap is
declared, including honest same-profile partials.

Use `scripts/render-packet.mjs <packet-dir>` to generate the deterministic
consumer view. Its public path entry point first obtains `ValidatedRun`; the
render core accepts only that graph. The document
includes a compact Intended Routing summary from the normalized view: approved
authority and limits, each wave's effective exact target/class/floor/rationale,
and every root-recorded conditional disposition. It labels those values as
approved intent rather than launch receipts or observations of runtime identity,
usage, cost, or correctness. Evidence, claims, contradictions, and gaps remain
the primary consumer context.

The renderer writes an exclusive unpredictable temporary sibling, retains that
file's identity through hashing and atomic promotion, and verifies the promoted
digest. Immediately before and after promotion it also verifies that the
canonical manifest, ledger, and validated referenced artifacts still match the
byte digests retained by `ValidatedRun`. A mismatch is a categorical integrity
failure and withdraws `packet.md`.
Withdrawal first proves the retained packet-root identity; if the root changed,
the renderer preserves that identity failure and does not follow or unlink the
replacement path. Rendering or promotion failure on an unchanged root likewise
withdraws `packet.md` while leaving canonical diagnostics available. Its result
is the directory path plus a compact status summary and digest, never raw
dossier content.

## Compatibility and Non-Goals

Legacy manifest compatibility is intentionally out of scope. This boundary does
not add another review pass, persisted intermediate, generalized plugin
artifact kind, saved validation profile, provider behavior, or integration
surface. It does not require launcher-emitted
dispatch receipts; reintroduce those only when a launcher exists that produces
them itself. It does not change research-pack distribution, documentation,
backlog integrations, `quick`/`standard`/`thorough`, selective blindness,
categorical claim states, honest partial publication, or directory-only
handoff.
