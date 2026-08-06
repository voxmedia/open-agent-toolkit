---
oat_generated: true
oat_generated_at: 2026-08-06T01:39:53Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/explainer-improvements-v2
oat_gate_headless: true
oat_gate_run_id: 7429b4ee-f825-470a-b308-23692efe641c
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-06T01:39:53Z
**Scope:** Current quick-mode implementation plan aligned against discovery,
design, the normative Cyclone handoff, implementation bookkeeping, and targeted
repository surfaces needed to verify task feasibility
**Files reviewed:** 6 project artifacts plus targeted repository evidence
**Commits:** N/A (artifact review)
**Gate route:** inline (runtime `cursor`; branch-local CLI root validated)
**Dispatch profile advisory:** Applied. Explicit per-phase ceiling rows are
optional, and the plan's managed-policy inheritance is not a finding.

## Summary

The plan retains strong requirements coverage and sound high-level sequencing,
but it is not ready to implement because the structured-authoring migration
omits executable project-recap fixtures and a packaged smoke consumer that will
continue exercising the superseded contracts. Two additional contract
ambiguities should be resolved before implementation so the link gate has a
feasible parsing strategy and receipt v2 has one unambiguous verification
shape.

Findings: 0 critical, 2 important, 2 medium, 0 minor

## Findings

### Critical

None

### Important

- **The structured-authoring and hub-floor tasks omit executable recap
  fixtures that assert the old behavior**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:1035`)
  - Issue: p05-t06 changes standard `project-recap` artifacts from HTML
    authoring to structured authoring, and p06-t01 changes the recipe from a
    three-artifact floor to a hub floor, but neither task includes
    `.agents/skills/explainer-kit/tests/e2e-recap.test.mjs`. That suite
    currently asserts three floor artifacts and that every author request uses
    HTML (`e2e-recap.test.mjs:478-491`). The adapter lifecycle integration
    fixture likewise asserts `author-request/v2` plus HTML and returns
    `author-result/v2` HTML
    (`.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs:748-750`),
    but no p05/p06 migration task lists that file. The focused verification
    commands therefore permit the default contract switch and floor change to
    land while executable recap coverage remains broken; p07's full test gate
    would discover the failures only after the intervening phases.
  - Fix: Add `e2e-recap.test.mjs` to p05-t06 for the structured-authoring
    transition and to p06-t01 for the hub-floor assertions. Add
    `completion.integration.test.mjs` to p05-t06 or the explicit migration task,
    update its lifecycle author to exercise the new default while retaining a
    deliberate v2 replay case, and run both suites in the corresponding task
    verification.

- **The shipped-consumer migration still omits the package-coverage smoke
  consumer** (`.oat/projects/shared/explainer-improvements-v2/plan.md:1245`)
  - Issue: p06-t05 says every executable shipped consumer will accept the
    version pairs, but its file list and command omit
    `tools/smoke/explainer-kit/package-coverage-consumers.test.mjs`. That smoke
    path executes a new `project-recap` run through the core and tracked-run
    finalizer (`package-coverage-consumers.test.mjs:49-96`), while its callback
    still emits `set-plan/v1`, assumes the three-artifact floor, unconditionally
    renders from `request.shell`, returns HTML `author-result/v2`, and returns
    `visual-review-result/v1`
    (`package-coverage-consumers.test.mjs:234-315`). The planned structured
    requests do not provide the old HTML shell contract. `pnpm lint` does not
    execute smoke tests; this omission survives p06-t05 and blocks the
    repository `pnpm test` gate in p07.
  - Fix: Include the package-coverage smoke file in p06-t05, migrate its
    new-run path to the new default contracts while retaining explicit legacy
    replay coverage where appropriate, and add its executable command (with
    the required CLI build prerequisite) to p06-t05 verification.

### Medium

- **The hard link validator requires a parser but the task declares no parser
  strategy or dependency surface**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:330`)
  - Issue: p02-t02 requires parser-based `href`/`src` extraction, but the
    repository has no HTML parser dependency in its root manifest
    (`package.json:40-53`), and the phase write boundary allows only
    `.agents/skills/explainer-kit/**`. The task neither names an existing
    parser/runtime to reuse nor includes a package manifest and lockfile for a
    new runtime dependency. A hand-written attribute scanner would not, without
    a defined malformed-HTML contract, satisfy the stated parser-based hard
    gate reliably.
  - Fix: Choose the concrete parsing route in p02-t02. If adding a parser,
    include the owning package manifest, lockfile, bundle/runtime implications,
    and focused malformed-markup tests. If reusing an existing browser/parser
    seam or implementing a bounded tokenizer, name that seam and define the
    accepted malformed-HTML behavior and fixtures.

- **The receipt-v2 task describes two incompatible verification-result
  shapes** (`.oat/projects/shared/explainer-improvements-v2/plan.md:521`)
  - Issue: p03-t03 first says each artifact carries a verification result from
    `verified-anonymous | verified-authenticated | skipped-protected`
    (`plan.md:523-527`), then says one enum cannot represent protected mode and
    requires a structured object with separate object-byte and public-URL
    fields (`plan.md:527-533`). The design supports the latter shape. Leaving
    both definitions in the implementation task makes schema, record, and
    consumer migrations ambiguous.
  - Fix: Remove the flat-enum description and specify the exact structured
    object fields and enums, including where the compared service checksum/hash
    is recorded and how public and protected receipts represent both
    verification facts.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `discovery.md`, `design.md`,
`implementation.md`, `state.md`,
`references/handoff-cyclone-case-study.md`, and targeted repository files needed
to verify bounded task and test scopes.

### Requirements Coverage

| Requirement area                    | Status  | Notes                                                          |
| ----------------------------------- | ------- | -------------------------------------------------------------- |
| Path and publish configuration      | Covered | Adapter derivation, CLI config, and release closure are mapped |
| Canonical links and link validation | Partial | Behavior is mapped; parser/runtime strategy is unresolved      |
| Publication integrity and receipts  | Partial | Receipt verification shape is internally contradictory         |
| Lifecycle ordering and recovery     | Covered | p04 maps ordering, correction, durability, and failures        |
| Visual-quality floor                | Partial | Default-contract and floor fixtures are omitted                |
| Test and release closure            | Partial | A packaged smoke consumer remains outside migration scope      |

### Extra Work (not in declared requirements)

None

## Verification Commands

Use these after correcting the plan and implementing the amended task scopes:

```bash
node --test .agents/skills/explainer-kit/tests/e2e-recap.test.mjs .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs
pnpm --filter @open-agent-toolkit/cli build
node --test tools/smoke/explainer-kit/package-coverage-consumers.test.mjs
pnpm lint
pnpm format
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the Important findings
into plan fixes and resolve the Medium contract ambiguities before
implementation.
