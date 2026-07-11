---
oat_plan_source: quick
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-11
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p05']
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [['p02', 'p03']]
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: dispatch-schema-matrix-infrastructure

> Execute this plan using `oat-project-implement`. Phase p01 establishes the
> shared contract; p02 and p03 then run in parallel; p04 and p05 converge the
> initial evidence, documentation, and release work. The approved p06 revision
> strengthens Cursor Task evidence and reruns the live probes.

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
- [x] Phase review disabled by user; retain phase-boundary self-review and final gate review
- [x] Complete managed p06 plan artifact review

## Parallelism

`p02` and `p03` may run concurrently after `p01`. The validation phase writes
availability, validation-pass, config, and doctor files; the report phase
writes report, stamp, resolver, help, and gate files. Neither phase owns shared
generated assets or documentation. `p04` waits for both so evidence-driven
documentation can describe the final contracts, and `p05` remains sequential
because package assets and release validation are repository-wide.
After folding the parallel branches back together, rerun
`src/commands/commands.integration.test.ts` on the combined tree because p02
changes config/doctor runtime behavior while p03 owns that integration surface.

`p06` is a sequential revision after the original final review. It invalidates
that review as the current implementation boundary and requires a fresh final
review after its four tasks complete.

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

### Task p03-t06: Integrate reports into implementation and review workflows

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `.agents/skills/oat-project-review-provide-remote/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write test (RED)**

Require implementation and review dispatches to supply explicit report scope
and action, consume the versioned report for human output, and derive the
formal compatibility stamp from that report. Require each changed canonical
skill's frontmatter version to increase once in this PR.

**Step 2: Implement (GREEN)**

Update implementation and local/remote review workflows to invoke the resolver
with `--report-scope`/`--report-action`, render or consume the report, and retain
the exact managed provider target. Do not add provider/model `--target`
arguments to lifecycle gates.

**Step 3: Refactor**

Keep configured invocation, work-producer diversity, and runtime reviewer
identity distinct in all workflow guidance.
Do not hand-edit the bundled mirrors under `packages/cli/assets/skills/`;
the p05 build regenerates them from the canonical skills.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/validation/skills.test.ts`
Expected: Workflow report/stamp contracts, skill versions, and bundled views pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-review-provide-remote/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts packages/cli/src/validation/skills.test.ts
git commit -m "feat(p03-t06): integrate dispatch reports into workflows"
```

---

## Phase p04: Cursor Evidence and User Documentation

**Outcome:** Every recommended GPT-5.6 Cursor slug has dated, sanitized,
reproducible Task-probe evidence, and recommendation/docs changes follow only
from that evidence.

### Task p04-t01: Create the live-verification inventory and protocol

**Files:**

- Create: `.oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md`
- Create: `tools/verification/verify-cursor-subagent-evidence.mjs`
- Create: `tools/verification/verify-cursor-subagent-evidence.test.mjs`
- Read: `packages/cli/config/dispatch-matrix-recommendation.json`

**Step 1: Write evidence assertions (RED)**

Define fixtures that fail on missing, duplicate, extra, or incomplete candidate
records. Enumerate all distinct recommendation-version Cursor candidates and
assert the artifact has exactly one pending record per exact string plus a
separate configured-subset section.

**Step 2: Implement (GREEN)**

Add a deterministic checker that derives the candidate set from the current
recommendation JSON and validates machine-delimited evidence records. Record
recommendation version, canonical prompt/sentinel, exact command shape,
sanitized environment fields, capture rules, outcome vocabulary, and the 13
derived candidates.

**Step 3: Refactor**

Exclude credentials and make broad catalog data explicitly diagnostic-only.

**Step 4: Verify**

Run: `node --test tools/verification/verify-cursor-subagent-evidence.test.mjs && node tools/verification/verify-cursor-subagent-evidence.mjs --allow-pending --recommendation packages/cli/config/dispatch-matrix-recommendation.json --evidence .oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md`
Expected: Checker tests pass and the pending artifact exactly matches the current candidate set.

**Step 5: Commit**

```bash
git add .oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md tools/verification/verify-cursor-subagent-evidence.mjs tools/verification/verify-cursor-subagent-evidence.test.mjs
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

