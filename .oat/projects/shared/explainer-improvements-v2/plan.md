---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-05
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: ['p07'] # phases to pause AFTER completing (empty = every phase)
oat_plan_parallel_groups: [['p01', 'p02']] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
oat_template: true
---

# Implementation Plan: explainer-improvements-v2

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Close the path-derivation, link-integrity, publication-verification,
and lifecycle gaps exposed by the Duet Cyclone case study, and raise the visual
floor with renderer-owned structured content, a role-based type system, and a
design-quality visual-review rubric — per the acceptance criteria in
`references/handoff-cyclone-case-study.md` and the approved `design.md`.

**Architecture:** Changes center on the two canonical skills —
`explainer-kit` (core) stays destination-neutral and config-blind;
`oat-explainer-kit` (adapter) owns config resolution, invocation topology, and
per-invocation remote destination derivation — plus three bounded satellite
surfaces: the `oat-project-implement` completion/closeout orchestrator (recap
approval guard), release acceptance tooling, and the wrapper smoke fixture
(contract-version consumers). Two new hard build gates (canonical link table,
internal-link validator) and a protected-destination publish mode preserve
existing safety guarantees.

**Tech Stack:** Node.js 22 ESM, `node:test`, JSON Schema, Playwright/Chromium
(existing browser-evidence machinery), pnpm/Turborepo, S3 static publishing.

**Commit Convention:** `{type}({task-id}): {description}` — e.g.,
`feat(p01-t01): derive per-invocation publish destination`.

## Planning Checklist

- [x] Confirmed HiLL checkpoints (config `workflow.hillCheckpointDefault: final` → `p07`)
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

`p01` (adapter path/destination derivation) writes only under
`.agents/skills/oat-explainer-kit/`; `p02` (core link integrity) writes only
under `.agents/skills/explainer-kit/`. Their write sets are disjoint, their
verification suites are independent (`node --test` over their own trees), and
neither consumes the other's outputs, so they are declared as one parallel
group. Everything after is sequential: `p03` (publication) and `p04`
(lifecycle) both modify core `run.mjs`/records and adapter finalize seams that
`p02`/`p01` also touch, `p05`/`p06` share core renderer, schema, theme, and
fixture files, and `p07` (release closure) bumps skill and package versions
repo-wide, which conflicts with every other phase by design.

---

## Dispatch Profile

_No explicit per-phase constraints. Runtime selection under the project's
managed dispatch policy applies._

---

RED/GREEN/Refactor is the default where work is testable; contract/docs tasks
use direct verification. All tasks preserve stable `pNN-tNN` IDs, per-task
verification, and atomic commits.

## Phase 1: Adapter path and destination derivation

Write boundary: `.agents/skills/oat-explainer-kit/**` only.

### Task p01-t01: Derive per-invocation remote publish destination

**Files:**

- Create: `.agents/skills/oat-explainer-kit/scripts/derive-destination.mjs`
- Create: `.agents/skills/oat-explainer-kit/tests/derive-destination.test.mjs`

**Step 1: Write test (RED)**

Unit tests: project invocation composes `<s3Root>/projects/<project-slug>` and
`<publicRoot>/projects/<project-slug>`; repo invocation returns roots
unchanged; direct invocation performs no derivation; slug segments are
percent-encoded with the same rules the core uses for rendered paths
(document the rule set in the test); trailing slashes normalized; rejects
empty/unsafe slugs.

Run: `node --test .agents/skills/oat-explainer-kit/tests/derive-destination.test.mjs`
Expected: fails (module missing)

**Step 2: Implement (GREEN)**

`deriveExplainerDestination({ invocation, projectSlug, s3Uri, publicBaseUrl })`
returning derived roots. Pure function; no I/O; no OAT config access.

Run: same test command
Expected: passes

**Step 3: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/`
Expected: existing adapter suites remain green

**Step 4: Commit**

```bash
git commit -m "feat(p01-t01): derive per-invocation publish destination"
```

---

### Task p01-t02: Validate complete publish configuration with build-only fallback

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/scripts/resolve-config.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/config-paths.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/config-contract.md`

**Step 1: Write test (RED)**

Config with only `publicBaseUrl` (the Duet shape) resolves to build-only with
a structured report naming the missing fields (`provider`, `s3Uri`,
`awsRegion`); complete config (provider `s3-static`, repository S3 root,
repository public root, region, optional `publicAccess`) resolves
publish-capable; partial combinations each report exactly their gaps.

Run: `node --test .agents/skills/oat-explainer-kit/tests/config-paths.test.mjs`
Expected: new cases fail

**Step 2: Implement (GREEN)**

Completeness validation in `resolve-config.mjs`; document the complete shared
configuration (including the new `explainers.publish.publicAccess`
declaration) in `config-contract.md`, with the explicit note that
configuration alone never authorizes publication (human gate retained).

**Step 3: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p01-t02): validate complete publish config with build-only fallback"
```

---

### Task p01-t03: Accept repository invocations at the adapter entry point

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`

