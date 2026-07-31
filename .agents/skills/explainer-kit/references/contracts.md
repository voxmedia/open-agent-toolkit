# Core run contract

`scripts/run.mjs` is the config-blind orchestration entry point. It reads only
the explicit `ExplainerRunRequestV1`, bundled skill assets, and source paths
named by that request. It does not search for `.oat`, user configuration,
provider configuration, vaults, or destinations.

## Invocation

Programmatic callers import `runExplainer(request, options)`. Command-line
callers use:

```bash
node scripts/run.mjs --request request.json
```

Federated runs require a provider-neutral critic callback. A command-line
caller supplies one with `--critic-module critic.mjs`; the module exports
`critic(request)` or a default function. The callback receives reconciled
claims, sources, overrides, and the freshness policy. It returns:

```json
{
  "criticId": "skeptical-pass",
  "executedAt": "2026-07-17T20:00:00Z",
  "findings": []
}
```

No provider name, command, credential, or dispatch protocol is part of this
contract.

Every run, interactive or unattended, also requires a provider-neutral author
callback; a run without one fails `E_AUTHOR_REQUIRED`. An in-process caller
supplies `options.author(request)`; a JSON-only CLI caller uses
`--author-module author.mjs`. The core invokes it once per resolved artifact
with an `explainer-kit.author-request/v2` payload containing the artifact
identity and type, the artifact's authoring path, the inlined brief, the bundled
`visualAuthoringGuidance`, the reconciled fact base, the resolved theme, the
shell source for artistic artifacts, the required narrative sections for
narrative floor artifacts, and bounded-discovery context. The guidance is
loaded only from the installed skill's `references/visual-authoring.md`; no
ambient or home-directory file is consulted. The callback must return an
`explainer-kit.author-result/v2` carrying exactly one of `content.markdown` or
`content.html`, matching the artifact's declared authoring path, plus non-secret
provenance. The executable callback is never persisted in `run-request.json`.

Project recap requests have an explicit `recapMode`. Omitting it selects and
persists `artistic`, which keeps the recipe's rich HTML floor. Selecting
`deterministic-markdown` before the run applies the recipe-owned fallback to
the complete planned portfolio, including optional expansions, while retaining
the same adaptive hub, architecture, and deck identities. The resulting
Markdown author records and `source/content/*.md` paths remain distinct in the
manifest and immutable rebuild package. An artistic author failure fails the
run; the core never silently retries or downgrades it as Markdown.

Before artifact authoring, a caller supplies one provider-neutral `planSet`
callback. It receives the reconciled fact base and recipe policy and returns
`explainer-kit.set-plan/v1`:

```json
{
  "schemaVersion": "explainer-kit.set-plan/v1",
  "planId": "project-recap-set",
  "recipe": { "id": "project-recap", "version": "1" },
  "sourceIds": ["plan"],
  "ledger": {
    "terminology": [],
    "statuses": [],
    "numbers": []
  },
  "portfolio": [
    {
      "artifactId": "project-recap",
      "artifactType": "hub",
      "profileId": "recap-hub",
      "required": true,
      "sourceIds": ["plan"],
      "draft": "Lead with the validated outcome.",
      "visualIntent": "Orient the reader in the first viewport."
    }
  ]
}
```

The set plan owns the shared terminology/status/number ledger, source coverage,
adaptive portfolio, per-artifact draft, and visual intent. Optional entries add
a source-backed `justification`; undeclared sources, conflicting ledger values,
duplicate artifact IDs, and unjustified optional entries are invalid. Each
`author-request/v2` carries the complete immutable `setContext` plus the exact
matching `plannedArtifact`. The planner finalizes floor and expansion entries
before authoring; author results cannot add, remove, or replace artifacts.
When a planner draft contains a supported non-linear graph, the request also
carries its closed `graphSemantics` (direction, nodes, edges, and topology).
Artistic HTML must expose one exact `data-direction`. Each planned node requires
one observation carrying `data-node`, `data-node-label`, `data-node-shape`, and
`data-node-explicit`; each planned edge requires one observation carrying
`data-from`, `data-to`, `data-edge-kind`, and `data-edge-label`. Values must
match the complete frozen planner tuples exactly, including canonical HTML
attribute escaping and explicit empty edge labels. Missing, extra, duplicate,
malformed, noncanonical, rewired, or semantically drifting observations fail
with `E_DIAGRAM_TOPOLOGY` before browser or visual-critic review.