Run: `node tools/verification/verify-cursor-subagent-evidence.mjs --recommendation packages/cli/config/dispatch-matrix-recommendation.json --evidence .oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md`
Expected: Every distinct candidate has exactly one complete record; every non-definitive outcome has a recheck date.

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
- Regenerate via `bash packages/cli/scripts/bundle-assets.sh`:
  - `packages/cli/assets/skills/oat-project-implement/SKILL.md`
  - `packages/cli/assets/skills/oat-project-review-provide/SKILL.md`
  - `packages/cli/assets/skills/oat-project-review-provide-remote/SKILL.md`
  - `packages/cli/assets/config/dispatch-matrix-recommendation.json`

**Step 1: Verify baseline (RED)**

Run `pnpm release:check-versions` and identify the next lockstep patch version
from the current `0.1.48` baseline.

**Step 2: Implement (GREEN)**

Bump all five public packages together, update the lockfile, and regenerate
the public-version, skill, and recommendation mirrors with
`bash packages/cli/scripts/bundle-assets.sh` rather than hand-editing them.

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

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/dispatch-matrix.test.ts src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/project/dispatch-ceiling/index.test.ts src/commands/config/index.test.ts src/commands/doctor/index.test.ts src/providers/identity/availability.test.ts src/providers/identity/dispatch-validation.test.ts src/providers/identity/dispatch-report.test.ts src/providers/identity/stamp.test.ts src/commands/gate/index.test.ts src/commands/help-snapshots.test.ts src/commands/commands.integration.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/validation/skills.test.ts`

Expected: Every focused matrix, resolver, config, doctor, availability,
validation, report, stamp, gate, help, integration, workflow-contract, and
bundle suite passes.

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

- Move when evidence-complete: `.oat/repo/pjm/backlog/items/BL-260709-add-dispatch-machine-schema.md` → `.oat/repo/pjm/backlog/archived/BL-260709-add-dispatch-machine-schema.md`
- Move when evidence-complete: `.oat/repo/pjm/backlog/items/BL-260707-consolidate-dispatch-matrix.md` → `.oat/repo/pjm/backlog/archived/BL-260707-consolidate-dispatch-matrix.md`
- Move when evidence-complete: `.oat/repo/pjm/backlog/items/BL-260707-cache-cursor-model-catalog.md` → `.oat/repo/pjm/backlog/archived/BL-260707-cache-cursor-model-catalog.md`
- Move when evidence-complete: `.oat/repo/pjm/backlog/items/BL-260708-verify-cursor-gpt-5-6-subagent.md` → `.oat/repo/pjm/backlog/archived/BL-260708-verify-cursor-gpt-5-6-subagent.md`
- Modify: `.oat/repo/pjm/backlog/completed.md`
- Regenerate: `.oat/repo/pjm/backlog/index.md`

**Step 1: Verify acceptance criteria**

Map each backlog criterion to implementation commits, tests, documentation,
and the live Cursor evidence. Leave an item open if its evidence is incomplete.

**Step 2: Implement closeout**

For each evidence-complete item, run the source CLI's atomic archive command
with a one-line outcome summary. The command sets terminal status, appends
completed history, moves the item, and regenerates the managed index. Keep any
incomplete item active with an evidence/recheck note rather than archiving it.

**Step 3: Refactor**

Use these command shapes for the items that satisfy acceptance. The
`BL-260708-verify-cursor-gpt-5-6-subagent` archive command is conditional on
live Task/subagent evidence verifying eligibility for the recommended Cursor
candidate set; if that evidence remains incomplete, retain the item with its
evidence and dated recheck instead.

```bash
pnpm run cli -- backlog archive BL-260709-add-dispatch-machine-schema --summary "Delivered Dispatch Report V1 schema, formatters, and workflow integration." --json
pnpm run cli -- backlog archive BL-260707-consolidate-dispatch-matrix --summary "Consolidated dispatch matrix normalization and traversal behind shared adapters." --json
pnpm run cli -- backlog archive BL-260707-cache-cursor-model-catalog --summary "Added pass-scoped Cursor probe and broad-catalog caching for adoption and doctor." --json
pnpm run cli -- backlog archive BL-260708-verify-cursor-gpt-5-6-subagent --summary "Recorded reproducible live Task evidence for the recommended GPT-5.6 Cursor candidates." --json
```

Distinguish a successfully verified slug from an unavailable slug with a dated
recheck; do not claim closure beyond recorded evidence. Use `backlog
regenerate-index` only if a separate curated narrative edit requires it.

**Step 4: Verify**

Run: `pnpm run cli -- pjm doctor --json`
Expected: PJM references and backlog index are consistent.

**Step 5: Commit**

```bash
git add .oat/repo/pjm/backlog/items .oat/repo/pjm/backlog/archived .oat/repo/pjm/backlog/completed.md .oat/repo/pjm/backlog/index.md
git commit -m "chore(p05-t03): close dispatch infrastructure backlog"
```

---

## Phase p06: Structured Cursor Task Evidence Revision

**Outcome:** Replace the inconclusive text-mode probe boundary with structured
launcher evidence, validate the harness with controls, rerun every relevant
candidate, and reconcile recommendations and documentation without conflating
Task-model acceptance with runtime model identity.

### Task p06-t01: Add structured Cursor probe capture and evidence validation

**Files:**

- Create: `tools/verification/capture-cursor-subagent-evidence.mjs`
- Create: `tools/verification/capture-cursor-subagent-evidence.test.mjs`
- Modify: `tools/verification/verify-cursor-subagent-evidence.mjs`
- Modify: `tools/verification/verify-cursor-subagent-evidence.test.mjs`

**Step 1: Write tests (RED)**

Cover stream-JSON parsing, Task tool-call start/completion correlation, exact
byte-preserved model arguments, accepted/rejected/not-observed selection,
child completion/failure/timeout, terminal session/request IDs, recursive
credential redaction, public ID hashing/redaction, private-ID separation,
positive/negative controls, malformed or missing terminal events, and the
public event projection allowlist. Prove the projection removes message text,
prompts, non-model tool arguments, paths, account/team metadata, environment
values, credentials, and direct identifiers.

Run:
`node --test tools/verification/capture-cursor-subagent-evidence.test.mjs tools/verification/verify-cursor-subagent-evidence.test.mjs`

Expected: Tests fail because the structured capture contract does not exist.

**Step 2: Implement (GREEN)**

Add a dependency-free headless capture runner using
`cursor-agent -p --force --output-format=stream-json`. Preserve direct
exit/termination, duration, and correlation fields. Use a configurable timeout
defaulting to 90 seconds. Keep stable availability status separate from
`taskSelection`, `childCompletion`, and `runtimeIdentity`.

The tracked record must use an explicit allowlisted projection containing only
event type/subtype, tool name, non-reversible correlation hashes, the exact
requested model argument, derived outcome fields, exit/termination, duration,
and sanitizer schema version. It must not contain message text, prompts,
non-model tool arguments, paths, account/team metadata, environment values,
credentials, or exact request/session/tool-call IDs. Write unprojected raw
events and exact identifiers only to an explicitly supplied local companion
path under the gitignored `.oat/projects/local/` tree.

**Step 3: Refactor**

Share pure event/outcome derivation between capture and verification. Ignore
unknown stream fields for forward compatibility, but fail closed when the
exact Task model argument or correlated completion cannot be established.

**Step 4: Verify**

Run:

```bash
node --test tools/verification/capture-cursor-subagent-evidence.test.mjs tools/verification/verify-cursor-subagent-evidence.test.mjs
node tools/verification/verify-cursor-subagent-evidence.mjs \
  --recommendation packages/cli/config/dispatch-matrix-recommendation.json \
  --evidence .oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md
