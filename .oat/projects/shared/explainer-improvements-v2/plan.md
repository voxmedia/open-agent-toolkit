---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-08-06
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p05'] # pause after the final phase
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [] # fully sequential
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: explainer-improvements-v2

> Revised after p01 to use a thin executable safety kernel and a prose-led
> creative layer. Execute with `oat-project-implement`.

**Goal:** Preserve the core/adapter boundary while closing the Cyclone case
study's path, link, publication, and lifecycle integrity gaps. Raise the
authoring and review floor through skill/recipe prose rather than a new
structured renderer framework.

**Architecture:** `explainer-kit` owns destination-neutral contracts,
validation, durability, and publication. `oat-explainer-kit` owns OAT
topology, config, source binding, and per-invocation destination derivation.
Deterministic code is limited to trust-boundary invariants. Narrative,
typography, composition, artifact selection, diagram quality, and visual
critique remain judgment-oriented prose.

**Tech Stack:** Node.js 22 ESM, `node:test`, JSON Schema, existing browser and
visual-review providers, pnpm/Turborepo, S3 static publishing.

**Commit Convention:** `{type}({task-id}): {description}`

## Scope Revision

The operator approved this reduction on 2026-08-06 after p01:

- retain executable path, link, publication, credential, and lifecycle
  invariants;
- remove structured hub/deck/diagram schemas and renderer engines;
- remove semantic layout and deterministic visual-quality heuristics;
- add no new golden-test infrastructure;
- leave the existing 27-capture golden suite unchanged and track its
  simplification separately;
- express artifact strategy, typography, composition, diagram semantics, and
  visual-review judgment in recipe/brief/skill prose.

The original handoff remains the production evidence base. This approved scope
decision supersedes its prescribed implementation mechanisms where the revised
design explicitly says so.

## Execution

All phases are sequential. p01 is complete and independently reviewed. Before
p02 begins, this revised design and plan receive one delta-focused artifact
review for requirement coverage, safety, compatibility, and honest deferrals.
Only Critical/Important findings block execution.

RED/GREEN/Refactor is the default for executable behavior. Prose and contract
tasks use focused conformance checks. Each task has one atomic commit; bounded
review corrections remain append-only.

## Phase 1: Adapter paths and destination derivation

**Status:** completed
**Review:** passed

### Task p01-t01: Derive per-invocation publish destination (completed)

**Outcome:** Project runs append encoded `projects/<slug>`; repository/direct
runs retain repository roots.

**Commit:** `84a5b4a`

### Task p01-t02: Validate complete publish config (completed)

**Outcome:** Partial config is build-only; complete config and source-aware
`publicAccess` are validated through adapter and CLI surfaces.

**Commit:** `3a634e0`

### Task p01-t03: Accept repository explainer invocations (completed)

**Outcome:** Repository runs require a supplied reviewed fact base and never
fall back to an active project.

**Commit:** `ab12256`

### Task p01-t04: Reject double-nested output roots (completed)

**Outcome:** The core confinement boundary rejects roots that already end in
the run slug before directory creation.

**Commit:** `aa1ec2d`

### Task p01-t05: Thread derived roots into core requests (completed)

**Outcome:** Core requests receive only derived roots, without OAT topology or
premature `publicAccess`.

**Commit:** `a42a385`

### Task p01-t06: Reject credential-bearing publish roots (completed)

**Outcome:** Credential-bearing, malformed-authority, query, fragment, and
normalized-away delimiter forms fail before core invocation or request
persistence.

**Commits:** `fcc100f`, append-only review correction `c1d5a1b`

**Verification:** Focused adapter tests, full adapter suite, CLI tests, lint,
format, and focused re-review passed.

---

## Phase 2: Canonical links and hard validation

Write boundary: `.agents/skills/explainer-kit/**` plus the adapter completion
callback fixture that consumes author requests.

### Task p02-t01: Add canonical artifact links to author requests

**Files:**

- Core author-request construction and set-plan helpers
- New immutable `author-request/v3` schema and registry/docs
- Focused contract, schema, and run-integration tests
- Adapter completion callback acceptance fixture

**Step 1: Write tests (RED)**

Prove each planned artifact receives a site-relative path ending in explicit
`index.html` and each author receives correct relative links from its own
artifact location. Retain Markdown and HTML authoring. Existing v2 requests
must remain valid for replay.

**Step 2: Implement (GREEN)**

Create the complete v3 request once, add the canonical link table, register it,
and emit it for new runs. Do not add structured-authoring, theme, renderer, or
set-plan contracts.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "feat(p02-t01): provide canonical artifact links to authors"
```

### Task p02-t02: Enforce post-render internal-link validation

**Files:**

- New bounded internal-reference validator
- Render/run gate integration and existing correction seam
- Unit and integration tests plus contract guidance

**Step 1: Write tests (RED)**

Cover valid explicit-file links, relative links, fragments with existing
targets, `src`/`srcset`, and explicitly safe embedded references. Reject
directory-style links, traversal, missing files, missing fragments, malformed
references, and links that escape the site root.

Integration tests prove validation runs before browser/visual review and
durability. One correction may rerender and revalidate; exhaustion records the
finding and cannot become durability-eligible as clean.

**Step 2: Implement (GREEN)**

Use a bounded fail-closed tokenizer/classifier; do not add an HTML parser
dependency. Anchor resolution to the manifest and generated site tree.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/link-validation.test.mjs .agents/skills/explainer-kit/tests/render.test.mjs .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "feat(p02-t02): gate rendered artifacts on valid internal links"
```

---

## Phase 3: Publication integrity

**Status:** completed
**Review:** passed

Write boundary: core publication contracts/connectors, adapter publication
threading and compatibility floor, lifecycle URL summaries, release/smoke
receipt consumers, and one cross-boundary acceptance fixture.

### Task p03-t01: Make public-access behavior explicit and verifiable

**Files:**

- New immutable `publish-request/v2` schema and registry/docs
- `run-request/v1` embedded publish-request v1/v2 compatibility
- Core version, adapter minimum-core floor, and compatibility tests/docs
- Core publisher and S3 connector
- Adapter request threading
- Focused core/adapter tests

**Step 1: Write tests (RED)**

Cover public and protected modes. Public mode requires exact object-byte
verification plus anonymous public fetch. Protected mode requires authenticated
service-computed checksum verification or authenticated download hashing and
records public fetch as skipped-protected. Undeclared 401/403 fails closed.
Credentials must never be persisted.

**Step 2: Implement (GREEN)**

Thread source-aware `publicAccess` only after the core accepts v2. Preserve v1
request replay, make `run-request/v1` accept embedded publish-request v1/v2,
and advance the core version plus adapter minimum floor before the adapter emits
v2. Keep the human publication gate and reject execution before upload when
required verification capability is unavailable.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/config-paths.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/check-core.test.mjs && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "feat(p03-t01): verify public and protected publish destinations"
```

### Task p03-t02: Emit complete exact-byte publication receipts

**Files:**

- New immutable `publish-receipt/v2` schema and registry/docs
- Publisher, connector, URL composition, and lifecycle summary seams
- Release validation, RC, and private-wrapper smoke receipt readers
- Shipped receipt consumers and focused tests

**Step 1: Write tests (RED)**

Require exact one-to-one receipt coverage for every manifest artifact and each
generated auxiliary object such as `catalog.json`. Record relative path, S3
URI, canonical public URL, manifest hash, content type, and separate
object/public verification facts. Public and protected modes must be
unambiguous. V1 remains readable.

**Step 2: Implement (GREEN)**

Upload finalized bytes unchanged, compare verification evidence to manifest
hashes, centralize URL/path composition, and expose complete artifact URL sets
to lifecycle summaries. Migrate release and smoke readers in the same commit
that first emits receipt v2.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/*.test.mjs .agents/skills/oat-explainer-kit/tests/*.test.mjs && pnpm --filter @open-agent-toolkit/cli test && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "feat(p03-t02): record complete exact-byte publish receipts"
```

### Task p03-t03: Prove the adapter-to-destination publication boundary

**Files:**

- One fake-destination acceptance test and minimal fixture support

**Step 1: Write acceptance test (RED)**

Exercise project and repository invocations across adapter and core. Assert
derived prefixes, explicit `index.html`, unchanged bytes, manifest/hash
equality, canonical URLs, protected/public verification behavior, catalog
coverage, and no credentials or topology leakage.

**Step 2: Implement only required fixture seams (GREEN)**

Avoid new production abstractions unless the acceptance test exposes a real
missing seam.

**Step 3: Verify**

Run:
`node --test .agents/skills/oat-explainer-kit/tests/publish-boundary.acceptance.test.mjs .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "test(p03-t03): cover cross-boundary publication integrity"
```

