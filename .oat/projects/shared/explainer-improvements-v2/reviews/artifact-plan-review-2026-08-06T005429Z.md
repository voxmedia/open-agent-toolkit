---
oat_generated: true
oat_generated_at: 2026-08-06T00:54:29Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/explainer-improvements-v2
oat_gate_headless: true
oat_gate_run_id: 0a1eb033-7338-41da-a98a-5f1a0848eb82
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-06T00:54:29Z
**Scope:** Quick-workflow implementation plan, checked against discovery, the
approved lightweight design, the normative Cyclone handoff, and current
contract consumers
**Files reviewed:** 20 primary artifacts and source files, plus targeted
repository searches
**Commits:** Not applicable (artifact review)

## Summary

The plan substantively resolves the findings from the two prior gate passes,
but it is not ready for implementation. Four Important integration gaps remain:
phase 1 emits `publicAccess` before the core accepts it, new contract versions
omit shipped consumers, release closure misses a changed canonical skill, and
the protected receipt model cannot represent both required verification facts.
Two Medium sequencing and verification gaps also make individual tasks
non-atomic or incompletely checked.

Findings: 0 critical, 4 important, 2 medium, 0 minor

## Findings

### Critical

None

### Important

- **Do not emit `publicAccess` before the core schema accepts it**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:230`)
  - Issue: `p01-t05` makes the adapter include `publicAccess` in the core
    publish request, but the core schema change is deferred to `p03-t01`
    (`plan.md:410`). The current publish-request schema rejects unknown fields
    with `additionalProperties: false`
    (`.agents/skills/explainer-kit/schemas/publish-request.schema.json:6`), and
    the run request binds that exact v1 contract
    (`.agents/skills/explainer-kit/schemas/run-request.schema.json:49`). Thus a
    publish-capable configuration can produce a request the core rejects after
    phase 1, contradicting the plan's independently verifiable phase and
    parallelism claims.
  - Fix: Move the `publicAccess` threading portion of `p01-t05` after
    `p03-t01`, move the schema-compatible core change before `p01-t05`, or split
    the task so no commit emits the field before the receiving schema and
    validator support it. Update the parallelism/dependency account
    accordingly.

- **Propagate new contract versions through all shipped consumers**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:486`)
  - Issue: The plan's compatibility work still stops inside the two canonical
    skill trees. `p03-t03` makes new runs emit `publish-receipt/v2`, while the
    release acceptance validator and runner require v1
    (`tools/release/validate-explainer-acceptance.mjs:359`,
    `tools/release/validate-explainer-acceptance.mjs:483`,
    `tools/release/run-explainer-rc.mjs:408`) and the private-wrapper smoke
    fixture asserts v1
    (`tools/smoke/explainer-kit/wrapper-compatibility.test.mjs:47`). Likewise,
    `p05-t02` makes new runs resolve `theme/v2` without updating the
    `author-request/v3` theme reference inherited from
    `author-request/v2`
    (`.agents/skills/explainer-kit/schemas/author-request.v2.schema.json:30`).
    `p05-t06` and `p06-t02` switch new authoring and visual-review contracts,
    but omit the adapter callback contracts and tests that still require
    author v2 and visual-review v1
    (`.agents/skills/oat-explainer-kit/references/author-callback.md:13`,
    `.agents/skills/oat-explainer-kit/references/visual-review-callback.md:48`,
    `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs:273`).
    The phase-local checks miss these consumers, and the final full test/release
    gates will fail or leave provider callbacks on stale contracts.
  - Fix: Add an explicit contract-consumer migration task or expand the owning
    tasks to cover the release harness, private-wrapper smoke surface, adapter
    callback references/tests, and every embedding schema. Prove both new-run
    emission and retained-version replay for receipt v1/v2, theme v1/v2,
    author v2/v3, set-plan v1/v2, and visual-review v1/v2 before provider sync.

- **Bump the version of every modified canonical skill**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:1168`)
  - Issue: `p04-t03` modifies
    `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
    (`plan.md:696`), but release closure only bumps `explainer-kit` and
    `oat-explainer-kit` (`plan.md:1172-1173`). Repository policy requires one
    frontmatter version bump for each canonical skill changed by the PR
    (`AGENTS.md:11-12`). The plan's own statement that all changes land in only
    two canonical skills is no longer true once the approval orchestrator is
    changed.
  - Fix: Add `.agents/skills/oat-project-implement/SKILL.md` to `p07-t01`,
    update any literal version pins, and keep it in the same provider-sync and
    validation closure as the other changed skills.