```

Expected: Both test files pass and the historical v1 evidence remains valid.

**Step 5: Commit**

```bash
git add tools/verification/capture-cursor-subagent-evidence.mjs tools/verification/capture-cursor-subagent-evidence.test.mjs tools/verification/verify-cursor-subagent-evidence.mjs tools/verification/verify-cursor-subagent-evidence.test.mjs
git commit -m "feat(p06-t01): capture structured cursor task evidence"
```

### Task p06-t02: Run controls and the second live candidate pass

**Files:**

- Modify: `.oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md`
- Modify: `.oat/repo/reference/project-summaries/20260711-cursor-gpt-5-6-subagent-verification.md`
- Local-only: `.oat/projects/local/dispatch-schema-matrix-infrastructure/cursor-probe-request-ids.json`

**Step 1: Validate the harness controls**

Run one positive control that dynamically uses an exact model value exposed to
the Task tool and one deliberately invalid negative control. The positive
control must produce an accepted correlated Task and sentinel; the negative
control must produce a structured rejection or allow-list exclusion. If either
control is inconclusive, stop before candidate probes and record a harness or
environment outcome instead of model outcomes.

```bash
node tools/verification/capture-cursor-subagent-evidence.mjs \
  --recommendation packages/cli/config/dispatch-matrix-recommendation.json \
  --exploratory-candidate gpt-5.6-sol-high-fast \
  --timeout-ms 90000 \
  --output /tmp/oat-cursor-structured-pass.json \
  --private-output .oat/projects/local/dispatch-schema-matrix-infrastructure/cursor-probe-request-ids.json \
  --controls-only