### Task p03-t04: (review) Make complete v2 receipts durability-eligible

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/durability.mjs`
- Modify: `.agents/skills/explainer-kit/tests/durability.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`

**Step 1: Write tests (RED)**

Start from the built-in connector's real public and protected
`publish-receipt/v2` shapes. Prove complete manifest plus generated-catalog
evidence is durability-eligible, while wrong catalog paths, sources, serialized
byte hashes, or verification facts fail closed.

**Step 2: Implement fix (GREEN)**

Derive the exact generated catalog path and serialized-byte hash from the
finalized manifest and public root. Pass that evidence as `catalogArtifact`
during durability cross-record validation without weakening v1 replay or exact
manifest coverage.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/durability.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/s3-static.test.mjs && pnpm lint && pnpm format`

Expected: real public/protected v2 receipts become durability-eligible only
when manifest and catalog evidence match exactly; all focused checks pass.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/durability.mjs .agents/skills/explainer-kit/tests/durability.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs
git commit -m "fix(p03-t04): make complete v2 receipts durability eligible"
```

### Task p03-t05: (review) Reject incomplete callback receipts in the core

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`

**Step 1: Write tests (RED)**

At the provider-neutral callback boundary, reject schema-valid v2 receipts with
missing, duplicate, foreign-source, wrong-hash, or missing-catalog entries.
Retain positive public/protected callback cases and v1 replay.

**Step 2: Implement fix (GREEN)**

Retain finalized manifest and catalog evidence around publisher callback
execution. Run complete cross-record validation before assigning
`state.publication`; schema-only validation must not authorize a publication
summary.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/publish-boundary.acceptance.test.mjs && pnpm lint && pnpm format`

Expected: incomplete or contradictory callback receipts fail before publication
state is recorded, and valid v1/v2 paths pass.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs
git commit -m "fix(p03-t05): reject incomplete callback receipts"
```

### Task p03-t06: (review) Accept publish-request v2 in the packaged RC runner

**Files:**

- Modify: `tools/release/run-explainer-rc.mjs`
- Modify: `tools/release/run-explainer-rc.test.mjs`

**Step 1: Write tests (RED)**

Add direct packaged-execution cases for publish-request v1 replay and v2
production. Preserve exact request schema and manifest-hash binding in both
cases.

**Step 2: Implement fix (GREEN)**

Dispatch `scripts/publish.mjs` for both supported request versions instead of
hard-coding v1. Reject unknown versions and mismatched schema/hash evidence.

**Step 3: Verify**

Run:
`node --test tools/release/run-explainer-rc.test.mjs tools/release/validate-explainer-acceptance.test.mjs && pnpm lint && pnpm format`

Expected: packaged direct publication accepts valid v1 and v2 requests and
continues to reject unsupported or incorrectly bound requests.

**Step 4: Commit**

```bash
git add tools/release/run-explainer-rc.mjs tools/release/run-explainer-rc.test.mjs
git commit -m "fix(p03-t06): accept publish request v2 in packaged RC runs"
```

### Task p03-t07: (review) Preserve complete publication evidence in lifecycle summaries

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`

**Step 1: Write tests (RED)**

Assert every lifecycle publication summary entry retains receipt source
identity, rendered path, S3 URI, canonical public URL, content hash, and
separate object/public verification facts through both core and adapter
integration surfaces.

**Step 2: Implement fix (GREEN)**

Build lifecycle summaries from the complete validated receipt entries rather
than reducing them to `relativePath` and `publicUrl`. Version the summary only
if required to preserve replay compatibility; keep the adapter as a
destination-neutral forwarder.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/publish-boundary.acceptance.test.mjs && pnpm lint && pnpm format`

Expected: all required artifact and verification evidence survives the
lifecycle handoff without adapter-owned reinterpretation.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs
git commit -m "fix(p03-t07): preserve publication evidence in summaries"
```

### Task p03-t08: (review) Enforce one-to-one validation in the private wrapper

**Files:**

- Modify: `tools/smoke/explainer-kit/fixtures/private-wrapper.mjs`
- Modify: `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs`

**Step 1: Write tests (RED)**

Add receipt-v2 mutations for duplicate coverage, missing manifest entries,
wrong `artifactId` or source, wrong path/hash/verification facts, and missing or
misidentified catalog evidence. Each mutation must be rejected.

**Step 2: Implement fix (GREEN)**

Reuse the closed receipt validator where the wrapper boundary permits it, or
apply the same unique path/source/hash/verification/catalog invariants in the
fixture reader. Preserve valid v1 replay and valid v2 public/protected reads.

**Step 3: Verify**

Run:
`node --test tools/smoke/explainer-kit/wrapper-compatibility.test.mjs tools/smoke/explainer-kit/publish-boundary.test.mjs && pnpm lint && pnpm format`

Expected: the private-wrapper compatibility oracle rejects every incomplete or
ambiguous v2 receipt shape and accepts the supported complete shapes.

**Step 4: Commit**

```bash
git add tools/smoke/explainer-kit/fixtures/private-wrapper.mjs tools/smoke/explainer-kit/wrapper-compatibility.test.mjs
git commit -m "fix(p03-t08): validate private wrapper receipts one to one"
```

### Task p03-t09: (review) Document publish-request and receipt v2 compatibility

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`
- Modify: `.agents/skills/explainer-kit/references/extension-contract.md`
- Modify: focused contract-guidance tests for both canonical skills

**Step 1: Write focused checks (RED)**

Require shipped guidance to state that new adapter runs emit
publish-request v2, wrappers consume complete publish-receipt v2 evidence, and
v1 request/receipt replay remains supported. Reject the stale statements that
`publicAccess` is not emitted or that wrappers produce only
`PublishReceiptV1`.

**Step 2: Implement fix (GREEN)**

Align both canonical contract references with the executable v2 producer and
consumer policy. Keep v1 replay explicit and do not imply in-place mutation of
either immutable contract.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs && pnpm lint && pnpm format`

Expected: focused guidance checks pass and shipped prose matches the live
v2-with-v1-replay behavior.

**Step 4: Commit**

```bash
git add .agents/skills/oat-explainer-kit/references/lifecycle-contract.md .agents/skills/explainer-kit/references/extension-contract.md .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs
git commit -m "docs(p03-t09): document v2 publication compatibility"
```

### Task p03-t10: (review) Classify invalid v2 publication roots as publish failures

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`

**Step 1: Write focused integration test (RED)**

Add a callback-boundary case whose publish-receipt v2 is schema-valid but whose
`roots.publicBaseUrl` cannot be normalized because it contains a query. Prove
the run fails closed with `outcome: failed`, the publish-scoped `E_PUBLISH`
code, and no recorded publication state instead of leaking a bare `E_RUN`.
Retain the existing public URL query/fragment rejection policy and valid
publish-receipt v1 replay coverage.

**Step 2: Implement fix (GREEN)**

Catch catalog derivation failure in `publicationValidationContext` and rethrow
it through the repository's coded publish-error path. Do not relax URL
normalization, receipt cross-record validation, query/fragment policy, or v1
replay.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/run.integration.test.mjs && pnpm lint && pnpm format`

Expected: the focused non-normalizable v2 root reports `E_PUBLISH` and records
no publication; valid public/protected v2 callbacks, query/fragment policy, and
v1 replay remain green.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs
git commit -m "fix(p03-t10): classify invalid publication roots as publish failures"
```

### Task p03-t11: (review) Document publication summary v1/v2 compatibility

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`

**Step 1: Write focused guidance assertion (RED)**

Require the lifecycle contract to name
`explainer-kit.publish-summary/v2`, enumerate its retained source identity,
rendered path, S3 URI, canonical public URL, hash, and object/public
verification evidence, and state that publish-receipt v1 replay yields the
reduced `explainer-kit.publish-summary/v1` shape.

**Step 2: Update guidance (GREEN)**

Document the v2 lifecycle handoff without destination reinterpretation and make
the v1/v2 summary compatibility rule explicit. Do not imply that either
immutable summary shape is mutated in place.

**Step 3: Verify**

Run:
`node --test .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs && pnpm lint && pnpm format`

Expected: the focused guidance assertion passes and the lifecycle contract
explicitly documents v2 production plus reduced v1 replay compatibility.

**Step 4: Commit**

```bash
git add .agents/skills/oat-explainer-kit/references/lifecycle-contract.md .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs
git commit -m "docs(p03-t11): document publication summary compatibility"
```

---

## Phase 4: Lifecycle and bounded recovery

Write boundary: core request validation/records, correction and durability
seams, publisher entry points/connectors, adapter finalization, CLI archive
verification, and the two project completion routes.

### Task p04-t01: Validate `sourceIds` before content processing

**Files:**

- Set-plan request/callback and returned-plan validation seams
- Adapter callback fixture for the production request shape
- Regression unit and adapter-to-core integration tests

**Step 1: Reproduce (RED)**

Reproduce the exact failing callback/request shape before choosing the fix.
Determine whether the producer must supply top-level `sourceIds` or the callback
must consume `factBase.sources`, and pin that boundary in an adapter-to-core
regression. Also cover missing, scalar, null, and invalid source IDs in returned
plans with actionable rejection before content processing.

**Step 2: Implement (GREEN)**

Correct the observed producer/consumer mismatch at its owning boundary.
Validate only arrays in returned plans; do not silently coerce malformed input
or weaken provenance.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/e2e-recap.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "fix(p04-t01): validate source IDs before content processing"
```

