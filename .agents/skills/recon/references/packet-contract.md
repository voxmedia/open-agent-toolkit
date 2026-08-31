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

Approval evidence embeds the existing `oat-dispatch-approval/v1` canonical
prepared projection without reducing or renaming its fields. Fingerprints use
canonical JSON: UTF-8, object keys sorted lexicographically, array order
preserved, no insignificant whitespace, and SHA-256 with the `sha256:` prefix.
The stored canonical JSON text and fingerprint cover the whole projection.
Every `writable_roots`, `escalate_when`, and `candidates_considered` member is a
non-empty string. These arrays use stable sorted-set form: entries are unique
and lexicographically ordered before approval, and packet validation rejects
nulls, empty strings, duplicates, or unstable ordering rather than normalizing
them after approval.

## One Validation Boundary

Version 1 compiles persisted packet inputs exactly once into one non-persisted,
deeply immutable `ValidatedRun`. This value is an internal normalized graph,
not an artifact kind, schema version, file, cache, or caller-selectable profile.
Assurance derivation and rendering accept only `ValidatedRun`; they never
reopen or independently reinterpret raw manifest, ledger, review, receipt, or
reconciliation artifacts.

Construction is all-or-nothing. A valid graph contains:

- one complete `oat-dispatch-approval/v1` projection with its request,
  selection, every planned and conditional wave, per-wave task class and model
  floor, lane scope, authority and authorization scope, writable roots,
  fallback and context controls, payload digest, run maximum floor, pinned
  target, and original live catalog identity;
- one exact approved wave/lane topology, with one terminal stage and matching
  accepted/completed receipt resolution for every required lane;
- exactly one terminal reconciliation for standard or thorough runs and one
  immutable canonical prior-ledger identity used by all review, transition,
  addition, and removal checks;
- canonical absolute realpaths for the packet, repository, file, capture,
  command-output, and publication trust roots, rechecked before use;
- only secret-safe persisted evidence and diagnostics, including ineligible
  audit evidence;
- material gaps derived from stale, invalid, or unavailable canonical sources,
  with exact affected-claim coverage and legal assurance downgrades; and
- derived claim assurance, achieved profile, material gaps, and publication
  status.

Reject partial approval envelopes, omitted receipt axes, unknown selection
shapes, duplicate or shadow reconciliation results, symlink root aliases,
retargeted roots, raw secret-bearing stale excerpts, and caller-downgraded gap
materiality. Equivalent-looking inputs do not excuse a failed invariant.

The approved, accepted, and completed receipts carry the manifest's exact
`approvedAt` value. The accepted and completed receipts also carry one
identical launch-acceptance record, including the accepted child handle; a
different terminal handle is a replacement and fails validation. The catalog
recheck is a distinct observation from the projection's original catalog
observation, occurs strictly after approval and strictly before launch
acceptance, and retains the approved catalog source, context, and relevant
fingerprint. Copied or non-fresh catalog evidence cannot support publication.

## Manifest

`recon.packet-manifest` version 1 contains:

- `run`: stable ID, topic, status, requested and achieved profile, timestamps;
- `request`: objective, questions, included/excluded scope, stable context
  references, confirmed output path;
- discriminated `sources`;
- `execution`: exact prepared projection, canonical JSON, fingerprint,
  explicit-user approval evidence, approval timestamp, and fresh catalog
  recheck. The projection is identical to the dispatch dependency's canonical
  v1 object rather than a packet-local summary;
- `stages`: `recon.stage-result` records whose single artifact ID, lane, and
  exact `waveId` plus prepared/approved/accepted/completed receipt IDs bind
  every completed pass to one hashed same-run artifact of the required kind;
- `artifacts`: direct references; and
- `gaps`: categorical omitted, unavailable, stale, or failed work, each with an
  explicit boolean `material` classification and affected source, claim, and
  coverage-finding IDs when applicable.

Run status is `preparing`, `awaiting-approval`, `running`, `complete`, `partial`,
or `failed`. The validator—not a worker—derives achieved profile.
It derives rigor from the exact required wave/lane/stage multiset, never from a
set of mode names. Every approved required lane has one terminal stage; only
lanes whose typed artifact is named by matching accepted and completed receipts
can contribute to achieved rigor.

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
immutable brief digest, the claim's required disposition, and the matching
accepted/completed stage receipts. An unreceipted result cannot contribute
assurance or reconciliation. A material unresolved challenge or coverage
finding prevents verification. Review workers propose; only a reconciler writes
a new ledger candidate. Reconciliation binds the prior ledger reference and
revision, the next revision, the exact receipted review-result set, and the exact
canonical claim transitions. Standard and thorough output is exactly the next
revision of the bound prior ledger; revision one cannot bypass reconciliation.
It also binds additions, removals, and every prior/current state change;
preserves statement, evidence-link, and qualification continuity; accepts new
evidence only when an incorporated review supplied the exact record; and
requires a receipted typed rejection disposition before removing a prior claim.

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

- `recon.raw-dossier`: assignment identity, mode, inputs/exclusions, findings,
  uncertainty, contradictions, gaps, and outcome.
- `recon.review-brief`: immutable selective-blind projection and digest.
- `recon.review-result`: review kind, lane, exact brief reference,
  permitted/excluded inputs, dispositions, new evidence, coverage findings,
  unresolved issues, and completion status. Reconciliation results replace the
  brief reference with prior-ledger/revision, additions/removals, exact
  transitions, and coverage-disposition bindings. Coverage findings are closed
  records bound to affected claims and exact manifest gaps. Accepted material
  gaps require a legal downgrade for every affected claim; a resolved finding
  instead names exact typed evidence. Thorough redundant verification and
  contradiction resolution are claim-bearing typed review results, not raw
  dossiers: they bind immutable briefs, claim dispositions, and explicit
  affected-contradiction dispositions.
- `recon.stage-result`: stable stage ID, mode, lane, status, exactly one output
  artifact ID, accepted/completed receipt IDs, and safe diagnostics.
- `recon.dispatch-receipt`: immutable prepared, approved, accepted, or
  completed evidence. Every state repeats the exact canonical projection,
  canonical JSON, and fingerprint. Approved and later states bind the same
  explicit approval evidence; accepted and completed states bind the fresh
  catalog recheck and launch acceptance; completed binds the terminal outcome
  and artifact IDs.

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
references, containment, hashes, source reopening, locators, the complete
approval and receipt selection, exact topology, the one terminal
reconciliation, legal transitions, secret-safe persistence, derived gaps,
assurance, and requested vs achieved profile. Structural failure removes any
stale `packet.md`. Only a valid `complete` or honest `partial` packet is
publishable.

`complete` requires the requested profile and no material gap. `partial` is
valid when either a lower profile was achieved or at least one material gap is
declared, including honest same-profile partials.

Use `scripts/render-packet.mjs <packet-dir>` to generate the deterministic
consumer view. Its public path entry point first obtains `ValidatedRun`; the
render core accepts only that graph. It writes a temporary sibling and
atomically promotes `packet.md` only after full validation. Its result is the
directory path plus a compact status summary and digest, never raw dossier
content.

## Version 1 Non-Goals

This boundary does not add another schema version, review pass, persisted
intermediate, generalized plugin artifact kind, saved validation profile,
provider behavior, or integration surface. It does not change p01 dispatch,
research-pack distribution, documentation, backlog integrations,
`quick`/`standard`/`thorough`, selective blindness, categorical claim states,
honest partial publication, or directory-only handoff.