```

**Step 2: Run the candidate pass**

If controls pass, run one 90-second no-retry probe for each of the 13
recommendation candidates plus exploratory `gpt-5.6-sol-high-fast`. Execute
serially to preserve clear correlation and avoid account-level concurrency
effects. Capture the exact CLI version and sanitized auth-presence context.

```bash
node tools/verification/capture-cursor-subagent-evidence.mjs \
  --recommendation packages/cli/config/dispatch-matrix-recommendation.json \
  --exploratory-candidate gpt-5.6-sol-high-fast \
  --timeout-ms 90000 \
  --output /tmp/oat-cursor-structured-pass.json \
  --private-output .oat/projects/local/dispatch-schema-matrix-infrastructure/cursor-probe-request-ids.json
```

**Step 3: Record evidence**

Append a versioned second-pass section to the project and durable evidence
records. Preserve the first pass unchanged. Public evidence contains only the
allowlisted event projection and non-reversible ID hashes; the gitignored local
companion contains unprojected raw events and exact request/session IDs for
possible Cursor support escalation.

**Step 4: Verify**

Run:

```bash
node tools/verification/verify-cursor-subagent-evidence.mjs \
  --recommendation packages/cli/config/dispatch-matrix-recommendation.json \
  --capture /tmp/oat-cursor-structured-pass.json \
  --evidence .oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md
node tools/verification/verify-cursor-subagent-evidence.mjs \
  --recommendation packages/cli/config/dispatch-matrix-recommendation.json \
  --capture /tmp/oat-cursor-structured-pass.json \
  --evidence .oat/repo/reference/project-summaries/20260711-cursor-gpt-5-6-subagent-verification.md
cmp \
  .oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md \
  .oat/repo/reference/project-summaries/20260711-cursor-gpt-5-6-subagent-verification.md