Visual review uses provider-neutral
`explainer-kit.visual-review-request/v1` and
`explainer-kit.visual-review-result/v1` envelopes. The request combines the
shared plan with rendered artifact paths and viewport evidence, binds every
rendered file, screenshot, and metrics file by raw-byte SHA-256 hash, and
binds the launched Chromium name, version, and stable capture identity from
`explainer-kit.browser-evidence/v2`. It derives a deterministic `requestId` and
canonical `requestHash`. The critic
receives a confined reader for those snapshotted paths and cannot read
unlisted evidence. Core revalidates the bytes after the callback returns.
Before snapshotting, each screenshot must fully decode as a bounded,
CRC-verified, non-interlaced 8-bit RGB or RGBA PNG with exact zlib consumption
and viewport-matched dimensions. The pixel hash established during QA must
match the later visual-review snapshot.
The result must echo the exact request identity and hash, name the complete
artifact set, include artifact-scoped rubric findings, and select exactly one
`pass`, `correct`, or `fail` disposition. Application validation must pass the
reviewed request as `visualReviewRequest` context when validating the result.
Request artifacts must exactly equal the planned portfolio, result artifact IDs
must exactly equal that reviewed set, and every finding must name one of those
artifacts. `pass` permits no findings; `correct` and `fail` require at least one
correction finding. Provider, model, command, credential, and dispatch fields
are not part of any core contract.

Unattended project recaps require retained browser evidence at every required
viewport from a branded session returned by `createBrowserProbeSession()` and a
final visual-critic `pass`. The core derives `runtime.name` and
`runtime.version` from the launched browser instance; caller assertions cannot
replace that identity. Deterministic fixture sessions are explicit and may be
used only in bounded non-production tests. A fixture session, missing trusted
session, visual-critic failure, terminal `fail`, or second `correct` after the
one allowed correction pass closes the QA gate with `built-needs-review`. That
terminal outcome preserves rendered artifacts and all available review
evidence while skipping durability and publish callbacks.

The canonical immutable evidence consumer contract is
`explainer-kit.package-coverage/v2`. It requires one matching launched-Chromium
runtime and capture identity across browser metrics, review requests, retained
attempt copies, manifest hashes, finalization, and archive validation.

## Explicit source forms

- `factBase.mode: supplied` points to a valid `FactBaseV1` JSON file. The core
  performs only the lightweight consistency and freshness check and never
  invokes the critic.
- `factBase.mode: federated` names explicit source bindings. File locators
  contain JSON with a `claims` array of
  `{ "id", "text", "locator"?, "sections"? }`. Optional `sections` values
  are recipe `requiredNarrative` IDs; untagged claims remain shared across
  every required section.
  Non-file bindings require a caller-supplied `sourceLoader(source)` callback.
  Every binding names its recipe `role` and `sourceSetId`. Multiple documents
  may share one source-set ID; recipe cardinality counts distinct sets, not
  documents. The core validates these bindings before loading facts, then
  reconciles the loaded claims and invokes the critic exactly once.

Reviewed GitHub provenance is one indivisible tuple: `repository`, full
lowercase 40-character `revision`, repository-relative `path`, inclusive
`lineRange`, and its exact canonical `url`. Every declared source or citation
backlink must include the complete tuple. The URL authority is
`scripts/lib/source-backlinks.mjs`; it rejects moving refs, dot or empty path
segments, decoded separators, noncanonical percent encoding, credentials,
queries, and tuple/URL mismatches. Adapters must bind facts and hashes to the
exact reviewed Git blob bytes, not mutable working-tree content.

An unattended request asserts that its explicit source artifacts are already
approved. It does not prompt, and it fails before narrative serialization when
the author is absent, returns an invalid result, or copies excessive verbatim
source text. It auto-approves with `auto-drafted` marking once the artifacts are
built and checked.

## Pipeline and retained package

The core executes:

1. validate request and recipe
2. reconcile or check the fact base
3. apply bounded discovery and produce one validated set plan
4. resolve one theme
5. author every planned artifact against the same set context
6. render typed artifacts through the narrative renderer or validate
   agent-composed HTML, per each artifact's declared authoring path
7. run structural and guideline QA, plus required browser and independent
   visual review for unattended project recaps
8. close any unresolved recap review gate before external persistence
9. resolve content approval — the interactive gate pauses here, after render and
   QA and before anything is published or persisted externally
10. write the manifest and build record

An incomplete interactive result includes
`approval.resumeToken: "ekrt2:<64 lowercase hex characters>"`. The token is an
opaque v2 digest over the run ID, original canonical absolute output root, the
raw-byte SHA-256 hash of `run-request.json`, and raw-byte SHA-256 hashes of the
five retained `source/set-plan/*.json` records. It is generated from trusted
in-memory run identity before the interactive pause. The external caller must
retain it outside the run root and echo it unchanged as
`reviewedSource.resumeToken` with the later approval decision.

