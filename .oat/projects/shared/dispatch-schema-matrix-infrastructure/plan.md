---
oat_plan_source: quick
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-10
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: [['p02', 'p03']]
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: dispatch-schema-matrix-infrastructure

> Execute this plan using `oat-project-implement`. Phase p01 establishes the
> shared contract; p02 and p03 then run in parallel; p04 and p05 converge the
> evidence, documentation, and release work.

**Goal:** Consolidate dispatch-matrix normalization and traversal, add a
versioned reusable dispatch report, cache Cursor catalog validation per pass,
and close GPT-5.6 Cursor slug verification with reproducible live evidence.

**Architecture:** A shared config-domain matrix core feeds thin config,
project-state, doctor, and validation adapters. A separate identity-domain
report core consumes existing resolver and immutable gate provenance without
owning selection. Cursor validation uses a command-scoped coordinator, and live
evidence controls recommendation and documentation changes.

**Tech Stack:** TypeScript ESM, Commander.js, Vitest, pnpm workspaces,
Turborepo, Markdown/Fumadocs.

**Commit Convention:** `{type}(pNN-tNN): {description}`

## Planning Checklist

- [x] Lightweight design approved
- [x] Complete user-owned candidate ladders verified through the High ceiling
- [x] Project named ceiling recorded as managed High
- [x] Defer HiLL checkpoint confirmation to oat-project-implement
- [x] Evaluated phases for parallelism opportunities
- [x] Declared the disjoint p02/p03 parallel group
- [ ] Record optional phase-review selection
- [ ] Complete managed plan artifact review

## Parallelism

`p02` and `p03` may run concurrently after `p01`. The validation phase writes
availability, validation-pass, config, and doctor files; the report phase
writes report, stamp, resolver, help, and gate files. Neither phase owns shared
generated assets or documentation. `p04` waits for both so evidence-driven
documentation can describe the final contracts, and `p05` remains sequential
because package assets and release validation are repository-wide.

---

## Phase p01: Shared Dispatch Matrix Core

**Outcome:** One canonical algebra, normalizer, and provenance-rich walker
replaces duplicated matrix shape logic while preserving every legacy and
malformed-input compatibility boundary.

### Task p01-t01: Add the shared matrix algebra, normalizer, and walker

**Files:**

- Create: `packages/cli/src/config/dispatch-matrix.ts`
- Create: `packages/cli/src/config/dispatch-matrix.test.ts`
- Modify: `packages/cli/src/config/oat-config.ts`

**Step 1: Write test (RED)**

Cover provider scalars, direct targets, legacy arrays, explicit fallback
routes, candidate ladders, sparse tier maps, malformed candidates, atomic Codex
model/effort pairs, and byte-preserved Cursor strings. Assert walker tier,
candidate index, fallback-route index, path, source, and the exactly-one-of
`value`/`target` invariant.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/dispatch-matrix.test.ts`
Expected: Tests fail because the shared module does not exist.

**Step 2: Implement (GREEN)**

Add `normalizeDispatchMatrix` and `walkDispatchMatrix` plus the design's issue,
context, normalized-matrix, and cell-ref types. Re-export existing public
algebra from `oat-config.ts` to preserve callers.

**Step 3: Refactor**

Keep provider-specific availability policy outside the core and keep malformed
entries represented as structured issues rather than silently dropping them.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/dispatch-matrix.test.ts`
Expected: All shared-core cases pass.

**Step 5: Commit**

```bash
git add packages/cli/src/config/dispatch-matrix.ts packages/cli/src/config/dispatch-matrix.test.ts packages/cli/src/config/oat-config.ts
git commit -m "feat(p01-t01): add shared dispatch matrix core"
```

### Task p01-t02: Adopt shared normalization in layered configuration

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`

**Step 1: Write test (RED)**

Characterize accepted and malformed layered-config inputs and prove each
`{ candidates: [...] }` object remains atomic during flattening and precedence
resolution.

**Step 2: Implement (GREEN)**

Replace the private config normalizers with the shared layered-config adapter
while preserving canonical ladder output and existing warning/drop behavior.

**Step 3: Refactor**

Remove obsolete private helpers only after compatibility re-exports and
flattening guards use the shared core.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/dispatch-matrix.test.ts src/config/oat-config.test.ts src/config/resolve.test.ts`
Expected: Normalization and atomic-layer regression suites pass.

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts packages/cli/src/config/resolve.ts packages/cli/src/config/resolve.test.ts
git commit -m "refactor(p01-t02): share layered matrix normalization"
```

### Task p01-t03: Adopt shared normalization in project state

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`

