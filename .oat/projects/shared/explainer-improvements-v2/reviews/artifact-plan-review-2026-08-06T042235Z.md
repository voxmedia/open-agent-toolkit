---
oat_generated: true
oat_generated_at: 2026-08-06T04:22:35Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/explainer-improvements-v2
oat_gate_headless: true
oat_gate_run_id: 48b170fd-e650-4d29-9b8b-4930f5ee0c71
oat_gate_target: cursor-gpt-5-6-sol-xhigh
oat_gate_runtime: cursor
oat_invocation_model: gpt-5.6-sol-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-06T04:22:35Z
**Scope:** Current quick-mode implementation plan against discovery, the
approved lightweight design, the normative Cyclone handoff, project state, and
the live core/adapter compatibility contracts
**Files reviewed:** 4 project artifacts plus supporting core, adapter, schema,
recipe, publication, and test evidence
**Commits:** Not applicable (artifact review)

## Summary

The plan retains strong coverage of the earlier gate findings, but three
compatibility and invocation gaps still block implementation readiness:
repository invocation has no source-binding contract, author contract v3 drops
live Markdown paths, and the adapter can accept an older core that lacks its new
required capabilities. Two narrower task-contract problems should also be
corrected so intermediate commits fail closed and the publication acceptance
test does not reject the intentional JSON catalog.

Findings: 0 critical, 3 important, 2 medium, 0 minor

## Findings

### Critical

None

### Important

- **Repository invocation has no executable source-binding path**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:186`)
  - Issue: p01-t03 says removing the adapter entry-point rejection is enough
    for a repository invocation to complete a build-only run, but the live
    adapter rejects non-project invocations and then unconditionally resolves
    an active project and calls `bindProjectSources`
    (`.agents/skills/oat-explainer-kit/scripts/run.mjs:84-95`). That binder
    requires a project root and reads project lifecycle artifacts
    (`.agents/skills/oat-explainer-kit/scripts/bind-project-sources.mjs:21-29`,
    `49-70`). The task neither defines which repository-level evidence should
    feed the recipe nor scopes a binder change, so deleting the guard only
    moves the failure downstream.
  - Fix: Define the repository invocation input contract in p01-t03. Either
    require and validate a supplied fact base for repository runs, or add a
    repository-reference binder with explicit approved source paths. Scope the
    required binder/config files and add success plus missing-source
    integration cases; do not permit an unrelated active project to become a
    repository run's implicit source.
  - Requirement: Repository invocations must write under
    `.oat/repo/reference/explainers/<run>/` and complete through the adapter
    without weakening provenance.

- **Author contract v3 removes still-shipped Markdown authoring**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:333`)
  - Issue: p02-t01 defines the complete immutable v3 request discriminator as
    only `html | structured` and switches new runs to v3. p05-t01 likewise
    describes v3 results as structured variants plus the retained HTML shape.
    Today, however, `project-explainer` and `program-recap` have Markdown
    artifacts, `project-recap` has a Markdown deep-dive expansion, and its
    explicit deterministic fallback converts the whole portfolio to Markdown
    (`.agents/skills/explainer-kit/recipes/project-explainer.json:15-20`,
    `.agents/skills/explainer-kit/recipes/program-recap.json:15-19`,
    `.agents/skills/explainer-kit/recipes/project-recap.json:70-87`). The live
    v2 request/result schemas support this path. As written, the immutable v3
    schema would make existing new-run modes invalid even though replay tests
    still pass.
  - Fix: Preserve `markdown` as a v3 request and result variant, or explicitly
    keep Markdown artifacts on v2 without switching those requests. Add
    executable new-run coverage for `project-explainer`, `program-recap`, the
    project-recap deep-dive expansion, and `recapMode:
deterministic-markdown`; retained-v2 replay alone is insufficient.
  - Requirement: The structured-renderer migration must not silently remove
    existing recipe/fallback capabilities outside the declared scope.

