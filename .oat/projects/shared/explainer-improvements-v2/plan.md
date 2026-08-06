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

**Architecture:** All changes land in the two canonical skills.
`explainer-kit` (core) stays destination-neutral and config-blind;
`oat-explainer-kit` (adapter) owns config resolution, invocation topology, and
per-invocation remote destination derivation. Two new hard build gates
(canonical link table, internal-link validator) and a protected-destination
publish mode preserve existing safety guarantees.

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
- Modify: `.agents/skills/oat-explainer-kit/tests/config-paths.test.mjs`

**Step 1: Write test (RED)**

A caller-supplied output root whose final segment equals the run slug is
rejected with an actionable error (or normalized — pick rejection; it is the
conservative contract) before any directory creation.

**Step 2: Implement (GREEN)**

Guard in the output-root resolution seam, applied to direct-caller roots and
any adapter-resolved root before core invocation.

**Step 3: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p01-t04): reject double-nested explainer output roots"
```

---

### Task p01-t05: Pass derived destination and public-access mode into the core publish request

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`

**Step 1: Write test (RED)**

The publish request the adapter constructs carries the derived (not raw
configured) roots and the configured `publicAccess` value; the core never
receives project/repo identifiers. Assert no credential material appears in
the constructed request.

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
- Modify: `.agents/skills/explainer-kit/schemas/author-request.v2.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`

**Step 1: Write test (RED)**

From a set plan, the link table maps every artifact ID to its site-relative
`renderedPath` ending in explicit `index.html`, and to the correct relative
URL from each authoring artifact's location (e.g. hub →
`../../diagrams/<slug>/architecture/index.html`). Author requests embed the
table; requests without it fail schema validation at the new version.

**Step 2: Implement (GREEN)**

Link-table derivation beside set-plan machinery; author-request schema
revision; contract validation.

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
injected fetch/client seams); every uploaded object is verified via
authenticated `head-object` hash/metadata comparison against the manifest;
public URLs are recorded unfetched with verification result
`skipped-protected` for the public fetch and `verified-authenticated` for the
object; a hash mismatch fails the publish; sentinel behavior uses
authenticated verification only.

**Step 2: Implement (GREEN)**

Branch the verification pipeline on the declared mode; keep upload,
additive-safety, retry, and credential-hygiene behavior shared.

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

- Modify: `.agents/skills/explainer-kit/schemas/publish-receipt.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/s3-static.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/explainer-kit/tests/s3-static.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`

**Step 1: Write test (RED)**

Receipt lists, for every published artifact: ID, rendered path, S3 URI,
canonical public URL, content hash, and structured verification result
(`verified-anonymous | verified-authenticated | skipped-protected`). Receipt
is atomic, durable in the run package, and contains no credential material.
Published bytes are asserted equal to finalized manifest hashes; any
transformation between manifest and upload fails.

**Step 2: Implement (GREEN)**

Receipt schema revision and emission; no publication-time HTML transformation
code path exists (assert by construction and test).

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/explainer-kit/tests/records.test.mjs`
Expected: green

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

### Task p04-t02: Automatic bounded correction from `built-needs-review`

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`

**Step 1: Write test (RED)**

A run reaching `built-needs-review` automatically enters the existing
one-correction-then-final-review machinery (no new loop; the cap is
unchanged). If the re-review is clean, the run proceeds to durability as
`built-durable`. If findings remain after the cap, the run terminates
`built-needs-review` with residual findings durably recorded and flagged —
and the lifecycle proceeds (flag-not-block). Publication remains blocked for
flagged runs absent explicit operator override.

**Step 2: Implement (GREEN)**

Wire auto-entry; record residual findings in the run record; document the
flag-not-block contract.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p04-t02): auto-enter bounded correction from built-needs-review"
```

---

### Task p04-t03: Recap gate terminal outcome before final approval

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/scripts/resolve-intent.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/persist-intent.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`
- Modify: `.agents/skills/oat-explainer-kit/tests/intent.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs`

**Step 1: Write test (RED)**