**Step 1: Write test (RED)**

Integration fixture: `repo` invocation routes through
`resolveExplainerOutputRoot`'s existing repo branch to
`.oat/repo/reference/explainers/<run-slug>/`, derives the unmodified
repository publish roots, and completes a build-only run. Project invocation
behavior is unchanged.

Run: `node --test .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
Expected: repo fixture fails (entry point rejects `repo`)

**Step 2: Implement (GREEN)**

Remove the entry-point rejection; wire invocation through path resolution and
destination derivation (p01-t01).

**Step 3: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p01-t03): accept repository explainer invocations"
```

---

### Task p01-t04: Guard against double-nested output roots

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/scripts/resolve-paths.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/config-paths.test.mjs`

**Step 1: Write test (RED)**

A caller-supplied output root whose final segment equals the run slug is
rejected with an actionable error (rejection is the conservative contract)
before any directory creation. The run slug is not visible to the current
resolver signature, so pass it from the `run.mjs` call site into the resolver
(or place the guard at the run boundary); cover both direct-caller roots and
adapter-resolved roots.

**Step 2: Implement (GREEN)**

Guard wired through the slug-bearing call site in `run.mjs` plus the
output-root resolution seam, applied before core invocation.

**Step 3: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p01-t04): reject double-nested explainer output roots"
```

---

### Task p01-t05: Pass the derived destination into the core publish request

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`

**Step 1: Write test (RED)**

The publish request the adapter constructs carries the derived (not raw
configured) roots; the core never receives project/repo identifiers. Assert
no credential material appears in the constructed request. **Sequencing
constraint:** the configured `publicAccess` value is resolved and validated
by p01-t02 but is NOT emitted into core publish requests in this phase — the
current core publish-request schema rejects unknown fields
(`additionalProperties: false`). Threading `publicAccess` happens in
p03-t06, after p03-t01 lands core schema support. No phase-1 commit may emit
a field the receiving contract rejects.

**Step 2: Implement (GREEN)**

Thread p01-t01 derivation through publish-request construction; document in
`lifecycle-contract.md`.

**Step 3: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/ && pnpm lint && pnpm format`
Expected: adapter suite green; lint and format clean (only these gates cover `.agents/skills/**`)

**Step 4: Commit**

```bash
git commit -m "feat(p01-t05): thread derived destination into core publish requests"
```

---

## Phase 2: Core link integrity

Write boundary: `.agents/skills/explainer-kit/**` only.

### Task p02-t01: Canonical artifact link table in author requests

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/set-plan.mjs`
- Create: `.agents/skills/explainer-kit/schemas/author-request.v3.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/references/contracts.md`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`

**Step 1: Write test (RED)**

From a set plan, the link table maps every artifact ID to its site-relative
`renderedPath` ending in explicit `index.html`, and to the correct relative
URL from each authoring artifact's location (e.g. hub →
`../../diagrams/<slug>/architecture/index.html`). The link-table requirement
is a **new contract version** (`author-request/v3`): v3 requests without the
table fail validation, while existing `author-request/v2` payloads continue to
validate unchanged (retained-run replay and external callback compatibility
proven by test). The contract registry and docs list both versions; new runs
emit v3.

**Step 2: Implement (GREEN)**

Link-table derivation beside set-plan machinery; new v3 schema alongside the
retained v2; contract-registry and documentation updates; version-dispatched
validation.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p02-t01): inject canonical artifact link table into author requests"
```

---

### Task p02-t02: Internal-link validator library

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/link-validation.mjs`
- Create: `.agents/skills/explainer-kit/tests/link-validation.test.mjs`
- Create: `.agents/skills/explainer-kit/tests/fixtures/links/` (passing and failing HTML fixtures)

**Step 1: Write test (RED)**

Fixtures reproduce the exact Cyclone defects: `../architecture/` and
`../deck/` from `site/initiatives/<slug>/index.html` are rejected as
directory-style links with the expected canonical target named in the
finding. Additional cases: unresolvable target, target missing from manifest,
missing explicit `index.html`, link escaping the site tree, valid canonical
links pass, external `https://` links ignored, `src` attributes covered, and
validation runs across hub, diagram, and deck fixtures (not only the hub).

**Step 2: Implement (GREEN)**

Parser-based extraction of local `href`/`src`; resolution against the source
artifact's site location; manifest/site-tree existence check; per-link
structured findings.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/link-validation.test.mjs`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p02-t02): add manifest-anchored internal-link validator"
```

---