### Task p04-t02: Require a terminal recap outcome before approval

**Files:**

- Shared terminal-outcome guard
- Project implementation/completion lifecycle callers
- Route-level tests

**Step 1: Write tests (RED)**

When recap intent is `generate`, both completion routes must reject missing or
`incomplete` outcomes. Existing `built-durable`, `built-not-durable`,
`built-needs-review`, and `failed` outcomes are terminal. Approval waits for
the outcome record, not visual perfection.

**Step 2: Implement (GREEN)**

Use one shared guard invoked by both callers before final approval is recorded.
Do not duplicate lifecycle policy in prose-only call sites.

**Step 3: Verify**

Run:
`node --test .agents/skills/oat-project-implement/tests/check-terminal-outcome.test.mjs .agents/skills/oat-project-complete/tests/check-terminal-outcome.test.mjs && pnpm --filter @open-agent-toolkit/cli test && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "feat(p04-t02): gate approval on terminal recap outcomes"
```

### Task p04-t03: Bound correction and retain compact failure evidence

**Files:**

- Existing correction/finalize/durability records
- Publisher denial checks
- Archive verification and lifecycle integration tests

**Step 1: Write tests (RED)**

Prove a flagged run gets at most one rebuild/review correction. A remaining
flag, failure, or superseded outcome retains a compact record with run identity,
manifest hash when available, findings/error, and evidence disposition.
Flagged/failed/superseded manifests are categorically rejected at every publish
entry point. `built-not-durable` is also unpublishable. Review-clean
`built-durable` runs remain publishable only through the human gate.

**Step 2: Implement (GREEN)**

Reuse existing records and correction machinery where possible. Add a new
failure-record version only if the existing durable shape cannot represent the
required facts without ambiguity. Do not add override records or credentials.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/durability.test.mjs .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs && pnpm --filter @open-agent-toolkit/cli test && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "feat(p04-t03): bound recap correction and retain failure evidence"
```

### Task p04-t04: Replace retained provider text with closed local evidence

**Files:**

- `.agents/skills/explainer-kit/schemas/terminal-evidence.v1.schema.json`
- `.agents/skills/explainer-kit/schemas/visual-review-evidence.v1.schema.json`
- `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- `.agents/skills/explainer-kit/scripts/lib/terminal-evidence.mjs`
- `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- `.agents/skills/explainer-kit/scripts/lib/package-coverage.mjs`
- `.agents/skills/explainer-kit/scripts/lib/visual-review.mjs`
- `.agents/skills/explainer-kit/scripts/run.mjs`
- `.agents/skills/explainer-kit/tests/schemas.test.mjs`
- `.agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs`
- `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`
- `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
- `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs`
- `packages/cli/src/commands/project/archive/explainer-terminal-evidence.ts`
- `packages/cli/src/commands/project/archive/archive-utils.ts`
- Focused core, adapter, archive, and retained-tree regression tests

**Step 1: Write tests (RED)**

Inject arbitrary unique canary strings through visual-review, browser,
durability, warning, finding, thrown-value, and terminal-evidence paths. Assert
their exact bytes never occur in any retained file, manifest, warning, archive
export, or returned loggable result. Reproduce the final review's nested JSON,
double-escaped key, YAML complex-key, and standalone-token examples, but make
the invariant independent of a finite credential-pattern inventory.

Run both core and adapter CLI entry points with captured stdout/stderr and assert
the exact canary bytes are absent from each stream. Include successful,
correctable, terminally flagged, provider-failed, and caught-error paths.

Require terminal evidence and returned lifecycle summaries to contain only
closed locally generated reason/finding codes, validated local identifiers,
bounded positive counts, and outcomes/dispositions. Unknown or diagnostic
free-text fields fail schema/semantic validation.

**Step 2: Implement (GREEN)**

Project provider diagnostic/review results and arbitrary thrown values to stable
local codes at the provider boundary, preserve raw diagnostic prose only
ephemerally for the in-memory correction attempt, and discard it before any
persistence or loggable return. Intended authored artifact content remains in
scope and continues through its existing source, validation, and review gates.
Remove best-effort text scrubbing as the durable security boundary.

Represent retained reasons as a closed `stage` + `kind` pair. `stage` is one of
`planning`, `authoring`, `rendering`, `link-validation`, `browser-review`,
`visual-review`, `durability`, or `finalization`; `kind` is one of `finding`,
`provider-failure`, `pipeline-failure`, or `superseded`. Permit only
manifest-validated artifact IDs and bounded counts beyond the existing
run/manifest/outcome/disposition fields. Do not retain generic message,
description, evidence, correction, details, metadata, or arbitrary code fields.

Implement the exact `terminal-evidence/v1` post-image from `design.md`: required
`schemaVersion`, `runId`, `outcome`, `reasons`, and `evidenceDisposition`;
optional `manifestHash` and conditional `supersededBy`; 1–50 unique reason
tuples with integer counts from 1–50 and total count at most 50; manifest
artifact membership; outcome/kind constraints; and supersession conditionals.
Reject every legacy or unknown nested field.

For supersession, replace all prior reasons with exactly one
`finalization`/`superseded` reason with count 1 and no artifact ID.
`supersededBy` is exactly `{ runId, manifestHash }`, rejects extra fields,
requires a replacement run distinct from the original, and is present if and
only if disposition is `superseded`. Forbid `kind: superseded` for every other
disposition. Supersession preserves the original `built-needs-review` or
`failed` outcome, and these supersession rules take precedence: apply ordinary
outcome-specific reason-kind requirements only when disposition is not
`superseded`.

Keep provider `visual-review-result/v1` ephemeral. Persist only the exact new
`visual-review-evidence/v1` projection: `schemaVersion`, `requestHash`,
`attempt`, `disposition`, and `reasons`, with `pass`/`correct`/`failed`
cardinality and reason-kind conditionals defined in `design.md`. Migrate
`package-coverage.mjs`, retained review-attempt records, archive fixtures, and
lifecycle guidance atomically while preserving request/hash identity and the
successful-package terminal-pass requirement.

Visual retained `reasons` is independently 0–50: pass requires exactly zero,
while correct/failed require 1–50. Share only per-reason count bounds, total
count cap, tuple uniqueness, artifact membership, and unknown-field rules with
terminal evidence. Require the retained `requestHash` to equal its adjacent
request's canonical hash and `attempt` to equal the `attempt-N` directory.

Refactor `visual-review.mjs` so the caller retains validated request identity
when the critic throws; do not duplicate request construction in `run.mjs` or
`records.mjs`. Persist a local `visual-review`/`provider-failure` reason without
the caught provider text.

Finalize the unreleased `terminal-evidence/v1` schema in its code-only shape and
migrate all producers/consumers atomically. No released consumer depends on the
superseded pre-release shape, so do not mint or ship an unsafe compatibility
version. Archive/finalizer readers reject unknown free-text fields.

Replace adapter message-based branching and raw caught-error serialization with
the same locally generated stage/kind projection. Returned core/adapter results
and CLI stdout/stderr may expose closed codes and structural facts only.

Add schema/semantic coverage for registry resolution, forbidden legacy and
unknown nested fields, reason cardinality, per-reason and total count bounds,
duplicate tuples, foreign artifact IDs, run/manifest binding, every
outcome/disposition/supersession conditional, and every retained visual-review
disposition, request-hash, and attempt-directory conditional. Include positive
and negative cases for supersession at a prior reason total of 50, for
superseding each permitted original outcome, and for enforcing ordinary
outcome-specific reason kinds on every non-superseded record.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/schemas.test.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/durability.test.mjs .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs .agents/skills/oat-project-implement/tests/check-terminal-outcome.test.mjs .agents/skills/oat-project-complete/tests/check-terminal-outcome.test.mjs && pnpm --dir packages/cli exec vitest run src/commands/project/archive/archive-utils.test.ts && pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "fix(p04-t04): retain code-only terminal evidence"
```

### Task p04-t05: (review) Enforce the exact retained run-package inventory

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/package-coverage.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`

**Step 1: Write focused retained-tree and archive tests (RED)**

Have the durability callback write a unique exact-byte canary to an
unmanifested file through its supplied `runRoot` on both return and throw paths.
Prove the file cannot survive in the retained local run tree or enter an
archive export. Add archive cases with extra source and staged entries, and
assert the exported tree contains exactly the permitted package inventory.

Cover every provider callback that receives a run-package filesystem path so
the check cannot be bypassed through a sibling boundary.