```

Expected: Controls and every executed candidate record are complete,
mechanically derived, credential-safe, and identical across tracked copies.

**Step 5: Commit**

```bash
git add .oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md .oat/repo/reference/project-summaries/20260711-cursor-gpt-5-6-subagent-verification.md
git commit -m "test(p06-t02): record structured cursor task probes"
```

### Task p06-t03: Reconcile recommendation and user-facing evidence semantics

**Files:**

- Modify only when definitive evidence supports it: `packages/cli/config/dispatch-matrix-recommendation.json`
- Modify only with the source recommendation: `packages/cli/assets/config/dispatch-matrix-recommendation.json`
- Modify: `.oat/repo/pjm/backlog/items/BL-260708-verify-cursor-gpt-5-6-subagent.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/provider-sync/providers.md`
- Modify: `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md`

**Step 1: Apply the evidence authority boundary**

Classify exact Task-model acceptance separately from runtime-model identity.
An accepted correlated Task plus sentinel establishes eligibility for that
configured argument on this account/client; runtime identity remains
`not-reported` without trusted Cursor telemetry. Parent prose and broad catalog
presence remain diagnostic-only.

**Step 2: Reconcile recommendation and backlog**

Change recommendation candidates only from definitive structured evidence.
Keep the backlog item open if the controls fail or required candidate
eligibility remains unresolved. Replace the arbitrary retry cadence with a
specific next trigger and review-by date tied to client rollout or Cursor
support evidence.

**Step 3: Update documentation**

Document the second-pass protocol, control behavior, exact acceptance/runtime
identity distinction, exploratory candidate disposition, and privacy boundary
for request IDs. Keep tracked docs linked to the durable evidence record.

**Step 4: Verify**

Run:

```bash
node --test tools/verification/capture-cursor-subagent-evidence.test.mjs tools/verification/verify-cursor-subagent-evidence.test.mjs
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/config/index.test.ts \
  src/commands/init/tools/shared/bundle-consistency.test.ts
pnpm exec oxfmt --check \
  apps/oat-docs/docs/cli-utilities/configuration.md \
  apps/oat-docs/docs/provider-sync/providers.md \
  apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md
pnpm build:docs
```

Expected: Docs and assets agree with the mechanically derived outcomes and
make no runtime-identity claim beyond evidence.

**Step 5: Commit**

```bash
git add packages/cli/config/dispatch-matrix-recommendation.json packages/cli/assets/config/dispatch-matrix-recommendation.json .oat/repo/pjm/backlog/items/BL-260708-verify-cursor-gpt-5-6-subagent.md apps/oat-docs/docs/cli-utilities/configuration.md apps/oat-docs/docs/provider-sync/providers.md apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md
git diff --cached --quiet || git commit -m "docs(p06-t03): reconcile structured cursor evidence"
```

### Task p06-t04: Bump release assets and run final verification

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Regenerate: `packages/cli/assets/public-package-versions.json`
- Modify: `pnpm-lock.yaml` if package metadata changes it

**Step 1: Bump and regenerate**

Advance all five public packages in lockstep from `0.1.49` to `0.1.50` and run
the canonical CLI asset bundler.

```bash
bash packages/cli/scripts/bundle-assets.sh
```

**Step 2: Run focused verification**

Run:

```bash
node --test tools/verification/capture-cursor-subagent-evidence.test.mjs tools/verification/verify-cursor-subagent-evidence.test.mjs
node tools/verification/verify-cursor-subagent-evidence.mjs \
  --recommendation packages/cli/config/dispatch-matrix-recommendation.json \
  --capture /tmp/oat-cursor-structured-pass.json \
  --evidence .oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/config/index.test.ts \
  src/commands/init/tools/shared/bundle-consistency.test.ts
pnpm build:docs
```

**Step 3: Run repository and release verification**

Run `pnpm format`, `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm build`,
`pnpm build:docs`, `pnpm release:validate`, and `git diff --check` sequentially.

**Step 4: Review the final diff**

Confirm that exact private request/session IDs are absent from tracked files,
all evidence claims are mechanically supported, the five public versions
match, and no unrelated generated drift is included.

**Step 5: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json pnpm-lock.yaml
git commit -m "chore(p06-t04): prepare structured cursor evidence release"
```

### Task p06-t05: (review) Derive structured evidence from recommendation-bound projections

**Files:**

- Modify: `tools/verification/capture-cursor-subagent-evidence.mjs`
- Modify: `tools/verification/capture-cursor-subagent-evidence.test.mjs`
- Modify: `tools/verification/verify-cursor-subagent-evidence.mjs`
- Modify: `tools/verification/verify-cursor-subagent-evidence.test.mjs`

