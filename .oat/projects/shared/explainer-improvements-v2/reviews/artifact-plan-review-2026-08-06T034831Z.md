---
oat_generated: true
oat_generated_at: 2026-08-06T03:48:31Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/explainer-improvements-v2
oat_gate_headless: true
oat_gate_run_id: 0d662e1d-5eae-4d4b-bdcc-1351b233be62
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-06T03:48:31Z
**Scope:** Current quick-mode implementation plan against discovery, the
approved lightweight design, the normative Cyclone handoff, project state, and
the live render/QA pipeline
**Files reviewed:** 6 primary project artifacts, with supporting renderer,
HTML-safety, QA, and review-history evidence
**Commits:** Not applicable (artifact review)

## Summary

The plan resolves the prior gate findings and has strong coverage across
publication, lifecycle, visual quality, compatibility, and release closure.
Two remaining gaps in the new hard internal-link gate are blocking: its
reference-classification contract conflicts with valid references already
emitted or accepted by the runtime, and its integration task does not
executablely prove successful correction and revalidation.

Findings: 0 critical, 2 important, 0 medium, 0 minor

## Findings

### Critical

None

### Important

- **The link validator does not define valid fragment and non-site reference
  classes** (`.oat/projects/shared/explainer-improvements-v2/plan.md:376`)
  - Issue: p02-t02 says every local `href`/`src` is resolved against the
    manifest/site tree and names only external `https://` references as ignored
    (`plan.md:376-399`). Existing standard output emits same-document fragment
    links (`.agents/skills/explainer-kit/scripts/lib/render.mjs:231-233`), and
    the existing HTML-safety contract explicitly permits fragment references
    and inline `data:` image sources
    (`.agents/skills/explainer-kit/tests/html-safety.test.mjs:274-280`). The
    planned hard gate therefore lacks an executable rule that distinguishes
    manifest-backed page/resource links from valid document-local or embedded
    references. An implementation can either reject every generated hub and
    valid self-contained image, or skip fragments without proving that their
    target IDs exist; both violate the link-integrity goal.
  - Fix: Extend p02-t02's contract and fixtures with an explicit reference
    classifier. Require same-document and cross-document fragments to resolve
    to an existing element ID; validate the path portion of
    `.../index.html#fragment` against the manifest; keep allowed `data:`
    resources and other deliberately non-site references under HTML-safety
    policy rather than manifest-path validation; and test missing fragments,
    fragment-only SVG references, embedded data images, external URLs, and
    canonical manifest paths.
  - Requirement: Every internal link must resolve without regressing existing
    self-contained, accessible renderer output.

- **The integration plan does not prove that link correction can recover and
  re-enter the pipeline** (`.oat/projects/shared/explainer-improvements-v2/plan.md:414`)
  - Issue: p02-t03 claims that link findings enter the bounded correction path,
    but its sole integration scenario says the bad run never reaches
    durability or publication (`plan.md:422-436`). The current QA pipeline
    throws immediately for hard issues before browser evidence
    (`.agents/skills/explainer-kit/scripts/run.mjs:470-498`); its existing
    correction path begins only after a successful hard-QA pass and a visual
    `correct` disposition (`run.mjs:508-554`). Merely adding link findings to
    the hard-issue set would satisfy the negative assertion while leaving no
    executable rebuild/correction route, contrary to the plan, design, and
    normative handoff.
  - Fix: Add an integration case that starts with a directory-style link,
    invokes the shipped bounded correction seam with the structured link
    finding, rerenders, reruns link validation, then runs browser and visual
    review and becomes eligible for durability. Retain a companion
    correction-exhaustion case proving that still-invalid output cannot reach
    durability or publication. Scope any production record/correction files
    needed to make that transition auditable.
  - Requirement: Link corrections must trigger rebuild, browser review, visual
    review, durability, and only then publication
    (`references/handoff-cyclone-case-study.md:158-163`).

### Medium

None

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `discovery.md`, `design.md`, `state.md`,
`implementation.md`, `references/handoff-cyclone-case-study.md`, the latest
archived plan review, and the cited renderer/HTML-safety/QA files.

### Requirements Coverage

| Requirement area          | Status  | Notes                                                                                                                   |
| ------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| Path and link integrity   | partial | Destination and canonical-link work is planned; validator reference classes and recovery are incomplete.                |
| Publication integrity     | planned | Protected verification, byte equality, complete receipts, and a cross-boundary test are covered.                        |
| Lifecycle and recovery    | planned | Flagged durability, categorical publish denial, failure records, completion guards, and archive acceptance are covered. |
| Visual quality            | planned | Structured renderers, recipe v2, type roles, rubric v2, negative evidence, and responsive goldens are covered.          |
| Compatibility and release | planned | Versioned replay, consumer migration, skill/provider sync, package bumps, and release validation are covered.           |

### Extra Work (not in declared requirements)

None

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
node --test .agents/skills/explainer-kit/tests/link-validation.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs
pnpm exec oxfmt --check .oat/projects/shared/explainer-improvements-v2/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the two Important
findings into plan-fix tasks before implementation.