**Step 2: Implement the exact package inventory (GREEN)**

Define one closed permissible run-package inventory from manifest-declared
authored artifacts plus the validated request, immutable records, closed
mutable review records, and terminal evidence required by the lifecycle.
Reject directories, files, and links outside that inventory after every
filesystem-capable provider boundary, including throw paths, and before a run
becomes retained.

At archive time, validate the source and staged trees against the same
inventory and copy only verified allowed paths. Do not recursively promote
undeclared files, and do not delete intended authored artifacts declared by the
manifest.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/durability.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs && pnpm --dir packages/cli exec vitest run src/commands/project/archive/archive-utils.test.ts && pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm lint && pnpm format`

Expected: both durability paths fail closed without retaining the canary,
source/staged archive extras are rejected, the archive has the exact allowed
tree, and all repository gates pass.

**Step 4: Commit**

```bash
git commit -m "fix(p04-t05): enforce retained package inventory"
```

### Task p04-t06: (review) Inject every CLI stream canary scenario

**Files:**

- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
- Modify runtime seams only if a genuine injected canary escapes

**Step 1: Make every matrix row a genuine injection test (RED)**

For every core and adapter success, correctable, terminally flagged,
provider-failed, and caught-error scenario, inject that row's unique exact-byte
canary through a realistic provider-originated field, callback value, or thrown
value before invoking the CLI. Assert the complete captured stdout and stderr
do not contain the canary.

Require the test to prove the canary entered the mocked execution path so a
canary-free fixture cannot satisfy the assertion accidentally.

**Step 2: Close any exposed stream seam (GREEN)**

If genuine injection reveals a leak, project the affected provider value to
the existing closed local code and structural-fact result at its owning
boundary. Do not add pattern scrubbing, weaken assertions, or serialize raw
caught errors.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs && pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm lint && pnpm format`

Expected: every named matrix row proves real canary injection and complete
stdout/stderr non-retention, with all repository gates passing.

**Step 4: Commit**

```bash
git commit -m "test(p04-t06): inject every CLI stream canary"
```

---

## Phase 5: Prose-led authoring and release closure

Write boundary: canonical skill/recipe guidance, affected docs and consumers,
provider-linked views, and lockstep package versions.

### Task p05-t01: Ship the prose-led project recap recipe

**Files:**

- New immutable `project-recap@2` recipe and recipe registry
- Core and adapter skill/brief guidance
- Adapter recipe selection in `resolve-config.mjs`
- Focused recipe/replay and adapter tests

**Step 1: Write tests (RED)**

V2 requires a navigational hub. Diagram, deck, or deep-dive expansion requires
a distinct reader question, evidence, and rationale. V1 remains replayable.
New runs emit the final v2 shape atomically, including the live adapter recipe
selection that currently pins project recaps to v1.

**Step 2: Implement (GREEN)**

Put narrative purpose, typographic roles, hierarchy, slide archetypes, diagram
semantics, fit-to-content, density, repetition, and medium choice in prose.
Continue authoring with Markdown or HTML. Do not add structured content,
renderer, theme, layout, or anti-filler schemas/scripts.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/recipes.test.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/e2e-recap.test.mjs .agents/skills/oat-explainer-kit/tests/config-paths.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "feat(p05-t01): add prose-led project recap recipe"
```

### Task p05-t02: Strengthen visual-review judgment in prose

**Files:**

- Core/adapter critic and visual-authoring guidance
- Existing visual-review tests
- Targeted OAT docs pages and generated docs index

**Step 1: Write focused checks (RED)**

Require guidance to address typography, hierarchy, composition, density,
medium leverage, template repetition, diagram semantics, and cross-artifact
cohesion. Preserve the existing critic result contract and actionable
`pass`/`correct` behavior.

**Step 2: Implement (GREEN)**

Update critic/skill prose and docs. Do not encode design judgment as numeric
thresholds or deterministic geometry checks. Do not add or expand golden
fixtures. Document the separate golden-suite simplification follow-up.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/qa.test.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs && pnpm run cli -- docs generate-index && pnpm check && pnpm build:docs && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "docs(p05-t02): strengthen prose-led visual review"
```

### Task p05-t03: Synchronize versions and validate release

**Files:**

- Changed canonical skill frontmatter versions
- Provider-linked skill views generated by `oat sync --scope all`
- Lockstep public package versions and release metadata
- Remaining shipped guidance/consumer compatibility assertions

**Step 1: Prepare release**

Bump each changed canonical skill once for the final PR diff. Synchronize
provider views. Bump all five public packages together because bundled skills
and docs are shipped CLI assets.

**Step 2: Verify compatibility**

Confirm old contract/recipe replay, new producer/consumer compatibility,
adapter minimum-core floor, bundled assets, and repository-wide references to
superseded versions.

**Step 3: Run completion gates**

Run, in order:

1. `pnpm check`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`
5. `pnpm lint`
6. `pnpm format`
7. `pnpm build:docs`
8. `pnpm release:validate`

**Step 4: Commit**

```bash
git commit -m "chore(p05-t03): synchronize explainer release versions"
```

### Task p05-t04: (review) Align shipped core recap guidance with recipe v2

**Files:**

- Modify: `.agents/skills/explainer-kit/references/contracts.md`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`

**Step 1: Write a shipped-guidance assertion (RED)**

Require the current recap-mode contract paragraph and set-plan example to
select `project-recap@2`, describe the navigational hub as the only mandatory
artifact, and permit diagram, deck, or deep-dive expansion only for a distinct
reader question with evidence and rationale. Require v1 to appear only as
immutable replay guidance.

**Step 2: Align the core contract reference (GREEN)**

Replace the legacy fixed hub/architecture/deck language and v1 new-run example
with the v2 prose-led policy. Preserve explicit v1 replay compatibility without
presenting v1 as the current producer choice. Do not change recipe schemas,
runtime selection, or visual-review contracts.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/recipes.test.mjs .agents/skills/oat-explainer-kit/tests/config-paths.test.mjs && pnpm check && pnpm build:docs && pnpm release:validate && pnpm lint && pnpm format`

Expected: shipped guidance and current producer selection agree on v2, v1
replay remains explicit, and release/docs gates pass.

**Step 4: Commit**

```bash
git commit -m "docs(p05-t04): align recap contract with recipe v2"
```

---

## Phase 6: Final review fixes

Write boundary: final security, release-gate, scenario-coverage, review-ledger,
and completion-bookkeeping findings confirmed by the reconciled final review.

### Task p06-t01: (final review) Reject unsafe and divergent S3 roots

**Findings:** C1, M3, m2

**Files:**

- `.agents/skills/explainer-kit/schemas/publish-request.v2.schema.json`
- `.agents/skills/explainer-kit/schemas/publish-receipt.v2.schema.json`
- `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- `.agents/skills/explainer-kit/scripts/lib/s3-static.mjs`
- Core, wrapper, schema, connector, retained-tree, and CLI regression tests

**Step 1: Write security and parity tests (RED)**

Inject credential-bearing S3 authorities through direct core, connector,
callback/wrapper, retained request/receipt, returned summary, CLI output, and
AWS argv paths. Require rejection before run initialization or process launch.
Cover raw and encoded userinfo/delimiters, authority colons, query/fragment
forms, invalid bucket names, literal and encoded dot/separator segments,
repeated slashes, and public/protected artifact/catalog composition.

**Step 2: Implement one semantic S3-root boundary (GREEN)**

Use one semantic validator from request validation through connector,
callback/wrapper receipt validation, and publication composition. Tighten both
v2 schemas, preserve normal roots and v1 replay, reject divergent roots before
network use, and remove the dead third `{ cause }` argument without exposing
provider text.

**Step 3: Verify**

Run focused schema/contract/S3/core/wrapper suites, then:
`pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm lint && pnpm format && pnpm release:validate`

**Step 4: Commit**

```bash
git commit -m "fix(p06-t01): reject unsafe S3 publication roots"
```

### Task p06-t02: (final review) Repair the packaged-RC v2 acceptance gate

**Finding:** I1

**Files:**

- `tools/release/run-explainer-rc.integration.test.mjs`
- `tools/release/validate-explainer-acceptance.test.mjs`
- Production catalog helpers only if required to avoid fixture drift

**Step 1: Add an ordinary fixture-contract test (RED)**

Prove the current v2 fixture is invalid because it omits the required auxiliary
catalog. The non-opt-in test must validate exact count, source identity,
initiative path, hash, and object/public verification so ordinary CI catches
future arithmetic or shape drift.