- **The adapter's compatibility floor does not advance with its new core
  dependencies**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:656`)
  - Issue: p03-t04 makes the adapter dynamically load the new
    `url-segments.mjs` helper from the selected installed core, and later tasks
    depend on additional new core contracts. The live adapter still declares
    `MINIMUM_CORE_VERSION = "2.0.3"` and documents that floor
    (`.agents/skills/oat-explainer-kit/scripts/run.mjs:15`,
    `.agents/skills/oat-explainer-kit/SKILL.md:38-41`). Its compatibility
    checker compares only major/minor versions
    (`.agents/skills/oat-explainer-kit/scripts/check-core.mjs:58-64`), while
    p07-t01 only says to bump skill frontmatter and sync providers. A patched
    adapter can therefore accept an older 2.0.x core and then fail while
    loading a capability the compatibility gate claimed was present.
  - Fix: Allocate a new core minor version for this capability set, raise the
    adapter minimum to that minor, update the adapter's documented floor, and
    include `check-core.test.mjs` plus stale-core/current-core integration
    fixtures. Make the p07 version task state the coordinated core/adapter
    versions rather than leaving the compatibility floor unchanged.
  - Requirement: The adapter must fail closed at compatibility preflight when
    its selected installed core lacks required runtime contracts.

### Medium

- **Protected publication is accepted one commit before its safe behavior
  exists** (`.oat/projects/shared/explainer-improvements-v2/plan.md:513`)
  - Issue: p03-t01 makes `publicAccess: "protected"` valid in the live publish
    request, but p03-t02 is the later task that prevents anonymous requests and
    adds authenticated byte verification. This conflicts with the plan's
    claim that every task is independently committable: at the p03-t01 commit,
    a valid protected request can still follow the public verification path.
  - Fix: Merge declaration and protected behavior into one atomic task, or make
    p03-t01 explicitly reject protected execution until p03-t02 activates it,
    with a fail-closed test. Do not accept a trust-mode value whose semantics
    are not yet implemented.

- **The acceptance test's `index.html` assertion includes an intentional JSON
  publication object**
  (`.oat/projects/shared/explainer-improvements-v2/plan.md:1577`)
  - Issue: p06-t06 says every published key must end in `index.html`. The live
    publisher intentionally emits the initiative catalog as
    `site/initiatives/<slug>/catalog.json` and includes it in the receipt
    (`.agents/skills/explainer-kit/scripts/lib/s3-static.mjs:153-174`,
    `.agents/skills/explainer-kit/tests/s3-static.test.mjs:237-247`), in
    addition to its transient sentinel. A literal implementation of the
    planned assertion rejects valid publication output.
  - Fix: Assert explicit `index.html` for every published HTML/manifest
    artifact, assert the catalog separately at its canonical JSON path, and
    account for the transient sentinel lifecycle independently.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `discovery.md`, `design.md`, `state.md`,
`references/handoff-cyclone-case-study.md`, current author request/result
schemas, shipped recipes, adapter invocation/source binding, core compatibility,
and S3 publication tests.

### Requirements Coverage

| Requirement area          | Status  | Notes                                                                                                                      |
| ------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| Path and link integrity   | partial | Link contracts are planned, but repository invocation lacks a valid evidence-binding path.                                 |
| Publication integrity     | partial | End-state behavior is covered; protected-mode activation and the cross-boundary key assertion need correction.             |
| Lifecycle and recovery    | planned | Flagged durability, categorical publish denial, failure records, completion guards, and archive acceptance remain covered. |
| Visual quality            | partial | Structured rendering is planned, but the v3 contract currently drops existing Markdown recipe and fallback paths.          |
| Compatibility and release | partial | Versioned replay/consumer migration is planned, but the adapter minimum-core floor is not advanced.                        |

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
node --test .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/tests/check-core.test.mjs
node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/s3-static.test.mjs
pnpm exec oxfmt --check .oat/projects/shared/explainer-improvements-v2/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the three Important and
two Medium findings into plan-fix tasks before implementation.