### Task p02-t03: Enforce link validation as a hard post-render gate

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/render-qa.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`

**Step 1: Write test (RED)**

Integration: a run whose authored HTML contains a directory-style link fails
the build after render with link findings recorded in the run record, and the
failure routes into the bounded correction path (same machinery as visual
findings); it never reaches durability or publication.

**Step 2: Implement (GREEN)**

Wire the validator between render and browser evidence; findings feed the
existing correction state machine.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/qa.test.mjs`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p02-t03): gate builds on internal-link validation"
```

---

### Task p02-t04: Canonical-link authoring contract for artistic HTML

**Files:**

- Modify: `.agents/skills/explainer-kit/references/visual-authoring.md`
- Modify: `.agents/skills/explainer-kit/briefs/project-recap.md`
- Modify: `.agents/skills/explainer-kit/briefs/supporting-diagram.md`
- Modify: `.agents/skills/explainer-kit/briefs/walkthrough-deck.md`

**Step 1: Implement**

Document that artistic authors receive the canonical link table and must use
its URLs verbatim (or artifact IDs where the renderer resolves them);
directory-style links are a build failure. Update briefs to reference the
contract.

**Step 2: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/templates.test.mjs && pnpm lint && pnpm format`
Expected: green; lint and format clean (only these gates cover `.agents/skills/**`)

**Step 3: Commit**

```bash
git commit -m "docs(p02-t04): require canonical link targets in artistic authoring"
```

---

## Phase 3: Publication integrity

### Task p03-t01: `publicAccess` declaration in the publish request

**Files:**

- Modify: `.agents/skills/explainer-kit/schemas/publish-request.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/s3-static.mjs`
- Modify: `.agents/skills/explainer-kit/tests/s3-static.test.mjs`
- Modify: `.agents/skills/explainer-kit/references/destination-contract.md`

**Step 1: Write test (RED)**

Schema accepts `publicAccess: "public" | "protected"` and defaults absent to
`public`; invalid values rejected; declared-`public` behavior byte-identical
to today (sentinel + anonymous verification; 401/403 still fails closed
before artifact upload).

**Step 2: Implement (GREEN)**

Schema revision, request validation, and contract documentation of both
modes.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p03-t01): declare publish destination public-access mode"
```

---

### Task p03-t02: Authenticated in-bucket verification for protected destinations

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/s3-static.mjs`
- Modify: `.agents/skills/explainer-kit/tests/s3-static.test.mjs`

**Step 1: Write test (RED)**

Protected mode: no anonymous HTTP request is ever issued (assert on the
injected fetch/client seams); every uploaded object is verified against
**service-computed bytes, not caller-authored metadata** — upload with an
S3-validated SHA-256 checksum and compare the service-computed checksum
against the manifest hash (or perform an authenticated object download and
hash the returned bytes). The existing `explainer-sha256` user metadata is
idempotency bookkeeping only and must not satisfy verification. Required
negative test: object bytes differ while user metadata still carries the
expected digest — protected verification must reject it. Public URLs are
recorded unfetched with verification result `skipped-protected` for the
public fetch and `verified-authenticated` for the object; any checksum
mismatch fails the publish; sentinel behavior uses authenticated verification
only.

**Step 2: Implement (GREEN)**

Branch the verification pipeline on the declared mode with service-checksum
byte verification; keep upload, additive-safety, retry, and
credential-hygiene behavior shared.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/s3-static.test.mjs`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p03-t02): verify protected destinations via authenticated object checks"
```

---

### Task p03-t03: Complete per-artifact publish receipts

**Files:**

- Create: `.agents/skills/explainer-kit/schemas/publish-receipt.v2.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/s3-static.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/durability.mjs`
- Modify: `.agents/skills/explainer-kit/references/contracts.md`
- Modify: `.agents/skills/explainer-kit/tests/s3-static.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/durability.test.mjs`

**Step 1: Write test (RED)**

The connector emits a **new receipt version**
(`explainer-kit.publish-receipt/v2`) listing, for every published artifact:
ID, rendered path, S3 URI, canonical public URL, content hash, and structured
verification result
(`verified-anonymous | verified-authenticated | skipped-protected`).
The per-artifact verification result is a **structured object with separate
fields for object-byte verification and public-URL verification** (plus the
compared service checksum/hash) — one enum cannot express the protected case,
where the object is `verified-authenticated` while the public fetch is
`skipped-protected`. Schema and negative tests prove protected receipts
record both facts and public receipts preserve anonymous byte verification.
Contract-dependency propagation is in scope: the contract registry
(`contracts.mjs`) registers v2 with version dispatch, and the durability
reader — which currently validates receipts through the generic
`publish-receipt` key — dispatches both versions. Retained
`publish-receipt/v1` artifacts remain readable in every consumer
(archive/durability validation), proven by compatibility tests over both
versions. Receipt is atomic, durable in the run package, and contains no
credential material. Published bytes are asserted equal to finalized manifest
hashes; any transformation between manifest and upload fails.

**Step 2: Implement (GREEN)**