**Step 1: Understand the issue**

Review finding C1: the verifier currently checks asserted structured outcomes
for consistency but does not independently derive them from the public event
projection, bind recommendation metadata to the supplied recommendation, or
enforce the expected post-control candidate inventory.

**Step 2: Implement fix**

Define a strict capture-level schema and recompute every derived probe field
from the minimal public projection. Bind recommendation version/hash to the
supplied recommendation, require the recommendation-derived candidate set plus
explicit exploratory entries when controls pass, and reject capture-level
extra fields or unsafe environment values.

**Step 3: Verify**

Run:

```bash
node --test tools/verification/capture-cursor-subagent-evidence.test.mjs tools/verification/verify-cursor-subagent-evidence.test.mjs
node tools/verification/verify-cursor-subagent-evidence.mjs \
  --recommendation packages/cli/config/dispatch-matrix-recommendation.json \
  --capture /tmp/oat-cursor-structured-pass.json \
  --evidence .oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md
```

Expected: adversarial forged outcomes, recommendation mismatches, inventory
drift, and capture-level privacy leaks fail closed while the recorded
inconclusive pass verifies.

**Step 4: Commit**

```bash
git add tools/verification/capture-cursor-subagent-evidence.mjs tools/verification/capture-cursor-subagent-evidence.test.mjs tools/verification/verify-cursor-subagent-evidence.mjs tools/verification/verify-cursor-subagent-evidence.test.mjs
git commit -m "fix(p06-t05): derive structured cursor evidence"
```

### Task p06-t06: (review) Require exact Task correlation invariants

**Files:**

- Modify: `tools/verification/capture-cursor-subagent-evidence.mjs`
- Modify: `tools/verification/capture-cursor-subagent-evidence.test.mjs`

**Step 1: Understand the issue**

Review finding I1: missing call IDs compare equal, and start, completion, and
terminal events are not required to share a session or compatible exit state.

**Step 2: Implement fix**

Require non-empty Task call and session IDs, exact start/completion call and
session agreement, terminal session agreement, successful terminal state, and
compatible direct exit status before classifying a Task as accepted and valid.

**Step 3: Verify**

Run:
`node --test tools/verification/capture-cursor-subagent-evidence.test.mjs`

Expected: missing IDs, mismatched sessions, terminal errors, and nonzero exits
all fail closed.

**Step 4: Commit**

```bash
git add tools/verification/capture-cursor-subagent-evidence.mjs tools/verification/capture-cursor-subagent-evidence.test.mjs
git commit -m "fix(p06-t06): require exact task correlation"
```

### Task p06-t07: (review) Harden private companion credential redaction

**Files:**

- Modify: `tools/verification/capture-cursor-subagent-evidence.mjs`
- Modify: `tools/verification/capture-cursor-subagent-evidence.test.mjs`

**Step 1: Understand the issue**

Review finding M1: string redaction misses common Basic authorization, cookie,
and credential assignment forms in private stdout/stderr.

**Step 2: Implement fix**

Cover every credential-key family recognized by the recursive key matcher plus
common authorization and cookie header syntax. Add table-driven nested and raw
string cases without weakening exact identifier retention in the private-only
companion.

**Step 3: Verify**

Run:
`node --test tools/verification/capture-cursor-subagent-evidence.test.mjs`

Expected: supported credential encodings are redacted and exact private
correlation IDs remain available locally.

**Step 4: Commit**

```bash
git add tools/verification/capture-cursor-subagent-evidence.mjs tools/verification/capture-cursor-subagent-evidence.test.mjs
git commit -m "fix(p06-t07): harden cursor evidence redaction"
```