**Step 1: Write test (RED)**

Lock absent matrices, sparse legacy overrides, modern ladders, malformed-input
warnings, and the existing legacy-shaped top-level JSON compatibility field.

**Step 2: Implement (GREEN)**

Replace `normalizeProjectMatrix*` with a project-state adapter over the shared
normalizer. Canonicalize internally while preserving external warning and JSON
behavior.

**Step 3: Refactor**

Keep selection in the resolver; the adapter only translates normalization
issues and compatibility output.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/index.test.ts`
Expected: Project-state compatibility and ladder resolution pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/dispatch-ceiling/index.ts packages/cli/src/commands/project/dispatch-ceiling/index.test.ts
git commit -m "refactor(p01-t03): share project matrix normalization"
```

### Task p01-t04: Propagate exact candidate index through resolution

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`

**Step 1: Write test (RED)**

Assert a non-first Terra candidate reports index `1`, a project-state candidate
reports its exact index, and `candidateIndex` remains distinct from fallback
`routeIndex`.

**Step 2: Implement (GREEN)**

Carry `candidateIndex` through requested-matrix matching,
`ResolvedDispatchPolicy`, and `DispatchSelection`; use `null` for non-candidate
branches.

**Step 3: Refactor**

Do not rediscover indices from formatted values or route targets.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/index.test.ts`
Expected: Exact selection and fail-closed cases pass with index provenance.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/dispatch-ceiling/index.ts packages/cli/src/commands/project/dispatch-ceiling/index.test.ts
git commit -m "feat(p01-t04): preserve dispatch candidate index"
```

### Task p01-t05: Replace config adoption traversals with shared references

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write test (RED)**

Characterize exact scalar, candidate, and nested fallback paths. Retain the
fail-closed incomplete Codex pair and atomic Codex pair validation cases.

**Step 2: Implement (GREEN)**

Replace both the availability-ref walker and parallel target-shape traversal
with shared refs/issues plus a thin provider-specific availability adapter.

**Step 3: Refactor**

Ensure malformed structured targets fail before availability probing and that
valid structured targets use `target` rather than a synthetic string.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts`
Expected: Adoption, path, closed-provider, and target-shape tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts
git commit -m "refactor(p01-t05): share config matrix traversal"
```

### Task p01-t06: Replace doctor traversal with shared references

**Files:**

- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`

**Step 1: Write test (RED)**

Add modern ladder and nested fallback-route fixtures alongside scalar, Codex
pair, Cursor diagnostic, and local/user provenance cases.

**Step 2: Implement (GREEN)**

Remove the private doctor walker and layer-ref type. Adapt shared refs to the
existing issue formatter without reconstructing source from path strings.

**Step 3: Refactor**

Preserve valid, unknown-value, and unvalidated display semantics.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/index.test.ts`
Expected: Doctor path, provenance, and outcome suites pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/doctor/index.ts packages/cli/src/commands/doctor/index.test.ts
git commit -m "refactor(p01-t06): share doctor matrix traversal"
```

---

## Phase p02: Pass-Scoped Cursor Validation

**Outcome:** Config adoption and doctor share one command-scoped validation
coordinator that probes every distinct Cursor candidate once and memoizes broad
catalog diagnostics once per pass.

### Task p02-t01: Separate Cursor Task probing from catalog diagnostics

**Files:**

- Modify: `packages/cli/src/providers/identity/availability.ts`
- Modify: `packages/cli/src/providers/identity/availability.test.ts`

**Step 1: Write test (RED)**

Characterize sentinel success, explicit allow-list acceptance/rejection,
primary catalog context, fallback catalog context, and unavailable CLI results
as separate operations.

**Step 2: Implement (GREEN)**

Extract injectable Task-probe and broad-catalog helpers while preserving the
public single-value `validateMatrixCell` behavior.

**Step 3: Refactor**

Keep broad catalog presence diagnostic-only and preserve exact Cursor strings.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/availability.test.ts`
Expected: Existing availability semantics and new helper cases pass.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/identity/availability.ts packages/cli/src/providers/identity/availability.test.ts
git commit -m "refactor(p02-t01): separate cursor validation operations"
```

### Task p02-t02: Add the validation-pass coordinator

**Files:**

