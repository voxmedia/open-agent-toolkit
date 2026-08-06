---
oat_generated: true
oat_generated_at: 2026-08-06T00:23:27Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/explainer-improvements-v2
oat_gate_headless: true
oat_gate_run_id: 56ad4691-7af6-4601-84f8-0be620eceee3
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-06T00:23:27Z
**Scope:** Quick-workflow implementation plan, checked against discovery, the approved lightweight design, and the normative Cyclone handoff
**Files reviewed:** 6
**Commits:** Not applicable (artifact review)

## Summary

The plan has strong phase structure and broad acceptance-criteria coverage, but four Important gaps make it unsafe to hand directly to implementation: published contracts are revised in place, protected publication can mistake caller-authored metadata for byte verification, the lifecycle-ordering task does not own the orchestrator seam, and the negative visual fixture has no non-vacuous evaluation path. One Medium release-scope omission should also be corrected.

Findings: 0 critical, 4 important, 1 medium, 0 minor

## Findings

### Critical

None

### Important

- **Allocate new versions for incompatible contract changes** (`.oat/projects/shared/explainer-improvements-v2/plan.md:268`)
  - Issue: Several tasks modify existing published schema versions while requiring new fields or semantics: `author-request/v2` rejects requests without a link table (`plan.md:268-284`), `publish-receipt/v1` gains required identity and verification data (`plan.md:473-491`), `author-result/v2` gains structured-content variants (`plan.md:730-750`), and `set-plan/v1` gains enforced expansion justification (`plan.md:941-958`). The current schemas identify those exact versions (`.agents/skills/explainer-kit/schemas/author-request.v2.schema.json:3`, `.agents/skills/explainer-kit/schemas/author-result.v2.schema.json:3`, `.agents/skills/explainer-kit/schemas/publish-receipt.schema.json:3`, `.agents/skills/explainer-kit/schemas/set-plan.v1.schema.json:3`), so in-place tightening can invalidate retained runs and external callbacks despite the design's versioned-contract rule (`design.md:343-347`).
  - Fix: Make each breaking shape a new contract version, retain old readers where replay or wrapper compatibility requires them, and add the corresponding registry, request-reference, documentation, migration, and compatibility-smoke updates to the responsible tasks. If any change is intentionally additive within an existing version, state and test the backward-compatibility proof explicitly.

- **Verify protected object bytes, not caller-authored metadata** (`.oat/projects/shared/explainer-improvements-v2/plan.md:443`)
  - Issue: `p03-t02` specifies authenticated `head-object` “hash/metadata comparison,” but the current upload path writes the local digest as user-defined `explainer-sha256` metadata (`.agents/skills/explainer-kit/scripts/lib/s3-static.mjs:389-417`). Reading that value back with `head-object` proves only that metadata round-tripped; wrong bytes uploaded with the expected metadata would pass. That does not satisfy the required manifest-byte equality or the plan's later assertion that transformations fail (`plan.md:479-491`).
  - Fix: Require an S3-validated object checksum (upload with a SHA-256 checksum and compare the stored service checksum) or perform an authenticated object download and hash the returned bytes. Add a negative test where object bytes differ while custom metadata still contains the expected digest; protected verification must reject it.

- **Move the recap-ordering invariant into the lifecycle orchestrator seam** (`.oat/projects/shared/explainer-improvements-v2/plan.md:655`)
  - Issue: `p04-t03` claims it will prevent approval completion until a recap terminal outcome exists, but its production files are only the adapter's intent resolver/persistence helpers. Those helpers record `generate`/`skip`; they do not advance final approval. The actual sequence is owned by `.agents/skills/oat-project-implement/references/completion-and-closeout.md:745-783`, which is not in the task's write scope. The listed integration test already reads that reference, so it could pass by asserting existing prose without implementing a new state transition.
  - Fix: Include the closeout orchestrator (and any other live completion route that can finalize approval) in the task, define the durable terminal-outcome field and transition guard there, and test that approval cannot advance when it is absent while each accepted terminal outcome can advance. If the existing orchestrator already fully satisfies the requirement, narrow the task to a non-vacuous regression test and remove unrelated intent-record changes.

- **Define a non-vacuous oracle for the negative visual fixture** (`.oat/projects/shared/explainer-improvements-v2/plan.md:1014`)
  - Issue: `p06-t03` only adds fixtures and edits `visual-matrix.test.mjs`, while production judgment is supplied by an injected `visualCritic` callback (`.agents/skills/explainer-kit/scripts/lib/visual-review.mjs:14-56`). A test double can simply return `correct`, so the planned assertion would not prove that the rubric catches the Cyclone defects or prevents a real reviewer from returning `pass`.
  - Fix: Specify an executable evaluation seam that derives the expected failed dimensions from the retained screenshots/DOM, or an explicit reviewer-eval harness with pinned inputs, recorded identity, and pass/fail thresholds. The test must fail when the evaluator returns `pass` for the fixture for evidence-based reasons, not because a stub is hard-coded to return `correct`.

### Medium

- **Declare the generated public-package version asset in release closure** (`.oat/projects/shared/explainer-improvements-v2/plan.md:1108`)
  - Issue: `p07-t02` lists the five package manifests and lockfile, but its required `pnpm build` regenerates the tracked `packages/cli/assets/public-package-versions.json` from those manifests (`packages/cli/scripts/bundle-assets.sh:47-59`). Omitting that generated file from the task's file scope can leave an unstaged release artifact or split one atomic package-version change across commits.
  - Fix: Add `packages/cli/assets/public-package-versions.json` as a regenerated file and include a bundle-consistency check in the task's focused verification.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `discovery.md`, `design.md`, `implementation.md`, `state.md`, and `references/handoff-cyclone-case-study.md`.

The optional Dispatch Profile advisory was applied. The plan has no explicit per-phase ceiling rows, which is valid and not a finding.

### Requirements Coverage

| Requirement area                   | Status  | Notes                                                                                                                               |
| ---------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Path derivation and link integrity | Covered | Adapter/core boundaries, canonical links, and the post-render gate are mapped to bounded tasks.                                     |
| Publication integrity              | Partial | Receipt and protected-mode tasks exist, but protected byte verification is not trustworthy as written.                              |
| Lifecycle ordering and recovery    | Partial | Correction/failure tasks are present; the approval-ordering task targets the wrong production seam.                                 |
| Visual quality                     | Partial | Structured renderers, typography, archetypes, and semantic diagrams are covered; the negative fixture lacks a meaningful evaluator. |
| Versioned contracts and replay     | Partial | Several incompatible changes are assigned to existing schema versions.                                                              |
| Release closure                    | Partial | Lockstep bumps and release validation are present; one generated tracked asset is missing from the file scope.                      |

### Extra Work (not in declared requirements)

None

## Verification Commands

Run these after the plan findings are received and converted into plan fixes:

```bash
pnpm exec oxfmt --check .oat/projects/shared/explainer-improvements-v2/plan.md
node --test .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/explainer-kit/tests/visual-matrix.test.mjs
node --test .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the blocking findings into plan tasks.