New v2 receipt schema, registry dispatch, and emission with retained v1
readers in durability/archive consumers; docs updated; no publication-time
HTML transformation code path exists (assert by construction and test).

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/durability.test.mjs`
Expected: green (every changed test file executes)

**Step 4: Commit**

```bash
git commit -m "feat(p03-t03): emit complete per-artifact publish receipts"
```

---

### Task p03-t04: One `publicBaseUrl` residence and one URL segment-encoding helper

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/render.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/s3-static.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/catalog.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Create: `.agents/skills/explainer-kit/scripts/lib/url-segments.mjs`
- Create: `.agents/skills/explainer-kit/tests/url-segments.test.mjs`

**Step 1: Write test (RED)**

One shared helper produces identical segment encoding for render-time and
publish-time URL construction (property test over slugs with spaces, unicode,
reserved characters). All consumers of `publicBaseUrl` read one documented
residence; the `durability.publish` vs top-level divergence is resolved and
covered.

**Step 2: Implement (GREEN)**

Extract the helper; migrate render, publish, and catalog URL construction to
it; reconcile `publicBaseUrl` residence with a documented single source.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/`
Expected: full core suite green

**Step 4: Commit**

```bash
git commit -m "fix(p03-t04): unify publicBaseUrl residence and URL segment encoding"
```

---

### Task p03-t05: Complete URL sets in lifecycle summaries

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs`

**Step 1: Write test (RED)**

When a publish receipt exists, the tracked-run finalization copies every
artifact's public URL, S3 URI, hash, and verification result into project
state/summary records — never only the hub.

**Step 2: Implement (GREEN)**

Consume the receipt as the single source; assert credential hygiene.

**Step 3: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/ && pnpm lint && pnpm format`
Expected: adapter suite green; lint and format clean (phase touches `.agents/skills/**`)

**Step 4: Commit**

```bash
git commit -m "feat(p03-t05): record complete artifact URL sets in lifecycle summaries"
```

---

### Task p03-t06: Thread `publicAccess` from adapter config into core publish requests

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`

**Step 1: Write test (RED)**

Now that p03-t01 landed core schema support, the adapter emits the
`publicAccess` value resolved in p01-t02 into the core publish request;
absent config emits nothing (core default `public` applies); the emitted
request validates against the revised core publish-request contract.

**Step 2: Implement (GREEN)**

Thread the resolved declaration through publish-request construction;
document in `lifecycle-contract.md`.

**Step 3: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/ && pnpm lint && pnpm format`
Expected: adapter suite green; lint and format clean

**Step 4: Commit**

```bash
git commit -m "feat(p03-t06): thread publicAccess into core publish requests"
```

---

## Phase 4: Lifecycle ordering and recovery

### Task p04-t01: Root-cause and pin the `request.sourceIds` shape failure

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/fact-base.mjs`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`

**Step 1: Investigate**

Reproduce the `request.sourceIds is not iterable` failure from the
`project-recap-corrective-2` run shape; identify the adapter/core boundary
that accepted the malformed request.

**Step 2: Write test (RED)**

Pin the exact failing request shape as a fixture; require a structured
validation error naming the field and expected type before content
processing begins.

**Step 3: Implement (GREEN)**

Shape validation at the request boundary.

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
Expected: green

**Step 5: Commit**

```bash
git commit -m "fix(p04-t01): validate request shape before content processing"
```

---

### Task p04-t02: Automatic bounded correction and flagged-run durability

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/durability.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/durability.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`

**Step 1: Write test (RED)**

A run reaching `built-needs-review` automatically enters the existing
one-correction-then-final-review machinery (no new loop; the cap is
unchanged). If the re-review is clean, the run proceeds to durability as
`built-durable`. If findings remain after the cap, the run terminates
`built-needs-review` with residual findings durably recorded — **and that
flagged outcome has a real durability/finalization path**: the core
durability seam and adapter tracked-run finalization (which currently reject
`built-needs-review`) accept the flagged terminal outcome as a distinct
flagged-durable tier, producing a tracked, inspectable run package with
durable residual-finding evidence. Integration tests prove: the flagged
package is tracked and inspectable; approval may proceed after the terminal
outcome (flag-not-block); publication remains denied for flagged runs unless
the review passes or an explicit operator override is recorded.

**Step 2: Implement (GREEN)**

Wire auto-entry; define the flagged-durable semantics across the core
durability and adapter finalization seams; record residual findings in the
run record; document the flag-not-block contract.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/durability.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs`
Expected: green (every changed test file executes)

**Step 4: Commit**

```bash
git commit -m "feat(p04-t02): auto-enter bounded correction from built-needs-review"
```

---

### Task p04-t03: Durable failure records for failed and superseded runs

Ordered before the approval-guard task so the versioned failure-record
contract exists when the guard consumes it.

**Files:**

- Create: `.agents/skills/explainer-kit/schemas/failure-record.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`

**Step 1: Write test (RED)**

A failed run always leaves a compact durable failure record (versioned
contract: run ID, recipe, terminal outcome, error class, timestamps,
superseding-run pointer when a correction replaces it) inside the durable
project tree, validated by the production contract registry; bulky
diagnostics follow the documented archive-or-delete policy and are never the
only evidence. Superseded runs gain the pointer when the corrected run
finalizes.

**Step 2: Implement (GREEN)**