- Create: `packages/cli/src/providers/identity/dispatch-validation.ts`
- Create: `packages/cli/src/providers/identity/dispatch-validation.test.ts`

**Step 1: Write test (RED)**

Prove duplicate refs share one Task probe, distinct candidates each probe once,
concurrent requests share one `models` call and at most one `--list-models`
fallback, and failures are memoized for the pass.

**Step 2: Implement (GREEN)**

Add `createDispatchValidationPassContext` and
`validateDispatchMatrixRefs`, grouping exact opaque candidates and fanning
typed results back to every source ref.

**Step 3: Refactor**

Keep the cache inside the explicit context; add no module-global state or TTL.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/availability.test.ts src/providers/identity/dispatch-validation.test.ts`
Expected: Probe and catalog call counts plus all outcome states pass.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/identity/dispatch-validation.ts packages/cli/src/providers/identity/dispatch-validation.test.ts
git commit -m "feat(p02-t02): add dispatch validation pass context"
```

### Task p02-t03: Use one validation pass during matrix adoption

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write test (RED)**

Add duplicate and distinct Cursor candidate fixtures and assert Task/catalog
call counts, exact paths, and result fan-out.

**Step 2: Implement (GREEN)**

Create one context per adoption command and replace per-ref calls with the
batch coordinator.

**Step 3: Refactor**

Preserve save-anyway warnings and structured-target validation order.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts src/providers/identity/dispatch-validation.test.ts`
Expected: Adoption results remain compatible with one-pass call counts.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts
git commit -m "perf(p02-t03): cache cursor validation during adoption"
```

### Task p02-t04: Use one validation pass during doctor checks

**Files:**

- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`

**Step 1: Write test (RED)**

Assert duplicate refs across config layers share Task/catalog work while each
layer retains its own issue path and provenance.

**Step 2: Implement (GREEN)**

Create one context per dispatch-matrix doctor check and consume batch results.

**Step 3: Refactor**

Keep doctor formatting and pass/warn/fail policy in the doctor adapter.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor/index.test.ts src/providers/identity/dispatch-validation.test.ts`
Expected: Doctor outcomes and one-pass call counts pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/doctor/index.ts packages/cli/src/commands/doctor/index.test.ts
git commit -m "perf(p02-t04): cache cursor validation during doctor"
```

---

## Phase p03: Dispatch Report V1

**Outcome:** Resolver and gate workflows expose one deterministic versioned
report while retaining current top-level JSON and `Dispatch:` compatibility.

### Task p03-t01: Add the report schema and pure builder

**Files:**

- Create: `packages/cli/src/providers/identity/dispatch-report.ts`
- Create: `packages/cli/src/providers/identity/dispatch-report.test.ts`

**Step 1: Write test (RED)**

Cover managed exact selection, inherit/default, unresolved policy,
runtime-not-reported, and immutable gate invocation. Assert action/role pairs
and distinct policy, cell, gate, and runtime provenance.

**Step 2: Implement (GREEN)**

Define `DispatchReportV1`, input/control/target types, and pure
`buildDispatchReport` with deterministic defaults.

**Step 3: Refactor**

Make `selection.selectionBranch` authoritative and never reconstruct exact
targets or candidate indices from strings.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/dispatch-report.test.ts`
Expected: Schema and builder cases pass.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/identity/dispatch-report.ts packages/cli/src/providers/identity/dispatch-report.test.ts
git commit -m "feat(p03-t01): add dispatch report schema"
```

### Task p03-t02: Add deterministic JSON and human formatting

**Files:**

- Modify: `packages/cli/src/providers/identity/dispatch-report.ts`
- Modify: `packages/cli/src/providers/identity/dispatch-report.test.ts`

**Step 1: Write test (RED)**

Snapshot stable key order and human blocks for exact, inherited, blocked, and
runtime-unreported reports; require accurate not-reported language.

**Step 2: Implement (GREEN)**

Add `serializeDispatchReport` and `formatDispatchReport` over the same report
object.

**Step 3: Refactor**

Keep formatting pure and avoid presenting configured targets as observed
runtime identity.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/dispatch-report.test.ts`
Expected: Machine and human rendering cases pass deterministically.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/identity/dispatch-report.ts packages/cli/src/providers/identity/dispatch-report.test.ts
git commit -m "feat(p03-t02): format dispatch reports"
```

### Task p03-t03: Derive compatibility stamps from reports

**Files:**

- Modify: `packages/cli/src/providers/identity/dispatch-report.ts`
- Modify: `packages/cli/src/providers/identity/dispatch-report.test.ts`
- Modify: `packages/cli/src/providers/identity/stamp.ts`
- Modify: `packages/cli/src/providers/identity/stamp.test.ts`

**Step 1: Write test (RED)**

Assert `toDispatchStampRecord` preserves the existing field order and parser
grammar across materialized Codex, model-argument, inherited, and unknown
runtime cases.

**Step 2: Implement (GREEN)**

Add the report adapter and route new stamp creation through it without changing
legacy parsing.

**Step 3: Refactor**

Keep `Dispatch:` a derived compatibility surface, not a second schema.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/dispatch-report.test.ts src/providers/identity/stamp.test.ts`
Expected: Report/stamp parity and all legacy parsing cases pass.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/identity/dispatch-report.ts packages/cli/src/providers/identity/dispatch-report.test.ts packages/cli/src/providers/identity/stamp.ts packages/cli/src/providers/identity/stamp.test.ts
git commit -m "refactor(p03-t03): derive dispatch stamps from reports"
```

### Task p03-t04: Integrate report context with dispatch-ceiling resolve

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`