> **Correction (p07-t05).** When this rationale was written, no repository gate
> executed `tools/release/*.test.mjs`, so "ordinary CI catches future arithmetic
> or shape drift" was false: `pnpm test` resolved to
> `turbo run test && pnpm test:smoke`, which reached four vitest packages and
> the smoke globs only. The claim holds from p07-t05 onward, which adds
> `test:skills` and `test:release` to the root `test` script that CI already
> runs. `test:release` names its four suites explicitly rather than globbing
> `tools/release/*.test.mjs`, because `validate-explainer-visuals.test.mjs`
> launches Playwright's `chrome-headless-shell` and CI installs no browsers;
> 7 of its 12 tests fail on any machine without that binary. That suite stays
> outside the gates and remains covered by `pnpm release:validate`, which
> exercises the production script rather than these unit tests.

**Step 2: Build the fixture from the production catalog contract (GREEN)**

Generate exactly one `source.kind: auxiliary`, `source.name: catalog` artifact
at `site/initiatives/<slug>/catalog.json` with complete v2 verification. Do not
relax the acceptance validator.

**Step 3: Verify**

Run the ordinary release tests and the opt-in real packaged-RC integration
against a clean frozen repository, retaining the passing command/result. Then
run `pnpm release:validate`, `pnpm lint`, and `pnpm format`.

**Step 4: Commit**

```bash
git commit -m "test(p06-t02): repair packaged RC acceptance fixture"
```

### Task p06-t03: (final review) Reconcile the p04 review ledger

**Finding:** M1

**Files:**

- `.oat/projects/shared/explainer-improvements-v2/plan.md`
- `.oat/projects/shared/explainer-improvements-v2/implementation.md`

**Step 1: Inventory immutable p04 review events**

Read every archived p04 code-review artifact at `003711`, `010500`, `013800`,
`021700`, `185131`, and `200546`; capture each exact scope, full reviewed head,
invocation, finding disposition, and relationship to its fix range.

**Step 2: Repair ledger and narrative**

Append the three missing failed p04 events with accurate monotonic statuses and
add an explicit scope-alias/reconciliation row stating that the immutable
`p04-t04` artifact at `200546` is the terminal p04-t05/p04-t06 re-review. Do
not rewrite or relabel archived artifacts.

**Step 3: Verify**

Run plan validation, Markdown formatting, and a deterministic audit that every
archived p04 code review has a ledger event with exact head/provenance.

**Step 4: Commit**

```bash
git commit -m "chore(p06-t03): reconcile p04 review ledger"
```

### Task p06-t04: (final review) Complete CLI canary coverage

**Findings:** M2, m3

**Files:**

- `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
- Runtime projection seams only if a genuine canary escapes

**Step 1: Complete both five-row matrices (RED)**

Add core `correctable` and adapter `terminally flagged` rows. Require success,
correctable, terminally flagged, provider-failed, and caught-error rows in each
family, with proof that every unique canary entered the exercised path before
complete stdout/stderr exclusion is asserted.

**Step 2: Add live-pipeline canaries (GREEN)**

Keep fast projection matrices and add at least one real provider-originated
normal-return and provider-failure CLI case per family without stubbing the run
function. Fix only an owning closed projection boundary if a byte escapes.

**Step 3: Verify**

Run both integration suites and focused canary tests, then:
`pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm lint && pnpm format`

**Step 4: Commit**

```bash
git commit -m "test(p06-t04): complete CLI canary coverage"
```

### Task p06-t05: (final review) Reconcile completion metadata

**Finding:** m1

**Files:**

- `.oat/projects/shared/explainer-improvements-v2/state.md`
- `.oat/projects/shared/explainer-improvements-v2/project-log.md`
- `.oat/projects/shared/explainer-improvements-v2/implementation.md`

**Step 1: Reconcile durable lifecycle facts**

Set truthful docs status and append missing structural completion/review events
for p01, p02, p04, p05, final reconciliation, and p06 implementation. Resolve
unfilled synthesis placeholders without inventing outcomes that still depend
on the fresh final review.

**Step 2: Preserve closure ordering**

Record implementation and documentation completion now, but leave final review
and project completion pending for the root workflow to close only after the
fresh review passes.

**Step 3: Verify**

Run plan validation, Markdown formatting, and consistency checks across
`state.md`, `implementation.md`, `project-log.md`, task totals, docs status, and
review readiness.

**Step 4: Commit**

```bash
git commit -m "chore(p06-t05): reconcile completion metadata"
```

---

## Phase 7: Second final review fixes

Resolves the 18 findings in `reviews/archived/final-review-2026-08-16T232006Z.md`.

Operator decision recorded before this phase: `publish-request/v1` is **retained**.
The Critical is a fail-open validation gate, not a compatibility problem, and the
version-agnostic fix in p07-t01 closes it without a breaking contract removal in a
patch release. Dropping `publish-request/v1` is captured as a separate repo backlog
item for a future minor; `publish-receipt/v1` reading is retained regardless because
`publish-summary/v1` replay depends on it.

### Task p07-t01: (review) Validate publication roots for every publish-request version

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`

**Step 1: Understand the issue**

Review finding (C1): `validatePublicationRoots` gates its entire semantic check on
`value.schemaVersion === 'explainer-kit.publish-request/v2'` (`contracts.mjs:469-471`).
A `v1` block matches neither that branch nor the receipt branch, so the function
returns having validated nothing. `run-request.schema.json:48-52` still accepts v1 via
`oneOf`, and v1's pattern `^s3://[^/\s]+(?:/[^\s]*)?$` matches an authority containing
`:` and `@`. `initializeRun` then writes the credential verbatim to `run-request.json`,
which is a hash-covered member of the retained run package.

**Step 2: Implement fix**

Invert the gate to default-deny: run `normalizePublishRoots` for **any**
`publish-request` shape rather than only the exact v2 string. Do not special-case v1
leniently — a probe of nine benign v1 root shapes showed six pass strict validation
unchanged, and the three that fail (uppercase bucket, underscore bucket, `http://`
public root) are invalid S3 bucket names or plaintext HTTP that should be rejected.
The gate must not be keyed to an exact version string, so a future v3 cannot
reintroduce the bypass.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs`
Expected: a credential-bearing publish block is rejected with `publish-roots` at
**both** v1 and v2; add explicit parity cases asserting v1 and v2 reject identically.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/contracts.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs
git commit -m "fix(p07-t01): validate publication roots for every request version"
```

---

### Task p07-t02: (review) Reject control characters and backslashes in both root parsers

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/s3-roots.mjs`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`

**Step 1: Understand the issue**

Review finding (M1): both parsers screen with `/\s/`, which matches only space, tab,
newline, CR, FF, VT — not the rest of the C0 range or DEL. Probed against the hardened
v2 path: NUL, SOH, ESC, and DEL are accepted in `s3Uri` and `publicBaseUrl`. NUL fails
closed but badly (`ERR_INVALID_ARG_VALUE` at spawn, an uncoded crash); ESC/DEL/SOH pass
through spawn into S3 keys, public URLs, catalog, receipt, and terminal output. Same
class: `parseS3Root` rejects `\` but `parsePublicRoot` does not.

**Step 2: Implement fix**

Screen with `/[\x00-\x1f\x7f\\]/` alongside the existing `\s` test in **both**
`parseS3Root` and `parsePublicRoot`, raising the existing `E_PUBLISH_ROOTS` code.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs`
Expected: NUL/SOH/ESC/DEL and `\` are rejected with `E_PUBLISH_ROOTS` in both roots;
existing accepted shapes still pass.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/s3-roots.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs
git commit -m "fix(p07-t02): reject control characters in publication roots"
```

---

### Task p07-t03: (review) Remove the unsound root-correspondence rule and surface protected-mode uncertainty