Failure-record schema, registry entry, and emission in core; adapter
finalization places the record durably and applies the diagnostics policy.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs`
Expected: green (every changed test file executes)

**Step 4: Commit**

```bash
git commit -m "feat(p04-t03): retain durable failure records for failed runs"
```

---

### Task p04-t04: Recap gate terminal outcome before final approval

Consumes the failure-record contract created in p04-t03.

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
- Modify: `.agents/skills/oat-explainer-kit/scripts/resolve-intent.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/persist-intent.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`
- Modify: `.agents/skills/oat-explainer-kit/tests/intent.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs`

**Step 1: Write test (RED)**

The ordering invariant lives in the **lifecycle orchestrator seam that
actually advances approval** — the `oat-project-implement`
completion/closeout sequence — not only in the adapter's intent
resolver/persistence helpers. Define a durable terminal-outcome field the
orchestrator reads and a transition guard: when recap intent resolved to
`generate`, approval cannot advance while the field is absent, and each
accepted terminal outcome (`built-durable`, flagged `built-needs-review`,
or a production `failure-record` document validated against the p04-t03
contract) allows it to advance. The completion integration test must
exercise the transition guard (approval blocked without an outcome; approval
proceeds with each terminal outcome) — asserting on reference prose alone is
insufficient. If any other live completion route can finalize approval, it is
covered by the same guard. Approval is never conditioned on the outcome being
clean.

**Step 2: Implement (GREEN)**

Durable terminal-outcome recording in the adapter intent/persistence seam;
transition guard in the closeout orchestrator sequence; document in
`lifecycle-contract.md` and `completion-and-closeout.md`.

**Step 3: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/ && pnpm lint && pnpm format`
Expected: green; lint and format clean (phase touches `.agents/skills/**`)

**Step 4: Commit**

```bash
git commit -m "feat(p04-t04): require terminal recap outcome before approval completes"
```

---

## Phase 5: Structured content contracts and renderers

### Task p05-t01: Structured content schemas

**Files:**

- Create: `.agents/skills/explainer-kit/schemas/hub-content.v1.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/deck-content.v1.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/diagram-content.v1.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/author-result.v3.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/references/contracts.md`
- Modify: `.agents/skills/explainer-kit/tests/schemas.test.mjs`

**Step 1: Write test (RED)**

Hub content validates sections, evidence tables, cards, callouts, and
artifact references (by ID only). Deck content validates slides each with
purpose, archetype (enum: outcome-hero, before-after, architecture,
decision-trade-off, evidence-scoreboard, comparison, next-action), headline,
evidence, optional comparison/visual, action. Diagram content validates
semantic nodes, groups/containers, labeled edges, layout direction, and
emphasis — author-supplied coordinates are rejected. Structured-content
result variants land in a **new contract version** (`author-result/v3`);
existing `author-result/v2` HTML payloads continue to validate unchanged
(retained-run and callback compatibility proven by test). Artistic artifacts
keep the HTML shape in both versions.

**Step 2: Implement (GREEN)**

Three content schemas plus the v3 author-result version alongside the
retained v2; registry and docs updated.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/schemas.test.mjs`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p05-t01): add structured content contracts for hub, deck, diagram"
```

---

### Task p05-t02: Role-based type system in the theme contract

**Files:**

- Create: `.agents/skills/explainer-kit/schemas/theme.v2.schema.json`
- Modify: `.agents/skills/explainer-kit/schemas/author-request.v3.schema.json` (theme reference accepts v1 and v2)
- Modify: `.agents/skills/explainer-kit/scripts/lib/theme.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/references/contracts.md`
- Modify: `.agents/skills/explainer-kit/styles/` (all four curated styles)
- Modify: `.agents/skills/explainer-kit/tests/theme.test.mjs`

**Step 1: Write test (RED)**

Role tokens (display, heading, body, UI, annotation, mono) with weights,
tracking, line heights, measures, and per-medium scales (page, deck, SVG
label) land in a **new theme contract version** (`explainer-kit.theme/v2`) —
required role-token shapes must not tighten the published `theme/v1` in
place. Retained `theme/v1` resolved bundles continue to validate and replay
byte-deterministically (proven by test); new runs resolve to v2. If a
genuinely backward-compatible additive v1 shape is proven instead, state and
test that proof explicitly in place of the v2 allocation. Deterministic
high-quality stacks replace generic `system-ui`/`ui-serif`/Georgia defaults
in every curated style; no external font fetches or active content.

**Step 2: Implement (GREEN)**

Theme v2 schema alongside retained v1, registry dispatch, resolution logic,
curated style updates, docs.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/theme.test.mjs .agents/skills/explainer-kit/tests/render.test.mjs`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p05-t02): add role-based deterministic type system"
```

---