**Step 1: Write test (RED)**

Cover `--report-scope` and `--report-action`, V1 action/role validation,
optional `dispatchReport` JSON, formatted human output, non-first candidate
index, and unchanged output when report context is absent.

**Step 2: Implement (GREEN)**

Build the report from the completed resolver result and add the two explicit
CLI options without changing candidate selection.

**Step 3: Refactor**

Preserve every existing top-level resolver field for compatibility.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/index.test.ts src/commands/help-snapshots.test.ts src/commands/commands.integration.test.ts`
Expected: Resolver, help, and command integration tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/dispatch-ceiling/index.ts packages/cli/src/commands/project/dispatch-ceiling/index.test.ts packages/cli/src/commands/help-snapshots.test.ts packages/cli/src/commands/commands.integration.test.ts
git commit -m "feat(p03-t04): expose dispatch reports from resolver"
```

### Task p03-t05: Adapt immutable gate provenance into reports

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`
- Modify: `packages/cli/src/providers/identity/dispatch-report.test.ts`

**Step 1: Write test (RED)**

Assert configured invocation survives differing or missing producer reports,
self-reported identity cannot overwrite it, and work-producer diversity is not
misrepresented as runtime-confirmed reviewer identity.

**Step 2: Implement (GREEN)**

Map the frozen gate invocation record into `gateInvocation`; preserve existing
gate/diversity JSON and leave reviewer runtime identity not reported unless an
independent observation exists.

**Step 3: Refactor**

Keep corroboration fail-closed before severity evaluation and avoid changing
gate selection or target ownership.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts src/providers/identity/dispatch-report.test.ts`
Expected: Gate provenance, diversity, and report tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts packages/cli/src/providers/identity/dispatch-report.test.ts
git commit -m "feat(p03-t05): report immutable gate invocation"
```

---

## Phase p04: Cursor Evidence and User Documentation

**Outcome:** Every recommended GPT-5.6 Cursor slug has dated, sanitized,
reproducible Task-probe evidence, and recommendation/docs changes follow only
from that evidence.

### Task p04-t01: Create the live-verification inventory and protocol

**Files:**

- Create: `.oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md`
- Read: `packages/cli/config/dispatch-matrix-recommendation.json`

**Step 1: Write evidence assertions (RED)**

Enumerate all distinct recommendation-version Cursor candidates and assert the
artifact has one pending row per exact string plus a separate configured-subset
section.

**Step 2: Implement (GREEN)**

Record recommendation version, canonical prompt/sentinel, exact command shape,
sanitized environment fields, capture rules, outcome vocabulary, and the 13
derived candidates.

**Step 3: Refactor**

Exclude credentials and make broad catalog data explicitly diagnostic-only.

**Step 4: Verify**

Run: `rg -n "gpt-5.6-|OAT_CURSOR_SUBAGENT_MODEL_VALID|recheck|configured" .oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md`
Expected: Protocol, 13-candidate inventory, configured subset, and recheck fields are present.

**Step 5: Commit**

```bash
git add .oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md
git commit -m "docs(p04-t01): define cursor verification protocol"
```

### Task p04-t02: Run and record all live Cursor Task probes

**Files:**

- Modify: `.oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md`

**Step 1: Establish capture baseline**

Record UTC date, `command -v cursor-agent`/`agent`, sanitized client version or
availability context, and exact recommendation SHA/version.

**Step 2: Execute probes**

Run the canonical Task/subagent prompt once for each exact candidate. Capture
the actual command, prompt, stdout, stderr, direct exit status, sentinel or
allow-list basis, and duration without piping away exit codes.

**Step 3: Record unavailable outcomes**

For every non-definitive result, record `unvalidated` or `unknown-value`, the
diagnostic context, and a concrete recheck date. Do not infer from slug names or
catalog presence.

**Step 4: Verify**

Run: `rg -n "exit status|stdout|stderr|sentinel|recheck date" .oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md`
Expected: Every candidate has complete reproducible evidence or a dated recheck.

**Step 5: Commit**

```bash
git add .oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md
git commit -m "test(p04-t02): record cursor gpt-5-6 probes"
```

### Task p04-t03: Reconcile the recommendation with live evidence

**Files:**

- Modify: `.oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md`
- Modify if evidence requires: `packages/cli/config/dispatch-matrix-recommendation.json`
- Modify if evidence requires: `packages/cli/src/commands/config/index.test.ts`
- Regenerate if recommendation changes: `packages/cli/assets/config/dispatch-matrix-recommendation.json`

**Step 1: Write expectation (RED)**

Document the evidence-to-recommendation decision for every retained, changed,
or unavailable candidate before editing the asset.

**Step 2: Implement (GREEN)**

Apply only evidence-supported changes, bump the recommendation version when the
asset changes, and use the bundle script for the generated mirror. If no asset
change is justified, record that explicit disposition in the evidence artifact.

**Step 3: Refactor**

Keep abstract tiers provider-neutral and Cursor strings opaque.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts`
Expected: Recommendation adoption and bundle consistency pass.

