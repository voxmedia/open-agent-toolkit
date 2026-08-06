---
oat_generated: true
oat_generated_at: 2026-08-06T00:40:27Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/explainer-improvements-v2
oat_gate_headless: true
oat_gate_run_id: 8834416a-8dd6-4472-a816-ad2470bc943b
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-06T00:40:27Z
**Scope:** Quick-workflow implementation plan, checked against discovery, the
approved lightweight design, the normative Cyclone handoff, and the current
contract/finalization seams
**Files reviewed:** 16 primary artifacts and source files, plus targeted
repository searches
**Commits:** Not applicable (artifact review)

## Summary

The prior gate's four Important and one Medium findings are substantively
addressed. The current plan still has two Important readiness gaps: a residual
`built-needs-review` result has no path to become the durable, inspectable
flagged package required by the approved design, and the new schema versions
are not propagated through all registries, readers, and dependent contracts.
One Medium task-scope omission also prevents the double-nesting guard from
being implemented within its declared files.

Findings: 0 critical, 2 important, 1 medium, 0 minor

## Findings

### Critical

None

### Important

- **Give flagged `built-needs-review` runs a real durability/finalization path**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:632`)
  - Issue: `p04-t02` says a run that still has findings after the correction
    cap remains `built-needs-review`, records the findings durably, and lets the
    lifecycle proceed. Its file scope only changes core/adapter run and record
    handling. The current core durability seam rejects
    `built-needs-review` (`.agents/skills/explainer-kit/scripts/lib/durability.mjs:30`),
    and tracked-run finalization rejects the same outcome
    (`.agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs:27`).
    `p04-t04` adds durability only for failed/superseded runs. As planned, the
    residual-finding branch can still stop with an unfinalized run package,
    contradicting the approved requirement that a flagged run be durable and
    inspectable while publication alone remains blocked
    (`design.md:56-66`, `design.md:395-397`).
  - Fix: Expand `p04-t02` (or add an explicit adjacent task) to define and
    implement durability semantics for a flagged terminal outcome. Include the
    core durability and adapter finalization seams, durable residual-finding
    evidence, and integration tests proving that the package is tracked and
    inspectable, approval may proceed after the terminal outcome, and
    publication remains denied unless the review passes or an explicit
    operator override is recorded.

- **Complete the versioned-contract dependency graph and retained-reader tests**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:482`)
  - Issue: The plan now allocates new versions for several incompatible
    changes, but the task file scopes do not carry those versions through their
    consumers. `p03-t03` promises a registry update and retained
    `publish-receipt/v1` durability reads while omitting
    `scripts/lib/contracts.mjs`, `scripts/lib/durability.mjs`, and their
    compatibility tests; the current durability path validates receipts
    through the generic `publish-receipt` key
    (`.agents/skills/explainer-kit/scripts/lib/durability.mjs:350-415`).
    `p05-t02` still revises `theme.schema.json` in place even though it adds a
    required role-token shape to the published `explainer-kit.theme/v1`
    contract (`.agents/skills/explainer-kit/schemas/theme.schema.json:3-46`).
    `p05-t06` introduces `authoring: structured` plus a content-contract
    reference without listing the previously created
    `author-request.v3.schema.json`, and `p06-t01` makes new runs emit
    `set-plan/v2` without updating the author-request contract that embeds the
    set plan (the current contract directly references `set-plan/v1` at
    `.agents/skills/explainer-kit/schemas/author-request.v2.schema.json:31`).
    These gaps can make new runs fail validation or make retained runs unreadable.
  - Fix: Add an explicit contract-dependency matrix to the affected tasks and
    include every registry, default alias, embedding schema, consumer, and
    retained-version test. In particular: add receipt v1/v2 dispatch and
    durability compatibility coverage to `p03-t03`; allocate `theme/v2` (or
    prove a genuinely backward-compatible additive v1 shape) with retained v1
    readers in `p05-t02`; and update/version the author-request contract for
    structured authoring and `set-plan/v2` in `p05`/`p06`, with end-to-end tests
    for both new-run emission and retained v1/v2 replay.

### Medium

- **Include the run call site in the double-nesting guard task**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:195`)
  - Issue: `p01-t04` requires comparing an output root's final segment with the
    run slug, but its only production file is `resolve-paths.mjs`. The current
    resolver signature receives `repoRoot`, `invocation`, `activeProject`, and
    `outputRoot`, not the slug
    (`.agents/skills/oat-explainer-kit/scripts/resolve-paths.mjs:4-9`), while
    `run.mjs` calls it without the slug
    (`.agents/skills/oat-explainer-kit/scripts/run.mjs:79-83`). The declared
    file scope therefore cannot implement the comparison for adapter-resolved
    roots.
  - Fix: Add `scripts/run.mjs` to `p01-t04` and pass the slug into the resolver,
    or place the guard at the run boundary and test both direct-caller and
    adapter-resolved roots before directory creation.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `discovery.md`, `design.md`, `state.md`,
`implementation.md`, `references/handoff-cyclone-case-study.md`, the prior
archived plan review, current schema/contract files, current durability and
adapter finalization seams, and relevant package manifests/tests.

The Dispatch Profile named-ceiling advisory was applied. The plan's absence of
explicit per-phase ceiling rows is valid and is not a finding.

### Requirements Coverage

| Requirement area                | Status  | Notes                                                                                                    |
| ------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| Path and destination derivation | Partial | Main behavior is mapped; the double-nesting task omits the slug-bearing call site.                       |
| Link integrity                  | Covered | Canonical links, full-site validation, correction routing, and artistic-author guidance are task-mapped. |
| Publication integrity           | Partial | Protected byte verification is corrected, but receipt-version reader/registry coverage is incomplete.    |
| Lifecycle ordering and recovery | Partial | Ordering is now at the correct orchestrator seam; flagged-run durability is still undefined.             |
| Visual quality                  | Covered | Structured renderers, typography, semantic diagrams, rubric v2, and a non-vacuous negative oracle map.   |
| Versioned contracts and replay  | Partial | New versions exist in the plan, but dependent contracts/readers are not fully migrated.                  |
| Release closure                 | Covered | Skill/package bumps, generated version asset, provider sync, and release validation are included.        |

### Extra Work (not in declared requirements)

None

## Verification Commands

Run these after receiving the review and updating the plan:

```bash
pnpm exec oxfmt --check .oat/projects/shared/explainer-improvements-v2/plan.md
rg -n "built-needs-review|durability\\.mjs|finalize-tracked-run|theme/v2|author-request\\.v3|set-plan/v2|contracts\\.mjs" .oat/projects/shared/explainer-improvements-v2/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the blocking Important
findings and the Medium finding into plan fixes.
