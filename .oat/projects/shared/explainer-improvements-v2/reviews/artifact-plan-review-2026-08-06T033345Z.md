---
oat_generated: true
oat_generated_at: 2026-08-06T03:33:45Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/explainer-improvements-v2
oat_gate_headless: true
oat_gate_run_id: 6b2aee82-23c2-444b-999a-9a07655b1dfc
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-06T03:33:45Z
**Scope:** Current quick-mode implementation plan against discovery, the
approved lightweight design, the normative Cyclone handoff, project state, and
live lifecycle/archive consumers
**Files reviewed:** 6 primary project artifacts, with supporting CLI, skill,
test, and documentation evidence
**Commits:** Not applicable (artifact review)

## Summary

The plan is detailed and covers the prior gate findings, but three remaining
contract gaps make it unsafe to begin implementation. The recipe transition
mutates an already-emitted version, the flagged-run publication override
contradicts the normative acceptance criteria, and the archive-on-complete path
still rejects the flagged-durable outcome that the plan introduces.

Findings: 0 critical, 3 important, 0 medium, 0 minor

## Findings

### Critical

None

### Important

- **`project-recap@2` is changed after new runs start emitting it**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:1190`)
  - Issue: p05-t06 creates and registers `project-recap@2`, switches the adapter
    to emit version 2, and verifies real new-version runs. p06-t01 then modifies
    that same recipe version to replace the three-artifact floor with a hub-only
    floor (`plan.md:1244-1259`). Because the registry keys by exact
    `id@version`, a retained version-2 run created after p05-t06 would resolve a
    different recipe definition after p06-t01. This defeats deterministic
    replay and means the two tasks are not independently safe commits.
  - Fix: Land the final hub-floor `project-recap@2` definition, set-plan v2
    support, registration, and adapter version switch atomically in one task.
    The cleanest ordering is to leave p05-t06 as structured-renderer capability
    work and create/activate recipe v2 in p06-t01. Alternatively, preserve the
    p05-t06 v2 file byte-for-byte and allocate a new recipe version for the
    p06-t01 semantic change.
  - Requirement: Versioned recipe replay must remain deterministic, and every
    task must be independently committable.

- **The flagged-run publish override contradicts the normative acceptance
  criteria** (`.oat/projects/shared/explainer-improvements-v2/plan.md:820`)
  - Issue: Discovery declares the handoff's Required acceptance criteria
    normative and adopted wholesale (`discovery.md:108-110`,
    `discovery.md:141-144`). Those criteria say corrected runs cannot publish
    until browser and visual review pass
    (`references/handoff-cyclone-case-study.md:367-372`). p04-t02 instead
    creates a manifest-bound operator override that deliberately publishes a
    `built-needs-review` run (`plan.md:834-850`). Human approval is still useful
    for lifecycle progression, but it does not satisfy the stated
    browser-and-visual-review publication prerequisite.
  - Fix: Remove the flagged-publication override and keep flagged runs durable
    but unpublishable until review passes. If the operator intentionally changed
    the normative requirement, record that explicit scope decision in the
    upstream project artifacts and reconcile discovery, design, and plan before
    implementation; do not leave the plan claiming wholesale handoff
    conformance.
  - Requirement: Corrected runs cannot publish until browser and visual review
    pass.

- **Archive-on-complete still rejects the new flagged-durable outcome**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:813`)
  - Issue: p04-t02 makes `built-needs-review` a complete, hash-verified,
    inspectable durable package and p04-t04 lets project completion proceed, but
    no task updates the CLI archive consumer. The standalone completion route
    passes any selected terminal recap to `oat project archive`
    (`.agents/skills/oat-project-complete/SKILL.md:476-484`), while
    `verifySelectedProjectRecapForArchive` unconditionally rejects
    `built-needs-review`
    (`packages/cli/src/commands/project/archive/archive-utils.ts:1065-1068`).
    With archive-on-complete enabled, the planned flag-not-block lifecycle
    therefore still fails at the archive boundary. The corresponding docs also
    state that flagged runs cannot be finalized or archived
    (`apps/oat-docs/docs/workflows/projects/artifacts.md:80-83`), but that page
    is not named in the migration scope.
  - Fix: Extend the flagged-durability task to update
    `archive-utils.ts` and its archive/push tests so a complete
    flagged-durable package can be verified, re-attested, and exported without
    becoming publishable. Add the affected project-artifacts and
    troubleshooting pages to p06-t05's documentation delta. If flagged runs
    are intentionally non-archivable, revise the design and both completion
    routes so that limitation is explicit and does not surface as a late
    lifecycle failure.
  - Requirement: A flagged run is durable and inspectable, and project
    lifecycle completion is flag-not-block.

### Medium

None

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `discovery.md`, `design.md`, `state.md`,
`implementation.md`, `references/handoff-cyclone-case-study.md`, and the cited
runtime, CLI archive, test, and documentation files.

### Requirements Coverage

| Requirement area          | Status  | Notes                                                                                          |
| ------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| Path and link integrity   | planned | Destination derivation, canonical links, and hard link validation have bounded tasks.          |
| Publication integrity     | partial | Verification and receipts are planned, but the flagged-run override conflicts with scope.      |
| Lifecycle and recovery    | partial | Flagged durability is planned, but the archive-on-complete consumer still rejects it.          |
| Visual quality            | partial | Structured renderers are planned, but recipe v2 is mutated after activation.                   |
| Compatibility and release | partial | Broad migration/release work exists, but recipe replay and archive consumers remain uncovered. |

### Extra Work (not in declared requirements)

The `publish-override/v1` path is extra work that conflicts with the currently
normative publication prerequisite.

## Dispatch Profile Assessment

The plan intentionally declares no per-phase Dispatch Profile constraints.
That omission is valid; the project-level managed policy remains authoritative.

## Review Dispatch Audit

Gate route: inline (runtime=cursor,
cliRoot=/Users/tstang/orca/workspaces/open-agent-toolkit/explainer-improvements)

The immutable gate target is recorded in frontmatter. Separately, the project
policy resolver produced this compatibility stamp:

```text
Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high
```

## Verification Commands

Run these after receiving and fixing the review:

```bash
node --test .agents/skills/explainer-kit/tests/recipes.test.mjs .agents/skills/explainer-kit/tests/durability.test.mjs .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs
pnpm --filter @open-agent-toolkit/cli test -- archive-utils.test.ts push-runner.test.ts
pnpm lint && pnpm format && pnpm check
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the three Important
findings into plan-fix tasks before implementation.