**REVISED after operator direction.** The original spec prescribed strict equality
between the S3 key prefix and the public root path. That rule shipped in `32087f0cc`,
regressed `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs` from 5/5 to 3/5, and
was stopped direction-required (Recovery Event `p07-rec-001`). The operator authorized
this changed scope after a cross-model advisory review. `32087f0cc` is immutable; this
task lands a new commit that replaces its rule.

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/s3-roots.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/catalog.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/s3-static.mjs`
- Modify: `.agents/skills/explainer-kit/tests/s3-static.test.mjs`
- Modify: `.agents/skills/explainer-kit/schemas/initiative-catalog` schema (whichever file
  `validateInitiativeCatalog` resolves — locate it rather than assuming a filename)

**Step 1: Understand the issue**

Review finding M2 identified a genuine gap but prescribed an invalid proxy control.

The prescribed rule is unsound. The mapping from an S3 key to a public URL is
**underdetermined by the two strings** — it lives in CDN configuration the tool cannot
read. Two legitimate configurations in this repository disagree structurally:

```text
A  s3://bucket/repositories/duet  +  https://host/repositories/duet   (paths correspond)
B  s3://bucket/explainers         +  https://host                     (prefix -> root)
```

B is a CloudFront **Origin Path** deployment and is the confirmed production config in
`.agents/skills/oat-explainer-kit/references/migration.md`. Suffix-containment does not
rescue the rule: an empty public path is a suffix of everything, so B passes vacuously,
while path-rewriting behaviors (CloudFront Functions, Lambda@Edge, custom origins,
redirects) still produce false rejections.

What genuinely survives: authenticated S3 verification proves the **uploaded object**, not
that an advertised URL reaches it. `publish-receipt/v2` already reports this honestly —
`publicVerification` is a closed `oneOf` of `{status:"verified",httpStatus,hash}` or
`{status:"skipped-protected"}`, distinct from `objectVerification`. The **catalog** does
not: entries are `{id,type,status,renderedPath,hash,url}` with no verification signal, and
the catalog is the artifact that advertises URLs to consumers.

**Step 2: Implement fix**

1. **Remove** the `keyPrefix !== pathname` check added in `32087f0cc`. Preserve every
   independent per-root syntax and normalization check — this task removes only the
   relational rule.
2. **Surface uncertainty in the catalog.** Critical ordering constraint: the catalog is
   built at `s3-static.mjs:113`, serialized at `:125`, and uploaded as a hashed artifact at
   `:139` — all **before** the first upload (`:155`) and long before per-artifact
   `publicVerification` (`:256`). It therefore **cannot** carry a verification _outcome_
   without breaking its own hash. Carry **policy/state** instead: the resolved
   `publicAccess`, or a `publicVerification: "required" | "skipped-by-policy"` marker, plus
   a receipt reference. Never write `verified` into the catalog.
3. **Avoid drift.** Derive the catalog marker and the receipt status from one internal
   result, and assert their correspondence in a test.
4. **Keep divergence detection as a non-blocking, suppressible warning** — never a gate. It
   catches genuine typos without false-rejecting configuration B.

**Step 3: Verify**

Run: `node --test tools/smoke/explainer-kit/wrapper-compatibility.test.mjs .agents/skills/explainer-kit/tests/s3-static.test.mjs`
Expected: wrapper-compatibility returns to **5/5**; the CloudFront origin-path pair
(prefix -> empty public path) is accepted; a protected-mode run marks catalog entries as
policy-skipped rather than verified; the catalog's own hash remains valid.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/s3-roots.mjs .agents/skills/explainer-kit/scripts/lib/catalog.mjs .agents/skills/explainer-kit/scripts/lib/s3-static.mjs .agents/skills/explainer-kit/tests/s3-static.test.mjs
git commit -m "fix(p07-t03): replace unsound root correspondence with catalog verification state"
```

---

### Task p07-t04: (review) Apply an address policy and stop following redirects

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/s3-roots.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/s3-static.mjs`
- Modify: `.agents/skills/explainer-kit/tests/s3-static.test.mjs`

**Step 1: Understand the issue**

Review finding (M3): `parsePublicRoot` enforces HTTPS and absence of
userinfo/query/fragment but applies no address policy. Accepted:
`https://127.0.0.1:8443/p`, `https://169.254.169.254/p` (AWS IMDS), `https://localhost/p`,
`https://10.0.0.5/p`, `https://[::1]/p`. `defaultHttpGet` then issues
`fetch(url, { redirect: 'follow' })`. Exploitability is bounded — it needs committed
shared-config control, runs only after the human gate, and the body is hashed and
compared — but it remains an outbound GET primitive with redirect following aimed at
internal addresses, and an external root can be bounced inward by a third party.

**Step 2: Implement fix**

Reject loopback, link-local (`169.254.0.0/16`, `fe80::/10`), and unique-local/private
ranges in `parsePublicRoot` unless an explicit opt-in is configured. Set
`redirect: 'error'` in `defaultHttpGet` — a canonical public artifact URL should never
legitimately redirect.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/s3-static.test.mjs`
Expected: each probed internal address is rejected; a redirecting public root fails
rather than following.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/s3-roots.mjs .agents/skills/explainer-kit/scripts/lib/s3-static.mjs .agents/skills/explainer-kit/tests/s3-static.test.mjs
git commit -m "fix(p07-t04): restrict public roots and disallow redirects"
```

---

### Task p07-t05: (review) Execute skill and release test suites in CI

**Files:**

- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `.oat/projects/shared/explainer-improvements-v2/plan.md` (p06-t02 rationale)

**Step 1: Understand the issue**

Review finding (I1): `pnpm test` resolves to `turbo run test && pnpm test:smoke`, which
reaches exactly four vitest packages plus `tools/smoke` globs. Neither
`.agents/skills/**/tests/*.test.mjs` nor `tools/release/*.test.mjs` is reachable from
`pnpm check`, `type-check`, `test`, or `build`. That leaves 546 skill tests — including
the p06-t01 credential-rejection suite and both p06-t04 canary matrices — plus 30
release tests runnable only by hand. This is not hypothetical: the recipe-identity
defect `5ac0ce599` had to fix was introduced in p05-t01 and survived every repository
gate. The C1 bypass is the second instance.

**Step 2: Implement fix**

Add `test:skills` and `test:release` steps globbing `.agents/skills/*/tests/*.test.mjs`
and `tools/release/*.test.mjs`, wired into the root `test` script so the CI gates cover
them. The full skill glob takes ~95s locally, so this is practical. If exclusion is
deliberate for runtime reasons, add an explicit CI step instead and correct the
p06-t02 rationale at `plan.md:1126-1128`, which currently claims "ordinary CI catches
future arithmetic or shape drift".

**Step 3: Verify**

Run: `pnpm test`
Expected: the skill and release suites execute and pass as part of the standard gate.

**Step 4: Commit**

```bash
git add package.json .github/workflows/ci.yml .oat/projects/shared/explainer-improvements-v2/plan.md
git commit -m "test(p07-t05): execute skill and release suites in CI"
```

---

### Task p07-t06: (review) Cover `project-recap@2` end to end

**Files:**

- Modify: `.agents/skills/explainer-kit/tests/e2e-recap.test.mjs`

**Step 1: Understand the issue**

Review finding (I2): the adapter pins `project-recap` at version `2`
(`resolve-config.mjs:192-195`), so v2 governs every new recap. Only three unit-level
touchpoints exercise v2; both end-to-end surfaces still pin v1
(`e2e-recap.test.mjs:70`, `golden-conformance.test.mjs:956`). v2's defining behavior —
the hub-only floor plus justified expansion — has never been driven through
planning → authoring → render → link gate → browser review → visual review → durability.

**Step 2: Implement fix**

Repoint or duplicate `e2e-recap.test.mjs` to exercise `project-recap@2`: hub-only, one
justified expansion, and one rejected unjustified expansion. This does not violate the
design's "no new Chromium golden matrix" non-goal — `e2e-recap.test.mjs` is not part of
the three-case golden suite, which stays pinned to v1 for replay.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/e2e-recap.test.mjs`
Expected: v2 hub floor and justified/unjustified expansion all behave as specified.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/tests/e2e-recap.test.mjs
git commit -m "test(p07-t06): cover project-recap@2 end to end"
```

---

### Task p07-t07: (review) Emit the declared `link-validation` evidence stage

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`

**Step 1: Understand the issue**

Review finding (M4): `design.md` enumerates `link-validation` as one of the eight closed
stages and it is accepted by both evidence schemas and the projection allow-lists, but no
`withEvidenceReason(..., 'link-validation', ...)` call exists anywhere. Because
`enforceInternalReferenceGate` runs inside `qa` and `evidenceStageForBuildStage` maps
`qa → 'browser-review'`, an `E_INTERNAL_REFERENCE` failure is durably recorded as a
browser-review failure. Fail-closed behavior is intact, so this is evidence fidelity.

**Step 2: Implement fix**

Wrap the internal-reference gate failure with
`withEvidenceReason(error, 'link-validation', 'finding')` at its owning boundary in
`enforceInternalReferenceGate` (`run.mjs:731-797`), or remove `link-validation` from the
enum and `design.md` if attribution to `browser-review` is intended. Prefer emitting it.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/link-validation.test.mjs`
Expected: an internal-reference failure records `link-validation`, not `browser-review`.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/run.mjs
git commit -m "fix(p07-t07): attribute link failures to link-validation"
```

---

### Task p07-t08: (review) Align internal-reference exhaustion prose with shipped behavior

**Files:**

- Modify: `.agents/skills/explainer-kit/references/contracts.md`

**Step 1: Understand the issue**

Review finding (M5, artifact alignment): `contracts.md:216-218` states that after the one
correction is exhausted "the QA stage retains that finding and durability and publication
remain ineligible". The implementation retains no finding: the gate throws
`E_INTERNAL_REFERENCE`, `executeStage`'s catch records only `{status:'failed', error:true}`
and rethrows a scrubbed `codedError('E_QA', ...)`. Nothing names the broken reference.

**Step 2: Implement fix**

Shipped implementation is source of truth. Align the prose to describe a hard QA-stage
failure with code-only evidence, rather than implementing the retained finding the prose
promises.

**Step 3: Verify**

Run: `pnpm format && pnpm lint`
Expected: prose matches shipped behavior; no retained-finding claim remains.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/references/contracts.md
git commit -m "docs(p07-t08): align exhaustion prose with shipped behavior"
```