### Task p06-t08: (review) Scope public privacy claims to the structured pass

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/provider-sync/providers.md`
- Modify: `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md`

**Step 1: Understand the issue**

Review finding M2: docs describe the whole linked evidence artifact as the
structured allowlist even though the intentionally preserved historical v1
section contains broader sanitized prompt/argv/output fields.

**Step 2: Implement fix**

Scope the allowlist and hashed-ID claim explicitly to the structured
second-pass block, and separately describe the broader sanitized historical v1
record retained for provenance.

**Step 3: Verify**

Run:

```bash
pnpm exec oxfmt --check apps/oat-docs/docs/cli-utilities/configuration.md apps/oat-docs/docs/provider-sync/providers.md apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md
pnpm build:docs
```

Expected: all three docs state the two privacy shapes precisely and build.

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/cli-utilities/configuration.md apps/oat-docs/docs/provider-sync/providers.md apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md
git commit -m "docs(p06-t08): clarify cursor evidence privacy"
```

### Task p06-t09: (review) Reconcile p06 lifecycle state and final verification

**Files:**

- Modify: `.oat/projects/shared/dispatch-schema-matrix-infrastructure/implementation.md`
- Modify: `.oat/projects/shared/dispatch-schema-matrix-infrastructure/state.md`
- Modify: `.oat/projects/shared/dispatch-schema-matrix-infrastructure/plan.md`

**Step 1: Understand the issue**

Review finding I2: root-owned phase bookkeeping had not yet recorded the four
completed p06 commits or their full verification evidence when the phase review
ran.

**Step 2: Reconcile**

After p06-t05 through p06-t08 complete, record all nine p06 task commits,
verification results, control/candidate outcome, review disposition, and the
next lifecycle action. Mark the p06 review `fixes_completed` pending re-review.

**Step 3: Verify**

Run `pnpm format`, `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm build`,
`pnpm build:docs`, `pnpm release:validate`, and `git diff --check` sequentially.

Expected: the full repository/release suite passes and project tracking resumes
at the p06 re-review boundary.

**Step 4: Commit**

```bash
git add .oat/projects/shared/dispatch-schema-matrix-infrastructure/plan.md .oat/projects/shared/dispatch-schema-matrix-infrastructure/implementation.md .oat/projects/shared/dispatch-schema-matrix-infrastructure/state.md .oat/projects/shared/dispatch-schema-matrix-infrastructure/reviews/
git commit -m "chore(oat): reconcile p06 review fixes"
```

### Task p06-t10: (review) Bind passed controls to exact model arguments

**Files:**

- Modify: `tools/verification/capture-cursor-subagent-evidence.mjs`
- Modify: `tools/verification/capture-cursor-subagent-evidence.test.mjs`

**Step 1: Understand the issue**

Re-review finding C1: derived control outcomes can still validate as passed
when the positive model is absent or the negative model does not byte-match the
canonical deliberately invalid value.

**Step 2: Implement fix**

Require the positive Task start to project a non-empty opaque model string.
Require the negative probe candidate, Task start, and any completion model to
byte-match the canonical negative-control value. Reject missing, replaced, or
mismatched control identity fields before controls can pass.

**Step 3: Verify**

Run:
`node --test tools/verification/capture-cursor-subagent-evidence.test.mjs`

Expected: removing, replacing, or mismatching either control model fails
closed, while the recorded inconclusive controls remain valid.

**Step 4: Commit**

```bash
git add tools/verification/capture-cursor-subagent-evidence.mjs tools/verification/capture-cursor-subagent-evidence.test.mjs
git commit -m "fix(p06-t10): bind cursor control identities"
```

### Task p06-t11: (review) Constrain public projection values

**Files:**

- Modify: `tools/verification/capture-cursor-subagent-evidence.mjs`
- Modify: `tools/verification/capture-cursor-subagent-evidence.test.mjs`

**Step 1: Understand the issue**

Re-review finding M1: public event keys are allowlisted but their free-form
string values can still carry credentials or local paths.

**Step 2: Implement fix**

Use finite structural values for event type, subtype, tool name, and Task
result. Drop or reject unrelated/unknown structural values, validate opaque
model strings against a bounded safe shape, and run credential/path leak checks
before writing or accepting the public capture.

**Step 3: Verify**

Run:

