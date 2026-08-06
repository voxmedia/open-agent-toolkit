---
oat_generated: true
oat_generated_at: 2026-08-06T01:27:20Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/explainer-improvements-v2
oat_gate_headless: true
oat_gate_run_id: a885edcb-c52d-4126-b56d-678ad3b1da44
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-06T01:27:20Z
**Scope:** Current quick-mode implementation plan aligned against discovery,
design, the normative Cyclone handoff, implementation bookkeeping, and targeted
repository surfaces needed to verify task feasibility
**Files reviewed:** 5 project artifacts plus the normative handoff and targeted
repository evidence
**Commits:** N/A (artifact review)
**Gate route:** inline (runtime `cursor`; branch-local CLI root validated)
**Dispatch profile advisory:** Applied. Explicit per-phase ceiling rows are
optional, and the plan's managed-policy inheritance is not a finding.

## Summary

The plan has strong acceptance-criteria coverage, stable task IDs, and generally
sound phase sequencing, but three executable integration surfaces remain absent
from its bounded task file lists and verification. These Important findings are
blocking: implementing the plan as written would leave protected publish config
unusable through normal OAT configuration and would leave visual-review and
receipt consumers rejecting the new contract versions. The approved design also
needs one alignment correction so it does not reintroduce metadata-only protected
verification.

Findings: 0 critical, 3 important, 1 medium, 0 minor

## Findings

### Critical

None

### Important

- **Protected-destination config is absent from the CLI configuration surface**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:123`)
  - Issue: p01-t02 limits its file scope to the adapter resolver, adapter tests,
    and adapter contract prose, while Phase 1 declares an adapter-only write
    boundary. The design requires a shared `explainers.publish.publicAccess`
    declaration, but the CLI config type, normalizer, effective defaults,
    command key union/catalog, and their tests do not define that key
    (`packages/cli/src/config/oat-config.ts:71`,
    `packages/cli/src/config/oat-config.ts:575`,
    `packages/cli/src/config/resolve.ts:58`, and
    `packages/cli/src/commands/config/index.ts:108`). Normal shared config would
    therefore reject or discard the setting before the adapter could resolve it.
  - Fix: Expand p01-t02 and the Phase 1 write boundary to include those CLI
    configuration surfaces and focused tests. Verify config set/get,
    normalization, effective resolution, defaulting, and invalid-value rejection
    in addition to the adapter suite. This does not invalidate p01/p02
    parallelism because p02 does not write under `packages/cli`.

- **The visual-review v2 task omits the registry that actually emits and
  validates the contract** (`.oat/projects/shared/explainer-improvements-v2/plan.md:1113`)
  - Issue: p06-t02 creates v2 schemas and modifies `visual-review.mjs`, but its
    bounded file list omits `scripts/lib/contracts.mjs` and the focused contract
    tests. Today the registry maps the unversioned visual-review keys only to v1
    (`.agents/skills/explainer-kit/scripts/lib/contracts.mjs:22`), while
    `visual-review.mjs` emits `visual-review-request/v1` and validates both
    request and result through those unversioned keys
    (`.agents/skills/explainer-kit/scripts/lib/visual-review.mjs:45` and
    `.agents/skills/explainer-kit/scripts/lib/visual-review.mjs:109`). Merely
    adding v2 schema files cannot make new runs emit or validate v2.
  - Fix: Add registry/version dispatch and contract tests to p06-t02. Require
    new-run v2 emission and validation, retained v1 validation/replay, and
    request-bound result validation for both versions. Run
    `contracts.test.mjs` as well as the schema and visual-matrix suites.

- **The shipped-consumer migration omits executable consumers and their focused
  tests** (`.oat/projects/shared/explainer-improvements-v2/plan.md:1225`)
  - Issue: p06-t05 lists adapter callback documentation and an integration test
    but not the adapter implementation, which currently accepts only
    `visual-review-result/v1`
    (`.agents/skills/oat-explainer-kit/scripts/run.mjs:510`). It lists the
    wrapper compatibility test but not the private-wrapper fixture, which
    accepts only `publish-receipt/v1`
    (`tools/smoke/explainer-kit/fixtures/private-wrapper.mjs:186`). The release
    validator and RC runner also hard-code receipt v1
    (`tools/release/validate-explainer-acceptance.mjs:359` and
    `tools/release/run-explainer-rc.mjs:408`), but the task does not list or run
    their focused test files. The validator's closed publish-request key check
    also rejects the new optional `publicAccess` field
    (`tools/release/validate-explainer-acceptance.mjs:392`).
  - Fix: Add the adapter `scripts/run.mjs`, the private-wrapper fixture, both
    release-tool test files (including the RC integration test where affected),
    and affected request fixtures to p06-t05. Require v1 replay plus v2
    emission/consumption across every executable consumer, including protected
    `publicAccess` request coverage, and run all focused suites.

### Medium

- **The approved design still describes the superseded protected-verification
  model** (`.oat/projects/shared/explainer-improvements-v2/plan.md:452`)
  - Issue: p03-t02 correctly requires a service-computed checksum or
    authenticated byte download rather than caller-authored metadata, and
    p03-t03 correctly requires separate object-byte and public-URL verification
    fields. The design still specifies `head-object` hash/metadata comparison
    (`.oat/projects/shared/explainer-improvements-v2/design.md:221`) and models
    the receipt as one verification-result enum
    (`.oat/projects/shared/explainer-improvements-v2/design.md:352`). That stale
    authority can steer implementation or closeout back toward an unverifiable
    metadata-only check and an unrepresentable protected receipt.
  - Fix: Align `design.md` during review receipt, or add explicit design
    alignment to p03-t02/p03-t03, naming service-computed checksum or
    authenticated-download verification and the separate object/public result
    fields.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `discovery.md`, `design.md`,
`implementation.md`, `state.md`,
`references/handoff-cyclone-case-study.md`, and targeted repository files needed
to verify the plan's bounded file and test scopes.

### Requirements Coverage

| Requirement area                    | Status  | Notes                                                               |
| ----------------------------------- | ------- | ------------------------------------------------------------------- |
| Path and publish configuration      | Partial | Core plan exists; shared CLI config surface is omitted              |
| Canonical links and link validation | Covered | p02 maps authoring, validation, and hard-gate behavior              |
| Publication integrity and receipts  | Partial | Core work exists; shipped receipt consumers are incompletely scoped |
| Lifecycle ordering and recovery     | Covered | p04 covers ordering, correction, flagged durability, and failures   |
| Visual-quality floor                | Partial | v2 registry and adapter callback migration are incomplete           |
| Test and release closure            | Partial | Focused consumer migration suites are omitted                       |

### Extra Work (not in declared requirements)

None

## Verification Commands

Use these commands after correcting the plan and implementing its amended task
scopes:

```bash
pnpm --filter @open-agent-toolkit/cli test
pnpm --filter @open-agent-toolkit/cli type-check
node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs .agents/skills/explainer-kit/tests/visual-matrix.test.mjs
node --test .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs tools/smoke/explainer-kit/wrapper-compatibility.test.mjs tools/release/validate-explainer-acceptance.test.mjs tools/release/run-explainer-rc.test.mjs tools/release/run-explainer-rc.integration.test.mjs
pnpm lint
pnpm format
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the Important findings
into plan tasks and apply the design-alignment correction before implementation.