---

### Task p07-t09: (review) Document the internal-link gate and shared correction budget

**Files:**

- Modify: `apps/oat-docs/docs/workflows/skills/explainer-kit.md`

**Step 1: Understand the issue**

Review finding (M6): a grep across `apps/oat-docs/docs/` returns zero mentions of
`E_INTERNAL_REFERENCE` or internal-link validation, though the page documents
`E_AUTHOR_REQUIRED`, `E_APPROVAL_RESUME`, and `E_QA`. The p02 hard gate — the project's
central link-integrity deliverable — is documented only in the bundled skill reference.
Separately, `:198` states unconditionally that a `correct` disposition "permits one
bounded correction and exactly one final review", but `run.mjs:628-636` throws
`E_VISUAL_CORRECTION` when the link gate already spent the shared budget.

**Step 2: Implement fix**

Add the internal-link gate and `E_INTERNAL_REFERENCE` to the pipeline and error sections,
and make the correction-budget sentence conditional on the shared budget.

**Step 3: Verify**

Run: `pnpm check && pnpm build:docs`
Expected: markdownlint passes and the docs build succeeds.

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/workflows/skills/explainer-kit.md
git commit -m "docs(p07-t09): document internal-link gate and correction budget"
```

---

### Task p07-t10: (review) Document `explainers.publish.publicAccess`

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`

**Step 1: Understand the issue**

Review finding (M7): the config table enumerates every other `explainers.publish.*` key
with type, scope, and default, but `publicAccess` — added in this range at
`packages/cli/src/commands/config/index.ts:626-637` and defaulting to `'public'` at
`packages/cli/src/config/resolve.ts:70` — appears nowhere under `apps/oat-docs/docs/`.
It is security-relevant: declaring `protected` switches verification to authenticated
object hashing with public fetch recorded as `skipped-protected`, which is the mode in
which p07-t03's divergence becomes unverifiable. `state.md` claims
`oat_docs_updated: complete`.

**Step 2: Implement fix**

Add the row (`public | protected`, shared, default `public`) and extend the prose at
`:168-172` to explain that `publicAccess` declares anonymous reachability and does not
authorize publication.

**Step 3: Verify**

Run: `pnpm check && pnpm build:docs`
Expected: the key is documented and the docs build succeeds.

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/cli-utilities/configuration.md
git commit -m "docs(p07-t10): document explainers.publish.publicAccess"
```

---

### Task p07-t11: (review) Correct the stale 27-expected-failures carve-out

**Files:**

- Modify: `.oat/projects/shared/explainer-improvements-v2/implementation.md`

**Step 1: Understand the issue**

Review finding (M8): the Test Results section (`:886-889`) asserts in the present tense
that the broad explainer skill glob "is separately nonzero for 27 inherited
`E_BROWSER_PROBE` failures in legacy recap fixtures". The reviewer ran the full glob at
this HEAD and measured **546 tests, 546 pass, 0 fail, 0 skipped**, with the three Chromium
golden benchmarks not env-gated and passing. A standing "these failures are expected"
note in a closing summary masks future genuine regressions.

**Step 2: Implement fix**

Correct the present-tense claim to record that the glob is green at `07e2c96d7`. Leave the
historical p03-era statements at `:812-815` as written — they are immutable review
narrative.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs .agents/skills/oat-explainer-kit/tests/*.test.mjs`
Expected: the recorded count matches the measured result.

**Step 4: Commit**

```bash
git add .oat/projects/shared/explainer-improvements-v2/implementation.md
git commit -m "docs(p07-t11): correct stale expected-failure carve-out"
```

---

### Task p07-t12: (review) Assert projection survival and add the case-study link fixture

**Files:**

- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/link-validation.test.mjs`

**Step 1: Understand the issue**

Review findings (m1, m2). m1: each canary row asserts `entered === true`, canary exclusion,
and exit code, but nothing asserts the projected output still contains the
`visualReview`/`publication` block. The prior review's M2 was precisely a vacuous row, so
a regression in `projectVisualReviewEvidence` would silently restore vacuity. m2: the
handoff asks for "the broken links from this case", but the literal `../architecture/` and
`../deck/` strings appear nowhere in the repository.

**Step 2: Implement fix**

Add one projection assertion per non-throwing canary row, e.g.
`assert.equal(JSON.parse(stdout.at(-1)).visualReview.disposition, 'correct')`. Add the two
literal case-study hrefs as a named regression case.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/link-validation.test.mjs`
Expected: rows are non-vacuous by assertion; the case-study hrefs are covered by name.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/link-validation.test.mjs
git commit -m "test(p07-t12): assert projection survival and case-study links"
```

---

### Task p07-t13: (review) Align RC recipe-identity sort order

**Files:**

- Modify: `tools/release/explainer-rc-contract.mjs`

**Step 1: Understand the issue**

Review finding (m3): the builder sorts entries by the `(id, version)` tuple
(`build-explainer-rc.mjs:731-734`); the contract requires `${id}@${version}` strings to
equal their default lexical sort (`explainer-rc-contract.mjs:70,165-169`). These disagree
whenever one recipe id is a strict prefix of another, because `-` (0x2D) sorts before `@`
(0x40). Not reachable with the current five ids and it fails closed (spurious RC
rejection), but it is latent.

**Step 2: Implement fix**

Make the contract sort by the same `(id, version)` tuple as the builder, or have the
builder sort the composed identity strings. Pick one and use it in both places.

**Step 3: Verify**

Run: `node --test tools/release/run-explainer-rc.test.mjs`
Expected: ids where one is a strict prefix of another sort identically in both.

**Step 4: Commit**

```bash
git add tools/release/explainer-rc-contract.mjs
git commit -m "fix(p07-t13): align RC recipe-identity sort order"
```

---

### Task p07-t14: (review) Record the p06-t02 scope extension as a deviation

**Files:**

- Modify: `.oat/projects/shared/explainer-improvements-v2/implementation.md`

**Step 1: Understand the issue**

Review finding (m4): p06-t02 declared the two RC test files plus "production catalog
helpers only if required to avoid fixture drift". Commit `5ac0ce599` also modified
`build-explainer-rc.mjs` and `explainer-rc-contract.mjs` — recipe-identity semantics, not
catalog helpers. The change is necessary and correct, since two versions of
`project-recap` now coexist, but the Deviations table (`:865-871`) does not record it.

**Step 2: Implement fix**

Add a Deviations row noting the accepted scope extension and its cause.

**Step 3: Verify**

Run: `pnpm format`
Expected: the Deviations table records the extension.

**Step 4: Commit**

```bash
git add .oat/projects/shared/explainer-improvements-v2/implementation.md
git commit -m "docs(p07-t14): record p06-t02 scope extension"
```

---

### Task p07-t15: (review) Surface inventory and post-upload failure attribution

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`

**Step 1: Understand the issue**

Review findings (m5, m6). m5: `enforceRetainedRunPackage(...).catch(() => {})`
(`run.mjs:315-318`) swallows the inventory assertion. Removal still happens, so the
confinement invariant holds, but an unremovable violation or a missing required file would
go unreported. m6: any throw inside the publish `try` sets `providerFailed = true`,
including the local `writeJsonAtomic`, `updateBuildRecord`, and second `persistManifest`
(`:1887-1894`), so post-upload local failures are recorded as `provider-failure` rather
than `pipeline-failure`. This is the only residue of previously deferred finding m2.

**Step 2: Implement fix**

Record a local `finalization`/`pipeline-failure` reason instead of swallowing, so the
failure is visible in terminal evidence. Wrap the post-upload local work so it rethrows as
a distinct pipeline failure.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/run.integration.test.mjs`
Expected: inventory failures are reported; post-upload local failures classify as
`pipeline-failure`.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/run.mjs
git commit -m "fix(p07-t15): surface inventory and post-upload failure attribution"
```

---

### Task p07-t16: (review) Document the mid-publish `incomplete` manifest

**Files:**

- Modify: `.agents/skills/explainer-kit/references/destination-contract.md`

**Step 1: Understand the issue**

Review finding (m7): `run.mjs:1855-1866` persists the manifest before invoking the
publisher callback, so the `manifestPath` a connector receives carries
`outcome: 'incomplete'` while the `publish` stage is `running`. The built-in connector
handles this correctly and `publication-policy.mjs:11-14,22-46` gates the transition
explicitly, but the destination contract never mentions `incomplete` or the build-record
requirement, so a third-party connector author has no way to know. This is the residue of
previously deferred finding m1, which was accepted on the condition that the contract gap
be closed.

**Step 2: Implement fix**

Document the intermediate state and the build-record-aware publishability check that a
connector must perform.

**Step 3: Verify**

