# Recon Packet Contract v1

Every JSON artifact carries a `kind` discriminator and integer
`schemaVersion`. Version 1 rejects unknown versions; extend the contract through
a new version rather than accepting untyped fields.

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

## Artifact References and Canonical JSON

An artifact reference is `{ "path": "packet-relative/path", "digest":
"sha256:<64 lowercase hex>" }`. Paths must remain inside the packet directory.
Digests cover the exact bytes on disk.

Fingerprints use canonical JSON: UTF-8, object keys sorted lexicographically,
array order preserved, no insignificant whitespace, and SHA-256 with the
`sha256:` prefix.

## One Validation Boundary

Version 1 compiles persisted packet inputs exactly once into one non-persisted,
deeply immutable `ValidatedRun`. This value is an internal normalized graph,
not an artifact kind, schema version, file, cache, or caller-selectable profile.
Assurance derivation and rendering accept only `ValidatedRun`; they never
reopen or independently reinterpret raw manifest, ledger, review, or
reconciliation artifacts.

Construction is all-or-nothing. A valid graph contains:

- one approved execution envelope whose canonical fingerprint matches the
  recorded explicit user approval;
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

Reject approval fingerprint drift, unknown execution fields, artifacts from
unapproved lanes, duplicate or shadow reconciliation results, symlink root
aliases, retargeted roots, raw secret-bearing stale excerpts, and
caller-downgraded gap materiality. Equivalent-looking inputs do not excuse a
failed invariant.

## Manifest

`recon.packet-manifest` version 1 contains:

- `run`: stable ID, topic, status, requested and achieved profile, timestamps;
- `request`: objective, questions, included/excluded scope, stable context
  references, confirmed output path;
- discriminated `sources`;
- `execution`: the approved execution envelope described below;
- `artifacts`: direct references; and
- `gaps`: categorical omitted, unavailable, stale, or failed work, each with an
  explicit boolean `material` classification and affected source, claim, and
  coverage-finding IDs when applicable.

### Execution Envelope

`execution` is a closed object binding exactly what the user approved:

- `provider`, `route`, `role`, `model`, `effort`: non-empty strings;
- `reasoningMode`, `serviceTier`: string or `null`;
- `authority`: `provider-enforced` or `contract-enforced`;
- `maxConcurrency`, `deadlineSeconds`: integers of at least 1; `retryLimit`:
  integer of at least 0;
- `waves`: closed `{ waveId, mode, taskClass, lanes, conditional }` records
  with a unique wave identity, a mode from the wave-mode set, a task class from
  the durable task-class order, and at least one closed
  `{ laneId, scope, writeRoot }` lane whose identity is unique across the run
  and whose write root is a packet-relative path; and
- `approval`: `{ type: "explicit-user-approval", approvedAt, fingerprint }`.

The fingerprint is the canonical SHA-256 of `execution` with `approval`
removed. Validation recomputes it; any difference is
`APPROVAL_FINGERPRINT_MISMATCH`. The envelope records what will run, not proof
that a launcher ran it. Launch acceptance and per-lane terminal outcomes are
reported in the controller's status and as `PASS_FAILED` gaps, not as packet
artifacts.

Wave modes are `map`, `gather`, `compile`, `semantic-verification`,
`adversarial`, `coverage`, `reconciliation`, `redundant-gather`,
`redundant-verification`, and `contradiction-resolution`.

### Passes and Achieved Profile

Run status is `preparing`, `awaiting-approval`, `running`, `complete`, `partial`,
or `failed`. The validator, not a worker, derives the achieved profile from
complete typed artifacts of the same run:

| Pass                       | Complete artifact                                            |
| -------------------------- | ------------------------------------------------------------ |
| `map`                      | a `recon.raw-dossier` with mode `map`                        |
| `gather`                   | a `recon.raw-dossier` with mode `gather`                     |
| `semantic-verification`    | a `recon.review-result` with kind `semantic`                 |
| `adversarial`              | a `recon.review-result` with kind `adversarial`              |
| `coverage`                 | a `recon.review-result` with kind `coverage`                 |
| `reconciliation`           | a `recon.review-result` with kind `reconciliation`           |
| `redundant-gather`         | complete `gather` dossiers from at least two distinct lanes  |
| `redundant-verification`   | a `recon.review-result` with kind `redundant-verification`   |
| `contradiction-resolution` | a `recon.review-result` with kind `contradiction-resolution` |

`quick` requires `map` and `gather`; the canonical ledger itself is the
compile result, so an approved `compile` lane needs no separate artifact, and
locator validation is performed by the validator.
`standard` adds `semantic-verification`, `adversarial`, `coverage`, and
`reconciliation`. `thorough` adds `redundant-gather`,
`redundant-verification`, and `contradiction-resolution`.

Every dossier records the approved `waveId` and `laneId` that wrote it; every
review result records its approved `reviewerLane`. The lane must belong to a
wave whose mode matches the artifact (a semantic result to a
`semantic-verification` wave, a gather dossier to a `gather` or
`redundant-gather` wave, and so on); otherwise the artifact is
`UNAPPROVED_LANE`. The artifact path must equal or sit under the lane's
approved `writeRoot`; otherwise it is `LANE_WRITE_PATH_VIOLATION`. Every
non-conditional approved lane must either have written an artifact or be
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
fingerprint, approved lanes, pass outcomes, the one terminal reconciliation,
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
render core accepts only that graph. It writes an exclusive unpredictable
temporary sibling, retains that file's identity through hashing and atomic
promotion, and verifies the promoted digest. Immediately before and after
promotion it also verifies that the canonical manifest, ledger, and validated
referenced artifacts still match the byte digests retained by `ValidatedRun`.
A mismatch is a categorical integrity failure and withdraws `packet.md`.
Withdrawal first proves the retained packet-root identity; if the root changed,
the renderer preserves that identity failure and does not follow or unlink the
replacement path. Rendering or promotion failure on an unchanged root likewise
withdraws `packet.md` while leaving canonical diagnostics available. Its result
is the directory path plus a compact status summary and digest, never raw
dossier content.

## Version 1 Non-Goals

This boundary does not add another schema version, review pass, persisted
intermediate, generalized plugin artifact kind, saved validation profile,
provider behavior, or integration surface. It does not require launcher-emitted
dispatch receipts; reintroduce those only when a launcher exists that produces
them itself. It does not change research-pack distribution, documentation,
backlog integrations, `quick`/`standard`/`thorough`, selective blindness,
categorical claim states, honest partial publication, or directory-only
handoff.