### Task p05-t03: Hub structured renderer

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/render-hub.mjs`
- Create: `.agents/skills/explainer-kit/tests/render-hub.test.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/render.mjs`

**Step 1: Write test (RED)**

Hub content renders sections, evidence tables, cards, callouts, and
artifact-reference links (resolved from the canonical link table) with
renderer-owned layout, type roles, and responsive behavior; output passes
html-safety, accessibility, and link validation.

**Step 2: Implement (GREEN)**

Renderer module consuming `hub-content/v1` plus the resolved theme.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/render-hub.test.mjs .agents/skills/explainer-kit/tests/html-safety.test.mjs`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p05-t03): render hubs from structured content"
```

---

### Task p05-t04: Deck structured renderer with archetypes and anti-filler checks

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/render-deck.mjs`
- Create: `.agents/skills/explainer-kit/tests/render-deck.test.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/render.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/qa.mjs`

**Step 1: Write test (RED)**

Each archetype renders a distinct layout; deterministic checks fail decks
with repeated title-plus-paragraph slides, excessive empty viewport area,
duplicated slide-position text, no meaningful visual variation across
consecutive slides, overflow, or presentation-distance legibility failures.
Keyboard navigation, reduced-motion, and print behavior match existing deck
shell guarantees.

**Step 2: Implement (GREEN)**

Renderer plus deterministic QA checks wired into render QA.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/render-deck.test.mjs .agents/skills/explainer-kit/tests/qa.test.mjs`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p05-t04): render decks from slide archetypes with anti-filler checks"
```

---

### Task p05-t05: Semantic diagram renderer

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/diagram.mjs`
- Modify: `.agents/skills/explainer-kit/tests/diagram.test.mjs`

**Step 1: Write test (RED)**

Semantic graph content renders with: ownership, dependency, sequence, and
state-flow layout modes; auto-fit viewBox (no fixed 1200×720); labeled edges;
containers/swimlanes; overlap and crossing detection failing the render;
content-aware spacing; zoom/pan controls emitted only when the laid-out graph
exceeds the viewport. Existing non-linear detection and artistic rerouting
behavior is preserved.

**Step 2: Implement (GREEN)**

Extend the deterministic graph machinery; no author coordinates accepted.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/diagram.test.mjs`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p05-t05): render diagrams from semantic graph content"
```

---

### Task p05-t06: Switch standard recipe artifacts to structured authoring

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/set-plan.mjs`
- Modify: `.agents/skills/explainer-kit/schemas/author-request.v3.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/recipes/project-recap.json`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/recipes.test.mjs`

**Step 1: Write test (RED)**

`project-recap` hub, deck, and diagram artifacts request structured content
(`authoring: structured` with the matching content-contract reference,
declared in the `author-request/v3` contract created in p02-t01 — the
structured-authoring fields land in v3, never retrofitted onto v2); the core
renderers render them; artistic authoring remains available only where the
recipe declares it. End-to-end structured run passes link validation, browser
evidence, and visual review; retained v2 HTML-authoring replay still
validates.

**Step 2: Implement (GREEN)**

Recipe authoring switch, v3 author-request structured-content fields,
author-request construction, render dispatch.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/recipes.test.mjs && pnpm lint && pnpm format`
Expected: green; lint and format clean (phase touches `.agents/skills/**`)

**Step 4: Commit**

```bash
git commit -m "feat(p05-t06): author standard recap artifacts through structured contracts"
```

---

## Phase 6: Recipe floor, visual rubric v2, and fixtures

### Task p06-t01: Hub-floor recipe with planner-justified expansion

**Files:**

- Modify: `.agents/skills/explainer-kit/recipes/project-recap.json`
- Create: `.agents/skills/explainer-kit/schemas/set-plan.v2.schema.json`
- Modify: `.agents/skills/explainer-kit/schemas/author-request.v3.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/set-plan.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/references/contracts.md`
- Modify: `.agents/skills/explainer-kit/briefs/project-recap.md`
- Modify: `.agents/skills/explainer-kit/tests/recipes.test.mjs`

**Step 1: Write test (RED)**

`project-recap` floor contains only the hub; diagram, deck, and explainer
views are expansion entries requiring a planner justification (distinct
reader question + evidence pointers) recorded in the set plan; unjustified or
redundant expansion is rejected at planning time; existing expansion limits
still apply. Justification enforcement lands in a **new set-plan version**
(`set-plan/v2`); retained `set-plan/v1` documents continue to validate for
replay and archive consumers (proven by test), and new runs emit v2.
Contract-dependency propagation is in scope: the author-request contract
embeds the set plan and currently pins `set-plan/v1`, so update
`author-request.v3.schema.json` (and the registry) to accept `set-plan/v2`,
with end-to-end tests covering both new-run emission (v3 + set-plan v2) and
retained replay (v2 + set-plan v1). Audit the other three recipes and change
only those with the same floor contradiction (document the audit result in
the test or brief).

**Step 2: Implement (GREEN)**