Resume validates the fixed-length token with a timing-safe comparison before
parsing retained request fields or hydrating set-plan, author, or content
state. Missing, malformed, mismatched, relocated-root, or byte-drifted tokens
fail `E_APPROVAL_RESUME` before planner, author, durability, or publish
callbacks. Only the fixed-format authenticated `ekrt2` token is accepted.
Every `ekrt1` token is rejected, including a correctly derived legacy digest.
Legacy paused runs must restart to obtain an authenticated token; a retained
relative `outputRoot` or any other mutable package state cannot opt into legacy
resume behavior. The token is not written into the run request, content
approval, build record, set-plan projections, manifest, or immutable-hash
inventory.

After authenticating the retained bytes, resume applies initialization's same
canonical privacy-safe request projection to the current request, including the
canonical output root and default render strategy, and requires an exact match
with `run-request.json` before installing current request state or hydrating any
package content. This binds recipe and recap mode, fact-base input, complete
theme and render policy, privacy, public base URL, durability, publish
destination, and run mode. Raw art direction may differ only when
`privacy.retainRawArtDirection` is not `true`, because that deliberately
redacted input is non-semantic after the rendered package has paused.

The run package retains the privacy-safe `run-request.json`,
`source/content-approval.json`, `source/fact-base.json`,
`source/fact-base.md`, authored content under `source/content/*.md` and
`source/content/*.html`, structured `source/author/*.json` results,
`theme.resolved.json`, rendered `site/` files, `manifest.json`, and
`build-record.json` as far as each stage succeeds. A stage failure records a
structured error and recovery action without deleting earlier outputs. Raw art
direction is omitted unless the request explicitly opts in.

`scripts/lib/package-coverage.mjs` is the versioned pure-ESM authority for
required immutable paths. Successful unattended recaps require complete
attempt-1 evidence. Successful interactive recaps require no review paths when
none are retained, but any retained review material requires a complete
attempt. Failed and incomplete packages follow the same no-evidence/complete-
evidence split. Only `built-needs-review` may retain a deliberately partial
chain. Outside that handoff, any attempt-2 material requires complete attempt
1, the revision record, and complete attempt 2.

Build-record stages are terminal once `passed` or `warned`. A rejected run that
is later approved reopens the render and QA stages through a narrowly guarded
record-level reset so the corrected sources are re-rendered and re-validated,
leaving an auditable trail rather than approving stale artifacts.

When a caller supplies `discover({ round, recipe, factBase })`, the callback
returns the findings added in that round. The core stops after two consecutive
empty rounds and always stops at the recipe's `maxRounds`.

## Optional seams

Durability and publishing are never implicit.

`built-needs-review` is not durability-eligible. The core skips both callbacks
for that outcome, and downstream finalizers, exporters, and archive pushers
must reject it rather than converting it to success.

- `durability.strategy: none` invokes neither seam.
- `durability.strategy: commit` invokes the explicit `durability` callback.
  Caller-created commit evidence is subsequently verified with
  `record-durability.mjs`; the core never creates commits. The first evidence
  commit must contain every path and byte hash in `manifest.immutableHashes`:
  the privacy-safe request, content approval, fact-base JSON and Markdown,
  declared author results, all authored content, the resolved theme, and every
  built artifact retained in the package. Mutable `manifest.json` and
  `build-record.json` remain excluded for the separate evidence update.
  Schema-v1 manifests created before complete-package coverage are rejected
  with a legacy-manifest diagnostic and must be regenerated; validators never
  invent missing hashes.
- `durability.strategy: publish` invokes the explicit `publish` callback with
  the complete publish request. A verified receipt is subsequently recorded as
  durability evidence.

CLI callers provide these callbacks only with `--durability-module` and
`--publish-module`. Building remains `built-not-durable` until evidence is
verified. Publishing remains independently human-gated by the caller.

## Result

`runExplainer` returns the run root, manifest path, build-record path, outcome,
warnings, approval status and marking, and bounded-discovery summary. The
marking rides in the result and the approval record only; `manifest/v1` stays
frozen and carries no marking field. Input validation and unsupported
recipes reject before output mutation. Failures after initialization return a
`failed` result with paths to the retained record and intermediates.
`built-needs-review` is a distinct terminal review-gate result, not a synonym
for `built-not-durable`.

V1 readers reject unknown schema majors and unknown contract fields. Relative
record paths are run-root confined, hashes use `sha256:<hex>`, and command
metadata uses argv arrays rather than shell strings.
