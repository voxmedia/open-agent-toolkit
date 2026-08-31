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
│   ├── locator-validation.json
│   ├── semantic/
│   ├── adversarial/
│   ├── coverage/
│   └── reconciliation.json
└── raw/
    ├── dossiers/
    ├── drafts/
    ├── dispatch/
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

Approval fingerprints use canonical JSON: UTF-8, object keys sorted
lexicographically, array order preserved, no insignificant whitespace, and
SHA-256 with the `sha256:` prefix. The fingerprint covers every selection and
execution axis in the approval envelope.

## Manifest

`recon.packet-manifest` version 1 contains:

- `run`: stable ID, topic, status, requested and achieved profile, timestamps;
- `request`: objective, questions, included/excluded scope, stable context
  references, confirmed output path;
- discriminated `sources`;
- `execution`: exact approval envelope, fingerprint, and immutable dispatch
  receipt references;
- `stages`: `recon.stage-result` records whose single artifact ID, lane, and
  accepted/completed receipt IDs bind every completed pass to one hashed
  same-run artifact of the required kind;
- `artifacts`: direct references; and
- `gaps`: categorical omitted, unavailable, stale, or failed work, each with an
  explicit boolean `material` classification and affected source, claim, and
  coverage-finding IDs when applicable.

Run status is `preparing`, `awaiting-approval`, `running`, `complete`, `partial`,
or `failed`. The validator—not a worker—derives achieved profile.

## Source Descriptors and Locators

All source descriptors carry `kind`, stable `id`, `available`, `authority`,
`observedAt`, and `validationState`.

Validation state is closed to `pinned`, `unpinned`, `stale`, `invalid`, or
`unavailable`. Only an available `pinned` source is assurance-eligible;
everything else requires an explicit affected-source/claim gap.

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

## Claim Ledger

`recon.claim-ledger` version 1 contains run ID, monotonic revision, direct input
references, synthesis, evidence, claims, unresolved questions, and explicit
claim transitions.

Claim states are categorical:

- `provisional`: compiled, not mechanically validated;
- `supported`: supporting evidence and exact locators validate;
- `verified`: independent semantic review affirmed the claim without unresolved
  material challenge;
- `contested`: credible counterevidence or incompatible interpretations remain;
- `unresolved`: available evidence cannot settle the claim; and
- `unsupported`: no valid support remains.

Quick packets never contain `verified` claims. Standard and thorough claims need
recorded independent semantic, adversarial, and coverage reviews. Every review
ID resolves to a unique, complete, typed, hashed result bound to the exact
immutable brief digest and the claim's required disposition. A material
unresolved challenge prevents verification. Review workers propose; only a
reconciler writes a new ledger candidate. Reconciliation binds the prior ledger
reference and revision, the next revision, the incorporated review IDs, and the
exact canonical claim transitions. It also binds additions, removals, and every
prior/current state change; preserves statement, evidence-link, and
qualification continuity; and accepts new evidence only when an incorporated
review supplied the exact record.

## Evidence and Secret Redaction

Evidence records bind a stable ID and source ID to one typed locator, a minimal
display excerpt, observation time, locator-validation state, and provenance
reference. States are `exact`, `redacted-exact`, `stale`, or `invalid`.

Validate a sensitive source span transiently, redact before persistence, and
store `redaction.applied: true`, categories, and
`redaction.originalPersisted: false`. `redacted-exact` stores neither the secret
nor a digest of the sensitive span. Diagnostics must never echo the span.

## Other Artifacts

- `recon.raw-dossier`: assignment identity, mode, inputs/exclusions, findings,
  uncertainty, contradictions, gaps, and outcome.
- `recon.review-brief`: immutable selective-blind projection and digest.
- `recon.review-result`: review kind, lane, exact brief reference,
  permitted/excluded inputs, dispositions, new evidence, coverage findings,
  unresolved issues, and completion status. Reconciliation results replace the
  brief reference with prior-ledger/revision, additions/removals, exact
  transitions, and coverage-disposition bindings. Coverage findings are closed
  records bound to affected claims and exact manifest gaps.
- `recon.stage-result`: stable stage ID, mode, lane, status, exactly one output
  artifact ID, accepted/completed receipt IDs, and safe diagnostics.
- `recon.dispatch-receipt`: immutable prepared, approved, accepted, or terminal
  dispatch evidence.

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
It validates schemas, IDs, references, containment, hashes, source reopening,
locators, approval fingerprint, legal transitions, assurance, and requested vs
achieved profile. Structural failure removes any stale `packet.md`. Only a
valid `complete` or honest `partial` packet is publishable.

`complete` requires the requested profile and no material gap. `partial` is
valid when either a lower profile was achieved or at least one material gap is
declared, including honest same-profile partials.

Use `scripts/render-packet.mjs <packet-dir>` to generate the deterministic
consumer view. It writes a temporary sibling and atomically promotes
`packet.md` only after full validation. Its result is the directory path plus a
compact status summary and digest, never raw dossier content.