Run: `pnpm format && pnpm lint`
Expected: the contract documents the intermediate state.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/references/destination-contract.md
git commit -m "docs(p07-t16): document mid-publish incomplete manifest"
```

---

## Reviews

| Scope              | Type     | Status          | Date       | Artifact                                                                                                | Reviewed Head                            | Invocation | Gate Target              |
| ------------------ | -------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------- | ------------------------ |
| p01                | code     | passed          | 2026-08-06 | reviews/archived/p01-review-2026-08-06T172134Z.md                                                       | a42a38521b33fa1127ebdd1b462a16ed632728cb | manual     | -                        |
| p01-t06            | code     | fixes_completed | 2026-08-06 | reviews/archived/p01-t06-review-2026-08-06T173603Z.md                                                   | fcc100f3f78984bc1ba285bd1fea099cda451a24 | manual     | -                        |
| p01-t06            | code     | passed          | 2026-08-06 | reviews/archived/p01-t06-review-2026-08-06T174423Z.md                                                   | c1d5a1b0994e19abb2b349b776ba3235f8955b52 | manual     | -                        |
| p02                | code     | fixes_completed | 2026-08-06 | reviews/archived/p02-review-2026-08-06T201258Z.md                                                       | fde1437beb821c68f8fe972d4ac1c4425d20e7ef | manual     | -                        |
| p02                | code     | passed          | 2026-08-06 | reviews/archived/p02-review-2026-08-06T202708Z.md                                                       | 3f0dfe5e3131ee2ef12bd06cf4eb842566b50ca9 | manual     | -                        |
| p03                | code     | passed          | 2026-08-06 | reviews/archived/p03-review-2026-08-06T235124Z.md                                                       | ba66d54b697d86de0bade8863587870af75e06da | manual     | -                        |
| p03                | code     | fixes_completed | 2026-08-06 | reviews/archived/p03-review-2026-08-06T213553Z.md                                                       | c9a0aeead5bce79a5e31bd6ce247e80a64ec1800 | manual     | -                        |
| p03                | code     | fixes_completed | 2026-08-06 | reviews/archived/p03-review-2026-08-06T224958Z.md                                                       | 01d3c99075aa09ea5fb49b801d4deca1d5f3c51e | manual     | -                        |
| p04                | code     | fixes_completed | 2026-08-07 | reviews/archived/p04-review-2026-08-07T003711Z.md                                                       | 8adec377800752964941a8fdae02073136fe479b | manual     | -                        |
| p04                | code     | fixes_completed | 2026-08-07 | reviews/archived/p04-review-2026-08-07T010500Z.md                                                       | 7a8e15fc44cd22f9d9f94c57b10e6f659561d2a8 | manual     | -                        |
| p04                | code     | fixes_completed | 2026-08-07 | reviews/archived/p04-review-2026-08-07T013800Z.md                                                       | 6fbded0f2c942100191a6d201775af3698b4d873 | manual     | -                        |
| p04                | code     | fixes_completed | 2026-08-07 | reviews/archived/p04-review-2026-08-07T021700Z.md                                                       | ba65b8258b8e0adce74cd20ba534255dbfc8fccb | manual     | -                        |
| p04-scope-revision | artifact | fixes_completed | 2026-08-07 | reviews/archived/artifact-p04-scope-revision-review-2026-08-07T023400Z.md                               | 8f9d2c9c946404bc06bf6de2683dc3f821173ca5 | manual     | -                        |
| p04-scope-revision | artifact | fixes_completed | 2026-08-07 | reviews/archived/artifact-p04-scope-revision-review-2026-08-07T025000Z.md                               | 35e610baa851e2693d9403587d9219c0f8bb2a23 | manual     | -                        |
| p04-scope-revision | artifact | fixes_completed | 2026-08-07 | reviews/archived/artifact-p04-scope-revision-review-2026-08-07T030500Z.md                               | 26f1e8b420938b487397223ef609d1ef17d16fd4 | manual     | -                        |
| p04-scope-revision | artifact | passed          | 2026-08-07 | reviews/archived/artifact-p04-scope-revision-review-2026-08-07T173000Z.md                               | a0cd15674c2032ac62b5103077280d90d1ef70b3 | manual     | -                        |
| p04-t04            | code     | fixes_completed | 2026-08-07 | reviews/archived/p04-t04-review-2026-08-07T185131Z.md                                                   | c3ef47b71d640d4289576fad904e20e027e6935f | manual     | -                        |
| p04-t04            | code     | passed          | 2026-08-07 | reviews/archived/p04-t04-review-2026-08-07T200546Z.md                                                   | 098e1780b86116492073513614f64835aa470030 | manual     | -                        |
| p04-t05/p04-t06    | code     | passed          | 2026-08-07 | reviews/archived/p04-t04-review-2026-08-07T200546Z.md (scope alias; immutable artifact remains p04-t04) | 098e1780b86116492073513614f64835aa470030 | manual     | -                        |
| p05                | code     | fixes_completed | 2026-08-07 | reviews/archived/p05-review-2026-08-07T210515Z.md                                                       | 3ed90f009cfc8a6f1c95fcbd9185a5a18cfe00ed | manual     | -                        |
| p05                | code     | passed          | 2026-08-07 | reviews/archived/p05-review-2026-08-07T211756Z.md                                                       | 836d850147f067a59d6d4fd06edfd4d8f568e780 | manual     | -                        |
| final              | code     | received        | 2026-08-07 | reviews/archived/final-review-2026-08-07T214023Z.md (superseded by reconciliation)                      | 3da933d4e2d5ebd9764616fb0110b4794598fdd7 | manual     | -                        |
| final              | code     | fixes_added     | 2026-08-07 | reviews/archived/final-review-2026-08-07T215000Z.md                                                     | 3da933d4e2d5ebd9764616fb0110b4794598fdd7 | manual     | -                        |
| final              | code     | fixes_added     | 2026-08-16 | reviews/archived/final-review-2026-08-16T232006Z.md                                                     | 07e2c96d70b8130718f8a4203e60583f1cc817a1 | manual     | -                        |
| plan-revision      | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-revision-review-2026-08-06T180042Z.md                                    | c33edabc017369a629ca7a3a63757cbad3d9dab9 | manual     | -                        |
| plan-revision      | artifact | passed          | 2026-08-06 | reviews/archived/artifact-plan-revision-review-2026-08-06T181021Z.md                                    | a8e41bbc13c9aee38312d1680ac6aec13642cae7 | manual     | -                        |
| plan               | artifact | passed          | 2026-08-05 | inline (deliberate inheritance; 1 Important + 2 Medium fixed)                                           | -                                        | auto       | -                        |
| plan               | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T002327Z.md (4 Important + 1 Medium resolved)           | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan               | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T004027Z.md (2 Important + 1 Medium resolved)           | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan               | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T005429Z.md (4 Important + 2 Medium resolved)           | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan               | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T012159Z.md (superseded rerun; findings resolved)       | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan               | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T012720Z.md (3 Important + 1 Medium resolved)           | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan               | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T013953Z.md (2 Important + 2 Medium resolved)           | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan               | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T015212Z.md (2 Important resolved)                      | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan               | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T021300Z.md (2 Important + 3 Medium resolved)           | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan               | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T023457Z.md (4 Important resolved)                      | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan               | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T024804Z.md (4 Important resolved)                      | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan               | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T031926Z.md (2 Important + 1 Medium resolved)           | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan               | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T033345Z.md (3 Important resolved)                      | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan               | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T034831Z.md (2 Important resolved)                      | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan               | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T040012Z.md (2 Important resolved)                      | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan               | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T042235Z.md (3 Important + 2 Medium resolved)           | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan               | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T043754Z.md (2 Important + 1 Medium resolved)           | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan               | artifact | passed          | 2026-08-06 | operator acceptance after attempt-15 fixes                                                              | -                                        | operator   | -                        |

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

## Implementation Complete

**Summary:**

- Phase 1: 6 tasks — adapter paths, destinations, and credential hygiene
- Phase 2: 2 tasks — canonical links and hard validation
- Phase 3: 11 tasks — publication verification, receipts, and review fixes
- Phase 4: 6 tasks — lifecycle ordering, bounded recovery, code-only terminal
  evidence, and exact retained-package confinement
- Phase 5: 4 tasks — prose-led authoring, docs, release closure, and shipped
  recap-contract alignment
- Phase 6: 5 tasks — final security, release, coverage, ledger, and completion
  fixes
- Phase 7: 16 tasks — second final-review fixes: publication-root validation
  hardening, CI test coverage, `project-recap@2` end-to-end coverage, evidence
  attribution, and documentation alignment

**Total: 50 tasks**

## References

- Design: `design.md` (revised lightweight design)
- Discovery: `discovery.md`
- Handoff: `references/handoff-cyclone-case-study.md` (production evidence)
- Implementation tracking: `implementation.md`