Recipe v2, set-plan v2 schema alongside retained v1, author-request v3
set-plan reference update, planner enforcement, registry and docs updates.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/recipes.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p06-t01): make the hub the recap floor with justified expansion"
```

---

### Task p06-t02: Visual review rubric v2

**Files:**

- Create: `.agents/skills/explainer-kit/schemas/visual-review-request.v2.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/visual-review-result.v2.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/visual-review.mjs`
- Modify: `.agents/skills/explainer-kit/references/visual-review.md`
- Modify: `.agents/skills/explainer-kit/tests/visual-matrix.test.mjs`

**Step 1: Write test (RED)**

Rubric v2 requests enumerate the eight dimensions (intentional typography,
hierarchy, composition/balance, information density, medium leverage,
template repetition, diagram semantics, cross-artifact cohesion); results
require per-dimension scored findings; verdict vocabulary separates `pass`
(design bar met) from `correct` (legible but weak) and failing states;
results missing dimensions are rejected. Existing accessibility, keyboard,
reduced-motion, print, and mobile requirements remain necessary conditions.

**Step 2: Implement (GREEN)**

v2 schemas, validation, and reviewer guidance.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/visual-matrix.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p06-t02): expand visual review to scored design-quality rubric"
```

---

### Task p06-t03: Cyclone negative visual-quality fixture with a non-vacuous oracle

**Files:**

- Create: `.agents/skills/explainer-kit/tests/fixtures/negative-visual/` (Cyclone deck and diagram derivatives, pinned screenshots/DOM)
- Create: `.agents/skills/explainer-kit/scripts/lib/rubric-evidence.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/visual-review.mjs`
- Modify: `.agents/skills/explainer-kit/tests/visual-matrix.test.mjs`

**Step 1: Write test (RED)**

Because production judgment comes from an injected `visualCritic` callback, a
stub returning `correct` proves nothing. Add an **executable evidence seam**:
deterministic rubric-evidence extraction that derives expected failed
dimensions from the pinned fixture screenshots/DOM (repeated
title-plus-paragraph slide structure, fixed-viewBox identical boxes,
unlabeled connectors, generic type stacks). The test evaluates the fixture
through this seam with pinned inputs and asserts (a) the derived evidence
flags the typography, composition/density, and diagram-semantics dimensions,
and (b) a rubric-v2 result of `pass` for this fixture is rejected **because
the evidence contradicts it** — not because a stub is hard-coded. Expected
verdict is `correct`. Fixture is scrubbed of Duet-proprietary content while
preserving the structural defects.

**Step 2: Implement (GREEN)**

Bundle the fixture with pinned evidence inputs; implement the deterministic
evidence extraction; wire evidence-vs-verdict contradiction rejection into
visual-review validation and the visual matrix suite.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/visual-matrix.test.mjs`
Expected: green

**Step 4: Commit**

```bash
git commit -m "test(p06-t03): pin negative visual-quality fixture from the Cyclone case"
```

---

### Task p06-t04: Responsive golden fixtures and golden-benchmark preservation

**Files:**

- Modify: `.agents/skills/explainer-kit/tests/fixtures/golden/` (hub, diagram, deck structured-content goldens at 320/768/1440)
- Modify: `.agents/skills/explainer-kit/tests/golden-conformance.test.mjs`

**Step 1: Write test (RED)**

Desktop/tablet/mobile golden fixtures for hub, diagram, and deck rendered
from structured content; all three existing real-Chromium golden benchmarks
(simple, non-linear, archived recap) still pass under the new renderers,
type system, and rubric.

**Step 2: Implement (GREEN)**

Generate and pin the goldens; adjust benchmarks only where the new
renderer output is the intended change (each adjustment documented).

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/golden-conformance.test.mjs .agents/skills/explainer-kit/tests/visual-matrix.test.mjs && pnpm lint && pnpm format`
Expected: green; lint and format clean (phase touches `.agents/skills/**`)

**Step 4: Commit**

```bash
git commit -m "test(p06-t04): add responsive structured-content goldens"
```

---

### Task p06-t05: Migrate shipped contract consumers to the new versions

All new contract versions exist by the end of p06; this task carries them
through every shipped consumer outside the two core seams.

**Files:**

- Modify: `tools/release/validate-explainer-acceptance.mjs` (accept receipt v1/v2)
- Modify: `tools/release/run-explainer-rc.mjs` (accept receipt v1/v2)
- Modify: `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs` (assert v1 replay and v2 emission)
- Modify: `.agents/skills/oat-explainer-kit/references/author-callback.md` (author v2/v3)
- Modify: `.agents/skills/oat-explainer-kit/references/visual-review-callback.md` (visual-review v1/v2)
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`

**Step 1: Write test (RED)**

For each versioned contract pair — publish-receipt v1/v2, theme v1/v2,
author-request v2/v3, author-result v2/v3, set-plan v1/v2, visual-review
v1/v2 — shipped consumers accept both versions: the release acceptance
validator and RC runner validate v2 receipts while still reading retained v1
receipts; the private-wrapper smoke surface proves v1 replay and v2 emission;
adapter callback contracts and integration tests exercise the new author and
visual-review versions end to end. New-run emission and retained-version
replay are both proven before provider sync.

**Step 2: Implement (GREEN)**

Version dispatch in release tooling and smoke fixtures; adapter callback
reference and test migration.

**Step 3: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs tools/smoke/explainer-kit/wrapper-compatibility.test.mjs && pnpm lint && pnpm format`
Expected: green; lint and format clean (touches `tools/smoke` and `.agents/skills/**`)