**Step 5: Commit**

```bash
git add .oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md packages/cli/config/dispatch-matrix-recommendation.json packages/cli/assets/config/dispatch-matrix-recommendation.json packages/cli/src/commands/config/index.test.ts
git commit -m "docs(p04-t03): reconcile cursor recommendation evidence"
```

### Task p04-t04: Document report semantics and Cursor verification

**Files:**

- Modify: `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md`
- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/provider-sync/providers.md`
- Modify if navigation requires: `apps/oat-docs/docs/reference/cli-reference.md`

**Step 1: Write documentation checklist (RED)**

Require schema version, policy/ceiling/candidate/target distinctions,
configured versus runtime identity, derived `Dispatch:` compatibility, one-pass
cache lifetime, live-evidence link, and unavailable-candidate recheck behavior.

**Step 2: Implement (GREEN)**

Update user-facing CLI/workflow/provider documentation from the implemented
report and recorded evidence. Do not hand-edit `apps/oat-docs/index.md`.

**Step 3: Refactor**

Use one vocabulary across pages and avoid claiming catalog presence proves
subagent eligibility.

**Step 4: Verify**

Run: `pnpm build:docs && pnpm docs:check-links`
Expected: Docs build and link checks pass.

**Step 5: Commit**

```bash
git add apps/oat-docs/docs
git commit -m "docs(p04-t04): document dispatch reports and cursor evidence"
```

---

## Phase p05: Release and Backlog Closeout

**Outcome:** Shipped CLI assets are versioned consistently, repository release
checks pass, and the four associated backlog items record their actual outcomes.

### Task p05-t01: Bump lockstep public packages and regenerate assets

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `pnpm-lock.yaml`
- Regenerate: `packages/cli/assets/public-package-versions.json`
- Regenerate: other CLI bundled assets affected by this project

**Step 1: Verify baseline (RED)**

Run `pnpm release:check-versions` and identify the next lockstep patch version
from the current `0.1.48` baseline.

**Step 2: Implement (GREEN)**

Bump all five public packages together, update the lockfile, and regenerate
assets through repository scripts rather than hand-editing mirrors.

**Step 3: Refactor**

Confirm only shipped assets and intended generated mirrors changed.

**Step 4: Verify**

Run: `pnpm release:check-versions && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts`
Expected: Lockstep version and bundle consistency checks pass.

**Step 5: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml packages/cli/assets
git commit -m "chore(p05-t01): bump public package versions"
```

### Task p05-t02: Run the full repository and release verification

**Files:**

- Modify only if verification exposes project-caused drift: files already in this plan's scope