When recap intent resolves to `generate`, completion cannot finalize until
the recap records a terminal outcome; `built-durable`,
`built-needs-review`, and a compact failure record all count as terminal;
absence of any outcome blocks with an actionable message. Approval is never
conditioned on the outcome being clean.

**Step 2: Implement (GREEN)**

Ordering invariant in the intent/completion seam; document in
`lifecycle-contract.md`.

**Step 3: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/`
Expected: green

**Step 4: Commit**

```bash
git commit -m "feat(p04-t03): require terminal recap outcome before approval completes"
```

---

### Task p04-t04: Durable failure records for failed and superseded runs

**Files:**

- Create: `.agents/skills/explainer-kit/schemas/failure-record.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Modify: `.agents/skills/explainer-kit/tests/records.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`

**Step 1: Write test (RED)**

A failed run always leaves a compact durable failure record (run ID, recipe,
terminal outcome, error class, timestamps, superseding-run pointer when a
correction replaces it) inside the durable project tree; bulky diagnostics
follow the documented archive-or-delete policy and are never the only
evidence. Superseded runs gain the pointer when the corrected run finalizes.

**Step 2: Implement (GREEN)**

Failure-record schema and emission in core; adapter finalization places the
record durably and applies the diagnostics policy.

**Step 3: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/records.test.mjs .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs && pnpm lint && pnpm format`
Expected: green; lint and format clean (phase touches `.agents/skills/**`)

**Step 4: Commit**

```bash
git commit -m "feat(p04-t04): retain durable failure records for failed runs"
```

---

## Phase 5: Structured content contracts and renderers

### Task p05-t01: Structured content schemas

**Files:**

- Create: `.agents/skills/explainer-kit/schemas/hub-content.v1.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/deck-content.v1.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/diagram-content.v1.schema.json`
- Modify: `.agents/skills/explainer-kit/schemas/author-result.v2.schema.json`
- Modify: `.agents/skills/explainer-kit/tests/schemas.test.mjs`

**Step 1: Write test (RED)**

Hub content validates sections, evidence tables, cards, callouts, and
artifact references (by ID only). Deck content validates slides each with
purpose, archetype (enum: outcome-hero, before-after, architecture,
decision-trade-off, evidence-scoreboard, comparison, next-action), headline,
evidence, optional comparison/visual, action. Diagram content validates
semantic nodes, groups/containers, labeled edges, layout direction, and
emphasis — author-supplied coordinates are rejected. Author results carry
structured content for standard artifacts; artistic artifacts keep the
existing HTML shape.

**Step 2: Implement (GREEN)**

Three schemas plus author-result revision.

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

- Modify: `.agents/skills/explainer-kit/schemas/theme.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/theme.mjs`
- Modify: `.agents/skills/explainer-kit/styles/` (all four curated styles)
- Modify: `.agents/skills/explainer-kit/tests/theme.test.mjs`

**Step 1: Write test (RED)**

Resolved theme bundles carry role tokens (display, heading, body, UI,
annotation, mono) with weights, tracking, line heights, measures, and
per-medium scales (page, deck, SVG label). Deterministic high-quality stacks
replace generic `system-ui`/`ui-serif`/Georgia defaults in every curated
style; no external font fetches or active content; replay from a resolved
bundle is byte-deterministic.

**Step 2: Implement (GREEN)**

Theme schema revision, resolution logic, curated style updates.

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
- Modify: `.agents/skills/explainer-kit/recipes/project-recap.json`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/recipes.test.mjs`

**Step 1: Write test (RED)**

`project-recap` hub, deck, and diagram artifacts request structured content
(`authoring: structured` with the matching contract) and are rendered by the
core renderers; artistic authoring remains available only where the recipe
declares it; end-to-end structured run passes link validation, browser
evidence, and visual review stages.

**Step 2: Implement (GREEN)**

Recipe authoring switch, author-request construction, render dispatch.

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
- Modify: `.agents/skills/explainer-kit/schemas/set-plan.v1.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/set-plan.mjs`
- Modify: `.agents/skills/explainer-kit/briefs/project-recap.md`
- Modify: `.agents/skills/explainer-kit/tests/recipes.test.mjs`

**Step 1: Write test (RED)**

`project-recap` floor contains only the hub; diagram, deck, and explainer
views are expansion entries requiring a planner justification (distinct
reader question + evidence pointers) recorded in the set plan; unjustified or
redundant expansion is rejected at planning time; existing expansion limits
still apply. Audit the other three recipes and change only those with the
same floor contradiction (document the audit result in the test or brief).

**Step 2: Implement (GREEN)**

Recipe v2, set-plan justification fields, planner enforcement.

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

### Task p06-t03: Cyclone negative visual-quality fixture

**Files:**

- Create: `.agents/skills/explainer-kit/tests/fixtures/negative-visual/` (Cyclone deck and diagram derivatives)
- Modify: `.agents/skills/explainer-kit/tests/visual-matrix.test.mjs`

**Step 1: Write test (RED)**

A rubric-v2 evaluation of the bundled Cyclone-derived deck and diagram
fixture must not produce `pass`; expected verdict is `correct` with findings
in typography, composition/density, and diagram-semantics dimensions.
Fixture is scrubbed of any Duet-proprietary content while preserving the
structural defects (title+paragraph slides, fixed-viewBox identical boxes,
unlabeled connectors).

**Step 2: Implement (GREEN)**

Bundle the fixture; wire the assertion into the visual matrix suite.

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

## Phase 7: Release closure

### Task p07-t01: Skill version bumps and provider sync

**Files:**

- Modify: `.agents/skills/explainer-kit/SKILL.md` (version bump)
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md` (version bump)
- Modify: `packages/cli/src/validation/skills.test.ts` (if version pins exist)
- Regenerate: provider views via `oat sync --scope all`

**Step 1: Implement**

One frontmatter `version:` bump per changed canonical skill (PR-scoped);
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

**Step 1: Implement**

Bump all five public packages in lockstep (bundled `.agents/skills` assets
are shipped CLI functionality).

**Step 2: Verify**

Run: `pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm release:validate`
Expected: all repository and release gates green, including smoke

**Step 3: Commit**

```bash
git commit -m "chore(p07-t02): lockstep public package bump and release validation"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

| Scope  | Type     | Status   | Date       | Artifact                                                      | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | -------- | ---------- | ------------------------------------------------------------- | ------------- | ---------- | ----------- |
| p01    | code     | pending  | -          | -                                                             | -             | -          | -           |
| p02    | code     | pending  | -          | -                                                             | -             | -          | -           |
| p03    | code     | pending  | -          | -                                                             | -             | -          | -           |
| p04    | code     | pending  | -          | -                                                             | -             | -          | -           |
| p05    | code     | pending  | -          | -                                                             | -             | -          | -           |
| p06    | code     | pending  | -          | -                                                             | -             | -          | -           |
| p07    | code     | pending  | -          | -                                                             | -             | -          | -           |
| final  | code     | pending  | -          | -                                                             | -             | -          | -           |
| plan   | artifact | passed   | 2026-08-05 | inline (deliberate inheritance; 1 Important + 2 Medium fixed) | -             | auto       | -           |
| spec   | artifact | pending  | -          | -                                                             | -             | -          | -           |
| design | artifact | pending  | -          | -                                                             | -             | -          | -           |
| plan   | artifact | received | 2026-08-06 | reviews/artifact-plan-review-2026-08-06T002327Z.md            | -             | -          | -           |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 5 tasks — adapter path and destination derivation
- Phase 2: 4 tasks — core link integrity
- Phase 3: 5 tasks — publication integrity
- Phase 4: 4 tasks — lifecycle ordering and recovery
- Phase 5: 6 tasks — structured content contracts and renderers
- Phase 6: 4 tasks — recipe floor, rubric v2, fixtures
- Phase 7: 2 tasks — release closure

**Total: 30 tasks**

---

## References

- Design: `design.md` (approved lightweight design)
- Discovery: `discovery.md`
- Handoff: `references/handoff-cyclone-case-study.md` (normative acceptance criteria)