**Step 4: Commit**

```bash
git commit -m "feat(p06-t05): migrate shipped consumers to new contract versions"
```

---

## Phase 7: Release closure

### Task p07-t01: Skill version bumps and provider sync

**Files:**

- Modify: `.agents/skills/explainer-kit/SKILL.md` (version bump)
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md` (version bump)
- Modify: `.agents/skills/oat-project-implement/SKILL.md` (version bump — its completion-and-closeout reference changes in p04-t04)
- Modify: `packages/cli/src/validation/skills.test.ts` (if version pins exist)
- Regenerate: provider views via `oat sync --scope all`

**Step 1: Implement**

One frontmatter `version:` bump per changed canonical skill (PR-scoped) —
every canonical skill the PR touches, including `oat-project-implement`;
run `oat sync --scope all`; update any literal version assertions.

**Step 2: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- skills.test.ts && pnpm lint && pnpm format`
Expected: green

**Step 3: Commit**

```bash
git commit -m "chore(p07-t01): bump explainer skill versions and sync providers"
```

---

### Task p07-t02: Lockstep package bump and full release validation

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `pnpm-lock.yaml`
- Regenerate: `packages/cli/assets/public-package-versions.json` (via `pnpm build`; commit atomically with the manifests)

**Step 1: Implement**

Bump all five public packages in lockstep (bundled `.agents/skills` assets
are shipped CLI functionality); run `pnpm build` so the tracked generated
version asset regenerates from the bumped manifests, and stage it in the same
commit.

**Step 2: Verify**

Run: `pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm release:validate && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts`
Expected: all repository and release gates green, including smoke and bundle consistency

**Step 3: Commit**

```bash
git commit -m "chore(p07-t02): lockstep public package bump and release validation"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

| Scope  | Type     | Status          | Date       | Artifact                                                                                                                                 | Reviewed Head | Invocation | Gate Target              |
| ------ | -------- | --------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------- | ------------------------ |
| p01    | code     | pending         | -          | -                                                                                                                                        | -             | -          | -                        |
| p02    | code     | pending         | -          | -                                                                                                                                        | -             | -          | -                        |
| p03    | code     | pending         | -          | -                                                                                                                                        | -             | -          | -                        |
| p04    | code     | pending         | -          | -                                                                                                                                        | -             | -          | -                        |
| p05    | code     | pending         | -          | -                                                                                                                                        | -             | -          | -                        |
| p06    | code     | pending         | -          | -                                                                                                                                        | -             | -          | -                        |
| p07    | code     | pending         | -          | -                                                                                                                                        | -             | -          | -                        |
| final  | code     | pending         | -          | -                                                                                                                                        | -             | -          | -                        |
| plan   | artifact | passed          | 2026-08-05 | inline (deliberate inheritance; 1 Important + 2 Medium fixed)                                                                            | -             | auto       | -                        |
| spec   | artifact | pending         | -          | -                                                                                                                                        | -             | -          | -                        |
| design | artifact | pending         | -          | -                                                                                                                                        | -             | -          | -                        |
| plan   | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T002327Z.md (4 Important + 1 Medium resolved in artifact)                                | -             | gate       | cursor-gpt-5-6-sol-xhigh |
| plan   | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T004027Z.md (2 Important + 1 Medium resolved in artifact; operator authorized attempt 3) | -             | gate       | cursor-gpt-5-6-sol-xhigh |
| plan   | artifact | fixes_completed | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T005429Z.md (4 Important + 2 Medium resolved in artifact)                                | -             | gate       | cursor-gpt-5-6-sol-xhigh |
| plan   | artifact | received        | 2026-08-06 | reviews/artifact-plan-review-2026-08-06T012159Z.md                                                                                       | -             | -          | -                        |
| plan   | artifact | received        | 2026-08-06 | reviews/artifact-plan-review-2026-08-06T012720Z.md                                                                                       | -             | -          | -                        |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 5 tasks — adapter path and destination derivation
- Phase 2: 4 tasks — core link integrity
- Phase 3: 6 tasks — publication integrity
- Phase 4: 4 tasks — lifecycle ordering and recovery
- Phase 5: 6 tasks — structured content contracts and renderers
- Phase 6: 5 tasks — recipe floor, rubric v2, fixtures, consumer migration
- Phase 7: 2 tasks — release closure

**Total: 32 tasks**

---

## References

- Design: `design.md` (approved lightweight design)
- Discovery: `discovery.md`
- Handoff: `references/handoff-cyclone-case-study.md` (normative acceptance criteria)