```bash
node --test tools/verification/capture-cursor-subagent-evidence.test.mjs tools/verification/verify-cursor-subagent-evidence.test.mjs
node tools/verification/verify-cursor-subagent-evidence.mjs \
  --recommendation packages/cli/config/dispatch-matrix-recommendation.json \
  --capture /tmp/oat-cursor-structured-pass.json \
  --evidence .oat/projects/shared/dispatch-schema-matrix-infrastructure/references/cursor-gpt-5-6-subagent-verification.md
```

Expected: secrets and paths in every public string-valued event field fail
closed; the recorded evidence remains valid.

**Step 4: Commit**

```bash
git add tools/verification/capture-cursor-subagent-evidence.mjs tools/verification/capture-cursor-subagent-evidence.test.mjs
git commit -m "fix(p06-t11): constrain public event values"
```

---

## Reviews

| Scope         | Type     | Status          | Date       | Artifact                                                      |
| ------------- | -------- | --------------- | ---------- | ------------------------------------------------------------- |
| p01           | code     | passed          | 2026-07-11 | reviews/archived/code-p01-self-review-2026-07-11.md           |
| p02           | code     | passed          | 2026-07-11 | reviews/archived/code-p02-self-review-2026-07-11.md           |
| p03           | code     | passed          | 2026-07-11 | reviews/archived/code-p03-self-review-2026-07-11.md           |
| p04           | code     | passed          | 2026-07-11 | reviews/archived/code-p04-self-review-2026-07-11.md           |
| p05           | code     | passed          | 2026-07-11 | reviews/archived/code-p05-self-review-2026-07-11.md           |
| p06           | code     | fixes_added     | 2026-07-11 | reviews/archived/code-p06-self-review-2026-07-11T130108Z.md   |
| final-pre-p06 | code     | passed          | 2026-07-11 | reviews/archived/final-review-2026-07-11T034130Z.md           |
| final         | code     | pending         | -          | -                                                             |
| spec          | artifact | pending         | -          | -                                                             |
| design        | artifact | fixes_completed | 2026-07-10 | reviews/archived/artifact-design-review-2026-07-10T200942Z.md |
| plan-pre-p06  | artifact | passed          | 2026-07-10 | reviews/archived/artifact-plan-review-2026-07-10T215126Z.md   |
| plan          | artifact | passed          | 2026-07-11 | structured in-memory p06 review                               |

The user approved the lightweight design after all six received design-review
findings were resolved. No formal `spec.md` exists in quick mode.
The configured cross-runtime plan gate passed at the Important threshold; its
three Minor clarity findings were applied directly to this plan with user
approval.

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

## Implementation Complete

**Summary:**

- Phase p01: 6 tasks — shared matrix core and adapters
- Phase p02: 4 tasks — pass-scoped Cursor validation
- Phase p03: 6 tasks — Dispatch Report V1 and workflow integrations
- Phase p04: 4 tasks — live evidence, recommendation, and docs
- Phase p05: 3 tasks — release validation and backlog closeout
- Phase p06: 11 tasks — structured Cursor controls, probes, reconciliation, review fixes, and release validation

**Total: 34 tasks**

Ready for implementation only after optional phase-review setup and the managed
plan artifact review complete.

## References

- Discovery: `discovery.md`
- Design: `design.md`
- Cursor evidence target: `references/cursor-gpt-5-6-subagent-verification.md`
- Evidence authority analysis: `references/codex-max-depth-cursor-verification-analysis-gpt-5.md`
- Completed dependency summary:
  `.oat/repo/reference/project-summaries/20260710-gate-review-provenance-target-safety.md`
- Recommendation: `packages/cli/config/dispatch-matrix-recommendation.json`
- Backlog:
  - `.oat/repo/pjm/backlog/items/BL-260709-add-dispatch-machine-schema.md`
  - `.oat/repo/pjm/backlog/items/BL-260707-consolidate-dispatch-matrix.md`
  - `.oat/repo/pjm/backlog/items/BL-260707-cache-cursor-model-catalog.md`
  - `.oat/repo/pjm/backlog/items/BL-260708-verify-cursor-gpt-5-6-subagent.md`