**Step 1: Run focused regression suites**

Run all exact matrix, resolver, config, doctor, availability, validation,
report, stamp, gate, help, integration, and bundle test files changed above.

**Step 2: Run repository checks**

Run `pnpm format`, `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm build`,
and `pnpm build:docs` sequentially where generated assets are shared.

**Step 3: Run release validation**

Run `pnpm release:validate` and `git diff --check`. Repair only failures caused
by this project and rerun the failing command plus the release validator.

**Step 4: Verify**

Expected: All focused, repository, documentation, and release checks pass with
no unexplained generated-asset drift.

**Step 5: Commit**

```bash
git add packages/cli packages/control-plane packages/docs-config packages/docs-theme packages/docs-transforms apps/oat-docs pnpm-lock.yaml
git diff --cached --quiet || git commit -m "fix(p05-t02): resolve release validation drift"
```

### Task p05-t03: Close associated backlog items with evidence

**Files:**

- Modify: `.oat/repo/pjm/backlog/items/BL-260709-add-dispatch-machine-schema.md`
- Modify: `.oat/repo/pjm/backlog/items/BL-260707-consolidate-dispatch-matrix.md`
- Modify: `.oat/repo/pjm/backlog/items/BL-260707-cache-cursor-model-catalog.md`
- Modify: `.oat/repo/pjm/backlog/items/BL-260708-verify-cursor-gpt-5-6-subagent.md`
- Modify: `.oat/repo/pjm/backlog/index.md`
- Modify if used by current convention: `.oat/repo/pjm/backlog/completed.md`

**Step 1: Verify acceptance criteria**

Map each backlog criterion to implementation commits, tests, documentation,
and the live Cursor evidence. Leave an item open if its evidence is incomplete.

**Step 2: Implement closeout**

Update status, timestamp, outcome notes, and project/evidence references; refresh
the managed backlog index without overwriting curated narrative.

**Step 3: Refactor**

Distinguish a successfully verified slug from an unavailable slug with a dated
recheck; do not claim closure beyond recorded evidence.

**Step 4: Verify**

Run: `pnpm run cli -- pjm doctor --json`
Expected: PJM references and backlog index are consistent.

**Step 5: Commit**

```bash
git add .oat/repo/pjm/backlog
git commit -m "chore(p05-t03): close dispatch infrastructure backlog"
```

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                      |
| ------ | -------- | --------------- | ---------- | ------------------------------------------------------------- |
| p01    | code     | pending         | -          | -                                                             |
| p02    | code     | pending         | -          | -                                                             |
| p03    | code     | pending         | -          | -                                                             |
| p04    | code     | pending         | -          | -                                                             |
| p05    | code     | pending         | -          | -                                                             |
| final  | code     | pending         | -          | -                                                             |
| spec   | artifact | pending         | -          | -                                                             |
| design | artifact | fixes_completed | 2026-07-10 | reviews/archived/artifact-design-review-2026-07-10T200942Z.md |
| plan   | artifact | pending         | -          | -                                                             |

The user approved the lightweight design after all six received design-review
findings were resolved. No formal `spec.md` exists in quick mode.

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

## Implementation Complete

**Summary:**

- Phase p01: 6 tasks — shared matrix core and adapters
- Phase p02: 4 tasks — pass-scoped Cursor validation
- Phase p03: 5 tasks — Dispatch Report V1 and integrations
- Phase p04: 4 tasks — live evidence, recommendation, and docs
- Phase p05: 3 tasks — release validation and backlog closeout

**Total: 22 tasks**

Ready for implementation only after optional phase-review setup and the managed
plan artifact review complete.

## References

- Discovery: `discovery.md`
- Design: `design.md`
- Cursor evidence target: `references/cursor-gpt-5-6-subagent-verification.md`
- Completed dependency summary:
  `.oat/repo/reference/project-summaries/20260710-gate-review-provenance-target-safety.md`
- Recommendation: `packages/cli/config/dispatch-matrix-recommendation.json`
- Backlog:
  - `.oat/repo/pjm/backlog/items/BL-260709-add-dispatch-machine-schema.md`
  - `.oat/repo/pjm/backlog/items/BL-260707-consolidate-dispatch-matrix.md`
  - `.oat/repo/pjm/backlog/items/BL-260707-cache-cursor-model-catalog.md`
  - `.oat/repo/pjm/backlog/items/BL-260708-verify-cursor-gpt-5-6-subagent.md`