- **Represent both protected-object and public-URL verification outcomes**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:444`)
  - Issue: `p03-t02` requires each protected artifact to record authenticated
    object verification as `verified-authenticated` and the intentionally
    skipped public fetch as `skipped-protected` (`plan.md:462-464`), but
    `p03-t03` specifies one per-artifact verification enum that can hold only
    one of those values (`plan.md:503-506`). Choosing either value loses a
    required audit fact and makes the complete receipt incapable of expressing
    the approved protected-destination semantics.
  - Fix: Define a structured per-artifact result with separate object-byte and
    public-URL verification fields (or an equivalent multi-result structure),
    including the compared service checksum/hash. Add schema and negative tests
    proving protected receipts record both facts while public receipts preserve
    anonymous byte verification.

### Medium

- **Create the compact failure-record contract before the approval guard consumes it**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:692`)
  - Issue: `p04-t03` requires its transition-guard test to accept a compact
    failure record as a terminal outcome (`plan.md:711-715`), but the schema and
    emission path for that record are not created until the following task,
    `p04-t04` (`plan.md:738-760`). As ordered, `p04-t03` cannot integrate
    against the production failure-record contract while remaining an
    independently passing commit.
  - Fix: Move the failure-record contract/emission task before `p04-t03`, or
    split out the minimal versioned failure-record contract first and make both
    tasks consume the same production validator rather than a test-local shape.

- **Run every focused test that the task changes**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:486`)
  - Issue: `p03-t03` modifies `durability.test.mjs` but its verification command
    runs only S3 and records tests (`plan.md:523-526`), and it changes registry
    dispatch without listing/running `contracts.test.mjs`. `p04-t02` lists
    `durability.test.mjs` and `finalize-tracked-run.test.mjs`
    (`plan.md:649-654`) but its command runs neither; it instead runs the
    adapter integration test without declaring that test in the file scope
    (`plan.md:679-682`). These tasks can commit unexecuted compatibility and
    finalization tests, violating the plan's task-verifiability requirement.
  - Fix: Align each task's file list and focused command. At minimum, run
    contracts and durability coverage in `p03-t03`, and run core integration,
    durability, adapter integration, and tracked-run finalization coverage in
    `p04-t02`.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `discovery.md`, `design.md`, `state.md`,
`implementation.md`, `references/handoff-cyclone-case-study.md`, current core
schemas/registry/durability/publish seams, adapter callback contracts/tests,
release acceptance tooling, smoke fixtures, and repository policy.

The Dispatch Profile named-ceiling advisory was applied. The absence of
explicit per-phase ceiling rows is valid and is not a finding.

### Requirements Coverage

| Requirement area                | Status  | Notes                                                                                                                |
| ------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------- |
| Path and destination derivation | Partial | Behavior is mapped, but phase ordering temporarily emits a core-invalid publish request.                             |
| Link integrity                  | Covered | Canonical links, full-site validation, correction routing, and artistic-author guidance are task-mapped.             |
| Publication integrity           | Partial | Byte verification is strong, but receipt v2 misses consumers and cannot represent both protected verification facts. |
| Lifecycle ordering and recovery | Partial | The correct approval seam is targeted, but its failure-record dependency is ordered after the consumer task.         |
| Visual quality                  | Partial | Renderer and rubric work is mapped; adapter callback and smoke consumers are not migrated to the new contracts.      |
| Versioned contracts and replay  | Partial | Core readers are covered, but embedding schemas, adapter/provider contracts, wrappers, and release tools are not.    |
| Release closure                 | Partial | Lockstep package work is present; the changed `oat-project-implement` skill lacks its required version bump.         |

### Extra Work (not in declared requirements)

None

## Verification Commands

Run these after receiving the review and updating the plan:

```bash
pnpm exec oxfmt --check .oat/projects/shared/explainer-improvements-v2/plan.md
rg -n "publicAccess|publish-receipt/v2|author-request/v3|theme/v2|visual-review-(request|result)/v2|oat-project-implement/SKILL.md|durability.test.mjs|finalize-tracked-run.test.mjs" .oat/projects/shared/explainer-improvements-v2/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the blocking findings
into plan fixes.
